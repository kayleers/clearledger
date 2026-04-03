import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, scenarios, interestByCurrency, interestSavedByCurrency, longestMonths } = await req.json();

    if (!email || !scenarios || scenarios.length === 0) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const formatCurrency = (amount, currency = 'USD') =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount || 0);

    const formatMonths = (months) => {
      if (!months || months === 0) return '0 months';
      const years = Math.floor(months / 12);
      const rem = months % 12;
      if (years === 0) return `${months} month${months === 1 ? '' : 's'}`;
      if (rem === 0) return `${years} year${years === 1 ? '' : 's'}`;
      return `${years} yr${years === 1 ? '' : 's'}, ${rem} mo`;
    };

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    const contentW = pageW - margin * 2;
    let y = margin;

    // ---- Helper functions ----
    const checkPage = (needed = 20) => {
      if (y + needed > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const drawHeader = () => {
      // Header bar
      doc.setFillColor(30, 58, 95);
      doc.roundedRect(margin, y, contentW, 54, 6, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Debt Payoff Simulator Report', margin + 16, y + 24);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 213, 204);
      doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin + 16, y + 42);
      y += 68;
    };

    const sectionTitle = (title) => {
      checkPage(32);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(title, margin, y);
      y += 18;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + contentW, y);
      y += 8;
    };

    const tableRow = (cols, colWidths, rowY, isHeader, isEven) => {
      if (isHeader) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, rowY - 12, contentW, 18, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
      } else {
        if (isEven) {
          doc.setFillColor(250, 252, 255);
          doc.rect(margin, rowY - 12, contentW, 16, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
      }
      let x = margin + 6;
      cols.forEach((col, i) => {
        const align = i === 0 ? 'left' : 'right';
        if (align === 'right') {
          doc.text(String(col), x + colWidths[i] - 8, rowY, { align: 'right' });
        } else {
          doc.text(String(col), x, rowY);
        }
        x += colWidths[i];
      });
    };

    // ---- Draw PDF ----
    drawHeader();

    // Summary section
    sectionTitle('Summary');
    const summaryColW = [contentW * 0.60, contentW * 0.40];
    tableRow(['Metric', 'Value'], summaryColW, y, true, false);
    y += 18;

    const summaryData = [
      ['Time to Pay Off All Debt', formatMonths(longestMonths)],
      ...Object.entries(interestByCurrency).map(([curr, amt]) => [`Total Interest (${curr})`, formatCurrency(amt, curr)]),
      ...Object.entries(interestSavedByCurrency).filter(([, v]) => v > 0).map(([curr, amt]) => [`Interest Saved vs Minimums (${curr})`, formatCurrency(amt, curr)])
    ];

    summaryData.forEach((row, idx) => {
      checkPage(18);
      tableRow(row, summaryColW, y, false, idx % 2 === 0);
      // Color the value cell
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      if (row[0].startsWith('Total Interest')) doc.setTextColor(220, 38, 38);
      else if (row[0].startsWith('Interest Saved')) doc.setTextColor(5, 150, 105);
      else doc.setTextColor(30, 41, 59);
      doc.text(row[1], margin + contentW - 8, y, { align: 'right' });
      y += 16;
    });
    y += 12;

    // Helper: calculate required payment for N months (PMT formula)
    const calcRequiredPayment = (balance, apr, targetMonths) => {
      if (balance <= 0 || targetMonths <= 0) return 0;
      if (!apr || apr === 0) return Math.ceil((balance / targetMonths) * 100) / 100;
      const r = apr / 12;
      const payment = balance * (r * Math.pow(1 + r, targetMonths)) / (Math.pow(1 + r, targetMonths) - 1);
      return Math.ceil(payment * 100) / 100;
    };

    // Debt Details
    sectionTitle('Debt Details');
    const detailColW = [contentW * 0.22, contentW * 0.13, contentW * 0.10, contentW * 0.14, contentW * 0.13, contentW * 0.14, contentW * 0.14];
    tableRow(['Name', 'Balance', 'APR', 'Min Payment', 'Fixed Pmt', '3yr Payoff', 'Payoff Time'], detailColW, y, true, false);
    y += 18;

    scenarios.forEach((s, idx) => {
      checkPage(18);
      const threeYrPmt = calcRequiredPayment(s.balance, s.apr, 36);
      tableRow(
        [
          s.name,
          formatCurrency(s.balance, s.currency),
          `${(s.apr * 100).toFixed(2)}%`,
          formatCurrency(s.minPayment, s.currency),
          formatCurrency(s.fixedPayment || 0, s.currency),
          formatCurrency(threeYrPmt, s.currency),
          formatMonths(s.months)
        ],
        detailColW, y, false, idx % 2 === 0
      );
      y += 16;
    });
    y += 16;

    // Monthly Breakdowns
    scenarios.forEach(s => {
      if (!s.breakdown || s.breakdown.length === 0) return;
      checkPage(50);
      sectionTitle(`${s.type === 'card' ? 'Credit Card' : 'Loan'}: ${s.name} — Monthly Breakdown`);

      const bColW = [contentW * 0.15, contentW * 0.25, contentW * 0.25, contentW * 0.35];
      tableRow(['Month', 'Payment', 'Interest', 'Remaining Balance'], bColW, y, true, false);
      y += 18;

      const rowsToShow = s.breakdown; // show all months
      rowsToShow.forEach((row, idx) => {
        checkPage(16);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        if (idx % 2 === 0) {
          doc.setFillColor(250, 252, 255);
          doc.rect(margin, y - 12, contentW, 16, 'F');
        }
        const cols = [String(row.month), formatCurrency(row.payment, s.currency), formatCurrency(row.interest, s.currency), formatCurrency(row.balance, s.currency)];
        let x = margin + 6;
        cols.forEach((col, i) => {
          if (i === 0) {
            doc.text(col, x, y);
          } else {
            // Color interest red
            if (i === 2) doc.setTextColor(220, 38, 38);
            else if (i === 3) doc.setTextColor(30, 41, 59);
            doc.text(col, x + bColW[i] - 8, y, { align: 'right' });
            doc.setTextColor(30, 41, 59);
          }
          x += bColW[i];
        });
        y += 16;
      });
      y += 12;
    });

    // Footer on each page
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text('Generated by Debt Payoff Simulator · All calculations are estimates.', pageW / 2, pageH - 20, { align: 'center' });
      doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 20, { align: 'right' });
    }

    // Export as ArrayBuffer, wrap in File object, and upload
    const pdfBytes = doc.output('arraybuffer');
    const pdfFile = new File([pdfBytes], 'debt-payoff-report.pdf', { type: 'application/pdf' });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });

    // Send email with download link
    const htmlBody = `
      <div style="font-family:sans-serif;max-width:580px;margin:0 auto;color:#1e293b;">
        <div style="background:linear-gradient(135deg,#1e3a5f,#0f766e);padding:28px 24px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;">📊 Debt Payoff Simulator Report</h1>
          <p style="color:#94d5cc;margin:6px 0 0;font-size:13px;">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div style="padding:24px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 16px;">Your debt payoff report is ready. Click the button below to download your PDF.</p>
          <a href="${file_url}" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">⬇ Download PDF Report</a>
          <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">If the button doesn't work, copy this link: ${file_url}</p>
          <p style="margin:16px 0 0;font-size:11px;color:#d1d5db;">All calculations are estimates for planning purposes only.</p>
        </div>
      </div>
    `;

    await base44.integrations.Core.SendEmail({
      to: email,
      subject: '📊 Your Debt Payoff Simulator Report (PDF)',
      body: htmlBody,
      from_name: 'Debt Payoff Simulator'
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Email report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
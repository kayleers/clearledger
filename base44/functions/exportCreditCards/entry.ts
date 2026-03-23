import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cards = await base44.entities.CreditCard.filter({ is_active: true });

    const doc = new jsPDF();
    let yPos = 20;
    const margin = 20;

    const formatCurrency = (amount, currency = 'USD') => {
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
      }).format(amount || 0);
      
      // Replace Unicode currency symbols with ASCII equivalents for PDF compatibility
      return formatted
        .replace(/€/g, 'EUR ')
        .replace(/£/g, 'GBP ')
        .replace(/¥/g, 'JPY ')
        .replace(/₹/g, 'INR ')
        .replace(/₽/g, 'RUB ')
        .replace(/₩/g, 'KRW ')
        .replace(/₪/g, 'ILS ')
        .replace(/₱/g, 'PHP ')
        .replace(/₺/g, 'TRY ')
        .replace(/฿/g, 'THB ')
        .replace(/₫/g, 'VND ')
        .replace(/zł/g, 'PLN ')
        .replace(/₴/g, 'UAH ')
        .replace(/₡/g, 'CRC ')
        .replace(/₦/g, 'NGN ')
        .replace(/₨/g, 'PKR ')
        .replace(/₲/g, 'PYG ')
        .replace(/₵/g, 'GHS ')
        .replace(/₸/g, 'KZT ')
        .replace(/₼/g, 'AZN ')
        .replace(/៛/g, 'KHR ')
        .replace(/₮/g, 'MNT ')
        .replace(/元/g, 'CNY ')
        .replace(/円/g, 'JPY ')
        .replace(/원/g, 'KRW ');
    };

    // Title
    doc.setFontSize(24);
    doc.setTextColor(16, 185, 129);
    doc.text('Credit Cards Report', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    if (cards.length === 0) {
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text('No credit cards configured.', margin, yPos);
    } else {
      cards.forEach(card => {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(16, 185, 129);
        doc.text(card.name, margin, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setTextColor(0);
        
        doc.text(`Balance: ${formatCurrency(card.balance, card.currency)}`, margin + 5, yPos);
        yPos += 5;
        
        doc.text(`Credit Limit: ${formatCurrency(card.credit_limit, card.currency)}`, margin + 5, yPos);
        yPos += 5;
        
        const utilization = (card.balance / card.credit_limit * 100).toFixed(1);
        doc.text(`Utilization: ${utilization}%`, margin + 5, yPos);
        yPos += 5;
        
        doc.text(`APR: ${(card.apr * 100).toFixed(2)}%${card.apr_is_variable ? ' (Variable)' : ' (Fixed)'}`, margin + 5, yPos);
        yPos += 5;
        
        doc.text(`Minimum Payment: ${formatCurrency(card.min_payment, card.currency)}`, margin + 5, yPos);
        yPos += 5;
        
        doc.text(`Due Date: Day ${card.due_date}`, margin + 5, yPos);
        yPos += 5;
        
        doc.text(`Payment Method: ${card.payment_method === 'autopay' ? 'Autopay' : 'Manual'}`, margin + 5, yPos);
        yPos += 5;

        if (card.projected_monthly_payment) {
          doc.text(`Projected Payment: ${formatCurrency(card.projected_monthly_payment, card.currency)}`, margin + 5, yPos);
          yPos += 5;
        }

        yPos += 8;
      });

      // Summary
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(16, 185, 129);
      doc.text('Summary', margin, yPos);
      yPos += 8;

      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(`Total Credit Cards: ${cards.length}`, margin, yPos);
      yPos += 6;

      const totalByCurrency = {};
      cards.forEach(card => {
        const curr = card.currency || 'USD';
        totalByCurrency[curr] = (totalByCurrency[curr] || 0) + card.balance;
      });

      Object.entries(totalByCurrency).forEach(([currency, total]) => {
        doc.text(`Total Balance (${currency}): ${formatCurrency(total, currency)}`, margin, yPos);
        yPos += 6;
      });

      const creditLimitByCurrency = {};
      cards.forEach(card => {
        const curr = card.currency || 'USD';
        creditLimitByCurrency[curr] = (creditLimitByCurrency[curr] || 0) + card.credit_limit;
      });

      yPos += 3;
      Object.entries(creditLimitByCurrency).forEach(([currency, total]) => {
        doc.text(`Total Credit Limit (${currency}): ${formatCurrency(total, currency)}`, margin, yPos);
        yPos += 6;
      });
    }

    const pdfBytes = doc.output('arraybuffer');
    const filename = `Credit_Cards_${new Date().toISOString().split('T')[0]}.pdf`;
    const pdfFile = new File([pdfBytes], filename, { type: 'application/pdf' });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: 'ClearLedger – Your Credit Cards Report',
      body: `<p>Hi,</p><p>Your ClearLedger credit cards report is ready to download.</p><p style="margin:24px 0;"><a href="${file_url}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Download PDF Report</a></p><p style="color:#888;font-size:12px;">Generated on ${new Date().toLocaleDateString()} for ${user.email}</p>`
    });

    return Response.json({ success: true, message: `Report sent to ${user.email}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
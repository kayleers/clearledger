import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, scenarios, interestByCurrency, interestSavedByCurrency, longestMonths } = await req.json();

    if (!email || !scenarios || scenarios.length === 0) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Build HTML email body with the report
    const formatCurrency = (amount, currency = 'USD') =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount || 0);

    const formatMonths = (months) => {
      if (!months || months === 0) return '0 months';
      const years = Math.floor(months / 12);
      const rem = months % 12;
      if (years === 0) return `${months} month${months === 1 ? '' : 's'}`;
      if (rem === 0) return `${years} year${years === 1 ? '' : 's'}`;
      return `${years} year${years === 1 ? '' : 's'}, ${rem} month${rem === 1 ? '' : 's'}`;
    };

    const scenarioRows = scenarios.map(s => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:10px 12px;">${s.type === 'card' ? '💳' : '🏦'} ${s.name}</td>
        <td style="padding:10px 12px;text-align:right;">${formatCurrency(s.balance, s.currency)}</td>
        <td style="padding:10px 12px;text-align:right;">${(s.apr * 100).toFixed(2)}%</td>
        <td style="padding:10px 12px;text-align:right;">${formatCurrency(s.totalInterest, s.currency)}</td>
        <td style="padding:10px 12px;text-align:right;font-weight:600;">${formatMonths(s.months)}</td>
      </tr>
    `).join('');

    const summaryRows = Object.entries(interestByCurrency).map(([curr, amt]) => `
      <tr>
        <td style="padding:6px 12px;color:#6b7280;">Total Interest (${curr})</td>
        <td style="padding:6px 12px;text-align:right;font-weight:600;color:#dc2626;">${formatCurrency(amt, curr)}</td>
      </tr>
    `).join('') + Object.entries(interestSavedByCurrency).filter(([, v]) => v > 0).map(([curr, amt]) => `
      <tr>
        <td style="padding:6px 12px;color:#6b7280;">Interest Saved vs Minimums (${curr})</td>
        <td style="padding:6px 12px;text-align:right;font-weight:600;color:#059669;">${formatCurrency(amt, curr)}</td>
      </tr>
    `).join('');

    // Build breakdown tables for first 24 months per debt
    const breakdownSections = scenarios.map(s => {
      if (!s.breakdown || s.breakdown.length === 0) return '';
      const rows = s.breakdown.slice(0, 24).map(row => `
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:6px 10px;color:#6b7280;">${row.month}</td>
          <td style="padding:6px 10px;text-align:right;">${formatCurrency(row.payment, s.currency)}</td>
          <td style="padding:6px 10px;text-align:right;color:#dc2626;">${formatCurrency(row.interest, s.currency)}</td>
          <td style="padding:6px 10px;text-align:right;font-weight:500;">${formatCurrency(row.balance, s.currency)}</td>
        </tr>
      `).join('');
      const more = s.breakdown.length > 24 ? `<p style="text-align:center;font-size:12px;color:#9ca3af;margin:4px 0 0;">...${s.breakdown.length - 24} more months not shown</p>` : '';
      return `
        <h3 style="margin:24px 0 8px;font-size:15px;color:#1e293b;">${s.type === 'card' ? '💳' : '🏦'} ${s.name} — Monthly Breakdown</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
          <thead style="background:#f8fafc;">
            <tr>
              <th style="padding:8px 10px;text-align:left;color:#475569;">Month</th>
              <th style="padding:8px 10px;text-align:right;color:#475569;">Payment</th>
              <th style="padding:8px 10px;text-align:right;color:#475569;">Interest</th>
              <th style="padding:8px 10px;text-align:right;color:#475569;">Balance</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${more}
      `;
    }).join('');

    const htmlBody = `
      <div style="font-family:sans-serif;max-width:640px;margin:0 auto;color:#1e293b;">
        <div style="background:linear-gradient(135deg,#1e3a5f,#0f766e);padding:28px 24px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">📊 Debt Payoff Simulator Report</h1>
          <p style="color:#94d5cc;margin:6px 0 0;font-size:14px;">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div style="padding:24px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">

          <h2 style="font-size:16px;margin:0 0 12px;color:#1e293b;">Summary</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
            <tbody>
              <tr>
                <td style="padding:10px 12px;color:#6b7280;">Time to Pay Off (longest)</td>
                <td style="padding:10px 12px;text-align:right;font-weight:600;">${formatMonths(longestMonths)}</td>
              </tr>
              ${summaryRows}
            </tbody>
          </table>

          <h2 style="font-size:16px;margin:24px 0 12px;color:#1e293b;">Debt Details</h2>
          <table style="width:100%;border-collapse:collapse;font-size:13px;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
            <thead style="background:#f8fafc;">
              <tr>
                <th style="padding:10px 12px;text-align:left;color:#475569;">Name</th>
                <th style="padding:10px 12px;text-align:right;color:#475569;">Balance</th>
                <th style="padding:10px 12px;text-align:right;color:#475569;">APR</th>
                <th style="padding:10px 12px;text-align:right;color:#475569;">Interest</th>
                <th style="padding:10px 12px;text-align:right;color:#475569;">Payoff Time</th>
              </tr>
            </thead>
            <tbody>${scenarioRows}</tbody>
          </table>

          ${breakdownSections}

          <p style="margin-top:24px;font-size:12px;color:#9ca3af;text-align:center;">
            This report was generated by the Debt Payoff Simulator. All calculations are estimates.
          </p>
        </div>
      </div>
    `;

    await base44.integrations.Core.SendEmail({
      to: email,
      subject: '📊 Your Debt Payoff Simulator Report',
      body: htmlBody,
      from_name: 'Debt Payoff Simulator'
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Email report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
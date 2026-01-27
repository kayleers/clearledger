import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deposits = await base44.entities.RecurringDeposit.filter({ is_active: true });
    const bankAccounts = await base44.entities.BankAccount.filter({ is_active: true });

    const doc = new jsPDF();
    let yPos = 20;
    const margin = 20;

    const formatCurrency = (amount, currency = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
      }).format(amount || 0);
    };

    const frequencyLabels = {
      weekly: 'Weekly',
      bi_weekly: 'Bi-Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly'
    };

    const categoryLabels = {
      salary: 'Salary',
      freelance: 'Freelance',
      business: 'Business',
      refund: 'Refund',
      transfer: 'Transfer',
      other: 'Other'
    };

    // Title
    doc.setFontSize(24);
    doc.setTextColor(16, 185, 129);
    doc.text('Recurring Deposits Report', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    if (deposits.length === 0) {
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text('No recurring deposits configured.', margin, yPos);
    } else {
      // Group by category
      const depositsByCategory = {};
      deposits.forEach(deposit => {
        const cat = deposit.category || 'other';
        if (!depositsByCategory[cat]) depositsByCategory[cat] = [];
        depositsByCategory[cat].push(deposit);
      });

      Object.entries(depositsByCategory).forEach(([category, categoryDeposits]) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(16, 185, 129);
        doc.text(categoryLabels[category] || category, margin, yPos);
        yPos += 8;

        categoryDeposits.forEach(deposit => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(11);
          doc.setTextColor(0);
          doc.text(deposit.name, margin + 5, yPos);
          yPos += 5;

          doc.setFontSize(9);
          doc.setTextColor(100);
          
          const frequency = frequencyLabels[deposit.frequency] || deposit.frequency;
          let amountText = formatCurrency(deposit.amount, deposit.currency);
          
          if (deposit.amount_type === 'variable' && deposit.min_amount) {
            amountText = `${formatCurrency(deposit.min_amount, deposit.currency)} - ${formatCurrency(deposit.max_amount, deposit.currency)}`;
          }
          
          doc.text(`${frequency} • ${amountText}`, margin + 10, yPos);
          yPos += 4;

          if (deposit.deposit_date) {
            doc.text(`Date: Day ${deposit.deposit_date} of month`, margin + 10, yPos);
            yPos += 4;
          }

          if (deposit.start_date) {
            doc.text(`Started: ${deposit.start_date}`, margin + 10, yPos);
            yPos += 4;
          }

          if (deposit.end_date) {
            doc.text(`Ends: ${deposit.end_date}`, margin + 10, yPos);
            yPos += 4;
          }

          const depositAccount = bankAccounts.find(a => a.id === deposit.bank_account_id);
          if (depositAccount) {
            doc.text(`Deposits to: ${depositAccount.name}`, margin + 10, yPos);
            yPos += 4;
          }

          yPos += 4;
        });

        yPos += 5;
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
      doc.text(`Total Deposits: ${deposits.length}`, margin, yPos);
      yPos += 6;

      const totalByCurrency = {};
      deposits.forEach(deposit => {
        const curr = deposit.currency || 'USD';
        totalByCurrency[curr] = (totalByCurrency[curr] || 0) + deposit.amount;
      });

      Object.entries(totalByCurrency).forEach(([currency, total]) => {
        doc.text(`Monthly Average (${currency}): ${formatCurrency(total, currency)}`, margin, yPos);
        yPos += 6;
      });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Recurring_Deposits_${new Date().toISOString().split('T')[0]}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transfers = await base44.entities.BankTransfer.filter({ is_active: true });
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
      one_time: 'One Time',
      weekly: 'Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly'
    };

    // Title
    doc.setFontSize(24);
    doc.setTextColor(16, 185, 129);
    doc.text('Recurring Bank Transfers', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    const recurringTransfers = transfers.filter(t => t.frequency !== 'one_time');

    if (recurringTransfers.length === 0) {
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text('No recurring bank transfers configured.', margin, yPos);
    } else {
      // Group by currency
      const transfersByCurrency = {};
      recurringTransfers.forEach(transfer => {
        const curr = transfer.currency || 'USD';
        if (!transfersByCurrency[curr]) transfersByCurrency[curr] = [];
        transfersByCurrency[curr].push(transfer);
      });

      Object.entries(transfersByCurrency).forEach(([currency, currencyTransfers]) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(16, 185, 129);
        doc.text(`Transfers in ${currency}`, margin, yPos);
        yPos += 8;

        currencyTransfers.forEach(transfer => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(11);
          doc.setTextColor(0);
          doc.text(transfer.name, margin + 5, yPos);
          yPos += 5;

          doc.setFontSize(9);
          doc.setTextColor(100);
          
          const frequency = frequencyLabels[transfer.frequency] || transfer.frequency;
          if (transfer.amount_type === 'variable') {
            doc.text(`${frequency} • ${formatCurrency(transfer.min_amount, currency)} - ${formatCurrency(transfer.max_amount, currency)}`, margin + 10, yPos);
          } else {
            doc.text(`${frequency} • ${formatCurrency(transfer.amount, currency)}`, margin + 10, yPos);
          }
          yPos += 4;

          const fromAccount = bankAccounts.find(a => a.id === transfer.from_account_id);
          const toAccount = bankAccounts.find(a => a.id === transfer.to_account_id);
          
          if (fromAccount || toAccount) {
            doc.text(`From: ${fromAccount?.name || 'Unknown'} → To: ${toAccount?.name || 'Unknown'}`, margin + 10, yPos);
            yPos += 4;
          }

          if (transfer.transfer_date) {
            doc.text(`Transfer Date: Day ${transfer.transfer_date} of month`, margin + 10, yPos);
            yPos += 4;
          }

          if (transfer.start_date) {
            doc.text(`Started: ${transfer.start_date}`, margin + 10, yPos);
            yPos += 4;
          }

          if (transfer.end_date) {
            doc.text(`Ends: ${transfer.end_date}`, margin + 10, yPos);
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
      doc.text(`Total Recurring Transfers: ${recurringTransfers.length}`, margin, yPos);
      yPos += 6;

      const totalByCurrency = {};
      recurringTransfers.forEach(transfer => {
        const curr = transfer.currency || 'USD';
        totalByCurrency[curr] = (totalByCurrency[curr] || 0) + transfer.amount;
      });

      Object.entries(totalByCurrency).forEach(([currency, total]) => {
        doc.text(`Total (${currency}): ${formatCurrency(total, currency)}`, margin, yPos);
        yPos += 6;
      });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Bank_Transfers_${new Date().toISOString().split('T')[0]}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
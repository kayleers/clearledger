import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bills = await base44.entities.RecurringBill.filter({ is_active: true });
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

    const categoryLabels = {
      utilities: 'Utilities',
      subscription: 'Subscription',
      insurance: 'Insurance',
      rent: 'Rent',
      loan: 'Loan',
      other: 'Other'
    };

    // Title
    doc.setFontSize(24);
    doc.setTextColor(16, 185, 129);
    doc.text('Recurring Bills Report', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    if (bills.length === 0) {
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text('No recurring bills configured.', margin, yPos);
    } else {
      // Group by category
      const billsByCategory = {};
      bills.forEach(bill => {
        const cat = bill.category || 'other';
        if (!billsByCategory[cat]) billsByCategory[cat] = [];
        billsByCategory[cat].push(bill);
      });

      Object.entries(billsByCategory).forEach(([category, categoryBills]) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(16, 185, 129);
        doc.text(categoryLabels[category] || category, margin, yPos);
        yPos += 8;

        categoryBills.forEach(bill => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(11);
          doc.setTextColor(0);
          doc.text(bill.name, margin + 5, yPos);
          yPos += 5;

          doc.setFontSize(9);
          doc.setTextColor(100);
          
          const frequency = frequencyLabels[bill.frequency] || bill.frequency;
          doc.text(`${frequency} • ${formatCurrency(bill.amount, bill.currency)}`, margin + 10, yPos);
          yPos += 4;

          if (bill.due_date) {
            doc.text(`Due: Day ${bill.due_date} of month`, margin + 10, yPos);
            yPos += 4;
          }

          if (bill.start_date) {
            doc.text(`Started: ${bill.start_date}`, margin + 10, yPos);
            yPos += 4;
          }

          if (bill.end_date) {
            doc.text(`Ends: ${bill.end_date}`, margin + 10, yPos);
            yPos += 4;
          }

          const paymentAccount = bankAccounts.find(a => a.id === bill.bank_account_id);
          if (paymentAccount) {
            doc.text(`Payment from: ${paymentAccount.name}`, margin + 10, yPos);
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
      doc.text(`Total Bills: ${bills.length}`, margin, yPos);
      yPos += 6;

      const totalByCurrency = {};
      bills.forEach(bill => {
        const curr = bill.currency || 'USD';
        totalByCurrency[curr] = (totalByCurrency[curr] || 0) + bill.amount;
      });

      Object.entries(totalByCurrency).forEach(([currency, total]) => {
        doc.text(`Monthly Total (${currency}): ${formatCurrency(total, currency)}`, margin, yPos);
        yPos += 6;
      });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Recurring_Bills_${new Date().toISOString().split('T')[0]}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
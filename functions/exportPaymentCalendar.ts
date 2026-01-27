import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { month, year } = await req.json();
    
    const [cards, bills, loans] = await Promise.all([
      base44.entities.CreditCard.filter({ is_active: true }),
      base44.entities.RecurringBill.filter({ is_active: true }),
      base44.entities.MortgageLoan.filter({ is_active: true })
    ]);

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

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];

    // Title
    doc.setFontSize(24);
    doc.setTextColor(16, 185, 129);
    doc.text('Payment Schedule', margin, yPos);
    yPos += 8;

    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text(`${monthNames[month]} ${year}`, margin, yPos);
    yPos += 5;

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    // Collect all payments
    const payments = [];

    // Card payments
    cards.forEach(card => {
      if (card.due_date) {
        payments.push({
          date: card.due_date,
          name: card.name,
          type: 'Credit Card',
          amount: card.projected_monthly_payment || card.min_payment || 0,
          currency: card.currency
        });
      }
    });

    // Bills
    bills.forEach(bill => {
      if (bill.frequency === 'monthly' && bill.due_date) {
        payments.push({
          date: bill.due_date,
          name: bill.name,
          type: 'Bill',
          amount: bill.amount,
          currency: bill.currency
        });
      }
    });

    // Loans
    loans.forEach(loan => {
      if (loan.payment_due_date) {
        payments.push({
          date: loan.payment_due_date,
          name: loan.name,
          type: 'Loan',
          amount: loan.projected_monthly_payment || loan.monthly_payment || 0,
          currency: loan.currency
        });
      }
    });

    // Sort by date
    payments.sort((a, b) => a.date - b.date);

    // Group by date
    const paymentsByDate = {};
    payments.forEach(payment => {
      if (!paymentsByDate[payment.date]) {
        paymentsByDate[payment.date] = [];
      }
      paymentsByDate[payment.date].push(payment);
    });

    // Render payments
    Object.entries(paymentsByDate).forEach(([date, items]) => {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(16, 185, 129);
      doc.text(`Day ${date}`, margin, yPos);
      yPos += 8;

      items.forEach(item => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text(`${item.name} (${item.type})`, margin + 5, yPos);
        doc.text(formatCurrency(item.amount, item.currency), 150, yPos);
        yPos += 7;
      });

      yPos += 5;
    });

    // Summary
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    yPos += 10;
    doc.setFontSize(16);
    doc.setTextColor(16, 185, 129);
    doc.text('Summary', margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Payments: ${payments.length}`, margin, yPos);
    yPos += 7;

    const totalByCurrency = {};
    payments.forEach(p => {
      totalByCurrency[p.currency] = (totalByCurrency[p.currency] || 0) + p.amount;
    });

    Object.entries(totalByCurrency).forEach(([currency, total]) => {
      doc.text(`Total (${currency}): ${formatCurrency(total, currency)}`, margin, yPos);
      yPos += 7;
    });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Payment_Schedule_${monthNames[month]}_${year}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
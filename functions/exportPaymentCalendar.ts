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
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    const formatCurrency = (amount, currency = 'USD') => {
      const formatted = (amount || 0).toFixed(2);
      // Use simple ASCII symbols to avoid encoding issues in PDF
      const symbols = {
        'USD': '$',
        'EUR': 'EUR ',
        'GBP': 'GBP ',
        'JPY': 'JPY '
      };
      const symbol = symbols[currency] || currency + ' ';
      return symbol === '$' ? `$${formatted}` : `${symbol}${formatted}`;
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

    // PAGE 1: LIST VIEW
    doc.setFontSize(16);
    doc.setTextColor(16, 185, 129);
    doc.text('Transaction List', margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(0);

    Object.entries(paymentsByDate).forEach(([date, items]) => {
      if (yPos > 245) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(60, 60, 60);
      doc.setFont(undefined, 'bold');
      doc.text(`Day ${date}`, margin, yPos);
      yPos += 7;

      doc.setFont(undefined, 'normal');
      items.forEach(item => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        
        // Truncate long names to fit properly
        const maxNameLength = 40;
        const nameText = item.name.length > maxNameLength ? 
          item.name.substring(0, maxNameLength) + '...' : 
          item.name;
        const typeText = `(${item.type})`;
        const amountText = formatCurrency(item.amount, item.currency);
        
        // Draw name and type on same line
        doc.text(`${nameText} ${typeText}`, margin + 5, yPos);
        
        // Draw amount right-aligned
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text(amountText, pageWidth - margin, yPos, { align: 'right' });
        doc.setFont(undefined, 'normal');
        
        yPos += 6;
      });

      yPos += 4;
    });

    // Add summary on same page if room
    if (yPos > 210) {
      doc.addPage();
      yPos = 20;
    }

    yPos += 8;
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.setFont(undefined, 'bold');
    doc.text('Summary', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Payments: ${payments.length}`, margin, yPos);
    yPos += 6;

    const totalByCurrency = {};
    payments.forEach(p => {
      totalByCurrency[p.currency] = (totalByCurrency[p.currency] || 0) + p.amount;
    });

    doc.setFont(undefined, 'bold');
    Object.entries(totalByCurrency).forEach(([currency, total]) => {
      doc.text(`Total (${currency}): ${formatCurrency(total, currency)}`, margin, yPos);
      yPos += 6;
    });

    // PAGE 2+: CALENDAR VIEW
    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.setTextColor(16, 185, 129);
    doc.setFont(undefined, 'bold');
    doc.text('Calendar View', margin, yPos);
    yPos += 12;

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Draw calendar header
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const cellWidth = (pageWidth - margin * 2) / 7;
    const cellHeight = 28;

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(80, 80, 80);

    dayNames.forEach((day, idx) => {
      const x = margin + idx * cellWidth;
      doc.text(day, x + cellWidth / 2, yPos, { align: 'center' });
    });

    yPos += 6;

    // Draw calendar grid
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    let dayCounter = 1;

    for (let week = 0; week < 6 && dayCounter <= daysInMonth; week++) {
      for (let day = 0; day < 7; day++) {
        const x = margin + day * cellWidth;
        const y = yPos + week * cellHeight;

        // Draw cell border
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.rect(x, y, cellWidth, cellHeight);

        if (week === 0 && day < firstDay) {
          continue;
        }

        if (dayCounter > daysInMonth) {
          break;
        }

        const dayPayments = paymentsByDate[dayCounter] || [];
        
        // Highlight cells with payments
        if (dayPayments.length > 0) {
          doc.setFillColor(16, 185, 129);
          doc.rect(x, y, cellWidth, cellHeight, 'F');
          doc.setTextColor(255, 255, 255);
        } else {
          doc.setTextColor(40, 40, 40);
        }

        // Day number
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        doc.text(dayCounter.toString(), x + 2, y + 5);

        // Payments in cell (truncate to fit)
        doc.setFont(undefined, 'normal');
        doc.setFontSize(7);
        let cellYPos = y + 10;

        dayPayments.slice(0, 3).forEach((payment, idx) => {
          if (idx >= 2) {
            doc.text(`+${dayPayments.length - 2} more`, x + 2, cellYPos);
            return;
          }
          // Truncate name to fit cell width
          const maxChars = Math.floor(cellWidth / 1.5);
          const shortName = payment.name.length > maxChars ? 
            payment.name.substring(0, maxChars - 1) : 
            payment.name;
          doc.text(shortName, x + 2, cellYPos);
          cellYPos += 3.5;
        });

        dayCounter++;
      }

      if (dayCounter > daysInMonth) {
        break;
      }
    }

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
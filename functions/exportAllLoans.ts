import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loans = await base44.entities.MortgageLoan.filter({ is_active: true });

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

    const loanTypeLabels = {
      mortgage: 'Mortgage',
      auto: 'Auto Loan',
      personal: 'Personal Loan',
      student: 'Student Loan',
      business: 'Business Loan',
      other: 'Other Loan'
    };

    // Title
    doc.setFontSize(24);
    doc.setTextColor(16, 185, 129);
    doc.text('Loans Report', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    if (loans.length === 0) {
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text('No loans configured.', margin, yPos);
    } else {
      loans.forEach(loan => {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(16, 185, 129);
        doc.text(loan.name, margin, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setTextColor(0);
        
        doc.text(`Type: ${loanTypeLabels[loan.loan_type] || 'Other'}`, margin + 5, yPos);
        yPos += 5;
        
        doc.text(`Original Amount: ${formatCurrency(loan.loan_amount, loan.currency)}`, margin + 5, yPos);
        yPos += 5;
        
        doc.text(`Current Balance: ${formatCurrency(loan.current_balance, loan.currency)}`, margin + 5, yPos);
        yPos += 5;
        
        doc.text(`Interest Rate: ${(loan.interest_rate * 100).toFixed(2)}%`, margin + 5, yPos);
        yPos += 5;
        
        doc.text(`Monthly Payment: ${formatCurrency(loan.monthly_payment, loan.currency)}`, margin + 5, yPos);
        yPos += 5;

        if (loan.projected_monthly_payment) {
          doc.text(`Projected Payment: ${formatCurrency(loan.projected_monthly_payment, loan.currency)}`, margin + 5, yPos);
          yPos += 5;
        }
        
        const progress = ((loan.loan_amount - loan.current_balance) / loan.loan_amount * 100).toFixed(1);
        doc.text(`Progress: ${progress}% paid`, margin + 5, yPos);
        yPos += 5;

        if (loan.loan_term_months) {
          doc.text(`Loan Term: ${loan.loan_term_months} months`, margin + 5, yPos);
          yPos += 5;
        }

        if (loan.payment_due_date) {
          doc.text(`Payment Due: Day ${loan.payment_due_date}`, margin + 5, yPos);
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
      doc.text(`Total Loans: ${loans.length}`, margin, yPos);
      yPos += 6;

      const totalByCurrency = {};
      loans.forEach(loan => {
        const curr = loan.currency || 'USD';
        totalByCurrency[curr] = (totalByCurrency[curr] || 0) + loan.current_balance;
      });

      Object.entries(totalByCurrency).forEach(([currency, total]) => {
        doc.text(`Total Balance (${currency}): ${formatCurrency(total, currency)}`, margin, yPos);
        yPos += 6;
      });

      const originalAmountByCurrency = {};
      loans.forEach(loan => {
        const curr = loan.currency || 'USD';
        originalAmountByCurrency[curr] = (originalAmountByCurrency[curr] || 0) + loan.loan_amount;
      });

      yPos += 3;
      Object.entries(originalAmountByCurrency).forEach(([currency, total]) => {
        doc.text(`Total Original Amount (${currency}): ${formatCurrency(total, currency)}`, margin, yPos);
        yPos += 6;
      });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Loans_${new Date().toISOString().split('T')[0]}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
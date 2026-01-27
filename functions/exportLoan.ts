import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { loanId } = await req.json();
    
    const [loan, payments] = await Promise.all([
      base44.entities.MortgageLoan.filter({ id: loanId }),
      base44.entities.LoanPayment.filter({ loan_id: loanId })
    ]);

    if (!loan || loan.length === 0) {
      return Response.json({ error: 'Loan not found' }, { status: 404 });
    }

    const loanData = loan[0];
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

    // Title
    doc.setFontSize(24);
    doc.setTextColor(16, 185, 129);
    doc.text('Loan Report', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    // Loan Details
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.text(loanData.name, margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Loan Type: ${loanData.loan_type}`, margin, yPos);
    yPos += 6;
    doc.text(`Original Amount: ${formatCurrency(loanData.loan_amount, loanData.currency)}`, margin, yPos);
    yPos += 6;
    doc.text(`Current Balance: ${formatCurrency(loanData.current_balance, loanData.currency)}`, margin, yPos);
    yPos += 6;
    doc.text(`Interest Rate: ${(loanData.interest_rate * 100).toFixed(2)}%`, margin, yPos);
    yPos += 6;
    doc.text(`Monthly Payment: ${formatCurrency(loanData.monthly_payment, loanData.currency)}`, margin, yPos);
    yPos += 6;
    if (loanData.loan_term_months) {
      doc.text(`Loan Term: ${loanData.loan_term_months} months (${Math.floor(loanData.loan_term_months / 12)} years)`, margin, yPos);
      yPos += 6;
    }
    if (loanData.start_date) {
      doc.text(`Start Date: ${loanData.start_date}`, margin, yPos);
      yPos += 6;
    }
    if (loanData.payment_due_date) {
      doc.text(`Payment Due: ${loanData.payment_due_date}${getOrdinal(loanData.payment_due_date)} of month`, margin, yPos);
      yPos += 6;
    }

    const paidAmount = loanData.loan_amount - loanData.current_balance;
    const progress = (paidAmount / loanData.loan_amount) * 100;
    doc.text(`Progress: ${progress.toFixed(1)}% paid`, margin, yPos);
    yPos += 15;

    // Payment History
    if (payments.length > 0) {
      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129);
      doc.text('Payment History', margin, yPos);
      yPos += 8;

      payments.slice(0, 30).forEach((payment) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(`${payment.date}`, margin + 5, yPos);
        doc.text(formatCurrency(payment.amount, loanData.currency), 150, yPos);
        if (payment.note) {
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(payment.note, margin + 10, yPos + 4);
          yPos += 4;
        }
        yPos += 6;
      });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Loan_${loanData.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
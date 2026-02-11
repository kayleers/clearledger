import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scenario_id } = await req.json();

    if (!scenario_id) {
      return Response.json({ error: 'Scenario ID required' }, { status: 400 });
    }

    // Fetch scenario
    const scenario = await base44.entities.MultiPaymentScenario.get(scenario_id);
    
    if (!scenario) {
      return Response.json({ error: 'Scenario not found' }, { status: 404 });
    }

    // Fetch all cards and loans for reference
    const [cards, loans] = await Promise.all([
      base44.entities.CreditCard.filter({ is_active: true }),
      base44.entities.MortgageLoan.filter({ is_active: true })
    ]);

    const doc = new jsPDF();
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;

    const checkNewPage = (spaceNeeded = 20) => {
      if (yPos + spaceNeeded > pageHeight - margin) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };

    const formatCurrency = (amount, currency = 'USD') => {
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
      }).format(amount || 0);
      
      return formatted
        .replace(/€/g, 'EUR ')
        .replace(/£/g, 'GBP ')
        .replace(/¥/g, 'JPY ')
        .replace(/₹/g, 'INR ');
    };

    const formatMonthsToYears = (months) => {
      if (!months || months === 0) return '0 months';
      if (months === Infinity) return 'Never';
      
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      
      if (years === 0) return `${months} ${months === 1 ? 'month' : 'months'}`;
      if (remainingMonths === 0) return `${years} ${years === 1 ? 'year' : 'years'}`;
      
      return `${years} ${years === 1 ? 'year' : 'years'}, ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
    };

    // Title
    doc.setFontSize(24);
    doc.setTextColor(16, 185, 129);
    doc.text('Payment Scenario Report', margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, yPos);
    doc.text(`Account: ${user.email}`, margin, yPos + 5);
    yPos += 15;

    // Scenario Name
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(`Scenario: ${scenario.name}`, margin, yPos);
    yPos += 10;

    // Summary Stats
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.text('Summary', margin, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Payoff Time: ${formatMonthsToYears(scenario.total_months)}`, margin + 5, yPos);
    yPos += 7;
    doc.text(`Total Interest: ${formatCurrency(scenario.total_interest)}`, margin + 5, yPos);
    yPos += 7;
    
    if (scenario.interest_saved && scenario.interest_saved > 0) {
      doc.setTextColor(0, 150, 0);
      doc.text(`Interest Saved: ${formatCurrency(scenario.interest_saved)}`, margin + 5, yPos);
      doc.setTextColor(0);
      yPos += 7;
    }
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Payment Type: ${scenario.payment_data?.type || 'unknown'}`, margin + 5, yPos);
    yPos += 15;

    // Payment Details by Card/Loan
    const data = scenario.payment_data;

    if (data.cards && data.cards.length > 0) {
      checkNewPage(30);
      doc.setFontSize(14);
      doc.setTextColor(16, 185, 129);
      doc.text('Credit Card Payments', margin, yPos);
      yPos += 8;

      data.cards.forEach(cardPayment => {
        const card = cards.find(c => c.id === cardPayment.id);
        if (!card) return;

        checkNewPage(25);
        
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(card.name, margin + 5, yPos);
        yPos += 6;
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Balance: ${formatCurrency(card.balance, card.currency)}`, margin + 10, yPos);
        yPos += 5;
        doc.text(`APR: ${(card.apr * 100).toFixed(2)}%`, margin + 10, yPos);
        yPos += 5;

        if (data.type === 'fixed') {
          doc.setTextColor(0, 100, 200);
          doc.text(`Monthly Payment: ${formatCurrency(cardPayment.amount, card.currency)}`, margin + 10, yPos);
          yPos += 5;
        } else if (data.type === 'target') {
          doc.setTextColor(0, 100, 200);
          doc.text(`Target: ${formatMonthsToYears(cardPayment.targetMonths)}`, margin + 10, yPos);
          yPos += 5;
        } else if (data.type === 'variable') {
          doc.setTextColor(0, 100, 200);
          doc.text(`Default Payment: ${formatCurrency(cardPayment.defaultPayment || 0, card.currency)}`, margin + 10, yPos);
          yPos += 5;
          doc.setTextColor(100);
          doc.text(`Custom payments configured for specific months`, margin + 10, yPos);
          yPos += 5;
        }
        
        yPos += 5;
      });
    }

    if (data.loans && data.loans.length > 0) {
      checkNewPage(30);
      doc.setFontSize(14);
      doc.setTextColor(16, 185, 129);
      doc.text('Loan Payments', margin, yPos);
      yPos += 8;

      data.loans.forEach(loanPayment => {
        const loan = loans.find(l => l.id === loanPayment.id);
        if (!loan) return;

        checkNewPage(25);
        
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(loan.name, margin + 5, yPos);
        yPos += 6;
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Balance: ${formatCurrency(loan.current_balance, loan.currency)}`, margin + 10, yPos);
        yPos += 5;
        doc.text(`Interest Rate: ${(loan.interest_rate * 100).toFixed(2)}%`, margin + 10, yPos);
        yPos += 5;

        if (data.type === 'fixed') {
          doc.setTextColor(200, 100, 0);
          doc.text(`Monthly Payment: ${formatCurrency(loanPayment.amount, loan.currency)}`, margin + 10, yPos);
          yPos += 5;
        } else if (data.type === 'target') {
          doc.setTextColor(200, 100, 0);
          doc.text(`Target: ${formatMonthsToYears(loanPayment.targetMonths)}`, margin + 10, yPos);
          yPos += 5;
        } else if (data.type === 'variable') {
          doc.setTextColor(200, 100, 0);
          doc.text(`Default Payment: ${formatCurrency(loanPayment.defaultPayment || 0, loan.currency)}`, margin + 10, yPos);
          yPos += 5;
          doc.setTextColor(100);
          doc.text(`Custom payments configured for specific months`, margin + 10, yPos);
          yPos += 5;
        }
        
        yPos += 5;
      });
    }

    // Notes
    checkNewPage(20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('This scenario represents your custom payment plan.', margin, yPos);
    yPos += 5;
    doc.text('Actual results may vary based on future purchases and rate changes.', margin, yPos);

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Scenario_${scenario.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      }
    });
  } catch (error) {
    console.error('Export scenario error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
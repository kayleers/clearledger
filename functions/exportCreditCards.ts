import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
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
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
      }).format(amount || 0);
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

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Credit_Cards_${new Date().toISOString().split('T')[0]}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
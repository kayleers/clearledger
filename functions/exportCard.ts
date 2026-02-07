import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cardId } = await req.json();
    
    const [card, purchases, payments] = await Promise.all([
      base44.entities.CreditCard.filter({ id: cardId }),
      base44.entities.Purchase.filter({ card_id: cardId }),
      base44.entities.Payment.filter({ card_id: cardId })
    ]);

    if (!card || card.length === 0) {
      return Response.json({ error: 'Card not found' }, { status: 404 });
    }

    const cardData = card[0];
    const doc = new jsPDF();
    let yPos = 20;
    const margin = 20;

    const formatCurrency = (amount, currency = 'USD') => {
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
      }).format(amount || 0);
      
      // Replace Unicode currency symbols with ASCII equivalents for PDF compatibility
      return formatted
        .replace(/€/g, 'EUR ')
        .replace(/£/g, 'GBP ')
        .replace(/¥/g, 'JPY ')
        .replace(/₹/g, 'INR ')
        .replace(/₽/g, 'RUB ')
        .replace(/₩/g, 'KRW ')
        .replace(/₪/g, 'ILS ')
        .replace(/₱/g, 'PHP ')
        .replace(/₺/g, 'TRY ')
        .replace(/฿/g, 'THB ')
        .replace(/₫/g, 'VND ')
        .replace(/zł/g, 'PLN ')
        .replace(/₴/g, 'UAH ')
        .replace(/₡/g, 'CRC ')
        .replace(/₦/g, 'NGN ')
        .replace(/₨/g, 'PKR ')
        .replace(/₲/g, 'PYG ')
        .replace(/₵/g, 'GHS ')
        .replace(/₸/g, 'KZT ')
        .replace(/₼/g, 'AZN ')
        .replace(/៛/g, 'KHR ')
        .replace(/₮/g, 'MNT ')
        .replace(/元/g, 'CNY ')
        .replace(/円/g, 'JPY ')
        .replace(/원/g, 'KRW ');
    };

    // Title
    doc.setFontSize(24);
    doc.setTextColor(16, 185, 129);
    doc.text('Credit Card Report', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    // Card Details
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.text(cardData.name, margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Balance: ${formatCurrency(cardData.balance, cardData.currency)}`, margin, yPos);
    yPos += 6;
    doc.text(`Credit Limit: ${formatCurrency(cardData.credit_limit, cardData.currency)}`, margin, yPos);
    yPos += 6;
    doc.text(`Utilization: ${Math.round((cardData.balance / cardData.credit_limit) * 100)}%`, margin, yPos);
    yPos += 6;
    doc.text(`APR: ${(cardData.apr * 100).toFixed(2)}%${cardData.apr_is_variable ? ' (Variable)' : ' (Fixed)'}`, margin, yPos);
    yPos += 6;
    doc.text(`Minimum Payment: ${formatCurrency(cardData.min_payment, cardData.currency)}`, margin, yPos);
    yPos += 6;
    doc.text(`Statement Date: ${cardData.statement_date}${getOrdinal(cardData.statement_date)} of month`, margin, yPos);
    yPos += 6;
    doc.text(`Due Date: ${cardData.due_date}${getOrdinal(cardData.due_date)} of month`, margin, yPos);
    yPos += 6;
    
    if (cardData.payment_method === 'autopay') {
      doc.text(`Payment Method: Autopay (${cardData.autopay_amount_type})`, margin, yPos);
      yPos += 6;
    } else {
      doc.text('Payment Method: Manual', margin, yPos);
      yPos += 6;
    }

    yPos += 10;

    // Recent Purchases
    if (purchases.length > 0) {
      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129);
      doc.text('Recent Purchases', margin, yPos);
      yPos += 8;

      purchases.slice(0, 20).forEach((purchase) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(`${purchase.date}: ${purchase.description}`, margin + 5, yPos);
        doc.text(formatCurrency(purchase.amount, cardData.currency), 150, yPos);
        yPos += 6;
      });
    }

    yPos += 10;

    // Recent Payments
    if (payments.length > 0) {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129);
      doc.text('Recent Payments', margin, yPos);
      yPos += 8;

      payments.slice(0, 20).forEach((payment) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(`${payment.date}`, margin + 5, yPos);
        doc.text(formatCurrency(payment.amount, cardData.currency), 150, yPos);
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
        'Content-Disposition': `attachment; filename=Card_${cardData.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
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
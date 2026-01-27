import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all data
    const [cards, bankAccounts, bills, loans, deposits, transfers, conversions] = await Promise.all([
      base44.entities.CreditCard.filter({ is_active: true }),
      base44.entities.BankAccount.filter({ is_active: true }),
      base44.entities.RecurringBill.filter({ is_active: true }),
      base44.entities.MortgageLoan.filter({ is_active: true }),
      base44.entities.RecurringDeposit.filter({ is_active: true }),
      base44.entities.BankTransfer.filter({ is_active: true }),
      base44.entities.CurrencyConversion.filter({ is_active: true })
    ]);

    const doc = new jsPDF();
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;

    // Helper to check if we need a new page
    const checkNewPage = (spaceNeeded = 20) => {
      if (yPos + spaceNeeded > pageHeight - margin) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };

    // Helper to format currency
    const formatCurrency = (amount, currency = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
      }).format(amount || 0);
    };

    // Title
    doc.setFontSize(24);
    doc.setTextColor(16, 185, 129); // emerald
    doc.text('ClearLedger Financial Report', margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, yPos);
    doc.text(`Account: ${user.email}`, margin, yPos + 5);
    yPos += 20;

    // Credit Cards Section
    if (cards.length > 0) {
      checkNewPage(30);
      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129);
      doc.text('Credit Cards', margin, yPos);
      yPos += 8;

      cards.forEach((card, idx) => {
        checkNewPage(25);
        
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(card.name, margin + 5, yPos);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Balance: ${formatCurrency(card.balance, card.currency)}`, margin + 10, yPos + 5);
        doc.text(`Limit: ${formatCurrency(card.credit_limit, card.currency)}`, margin + 10, yPos + 10);
        doc.text(`APR: ${(card.apr * 100).toFixed(2)}%`, margin + 10, yPos + 15);
        doc.text(`Due Date: ${card.due_date}${getOrdinal(card.due_date)} of month`, margin + 10, yPos + 20);
        
        yPos += 28;
      });
      yPos += 5;
    }

    // Bank Accounts Section
    if (bankAccounts.length > 0) {
      checkNewPage(30);
      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129);
      doc.text('Bank Accounts', margin, yPos);
      yPos += 8;

      bankAccounts.forEach((account) => {
        checkNewPage(20);
        
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(account.name, margin + 5, yPos);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Type: ${account.account_type}`, margin + 10, yPos + 5);
        doc.text(`Cash Balance: ${formatCurrency(account.balance, account.currency)}`, margin + 10, yPos + 10);
        if (account.stocks_investments) {
          doc.text(`Investments: ${formatCurrency(account.stocks_investments, account.currency)}`, margin + 10, yPos + 15);
          yPos += 23;
        } else {
          yPos += 18;
        }
      });
      yPos += 5;
    }

    // Loans Section
    if (loans.length > 0) {
      checkNewPage(30);
      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129);
      doc.text('Loans & Mortgages', margin, yPos);
      yPos += 8;

      loans.forEach((loan) => {
        checkNewPage(25);
        
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(loan.name, margin + 5, yPos);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Current Balance: ${formatCurrency(loan.current_balance, loan.currency)}`, margin + 10, yPos + 5);
        doc.text(`Original Amount: ${formatCurrency(loan.loan_amount, loan.currency)}`, margin + 10, yPos + 10);
        doc.text(`Interest Rate: ${(loan.interest_rate * 100).toFixed(2)}%`, margin + 10, yPos + 15);
        doc.text(`Monthly Payment: ${formatCurrency(loan.monthly_payment, loan.currency)}`, margin + 10, yPos + 20);
        
        yPos += 28;
      });
      yPos += 5;
    }

    // Recurring Bills Section
    if (bills.length > 0) {
      checkNewPage(30);
      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129);
      doc.text('Recurring Bills', margin, yPos);
      yPos += 8;

      bills.forEach((bill) => {
        checkNewPage(20);
        
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(bill.name, margin + 5, yPos);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        const amountText = bill.amount_type === 'variable' 
          ? `${formatCurrency(bill.min_amount, bill.currency)} - ${formatCurrency(bill.max_amount, bill.currency)}`
          : formatCurrency(bill.amount, bill.currency);
        doc.text(`Amount: ${amountText}`, margin + 10, yPos + 5);
        doc.text(`Frequency: ${bill.frequency}`, margin + 10, yPos + 10);
        doc.text(`Category: ${bill.category}`, margin + 10, yPos + 15);
        
        yPos += 23;
      });
      yPos += 5;
    }

    // Recurring Deposits Section
    if (deposits.length > 0) {
      checkNewPage(30);
      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129);
      doc.text('Recurring Deposits', margin, yPos);
      yPos += 8;

      deposits.forEach((deposit) => {
        checkNewPage(20);
        
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(deposit.name, margin + 5, yPos);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        const amountText = deposit.amount_type === 'variable' 
          ? `${formatCurrency(deposit.min_amount, deposit.currency)} - ${formatCurrency(deposit.max_amount, deposit.currency)}`
          : formatCurrency(deposit.amount, deposit.currency);
        doc.text(`Amount: ${amountText}`, margin + 10, yPos + 5);
        doc.text(`Frequency: ${deposit.frequency}`, margin + 10, yPos + 10);
        
        yPos += 18;
      });
      yPos += 5;
    }

    // Bank Transfers Section
    if (transfers.length > 0) {
      checkNewPage(30);
      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129);
      doc.text('Bank Transfers', margin, yPos);
      yPos += 8;

      transfers.forEach((transfer) => {
        checkNewPage(20);
        
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(transfer.name, margin + 5, yPos);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        const amountText = transfer.amount_type === 'variable' 
          ? `${formatCurrency(transfer.min_amount, transfer.currency)} - ${formatCurrency(transfer.max_amount, transfer.currency)}`
          : formatCurrency(transfer.amount, transfer.currency);
        doc.text(`Amount: ${amountText}`, margin + 10, yPos + 5);
        doc.text(`Frequency: ${transfer.frequency}`, margin + 10, yPos + 10);
        
        yPos += 18;
      });
      yPos += 5;
    }

    // Currency Conversions Section
    if (conversions.length > 0) {
      checkNewPage(30);
      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129);
      doc.text('Currency Conversions', margin, yPos);
      yPos += 8;

      conversions.forEach((conversion) => {
        checkNewPage(20);
        
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(conversion.name, margin + 5, yPos);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`${conversion.from_currency} → ${conversion.to_currency}`, margin + 10, yPos + 5);
        doc.text(`Amount: ${formatCurrency(conversion.amount, conversion.from_currency)}`, margin + 10, yPos + 10);
        doc.text(`Frequency: ${conversion.frequency}`, margin + 10, yPos + 15);
        
        yPos += 23;
      });
    }

    // Summary Section
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.setTextColor(16, 185, 129);
    doc.text('Summary', margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Credit Cards: ${cards.length}`, margin + 5, yPos);
    yPos += 7;
    doc.text(`Total Bank Accounts: ${bankAccounts.length}`, margin + 5, yPos);
    yPos += 7;
    doc.text(`Total Loans: ${loans.length}`, margin + 5, yPos);
    yPos += 7;
    doc.text(`Total Recurring Bills: ${bills.length}`, margin + 5, yPos);
    yPos += 7;
    doc.text(`Total Recurring Deposits: ${deposits.length}`, margin + 5, yPos);

    // Calculate totals by currency
    yPos += 15;
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.text('Balances by Currency', margin, yPos);
    yPos += 8;

    const balances = {};
    cards.forEach(card => {
      const curr = card.currency || 'USD';
      balances[curr] = (balances[curr] || 0) + card.balance;
    });

    const assets = {};
    bankAccounts.forEach(acc => {
      const curr = acc.currency || 'USD';
      assets[curr] = (assets[curr] || 0) + (acc.balance || 0) + (acc.stocks_investments || 0);
    });

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text('Credit Card Debt:', margin + 5, yPos);
    yPos += 6;
    Object.entries(balances).forEach(([curr, total]) => {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`${curr}: ${formatCurrency(total, curr)}`, margin + 10, yPos);
      yPos += 5;
    });

    yPos += 5;
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text('Bank Account Assets:', margin + 5, yPos);
    yPos += 6;
    Object.entries(assets).forEach(([curr, total]) => {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`${curr}: ${formatCurrency(total, curr)}`, margin + 10, yPos);
      yPos += 5;
    });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=ClearLedger_Export_${new Date().toISOString().split('T')[0]}.pdf`
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
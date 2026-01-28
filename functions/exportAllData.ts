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
      doc.text('Currency FX', margin, yPos);
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
      yPos += 5;
    }

    // Payment Schedule Section (Current Month)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    checkNewPage(30);
    doc.setFontSize(16);
    doc.setTextColor(16, 185, 129);
    doc.text(`Payment Schedule - ${monthNames[currentMonth]} ${currentYear}`, margin, yPos);
    yPos += 8;

    const getAccountName = (accountId) => {
      const account = bankAccounts.find(a => a.id === accountId);
      return account ? account.name : 'Unknown';
    };

    const payments = [];

    // Card payments
    cards.forEach(card => {
      if (card.due_date) {
        const accountName = card.bank_account_id ? getAccountName(card.bank_account_id) : '';
        payments.push({
          date: card.due_date,
          name: card.name,
          type: 'Credit Card',
          amount: card.projected_monthly_payment || card.min_payment || 0,
          currency: card.currency,
          account: accountName,
          isOutflow: true
        });
      }
    });

    // Bills
    bills.forEach(bill => {
      if (bill.frequency === 'monthly' && bill.due_date) {
        const accountName = bill.bank_account_id ? getAccountName(bill.bank_account_id) : '';
        payments.push({
          date: bill.due_date,
          name: bill.name,
          type: 'Bill',
          amount: bill.amount,
          currency: bill.currency,
          account: accountName,
          isOutflow: true
        });
      }
    });

    // Loans
    loans.forEach(loan => {
      if (loan.payment_due_date) {
        const accountName = loan.bank_account_id ? getAccountName(loan.bank_account_id) : '';
        payments.push({
          date: loan.payment_due_date,
          name: loan.name,
          type: 'Loan',
          amount: loan.projected_monthly_payment || loan.monthly_payment || 0,
          currency: loan.currency,
          account: accountName,
          isOutflow: true
        });
      }
    });

    // Bank Transfers
    transfers.forEach(transfer => {
      if (transfer.frequency === 'monthly' && transfer.transfer_date) {
        const fromAccount = getAccountName(transfer.from_account_id);
        const toAccount = getAccountName(transfer.to_account_id);
        payments.push({
          date: transfer.transfer_date,
          name: transfer.name,
          type: 'Transfer',
          amount: transfer.amount,
          currency: transfer.currency,
          account: `${fromAccount} to ${toAccount}`,
          isOutflow: false
        });
      }
    });

    // Currency Conversions
    conversions.forEach(conversion => {
      if (conversion.frequency === 'monthly' && conversion.conversion_date) {
        const fromAccount = getAccountName(conversion.from_account_id);
        const toAccount = getAccountName(conversion.to_account_id);
        payments.push({
          date: conversion.conversion_date,
          name: conversion.name,
          type: 'Conversion',
          amount: conversion.amount,
          currency: conversion.from_currency,
          account: `${fromAccount} to ${toAccount}`,
          isOutflow: false
        });
      }
    });

    // Recurring Deposits
    deposits.forEach(deposit => {
      if (deposit.frequency === 'monthly' && deposit.deposit_date) {
        const accountName = getAccountName(deposit.bank_account_id);
        payments.push({
          date: deposit.deposit_date,
          name: deposit.name,
          type: 'Deposit',
          amount: deposit.amount,
          currency: deposit.currency,
          account: accountName,
          isOutflow: false
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

    // Display payments by date
    Object.entries(paymentsByDate).forEach(([date, items]) => {
      checkNewPage(15 + items.length * 8);
      
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(`Day ${date}`, margin + 5, yPos);
      yPos += 6;

      items.forEach(item => {
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        
        const maxNameLength = 35;
        const nameText = item.name.length > maxNameLength ? 
          item.name.substring(0, maxNameLength) + '...' : 
          item.name;
        
        doc.text(`  ${nameText} (${item.type})`, margin + 8, yPos);
        
        // Amount with color
        doc.setTextColor(item.isOutflow ? 200 : 0, item.isOutflow ? 0 : 150, 0);
        const amountText = formatCurrency(item.amount, item.currency);
        doc.text(amountText, 190, yPos, { align: 'right' });
        doc.setTextColor(40, 40, 40);
        
        yPos += 5;
        
        if (item.account) {
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          const accountLabel = item.isOutflow ? 'From' : (item.type === 'Transfer' || item.type === 'Conversion' ? 'From' : 'To');
          doc.text(`    ${accountLabel}: ${item.account}`, margin + 8, yPos);
          yPos += 5;
        }
      });

      yPos += 3;
    });

    if (payments.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('No scheduled payments for this month', margin + 5, yPos);
      yPos += 10;
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
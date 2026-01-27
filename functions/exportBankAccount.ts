import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = await req.json();
    
    const [account, deposits, recurringDeposits, recurringWithdrawals] = await Promise.all([
      base44.entities.BankAccount.filter({ id: accountId }),
      base44.entities.Deposit.filter({ bank_account_id: accountId }),
      base44.entities.RecurringDeposit.filter({ bank_account_id: accountId, is_active: true }),
      base44.entities.RecurringWithdrawal.filter({ bank_account_id: accountId, is_active: true })
    ]);

    if (!account || account.length === 0) {
      return Response.json({ error: 'Account not found' }, { status: 404 });
    }

    const accountData = account[0];
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
    doc.text('Bank Account Report', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    // Account Details
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.text(accountData.name, margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Account Type: ${accountData.account_type}`, margin, yPos);
    yPos += 6;
    doc.text(`Cash Balance: ${formatCurrency(accountData.balance, accountData.currency)}`, margin, yPos);
    yPos += 6;
    if (accountData.stocks_investments) {
      doc.text(`Investments: ${formatCurrency(accountData.stocks_investments, accountData.currency)}`, margin, yPos);
      yPos += 6;
    }
    doc.text(`Total: ${formatCurrency((accountData.balance || 0) + (accountData.stocks_investments || 0), accountData.currency)}`, margin, yPos);
    yPos += 15;

    // Recurring Deposits
    if (recurringDeposits.length > 0) {
      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129);
      doc.text('Recurring Deposits', margin, yPos);
      yPos += 8;

      recurringDeposits.forEach((deposit) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(deposit.name, margin + 5, yPos);
        doc.text(formatCurrency(deposit.amount, deposit.currency), 150, yPos);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(deposit.frequency, margin + 5, yPos + 4);
        yPos += 10;
      });
    }

    yPos += 5;

    // Recurring Withdrawals
    if (recurringWithdrawals.length > 0) {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129);
      doc.text('Recurring Withdrawals', margin, yPos);
      yPos += 8;

      recurringWithdrawals.forEach((withdrawal) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(withdrawal.name, margin + 5, yPos);
        doc.text(formatCurrency(withdrawal.amount, accountData.currency), 150, yPos);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(withdrawal.frequency, margin + 5, yPos + 4);
        yPos += 10;
      });
    }

    yPos += 5;

    // Recent Transactions
    if (deposits.length > 0) {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129);
      doc.text('Recent Transactions', margin, yPos);
      yPos += 8;

      deposits.slice(0, 30).forEach((deposit) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(`${deposit.date}: ${deposit.description || 'Deposit'}`, margin + 5, yPos);
        doc.text(formatCurrency(deposit.amount, accountData.currency), 150, yPos);
        yPos += 6;
      });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Account_${accountData.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
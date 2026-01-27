import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await base44.entities.BankAccount.filter({ is_active: true });
    const deposits = await base44.entities.Deposit.list();

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

    const getOngoingBalance = (account) => {
      const accountDeposits = deposits.filter(d => d.bank_account_id === account.id);
      const totalDeposits = accountDeposits.filter(d => d.amount > 0).reduce((sum, d) => sum + d.amount, 0);
      const totalWithdrawals = Math.abs(accountDeposits.filter(d => d.amount < 0).reduce((sum, d) => sum + d.amount, 0));
      return (account.balance || 0) + totalDeposits - totalWithdrawals;
    };

    // Title
    doc.setFontSize(24);
    doc.setTextColor(16, 185, 129);
    doc.text('Bank Accounts Report', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    if (accounts.length === 0) {
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text('No bank accounts configured.', margin, yPos);
    } else {
      accounts.forEach(account => {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(16, 185, 129);
        doc.text(account.name, margin, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setTextColor(0);

        const accountType = account.account_type === 'savings' ? 'Savings' : 'Checking';
        doc.text(`Type: ${accountType}`, margin + 5, yPos);
        yPos += 5;

        const balance = getOngoingBalance(account);
        doc.text(`Balance: ${formatCurrency(balance, account.currency)}`, margin + 5, yPos);
        yPos += 5;

        if (account.stocks_investments && account.stocks_investments > 0) {
          doc.text(`Investments: ${formatCurrency(account.stocks_investments, account.currency)}`, margin + 5, yPos);
          yPos += 5;
        }

        if (account.account_number) {
          doc.text(`Account Number: ****${account.account_number}`, margin + 5, yPos);
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
      doc.text(`Total Accounts: ${accounts.length}`, margin, yPos);
      yPos += 6;

      const totalsByCurrency = {};
      accounts.forEach(account => {
        const curr = account.currency || 'USD';
        const balance = getOngoingBalance(account);
        totalsByCurrency[curr] = (totalsByCurrency[curr] || 0) + balance;
      });

      Object.entries(totalsByCurrency).forEach(([currency, total]) => {
        doc.text(`Total Balance (${currency}): ${formatCurrency(total, currency)}`, margin, yPos);
        yPos += 6;
      });

      const totalInvestments = accounts.reduce((sum, a) => sum + (a.stocks_investments || 0), 0);
      if (totalInvestments > 0) {
        yPos += 3;
        doc.text(`Total Investments: ${formatCurrency(totalInvestments, 'USD')}`, margin, yPos);
      }
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Bank_Accounts_${new Date().toISOString().split('T')[0]}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
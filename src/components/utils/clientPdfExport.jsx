import jsPDF from 'jspdf';

const fmt = (amount, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0);
  } catch {
    return `${currency} ${(amount || 0).toFixed(2)}`;
  }
};

const pct = (val) => `${((val || 0) * 100).toFixed(2)}%`;

/**
 * Generate a full financial summary PDF entirely on the client using jsPDF.
 * Returns a Blob ready to be passed to exportPDF().
 *
 * @param {{
 *   cards: Array,
 *   bankAccounts: Array,
 *   recurringBills: Array,
 *   mortgageLoans: Array
 * }} data
 * @returns {Blob}
 */
export function generateFinancialSummaryPDF({ cards = [], bankAccounts = [], recurringBills = [], mortgageLoans = [] }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const colW = pageW - margin * 2;
  let y = margin;

  // ── helpers ──────────────────────────────────────────────────────────────
  const checkPage = (needed = 10) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const header = (text) => {
    checkPage(12);
    doc.setFillColor(30, 100, 80);
    doc.rect(margin, y, colW, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin + 3, y + 5.5);
    doc.setTextColor(0, 0, 0);
    y += 11;
  };

  const row = (label, value, indent = 0) => {
    checkPage(7);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin + indent, y);
    doc.text(value, pageW - margin, y, { align: 'right' });
    y += 6;
  };

  const divider = () => {
    checkPage(4);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
  };

  const subheader = (text) => {
    checkPage(8);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(text, margin, y);
    y += 6;
  };

  // ── Title ─────────────────────────────────────────────────────────────────
  doc.setFillColor(16, 60, 50);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setTextColor(52, 211, 153);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ClearLedger', margin, 14);
  doc.setTextColor(200, 230, 220);
  doc.setFontSize(9);
  doc.text(`Financial Summary  ·  ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, 20);
  doc.setTextColor(0, 0, 0);
  y = 28;

  // ── Summary totals ────────────────────────────────────────────────────────
  header('Overview');

  const totalCardDebt = cards.reduce((s, c) => s + (c.balance || 0), 0);
  const totalCreditLimit = cards.reduce((s, c) => s + (c.credit_limit || 0), 0);
  const totalBankBalance = bankAccounts.reduce((s, a) => s + (a.balance || 0) + (a.stocks_investments || 0), 0);
  const totalLoanBalance = mortgageLoans.reduce((s, l) => s + (l.current_balance || 0), 0);
  const totalMonthlyBills = recurringBills.filter(b => b.frequency === 'monthly').reduce((s, b) => s + (b.amount || 0), 0);
  const netWorth = totalBankBalance - totalCardDebt - totalLoanBalance;

  row('Total Credit Card Debt', fmt(totalCardDebt));
  row('Total Credit Limit', fmt(totalCreditLimit));
  if (totalCreditLimit > 0) row('Overall Utilization', pct(totalCardDebt / totalCreditLimit));
  row('Total Bank Balance', fmt(totalBankBalance));
  row('Total Loan Balance', fmt(totalLoanBalance));
  row('Monthly Bills', fmt(totalMonthlyBills));
  divider();
  doc.setFont('helvetica', 'bold');
  row('Estimated Net Worth', fmt(netWorth));
  doc.setFont('helvetica', 'normal');
  y += 3;

  // ── Credit Cards ─────────────────────────────────────────────────────────
  if (cards.length > 0) {
    header(`Credit Cards  (${cards.length})`);
    cards.forEach((card, i) => {
      checkPage(28);
      subheader(`${i + 1}. ${card.name}${card.card_last_four ? `  ····${card.card_last_four}` : ''}`);
      row('Balance', fmt(card.balance, card.currency), 3);
      row('Credit Limit', fmt(card.credit_limit, card.currency), 3);
      if (card.credit_limit > 0) row('Utilization', pct(card.balance / card.credit_limit), 3);
      row('APR', pct(card.apr), 3);
      if (card.min_payment) row('Min. Payment', fmt(card.min_payment, card.currency), 3);
      if (card.due_date) row('Due Date', `Day ${card.due_date} of month`, 3);
      y += 2;
    });
  }

  // ── Bank Accounts ─────────────────────────────────────────────────────────
  if (bankAccounts.length > 0) {
    header(`Bank Accounts  (${bankAccounts.length})`);
    bankAccounts.forEach((acct, i) => {
      checkPage(20);
      subheader(`${i + 1}. ${acct.name}  (${acct.account_type || 'checking'})`);
      row('Cash Balance', fmt(acct.balance, acct.currency), 3);
      if (acct.stocks_investments) row('Stocks / Investments', fmt(acct.stocks_investments, acct.currency), 3);
      row('Total', fmt((acct.balance || 0) + (acct.stocks_investments || 0), acct.currency), 3);
      y += 2;
    });
  }

  // ── Recurring Bills ───────────────────────────────────────────────────────
  if (recurringBills.length > 0) {
    header(`Recurring Bills  (${recurringBills.length})`);
    recurringBills.forEach((bill) => {
      checkPage(12);
      const freq = bill.frequency === 'monthly' ? '/mo' : bill.frequency === 'yearly' ? '/yr' : `/${bill.frequency}`;
      row(`${bill.name}  [${bill.category || 'other'}]`, `${fmt(bill.amount, bill.currency)}${freq}`);
    });
    y += 2;
  }

  // ── Loans ─────────────────────────────────────────────────────────────────
  if (mortgageLoans.length > 0) {
    header(`Loans  (${mortgageLoans.length})`);
    mortgageLoans.forEach((loan, i) => {
      checkPage(24);
      subheader(`${i + 1}. ${loan.name}  (${loan.loan_type || 'other'})`);
      row('Original Loan', fmt(loan.loan_amount, loan.currency), 3);
      row('Current Balance', fmt(loan.current_balance, loan.currency), 3);
      row('Interest Rate', pct(loan.interest_rate), 3);
      row('Monthly Payment', fmt(loan.monthly_payment, loan.currency), 3);
      if (loan.loan_amount > 0) {
        const paid = loan.loan_amount - loan.current_balance;
        row('Paid Off', pct(paid / loan.loan_amount), 3);
      }
      y += 2;
    });
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `ClearLedger  ·  Page ${p} of ${pageCount}  ·  Generated ${new Date().toLocaleString()}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}
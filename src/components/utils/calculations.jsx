// Credit Card Calculation Utilities

export const calculateUtilization = (balance, limit) => {
  if (!limit || limit === 0) return 0;
  return Math.round((balance / limit) * 100);
};

export const calculateMinimumPayment = (minPayment, balance) => {
  if (balance <= 0) return 0;
  return Math.min(minPayment || 0, balance);
};

export const calculateMonthlyInterest = (balance, apr) => {
  if (balance <= 0 || !apr) return 0;
  const monthlyRate = apr / 12;
  return balance * monthlyRate;
};

export const calculatePaymentFor3YearPayoff = (balance, apr) => {
  if (balance <= 0) return 0;
  if (!apr || apr === 0) return Math.ceil(balance / 36 * 100) / 100;
  
  const monthlyRate = apr / 12;
  const n = 36;
  
  // PMT formula: P * (r * (1+r)^n) / ((1+r)^n - 1)
  const payment = balance * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
  return Math.ceil(payment * 100) / 100;
};

export const calculatePayoffTimeline = (startingBalance, apr, monthlyPayment, maxMonths = 360, futurePurchases = []) => {
  if (startingBalance <= 0) return { months: 0, totalInterest: 0, breakdown: [] };
  if (monthlyPayment <= 0) return { months: Infinity, totalInterest: Infinity, breakdown: [] };
  
  const monthlyRate = apr / 12;
  let balance = startingBalance;
  let totalInterest = 0;
  const breakdown = [];
  
  // Iterate month by month
  let monthIndex = 0;
  while (balance > 0 && monthIndex < maxMonths) {
    // Step 1: Add any purchases for this month
    const purchase = futurePurchases[monthIndex]?.amount || 0;
    balance += purchase;
    
    // Step 2: Apply interest to current balance
    const interest = balance * monthlyRate;
    balance += interest;
    totalInterest += interest;
    
    // Step 3: Apply payment (capped at remaining balance)
    const balanceBeforePayment = balance;
    const actualPayment = Math.min(monthlyPayment, balance);
    const principal = actualPayment - interest;
    balance -= actualPayment;

    // Step 4: Record this month's breakdown
    monthIndex++;
    breakdown.push({
      month: monthIndex,
      payment: Math.round(actualPayment * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      principal: Math.round(principal * 100) / 100,
      balance_before_payment: Math.round(balanceBeforePayment * 100) / 100,
      balance: Math.round(Math.max(0, balance) * 100) / 100,
      purchase: Math.round(purchase * 100) / 100
    });
    
    // Stop if balance is effectively zero
    if (balance < 0.01) balance = 0;
  }
  
  return {
    months: monthIndex,
    totalInterest: Math.round(totalInterest * 100) / 100,
    breakdown
  };
};

export const calculateVariablePayoffTimeline = (startingBalance, apr, variablePayments, maxMonths = 600, futurePurchases = []) => {
  if (startingBalance <= 0) return { months: 0, totalInterest: 0, breakdown: [] };
  if (!variablePayments || variablePayments.length === 0) return { months: Infinity, totalInterest: Infinity, breakdown: [] };
  
  const monthlyRate = apr / 12;
  let balance = startingBalance;
  let totalInterest = 0;
  const breakdown = [];
  
  // Find the default payment (last non-zero payment in array)
  let defaultPayment = 0;
  for (let i = variablePayments.length - 1; i >= 0; i--) {
    const amt = typeof variablePayments[i] === 'object' ? variablePayments[i].amount : variablePayments[i];
    if (amt && parseFloat(amt) > 0) {
      defaultPayment = parseFloat(amt);
      break;
    }
  }
  
  let month = 0;
  
  while (balance > 0 && month < maxMonths) {
    month += 1;
    
    const startingBalanceForMonth = balance;
    
    // Determine payment for this month (custom or default)
    let payment = defaultPayment;
    if (month - 1 < variablePayments.length) {
      const paymentData = variablePayments[month - 1];
      const customAmount = parseFloat(typeof paymentData === 'object' ? paymentData.amount : paymentData);
      if (customAmount && customAmount > 0) {
        payment = customAmount;
      }
    }
    
    if (payment <= 0) break;
    
    // Add any purchases for this month
    const purchase = futurePurchases[month - 1]?.amount || 0;
    balance += purchase;
    
    // Calculate interest FIRST
    const interest = balance * monthlyRate;
    
    // Apply interest
    balance += interest;
    totalInterest += interest;
    
    // Apply payment
    const balanceBeforePayment = balance;
    let actualPayment = payment;
    if (payment > balance) {
      actualPayment = balance; // prevent negative balance
    }

    balance -= actualPayment;

    const principal = actualPayment - interest;

    // Record breakdown
    breakdown.push({
      month: month,
      payment: Math.round(actualPayment * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      principal: Math.round(principal * 100) / 100,
      balance_before_payment: Math.round(balanceBeforePayment * 100) / 100,
      balance: Math.round(Math.max(0, balance) * 100) / 100,
      purchase: Math.round(purchase * 100) / 100
    });
    
    // Stop if balance is effectively zero
    if (balance < 0.01) balance = 0;
  }
  
  return {
    months: month,
    totalInterest: Math.round(totalInterest * 100) / 100,
    breakdown
  };
};

export const calculateMinimumPaymentPayoff = (balance, apr, minPayment) => {
  if (balance <= 0) return { months: 0, totalInterest: 0, breakdown: [] };
  
  const monthlyRate = apr / 12;
  let currentBalance = balance;
  let totalInterest = 0;
  let months = 0;
  const breakdown = [];
  const maxMonths = 600; // 50 years max
  
  while (currentBalance > 0 && months < maxMonths) {
    const interest = currentBalance * monthlyRate;
    totalInterest += interest;
    currentBalance += interest;
    
    const actualPayment = Math.min(minPayment || 0, currentBalance);
    currentBalance -= actualPayment;
    months++;
    
    breakdown.push({
      month: months,
      payment: Math.round(actualPayment * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      balance: Math.round(Math.max(0, currentBalance) * 100) / 100
    });
    
    if (currentBalance < 0.01) currentBalance = 0;
  }
  
  return {
    months,
    totalInterest: Math.round(totalInterest * 100) / 100,
    breakdown
  };
};

export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

export const formatPercent = (value) => {
  return `${(value || 0).toFixed(1)}%`;
};

export const formatMonthsToYears = (months) => {
  if (!months || months === 0) return '0 months';
  if (months === Infinity) return 'Never';
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (years === 0) {
    return `${months} ${months === 1 ? 'month' : 'months'}`;
  }
  
  if (remainingMonths === 0) {
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }
  
  return `${years} ${years === 1 ? 'year' : 'years'}, ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
};

export const getUtilizationColor = (utilization) => {
  if (utilization <= 30) return 'text-emerald-600';
  if (utilization <= 50) return 'text-yellow-600';
  if (utilization <= 75) return 'text-orange-600';
  return 'text-red-600';
};

export const getUtilizationBgColor = (utilization) => {
  if (utilization <= 30) return 'bg-emerald-500';
  if (utilization <= 50) return 'bg-yellow-500';
  if (utilization <= 75) return 'bg-orange-500';
  return 'bg-red-500';
};
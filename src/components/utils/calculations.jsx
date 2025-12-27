// Credit Card Calculation Utilities

export const calculateUtilization = (balance, limit) => {
  if (!limit || limit === 0) return 0;
  return Math.round((balance / limit) * 100);
};

export const calculateMinimumPayment = (balance, minPaymentType, minPaymentValue, minPaymentFloor = 25) => {
  if (balance <= 0) return 0;
  
  if (minPaymentType === 'flat') {
    return Math.min(minPaymentValue || 25, balance);
  }
  
  // Percentage based
  const percentageAmount = balance * ((minPaymentValue || 2) / 100);
  const floor = minPaymentFloor || 25;
  return Math.min(Math.max(percentageAmount, floor), balance);
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

export const calculatePayoffTimeline = (startingBalance, apr, monthlyPayment, maxMonths = 360) => {
  if (startingBalance <= 0) return { months: 0, totalInterest: 0, breakdown: [] };
  if (monthlyPayment <= 0) return { months: Infinity, totalInterest: Infinity, breakdown: [] };
  
  const monthlyRate = apr / 12;
  let balance = startingBalance;
  let totalInterest = 0;
  let months = 0;
  const breakdown = [];
  
  while (balance > 0 && months < maxMonths) {
    const interest = balance * monthlyRate;
    totalInterest += interest;
    balance += interest;
    
    const actualPayment = Math.min(monthlyPayment, balance);
    balance -= actualPayment;
    months++;
    
    breakdown.push({
      month: months,
      payment: Math.round(actualPayment * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      principal: Math.round((actualPayment - interest) * 100) / 100,
      balance: Math.round(Math.max(0, balance) * 100) / 100
    });
    
    if (balance < 0.01) balance = 0;
  }
  
  return {
    months,
    totalInterest: Math.round(totalInterest * 100) / 100,
    breakdown
  };
};

export const calculateVariablePayoffTimeline = (startingBalance, apr, variablePayments, maxMonths = 360) => {
  if (startingBalance <= 0) return { months: 0, totalInterest: 0, breakdown: [] };
  
  const monthlyRate = apr / 12;
  let balance = startingBalance;
  let totalInterest = 0;
  let months = 0;
  const breakdown = [];
  
  while (balance > 0 && months < maxMonths) {
    const payment = variablePayments[months]?.amount || variablePayments[variablePayments.length - 1]?.amount || 0;
    
    if (payment <= 0) break;
    
    const interest = balance * monthlyRate;
    totalInterest += interest;
    balance += interest;
    
    const actualPayment = Math.min(payment, balance);
    balance -= actualPayment;
    months++;
    
    breakdown.push({
      month: months,
      payment: Math.round(actualPayment * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      principal: Math.round((actualPayment - interest) * 100) / 100,
      balance: Math.round(Math.max(0, balance) * 100) / 100
    });
    
    if (balance < 0.01) balance = 0;
  }
  
  return {
    months,
    totalInterest: Math.round(totalInterest * 100) / 100,
    breakdown
  };
};

export const calculateMinimumPaymentPayoff = (balance, apr, minPaymentType, minPaymentValue, minPaymentFloor) => {
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
    
    const minPayment = calculateMinimumPayment(currentBalance, minPaymentType, minPaymentValue, minPaymentFloor);
    const actualPayment = Math.min(minPayment, currentBalance);
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

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

export const formatPercent = (value) => {
  return `${(value || 0).toFixed(1)}%`;
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
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { createPageUrl } from '@/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  CreditCard, 
  TrendingDown, 
  DollarSign, 
  Percent,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Building2,
  Receipt,
  Landmark,
  GripVertical,
  TrendingUp,
  Calendar,
  Edit3,
  HelpCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  formatCurrency, 
  calculateUtilization,
  calculateMinimumPayment,
  getUtilizationColor,
  getUtilizationBgColor
} from '@/components/utils/calculations';

const LOAN_TYPE_ICONS = {
  mortgage: '🏠',
  auto: '🚗',
  personal: '💰',
  student: '🎓',
  business: '💼',
  other: '📋'
};

const BILL_CATEGORY_ICONS = {
  utilities: '⚡',
  subscription: '📺',
  insurance: '🛡️',
  rent: '🏠',
  loan: '🏦',
  other: '📄'
};

const DEFAULT_SECTION_ORDER = ['projections', 'banks', 'bills', 'cards', 'loans'];

export default function DashboardSummary({ cards, bankAccounts = [], recurringBills = [], mortgageLoans = [], onUpdateCardBalance, onUpdateBankBalance, onUpdateLoanBalance }) {
  const [overviewExpanded, setOverviewExpanded] = useState(true);
  const [expandedCards, setExpandedCards] = useState(false);
  const [expandedBills, setExpandedBills] = useState(false);
  const [expandedLoans, setExpandedLoans] = useState(false);
  const [expandedBanks, setExpandedBanks] = useState(false);
  const [expandedProjections, setExpandedProjections] = useState(true);
  const [quickUpdatesExpanded, setQuickUpdatesExpanded] = useState(true);
  const [showAccountSelector, setShowAccountSelector] = useState(null);
  
  // Load section order from localStorage
  const [sectionOrder, setSectionOrder] = useState(() => {
    const saved = localStorage.getItem('overview_section_order');
    return saved ? JSON.parse(saved) : DEFAULT_SECTION_ORDER;
  });
  const totalBalance = cards.reduce((sum, card) => sum + (card.balance || 0), 0);
  const totalLimit = cards.reduce((sum, card) => sum + (card.credit_limit || 0), 0);
  const totalUtilization = calculateUtilization(totalBalance, totalLimit);
  const totalMinPayment = cards.reduce((sum, card) => 
    sum + calculateMinimumPayment(card.min_payment, card.balance), 0);

  // Fetch all deposits for bank accounts
  const { data: allDeposits = [] } = useQuery({
    queryKey: ['all-deposits'],
    queryFn: () => base44.entities.Deposit.list(),
    enabled: bankAccounts.length > 0
  });

  const { data: recurringDeposits = [] } = useQuery({
    queryKey: ['recurring-deposits'],
    queryFn: async () => {
      const deposits = await base44.entities.RecurringDeposit.filter({ is_active: true });
      return deposits;
    }
  });

  const { data: recurringWithdrawals = [] } = useQuery({
    queryKey: ['recurring-withdrawals'],
    queryFn: async () => {
      const withdrawals = await base44.entities.RecurringWithdrawal.filter({ is_active: true });
      return withdrawals;
    }
  });

  const { data: bankTransfers = [] } = useQuery({
    queryKey: ['bank-transfers'],
    queryFn: async () => {
      const transfers = await base44.entities.BankTransfer.list();
      return transfers.filter(t => t.is_active !== false);
    }
  });

  // Group by currency
  const minPaymentByCurrency = cards.reduce((acc, card) => {
    const curr = card.currency || 'USD';
    if (!acc[curr]) acc[curr] = 0;
    acc[curr] += calculateMinimumPayment(card.min_payment, card.balance);
    return acc;
  }, {});

  const projectedPaymentByCurrency = cards.reduce((acc, card) => {
    const curr = card.currency || 'USD';
    if (!acc[curr]) acc[curr] = 0;
    acc[curr] += card.projected_monthly_payment || calculateMinimumPayment(card.min_payment, card.balance);
    return acc;
  }, {});

  const monthlyBillsByCurrency = recurringBills.filter(b => b.frequency === 'monthly').reduce((acc, bill) => {
    const curr = bill.currency || 'USD';
    if (!acc[curr]) acc[curr] = 0;
    acc[curr] += bill.amount;
    return acc;
  }, {});

  const totalLoansByCurrency = mortgageLoans.reduce((acc, loan) => {
    const curr = loan.currency || 'USD';
    if (!acc[curr]) acc[curr] = 0;
    acc[curr] += loan.current_balance;
    return acc;
  }, {});

  const minLoanPaymentByCurrency = mortgageLoans.reduce((acc, loan) => {
    const curr = loan.currency || 'USD';
    if (!acc[curr]) acc[curr] = 0;
    acc[curr] += loan.monthly_payment || 0;
    return acc;
  }, {});

  const projectedLoanPaymentByCurrency = mortgageLoans.reduce((acc, loan) => {
    const curr = loan.currency || 'USD';
    if (!acc[curr]) acc[curr] = 0;
    acc[curr] += loan.projected_monthly_payment || loan.monthly_payment || 0;
    return acc;
  }, {});

  // Calculate ongoing balance for bank accounts (cash only, excluding investments)
  const totalBankBalanceByCurrency = bankAccounts.reduce((acc, account) => {
    const accountDeposits = allDeposits.filter(d => d.bank_account_id === account.id);
    const totalDeposits = accountDeposits.filter(d => d.amount > 0).reduce((sum, d) => sum + d.amount, 0);
    const totalWithdrawals = Math.abs(accountDeposits.filter(d => d.amount < 0).reduce((sum, d) => sum + d.amount, 0));
    const ongoingBalance = (account.balance || 0) + totalDeposits - totalWithdrawals;
    
    if (ongoingBalance !== 0) {
      const curr = account.currency || 'USD';
      if (!acc[curr]) acc[curr] = 0;
      acc[curr] += ongoingBalance;
    }
    return acc;
  }, {});

  // Calculate balances by account type (cash only)
  const savingsBalanceByCurrency = bankAccounts.reduce((acc, account) => {
    if (account.account_type === 'savings') {
      const accountDeposits = allDeposits.filter(d => d.bank_account_id === account.id);
      const totalDeposits = accountDeposits.filter(d => d.amount > 0).reduce((sum, d) => sum + d.amount, 0);
      const totalWithdrawals = Math.abs(accountDeposits.filter(d => d.amount < 0).reduce((sum, d) => sum + d.amount, 0));
      const ongoingBalance = (account.balance || 0) + totalDeposits - totalWithdrawals;
      
      if (ongoingBalance !== 0) {
        const curr = account.currency || 'USD';
        if (!acc[curr]) acc[curr] = 0;
        acc[curr] += ongoingBalance;
      }
    }
    return acc;
  }, {});

  const checkingBalanceByCurrency = bankAccounts.reduce((acc, account) => {
    if (account.account_type !== 'savings') {
      const accountDeposits = allDeposits.filter(d => d.bank_account_id === account.id);
      const totalDeposits = accountDeposits.filter(d => d.amount > 0).reduce((sum, d) => sum + d.amount, 0);
      const totalWithdrawals = Math.abs(accountDeposits.filter(d => d.amount < 0).reduce((sum, d) => sum + d.amount, 0));
      const ongoingBalance = (account.balance || 0) + totalDeposits - totalWithdrawals;
      
      if (ongoingBalance !== 0) {
        const curr = account.currency || 'USD';
        if (!acc[curr]) acc[curr] = 0;
        acc[curr] += ongoingBalance;
      }
    }
    return acc;
  }, {});

  // Calculate total investments by currency (separate from cash balance)
  const investmentsByCurrency = bankAccounts.reduce((acc, account) => {
    const investments = account.stocks_investments || 0;
    if (investments !== 0) {
      const curr = account.currency || 'USD';
      if (!acc[curr]) acc[curr] = 0;
      acc[curr] += investments;
    }
    return acc;
  }, {});

  const getUtilizationMessage = () => {
    if (totalUtilization <= 30) {
      return { text: 'Great! Your credit usage is healthy', icon: CheckCircle, color: 'text-emerald-600' };
    } else if (totalUtilization <= 50) {
      return { text: 'Your credit usage is moderate', icon: AlertTriangle, color: 'text-yellow-600' };
    } else if (totalUtilization <= 75) {
      return { text: 'Consider paying down your balances', icon: AlertTriangle, color: 'text-orange-600' };
    }
    return { text: 'High usage may hurt your credit score', icon: AlertTriangle, color: 'text-red-600' };
  };

  const utilizationMessage = getUtilizationMessage();
  const Icon = utilizationMessage.icon;

  // Calculate monthly projections
  const calculateMonthlyProjections = () => {
    const projectionsByCurrency = {};

    const initCurrency = (currency) => {
      if (!projectionsByCurrency[currency]) {
        projectionsByCurrency[currency] = {
          income: 0,
          outgoing: 0,
          toSavings: 0
        };
      }
    };

    // Initialize currencies from all sources
    bankAccounts.forEach(acc => initCurrency(acc.currency || 'USD'));
    cards.forEach(card => initCurrency(card.currency || 'USD'));
    recurringBills.forEach(bill => initCurrency(bill.currency || 'USD'));
    mortgageLoans.forEach(loan => initCurrency(loan.currency || 'USD'));

    const accountsByCurrency = {};
    bankAccounts.forEach(acc => {
      const curr = acc.currency || 'USD';
      if (!accountsByCurrency[curr]) {
        accountsByCurrency[curr] = { checking: [], savings: [] };
      }
      if (acc.account_type === 'checking') {
        accountsByCurrency[curr].checking.push(acc);
      } else if (acc.account_type === 'savings') {
        accountsByCurrency[curr].savings.push(acc);
      }
    });

    Object.keys(projectionsByCurrency).forEach(currency => {
      const accounts = accountsByCurrency[currency] || { checking: [], savings: [] };
      
      // Calculate income from recurring deposits
      accounts.checking.forEach(acc => {
        const depositsForAccount = recurringDeposits.filter(d => d.bank_account_id === acc.id);
        depositsForAccount.forEach(deposit => {
          if (deposit.frequency === 'monthly' || deposit.frequency === 'bi_weekly' || deposit.frequency === 'weekly') {
            const amount = deposit.amount || 0;
            if (deposit.frequency === 'weekly') {
              projectionsByCurrency[currency].income += amount * 4;
            } else if (deposit.frequency === 'bi_weekly') {
              projectionsByCurrency[currency].income += amount * 2;
            } else {
              projectionsByCurrency[currency].income += amount;
            }
          }
        });
      });

      // Calculate outgoing from bills
      accounts.checking.forEach(acc => {
        const billsForAccount = recurringBills.filter(b => b.bank_account_id === acc.id);
        billsForAccount.forEach(bill => {
          if (bill.frequency === 'monthly' || bill.frequency === 'weekly') {
            const amount = bill.amount || 0;
            if (bill.frequency === 'weekly') {
              projectionsByCurrency[currency].outgoing += amount * 4;
            } else {
              projectionsByCurrency[currency].outgoing += amount;
            }
          }
        });

        const withdrawalsForAccount = recurringWithdrawals.filter(w => w.bank_account_id === acc.id);
        withdrawalsForAccount.forEach(withdrawal => {
          if (withdrawal.frequency === 'monthly' || withdrawal.frequency === 'weekly' || withdrawal.frequency === 'bi_weekly') {
            const amount = withdrawal.amount || 0;
            if (withdrawal.frequency === 'weekly') {
              projectionsByCurrency[currency].outgoing += amount * 4;
            } else if (withdrawal.frequency === 'bi_weekly') {
              projectionsByCurrency[currency].outgoing += amount * 2;
            } else {
              projectionsByCurrency[currency].outgoing += amount;
            }
          }
        });
      });

      // Calculate outgoing from cards in this currency
      const cardsInCurrency = cards.filter(c => (c.currency || 'USD') === currency && c.payment_method === 'autopay');
      cardsInCurrency.forEach(card => {
        const amount = card.autopay_amount_type === 'minimum' ? card.min_payment :
                      card.autopay_amount_type === 'full_balance' ? card.balance :
                      card.autopay_custom_amount || 0;
        projectionsByCurrency[currency].outgoing += amount;
      });

      // Calculate outgoing from loans in this currency
      const loansInCurrency = mortgageLoans.filter(l => (l.currency || 'USD') === currency);
      loansInCurrency.forEach(loan => {
        projectionsByCurrency[currency].outgoing += loan.monthly_payment || 0;
      });

      // Calculate transfers to savings
      bankTransfers.forEach(transfer => {
        const fromAccount = bankAccounts.find(a => a.id === transfer.from_account_id);
        const toAccount = bankAccounts.find(a => a.id === transfer.to_account_id);
        
        if (fromAccount && toAccount && fromAccount.currency === currency) {
          if (fromAccount.account_type === 'checking' && toAccount.account_type === 'savings') {
            if (transfer.frequency === 'monthly' || transfer.frequency === 'weekly') {
              const amount = transfer.amount || 0;
              if (transfer.frequency === 'weekly') {
                projectionsByCurrency[currency].toSavings += amount * 4;
              } else {
                projectionsByCurrency[currency].toSavings += amount;
              }
            }
          }
        }
      });
    });

    return projectionsByCurrency;
  };

  const monthlyProjections = calculateMonthlyProjections();

  // Handle drag end
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(sectionOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setSectionOrder(items);
    localStorage.setItem('overview_section_order', JSON.stringify(items));
  };

  // Section components
  const sections = {
    projections: Object.keys(monthlyProjections).length > 0 && (
      <Collapsible open={expandedProjections} onOpenChange={setExpandedProjections}>
        <Card className="border-cyan-200">
          <CollapsibleTrigger className="w-full">
            <CardContent className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <GripVertical className="w-5 h-5 text-slate-400" />
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-cyan-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900">Monthly Projections</p>
                  <div className="text-sm text-blue-600 font-medium">
                    <span>Net: </span>
                    {Object.entries(monthlyProjections).map(([currency, data], idx) => {
                      const net = data.income - data.outgoing - data.toSavings;
                      return (
                        <span key={currency}>
                          {idx > 0 && ', '}
                          {(net >= 0 ? '+' : '') + formatCurrency(net, currency)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
              {expandedProjections ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-3">
              {Object.entries(monthlyProjections).map(([currency, data]) => {
                const projectedLeftover = data.income - data.outgoing - data.toSavings;
                
                // Get checking balance using ongoing balance calculation
                const checkingBalance = bankAccounts
                  .filter(acc => acc.currency === currency && acc.account_type === 'checking')
                  .reduce((sum, acc) => {
                    const accountDeposits = allDeposits.filter(d => d.bank_account_id === acc.id);
                    const totalDeposits = accountDeposits.filter(d => d.amount > 0).reduce((sum, d) => sum + d.amount, 0);
                    const totalWithdrawals = Math.abs(accountDeposits.filter(d => d.amount < 0).reduce((sum, d) => sum + d.amount, 0));
                    return sum + ((acc.balance || 0) + totalDeposits - totalWithdrawals);
                  }, 0);
                
                const finalBalance = checkingBalance + projectedLeftover;

                return (
                  <div key={currency} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
                      <Badge variant="outline" className="text-sm">{currency}</Badge>
                      <p className="text-xs text-slate-500">Current Month</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-slate-500">Income</p>
                          <p className="font-semibold text-emerald-600 truncate">
                            {formatCurrency(data.income, currency)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <TrendingDown className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-slate-500">Outgoing</p>
                          <p className="font-semibold text-red-600 truncate">
                            {formatCurrency(data.outgoing, currency)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-slate-500">To Savings</p>
                          <p className="font-semibold text-blue-600 truncate">
                            {formatCurrency(data.toSavings, currency)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-slate-500">Net Change</p>
                          <p className={`font-semibold truncate ${projectedLeftover >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {projectedLeftover >= 0 ? '+' : ''}{formatCurrency(projectedLeftover, currency)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs">
                        <p className="text-slate-500">Projected Checking</p>
                        <p className="font-bold text-slate-900">
                          {formatCurrency(finalBalance, currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    ),
    cards: cards.length > 0 && (
      <Collapsible open={expandedCards} onOpenChange={setExpandedCards}>
        <Card className="border-blue-200">
          <CollapsibleTrigger className="w-full">
            <CardContent className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <GripVertical className="w-5 h-5 text-slate-400" />
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900">{cards.length} Credit Cards</p>
                  {Object.keys(minPaymentByCurrency).length === 1 ? (
                    <>
                      <p className="text-sm text-slate-500">Min Due: {formatCurrency(Object.values(minPaymentByCurrency)[0], Object.keys(minPaymentByCurrency)[0])}</p>
                      <p className="text-sm text-blue-600 font-medium">Projected: {formatCurrency(Object.values(projectedPaymentByCurrency)[0], Object.keys(projectedPaymentByCurrency)[0])}</p>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-slate-500">
                        <span>Min Due: </span>
                        {Object.entries(minPaymentByCurrency).map(([currency, amount], idx) => (
                          <span key={currency}>
                            {idx > 0 && ', '}
                            {formatCurrency(amount, currency)}
                          </span>
                        ))}
                      </div>
                      <div className="text-sm text-blue-600 font-medium">
                        <span>Projected: </span>
                        {Object.entries(projectedPaymentByCurrency).map(([currency, amount], idx) => (
                          <span key={currency}>
                            {idx > 0 && ', '}
                            {formatCurrency(amount, currency)}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              {expandedCards ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2">
              {cards.map(card => {
                const utilization = calculateUtilization(card.balance, card.credit_limit);
                const minPayment = calculateMinimumPayment(card.min_payment, card.balance);
                return (
                  <Link key={card.id} to={createPageUrl(`CardDetail?id=${card.id}`)} className="block">
                    <div className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-slate-900">{card.name}</p>
                          <p className="text-xs text-slate-500">{card.apr * 100}% APR</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{formatCurrency(card.balance, card.currency)}</p>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Min Payment:</span>
                          <span className="font-medium">{formatCurrency(minPayment, card.currency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Projected Payment:</span>
                          <span className="font-medium text-blue-600">
                            {formatCurrency(
                              (() => {
                                let projected = minPayment;
                                if (card.autopay_amount_type === 'full_balance') projected = card.balance;
                                else if (card.autopay_amount_type === 'custom' && card.autopay_custom_amount) projected = card.autopay_custom_amount;
                                if (card.additional_payment_enabled && card.additional_payment_amount) projected += card.additional_payment_amount;
                                return Math.min(projected, card.balance);
                              })(),
                              card.currency
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Utilization:</span>
                          <span className={getUtilizationColor(utilization)}>{utilization}%</span>
                        </div>
                        {card.due_date && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Due Date:</span>
                            <span className="font-medium">{card.due_date}{card.due_date === 1 ? 'st' : card.due_date === 2 ? 'nd' : card.due_date === 3 ? 'rd' : 'th'} of month</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    ),
    banks: bankAccounts.length > 0 && (
      <Collapsible open={expandedBanks} onOpenChange={setExpandedBanks}>
        <Card className="border-emerald-200">
          <CollapsibleTrigger className="w-full">
            <CardContent className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <GripVertical className="w-5 h-5 text-slate-400" />
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900">{bankAccounts.length} Bank Accounts</p>
                  {Object.keys(totalBankBalanceByCurrency).length === 0 ? (
                    <p className="text-sm text-slate-500">Payment sources</p>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="text-sm">
                        <span className="text-slate-500">Total: </span>
                        {Object.entries(totalBankBalanceByCurrency).map(([currency, amount], idx) => (
                          <span key={currency} className="font-medium text-blue-600">
                            {idx > 0 && ' + '}
                            {formatCurrency(amount, currency)}
                          </span>
                        ))}
                      </div>
                      {Object.keys(checkingBalanceByCurrency).length > 0 && (
                        <div className="text-xs text-slate-500">
                          <span>Checking: </span>
                          {Object.entries(checkingBalanceByCurrency).map(([currency, amount], idx) => (
                            <span key={currency}>
                              {idx > 0 && ' + '}
                              {formatCurrency(amount, currency)}
                            </span>
                          ))}
                        </div>
                      )}
                      {Object.keys(savingsBalanceByCurrency).length > 0 && (
                        <div className="text-xs text-slate-500">
                          <span>Savings: </span>
                          {Object.entries(savingsBalanceByCurrency).map(([currency, amount], idx) => (
                            <span key={currency}>
                              {idx > 0 && ' + '}
                              {formatCurrency(amount, currency)}
                            </span>
                          ))}
                        </div>
                      )}
                      {Object.keys(investmentsByCurrency).length > 0 && (
                        <div className="text-xs text-emerald-600">
                          <span>Investments: </span>
                          {Object.entries(investmentsByCurrency).map(([currency, amount], idx) => (
                            <span key={currency}>
                              {idx > 0 && ' + '}
                              {formatCurrency(amount, currency)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {expandedBanks ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2">
              {bankAccounts.map(account => {
                const accountDeposits = allDeposits.filter(d => d.bank_account_id === account.id);
                const totalDeposits = accountDeposits.filter(d => d.amount > 0).reduce((sum, d) => sum + d.amount, 0);
                const totalWithdrawals = Math.abs(accountDeposits.filter(d => d.amount < 0).reduce((sum, d) => sum + d.amount, 0));
                const ongoingBalance = (account.balance || 0) + totalDeposits - totalWithdrawals;
                const totalWithInvestments = ongoingBalance + (account.stocks_investments || 0);

                return (
                  <Link key={account.id} to={createPageUrl(`BankAccountDetail?id=${account.id}`)} className="block">
                    <div className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{account.name}</p>
                            <span className="text-xs">
                              {account.account_type === 'savings' ? '🏦' : '💳'}
                            </span>
                          </div>
                          {account.account_number && (
                            <p className="text-xs text-slate-500">••••{account.account_number.slice(-4)}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">{formatCurrency(totalWithInvestments, account.currency)}</p>
                          <p className="text-xs text-slate-500">{account.currency}</p>
                        </div>
                      </div>
                      {(account.stocks_investments > 0) && (
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-slate-500">Cash: {formatCurrency(ongoingBalance, account.currency)}</span>
                          <span className="text-emerald-600">Investments: {formatCurrency(account.stocks_investments, account.currency)}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    ),
    bills: recurringBills.length > 0 && (
      <Collapsible open={expandedBills} onOpenChange={setExpandedBills}>
        <Card className="border-purple-200">
          <CollapsibleTrigger className="w-full">
            <CardContent className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <GripVertical className="w-5 h-5 text-slate-400" />
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Receipt className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900">{recurringBills.length} Recurring Bills</p>
                  {Object.keys(monthlyBillsByCurrency).length === 1 ? (
                    <p className="text-sm text-blue-600 font-medium">Monthly: {formatCurrency(Object.values(monthlyBillsByCurrency)[0], Object.keys(monthlyBillsByCurrency)[0])}</p>
                  ) : (
                    <div className="text-sm text-blue-600 font-medium">
                      <span>Monthly: </span>
                      {Object.entries(monthlyBillsByCurrency).map(([currency, amount], idx) => (
                        <span key={currency}>
                          {idx > 0 && ', '}
                          {formatCurrency(amount, currency)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {expandedBills ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2">
              {recurringBills.map(bill => (
                <Link key={bill.id} to={createPageUrl(`BillDetail?id=${bill.id}`)} className="block">
                  <div className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span>{BILL_CATEGORY_ICONS[bill.category]}</span>
                        <p className="font-medium text-slate-900">{bill.name}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(bill.amount, bill.currency)}</p>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span className="capitalize">{bill.frequency.replace('_', ' ')}</span>
                      {bill.due_date && <span>Due: {bill.due_date}{bill.due_date === 1 ? 'st' : bill.due_date === 2 ? 'nd' : bill.due_date === 3 ? 'rd' : 'th'}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    ),
    loans: mortgageLoans.length > 0 && (
      <Collapsible open={expandedLoans} onOpenChange={setExpandedLoans}>
        <Card className="border-orange-200">
          <CollapsibleTrigger className="w-full">
            <CardContent className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <GripVertical className="w-5 h-5 text-slate-400" />
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Landmark className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900">{mortgageLoans.length} Loans</p>
                  {Object.keys(minLoanPaymentByCurrency).length === 1 ? (
                    <>
                      <p className="text-sm text-slate-500">Min Due: {formatCurrency(Object.values(minLoanPaymentByCurrency)[0], Object.keys(minLoanPaymentByCurrency)[0])}</p>
                      <p className="text-sm text-blue-600 font-medium">Projected: {formatCurrency(Object.values(projectedLoanPaymentByCurrency)[0], Object.keys(projectedLoanPaymentByCurrency)[0])}</p>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-slate-500">
                        <span>Min Due: </span>
                        {Object.entries(minLoanPaymentByCurrency).map(([currency, amount], idx) => (
                          <span key={currency}>
                            {idx > 0 && ', '}
                            {formatCurrency(amount, currency)}
                          </span>
                        ))}
                      </div>
                      <div className="text-sm text-blue-600 font-medium">
                        <span>Projected: </span>
                        {Object.entries(projectedLoanPaymentByCurrency).map(([currency, amount], idx) => (
                          <span key={currency}>
                            {idx > 0 && ', '}
                            {formatCurrency(amount, currency)}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              {expandedLoans ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2">
              {mortgageLoans.map(loan => {
                const progress = ((loan.loan_amount - loan.current_balance) / loan.loan_amount) * 100;
                return (
                  <Link key={loan.id} to={createPageUrl(`LoanDetail?id=${loan.id}`)} className="block">
                    <div className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span>{LOAN_TYPE_ICONS[loan.loan_type]}</span>
                          <div>
                            <p className="font-medium text-slate-900">{loan.name}</p>
                            <p className="text-xs text-slate-500">{(loan.interest_rate * 100).toFixed(2)}% APR</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{formatCurrency(loan.current_balance, loan.currency)}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Min Payment: {formatCurrency(loan.monthly_payment, loan.currency)}/mo</span>
                          <span>{progress.toFixed(0)}% paid</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Projected Payment:</span>
                          <span className="font-medium text-blue-600">{formatCurrency(loan.projected_monthly_payment || loan.monthly_payment, loan.currency)}/mo</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    )
  };

  return (
    <Collapsible open={overviewExpanded} onOpenChange={setOverviewExpanded}>
      <div className="flex items-center justify-between mb-4">
        <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <h2 className="text-xl font-bold text-emerald-400">Your Overview</h2>
          {overviewExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          )}
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        {/* Quick Balance Update Controls */}
        {(cards.length > 0 || bankAccounts.length > 0 || mortgageLoans.length > 0) && (
          <Collapsible open={quickUpdatesExpanded} onOpenChange={setQuickUpdatesExpanded} className="mb-4">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">Quick Balance Updates</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="text-white/60 hover:text-white transition-colors" onClick={(e) => e.stopPropagation()}>
                            <HelpCircle className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">
                            Update your balance to reflect cashflow changes not tracked by ClearLedger
                            (such as daily spending, groceries, cash withdrawals, or external income).
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {quickUpdatesExpanded ? (
                    <ChevronUp className="w-4 h-4 text-white/60" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white/60" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-wrap gap-2">
                  {bankAccounts.length > 0 && onUpdateBankBalance && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (bankAccounts.length > 1) {
                          setShowAccountSelector('bank');
                        } else {
                          const account = bankAccounts[0];
                          const accountDeposits = allDeposits.filter(d => d.bank_account_id === account.id);
                          const totalDeposits = accountDeposits.filter(d => d.amount > 0).reduce((sum, d) => sum + d.amount, 0);
                          const totalWithdrawals = Math.abs(accountDeposits.filter(d => d.amount < 0).reduce((sum, d) => sum + d.amount, 0));
                          const ongoingBalance = (account.balance || 0) + totalDeposits - totalWithdrawals;
                          onUpdateBankBalance(account.id, ongoingBalance);
                        }
                      }}
                      className="bg-white/80 hover:bg-white border-emerald-300 text-slate-700 hover:text-slate-900"
                    >
                      <Building2 className="w-3.5 h-3.5 mr-1.5" />
                      Update Bank Balance
                    </Button>
                  )}
                  {cards.length > 0 && onUpdateCardBalance && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (cards.length > 1) {
                          setShowAccountSelector('card');
                        } else {
                          const card = cards[0];
                          onUpdateCardBalance(card.id, card.balance);
                        }
                      }}
                      className="bg-white/80 hover:bg-white border-blue-300 text-slate-700 hover:text-slate-900"
                    >
                      <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                      Update Card Balance
                    </Button>
                  )}
                  {mortgageLoans.length > 0 && onUpdateLoanBalance && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (mortgageLoans.length > 1) {
                          setShowAccountSelector('loan');
                        } else {
                          const loan = mortgageLoans[0];
                          onUpdateLoanBalance(loan.id, loan.current_balance);
                        }
                      }}
                      className="bg-white/80 hover:bg-white border-orange-300 text-slate-700 hover:text-slate-900"
                    >
                      <Landmark className="w-3.5 h-3.5 mr-1.5" />
                      Update Loan Balance
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {/* Account Selector Dialog */}
        <Dialog open={!!showAccountSelector} onOpenChange={() => setShowAccountSelector(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Select {showAccountSelector === 'bank' ? 'Bank Account' : showAccountSelector === 'card' ? 'Credit Card' : 'Loan'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {showAccountSelector === 'bank' && bankAccounts.map(account => {
                const accountDeposits = allDeposits.filter(d => d.bank_account_id === account.id);
                const totalDeposits = accountDeposits.filter(d => d.amount > 0).reduce((sum, d) => sum + d.amount, 0);
                const totalWithdrawals = Math.abs(accountDeposits.filter(d => d.amount < 0).reduce((sum, d) => sum + d.amount, 0));
                const ongoingBalance = (account.balance || 0) + totalDeposits - totalWithdrawals;
                
                return (
                  <Button
                    key={account.id}
                    variant="outline"
                    className="w-full justify-between h-auto py-3"
                    onClick={() => {
                      onUpdateBankBalance(account.id, ongoingBalance);
                      setShowAccountSelector(null);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <div className="text-left">
                        <p className="font-medium">{account.name}</p>
                        <p className="text-xs text-slate-500">{account.account_type}</p>
                      </div>
                    </div>
                    <p className="font-semibold">{formatCurrency(ongoingBalance, account.currency)}</p>
                  </Button>
                );
              })}
              {showAccountSelector === 'card' && cards.map(card => (
                <Button
                  key={card.id}
                  variant="outline"
                  className="w-full justify-between h-auto py-3"
                  onClick={() => {
                    onUpdateCardBalance(card.id, card.balance);
                    setShowAccountSelector(null);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <div className="text-left">
                      <p className="font-medium">{card.name}</p>
                      <p className="text-xs text-slate-500">{card.apr * 100}% APR</p>
                    </div>
                  </div>
                  <p className="font-semibold">{formatCurrency(card.balance, card.currency)}</p>
                </Button>
              ))}
              {showAccountSelector === 'loan' && mortgageLoans.map(loan => (
                <Button
                  key={loan.id}
                  variant="outline"
                  className="w-full justify-between h-auto py-3"
                  onClick={() => {
                    onUpdateLoanBalance(loan.id, loan.current_balance);
                    setShowAccountSelector(null);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4" />
                    <div className="text-left">
                      <p className="font-medium">{loan.name}</p>
                      <p className="text-xs text-slate-500">{(loan.interest_rate * 100).toFixed(2)}% APR</p>
                    </div>
                  </div>
                  <p className="font-semibold">{formatCurrency(loan.current_balance, loan.currency)}</p>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="overview-sections">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-4"
              >
                {sectionOrder.map((sectionKey, index) => {
                  const section = sections[sectionKey];
                  if (!section) return null;
                  
                  return (
                    <Draggable key={sectionKey} draggableId={sectionKey} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={snapshot.isDragging ? 'opacity-50' : ''}
                        >
                          {section}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </CollapsibleContent>
    </Collapsible>
  );
}
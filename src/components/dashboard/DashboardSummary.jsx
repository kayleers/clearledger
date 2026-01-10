import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { createPageUrl } from '@/utils';
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
  Landmark
} from 'lucide-react';
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

export default function DashboardSummary({ cards, bankAccounts = [], recurringBills = [], mortgageLoans = [] }) {
  const [expandedCards, setExpandedCards] = useState(false);
  const [expandedBills, setExpandedBills] = useState(false);
  const [expandedLoans, setExpandedLoans] = useState(false);
  const [expandedBanks, setExpandedBanks] = useState(false);
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

  // Group by currency
  const minPaymentByCurrency = cards.reduce((acc, card) => {
    const curr = card.currency || 'USD';
    if (!acc[curr]) acc[curr] = 0;
    acc[curr] += calculateMinimumPayment(card.min_payment, card.balance);
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

  // Calculate ongoing balance for bank accounts
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

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800">Your Overview</h2>
      
      {/* Expandable Cards Details */}
      <Collapsible open={expandedCards} onOpenChange={setExpandedCards}>
        <Card className="border-blue-200">
          <CollapsibleTrigger className="w-full">
            <CardContent className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900">{cards.length} Credit Cards</p>
                  {Object.keys(minPaymentByCurrency).length === 1 ? (
                    <p className="text-sm text-slate-500">Min Due: {formatCurrency(Object.values(minPaymentByCurrency)[0], Object.keys(minPaymentByCurrency)[0])}</p>
                  ) : (
                    <div className="text-sm text-slate-500">
                      <span>Min Due: </span>
                      {Object.entries(minPaymentByCurrency).map(([currency, amount], idx) => (
                        <span key={currency}>
                          {idx > 0 && ', '}
                          {formatCurrency(amount, currency)}
                        </span>
                      ))}
                    </div>
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

      {/* Bank Accounts Section */}
      {bankAccounts.length > 0 && (
        <Collapsible open={expandedBanks} onOpenChange={setExpandedBanks}>
          <Card className="border-emerald-200">
            <CollapsibleTrigger className="w-full">
              <CardContent className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">{bankAccounts.length} Bank Accounts</p>
                    {Object.keys(totalBankBalanceByCurrency).length === 0 ? (
                      <p className="text-sm text-slate-500">Payment sources</p>
                    ) : Object.keys(totalBankBalanceByCurrency).length === 1 ? (
                      <p className="text-sm text-slate-500">Balance: {formatCurrency(Object.values(totalBankBalanceByCurrency)[0], Object.keys(totalBankBalanceByCurrency)[0])}</p>
                    ) : (
                      <div className="text-sm text-slate-500">
                        <span>Balance: </span>
                        {Object.entries(totalBankBalanceByCurrency).map(([currency, amount], idx) => (
                          <span key={currency}>
                            {idx > 0 && ', '}
                            {formatCurrency(amount, currency)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {expandedBanks ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </CardContent>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-2">
                {bankAccounts.map(account => (
                  <Link key={account.id} to={createPageUrl(`BankAccountDetail?id=${account.id}`)} className="block">
                    <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center hover:bg-slate-100 transition-colors cursor-pointer">
                      <div>
                        <p className="font-medium text-slate-900">{account.name}</p>
                        {account.account_number && (
                          <p className="text-xs text-slate-500">••••{account.account_number.slice(-4)}</p>
                        )}
                      </div>
                      <span className="text-sm font-medium text-slate-600">{account.currency}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Recurring Bills Section */}
      {recurringBills.length > 0 && (
        <Collapsible open={expandedBills} onOpenChange={setExpandedBills}>
          <Card className="border-purple-200">
            <CollapsibleTrigger className="w-full">
              <CardContent className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Receipt className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">{recurringBills.length} Recurring Bills</p>
                    {Object.keys(monthlyBillsByCurrency).length === 1 ? (
                      <p className="text-sm text-slate-500">Monthly: {formatCurrency(Object.values(monthlyBillsByCurrency)[0], Object.keys(monthlyBillsByCurrency)[0])}</p>
                    ) : (
                      <div className="text-sm text-slate-500">
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
                  <div key={bill.id} className="p-3 bg-slate-50 rounded-lg">
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
                ))}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Loans/Mortgages Section */}
      {mortgageLoans.length > 0 && (
        <Collapsible open={expandedLoans} onOpenChange={setExpandedLoans}>
          <Card className="border-orange-200">
            <CollapsibleTrigger className="w-full">
              <CardContent className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Landmark className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">{mortgageLoans.length} Loans</p>
                    {Object.keys(totalLoansByCurrency).length === 0 ? (
                      <p className="text-sm text-slate-500">No balances</p>
                    ) : Object.keys(totalLoansByCurrency).length === 1 ? (
                      <p className="text-sm text-slate-500">Total: {formatCurrency(Object.values(totalLoansByCurrency)[0], Object.keys(totalLoansByCurrency)[0])}</p>
                    ) : (
                      <div className="text-sm text-slate-500">
                        <span>Total: </span>
                        {Object.entries(totalLoansByCurrency).map(([currency, amount], idx) => (
                          <span key={currency}>
                            {idx > 0 && ', '}
                            {formatCurrency(amount, currency)}
                          </span>
                        ))}
                      </div>
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
                            <span className="font-medium text-blue-600">{formatCurrency(loan.monthly_payment, loan.currency)}/mo</span>
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
      )}


    </div>
  );
}
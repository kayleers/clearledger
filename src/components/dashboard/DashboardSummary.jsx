import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
      {/* Total Balance Card */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-slate-300 text-sm mb-1">Total Debt</p>
              <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
            </div>
            <div className="p-3 bg-white/10 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Credit Used</span>
              <span className={getUtilizationColor(totalUtilization).replace('text-', 'text-')}>{totalUtilization}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${getUtilizationBgColor(totalUtilization)}`}
                style={{ width: `${Math.min(totalUtilization, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400">
              {formatCurrency(totalBalance)} of {formatCurrency(totalLimit)} limit
            </p>
          </div>
        </CardContent>
      </Card>

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
                  <p className="text-sm text-slate-500">Min Due: {formatCurrency(totalMinPayment)}</p>
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
                    <p className="text-sm text-slate-500">Payment sources</p>
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
                    <p className="text-sm text-slate-500">Monthly: {formatCurrency(recurringBills.filter(b => b.frequency === 'monthly').reduce((sum, b) => sum + b.amount, 0))}</p>
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
                    <p className="text-sm text-slate-500">Total: {formatCurrency(mortgageLoans.reduce((sum, l) => sum + l.current_balance, 0))}</p>
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
                            <span>Payment: {formatCurrency(loan.monthly_payment, loan.currency)}/mo</span>
                            <span>{progress.toFixed(0)}% paid</span>
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
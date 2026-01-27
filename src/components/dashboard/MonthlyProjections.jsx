import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { formatCurrency } from '@/components/utils/calculations';

export default function MonthlyProjections({ 
  cards = [], 
  bankAccounts = [], 
  recurringBills = [], 
  mortgageLoans = [] 
}) {
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

  const calculateMonthlyProjections = () => {
    const projectionsByCurrency = {};

    // Helper to initialize currency if not exists
    const initCurrency = (currency) => {
      if (!projectionsByCurrency[currency]) {
        projectionsByCurrency[currency] = {
          income: 0,
          outgoing: 0,
          toSavings: 0
        };
      }
    };

    // Group accounts by currency
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

    // Calculate for each currency
    Object.entries(accountsByCurrency).forEach(([currency, accounts]) => {
      initCurrency(currency);
      
      // Calculate recurring deposits (income) for checking accounts
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

      // Calculate outgoing for checking accounts
      accounts.checking.forEach(acc => {
        // Bills
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

        // Recurring withdrawals
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

        // Credit card autopay
        const cardsForAccount = cards.filter(c => c.bank_account_id === acc.id && c.payment_method === 'autopay');
        cardsForAccount.forEach(card => {
          const amount = card.autopay_amount_type === 'minimum' ? card.min_payment :
                        card.autopay_amount_type === 'full_balance' ? card.balance :
                        card.autopay_custom_amount || 0;
          projectionsByCurrency[currency].outgoing += amount;
        });

        // Loan payments
        const loansForAccount = mortgageLoans.filter(l => l.bank_account_id === acc.id);
        loansForAccount.forEach(loan => {
          projectionsByCurrency[currency].outgoing += loan.monthly_payment || 0;
        });
      });

      // Calculate transfers to savings
      bankTransfers.forEach(transfer => {
        const fromAccount = bankAccounts.find(a => a.id === transfer.from_account_id);
        const toAccount = bankAccounts.find(a => a.id === transfer.to_account_id);
        
        if (fromAccount && toAccount && fromAccount.currency === currency) {
          // Only count transfers from checking to savings
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

  if (Object.keys(monthlyProjections).length === 0) {
    return null;
  }

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-white/40">
      <CardHeader>
        <CardTitle className="text-lg">This Month's Projection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(monthlyProjections).map(([currency, data]) => {
          const projectedLeftover = data.income - data.outgoing - data.toSavings;
          const checkingBalance = bankAccounts
            .filter(acc => acc.currency === currency && acc.account_type === 'checking')
            .reduce((sum, acc) => sum + (acc.balance || 0), 0);
          const finalBalance = checkingBalance + projectedLeftover;

          return (
            <div key={currency} className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <Badge variant="outline" className="text-sm">{currency}</Badge>
                <p className="text-xs text-slate-500">Current Month</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-slate-500 text-xs">Income</p>
                    <p className="font-semibold text-emerald-600">
                      {formatCurrency(data.income, currency)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <div>
                    <p className="text-slate-500 text-xs">Outgoing</p>
                    <p className="font-semibold text-red-600">
                      {formatCurrency(data.outgoing, currency)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-slate-500 text-xs">To Savings</p>
                    <p className="font-semibold text-blue-600">
                      {formatCurrency(data.toSavings, currency)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <div>
                    <p className="text-slate-500 text-xs">Net Change</p>
                    <p className={`font-semibold ${projectedLeftover >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {projectedLeftover >= 0 ? '+' : ''}{formatCurrency(projectedLeftover, currency)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">Projected Checking Balance</p>
                  <p className="font-bold text-slate-900">
                    {formatCurrency(finalBalance, currency)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
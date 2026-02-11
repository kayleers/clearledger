import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import MobileSelect from '@/components/ui/mobile-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, Calendar, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatCurrency } from '@/components/utils/calculations';

const DEPOSIT_CATEGORIES = [
  { value: 'salary', label: '💰 Salary', icon: '💰' },
  { value: 'freelance', label: '💼 Freelance', icon: '💼' },
  { value: 'business', label: '🏢 Business', icon: '🏢' },
  { value: 'refund', label: '💸 Refund', icon: '💸' },
  { value: 'transfer', label: '🔄 Transfer', icon: '🔄' },
  { value: 'other', label: '📥 Other', icon: '📥' }
];

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' }
];

export default function BankAccountDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const accountId = urlParams.get('id');

  const [showAddDeposit, setShowAddDeposit] = useState(false);
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [showAddWithdrawal, setShowAddWithdrawal] = useState(false);
  const [showAddRecurringWithdrawal, setShowAddRecurringWithdrawal] = useState(false);
  const queryClient = useQueryClient();

  const { data: account, isLoading } = useQuery({
    queryKey: ['bank-account', accountId],
    queryFn: async () => {
      const accounts = await base44.entities.BankAccount.list();
      return accounts.find(a => a.id === accountId);
    }
  });

  const { data: deposits = [] } = useQuery({
    queryKey: ['deposits', accountId],
    queryFn: () => base44.entities.Deposit.filter({ bank_account_id: accountId })
  });

  const { data: recurringDeposits = [] } = useQuery({
    queryKey: ['recurring-deposits', accountId],
    queryFn: () => base44.entities.RecurringDeposit.filter({ bank_account_id: accountId, is_active: true })
  });

  const { data: recurringWithdrawals = [] } = useQuery({
    queryKey: ['recurring-withdrawals', accountId],
    queryFn: () => base44.entities.RecurringWithdrawal.filter({ bank_account_id: accountId, is_active: true })
  });

  const { data: recurringBills = [] } = useQuery({
    queryKey: ['recurring-bills', accountId],
    queryFn: () => base44.entities.RecurringBill.filter({ bank_account_id: accountId, is_active: true })
  });

  const { data: creditCards = [] } = useQuery({
    queryKey: ['credit-cards', accountId],
    queryFn: async () => {
      const allCards = await base44.entities.CreditCard.list();
      return allCards.filter(c => c.bank_account_id === accountId && c.payment_method === 'autopay');
    }
  });

  const { data: loans = [] } = useQuery({
    queryKey: ['loans', accountId],
    queryFn: async () => {
      const allLoans = await base44.entities.MortgageLoan.list();
      return allLoans.filter(l => l.bank_account_id === accountId && l.is_active);
    }
  });

  const { data: allBankAccounts = [] } = useQuery({
    queryKey: ['all-bank-accounts'],
    queryFn: () => base44.entities.BankAccount.list()
  });

  const { data: bankTransfers = [] } = useQuery({
    queryKey: ['bank-transfers', accountId],
    queryFn: async () => {
      const allTransfers = await base44.entities.BankTransfer.list();
      return allTransfers.filter(t => t.is_active !== false);
    }
  });

  const createDepositMutation = useMutation({
    mutationFn: (data) => base44.entities.Deposit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      setShowAddDeposit(false);
    }
  });

  const createRecurringMutation = useMutation({
    mutationFn: (data) => base44.entities.RecurringDeposit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-deposits'] });
      setShowAddRecurring(false);
    }
  });

  const deleteDepositMutation = useMutation({
    mutationFn: (id) => base44.entities.Deposit.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['deposits', accountId] });
      const previousDeposits = queryClient.getQueryData(['deposits', accountId]);
      queryClient.setQueryData(['deposits', accountId], (old) => 
        old?.filter(d => d.id !== id) || []
      );
      return { previousDeposits };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['deposits', accountId], context.previousDeposits);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
    }
  });

  const deleteRecurringMutation = useMutation({
    mutationFn: (id) => base44.entities.RecurringDeposit.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['recurring-deposits', accountId] });
      const previousDeposits = queryClient.getQueryData(['recurring-deposits', accountId]);
      queryClient.setQueryData(['recurring-deposits', accountId], (old) => 
        old?.filter(d => d.id !== id) || []
      );
      return { previousDeposits };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['recurring-deposits', accountId], context.previousDeposits);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-deposits'] });
    }
  });

  const createWithdrawalMutation = useMutation({
    mutationFn: (data) => base44.entities.Deposit.create({ ...data, amount: -Math.abs(data.amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      setShowAddWithdrawal(false);
    }
  });

  const createRecurringWithdrawalMutation = useMutation({
    mutationFn: (data) => base44.entities.RecurringWithdrawal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-withdrawals'] });
      setShowAddRecurringWithdrawal(false);
    }
  });

  const deleteRecurringWithdrawalMutation = useMutation({
    mutationFn: (id) => base44.entities.RecurringWithdrawal.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['recurring-withdrawals', accountId] });
      const previousWithdrawals = queryClient.getQueryData(['recurring-withdrawals', accountId]);
      queryClient.setQueryData(['recurring-withdrawals', accountId], (old) => 
        old?.filter(w => w.id !== id) || []
      );
      return { previousWithdrawals };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['recurring-withdrawals', accountId], context.previousWithdrawals);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-withdrawals'] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <p>Account not found</p>
      </div>
    );
  }

  const sortedDeposits = [...deposits].filter(d => d.amount > 0).sort((a, b) => new Date(b.date) - new Date(a.date));
  const sortedWithdrawals = [...deposits].filter(d => d.amount < 0).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Calculate ongoing balance
  const totalDeposits = deposits.filter(d => d.amount > 0).reduce((sum, d) => sum + d.amount, 0);
  const totalWithdrawals = Math.abs(deposits.filter(d => d.amount < 0).reduce((sum, d) => sum + d.amount, 0));
  const ongoingBalance = (account.balance || 0) + totalDeposits - totalWithdrawals;

  // Calculate monthly projections by currency
  const calculateMonthlyProjections = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
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

    // Get all accounts for this currency and type
    const accountsInSameCurrency = allBankAccounts.filter(acc => acc.currency === account.currency);
    const checkingAccounts = accountsInSameCurrency.filter(acc => acc.account_type === 'checking');
    const savingsAccounts = accountsInSameCurrency.filter(acc => acc.account_type === 'savings');
    
    initCurrency(account.currency);

    // Calculate recurring deposits (income) for checking accounts only
    checkingAccounts.forEach(acc => {
      const depositsForAccount = recurringDeposits.filter(d => d.bank_account_id === acc.id);
      depositsForAccount.forEach(deposit => {
        if (deposit.frequency === 'monthly' || deposit.frequency === 'bi_weekly' || deposit.frequency === 'weekly') {
          const amount = deposit.amount || 0;
          if (deposit.frequency === 'weekly') {
            projectionsByCurrency[account.currency].income += amount * 4;
          } else if (deposit.frequency === 'bi_weekly') {
            projectionsByCurrency[account.currency].income += amount * 2;
          } else {
            projectionsByCurrency[account.currency].income += amount;
          }
        }
      });
    });

    // Calculate outgoing (bills, withdrawals, card payments, loan payments)
    checkingAccounts.forEach(acc => {
      // Bills
      const billsForAccount = recurringBills.filter(b => b.bank_account_id === acc.id);
      billsForAccount.forEach(bill => {
        if (bill.frequency === 'monthly' || bill.frequency === 'weekly') {
          const amount = bill.amount || 0;
          if (bill.frequency === 'weekly') {
            projectionsByCurrency[account.currency].outgoing += amount * 4;
          } else {
            projectionsByCurrency[account.currency].outgoing += amount;
          }
        }
      });

      // Recurring withdrawals
      const withdrawalsForAccount = recurringWithdrawals.filter(w => w.bank_account_id === acc.id);
      withdrawalsForAccount.forEach(withdrawal => {
        if (withdrawal.frequency === 'monthly' || withdrawal.frequency === 'weekly' || withdrawal.frequency === 'bi_weekly') {
          const amount = withdrawal.amount || 0;
          if (withdrawal.frequency === 'weekly') {
            projectionsByCurrency[account.currency].outgoing += amount * 4;
          } else if (withdrawal.frequency === 'bi_weekly') {
            projectionsByCurrency[account.currency].outgoing += amount * 2;
          } else {
            projectionsByCurrency[account.currency].outgoing += amount;
          }
        }
      });

      // Credit card autopay
      const cardsForAccount = creditCards.filter(c => c.bank_account_id === acc.id);
      cardsForAccount.forEach(card => {
        const amount = card.autopay_amount_type === 'minimum' ? card.min_payment :
                      card.autopay_amount_type === 'full_balance' ? card.balance :
                      card.autopay_custom_amount || 0;
        projectionsByCurrency[account.currency].outgoing += amount;
      });

      // Loan payments
      const loansForAccount = loans.filter(l => l.bank_account_id === acc.id);
      loansForAccount.forEach(loan => {
        projectionsByCurrency[account.currency].outgoing += loan.monthly_payment || 0;
      });
    });

    // Calculate transfers to savings
    bankTransfers.forEach(transfer => {
      const fromAccount = allBankAccounts.find(a => a.id === transfer.from_account_id);
      const toAccount = allBankAccounts.find(a => a.id === transfer.to_account_id);
      
      if (fromAccount && toAccount && fromAccount.currency === account.currency) {
        // Only count transfers from checking to savings
        if (fromAccount.account_type === 'checking' && toAccount.account_type === 'savings') {
          if (transfer.frequency === 'monthly' || transfer.frequency === 'weekly') {
            const amount = transfer.amount || 0;
            if (transfer.frequency === 'weekly') {
              projectionsByCurrency[account.currency].toSavings += amount * 4;
            } else {
              projectionsByCurrency[account.currency].toSavings += amount;
            }
          }
        }
      }
    });

    return projectionsByCurrency;
  };

  const monthlyProjections = calculateMonthlyProjections();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 safe-area-pt">
      <div className="max-w-lg mx-auto p-6">
        <Link to={createPageUrl('Dashboard')} className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-6 hover:text-slate-900 dark:hover:text-slate-100">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <Card className="mb-6 dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-2xl dark:text-slate-100">{account.name}</CardTitle>
            <div className="mt-2">
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(ongoingBalance + (account.stocks_investments || 0), account.currency)}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total balance</p>
            </div>
            <div className="flex gap-4 mt-3 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Cash</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(ongoingBalance, account.currency)}</p>
              </div>
              {(account.stocks_investments > 0) && (
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Investments</p>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(account.stocks_investments, account.currency)}</p>
                </div>
              )}
            </div>
            {account.account_number && (
              <p className="text-slate-500 dark:text-slate-400 mt-2">••••{account.account_number.slice(-4)}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{account.currency}</Badge>
              {!account.is_active && <Badge variant="secondary">Inactive</Badge>}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Projections Overview */}
        {Object.keys(monthlyProjections).length > 0 && (
          <Card className="mb-6 dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg dark:text-slate-100">This Month's Projection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(monthlyProjections).map(([currency, data]) => {
                const projectedLeftover = data.income - data.outgoing - data.toSavings;
                const checkingBalance = allBankAccounts
                  .filter(acc => acc.currency === currency && acc.account_type === 'checking')
                  .reduce((sum, acc) => {
                    const accountDeposits = deposits.filter(d => d.bank_account_id === acc.id);
                    const totalDeposits = accountDeposits.filter(d => d.amount > 0).reduce((sum, d) => sum + d.amount, 0);
                    const totalWithdrawals = Math.abs(accountDeposits.filter(d => d.amount < 0).reduce((sum, d) => sum + d.amount, 0));
                    return sum + ((acc.balance || 0) + totalDeposits - totalWithdrawals);
                  }, 0);
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
        )}

        <Tabs defaultValue="deposits" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="recurring">Recurring +</TabsTrigger>
            <TabsTrigger value="recurring-withdrawals">Recurring -</TabsTrigger>
          </TabsList>

          <TabsContent value="deposits" className="space-y-4">
            <Button onClick={() => setShowAddDeposit(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Deposit
            </Button>

            <div className="space-y-3">
              {sortedDeposits.length === 0 ? (
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardContent className="p-6 text-center text-slate-500 dark:text-slate-400">
                    No deposits yet
                  </CardContent>
                </Card>
              ) : (
                sortedDeposits.map(deposit => {
                  const category = DEPOSIT_CATEGORIES.find(c => c.value === deposit.category);
                  return (
                    <Card key={deposit.id} className="dark:bg-slate-900 dark:border-slate-800">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <span className="text-2xl">{category?.icon}</span>
                            <div className="flex-1">
                              <p className="font-medium dark:text-slate-100">{deposit.description || 'Deposit'}</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {new Date(deposit.date).toLocaleDateString()}
                              </p>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {category?.label.split(' ')[1]}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right flex items-start gap-2">
                            <div>
                              <p className="text-lg font-semibold text-green-600">
                                +{formatCurrency(deposit.amount, account.currency)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteDepositMutation.mutate(deposit.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-4">
            <Button onClick={() => setShowAddWithdrawal(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Withdrawal
            </Button>

            <div className="space-y-3">
              {sortedWithdrawals.length === 0 ? (
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardContent className="p-6 text-center text-slate-500 dark:text-slate-400">
                    No withdrawals yet
                  </CardContent>
                </Card>
              ) : (
                sortedWithdrawals.map(withdrawal => {
                  const category = DEPOSIT_CATEGORIES.find(c => c.value === withdrawal.category);
                  return (
                    <Card key={withdrawal.id} className="dark:bg-slate-900 dark:border-slate-800">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <span className="text-2xl">💸</span>
                            <div className="flex-1">
                              <p className="font-medium dark:text-slate-100">{withdrawal.description || 'Withdrawal'}</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {new Date(withdrawal.date).toLocaleDateString()}
                              </p>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {category?.label.split(' ')[1] || 'Other'}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right flex items-start gap-2">
                            <div>
                              <p className="text-lg font-semibold text-red-600">
                                -{formatCurrency(Math.abs(withdrawal.amount), account.currency)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteDepositMutation.mutate(withdrawal.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="recurring" className="space-y-4">
            <Button onClick={() => setShowAddRecurring(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Recurring Deposit
            </Button>

            <div className="space-y-3">
              {recurringDeposits.length === 0 ? (
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardContent className="p-6 text-center text-slate-500 dark:text-slate-400">
                    No recurring deposits yet
                  </CardContent>
                </Card>
              ) : (
                recurringDeposits.map(deposit => {
                  const category = DEPOSIT_CATEGORIES.find(c => c.value === deposit.category);
                  const frequency = FREQUENCY_OPTIONS.find(f => f.value === deposit.frequency);
                  return (
                    <Card key={deposit.id} className="dark:bg-slate-900 dark:border-slate-800">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <span className="text-2xl">{category?.icon}</span>
                            <div className="flex-1">
                              <p className="font-medium dark:text-slate-100">{deposit.name}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {frequency?.label}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {category?.label.split(' ')[1]}
                                </Badge>
                              </div>
                              {deposit.deposit_date && (
                                <p className="text-xs text-slate-500 mt-1">
                                  Day {deposit.deposit_date} of month
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex items-start gap-2">
                            <div>
                              <p className="text-lg font-semibold text-green-600">
                                +{formatCurrency(deposit.amount, account.currency)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteRecurringMutation.mutate(deposit.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="recurring-withdrawals" className="space-y-4">
            <Button onClick={() => setShowAddRecurringWithdrawal(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Recurring Withdrawal
            </Button>

            <div className="space-y-3">
              {recurringWithdrawals.length === 0 && recurringBills.length === 0 && creditCards.length === 0 && loans.length === 0 ? (
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardContent className="p-6 text-center text-slate-500 dark:text-slate-400">
                    No recurring withdrawals yet
                  </CardContent>
                </Card>
              ) : (
                <>
                  {recurringWithdrawals.map(withdrawal => {
                    const frequency = FREQUENCY_OPTIONS.find(f => f.value === withdrawal.frequency);
                    return (
                      <Card key={`withdrawal-${withdrawal.id}`} className="dark:bg-slate-900 dark:border-slate-800">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <span className="text-2xl">💸</span>
                              <div className="flex-1">
                                <p className="font-medium dark:text-slate-100">{withdrawal.name}</p>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {frequency?.label}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {withdrawal.category}
                                  </Badge>
                                </div>
                                {withdrawal.withdrawal_date && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    Day {withdrawal.withdrawal_date} of month
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex items-start gap-2">
                              <div>
                                <p className="text-lg font-semibold text-red-600">
                                  -{formatCurrency(withdrawal.amount, account.currency)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteRecurringWithdrawalMutation.mutate(withdrawal.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {recurringBills.map(bill => {
                    const frequencyLabel = bill.frequency === 'one_time' ? 'One Time' : 
                                          bill.frequency === 'weekly' ? 'Weekly' :
                                          bill.frequency === 'monthly' ? 'Monthly' :
                                          bill.frequency === 'quarterly' ? 'Quarterly' : 'Yearly';
                    return (
                      <Card key={`bill-${bill.id}`} className="dark:bg-slate-900 dark:border-slate-800">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <span className="text-2xl">📄</span>
                              <div className="flex-1">
                                <p className="font-medium dark:text-slate-100">{bill.name}</p>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {frequencyLabel}
                                  </Badge>
                                  <Badge className="text-xs bg-purple-100 text-purple-700">
                                    Bill
                                  </Badge>
                                </div>
                                {bill.due_date && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    Due day {bill.due_date} of month
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-red-600">
                                -{formatCurrency(bill.amount, account.currency)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {creditCards.map(card => {
                    const amount = card.autopay_amount_type === 'minimum' ? card.min_payment :
                                  card.autopay_amount_type === 'full_balance' ? card.balance :
                                  card.autopay_custom_amount || 0;
                    return (
                      <Card key={`card-${card.id}`} className="dark:bg-slate-900 dark:border-slate-800">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <span className="text-2xl">💳</span>
                              <div className="flex-1">
                                <p className="font-medium dark:text-slate-100">{card.name} (Autopay)</p>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    Monthly
                                  </Badge>
                                  <Badge className="text-xs bg-blue-100 text-blue-700">
                                    Credit Card
                                  </Badge>
                                </div>
                                {card.autopay_date && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    Autopay day {card.autopay_date} of month
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-red-600">
                                -{formatCurrency(amount, account.currency)}
                              </p>
                              <p className="text-xs text-slate-500">
                                {card.autopay_amount_type === 'minimum' ? 'Min Payment' :
                                 card.autopay_amount_type === 'full_balance' ? 'Full Balance' : 'Custom'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {loans.map(loan => (
                    <Card key={`loan-${loan.id}`} className="dark:bg-slate-900 dark:border-slate-800">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <span className="text-2xl">🏠</span>
                            <div className="flex-1">
                              <p className="font-medium dark:text-slate-100">{loan.name}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  Monthly
                                </Badge>
                                <Badge className="text-xs bg-orange-100 text-orange-700">
                                  Loan
                                </Badge>
                              </div>
                              {loan.payment_due_date && (
                                <p className="text-xs text-slate-500 mt-1">
                                  Due day {loan.payment_due_date} of month
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-red-600">
                              -{formatCurrency(loan.monthly_payment, account.currency)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={showAddDeposit} onOpenChange={setShowAddDeposit}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Deposit</DialogTitle>
            </DialogHeader>
            <DepositForm
              accountId={accountId}
              onSubmit={(data) => createDepositMutation.mutate(data)}
              onCancel={() => setShowAddDeposit(false)}
              isLoading={createDepositMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showAddRecurring} onOpenChange={setShowAddRecurring}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Recurring Deposit</DialogTitle>
            </DialogHeader>
            <RecurringDepositForm
              accountId={accountId}
              onSubmit={(data) => createRecurringMutation.mutate(data)}
              onCancel={() => setShowAddRecurring(false)}
              isLoading={createRecurringMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showAddWithdrawal} onOpenChange={setShowAddWithdrawal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Withdrawal</DialogTitle>
            </DialogHeader>
            <WithdrawalForm
              accountId={accountId}
              onSubmit={(data) => createWithdrawalMutation.mutate(data)}
              onCancel={() => setShowAddWithdrawal(false)}
              isLoading={createWithdrawalMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showAddRecurringWithdrawal} onOpenChange={setShowAddRecurringWithdrawal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Recurring Withdrawal</DialogTitle>
            </DialogHeader>
            <RecurringWithdrawalForm
              accountId={accountId}
              onSubmit={(data) => createRecurringWithdrawalMutation.mutate(data)}
              onCancel={() => setShowAddRecurringWithdrawal(false)}
              isLoading={createRecurringWithdrawalMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function DepositForm({ accountId, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    bank_account_id: accountId,
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: 'other'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Description</Label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="e.g., Salary payment"
        />
      </div>
      <div>
        <Label>Amount</Label>
        <Input
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
        />
      </div>
      <div>
        <Label>Date</Label>
        <Input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />
      </div>
      <div>
        <Label>Category</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEPOSIT_CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Adding...' : 'Add Deposit'}
        </Button>
      </div>
    </form>
  );
}

function WithdrawalForm({ accountId, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    bank_account_id: accountId,
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: 'other'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Description</Label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="e.g., Rent payment, Utility bill"
        />
      </div>
      <div>
        <Label>Amount</Label>
        <Input
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
        />
      </div>
      <div>
        <Label>Date</Label>
        <Input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />
      </div>
      <div>
        <Label>Category</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEPOSIT_CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Adding...' : 'Add Withdrawal'}
        </Button>
      </div>
    </form>
  );
}

function RecurringDepositForm({ accountId, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    bank_account_id: accountId,
    name: '',
    amount: '',
    frequency: 'monthly',
    deposit_date: '',
    category: 'salary'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      deposit_date: formData.deposit_date ? parseInt(formData.deposit_date) : null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Monthly Salary"
          required
        />
      </div>
      <div>
        <Label>Amount</Label>
        <Input
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
        />
      </div>
      <div>
        <Label>Frequency</Label>
        <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCY_OPTIONS.map(freq => (
              <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {(formData.frequency === 'monthly' || formData.frequency === 'quarterly' || formData.frequency === 'yearly') && (
        <div>
          <Label>Day of Month</Label>
          <Input
            type="number"
            min="1"
            max="31"
            value={formData.deposit_date}
            onChange={(e) => setFormData({ ...formData, deposit_date: e.target.value })}
            placeholder="1-31"
          />
        </div>
      )}
      <div>
        <Label>Category</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEPOSIT_CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Adding...' : 'Add Recurring'}
        </Button>
      </div>
    </form>
  );
}

function RecurringWithdrawalForm({ accountId, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    bank_account_id: accountId,
    name: '',
    amount: '',
    frequency: 'monthly',
    withdrawal_date: '',
    category: 'other'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      withdrawal_date: formData.withdrawal_date ? parseInt(formData.withdrawal_date) : null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Monthly Rent"
          required
        />
      </div>
      <div>
        <Label>Amount</Label>
        <Input
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
        />
      </div>
      <div>
        <Label>Frequency</Label>
        <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCY_OPTIONS.map(freq => (
              <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {(formData.frequency === 'monthly' || formData.frequency === 'quarterly' || formData.frequency === 'yearly') && (
        <div>
          <Label>Day of Month</Label>
          <Input
            type="number"
            min="1"
            max="31"
            value={formData.withdrawal_date}
            onChange={(e) => setFormData({ ...formData, withdrawal_date: e.target.value })}
            placeholder="1-31"
          />
        </div>
      )}
      <div>
        <Label>Category</Label>
        <MobileSelect
          value={formData.category}
          onValueChange={(value) => setFormData({ ...formData, category: value })}
          options={[
            { value: 'rent', label: 'Rent' },
            { value: 'utilities', label: 'Utilities' },
            { value: 'subscription', label: 'Subscription' },
            { value: 'loan', label: 'Loan' },
            { value: 'credit_card', label: 'Credit Card' },
            { value: 'other', label: 'Other' }
          ]}
          placeholder="Select category"
          label="Category"
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Adding...' : 'Add Recurring'}
        </Button>
      </div>
    </form>
  );
}
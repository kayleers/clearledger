import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RefreshCw, Calendar, DollarSign, CreditCard, Building2, FileText, Home, CheckCircle2, Download } from 'lucide-react';
import { formatCurrency } from '@/components/utils/calculations';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function SyncManager({ cards = [], bankAccounts = [], bills = [], loans = [], onExportData }) {
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncResults, setSyncResults] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const { data: syncState } = useQuery({
    queryKey: ['sync-state'],
    queryFn: async () => {
      const states = await base44.entities.SyncState.list();
      return states[0] || null;
    }
  });

  const createSyncStateMutation = useMutation({
    mutationFn: (data) => base44.entities.SyncState.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-state'] });
    }
  });

  const updateSyncStateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SyncState.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-state'] });
    }
  });

  const getDaysBehind = () => {
    if (!syncState?.last_sync_date) return null;
    const lastSync = new Date(syncState.last_sync_date);
    const today = new Date();
    const diffTime = today - lastSync;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const processSync = async () => {
    setIsSyncing(true);
    const results = {
      creditCardPayments: [],
      loanPayments: [],
      billPayments: [],
      recurringDeposits: [],
      recurringWithdrawals: []
    };

    try {
      const today = new Date();
      const lastSyncDate = syncState?.last_sync_date ? new Date(syncState.last_sync_date) : new Date(today.getFullYear(), today.getMonth(), 1);
      
      // Process credit card autopay and additional payments
      for (const card of cards) {
        if (card.payment_method === 'autopay' && card.autopay_date && card.bank_account_id) {
          const payments = getDatesBetween(lastSyncDate, today, card.autopay_date);
          for (const paymentDate of payments) {
            let amount = 0;
            if (card.autopay_amount_type === 'minimum') {
              amount = card.min_payment || 0;
            } else if (card.autopay_amount_type === 'full_balance') {
              amount = card.balance;
            } else if (card.autopay_amount_type === 'custom') {
              amount = card.autopay_custom_amount || 0;
            }

            if (amount > 0 && card.balance > 0) {
              const actualAmount = Math.min(amount, card.balance);
              await base44.entities.Payment.create({
                card_id: card.id,
                amount: actualAmount,
                date: paymentDate.toISOString().split('T')[0],
                note: 'Auto-synced autopay'
              });
              await base44.entities.CreditCard.update(card.id, {
                balance: Math.max(0, card.balance - actualAmount)
              });
              await base44.entities.Deposit.create({
                bank_account_id: card.bank_account_id,
                amount: -actualAmount,
                date: paymentDate.toISOString().split('T')[0],
                description: `Autopay to ${card.name}`,
                category: 'other'
              });
              results.creditCardPayments.push({
                card: card.name,
                amount: actualAmount,
                date: paymentDate.toISOString().split('T')[0],
                type: 'autopay'
              });
            }
          }
        }

        // Process additional payments
        if (card.additional_payment_enabled && card.additional_payment_date && card.bank_account_id) {
          const payments = getDatesBetween(lastSyncDate, today, card.additional_payment_date);
          for (const paymentDate of payments) {
            const amount = card.additional_payment_amount || 0;
            if (amount > 0 && card.balance > 0) {
              const actualAmount = Math.min(amount, card.balance);
              await base44.entities.Payment.create({
                card_id: card.id,
                amount: actualAmount,
                date: paymentDate.toISOString().split('T')[0],
                note: 'Auto-synced additional payment'
              });
              await base44.entities.CreditCard.update(card.id, {
                balance: Math.max(0, card.balance - actualAmount)
              });
              await base44.entities.Deposit.create({
                bank_account_id: card.bank_account_id,
                amount: -actualAmount,
                date: paymentDate.toISOString().split('T')[0],
                description: `Additional payment to ${card.name}`,
                category: 'other'
              });
              results.creditCardPayments.push({
                card: card.name,
                amount: actualAmount,
                date: paymentDate.toISOString().split('T')[0],
                type: 'additional'
              });
            }
          }
        }
      }

      // Process loan payments
      for (const loan of loans) {
        if (loan.payment_due_date && loan.bank_account_id && loan.projected_monthly_payment) {
          const payments = getDatesBetween(lastSyncDate, today, loan.payment_due_date);
          for (const paymentDate of payments) {
            const amount = loan.projected_monthly_payment;
            if (amount > 0 && loan.current_balance > 0) {
              const actualAmount = Math.min(amount, loan.current_balance);
              await base44.entities.LoanPayment.create({
                loan_id: loan.id,
                amount: actualAmount,
                date: paymentDate.toISOString().split('T')[0],
                note: 'Auto-synced payment'
              });
              await base44.entities.MortgageLoan.update(loan.id, {
                current_balance: Math.max(0, loan.current_balance - actualAmount)
              });
              await base44.entities.Deposit.create({
                bank_account_id: loan.bank_account_id,
                amount: -actualAmount,
                date: paymentDate.toISOString().split('T')[0],
                description: `Payment to ${loan.name}`,
                category: 'other'
              });
              results.loanPayments.push({
                loan: loan.name,
                amount: actualAmount,
                date: paymentDate.toISOString().split('T')[0]
              });
            }
          }
        }
      }

      // Process recurring bills
      for (const bill of bills) {
        if (bill.frequency === 'monthly' && bill.due_date && bill.bank_account_id) {
          const payments = getDatesBetween(lastSyncDate, today, bill.due_date);
          for (const paymentDate of payments) {
            await base44.entities.Deposit.create({
              bank_account_id: bill.bank_account_id,
              amount: -bill.amount,
              date: paymentDate.toISOString().split('T')[0],
              description: `${bill.name} payment`,
              category: 'other'
            });
            results.billPayments.push({
              bill: bill.name,
              amount: bill.amount,
              date: paymentDate.toISOString().split('T')[0]
            });
          }
        }
      }

      // Process recurring deposits
      const recurringDeposits = await base44.entities.RecurringDeposit.filter({ is_active: true });
      for (const deposit of recurringDeposits) {
        if (deposit.frequency === 'monthly' && deposit.deposit_date) {
          const payments = getDatesBetween(lastSyncDate, today, deposit.deposit_date);
          for (const paymentDate of payments) {
            await base44.entities.Deposit.create({
              bank_account_id: deposit.bank_account_id,
              amount: deposit.amount,
              date: paymentDate.toISOString().split('T')[0],
              description: deposit.name,
              category: deposit.category || 'other'
            });
            results.recurringDeposits.push({
              name: deposit.name,
              amount: deposit.amount,
              date: paymentDate.toISOString().split('T')[0]
            });
          }
        }
      }

      // Process recurring withdrawals
      const recurringWithdrawals = await base44.entities.RecurringWithdrawal.filter({ is_active: true });
      for (const withdrawal of recurringWithdrawals) {
        if (withdrawal.frequency === 'monthly' && withdrawal.withdrawal_date) {
          const payments = getDatesBetween(lastSyncDate, today, withdrawal.withdrawal_date);
          for (const paymentDate of payments) {
            await base44.entities.Deposit.create({
              bank_account_id: withdrawal.bank_account_id,
              amount: -withdrawal.amount,
              date: paymentDate.toISOString().split('T')[0],
              description: withdrawal.name,
              category: withdrawal.category || 'other'
            });
            results.recurringWithdrawals.push({
              name: withdrawal.name,
              amount: withdrawal.amount,
              date: paymentDate.toISOString().split('T')[0]
            });
          }
        }
      }

      // Update sync state
      const todayStr = today.toISOString().split('T')[0];
      if (syncState) {
        await updateSyncStateMutation.mutateAsync({
          id: syncState.id,
          data: { last_sync_date: todayStr }
        });
      } else {
        await createSyncStateMutation.mutateAsync({
          last_sync_date: todayStr,
          auto_sync_enabled: true
        });
      }

      // Invalidate all queries
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['all-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['loan-payments'] });
      queryClient.invalidateQueries({ queryKey: ['mortgage-loans'] });

      setSyncResults(results);
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const getDatesBetween = (startDate, endDate, dayOfMonth) => {
    const dates = [];
    const current = new Date(startDate);
    current.setDate(dayOfMonth);
    
    // If we're past the day in the start month, move to next month
    if (current <= startDate) {
      current.setMonth(current.getMonth() + 1);
    }

    while (current <= endDate) {
      dates.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }

    return dates;
  };

  const toggleAutoSync = async () => {
    if (syncState) {
      await updateSyncStateMutation.mutateAsync({
        id: syncState.id,
        data: { auto_sync_enabled: !syncState.auto_sync_enabled }
      });
    }
  };

  const daysBehind = getDaysBehind();
  const shouldShowReminder = syncState?.auto_sync_enabled !== false && daysBehind && daysBehind > 0;

  const getTotalTransactions = () => {
    if (!syncResults) return 0;
    return (
      syncResults.creditCardPayments.length +
      syncResults.loanPayments.length +
      syncResults.billPayments.length +
      syncResults.recurringDeposits.length +
      syncResults.recurringWithdrawals.length
    );
  };

  return (
    <>
      {/* Sync and Export Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button
          onClick={() => setShowSyncDialog(true)}
          variant={shouldShowReminder ? "default" : "outline"}
          size="sm"
          className={shouldShowReminder ? "bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse" : "bg-white/10 border-white/20 text-white hover:bg-white/20"}
        >
          <RefreshCw className={`w-4 h-4 sm:mr-2 ${shouldShowReminder ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{daysBehind > 0 ? `Sync (${daysBehind} ${daysBehind === 1 ? 'day' : 'days'} behind)` : 'Sync to Today'}</span>
        </Button>
        {onExportData && (
          <Button
            size="sm"
            variant="outline"
            onClick={onExportData}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <Download className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        )}
      </div>

      {/* Sync Dialog */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sync to Current Date</DialogTitle>
            <DialogDescription>
              Process all scheduled payments, bills, and deposits from {syncState?.last_sync_date || 'the beginning'} to today
            </DialogDescription>
          </DialogHeader>

          {!syncResults ? (
            <div className="space-y-4">
              {daysBehind !== null && daysBehind > 0 && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    You are <strong>{daysBehind} {daysBehind === 1 ? 'day' : 'days'}</strong> behind. 
                    Syncing will process all scheduled transactions that should have occurred.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-medium">Auto-Sync Reminders</span>
                  </div>
                  <Switch
                    checked={syncState?.auto_sync_enabled !== false}
                    onCheckedChange={toggleAutoSync}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  When enabled, the sync button will highlight when you're behind
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm text-slate-700">Will Process:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                    <CreditCard className="w-3 h-3 text-blue-600" />
                    <span>Credit Card Autopay</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded">
                    <Home className="w-3 h-3 text-indigo-600" />
                    <span>Loan Payments</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-purple-50 rounded">
                    <FileText className="w-3 h-3 text-purple-600" />
                    <span>Recurring Bills</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                    <Building2 className="w-3 h-3 text-green-600" />
                    <span>Recurring Deposits</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={processSync}
                disabled={isSyncing}
                className="w-full"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="font-medium text-emerald-900">Sync Complete!</p>
                  <p className="text-sm text-emerald-700">Processed {getTotalTransactions()} transactions</p>
                </div>
              </div>

              {syncResults.creditCardPayments.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-slate-700 mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Credit Card Payments ({syncResults.creditCardPayments.length})
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {syncResults.creditCardPayments.map((p, i) => (
                      <div key={i} className="text-xs p-2 bg-slate-50 rounded flex justify-between">
                        <span>{p.card} - {p.type}</span>
                        <span className="font-medium">{formatCurrency(p.amount, 'USD')} on {p.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {syncResults.loanPayments.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-slate-700 mb-2 flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Loan Payments ({syncResults.loanPayments.length})
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {syncResults.loanPayments.map((p, i) => (
                      <div key={i} className="text-xs p-2 bg-slate-50 rounded flex justify-between">
                        <span>{p.loan}</span>
                        <span className="font-medium">{formatCurrency(p.amount, 'USD')} on {p.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {syncResults.billPayments.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-slate-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Bill Payments ({syncResults.billPayments.length})
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {syncResults.billPayments.map((p, i) => (
                      <div key={i} className="text-xs p-2 bg-slate-50 rounded flex justify-between">
                        <span>{p.bill}</span>
                        <span className="font-medium">{formatCurrency(p.amount, 'USD')} on {p.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {syncResults.recurringDeposits.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-slate-700 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Recurring Deposits ({syncResults.recurringDeposits.length})
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {syncResults.recurringDeposits.map((p, i) => (
                      <div key={i} className="text-xs p-2 bg-slate-50 rounded flex justify-between">
                        <span>{p.name}</span>
                        <span className="font-medium">{formatCurrency(p.amount, 'USD')} on {p.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {syncResults.recurringWithdrawals.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-slate-700 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Recurring Withdrawals ({syncResults.recurringWithdrawals.length})
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {syncResults.recurringWithdrawals.map((p, i) => (
                      <div key={i} className="text-xs p-2 bg-slate-50 rounded flex justify-between">
                        <span>{p.name}</span>
                        <span className="font-medium">{formatCurrency(p.amount, 'USD')} on {p.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => {
                  setSyncResults(null);
                  setShowSyncDialog(false);
                }}
                className="w-full"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
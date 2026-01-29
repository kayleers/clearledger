import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, List, Lock, Download } from 'lucide-react';
import { formatCurrency } from '@/components/utils/calculations';
import { useAccessControl } from '@/components/access/useAccessControl';
import UpgradeDialog from '@/components/access/UpgradeDialog';

const BILL_CATEGORY_ICONS = {
  utilities: '⚡',
  subscription: '📺',
  insurance: '🛡️',
  rent: '🏠',
  loan: '🏦',
  other: '📄'
};

const DEPOSIT_CATEGORY_ICONS = {
  salary: '💰',
  freelance: '💼',
  business: '🏢',
  refund: '💸',
  transfer: '🔄',
  other: '📥'
};

export default function PaymentCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState('calendar'); // 'calendar' or 'list'
  const [listPeriod, setListPeriod] = useState('month'); // 'month' or 'year'
  const [expandedItems, setExpandedItems] = useState({});
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(null); // { item, year, month, day }
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const accessControl = useAccessControl();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: cards = [] } = useQuery({
    queryKey: ['credit-cards', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.CreditCard.filter({ created_by: user.email });
    },
    enabled: !!user
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['recurring-bills', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.RecurringBill.filter({ is_active: true, created_by: user.email });
    },
    enabled: !!user
  });

  const { data: loans = [] } = useQuery({
    queryKey: ['mortgage-loans', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.MortgageLoan.filter({ is_active: true, created_by: user.email });
    },
    enabled: !!user
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.BankAccount.filter({ is_active: true, created_by: user.email });
    },
    enabled: !!user
  });

  const { data: recurringDeposits = [] } = useQuery({
    queryKey: ['recurring-deposits', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.RecurringDeposit.filter({ is_active: true, created_by: user.email });
    },
    enabled: !!user
  });

  const { data: bankTransfers = [] } = useQuery({
    queryKey: ['bank-transfers', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.BankTransfer.filter({ is_active: true, created_by: user.email });
    },
    enabled: !!user
  });

  const { data: paidStatuses = [] } = useQuery({
    queryKey: ['scheduled-payment-statuses', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.ScheduledPaymentStatus.filter({ created_by: user.email });
    },
    enabled: !!user
  });

  const queryClient = useQueryClient();

  const markAsPaidMutation = useMutation({
    mutationFn: async ({ item, year, month, day, bankAccountId }) => {
      const today = new Date().toISOString().split('T')[0];
      
      // Create payment status record
      await base44.entities.ScheduledPaymentStatus.create({
        item_type: item.type,
        item_id: item.id,
        year,
        month,
        day,
        is_paid: true,
        paid_date: today,
        amount_paid: item.amount
      });

      // Process the payment based on type
      if (item.type === 'card_payment') {
        const card = cards.find(c => c.id === item.id);
        if (card) {
          await base44.entities.Payment.create({
            card_id: card.id,
            amount: item.amount,
            date: today,
            note: 'Manual payment from schedule'
          });
          await base44.entities.CreditCard.update(card.id, {
            balance: Math.max(0, card.balance - item.amount)
          });
          if (bankAccountId) {
            await base44.entities.Deposit.create({
              bank_account_id: bankAccountId,
              amount: -item.amount,
              date: today,
              description: `Payment to ${card.name}`,
              category: 'other'
            });
          }
        }
      } else if (item.type === 'bill') {
        if (bankAccountId) {
          await base44.entities.Deposit.create({
            bank_account_id: bankAccountId,
            amount: -item.amount,
            date: today,
            description: `${item.name} payment`,
            category: 'other'
          });
        }
      } else if (item.type === 'loan_payment') {
        const loan = loans.find(l => l.id === item.id);
        if (loan) {
          await base44.entities.LoanPayment.create({
            loan_id: loan.id,
            amount: item.amount,
            date: today,
            note: 'Manual payment from schedule'
          });
          await base44.entities.MortgageLoan.update(loan.id, {
            current_balance: Math.max(0, loan.current_balance - item.amount)
          });
          if (bankAccountId) {
            await base44.entities.Deposit.create({
              bank_account_id: bankAccountId,
              amount: -item.amount,
              date: today,
              description: `Payment to ${loan.name}`,
              category: 'other'
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-payment-statuses'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['mortgage-loans'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['all-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['loan-payments'] });
    }
  });

  const unmarkAsPaidMutation = useMutation({
    mutationFn: async ({ statusId }) => {
      await base44.entities.ScheduledPaymentStatus.delete(statusId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-payment-statuses'] });
    }
  });

  const isPaid = (itemType, itemId, year, month, day) => {
    return paidStatuses.find(
      s => s.item_type === itemType && 
           s.item_id === itemId && 
           s.year === year && 
           s.month === month && 
           s.day === day &&
           s.is_paid
    );
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const getBankAccountName = (accountId) => {
    const account = bankAccounts.find(a => a.id === accountId);
    return account ? account.name : 'N/A';
  };

  const getItemsForDay = (day) => {
    const items = [];

    // Credit card payments
    cards.forEach(card => {
      if (card.due_date === day) {
        let paymentAmount;
        if (card.pay_full_balance_monthly && card.balance > 0) {
          // Pay full balance when option is enabled and balance exists
          paymentAmount = card.balance;
        } else {
          // Otherwise use projected or minimum payment
          const projectedPayment = card.projected_monthly_payment || card.min_payment || 0;
          paymentAmount = Math.min(projectedPayment, card.balance);
        }
        items.push({
          type: 'card_payment',
          id: card.id,
          name: card.name,
          amount: paymentAmount,
          currency: card.currency,
          accountId: card.bank_account_id,
          accountName: getBankAccountName(card.bank_account_id),
          isFullBalance: card.pay_full_balance_monthly && card.balance > 0
        });
      }
    });

    // Bills
    bills.forEach(bill => {
      if (bill.frequency === 'monthly' && bill.due_date === day) {
        items.push({
          type: 'bill',
          id: bill.id,
          name: bill.name,
          amount: bill.amount,
          currency: bill.currency,
          category: bill.category,
          accountId: bill.bank_account_id,
          accountName: getBankAccountName(bill.bank_account_id)
        });
      }
    });

    // Loan payments
    loans.forEach(loan => {
      if (loan.payment_due_date === day) {
        const projectedPayment = loan.projected_monthly_payment || loan.monthly_payment;
        items.push({
          type: 'loan_payment',
          id: loan.id,
          name: loan.name,
          amount: projectedPayment,
          currency: loan.currency,
          accountId: loan.bank_account_id,
          accountName: getBankAccountName(loan.bank_account_id)
        });
      }
    });

    // Recurring deposits
    recurringDeposits.forEach(deposit => {
      if (deposit.frequency === 'monthly' && deposit.deposit_date === day) {
        items.push({
          type: 'deposit',
          id: deposit.id,
          name: deposit.name,
          amount: deposit.amount,
          category: deposit.category,
          accountId: deposit.bank_account_id,
          accountName: getBankAccountName(deposit.bank_account_id)
        });
      }
    });

    // Bank transfers
    bankTransfers.forEach(transfer => {
      if (transfer.frequency === 'monthly' && transfer.transfer_date === day) {
        items.push({
          type: 'transfer',
          id: transfer.id,
          name: transfer.name,
          amount: transfer.amount,
          currency: transfer.currency,
          fromAccountId: transfer.from_account_id,
          toAccountId: transfer.to_account_id,
          fromAccountName: getBankAccountName(transfer.from_account_id),
          toAccountName: getBankAccountName(transfer.to_account_id)
        });
      }
    });

    return items;
  };

  const getMonthsLimit = () => {
    const limit = accessControl.getCalendarMonthsLimit();
    return limit === Infinity ? Infinity : limit;
  };

  const monthsLimit = getMonthsLimit();
  const hasFullAccess = monthsLimit === Infinity;

  const getAllItems = () => {
    const items = [];
    const startMonth = currentMonth.getMonth();
    const startYear = currentMonth.getFullYear();
    const endMonth = hasFullAccess ? startMonth : Math.min(startMonth + monthsLimit - 1, 11);
    
    for (let m = startMonth; m <= endMonth; m++) {
      const monthDate = new Date(startYear, m, 1);
      const daysInMonth = getDaysInMonth(monthDate);
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dayItems = getItemsForDay(day);
        if (dayItems.length > 0) {
          items.push({ 
            day, 
            month: m,
            year: startYear,
            items: dayItems 
          });
        }
      }
    }

    return items.sort((a, b) => {
      if (a.month !== b.month) return a.month - b.month;
      return a.day - b.day;
    });
  };

  const getAllItemsForYear = () => {
    const items = [];
    const currentYear = currentMonth.getFullYear();
    const startMonth = currentMonth.getMonth();
    const maxMonths = hasFullAccess ? 12 : Math.min(startMonth + monthsLimit, 12);

    for (let month = startMonth; month < maxMonths; month++) {
      const monthDate = new Date(currentYear, month, 1);
      const daysInMonth = getDaysInMonth(monthDate);

      for (let day = 1; day <= daysInMonth; day++) {
        const dayItems = getItemsForDay(day);
        if (dayItems.length > 0) {
          items.push({
            day,
            month,
            year: currentYear,
            items: dayItems
          });
        }
      }
    }

    return items.sort((a, b) => {
      if (a.month !== b.month) return a.month - b.month;
      return a.day - b.day;
    });
  };

  const toggleExpanded = (key) => {
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderCalendarView = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2 bg-slate-50" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const items = getItemsForDay(day);
      
      // Group by currency
      const paymentsByCurrency = items.filter(i => i.type !== 'deposit').reduce((acc, i) => {
        const curr = i.currency || 'USD';
        acc[curr] = (acc[curr] || 0) + i.amount;
        return acc;
      }, {});
      
      const depositsByCurrency = items.filter(i => i.type === 'deposit').reduce((acc, i) => {
        const curr = i.currency || 'USD';
        acc[curr] = (acc[curr] || 0) + i.amount;
        return acc;
      }, {});

      const hasPaidItems = items.some(item => item.type !== 'deposit' && isPaid(item.type, item.id, currentMonth.getFullYear(), currentMonth.getMonth(), day));
      
      // Check if date is in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isPastDate = dayDate < today;
      
      days.push(
        <div key={day} className={`border border-slate-200 p-2 min-h-28 ${hasPaidItems ? 'bg-emerald-50' : isPastDate ? 'bg-slate-50' : 'bg-white'}`}>
          <div className={`font-bold text-base mb-1.5 ${isPastDate ? 'text-slate-400' : 'text-slate-900'}`}>{day}</div>
          {items.length > 0 && (
            <div className="space-y-1">
              {Object.entries(paymentsByCurrency).map(([currency, amount]) => (
                <div key={`payment-${currency}`} className={`text-[10px] font-semibold ${isPastDate ? 'text-slate-400' : 'text-red-600'}`}>
                  -{formatCurrency(amount, currency)}
                </div>
              ))}
              {Object.entries(depositsByCurrency).map(([currency, amount]) => (
                <div key={`deposit-${currency}`} className={`text-[10px] font-semibold ${isPastDate ? 'text-slate-400' : 'text-green-600'}`}>
                  +{formatCurrency(amount, currency)}
                </div>
              ))}
              <div className="space-y-0.5 mt-1.5">
                <TooltipProvider>
                  {items.slice(0, 2).map((item, idx) => {
                    const paid = item.type !== 'deposit' && isPaid(item.type, item.id, currentMonth.getFullYear(), currentMonth.getMonth(), day);
                    return (
                      <Tooltip key={idx}>
                        <TooltipTrigger asChild>
                          <div className={`text-[11px] truncate cursor-help px-1.5 py-0.5 rounded ${paid ? 'bg-emerald-100 text-emerald-700 line-through' : isPastDate ? 'bg-slate-200 text-slate-500' : 'bg-slate-100 text-slate-700'}`}>
                            {paid && '✓ '}{item.name}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold text-sm">{item.name}</p>
                          <p className={`text-sm font-medium ${item.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                            {item.type === 'deposit' ? '+' : '-'}{formatCurrency(item.amount, item.currency)}
                          </p>
                          {item.accountName && (
                            <p className="text-xs text-slate-500 mt-1">{item.accountName}</p>
                          )}
                          {paid && <p className="text-xs text-emerald-600 mt-1 font-medium">✓ Paid</p>}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
                {items.length > 2 && (
                  <div className="text-[10px] text-slate-500 font-medium mt-1">+{items.length - 2} more</div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-0 border border-slate-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 bg-slate-100 text-center text-sm font-semibold border-b border-slate-200">
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  const renderListView = () => {
    const allItems = listPeriod === 'year' ? getAllItemsForYear() : getAllItems();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];

    if (allItems.length === 0) {
      return (
        <div className="text-center py-8 text-slate-500">
          No payments or deposits scheduled this {listPeriod}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {allItems.map(({ day, month, year, items }, index) => {
          const dayKey = `${year}-${month}-${day}`;
          const isDayExpanded = expandedItems[dayKey];
          
          // Check if date is in the past
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dayDate = new Date(year, month, day);
          const isPastDate = dayDate < today;
          
          // Calculate totals for the day
          const paymentsByCurrency = items.filter(i => i.type !== 'deposit').reduce((acc, i) => {
            const curr = i.currency || 'USD';
            acc[curr] = (acc[curr] || 0) + i.amount;
            return acc;
          }, {});
          
          const depositsByCurrency = items.filter(i => i.type === 'deposit').reduce((acc, i) => {
            const curr = i.currency || 'USD';
            acc[curr] = (acc[curr] || 0) + i.amount;
            return acc;
          }, {});

          return (
            <Collapsible key={dayKey} open={isDayExpanded} onOpenChange={() => toggleExpanded(dayKey)}>
              <div className={`border border-slate-200 rounded-lg overflow-hidden ${isPastDate ? 'bg-slate-50' : 'bg-white'}`}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <div className={`font-semibold text-base ${isPastDate ? 'text-slate-500' : 'text-slate-900'}`}>
                          {monthNames[month]} {day}{listPeriod === 'year' && `, ${year}`}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {items.length} {items.length === 1 ? 'item' : 'items'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right space-y-0.5">
                        {Object.entries(paymentsByCurrency).map(([currency, amount]) => (
                          <div key={`pay-${currency}`} className={`text-sm font-semibold ${isPastDate ? 'text-slate-400' : 'text-red-600'}`}>
                            -{formatCurrency(amount, currency)}
                          </div>
                        ))}
                        {Object.entries(depositsByCurrency).map(([currency, amount]) => (
                          <div key={`dep-${currency}`} className={`text-sm font-semibold ${isPastDate ? 'text-slate-400' : 'text-green-600'}`}>
                            +{formatCurrency(amount, currency)}
                          </div>
                        ))}
                      </div>
                      {isDayExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t border-slate-200 bg-slate-50 divide-y divide-slate-200">
                    {items.map((item, idx) => {
                      const itemKey = `${dayKey}-${item.type}-${item.id}`;
                      const isItemExpanded = expandedItems[itemKey];
                      const paidStatus = item.type !== 'deposit' ? isPaid(item.type, item.id, year, month, day) : null;
                      const paid = !!paidStatus;

                      return (
                        <Collapsible key={idx} open={isItemExpanded} onOpenChange={() => toggleExpanded(itemKey)}>
                          <div className={`${paid ? 'bg-emerald-50/50' : 'bg-white'}`}>
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-center justify-between p-3 hover:bg-slate-100/50 transition-colors">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  {item.type !== 'deposit' && (
                                    <Checkbox
                                      checked={paid}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setPaymentDialog({ item, year, month, day });
                                          setSelectedAccountId(item.accountId || '');
                                        } else if (paidStatus) {
                                          unmarkAsPaidMutation.mutate({ statusId: paidStatus.id });
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  )}
                                  <span className="text-xl flex-shrink-0">
                                   {item.type === 'deposit' ? DEPOSIT_CATEGORY_ICONS[item.category] : 
                                    item.type === 'bill' ? BILL_CATEGORY_ICONS[item.category] : 
                                    item.type === 'transfer' ? '🔄' : '💳'}
                                  </span>
                                  <div className="text-left min-w-0 flex-1">
                                    <p className={`font-medium text-sm truncate ${paid ? 'line-through text-emerald-700' : 'text-slate-900'}`}>
                                      {paid && '✓ '}{item.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        {item.type === 'deposit' ? 'Deposit' :
                                         item.type === 'bill' ? 'Bill' :
                                         item.type === 'transfer' ? 'Transfer' :
                                         item.type === 'card_payment' ? 'Card' : 'Loan'}
                                      </Badge>
                                      {item.accountName && (
                                        <span className="text-xs text-slate-500 truncate">
                                          {item.accountName}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                  <span className={`font-semibold text-sm ${item.type === 'deposit' ? 'text-green-600' : paid ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {item.type === 'deposit' ? '+' : '-'}{formatCurrency(item.amount, item.currency)}
                                  </span>
                                  {isItemExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="px-3 pb-3 pl-14 text-xs space-y-1.5 text-slate-600">
                                {item.type === 'transfer' ? (
                                  <>
                                    <div><span className="font-medium">From:</span> {item.fromAccountName}</div>
                                    <div><span className="font-medium">To:</span> {item.toAccountName}</div>
                                  </>
                                ) : (
                                  <div><span className="font-medium">Account:</span> {item.accountName || 'Not specified'}</div>
                                )}
                                {item.type === 'card_payment' && (
                                  <div className="text-slate-500">
                                    {item.isFullBalance ? 'Full balance payment' : 'Projected payment'}
                                  </div>
                                )}
                                {item.type === 'loan_payment' && <div className="text-slate-500">Projected payment</div>}
                                {paid && paidStatus && (
                                  <div className="text-emerald-600 font-medium">✓ Paid on {paidStatus.paid_date}</div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    );
  };

  const navigateMonth = (direction) => {
    if (!hasFullAccess) return; // Free users can't navigate
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const canNavigate = hasFullAccess;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Payment Schedule
          </CardTitle>
          <Tabs value={view} onValueChange={setView}>
            <TabsList>
              <TabsTrigger value="calendar">
                <Calendar className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex justify-end mt-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              try {
                const response = await base44.functions.invoke('exportPaymentCalendar', {
                  month: currentMonth.getMonth(),
                  year: currentMonth.getFullYear()
                });
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Payment_Schedule_${currentMonth.toLocaleString('default', { month: 'long' })}_${currentMonth.getFullYear()}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
              } catch (error) {
                console.error('Export failed:', error);
              }
            }}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            <Download className="w-3 h-3 mr-1" />
            Export PDF
          </Button>
        </div>
        <div className="flex items-center justify-between mt-4">
          <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)} disabled={!canNavigate}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-semibold">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            {!hasFullAccess && <span className="text-xs text-slate-500 ml-2">(Limited to {monthsLimit} months)</span>}
          </h3>
          <Button variant="outline" size="sm" onClick={() => navigateMonth(1)} disabled={!canNavigate}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        {view === 'list' && (
          <div className="flex gap-2 mt-4">
            <Button 
              variant={listPeriod === 'month' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setListPeriod('month')}
              className="flex-1"
            >
              {hasFullAccess ? 'Month' : `${monthsLimit} Months`}
            </Button>
            {hasFullAccess && (
              <Button 
                variant={listPeriod === 'year' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setListPeriod('year')}
                className="flex-1"
              >
                Year
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!hasFullAccess && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-slate-700 mb-2">
              🔒 Free tier limited to {monthsLimit} months. Upgrade for unlimited access!
            </p>
            <Button size="sm" onClick={() => setShowUpgradeDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              Upgrade Now
            </Button>
          </div>
        )}
        {view === 'calendar' ? renderCalendarView() : renderListView()}
      </CardContent>

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        context="paymentSchedule"
      />

      <Dialog open={!!paymentDialog} onOpenChange={(open) => !open && setPaymentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Mark <strong>{paymentDialog?.item.name}</strong> as paid for{' '}
              <strong>{formatCurrency(paymentDialog?.item.amount, paymentDialog?.item.currency)}</strong>?
            </p>
            <div className="space-y-2">
              <Label htmlFor="paymentAccount">Pay from Bank Account</Label>
              <select
                id="paymentAccount"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-200"
              >
                <option value="">No bank account</option>
                {bankAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} - {formatCurrency(account.balance, account.currency)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Select a different account for one-time payment, or leave as default
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setPaymentDialog(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  markAsPaidMutation.mutate({
                    item: paymentDialog.item,
                    year: paymentDialog.year,
                    month: paymentDialog.month,
                    day: paymentDialog.day,
                    bankAccountId: selectedAccountId || null
                  });
                  setPaymentDialog(null);
                }}
                disabled={markAsPaidMutation.isPending}
              >
                {markAsPaidMutation.isPending ? 'Processing...' : 'Mark as Paid'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
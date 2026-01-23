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
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, List, Lock } from 'lucide-react';
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
  const accessControl = useAccessControl();

  const { data: cards = [] } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: () => base44.entities.CreditCard.list()
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['recurring-bills'],
    queryFn: () => base44.entities.RecurringBill.filter({ is_active: true })
  });

  const { data: loans = [] } = useQuery({
    queryKey: ['mortgage-loans'],
    queryFn: () => base44.entities.MortgageLoan.filter({ is_active: true })
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => base44.entities.BankAccount.filter({ is_active: true })
  });

  const { data: recurringDeposits = [] } = useQuery({
    queryKey: ['recurring-deposits'],
    queryFn: () => base44.entities.RecurringDeposit.filter({ is_active: true })
  });

  const { data: paidStatuses = [] } = useQuery({
    queryKey: ['scheduled-payment-statuses'],
    queryFn: () => base44.entities.ScheduledPaymentStatus.list()
  });

  const queryClient = useQueryClient();

  const markAsPaidMutation = useMutation({
    mutationFn: async ({ item, year, month, day }) => {
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
          if (card.bank_account_id) {
            await base44.entities.Deposit.create({
              bank_account_id: card.bank_account_id,
              amount: -item.amount,
              date: today,
              description: `Payment to ${card.name}`,
              category: 'other'
            });
          }
        }
      } else if (item.type === 'bill') {
        if (item.accountId) {
          await base44.entities.Deposit.create({
            bank_account_id: item.accountId,
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
          if (loan.bank_account_id) {
            await base44.entities.Deposit.create({
              bank_account_id: loan.bank_account_id,
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
        const projectedPayment = card.projected_monthly_payment || card.min_payment || 0;
        const paymentAmount = Math.min(projectedPayment, card.balance);
        items.push({
          type: 'card_payment',
          id: card.id,
          name: card.name,
          amount: paymentAmount,
          currency: card.currency,
          accountId: card.bank_account_id,
          accountName: getBankAccountName(card.bank_account_id)
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
      
      days.push(
        <div key={day} className={`border border-slate-200 p-2 min-h-24 ${hasPaidItems ? 'bg-emerald-50' : 'bg-white'}`}>
          <div className="font-semibold text-sm mb-1">{day}</div>
          {items.length > 0 && (
            <div className="space-y-1">
              {Object.entries(paymentsByCurrency).map(([currency, amount]) => (
                <div key={`payment-${currency}`} className="text-[9px] text-red-600 font-medium">
                  -{formatCurrency(amount, currency)}
                </div>
              ))}
              {Object.entries(depositsByCurrency).map(([currency, amount]) => (
                <div key={`deposit-${currency}`} className="text-[9px] text-green-600 font-medium">
                  +{formatCurrency(amount, currency)}
                </div>
              ))}
              <div className="space-y-0.5">
                <TooltipProvider>
                  {items.slice(0, 3).map((item, idx) => {
                    const paid = item.type !== 'deposit' && isPaid(item.type, item.id, currentMonth.getFullYear(), currentMonth.getMonth(), day);
                    return (
                      <Tooltip key={idx}>
                        <TooltipTrigger asChild>
                          <div className={`text-[10px] truncate cursor-help ${paid ? 'text-emerald-700 line-through' : 'text-slate-600'}`}>
                            {paid && '✓ '}{item.name}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{item.name}</p>
                          <p className={item.type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
                            {item.type === 'deposit' ? '+' : '-'}{formatCurrency(item.amount, item.currency)}
                          </p>
                          {paid && <p className="text-xs text-emerald-600 mt-1">✓ Paid</p>}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
                {items.length > 3 && (
                  <div className="text-[10px] text-slate-400">+{items.length - 3} more</div>
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
      <div className="space-y-3">
        {allItems.map(({ day, month, year, items }, index) => (
          <Card key={`${year}-${month}-${day}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {monthNames[month]} {day}{listPeriod === 'year' && `, ${year}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map((item, idx) => {
                const key = `${year}-${month}-${day}-${item.type}-${item.id}`;
                const isExpanded = expandedItems[key];
                const paidStatus = item.type !== 'deposit' ? isPaid(item.type, item.id, year, month, day) : null;
                const paid = !!paidStatus;

                return (
                  <Collapsible key={idx} open={isExpanded} onOpenChange={() => toggleExpanded(key)}>
                    <CollapsibleTrigger className="w-full">
                      <div className={`flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 cursor-pointer ${paid ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                        <div className="flex items-center gap-2 flex-1">
                          {item.type !== 'deposit' && (
                            <Checkbox
                              checked={paid}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  markAsPaidMutation.mutate({ item, year, month, day });
                                } else if (paidStatus) {
                                  unmarkAsPaidMutation.mutate({ statusId: paidStatus.id });
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          <span className="text-lg">
                            {item.type === 'deposit' ? DEPOSIT_CATEGORY_ICONS[item.category] : 
                             item.type === 'bill' ? BILL_CATEGORY_ICONS[item.category] : '💳'}
                          </span>
                          <div className="text-left">
                            <p className={`font-medium text-sm ${paid ? 'line-through text-emerald-700' : ''}`}>
                              {paid && '✓ '}{item.name}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {item.type === 'deposit' ? 'Deposit' :
                               item.type === 'bill' ? 'Bill' :
                               item.type === 'card_payment' ? 'Card Payment' : 'Loan Payment'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${item.type === 'deposit' ? 'text-green-600' : paid ? 'text-emerald-600' : 'text-red-600'}`}>
                            {item.type === 'deposit' ? '+' : '-'}{formatCurrency(item.amount, item.currency)}
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pl-12 pr-3 py-2 text-sm text-slate-600">
                        <p><strong>Account:</strong> {item.accountName || 'Not specified'}</p>
                        {item.type === 'card_payment' && <p className="text-xs text-slate-500 mt-1">Projected payment</p>}
                        {item.type === 'loan_payment' && <p className="text-xs text-slate-500 mt-1">Projected payment</p>}
                        {paid && paidStatus && (
                          <p className="text-xs text-emerald-600 mt-1">✓ Paid on {paidStatus.paid_date}</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </CardContent>
          </Card>
        ))}
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
    </Card>
  );
}
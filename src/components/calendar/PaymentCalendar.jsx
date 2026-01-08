import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
        const minPayment = Math.min(card.min_payment || 0, card.balance);
        items.push({
          type: 'card_payment',
          id: card.id,
          name: card.name,
          amount: minPayment,
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
        items.push({
          type: 'loan_payment',
          id: loan.id,
          name: loan.name,
          amount: loan.monthly_payment,
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

  const getAllItems = () => {
    const items = [];
    const daysInMonth = getDaysInMonth(currentMonth);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayItems = getItemsForDay(day);
      if (dayItems.length > 0) {
        items.push({ 
          day, 
          month: currentMonth.getMonth(),
          year: currentMonth.getFullYear(),
          items: dayItems 
        });
      }
    }

    return items.sort((a, b) => a.day - b.day);
  };

  const getAllItemsForYear = () => {
    const items = [];
    const currentYear = currentMonth.getFullYear();

    for (let month = 0; month < 12; month++) {
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
      const totalPayments = items.filter(i => i.type !== 'deposit').reduce((sum, i) => sum + i.amount, 0);
      const totalDeposits = items.filter(i => i.type === 'deposit').reduce((sum, i) => sum + i.amount, 0);

      days.push(
        <div key={day} className="border border-slate-200 p-2 min-h-24 bg-white">
          <div className="font-semibold text-sm mb-1">{day}</div>
          {items.length > 0 && (
            <div className="space-y-1">
              {totalPayments > 0 && (
                <div className="text-xs text-red-600 font-medium">
                  -{formatCurrency(totalPayments)}
                </div>
              )}
              {totalDeposits > 0 && (
                <div className="text-xs text-green-600 font-medium">
                  +{formatCurrency(totalDeposits)}
                </div>
              )}
              <div className="space-y-0.5">
                {items.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="text-xs truncate">
                    {item.type === 'deposit' ? '💰' : item.type === 'bill' ? BILL_CATEGORY_ICONS[item.category] : '💳'} {item.name}
                  </div>
                ))}
                {items.length > 2 && (
                  <div className="text-xs text-slate-500">+{items.length - 2} more</div>
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

                return (
                  <Collapsible key={idx} open={isExpanded} onOpenChange={() => toggleExpanded(key)}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-lg">
                            {item.type === 'deposit' ? DEPOSIT_CATEGORY_ICONS[item.category] : 
                             item.type === 'bill' ? BILL_CATEGORY_ICONS[item.category] : '💳'}
                          </span>
                          <div className="text-left">
                            <p className="font-medium text-sm">{item.name}</p>
                            <Badge variant="outline" className="text-xs">
                              {item.type === 'deposit' ? 'Deposit' :
                               item.type === 'bill' ? 'Bill' :
                               item.type === 'card_payment' ? 'Card Payment' : 'Loan Payment'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${item.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                            {item.type === 'deposit' ? '+' : '-'}{formatCurrency(item.amount, item.currency)}
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pl-12 pr-3 py-2 text-sm text-slate-600">
                        <p><strong>Account:</strong> {item.accountName || 'Not specified'}</p>
                        {item.type === 'card_payment' && <p className="text-xs text-slate-500 mt-1">Minimum payment due</p>}
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
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const hasAccess = accessControl.hasFeature('payment_schedule');

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
          <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)} disabled={!hasAccess}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-semibold">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <Button variant="outline" size="sm" onClick={() => navigateMonth(1)} disabled={!hasAccess}>
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
              Month
            </Button>
            <Button 
              variant={listPeriod === 'year' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setListPeriod('year')}
              className="flex-1"
            >
              Year
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!hasAccess ? (
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 text-center border-2 border-dashed border-blue-200">
            <Lock className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <h4 className="text-lg font-semibold text-slate-800 mb-2">Unlock Payment Schedule</h4>
            <p className="text-sm text-slate-600 mb-4">
              Upgrade to see your complete payment timeline and stay on top of all your bills and payments.
            </p>
            <Button onClick={() => setShowUpgradeDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              Upgrade Now
            </Button>
          </div>
        ) : (
          view === 'calendar' ? renderCalendarView() : renderListView()
        )}
      </CardContent>

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        context="paymentSchedule"
      />
    </Card>
  );
}
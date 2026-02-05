import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Receipt, Plus, Edit2, Trash2, Calendar, GripVertical, ChevronDown, ChevronUp, TrendingUp, Download } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { formatCurrency } from '@/components/utils/calculations';
import { format } from 'date-fns';
import CurrencySelector from '@/components/currency/CurrencySelector';
import { useAccessControl } from '@/components/access/useAccessControl';
import UpgradeDialog from '@/components/access/UpgradeDialog';

const categoryIcons = {
  utilities: '⚡',
  subscription: '📺',
  insurance: '🛡️',
  rent: '🏠',
  loan: '💳',
  other: '📄'
};

const frequencyLabels = {
  one_time: 'One-Time',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly'
};

export default function RecurringBillList({ bills = [], bankAccounts = [], creditCards = [], dragHandleProps }) {
  const [showAddBill, setShowAddBill] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState('default'); // 'default', 'by-account', 'by-date', 'by-currency'
  const queryClient = useQueryClient();
  const accessControl = useAccessControl();

  const createBillMutation = useMutation({
    mutationFn: async (data) => {
      // Check limit one more time before creating
      if (!accessControl.canAddRecurringBill(bills.length)) {
        throw new Error('Recurring bill limit reached');
      }
      return await base44.entities.RecurringBill.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
      setShowAddBill(false);
    },
    onError: (error) => {
      if (error.message === 'Recurring bill limit reached') {
        setShowUpgradeDialog(true);
        setShowAddBill(false);
      }
    }
  });

  const updateBillMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RecurringBill.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
      setEditingBill(null);
    }
  });

  const deleteBillMutation = useMutation({
    mutationFn: (id) => base44.entities.RecurringBill.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
    }
  });

  const updateBillOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RecurringBill.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
    }
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(bills);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    items.forEach((bill, index) => {
      updateBillOrderMutation.mutate({
        id: bill.id,
        data: { display_order: index }
      });
    });
  };

  const canAddBill = accessControl.canAddRecurringBill(bills.length);

  const handleAddBillClick = () => {
    if (canAddBill) {
      setShowAddBill(true);
    } else {
      setShowUpgradeDialog(true);
    }
  };

  const getSortedBills = () => {
    let sorted = [...bills];
    
    if (viewMode === 'by-account') {
      sorted.sort((a, b) => {
        const accountA = bankAccounts.find(acc => acc.id === a.bank_account_id);
        const accountB = bankAccounts.find(acc => acc.id === b.bank_account_id);
        const nameA = accountA?.name || 'Unassigned';
        const nameB = accountB?.name || 'Unassigned';
        return nameA.localeCompare(nameB);
      });
    } else if (viewMode === 'by-date') {
      sorted.sort((a, b) => {
        const dateA = a.due_date || 999;
        const dateB = b.due_date || 999;
        return dateA - dateB;
      });
    } else if (viewMode === 'by-currency') {
      sorted.sort((a, b) => {
        const currA = a.currency || 'USD';
        const currB = b.currency || 'USD';
        return currA.localeCompare(currB);
      });
    }
    
    return sorted;
  };

  const groupedBills = () => {
    const sorted = getSortedBills();
    
    if (viewMode === 'by-account') {
      const grouped = {};
      sorted.forEach(bill => {
        const account = bankAccounts.find(acc => acc.id === bill.bank_account_id);
        const key = account ? account.name : 'Unassigned';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(bill);
      });
      return grouped;
    } else if (viewMode === 'by-currency') {
      const grouped = {};
      sorted.forEach(bill => {
        const key = bill.currency || 'USD';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(bill);
      });
      return grouped;
    }
    
    return { 'All Bills': sorted };
  };

  const getTotalsByViewMode = () => {
    const totals = {};
    bills.forEach(bill => {
      const curr = bill.currency || 'USD';
      totals[curr] = (totals[curr] || 0) + bill.amount;
    });
    return totals;
  };

  const totalsByCurrency = getTotalsByViewMode();

  return (
    <div className="space-y-4">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {dragHandleProps && (
                <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-5 h-5 text-slate-400" />
                </div>
              )}
              <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                <div>
                  <h2 className="text-xl font-bold text-emerald-400">Recurring Bills</h2>
                  {totalsByCurrency && Object.keys(totalsByCurrency).length > 0 && (
                    <div className="flex gap-2 mt-1">
                      {Object.entries(totalsByCurrency).map(([curr, total]) => (
                        <span key={curr} className="text-xs text-slate-400">
                          {formatCurrency(total, curr)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-500" />
                )}
              </CollapsibleTrigger>
              </div>
              <Button
              size="sm"
              onClick={handleAddBillClick}
              className="bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white"
              >
              <Plus className="w-4 h-4 mr-1" />
              Add Bill
              </Button>
              </div>
          
          {isExpanded && bills.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={viewMode === 'default' ? 'default' : 'outline'}
                onClick={() => setViewMode('default')}
              >
                Default
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'by-account' ? 'default' : 'outline'}
                onClick={() => setViewMode('by-account')}
              >
                By Account
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'by-date' ? 'default' : 'outline'}
                onClick={() => setViewMode('by-date')}
              >
                By Due Date
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'by-currency' ? 'default' : 'outline'}
                onClick={() => setViewMode('by-currency')}
              >
                By Currency
              </Button>
            </div>
          )}
        </div>

        <CollapsibleContent>
          {bills.length > 0 && (
            <div className="mb-4 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    const response = await base44.functions.invoke('exportRecurringBills', {});
                    const blob = new Blob([response.data], { type: 'application/pdf' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Recurring_Bills_${new Date().toISOString().split('T')[0]}.pdf`;
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
          )}
          {viewMode === 'default' ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="recurring-bills">
                {(provided) => (
                  <div className="grid gap-3" {...provided.droppableProps} ref={provided.innerRef}>
                    {bills.map((bill, index) => {
                    const account = bankAccounts.find(a => a.id === bill.bank_account_id);
                    const card = creditCards.find(c => c.id === bill.credit_card_id);
                    const paymentSource = account || card;
                    return (
                  <Draggable key={bill.id} draggableId={bill.id} index={index}>
                    {(provided) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="border-l-4 border-l-purple-500"
                      >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing flex-shrink-0 mt-1">
                      <GripVertical className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-base flex-shrink-0 mt-0.5">
                      {categoryIcons[bill.category] || '📄'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm break-words">{bill.name}</p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap mt-0.5">
                        {bill.amount_type === 'variable' ? (
                          <span className="flex items-center gap-0.5 break-all flex-shrink-0">
                            <TrendingUp className="w-3 h-3 flex-shrink-0" />
                            {formatCurrency(bill.min_amount || 0, bill.currency || 'USD')} - {formatCurrency(bill.max_amount || 0, bill.currency || 'USD')}
                          </span>
                        ) : (
                          <span className="break-all">{formatCurrency(bill.amount, bill.currency || 'USD')}</span>
                        )}
                        <span className="flex-shrink-0">•</span>
                        <span className="flex-shrink-0">{frequencyLabels[bill.frequency]}</span>
                        {bill.frequency === 'weekly' && bill.day_of_week !== undefined && (
                          <>
                            <span className="flex-shrink-0">•</span>
                            <span className="flex-shrink-0">{getDayOfWeekLabel(bill.day_of_week)}</span>
                          </>
                        )}
                        {(bill.frequency === 'monthly' || bill.frequency === 'quarterly') && bill.due_date && (
                          <>
                            <span className="flex-shrink-0">•</span>
                            <span className="flex-shrink-0">Due: {bill.due_date}{getOrdinalSuffix(bill.due_date)}</span>
                          </>
                        )}
                        {bill.frequency === 'yearly' && bill.due_month && bill.due_date && (
                          <>
                            <span className="flex-shrink-0">•</span>
                            <span className="flex-shrink-0">{getMonthLabel(bill.due_month)} {bill.due_date}{getOrdinalSuffix(bill.due_date)}</span>
                          </>
                        )}
                      </div>
                      {paymentSource && (
                        <p className="text-xs text-slate-400 mt-1 break-words">
                          From: {paymentSource.name} {card ? '(Card)' : ''}
                        </p>
                      )}
                      {bill.end_date && (
                        <p className="text-xs text-orange-600 mt-1">
                          Ends: {format(new Date(bill.end_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 p-0 flex items-center justify-center"
                      onClick={() => setEditingBill(bill)}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 p-0 flex items-center justify-center text-red-500"
                      onClick={() => {
                        if (confirm('Delete this recurring bill?')) {
                          deleteBillMutation.mutate(bill.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
                      </Card>
                    )}
                  </Draggable>
                );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedBills()).map(([groupName, groupBills]) => {
                const total = groupBills.reduce((sum, b) => sum + b.amount, 0);
                const currency = viewMode === 'by-currency' ? groupName : (groupBills[0]?.currency || 'USD');
                
                return (
                  <div key={groupName}>
                    <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide">
                      {groupName}
                      {(viewMode === 'by-currency' || viewMode === 'by-account') && (
                        <span className="ml-2 text-slate-500">
                          ({formatCurrency(total, currency)})
                        </span>
                      )}
                    </h3>
                    <div className="grid gap-3">
                     {groupBills.map((bill) => {
                      const account = bankAccounts.find(a => a.id === bill.bank_account_id);
                      const card = creditCards.find(c => c.id === bill.credit_card_id);
                      const paymentSource = account || card;
                      return (
                        <Card key={bill.id} className="border-l-4 border-l-purple-500">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-lg">
                                  {categoryIcons[bill.category] || '📄'}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800">{bill.name}</p>
                                  <div className="flex items-center gap-2 text-sm text-slate-500">
                                    {bill.amount_type === 'variable' ? (
                                      <span className="flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" />
                                        {formatCurrency(bill.min_amount || 0, bill.currency || 'USD')} - {formatCurrency(bill.max_amount || 0, bill.currency || 'USD')}
                                      </span>
                                    ) : (
                                      <span>{formatCurrency(bill.amount, bill.currency || 'USD')}</span>
                                    )}
                                    <span>•</span>
                                    <span>{frequencyLabels[bill.frequency]}</span>
                                    {(bill.frequency === 'monthly' || bill.frequency === 'quarterly') && bill.due_date && (
                                      <>
                                        <span>•</span>
                                        <span>Due: {bill.due_date}{getOrdinalSuffix(bill.due_date)}</span>
                                      </>
                                    )}
                                  </div>
                                  {paymentSource && (
                                    <p className="text-xs text-slate-400 mt-1">
                                      From: {paymentSource.name} {card ? '(Card)' : ''}
                                    </p>
                                  )}
                                  {bill.end_date && (
                                    <p className="text-xs text-orange-600 mt-1">
                                      Ends: {format(new Date(bill.end_date), 'MMM d, yyyy')}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setEditingBill(bill)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500"
                                  onClick={() => {
                                    if (confirm('Delete this recurring bill?')) {
                                      deleteBillMutation.mutate(bill.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

      {bills.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">No recurring bills yet</p>
            <Button onClick={handleAddBillClick}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Bill
            </Button>
          </CardContent>
        </Card>
      )}
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={showAddBill} onOpenChange={setShowAddBill}>
        <DialogContent className="max-h-[90vh] flex flex-col p-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full">
          <DialogHeader className="p-6 pb-4 flex-shrink-0">
            <DialogTitle>Add Recurring Bill</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 pb-6 flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            <RecurringBillForm
            bankAccounts={bankAccounts}
            creditCards={creditCards}
            onSubmit={(data) => createBillMutation.mutate(data)}
            isLoading={createBillMutation.isPending}
          />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingBill} onOpenChange={() => setEditingBill(null)}>
        <DialogContent className="max-h-[90vh] flex flex-col p-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full">
          <DialogHeader className="p-6 pb-4 flex-shrink-0">
            <DialogTitle>Edit Recurring Bill</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 pb-6 flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            <RecurringBillForm
            bill={editingBill}
            bankAccounts={bankAccounts}
            creditCards={creditCards}
            onSubmit={(data) => updateBillMutation.mutate({ id: editingBill.id, data })}
            isLoading={updateBillMutation.isPending}
          />
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        context="recurringBills"
      />
    </div>
  );
}

function RecurringBillForm({ bill, bankAccounts, creditCards = [], onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    name: bill?.name || '',
    amount_type: bill?.amount_type || 'fixed',
    amount: bill?.amount?.toString() || '',
    min_amount: bill?.min_amount?.toString() || '',
    max_amount: bill?.max_amount?.toString() || '',
    currency: bill?.currency || 'USD',
    frequency: bill?.frequency || 'monthly',
    due_date: bill?.due_date?.toString() || '',
    day_of_week: bill?.day_of_week?.toString() || '1',
    due_month: bill?.due_month?.toString() || '1',
    bank_account_id: bill?.bank_account_id || '',
    credit_card_id: bill?.credit_card_id || '',
    payment_source_type: bill?.credit_card_id ? 'card' : (bill?.bank_account_id ? 'account' : ''),
    category: bill?.category || 'other',
    start_date: bill?.start_date || '',
    end_date: bill?.end_date || ''
  });

  const [isRecurring, setIsRecurring] = useState(bill?.frequency !== 'one_time');
  const [rangeValues, setRangeValues] = useState([
    parseFloat(bill?.min_amount || '0'),
    parseFloat(bill?.max_amount || '100')
  ]);

  const getCurrencySymbol = (currencyCode) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(0).replace(/\d/g, '').trim();
    } catch {
      return '$';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      name: formData.name,
      amount_type: formData.amount_type,
      currency: formData.currency,
      frequency: isRecurring ? formData.frequency : 'one_time',
      category: formData.category
    };

    // Set payment source based on type
    if (formData.payment_source_type === 'card') {
      submitData.credit_card_id = formData.credit_card_id;
      submitData.bank_account_id = null;
    } else if (formData.payment_source_type === 'account') {
      submitData.bank_account_id = formData.bank_account_id;
      submitData.credit_card_id = null;
    }

    // Add amount fields based on type
    if (formData.amount_type === 'variable') {
      submitData.min_amount = parseFloat(formData.min_amount) || 0;
      submitData.max_amount = parseFloat(formData.max_amount) || 0;
      submitData.amount = (submitData.min_amount + submitData.max_amount) / 2; // Average for calculations
    } else {
      submitData.amount = parseFloat(formData.amount) || 0;
    }

    // Add date fields based on frequency
    if (isRecurring) {
      if (formData.frequency === 'weekly') {
        submitData.day_of_week = parseInt(formData.day_of_week);
      } else if (formData.frequency === 'monthly' || formData.frequency === 'quarterly') {
        submitData.due_date = formData.due_date ? parseInt(formData.due_date) : null;
      } else if (formData.frequency === 'yearly') {
        submitData.due_date = formData.due_date ? parseInt(formData.due_date) : null;
        submitData.due_month = formData.due_month ? parseInt(formData.due_month) : null;
      }
      
      // Add start and end dates
      if (formData.start_date) {
        submitData.start_date = formData.start_date;
      }
      if (formData.end_date) {
        submitData.end_date = formData.end_date;
      }
    }

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="billName">Bill Name</Label>
        <Input
          id="billName"
          placeholder="e.g., Netflix, Electric Bill"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="amountType">Amount Type</Label>
        <MobileSelect
          value={formData.amount_type}
          onValueChange={(value) => setFormData({ ...formData, amount_type: value })}
          options={[
            { value: 'fixed', label: 'Fixed Amount' },
            { value: 'variable', label: 'Variable Amount (Range)' }
          ]}
          placeholder="Select amount type"
          label="Amount Type"
        />
      </div>

      {formData.amount_type === 'fixed' ? (
        <div className="space-y-2">
          <Label htmlFor="billAmount">Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{getCurrencySymbol(formData.currency)}</span>
            <Input
              id="billAmount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="pl-7"
              required
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Label>Estimated Amount Range</Label>
          <div className="px-2 pt-2">
            <Slider
              min={0}
              max={1000}
              step={5}
              value={rangeValues}
              onValueChange={(values) => {
                setRangeValues(values);
                setFormData({
                  ...formData,
                  min_amount: values[0].toString(),
                  max_amount: values[1].toString()
                });
              }}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="minAmount">Min Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{getCurrencySymbol(formData.currency)}</span>
                <Input
                  id="minAmount"
                  type="number"
                  step="0.01"
                  value={formData.min_amount}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setFormData({ ...formData, min_amount: e.target.value });
                    setRangeValues([val, rangeValues[1]]);
                  }}
                  className="pl-7"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxAmount">Max Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{getCurrencySymbol(formData.currency)}</span>
                <Input
                  id="maxAmount"
                  type="number"
                  step="0.01"
                  value={formData.max_amount}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setFormData({ ...formData, max_amount: e.target.value });
                    setRangeValues([rangeValues[0], val]);
                  }}
                  className="pl-7"
                  required
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Estimated average: {getCurrencySymbol(formData.currency)}
            {((parseFloat(formData.min_amount) || 0) + (parseFloat(formData.max_amount) || 0)) / 2}
          </p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="billCurrency">Currency</Label>
        <CurrencySelector
          value={formData.currency}
          onChange={(currency) => setFormData({ ...formData, currency })}
          className="w-full"
        />
      </div>
      <div className="flex items-center space-x-2 py-2">
        <input
          type="checkbox"
          id="isRecurring"
          checked={isRecurring}
          onChange={(e) => setIsRecurring(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300"
        />
        <Label htmlFor="isRecurring" className="cursor-pointer">
          Is this a recurring bill?
        </Label>
      </div>
      {isRecurring && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="billFrequency">Frequency</Label>
            <MobileSelect
              value={formData.frequency}
              onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              options={[
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'yearly', label: 'Yearly' }
              ]}
              placeholder="Select frequency"
              label="Frequency"
            />
          </div>

          {formData.frequency === 'weekly' && (
            <div className="space-y-2">
              <Label htmlFor="dayOfWeek">Day of Week</Label>
              <MobileSelect
                value={formData.day_of_week}
                onValueChange={(value) => setFormData({ ...formData, day_of_week: value })}
                options={[
                  { value: '0', label: 'Sunday' },
                  { value: '1', label: 'Monday' },
                  { value: '2', label: 'Tuesday' },
                  { value: '3', label: 'Wednesday' },
                  { value: '4', label: 'Thursday' },
                  { value: '5', label: 'Friday' },
                  { value: '6', label: 'Saturday' }
                ]}
                placeholder="Select day"
                label="Day of Week"
              />
            </div>
          )}

          {(formData.frequency === 'monthly' || formData.frequency === 'quarterly') && (
            <div className="space-y-2">
              <Label htmlFor="billDueDate">
                {formData.frequency === 'monthly' ? 'Due Date (Day of Month)' : 'Due Date (Day of Month, repeats quarterly)'}
              </Label>
              <Input
                id="billDueDate"
                type="number"
                min="1"
                max="31"
                placeholder="e.g., 15"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          )}

          {formData.frequency === 'yearly' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dueMonth">Month</Label>
                <MobileSelect
                  value={formData.due_month}
                  onValueChange={(value) => setFormData({ ...formData, due_month: value })}
                  options={[
                    { value: '1', label: 'January' },
                    { value: '2', label: 'February' },
                    { value: '3', label: 'March' },
                    { value: '4', label: 'April' },
                    { value: '5', label: 'May' },
                    { value: '6', label: 'June' },
                    { value: '7', label: 'July' },
                    { value: '8', label: 'August' },
                    { value: '9', label: 'September' },
                    { value: '10', label: 'October' },
                    { value: '11', label: 'November' },
                    { value: '12', label: 'December' }
                  ]}
                  placeholder="Select month"
                  label="Month"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billDueDate">Day</Label>
                <Input
                  id="billDueDate"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="e.g., 15"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date (Optional)</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date (Optional)</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
            <p className="text-xs text-slate-500">Leave empty for indefinite recurring</p>
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="paymentSource">Payment Source (Optional)</Label>
        <MobileSelect
          value={formData.payment_source_type === 'card' ? `card_${formData.credit_card_id}` : formData.bank_account_id}
          onValueChange={(value) => {
            if (!value) {
              setFormData({ ...formData, payment_source_type: '', bank_account_id: '', credit_card_id: '' });
            } else if (value.startsWith('card_')) {
              const cardId = value.substring(5);
              setFormData({ ...formData, payment_source_type: 'card', credit_card_id: cardId, bank_account_id: '' });
            } else {
              setFormData({ ...formData, payment_source_type: 'account', bank_account_id: value, credit_card_id: '' });
            }
          }}
          options={[
            { value: '', label: 'Select payment source' },
            ...bankAccounts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map(account => ({
              value: account.id,
              label: `${account.name} ${account.account_number ? `(${account.account_number})` : ''} - ${account.currency}`
            })),
            ...creditCards.filter(c => c.is_active !== false).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map(card => ({
              value: `card_${card.id}`,
              label: `${card.name} ${card.card_last_four ? `(••••${card.card_last_four})` : ''} - ${card.currency}`
            }))
          ]}
          placeholder="Select payment source"
          label="Payment Source"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="billCategory">Category</Label>
        <MobileSelect
          value={formData.category}
          onValueChange={(value) => setFormData({ ...formData, category: value })}
          options={[
            { value: 'utilities', label: 'Utilities' },
            { value: 'subscription', label: 'Subscription' },
            { value: 'insurance', label: 'Insurance' },
            { value: 'rent', label: 'Rent' },
            { value: 'loan', label: 'Loan' },
            { value: 'other', label: 'Other' }
          ]}
          placeholder="Select category"
          label="Category"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Saving...' : bill ? 'Update Bill' : 'Add Bill'}
      </Button>
    </form>
  );
}

function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function getDayOfWeekLabel(day) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day] || '';
}

function getMonthLabel(month) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[month - 1] || '';
}
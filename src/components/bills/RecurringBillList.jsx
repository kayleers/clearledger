import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Receipt, Plus, Edit2, Trash2, Calendar, GripVertical, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
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

export default function RecurringBillList({ bills = [], bankAccounts = [], dragHandleProps }) {
  const [showAddBill, setShowAddBill] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState('default'); // 'default', 'by-account', 'by-date', 'by-currency'
  const queryClient = useQueryClient();
  const accessControl = useAccessControl();

  const createBillMutation = useMutation({
    mutationFn: (data) => base44.entities.RecurringBill.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
      setShowAddBill(false);
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
          {viewMode === 'default' ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="recurring-bills">
                {(provided) => (
                  <div className="grid gap-3" {...provided.droppableProps} ref={provided.innerRef}>
                    {bills.map((bill, index) => {
                const account = bankAccounts.find(a => a.id === bill.bank_account_id);
                return (
                  <Draggable key={bill.id} draggableId={bill.id} index={index}>
                    {(provided) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="border-l-4 border-l-purple-500"
                      >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-5 h-5 text-slate-400" />
                    </div>
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
                        {bill.frequency === 'weekly' && bill.day_of_week !== undefined && (
                          <>
                            <span>•</span>
                            <span>{getDayOfWeekLabel(bill.day_of_week)}</span>
                          </>
                        )}
                        {(bill.frequency === 'monthly' || bill.frequency === 'quarterly') && bill.due_date && (
                          <>
                            <span>•</span>
                            <span>Due: {bill.due_date}{getOrdinalSuffix(bill.due_date)}</span>
                          </>
                        )}
                        {bill.frequency === 'yearly' && bill.due_month && bill.due_date && (
                          <>
                            <span>•</span>
                            <span>{getMonthLabel(bill.due_month)} {bill.due_date}{getOrdinalSuffix(bill.due_date)}</span>
                          </>
                        )}
                      </div>
                      {account && (
                        <p className="text-xs text-slate-400 mt-1">
                          From: {account.name}
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
                                  {account && (
                                    <p className="text-xs text-slate-400 mt-1">
                                      From: {account.name}
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
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Recurring Bill</DialogTitle>
          </DialogHeader>
          <RecurringBillForm
            bankAccounts={bankAccounts}
            onSubmit={(data) => createBillMutation.mutate(data)}
            isLoading={createBillMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingBill} onOpenChange={() => setEditingBill(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Recurring Bill</DialogTitle>
          </DialogHeader>
          <RecurringBillForm
            bill={editingBill}
            bankAccounts={bankAccounts}
            onSubmit={(data) => updateBillMutation.mutate({ id: editingBill.id, data })}
            isLoading={updateBillMutation.isPending}
          />
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

function RecurringBillForm({ bill, bankAccounts, onSubmit, isLoading }) {
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
      bank_account_id: formData.bank_account_id,
      category: formData.category
    };

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
        <select
          id="amountType"
          value={formData.amount_type}
          onChange={(e) => setFormData({ ...formData, amount_type: e.target.value })}
          className="w-full h-10 px-3 rounded-md border border-slate-200"
        >
          <option value="fixed">Fixed Amount</option>
          <option value="variable">Variable Amount (Range)</option>
        </select>
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
            <select
              id="billFrequency"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-slate-200"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {formData.frequency === 'weekly' && (
            <div className="space-y-2">
              <Label htmlFor="dayOfWeek">Day of Week</Label>
              <select
                id="dayOfWeek"
                value={formData.day_of_week}
                onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-slate-200"
              >
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
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
                <select
                  id="dueMonth"
                  value={formData.due_month}
                  onChange={(e) => setFormData({ ...formData, due_month: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-slate-200"
                >
                  <option value="1">January</option>
                  <option value="2">February</option>
                  <option value="3">March</option>
                  <option value="4">April</option>
                  <option value="5">May</option>
                  <option value="6">June</option>
                  <option value="7">July</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
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
        <Label htmlFor="billAccount">Bank Account (Optional)</Label>
        <select
          id="billAccount"
          value={formData.bank_account_id}
          onChange={(e) => setFormData({ ...formData, bank_account_id: e.target.value })}
          className="w-full h-10 px-3 rounded-md border border-slate-200"
        >
          <option value="">Select account</option>
          {bankAccounts.map(account => (
            <option key={account.id} value={account.id}>
              {account.name} {account.account_number ? `(${account.account_number})` : ''} - {account.currency}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="billCategory">Category</Label>
        <select
          id="billCategory"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="w-full h-10 px-3 rounded-md border border-slate-200"
        >
          <option value="utilities">Utilities</option>
          <option value="subscription">Subscription</option>
          <option value="insurance">Insurance</option>
          <option value="rent">Rent</option>
          <option value="loan">Loan</option>
          <option value="other">Other</option>
        </select>
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
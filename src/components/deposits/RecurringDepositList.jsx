import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, Plus, Edit2, Trash2, GripVertical, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { formatCurrency } from '@/components/utils/calculations';
import { format } from 'date-fns';
import CurrencySelector from '@/components/currency/CurrencySelector';
import { Slider } from '@/components/ui/slider';
import { useAccessControl } from '@/components/access/useAccessControl';
import UpgradeDialog from '@/components/access/UpgradeDialog';

const frequencyLabels = {
  weekly: 'Weekly',
  bi_weekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly'
};

export default function RecurringDepositList({ deposits = [], bankAccounts = [], dragHandleProps }) {
  const [showAddDeposit, setShowAddDeposit] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState('default');
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState('recurring_deposits');
  const queryClient = useQueryClient();
  const { canAddRecurringDeposit, isPro } = useAccessControl();

  const createDepositMutation = useMutation({
    mutationFn: (data) => base44.entities.RecurringDeposit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-deposits'] });
      setShowAddDeposit(false);
    }
  });

  const updateDepositMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RecurringDeposit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-deposits'] });
      setEditingDeposit(null);
    }
  });

  const deleteDepositMutation = useMutation({
    mutationFn: (id) => base44.entities.RecurringDeposit.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-deposits'] });
    }
  });

  const updateDepositOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RecurringDeposit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-deposits'] });
    }
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(deposits);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    items.forEach((deposit, index) => {
      updateDepositOrderMutation.mutate({
        id: deposit.id,
        data: { display_order: index }
      });
    });
  };

  const getSortedDeposits = () => {
    let sorted = [...deposits];
    
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
        const dateA = a.deposit_date || 999;
        const dateB = b.deposit_date || 999;
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

  const groupedDeposits = () => {
    const sorted = getSortedDeposits();
    
    if (viewMode === 'by-account') {
      const grouped = {};
      sorted.forEach(deposit => {
        const account = bankAccounts.find(acc => acc.id === deposit.bank_account_id);
        const key = account ? account.name : 'Unassigned';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(deposit);
      });
      return grouped;
    } else if (viewMode === 'by-currency') {
      const grouped = {};
      sorted.forEach(deposit => {
        const key = deposit.currency || 'USD';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(deposit);
      });
      return grouped;
    }
    
    return { 'All Deposits': sorted };
  };

  const getTotalsByCurrency = () => {
    const totals = {};
    deposits.forEach(deposit => {
      const curr = deposit.currency || 'USD';
      totals[curr] = (totals[curr] || 0) + deposit.amount;
    });
    return totals;
  };

  const totalsByCurrency = getTotalsByCurrency();

  const getOrdinalSuffix = (day) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

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
                  <h2 className="text-xl font-bold text-emerald-400">Deposits</h2>
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
              onClick={() => {
                if (!canAddRecurringDeposit(deposits.length)) {
                  setUpgradeContext('recurring_deposits');
                  setShowUpgradeDialog(true);
                } else {
                  setShowAddDeposit(true);
                }
              }}
              className="bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Deposit
            </Button>
          </div>

          {isExpanded && deposits.length > 0 && (
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
                By Deposit Date
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
          {deposits.length > 0 && (
            <div className="mb-4 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    const response = await base44.functions.invoke('exportRecurringDeposits', {});
                    const blob = new Blob([response.data], { type: 'application/pdf' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Recurring_Deposits_${new Date().toISOString().split('T')[0]}.pdf`;
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
              <Droppable droppableId="recurring-deposits">
                {(provided) => (
                  <div className="grid gap-3" {...provided.droppableProps} ref={provided.innerRef}>
                    {deposits.map((deposit, index) => {
                      const account = bankAccounts.find(a => a.id === deposit.bank_account_id);
                      return (
                        <Draggable key={deposit.id} draggableId={deposit.id} index={index}>
                          {(provided) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="border-l-4 border-l-green-500"
                            >
                              <CardContent className="p-4">
                                  <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2 min-w-0 flex-1">
                                    <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing flex-shrink-0 mt-1">
                                      <GripVertical className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-base flex-shrink-0 mt-0.5">
                                      💰
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-slate-800 text-sm break-words">{deposit.name}</p>
                                      <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap mt-0.5">
                                        {deposit.amount_type === 'variable' ? (
                                          <>
                                            <TrendingUp className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                            <span className="break-all">{formatCurrency(deposit.min_amount, deposit.currency || 'USD')} - {formatCurrency(deposit.max_amount, deposit.currency || 'USD')}</span>
                                          </>
                                        ) : (
                                          <span className="break-all">{formatCurrency(deposit.amount, deposit.currency || 'USD')}</span>
                                        )}
                                        <span className="flex-shrink-0">•</span>
                                        <span className="flex-shrink-0">{frequencyLabels[deposit.frequency]}</span>
                                        {(deposit.frequency === 'monthly' || deposit.frequency === 'quarterly') && deposit.deposit_date && (
                                          <>
                                            <span className="flex-shrink-0">•</span>
                                            <span className="flex-shrink-0">Day {deposit.deposit_date}{getOrdinalSuffix(deposit.deposit_date)}</span>
                                          </>
                                        )}
                                      </div>
                                      <p className="text-xs text-slate-400 mt-1 break-words">
                                        To: {account?.name || 'Unknown'}
                                      </p>
                                      {deposit.end_date && (
                                        <p className="text-xs text-orange-600 mt-1">
                                          Ends: {format(new Date(deposit.end_date), 'MMM d, yyyy')}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => setEditingDeposit(deposit)}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-red-500"
                                      onClick={() => {
                                        if (confirm('Delete this recurring deposit?')) {
                                          deleteDepositMutation.mutate(deposit.id);
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
              {Object.entries(groupedDeposits()).map(([groupName, groupDeposits]) => {
                const total = groupDeposits.reduce((sum, d) => sum + d.amount, 0);
                const currency = viewMode === 'by-currency' ? groupName : (groupDeposits[0]?.currency || 'USD');
                
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
                      {groupDeposits.map((deposit) => {
                        const account = bankAccounts.find(a => a.id === deposit.bank_account_id);
                        return (
                          <Card key={deposit.id} className="border-l-4 border-l-green-500">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-lg">
                                    💰
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-800">{deposit.name}</p>
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                      {deposit.amount_type === 'variable' ? (
                                        <>
                                          <TrendingUp className="w-4 h-4 text-slate-400" />
                                          <span>{formatCurrency(deposit.min_amount, deposit.currency || 'USD')} - {formatCurrency(deposit.max_amount, deposit.currency || 'USD')}</span>
                                        </>
                                      ) : (
                                        <span>{formatCurrency(deposit.amount, deposit.currency || 'USD')}</span>
                                      )}
                                      <span>•</span>
                                      <span>{frequencyLabels[deposit.frequency]}</span>
                                      {(deposit.frequency === 'monthly' || deposit.frequency === 'quarterly') && deposit.deposit_date && (
                                        <>
                                          <span>•</span>
                                          <span>Day {deposit.deposit_date}{getOrdinalSuffix(deposit.deposit_date)}</span>
                                        </>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                      To: {account?.name || 'Unknown'}
                                    </p>
                                    {deposit.end_date && (
                                      <p className="text-xs text-orange-600 mt-1">
                                        Ends: {format(new Date(deposit.end_date), 'MMM d, yyyy')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setEditingDeposit(deposit)}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500"
                                    onClick={() => {
                                      if (confirm('Delete this recurring deposit?')) {
                                        deleteDepositMutation.mutate(deposit.id);
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

          {deposits.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-4">No recurring deposits yet</p>
                <Button onClick={() => setShowAddDeposit(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Deposit
                </Button>
              </CardContent>
            </Card>
          )}
        </CollapsibleContent>
      </Collapsible>

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        context={upgradeContext}
      />

      <Dialog open={showAddDeposit} onOpenChange={setShowAddDeposit}>
        <DialogContent className="max-h-[90vh] flex flex-col p-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full">
          <DialogHeader className="p-6 pb-4 flex-shrink-0">
            <DialogTitle>Add Recurring Deposit</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 pb-6 flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            <RecurringDepositForm
              bankAccounts={bankAccounts}
              onSubmit={(data) => createDepositMutation.mutate(data)}
              isLoading={createDepositMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingDeposit} onOpenChange={() => setEditingDeposit(null)}>
        <DialogContent className="max-h-[90vh] flex flex-col p-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full">
          <DialogHeader className="p-6 pb-4 flex-shrink-0">
            <DialogTitle>Edit Recurring Deposit</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 pb-6 flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            <RecurringDepositForm
              deposit={editingDeposit}
              bankAccounts={bankAccounts}
              onSubmit={(data) => updateDepositMutation.mutate({ id: editingDeposit.id, data })}
              isLoading={updateDepositMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecurringDepositForm({ deposit, bankAccounts, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    name: deposit?.name || '',
    amount_type: deposit?.amount_type || 'fixed',
    amount: deposit?.amount?.toString() || '',
    min_amount: deposit?.min_amount?.toString() || '',
    max_amount: deposit?.max_amount?.toString() || '',
    currency: deposit?.currency || 'USD',
    bank_account_id: deposit?.bank_account_id || '',
    frequency: deposit?.frequency || 'monthly',
    deposit_date: deposit?.deposit_date?.toString() || '',
    day_of_week: deposit?.day_of_week?.toString() || '1',
    start_date: deposit?.start_date || '',
    end_date: deposit?.end_date || '',
    category: deposit?.category || 'salary'
  });

  const [sliderAmount, setSliderAmount] = useState(parseFloat(deposit?.amount) || 100);

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
      bank_account_id: formData.bank_account_id,
      frequency: formData.frequency,
      category: formData.category
    };

    if (formData.amount_type === 'fixed') {
      submitData.amount = parseFloat(formData.amount) || 0;
    } else {
      submitData.min_amount = parseFloat(formData.min_amount) || 0;
      submitData.max_amount = parseFloat(formData.max_amount) || 0;
      submitData.amount = sliderAmount;
    }

    if (formData.frequency === 'weekly' || formData.frequency === 'bi_weekly') {
      submitData.day_of_week = parseInt(formData.day_of_week);
    } else if (formData.frequency === 'monthly' || formData.frequency === 'quarterly' || formData.frequency === 'yearly') {
      submitData.deposit_date = formData.deposit_date ? parseInt(formData.deposit_date) : null;
    }
    
    if (formData.start_date) {
      submitData.start_date = formData.start_date;
    }
    if (formData.end_date) {
      submitData.end_date = formData.end_date;
    }

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="depositName">Deposit Name</Label>
        <Input
          id="depositName"
          placeholder="e.g., Monthly Salary"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Amount Type</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={formData.amount_type === 'fixed' ? 'default' : 'outline'}
            onClick={() => setFormData({ ...formData, amount_type: 'fixed' })}
          >
            Fixed
          </Button>
          <Button
            type="button"
            variant={formData.amount_type === 'variable' ? 'default' : 'outline'}
            onClick={() => setFormData({ ...formData, amount_type: 'variable' })}
          >
            Variable
          </Button>
        </div>
      </div>

      {formData.amount_type === 'fixed' ? (
        <div className="space-y-2">
          <Label htmlFor="depositAmount">Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{getCurrencySymbol(formData.currency)}</span>
            <Input
              id="depositAmount"
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
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="minAmount">Minimum Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{getCurrencySymbol(formData.currency)}</span>
                <Input
                  id="minAmount"
                  type="number"
                  step="0.01"
                  value={formData.min_amount}
                  onChange={(e) => {
                    setFormData({ ...formData, min_amount: e.target.value });
                    const min = parseFloat(e.target.value) || 0;
                    const max = parseFloat(formData.max_amount) || 0;
                    if (sliderAmount < min) setSliderAmount(min);
                    if (sliderAmount > max && max > 0) setSliderAmount(max);
                  }}
                  className="pl-7"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxAmount">Maximum Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{getCurrencySymbol(formData.currency)}</span>
                <Input
                  id="maxAmount"
                  type="number"
                  step="0.01"
                  value={formData.max_amount}
                  onChange={(e) => {
                    setFormData({ ...formData, max_amount: e.target.value });
                    const max = parseFloat(e.target.value) || 0;
                    const min = parseFloat(formData.min_amount) || 0;
                    if (sliderAmount > max && max > 0) setSliderAmount(max);
                    if (sliderAmount < min) setSliderAmount(min);
                  }}
                  className="pl-7"
                  required
                />
              </div>
            </div>
          </div>
          {formData.min_amount && formData.max_amount && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Estimated Amount</Label>
                <span className="text-sm font-medium text-slate-700">
                  {formatCurrency(sliderAmount, formData.currency)}
                </span>
              </div>
              <Slider
                value={[sliderAmount]}
                onValueChange={(value) => setSliderAmount(value[0])}
                min={parseFloat(formData.min_amount) || 0}
                max={parseFloat(formData.max_amount) || 100}
                step={1}
                className="w-full"
              />
            </div>
          )}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="depositCurrency">Currency</Label>
        <CurrencySelector
          value={formData.currency}
          onChange={(currency) => setFormData({ ...formData, currency })}
          className="w-full"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bankAccount">Bank Account</Label>
        <select
          id="bankAccount"
          value={formData.bank_account_id}
          onChange={(e) => setFormData({ ...formData, bank_account_id: e.target.value })}
          className="w-full h-10 px-3 rounded-md border border-slate-200"
          required
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
        <Label htmlFor="depositFrequency">Frequency</Label>
        <select
          id="depositFrequency"
          value={formData.frequency}
          onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
          className="w-full h-10 px-3 rounded-md border border-slate-200"
        >
          <option value="weekly">Weekly</option>
          <option value="bi_weekly">Bi-Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      {(formData.frequency === 'weekly' || formData.frequency === 'bi_weekly') && (
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

      {(formData.frequency === 'monthly' || formData.frequency === 'quarterly' || formData.frequency === 'yearly') && (
        <div className="space-y-2">
          <Label htmlFor="depositDate">Deposit Date (Day of Month)</Label>
          <Input
            id="depositDate"
            type="number"
            min="1"
            max="31"
            placeholder="e.g., 15"
            value={formData.deposit_date}
            onChange={(e) => setFormData({ ...formData, deposit_date: e.target.value })}
          />
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
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Saving...' : deposit ? 'Update Deposit' : 'Add Deposit'}
      </Button>
    </form>
  );
}
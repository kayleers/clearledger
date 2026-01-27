import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRightLeft, Plus, Edit2, Trash2, GripVertical, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { formatCurrency } from '@/components/utils/calculations';
import { format } from 'date-fns';
import CurrencySelector from '@/components/currency/CurrencySelector';
import { Slider } from '@/components/ui/slider';

const frequencyLabels = {
  one_time: 'One-Time',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly'
};

export default function BankTransferList({ transfers = [], bankAccounts = [], dragHandleProps }) {
  const [showAddTransfer, setShowAddTransfer] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState('default');
  const queryClient = useQueryClient();

  const createTransferMutation = useMutation({
    mutationFn: (data) => base44.entities.BankTransfer.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transfers'] });
      setShowAddTransfer(false);
    }
  });

  const updateTransferMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankTransfer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transfers'] });
      setEditingTransfer(null);
    }
  });

  const deleteTransferMutation = useMutation({
    mutationFn: (id) => base44.entities.BankTransfer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transfers'] });
    }
  });

  const updateTransferOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankTransfer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transfers'] });
    }
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(transfers);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    items.forEach((transfer, index) => {
      updateTransferOrderMutation.mutate({
        id: transfer.id,
        data: { display_order: index }
      });
    });
  };

  const getSortedTransfers = () => {
    let sorted = [...transfers].filter(t => t.frequency !== 'one_time');
    
    if (viewMode === 'by-account') {
      sorted.sort((a, b) => {
        const accountA = bankAccounts.find(acc => acc.id === a.from_account_id);
        const accountB = bankAccounts.find(acc => acc.id === b.from_account_id);
        const nameA = accountA?.name || 'Unassigned';
        const nameB = accountB?.name || 'Unassigned';
        return nameA.localeCompare(nameB);
      });
    } else if (viewMode === 'by-date') {
      sorted.sort((a, b) => {
        const dateA = a.transfer_date || 999;
        const dateB = b.transfer_date || 999;
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

  const groupedTransfers = () => {
    const sorted = getSortedTransfers();
    
    if (viewMode === 'by-account') {
      const grouped = {};
      sorted.forEach(transfer => {
        const account = bankAccounts.find(acc => acc.id === transfer.from_account_id);
        const key = account ? account.name : 'Unassigned';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(transfer);
      });
      return grouped;
    } else if (viewMode === 'by-currency') {
      const grouped = {};
      sorted.forEach(transfer => {
        const key = transfer.currency || 'USD';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(transfer);
      });
      return grouped;
    }
    
    return { 'All Transfers': sorted };
  };

  const getTotalsByCurrency = () => {
    const totals = {};
    transfers.filter(t => t.frequency !== 'one_time').forEach(transfer => {
      const curr = transfer.currency || 'USD';
      totals[curr] = (totals[curr] || 0) + transfer.amount;
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
                  <h2 className="text-xl font-bold text-emerald-400">Recurring Bank Transfers</h2>
                  {totalsByCurrency && Object.keys(totalsByCurrency).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {Object.entries(totalsByCurrency).map(([curr, total]) => (
                        <span key={curr} className="text-xs text-slate-400 font-medium">
                          {curr}: {formatCurrency(total, curr)}
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
              onClick={() => setShowAddTransfer(true)}
              className="bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Transfer
            </Button>
          </div>
          
          {isExpanded && transfers.length > 0 && (
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
                By Transfer Date
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
              <Droppable droppableId="bank-transfers">
                {(provided) => (
                  <div className="grid gap-3" {...provided.droppableProps} ref={provided.innerRef}>
                    {transfers.map((transfer, index) => {
                      const fromAccount = bankAccounts.find(a => a.id === transfer.from_account_id);
                      const toAccount = bankAccounts.find(a => a.id === transfer.to_account_id);
                      return (
                        <Draggable key={transfer.id} draggableId={transfer.id} index={index}>
                          {(provided) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="border-l-4 border-l-orange-500"
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                      <GripVertical className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-lg">
                                      <ArrowRightLeft className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-slate-800">{transfer.name}</p>
                                      <div className="flex items-center gap-2 text-sm text-slate-500">
                                        {transfer.amount_type === 'variable' ? (
                                          <>
                                            <TrendingUp className="w-4 h-4 text-slate-400" />
                                            <span>{formatCurrency(transfer.min_amount, transfer.currency || 'USD')} - {formatCurrency(transfer.max_amount, transfer.currency || 'USD')}</span>
                                          </>
                                        ) : (
                                          <span>{formatCurrency(transfer.amount, transfer.currency || 'USD')}</span>
                                        )}
                                        <span>•</span>
                                        <span>{frequencyLabels[transfer.frequency]}</span>
                                        {(transfer.frequency === 'monthly' || transfer.frequency === 'quarterly') && transfer.transfer_date && (
                                          <>
                                            <span>•</span>
                                            <span>Day {transfer.transfer_date}{getOrdinalSuffix(transfer.transfer_date)}</span>
                                          </>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                        <span>{fromAccount?.name || 'Unknown'}</span>
                                        <ArrowRightLeft className="w-3 h-3" />
                                        <span>{toAccount?.name || 'Unknown'}</span>
                                      </div>
                                      {transfer.end_date && (
                                        <p className="text-xs text-orange-600 mt-1">
                                          Ends: {format(new Date(transfer.end_date), 'MMM d, yyyy')}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => setEditingTransfer(transfer)}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-500"
                                      onClick={() => {
                                        if (confirm('Delete this transfer?')) {
                                          deleteTransferMutation.mutate(transfer.id);
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
              {Object.entries(groupedTransfers()).map(([groupName, groupTransfers]) => {
                const total = groupTransfers.reduce((sum, t) => sum + t.amount, 0);
                const currency = viewMode === 'by-currency' ? groupName : (groupTransfers[0]?.currency || 'USD');
                
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
                      {groupTransfers.map((transfer) => {
                        const fromAccount = bankAccounts.find(a => a.id === transfer.from_account_id);
                        const toAccount = bankAccounts.find(a => a.id === transfer.to_account_id);
                        return (
                          <Card key={transfer.id} className="border-l-4 border-l-orange-500">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-lg">
                                    <ArrowRightLeft className="w-5 h-5 text-orange-600" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-800">{transfer.name}</p>
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                      {transfer.amount_type === 'variable' ? (
                                        <>
                                          <TrendingUp className="w-4 h-4 text-slate-400" />
                                          <span>{formatCurrency(transfer.min_amount, transfer.currency || 'USD')} - {formatCurrency(transfer.max_amount, transfer.currency || 'USD')}</span>
                                        </>
                                      ) : (
                                        <span>{formatCurrency(transfer.amount, transfer.currency || 'USD')}</span>
                                      )}
                                      <span>•</span>
                                      <span>{frequencyLabels[transfer.frequency]}</span>
                                      {(transfer.frequency === 'monthly' || transfer.frequency === 'quarterly') && transfer.transfer_date && (
                                        <>
                                          <span>•</span>
                                          <span>Day {transfer.transfer_date}{getOrdinalSuffix(transfer.transfer_date)}</span>
                                        </>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                      <span>{fromAccount?.name || 'Unknown'}</span>
                                      <ArrowRightLeft className="w-3 h-3" />
                                      <span>{toAccount?.name || 'Unknown'}</span>
                                    </div>
                                    {transfer.end_date && (
                                      <p className="text-xs text-orange-600 mt-1">
                                        Ends: {format(new Date(transfer.end_date), 'MMM d, yyyy')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setEditingTransfer(transfer)}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500"
                                    onClick={() => {
                                      if (confirm('Delete this transfer?')) {
                                        deleteTransferMutation.mutate(transfer.id);
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

          {transfers.filter(t => t.frequency !== 'one_time').length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <ArrowRightLeft className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-4">No recurring bank transfers yet</p>
                <Button onClick={() => setShowAddTransfer(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Transfer
                </Button>
              </CardContent>
            </Card>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={showAddTransfer} onOpenChange={setShowAddTransfer}>
        <DialogContent className="max-h-[90vh] flex flex-col p-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full">
          <DialogHeader className="p-6 pb-4 flex-shrink-0">
            <DialogTitle>Add Recurring Bank Transfer</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 pb-6 flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            <BankTransferForm
            bankAccounts={bankAccounts}
            onSubmit={(data) => createTransferMutation.mutate(data)}
            isLoading={createTransferMutation.isPending}
          />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTransfer} onOpenChange={() => setEditingTransfer(null)}>
        <DialogContent className="max-h-[90vh] flex flex-col p-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full">
          <DialogHeader className="p-6 pb-4 flex-shrink-0">
            <DialogTitle>Edit Recurring Bank Transfer</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 pb-6 flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            <BankTransferForm
            transfer={editingTransfer}
            bankAccounts={bankAccounts}
            onSubmit={(data) => updateTransferMutation.mutate({ id: editingTransfer.id, data })}
            isLoading={updateTransferMutation.isPending}
          />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BankTransferForm({ transfer, bankAccounts, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    name: transfer?.name || '',
    amount_type: transfer?.amount_type || 'fixed',
    amount: transfer?.amount?.toString() || '',
    min_amount: transfer?.min_amount?.toString() || '',
    max_amount: transfer?.max_amount?.toString() || '',
    currency: transfer?.currency || 'USD',
    from_account_id: transfer?.from_account_id || '',
    to_account_id: transfer?.to_account_id || '',
    frequency: transfer?.frequency || 'monthly',
    transfer_date: transfer?.transfer_date?.toString() || '',
    day_of_week: transfer?.day_of_week?.toString() || '1',
    transfer_month: transfer?.transfer_month?.toString() || '1',
    start_date: transfer?.start_date || '',
    end_date: transfer?.end_date || ''
  });

  const [isRecurring, setIsRecurring] = useState(transfer?.frequency !== 'one_time');
  const [sliderAmount, setSliderAmount] = useState(parseFloat(transfer?.amount) || 100);

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
      from_account_id: formData.from_account_id,
      to_account_id: formData.to_account_id,
      frequency: isRecurring ? formData.frequency : 'one_time'
    };

    if (formData.amount_type === 'fixed') {
      submitData.amount = parseFloat(formData.amount) || 0;
    } else {
      submitData.min_amount = parseFloat(formData.min_amount) || 0;
      submitData.max_amount = parseFloat(formData.max_amount) || 0;
      submitData.amount = sliderAmount;
    }

    if (isRecurring) {
      if (formData.frequency === 'weekly') {
        submitData.day_of_week = parseInt(formData.day_of_week);
      } else if (formData.frequency === 'monthly' || formData.frequency === 'quarterly') {
        submitData.transfer_date = formData.transfer_date ? parseInt(formData.transfer_date) : null;
      } else if (formData.frequency === 'yearly') {
        submitData.transfer_date = formData.transfer_date ? parseInt(formData.transfer_date) : null;
        submitData.transfer_month = formData.transfer_month ? parseInt(formData.transfer_month) : null;
      }
      
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
        <Label htmlFor="transferName">Transfer Name</Label>
        <Input
          id="transferName"
          placeholder="e.g., Monthly Savings Transfer"
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
          <Label htmlFor="transferAmount">Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{getCurrencySymbol(formData.currency)}</span>
            <Input
              id="transferAmount"
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
              <p className="text-xs text-slate-500">
                Use the slider to estimate typical transfer amount
              </p>
            </div>
          )}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="transferCurrency">Currency</Label>
        <CurrencySelector
          value={formData.currency}
          onChange={(currency) => setFormData({ ...formData, currency })}
          className="w-full"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fromAccount">From Account</Label>
        <select
          id="fromAccount"
          value={formData.from_account_id}
          onChange={(e) => setFormData({ ...formData, from_account_id: e.target.value })}
          className="w-full h-10 px-3 rounded-md border border-slate-200"
          required
        >
          <option value="">Select source account</option>
          {bankAccounts.map(account => (
            <option key={account.id} value={account.id}>
              {account.name} {account.account_number ? `(${account.account_number})` : ''} - {account.currency}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="toAccount">To Account</Label>
        <select
          id="toAccount"
          value={formData.to_account_id}
          onChange={(e) => setFormData({ ...formData, to_account_id: e.target.value })}
          className="w-full h-10 px-3 rounded-md border border-slate-200"
          required
        >
          <option value="">Select destination account</option>
          {bankAccounts.map(account => (
            <option key={account.id} value={account.id}>
              {account.name} {account.account_number ? `(${account.account_number})` : ''} - {account.currency}
            </option>
          ))}
        </select>
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
          Is this a recurring transfer?
        </Label>
      </div>
      {isRecurring && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transferFrequency">Frequency</Label>
            <select
              id="transferFrequency"
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
              <Label htmlFor="transferDate">
                {formData.frequency === 'monthly' ? 'Transfer Date (Day of Month)' : 'Transfer Date (Day of Month, repeats quarterly)'}
              </Label>
              <Input
                id="transferDate"
                type="number"
                min="1"
                max="31"
                placeholder="e.g., 15"
                value={formData.transfer_date}
                onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
              />
            </div>
          )}

          {formData.frequency === 'yearly' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="transferMonth">Month</Label>
                <select
                  id="transferMonth"
                  value={formData.transfer_month}
                  onChange={(e) => setFormData({ ...formData, transfer_month: e.target.value })}
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
                <Label htmlFor="transferDate">Day</Label>
                <Input
                  id="transferDate"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="e.g., 15"
                  value={formData.transfer_date}
                  onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
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
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Saving...' : transfer ? 'Update Transfer' : 'Add Transfer'}
      </Button>
    </form>
  );
}
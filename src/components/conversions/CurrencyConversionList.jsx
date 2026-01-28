import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, ArrowRightLeft, Trash2, Play, RefreshCw, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatCurrency } from '@/components/utils/calculations';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useAccessControl } from '@/components/access/useAccessControl';
import UpgradeDialog from '@/components/access/UpgradeDialog';

const FREQUENCY_LABELS = {
  one_time: 'One Time',
  weekly: 'Weekly',
  bi_weekly: 'Bi-weekly',
  monthly: 'Monthly'
};

export default function CurrencyConversionList({ dragHandleProps }) {
  const [showForm, setShowForm] = useState(false);
  const [editingConversion, setEditingConversion] = useState(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const queryClient = useQueryClient();
  const accessControl = useAccessControl();

  const { data: conversions = [] } = useQuery({
    queryKey: ['currency-conversions'],
    queryFn: async () => {
      const data = await base44.entities.CurrencyConversion.filter({ is_active: true });
      return data.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => base44.entities.BankAccount.filter({ is_active: true })
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const canCreate = await accessControl.canCreateBankTransfer();
      if (!canCreate) {
        setShowUpgradeDialog(true);
        throw new Error('Upgrade required');
      }
      return base44.entities.CurrencyConversion.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currency-conversions'] });
      setShowForm(false);
      setEditingConversion(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CurrencyConversion.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currency-conversions'] });
      setShowForm(false);
      setEditingConversion(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CurrencyConversion.update(id, { is_active: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currency-conversions'] })
  });

  const executeConversionMutation = useMutation({
    mutationFn: async (conversion) => {
      let rate = conversion.manual_rate;
      
      if (conversion.use_live_rate) {
        const { data } = await base44.functions.invoke('getCurrencyRate', {
          from: conversion.from_currency,
          to: conversion.to_currency
        });
        rate = data.rate;
      }

      const convertedAmount = conversion.amount * rate;
      const today = new Date().toISOString().split('T')[0];

      // Deduct from source account
      await base44.entities.Deposit.create({
        bank_account_id: conversion.from_account_id,
        amount: -conversion.amount,
        date: today,
        description: `Currency conversion: ${conversion.name}`,
        category: 'transfer'
      });

      // Add to destination account
      await base44.entities.Deposit.create({
        bank_account_id: conversion.to_account_id,
        amount: convertedAmount,
        date: today,
        description: `Currency conversion: ${conversion.name}`,
        category: 'transfer'
      });

      return { rate, convertedAmount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['all-deposits'] });
    }
  });

  const reorderMutation = useMutation({
    mutationFn: async (reorderedItems) => {
      await Promise.all(
        reorderedItems.map((item, index) =>
          base44.entities.CurrencyConversion.update(item.id, { display_order: index })
        )
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currency-conversions'] })
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(conversions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    reorderMutation.mutate(items);
  };

  const getAccountName = (accountId) => {
    const account = bankAccounts.find(a => a.id === accountId);
    return account ? account.name : 'Unknown';
  };

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {dragHandleProps && (
              <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
                <GripVertical className="w-5 h-5 text-slate-400" />
              </div>
            )}
            <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity">
              <h2 className="text-xl font-bold text-emerald-400">Currency FX</h2>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </CollapsibleTrigger>
          </div>
          <Button 
            onClick={() => setShowForm(true)} 
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Conversion
          </Button>
        </div>
        <CollapsibleContent>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden p-4">
            {conversions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No currency conversions yet</p>
                <Button onClick={() => setShowForm(true)} size="sm" variant="outline" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Conversion
                </Button>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="conversions">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                      {conversions.map((conversion, index) => (
                        <Draggable key={conversion.id} draggableId={conversion.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bg-slate-50 border border-slate-200 rounded-lg p-4"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-semibold text-slate-900">{conversion.name}</h3>
                                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                      {FREQUENCY_LABELS[conversion.frequency]}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <span className="font-medium">{getAccountName(conversion.from_account_id)}</span>
                                    <ArrowRightLeft className="w-4 h-4 text-slate-400" />
                                    <span className="font-medium">{getAccountName(conversion.to_account_id)}</span>
                                  </div>
                                  <div className="mt-2 text-sm">
                                    <span className="font-semibold text-slate-900">
                                      {formatCurrency(conversion.amount, conversion.from_currency)}
                                    </span>
                                    <span className="text-slate-500 mx-2">→</span>
                                    <span className="font-semibold text-slate-900">{conversion.to_currency}</span>
                                    <span className="text-xs text-slate-500 ml-2">
                                      ({conversion.use_live_rate ? 'Live rate' : `Rate: ${conversion.manual_rate}`})
                                    </span>
                                  </div>
                                  {conversion.frequency !== 'one_time' && (
                                    <div className="text-xs text-slate-500 mt-1">
                                      {conversion.frequency === 'monthly' && `On day ${conversion.conversion_date}`}
                                      {(conversion.frequency === 'weekly' || conversion.frequency === 'bi_weekly') && 
                                        `On ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][conversion.day_of_week]}`}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => executeConversionMutation.mutate(conversion)}
                                    disabled={executeConversionMutation.isPending}
                                  >
                                    <Play className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingConversion(conversion);
                                      setShowForm(true);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteMutation.mutate(conversion.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) setEditingConversion(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConversion ? 'Edit Conversion' : 'Add Currency Conversion'}
            </DialogTitle>
          </DialogHeader>
          <ConversionForm
            conversion={editingConversion}
            bankAccounts={bankAccounts}
            onSubmit={(data) => {
              if (editingConversion) {
                updateMutation.mutate({ id: editingConversion.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingConversion(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        context="bankTransfer"
      />
    </>
  );
}

function ConversionForm({ conversion, bankAccounts, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: conversion?.name || '',
    from_account_id: conversion?.from_account_id || '',
    to_account_id: conversion?.to_account_id || '',
    from_currency: conversion?.from_currency || '',
    to_currency: conversion?.to_currency || '',
    amount: conversion?.amount || '',
    frequency: conversion?.frequency || 'one_time',
    conversion_date: conversion?.conversion_date || 1,
    day_of_week: conversion?.day_of_week || 1,
    start_date: conversion?.start_date || new Date().toISOString().split('T')[0],
    use_live_rate: conversion?.use_live_rate ?? true,
    manual_rate: conversion?.manual_rate || ''
  });

  // Auto-detect currency from selected accounts
  React.useEffect(() => {
    if (formData.from_account_id && !conversion) {
      const account = bankAccounts.find(a => a.id === formData.from_account_id);
      if (account) {
        setFormData(prev => ({ ...prev, from_currency: account.currency }));
      }
    }
  }, [formData.from_account_id, bankAccounts, conversion]);

  React.useEffect(() => {
    if (formData.to_account_id && !conversion) {
      const account = bankAccounts.find(a => a.id === formData.to_account_id);
      if (account) {
        setFormData(prev => ({ ...prev, to_currency: account.currency }));
      }
    }
  }, [formData.to_account_id, bankAccounts, conversion]);

  const [liveRate, setLiveRate] = useState(null);
  const [loadingRate, setLoadingRate] = useState(false);

  const fetchLiveRate = async () => {
    if (!formData.from_currency || !formData.to_currency) return;
    setLoadingRate(true);
    try {
      const { data } = await base44.functions.invoke('getCurrencyRate', {
        from: formData.from_currency,
        to: formData.to_currency
      });
      setLiveRate(data.rate);
    } catch (error) {
      console.error('Failed to fetch rate:', error);
    } finally {
      setLoadingRate(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount),
      manual_rate: formData.manual_rate ? parseFloat(formData.manual_rate) : undefined
    };
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Conversion Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="EUR to USD Conversion"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>From Account</Label>
          <select
            value={formData.from_account_id}
            onChange={(e) => setFormData({ ...formData, from_account_id: e.target.value })}
            className="w-full h-10 px-3 rounded-md border border-slate-200"
            required
          >
            <option value="">Select account</option>
            {bankAccounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>To Account</Label>
          <select
            value={formData.to_account_id}
            onChange={(e) => setFormData({ ...formData, to_account_id: e.target.value })}
            className="w-full h-10 px-3 rounded-md border border-slate-200"
            required
          >
            <option value="">Select account</option>
            {bankAccounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Amount to Convert</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="1000.00"
            required
          />
        </div>
        <div>
          <Label>From Currency</Label>
          <Input
            value={formData.from_currency}
            onChange={(e) => setFormData({ ...formData, from_currency: e.target.value.toUpperCase() })}
            placeholder="EUR"
            maxLength={3}
            required
          />
          <p className="text-xs text-slate-500 mt-1">Can be different from account currency</p>
        </div>
      </div>

      <div>
        <Label>To Currency</Label>
        <Input
          value={formData.to_currency}
          onChange={(e) => setFormData({ ...formData, to_currency: e.target.value.toUpperCase() })}
          placeholder="USD"
          maxLength={3}
          required
        />
        <p className="text-xs text-slate-500 mt-1">Can be different from account currency</p>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={formData.use_live_rate}
          onCheckedChange={(checked) => setFormData({ ...formData, use_live_rate: checked })}
        />
        <Label>Use live exchange rate</Label>
      </div>

      {formData.use_live_rate ? (
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              {liveRate ? (
                <p className="text-sm">
                  <span className="font-medium">Current rate:</span> 1 {formData.from_currency} = {liveRate} {formData.to_currency}
                </p>
              ) : (
                <p className="text-sm text-slate-600">Click to fetch live rate</p>
              )}
            </div>
            <Button type="button" size="sm" variant="outline" onClick={fetchLiveRate} disabled={loadingRate}>
              <RefreshCw className={`w-4 h-4 ${loadingRate ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Label>Manual Exchange Rate</Label>
          <Input
            type="number"
            step="0.000001"
            value={formData.manual_rate}
            onChange={(e) => setFormData({ ...formData, manual_rate: e.target.value })}
            placeholder="1.08"
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            1 {formData.from_currency} = {formData.manual_rate || '?'} {formData.to_currency}
          </p>
        </div>
      )}

      <div>
        <Label>Frequency</Label>
        <select
          value={formData.frequency}
          onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
          className="w-full h-10 px-3 rounded-md border border-slate-200"
          required
        >
          <option value="one_time">One Time</option>
          <option value="weekly">Weekly</option>
          <option value="bi_weekly">Bi-weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      {formData.frequency === 'monthly' && (
        <div>
          <Label>Day of Month</Label>
          <Input
            type="number"
            min="1"
            max="31"
            value={formData.conversion_date}
            onChange={(e) => setFormData({ ...formData, conversion_date: parseInt(e.target.value) })}
            required
          />
        </div>
      )}

      {(formData.frequency === 'weekly' || formData.frequency === 'bi_weekly') && (
        <div>
          <Label>Day of Week</Label>
          <select
            value={formData.day_of_week}
            onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
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

      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {conversion ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
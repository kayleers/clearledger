import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Receipt, Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { formatCurrency } from '@/components/utils/calculations';
import { format } from 'date-fns';
import CurrencySelector from '@/components/currency/CurrencySelector';

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

export default function RecurringBillList({ bills = [], bankAccounts = [] }) {
  const [showAddBill, setShowAddBill] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const queryClient = useQueryClient();

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Recurring Bills</h2>
        <Button
          size="sm"
          onClick={() => setShowAddBill(true)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Bill
        </Button>
      </div>

      <div className="grid gap-3">
        {bills.map((bill) => {
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
                        <span>{formatCurrency(bill.amount, bill.currency || 'USD')}</span>
                        <span>•</span>
                        <span>{frequencyLabels[bill.frequency]}</span>
                        {bill.due_date && (
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

      {bills.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">No recurring bills yet</p>
            <Button onClick={() => setShowAddBill(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Bill
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={showAddBill} onOpenChange={setShowAddBill}>
        <DialogContent>
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
        <DialogContent>
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
    </div>
  );
}

function RecurringBillForm({ bill, bankAccounts, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    name: bill?.name || '',
    amount: bill?.amount?.toString() || '',
    currency: bill?.currency || 'USD',
    frequency: bill?.frequency || 'monthly',
    due_date: bill?.due_date?.toString() || '',
    bank_account_id: bill?.bank_account_id || '',
    category: bill?.category || 'other',
    next_due_date: bill?.next_due_date || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      amount: parseFloat(formData.amount) || 0,
      currency: formData.currency,
      frequency: formData.frequency,
      due_date: formData.due_date ? parseInt(formData.due_date) : null,
      bank_account_id: formData.bank_account_id,
      category: formData.category,
      next_due_date: formData.next_due_date || null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
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
        <Label htmlFor="billAmount">Amount</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
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
      <div className="space-y-2">
        <Label htmlFor="billCurrency">Currency</Label>
        <CurrencySelector
          value={formData.currency}
          onChange={(currency) => setFormData({ ...formData, currency })}
          className="w-full"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="billFrequency">Frequency</Label>
        <select
          id="billFrequency"
          value={formData.frequency}
          onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
          className="w-full h-10 px-3 rounded-md border border-slate-200"
        >
          <option value="one_time">One-Time</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="billDueDate">Due Date (Day of Month)</Label>
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
      <div className="space-y-2">
        <Label htmlFor="billAccount">Bank Account</Label>
        <select
          id="billAccount"
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
      <div className="space-y-2">
        <Label htmlFor="billNextDue">Next Due Date (Optional)</Label>
        <Input
          id="billNextDue"
          type="date"
          value={formData.next_due_date}
          onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
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
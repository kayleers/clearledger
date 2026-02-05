import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Edit, Trash2, Calendar, DollarSign, Receipt } from 'lucide-react';
import { formatCurrency } from '@/components/utils/calculations';
import { createPageUrl } from '@/utils';

const BILL_CATEGORIES = [
  { value: 'utilities', label: 'Utilities', icon: '⚡' },
  { value: 'subscription', label: 'Subscription', icon: '📺' },
  { value: 'insurance', label: 'Insurance', icon: '🛡️' },
  { value: 'rent', label: 'Rent', icon: '🏠' },
  { value: 'loan', label: 'Loan', icon: '🏦' },
  { value: 'other', label: 'Other', icon: '📄' }
];

const FREQUENCIES = [
  { value: 'one_time', label: 'One Time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' }
];

export default function BillDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const billId = urlParams.get('id');

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: bill, isLoading } = useQuery({
    queryKey: ['bill', billId],
    queryFn: async () => {
      const bills = await base44.entities.RecurringBill.list();
      return bills.find(b => b.id === billId);
    },
    enabled: !!billId
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => base44.entities.BankAccount.list()
  });

  const updateBillMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RecurringBill.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill', billId] });
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
      setShowEditDialog(false);
    }
  });

  const deleteBillMutation = useMutation({
    mutationFn: (id) => base44.entities.RecurringBill.delete(id),
    onSuccess: () => {
      navigate(createPageUrl('Dashboard'));
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-4xl mx-auto text-center py-12">
          <Receipt className="w-16 h-16 mx-auto text-slate-400 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Bill not found</h2>
          <Button onClick={() => navigate(createPageUrl('Dashboard'))}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const categoryIcon = BILL_CATEGORIES.find(c => c.value === bill.category)?.icon || '📄';
  const frequencyLabel = FREQUENCIES.find(f => f.value === bill.frequency)?.label || bill.frequency;
  const linkedAccount = bankAccounts.find(a => a.id === bill.bank_account_id);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 safe-area-pb safe-area-pt pb-24">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Dashboard'))}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowEditDialog(true)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Bill Info Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{categoryIcon}</div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{bill.name}</CardTitle>
                <p className="text-sm text-slate-500 capitalize">{bill.category}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-xl text-center">
                <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{formatCurrency(bill.amount, bill.currency)}</p>
                <p className="text-xs text-purple-600 dark:text-purple-400">Amount</p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl text-center">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{frequencyLabel}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Frequency</p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3 pt-4 border-t dark:border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Category</span>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize">{bill.category}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Frequency</span>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{frequencyLabel}</span>
              </div>
              {bill.due_date && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Due Date</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {bill.due_date}{bill.due_date === 1 ? 'st' : bill.due_date === 2 ? 'nd' : bill.due_date === 3 ? 'rd' : 'th'} of month
                  </span>
                </div>
              )}
              {bill.day_of_week !== undefined && bill.day_of_week !== null && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Day of Week</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][bill.day_of_week]}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Payment Account</span>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {linkedAccount ? linkedAccount.name : 'Not linked'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Status</span>
                <span className={`text-sm font-medium ${bill.is_active ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                  {bill.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Bill</DialogTitle>
            </DialogHeader>
            <BillEditForm
              bill={bill}
              bankAccounts={bankAccounts}
              onSubmit={(data) => updateBillMutation.mutate({ id: bill.id, data })}
              onCancel={() => setShowEditDialog(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Bill?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete "{bill.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteBillMutation.mutate(bill.id)}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function BillEditForm({ bill, bankAccounts, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: bill.name || '',
    amount: bill.amount || '',
    frequency: bill.frequency || 'monthly',
    due_date: bill.due_date || '',
    day_of_week: bill.day_of_week !== undefined ? bill.day_of_week : '',
    due_month: bill.due_month || '',
    bank_account_id: bill.bank_account_id || '',
    category: bill.category || 'other',
    is_active: bill.is_active !== undefined ? bill.is_active : true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount) || 0,
      due_date: formData.due_date ? parseInt(formData.due_date) : undefined,
      day_of_week: formData.day_of_week !== '' ? parseInt(formData.day_of_week) : undefined,
      due_month: formData.due_month ? parseInt(formData.due_month) : undefined
    };
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Bill Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Netflix"
          required
        />
      </div>

      <div>
        <Label>Amount</Label>
        <Input
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
        />
      </div>

      <div>
        <Label>Category</Label>
        <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BILL_CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Frequency</Label>
        <Select value={formData.frequency} onValueChange={(val) => setFormData({ ...formData, frequency: val })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCIES.map(freq => (
              <SelectItem key={freq.value} value={freq.value}>
                {freq.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(formData.frequency === 'monthly' || formData.frequency === 'quarterly' || formData.frequency === 'yearly') && (
        <div>
          <Label>Due Date (Day of Month)</Label>
          <Input
            type="number"
            min="1"
            max="31"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
          />
        </div>
      )}

      {formData.frequency === 'weekly' && (
        <div>
          <Label>Day of Week</Label>
          <Select value={formData.day_of_week?.toString()} onValueChange={(val) => setFormData({ ...formData, day_of_week: val })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Sunday</SelectItem>
              <SelectItem value="1">Monday</SelectItem>
              <SelectItem value="2">Tuesday</SelectItem>
              <SelectItem value="3">Wednesday</SelectItem>
              <SelectItem value="4">Thursday</SelectItem>
              <SelectItem value="5">Friday</SelectItem>
              <SelectItem value="6">Saturday</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label>Payment Account</Label>
        <Select value={formData.bank_account_id} onValueChange={(val) => setFormData({ ...formData, bank_account_id: val })}>
          <SelectTrigger>
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {bankAccounts.map(account => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="w-4 h-4"
        />
        <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Changes
        </Button>
      </div>
    </form>
  );
}
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { X, CreditCard, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const cardColors = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-600' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-600' },
  { value: 'green', label: 'Green', class: 'bg-emerald-600' },
  { value: 'red', label: 'Red', class: 'bg-rose-600' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'slate', label: 'Gray', class: 'bg-slate-600' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-600' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' }
];

export default function AddCardForm({ card, onSubmit, onCancel, isLoading, bankAccounts = [], creditCards = [] }) {
  const [formData, setFormData] = useState({
    name: card?.name || '',
    card_last_four: card?.card_last_four || '',
    balance: card?.balance?.toString() || '',
    credit_limit: card?.credit_limit?.toString() || '',
    apr: card?.apr ? (card.apr * 100).toString() : '',
    min_payment: card?.min_payment?.toString() || '',
    statement_date: card?.statement_date?.toString() || '',
    due_date: card?.due_date?.toString() || '',
    color: card?.color || 'blue',
    is_active: card?.is_active !== undefined ? card.is_active : true,
    bank_account_id: card?.bank_account_id || '',
    additional_payment_enabled: card?.additional_payment_enabled || false,
    additional_payment_amount: card?.additional_payment_amount?.toString() || '',
    additional_payment_bank_account_id: card?.additional_payment_bank_account_id || '',
    pay_full_balance_monthly: card?.pay_full_balance_monthly || false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      name: formData.name,
      card_last_four: formData.card_last_four || null,
      balance: parseFloat(formData.balance) || 0,
      credit_limit: parseFloat(formData.credit_limit) || 0,
      apr: parseFloat(formData.apr) / 100 || 0,
      min_payment: parseFloat(formData.min_payment) || 0,
      statement_date: parseInt(formData.statement_date) || null,
      due_date: parseInt(formData.due_date) || null,
      color: formData.color,
      is_active: formData.is_active,
      bank_account_id: formData.bank_account_id || null
    };

    if (formData.additional_payment_enabled) {
      submitData.additional_payment_enabled = true;
      submitData.additional_payment_amount = parseFloat(formData.additional_payment_amount) || 0;
      submitData.additional_payment_bank_account_id = formData.additional_payment_bank_account_id || null;
    } else {
      submitData.additional_payment_enabled = false;
    }

    submitData.pay_full_balance_monthly = formData.pay_full_balance_monthly;

    onSubmit(submitData);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-blue-600" />
          {card ? 'Edit Credit Card' : 'Add Credit Card'}
        </h2>
      </div>
      <div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Card Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Card Nickname</Label>
            <Input
              id="name"
              placeholder="e.g., Chase Freedom, My Visa"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              required
              className="h-12"
            />
          </div>

          {/* Last 4 Digits */}
          <div className="space-y-2">
            <Label htmlFor="card_last_four">Last 4 Digits (Optional)</Label>
            <Input
              id="card_last_four"
              type="text"
              maxLength="4"
              placeholder="1234"
              value={formData.card_last_four}
              onChange={(e) => updateField('card_last_four', e.target.value.replace(/\D/g, ''))}
              className="h-12"
            />
          </div>

          {/* Balance & Limit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="balance">Current Balance</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.balance}
                  onChange={(e) => updateField('balance', e.target.value)}
                  required
                  className="pl-7 h-12"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit_limit">Credit Limit</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <Input
                  id="credit_limit"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.credit_limit}
                  onChange={(e) => updateField('credit_limit', e.target.value)}
                  required={formData.is_active}
                  className="pl-7 h-12"
                />
              </div>
            </div>
          </div>

          {/* APR */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="apr">Interest Rate (APR)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Find your APR on your credit card statement or online account. It's usually between 15-25%.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="relative">
              <Input
                id="apr"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="19.99"
                value={formData.apr}
                onChange={(e) => updateField('apr', e.target.value)}
                required
                className="pr-7 h-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
            </div>
          </div>

          {/* Minimum Payment */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="min_payment">Minimum Payment</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Find this on your credit card statement. Usually $25-35 or 1-3% of your balance.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <Input
                id="min_payment"
                type="number"
                step="0.01"
                min="0"
                placeholder="25.00"
                value={formData.min_payment}
                onChange={(e) => updateField('min_payment', e.target.value)}
                required
                className="pl-7 h-12"
              />
            </div>
          </div>

          {/* Statement & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="statement_date">Statement Day</Label>
              <Input
                id="statement_date"
                type="number"
                min="1"
                max="31"
                placeholder="Day (1-31)"
                value={formData.statement_date}
                onChange={(e) => updateField('statement_date', e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Day</Label>
              <Input
                id="due_date"
                type="number"
                min="1"
                max="31"
                placeholder="Day (1-31)"
                value={formData.due_date}
                onChange={(e) => updateField('due_date', e.target.value)}
                className="h-12"
              />
            </div>
          </div>

          {/* Card Color */}
          <div className="space-y-2">
            <Label>Card Color</Label>
            <div className="flex flex-wrap gap-2">
              {cardColors.map(color => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => updateField('color', color.value)}
                  className={`w-10 h-10 rounded-full ${color.class} transition-all ${
                    formData.color === color.value 
                      ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' 
                      : 'hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Primary Payment Source */}
          <div className="space-y-2">
            <Label htmlFor="bank_account">Primary Payment Source (Optional)</Label>
            <select
              id="bank_account"
              value={formData.bank_account_id}
              onChange={(e) => updateField('bank_account_id', e.target.value)}
              className="w-full h-12 px-3 rounded-md border border-slate-200"
            >
              <option value="">No payment source selected</option>
              <optgroup label="Bank Accounts">
                {bankAccounts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} {account.account_number ? `(${account.account_number})` : ''} - {account.currency}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Credit Cards">
                {creditCards.filter(c => c.is_active !== false && c.id !== card?.id).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map(cc => (
                  <option key={cc.id} value={cc.id}>
                    {cc.name} {cc.card_last_four ? `(••••${cc.card_last_four})` : ''} - {cc.currency}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Pay Full Balance Monthly */}
          <div className="space-y-3 p-4 border rounded-lg bg-emerald-50 border-emerald-200">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="pay_full_balance_monthly" className="text-emerald-900">Pay Full Balance Monthly</Label>
                <p className="text-xs text-emerald-700">Automatically pay entire balance each month when present</p>
              </div>
              <Switch
                id="pay_full_balance_monthly"
                checked={formData.pay_full_balance_monthly}
                onCheckedChange={(checked) => updateField('pay_full_balance_monthly', checked)}
              />
            </div>
          </div>

          {/* Additional Payment */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="additional_payment_enabled">Additional Payment</Label>
                <p className="text-xs text-slate-500">Enable extra payments beyond minimum</p>
              </div>
              <Switch
                id="additional_payment_enabled"
                checked={formData.additional_payment_enabled}
                onCheckedChange={(checked) => updateField('additional_payment_enabled', checked)}
              />
            </div>

            {formData.additional_payment_enabled && (
              <div className="space-y-3 pt-3 border-t">
                <div className="space-y-2">
                  <Label htmlFor="additional_amount">Additional Payment Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <Input
                      id="additional_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="100.00"
                      value={formData.additional_payment_amount}
                      onChange={(e) => updateField('additional_payment_amount', e.target.value)}
                      className="pl-7 h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additional_bank_account">Payment Source for Additional Payment</Label>
                  <select
                    id="additional_bank_account"
                    value={formData.additional_payment_bank_account_id}
                    onChange={(e) => updateField('additional_payment_bank_account_id', e.target.value)}
                    className="w-full h-12 px-3 rounded-md border border-slate-200"
                  >
                    <option value="">No payment source selected</option>
                    <optgroup label="Bank Accounts">
                      {bankAccounts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map(account => (
                        <option key={account.id} value={account.id}>
                          {account.name} {account.account_number ? `(${account.account_number})` : ''} - {account.currency}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Credit Cards">
                      {creditCards.filter(c => c.is_active !== false && c.id !== card?.id).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map(cc => (
                        <option key={cc.id} value={cc.id}>
                          {cc.name} {cc.card_last_four ? `(••••${cc.card_last_four})` : ''} - {cc.currency}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Card is Active</Label>
              <p className="text-xs text-slate-500">Inactive cards are hidden from most views</p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => updateField('is_active', checked)}
            />
          </div>

          {/* Submit */}
          <Button 
            type="submit" 
            className="w-full h-12 text-base font-medium"
            disabled={isLoading}
          >
            {isLoading ? (card ? 'Updating Card...' : 'Adding Card...') : (card ? 'Update Card' : 'Add Card')}
          </Button>
        </form>
      </div>
    </>
  );
}
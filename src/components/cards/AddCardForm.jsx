import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export default function AddCardForm({ onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    name: '',
    balance: '',
    credit_limit: '',
    apr: '',
    min_payment_type: 'percentage',
    min_payment_value: '2',
    min_payment_floor: '25',
    statement_date: '',
    due_date: '',
    color: 'blue'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      balance: parseFloat(formData.balance) || 0,
      credit_limit: parseFloat(formData.credit_limit) || 0,
      apr: parseFloat(formData.apr) / 100 || 0,
      min_payment_value: parseFloat(formData.min_payment_value) || 2,
      min_payment_floor: parseFloat(formData.min_payment_floor) || 25,
      statement_date: parseInt(formData.statement_date) || null,
      due_date: parseInt(formData.due_date) || null,
      is_active: true
    });
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Add Credit Card
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
                  required
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

          {/* Minimum Payment Settings */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2">
              <Label>Minimum Payment Rule</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Most cards use 1-3% of your balance with a minimum floor of $25-35.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <Select
              value={formData.min_payment_type}
              onValueChange={(value) => updateField('min_payment_type', value)}
            >
              <SelectTrigger className="h-12 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage of Balance</SelectItem>
                <SelectItem value="flat">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">
                  {formData.min_payment_type === 'percentage' ? 'Percentage' : 'Amount'}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.min_payment_value}
                    onChange={(e) => updateField('min_payment_value', e.target.value)}
                    className="h-10 bg-white pr-7"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    {formData.min_payment_type === 'percentage' ? '%' : '$'}
                  </span>
                </div>
              </div>
              {formData.min_payment_type === 'percentage' && (
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Minimum Floor</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={formData.min_payment_floor}
                      onChange={(e) => updateField('min_payment_floor', e.target.value)}
                      className="h-10 bg-white pl-7"
                    />
                  </div>
                </div>
              )}
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

          {/* Submit */}
          <Button 
            type="submit" 
            className="w-full h-12 text-base font-medium"
            disabled={isLoading}
          >
            {isLoading ? 'Adding Card...' : 'Add Card'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
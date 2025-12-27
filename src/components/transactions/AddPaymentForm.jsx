import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { X, Wallet } from 'lucide-react';
import { formatCurrency, calculateMinimumPayment } from '@/components/utils/calculations';

export default function AddPaymentForm({ card, onSubmit, onCancel, isLoading }) {
  const minPayment = calculateMinimumPayment(card.min_payment, card.balance);

  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount) || 0
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
            <Wallet className="w-5 h-5 text-emerald-600" />
            Record Payment
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="p-4 bg-slate-50 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-600">Current Balance</span>
              <span className="font-bold text-lg">{formatCurrency(card.balance)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Minimum Payment</span>
              <span className="font-medium text-amber-600">{formatCurrency(minPayment)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={card.balance}
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => updateField('amount', e.target.value)}
                required
                className="pl-7 h-12 text-lg"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateField('amount', minPayment.toFixed(2))}
              >
                Minimum
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateField('amount', card.balance.toFixed(2))}
              >
                Full Balance
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Payment Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => updateField('date', e.target.value)}
              required
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              placeholder="e.g., Monthly payment"
              value={formData.note}
              onChange={(e) => updateField('note', e.target.value)}
              rows={2}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-medium bg-emerald-600 hover:bg-emerald-700"
            disabled={isLoading}
          >
            {isLoading ? 'Recording...' : 'Record Payment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
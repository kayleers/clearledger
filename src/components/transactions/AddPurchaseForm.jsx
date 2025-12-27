import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, ShoppingBag } from 'lucide-react';

const categories = [
  { value: 'groceries', label: '🛒 Groceries', icon: '🛒' },
  { value: 'dining', label: '🍽️ Dining', icon: '🍽️' },
  { value: 'shopping', label: '🛍️ Shopping', icon: '🛍️' },
  { value: 'gas', label: '⛽ Gas', icon: '⛽' },
  { value: 'bills', label: '📄 Bills', icon: '📄' },
  { value: 'entertainment', label: '🎬 Entertainment', icon: '🎬' },
  { value: 'travel', label: '✈️ Travel', icon: '✈️' },
  { value: 'health', label: '💊 Health', icon: '💊' },
  { value: 'other', label: '📦 Other', icon: '📦' }
];

export default function AddPurchaseForm({ onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'other'
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
            <ShoppingBag className="w-5 h-5 text-purple-600" />
            Add Purchase
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="description">What did you buy?</Label>
            <Input
              id="description"
              placeholder="e.g., Amazon order, Restaurant dinner"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              required
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => updateField('amount', e.target.value)}
                required
                className="pl-7 h-12 text-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
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
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => updateField('category', value)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-medium bg-purple-600 hover:bg-purple-700"
            disabled={isLoading}
          >
            {isLoading ? 'Adding...' : 'Add Purchase'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
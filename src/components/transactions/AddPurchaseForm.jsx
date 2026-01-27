import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, ShoppingBag, Save } from 'lucide-react';
import TemplateManager from '@/components/templates/TemplateManager';

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

export default function AddPurchaseForm({ onSubmit, onCancel, isLoading, cardId }) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'other'
  });
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const queryClient = useQueryClient();

  const saveTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.TransactionTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-templates'] });
      setShowSaveTemplate(false);
      setTemplateName('');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      card_id: cardId,
      amount: parseFloat(formData.amount) || 0
    });
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    
    saveTemplateMutation.mutate({
      name: templateName,
      description: formData.description,
      amount: parseFloat(formData.amount) || 0,
      category: formData.category,
      card_id: cardId
    });
  };

  const handleUseTemplate = (templateData) => {
    setFormData({
      description: templateData.description,
      amount: templateData.amount.toString(),
      date: new Date().toISOString().split('T')[0],
      category: templateData.category
    });
  };

  const suggestCategory = (description) => {
    const lower = description.toLowerCase();
    
    if (lower.includes('grocery') || lower.includes('supermarket') || lower.includes('market') || 
        lower.includes('walmart') || lower.includes('target') || lower.includes('costco')) {
      return 'groceries';
    }
    if (lower.includes('restaurant') || lower.includes('cafe') || lower.includes('pizza') || 
        lower.includes('mcdonald') || lower.includes('starbucks') || lower.includes('food')) {
      return 'dining';
    }
    if (lower.includes('gas') || lower.includes('shell') || lower.includes('chevron') || 
        lower.includes('bp') || lower.includes('exxon') || lower.includes('fuel')) {
      return 'gas';
    }
    if (lower.includes('amazon') || lower.includes('ebay') || lower.includes('store') || 
        lower.includes('shop') || lower.includes('mall')) {
      return 'shopping';
    }
    if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('movie') || 
        lower.includes('theater') || lower.includes('concert') || lower.includes('game')) {
      return 'entertainment';
    }
    if (lower.includes('doctor') || lower.includes('pharmacy') || lower.includes('hospital') || 
        lower.includes('clinic') || lower.includes('cvs') || lower.includes('walgreens')) {
      return 'health';
    }
    if (lower.includes('hotel') || lower.includes('airline') || lower.includes('uber') || 
        lower.includes('lyft') || lower.includes('flight') || lower.includes('airbnb')) {
      return 'travel';
    }
    if (lower.includes('electric') || lower.includes('water') || lower.includes('internet') || 
        lower.includes('phone') || lower.includes('utility')) {
      return 'bills';
    }
    
    return formData.category;
  };

  const handleDescriptionChange = (value) => {
    setFormData({ ...formData, description: value });
    
    if (value.length > 3) {
      const suggested = suggestCategory(value);
      if (suggested !== formData.category) {
        setFormData(prev => ({ ...prev, category: suggested }));
      }
    }
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
        <TemplateManager onUseTemplate={handleUseTemplate} />
        
        <div className="my-4 border-t" />
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="description">What did you buy?</Label>
            <Input
              id="description"
              placeholder="e.g., Amazon order, Restaurant dinner"
              value={formData.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
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

          <div className="flex gap-2">
            <Button 
              type="submit" 
              className="flex-1 h-12 text-base font-medium bg-purple-600 hover:bg-purple-700"
              disabled={isLoading}
            >
              {isLoading ? 'Adding...' : 'Add Purchase'}
            </Button>
            <Dialog open={showSaveTemplate} onOpenChange={setShowSaveTemplate}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="icon" className="h-12 w-12" disabled={!formData.description || !formData.amount}>
                  <Save className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save as Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Template Name</Label>
                    <Input
                      placeholder="e.g., Weekly Groceries"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                    />
                  </div>
                  <div className="text-sm text-slate-600 space-y-1">
                    <p><strong>Description:</strong> {formData.description}</p>
                    <p><strong>Amount:</strong> ${formData.amount}</p>
                    <p><strong>Category:</strong> {formData.category}</p>
                  </div>
                  <Button 
                    onClick={handleSaveTemplate}
                    disabled={!templateName.trim() || saveTemplateMutation.isPending}
                    className="w-full"
                  >
                    {saveTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
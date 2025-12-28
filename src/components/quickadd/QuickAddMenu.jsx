import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Building2, Receipt, Landmark, ShoppingBag, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/components/utils/calculations';
import AddPurchaseForm from '@/components/transactions/AddPurchaseForm';

const TRANSACTION_TYPES = [
  { id: 'card_purchase', label: 'Credit Card Purchase', icon: ShoppingBag, color: 'purple' },
  { id: 'bank_payment', label: 'Bank Account Payment', icon: Building2, color: 'emerald' },
  { id: 'card_payment', label: 'Credit Card Payment', icon: CreditCard, color: 'blue' },
  { id: 'bill_payment', label: 'Bill Payment', icon: Receipt, color: 'amber' },
  { id: 'loan_payment', label: 'Loan Payment', icon: Landmark, color: 'orange' }
];

export default function QuickAddMenu({ 
  cards, 
  bankAccounts, 
  bills, 
  loans,
  onCardPurchase,
  onBankPayment,
  onCardPayment,
  onBillPayment,
  onLoanPayment,
  isLoading
}) {
  const [selectedType, setSelectedType] = useState(null);
  const [selectedTargetId, setSelectedTargetId] = useState(null);

  const handleReset = () => {
    setSelectedType(null);
    setSelectedTargetId(null);
  };

  const renderTypeSelection = () => (
    <div className="space-y-2">
      <p className="text-sm text-slate-600 mb-3">What would you like to add?</p>
      {TRANSACTION_TYPES.map(type => {
        const Icon = type.icon;
        return (
          <Button
            key={type.id}
            variant="outline"
            className="w-full justify-start h-auto py-3"
            onClick={() => setSelectedType(type.id)}
          >
            <div className={`p-2 bg-${type.color}-100 rounded-lg mr-3`}>
              <Icon className={`w-5 h-5 text-${type.color}-600`} />
            </div>
            <span className="font-medium">{type.label}</span>
          </Button>
        );
      })}
    </div>
  );

  const renderTargetSelection = () => {
    let targets = [];
    let title = '';

    if (selectedType === 'card_purchase') {
      targets = cards;
      title = 'Select a credit card:';
      return (
        <>
          <Button variant="ghost" onClick={handleReset} className="mb-2">← Back</Button>
          <p className="text-sm text-slate-600 mb-3">{title}</p>
          {targets.map(card => (
            <Button
              key={card.id}
              variant="outline"
              className="w-full justify-start mb-2"
              onClick={() => setSelectedTargetId(card.id)}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              <div className="flex-1 text-left">
                <div className="font-medium">{card.name}</div>
                <div className="text-xs text-slate-500">{formatCurrency(card.balance, card.currency)}</div>
              </div>
            </Button>
          ))}
        </>
      );
    }

    if (selectedType === 'bank_payment') {
      targets = bankAccounts;
      title = 'Select bank account:';
    } else if (selectedType === 'card_payment') {
      targets = cards;
      title = 'Select credit card to pay:';
    } else if (selectedType === 'bill_payment') {
      targets = bills;
      title = 'Select bill to pay:';
    } else if (selectedType === 'loan_payment') {
      targets = loans;
      title = 'Select loan to pay:';
    }

    return (
      <>
        <Button variant="ghost" onClick={handleReset} className="mb-2">← Back</Button>
        <p className="text-sm text-slate-600 mb-3">{title}</p>
        {targets.map(target => (
          <Button
            key={target.id}
            variant="outline"
            className="w-full justify-start mb-2"
            onClick={() => setSelectedTargetId(target.id)}
          >
            {selectedType === 'bank_payment' && <Building2 className="w-4 h-4 mr-2" />}
            {selectedType === 'card_payment' && <CreditCard className="w-4 h-4 mr-2" />}
            {selectedType === 'bill_payment' && <Receipt className="w-4 h-4 mr-2" />}
            {selectedType === 'loan_payment' && <Landmark className="w-4 h-4 mr-2" />}
            <div className="flex-1 text-left">
              <div className="font-medium">{target.name}</div>
              {target.balance && (
                <div className="text-xs text-slate-500">{formatCurrency(target.balance || target.amount || target.current_balance, target.currency)}</div>
              )}
            </div>
          </Button>
        ))}
      </>
    );
  };

  const renderForm = () => {
    if (selectedType === 'card_purchase') {
      return (
        <AddPurchaseForm
          cardId={selectedTargetId}
          onSubmit={onCardPurchase}
          onCancel={handleReset}
          isLoading={isLoading}
        />
      );
    }

    return (
      <>
        <Button variant="ghost" onClick={handleReset} className="mb-4">← Back</Button>
        <QuickPaymentForm
          type={selectedType}
          targetId={selectedTargetId}
          target={
            selectedType === 'bank_payment' ? bankAccounts.find(b => b.id === selectedTargetId) :
            selectedType === 'card_payment' ? cards.find(c => c.id === selectedTargetId) :
            selectedType === 'bill_payment' ? bills.find(b => b.id === selectedTargetId) :
            loans.find(l => l.id === selectedTargetId)
          }
          onSubmit={(data) => {
            if (selectedType === 'bank_payment') onBankPayment(data);
            else if (selectedType === 'card_payment') onCardPayment(data);
            else if (selectedType === 'bill_payment') onBillPayment(data);
            else if (selectedType === 'loan_payment') onLoanPayment(data);
          }}
          onCancel={handleReset}
          isLoading={isLoading}
        />
      </>
    );
  };

  return (
    <div>
      {!selectedType && renderTypeSelection()}
      {selectedType && !selectedTargetId && renderTargetSelection()}
      {selectedType && selectedTargetId && renderForm()}
    </div>
  );
}

function QuickPaymentForm({ type, target, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      targetId: target.id
    });
  };

  const getTitle = () => {
    if (type === 'bank_payment') return 'Bank Payment';
    if (type === 'card_payment') return 'Card Payment';
    if (type === 'bill_payment') return 'Bill Payment';
    if (type === 'loan_payment') return 'Loan Payment';
    return 'Payment';
  };

  const getQuickAmounts = () => {
    if (type === 'card_payment') {
      return [
        { label: 'Min Payment', amount: target.min_payment },
        { label: 'Full Balance', amount: target.balance }
      ];
    }
    if (type === 'bill_payment') {
      return [{ label: 'Bill Amount', amount: target.amount }];
    }
    if (type === 'loan_payment') {
      return [
        { label: 'Monthly Payment', amount: target.monthly_payment },
        { label: 'Full Balance', amount: target.current_balance }
      ];
    }
    return [];
  };

  const quickAmounts = getQuickAmounts();

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-1">{target.name}</h3>
        <p className="text-sm text-slate-500 mb-4">{getTitle()}</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
            />
            {quickAmounts.length > 0 && (
              <div className="flex gap-2 mt-2">
                {quickAmounts.map((qa, idx) => (
                  <Button
                    key={idx}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, amount: qa.amount.toString() })}
                  >
                    {qa.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          {type === 'bank_payment' && (
            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Rent payment"
                required
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Adding...' : 'Add Payment'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
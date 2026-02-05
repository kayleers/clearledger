import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Building2, Receipt, Landmark, ShoppingBag, DollarSign, TrendingUp, GripVertical } from 'lucide-react';
import { formatCurrency } from '@/components/utils/calculations';
import AddPurchaseForm from '@/components/transactions/AddPurchaseForm';
import { Slider } from '@/components/ui/slider';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';

const TRANSACTION_TYPES = [
  { id: 'card_purchase', label: 'Credit Card Purchase', icon: ShoppingBag, color: 'purple' },
  { id: 'bank_deposit', label: 'Bank Account Deposit', icon: DollarSign, color: 'green' },
  { id: 'bank_payment', label: 'Bank Account Withdraw/Purchase', icon: Building2, color: 'emerald' },
  { id: 'card_payment', label: 'Credit Card Payment', icon: CreditCard, color: 'blue' },
  { id: 'bill_payment', label: 'Bill Payment', icon: Receipt, color: 'amber' },
  { id: 'loan_payment', label: 'Loan Payment', icon: Landmark, color: 'orange' },
  { id: 'bank_balance_update', label: 'Update Bank Account Balance', icon: TrendingUp, color: 'teal' },
  { id: 'card_balance_update', label: 'Update Credit Card Balance', icon: TrendingUp, color: 'violet' }
];

export default function QuickAddMenu({ 
  cards, 
  bankAccounts, 
  bills, 
  loans,
  onCardPurchase,
  onBankDeposit,
  onBankPayment,
  onCardPayment,
  onBillPayment,
  onLoanPayment,
  onBankBalanceUpdate,
  onCardBalanceUpdate,
  isLoading
}) {
  const [selectedType, setSelectedType] = useState(null);
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [transactionTypesOrder, setTransactionTypesOrder] = useState(TRANSACTION_TYPES.map(t => t.id));

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const user = await base44.auth.me();
        if (user.quick_add_order) {
          setTransactionTypesOrder(user.quick_add_order);
        }
      } catch (error) {
        console.error('Error fetching quick add order:', error);
      }
    };
    fetchOrder();
  }, []);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const newOrder = Array.from(transactionTypesOrder);
    const [reorderedItem] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, reorderedItem);

    setTransactionTypesOrder(newOrder);

    try {
      await base44.auth.updateMe({ quick_add_order: newOrder });
    } catch (error) {
      console.error('Error saving quick add order:', error);
    }
  };

  const orderedTransactionTypes = transactionTypesOrder
    .map(id => TRANSACTION_TYPES.find(t => t.id === id))
    .filter(Boolean);

  const handleReset = () => {
    setSelectedType(null);
    setSelectedTargetId(null);
  };

  const renderTypeSelection = () => (
    <div className="space-y-2">
      <p className="text-sm text-slate-600 mb-3">What would you like to add? (Drag to reorder)</p>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="quick-add-types">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
              {orderedTransactionTypes.map((type, index) => {
                const Icon = type.icon;
                return (
                  <Draggable key={type.id} draggableId={type.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={{
                          ...provided.draggableProps.style,
                          opacity: snapshot.isDragging ? 0.8 : 1,
                        }}
                      >
                        <Button
                          variant="outline"
                          className="w-full justify-start h-auto py-3 relative"
                          onClick={() => setSelectedType(type.id)}
                        >
                          <div
                            {...provided.dragHandleProps}
                            className="absolute left-2 cursor-grab active:cursor-grabbing"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GripVertical className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className={`p-2 bg-${type.color}-100 rounded-lg ml-6 mr-3`}>
                            <Icon className={`w-5 h-5 text-${type.color}-600`} />
                          </div>
                          <span className="font-medium">{type.label}</span>
                        </Button>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
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

    if (selectedType === 'bank_deposit') {
      targets = bankAccounts;
      title = 'Select bank account:';
    } else if (selectedType === 'bank_payment') {
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
    } else if (selectedType === 'bank_balance_update') {
      targets = bankAccounts;
      title = 'Select bank account to update:';
    } else if (selectedType === 'card_balance_update') {
      targets = cards;
      title = 'Select credit card to update:';
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
            {selectedType === 'bank_deposit' && <DollarSign className="w-4 h-4 mr-2" />}
            {selectedType === 'bank_payment' && <Building2 className="w-4 h-4 mr-2" />}
            {selectedType === 'card_payment' && <CreditCard className="w-4 h-4 mr-2" />}
            {selectedType === 'bill_payment' && <Receipt className="w-4 h-4 mr-2" />}
            {selectedType === 'loan_payment' && <Landmark className="w-4 h-4 mr-2" />}
            {selectedType === 'bank_balance_update' && <TrendingUp className="w-4 h-4 mr-2" />}
            {selectedType === 'card_balance_update' && <TrendingUp className="w-4 h-4 mr-2" />}
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
            selectedType === 'bank_deposit' ? bankAccounts.find(b => b.id === selectedTargetId) :
            selectedType === 'bank_payment' ? bankAccounts.find(b => b.id === selectedTargetId) :
            selectedType === 'card_payment' ? cards.find(c => c.id === selectedTargetId) :
            selectedType === 'bill_payment' ? bills.find(b => b.id === selectedTargetId) :
            loans.find(l => l.id === selectedTargetId)
          }
          bankAccounts={bankAccounts}
          onSubmit={(data) => {
            if (selectedType === 'bank_deposit') onBankDeposit(data);
            else if (selectedType === 'bank_payment') onBankPayment(data);
            else if (selectedType === 'card_payment') onCardPayment(data);
            else if (selectedType === 'bill_payment') onBillPayment(data);
            else if (selectedType === 'loan_payment') onLoanPayment(data);
            else if (selectedType === 'bank_balance_update') onBankBalanceUpdate(data);
            else if (selectedType === 'card_balance_update') onCardBalanceUpdate(data);
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

function QuickPaymentForm({ type, target, onSubmit, onCancel, isLoading, bankAccounts }) {
  const [formData, setFormData] = useState({
    amount: '',
    amount_type: 'fixed',
    min_amount: '',
    max_amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    bank_account_id: target.bank_account_id || '',
    is_recurring: false,
    frequency: 'monthly',
    deposit_date: '',
    start_date: '',
    end_date: ''
  });
  const [sliderAmount, setSliderAmount] = useState(100);

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      targetId: target.id,
      date: formData.date,
      description: formData.description,
      bank_account_id: formData.bank_account_id
    };

    if (type === 'bank_deposit' && formData.is_recurring) {
      // Create recurring deposit
      const recurringData = {
        bank_account_id: target.id,
        name: formData.description || 'Recurring Deposit',
        amount_type: formData.amount_type,
        frequency: formData.frequency,
        category: 'other',
        start_date: formData.start_date || formData.date,
        end_date: formData.end_date || null
      };

      if (formData.amount_type === 'fixed') {
        recurringData.amount = parseFloat(formData.amount);
      } else {
        recurringData.min_amount = parseFloat(formData.min_amount);
        recurringData.max_amount = parseFloat(formData.max_amount);
        recurringData.amount = sliderAmount;
      }

      if (formData.frequency === 'monthly' || formData.frequency === 'quarterly' || formData.frequency === 'yearly') {
        recurringData.deposit_date = formData.deposit_date ? parseInt(formData.deposit_date) : new Date(formData.date).getDate();
      }

      submitData.recurringDeposit = recurringData;
      submitData.amount = recurringData.amount;
    } else {
      submitData.amount = parseFloat(formData.amount);
    }

    onSubmit(submitData);
  };

  const getTitle = () => {
    if (type === 'bank_deposit') return 'Bank Deposit';
    if (type === 'bank_payment') return 'Bank Payment';
    if (type === 'card_payment') return 'Card Payment';
    if (type === 'bill_payment') return 'Bill Payment';
    if (type === 'loan_payment') return 'Loan Payment';
    if (type === 'bank_balance_update') return 'Update Balance';
    if (type === 'card_balance_update') return 'Update Balance';
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
        <p className="text-sm text-slate-500 mb-1">{getTitle()}</p>
        {(type === 'bank_balance_update' || type === 'card_balance_update') && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-slate-600">
              Current Balance: <span className="font-semibold">{formatCurrency(target.balance, target.currency)}</span>
            </p>
            {target.last_balance_override && (
              <p className="text-xs text-slate-500 mt-1">
                Last updated: {new Date(target.last_balance_override).toLocaleString()}
              </p>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'bank_deposit' && (
            <div className="flex items-center space-x-2 py-2 border-b">
              <input
                type="checkbox"
                id="isRecurring"
                checked={formData.is_recurring}
                onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300"
              />
              <Label htmlFor="isRecurring" className="cursor-pointer">
                Make this a recurring deposit
              </Label>
            </div>
          )}

          {type === 'bank_deposit' && formData.is_recurring && (
            <>
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
            </>
          )}

          {(type === 'bank_balance_update' || type === 'card_balance_update') && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800 font-medium mb-1">⚠️ Balance Override</p>
              <p className="text-xs text-yellow-700">
                This will replace the current balance with your new value. Transaction history remains unchanged.
              </p>
            </div>
          )}

          {type === 'bank_deposit' && formData.is_recurring && formData.amount_type === 'variable' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="minAmount">Minimum Amount</Label>
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
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAmount">Maximum Amount</Label>
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
                    required
                  />
                </div>
              </div>
              {formData.min_amount && formData.max_amount && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Estimated Amount</Label>
                    <span className="text-sm font-medium text-slate-700">
                      {formatCurrency(sliderAmount, target.currency)}
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
                </div>
              )}
            </div>
          ) : (
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
          )}



          {type === 'bank_deposit' && formData.is_recurring && (
            <>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="bi_weekly">Bi-Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(formData.frequency === 'monthly' || formData.frequency === 'quarterly' || formData.frequency === 'yearly') && (
                <div className="space-y-2">
                  <Label htmlFor="depositDate">Deposit Date (Day of Month)</Label>
                  <Input
                    id="depositDate"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="e.g., 15"
                    value={formData.deposit_date}
                    onChange={(e) => setFormData({ ...formData, deposit_date: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
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
            </>
          )}

          {!formData.is_recurring && (
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          )}

          {(type === 'bank_deposit' || type === 'bank_payment') && (
            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={type === 'bank_deposit' ? 'e.g., Salary payment' : 'e.g., Rent payment'}
                required
              />
            </div>
          )}

          {type === 'bill_payment' && bankAccounts && bankAccounts.length > 0 && (
            <div>
              <Label>Pay From Bank Account</Label>
              <Select
                value={formData.bank_account_id}
                onValueChange={(value) => setFormData({ ...formData, bank_account_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({formatCurrency(account.balance, account.currency)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Updating...' : 
                type === 'bank_balance_update' ? 'Update Balance' :
                type === 'card_balance_update' ? 'Update Balance' :
                type === 'bank_deposit' ? 'Add Deposit' : 'Add Payment'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
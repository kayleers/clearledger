import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, Plus, Edit2, Trash2, TrendingDown, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatCurrency } from '@/components/utils/calculations';
import CurrencySelector from '@/components/currency/CurrencySelector';
import { useAccessControl } from '@/components/access/useAccessControl';
import UpgradeDialog from '@/components/access/UpgradeDialog';

const loanTypeIcons = {
  mortgage: '🏠',
  auto: '🚗',
  personal: '💰',
  student: '🎓',
  business: '💼',
  other: '📄'
};

const loanTypeLabels = {
  mortgage: 'Mortgage',
  auto: 'Auto Loan',
  personal: 'Personal Loan',
  student: 'Student Loan',
  business: 'Business Loan',
  other: 'Other Loan'
};

export default function MortgageLoanList({ loans = [], bankAccounts = [], creditCards = [], dragHandleProps }) {
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [editingProjected, setEditingProjected] = useState(null);
  const [projectedPayment, setProjectedPayment] = useState('');
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const queryClient = useQueryClient();
  const accessControl = useAccessControl();

  const createLoanMutation = useMutation({
    mutationFn: (data) => base44.entities.MortgageLoan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mortgage-loans'] });
      setShowAddLoan(false);
    }
  });

  const updateLoanMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MortgageLoan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mortgage-loans'] });
      setEditingLoan(null);
    }
  });

  const deleteLoanMutation = useMutation({
    mutationFn: (id) => base44.entities.MortgageLoan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mortgage-loans'] });
    }
  });

  const updateLoanOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MortgageLoan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mortgage-loans'] });
    }
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(loans);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    items.forEach((loan, index) => {
      updateLoanOrderMutation.mutate({
        id: loan.id,
        data: { display_order: index }
      });
    });
  };

  const canAddLoan = accessControl.canAddLoan(loans.length);

  const handleAddLoanClick = () => {
    if (canAddLoan) {
      setShowAddLoan(true);
    } else {
      setShowUpgradeDialog(true);
    }
  };

  const calculateProgress = (current, original) => {
    const paid = original - current;
    return Math.round((paid / original) * 100);
  };

  return (
    <div className="space-y-4">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {dragHandleProps && (
              <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
                <GripVertical className="w-5 h-5 text-slate-400" />
              </div>
            )}
            <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity">
              <div>
                <h2 className="text-xl font-bold text-emerald-400">Loans</h2>
                {(() => {
                  const totalsByCurrency = {};
                  loans.forEach(loan => {
                    const curr = loan.currency || 'USD';
                    totalsByCurrency[curr] = (totalsByCurrency[curr] || 0) + loan.current_balance;
                  });
                  return Object.keys(totalsByCurrency).length > 0 && (
                    <div className="flex gap-2 mt-1">
                      {Object.entries(totalsByCurrency).map(([curr, total]) => (
                        <span key={curr} className="text-xs text-slate-400">
                          {formatCurrency(total, curr)}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </CollapsibleTrigger>
          </div>
          <Button
            size="sm"
            onClick={handleAddLoanClick}
            className="bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Loan
          </Button>
        </div>

        <CollapsibleContent>
          <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="mortgage-loans">
          {(provided) => (
            <div className="grid gap-3" {...provided.droppableProps} ref={provided.innerRef}>
              {loans.map((loan, index) => {
                const account = bankAccounts.find(a => a.id === loan.bank_account_id);
                const progress = calculateProgress(loan.current_balance, loan.loan_amount);
                const currency = loan.currency || 'USD';

                return (
                  <Draggable key={loan.id} draggableId={loan.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                      >
                        <Link to={createPageUrl('LoanDetail') + `?id=${loan.id}`}>
                          <Card className="border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-4">
                <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing" onClick={(e) => e.preventDefault()}>
                      <GripVertical className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-lg">
                      {loanTypeIcons[loan.loan_type] || '📄'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{loan.name}</p>
                      <p className="text-xs text-slate-500">{loanTypeLabels[loan.loan_type]}</p>
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.preventDefault()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.preventDefault();
                          setEditingLoan(loan);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={(e) => {
                          e.preventDefault();
                          if (confirm('Delete this loan?')) {
                            deleteLoanMutation.mutate(loan.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500">Balance</p>
                      <p className="font-semibold text-lg">{formatCurrency(loan.current_balance, currency)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Min Payment</p>
                      <p className="font-semibold text-lg">{formatCurrency(loan.monthly_payment, currency)}</p>
                    </div>
                  </div>

                  {/* Projected Payment Section */}
                  <div className="pt-3 border-t" onClick={(e) => e.preventDefault()}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-slate-500">Projected Payment</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={(e) => {
                          e.preventDefault();
                          setEditingProjected(loan);
                          setProjectedPayment('');
                        }}
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                    <p className="text-base font-bold text-blue-600">
                      {formatCurrency(loan.projected_monthly_payment || loan.monthly_payment, currency)}/mo
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Paid {progress}%</span>
                      <span>{formatCurrency(loan.loan_amount - loan.current_balance, currency)} of {formatCurrency(loan.loan_amount, currency)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t">
                    <div className="text-slate-500">
                      {(loan.interest_rate * 100).toFixed(2)}% APR
                      {loan.payment_due_date && ` • Due ${loan.payment_due_date}${getOrdinalSuffix(loan.payment_due_date)}`}
                    </div>
                    {account && (
                      <div className="text-slate-400">
                        {account.name}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
                        </Link>
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

      {loans.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Home className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">No loans yet</p>
            <Button onClick={handleAddLoanClick}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Loan
            </Button>
          </CardContent>
        </Card>
      )}
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={showAddLoan} onOpenChange={setShowAddLoan}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full">
          <DialogHeader className="p-6 pb-4 flex-shrink-0">
            <DialogTitle>Add Mortgage/Loan</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 pb-6 flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            <MortgageLoanForm
            bankAccounts={bankAccounts}
            creditCards={[]}
            onSubmit={(data) => createLoanMutation.mutate(data)}
            isLoading={createLoanMutation.isPending}
          />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingLoan} onOpenChange={() => setEditingLoan(null)}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full">
          <DialogHeader className="p-6 pb-4 flex-shrink-0">
            <DialogTitle>Edit Mortgage/Loan</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 pb-6 flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            <MortgageLoanForm
            loan={editingLoan}
            bankAccounts={bankAccounts}
            creditCards={[]}
            onSubmit={(data) => updateLoanMutation.mutate({ id: editingLoan.id, data })}
            isLoading={updateLoanMutation.isPending}
          />
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        context="loans"
      />

      {/* Edit Projected Payment Dialog */}
      <Dialog open={!!editingProjected} onOpenChange={() => setEditingProjected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Projected Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Projected Monthly Payment</Label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={editingProjected?.monthly_payment.toString()}
                  value={projectedPayment}
                  onChange={(e) => setProjectedPayment(e.target.value)}
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Minimum: {editingProjected && formatCurrency(editingProjected.monthly_payment, editingProjected.currency)}
              </p>
            </div>
            <Button
              onClick={() => {
                if (editingProjected && projectedPayment) {
                  updateLoanMutation.mutate({
                    id: editingProjected.id,
                    data: { projected_monthly_payment: parseFloat(projectedPayment) }
                  });
                  setProjectedPayment('');
                  setEditingProjected(null);
                }
              }}
              className="w-full"
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MortgageLoanForm({ loan, bankAccounts, creditCards = [], onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    name: loan?.name || '',
    loan_amount: loan?.loan_amount?.toString() || '',
    current_balance: loan?.current_balance?.toString() || '',
    interest_rate: loan?.interest_rate ? (loan.interest_rate * 100).toString() : '',
    monthly_payment: loan?.monthly_payment?.toString() || '',
    loan_term_months: loan?.loan_term_months?.toString() || '',
    start_date: loan?.start_date || '',
    currency: loan?.currency || 'USD',
    bank_account_id: loan?.bank_account_id || '',
    loan_type: loan?.loan_type || 'other',
    payment_due_date: loan?.payment_due_date?.toString() || ''
  });

  const getCurrencySymbol = (currencyCode) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(0).replace(/\d/g, '').trim();
    } catch {
      return '$';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      loan_amount: parseFloat(formData.loan_amount) || 0,
      current_balance: parseFloat(formData.current_balance) || 0,
      interest_rate: parseFloat(formData.interest_rate) / 100 || 0,
      monthly_payment: parseFloat(formData.monthly_payment) || 0,
      loan_term_months: formData.loan_term_months ? parseInt(formData.loan_term_months) : null,
      start_date: formData.start_date || null,
      currency: formData.currency,
      bank_account_id: formData.bank_account_id || null,
      loan_type: formData.loan_type,
      payment_due_date: formData.payment_due_date ? parseInt(formData.payment_due_date) : null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="loanName">Loan Name</Label>
        <Input
          id="loanName"
          placeholder="e.g., Home Mortgage, Car Loan"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="loanType">Loan Type</Label>
        <select
          id="loanType"
          value={formData.loan_type}
          onChange={(e) => setFormData({ ...formData, loan_type: e.target.value })}
          className="w-full h-10 px-3 rounded-md border border-slate-200"
        >
          <option value="mortgage">Mortgage</option>
          <option value="auto">Auto Loan</option>
          <option value="personal">Personal Loan</option>
          <option value="student">Student Loan</option>
          <option value="business">Business Loan</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="loanCurrency">Currency</Label>
        <CurrencySelector
          value={formData.currency}
          onChange={(currency) => setFormData({ ...formData, currency })}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="loanAmount">Original Loan Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{getCurrencySymbol(formData.currency)}</span>
            <Input
              id="loanAmount"
              type="number"
              step="0.01"
              value={formData.loan_amount}
              onChange={(e) => setFormData({ ...formData, loan_amount: e.target.value })}
              className="pl-7"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="currentBalance">Current Balance</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{getCurrencySymbol(formData.currency)}</span>
            <Input
              id="currentBalance"
              type="number"
              step="0.01"
              value={formData.current_balance}
              onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
              className="pl-7"
              required
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="interestRate">Interest Rate (%)</Label>
          <Input
            id="interestRate"
            type="number"
            step="0.01"
            placeholder="e.g., 3.75"
            value={formData.interest_rate}
            onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthlyPayment">Monthly Payment</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{getCurrencySymbol(formData.currency)}</span>
            <Input
              id="monthlyPayment"
              type="number"
              step="0.01"
              value={formData.monthly_payment}
              onChange={(e) => setFormData({ ...formData, monthly_payment: e.target.value })}
              className="pl-7"
              required
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="loanTerm">Loan Term (months)</Label>
          <Input
            id="loanTerm"
            type="number"
            placeholder="e.g., 360"
            value={formData.loan_term_months}
            onChange={(e) => setFormData({ ...formData, loan_term_months: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentDueDate">Due Date (Day of Month)</Label>
          <Input
            id="paymentDueDate"
            type="number"
            min="1"
            max="31"
            placeholder="e.g., 1"
            value={formData.payment_due_date}
            onChange={(e) => setFormData({ ...formData, payment_due_date: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="startDate">Start Date (Optional)</Label>
        <Input
          id="startDate"
          type="date"
          value={formData.start_date}
          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bankAccount">Payment Source (Optional)</Label>
        <select
          id="bankAccount"
          value={formData.bank_account_id}
          onChange={(e) => setFormData({ ...formData, bank_account_id: e.target.value })}
          className="w-full h-10 px-3 rounded-md border border-slate-200"
        >
          <option value="">None</option>
          <optgroup label="Bank Accounts">
            {bankAccounts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map(account => (
              <option key={account.id} value={account.id}>
                {account.name} {account.account_number ? `(${account.account_number})` : ''} - {account.currency}
              </option>
            ))}
          </optgroup>
          <optgroup label="Credit Cards">
            {creditCards.filter(c => c.is_active !== false).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map(card => (
              <option key={card.id} value={card.id}>
                {card.name} {card.card_last_four ? `(••••${card.card_last_four})` : ''} - {card.currency}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Saving...' : loan ? 'Update Loan' : 'Add Loan'}
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
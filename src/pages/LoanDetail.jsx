import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Calculator, 
  Receipt, 
  Bookmark,
  Wallet,
  Loader2,
  Edit2,
  Trash2,
  AlertTriangle,
  Home
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import LoanPayoffSimulator from '@/components/loans/LoanPayoffSimulator';
import SavedScenarios from '@/components/scenarios/SavedScenarios';
import { useAccessControl } from '@/components/access/useAccessControl';
import UpgradeDialog from '@/components/access/UpgradeDialog';
import { formatCurrency } from '@/components/utils/calculations';

const loanTypeIcons = {
  mortgage: '🏠',
  auto: '🚗',
  personal: '💰',
  student: '🎓',
  business: '💼',
  other: '📄'
};

export default function LoanDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const loanId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('simulator');
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [showSaveScenario, setShowSaveScenario] = useState(false);
  const [pendingScenario, setPendingScenario] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [projectedPayment, setProjectedPayment] = useState('');
  const [isEditingProjected, setIsEditingProjected] = useState(false);
  const accessControl = useAccessControl();

  // Fetch loan
  const { data: loan, isLoading: loanLoading } = useQuery({
    queryKey: ['mortgage-loan', loanId],
    queryFn: async () => {
      const loans = await base44.entities.MortgageLoan.filter({ id: loanId });
      return loans[0];
    },
    enabled: !!loanId
  });

  // Fetch payments
  const { data: payments = [] } = useQuery({
    queryKey: ['loan-payments', loanId],
    queryFn: () => base44.entities.LoanPayment.filter({ loan_id: loanId }, '-date'),
    enabled: !!loanId
  });

  // Fetch scenarios
  const { data: scenarios = [] } = useQuery({
    queryKey: ['loan-scenarios', loanId],
    queryFn: () => base44.entities.LoanPayoffScenario.filter({ loan_id: loanId }, '-created_date'),
    enabled: !!loanId
  });

  const updateLoanMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MortgageLoan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mortgage-loan', loanId] });
      queryClient.invalidateQueries({ queryKey: ['mortgage-loans'] });
    }
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData) => {
      await base44.entities.LoanPayment.create({ ...paymentData, loan_id: loanId });
      await base44.entities.MortgageLoan.update(loanId, {
        current_balance: Math.max(0, loan.current_balance - paymentData.amount)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-payments', loanId] });
      queryClient.invalidateQueries({ queryKey: ['mortgage-loan', loanId] });
      queryClient.invalidateQueries({ queryKey: ['mortgage-loans'] });
      setShowAddPayment(false);
    }
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (payment) => {
      await base44.entities.LoanPayment.delete(payment.id);
      await base44.entities.MortgageLoan.update(loanId, {
        current_balance: loan.current_balance + payment.amount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-payments', loanId] });
      queryClient.invalidateQueries({ queryKey: ['mortgage-loan', loanId] });
      queryClient.invalidateQueries({ queryKey: ['mortgage-loans'] });
    }
  });

  const createScenarioMutation = useMutation({
    mutationFn: (scenarioData) => base44.entities.LoanPayoffScenario.create({
      ...scenarioData,
      loan_id: loanId,
      name: scenarioName || `Scenario ${scenarios.length + 1}`
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-scenarios', loanId] });
      setShowSaveScenario(false);
      setScenarioName('');
      setPendingScenario(null);
    }
  });

  const deleteScenarioMutation = useMutation({
    mutationFn: (scenario) => base44.entities.LoanPayoffScenario.delete(scenario.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-scenarios', loanId] });
    }
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (scenario) => base44.entities.LoanPayoffScenario.update(scenario.id, {
      is_favorite: !scenario.is_favorite
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-scenarios', loanId] });
    }
  });

  const deleteLoanMutation = useMutation({
    mutationFn: (id) => base44.entities.MortgageLoan.delete(id),
    onSuccess: () => {
      window.location.href = createPageUrl('Dashboard');
    }
  });

  if (loanLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Home className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-slate-500 mb-4">Loan not found</p>
        <Link to={createPageUrl('Dashboard')}>
          <Button variant="outline">Go to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const currency = loan.currency || 'USD';
  const progress = Math.round(((loan.loan_amount - loan.current_balance) / loan.loan_amount) * 100);

  const handleSaveScenario = (scenarioData) => {
    if (!accessControl.canAddScenario(scenarios.length)) {
      setShowUpgradeDialog(true);
      return;
    }
    setPendingScenario(scenarioData);
    setShowSaveScenario(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white px-4 pt-6 pb-20">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-xl text-2xl">
              {loanTypeIcons[loan.loan_type]}
            </div>
            <div>
              <h1 className="text-xl font-bold">{loan.name}</h1>
              <p className="text-white/70 text-sm">{(loan.interest_rate * 100).toFixed(2)}% APR</p>
            </div>
          </div>

          <div className="text-4xl font-bold mb-2">{formatCurrency(loan.current_balance, currency)}</div>
          <p className="text-white/70 text-sm">
            {formatCurrency(loan.loan_amount - loan.current_balance, currency)} paid • {progress}% complete
          </p>
        </div>
      </div>

      {/* Content Card */}
      <div className="max-w-lg mx-auto px-4 -mt-12 relative z-10">
        {/* Quick Stats */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-center mb-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Monthly Payment</p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(loan.monthly_payment, currency)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Total Paid</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(loan.loan_amount - loan.current_balance, currency)}</p>
              </div>
            </div>

            {/* Projected Payment Section */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500">Projected Payment</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setIsEditingProjected(!isEditingProjected)}
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  {isEditingProjected ? 'Cancel' : 'Edit'}
                </Button>
              </div>
              {isEditingProjected ? (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={loan.monthly_payment.toString()}
                      value={projectedPayment}
                      onChange={(e) => setProjectedPayment(e.target.value)}
                      className="pl-7 h-9"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (projectedPayment) {
                        updateLoanMutation.mutate({ 
                          id: loanId, 
                          data: { projected_monthly_payment: parseFloat(projectedPayment) }
                        });
                      }
                      setIsEditingProjected(false);
                    }}
                    className="h-9"
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <p className="text-lg font-bold text-blue-600 text-center">
                  {formatCurrency(loan.projected_monthly_payment || loan.monthly_payment, currency)}
                </p>
              )}
              <p className="text-xs text-slate-400 mt-1 text-center">
                Your planned monthly payment amount
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{progress}% paid off</span>
                {loan.payment_due_date && (
                  <span>Due: {loan.payment_due_date}{getOrdinalSuffix(loan.payment_due_date)}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <Button
          className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 mb-4"
          onClick={() => setShowAddPayment(true)}
        >
          <Wallet className="w-5 h-5 mr-2" />
          Make Payment
        </Button>

        {/* Add Payment Form */}
        <AnimatePresence>
          {showAddPayment && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mb-4"
            >
              <LoanPaymentForm
                loan={loan}
                onSubmit={(data) => createPaymentMutation.mutate(data)}
                onCancel={() => setShowAddPayment(false)}
                isLoading={createPaymentMutation.isPending}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full mb-4">
            <TabsTrigger value="simulator" className="text-xs">
              <Calculator className="w-4 h-4 mr-1" />
              Simulator
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <Receipt className="w-4 h-4 mr-1" />
              History
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="text-xs">
              <Bookmark className="w-4 h-4 mr-1" />
              Saved
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simulator">
            <LoanPayoffSimulator 
              loan={loan} 
              onSaveScenario={handleSaveScenario}
              payments={payments}
            />
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Payment History</h3>
                <LoanPaymentList 
                  payments={payments}
                  currency={currency}
                  onDelete={(p) => deletePaymentMutation.mutate(p)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scenarios">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800">Saved Payoff Plans</h3>
              <SavedScenarios 
                scenarios={scenarios}
                currency={currency}
                onDelete={(s) => deleteScenarioMutation.mutate(s)}
                onToggleFavorite={(s) => toggleFavoriteMutation.mutate(s)}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Scenario Dialog */}
        <Dialog open={showSaveScenario} onOpenChange={setShowSaveScenario}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Payoff Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scenarioName">Plan Name</Label>
                <Input
                  id="scenarioName"
                  placeholder="e.g., Aggressive Payoff, Extra Payments"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                />
              </div>
              {pendingScenario && (
                <div className="p-4 bg-slate-50 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Months to Payoff</span>
                    <span className="font-medium">{pendingScenario.months_to_payoff}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Interest</span>
                    <span className="font-medium">{formatCurrency(pendingScenario.total_interest, currency)}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveScenario(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => pendingScenario && createScenarioMutation.mutate(pendingScenario)}
                disabled={createScenarioMutation.isPending}
              >
                {createScenarioMutation.isPending ? 'Saving...' : 'Save Plan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Delete Loan
              </DialogTitle>
            </DialogHeader>
            <p className="text-slate-600">
              Are you sure you want to delete "{loan.name}"? This will also delete all payments and saved scenarios for this loan.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => deleteLoanMutation.mutate(loanId)}
                disabled={deleteLoanMutation.isPending}
              >
                {deleteLoanMutation.isPending ? 'Deleting...' : 'Delete Loan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <UpgradeDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          context="savedScenarios"
        />
      </div>
    </div>
  );
}

function LoanPaymentForm({ loan, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      amount: parseFloat(formData.amount) || 0,
      date: formData.date,
      note: formData.note
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Payment Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="pl-7"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, amount: loan.monthly_payment.toString() })}
              >
                Regular ({formatCurrency(loan.monthly_payment, loan.currency)})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, amount: loan.current_balance.toString() })}
              >
                Full Balance ({formatCurrency(loan.current_balance, loan.currency)})
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Note (Optional)</Label>
            <Input
              placeholder="e.g., Extra payment"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
              {isLoading ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function LoanPaymentList({ payments = [], currency, onDelete }) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>No payments recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {payments.map((payment) => (
        <div 
          key={payment.id}
          className="flex items-center justify-between p-3 bg-white rounded-xl border hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-slate-800">Payment</p>
              <p className="text-xs text-slate-400">
                {new Date(payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {payment.note && ` • ${payment.note}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-emerald-600">
              {formatCurrency(payment.amount, currency)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-red-500"
              onClick={() => {
                if (confirm('Delete this payment?')) {
                  onDelete(payment);
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
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
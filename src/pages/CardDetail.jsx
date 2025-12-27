import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  CreditCard, 
  Calculator, 
  Receipt, 
  Bookmark,
  Plus,
  Wallet,
  ShoppingBag,
  Loader2,
  Settings,
  Trash2,
  Edit2,
  AlertTriangle,
  Zap,
  PlusCircle
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import PayoffSimulator from '@/components/simulator/PayoffSimulator';
import AddPurchaseForm from '@/components/transactions/AddPurchaseForm';
import AddPaymentForm from '@/components/transactions/AddPaymentForm';
import TransactionList from '@/components/transactions/TransactionList';
import SavedScenarios from '@/components/scenarios/SavedScenarios';
import { 
  formatCurrency, 
  calculateUtilization, 
  calculateMinimumPayment,
  calculateMonthlyInterest,
  calculatePaymentFor3YearPayoff,
  getUtilizationColor,
  getUtilizationBgColor
} from '@/components/utils/calculations';

const cardColors = {
  blue: 'from-blue-600 to-blue-800',
  purple: 'from-purple-600 to-purple-800',
  green: 'from-emerald-600 to-emerald-800',
  red: 'from-rose-600 to-rose-800',
  orange: 'from-orange-500 to-orange-700',
  slate: 'from-slate-600 to-slate-800',
  indigo: 'from-indigo-600 to-indigo-800',
  pink: 'from-pink-500 to-pink-700'
};

export default function CardDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const cardId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('simulator');
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showEditCard, setShowEditCard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [showSaveScenario, setShowSaveScenario] = useState(false);
  const [pendingScenario, setPendingScenario] = useState(null);

  // Fetch card
  const { data: card, isLoading: cardLoading } = useQuery({
    queryKey: ['credit-card', cardId],
    queryFn: async () => {
      const cards = await base44.entities.CreditCard.filter({ id: cardId });
      return cards[0];
    },
    enabled: !!cardId
  });

  // Fetch purchases
  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases', cardId],
    queryFn: () => base44.entities.Purchase.filter({ card_id: cardId }, '-date'),
    enabled: !!cardId
  });

  // Fetch payments
  const { data: payments = [] } = useQuery({
    queryKey: ['payments', cardId],
    queryFn: () => base44.entities.Payment.filter({ card_id: cardId }, '-date'),
    enabled: !!cardId
  });

  // Fetch scenarios
  const { data: scenarios = [] } = useQuery({
    queryKey: ['scenarios', cardId],
    queryFn: () => base44.entities.PayoffScenario.filter({ card_id: cardId }, '-created_date'),
    enabled: !!cardId
  });

  // Mutations
  const updateCardMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CreditCard.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-card', cardId] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
    }
  });

  const deleteCardMutation = useMutation({
    mutationFn: (id) => base44.entities.CreditCard.delete(id),
    onSuccess: () => {
      window.location.href = createPageUrl('Dashboard');
    }
  });

  const createPurchaseMutation = useMutation({
    mutationFn: async (purchaseData) => {
      await base44.entities.Purchase.create({ ...purchaseData, card_id: cardId });
      await base44.entities.CreditCard.update(cardId, {
        balance: card.balance + purchaseData.amount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases', cardId] });
      queryClient.invalidateQueries({ queryKey: ['credit-card', cardId] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      setShowAddPurchase(false);
    }
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData) => {
      await base44.entities.Payment.create({ ...paymentData, card_id: cardId });
      await base44.entities.CreditCard.update(cardId, {
        balance: Math.max(0, card.balance - paymentData.amount)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', cardId] });
      queryClient.invalidateQueries({ queryKey: ['credit-card', cardId] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      setShowAddPayment(false);
    }
  });

  const deletePurchaseMutation = useMutation({
    mutationFn: async (purchase) => {
      await base44.entities.Purchase.delete(purchase.id);
      await base44.entities.CreditCard.update(cardId, {
        balance: Math.max(0, card.balance - purchase.amount)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases', cardId] });
      queryClient.invalidateQueries({ queryKey: ['credit-card', cardId] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
    }
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (payment) => {
      await base44.entities.Payment.delete(payment.id);
      await base44.entities.CreditCard.update(cardId, {
        balance: card.balance + payment.amount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', cardId] });
      queryClient.invalidateQueries({ queryKey: ['credit-card', cardId] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
    }
  });

  const createScenarioMutation = useMutation({
    mutationFn: (scenarioData) => base44.entities.PayoffScenario.create({
      ...scenarioData,
      card_id: cardId,
      name: scenarioName || `Scenario ${scenarios.length + 1}`
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios', cardId] });
      setShowSaveScenario(false);
      setScenarioName('');
      setPendingScenario(null);
    }
  });

  const deleteScenarioMutation = useMutation({
    mutationFn: (scenario) => base44.entities.PayoffScenario.delete(scenario.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios', cardId] });
    }
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (scenario) => base44.entities.PayoffScenario.update(scenario.id, {
      is_favorite: !scenario.is_favorite
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios', cardId] });
    }
  });

  if (cardLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <CreditCard className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-slate-500 mb-4">Card not found</p>
        <Link to={createPageUrl('Dashboard')}>
          <Button variant="outline">Go to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const utilization = calculateUtilization(card.balance, card.credit_limit);
  const minPayment = calculateMinimumPayment(card.min_payment, card.balance);
  const monthlyInterest = calculateMonthlyInterest(card.balance, card.apr);
  const threeYearPayment = calculatePaymentFor3YearPayoff(card.balance, card.apr);
  const gradient = cardColors[card.color] || cardColors.slate;

  const handleSaveScenario = (scenarioData) => {
    setPendingScenario(scenarioData);
    setShowSaveScenario(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-24">
      {/* Header */}
      <div className={`bg-gradient-to-r ${gradient} text-white px-4 pt-6 pb-20`}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex gap-2">
              <Dialog open={showEditCard} onOpenChange={setShowEditCard}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                    <Edit2 className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit Card</DialogTitle>
                  </DialogHeader>
                  <EditCardForm 
                    card={card} 
                    onSave={(data) => {
                      updateCardMutation.mutate({ id: cardId, data });
                      setShowEditCard(false);
                    }}
                  />
                </DialogContent>
              </Dialog>
              <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      Delete Card
                    </DialogTitle>
                  </DialogHeader>
                  <p className="text-slate-600">
                    Are you sure you want to delete "{card.name}"? This will also delete all purchases, payments, and saved scenarios for this card.
                  </p>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => deleteCardMutation.mutate(cardId)}
                      disabled={deleteCardMutation.isPending}
                    >
                      {deleteCardMutation.isPending ? 'Deleting...' : 'Delete Card'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{card.name}</h1>
              <p className="text-white/70 text-sm">{(card.apr * 100).toFixed(2)}% APR</p>
            </div>
          </div>

          <div className="text-4xl font-bold mb-2">{formatCurrency(card.balance)}</div>
          <p className="text-white/70 text-sm">
            {formatCurrency(card.credit_limit - card.balance)} available
          </p>
        </div>
      </div>

      {/* Content Card */}
      <div className="max-w-lg mx-auto px-4 -mt-12 relative z-10">
        {/* Quick Stats */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-500 mb-1">Credit Used</p>
                <p className={`text-lg font-bold ${getUtilizationColor(utilization)}`}>
                  {utilization}%
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Min Payment</p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(minPayment)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Monthly Interest</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(monthlyInterest)}</p>
              </div>
            </div>

            {/* Utilization Bar */}
            <div className="mt-4">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${getUtilizationBgColor(utilization)}`}
                  style={{ width: `${Math.min(utilization, 100)}%` }}
                />
              </div>
            </div>

            {/* Payment Info */}
            <div className="mt-4 pt-4 border-t space-y-2">
              <div className="flex items-center justify-between text-sm">
                {card.due_date && (
                  <div className="text-slate-600">
                    <span className="text-slate-400">Due:</span> {card.due_date}{getOrdinalSuffix(card.due_date)} of month
                  </div>
                )}
                {card.payment_method === 'autopay' ? (
                  <div className="flex items-center gap-1 text-blue-600">
                    <Zap className="w-3 h-3" />
                    <span className="font-medium">Autopay</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-slate-500">
                    <span className="font-medium">Manual</span>
                  </div>
                )}
              </div>
              {card.additional_payment_enabled && (
                <div className="flex items-center justify-between text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded">
                  <div className="flex items-center gap-1">
                    <PlusCircle className="w-3 h-3" />
                    <span>Additional {card.additional_payment_type === 'one_time' ? 'one-time' : 'recurring'} payment</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(card.additional_payment_amount)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button
            className="h-14 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setShowAddPayment(true)}
          >
            <Wallet className="w-5 h-5 mr-2" />
            Make Payment
          </Button>
          <Button
            variant="outline"
            className="h-14"
            onClick={() => setShowAddPurchase(true)}
          >
            <ShoppingBag className="w-5 h-5 mr-2" />
            Add Purchase
          </Button>
        </div>

        {/* Add Purchase/Payment Forms */}
        <AnimatePresence>
          {showAddPurchase && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mb-4"
            >
              <AddPurchaseForm
                onSubmit={(data) => createPurchaseMutation.mutate(data)}
                onCancel={() => setShowAddPurchase(false)}
                isLoading={createPurchaseMutation.isPending}
              />
            </motion.div>
          )}
          {showAddPayment && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mb-4"
            >
              <AddPaymentForm
                card={card}
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
            <PayoffSimulator 
              card={card} 
              onSaveScenario={handleSaveScenario}
            />
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                <TransactionList 
                  purchases={purchases}
                  payments={payments}
                  onDeletePurchase={(p) => deletePurchaseMutation.mutate(p)}
                  onDeletePayment={(p) => deletePaymentMutation.mutate(p)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scenarios">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800">Saved Payoff Plans</h3>
              <SavedScenarios 
                scenarios={scenarios}
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
                  placeholder="e.g., Aggressive Payoff, Budget Plan"
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
                    <span className="font-medium">{formatCurrency(pendingScenario.total_interest)}</span>
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
      </div>
    </div>
  );
}

// Helper function for ordinal suffix
function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// Edit Card Form Component
function EditCardForm({ card, onSave }) {
  const [formData, setFormData] = useState({
    name: card.name || '',
    balance: card.balance?.toString() || '',
    credit_limit: card.credit_limit?.toString() || '',
    apr: ((card.apr || 0) * 100).toString(),
    min_payment: card.min_payment?.toString() || '',
    due_date: card.due_date?.toString() || '',
    payment_method: card.payment_method || 'manual',
    autopay_date: card.autopay_date?.toString() || '',
    autopay_amount_type: card.autopay_amount_type || 'minimum',
    autopay_custom_amount: card.autopay_custom_amount?.toString() || '',
    autopay_start_date: card.autopay_start_date || '',
    autopay_end_date: card.autopay_end_date || '',
    additional_payment_enabled: card.additional_payment_enabled || false,
    additional_payment_type: card.additional_payment_type || 'recurring',
    additional_payment_amount: card.additional_payment_amount?.toString() || '',
    additional_payment_date: card.additional_payment_date?.toString() || '',
    additional_payment_start_date: card.additional_payment_start_date || '',
    additional_payment_end_date: card.additional_payment_end_date || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const saveData = {
      name: formData.name,
      balance: parseFloat(formData.balance) || 0,
      credit_limit: parseFloat(formData.credit_limit) || 0,
      apr: parseFloat(formData.apr) / 100 || 0,
      min_payment: parseFloat(formData.min_payment) || 0,
      due_date: formData.due_date ? parseInt(formData.due_date) : null,
      payment_method: formData.payment_method
    };

    if (formData.payment_method === 'autopay') {
      saveData.autopay_date = formData.autopay_date ? parseInt(formData.autopay_date) : null;
      saveData.autopay_amount_type = formData.autopay_amount_type;
      saveData.autopay_custom_amount = formData.autopay_amount_type === 'custom' 
        ? parseFloat(formData.autopay_custom_amount) || 0 
        : null;
      saveData.autopay_start_date = formData.autopay_start_date || null;
      saveData.autopay_end_date = formData.autopay_end_date || null;
    }

    // Additional payments
    saveData.additional_payment_enabled = formData.additional_payment_enabled;
    if (formData.additional_payment_enabled) {
      saveData.additional_payment_type = formData.additional_payment_type;
      saveData.additional_payment_amount = parseFloat(formData.additional_payment_amount) || 0;
      saveData.additional_payment_date = formData.additional_payment_date ? parseInt(formData.additional_payment_date) : null;
      saveData.additional_payment_start_date = formData.additional_payment_start_date || null;
      saveData.additional_payment_end_date = formData.additional_payment_type === 'recurring' 
        ? (formData.additional_payment_end_date || null)
        : null;
    }

    onSave(saveData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="space-y-2">
        <Label htmlFor="editName">Card Name</Label>
        <Input
          id="editName"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="editBalance">Balance</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
          <Input
            id="editBalance"
            type="number"
            step="0.01"
            value={formData.balance}
            onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
            className="pl-7"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="editLimit">Credit Limit</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
          <Input
            id="editLimit"
            type="number"
            step="0.01"
            value={formData.credit_limit}
            onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
            className="pl-7"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="editAPR">APR (%)</Label>
        <Input
          id="editAPR"
          type="number"
          step="0.01"
          value={formData.apr}
          onChange={(e) => setFormData({ ...formData, apr: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="editMinPayment">Minimum Payment</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
          <Input
            id="editMinPayment"
            type="number"
            step="0.01"
            value={formData.min_payment}
            onChange={(e) => setFormData({ ...formData, min_payment: e.target.value })}
            className="pl-7"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="editDueDate">Payment Due Date (Day of Month)</Label>
        <Input
          id="editDueDate"
          type="number"
          min="1"
          max="31"
          placeholder="e.g., 15"
          value={formData.due_date}
          onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
        />
      </div>

      <div className="pt-4 border-t space-y-4">
        <div className="space-y-2">
          <Label>Payment Method</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={formData.payment_method === 'manual' ? 'default' : 'outline'}
              onClick={() => setFormData({ ...formData, payment_method: 'manual' })}
              className="flex-1"
            >
              Manual
            </Button>
            <Button
              type="button"
              variant={formData.payment_method === 'autopay' ? 'default' : 'outline'}
              onClick={() => setFormData({ ...formData, payment_method: 'autopay' })}
              className="flex-1"
            >
              Autopay
            </Button>
          </div>
        </div>

        {formData.payment_method === 'autopay' && (
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900">Autopay Settings</h4>
            
            <div className="space-y-2">
              <Label htmlFor="autopayDate">Autopay Processing Date (Day of Month)</Label>
              <Input
                id="autopayDate"
                type="number"
                min="1"
                max="31"
                placeholder="e.g., 10"
                value={formData.autopay_date}
                onChange={(e) => setFormData({ ...formData, autopay_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Autopay Amount</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={formData.autopay_amount_type === 'minimum' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, autopay_amount_type: 'minimum' })}
                  size="sm"
                >
                  Minimum
                </Button>
                <Button
                  type="button"
                  variant={formData.autopay_amount_type === 'full_balance' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, autopay_amount_type: 'full_balance' })}
                  size="sm"
                >
                  Full
                </Button>
                <Button
                  type="button"
                  variant={formData.autopay_amount_type === 'custom' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, autopay_amount_type: 'custom' })}
                  size="sm"
                >
                  Custom
                </Button>
              </div>
            </div>

            {formData.autopay_amount_type === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="customAmount">Custom Autopay Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <Input
                    id="customAmount"
                    type="number"
                    step="0.01"
                    value={formData.autopay_custom_amount}
                    onChange={(e) => setFormData({ ...formData, autopay_custom_amount: e.target.value })}
                    className="pl-7"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="autopayStart">Autopay Start Date</Label>
              <Input
                id="autopayStart"
                type="date"
                value={formData.autopay_start_date}
                onChange={(e) => setFormData({ ...formData, autopay_start_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="autopayEnd">Autopay End Date (Optional)</Label>
              <Input
                id="autopayEnd"
                type="date"
                value={formData.autopay_end_date}
                onChange={(e) => setFormData({ ...formData, autopay_end_date: e.target.value })}
              />
              <p className="text-xs text-slate-500">Leave blank if autopay continues indefinitely</p>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-medium">Additional Payment</Label>
            <p className="text-xs text-slate-500">Set up extra payments beyond your {formData.payment_method === 'autopay' ? 'autopay' : 'regular'} payment</p>
          </div>
          <Button
            type="button"
            variant={formData.additional_payment_enabled ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFormData({ ...formData, additional_payment_enabled: !formData.additional_payment_enabled })}
          >
            {formData.additional_payment_enabled ? 'Enabled' : 'Disabled'}
          </Button>
        </div>

        {formData.additional_payment_enabled && (
          <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
            <div className="space-y-2">
              <Label>Payment Frequency</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.additional_payment_type === 'recurring' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, additional_payment_type: 'recurring' })}
                  className="flex-1"
                  size="sm"
                >
                  Recurring
                </Button>
                <Button
                  type="button"
                  variant={formData.additional_payment_type === 'one_time' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, additional_payment_type: 'one_time' })}
                  className="flex-1"
                  size="sm"
                >
                  One-Time
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalAmount">Additional Payment Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <Input
                  id="additionalAmount"
                  type="number"
                  step="0.01"
                  value={formData.additional_payment_amount}
                  onChange={(e) => setFormData({ ...formData, additional_payment_amount: e.target.value })}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalDate">Payment Date (Day of Month)</Label>
              <Input
                id="additionalDate"
                type="number"
                min="1"
                max="31"
                placeholder="e.g., 15"
                value={formData.additional_payment_date}
                onChange={(e) => setFormData({ ...formData, additional_payment_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalStart">Start Date</Label>
              <Input
                id="additionalStart"
                type="date"
                value={formData.additional_payment_start_date}
                onChange={(e) => setFormData({ ...formData, additional_payment_start_date: e.target.value })}
              />
            </div>

            {formData.additional_payment_type === 'recurring' && (
              <div className="space-y-2">
                <Label htmlFor="additionalEnd">End Date (Optional)</Label>
                <Input
                  id="additionalEnd"
                  type="date"
                  value={formData.additional_payment_end_date}
                  onChange={(e) => setFormData({ ...formData, additional_payment_end_date: e.target.value })}
                />
                <p className="text-xs text-slate-500">Leave blank for ongoing payments</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Button type="submit" className="w-full">Save Changes</Button>
    </form>
  );
}
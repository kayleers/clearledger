import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, CreditCard, Landmark, TrendingDown, Calendar, DollarSign, Save, Star, Trash2 } from 'lucide-react';
import { formatCurrency, formatMonthsToYears, calculatePayoffTimeline, calculateVariablePayoffTimeline } from '@/components/utils/calculations';

export default function MultiPaymentSimulator({ cards = [], loans = [] }) {
  const [paymentType, setPaymentType] = useState('fixed');
  const [cardPayments, setCardPayments] = useState({});
  const [loanPayments, setLoanPayments] = useState({});
  const [variableCardPayments, setVariableCardPayments] = useState({});
  const [variableLoanPayments, setVariableLoanPayments] = useState({});
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const queryClient = useQueryClient();

  const { data: savedScenarios = [] } = useQuery({
    queryKey: ['multi-payment-scenarios'],
    queryFn: () => base44.entities.MultiPaymentScenario.list()
  });

  const saveScenarioMutation = useMutation({
    mutationFn: (data) => base44.entities.MultiPaymentScenario.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multi-payment-scenarios'] });
      setShowSaveDialog(false);
      setScenarioName('');
    }
  });

  const deleteScenarioMutation = useMutation({
    mutationFn: (id) => base44.entities.MultiPaymentScenario.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multi-payment-scenarios'] });
    }
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }) => 
      base44.entities.MultiPaymentScenario.update(id, { is_favorite: !isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multi-payment-scenarios'] });
    }
  });

  const calculateCardScenario = (card, monthlyPayment, variablePayments) => {
    if (paymentType === 'variable' && variablePayments) {
      return calculateVariablePayoffTimeline(card.balance, card.apr, variablePayments);
    }
    if (!monthlyPayment || monthlyPayment <= 0) return null;
    return calculatePayoffTimeline(card.balance, card.apr, monthlyPayment);
  };

  const calculateLoanScenario = (loan, monthlyPayment, variablePayments) => {
    if (paymentType === 'variable' && variablePayments) {
      return calculateVariablePayoffTimeline(loan.current_balance, loan.interest_rate, variablePayments);
    }
    if (!monthlyPayment || monthlyPayment <= 0) return null;
    return calculatePayoffTimeline(loan.current_balance, loan.interest_rate, monthlyPayment);
  };

  const allScenarios = [
    ...cards.map(card => {
      const payment = cardPayments[card.id] || card.min_payment;
      const varPayments = variableCardPayments[card.id];
      const scenario = calculateCardScenario(card, payment, varPayments);
      return {
        id: card.id,
        name: card.name,
        type: 'card',
        balance: card.balance,
        payment: paymentType === 'fixed' ? payment : null,
        variablePayments: varPayments,
        scenario,
        minPayment: card.min_payment,
        apr: card.apr
      };
    }),
    ...loans.map(loan => {
      const payment = loanPayments[loan.id] || loan.monthly_payment;
      const varPayments = variableLoanPayments[loan.id];
      const scenario = calculateLoanScenario(loan, payment, varPayments);
      return {
        id: loan.id,
        name: loan.name,
        type: 'loan',
        balance: loan.current_balance,
        payment: paymentType === 'fixed' ? payment : null,
        variablePayments: varPayments,
        scenario,
        minPayment: loan.monthly_payment,
        apr: loan.interest_rate
      };
    })
  ].filter(item => item.scenario);

  const totalBalance = allScenarios.reduce((sum, item) => sum + item.balance, 0);
  const totalMonthlyPayment = allScenarios.reduce((sum, item) => sum + item.payment, 0);
  const totalInterest = allScenarios.reduce((sum, item) => sum + item.scenario.totalInterest, 0);
  const longestMonths = Math.max(...allScenarios.map(item => item.scenario.months), 0);

  const minPaymentScenarios = [
    ...cards.map(card => {
      const scenario = calculateCardScenario(card, card.min_payment);
      return scenario ? { ...scenario, balance: card.balance } : null;
    }),
    ...loans.map(loan => {
      const scenario = calculateLoanScenario(loan, loan.monthly_payment);
      return scenario ? { ...scenario, balance: loan.current_balance } : null;
    })
  ].filter(Boolean);

  const minPaymentInterest = minPaymentScenarios.reduce((sum, s) => sum + s.totalInterest, 0);
  const interestSaved = minPaymentInterest - totalInterest;

  const handleSaveScenario = () => {
    if (!scenarioName.trim()) return;

    const paymentData = {
      type: paymentType,
      cards: paymentType === 'fixed' 
        ? Object.entries(cardPayments).map(([id, amount]) => ({ id, amount }))
        : Object.entries(variableCardPayments).map(([id, payments]) => ({ id, payments })),
      loans: paymentType === 'fixed'
        ? Object.entries(loanPayments).map(([id, amount]) => ({ id, amount }))
        : Object.entries(variableLoanPayments).map(([id, payments]) => ({ id, payments }))
    };

    saveScenarioMutation.mutate({
      name: scenarioName,
      payment_data: paymentData,
      total_months: longestMonths,
      total_interest: totalInterest,
      interest_saved: interestSaved
    });
  };

  const handleLoadScenario = (scenario) => {
    const data = scenario.payment_data;
    setPaymentType(data.type);
    
    if (data.type === 'fixed') {
      const cardPmts = {};
      const loanPmts = {};
      data.cards?.forEach(c => cardPmts[c.id] = c.amount);
      data.loans?.forEach(l => loanPmts[l.id] = l.amount);
      setCardPayments(cardPmts);
      setLoanPayments(loanPmts);
    } else {
      const cardPmts = {};
      const loanPmts = {};
      data.cards?.forEach(c => cardPmts[c.id] = c.payments);
      data.loans?.forEach(l => loanPmts[l.id] = l.payments);
      setVariableCardPayments(cardPmts);
      setVariableLoanPayments(loanPmts);
    }
  };

  if (cards.length === 0 && loans.length === 0) {
    return null;
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Calculator className="w-5 h-5" />
              Payment Simulator
            </CardTitle>
            <p className="text-sm text-slate-600">See how different payment amounts affect your debt freedom timeline</p>
          </div>
          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Payment Scenario</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Scenario Name</Label>
                  <Input
                    placeholder="e.g., Aggressive Payoff Plan"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                  />
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                  <p><strong>Payoff Time:</strong> {formatMonthsToYears(longestMonths)}</p>
                  <p><strong>Total Interest:</strong> {formatCurrency(totalInterest)}</p>
                  <p><strong>Interest Saved:</strong> {formatCurrency(interestSaved)}</p>
                </div>
                <Button 
                  onClick={handleSaveScenario}
                  disabled={!scenarioName.trim() || saveScenarioMutation.isPending}
                  className="w-full"
                >
                  {saveScenarioMutation.isPending ? 'Saving...' : 'Save Scenario'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                  <DollarSign className="w-3 h-3" />
                  Total Debt
                </div>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(totalBalance)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                  <Calendar className="w-3 h-3" />
                  Payoff Time
                </div>
                <p className="text-lg font-bold text-purple-900">{formatMonthsToYears(longestMonths)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                  <TrendingDown className="w-3 h-3" />
                  Total Interest
                </div>
                <p className="text-lg font-bold text-red-900">{formatCurrency(totalInterest)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="flex items-center gap-2 text-xs text-green-700 mb-1">
                  <DollarSign className="w-3 h-3" />
                  Interest Saved
                </div>
                <p className="text-lg font-bold text-green-900">{formatCurrency(interestSaved)}</p>
              </div>
            </div>

            {/* Monthly Payment Summary */}
            <div className="bg-purple-100 rounded-lg p-4 border border-purple-300">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-purple-900">Total Monthly Payment</span>
                <span className="text-2xl font-bold text-purple-900">{formatCurrency(totalMonthlyPayment)}</span>
              </div>
              <p className="text-xs text-purple-700">
                Paying {formatCurrency(totalMonthlyPayment - allScenarios.reduce((sum, item) => sum + item.minPayment, 0))} more than minimum
              </p>
            </div>

            {/* Individual Items List */}
            <div className="space-y-2">
              {allScenarios.map(item => (
                <div key={item.id} className="bg-white rounded-lg p-3 border border-slate-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {item.type === 'card' ? (
                        <CreditCard className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Landmark className="w-4 h-4 text-orange-600" />
                      )}
                      <div>
                        <p className="font-medium text-sm text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">{formatCurrency(item.balance)} balance</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.payment)}/mo</p>
                      <p className="text-xs text-slate-500">{formatMonthsToYears(item.scenario.months)}</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.type === 'card' ? 'bg-blue-500' : 'bg-orange-500'}`}
                      style={{ width: `${Math.min((item.scenario.months / longestMonths) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {/* Payment Type Selector */}
            <div>
              <Label>Payment Type</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Monthly Payments</SelectItem>
                  <SelectItem value="variable">Variable Monthly Payments</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              {/* Credit Cards */}
              {cards.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Credit Cards
                  </h3>
                  <div className="space-y-3">
                    {cards.map(card => {
                      const payment = cardPayments[card.id] || card.min_payment;
                      const varPayments = variableCardPayments[card.id] || [];
                      const scenario = calculateCardScenario(card, payment, varPayments);
                      return (
                        <CardPaymentInput
                          key={card.id}
                          card={card}
                          paymentType={paymentType}
                          fixedPayment={payment}
                          variablePayments={varPayments}
                          onFixedChange={(val) => setCardPayments({ ...cardPayments, [card.id]: val })}
                          onVariableChange={(val) => setVariableCardPayments({ ...variableCardPayments, [card.id]: val })}
                          scenario={scenario}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Loans */}
              {loans.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Landmark className="w-4 h-4" />
                    Loans & Mortgages
                  </h3>
                  <div className="space-y-3">
                    {loans.map(loan => {
                      const payment = loanPayments[loan.id] || loan.monthly_payment;
                      const varPayments = variableLoanPayments[loan.id] || [];
                      const scenario = calculateLoanScenario(loan, payment, varPayments);
                      return (
                        <LoanPaymentInput
                          key={loan.id}
                          loan={loan}
                          paymentType={paymentType}
                          fixedPayment={payment}
                          variablePayments={varPayments}
                          onFixedChange={(val) => setLoanPayments({ ...loanPayments, [loan.id]: val })}
                          onVariableChange={(val) => setVariableLoanPayments({ ...variableLoanPayments, [loan.id]: val })}
                          scenario={scenario}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="saved" className="space-y-4">
            {savedScenarios.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Calculator className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No saved scenarios yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedScenarios.map(scenario => (
                  <div key={scenario.id} className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-slate-900">{scenario.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatMonthsToYears(scenario.total_months)} • {formatCurrency(scenario.total_interest)} interest
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleFavoriteMutation.mutate({ id: scenario.id, isFavorite: scenario.is_favorite })}
                          className="h-7 w-7"
                        >
                          <Star className={`w-4 h-4 ${scenario.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteScenarioMutation.mutate(scenario.id)}
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLoadScenario(scenario)}
                        className="text-xs flex-1"
                      >
                        Load Scenario
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function CardPaymentInput({ card, paymentType, fixedPayment, variablePayments, onFixedChange, onVariableChange, scenario }) {
  const [numMonths, setNumMonths] = useState(12);

  const getMonthLabel = (index) => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + index, 1);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[targetDate.getMonth()]} ${targetDate.getFullYear()}`;
  };

  const handleVariablePaymentChange = (month, value) => {
    const newPayments = [...(variablePayments || [])];
    newPayments[month] = { month: month + 1, amount: parseFloat(value) || 0 };
    onVariableChange(newPayments);
  };

  return (
    <div className="bg-white rounded-lg p-3 border border-slate-200">
      <div className="mb-2">
        <p className="font-medium text-sm text-slate-900">{card.name}</p>
        <p className="text-xs text-slate-500">{formatCurrency(card.balance)} • {(card.apr * 100).toFixed(2)}% APR</p>
      </div>
      <div className="space-y-2">
        {paymentType === 'fixed' ? (
          <div>
            <Label className="text-xs">Monthly Payment</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={fixedPayment}
                onChange={(e) => onFixedChange(parseFloat(e.target.value) || 0)}
                className="h-8"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => onFixedChange(card.min_payment)}
                className="text-xs"
              >
                Min
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Variable Payments</Label>
              <Input
                type="number"
                value={numMonths}
                onChange={(e) => setNumMonths(Math.max(1, parseInt(e.target.value) || 12))}
                className="h-6 w-16 text-xs"
                min="1"
              />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {Array.from({ length: numMonths }).map((_, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-slate-500 min-w-[120px]">{getMonthLabel(i)}:</span>
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={variablePayments?.[i]?.amount || ''}
                    onChange={(e) => handleVariablePaymentChange(i, e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        {scenario && (
          <div className="text-xs space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span>Payoff:</span>
              <span className="font-medium">{formatMonthsToYears(scenario.months)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Interest:</span>
              <span className="font-medium text-red-600">{formatCurrency(scenario.totalInterest)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LoanPaymentInput({ loan, paymentType, fixedPayment, variablePayments, onFixedChange, onVariableChange, scenario }) {
  const [numMonths, setNumMonths] = useState(12);

  const getMonthLabel = (index) => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + index, 1);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[targetDate.getMonth()]} ${targetDate.getFullYear()}`;
  };

  const handleVariablePaymentChange = (month, value) => {
    const newPayments = [...(variablePayments || [])];
    newPayments[month] = { month: month + 1, amount: parseFloat(value) || 0 };
    onVariableChange(newPayments);
  };

  return (
    <div className="bg-white rounded-lg p-3 border border-slate-200">
      <div className="mb-2">
        <p className="font-medium text-sm text-slate-900">{loan.name}</p>
        <p className="text-xs text-slate-500">{formatCurrency(loan.current_balance)} • {(loan.interest_rate * 100).toFixed(2)}% APR</p>
      </div>
      <div className="space-y-2">
        {paymentType === 'fixed' ? (
          <div>
            <Label className="text-xs">Monthly Payment</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={fixedPayment}
                onChange={(e) => onFixedChange(parseFloat(e.target.value) || 0)}
                className="h-8"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => onFixedChange(loan.monthly_payment)}
                className="text-xs"
              >
                Regular
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Variable Payments</Label>
              <Input
                type="number"
                value={numMonths}
                onChange={(e) => setNumMonths(Math.max(1, parseInt(e.target.value) || 12))}
                className="h-6 w-16 text-xs"
                min="1"
              />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {Array.from({ length: numMonths }).map((_, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-slate-500 min-w-[120px]">{getMonthLabel(i)}:</span>
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={variablePayments?.[i]?.amount || ''}
                    onChange={(e) => handleVariablePaymentChange(i, e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        {scenario && (
          <div className="text-xs space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span>Payoff:</span>
              <span className="font-medium">{formatMonthsToYears(scenario.months)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Interest:</span>
              <span className="font-medium text-red-600">{formatCurrency(scenario.totalInterest)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
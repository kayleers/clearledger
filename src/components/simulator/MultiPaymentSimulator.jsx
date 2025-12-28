import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Calculator, 
  CreditCard, 
  Landmark, 
  Calendar, 
  DollarSign, 
  Sparkles,
  Save,
  Star,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatCurrency, formatMonthsToYears, calculatePayoffTimeline, calculateVariablePayoffTimeline } from '@/components/utils/calculations';
import PayoffChart from './PayoffChart';

export default function MultiPaymentSimulator({ cards = [], loans = [] }) {
  const [paymentType, setPaymentType] = useState('fixed');
  const [cardPayments, setCardPayments] = useState({});
  const [loanPayments, setLoanPayments] = useState({});
  const [cardVariablePayments, setCardVariablePayments] = useState({});
  const [loanVariablePayments, setLoanVariablePayments] = useState({});
  const [cardDefaultPayments, setCardDefaultPayments] = useState({});
  const [loanDefaultPayments, setLoanDefaultPayments] = useState({});
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showBreakdown, setShowBreakdown] = useState(false);
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

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Calculate individual scenarios
  const allScenarios = useMemo(() => {
    const scenarios = [];
    
    // Cards
    cards.forEach(card => {
      let scenario;
      if (paymentType === 'fixed') {
        const payment = parseFloat(cardPayments[card.id]) || 0;
        if (payment > 0) {
          scenario = calculatePayoffTimeline(card.balance, card.apr, payment);
        }
      } else {
        const defaultPayment = parseFloat(cardDefaultPayments[card.id]) || 0;
        const varPayments = (cardVariablePayments[card.id] || []).map(p => ({
          month: p.month,
          amount: parseFloat(p.amount) || defaultPayment
        }));
        if (varPayments.some(p => p.amount > 0) || defaultPayment > 0) {
          scenario = calculateVariablePayoffTimeline(card.balance, card.apr, varPayments);
        }
      }
      
      if (scenario) {
        scenarios.push({
          id: card.id,
          name: card.name,
          type: 'card',
          balance: card.balance,
          apr: card.apr,
          minPayment: card.min_payment,
          currency: card.currency,
          ...scenario
        });
      }
    });

    // Loans
    loans.forEach(loan => {
      let scenario;
      if (paymentType === 'fixed') {
        const payment = parseFloat(loanPayments[loan.id]) || 0;
        if (payment > 0) {
          scenario = calculatePayoffTimeline(loan.current_balance, loan.interest_rate, payment);
        }
      } else {
        const defaultPayment = parseFloat(loanDefaultPayments[loan.id]) || 0;
        const varPayments = (loanVariablePayments[loan.id] || []).map(p => ({
          month: p.month,
          amount: parseFloat(p.amount) || defaultPayment
        }));
        if (varPayments.some(p => p.amount > 0) || defaultPayment > 0) {
          scenario = calculateVariablePayoffTimeline(loan.current_balance, loan.interest_rate, varPayments);
        }
      }
      
      if (scenario) {
        scenarios.push({
          id: loan.id,
          name: loan.name,
          type: 'loan',
          balance: loan.current_balance,
          apr: loan.interest_rate,
          minPayment: loan.monthly_payment,
          currency: loan.currency,
          ...scenario
        });
      }
    });

    return scenarios;
  }, [cards, loans, paymentType, cardPayments, loanPayments, cardVariablePayments, loanVariablePayments, cardDefaultPayments, loanDefaultPayments]);

  // Calculate totals
  const totalBalance = allScenarios.reduce((sum, s) => sum + s.balance, 0);
  const totalInterest = allScenarios.reduce((sum, s) => sum + s.totalInterest, 0);
  const longestMonths = Math.max(...allScenarios.map(s => s.months), 0);
  const totalMinPayment = [...cards, ...loans].reduce((sum, item) => 
    sum + (item.min_payment || item.monthly_payment || 0), 0);

  // Calculate minimum payment scenario
  const minScenarios = useMemo(() => {
    const scenarios = [];
    cards.forEach(card => {
      const scenario = calculatePayoffTimeline(card.balance, card.apr, card.min_payment);
      scenarios.push(scenario);
    });
    loans.forEach(loan => {
      const scenario = calculatePayoffTimeline(loan.current_balance, loan.interest_rate, loan.monthly_payment);
      scenarios.push(scenario);
    });
    return scenarios;
  }, [cards, loans]);

  const minTotalInterest = minScenarios.reduce((sum, s) => sum + s.totalInterest, 0);
  const interestSaved = minTotalInterest - totalInterest;

  const handleSaveScenario = () => {
    if (!scenarioName.trim()) return;

    const paymentData = {
      type: paymentType,
      cards: paymentType === 'fixed' 
        ? Object.entries(cardPayments).map(([id, amount]) => ({ id, amount }))
        : Object.entries(cardVariablePayments).map(([id, payments]) => ({ 
            id, 
            payments, 
            defaultPayment: cardDefaultPayments[id] 
          })),
      loans: paymentType === 'fixed'
        ? Object.entries(loanPayments).map(([id, amount]) => ({ id, amount }))
        : Object.entries(loanVariablePayments).map(([id, payments]) => ({ 
            id, 
            payments,
            defaultPayment: loanDefaultPayments[id]
          }))
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
      const cardDefaults = {};
      const loanDefaults = {};
      data.cards?.forEach(c => {
        cardPmts[c.id] = c.payments;
        cardDefaults[c.id] = c.defaultPayment;
      });
      data.loans?.forEach(l => {
        loanPmts[l.id] = l.payments;
        loanDefaults[l.id] = l.defaultPayment;
      });
      setCardVariablePayments(cardPmts);
      setLoanVariablePayments(loanPmts);
      setCardDefaultPayments(cardDefaults);
      setLoanDefaultPayments(loanDefaults);
    }
  };

  if (cards.length === 0 && loans.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="w-5 h-5 text-purple-600" />
            Payment Simulator
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="simulator">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simulator">Simulator</TabsTrigger>
            <TabsTrigger value="saved">Saved Scenarios</TabsTrigger>
          </TabsList>

          <TabsContent value="simulator" className="space-y-6 mt-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl">
                <p className="text-xs text-purple-700 mb-1">Total Debt</p>
                <p className="text-xl font-bold text-purple-900">{formatCurrency(totalBalance)}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                <p className="text-xs text-amber-700 mb-1">Total Min Payment</p>
                <p className="text-xl font-bold text-amber-900">{formatCurrency(totalMinPayment)}</p>
              </div>
            </div>

            {/* Payment Type Tabs */}
            <Tabs value={paymentType} onValueChange={setPaymentType}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="fixed">Same Each Month</TabsTrigger>
                <TabsTrigger value="variable">Different Amounts</TabsTrigger>
              </TabsList>

              <TabsContent value="fixed" className="space-y-4 mt-4">
                {/* Credit Cards */}
                {cards.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Credit Cards
                    </h3>
                    <div className="space-y-3">
                      {cards.map(card => (
                        <CardFixedInput
                          key={card.id}
                          card={card}
                          payment={cardPayments[card.id] || ''}
                          onPaymentChange={(val) => setCardPayments({ ...cardPayments, [card.id]: val })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Loans */}
                {loans.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Landmark className="w-4 h-4" />
                      Loans & Mortgages
                    </h3>
                    <div className="space-y-3">
                      {loans.map(loan => (
                        <LoanFixedInput
                          key={loan.id}
                          loan={loan}
                          payment={loanPayments[loan.id] || ''}
                          onPaymentChange={(val) => setLoanPayments({ ...loanPayments, [loan.id]: val })}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="variable" className="space-y-4 mt-4">
                <div className="flex items-center justify-end gap-2 mb-3">
                  <Label className="text-xs text-slate-500">Year:</Label>
                  <Input
                    type="number"
                    min="2020"
                    max="2099"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-20 h-8 text-sm"
                  />
                </div>

                {/* Credit Cards */}
                {cards.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Credit Cards
                    </h3>
                    <div className="space-y-4">
                      {cards.map(card => (
                        <CardVariableInput
                          key={card.id}
                          card={card}
                          variablePayments={cardVariablePayments[card.id] || Array.from({ length: 12 }, (_, i) => ({ month: i + 1, amount: '' }))}
                          defaultPayment={cardDefaultPayments[card.id] || ''}
                          onVariablePaymentsChange={(val) => setCardVariablePayments({ ...cardVariablePayments, [card.id]: val })}
                          onDefaultPaymentChange={(val) => setCardDefaultPayments({ ...cardDefaultPayments, [card.id]: val })}
                          monthNames={monthNames}
                          selectedYear={selectedYear}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Loans */}
                {loans.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Landmark className="w-4 h-4" />
                      Loans & Mortgages
                    </h3>
                    <div className="space-y-4">
                      {loans.map(loan => (
                        <LoanVariableInput
                          key={loan.id}
                          loan={loan}
                          variablePayments={loanVariablePayments[loan.id] || Array.from({ length: 12 }, (_, i) => ({ month: i + 1, amount: '' }))}
                          defaultPayment={loanDefaultPayments[loan.id] || ''}
                          onVariablePaymentsChange={(val) => setLoanVariablePayments({ ...loanVariablePayments, [loan.id]: val })}
                          onDefaultPaymentChange={(val) => setLoanDefaultPayments({ ...loanDefaultPayments, [loan.id]: val })}
                          monthNames={monthNames}
                          selectedYear={selectedYear}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Results */}
            {allScenarios.length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-slate-700">Your Payoff Results</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-blue-50 rounded-xl text-center">
                    <Calendar className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-xl font-bold text-blue-900">
                      {formatMonthsToYears(longestMonths)}
                    </p>
                    <p className="text-xs text-blue-600">to pay off</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl text-center">
                    <DollarSign className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-purple-900">
                      {formatCurrency(totalInterest)}
                    </p>
                    <p className="text-xs text-purple-600">total interest</p>
                  </div>
                </div>

                {/* Savings Comparison */}
                {interestSaved > 0 && (
                  <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5" />
                      <span className="font-medium">You Save</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <p className="text-2xl font-bold">{formatCurrency(interestSaved)}</p>
                        <p className="text-xs text-emerald-100">in interest</p>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-100 mt-2">
                      vs. paying only minimum payments
                    </p>
                  </div>
                )}

                {/* Individual Debt Progress */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-slate-700">Individual Progress</h4>
                  {allScenarios.map(scenario => (
                    <div key={scenario.id} className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {scenario.type === 'card' ? (
                            <CreditCard className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Landmark className="w-4 h-4 text-orange-600" />
                          )}
                          <div>
                            <p className="font-medium text-sm text-slate-900">{scenario.name}</p>
                            <p className="text-xs text-slate-500">{formatCurrency(scenario.balance, scenario.currency)} balance</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">{formatMonthsToYears(scenario.months)}</p>
                          <p className="text-xs text-slate-500">{formatCurrency(scenario.totalInterest, scenario.currency)} interest</p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${scenario.type === 'card' ? 'bg-blue-500' : 'bg-orange-500'}`}
                          style={{ width: `${Math.min((scenario.months / longestMonths) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Combined Chart */}
                {allScenarios.length > 0 && allScenarios[0].breakdown && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Combined Payoff Timeline</h4>
                    <PayoffChart 
                      breakdown={allScenarios[0].breakdown} 
                      multipleDebts={allScenarios}
                    />
                  </div>
                )}

                {/* Detailed Breakdown Toggle */}
                <Button
                  variant="ghost"
                  className="w-full justify-between"
                  onClick={() => setShowBreakdown(!showBreakdown)}
                >
                  <span>Monthly Breakdown</span>
                  {showBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>

                {showBreakdown && (
                  <div className="space-y-4">
                    {allScenarios.map(scenario => (
                      <div key={scenario.id}>
                        <h5 className="text-sm font-medium text-slate-700 mb-2">{scenario.name}</h5>
                        <div className="max-h-64 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 sticky top-0">
                              <tr>
                                <th className="text-left p-2">Month</th>
                                <th className="text-right p-2">Payment</th>
                                <th className="text-right p-2">Interest</th>
                                <th className="text-right p-2">Balance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {scenario.breakdown.slice(0, 60).map((row) => (
                                <tr key={row.month} className="border-b">
                                  <td className="p-2">{row.month}</td>
                                  <td className="text-right p-2">{formatCurrency(row.payment, scenario.currency)}</td>
                                  <td className="text-right p-2 text-red-600">{formatCurrency(row.interest, scenario.currency)}</td>
                                  <td className="text-right p-2 font-medium">{formatCurrency(row.balance, scenario.currency)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {scenario.breakdown.length > 60 && (
                            <p className="text-center text-sm text-slate-500 py-2">
                              Showing first 60 months of {scenario.breakdown.length}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Save Scenario Button */}
                <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant="outline">
                      <Save className="w-4 h-4 mr-2" />
                      Save This Scenario
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
            )}
          </TabsContent>

          <TabsContent value="saved" className="space-y-4 mt-4">
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

function CardFixedInput({ card, payment, onPaymentChange }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-slate-200">
      <div className="mb-2">
        <p className="font-medium text-sm text-slate-900">{card.name}</p>
        <p className="text-xs text-slate-500">
          {formatCurrency(card.balance, card.currency)} • {(card.apr * 100).toFixed(2)}% APR
        </p>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Monthly Payment</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <Input
              type="number"
              value={payment}
              onChange={(e) => onPaymentChange(e.target.value)}
              className="pl-7 h-10"
              placeholder="0"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPaymentChange(card.min_payment.toString())}
            className="text-xs"
          >
            Min
          </Button>
        </div>
      </div>
    </div>
  );
}

function LoanFixedInput({ loan, payment, onPaymentChange }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-slate-200">
      <div className="mb-2">
        <p className="font-medium text-sm text-slate-900">{loan.name}</p>
        <p className="text-xs text-slate-500">
          {formatCurrency(loan.current_balance, loan.currency)} • {(loan.interest_rate * 100).toFixed(2)}% APR
        </p>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Monthly Payment</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <Input
              type="number"
              value={payment}
              onChange={(e) => onPaymentChange(e.target.value)}
              className="pl-7 h-10"
              placeholder="0"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPaymentChange(loan.monthly_payment.toString())}
            className="text-xs"
          >
            Regular
          </Button>
        </div>
      </div>
    </div>
  );
}

function CardVariableInput({ card, variablePayments, defaultPayment, onVariablePaymentsChange, onDefaultPaymentChange, monthNames, selectedYear }) {
  const scenario = useMemo(() => {
    const defaultPmt = parseFloat(defaultPayment) || 0;
    const payments = variablePayments.map(p => ({
      month: p.month,
      amount: parseFloat(p.amount) || defaultPmt
    }));
    if (payments.some(p => p.amount > 0) || defaultPmt > 0) {
      return calculateVariablePayoffTimeline(card.balance, card.apr, payments);
    }
    return null;
  }, [card, variablePayments, defaultPayment]);

  const updateVariablePayment = (index, amount) => {
    const updated = [...variablePayments];
    updated[index].amount = amount;
    onVariablePaymentsChange(updated);
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <div className="mb-3">
        <p className="font-medium text-sm text-slate-900">{card.name}</p>
        <p className="text-xs text-slate-500">
          {formatCurrency(card.balance, card.currency)} • {(card.apr * 100).toFixed(2)}% APR
        </p>
      </div>

      <div className="mb-3">
        <Label className="text-sm font-medium text-slate-700 mb-2 block">Default Monthly Payment</Label>
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
          <Input
            type="number"
            step="1"
            min="0"
            placeholder={card.min_payment.toString()}
            value={defaultPayment}
            onChange={(e) => onDefaultPaymentChange(e.target.value)}
            className="pl-7 h-10"
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          This applies to all months unless overridden
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Override Specific Months (Optional)</Label>
        <div className="grid grid-cols-2 gap-3">
          {variablePayments.map((payment, index) => {
            // Calculate if this month is after payoff
            let isPaidOff = false;
            if (scenario && scenario.months !== Infinity) {
              const now = new Date();
              const payoffDate = new Date();
              payoffDate.setMonth(payoffDate.getMonth() + scenario.months);
              
              const inputMonthDate = new Date(selectedYear, index, 1);
              isPaidOff = inputMonthDate >= payoffDate;
            }
            const displayDefault = isPaidOff ? "0" : (defaultPayment || "0");

            return (
              <div key={index} className="space-y-1">
                <Label className="text-xs text-slate-500 font-medium">
                  {monthNames[index]}
                  {!payment.amount && !isPaidOff && defaultPayment && (
                    <span className="text-slate-400 font-normal ml-1">
                      (${defaultPayment})
                    </span>
                  )}
                  {isPaidOff && (
                    <span className="text-emerald-600 font-normal ml-1">
                      ✓ Paid Off
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <Input
                    type="text"
                    placeholder={displayDefault}
                    value={payment.amount}
                    onChange={(e) => updateVariablePayment(index, e.target.value)}
                    className={`pl-7 h-10 ${isPaidOff ? 'bg-emerald-50 border-emerald-200' : ''}`}
                    disabled={isPaidOff}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {scenario && (
        <div className="mt-3 pt-3 border-t text-xs space-y-1 text-slate-600">
          <div className="flex justify-between">
            <span>Payoff:</span>
            <span className="font-medium">{formatMonthsToYears(scenario.months)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Interest:</span>
            <span className="font-medium text-red-600">{formatCurrency(scenario.totalInterest, card.currency)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function LoanVariableInput({ loan, variablePayments, defaultPayment, onVariablePaymentsChange, onDefaultPaymentChange, monthNames, selectedYear }) {
  const scenario = useMemo(() => {
    const defaultPmt = parseFloat(defaultPayment) || 0;
    const payments = variablePayments.map(p => ({
      month: p.month,
      amount: parseFloat(p.amount) || defaultPmt
    }));
    if (payments.some(p => p.amount > 0) || defaultPmt > 0) {
      return calculateVariablePayoffTimeline(loan.current_balance, loan.interest_rate, payments);
    }
    return null;
  }, [loan, variablePayments, defaultPayment]);

  const updateVariablePayment = (index, amount) => {
    const updated = [...variablePayments];
    updated[index].amount = amount;
    onVariablePaymentsChange(updated);
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <div className="mb-3">
        <p className="font-medium text-sm text-slate-900">{loan.name}</p>
        <p className="text-xs text-slate-500">
          {formatCurrency(loan.current_balance, loan.currency)} • {(loan.interest_rate * 100).toFixed(2)}% APR
        </p>
      </div>

      <div className="mb-3">
        <Label className="text-sm font-medium text-slate-700 mb-2 block">Default Monthly Payment</Label>
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
          <Input
            type="number"
            step="1"
            min="0"
            placeholder={loan.monthly_payment.toString()}
            value={defaultPayment}
            onChange={(e) => onDefaultPaymentChange(e.target.value)}
            className="pl-7 h-10"
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          This applies to all months unless overridden
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Override Specific Months (Optional)</Label>
        <div className="grid grid-cols-2 gap-3">
          {variablePayments.map((payment, index) => {
            // Calculate if this month is after payoff
            let isPaidOff = false;
            if (scenario && scenario.months !== Infinity) {
              const now = new Date();
              const payoffDate = new Date();
              payoffDate.setMonth(payoffDate.getMonth() + scenario.months);
              
              const inputMonthDate = new Date(selectedYear, index, 1);
              isPaidOff = inputMonthDate >= payoffDate;
            }
            const displayDefault = isPaidOff ? "0" : (defaultPayment || "0");

            return (
              <div key={index} className="space-y-1">
                <Label className="text-xs text-slate-500 font-medium">
                  {monthNames[index]}
                  {!payment.amount && !isPaidOff && defaultPayment && (
                    <span className="text-slate-400 font-normal ml-1">
                      (${defaultPayment})
                    </span>
                  )}
                  {isPaidOff && (
                    <span className="text-emerald-600 font-normal ml-1">
                      ✓ Paid Off
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <Input
                    type="text"
                    placeholder={displayDefault}
                    value={payment.amount}
                    onChange={(e) => updateVariablePayment(index, e.target.value)}
                    className={`pl-7 h-10 ${isPaidOff ? 'bg-emerald-50 border-emerald-200' : ''}`}
                    disabled={isPaidOff}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {scenario && (
        <div className="mt-3 pt-3 border-t text-xs space-y-1 text-slate-600">
          <div className="flex justify-between">
            <span>Payoff:</span>
            <span className="font-medium">{formatMonthsToYears(scenario.months)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Interest:</span>
            <span className="font-medium text-red-600">{formatCurrency(scenario.totalInterest, loan.currency)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
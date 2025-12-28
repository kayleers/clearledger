import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, CreditCard, Landmark, TrendingDown, Calendar, DollarSign } from 'lucide-react';
import { formatCurrency, formatMonthsToYears, calculatePayoffTimeline } from '@/components/utils/calculations';

export default function MultiPaymentSimulator({ cards = [], loans = [] }) {
  const [cardPayments, setCardPayments] = useState({});
  const [loanPayments, setLoanPayments] = useState({});

  const calculateCardScenario = (card, monthlyPayment) => {
    if (!monthlyPayment || monthlyPayment <= 0) return null;
    return calculatePayoffTimeline(card.balance, card.apr, monthlyPayment);
  };

  const calculateLoanScenario = (loan, monthlyPayment) => {
    if (!monthlyPayment || monthlyPayment <= 0) return null;
    return calculatePayoffTimeline(loan.current_balance, loan.interest_rate, monthlyPayment);
  };

  const allScenarios = [
    ...cards.map(card => {
      const payment = cardPayments[card.id] || card.min_payment;
      const scenario = calculateCardScenario(card, payment);
      return {
        id: card.id,
        name: card.name,
        type: 'card',
        balance: card.balance,
        payment,
        scenario,
        minPayment: card.min_payment,
        apr: card.apr
      };
    }),
    ...loans.map(loan => {
      const payment = loanPayments[loan.id] || loan.monthly_payment;
      const scenario = calculateLoanScenario(loan, payment);
      return {
        id: loan.id,
        name: loan.name,
        type: 'loan',
        balance: loan.current_balance,
        payment,
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

  if (cards.length === 0 && loans.length === 0) {
    return null;
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Calculator className="w-5 h-5" />
          Payment Simulator
        </CardTitle>
        <p className="text-sm text-slate-600">See how different payment amounts affect your debt freedom timeline</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
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
                      const scenario = calculateCardScenario(card, payment);
                      return (
                        <div key={card.id} className="bg-white rounded-lg p-3 border border-slate-200">
                          <div className="mb-2">
                            <p className="font-medium text-sm text-slate-900">{card.name}</p>
                            <p className="text-xs text-slate-500">{formatCurrency(card.balance)} • {(card.apr * 100).toFixed(2)}% APR</p>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs">Monthly Payment</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  value={payment}
                                  onChange={(e) => setCardPayments({ ...cardPayments, [card.id]: parseFloat(e.target.value) || 0 })}
                                  className="h-8"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setCardPayments({ ...cardPayments, [card.id]: card.min_payment })}
                                  className="text-xs"
                                >
                                  Min
                                </Button>
                              </div>
                            </div>
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
                      const scenario = calculateLoanScenario(loan, payment);
                      return (
                        <div key={loan.id} className="bg-white rounded-lg p-3 border border-slate-200">
                          <div className="mb-2">
                            <p className="font-medium text-sm text-slate-900">{loan.name}</p>
                            <p className="text-xs text-slate-500">{formatCurrency(loan.current_balance)} • {(loan.interest_rate * 100).toFixed(2)}% APR</p>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs">Monthly Payment</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  value={payment}
                                  onChange={(e) => setLoanPayments({ ...loanPayments, [loan.id]: parseFloat(e.target.value) || 0 })}
                                  className="h-8"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setLoanPayments({ ...loanPayments, [loan.id]: loan.monthly_payment })}
                                  className="text-xs"
                                >
                                  Regular
                                </Button>
                              </div>
                            </div>
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
                    })}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
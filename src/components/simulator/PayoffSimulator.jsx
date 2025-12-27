import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Sparkles,
  Save,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  calculateMinimumPayment,
  calculatePaymentFor3YearPayoff,
  calculatePayoffTimeline,
  calculateVariablePayoffTimeline,
  calculateMinimumPaymentPayoff,
  formatCurrency
} from '@/components/utils/calculations';
import PayoffChart from './PayoffChart';

export default function PayoffSimulator({ card, onSaveScenario }) {
  const [paymentType, setPaymentType] = useState('fixed');
  const [fixedPayment, setFixedPayment] = useState('');
  const [variablePayments, setVariablePayments] = useState([{ month: 1, amount: '' }]);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const minPayment = calculateMinimumPayment(
    card.balance,
    card.min_payment_type,
    card.min_payment_value,
    card.min_payment_floor
  );

  const threeYearPayment = calculatePaymentFor3YearPayoff(card.balance, card.apr);
  const monthlyInterest = card.balance * (card.apr / 12);

  // Calculate minimum payment scenario for comparison
  const minPaymentScenario = useMemo(() => {
    return calculateMinimumPaymentPayoff(
      card.balance,
      card.apr,
      card.min_payment_type,
      card.min_payment_value,
      card.min_payment_floor
    );
  }, [card]);

  // Calculate current scenario
  const currentScenario = useMemo(() => {
    if (paymentType === 'fixed') {
      const payment = parseFloat(fixedPayment) || 0;
      if (payment <= monthlyInterest) {
        return { months: Infinity, totalInterest: Infinity, breakdown: [] };
      }
      return calculatePayoffTimeline(card.balance, card.apr, payment);
    } else {
      const payments = variablePayments.map(p => ({
        month: p.month,
        amount: parseFloat(p.amount) || 0
      }));
      return calculateVariablePayoffTimeline(card.balance, card.apr, payments);
    }
  }, [paymentType, fixedPayment, variablePayments, card]);

  const interestSaved = minPaymentScenario.totalInterest - currentScenario.totalInterest;
  const monthsSaved = minPaymentScenario.months - currentScenario.months;

  const handleSliderChange = (value) => {
    setFixedPayment(value[0].toString());
  };

  const addVariableMonth = () => {
    const nextMonth = variablePayments.length + 1;
    setVariablePayments([...variablePayments, { month: nextMonth, amount: '' }]);
  };

  const updateVariablePayment = (index, amount) => {
    const updated = [...variablePayments];
    updated[index].amount = amount;
    setVariablePayments(updated);
  };

  const removeVariableMonth = (index) => {
    if (variablePayments.length > 1) {
      setVariablePayments(variablePayments.filter((_, i) => i !== index));
    }
  };

  const handleSaveScenario = () => {
    if (onSaveScenario) {
      onSaveScenario({
        payment_type: paymentType,
        fixed_payment: paymentType === 'fixed' ? parseFloat(fixedPayment) : null,
        variable_payments: paymentType === 'variable' ? variablePayments.map(p => ({
          month: p.month,
          amount: parseFloat(p.amount) || 0
        })) : null,
        starting_balance: card.balance,
        total_interest: currentScenario.totalInterest,
        months_to_payoff: currentScenario.months
      });
    }
  };

  const maxSlider = Math.max(card.balance * 0.15, threeYearPayment * 2, 500);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="w-5 h-5 text-blue-600" />
          Payoff Simulator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
            <p className="text-xs text-amber-700 mb-1">Minimum Payment</p>
            <p className="text-xl font-bold text-amber-900">{formatCurrency(minPayment)}</p>
          </div>
          <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
            <p className="text-xs text-emerald-700 mb-1">Pay Off in 3 Years</p>
            <p className="text-xl font-bold text-emerald-900">{formatCurrency(threeYearPayment)}</p>
          </div>
        </div>

        {/* Monthly Interest Warning */}
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
          <p className="text-xs text-red-600 mb-1">Monthly Interest Charges</p>
          <p className="text-lg font-semibold text-red-700">{formatCurrency(monthlyInterest)}</p>
          <p className="text-xs text-red-500 mt-1">
            You need to pay more than this just to reduce your balance
          </p>
        </div>

        {/* Payment Type Tabs */}
        <Tabs value={paymentType} onValueChange={setPaymentType}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="fixed">Same Each Month</TabsTrigger>
            <TabsTrigger value="variable">Different Amounts</TabsTrigger>
          </TabsList>

          <TabsContent value="fixed" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label>Monthly Payment Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <Input
                  type="number"
                  step="1"
                  min={minPayment}
                  placeholder="Enter amount"
                  value={fixedPayment}
                  onChange={(e) => setFixedPayment(e.target.value)}
                  className="pl-7 h-12 text-lg"
                />
              </div>
              
              <div className="pt-2">
                <Slider
                  value={[parseFloat(fixedPayment) || minPayment]}
                  onValueChange={handleSliderChange}
                  min={minPayment}
                  max={maxSlider}
                  step={5}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Min: {formatCurrency(minPayment)}</span>
                  <span>3-Year: {formatCurrency(threeYearPayment)}</span>
                </div>
              </div>

              {/* Quick Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFixedPayment(minPayment.toFixed(0))}
                >
                  Minimum
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFixedPayment(threeYearPayment.toFixed(0))}
                >
                  3-Year Payoff
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFixedPayment((threeYearPayment * 1.5).toFixed(0))}
                >
                  Aggressive
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="variable" className="space-y-4 mt-4">
            <div className="space-y-3">
              {variablePayments.map((payment, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-20 text-sm text-slate-500">
                    Month {payment.month}
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <Input
                      type="number"
                      step="1"
                      placeholder="Amount"
                      value={payment.amount}
                      onChange={(e) => updateVariablePayment(index, e.target.value)}
                      className="pl-7"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeVariableMonth(index)}
                    disabled={variablePayments.length === 1}
                  >
                    <Trash2 className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addVariableMonth}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Month
              </Button>
              <p className="text-xs text-slate-500">
                After the last month, that payment repeats until paid off
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Results */}
        {(parseFloat(fixedPayment) > 0 || variablePayments.some(p => parseFloat(p.amount) > 0)) && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-slate-700">Your Payoff Results</h4>
            
            {currentScenario.months === Infinity ? (
              <div className="p-4 bg-red-50 rounded-xl text-center">
                <p className="text-red-700 font-medium">Payment too low!</p>
                <p className="text-sm text-red-600">
                  Your payment doesn't cover the monthly interest. 
                  You need to pay at least {formatCurrency(monthlyInterest + 1)} to reduce your balance.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-blue-50 rounded-xl text-center">
                    <Calendar className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-blue-900">
                      {currentScenario.months}
                    </p>
                    <p className="text-xs text-blue-600">months to pay off</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl text-center">
                    <DollarSign className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-purple-900">
                      {formatCurrency(currentScenario.totalInterest)}
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-2xl font-bold">{formatCurrency(interestSaved)}</p>
                        <p className="text-xs text-emerald-100">in interest</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{monthsSaved}</p>
                        <p className="text-xs text-emerald-100">months faster</p>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-100 mt-2">
                      vs. paying only the minimum
                    </p>
                  </div>
                )}

                {/* Chart */}
                <PayoffChart breakdown={currentScenario.breakdown} />

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
                        {currentScenario.breakdown.slice(0, 60).map((row) => (
                          <tr key={row.month} className="border-b">
                            <td className="p-2">{row.month}</td>
                            <td className="text-right p-2">{formatCurrency(row.payment)}</td>
                            <td className="text-right p-2 text-red-600">{formatCurrency(row.interest)}</td>
                            <td className="text-right p-2 font-medium">{formatCurrency(row.balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {currentScenario.breakdown.length > 60 && (
                      <p className="text-center text-sm text-slate-500 py-2">
                        Showing first 60 months of {currentScenario.breakdown.length}
                      </p>
                    )}
                  </div>
                )}

                {/* Save Scenario Button */}
                {onSaveScenario && (
                  <Button 
                    onClick={handleSaveScenario}
                    className="w-full"
                    variant="outline"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save This Scenario
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
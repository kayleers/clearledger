import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, 
  Calendar, 
  DollarSign, 
  Sparkles,
  Save,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  calculatePayoffTimeline,
  calculateVariablePayoffTimeline,
  formatCurrency,
  formatMonthsToYears
} from '@/components/utils/calculations';
import PayoffChart from '@/components/simulator/PayoffChart';

export default function LoanPayoffSimulator({ loan, onSaveScenario, payments = [] }) {
  const currency = loan.currency || 'USD';
  const [paymentType, setPaymentType] = useState('fixed');
  const [fixedPayment, setFixedPayment] = useState('');
  const [variablePayments, setVariablePayments] = useState(
    Array.from({ length: 12 }, (_, i) => ({ month: i + 1, amount: '' }))
  );
  const [defaultMonthlyPayment, setDefaultMonthlyPayment] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showBreakdown, setShowBreakdown] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthlyInterest = loan.current_balance * (loan.interest_rate / 12);
  const regularPayment = loan.monthly_payment || 0;

  // Calculate regular payment scenario for comparison
  const regularScenario = useMemo(() => {
    return calculatePayoffTimeline(
      loan.current_balance,
      loan.interest_rate,
      regularPayment,
      600
    );
  }, [loan]);

  // Calculate current scenario
  const currentScenario = useMemo(() => {
    if (paymentType === 'fixed') {
      const payment = parseFloat(fixedPayment) || 0;
      if (payment <= monthlyInterest) {
        return { months: Infinity, totalInterest: Infinity, breakdown: [] };
      }
      return calculatePayoffTimeline(loan.current_balance, loan.interest_rate, payment);
    } else {
      const defaultPayment = parseFloat(defaultMonthlyPayment) || 0;
      const payments = variablePayments.map(p => ({
        month: p.month,
        amount: parseFloat(p.amount) || defaultPayment
      }));
      return calculateVariablePayoffTimeline(loan.current_balance, loan.interest_rate, payments);
    }
  }, [paymentType, fixedPayment, variablePayments, defaultMonthlyPayment, loan]);

  const interestSaved = regularScenario.totalInterest - currentScenario.totalInterest;
  const monthsSaved = regularScenario.months - currentScenario.months;

  const handleSliderChange = (value) => {
    setFixedPayment(value[0].toString());
  };

  const updateVariablePayment = (index, amount) => {
    const updated = [...variablePayments];
    updated[index].amount = amount;
    setVariablePayments(updated);
  };

  const handleSaveScenario = () => {
    if (onSaveScenario) {
      const defaultPayment = parseFloat(defaultMonthlyPayment) || 0;
      onSaveScenario({
        payment_type: paymentType,
        fixed_payment: paymentType === 'fixed' ? parseFloat(fixedPayment) : null,
        variable_payments: paymentType === 'variable' ? variablePayments.map(p => ({
          month: p.month,
          amount: parseFloat(p.amount) || defaultPayment
        })) : null,
        starting_balance: loan.current_balance,
        total_interest: currentScenario.totalInterest,
        months_to_payoff: currentScenario.months
      });
    }
  };

  const maxSlider = Math.max(loan.current_balance * 0.05, regularPayment * 2, 500);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="w-5 h-5 text-indigo-600" />
          Payoff Simulator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
            <p className="text-xs text-blue-700 mb-1">Regular Payment</p>
            <p className="text-xl font-bold text-blue-900">{formatCurrency(regularPayment, currency)}</p>
          </div>
          <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
            <p className="text-xs text-emerald-700 mb-1">Monthly Interest</p>
            <p className="text-xl font-bold text-emerald-900">{formatCurrency(monthlyInterest, currency)}</p>
          </div>
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
                  min={monthlyInterest}
                  placeholder="Enter amount"
                  value={fixedPayment}
                  onChange={(e) => setFixedPayment(e.target.value)}
                  className="pl-7 h-12 text-lg"
                />
              </div>
              
              <div className="pt-2">
                <Slider
                  value={[parseFloat(fixedPayment) || regularPayment]}
                  onValueChange={handleSliderChange}
                  min={regularPayment}
                  max={maxSlider}
                  step={10}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Regular: {formatCurrency(regularPayment, currency)}</span>
                  <span>Aggressive: {formatCurrency(maxSlider, currency)}</span>
                </div>
              </div>

              {/* Quick Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFixedPayment(regularPayment.toFixed(0))}
                >
                  Regular
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFixedPayment((regularPayment * 1.5).toFixed(0))}
                >
                  +50%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFixedPayment((regularPayment * 2).toFixed(0))}
                >
                  Double
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="variable" className="space-y-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Default Monthly Payment</Label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder={regularPayment.toString()}
                    value={defaultMonthlyPayment}
                    onChange={(e) => setDefaultMonthlyPayment(e.target.value)}
                    className="pl-7 h-10"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  This applies to all months unless overridden
                </p>
              </div>
              <div className="flex items-center gap-2">
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
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Override Specific Months (Optional)</Label>
              <div className="grid grid-cols-2 gap-3">
                {variablePayments.map((payment, index) => {
                  const defaultPayment = parseFloat(defaultMonthlyPayment) || 0;
                  const effectivePayment = parseFloat(payment.amount) || defaultPayment;
                  
                  // Calculate if this month is after payoff
                  const now = new Date();
                  const payoffDate = new Date();
                  payoffDate.setMonth(payoffDate.getMonth() + currentScenario.months);
                  
                  const inputMonthDate = new Date(selectedYear, index, 1);
                  const isPaidOff = currentScenario.months !== Infinity && inputMonthDate >= payoffDate;

                  // Check if month is in the past
                  const currentMonth = now.getMonth();
                  const currentYear = now.getFullYear();
                  const currentDay = now.getDate();
                  
                  let isPastMonth = false;
                  if (selectedYear < currentYear) {
                    isPastMonth = true;
                  } else if (selectedYear === currentYear) {
                    if (index < currentMonth) {
                      isPastMonth = true;
                    } else if (index === currentMonth && loan.payment_due_date) {
                      isPastMonth = currentDay > loan.payment_due_date;
                    }
                  }

                  let actualPayment = null;
                  if (isPastMonth && payments.length > 0) {
                    const monthPayments = payments.filter(p => {
                      const paymentDate = new Date(p.date);
                      return paymentDate.getFullYear() === selectedYear && 
                             paymentDate.getMonth() === index;
                    });
                    if (monthPayments.length > 0) {
                      actualPayment = monthPayments.reduce((sum, p) => sum + p.amount, 0);
                    }
                  }

                  const pastMonthPlaceholder = actualPayment !== null ? formatCurrency(actualPayment, currency) : 'N/A';
                  const displayDefault = isPaidOff ? "0" : (defaultMonthlyPayment || "0");
                  
                  // Get predicted balance for this month from breakdown
                  const predictedBalance = currentScenario.breakdown?.[index]?.balance;

                  return (
                    <div key={index} className="space-y-1">
                      <Label className="text-xs text-slate-500 font-medium">
                        {monthNames[index]}
                        {!payment.amount && !isPaidOff && !isPastMonth && defaultMonthlyPayment && (
                          <span className="text-slate-400 font-normal ml-1">
                            (${defaultMonthlyPayment})
                          </span>
                        )}
                        {isPaidOff && (
                          <span className="text-emerald-600 font-normal ml-1">
                            ✓ Paid Off
                          </span>
                        )}
                        {isPastMonth && (
                          <span className="text-slate-400 font-normal ml-1">
                            (Past)
                          </span>
                        )}
                        {!isPaidOff && !isPastMonth && predictedBalance !== undefined && (
                          <span className="text-blue-600 font-normal ml-1 block text-[10px]">
                            Before: {formatCurrency(scenario?.breakdown?.[index]?.balance_before_payment, currency)} | After: {formatCurrency(predictedBalance, currency)}
                          </span>
                        )}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <Input
                          type="text"
                          placeholder={isPastMonth ? pastMonthPlaceholder : displayDefault}
                          value={payment.amount}
                          onChange={(e) => updateVariablePayment(index, e.target.value)}
                          className={`pl-7 h-10 ${isPaidOff ? 'bg-emerald-50 border-emerald-200' : ''} ${isPastMonth ? 'bg-slate-100 border-slate-200' : ''}`}
                          disabled={isPaidOff || isPastMonth}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Results */}
        {(parseFloat(fixedPayment) > 0 || parseFloat(defaultMonthlyPayment) > 0 || variablePayments.some(p => parseFloat(p.amount) > 0)) && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-slate-700">Your Payoff Results</h4>
            
            {currentScenario.months === Infinity ? (
              <div className="p-4 bg-red-50 rounded-xl text-center">
                <p className="text-red-700 font-medium">Payment too low!</p>
                <p className="text-sm text-red-600">
                  Your payment doesn't cover the monthly interest. 
                  You need to pay at least {formatCurrency(monthlyInterest + 1, currency)} to reduce your balance.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-indigo-50 rounded-xl text-center">
                    <Calendar className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                    <p className="text-xl font-bold text-indigo-900">
                      {formatMonthsToYears(currentScenario.months)}
                    </p>
                    <p className="text-xs text-indigo-600">to pay off</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl text-center">
                    <DollarSign className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-purple-900">
                      {formatCurrency(currentScenario.totalInterest, currency)}
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
                        <p className="text-2xl font-bold">{formatCurrency(interestSaved, currency)}</p>
                        <p className="text-xs text-emerald-100">in interest</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold">{formatMonthsToYears(monthsSaved)}</p>
                        <p className="text-xs text-emerald-100">faster</p>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-100 mt-2">
                      vs. regular payment schedule
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
                            <td className="text-right p-2">{formatCurrency(row.payment, currency)}</td>
                            <td className="text-right p-2 text-red-600">{formatCurrency(row.interest, currency)}</td>
                            <td className="text-right p-2 font-medium">{formatCurrency(row.balance, currency)}</td>
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
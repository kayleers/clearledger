import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, TrendingDown, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { formatCurrency, formatMonthsToYears } from '@/components/utils/calculations';

export default function ComprehensivePaymentSimulator() {
  const [extraPayment, setExtraPayment] = useState('');
  const [targetMonths, setTargetMonths] = useState('');

  const { data: cards = [] } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: () => base44.entities.CreditCard.list()
  });

  const { data: loans = [] } = useQuery({
    queryKey: ['mortgage-loans'],
    queryFn: () => base44.entities.MortgageLoan.filter({ is_active: true })
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['recurring-bills'],
    queryFn: () => base44.entities.RecurringBill.filter({ is_active: true })
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => base44.entities.BankAccount.filter({ is_active: true })
  });

  // Calculate totals
  const totalDebt = useMemo(() => {
    const cardDebt = cards.reduce((sum, card) => sum + card.balance, 0);
    const loanDebt = loans.reduce((sum, loan) => sum + loan.current_balance, 0);
    return cardDebt + loanDebt;
  }, [cards, loans]);

  const monthlyMinimums = useMemo(() => {
    const cardMin = cards.reduce((sum, card) => sum + Math.min(card.min_payment || 0, card.balance), 0);
    const loanMin = loans.reduce((sum, loan) => sum + loan.monthly_payment, 0);
    return cardMin + loanMin;
  }, [cards, loans]);

  const monthlyBills = useMemo(() => {
    return bills.filter(b => b.frequency === 'monthly').reduce((sum, bill) => sum + bill.amount, 0);
  }, [bills]);

  const totalMonthlyObligations = monthlyMinimums + monthlyBills;

  // Simulate payoff with extra payment
  const simulatePayoff = (additionalPayment) => {
    const extra = parseFloat(additionalPayment) || 0;
    let remainingDebt = totalDebt;
    let months = 0;
    let totalInterest = 0;
    const maxMonths = 600;

    // Weighted average APR
    const totalBalance = cards.reduce((sum, c) => sum + c.balance, 0) + loans.reduce((sum, l) => sum + l.current_balance, 0);
    const weightedAPR = (
      cards.reduce((sum, c) => sum + (c.balance * c.apr), 0) +
      loans.reduce((sum, l) => sum + (l.current_balance * l.interest_rate), 0)
    ) / totalBalance;

    const monthlyRate = weightedAPR / 12;
    const totalPayment = monthlyMinimums + extra;

    while (remainingDebt > 0 && months < maxMonths) {
      const interest = remainingDebt * monthlyRate;
      totalInterest += interest;
      remainingDebt += interest;
      
      const payment = Math.min(totalPayment, remainingDebt);
      remainingDebt -= payment;
      months++;

      if (remainingDebt < 0.01) remainingDebt = 0;
    }

    return { months, totalInterest };
  };

  // Simulate minimum payment payoff
  const minPayoffSimulation = useMemo(() => simulatePayoff(0), [cards, loans]);

  // Simulate with extra payment
  const extraPayoffSimulation = useMemo(() => {
    return extraPayment ? simulatePayoff(extraPayment) : null;
  }, [extraPayment, cards, loans]);

  // Calculate payment needed for target timeline
  const calculateTargetPayment = (targetMonths) => {
    const target = parseInt(targetMonths);
    if (!target || target <= 0) return null;

    let low = 0;
    let high = totalDebt / 12;
    let result = null;

    for (let i = 0; i < 50; i++) {
      const mid = (low + high) / 2;
      const sim = simulatePayoff(mid);
      
      if (Math.abs(sim.months - target) <= 1) {
        result = mid;
        break;
      }
      
      if (sim.months > target) {
        low = mid;
      } else {
        high = mid;
      }
    }

    return result;
  };

  const targetPayment = useMemo(() => {
    return targetMonths ? calculateTargetPayment(targetMonths) : null;
  }, [targetMonths, totalDebt]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Payment Simulator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Total Debt</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalDebt)}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Monthly Obligations</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalMonthlyObligations)}</p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-slate-700">Breakdown:</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Credit Cards ({cards.length})</span>
              <span className="font-medium">{formatCurrency(cards.reduce((sum, c) => sum + c.balance, 0))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Loans ({loans.length})</span>
              <span className="font-medium">{formatCurrency(loans.reduce((sum, l) => sum + l.current_balance, 0))}</span>
            </div>
            <div className="flex justify-between border-t pt-1 mt-1">
              <span className="text-slate-600">Min Payments</span>
              <span className="font-medium">{formatCurrency(monthlyMinimums)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Bills ({bills.length})</span>
              <span className="font-medium">{formatCurrency(monthlyBills)}</span>
            </div>
          </div>
        </div>

        {/* Simulation Tabs */}
        <Tabs defaultValue="extra">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="extra">Extra Payment</TabsTrigger>
            <TabsTrigger value="target">Target Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="extra" className="space-y-4">
            <div>
              <Label>Additional Monthly Payment</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <Input
                  type="number"
                  step="1"
                  value={extraPayment}
                  onChange={(e) => setExtraPayment(e.target.value)}
                  placeholder="0"
                  className="pl-7"
                />
              </div>
            </div>

            {/* Current Path */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Minimum Payments Only
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Time to Payoff:</span>
                  <span className="font-medium">{formatMonthsToYears(minPayoffSimulation.months)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Interest:</span>
                  <span className="font-medium text-red-600">{formatCurrency(minPayoffSimulation.totalInterest)}</span>
                </div>
              </div>
            </div>

            {/* With Extra Payment */}
            {extraPayoffSimulation && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-green-600" />
                  With {formatCurrency(parseFloat(extraPayment))} Extra
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Time to Payoff:</span>
                    <span className="font-medium">{formatMonthsToYears(extraPayoffSimulation.months)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Interest:</span>
                    <span className="font-medium text-green-600">{formatCurrency(extraPayoffSimulation.totalInterest)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-2">
                    <span className="text-slate-600">Savings:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(minPayoffSimulation.totalInterest - extraPayoffSimulation.totalInterest)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Time Saved:</span>
                    <span className="font-bold text-green-600">
                      {formatMonthsToYears(minPayoffSimulation.months - extraPayoffSimulation.months)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="target" className="space-y-4">
            <div>
              <Label>Target Payoff Timeline (months)</Label>
              <Input
                type="number"
                step="1"
                value={targetMonths}
                onChange={(e) => setTargetMonths(e.target.value)}
                placeholder="e.g., 36"
              />
            </div>

            {targetPayment !== null && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  To Pay Off in {formatMonthsToYears(parseInt(targetMonths))}
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Required Payment:</span>
                    <span className="font-bold text-blue-600">{formatCurrency(monthlyMinimums + targetPayment)}/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Additional Amount:</span>
                    <span className="font-medium">{formatCurrency(targetPayment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Interest:</span>
                    <span className="font-medium">{formatCurrency(simulatePayoff(targetPayment).totalInterest)}</span>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Total Monthly with Extra */}
        {extraPayment && (
          <div className="p-4 bg-slate-900 text-white rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-300 mb-1">Total Monthly Payment</p>
                <p className="text-sm text-slate-400">
                  {formatCurrency(monthlyBills)} bills + {formatCurrency(monthlyMinimums + parseFloat(extraPayment))} debt
                </p>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(totalMonthlyObligations + parseFloat(extraPayment))}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
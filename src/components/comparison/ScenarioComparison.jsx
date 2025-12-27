import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { ArrowRight, Trophy, Clock, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/components/utils/calculations';

export default function ScenarioComparison({ scenarios, minimumScenario }) {
  if (!scenarios || scenarios.length === 0) return null;

  // Include minimum payment scenario for comparison
  const allScenarios = [
    {
      name: 'Minimum Only',
      months_to_payoff: minimumScenario.months,
      total_interest: minimumScenario.totalInterest,
      isMinimum: true
    },
    ...scenarios.map(s => ({
      name: s.name,
      months_to_payoff: s.months_to_payoff,
      total_interest: s.total_interest,
      isMinimum: false
    }))
  ].slice(0, 4); // Max 4 for comparison

  const bestTime = Math.min(...allScenarios.filter(s => !s.isMinimum).map(s => s.months_to_payoff));
  const bestInterest = Math.min(...allScenarios.filter(s => !s.isMinimum).map(s => s.total_interest));

  const chartData = allScenarios.map(s => ({
    name: s.name.length > 12 ? s.name.substring(0, 12) + '...' : s.name,
    months: s.months_to_payoff,
    interest: s.total_interest
  }));

  const colors = ['#94A3B8', '#3B82F6', '#8B5CF6', '#10B981'];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Compare Payoff Plans
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 11, fill: '#64748B' }}
                width={80}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white p-3 rounded-lg shadow-lg border text-sm">
                      <p className="font-medium">{payload[0]?.payload?.name}</p>
                      <p className="text-blue-600">{payload[0]?.value} months</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="months" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Comparison Cards */}
        <div className="space-y-3">
          {allScenarios.map((scenario, index) => {
            const isBestTime = !scenario.isMinimum && scenario.months_to_payoff === bestTime;
            const isBestInterest = !scenario.isMinimum && scenario.total_interest === bestInterest;
            const timeSaved = minimumScenario.months - scenario.months_to_payoff;
            const interestSaved = minimumScenario.totalInterest - scenario.total_interest;

            return (
              <div 
                key={scenario.name}
                className={`p-4 rounded-xl border-2 transition-all ${
                  scenario.isMinimum 
                    ? 'bg-slate-50 border-slate-200'
                    : isBestTime || isBestInterest
                      ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
                      : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <span className="font-medium text-slate-800">{scenario.name}</span>
                  </div>
                  <div className="flex gap-1">
                    {isBestTime && (
                      <Badge className="bg-blue-100 text-blue-700 text-xs">Fastest</Badge>
                    )}
                    {isBestInterest && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">Cheapest</Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-lg font-bold text-slate-800">{scenario.months_to_payoff}</p>
                      <p className="text-xs text-slate-500">months</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-lg font-bold text-slate-800">
                        {formatCurrency(scenario.total_interest)}
                      </p>
                      <p className="text-xs text-slate-500">interest</p>
                    </div>
                  </div>
                </div>

                {!scenario.isMinimum && (timeSaved > 0 || interestSaved > 0) && (
                  <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-4 text-xs">
                    {timeSaved > 0 && (
                      <span className="text-emerald-600">
                        <ArrowRight className="w-3 h-3 inline mr-1" />
                        {timeSaved} months faster
                      </span>
                    )}
                    {interestSaved > 0 && (
                      <span className="text-emerald-600">
                        <DollarSign className="w-3 h-3 inline" />
                        {formatCurrency(interestSaved)} saved
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
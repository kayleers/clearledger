import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { 
  formatCurrency, 
  calculateUtilization,
  getUtilizationColor,
  getUtilizationBgColor
} from '@/components/utils/calculations';

export default function TotalDebtCard({ cards }) {
  const totalBalance = cards.reduce((sum, card) => sum + (card.balance || 0), 0);
  const totalLimit = cards.reduce((sum, card) => sum + (card.credit_limit || 0), 0);
  const totalUtilization = calculateUtilization(totalBalance, totalLimit);

  // Group by currency
  const balanceByCurrency = cards.reduce((acc, card) => {
    const curr = card.currency || 'USD';
    if (!acc[curr]) {
      acc[curr] = { balance: 0, limit: 0 };
    }
    acc[curr].balance += card.balance || 0;
    acc[curr].limit += card.credit_limit || 0;
    return acc;
  }, {});

  const currencies = Object.keys(balanceByCurrency);
  const isSingleCurrency = currencies.length === 1;

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-slate-300 text-sm mb-1">Total Debt</p>
            {isSingleCurrency ? (
              <p className="text-3xl font-bold">{formatCurrency(totalBalance, currencies[0])}</p>
            ) : (
              <div className="space-y-1">
                {Object.entries(balanceByCurrency).map(([currency, data]) => (
                  <p key={currency} className="text-2xl font-bold">
                    {formatCurrency(data.balance, currency)}
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="p-3 bg-white/10 rounded-xl">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Credit Used</span>
            <span className={getUtilizationColor(totalUtilization).replace('text-', 'text-')}>{totalUtilization}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${getUtilizationBgColor(totalUtilization)}`}
              style={{ width: `${Math.min(totalUtilization, 100)}%` }}
            />
          </div>
          {isSingleCurrency ? (
            <p className="text-xs text-slate-400">
              {formatCurrency(totalBalance, currencies[0])} of {formatCurrency(totalLimit, currencies[0])} limit
            </p>
          ) : (
            <div className="space-y-1">
              {Object.entries(balanceByCurrency).map(([currency, data]) => (
                <p key={currency} className="text-xs text-slate-400">
                  {formatCurrency(data.balance, currency)} of {formatCurrency(data.limit, currency)} limit
                </p>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
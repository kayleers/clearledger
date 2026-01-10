import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { 
  formatCurrency, 
  calculateUtilization,
  getUtilizationColor,
  getUtilizationBgColor
} from '@/components/utils/calculations';

export default function FinancialOverview({ cards }) {
  const totalBalance = cards.reduce((sum, card) => sum + (card.balance || 0), 0);
  const totalLimit = cards.reduce((sum, card) => sum + (card.credit_limit || 0), 0);
  const totalUtilization = calculateUtilization(totalBalance, totalLimit);

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-slate-300 text-sm mb-1">Total Debt</p>
            <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
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
          <p className="text-xs text-slate-400">
            {formatCurrency(totalBalance)} of {formatCurrency(totalLimit)} limit
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
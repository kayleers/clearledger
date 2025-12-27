import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  CreditCard, 
  TrendingDown, 
  DollarSign, 
  Percent,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { 
  formatCurrency, 
  calculateUtilization,
  calculateMinimumPayment,
  getUtilizationColor,
  getUtilizationBgColor
} from '@/components/utils/calculations';

export default function DashboardSummary({ cards }) {
  const totalBalance = cards.reduce((sum, card) => sum + (card.balance || 0), 0);
  const totalLimit = cards.reduce((sum, card) => sum + (card.credit_limit || 0), 0);
  const totalUtilization = calculateUtilization(totalBalance, totalLimit);
  const totalMinPayment = cards.reduce((sum, card) => 
    sum + calculateMinimumPayment(card.min_payment, card.balance), 0);

  const getUtilizationMessage = () => {
    if (totalUtilization <= 30) {
      return { text: 'Great! Your credit usage is healthy', icon: CheckCircle, color: 'text-emerald-600' };
    } else if (totalUtilization <= 50) {
      return { text: 'Your credit usage is moderate', icon: AlertTriangle, color: 'text-yellow-600' };
    } else if (totalUtilization <= 75) {
      return { text: 'Consider paying down your balances', icon: AlertTriangle, color: 'text-orange-600' };
    }
    return { text: 'High usage may hurt your credit score', icon: AlertTriangle, color: 'text-red-600' };
  };

  const utilizationMessage = getUtilizationMessage();
  const Icon = utilizationMessage.icon;

  return (
    <div className="space-y-4">
      {/* Total Balance Card */}
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-xs text-slate-500">Cards</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{cards.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <DollarSign className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-xs text-slate-500">Min Due</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalMinPayment)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Utilization Message */}
      {cards.length > 0 && (
        <Card className={`border-l-4 ${
          totalUtilization <= 30 ? 'border-l-emerald-500 bg-emerald-50' :
          totalUtilization <= 50 ? 'border-l-yellow-500 bg-yellow-50' :
          totalUtilization <= 75 ? 'border-l-orange-500 bg-orange-50' :
          'border-l-red-500 bg-red-50'
        }`}>
          <CardContent className="p-4 flex items-center gap-3">
            <Icon className={`w-5 h-5 ${utilizationMessage.color}`} />
            <p className={`text-sm font-medium ${utilizationMessage.color}`}>
              {utilizationMessage.text}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
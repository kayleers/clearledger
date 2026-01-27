import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ChevronRight, GripVertical, Zap, Calendar, Pencil, Trash2 } from 'lucide-react';
import { 
  calculateUtilization, 
  calculateMinimumPayment,
  formatCurrency,
  getUtilizationColor,
  getUtilizationBgColor
} from '@/components/utils/calculations';

const cardColors = {
  blue: 'from-blue-600 to-blue-800',
  purple: 'from-purple-600 to-purple-800',
  green: 'from-emerald-600 to-emerald-800',
  red: 'from-rose-600 to-rose-800',
  orange: 'from-orange-500 to-orange-700',
  slate: 'from-slate-600 to-slate-800',
  indigo: 'from-indigo-600 to-indigo-800',
  pink: 'from-pink-500 to-pink-700'
};

export default function CreditCardItem({ card, isDragging, onEdit, onDelete }) {
  const utilization = calculateUtilization(card.balance, card.credit_limit);
  const minPayment = calculateMinimumPayment(card.min_payment, card.balance);
  const gradient = cardColors[card.color] || cardColors.slate;
  const currency = card.currency || 'USD';

  return (
    <div className="relative group">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10">
        <div className="bg-slate-200 rounded p-1">
          <GripVertical className="w-4 h-4 text-slate-500" />
        </div>
      </div>
      <Link to={createPageUrl(`CardDetail?id=${card.id}`)}>
        <Card className={`overflow-hidden hover:shadow-lg transition-all duration-300 ${isDragging ? 'shadow-xl scale-105' : ''}`}>
        {/* Card Header with Gradient */}
        <div className={`bg-gradient-to-r ${gradient} p-4 text-white`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{card.name}</h3>
                  {card.is_active === false && (
                    <Badge variant="outline" className="bg-white/20 text-white border-white/40 text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-white/70 text-sm">
                    {(card.apr * 100)}% APR
                  </p>
                  {card.card_last_four && (
                    <>
                      <span className="text-white/50 text-sm">•</span>
                      <p className="text-white/70 text-sm">••••{card.card_last_four}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onEdit?.(card);
                }}
                className="p-1.5 hover:bg-white/20 rounded transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onDelete?.(card);
                }}
                className="p-1.5 hover:bg-white/20 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <ChevronRight className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 space-y-4">
          {/* Balance */}
          <div className="flex justify-between items-baseline">
            <span className="text-slate-500 text-sm">Balance</span>
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(card.balance, currency)}
            </span>
          </div>

          {/* Utilization Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Credit Used</span>
              <span className={`font-medium ${getUtilizationColor(utilization)}`}>
                {utilization}%
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${getUtilizationBgColor(utilization)}`}
                style={{ width: `${Math.min(utilization, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400">
              {formatCurrency(card.balance, currency)} of {formatCurrency(card.credit_limit, currency)}
            </p>
          </div>

          {/* Min Payment and Projected Payment */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">Minimum Payment</span>
              <span className="font-semibold text-slate-700">
                {formatCurrency(minPayment, currency)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">Projected Payment</span>
              <span className="font-semibold text-blue-600">
                {formatCurrency(
                  (() => {
                    let projected = minPayment;
                    if (card.autopay_amount_type === 'full_balance') projected = card.balance;
                    else if (card.autopay_amount_type === 'custom' && card.autopay_custom_amount) projected = card.autopay_custom_amount;
                    if (card.additional_payment_enabled && card.additional_payment_amount) projected += card.additional_payment_amount;
                    return Math.min(projected, card.balance);
                  })(),
                  currency
                )}
              </span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="pt-2 space-y-1.5">
            {card.statement_date && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Calendar className="w-3 h-3" />
                <span>Statement: {card.statement_date}{getOrdinalSuffix(card.statement_date)} of month</span>
              </div>
            )}
            {card.due_date && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Calendar className="w-3 h-3" />
                <span>Due: {card.due_date}{getOrdinalSuffix(card.due_date)} of month</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs">
              {card.payment_method === 'autopay' ? (
                <>
                  <Zap className="w-3 h-3 text-blue-600" />
                  <span className="text-blue-600 font-medium">
                    Autopay: {getAutopayAmount(card)}
                  </span>
                </>
              ) : (
                <span className="text-slate-500">Manual payments</span>
              )}
            </div>
          </div>
          </div>
          </Card>
          </Link>
          </div>
          );
          }

          // Helper function for ordinal suffix
          function getOrdinalSuffix(day) {
          if (day > 3 && day < 21) return 'th';
          switch (day % 10) {
          case 1: return 'st';
          case 2: return 'nd';
          case 3: return 'rd';
          default: return 'th';
          }
          }

          // Helper function to get autopay amount display
          function getAutopayAmount(card) {
            const currency = card.currency || 'USD';
            if (card.autopay_amount_type === 'minimum') return 'Minimum';
            if (card.autopay_amount_type === 'full_balance') return 'Full Balance';
            if (card.autopay_amount_type === 'custom' && card.autopay_custom_amount) {
              return formatCurrency(card.autopay_custom_amount, currency);
            }
            return 'Minimum';
          }
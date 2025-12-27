import React from 'react';
import { format } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/components/utils/calculations';

const categoryIcons = {
  groceries: '🛒',
  dining: '🍽️',
  shopping: '🛍️',
  gas: '⛽',
  bills: '📄',
  entertainment: '🎬',
  travel: '✈️',
  health: '💊',
  other: '📦'
};

export default function TransactionList({ purchases = [], payments = [], onDeletePurchase, onDeletePayment }) {
  // Combine and sort by date
  const transactions = [
    ...purchases.map(p => ({ ...p, type: 'purchase' })),
    ...payments.map(p => ({ ...p, type: 'payment' }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <div 
          key={`${tx.type}-${tx.id}`}
          className="flex items-center justify-between p-3 bg-white rounded-xl border hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center gap-3">
            {tx.type === 'purchase' ? (
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-lg">
                {categoryIcons[tx.category] || '📦'}
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <ArrowDownCircle className="w-5 h-5 text-emerald-600" />
              </div>
            )}
            <div>
              <p className="font-medium text-slate-800">
                {tx.type === 'purchase' ? tx.description : 'Payment'}
              </p>
              <p className="text-xs text-slate-400">
                {format(new Date(tx.date), 'MMM d, yyyy')}
                {tx.note && ` • ${tx.note}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${tx.type === 'purchase' ? 'text-red-600' : 'text-emerald-600'}`}>
              {tx.type === 'purchase' ? '+' : '-'}{formatCurrency(tx.amount)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-red-500"
              onClick={() => {
                if (tx.type === 'purchase') {
                  onDeletePurchase?.(tx);
                } else {
                  onDeletePayment?.(tx);
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
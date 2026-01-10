import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { createPageUrl } from '@/utils';
import { CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  formatCurrency, 
  calculateUtilization,
  calculateMinimumPayment,
  getUtilizationColor
} from '@/components/utils/calculations';

export default function CardsDetailTable({ cards }) {
  const [expanded, setExpanded] = useState(false);
  const totalMinPayment = cards.reduce((sum, card) => 
    sum + calculateMinimumPayment(card.min_payment, card.balance), 0);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card className="border-blue-200">
        <CollapsibleTrigger className="w-full">
          <CardContent className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-900">{cards.length} Credit Cards</p>
                <p className="text-sm text-slate-500">Min Due: {formatCurrency(totalMinPayment)}</p>
              </div>
            </div>
            {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2">
            {cards.map(card => {
              const utilization = calculateUtilization(card.balance, card.credit_limit);
              const minPayment = calculateMinimumPayment(card.min_payment, card.balance);
              return (
                <Link key={card.id} to={createPageUrl(`CardDetail?id=${card.id}`)} className="block">
                  <div className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-slate-900">{card.name}</p>
                        <p className="text-xs text-slate-500">{card.apr * 100}% APR</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(card.balance, card.currency)}</p>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Min Payment:</span>
                        <span className="font-medium">{formatCurrency(minPayment, card.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Utilization:</span>
                        <span className={getUtilizationColor(utilization)}>{utilization}%</span>
                      </div>
                      {card.due_date && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Due Date:</span>
                          <span className="font-medium">{card.due_date}{card.due_date === 1 ? 'st' : card.due_date === 2 ? 'nd' : card.due_date === 3 ? 'rd' : 'th'} of month</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
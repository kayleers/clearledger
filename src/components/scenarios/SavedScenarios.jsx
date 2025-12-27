import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Trash2, Star, Calendar, DollarSign } from 'lucide-react';
import { formatCurrency, formatMonthsToYears } from '@/components/utils/calculations';
import { format } from 'date-fns';

export default function SavedScenarios({ scenarios = [], onDelete, onToggleFavorite }) {
  if (scenarios.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No saved scenarios yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Use the simulator above to create and save payoff plans
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {scenarios.map(scenario => (
        <Card key={scenario.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-slate-800">{scenario.name}</h4>
                  {scenario.is_favorite && (
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Created {format(new Date(scenario.created_date), 'MMM d, yyyy')}
                </p>
              </div>
              <Badge variant={scenario.payment_type === 'fixed' ? 'default' : 'secondary'}>
                {scenario.payment_type === 'fixed' ? 'Fixed' : 'Variable'}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              {scenario.payment_type === 'fixed' && (
                <div className="p-2 bg-blue-50 rounded-lg text-center">
                  <DollarSign className="w-4 h-4 text-blue-600 mx-auto" />
                  <p className="text-sm font-semibold text-blue-900">
                    {formatCurrency(scenario.fixed_payment)}
                  </p>
                  <p className="text-xs text-blue-600">/month</p>
                </div>
              )}
              <div className="p-2 bg-purple-50 rounded-lg text-center">
                <Calendar className="w-4 h-4 text-purple-600 mx-auto" />
                <p className="text-xs font-semibold text-purple-900">
                  {formatMonthsToYears(scenario.months_to_payoff)}
                </p>
                <p className="text-xs text-purple-600">to pay off</p>
              </div>
              <div className="p-2 bg-rose-50 rounded-lg text-center">
                <DollarSign className="w-4 h-4 text-rose-600 mx-auto" />
                <p className="text-sm font-semibold text-rose-900">
                  {formatCurrency(scenario.total_interest)}
                </p>
                <p className="text-xs text-rose-600">interest</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => onToggleFavorite?.(scenario)}
              >
                <Star className={`w-4 h-4 mr-1 ${scenario.is_favorite ? 'text-amber-500 fill-amber-500' : ''}`} />
                {scenario.is_favorite ? 'Favorited' : 'Favorite'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => onDelete?.(scenario)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
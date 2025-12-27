import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Trash2, Zap } from 'lucide-react';
import { formatCurrency } from '@/components/utils/calculations';

const categoryIcons = {
  groceries: '🛒',
  dining: '🍽️',
  shopping: '🛍️',
  gas: '⛽',
  bills: '📄',
  entertainment: '🎬',
  travel: '✈️',
  health: '🏥',
  other: '💳'
};

export default function TemplateManager({ onUseTemplate }) {
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['transaction-templates'],
    queryFn: async () => {
      const all = await base44.entities.TransactionTemplate.list();
      return all.sort((a, b) => (b.use_count || 0) - (a.use_count || 0));
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.TransactionTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-templates'] });
    }
  });

  const incrementUseMutation = useMutation({
    mutationFn: ({ id, count }) => base44.entities.TransactionTemplate.update(id, {
      use_count: count + 1
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-templates'] });
    }
  });

  const handleUseTemplate = (template) => {
    incrementUseMutation.mutate({ id: template.id, count: template.use_count || 0 });
    if (onUseTemplate) {
      onUseTemplate({
        description: template.description,
        amount: template.amount,
        category: template.category,
        card_id: template.card_id
      });
    }
  };

  if (templates.length === 0) {
    return (
      <div className="text-center py-6 text-slate-500">
        <Zap className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        <p className="text-sm">No templates yet</p>
        <p className="text-xs text-slate-400">Save frequently-used transactions as templates</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-4 h-4 text-yellow-500" />
        <h4 className="font-medium text-slate-700">Quick Templates</h4>
      </div>
      
      {templates.map((template) => (
        <Card 
          key={template.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleUseTemplate(template)}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">{categoryIcons[template.category]}</span>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{template.name}</p>
                  <p className="text-sm text-slate-500">{template.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-600">
                  ${template.amount}
                </span>
                {template.use_count > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {template.use_count}x
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this template?')) {
                      deleteTemplateMutation.mutate(template.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
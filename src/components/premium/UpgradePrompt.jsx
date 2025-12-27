import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Check, Sparkles, Lock } from 'lucide-react';

export default function UpgradePrompt({ currentCardCount, maxFreeCards = 2, onUpgrade }) {
  const isLimitReached = currentCardCount >= maxFreeCards;

  if (!isLimitReached) return null;

  return (
    <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-6 h-6" />
          <span className="font-semibold text-lg">Upgrade to Pro</span>
        </div>
        
        <p className="text-white/90 mb-4">
          You've reached the limit of {maxFreeCards} free cards. Upgrade to unlock unlimited cards and advanced features!
        </p>

        <div className="space-y-2 mb-4">
          {[
            'Unlimited credit cards',
            'Advanced payoff scenarios',
            'Detailed analytics',
            'Export your data'
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <Button 
          onClick={onUpgrade}
          className="w-full bg-white text-orange-600 hover:bg-white/90 font-semibold"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Upgrade Now
        </Button>
      </CardContent>
    </Card>
  );
}

export function LockedFeature({ feature, onUpgrade }) {
  return (
    <div className="p-6 bg-slate-50 rounded-xl text-center border-2 border-dashed border-slate-200">
      <Lock className="w-8 h-8 text-slate-400 mx-auto mb-3" />
      <p className="font-medium text-slate-700 mb-1">{feature}</p>
      <p className="text-sm text-slate-500 mb-4">Available with Pro</p>
      <Button variant="outline" size="sm" onClick={onUpgrade}>
        <Crown className="w-4 h-4 mr-2 text-amber-500" />
        Upgrade
      </Button>
    </div>
  );
}
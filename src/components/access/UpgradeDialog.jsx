import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Crown, Zap } from 'lucide-react';
import { TIERS, TIER_DETAILS } from './tierConfig';
import { useEntitlements } from './EntitlementsProvider';
import SubscriptionPurchaseDialog from '@/components/billing/SubscriptionPurchaseDialog';

export default function UpgradeDialog({ open, onOpenChange, context = 'general', itemType = 'item' }) {
  const { userTier } = useEntitlements();
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);

  const contextMessages = {
    creditCards: {
      title: 'Add More Credit Cards',
      description: `You've reached your limit of ${TIER_DETAILS[userTier].limits.creditCards} credit cards on the ${TIER_DETAILS[userTier].name} plan.`
    },
    loans: {
      title: 'Add More Loans',
      description: `You've reached your limit of ${TIER_DETAILS[userTier].limits.loans} loans on the ${TIER_DETAILS[userTier].name} plan.`
    },
    bankAccounts: {
      title: 'Add More Bank Accounts',
      description: `You've reached your limit of ${TIER_DETAILS[userTier].limits.bankAccounts} bank accounts on the ${TIER_DETAILS[userTier].name} plan.`
    },
    recurringBills: {
      title: 'Add More Bills',
      description: `You've reached your limit of ${TIER_DETAILS[userTier].limits.recurringBills} recurring bills on the ${TIER_DETAILS[userTier].name} plan.`
    },
    savedScenarios: {
      title: 'Save More Scenarios',
      description: `You've reached your limit of ${TIER_DETAILS[userTier].limits.savedScenarios} saved scenarios on the ${TIER_DETAILS[userTier].name} plan.`
    },
    calendar: {
      title: 'View Full Calendar',
      description: `You can only view ${TIER_DETAILS[userTier].limits.calendarMonths} months ahead on the ${TIER_DETAILS[userTier].name} plan.`
    },
    general: {
      title: 'Upgrade to Continue',
      description: `You've reached your limit on the ${TIER_DETAILS[userTier].name} plan.`
    }
  };

  const message = contextMessages[context] || contextMessages.general;

  const handleUpgrade = () => {
    setShowPurchaseDialog(true);
  };

  const handlePurchaseComplete = () => {
    setShowPurchaseDialog(false);
    onOpenChange(false);
    window.location.reload(); // Refresh to update tier
  };

  const showLifetime = userTier === TIERS.FREE;
  const showPro = userTier === TIERS.FREE || userTier === TIERS.LIFETIME;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{message.title}</DialogTitle>
          <DialogDescription className="text-base">{message.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {showLifetime && (
            <div className="border-2 border-purple-200 rounded-xl p-6 hover:border-purple-400 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="w-5 h-5 text-purple-600" />
                    <h3 className="text-xl font-bold text-slate-900">Lifetime Access</h3>
                  </div>
                  <p className="text-sm text-slate-600">For people who hate subscriptions</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-purple-600">$19.99</p>
                  <p className="text-sm text-slate-500">One-time</p>
                </div>
              </div>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Up to 8 credit cards</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Up to 5 loans</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Up to 5 bank accounts</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Up to 10 recurring bills</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Unlimited saved scenarios</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Full payment timeline</span>
                </div>
              </div>

              <Button 
                onClick={handleUpgrade}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                Get Lifetime Access
              </Button>
            </div>
          )}

          {showPro && (
            <div className="border-2 border-blue-200 rounded-xl p-6 hover:border-blue-400 transition-colors relative overflow-hidden">
              <div className="absolute top-0 right-0">
                <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 rounded-tl-none rounded-br-none">
                  Most Popular
                </Badge>
              </div>

              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <h3 className="text-xl font-bold text-slate-900">Pro Subscription</h3>
                  </div>
                  <p className="text-sm text-slate-600">Unlimited everything</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-600">$3.99</p>
                  <p className="text-sm text-slate-500">/month</p>
                  <p className="text-xs text-slate-400 mt-1">or $29.99/year</p>
                </div>
              </div>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span>Everything in Lifetime, plus:</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span><strong>Unlimited</strong> credit cards</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span><strong>Unlimited</strong> loans</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span><strong>Unlimited</strong> bank accounts</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span><strong>Unlimited</strong> recurring bills</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Priority access to future features</span>
                </div>
              </div>

              <Button 
                onClick={handleUpgrade}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Start Pro Subscription
              </Button>
            </div>
          )}

          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Maybe Later
            </Button>
            </div>
            </DialogContent>
            </Dialog>

            <SubscriptionPurchaseDialog 
            open={showPurchaseDialog}
            onOpenChange={setShowPurchaseDialog}
            onPurchaseComplete={handlePurchaseComplete}
            />
            </>
            );
            }
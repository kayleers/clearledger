import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Check } from 'lucide-react';
import { PRODUCT_PRICING, GOOGLE_PLAY_PRODUCTS, FREE_LIMITS } from './tierConfig';
import { googlePlayBilling } from '@/components/billing/GooglePlayBillingService';
import { useEntitlements } from './EntitlementsProvider';
import { isAndroid } from '@/components/platform/platformDetection';

export default function UpgradeDialog({ open, onOpenChange, context = 'general' }) {
  const [purchasing, setPurchasing] = useState(null);
  const { refreshPlan } = useEntitlements();

  const handlePurchase = async (productId) => {
    if (!isAndroid()) {
      alert('Purchases are only available on Android via Google Play');
      return;
    }

    setPurchasing(productId);
    try {
      await googlePlayBilling.purchaseProduct(productId);
      await refreshPlan();
      onOpenChange(false);
      alert('Purchase successful! Your Pro features are now unlocked.');
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Purchase failed. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  const contextMessages = {
    creditCards: `You've reached the limit of ${FREE_LIMITS.creditCards} credit cards on the free plan.`,
    loans: `You've reached the limit of ${FREE_LIMITS.loans} loan on the free plan.`,
    bankAccounts: `You've reached the limit of ${FREE_LIMITS.bankAccounts} bank account on the free plan.`,
    recurringBills: `You've reached the limit of ${FREE_LIMITS.recurringBills} recurring bills on the free plan.`,
    currencyConversions: `You've reached the limit of ${FREE_LIMITS.currencyConversions} currency conversion on the free plan.`,
    general: 'Upgrade to Pro to unlock unlimited access.'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            Upgrade to Pro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-slate-600">{contextMessages[context]}</p>

          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-semibold mb-3">Pro Features:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Unlimited credit cards</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Unlimited bank accounts</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Unlimited loans</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Unlimited recurring bills</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Unlimited currency conversions</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Full access to all features</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => handlePurchase(GOOGLE_PLAY_PRODUCTS.PRO_MONTHLY)}
              disabled={purchasing !== null}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              <div className="flex items-center justify-between w-full">
                <span>Pro Monthly</span>
                <span className="font-bold">$2.99/mo</span>
              </div>
            </Button>

            <Button
              onClick={() => handlePurchase(GOOGLE_PLAY_PRODUCTS.PRO_YEARLY)}
              disabled={purchasing !== null}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span>Pro Yearly</span>
                  <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-semibold">
                    Save 30%
                  </span>
                </div>
                <span className="font-bold">$24.99/yr</span>
              </div>
            </Button>

            <Button
              onClick={() => handlePurchase(GOOGLE_PLAY_PRODUCTS.LIFETIME)}
              disabled={purchasing !== null}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span>Lifetime Access</span>
                  <span className="text-xs bg-white text-orange-600 px-2 py-0.5 rounded-full font-semibold">
                    BEST VALUE
                  </span>
                </div>
                <span className="font-bold">$49.99</span>
              </div>
            </Button>
          </div>

          {purchasing && (
            <p className="text-sm text-slate-600 text-center">Processing purchase...</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
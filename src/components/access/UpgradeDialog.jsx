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
      <DialogContent className="max-w-md bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 border-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Crown className="w-6 h-6 text-yellow-300" />
            Upgrade to Pro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <h4 className="font-semibold mb-2 text-white">Free Tier Limits:</h4>
            <ul className="space-y-1 text-sm text-white/90 mb-3">
              <li>• 2 credit cards</li>
              <li>• 2 bank accounts</li>
              <li>• 2 recurring bills</li>
              <li>• 2 deposits</li>
              <li>• 2 bank transfers</li>
              <li>• 2 loans</li>
              <li>• 2 currency conversions</li>
            </ul>
            <p className="text-white font-medium text-center pt-2 border-t border-white/20">
              Upgrade to Pro for unlimited access.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => handlePurchase(GOOGLE_PLAY_PRODUCTS.PRO_MONTHLY)}
              disabled={purchasing !== null}
              className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-white/30"
            >
              <div className="flex items-center justify-between w-full">
                <span>Pro Monthly</span>
                <span className="font-bold">$2.99/mo</span>
              </div>
            </Button>

            <Button
              onClick={() => handlePurchase(GOOGLE_PLAY_PRODUCTS.PRO_YEARLY)}
              disabled={purchasing !== null}
              className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-white/30"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span>Pro Yearly</span>
                  <span className="text-[10px] bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full font-semibold">
                    Save 30%
                  </span>
                </div>
                <span className="font-bold">$24.99/yr</span>
              </div>
            </Button>

            <Button
              onClick={() => handlePurchase(GOOGLE_PLAY_PRODUCTS.LIFETIME)}
              disabled={purchasing !== null}
              className="w-full bg-yellow-400/90 hover:bg-yellow-400 text-yellow-900 font-bold border-0"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span>Lifetime Access</span>
                  <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-semibold">
                    BEST VALUE
                  </span>
                </div>
                <span className="font-bold">$49.99</span>
              </div>
            </Button>
          </div>

          {purchasing && (
            <p className="text-sm text-white/80 text-center">Processing purchase...</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
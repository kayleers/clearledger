import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Crown, Sparkles } from 'lucide-react';
import { PRODUCT_PRICING, GOOGLE_PLAY_PRODUCTS } from './tierConfig';
import { googlePlayBilling } from '@/components/billing/GooglePlayBillingService';
import { useEntitlements } from './EntitlementsProvider';
import { isAndroid } from '@/components/platform/platformDetection';

export default function UpgradeBanner() {
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
      // Refresh entitlement after successful purchase
      await refreshPlan();
      alert('Purchase successful! Your Pro features are now unlocked.');
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Purchase failed. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 mb-6 border-0 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Crown className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-bold text-white">Upgrade to Pro</h3>
            <Sparkles className="w-4 h-4 text-yellow-300" />
          </div>
          <p className="text-white/90 text-sm mb-4">
            Remove all limits and unlock unlimited access to everything
          </p>
          
          <div className="grid grid-cols-1 gap-2">
            {/* Monthly */}
            <Button
              onClick={() => handlePurchase(GOOGLE_PLAY_PRODUCTS.PRO_MONTHLY)}
              disabled={purchasing !== null}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-white/30 justify-between"
              size="sm"
            >
              <span className="font-medium truncate">
                {PRODUCT_PRICING[GOOGLE_PLAY_PRODUCTS.PRO_MONTHLY].name}
              </span>
              <span className="font-bold whitespace-nowrap ml-2 flex-shrink-0">
                {PRODUCT_PRICING[GOOGLE_PLAY_PRODUCTS.PRO_MONTHLY].price}{PRODUCT_PRICING[GOOGLE_PLAY_PRODUCTS.PRO_MONTHLY].period}
              </span>
            </Button>

            {/* Yearly */}
            <Button
              onClick={() => handlePurchase(GOOGLE_PLAY_PRODUCTS.PRO_YEARLY)}
              disabled={purchasing !== null}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-white/30 justify-between"
              size="sm"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-medium">
                  Pro Yearly
                </span>
                <span className="text-[8px] bg-yellow-400 text-yellow-900 px-1 py-0.5 rounded-full font-semibold whitespace-nowrap flex-shrink-0">
                  Save 30%
                </span>
              </div>
              <span className="font-bold whitespace-nowrap ml-2 flex-shrink-0">
                {PRODUCT_PRICING[GOOGLE_PLAY_PRODUCTS.PRO_YEARLY].price}{PRODUCT_PRICING[GOOGLE_PLAY_PRODUCTS.PRO_YEARLY].period}
              </span>
            </Button>

            {/* Lifetime */}
            <Button
              onClick={() => handlePurchase(GOOGLE_PLAY_PRODUCTS.LIFETIME)}
              disabled={purchasing !== null}
              className="bg-white hover:bg-white/90 text-purple-600 font-bold border-0 justify-between"
              size="sm"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-bold truncate">
                  {PRODUCT_PRICING[GOOGLE_PLAY_PRODUCTS.LIFETIME].name}
                </span>
                <span className="text-xs bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-2 py-0.5 rounded-full font-semibold whitespace-nowrap flex-shrink-0">
                  BEST VALUE
                </span>
              </div>
              <span className="font-bold whitespace-nowrap ml-2 flex-shrink-0">
                {PRODUCT_PRICING[GOOGLE_PLAY_PRODUCTS.LIFETIME].price}
              </span>
            </Button>
          </div>

          {purchasing && (
            <p className="text-white text-xs mt-2 text-center">Processing purchase...</p>
          )}
        </div>
      </div>
    </Card>
  );
}
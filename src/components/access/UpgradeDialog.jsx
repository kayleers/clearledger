import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Loader2 } from 'lucide-react';
import { FREE_LIMITS, GOOGLE_PLAY_PRODUCTS } from './tierConfig';
import { googlePlayBilling } from '@/components/billing/GooglePlayBillingService';
import { useEntitlements } from './EntitlementsProvider';
import { isAndroid } from '@/components/platform/platformDetection';
import { base44 } from '@/api/base44Client';

export default function UpgradeDialog({ open, onOpenChange, context = 'general' }) {
  const [purchasing, setPurchasing] = useState(null);
  const { refreshPlan } = useEntitlements();

  const handleStripePurchase = async (plan) => {
    // Block inside iframes (Base44 preview)
    if (window.self !== window.top) {
      alert('Checkout is only available from the published app, not the preview.');
      return;
    }

    setPurchasing(plan);
    try {
      const response = await base44.functions.invoke('stripeCheckout', {
        plan,
        successUrl: window.location.origin + '?stripe_success=1',
        cancelUrl: window.location.href
      });
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Stripe checkout error:', error);
      alert('Could not start checkout. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  const handleGooglePlayPurchase = async (productId) => {
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

  const handlePurchase = (plan, googlePlayProductId) => {
    if (isAndroid()) {
      handleGooglePlayPurchase(googlePlayProductId);
    } else {
      handleStripePurchase(plan);
    }
  };

  // Check for successful Stripe return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_success') === '1') {
      refreshPlan();
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('stripe_success');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

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
              onClick={() => handlePurchase('monthly', GOOGLE_PLAY_PRODUCTS.PRO_MONTHLY)}
              disabled={purchasing !== null}
              className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-white/30"
            >
              {purchasing === 'monthly' || purchasing === GOOGLE_PLAY_PRODUCTS.PRO_MONTHLY ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span>Pro Monthly</span>
                  <span className="font-bold">$2.99/mo</span>
                </div>
              )}
            </Button>

            <Button
              onClick={() => handlePurchase('yearly', GOOGLE_PLAY_PRODUCTS.PRO_YEARLY)}
              disabled={purchasing !== null}
              className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-white/30"
            >
              {purchasing === 'yearly' || purchasing === GOOGLE_PLAY_PRODUCTS.PRO_YEARLY ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span>Pro Yearly</span>
                    <span className="text-[10px] bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full font-semibold">
                      Save 30%
                    </span>
                  </div>
                  <span className="font-bold">$24.99/yr</span>
                </div>
              )}
            </Button>

            <Button
              onClick={() => handlePurchase('lifetime', GOOGLE_PLAY_PRODUCTS.LIFETIME)}
              disabled={purchasing !== null}
              className="w-full bg-yellow-400/90 hover:bg-yellow-400 text-yellow-900 font-bold border-0"
            >
              {purchasing === 'lifetime' || purchasing === GOOGLE_PLAY_PRODUCTS.LIFETIME ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span>Lifetime Access</span>
                    <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-semibold">
                      BEST VALUE
                    </span>
                  </div>
                  <span className="font-bold">$49.99</span>
                </div>
              )}
            </Button>
          </div>

          {!isAndroid() && (
            <p className="text-xs text-white/60 text-center">
              Payments processed securely by Stripe
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
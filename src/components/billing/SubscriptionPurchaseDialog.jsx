import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';
import { isAndroid } from '@/components/platform/platformDetection';
import { googlePlayBilling, GOOGLE_PLAY_PRODUCTS } from '@/components/billing/GooglePlayBillingService';

export default function SubscriptionPurchaseDialog({ open, onOpenChange, onPurchaseComplete }) {
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');

  const handlePurchase = async (productId) => {
    if (!isAndroid()) {
      // Redirect to web payment (Stripe, etc.)
      window.location.href = '/subscribe';
      return;
    }

    setPurchasing(true);
    setError('');

    try {
      await googlePlayBilling.purchaseProduct(productId);
      onPurchaseComplete?.();
      onOpenChange(false);
    } catch (err) {
      setError(err.message || 'Purchase failed');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Your Plan</DialogTitle>
          <DialogDescription>
            {isAndroid() 
              ? 'Purchase through Google Play' 
              : 'Unlock premium features with a subscription'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Lifetime Plan */}
          <div className="border-2 border-purple-200 rounded-xl p-6 hover:border-purple-400 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Lifetime Access</h3>
                <p className="text-sm text-slate-600">One-time purchase, yours forever</p>
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
                <span>Up to 5 loans & 5 bank accounts</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600" />
                <span>Unlimited saved scenarios</span>
              </div>
            </div>

            <Button 
              onClick={() => handlePurchase(GOOGLE_PLAY_PRODUCTS.LIFETIME)}
              disabled={purchasing}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {purchasing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Purchase Lifetime'
              )}
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="border-2 border-blue-200 rounded-xl p-6 hover:border-blue-400 transition-colors relative">
            <Badge className="absolute top-4 right-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
              Most Popular
            </Badge>

            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Pro Subscription</h3>
                <p className="text-sm text-slate-600">Unlimited everything</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-600">$3.99</p>
                <p className="text-sm text-slate-500">/month</p>
              </div>
            </div>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600" />
                <span><strong>Unlimited</strong> credit cards, loans & accounts</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600" />
                <span>Full payment timeline & scenarios</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600" />
                <span>Priority support</span>
              </div>
            </div>

            <div className="space-y-2">
              <Button 
                onClick={() => handlePurchase(GOOGLE_PLAY_PRODUCTS.PRO_MONTHLY)}
                disabled={purchasing}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {purchasing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Subscribe Monthly'
                )}
              </Button>
              
              <Button 
                onClick={() => handlePurchase(GOOGLE_PLAY_PRODUCTS.PRO_YEARLY)}
                disabled={purchasing}
                variant="outline"
                className="w-full"
              >
                Subscribe Yearly (Save 38%)
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
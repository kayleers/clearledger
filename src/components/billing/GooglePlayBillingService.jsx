/**
 * Google Play Billing Service
 * Handles communication with Capacitor native Android billing plugin
 */

import { isAndroid } from '@/components/platform/platformDetection';

// Google Play Product IDs (configure these in Google Play Console)
export const GOOGLE_PLAY_PRODUCTS = {
  PRO_MONTHLY: 'clearledger_pro_monthly',
  PRO_YEARLY: 'clearledger_pro_yearly',
  LIFETIME: 'clearledger_lifetime'
};

class GooglePlayBillingService {
  constructor() {
    this.isInitialized = false;
    this.activeSubscriptions = [];
  }

  /**
   * Initialize Google Play Billing connection
   */
  async initialize() {
    if (!isAndroid()) {
      console.log('Not on Android, skipping Google Play Billing initialization');
      return false;
    }

    try {
      // Check if Capacitor plugin is available
      if (!window.Capacitor?.Plugins?.GooglePlayBilling) {
        console.warn('Google Play Billing plugin not found');
        return false;
      }

      const result = await window.Capacitor.Plugins.GooglePlayBilling.initialize();
      this.isInitialized = result.success;
      return this.isInitialized;
    } catch (error) {
      console.error('Failed to initialize Google Play Billing:', error);
      return false;
    }
  }

  /**
   * Check and return active subscriptions and one-time purchases
   */
  async getActiveSubscriptions() {
    if (!isAndroid() || !this.isInitialized) {
      return [];
    }

    try {
      // Query both subscriptions and one-time purchases
      const [subsResult, inAppResult] = await Promise.all([
        window.Capacitor.Plugins.GooglePlayBilling.queryPurchases({ productType: 'subs' }),
        window.Capacitor.Plugins.GooglePlayBilling.queryPurchases({ productType: 'inapp' })
      ]);
      
      const allPurchases = [];
      
      // Add active subscriptions
      if (subsResult.success && subsResult.purchases) {
        const activeSubs = subsResult.purchases.filter(purchase => {
          return purchase.acknowledged && !purchase.isExpired;
        });
        allPurchases.push(...activeSubs);
      }
      
      // Add one-time purchases (non-consumable, like lifetime)
      if (inAppResult.success && inAppResult.purchases) {
        const activeInApp = inAppResult.purchases.filter(purchase => {
          return purchase.acknowledged && purchase.productId === GOOGLE_PLAY_PRODUCTS.LIFETIME;
        });
        allPurchases.push(...activeInApp);
      }
      
      this.activeSubscriptions = allPurchases;
      return this.activeSubscriptions;
    } catch (error) {
      console.error('Failed to query purchases:', error);
      return [];
    }
  }

  /**
   * Determine subscription tier from Google Play purchases
   */
  async getSubscriptionTier() {
    const subscriptions = await this.getActiveSubscriptions();
    
    if (subscriptions.length === 0) {
      return 'free';
    }

    // Check for Pro subscription (monthly or yearly)
    const hasPro = subscriptions.some(sub => 
      sub.productId === GOOGLE_PLAY_PRODUCTS.PRO_MONTHLY ||
      sub.productId === GOOGLE_PLAY_PRODUCTS.PRO_YEARLY
    );
    
    if (hasPro) {
      return 'pro';
    }

    // Check for Lifetime
    const hasLifetime = subscriptions.some(sub => 
      sub.productId === GOOGLE_PLAY_PRODUCTS.LIFETIME
    );
    
    if (hasLifetime) {
      return 'lifetime';
    }

    return 'free';
  }

  /**
   * Launch purchase flow for a product
   */
  async purchaseProduct(productId) {
    if (!isAndroid() || !this.isInitialized) {
      throw new Error('Google Play Billing not available');
    }

    try {
      // Determine product type (subscription vs one-time purchase)
      const productType = productId === GOOGLE_PLAY_PRODUCTS.LIFETIME ? 'inapp' : 'subs';
      
      const result = await window.Capacitor.Plugins.GooglePlayBilling.launchPurchaseFlow({
        productId: productId,
        productType: productType
      });

      if (result.success) {
        // Acknowledge purchase immediately (required for one-time purchases)
        if (productType === 'inapp' && !result.purchase.acknowledged) {
          await this.acknowledgePurchase(result.purchase.purchaseToken);
        }
        
        // Verify and persist purchase
        await this.verifyAndPersistPurchase(result.purchase);
        return result.purchase;
      } else {
        throw new Error(result.error || 'Purchase failed');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      throw error;
    }
  }

  /**
   * Acknowledge a purchase (required for one-time purchases)
   */
  async acknowledgePurchase(purchaseToken) {
    try {
      await window.Capacitor.Plugins.GooglePlayBilling.acknowledgePurchase({
        purchaseToken: purchaseToken
      });
      return true;
    } catch (error) {
      console.error('Failed to acknowledge purchase:', error);
      return false;
    }
  }

  /**
   * Verify and persist purchase entitlement to user account
   */
  async verifyAndPersistPurchase(purchase) {
    try {
      // Import base44 client dynamically to avoid circular dependencies
      const { base44 } = await import('@/api/base44Client');
      
      // Determine plan tier from product ID
      let plan = 'free';
      if (purchase.productId === GOOGLE_PLAY_PRODUCTS.LIFETIME ||
          purchase.productId === GOOGLE_PLAY_PRODUCTS.PRO_MONTHLY ||
          purchase.productId === GOOGLE_PLAY_PRODUCTS.PRO_YEARLY) {
        plan = 'pro';
      }
      
      // Persist entitlement to user account (syncs across devices)
      await base44.auth.updateMe({
        plan: plan,
        google_play_purchase: {
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
          orderId: purchase.orderId,
          purchaseTime: purchase.purchaseTime || Date.now(),
          acknowledged: true
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to persist purchase:', error);
      return false;
    }
  }

  /**
   * Restore purchases (useful after reinstall)
   */
  async restorePurchases() {
    return await this.getActiveSubscriptions();
  }

  /**
   * Get product details from Google Play
   */
  async getProductDetails(productIds) {
    if (!isAndroid() || !this.isInitialized) {
      return [];
    }

    try {
      // Query both subscription and one-time purchase products
      const [subsResult, inAppResult] = await Promise.all([
        window.Capacitor.Plugins.GooglePlayBilling.queryProductDetails({
          productIds: productIds.filter(id => id !== GOOGLE_PLAY_PRODUCTS.LIFETIME),
          productType: 'subs'
        }),
        window.Capacitor.Plugins.GooglePlayBilling.queryProductDetails({
          productIds: productIds.filter(id => id === GOOGLE_PLAY_PRODUCTS.LIFETIME),
          productType: 'inapp'
        })
      ]);

      const allProducts = [
        ...(subsResult.products || []),
        ...(inAppResult.products || [])
      ];

      return allProducts;
    } catch (error) {
      console.error('Failed to get product details:', error);
      return [];
    }
  }

  /**
   * Check if user has lifetime purchase (for entitlement validation)
   */
  async hasLifetimePurchase() {
    const purchases = await this.getActiveSubscriptions();
    return purchases.some(p => p.productId === GOOGLE_PLAY_PRODUCTS.LIFETIME);
  }
}

// Singleton instance
export const googlePlayBilling = new GooglePlayBillingService();
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
   * Check and return active subscriptions
   */
  async getActiveSubscriptions() {
    if (!isAndroid() || !this.isInitialized) {
      return [];
    }

    try {
      const result = await window.Capacitor.Plugins.GooglePlayBilling.queryPurchases();
      
      if (result.success && result.purchases) {
        // Filter active subscriptions only
        this.activeSubscriptions = result.purchases.filter(purchase => {
          return purchase.acknowledged && !purchase.isExpired;
        });
        return this.activeSubscriptions;
      }
      
      return [];
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
      const result = await window.Capacitor.Plugins.GooglePlayBilling.launchPurchaseFlow({
        productId: productId
      });

      if (result.success) {
        // Verify purchase on server
        await this.verifyPurchase(result.purchase);
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
   * Verify purchase with backend (recommended for security)
   */
  async verifyPurchase(purchase) {
    try {
      // Send purchase token to backend for server-side verification
      const response = await fetch('/api/verify-google-play-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseToken: purchase.purchaseToken,
          productId: purchase.productId,
          orderId: purchase.orderId
        })
      });

      const result = await response.json();
      return result.valid;
    } catch (error) {
      console.error('Purchase verification failed:', error);
      // Fallback: trust client-side validation (less secure)
      return purchase.acknowledged;
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
      const result = await window.Capacitor.Plugins.GooglePlayBilling.queryProductDetails({
        productIds: productIds
      });

      return result.products || [];
    } catch (error) {
      console.error('Failed to get product details:', error);
      return [];
    }
  }
}

// Singleton instance
export const googlePlayBilling = new GooglePlayBillingService();
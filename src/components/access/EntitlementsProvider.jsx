import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TIERS, getHighestTier, GOOGLE_PLAY_PRODUCT_TO_TIER } from './tierConfig';
import { isAndroid } from '@/components/platform/platformDetection';
import { googlePlayBilling } from '@/components/billing/GooglePlayBillingService';

const EntitlementsContext = createContext(null);

export function EntitlementsProvider({ children }) {
  const [userTier, setUserTier] = useState(TIERS.FREE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserTier();
  }, []);

  const loadUserTier = async () => {
    try {
      const user = await base44.auth.me();
      
      // On Android, check Google Play Billing first
      if (isAndroid()) {
        try {
          await googlePlayBilling.initialize();
          const subscriptions = await googlePlayBilling.getActiveSubscriptions();
          
          if (subscriptions.length > 0) {
            // Find the highest tier subscription
            let highestTier = TIERS.FREE;
            for (const sub of subscriptions) {
              const tier = GOOGLE_PLAY_PRODUCT_TO_TIER[sub.productId];
              if (tier) {
                highestTier = getHighestTier(highestTier, tier);
              }
            }
            
            if (highestTier !== TIERS.FREE) {
              setUserTier(highestTier);
              
              // Sync with backend if different
              if (user.subscription_tier !== highestTier) {
                await base44.auth.updateMe({ subscription_tier: highestTier });
              }
              
              setIsLoading(false);
              return;
            }
          }
        } catch (error) {
          console.error('Google Play Billing check failed:', error);
          // Fall through to web-based tier check
        }
      }
      
      // Web or fallback: Use backend tier
      const tier = user.subscription_tier || TIERS.FREE;
      setUserTier(tier);
    } catch (error) {
      console.error('Error loading user tier:', error);
      setUserTier(TIERS.FREE);
    } finally {
      setIsLoading(false);
    }
  };

  const upgradeTier = async (newTier) => {
    try {
      const currentTier = userTier;
      const bestTier = getHighestTier(currentTier, newTier);
      
      await base44.auth.updateMe({ subscription_tier: bestTier });
      setUserTier(bestTier);
      
      return bestTier;
    } catch (error) {
      console.error('Error upgrading tier:', error);
      throw error;
    }
  };

  const downgradeTier = async (newTier) => {
    try {
      await base44.auth.updateMe({ subscription_tier: newTier });
      setUserTier(newTier);
    } catch (error) {
      console.error('Error downgrading tier:', error);
      throw error;
    }
  };

  const value = {
    userTier,
    isLoading,
    upgradeTier,
    downgradeTier,
    refreshTier: loadUserTier
  };

  return (
    <EntitlementsContext.Provider value={value}>
      {children}
    </EntitlementsContext.Provider>
  );
}

export function useEntitlements() {
  const context = useContext(EntitlementsContext);
  if (!context) {
    throw new Error('useEntitlements must be used within EntitlementsProvider');
  }
  return context;
}
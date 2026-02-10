import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { PLAN_TYPES, GOOGLE_PLAY_PRODUCT_TO_PLAN } from './tierConfig';
import { isAndroid } from '@/components/platform/platformDetection';
import { googlePlayBilling } from '@/components/billing/GooglePlayBillingService';

const EntitlementsContext = createContext(null);

export function EntitlementsProvider({ children }) {
  const [userPlan, setUserPlan] = useState(PLAN_TYPES.FREE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserPlan();
    
    // Refresh entitlement on app visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadUserPlan();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const loadUserPlan = async () => {
    try {
      const user = await base44.auth.me();
      
      // CRITICAL: Only Android users can use the app
      // Check Google Play Billing for entitlement
      if (isAndroid()) {
        try {
          await googlePlayBilling.initialize();
          const subscriptions = await googlePlayBilling.getActiveSubscriptions();
          
          // Determine plan from Google Play purchases
          let plan = PLAN_TYPES.FREE;
          if (subscriptions.length > 0) {
            // Check if any active purchase grants Pro access
            // This includes: monthly, yearly subscriptions, and lifetime one-time purchase
            const hasPro = subscriptions.some(sub => 
              GOOGLE_PLAY_PRODUCT_TO_PLAN[sub.productId] === PLAN_TYPES.PRO
            );
            
            if (hasPro) {
              plan = PLAN_TYPES.PRO;
            }
          }
          
          // IMPORTANT: Sync entitlement with backend for cross-device support
          // Backend stores the entitlement, so other devices can access it
          if (user.plan !== plan) {
            await base44.auth.updateMe({ 
              plan,
              last_entitlement_sync: new Date().toISOString()
            });
          }
          
          setUserPlan(plan);
          setIsLoading(false);
          return;
        } catch (error) {
          console.error('Google Play Billing check failed:', error);
          
          // Fallback: Check backend for persisted entitlement
          // This ensures lifetime purchases work across devices
          const plan = user.plan || PLAN_TYPES.FREE;
          setUserPlan(plan);
          setIsLoading(false);
          return;
        }
      }
      
      // Non-Android: Use stored plan from backend
      // This allows testing in web preview and cross-device sync
      const plan = user.plan || PLAN_TYPES.FREE;
      setUserPlan(plan);
    } catch (error) {
      console.error('Error loading user plan:', error);
      setUserPlan(PLAN_TYPES.FREE);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPlan = async () => {
    await loadUserPlan();
  };

  const value = {
    userPlan,
    isLoading,
    refreshPlan
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
import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { PLAN_TYPES, GOOGLE_PLAY_PRODUCT_TO_PLAN } from './tierConfig';
import { isAndroid } from '@/components/platform/platformDetection';
import { googlePlayBilling } from '@/components/billing/GooglePlayBillingService';

const EntitlementsContext = createContext(null);

/**
 * Returns the "highest" (most permissive) plan between two values.
 * free < pro  –  we never want to downgrade.
 */
function maxPlan(a, b) {
  if (a === PLAN_TYPES.PRO || b === PLAN_TYPES.PRO) return PLAN_TYPES.PRO;
  return PLAN_TYPES.FREE;
}

export function EntitlementsProvider({ children }) {
  const [userPlan, setUserPlan] = useState(PLAN_TYPES.FREE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserPlan();

    // Re-check whenever the user returns to the app (tab switch, background→foreground)
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

      // ── Step 1: backend-stored plan is always the minimum floor ──────────
      // It was written when a purchase was verified, so trust it even if
      // Google Play Billing is unavailable right now.
      const storedPlan = user?.plan || PLAN_TYPES.FREE;

      // ── Step 2: on Android, also query Google Play for live entitlement ──
      let googlePlayPlan = PLAN_TYPES.FREE;

      if (isAndroid()) {
        try {
          const initialized = await googlePlayBilling.initialize();

          if (initialized) {
            const subscriptions = await googlePlayBilling.getActiveSubscriptions();

            if (subscriptions.length > 0) {
              const hasPro = subscriptions.some(
                (sub) => GOOGLE_PLAY_PRODUCT_TO_PLAN[sub.productId] === PLAN_TYPES.PRO
              );
              if (hasPro) googlePlayPlan = PLAN_TYPES.PRO;
            }
          }
        } catch (err) {
          // Google Play unavailable (no network, plugin missing, etc.).
          // Fall through – we'll use the stored plan as the floor.
          console.warn('[Entitlements] Google Play Billing check failed:', err);
        }
      }

      // ── Step 3: resolved plan = max(stored, googlePlay) ──────────────────
      // This means we NEVER downgrade a user due to a transient billing error.
      const resolvedPlan = maxPlan(storedPlan, googlePlayPlan);

      // ── Step 4: if Google Play granted a higher plan than what's stored,
      //            persist it so other devices / web also see the upgrade ───
      if (googlePlayPlan === PLAN_TYPES.PRO && storedPlan !== PLAN_TYPES.PRO) {
        try {
          await base44.auth.updateMe({
            plan: PLAN_TYPES.PRO,
            last_entitlement_sync: new Date().toISOString(),
          });
        } catch (syncErr) {
          console.warn('[Entitlements] Failed to sync plan to backend:', syncErr);
        }
      }

      setUserPlan(resolvedPlan);
    } catch (err) {
      console.error('[Entitlements] Error loading user plan:', err);
      // On error, default to FREE so we don't silently grant pro.
      // But if we already have a non-FREE value in state, keep it.
      setUserPlan((prev) => prev);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPlan = () => loadUserPlan();

  return (
    <EntitlementsContext.Provider value={{ userPlan, isLoading, refreshPlan }}>
      {children}
    </EntitlementsContext.Provider>
  );
}

export function useEntitlements() {
  const context = useContext(EntitlementsContext);
  if (!context) throw new Error('useEntitlements must be used within EntitlementsProvider');
  return context;
}
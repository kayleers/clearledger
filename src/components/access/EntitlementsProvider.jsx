import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TIERS, getHighestTier } from './tierConfig';

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
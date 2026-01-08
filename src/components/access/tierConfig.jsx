// Single source of truth for tier limits and features
export const TIERS = {
  FREE: 'FREE',
  LIFETIME: 'LIFETIME',
  PRO_SUBSCRIPTION: 'PRO_SUBSCRIPTION'
};

export const TIER_DETAILS = {
  [TIERS.FREE]: {
    name: 'Free',
    price: '$0.00',
    description: 'Explore how ClearLedger works',
    limits: {
      creditCards: 2,
      loans: 1,
      bankAccounts: 1,
      recurringBills: 2,
      savedScenarios: 1,
      calendarMonths: 2
    },
    features: {
      paymentSimulator: true,
      dashboard: true,
      charts: true,
      manualEntry: true,
      multiCurrency: true,
      payment_schedule: true,
      unlimitedScenarios: false
    }
  },
  [TIERS.LIFETIME]: {
    name: 'Lifetime Access',
    price: '$19.99',
    description: 'For people who hate subscriptions',
    limits: {
      creditCards: 8,
      loans: 5,
      bankAccounts: 5,
      recurringBills: 10,
      savedScenarios: Infinity,
      calendarMonths: Infinity
    },
    features: {
      paymentSimulator: true,
      dashboard: true,
      charts: true,
      manualEntry: true,
      multiCurrency: true,
      payment_schedule: true,
      unlimitedScenarios: true
    }
  },
  [TIERS.PRO_SUBSCRIPTION]: {
    name: 'Pro Subscription',
    monthlyPrice: '$3.99',
    yearlyPrice: '$29.99',
    description: 'Unlimited everything',
    limits: {
      creditCards: Infinity,
      loans: Infinity,
      bankAccounts: Infinity,
      recurringBills: Infinity,
      savedScenarios: Infinity,
      calendarMonths: Infinity
    },
    features: {
      paymentSimulator: true,
      dashboard: true,
      charts: true,
      manualEntry: true,
      multiCurrency: true,
      payment_schedule: true,
      unlimitedScenarios: true,
      priorityFeatures: true
    }
  }
};

export const TIER_HIERARCHY = {
  [TIERS.FREE]: 1,
  [TIERS.LIFETIME]: 2,
  [TIERS.PRO_SUBSCRIPTION]: 3
};

export function getHighestTier(tier1, tier2) {
  return TIER_HIERARCHY[tier1] > TIER_HIERARCHY[tier2] ? tier1 : tier2;
}

export function canAccess(userTier, requiredTier) {
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier];
}

export function getLimit(tier, limitType) {
  return TIER_DETAILS[tier]?.limits?.[limitType] ?? 0;
}

export function hasFeature(tier, feature) {
  return TIER_DETAILS[tier]?.features?.[feature] ?? false;
}

export function isAtLimit(currentCount, tier, limitType) {
  const limit = getLimit(tier, limitType);
  return currentCount >= limit;
}

export function canAdd(currentCount, tier, limitType) {
  const limit = getLimit(tier, limitType);
  return currentCount < limit;
}
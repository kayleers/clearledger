// Google Play Billing Product IDs
export const GOOGLE_PLAY_PRODUCTS = {
  PRO_MONTHLY: 'clearledger_pro_monthly',
  PRO_YEARLY: 'clearledger_pro_yearly',
  LIFETIME: 'clearledger_lifetime'
};

// Simplified tier system: free or pro
export const PLAN_TYPES = {
  FREE: 'free',
  PRO: 'pro'
};

// Product to plan mapping
export const GOOGLE_PLAY_PRODUCT_TO_PLAN = {
  [GOOGLE_PLAY_PRODUCTS.PRO_MONTHLY]: PLAN_TYPES.PRO,
  [GOOGLE_PLAY_PRODUCTS.PRO_YEARLY]: PLAN_TYPES.PRO,
  [GOOGLE_PLAY_PRODUCTS.LIFETIME]: PLAN_TYPES.PRO
};

// Free tier limits
export const FREE_LIMITS = {
  bankAccounts: 1,
  loans: 1,
  recurringBills: 2,
  creditCards: 2,
  currencyConversions: 1
};

// Plan details for upgrade UI
export const PLAN_DETAILS = {
  [PLAN_TYPES.FREE]: {
    name: 'Free',
    price: '$0.00',
    limits: FREE_LIMITS,
    features: [
      'Up to 2 credit cards',
      'Up to 1 bank account',
      'Up to 1 loan',
      'Up to 2 recurring bills',
      'Full feature access'
    ]
  },
  [PLAN_TYPES.PRO]: {
    name: 'Pro',
    features: [
      'Unlimited credit cards',
      'Unlimited bank accounts',
      'Unlimited loans',
      'Unlimited recurring bills',
      'Full feature access',
      'No restrictions'
    ]
  }
};

// Product pricing for purchase buttons
export const PRODUCT_PRICING = {
  [GOOGLE_PLAY_PRODUCTS.PRO_MONTHLY]: {
    name: 'Pro Monthly',
    price: '$2.99',
    period: '/month',
    productId: GOOGLE_PLAY_PRODUCTS.PRO_MONTHLY
  },
  [GOOGLE_PLAY_PRODUCTS.PRO_YEARLY]: {
    name: 'Pro Yearly',
    price: '$24.99',
    period: '/year',
    savings: 'Save 30%',
    productId: GOOGLE_PLAY_PRODUCTS.PRO_YEARLY
  },
  [GOOGLE_PLAY_PRODUCTS.LIFETIME]: {
    name: 'Lifetime',
    price: '$49.99',
    period: 'one-time',
    bestValue: true,
    productId: GOOGLE_PLAY_PRODUCTS.LIFETIME
  }
};

// Helper functions
export function isPro(plan) {
  return plan === PLAN_TYPES.PRO;
}

export function isFree(plan) {
  return plan === PLAN_TYPES.FREE;
}

export function getLimit(plan, limitType) {
  if (isPro(plan)) return Infinity;
  return FREE_LIMITS[limitType] || 0;
}

export function isAtLimit(currentCount, plan, limitType) {
  if (isPro(plan)) return false;
  const limit = getLimit(plan, limitType);
  return currentCount >= limit;
}

export function canAdd(currentCount, plan, limitType) {
  return !isAtLimit(currentCount, plan, limitType);
}
import { useMemo } from 'react';
import { useEntitlements } from './EntitlementsProvider';
import { getLimit, canAdd, isAtLimit, hasFeature, TIER_DETAILS } from './tierConfig';

export function useAccessControl() {
  const { userTier, isLoading } = useEntitlements();

  const accessControl = useMemo(() => {
    return {
      tier: userTier,
      isLoading,
      
      // Limit checks
      getLimit: (limitType) => getLimit(userTier, limitType),
      isAtLimit: (currentCount, limitType) => isAtLimit(currentCount, userTier, limitType),
      canAdd: (currentCount, limitType) => canAdd(currentCount, userTier, limitType),
      
      // Feature checks
      hasFeature: (feature) => hasFeature(userTier, feature),
      
      // Tier info
      getTierDetails: () => TIER_DETAILS[userTier],
      
      // Specific checks for common scenarios
      canAddCreditCard: (currentCount) => canAdd(currentCount, userTier, 'creditCards'),
      canAddLoan: (currentCount) => canAdd(currentCount, userTier, 'loans'),
      canAddBankAccount: (currentCount) => canAdd(currentCount, userTier, 'bankAccounts'),
      canAddBill: (currentCount) => canAdd(currentCount, userTier, 'recurringBills'),
      canSaveScenario: (currentCount) => canAdd(currentCount, userTier, 'savedScenarios'),
      
      // Calendar months
      getCalendarMonthsLimit: () => getLimit(userTier, 'calendarMonths')
    };
  }, [userTier, isLoading]);

  return accessControl;
}
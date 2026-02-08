import { useEntitlements } from './EntitlementsProvider';
import { isPro, getLimit, isAtLimit, canAdd } from './tierConfig';

export function useAccessControl() {
  const { userPlan, isLoading } = useEntitlements();

  return {
    plan: userPlan,
    isPro: isPro(userPlan),
    isLoading,
    
    // Limit checks
    getLimit: (limitType) => getLimit(userPlan, limitType),
    isAtLimit: (currentCount, limitType) => isAtLimit(currentCount, userPlan, limitType),
    canAdd: (currentCount, limitType) => canAdd(currentCount, userPlan, limitType),
    
    // Specific item checks
    canAddCreditCard: (currentCount) => canAdd(currentCount, userPlan, 'creditCards'),
    canAddLoan: (currentCount) => canAdd(currentCount, userPlan, 'loans'),
    canAddBankAccount: (currentCount) => canAdd(currentCount, userPlan, 'bankAccounts'),
    canAddRecurringBill: (currentCount) => canAdd(currentCount, userPlan, 'recurringBills'),
    canUseCurrencyConversion: (currentCount) => canAdd(currentCount, userPlan, 'currencyConversions'),
    canAddScenario: (currentCount) => canAdd(currentCount, userPlan, 'scenarios')
  };
}
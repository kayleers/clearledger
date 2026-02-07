import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard, Loader2, Zap, ChevronDown, ChevronUp, GripVertical, Download, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/components/utils/calculations';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResponsiveDialog } from '@/components/ui/responsive-drawer';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import AddPurchaseForm from '@/components/transactions/AddPurchaseForm';
import { AnimatePresence, motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useIsMobile } from '@/components/utils/useIsMobile';

import DashboardSummary from '@/components/dashboard/DashboardSummary';
import TotalDebtCard from '@/components/dashboard/TotalDebtCard';
import CreditCardItem from '@/components/cards/CreditCardItem';
import AddCardForm from '@/components/cards/AddCardForm';
import BankAccountList from '@/components/bankaccounts/BankAccountList';
import RecurringBillList from '@/components/bills/RecurringBillList';
import MortgageLoanList from '@/components/mortgages/MortgageLoanList';
import BankTransferList from '@/components/transfers/BankTransferList';
import RecurringDepositList from '@/components/deposits/RecurringDepositList';
import CurrencyConversionList from '@/components/conversions/CurrencyConversionList';
import PaymentCalendar from '@/components/calendar/PaymentCalendar';
import QuickAddMenu from '@/components/quickadd/QuickAddMenu';
import MultiPaymentSimulator from '@/components/simulator/MultiPaymentSimulator';
import SyncManager from '@/components/sync/SyncManager';

export default function Dashboard() {
  const [showAddCard, setShowAddCard] = useState(false);
  const [sectionOrder, setSectionOrder] = useState(['summary', 'cards', 'calendar', 'simulator', 'banks', 'bills', 'deposits', 'transfers', 'loans', 'privacy']);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddCardId, setQuickAddCardId] = useState(null);
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [simulatorExpanded, setSimulatorExpanded] = useState(false);
  const [cardsExpanded, setCardsExpanded] = useState(false);

  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [isPullingToRefresh, setIsPullingToRefresh] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['credit-cards', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allCards = await base44.entities.CreditCard.filter({ created_by: user.email });
      return allCards.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    },
    enabled: !!user
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const accounts = await base44.entities.BankAccount.filter({ is_active: true, created_by: user.email });
      return accounts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    },
    enabled: !!user
  });

  const { data: recurringBills = [] } = useQuery({
    queryKey: ['recurring-bills', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const bills = await base44.entities.RecurringBill.filter({ is_active: true, created_by: user.email });
      return bills.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    },
    enabled: !!user
  });

  const { data: mortgageLoans = [] } = useQuery({
    queryKey: ['mortgage-loans', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const loans = await base44.entities.MortgageLoan.filter({ is_active: true, created_by: user.email });
      return loans.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    },
    enabled: !!user
  });

  const { data: bankTransfers = [] } = useQuery({
    queryKey: ['bank-transfers', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const transfers = await base44.entities.BankTransfer.filter({ is_active: true, created_by: user.email });
      return transfers.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    },
    enabled: !!user
  });

  const { data: recurringDeposits = [] } = useQuery({
    queryKey: ['recurring-deposits', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const deposits = await base44.entities.RecurringDeposit.filter({ is_active: true, created_by: user.email });
      return deposits.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    },
    enabled: !!user
  });

  const createCardMutation = useMutation({
    mutationFn: async (cardData) => {
      return await base44.entities.CreditCard.create(cardData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      setShowAddCard(false);
      setEditingCard(null);
    }
  });

  const updateCardMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CreditCard.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      setEditingCard(null);
    }
  });

  const deleteCardMutation = useMutation({
    mutationFn: (cardId) => base44.entities.CreditCard.delete(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
    }
  });

  const reorderCardsMutation = useMutation({
    mutationFn: async (reorderedCards) => {
      await Promise.all(
        reorderedCards.map((card, index) => 
          base44.entities.CreditCard.update(card.id, { display_order: index })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
    }
  });

  const reorderSectionsMutation = useMutation({
    mutationFn: async (newOrder) => {
      await base44.auth.updateMe({ section_order: newOrder });
    }
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    // Handle card reordering
    if (result.type === 'card') {
      const items = Array.from(cards);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      
      queryClient.setQueryData(['credit-cards'], items);
      reorderCardsMutation.mutate(items);
    }
    
    // Handle section reordering
    if (result.type === 'section') {
      // Get only the draggable sections (excluding 'summary')
      const draggableSections = sectionOrder.filter(s => s !== 'summary');
      
      // Reorder the draggable sections
      const [reorderedItem] = draggableSections.splice(result.source.index, 1);
      draggableSections.splice(result.destination.index, 0, reorderedItem);

      // Reconstruct the full order with 'summary' always first
      const newOrder = ['summary', ...draggableSections];

      setSectionOrder(newOrder);
      reorderSectionsMutation.mutate(newOrder);
    }
  };

  React.useEffect(() => {
    const fetchSectionOrder = async () => {
      if (!user) return;
      try {
        if (user.section_order) {
          let newOrder = user.section_order;
          let updated = false;

          // Remove totalDebt from order if it exists (it's now inside cards)
          if (newOrder.includes('totalDebt')) {
            newOrder = newOrder.filter(s => s !== 'totalDebt');
            updated = true;
          }

          if (!newOrder.includes('summary')) {
            newOrder = ['summary', ...newOrder];
            updated = true;
          }

          if (!newOrder.includes('cards')) {
            const summaryIndex = newOrder.indexOf('summary');
            newOrder.splice(summaryIndex + 1, 0, 'cards');
            updated = true;
          }
          
          // Remove projections if it exists (now part of summary)
          if (newOrder.includes('projections')) {
            newOrder = newOrder.filter(s => s !== 'projections');
            updated = true;
          }

          if (!newOrder.includes('calendar')) {
            newOrder.push('calendar');
            updated = true;
          }

          if (!newOrder.includes('simulator')) {
            newOrder.push('simulator');
            updated = true;
          }

          // Remove pricing section if it exists
          if (newOrder.includes('pricing')) {
            newOrder = newOrder.filter(s => s !== 'pricing');
            updated = true;
          }

          if (!newOrder.includes('privacy')) {
            newOrder.push('privacy');
            updated = true;
          }

          if (!newOrder.includes('deposits')) {
            const billsIndex = newOrder.indexOf('bills');
            if (billsIndex >= 0) {
              newOrder.splice(billsIndex + 1, 0, 'deposits');
            } else {
              newOrder.push('deposits');
            }
            updated = true;
          }

          if (!newOrder.includes('transfers')) {
            const depositsIndex = newOrder.indexOf('deposits');
            if (depositsIndex >= 0) {
              newOrder.splice(depositsIndex + 1, 0, 'transfers');
            } else {
              newOrder.push('transfers');
            }
            updated = true;
          }

          if (!newOrder.includes('conversions')) {
            const transfersIndex = newOrder.indexOf('transfers');
            if (transfersIndex >= 0) {
              newOrder.splice(transfersIndex + 1, 0, 'conversions');
            } else {
              newOrder.push('conversions');
            }
            updated = true;
          }

          if (updated) {
            setSectionOrder(newOrder);
            await base44.auth.updateMe({ section_order: newOrder });
          } else {
            setSectionOrder(newOrder);
          }
        }
      } catch (error) {
        console.error('Error fetching section order:', error);
      }
    };
    fetchSectionOrder();
  }, [user]);

  const handleAddCardClick = () => {
    setShowAddCard(true);
  };

  const createPurchaseMutation = useMutation({
    mutationFn: async ({ purchaseData, cardId }) => {
      await base44.entities.Purchase.create({ ...purchaseData, card_id: cardId });
      const card = cards.find(c => c.id === cardId);
      if (card) {
        await base44.entities.CreditCard.update(cardId, {
          balance: card.balance + purchaseData.amount
        });
      }
    },
    onMutate: async ({ purchaseData, cardId }) => {
      await queryClient.cancelQueries({ queryKey: ['credit-cards'] });
      const previousCards = queryClient.getQueryData(['credit-cards', user?.email]);
      
      queryClient.setQueryData(['credit-cards', user?.email], (old) => {
        return old?.map(c => 
          c.id === cardId ? { ...c, balance: c.balance + purchaseData.amount } : c
        );
      });
      
      return { previousCards };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['credit-cards', user?.email], context.previousCards);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['credit-card'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      setShowQuickAdd(false);
      setQuickAddCardId(null);
    }
  });

  const createBankDepositMutation = useMutation({
    mutationFn: async ({ amount, date, description, targetId, recurringDeposit }) => {
      if (recurringDeposit) {
        // Create recurring deposit
        await base44.entities.RecurringDeposit.create(recurringDeposit);
      }
      // Also create the one-time deposit record
      await base44.entities.Deposit.create({
        bank_account_id: targetId,
        amount,
        date,
        description,
        category: 'other'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['all-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-deposits'] });
      setShowQuickAdd(false);
    }
  });

  const createBankPaymentMutation = useMutation({
    mutationFn: async ({ amount, date, description, targetId }) => {
      await base44.entities.Deposit.create({
        bank_account_id: targetId,
        amount: -amount,
        date,
        description,
        category: 'other'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['all-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setShowQuickAdd(false);
    }
  });

  const createCardPaymentMutation = useMutation({
    mutationFn: async ({ amount, date, targetId }) => {
      await base44.entities.Payment.create({
        card_id: targetId,
        amount,
        date
      });
      const card = cards.find(c => c.id === targetId);
      if (card) {
        await base44.entities.CreditCard.update(targetId, {
          balance: Math.max(0, card.balance - amount)
        });
        // Create withdrawal from bank account
        if (card.bank_account_id) {
          await base44.entities.Deposit.create({
            bank_account_id: card.bank_account_id,
            amount: -amount,
            date,
            description: `Payment to ${card.name}`,
            category: 'other'
          });
        }
      }
    },
    onMutate: async ({ amount, targetId }) => {
      await queryClient.cancelQueries({ queryKey: ['credit-cards'] });
      const previousCards = queryClient.getQueryData(['credit-cards', user?.email]);
      
      queryClient.setQueryData(['credit-cards', user?.email], (old) => {
        return old?.map(c => 
          c.id === targetId ? { ...c, balance: Math.max(0, c.balance - amount) } : c
        );
      });
      
      return { previousCards };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['credit-cards', user?.email], context.previousCards);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['credit-card'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['all-deposits'] });
      setShowQuickAdd(false);
    }
  });

  const createBillPaymentMutation = useMutation({
    mutationFn: async ({ amount, date, targetId, bank_account_id }) => {
      const bill = recurringBills.find(b => b.id === targetId);
      const accountId = bank_account_id || bill?.bank_account_id;
      if (accountId) {
        await base44.entities.Deposit.create({
          bank_account_id: accountId,
          amount: -amount,
          date,
          description: `${bill.name} payment`,
          category: 'other'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['all-deposits'] });
      setShowQuickAdd(false);
    }
  });

  const createLoanPaymentMutation = useMutation({
    mutationFn: async ({ amount, date, targetId }) => {
      await base44.entities.LoanPayment.create({
        loan_id: targetId,
        amount,
        date
      });
      const loan = mortgageLoans.find(l => l.id === targetId);
      if (loan) {
        await base44.entities.MortgageLoan.update(targetId, {
          current_balance: Math.max(0, loan.current_balance - amount)
        });
        // Create withdrawal from bank account
        if (loan.bank_account_id) {
          await base44.entities.Deposit.create({
            bank_account_id: loan.bank_account_id,
            amount: -amount,
            date,
            description: `Payment to ${loan.name}`,
            category: 'other'
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-payments'] });
      queryClient.invalidateQueries({ queryKey: ['mortgage-loans'] });
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['all-deposits'] });
      setShowQuickAdd(false);
    }
  });

  const updateBankBalanceMutation = useMutation({
    mutationFn: async ({ amount, targetId }) => {
      await base44.entities.BankAccount.update(targetId, {
        balance: parseFloat(amount),
        last_balance_override: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setShowQuickAdd(false);
    }
  });

  const updateCardBalanceMutation = useMutation({
    mutationFn: async ({ amount, targetId }) => {
      await base44.entities.CreditCard.update(targetId, {
        balance: parseFloat(amount),
        last_balance_override: new Date().toISOString()
      });
    },
    onMutate: async ({ amount, targetId }) => {
      await queryClient.cancelQueries({ queryKey: ['credit-cards'] });
      const previousCards = queryClient.getQueryData(['credit-cards', user?.email]);
      
      queryClient.setQueryData(['credit-cards', user?.email], (old) => {
        return old?.map(c => 
          c.id === targetId ? { ...c, balance: parseFloat(amount), last_balance_override: new Date().toISOString() } : c
        );
      });
      
      return { previousCards };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['credit-cards', user?.email], context.previousCards);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['credit-card'] });
      setShowQuickAdd(false);
    }
  });

  const handleQuickAdd = () => {
    if (cards.length === 1) {
      setQuickAddCardId(cards[0].id);
      setShowQuickAdd(true);
    } else if (cards.length > 1) {
      // Show card selector
      setShowQuickAdd(true);
    }
  };

  const handleExportData = async () => {
    try {
      const response = await base44.functions.invoke('exportAllData', {});
      
      // Check if response.data is already a Blob or ArrayBuffer
      let blobData;
      if (response.data instanceof Blob) {
        blobData = response.data;
      } else if (response.data instanceof ArrayBuffer) {
        blobData = new Blob([response.data], { type: 'application/pdf' });
      } else {
        // Axios response returns data directly
        blobData = new Blob([response.data], { type: 'application/pdf' });
      }
      
      const url = window.URL.createObjectURL(blobData);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ClearLedger_Export_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  // Pull to refresh
  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (window.scrollY === 0 && touchStartY.current > 0) {
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - touchStartY.current);
      setPullDistance(Math.min(distance, 100));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60) {
      setIsPullingToRefresh(true);
      await queryClient.refetchQueries();
      setTimeout(() => {
        setIsPullingToRefresh(false);
      }, 500);
    }
    setPullDistance(0);
    touchStartY.current = 0;
  };

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance]);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-emerald-800 dark:from-slate-950 dark:via-cyan-950 dark:to-emerald-950">
        {/* Pull to refresh indicator */}
        {pullDistance > 0 && (
          <div 
            className="fixed top-0 left-0 right-0 flex items-center justify-center z-50 transition-all safe-area-pt"
            style={{ 
              transform: `translateY(${Math.min(pullDistance, 60)}px)`,
              opacity: pullDistance / 60 
            }}
          >
            <div className="bg-white dark:bg-slate-800 rounded-full p-2 shadow-lg">
              <RefreshCw className={`w-5 h-5 text-emerald-500 ${isPullingToRefresh ? 'animate-spin' : ''}`} />
            </div>
          </div>
        )}
        
        <div className="max-w-lg mx-auto px-4 py-6 pb-24 relative z-0">
        {/* Header */}
        <header className="mb-6 safe-area-pt">
          <div className="flex items-start justify-between mb-3">
            <button 
              onClick={() => window.location.reload()}
              className="flex-1 text-left hover:opacity-80 transition-opacity"
            >
              <h1 className="text-3xl font-bold text-emerald-400 drop-shadow-lg">ClearLedger</h1>
              <p className="text-white">Private bill & balance tracking. Smarter payment planning.</p>
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="hover:opacity-80 transition-opacity"
            >
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69502fff0681a8caf0666aa0/b93dade76_ClearLedgerIcon1.png" 
                alt="ClearLedger Logo" 
                className="w-16 h-16 rounded-xl shadow-lg object-cover"
              />
            </button>
          </div>
          <SyncManager 
            cards={cards} 
            bankAccounts={bankAccounts} 
            bills={recurringBills}
            loans={mortgageLoans}
            onExportData={handleExportData}
          />
        </header>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>




            {/* Overview Section - Always Pinned at Top */}
            <div className="mb-6">
              <DashboardSummary 
                cards={cards} 
                bankAccounts={bankAccounts}
                recurringBills={recurringBills}
                mortgageLoans={mortgageLoans}
              />
            </div>

            {/* Empty State Message */}
            {cards.length === 0 && bankAccounts.length === 0 && recurringBills.length === 0 && mortgageLoans.length === 0 && (
              <div className="mb-6 text-center py-8 bg-white/10 rounded-lg border border-white/20">
                <p className="text-white/80 text-sm">
                  Add your first credit card, bank account, loan, or recurring bill to start tracking your finances
                </p>
              </div>
            )}

            {/* Draggable Sections */}
            <div className="mt-8">
              <Droppable droppableId="sections" type="section">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {sectionOrder.filter(s => s !== 'summary').map((section, index) => (
                      <Draggable key={section} draggableId={section} index={index} type="section">
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="mb-6"
                            style={{
                              ...provided.draggableProps.style,
                              opacity: snapshot.isDragging ? 0.8 : 1,
                            }}
                          >
                            {section === 'cards' && (
                              <Collapsible open={cardsExpanded} onOpenChange={setCardsExpanded}>
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                      <GripVertical className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                                      <div>
                                        <h2 className="text-xl font-bold text-emerald-400">Credit Cards</h2>
                                        {(() => {
                                          const totalsByCurrency = {};
                                          cards.forEach(card => {
                                            const curr = card.currency || 'USD';
                                            totalsByCurrency[curr] = (totalsByCurrency[curr] || 0) + card.balance;
                                          });
                                          return Object.keys(totalsByCurrency).length > 0 && (
                                            <div className="flex gap-2 mt-1">
                                              {Object.entries(totalsByCurrency).map(([curr, total]) => (
                                                <span key={curr} className="text-xs text-slate-400">
                                                  {formatCurrency(total, curr)}
                                                </span>
                                              ))}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                      {cardsExpanded ? (
                                        <ChevronUp className="w-5 h-5 text-slate-500" />
                                      ) : (
                                        <ChevronDown className="w-5 h-5 text-slate-500" />
                                      )}
                                    </CollapsibleTrigger>
                                  </div>
                                  {!showAddCard && (
                                    <Button
                                      size="sm"
                                      onClick={handleAddCardClick}
                                      className="bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white"
                                    >
                                      <Plus className="w-4 h-4 mr-1" />
                                      Add Card
                                    </Button>
                                  )}
                                  </div>
                                  <CollapsibleContent>
                                  {cards.length > 0 && (
                                    <div className="mb-4 flex justify-end">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={async () => {
                                          try {
                                            const response = await base44.functions.invoke('exportCreditCards', {});
                                            const blob = new Blob([response.data], { type: 'application/pdf' });
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `Credit_Cards_${new Date().toISOString().split('T')[0]}.pdf`;
                                            document.body.appendChild(a);
                                            a.click();
                                            window.URL.revokeObjectURL(url);
                                            a.remove();
                                          } catch (error) {
                                            console.error('Export failed:', error);
                                          }
                                        }}
                                        className="text-xs text-slate-500 hover:text-slate-700"
                                      >
                                        <Download className="w-3 h-3 mr-1" />
                                        Export PDF
                                      </Button>
                                    </div>
                                  )}
                                  <Droppable droppableId="cards" type="card">
                                    {(provided) => (
                                      <div 
                                        {...provided.droppableProps} 
                                        ref={provided.innerRef}
                                        className="space-y-4"
                                      >
                                        {cards.map((card, cardIndex) => (
                                          <Draggable key={card.id} draggableId={card.id} index={cardIndex} type="card">
                                            {(provided, snapshot) => (
                                              <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                style={{
                                                  ...provided.draggableProps.style,
                                                  opacity: snapshot.isDragging ? 0.9 : 1,
                                                }}
                                              >
                                                <motion.div
                                                  initial={{ opacity: 0, y: 20 }}
                                                  animate={{ opacity: 1, y: 0 }}
                                                  transition={{ delay: cardIndex * 0.1 }}
                                                >
                                                  <CreditCardItem 
                                                    card={card} 
                                                    isDragging={snapshot.isDragging}
                                                    onEdit={(card) => {
                                                      setEditingCard(card);
                                                      setShowAddCard(false);
                                                    }}
                                                    onDelete={(card) => {
                                                      if (window.confirm(`Delete ${card.name}?`)) {
                                                        deleteCardMutation.mutate(card.id);
                                                      }
                                                    }}
                                                  />
                                                </motion.div>
                                              </div>
                                            )}
                                          </Draggable>
                                        ))}
                                        {provided.placeholder}
                                        </div>
                                        )}
                                        </Droppable>
                                        {!showAddCard && (
                                        <Button
                                        variant="outline"
                                        className="w-full h-14 border-dashed border-2 text-slate-500 mt-4"
                                        onClick={handleAddCardClick}
                                        >
                                        <Plus className="w-5 h-5 mr-2" />
                                        Add Another Card
                                        </Button>
                                        )}

                                        {/* Total Debt Summary */}
                                        <div className="mt-6">
                                        <TotalDebtCard cards={cards} />
                                        </div>
                                        </CollapsibleContent>
                                        </Collapsible>
                                        )}
                            {section === 'calendar' && (
                              <Collapsible open={calendarExpanded} onOpenChange={setCalendarExpanded}>
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                      <GripVertical className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                                      <h2 className="text-xl font-bold text-emerald-400">Payment Schedule</h2>
                                      {calendarExpanded ? (
                                        <ChevronUp className="w-5 h-5 text-slate-500" />
                                      ) : (
                                        <ChevronDown className="w-5 h-5 text-slate-500" />
                                      )}
                                    </CollapsibleTrigger>
                                  </div>
                                </div>
                                <CollapsibleContent>
                                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden p-4">
                                    <PaymentCalendar />
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                            {section === 'simulator' && (
                              <Collapsible open={simulatorExpanded} onOpenChange={setSimulatorExpanded}>
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                      <GripVertical className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                                      <h2 className="text-xl font-bold text-emerald-400">Payment Simulator</h2>
                                      {simulatorExpanded ? (
                                        <ChevronUp className="w-5 h-5 text-slate-500" />
                                      ) : (
                                        <ChevronDown className="w-5 h-5 text-slate-500" />
                                      )}
                                    </CollapsibleTrigger>
                                  </div>
                                </div>
                                <CollapsibleContent>
                                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden p-4">
                                    <MultiPaymentSimulator cards={cards} loans={mortgageLoans} />
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                            {section === 'banks' && <BankAccountList bankAccounts={bankAccounts} dragHandleProps={provided.dragHandleProps} />}
                            {section === 'bills' && <RecurringBillList bills={recurringBills} bankAccounts={bankAccounts} creditCards={cards} dragHandleProps={provided.dragHandleProps} />}
                            {section === 'deposits' && <RecurringDepositList deposits={recurringDeposits} bankAccounts={bankAccounts} dragHandleProps={provided.dragHandleProps} />}
                            {section === 'transfers' && <BankTransferList transfers={bankTransfers} bankAccounts={bankAccounts} dragHandleProps={provided.dragHandleProps} />}
                            {section === 'conversions' && <CurrencyConversionList dragHandleProps={provided.dragHandleProps} />}
                            {section === 'loans' && <MortgageLoanList loans={mortgageLoans} bankAccounts={bankAccounts} creditCards={cards} dragHandleProps={provided.dragHandleProps} />}

                            {section === 'privacy' && (
                              <div className="space-y-3">
                                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                  <div className="flex items-center gap-2 p-4">
                                    <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                      <GripVertical className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <button 
                                      onClick={() => setShowPrivacyPolicy(true)}
                                      className="flex-1 text-left hover:bg-slate-50 transition-colors -m-4 p-4"
                                    >
                                      <h2 className="text-xl font-bold text-slate-800 mb-2">Privacy Policy</h2>
                                      <p className="text-slate-500 text-sm">View our privacy policy</p>
                                    </button>
                                  </div>
                                </div>
                                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden p-4">
                                  <Button
                                    onClick={handleExportData}
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Export All Data to PDF
                                  </Button>
                                  <p className="text-xs text-slate-500 text-center mt-2">
                                    Export everything in your account to one comprehensive PDF
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </>
        )}

        {/* Quick Add FAB */}
        {(cards.length > 0 || bankAccounts.length > 0 || recurringBills.length > 0 || mortgageLoans.length > 0) && (
          <>
            <button
              onClick={() => setShowQuickAdd(true)}
              className="fixed bottom-20 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-50"
              aria-label="Quick add transaction"
            >
              <Zap className="w-6 h-6" />
            </button>

            <ResponsiveDialog
              open={showQuickAdd}
              onOpenChange={(open) => {
                setShowQuickAdd(open);
                if (!open) setQuickAddCardId(null);
              }}
              title="Quick Add"
              className="max-w-md"
            >
                <QuickAddMenu
                  cards={cards}
                  bankAccounts={bankAccounts}
                  bills={recurringBills}
                  loans={mortgageLoans}
                  onCardPurchase={(data) => createPurchaseMutation.mutate({ purchaseData: data, cardId: data.card_id || quickAddCardId })}
                  onBankDeposit={(data) => createBankDepositMutation.mutate(data)}
                  onBankPayment={(data) => createBankPaymentMutation.mutate(data)}
                  onCardPayment={(data) => createCardPaymentMutation.mutate(data)}
                  onBillPayment={(data) => createBillPaymentMutation.mutate(data)}
                  onLoanPayment={(data) => createLoanPaymentMutation.mutate(data)}
                  onBankBalanceUpdate={(data) => updateBankBalanceMutation.mutate(data)}
                  onCardBalanceUpdate={(data) => updateCardBalanceMutation.mutate(data)}
                  isLoading={createPurchaseMutation.isPending || createBankDepositMutation.isPending ||
                             createBankPaymentMutation.isPending || createCardPaymentMutation.isPending || 
                             createBillPaymentMutation.isPending || createLoanPaymentMutation.isPending ||
                             updateBankBalanceMutation.isPending || updateCardBalanceMutation.isPending}
                />
            </ResponsiveDialog>
          </>
        )}

        {/* Add/Edit Card Dialog */}
        <ResponsiveDialog
          open={showAddCard || !!editingCard}
          onOpenChange={(open) => {
            if (!open) {
              setShowAddCard(false);
              setEditingCard(null);
            }
          }}
          title={editingCard ? 'Edit Credit Card' : 'Add Credit Card'}
          className="max-w-md"
        >
            <AddCardForm
              card={editingCard}
              bankAccounts={bankAccounts}
              creditCards={cards}
              onSubmit={(data) => {
                if (editingCard) {
                  updateCardMutation.mutate({ id: editingCard.id, data });
                } else {
                  createCardMutation.mutate(data);
                }
              }}
              onCancel={() => {
                setShowAddCard(false);
                setEditingCard(null);
              }}
              isLoading={createCardMutation.isPending || updateCardMutation.isPending}
            />
        </ResponsiveDialog>

        {/* Privacy Policy Dialog */}
        <Dialog open={showPrivacyPolicy} onOpenChange={setShowPrivacyPolicy}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full">
            <DialogHeader className="p-6 pb-4 flex-shrink-0">
              <DialogTitle>Privacy Policy</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto px-6 pb-6 flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="space-y-6 text-slate-700">
              <p className="text-sm text-slate-500 italic">Last updated: January 29, 2026</p>
              
              <section className="space-y-3">
                <h3 className="text-lg font-bold text-emerald-600 flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  About ClearLedger
                </h3>
                <p className="leading-relaxed">ClearLedger ("the app") is operated by <strong>Khaos</strong> (doing business as Khaos KRServices), located in <strong>The Netherlands</strong>.</p>
                <p className="leading-relaxed">ClearLedger is a manual financial planning tool that allows users to track bills, loans, credit cards, bank accounts, and payment schedules across multiple currencies. We are committed to protecting your privacy and being transparent about how your data is handled.</p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-bold text-emerald-600 flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  Legal Basis for Processing
                </h3>
                <p className="leading-relaxed">We process personal data in accordance with applicable data protection laws, including the GDPR, based on:</p>
                <ul className="list-disc pl-8 space-y-2">
                  <li><strong>Contractual necessity:</strong> to provide the app's features and services.</li>
                  <li><strong>Consent:</strong> where required, such as when you create an account and use the app.</li>
                  <li><strong>Legitimate interests:</strong> to maintain and improve the app's functionality and security.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-bold text-emerald-600 flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  Data We Collect
                </h3>
                <p className="leading-relaxed">We collect only the information necessary to provide the service:</p>
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  <p className="font-semibold text-blue-900">Information you provide:</p>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>Email address (for account creation and authentication)</li>
                    <li>Financial data you manually enter (e.g. balances, transactions, bills, loans)</li>
                    <li>App preferences and settings</li>
                  </ul>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <p className="font-semibold text-slate-900">Information we do NOT collect:</p>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>Physical addresses or government identifiers</li>
                    <li>Bank login credentials</li>
                    <li>Full credit card numbers</li>
                    <li>Transaction data from financial institutions</li>
                    <li>Contacts, photos, or files</li>
                    <li>Location data</li>
                    <li>Advertising identifiers</li>
                  </ul>
                </div>
                <p className="leading-relaxed italic">We do not connect to banks, credit bureaus, or financial institutions.</p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-bold text-emerald-600 flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">4</span>
                  How We Store and Process Data
                </h3>
                <p className="leading-relaxed">Your data is stored securely in the cloud using <strong>Base44</strong>, a cloud infrastructure provider that acts as a data processor on our behalf.</p>
                <ul className="list-disc pl-8 space-y-2">
                  <li>Base44 servers are located in <strong>the United States</strong>.</li>
                  <li>Data is encrypted and protected using industry-standard security measures.</li>
                  <li>Your data is accessible only through your account and processed only by authorized service providers necessary to operate the app.</li>
                  <li>We do not sell your data or share it with third parties for advertising or marketing purposes.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-bold text-emerald-600 flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">5</span>
                  Third-Party Service Providers
                </h3>
                <p className="leading-relaxed">We use the following service providers to operate the app:</p>
                <div className="space-y-3">
                  <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50">
                    <p className="font-semibold text-blue-900">Base44</p>
                    <p className="text-sm">Cloud hosting and data storage (data processor).</p>
                  </div>
                  <div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50">
                    <p className="font-semibold text-purple-900">Stripe</p>
                    <p className="text-sm">Payment processing for subscriptions. Stripe processes payment information. We do not receive or store your full payment card details.</p>
                  </div>
                </div>
                <p className="leading-relaxed text-sm italic">These providers process data only as necessary to deliver their services and in accordance with applicable data protection laws.</p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-bold text-emerald-600 flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">6</span>
                  International Data Transfers
                </h3>
                <p className="leading-relaxed">Your data may be transferred to and stored on servers located outside your country of residence, including in the United States.</p>
                <p className="leading-relaxed">Such transfers are protected by appropriate safeguards, including contractual agreements and standard data protection clauses in accordance with GDPR.</p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-bold text-emerald-600 flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">7</span>
                  Subscriptions and Payments
                </h3>
                <p className="leading-relaxed">ClearLedger offers optional subscription features. Payments are processed securely through Stripe. ClearLedger does not store full payment card information.</p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-bold text-emerald-600 flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">8</span>
                  Data Retention
                </h3>
                <p className="leading-relaxed">We retain your data only for as long as your account is active or as necessary to provide the app's services.</p>
                <p className="leading-relaxed">If you delete your account, your data will be permanently deleted from our systems within 30 days, except where retention is required by law.</p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-bold text-emerald-600 flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">9</span>
                  Your Privacy Rights
                </h3>
                <p className="leading-relaxed">Depending on your location, you may have the following rights:</p>
                <ul className="list-disc pl-8 space-y-2">
                  <li>Access your personal data</li>
                  <li>Correct or update your data</li>
                  <li>Delete your data</li>
                  <li>Export your data in a commonly used format</li>
                  <li>Withdraw consent</li>
                  <li>Object to certain processing</li>
                </ul>
                <div className="bg-emerald-50 rounded-lg p-4 mt-3">
                  <p className="leading-relaxed text-sm">You can exercise these rights through the app or by contacting us at: <strong className="text-emerald-700">khaoskrservices@gmail.com</strong></p>
                  <p className="leading-relaxed text-sm mt-2">If you are located in the European Union, you also have the right to lodge a complaint with your local data protection authority.</p>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-bold text-emerald-600 flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">10</span>
                  Ads and Tracking
                </h3>
                <p className="leading-relaxed">ClearLedger does not display ads and does not use third-party advertising or tracking technologies. We do not track user behavior across apps or websites.</p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-bold text-emerald-600 flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">11</span>
                  Security
                </h3>
                <p className="leading-relaxed">We use technical and organizational measures to protect your data, including encryption and secure cloud infrastructure. However, no system is completely secure, and we cannot guarantee absolute security.</p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-bold text-emerald-600 flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">12</span>
                  Children's Privacy
                </h3>
                <p className="leading-relaxed">ClearLedger is not intended for children under the age of 13 (or 16 in the European Union). We do not knowingly collect personal data from children. If you believe a child has provided personal data, please contact us so we can delete it.</p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-bold text-emerald-600 flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">13</span>
                  Changes to This Policy
                </h3>
                <p className="leading-relaxed">We may update this privacy policy from time to time. Any changes will be reflected on this page with an updated revision date.</p>
              </section>

              <section className="space-y-3 border-t pt-6">
                <h3 className="text-lg font-bold text-emerald-600 flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">14</span>
                  Contact
                </h3>
                <p className="leading-relaxed">If you have questions about this privacy policy or your data rights, contact us:</p>
                <div className="bg-slate-100 rounded-lg p-4 space-y-1">
                  <p><strong>Operator:</strong> Khaos (Khaos KRServices)</p>
                  <p><strong>Country:</strong> The Netherlands</p>
                  <p><strong>Email:</strong> <a href="mailto:khaoskrservices@gmail.com" className="text-emerald-600 hover:underline">khaoskrservices@gmail.com</a></p>
                </div>
              </section>
            </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </DragDropContext>
  );
}
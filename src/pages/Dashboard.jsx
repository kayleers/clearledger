import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard, Loader2, Zap, ChevronDown, ChevronUp, GripVertical, Download } from 'lucide-react';
import { formatCurrency } from '@/components/utils/calculations';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import AddPurchaseForm from '@/components/transactions/AddPurchaseForm';
import { AnimatePresence, motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

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
import { useAccessControl } from '@/components/access/useAccessControl';
import UpgradeDialog from '@/components/access/UpgradeDialog';
import SyncManager from '@/components/sync/SyncManager';

export default function Dashboard() {
  const [showAddCard, setShowAddCard] = useState(false);
  const [sectionOrder, setSectionOrder] = useState(['summary', 'cards', 'calendar', 'simulator', 'banks', 'bills', 'deposits', 'transfers', 'loans', 'pricing', 'privacy']);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddCardId, setQuickAddCardId] = useState(null);
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [simulatorExpanded, setSimulatorExpanded] = useState(false);
  const [cardsExpanded, setCardsExpanded] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState('general');
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const queryClient = useQueryClient();
  const accessControl = useAccessControl();

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: async () => {
      const allCards = await base44.entities.CreditCard.list();
      return allCards.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const accounts = await base44.entities.BankAccount.filter({ is_active: true });
      return accounts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }
  });

  const { data: recurringBills = [] } = useQuery({
    queryKey: ['recurring-bills'],
    queryFn: async () => {
      const bills = await base44.entities.RecurringBill.filter({ is_active: true });
      return bills.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }
  });

  const { data: mortgageLoans = [] } = useQuery({
    queryKey: ['mortgage-loans'],
    queryFn: async () => {
      const loans = await base44.entities.MortgageLoan.filter({ is_active: true });
      return loans.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }
  });

  const { data: bankTransfers = [] } = useQuery({
    queryKey: ['bank-transfers'],
    queryFn: async () => {
      const transfers = await base44.entities.BankTransfer.filter({ is_active: true });
      return transfers.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }
  });

  const { data: recurringDeposits = [] } = useQuery({
    queryKey: ['recurring-deposits'],
    queryFn: async () => {
      const deposits = await base44.entities.RecurringDeposit.filter({ is_active: true });
      return deposits.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }
  });

  const createCardMutation = useMutation({
    mutationFn: async (cardData) => {
      // Check limit one more time before creating
      if (!accessControl.canAddCreditCard(cards.length)) {
        throw new Error('Credit card limit reached');
      }
      return await base44.entities.CreditCard.create(cardData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      setShowAddCard(false);
      setEditingCard(null);
    },
    onError: (error) => {
      if (error.message === 'Credit card limit reached') {
        setUpgradeContext('creditCards');
        setShowUpgradeDialog(true);
        setShowAddCard(false);
        setEditingCard(null);
      }
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
      try {
        const user = await base44.auth.me();
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

          if (!newOrder.includes('pricing')) {
            newOrder.push('pricing');
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
  }, []);

  const canAddCard = accessControl.canAddCreditCard(cards.length);

  const handleAddCardClick = () => {
    if (canAddCard) {
      setShowAddCard(true);
    } else {
      setUpgradeContext('creditCards');
      setShowUpgradeDialog(true);
    }
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
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
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

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-emerald-800">
        <div className="max-w-lg mx-auto px-4 py-6 pb-24 relative z-0">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-emerald-400 drop-shadow-lg">ClearLedger</h1>
              <p className="text-white">Private bill & balance tracking. Smarter payment planning.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportData}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69502fff0681a8caf0666aa0/7335a5ce2_WhatsAppImage2026-01-08at73945PM.jpeg" 
                alt="ClearLedger Logo" 
                className="w-16 h-16 rounded-xl shadow-lg object-cover scale-110"
              />
            </div>
          </div>
          <SyncManager 
            cards={cards} 
            bankAccounts={bankAccounts} 
            bills={recurringBills}
            loans={mortgageLoans}
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
                            {section === 'pricing' && (
                              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                <div className="flex items-center gap-2 p-4">
                                  <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                    <GripVertical className="w-5 h-5 text-slate-400" />
                                  </div>
                                  <a 
                                    href="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69502fff0681a8caf0666aa0/179f909b9_PricingChart.png"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 hover:bg-slate-50 transition-colors -m-4 p-4"
                                  >
                                    <h2 className="text-xl font-bold text-slate-800 mb-2">Pricing</h2>
                                    <p className="text-slate-500 text-sm">View our pricing plans and features</p>
                                  </a>
                                </div>
                              </div>
                            )}
                            {section === 'privacy' && (
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

            <Dialog open={showQuickAdd} onOpenChange={(open) => {
              setShowQuickAdd(open);
              if (!open) setQuickAddCardId(null);
            }}>
              <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full">
                <DialogHeader className="p-6 pb-4 flex-shrink-0">
                  <DialogTitle>Quick Add</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto px-6 pb-6 flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}

        {/* Add/Edit Card Dialog */}
        <Dialog open={showAddCard || !!editingCard} onOpenChange={(open) => {
          if (!open) {
            setShowAddCard(false);
            setEditingCard(null);
          }
        }}>
          <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full">
            <div className="overflow-y-auto px-6 pb-6 pt-6 flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
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
            </div>
          </DialogContent>
        </Dialog>

        {/* Privacy Policy Dialog */}
        <Dialog open={showPrivacyPolicy} onOpenChange={setShowPrivacyPolicy}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full">
            <DialogHeader className="p-6 pb-4 flex-shrink-0">
              <DialogTitle>Privacy Policy</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto px-6 pb-6 flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="prose prose-sm max-w-none text-slate-700 space-y-4">
              <p className="text-sm text-slate-500">Last updated: January 27, 2026</p>
              
              <p>ClearLedger ("the app") is a manual financial planning tool designed to give users full control over their financial data and help users track bills, loans, credit cards, bank accounts, and payment schedules across multiple currencies. We are committed to protecting your privacy and being transparent about how your information is handled.</p>
              
              <h3 className="font-bold text-slate-900 mt-6">How We Store Your Data</h3>
              <p>ClearLedger stores your financial data securely in the cloud through Base44's infrastructure. This allows you to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Access your data from any device (phone, tablet, computer) by logging in</li>
                <li>Keep your data synchronized across all your devices</li>
                <li>Ensure your data is backed up and not lost if you lose your device</li>
              </ul>
              
              <p>All data you enter into the app — including balances, transactions, bills, loans, and payment simulations — is:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Entered manually by you</li>
                <li>Stored securely in the cloud with encryption</li>
                <li>Private to your account only</li>
                <li>Never shared with third parties</li>
                <li>Not sold or used for advertising</li>
              </ul>
              
              <p>We do not connect to banks, credit bureaus, or financial institutions to pull your data automatically.</p>
              
              <h3 className="font-bold text-slate-900 mt-6">Information We Collect</h3>
              <p>ClearLedger collects only the information necessary to provide you with the service:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Account information (email address for login)</li>
                <li>Financial data you manually enter (balances, transactions, bills, loans)</li>
                <li>App preferences and settings</li>
              </ul>
              
              <h3 className="font-bold text-slate-900 mt-6">Information We Do Not Collect</h3>
              <p>ClearLedger does not collect:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Physical addresses or government identifiers</li>
                <li>Bank login credentials</li>
                <li>Actual credit card numbers</li>
                <li>Transaction data from financial institutions</li>
                <li>Contacts, photos, or files</li>
                <li>Location data</li>
                <li>Advertising identifiers</li>
              </ul>
              
              <h3 className="font-bold text-slate-900 mt-6">Subscriptions and Payments</h3>
              <p>ClearLedger offers optional subscription tiers that unlock additional features. All payments are processed securely through Stripe. ClearLedger does not receive or store your payment information.</p>
              
              <p>Stripe may collect payment-related information as part of the billing process. Please refer to Stripe's Privacy Policy for details on how Stripe handles this data.</p>
              
              <h3 className="font-bold text-slate-900 mt-6">Ads and Tracking</h3>
              <p>ClearLedger does not display ads and does not use third-party advertising or tracking technologies.</p>
              <p>We do not track user behavior across apps or websites.</p>
              
              <h3 className="font-bold text-slate-900 mt-6">Data Storage and Security</h3>
              <p>Your data is stored on secure cloud servers provided by Base44. We use industry-standard security measures to protect your information.</p>
              <p>You can delete your account and all associated data at any time through the app settings.</p>
              
              <h3 className="font-bold text-slate-900 mt-6">Financial Disclaimer</h3>
              <p>ClearLedger is a planning and organizational tool only. It does not provide financial, legal, or investment advice. Any simulations or projections are estimates based on the information you manually enter.</p>
              
              <h3 className="font-bold text-slate-900 mt-6">Children's Privacy</h3>
              <p>ClearLedger is not intended for children under the age of 13. We do not knowingly collect personal information from children.</p>
              
              <h3 className="font-bold text-slate-900 mt-6">Changes to This Privacy Policy</h3>
              <p>This privacy policy may be updated from time to time. Any changes will be reflected on this page with an updated revision date.</p>
              
              <h3 className="font-bold text-slate-900 mt-6">Contact</h3>
              <p>If you have questions about this privacy policy or your privacy rights, you may contact us at:</p>
              <p className="font-medium">khaoskrservices@gmail.com</p>
            </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </DragDropContext>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard, Loader2, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import AddPurchaseForm from '@/components/transactions/AddPurchaseForm';
import { AnimatePresence, motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import DashboardSummary from '@/components/dashboard/DashboardSummary';
import FinancialOverview from '@/components/dashboard/FinancialOverview';
import CardsDetailTable from '@/components/dashboard/CardsDetailTable';
import CreditCardItem from '@/components/cards/CreditCardItem';
import AddCardForm from '@/components/cards/AddCardForm';
import BankAccountList from '@/components/bankaccounts/BankAccountList';
import RecurringBillList from '@/components/bills/RecurringBillList';
import MortgageLoanList from '@/components/mortgages/MortgageLoanList';
import PaymentCalendar from '@/components/calendar/PaymentCalendar';
import QuickAddMenu from '@/components/quickadd/QuickAddMenu';
import MultiPaymentSimulator from '@/components/simulator/MultiPaymentSimulator';
import { useAccessControl } from '@/components/access/useAccessControl';
import UpgradeDialog from '@/components/access/UpgradeDialog';

export default function Dashboard() {
  const [showAddCard, setShowAddCard] = useState(false);
  const [sectionOrder, setSectionOrder] = useState(['overview', 'cardsTable', 'cards', 'banks', 'bills', 'loans']);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddCardId, setQuickAddCardId] = useState(null);
  const [calendarExpanded, setCalendarExpanded] = useState(true);
  const [simulatorExpanded, setSimulatorExpanded] = useState(true);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState('general');
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

  const createCardMutation = useMutation({
    mutationFn: (cardData) => base44.entities.CreditCard.create(cardData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      setShowAddCard(false);
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
      const items = Array.from(sectionOrder);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      setSectionOrder(items);
      reorderSectionsMutation.mutate(items);
    }
  };

  React.useEffect(() => {
    const fetchSectionOrder = async () => {
      try {
        const user = await base44.auth.me();
        if (user.section_order) {
          // Filter out simulator, calendar, and old summary
          let newOrder = user.section_order.filter(s => s !== 'simulator' && s !== 'calendar' && s !== 'summary');
          let updated = false;

          if (!newOrder.includes('overview')) {
            newOrder = ['overview', ...newOrder];
            updated = true;
          }

          if (!newOrder.includes('cardsTable')) {
            const overviewIndex = newOrder.indexOf('overview');
            newOrder.splice(overviewIndex + 1, 0, 'cardsTable');
            updated = true;
          }

          if (!newOrder.includes('cards')) {
            const cardsTableIndex = newOrder.indexOf('cardsTable');
            newOrder.splice(cardsTableIndex + 1, 0, 'cards');
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
    mutationFn: async ({ amount, date, description, targetId }) => {
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
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
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
      setShowQuickAdd(false);
    }
  });

  const createBillPaymentMutation = useMutation({
    mutationFn: async ({ amount, date, targetId }) => {
      const bill = recurringBills.find(b => b.id === targetId);
      if (bill?.bank_account_id) {
        await base44.entities.Deposit.create({
          bank_account_id: bill.bank_account_id,
          amount: -amount,
          date,
          description: `${bill.name} payment`,
          category: 'other'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
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

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">ClearLedger</h1>
            <p className="text-slate-500">Private bill & balance tracking. Smarter payment planning.</p>
          </div>
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69502fff0681a8caf0666aa0/7335a5ce2_WhatsAppImage2026-01-08at73945PM.jpeg" 
            alt="ClearLedger Logo" 
            className="w-16 h-16 rounded-xl shadow-lg"
          />
        </header>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Add Card Form */}
            <AnimatePresence>
              {showAddCard && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-6"
                >
                  <AddCardForm
                    onSubmit={(data) => createCardMutation.mutate(data)}
                    onCancel={() => setShowAddCard(false)}
                    isLoading={createCardMutation.isPending}
                  />
                </motion.div>
              )}
              </AnimatePresence>

              {/* Empty State for Cards */}
            {cards.length === 0 && (
              <div className="mb-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200"
                >
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2">Add Your First Card</h3>
                  <p className="text-slate-500 text-sm mb-4 max-w-xs mx-auto">
                    Start tracking your credit card debt and create a plan to pay it off
                  </p>
                  <Button onClick={handleAddCardClick}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Credit Card
                  </Button>
                </motion.div>
              </div>
            )}

            {/* Fixed Sections - Calendar and Simulator */}
            {cards.length > 0 && (
              <div className="mt-8 space-y-6">
                <Collapsible open={calendarExpanded} onOpenChange={setCalendarExpanded}>
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <h3 className="font-semibold text-slate-800">Payment Schedule</h3>
                      {calendarExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-500" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 pt-0">
                        <PaymentCalendar />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                <Collapsible open={simulatorExpanded} onOpenChange={setSimulatorExpanded}>
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <h3 className="font-semibold text-slate-800">Payment Simulator</h3>
                      {simulatorExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-500" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 pt-0">
                        <MultiPaymentSimulator cards={cards} loans={mortgageLoans} />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </div>
            )}

            {/* Draggable Sections */}
            <div className="mt-8">
              <Droppable droppableId="sections" type="section">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {sectionOrder.map((section, index) => (
                      <Draggable key={section} draggableId={section} index={index} type="section">
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="mb-6"
                            style={{
                              ...provided.draggableProps.style,
                              opacity: snapshot.isDragging ? 0.8 : 1,
                            }}
                          >
                            {section === 'overview' && cards.length > 0 && (
                              <FinancialOverview cards={cards} />
                            )}
                            {section === 'cardsTable' && cards.length > 0 && (
                              <CardsDetailTable cards={cards} />
                            )}
                            {section === 'cards' && cards.length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-4">
                                  <h2 className="text-lg font-semibold text-slate-800">Your Cards</h2>
                                  {!showAddCard && (
                                    <Button
                                      size="sm"
                                      onClick={handleAddCardClick}
                                      className="rounded-full"
                                    >
                                      <Plus className="w-4 h-4 mr-1" />
                                      Add Card
                                    </Button>
                                  )}
                                </div>
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
                                                <CreditCardItem card={card} isDragging={snapshot.isDragging} />
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
                              </div>
                            )}
                            {section === 'banks' && <BankAccountList bankAccounts={bankAccounts} />}
                            {section === 'bills' && <RecurringBillList bills={recurringBills} bankAccounts={bankAccounts} />}
                            {section === 'loans' && <MortgageLoanList loans={mortgageLoans} bankAccounts={bankAccounts} />}
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
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Quick Add</DialogTitle>
                </DialogHeader>
                
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
                  isLoading={createPurchaseMutation.isPending || createBankDepositMutation.isPending ||
                             createBankPaymentMutation.isPending || createCardPaymentMutation.isPending || 
                             createBillPaymentMutation.isPending || createLoanPaymentMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </>
        )}
        </div>
      </div>
    </DragDropContext>
  );
}
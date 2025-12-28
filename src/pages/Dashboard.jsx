import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard, Loader2, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AddPurchaseForm from '@/components/transactions/AddPurchaseForm';
import { AnimatePresence, motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import DashboardSummary from '@/components/dashboard/DashboardSummary';
import CreditCardItem from '@/components/cards/CreditCardItem';
import AddCardForm from '@/components/cards/AddCardForm';
import UpgradePrompt from '@/components/premium/UpgradePrompt';
import BankAccountList from '@/components/bankaccounts/BankAccountList';
import RecurringBillList from '@/components/bills/RecurringBillList';
import MortgageLoanList from '@/components/mortgages/MortgageLoanList';
import PaymentCalendar from '@/components/calendar/PaymentCalendar';
import ComprehensivePaymentSimulator from '@/components/simulator/ComprehensivePaymentSimulator';

const MAX_FREE_CARDS = 2;

export default function Dashboard() {
  const [showAddCard, setShowAddCard] = useState(false);
  const [sectionOrder, setSectionOrder] = useState(['simulator', 'calendar', 'banks', 'bills', 'loans']);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddCardId, setQuickAddCardId] = useState(null);
  const queryClient = useQueryClient();

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
    
    const items = Array.from(cards);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    queryClient.setQueryData(['credit-cards'], items);
    reorderCardsMutation.mutate(items);
  };

  const handleSectionDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(sectionOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSectionOrder(items);
    reorderSectionsMutation.mutate(items);
  };

  React.useEffect(() => {
    const fetchSectionOrder = async () => {
      try {
        const user = await base44.auth.me();
        if (user.section_order) {
          setSectionOrder(user.section_order);
        }
      } catch (error) {
        console.error('Error fetching section order:', error);
      }
    };
    fetchSectionOrder();
  }, []);

  const canAddCard = cards.length < MAX_FREE_CARDS;

  const createPurchaseMutation = useMutation({
    mutationFn: async (purchaseData) => {
      await base44.entities.Purchase.create({ ...purchaseData, card_id: quickAddCardId });
      const card = cards.find(c => c.id === quickAddCardId);
      if (card) {
        await base44.entities.CreditCard.update(quickAddCardId, {
          balance: card.balance + purchaseData.amount
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['credit-card'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Debt Freedom</h1>
          <p className="text-slate-500">Track & pay off your credit cards</p>
        </header>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Summary */}
            {cards.length > 0 && (
              <div className="mb-6">
                <DashboardSummary 
                  cards={cards} 
                  bankAccounts={bankAccounts}
                  recurringBills={recurringBills}
                  mortgageLoans={mortgageLoans}
                />
              </div>
            )}

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

            {/* Upgrade Prompt */}
            {!canAddCard && (
              <div className="mb-6">
                <UpgradePrompt
                  currentCardCount={cards.length}
                  maxFreeCards={MAX_FREE_CARDS}
                  onUpgrade={() => alert('Premium upgrade coming soon!')}
                />
              </div>
            )}

            {/* Cards Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Your Cards</h2>
                {!showAddCard && canAddCard && (
                  <Button
                    size="sm"
                    onClick={() => setShowAddCard(true)}
                    className="rounded-full"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Card
                  </Button>
                )}
              </div>

              {cards.length === 0 ? (
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
                  <Button onClick={() => setShowAddCard(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Credit Card
                  </Button>
                </motion.div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="cards">
                    {(provided) => (
                      <div 
                        {...provided.droppableProps} 
                        ref={provided.innerRef}
                        className="space-y-4"
                      >
                        {cards.map((card, index) => (
                          <Draggable key={card.id} draggableId={card.id} index={index}>
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
                                  transition={{ delay: index * 0.1 }}
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
                </DragDropContext>
              )}
            </div>

            {/* Add More Button (when cards exist but form hidden) */}
            {cards.length > 0 && !showAddCard && canAddCard && (
              <Button
                variant="outline"
                className="w-full h-14 border-dashed border-2 text-slate-500"
                onClick={() => setShowAddCard(true)}
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Another Card
              </Button>
            )}

            {/* Draggable Sections */}
            <div className="mt-8">
              <DragDropContext onDragEnd={handleSectionDragEnd}>
                <Droppable droppableId="sections">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                      {sectionOrder.map((section, index) => (
                        <Draggable key={section} draggableId={section} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="mb-6"
                            >
                              {section === 'simulator' && <ComprehensivePaymentSimulator />}
                              {section === 'calendar' && <PaymentCalendar />}
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
              </DragDropContext>
            </div>
          </>
        )}

        {/* Quick Add FAB */}
        {cards.length > 0 && (
          <>
            <button
              onClick={handleQuickAdd}
              className="fixed bottom-20 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-50"
              aria-label="Quick add purchase"
            >
              <Zap className="w-6 h-6" />
            </button>

            <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Quick Add Purchase</DialogTitle>
                </DialogHeader>
                
                {!quickAddCardId && cards.length > 1 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600 mb-3">Select a card:</p>
                    {cards.map(card => (
                      <Button
                        key={card.id}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setQuickAddCardId(card.id)}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        {card.name}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <AddPurchaseForm
                    cardId={quickAddCardId || cards[0]?.id}
                    onSubmit={(data) => createPurchaseMutation.mutate(data)}
                    onCancel={() => {
                      setShowQuickAdd(false);
                      setQuickAddCardId(null);
                    }}
                    isLoading={createPurchaseMutation.isPending}
                  />
                )}
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}
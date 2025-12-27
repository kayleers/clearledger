import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import DashboardSummary from '@/components/dashboard/DashboardSummary';
import CreditCardItem from '@/components/cards/CreditCardItem';
import AddCardForm from '@/components/cards/AddCardForm';
import UpgradePrompt from '@/components/premium/UpgradePrompt';

const MAX_FREE_CARDS = 2;

export default function Dashboard() {
  const [showAddCard, setShowAddCard] = useState(false);
  const queryClient = useQueryClient();

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: async () => {
      const allCards = await base44.entities.CreditCard.list();
      return allCards.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
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

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(cards);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    queryClient.setQueryData(['credit-cards'], items);
    reorderCardsMutation.mutate(items);
  };

  const canAddCard = cards.length < MAX_FREE_CARDS;

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
                <DashboardSummary cards={cards} />
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
          </>
        )}
      </div>
    </div>
  );
}
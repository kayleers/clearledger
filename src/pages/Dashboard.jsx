import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard, Loader2, Zap, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
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
import PaymentCalendar from '@/components/calendar/PaymentCalendar';
import QuickAddMenu from '@/components/quickadd/QuickAddMenu';
import MultiPaymentSimulator from '@/components/simulator/MultiPaymentSimulator';
import { useAccessControl } from '@/components/access/useAccessControl';
import UpgradeDialog from '@/components/access/UpgradeDialog';

export default function Dashboard() {
  const [showAddCard, setShowAddCard] = useState(false);
  const [sectionOrder, setSectionOrder] = useState(['summary', 'cards', 'calendar', 'simulator', 'banks', 'bills', 'loans', 'pricing', 'privacy']);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddCardId, setQuickAddCardId] = useState(null);
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [simulatorExpanded, setSimulatorExpanded] = useState(false);
  const [cardsExpanded, setCardsExpanded] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState('general');
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
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
      queryClient.invalidateQueries({ queryKey: ['all-deposits'] });
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-emerald-800">
        <div className="max-w-lg mx-auto px-4 py-6 pb-24 relative z-0">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white drop-shadow-lg">ClearLedger</h1>
            <p className="text-slate-200">Private bill & balance tracking. Smarter payment planning.</p>
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
                                      <h2 className="text-xl font-bold text-emerald-400">Credit Cards</h2>
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
                            {section === 'bills' && <RecurringBillList bills={recurringBills} bankAccounts={bankAccounts} dragHandleProps={provided.dragHandleProps} />}
                            {section === 'loans' && <MortgageLoanList loans={mortgageLoans} bankAccounts={bankAccounts} dragHandleProps={provided.dragHandleProps} />}
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

        {/* Privacy Policy Dialog */}
        <Dialog open={showPrivacyPolicy} onOpenChange={setShowPrivacyPolicy}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Privacy Policy</DialogTitle>
            </DialogHeader>
            <div className="prose prose-sm max-w-none text-slate-700 space-y-4">
              <p className="text-sm text-slate-500">Last updated: January 6, 2026</p>
              
              <p>ClearLedger ("the app") is a manual financial planning tool designed to give users full control over their financial data and help users track bills, loans, credit cards, bank accounts, and payment schedules across multiple currencies. We are committed to protecting your privacy and being transparent about how your information is handled.</p>
              
              <h3 className="font-bold text-slate-900 mt-6">Information We Collect</h3>
              <p>ClearLedger does not collect, transmit, or store personal or financial information on external servers.</p>
              
              <p>All data you enter into the app — including balances, transactions, bills, loans, and payment simulations — is:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Entered manually by you</li>
                <li>Stored locally on your device</li>
                <li>Never shared with third parties</li>
                <li>Never synced to online accounts</li>
              </ul>
              
              <p>We do not connect to banks, credit bureaus, or financial institutions.</p>
              
              <h3 className="font-bold text-slate-900 mt-6">Information We Do Not Collect</h3>
              <p>ClearLedger does not collect:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Names, addresses, or government identifiers</li>
                <li>Bank login credentials</li>
                <li>Credit card numbers</li>
                <li>Transaction data from financial institutions</li>
                <li>Contacts, photos, or files</li>
                <li>Location data</li>
                <li>Advertising identifiers</li>
              </ul>
              
              <h3 className="font-bold text-slate-900 mt-6">In-App Purchases and Subscriptions</h3>
              <p>ClearLedger offers optional in-app purchases, including:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Subscription tiers that unlock additional features</li>
                <li>One-time purchases that expand access to app functionality</li>
              </ul>
              
              <p>All payments are processed securely through Google Play Billing. ClearLedger does not receive or store your payment information.</p>
              
              <p>Google may collect payment-related information as part of the billing process. Please refer to Google's Privacy Policy for details on how Google handles this data.</p>
              
              <h3 className="font-bold text-slate-900 mt-6">Ads and Tracking</h3>
              <p>ClearLedger does not display ads and does not use third-party advertising or tracking SDKs.</p>
              <p>We do not track user behavior across apps or websites.</p>
              
              <h3 className="font-bold text-slate-900 mt-6">Data Storage and Security</h3>
              <p>All user-entered data remains on your device unless you manually remove it. ClearLedger does not upload, back up, or transmit your data to any external servers.</p>
              <p>Because data is stored locally, deleting the app will remove all stored information.</p>
              
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
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </DragDropContext>
  );
}
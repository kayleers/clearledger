import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Plus, Edit2, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useQuery } from '@tanstack/react-query';
import CurrencySelector from '@/components/currency/CurrencySelector';
import { useAccessControl } from '@/components/access/useAccessControl';
import UpgradeDialog from '@/components/access/UpgradeDialog';
import { formatCurrency } from '@/components/utils/calculations';

export default function BankAccountList({ bankAccounts = [], dragHandleProps }) {
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const queryClient = useQueryClient();
  const accessControl = useAccessControl();

  // Fetch all deposits for calculating ongoing balance
  const { data: allDeposits = [] } = useQuery({
    queryKey: ['all-deposits'],
    queryFn: () => base44.entities.Deposit.list(),
    enabled: bankAccounts.length > 0
  });

  const getOngoingBalance = (account) => {
    const accountDeposits = allDeposits.filter(d => d.bank_account_id === account.id);
    const totalDeposits = accountDeposits.filter(d => d.amount > 0).reduce((sum, d) => sum + d.amount, 0);
    const totalWithdrawals = Math.abs(accountDeposits.filter(d => d.amount < 0).reduce((sum, d) => sum + d.amount, 0));
    return (account.balance || 0) + totalDeposits - totalWithdrawals;
  };

  const createAccountMutation = useMutation({
    mutationFn: (data) => base44.entities.BankAccount.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setShowAddAccount(false);
    }
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankAccount.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setEditingAccount(null);
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id) => base44.entities.BankAccount.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    }
  });

  const updateAccountOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankAccount.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    }
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(bankAccounts);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    items.forEach((account, index) => {
      updateAccountOrderMutation.mutate({
        id: account.id,
        data: { display_order: index }
      });
    });
  };

  const canAddAccount = accessControl.canAddBankAccount(bankAccounts.length);

  const handleAddAccountClick = () => {
    if (canAddAccount) {
      setShowAddAccount(true);
    } else {
      setShowUpgradeDialog(true);
    }
  };

  return (
    <div className="space-y-4">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {dragHandleProps && (
              <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
                <GripVertical className="w-5 h-5 text-slate-400" />
              </div>
            )}
            <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity">
              <h2 className="text-xl font-bold text-slate-800">Bank Accounts</h2>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </CollapsibleTrigger>
          </div>
          <Button
            size="sm"
            onClick={handleAddAccountClick}
            className="bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Account
          </Button>
        </div>

        <CollapsibleContent>
          <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="bank-accounts">
          {(provided) => (
            <div className="grid gap-3" {...provided.droppableProps} ref={provided.innerRef}>
              {bankAccounts.map((account, index) => (
                <Draggable key={account.id} draggableId={account.id} index={index}>
                  {(provided) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="border-l-4 border-l-blue-500"
                    >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{account.name}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="font-medium text-slate-700">{formatCurrency(getOngoingBalance(account), account.currency)}</span>
                      {account.account_number && (
                        <>
                          <span>•</span>
                          <span>****{account.account_number}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingAccount(account)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={() => {
                      if (confirm('Delete this bank account?')) {
                        deleteAccountMutation.mutate(account.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {bankAccounts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">No bank accounts yet</p>
            <Button onClick={handleAddAccountClick}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Account
            </Button>
          </CardContent>
        </Card>
      )}
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
          </DialogHeader>
          <BankAccountForm
            onSubmit={(data) => createAccountMutation.mutate(data)}
            isLoading={createAccountMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingAccount} onOpenChange={() => setEditingAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bank Account</DialogTitle>
          </DialogHeader>
          <BankAccountForm
            account={editingAccount}
            onSubmit={(data) => updateAccountMutation.mutate({ id: editingAccount.id, data })}
            isLoading={updateAccountMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        context="bankAccounts"
      />
    </div>
  );
}

function BankAccountForm({ account, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    name: account?.name || '',
    account_number: account?.account_number || '',
    currency: account?.currency || 'USD'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="accountName">Account Name</Label>
        <Input
          id="accountName"
          placeholder="e.g., Chase Checking"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="accountNumber">Account Number (Last 4 digits - Optional)</Label>
        <Input
          id="accountNumber"
          placeholder="1234"
          maxLength="4"
          value={formData.account_number}
          onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="accountCurrency">Currency</Label>
        <CurrencySelector
          value={formData.currency}
          onChange={(currency) => setFormData({ ...formData, currency })}
          className="w-full"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Saving...' : account ? 'Update Account' : 'Add Account'}
      </Button>
    </form>
  );
}
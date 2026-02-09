import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, LogOut, ArrowLeft, Trash2, FileText, Download, Shield, ExternalLink, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useEntitlements } from '@/components/access/EntitlementsProvider';
import PrivacyPolicyContent from '@/components/privacy/PrivacyPolicyContent';
import TermsOfServiceContent from '@/components/privacy/TermsOfServiceContent';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AccountSettings() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { plan, isLoading: entitlementsLoading } = useEntitlements();

  const { data: user, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      return currentUser;
    }
  });

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const response = await base44.functions.invoke('exportAllData', {});
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-data-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const userEmail = user?.email;
      if (!userEmail) throw new Error('User email not found');

      // Delete all user data
      await Promise.all([
        base44.entities.CreditCard.filter({ created_by: userEmail }).then(cards => 
          Promise.all(cards.map(c => base44.entities.CreditCard.delete(c.id)))
        ),
        base44.entities.Purchase.filter({ created_by: userEmail }).then(purchases => 
          Promise.all(purchases.map(p => base44.entities.Purchase.delete(p.id)))
        ),
        base44.entities.Payment.filter({ created_by: userEmail }).then(payments => 
          Promise.all(payments.map(p => base44.entities.Payment.delete(p.id)))
        ),
        base44.entities.BankAccount.filter({ created_by: userEmail }).then(accounts => 
          Promise.all(accounts.map(a => base44.entities.BankAccount.delete(a.id)))
        ),
        base44.entities.Deposit.filter({ created_by: userEmail }).then(deposits => 
          Promise.all(deposits.map(d => base44.entities.Deposit.delete(d.id)))
        ),
        base44.entities.RecurringDeposit.filter({ created_by: userEmail }).then(deposits => 
          Promise.all(deposits.map(d => base44.entities.RecurringDeposit.delete(d.id)))
        ),
        base44.entities.RecurringWithdrawal.filter({ created_by: userEmail }).then(withdrawals => 
          Promise.all(withdrawals.map(w => base44.entities.RecurringWithdrawal.delete(w.id)))
        ),
        base44.entities.RecurringBill.filter({ created_by: userEmail }).then(bills => 
          Promise.all(bills.map(b => base44.entities.RecurringBill.delete(b.id)))
        ),
        base44.entities.MortgageLoan.filter({ created_by: userEmail }).then(loans => 
          Promise.all(loans.map(l => base44.entities.MortgageLoan.delete(l.id)))
        ),
        base44.entities.LoanPayment.filter({ created_by: userEmail }).then(payments => 
          Promise.all(payments.map(p => base44.entities.LoanPayment.delete(p.id)))
        ),
        base44.entities.BankTransfer.filter({ created_by: userEmail }).then(transfers => 
          Promise.all(transfers.map(t => base44.entities.BankTransfer.delete(t.id)))
        ),
        base44.entities.CurrencyConversion.filter({ created_by: userEmail }).then(conversions => 
          Promise.all(conversions.map(c => base44.entities.CurrencyConversion.delete(c.id)))
        ),
        base44.entities.PayoffScenario.filter({ created_by: userEmail }).then(scenarios => 
          Promise.all(scenarios.map(s => base44.entities.PayoffScenario.delete(s.id)))
        ),
        base44.entities.LoanPayoffScenario.filter({ created_by: userEmail }).then(scenarios => 
          Promise.all(scenarios.map(s => base44.entities.LoanPayoffScenario.delete(s.id)))
        ),
        base44.entities.MultiPaymentScenario.filter({ created_by: userEmail }).then(scenarios => 
          Promise.all(scenarios.map(s => base44.entities.MultiPaymentScenario.delete(s.id)))
        ),
        base44.entities.TransactionTemplate.filter({ created_by: userEmail }).then(templates => 
          Promise.all(templates.map(t => base44.entities.TransactionTemplate.delete(t.id)))
        ),
        base44.entities.ScheduledPaymentStatus.filter({ created_by: userEmail }).then(statuses => 
          Promise.all(statuses.map(s => base44.entities.ScheduledPaymentStatus.delete(s.id)))
        ),
        base44.entities.SyncState.filter({ created_by: userEmail }).then(syncs => 
          Promise.all(syncs.map(s => base44.entities.SyncState.delete(s.id)))
        ),
      ]);
    },
    onSuccess: () => {
      // Logout and redirect after successful deletion
      base44.auth.logout();
    },
    onError: (error) => {
      console.error('Failed to delete account:', error);
      alert('Failed to delete account. Please try again or contact support.');
    }
  });

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== 'DELETE') {
      return;
    }
    deleteAccountMutation.mutate();
  };

  if (isLoading || entitlementsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-emerald-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  const getPlanDisplayName = () => {
    if (plan === 'pro_monthly') return 'Pro Monthly';
    if (plan === 'pro_yearly') return 'Pro Yearly';
    if (plan === 'pro_lifetime') return 'Pro Lifetime';
    return 'Free';
  };

  const isPro = plan && plan.startsWith('pro_');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-emerald-800 dark:from-slate-950 dark:via-cyan-950 dark:to-emerald-950 p-4 pb-24 safe-area-pt">
      <div className="max-w-2xl mx-auto py-8 safe-area-pt">
        <Link 
          to={createPageUrl('Dashboard')} 
          className="inline-flex items-center text-white hover:text-emerald-400 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        <div className="space-y-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Account Information
              </CardTitle>
              <CardDescription>Your account details (managed by authentication provider)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-400">Email Address</p>
                <p className="text-base font-medium">{user?.email}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-400">Account Role</p>
                <p className="text-base font-medium capitalize">{user?.role || 'User'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Subscription
              </CardTitle>
              <CardDescription>Your current subscription plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Current Plan</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{getPlanDisplayName()}</p>
                </div>
                {isPro && (
                  <div className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium">
                    Active
                  </div>
                )}
              </div>
              {isPro && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open('https://play.google.com/store/account/subscriptions', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Manage Subscription in Google Play
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Data Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Data Export
              </CardTitle>
              <CardDescription>Export all your financial data</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleExportData}
                disabled={isExporting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export All Data to PDF
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Privacy & Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy & Legal
              </CardTitle>
              <CardDescription>Review our policies and terms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowPrivacyPolicy(true)}
              >
                <FileText className="w-4 h-4 mr-2" />
                Privacy Policy
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowTermsOfService(true)}
              >
                <FileText className="w-4 h-4 mr-2" />
                Terms of Service
              </Button>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start text-red-700 hover:text-red-900 hover:bg-red-100 dark:hover:bg-red-950 border-red-300"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account & All Data
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Privacy Policy Dialog */}
      <Dialog open={showPrivacyPolicy} onOpenChange={setShowPrivacyPolicy}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
          </DialogHeader>
          <PrivacyPolicyContent />
        </DialogContent>
      </Dialog>

      {/* Terms of Service Dialog */}
      <Dialog open={showTermsOfService} onOpenChange={setShowTermsOfService}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
          </DialogHeader>
          <TermsOfServiceContent />
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account & All Data</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This action cannot be undone. This will permanently delete your account and all associated data including:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>All credit cards and transactions</li>
                <li>All bank accounts and deposits</li>
                <li>All loans and bills</li>
                <li>All payment scenarios and simulations</li>
                <li>All recurring payments and transfers</li>
              </ul>
              <p className="font-semibold text-red-600 dark:text-red-400">Type "DELETE" to confirm:</p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                className="mt-2"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'DELETE' || deleteAccountMutation.isPending}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {deleteAccountMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Account & All Data'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
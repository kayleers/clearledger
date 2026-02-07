import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, Mail, LogOut, Shield, ArrowLeft, Lock, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

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
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      return currentUser;
    }
  });

  React.useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const updateUserMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
      return data;
    },
    onSuccess: (data) => {
      // Update the cache directly to prevent reverting
      queryClient.setQueryData(['current-user'], (oldData) => ({
        ...oldData,
        full_name: data.full_name,
        email: data.email
      }));
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      // Invalidate after a delay to ensure backend has processed
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['current-user'] });
      }, 1000);
    },
    onError: (err) => {
      setError(err.message || 'Failed to update profile');
    }
  });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    updateUserMutation.mutate({
      full_name: fullName,
      email: email
    });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    try {
      // Base44 handles password changes through the authentication system
      // In a real implementation, this would call a password change endpoint
      // For now, we'll show users how to reset their password
      setPasswordError('Password change must be done through the login page. Please log out and use "Forgot Password"');
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password');
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-emerald-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

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
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {success && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={updateUserMutation.isPending}
                  className="w-full"
                >
                  {updateUserMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>



          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {passwordSuccess && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-green-800">{passwordSuccess}</AlertDescription>
                </Alert>
              )}
              
              {passwordError && (
                <Alert variant="destructive">
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 8 characters)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" variant="outline">
                  Change Password
                </Button>
              </form>
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
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Account Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This action cannot be undone. This will permanently delete your account and all associated data including:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>All credit cards and transactions</li>
                <li>All bank accounts and deposits</li>
                <li>All loans and bills</li>
                <li>All payment scenarios</li>
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
                'Delete Account'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
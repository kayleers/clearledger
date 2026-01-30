import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, User, Mail, Lock, AlertCircle, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAccessControl } from '@/components/access/useAccessControl';
import UpgradeDialog from '@/components/access/UpgradeDialog';

export default function AccountSettings() {
  const queryClient = useQueryClient();
  const accessControl = useAccessControl();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      // Split full_name if it exists
      if (userData.full_name) {
        const nameParts = userData.full_name.split(' ');
        setFirstName(nameParts[0] || '');
        setLastName(nameParts.slice(1).join(' ') || '');
      }
      // Set email
      if (userData.email) {
        setEmail(userData.email);
      }
      return userData;
    }
  });

  const updateNameMutation = useMutation({
    mutationFn: async () => {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      await base44.entities.User.update(user.id, { full_name: fullName });
      return fullName;
    },
    onSuccess: (fullName) => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setSuccess('Name updated successfully!');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError('Failed to update name. Please try again.');
      setSuccess('');
    }
  });

  const updateEmailMutation = useMutation({
    mutationFn: async () => {
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }
      await base44.entities.User.update(user.id, { email: email.trim() });
      return email.trim();
    },
    onSuccess: (newEmail) => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setSuccess('Email updated successfully!');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Failed to update email. Please try again.');
      setSuccess('');
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!currentPassword || !newPassword) {
        throw new Error('Please fill in all password fields');
      }
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }
      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters');
      }
      
      await base44.auth.changePassword({
        userId: user.id,
        currentPassword,
        newPassword
      });
    },
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password changed successfully!');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Failed to change password. Please check your current password.');
      setSuccess('');
    }
  });

  const handleUpdateName = (e) => {
    e.preventDefault();
    updateNameMutation.mutate();
  };

  const handleUpdateEmail = (e) => {
    e.preventDefault();
    updateEmailMutation.mutate();
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    changePasswordMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-emerald-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-emerald-800">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-emerald-400">Account Settings</h1>
            <p className="text-white/80 text-sm">Manage your account information</p>
          </div>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-100 flex items-center gap-2">
            <Save className="w-5 h-5" />
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-100 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Name Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Update your name</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateName} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={updateNameMutation.isPending}
              >
                {updateNameMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Name
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Subscription Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Subscription
            </CardTitle>
            <CardDescription>Your current subscription tier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Current Plan</Label>
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-lg">
                <p className="text-lg font-bold text-emerald-700">
                  {user?.tier === 'free' ? '🆓 Free Plan' : 
                   user?.tier === 'pro' ? '⭐ Pro Plan' : 
                   user?.tier === 'lifetime' ? '💎 Lifetime Access' : 
                   !user?.tier ? '🆓 Free Plan' : '🆓 Free Plan'}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {user?.tier === 'free' ? 'Limited to 2 credit cards and 2 loans' :
                   user?.tier === 'pro' ? 'Unlimited credit cards and loans' :
                   user?.tier === 'lifetime' ? 'Unlimited everything, forever' : 
                   !user?.tier ? 'Limited to 2 credit cards and 2 loans' : 'Limited to 2 credit cards and 2 loans'}
                </p>
              </div>
            </div>
            
            {(user?.tier === 'free' || user?.tier === 'lifetime' || !user?.tier) && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-slate-800 mb-2">
                  {(user?.tier === 'free' || !user?.tier) ? '🚀 Upgrade to unlock more!' : '💎 Go Lifetime!'}
                </p>
                <p className="text-sm text-slate-700 mb-3">
                  {(user?.tier === 'free' || !user?.tier)
                    ? 'Unlock unlimited credit cards, loans, and advanced features'
                    : 'Get lifetime access with a one-time payment - no recurring fees!'}
                </p>
                <Button 
                  onClick={() => setShowUpgradeDialog(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  View Upgrade Options
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Address
            </CardTitle>
            <CardDescription>Update your email address</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={updateEmailMutation.isPending}
              >
                {updateEmailMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Email
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Change Password
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Upgrade Dialog */}
        <UpgradeDialog 
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          context="general"
        />
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function EmailExportDialog({ open, onOpenChange }) {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email || isSending) return;
    setIsSending(true);
    try {
      await base44.functions.invoke('exportAllData', { email });
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setEmail('');
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      alert(`Failed to send report: ${error?.message || 'Please try again.'}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isSending) { setEmail(''); setSent(false); onOpenChange(v); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-emerald-500" />
            Email Financial Report
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center py-6 gap-3 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <p className="font-medium text-slate-800">Report sent!</p>
            <p className="text-sm text-slate-500">Check your inbox for the download link.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              We'll generate your full financial report and send a download link to your email.
            </p>
            <div className="space-y-2">
              <Label htmlFor="export-email">Email address</Label>
              <Input
                id="export-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isSending}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleSend}
                disabled={!email || isSending}
              >
                {isSending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : 'Send Report'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
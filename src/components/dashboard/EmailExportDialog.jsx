import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function EmailExportDialog({ open, onOpenChange }) {
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (isSending) return;
    setIsSending(true);
    try {
      // No email is passed — the backend always sends to the currently
      // authenticated user's email derived from the session token.
      await base44.functions.invoke('exportAllData', {});
      setSent(true);
      setTimeout(() => {
        setSent(false);
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      alert(`Failed to send report: ${error?.message || 'Please try again.'}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isSending) { setSent(false); onOpenChange(v); } }}>
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
              We'll generate your full financial report and send a download link to your account's registered email address.
            </p>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isSending}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleSend}
                disabled={isSending}
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
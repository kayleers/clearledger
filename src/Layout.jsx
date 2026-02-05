import React from 'react';
import { EntitlementsProvider } from '@/components/access/EntitlementsProvider';
import BottomNav from '@/components/layout/BottomNav';

export default function Layout({ children, currentPageName }) {
  return (
    <EntitlementsProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-teal-800 dark:from-slate-950 dark:via-blue-950 dark:to-teal-950">
        {children}
        <BottomNav />

        <style>{`
          @supports (padding-bottom: env(safe-area-inset-bottom)) {
            .safe-area-pb {
              padding-bottom: env(safe-area-inset-bottom);
            }
          }
          
          @supports (padding-top: env(safe-area-inset-top)) {
            .safe-area-pt {
              padding-top: env(safe-area-inset-top);
            }
          }
          
          * {
            -webkit-tap-highlight-color: transparent;
          }
          
          input, button, select, textarea {
            font-size: 16px; /* Prevents iOS zoom on focus */
          }

          /* Prevent overscroll */
          html, body {
            overscroll-behavior: none;
            overscroll-behavior-y: none;
          }

          /* Dark mode support */
          @media (prefers-color-scheme: dark) {
            :root {
              color-scheme: dark;
            }
          }
        `}</style>
      </div>
    </EntitlementsProvider>
  );
}
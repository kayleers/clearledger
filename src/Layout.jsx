import React from 'react';
import { EntitlementsProvider } from '@/components/access/EntitlementsProvider';

export default function Layout({ children, currentPageName }) {
  return (
    <EntitlementsProvider>
      <div className="min-h-screen bg-slate-50">
        {children}

        <style>{`
          @supports (padding-bottom: env(safe-area-inset-bottom)) {
            .safe-area-pb {
              padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
            }
          }
          
          * {
            -webkit-tap-highlight-color: transparent;
          }
          
          input, button, select, textarea {
            font-size: 16px; /* Prevents iOS zoom on focus */
          }
        `}</style>
      </div>
    </EntitlementsProvider>
  );
}
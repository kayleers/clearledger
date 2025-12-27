import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, TrendingUp, Settings, HelpCircle } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, label: 'Home' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {children}
      
      {/* Bottom Navigation - Mobile First */}
      {currentPageName === 'Dashboard' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 safe-area-pb">
          <div className="max-w-lg mx-auto flex justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.name;
              
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.name)}
                  className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all ${
                    isActive 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Icon className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

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
  );
}
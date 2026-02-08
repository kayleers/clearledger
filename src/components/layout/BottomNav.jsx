import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, User } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function BottomNav() {
  const location = useLocation();

  const tabs = [
    { name: 'Dashboard', path: createPageUrl('Dashboard'), icon: Home },
    { name: 'Settings', path: createPageUrl('AccountSettings'), icon: User }
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleScheduleClick = () => {
    // Navigate to dashboard if not already there
    if (location.pathname !== createPageUrl('Dashboard')) {
      window.location.href = createPageUrl('Dashboard');
      setTimeout(() => {
        const calendarSection = document.querySelector('[data-section="calendar"]');
        if (calendarSection) {
          calendarSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Trigger expand if collapsed
          const trigger = calendarSection.querySelector('button[data-state]');
          if (trigger && trigger.getAttribute('data-state') === 'closed') {
            trigger.click();
          }
        }
      }, 300);
    } else {
      const calendarSection = document.querySelector('[data-section="calendar"]');
      if (calendarSection) {
        calendarSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Trigger expand if collapsed
        const trigger = calendarSection.querySelector('button[data-state]');
        if (trigger && trigger.getAttribute('data-state') === 'closed') {
          trigger.click();
        }
      }
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 z-50 safe-area-pb">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          return (
            <Link
              key={tab.name}
              to={tab.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active
                  ? 'text-emerald-500 dark:text-emerald-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-6 h-6 ${active ? 'scale-110' : ''} transition-transform`} />
              <span className="text-xs mt-1 font-medium">{tab.name}</span>
            </Link>
          );
        })}
        <button
          onClick={handleScheduleClick}
          className="flex flex-col items-center justify-center flex-1 h-full transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        >
          <Calendar className="w-6 h-6 transition-transform" />
          <span className="text-xs mt-1 font-medium">Schedule</span>
        </button>
      </div>
    </nav>
  );
}
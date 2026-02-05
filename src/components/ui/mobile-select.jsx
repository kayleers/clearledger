import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/components/utils/useIsMobile';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

export function MobileSelect({ value, onValueChange, options, placeholder, label, className = '' }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const selectedOption = options.find(o => o.value === value);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-left flex items-center justify-between ${className}`}
      >
        <span className={selectedOption ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{label || placeholder}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 max-h-[60vh] overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg mb-2 transition-colors ${
                  value === option.value
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100'
                }`}
              >
                <span>{option.label}</span>
                {value === option.value && <Check className="w-5 h-5" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Star, Search } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const CURRENCIES = [
  // Top 5 most popular
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  // Rest alphabetically
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
];

export default function CurrencySelector({ value, onChange, className = '' }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
  });

  const pinnedCurrencies = user?.pinned_currencies || [];

  const togglePin = (currencyCode) => {
    const newPinned = pinnedCurrencies.includes(currencyCode)
      ? pinnedCurrencies.filter(c => c !== currencyCode)
      : [...pinnedCurrencies, currencyCode];
    
    updateUserMutation.mutate({ pinned_currencies: newPinned });
  };

  const sortedCurrencies = useMemo(() => {
    const filtered = CURRENCIES.filter(c => 
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
    );

    const pinned = filtered.filter(c => pinnedCurrencies.includes(c.code));
    const unpinned = filtered.filter(c => !pinnedCurrencies.includes(c.code));

    return [...pinned, ...unpinned];
  }, [search, pinnedCurrencies]);

  const selectedCurrency = CURRENCIES.find(c => c.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`justify-between ${className}`}>
          {selectedCurrency ? (
            <span>{selectedCurrency.code} - {selectedCurrency.name}</span>
          ) : (
            <span className="text-slate-400">Select currency</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 mr-2" />
          <Input
            placeholder="Search currencies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 h-8 px-0"
          />
        </div>
        <ScrollArea className="h-72">
          <div className="p-2">
            {sortedCurrencies.map((currency) => {
              const isPinned = pinnedCurrencies.includes(currency.code);
              return (
                <div
                  key={currency.code}
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-50 cursor-pointer"
                >
                  <div 
                    className="flex-1"
                    onClick={() => {
                      onChange(currency.code);
                      setOpen(false);
                    }}
                  >
                    <div className="font-medium text-sm">
                      {currency.symbol} {currency.code}
                    </div>
                    <div className="text-xs text-slate-500">{currency.name}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(currency.code);
                    }}
                  >
                    <Star 
                      className={`w-4 h-4 ${isPinned ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
                    />
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
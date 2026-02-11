import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Camera, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ReceiptScanner({ cardId, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setExtractedData(null);
    setError(null);
  };

  const handleScan = async () => {
    if (!file) return;

    setIsScanning(true);
    setError(null);

    try {
      // Upload receipt image
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract receipt data
      const jsonSchema = {
        type: "object",
        properties: {
          merchant: { type: "string" },
          amount: { type: "number" },
          date: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                amount: { type: "number" }
              }
            }
          }
        }
      };

      const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: jsonSchema
      });

      if (extraction.status === 'success' && extraction.output) {
        setExtractedData(extraction.output);
      } else {
        setError(extraction.details || 'Failed to scan receipt');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirm = async () => {
    if (!extractedData || !cardId) return;

    try {
      const purchase = {
        card_id: cardId,
        description: extractedData.merchant || 'Receipt Purchase',
        amount: Math.abs(extractedData.amount || 0),
        date: extractedData.date || new Date().toISOString().split('T')[0],
        category: categorizeMerchant(extractedData.merchant)
      };

      await base44.entities.Purchase.create(purchase);

      // Update card balance
      const cards = await base44.entities.CreditCard.filter({ id: cardId });
      if (cards[0]) {
        await base44.entities.CreditCard.update(cardId, {
          balance: cards[0].balance + purchase.amount
        });
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      <div className="space-y-2">
        <Label className="dark:text-slate-200">Upload Receipt Photo</Label>
        <div className="flex items-center gap-2 overflow-hidden">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 dark:file:bg-purple-950 file:text-purple-700 dark:file:text-purple-300 hover:file:bg-purple-100 dark:hover:file:bg-purple-900 truncate"
          />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Take a photo or upload an image of your receipt
        </p>
      </div>

      {!extractedData && (
        <Button 
          onClick={handleScan}
          disabled={!file || isScanning}
          className="w-full"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 mr-2" />
              Scan Receipt
            </>
          )}
        </Button>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-300 text-sm break-words">{error}</span>
          </div>
        </div>
      )}

      {extractedData && (
        <div className="space-y-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-900">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="font-medium text-green-700 dark:text-green-300">Receipt Scanned</span>
          </div>
          
          <div className="space-y-2">
            <div>
              <Label>Merchant</Label>
              <Input value={extractedData.merchant || ''} onChange={(e) => 
                setExtractedData({...extractedData, merchant: e.target.value})
              } />
            </div>
            <div>
              <Label>Amount</Label>
              <Input 
                type="number" 
                step="0.01"
                value={extractedData.amount || ''} 
                onChange={(e) => 
                  setExtractedData({...extractedData, amount: parseFloat(e.target.value)})
                } 
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input 
                type="date"
                value={extractedData.date || ''} 
                onChange={(e) => 
                  setExtractedData({...extractedData, date: e.target.value})
                } 
              />
            </div>
          </div>

          <Button onClick={handleConfirm} className="w-full">
            Add Transaction
          </Button>
        </div>
      )}
    </div>
  );
}

function categorizeMerchant(merchant) {
  if (!merchant) return 'other';
  
  const lower = merchant.toLowerCase();
  
  if (lower.includes('grocery') || lower.includes('market') || lower.includes('walmart') || lower.includes('target')) {
    return 'groceries';
  }
  if (lower.includes('restaurant') || lower.includes('cafe') || lower.includes('pizza') || lower.includes('mcdonald')) {
    return 'dining';
  }
  if (lower.includes('gas') || lower.includes('shell') || lower.includes('chevron') || lower.includes('bp')) {
    return 'gas';
  }
  if (lower.includes('amazon') || lower.includes('store') || lower.includes('shop')) {
    return 'shopping';
  }
  if (lower.includes('movie') || lower.includes('theater') || lower.includes('spotify') || lower.includes('netflix')) {
    return 'entertainment';
  }
  if (lower.includes('doctor') || lower.includes('pharmacy') || lower.includes('hospital') || lower.includes('clinic')) {
    return 'health';
  }
  if (lower.includes('hotel') || lower.includes('airline') || lower.includes('uber') || lower.includes('lyft')) {
    return 'travel';
  }
  
  return 'other';
}
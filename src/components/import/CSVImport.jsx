import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CSVImport({ cardId, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
  };

  const handleImport = async () => {
    if (!file || !cardId) return;

    setIsUploading(true);
    setResult(null);

    try {
      // Upload file first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data
      const jsonSchema = {
        type: "object",
        properties: {
          transactions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                amount: { type: "number" },
                date: { type: "string" },
                category: { type: "string" }
              }
            }
          }
        }
      };

      const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: jsonSchema
      });

      if (extraction.status === 'success' && extraction.output?.transactions) {
        // Bulk create purchases
        const purchases = extraction.output.transactions.map(t => ({
          card_id: cardId,
          description: t.description,
          amount: Math.abs(t.amount || 0),
          date: t.date || new Date().toISOString().split('T')[0],
          category: t.category || 'other'
        }));

        await base44.entities.Purchase.bulkCreate(purchases);

        // Update card balance
        const totalAmount = purchases.reduce((sum, p) => sum + p.amount, 0);
        const cards = await base44.entities.CreditCard.filter({ id: cardId });
        if (cards[0]) {
          await base44.entities.CreditCard.update(cardId, {
            balance: cards[0].balance + totalAmount
          });
        }

        setResult({ success: true, count: purchases.length });
        if (onSuccess) onSuccess();
      } else {
        setResult({ success: false, message: extraction.details || 'Failed to extract data' });
      }
    } catch (error) {
      setResult({ success: false, message: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Upload CSV File</Label>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        <p className="text-xs text-slate-500">
          Upload a CSV file with columns: description, amount, date, category
        </p>
      </div>

      <Button 
        onClick={handleImport}
        disabled={!file || isUploading}
        className="w-full"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Importing...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Import Transactions
          </>
        )}
      </Button>

      {result && (
        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center gap-2">
            {result.success ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-green-700">
                  Successfully imported {result.count} transactions!
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-700">{result.message}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
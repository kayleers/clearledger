import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePrivacyPolicy } from './usePrivacyPolicy';

export default function PrivacyPolicyContent() {
  const { content, lastUpdated, isLoading, isError, isOffline, refetch } = usePrivacyPolicy();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="ml-3 text-slate-600">Loading Privacy Policy...</span>
      </div>
    );
  }

  if (isError && !isOffline) {
    return (
      <div className="py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to load Privacy Policy. Please check your connection and try again.
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => refetch()}
          className="mt-4 w-full"
          variant="outline"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isOffline && (
        <Alert className="bg-amber-50 border-amber-200">
          <WifiOff className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Showing cached version. Updates will sync when online.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span className="italic">Last updated: {lastUpdated}</span>
        <Button
          onClick={() => refetch()}
          variant="ghost"
          size="sm"
          className="h-8"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="prose prose-slate max-w-none prose-headings:text-emerald-600 prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700 prose-strong:text-slate-900 prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline">
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold text-emerald-600 mt-6 mb-4 flex items-center gap-2">
                {children}
              </h1>
            ),
            h2: ({ children }) => {
              // Extract section number if present
              const text = String(children);
              const match = text.match(/^(\d+)\.\s+(.+)/);
              if (match) {
                const [, num, title] = match;
                return (
                  <h2 className="text-xl font-bold text-emerald-600 mt-6 mb-3 flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {num}
                    </span>
                    <span>{title}</span>
                  </h2>
                );
              }
              return <h2 className="text-xl font-bold text-emerald-600 mt-6 mb-3">{children}</h2>;
            },
            h3: ({ children }) => (
              <h3 className="text-lg font-semibold text-emerald-600 mt-4 mb-2">{children}</h3>
            ),
            p: ({ children }) => (
              <p className="leading-relaxed text-slate-700 my-3">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-8 space-y-2 my-3">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-8 space-y-2 my-3">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="text-slate-700">{children}</li>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-slate-900">{children}</strong>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:underline"
              >
                {children}
              </a>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-emerald-300 pl-4 py-2 my-4 bg-emerald-50 rounded-r">
                {children}
              </blockquote>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      <div className="text-xs text-slate-500 text-center pt-6 border-t">
        <p>This Privacy Policy is automatically synchronized from our official repository.</p>
        <p className="mt-1">
          View on GitHub:{' '}
          <a
            href="https://github.com/kayleers/clearledger-privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:underline"
          >
            kayleers/clearledger-privacy
          </a>
        </p>
      </div>
    </div>
  );
}
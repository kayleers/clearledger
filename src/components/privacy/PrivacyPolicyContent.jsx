import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePrivacyPolicy } from './usePrivacyPolicy';

export default function PrivacyPolicyContent() {
  const { content, lastUpdated, isLoading, isError, isOffline, refetch } = usePrivacyPolicy();

  // Runtime verification
  React.useEffect(() => {
    console.log('[Privacy Policy Render] ═══════════════════════════════════');
    console.log('[Privacy Policy Render] COMPONENT MOUNTED');
    console.log('[Privacy Policy Render] ═══════════════════════════════════');
    
    if (content && content.length > 0) {
      console.log('[Privacy Policy Render] ✓ Content available');
      console.log('[Privacy Policy Render] Source: GitHub Pages');
      console.log('[Privacy Policy Render] Display mode: Native Document (ReactMarkdown)');
      console.log('[Privacy Policy Render] Content length:', content.length, 'characters');
      console.log('[Privacy Policy Render] Preview:', content.substring(0, 150).replace(/\n/g, ' '));
      console.log('[Privacy Policy Render] ✓ Render success');
    } else {
      console.warn('[Privacy Policy Render] ⚠️ No content to render');
    }
  }, [content]);

  if (isLoading) {
    console.log('[Privacy Policy Render] Loading from GitHub Pages...');
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        <div className="text-center">
          <p className="text-slate-700 font-medium">Loading Privacy Policy</p>
          <p className="text-sm text-slate-500">Fetching from GitHub Pages...</p>
        </div>
      </div>
    );
  }

  if (isError && !isOffline) {
    console.error('[Privacy Policy Render] ❌ Error state - no content');
    return (
      <div className="py-6 space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to load Privacy Policy from GitHub Pages. Please check your internet connection.
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => {
            console.log('[Privacy Policy Render] Manual retry triggered');
            refetch();
          }}
          className="w-full"
          variant="outline"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!content || content.length === 0) {
    console.error('[Privacy Policy Render] ❌ Empty content');
    return (
      <div className="py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Privacy Policy content is empty. Please try refreshing.
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => refetch()}
          className="mt-4 w-full"
          variant="outline"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isOffline && (
        <Alert className="bg-amber-50 border-amber-300">
          <WifiOff className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <strong>Offline Mode:</strong> Showing cached version. Will sync when online.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between py-3 border-b border-slate-200">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-700">
            Last updated: {lastUpdated}
          </p>
          <p className="text-xs text-slate-500">
            Source: GitHub Pages • Auto-synced
          </p>
        </div>
        <Button
          onClick={() => {
            console.log('[Privacy Policy Render] Manual refresh');
            refetch();
          }}
          variant="ghost"
          size="sm"
        >
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      <div className="prose prose-slate max-w-none prose-headings:text-emerald-700 prose-h1:text-2xl prose-h1:font-bold prose-h1:mb-4 prose-h2:text-xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-2 prose-p:text-slate-700 prose-p:leading-relaxed prose-p:my-3 prose-li:text-slate-700 prose-li:my-1 prose-strong:text-slate-900 prose-strong:font-semibold prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline">
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1 className="text-3xl font-bold text-emerald-700 mt-0 mb-6 pb-3 border-b-2 border-emerald-200">
                {children}
              </h1>
            ),
            h2: ({ children }) => {
              const text = String(children);
              const match = text.match(/^(\d+)\.\s+(.+)/);
              if (match) {
                const [, num, title] = match;
                return (
                  <h2 className="text-xl font-bold text-emerald-700 mt-8 mb-4 flex items-center gap-3">
                    <span className="bg-emerald-100 text-emerald-800 w-9 h-9 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0">
                      {num}
                    </span>
                    <span>{title}</span>
                  </h2>
                );
              }
              return (
                <h2 className="text-xl font-bold text-emerald-700 mt-8 mb-4">
                  {children}
                </h2>
              );
            },
            h3: ({ children }) => (
              <h3 className="text-lg font-semibold text-emerald-700 mt-6 mb-3">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-base font-semibold text-slate-800 mt-4 mb-2">
                {children}
              </h4>
            ),
            p: ({ children }) => (
              <p className="text-slate-700 leading-relaxed my-4">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-6 space-y-2 my-4 text-slate-700">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-6 space-y-2 my-4 text-slate-700">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-slate-700 leading-relaxed">
                {children}
              </li>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-slate-900">
                {children}
              </strong>
            ),
            em: ({ children }) => (
              <em className="italic text-slate-800">
                {children}
              </em>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
              >
                {children}
              </a>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-emerald-400 pl-4 py-2 my-4 bg-emerald-50/50 rounded-r italic">
                {children}
              </blockquote>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      <div className="text-xs text-slate-500 text-center pt-8 mt-8 border-t border-slate-200 space-y-2">
        <p className="font-medium">This Privacy Policy is automatically synchronized from GitHub Pages.</p>
        <p>Content is fetched, parsed, and rendered natively within the app.</p>
        <p className="pt-2">
          <a
            href="https://kayleers.github.io/clearledger-privacy/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:underline"
          >
            View source on GitHub Pages
          </a>
        </p>
      </div>
    </div>
  );
}
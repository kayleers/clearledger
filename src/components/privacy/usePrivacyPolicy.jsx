import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

const GITHUB_PRIVACY_URL = 'https://raw.githubusercontent.com/kayleers/clearledger-privacy/main/index.md';
const CACHE_KEY = 'clearledger_privacy_policy';
const VERSION_KEY = 'clearledger_privacy_version';

// Extract last updated date from markdown content
const extractLastUpdated = (content) => {
  const match = content.match(/Last updated:\s*([^\n]+)/i);
  return match ? match[1].trim() : null;
};

// Fetch privacy policy from GitHub
const fetchPrivacyPolicy = async () => {
  console.log('[Privacy Policy] === FETCH START ===');
  console.log('[Privacy Policy] Request URL:', GITHUB_PRIVACY_URL);
  console.log('[Privacy Policy] Timestamp:', new Date().toISOString());
  
  const response = await fetch(GITHUB_PRIVACY_URL, {
    cache: 'no-cache',
    headers: { 
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
  
  console.log('[Privacy Policy] HTTP Status:', response.status, response.statusText);
  console.log('[Privacy Policy] Content-Type:', response.headers.get('content-type'));
  console.log('[Privacy Policy] Content-Length:', response.headers.get('content-length'));
  
  if (!response.ok) {
    console.error('[Privacy Policy] ❌ HTTP Error:', response.status, response.statusText);
    console.error('[Privacy Policy] Response URL:', response.url);
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const content = await response.text();
  const contentSize = new Blob([content]).size;
  
  console.log('[Privacy Policy] Response body size:', contentSize, 'bytes');
  console.log('[Privacy Policy] Content length:', content.length, 'characters');
  console.log('[Privacy Policy] Content preview (first 200 chars):', content.substring(0, 200));
  
  if (!content || content.length === 0) {
    console.error('[Privacy Policy] ❌ Empty response body');
    throw new Error('GitHub returned empty content');
  }
  
  if (contentSize < 100) {
    console.warn('[Privacy Policy] ⚠️ Suspiciously small file size:', contentSize, 'bytes');
  }
  
  console.log('[Privacy Policy] ✓ Fetch success - Valid content received');
  
  const lastUpdated = extractLastUpdated(content);
  console.log('[Privacy Policy] Last updated date:', lastUpdated || 'Not found in content');
  console.log('[Privacy Policy] ✓ Parse success');
  console.log('[Privacy Policy] === FETCH COMPLETE ===');
  
  return { content, lastUpdated, fetchedAt: new Date().toISOString() };
};

// Get cached policy
const getCachedPolicy = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      console.log('[Privacy Policy] ✓ Cache read success');
      console.log('[Privacy Policy] Cached content length:', parsed.content?.length || 0);
      return parsed;
    }
    console.log('[Privacy Policy] No cache found');
    return null;
  } catch (error) {
    console.error('[Privacy Policy] Cache read failed:', error);
    return null;
  }
};

// Save policy to cache
const savePolicyToCache = (policy) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(policy));
    if (policy.lastUpdated) {
      localStorage.setItem(VERSION_KEY, policy.lastUpdated);
    }
    console.log('[Privacy Policy] ✓ Cache write success');
    console.log('[Privacy Policy] Cached content length:', policy.content?.length || 0);
  } catch (error) {
    console.error('[Privacy Policy] Cache write failed:', error);
  }
};

export const usePrivacyPolicy = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['privacy-policy'],
    queryFn: async () => {
      try {
        return await fetchPrivacyPolicy();
      } catch (error) {
        console.error('[Privacy Policy] Query function error:', error.message);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    retry: (failureCount, error) => {
      console.log('[Privacy Policy] Retry attempt:', failureCount, 'Error:', error.message);
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => {
      const delay = Math.min(1000 * 2 ** attemptIndex, 30000);
      console.log('[Privacy Policy] Retry delay:', delay, 'ms');
      return delay;
    },
    placeholderData: getCachedPolicy(),
  });

  // Save to cache when data is successfully fetched
  useEffect(() => {
    if (data && !isError) {
      savePolicyToCache(data);
    }
  }, [data, isError]);

  // Check for updates on window focus
  useEffect(() => {
    const handleFocus = () => {
      refetch();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch]);

  // Check for updates on online event
  useEffect(() => {
    const handleOnline = () => {
      refetch();
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refetch]);

  const cachedPolicy = getCachedPolicy();
  const isOffline = isError && cachedPolicy;
  
  const finalContent = data?.content || cachedPolicy?.content || '';
  const finalLastUpdated = data?.lastUpdated || cachedPolicy?.lastUpdated || 'Unknown';
  
  console.log('[Privacy Policy Hook] Current state:', {
    hasData: !!data,
    hasCachedPolicy: !!cachedPolicy,
    contentLength: finalContent.length,
    isLoading,
    isError,
    isOffline,
    errorMessage: error?.message
  });
  
  return {
    content: finalContent,
    lastUpdated: finalLastUpdated,
    isLoading: isLoading && !cachedPolicy,
    isError: isError && !cachedPolicy,
    isOffline,
    refetch,
    error
  };
};
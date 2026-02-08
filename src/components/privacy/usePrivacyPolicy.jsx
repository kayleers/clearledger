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
  console.log('[Privacy Policy] Fetching from GitHub RAW:', GITHUB_PRIVACY_URL);
  
  const response = await fetch(GITHUB_PRIVACY_URL, {
    cache: 'no-cache',
    headers: { 'Cache-Control': 'no-cache' }
  });
  
  if (!response.ok) {
    console.error('[Privacy Policy] Fetch failed:', response.status, response.statusText);
    throw new Error('Failed to fetch privacy policy');
  }
  
  const content = await response.text();
  console.log('[Privacy Policy] ✓ Fetch success');
  console.log('[Privacy Policy] Content length:', content.length, 'characters');
  console.log('[Privacy Policy] File size:', new Blob([content]).size, 'bytes');
  
  const lastUpdated = extractLastUpdated(content);
  console.log('[Privacy Policy] Last updated date:', lastUpdated || 'Not found');
  console.log('[Privacy Policy] ✓ Parse success');
  
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
    queryFn: fetchPrivacyPolicy,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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
  
  return {
    content: data?.content || cachedPolicy?.content || '',
    lastUpdated: data?.lastUpdated || cachedPolicy?.lastUpdated || 'Unknown',
    isLoading: isLoading && !cachedPolicy,
    isError: isError && !cachedPolicy,
    isOffline,
    refetch,
    error
  };
};
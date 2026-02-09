import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

// AUTHORITATIVE SOURCE: GitHub Pages HTML site
const GITHUB_PAGES_URL = 'https://kayleers.github.io/clearledger-privacy/';
const CACHE_KEY = 'clearledger_privacy_policy';
const VERSION_KEY = 'clearledger_privacy_version';

// Extract last updated date from content
const extractLastUpdated = (content) => {
  const patterns = [
    /Last updated:\s*([^\n]+)/i,
    /Effective Date:\s*([^\n]+)/i,
    /Last modified:\s*([^\n]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) return match[1].trim();
  }
  
  return null;
};

// Parse HTML DOM to extract structured readable content
const parseHTMLContent = (html) => {
  console.log('[Privacy Policy] === DOM PARSING START ===');
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  console.log('[Privacy Policy] ✓ DOM parsed successfully');
  
  // Remove unwanted elements
  doc.querySelectorAll('script, style, nav, header, footer, .nav, .footer, #nav, #header, #footer').forEach(el => el.remove());
  
  // Find main content container
  const mainContent = doc.querySelector('main') || 
                      doc.querySelector('article') || 
                      doc.querySelector('.content') ||
                      doc.querySelector('#content') ||
                      doc.body;
  
  if (!mainContent) {
    console.error('[Privacy Policy] ❌ No main content container found');
    throw new Error('Cannot find main content in HTML');
  }
  
  console.log('[Privacy Policy] Main content container:', mainContent.tagName);
  
  let markdown = '';
  
  // Process all child elements recursively
  const processNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        markdown += text + ' ';
      }
      return;
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    
    const tag = node.tagName.toLowerCase();
    
    switch (tag) {
      case 'h1':
        markdown += `\n\n# ${node.textContent.trim()}\n\n`;
        break;
      case 'h2':
        markdown += `\n\n## ${node.textContent.trim()}\n\n`;
        break;
      case 'h3':
        markdown += `\n\n### ${node.textContent.trim()}\n\n`;
        break;
      case 'h4':
        markdown += `\n\n#### ${node.textContent.trim()}\n\n`;
        break;
      case 'p':
        markdown += `\n\n${node.textContent.trim()}\n\n`;
        break;
      case 'ul':
      case 'ol':
        markdown += '\n\n';
        node.querySelectorAll('li').forEach(li => {
          markdown += `- ${li.textContent.trim()}\n`;
        });
        markdown += '\n';
        break;
      case 'br':
        markdown += '\n';
        break;
      case 'strong':
      case 'b':
        markdown += `**${node.textContent.trim()}**`;
        break;
      case 'em':
      case 'i':
        markdown += `*${node.textContent.trim()}*`;
        break;
      case 'a':
        const href = node.getAttribute('href');
        const text = node.textContent.trim();
        if (href && text) {
          markdown += `[${text}](${href})`;
        } else {
          markdown += text;
        }
        break;
      case 'div':
      case 'section':
      case 'article':
        // Recursively process children
        for (const child of node.childNodes) {
          processNode(child);
        }
        markdown += '\n';
        break;
      default:
        // For unknown tags, just extract text
        for (const child of node.childNodes) {
          processNode(child);
        }
    }
  };
  
  // Process all children
  for (const child of mainContent.childNodes) {
    processNode(child);
  }
  
  // Clean up markdown
  markdown = markdown
    .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
    .replace(/\s{2,}/g, ' ') // Remove excessive spaces
    .trim();
  
  console.log('[Privacy Policy] ✓ DOM parsing complete');
  console.log('[Privacy Policy] Extracted text length:', markdown.length, 'characters');
  console.log('[Privacy Policy] === DOM PARSING END ===');
  
  return markdown;
};

// Fetch privacy policy from GitHub Pages
const fetchPrivacyPolicy = async () => {
  console.log('[Privacy Policy] ═══════════════════════════════════');
  console.log('[Privacy Policy] FETCH START');
  console.log('[Privacy Policy] ═══════════════════════════════════');
  console.log('[Privacy Policy] Source: GitHub Pages HTML');
  console.log('[Privacy Policy] URL:', GITHUB_PAGES_URL);
  console.log('[Privacy Policy] Timestamp:', new Date().toISOString());
  
  const response = await fetch(GITHUB_PAGES_URL, {
    cache: 'no-cache',
    headers: { 
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
  
  console.log('[Privacy Policy] HTTP Status:', response.status, response.statusText);
  console.log('[Privacy Policy] Content-Type:', response.headers.get('content-type'));
  console.log('[Privacy Policy] Content-Length:', response.headers.get('content-length'), 'bytes');
  
  if (!response.ok) {
    console.error('[Privacy Policy] ❌ HTTP Error');
    console.error('[Privacy Policy] Status:', response.status);
    console.error('[Privacy Policy] Status Text:', response.statusText);
    console.error('[Privacy Policy] Response URL:', response.url);
    throw new Error(`HTTP ${response.status}: Failed to fetch from GitHub Pages`);
  }
  
  const html = await response.text();
  const htmlSize = new Blob([html]).size;
  
  console.log('[Privacy Policy] ✓ HTML fetch success');
  console.log('[Privacy Policy] HTML size:', htmlSize, 'bytes');
  console.log('[Privacy Policy] HTML length:', html.length, 'characters');
  console.log('[Privacy Policy] HTML preview (first 150 chars):', html.substring(0, 150).replace(/\n/g, ' '));
  
  if (!html || html.length === 0) {
    console.error('[Privacy Policy] ❌ Empty HTML response');
    throw new Error('GitHub Pages returned empty HTML');
  }
  
  if (htmlSize < 500) {
    console.warn('[Privacy Policy] ⚠️ Small file size - may be error page');
  }
  
  // Parse HTML to extract content
  const content = parseHTMLContent(html);
  
  if (!content || content.length === 0) {
    console.error('[Privacy Policy] ❌ HTML parsing produced empty content');
    throw new Error('Failed to extract readable content from HTML');
  }
  
  console.log('[Privacy Policy] ✓ Content extraction success');
  console.log('[Privacy Policy] Final content length:', content.length, 'characters');
  console.log('[Privacy Policy] Content preview (first 200 chars):', content.substring(0, 200));
  
  const lastUpdated = extractLastUpdated(content) || extractLastUpdated(html);
  console.log('[Privacy Policy] Last updated:', lastUpdated || 'Not found');
  
  console.log('[Privacy Policy] ═══════════════════════════════════');
  console.log('[Privacy Policy] FETCH COMPLETE ✓');
  console.log('[Privacy Policy] ═══════════════════════════════════');
  
  return { 
    content, 
    lastUpdated: lastUpdated || new Date().toLocaleDateString(), 
    fetchedAt: new Date().toISOString() 
  };
};

// Get cached policy
const getCachedPolicy = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      console.log('[Privacy Policy Cache] ✓ Read success');
      console.log('[Privacy Policy Cache] Content length:', parsed.content?.length || 0);
      return parsed;
    }
    console.log('[Privacy Policy Cache] No cache found');
    return null;
  } catch (error) {
    console.error('[Privacy Policy Cache] ❌ Read failed:', error);
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
    console.log('[Privacy Policy Cache] ✓ Write success');
    console.log('[Privacy Policy Cache] Content length:', policy.content?.length || 0);
  } catch (error) {
    console.error('[Privacy Policy Cache] ❌ Write failed:', error);
  }
};

export const usePrivacyPolicy = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['privacy-policy'],
    queryFn: fetchPrivacyPolicy,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    placeholderData: getCachedPolicy(),
  });

  // Save to cache when data is fetched
  useEffect(() => {
    if (data && !isError) {
      savePolicyToCache(data);
    }
  }, [data, isError]);

  // Refetch on window focus
  useEffect(() => {
    const handleFocus = () => {
      console.log('[Privacy Policy] Window focus - refetching...');
      refetch();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch]);

  // Refetch when coming online
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Privacy Policy] Network online - refetching...');
      refetch();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refetch]);

  const cachedPolicy = getCachedPolicy();
  const isOffline = isError && cachedPolicy;
  const finalContent = data?.content || cachedPolicy?.content || '';
  const finalLastUpdated = data?.lastUpdated || cachedPolicy?.lastUpdated || 'Unknown';
  
  console.log('[Privacy Policy Hook] State:', {
    hasData: !!data,
    hasCached: !!cachedPolicy,
    contentLength: finalContent.length,
    isLoading,
    isError,
    isOffline
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
import { isAndroid } from '@/components/platform/platformDetection';

/**
 * Production Android PDF export - compatible with Google Play builds
 * Uses native Android file sharing and storage APIs via Web Share
 * 
 * @param {Blob|ArrayBuffer} data - PDF data
 * @param {string} filename - Desired filename
 * @returns {Promise<void>}
 */
export const exportPDF = async (data, filename) => {
  console.log('[PDF Export] ═══════════════════════════════════');
  console.log('[PDF Export] START');
  console.log('[PDF Export] Filename:', filename);
  console.log('[PDF Export] Platform:', isAndroid() ? 'Android' : 'Web/Preview');
  console.log('[PDF Export] OS:', navigator.userAgent);
  
  // Convert data to Blob
  let blobData;
  if (data instanceof Blob) {
    blobData = data;
  } else if (data instanceof ArrayBuffer) {
    blobData = new Blob([data], { type: 'application/pdf' });
  } else {
    blobData = new Blob([data], { type: 'application/pdf' });
  }
  
  const fileSize = blobData.size;
  console.log('[PDF Export] File size:', fileSize, 'bytes', `(${(fileSize / 1024).toFixed(2)} KB)`);

  if (fileSize === 0) {
    console.error('[PDF Export] ❌ Empty PDF generated');
    throw new Error('PDF generation failed - file is empty');
  }

  // Android production environment
  if (isAndroid()) {
    console.log('[PDF Export] Android detected - using native file sharing');
    
    try {
      // Create File object (required for Web Share API)
      const file = new File([blobData], filename, { 
        type: 'application/pdf',
        lastModified: Date.now()
      });
      
      console.log('[PDF Export] File object created:', file.name, file.size, 'bytes');
      console.log('[PDF Export] File type:', file.type);
      
      // Check Web Share API support
      const hasShare = typeof navigator.share === 'function';
      const hasCanShare = typeof navigator.canShare === 'function';
      const canShareFiles = hasCanShare && navigator.canShare({ files: [file] });
      
      console.log('[PDF Export] Web Share API available:', hasShare);
      console.log('[PDF Export] Can share files:', canShareFiles);
      
      // Method 1: Web Share API (preferred for Android)
      if (hasShare && canShareFiles) {
        console.log('[PDF Export] Using Web Share API...');
        
        await navigator.share({
          files: [file],
          title: 'ClearLedger Export',
          text: `Financial report - ${filename}`
        });
        
        console.log('[PDF Export] ✓ Web Share API success');
        console.log('[PDF Export] User selected app for sharing/saving');
        console.log('[PDF Export] ═══════════════════════════════════');
        return;
      }
      
      // Method 2: Blob URL with download attribute (Android Download Manager)
      console.log('[PDF Export] Fallback: Using blob URL + download link');
      const url = window.URL.createObjectURL(blobData);
      console.log('[PDF Export] Blob URL created:', url.substring(0, 50) + '...');
      
      // Create temporary download link
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      
      console.log('[PDF Export] Triggering download...');
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        console.log('[PDF Export] ✓ Cleanup complete');
      }, 1000);
      
      console.log('[PDF Export] ✓ Download triggered - check Android Downloads folder');
      console.log('[PDF Export] ═══════════════════════════════════');
      
    } catch (error) {
      console.error('[PDF Export] ❌ Android export error:', error);
      console.error('[PDF Export] Error name:', error.name);
      console.error('[PDF Export] Error message:', error.message);
      
      // Method 3: Last resort - open in new tab
      console.log('[PDF Export] Fallback: Opening in new tab...');
      const url = window.URL.createObjectURL(blobData);
      const newTab = window.open(url, '_blank');
      
      if (!newTab) {
        console.error('[PDF Export] ❌ Popup blocked');
        alert('Please enable popups to download PDFs.\n\nGo to Settings > Site Settings > Popups and allow popups for this app.');
        throw new Error('Popup blocked - cannot download PDF');
      }
      
      console.log('[PDF Export] ✓ Opened in new tab');
      console.log('[PDF Export] User can save from browser controls');
      
      setTimeout(() => window.URL.revokeObjectURL(url), 30000);
      console.log('[PDF Export] ═══════════════════════════════════');
    }
  } else {
    // Web/Preview environment
    console.log('[PDF Export] Web/Preview mode - standard download');
    
    const url = window.URL.createObjectURL(blobData);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    
    console.log('[PDF Export] Triggering download...');
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      console.log('[PDF Export] ✓ Download complete');
    }, 100);
    
    console.log('[PDF Export] ═══════════════════════════════════');
  }
};

/**
 * Show platform-appropriate export success message
 */
export const showExportSuccess = (filename) => {
  console.log('[PDF Export] Showing success message for:', filename);
  
  if (isAndroid()) {
    const message = `✓ PDF Exported Successfully\n\n` +
      `File: ${filename}\n\n` +
      `Location:\n` +
      `• Check your Downloads folder\n` +
      `• Or the app you selected to save it\n\n` +
      `You can now:\n` +
      `• Open the file\n` +
      `• Share it\n` +
      `• Upload to cloud storage\n` +
      `• Email it`;
    
    alert(message);
  } else {
    console.log('[PDF Export] Web environment - no alert needed');
  }
};

/**
 * Show platform-appropriate export error message
 */
export const showExportError = (error) => {
  console.error('[PDF Export] ❌ Export failed:', error);
  
  const message = isAndroid() 
    ? `PDF export failed.\n\nError: ${error.message}\n\nPlease try again or contact support.`
    : `Export failed: ${error.message}`;
  
  alert(message);
};
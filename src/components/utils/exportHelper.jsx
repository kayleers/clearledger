import { isAndroid } from '@/components/platform/platformDetection';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

/**
 * Production Android PDF export using native filesystem APIs
 * Saves to public Downloads/ClearLedger/ folder and auto-opens
 * 
 * @param {Blob|ArrayBuffer} data - PDF data
 * @param {string} filename - Desired filename
 * @returns {Promise<{success: boolean, path?: string, uri?: string}>}
 */
export const exportPDF = async (data, filename) => {
  console.log('[PDF Export] ═══════════════════════════════════');
  console.log('[PDF Export] START');
  console.log('[PDF Export] Filename:', filename);
  console.log('[PDF Export] Platform:', isAndroid() ? 'Android' : 'Web/Preview');
  
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

  // Android native filesystem
  if (isAndroid() && window.Capacitor) {
    console.log('[PDF Export] Android Capacitor - using native filesystem');
    
    try {
      // Convert Blob to base64
      const base64Data = await blobToBase64(blobData);
      console.log('[PDF Export] Converted to base64:', base64Data.substring(0, 50) + '...');
      
      // Save to Downloads/ClearLedger/ directory
      const path = `Download/ClearLedger/${filename}`;
      console.log('[PDF Export] Saving to:', path);
      
      const result = await Filesystem.writeFile({
        path: path,
        data: base64Data,
        directory: Directory.External,
        recursive: true
      });
      
      console.log('[PDF Export] ✓ File saved successfully');
      console.log('[PDF Export] URI:', result.uri);
      
      // Auto-open the PDF
      try {
        console.log('[PDF Export] Opening PDF...');
        await FileOpener.open({
          filePath: result.uri,
          contentType: 'application/pdf',
          openWithDefault: true
        });
        console.log('[PDF Export] ✓ PDF opened');
      } catch (openError) {
        console.error('[PDF Export] ⚠ Failed to auto-open:', openError);
        // Continue - file is saved even if open fails
      }
      
      console.log('[PDF Export] ═══════════════════════════════════');
      return { success: true, path, uri: result.uri };
      
    } catch (error) {
      console.error('[PDF Export] ❌ Native filesystem error:', error);
      
      // Fallback to Web Share API
      try {
        console.log('[PDF Export] Fallback: Web Share API...');
        const file = new File([blobData], filename, { type: 'application/pdf' });
        
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'ClearLedger Export',
            text: `Financial report - ${filename}`
          });
          console.log('[PDF Export] ✓ Web Share success');
          return { success: true };
        }
      } catch (shareError) {
        console.error('[PDF Export] ❌ Web Share failed:', shareError);
      }
      
      throw error;
    }
  } else {
    // Web/Preview environment
    console.log('[PDF Export] Web mode - standard download');
    
    const url = window.URL.createObjectURL(blobData);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      console.log('[PDF Export] ✓ Download complete');
    }, 100);
    
    console.log('[PDF Export] ═══════════════════════════════════');
    return { success: true, path: `Downloads/${filename}` };
  }
};

/**
 * Convert Blob to base64 string
 */
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Show platform-appropriate export success message
 */
export const showExportSuccess = (filename, path = null, uri = null) => {
  console.log('[PDF Export] Showing success message for:', filename);
  
  if (isAndroid()) {
    const location = path || 'Download/ClearLedger/' + filename;
    const message = `✓ PDF Exported Successfully\n\n` +
      `File: ${filename}\n\n` +
      `Saved to:\n${location}\n\n` +
      `The PDF has been opened automatically.\n\n` +
      `You can find it in:\n` +
      `• Files app > Downloads > ClearLedger\n` +
      `• Any file manager app`;
    
    alert(message);
  } else {
    console.log('[PDF Export] Web environment - no alert needed');
  }
};

/**
 * Share PDF on Android
 */
export const sharePDF = async (uri, filename) => {
  if (!isAndroid() || !window.Capacitor) {
    console.log('[PDF Export] Share not available on web');
    return;
  }

  try {
    console.log('[PDF Export] Triggering share intent...');
    await FileOpener.open({
      filePath: uri,
      contentType: 'application/pdf',
      openWithDefault: false
    });
    console.log('[PDF Export] ✓ Share dialog opened');
  } catch (error) {
    console.error('[PDF Export] Share failed:', error);
    alert('Share failed. File is saved in Downloads/ClearLedger/');
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
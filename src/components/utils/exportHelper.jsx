import { isAndroid } from '@/components/platform/platformDetection';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

/**
 * GLOBAL PDF EXPORT SYSTEM
 * Handles ALL PDF exports across the entire application
 * Works on web and Android (Google Play build)
 * 
 * @param {Blob|ArrayBuffer} data - PDF data
 * @param {string} filename - Desired filename
 * @returns {Promise<{success: boolean, path?: string, uri?: string}>}
 */
export const exportPDF = async (data, filename) => {
  console.log('[PDF Export] ═══════════════════════════════════');
  console.log('[PDF Export] START - GLOBAL EXPORT SYSTEM');
  console.log('[PDF Export] Filename:', filename);
  console.log('[PDF Export] Platform:', isAndroid() ? 'Android' : 'Web');
  console.log('[PDF Export] Capacitor:', window.Capacitor ? 'Available' : 'Not Available');
  
  // Validate and normalize data
  let blobData;
  try {
    if (data instanceof Blob) {
      blobData = data;
    } else if (data instanceof ArrayBuffer) {
      blobData = new Blob([data], { type: 'application/pdf' });
    } else {
      blobData = new Blob([data], { type: 'application/pdf' });
    }
  } catch (error) {
    console.error('[PDF Export] ❌ Data conversion error:', error);
    throw new Error('Invalid PDF data format');
  }
  
  const fileSize = blobData.size;
  console.log('[PDF Export] File size:', fileSize, 'bytes', `(${(fileSize / 1024).toFixed(2)} KB)`);

  if (fileSize === 0) {
    console.error('[PDF Export] ❌ Empty PDF generated');
    throw new Error('PDF generation failed - file is empty');
  }

  // ==========================================
  // ANDROID NATIVE EXPORT
  // ==========================================
  if (isAndroid() && window.Capacitor) {
    console.log('[PDF Export] 📱 ANDROID NATIVE MODE');
    console.log('[PDF Export] Using Capacitor Filesystem API');
    
    try {
      // Convert Blob to base64
      console.log('[PDF Export] Converting to base64...');
      const base64Data = await blobToBase64(blobData);
      console.log('[PDF Export] ✓ Base64 conversion complete:', base64Data.substring(0, 30) + '...');
      
      // Save to public Downloads folder
      const path = `Download/ClearLedger/${filename}`;
      console.log('[PDF Export] Target path:', path);
      console.log('[PDF Export] Saving file...');
      
      const writeResult = await Filesystem.writeFile({
        path: path,
        data: base64Data,
        directory: Directory.External,
        recursive: true
      });
      
      console.log('[PDF Export] ✓✓✓ FILE SAVED SUCCESSFULLY ✓✓✓');
      console.log('[PDF Export] File URI:', writeResult.uri);
      console.log('[PDF Export] File path:', path);
      
      // Verify file was actually written
      try {
        const stat = await Filesystem.stat({
          path: path,
          directory: Directory.External
        });
        console.log('[PDF Export] ✓ File verified - Size:', stat.size, 'bytes');
      } catch (statError) {
        console.warn('[PDF Export] ⚠ Could not verify file:', statError);
      }
      
      // Auto-open the PDF
      console.log('[PDF Export] Attempting to open PDF...');
      try {
        await FileOpener.open({
          filePath: writeResult.uri,
          contentType: 'application/pdf',
          openWithDefault: true
        });
        console.log('[PDF Export] ✓ PDF opened automatically');
      } catch (openError) {
        console.error('[PDF Export] ⚠ Auto-open failed:', openError);
        console.log('[PDF Export] File is still saved and accessible');
      }
      
      console.log('[PDF Export] ═══════════════════════════════════');
      console.log('[PDF Export] ✓✓✓ ANDROID EXPORT COMPLETE ✓✓✓');
      return { 
        success: true, 
        path: `Downloads/ClearLedger/${filename}`, 
        uri: writeResult.uri 
      };
      
    } catch (filesystemError) {
      console.error('[PDF Export] ❌ Filesystem API failed:', filesystemError);
      console.error('[PDF Export] Error details:', {
        name: filesystemError.name,
        message: filesystemError.message,
        code: filesystemError.code
      });
      
      // Fallback to Web Share API
      console.log('[PDF Export] Attempting Web Share fallback...');
      try {
        const file = new File([blobData], filename, { 
          type: 'application/pdf',
          lastModified: Date.now()
        });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          console.log('[PDF Export] Web Share API available');
          await navigator.share({
            files: [file],
            title: 'ClearLedger Export',
            text: `Financial report - ${filename}`
          });
          console.log('[PDF Export] ✓ Web Share successful');
          return { success: true };
        } else {
          console.log('[PDF Export] Web Share not available');
        }
      } catch (shareError) {
        console.error('[PDF Export] ❌ Web Share failed:', shareError);
      }
      
      // Last resort: blob URL download
      console.log('[PDF Export] Last resort: blob URL download');
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
      }, 1000);
      
      console.log('[PDF Export] Blob URL download triggered');
      return { success: true, path: 'Downloads/' + filename };
    }
  } 
  
  // ==========================================
  // WEB BROWSER EXPORT
  // ==========================================
  else {
    console.log('[PDF Export] 🌐 WEB BROWSER MODE');
    console.log('[PDF Export] Standard download method');
    
    try {
      const url = window.URL.createObjectURL(blobData);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      console.log('[PDF Export] Download link created');
      
      a.click();
      console.log('[PDF Export] Download triggered');
      
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        console.log('[PDF Export] Cleanup complete');
      }, 100);
      
      console.log('[PDF Export] ═══════════════════════════════════');
      console.log('[PDF Export] ✓✓✓ WEB EXPORT COMPLETE ✓✓✓');
      return { success: true, path: `Downloads/${filename}` };
      
    } catch (webError) {
      console.error('[PDF Export] ❌ Web download failed:', webError);
      throw webError;
    }
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
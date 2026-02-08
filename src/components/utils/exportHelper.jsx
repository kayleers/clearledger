import { isAndroid } from '@/components/platform/platformDetection';

/**
 * Android-safe PDF export utility
 * Handles scoped storage restrictions on Android 10+ production builds
 * 
 * @param {Blob|ArrayBuffer} data - PDF data
 * @param {string} filename - Desired filename
 * @returns {Promise<void>}
 */
export const exportPDF = async (data, filename) => {
  // Convert data to Blob if needed
  let blobData;
  if (data instanceof Blob) {
    blobData = data;
  } else if (data instanceof ArrayBuffer) {
    blobData = new Blob([data], { type: 'application/pdf' });
  } else {
    blobData = new Blob([data], { type: 'application/pdf' });
  }

  // On Android production, use Web Share API to bypass scoped storage restrictions
  if (isAndroid()) {
    try {
      // Create a File object from the Blob (required for Web Share API)
      const file = new File([blobData], filename, { type: 'application/pdf' });
      
      // Check if Web Share API is available and supports files
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Export PDF',
          text: 'ClearLedger Export'
        });
        return;
      }
      
      // Fallback: Open blob URL in new tab (will trigger Android download manager)
      const url = window.URL.createObjectURL(blobData);
      const newWindow = window.open(url, '_blank');
      
      // If popup blocked, show instructions
      if (!newWindow) {
        alert('Please allow popups to download the PDF, or try again.');
      }
      
      // Clean up after delay
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      
    } catch (error) {
      console.error('Android export failed:', error);
      
      // Last resort: Create blob URL and show instructions
      const url = window.URL.createObjectURL(blobData);
      const message = `PDF ready! Tap to open:\n\nFile: ${filename}\n\nYou can then save or share it from your PDF viewer.`;
      
      if (confirm(message)) {
        window.open(url, '_blank');
      }
      
      setTimeout(() => window.URL.revokeObjectURL(url), 30000);
    }
  } else {
    // Web/preview: Use standard download approach
    const url = window.URL.createObjectURL(blobData);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }
};

/**
 * Show Android-appropriate success message
 */
export const showExportSuccess = (filename) => {
  if (isAndroid()) {
    alert(`PDF exported successfully!\n\nFile: ${filename}\n\nYou can find it in your Downloads folder or the app you selected to open/save it.`);
  }
};
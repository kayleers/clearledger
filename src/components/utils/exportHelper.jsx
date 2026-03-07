import { isAndroid } from '@/components/platform/platformDetection';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

/** Convert a Blob to a base64 string (data URL prefix stripped) */
const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

/** Normalise any PDF data to a Blob */
const toBlob = (data) => {
  if (data instanceof Blob) return data;
  return new Blob([data], { type: 'application/pdf' });
};

/**
 * Export a PDF on Android via Web Share API (share sheet).
 * Works inside Capacitor WebView without any FileProvider configuration.
 * Returns true on success.
 */
const shareOnAndroid = async (blobData, filename) => {
  const file = new File([blobData], filename, { type: 'application/pdf' });

  // navigator.share with files is supported in Capacitor WebView (Chrome engine)
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: filename,
    });
    return true;
  }
  return false;
};

/**
 * Export a PDF on Android by writing to the Cache directory and opening
 * with the default PDF viewer via FileOpener.
 * Cache dir is writable without permissions; FileOpener handles the URI.
 */
const saveAndOpenOnAndroid = async (blobData, filename) => {
  const base64 = await blobToBase64(blobData);

  const writeResult = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });

  console.log('[PDF Export] saved to cache:', writeResult.uri);

  await FileOpener.open({
    filePath: writeResult.uri,
    contentType: 'application/pdf',
    openWithDefault: true,
  });

  return writeResult.uri;
};

/**
 * GLOBAL PDF EXPORT
 *
 * Android (Capacitor / Google Play):
 *   1. Web Share API → native share sheet (save to Files, Drive, etc.)
 *   2. Fallback: write to Cache dir + open with default PDF viewer
 *
 * Web browser:
 *   Blob URL + hidden anchor download trigger
 *
 * No WRITE_EXTERNAL_STORAGE permission required.
 * Works inside Capacitor WebView without FileProvider manifest config.
 *
 * @param {Blob|ArrayBuffer|Uint8Array} data
 * @param {string} filename  e.g. "export.pdf"
 */
export const exportPDF = async (data, filename) => {
  const blobData = toBlob(data);

  console.log('[PDF Export] platform:', isAndroid() ? 'Android' : 'Web');
  console.log('[PDF Export] filename:', filename, '— size:', blobData.size, 'bytes');

  if (blobData.size === 0) {
    throw new Error('PDF generation produced an empty file.');
  }

  // ── ANDROID ──────────────────────────────────────────────────────────────
  if (isAndroid() && window.Capacitor) {
    // Strategy 1: Web Share API (most reliable inside Capacitor WebView)
    try {
      const shared = await shareOnAndroid(blobData, filename);
      if (shared) {
        console.log('[PDF Export] ✓ shared via Web Share API');
        return { success: true };
      }
    } catch (shareErr) {
      console.warn('[PDF Export] Web Share failed, trying filesystem:', shareErr);
    }

    // Strategy 2: Write to Cache dir + FileOpener
    try {
      const uri = await saveAndOpenOnAndroid(blobData, filename);
      console.log('[PDF Export] ✓ opened via FileOpener');
      return { success: true, uri };
    } catch (fsErr) {
      console.error('[PDF Export] Filesystem/FileOpener failed:', fsErr);
      throw new Error(
        `Could not export PDF on this device.\n\nDetails: ${fsErr.message}`
      );
    }
  }

  // ── WEB BROWSER ──────────────────────────────────────────────────────────
  const url = URL.createObjectURL(blobData);
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: filename,
    style: 'display:none',
  });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);

  console.log('[PDF Export] ✓ web download triggered');
  return { success: true };
};

/** Show a user-friendly success toast/alert (call after exportPDF resolves) */
export const showExportSuccess = () => {
  if (isAndroid()) {
    // Share sheet already gives visual feedback; no extra alert needed
    return;
  }
};

/** Show a user-friendly error message */
export const showExportError = (error) => {
  console.error('[PDF Export] error:', error);
  alert(`Export failed: ${error?.message || 'Unknown error'}. Please try again.`);
};
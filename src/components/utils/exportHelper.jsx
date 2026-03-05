import { isAndroid } from '@/components/platform/platformDetection';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

/**
 * Convert Blob to base64 string (strips the data URL prefix)
 */
const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

/**
 * Normalize input to a Blob
 */
const toBlob = (data) => {
  if (data instanceof Blob) return data;
  return new Blob([data], { type: 'application/pdf' });
};

/**
 * GLOBAL PDF EXPORT SYSTEM
 * Works on both web browsers and Android (Capacitor / Google Play build).
 *
 * Android strategy:
 *   1. Write to app-private Documents directory (no special permission needed on Android 10+)
 *   2. Open with the default PDF viewer via FileOpener
 *   3. If FileOpener fails, share via Web Share API
 *
 * Web strategy:
 *   1. Standard blob-URL <a download> trigger
 *
 * @param {Blob|ArrayBuffer|Uint8Array} data  PDF bytes
 * @param {string}                      filename  Desired file name (including .pdf)
 * @returns {Promise<{success: boolean, path?: string, uri?: string}>}
 */
export const exportPDF = async (data, filename) => {
  console.log('[PDF Export] ──────────────────────────────────────');
  console.log('[PDF Export] filename :', filename);
  console.log('[PDF Export] platform :', isAndroid() ? 'Android' : 'Web');

  const blobData = toBlob(data);
  console.log('[PDF Export] size     :', blobData.size, 'bytes');

  if (blobData.size === 0) {
    throw new Error('PDF generation produced an empty file.');
  }

  // ── ANDROID ──────────────────────────────────────────────────────────────
  if (isAndroid() && window.Capacitor) {
    // Use app-private Documents dir – always writable, no manifest permission
    // required on Android 10+ (scoped storage). FileOpener can still open it.
    const dir  = Directory.Documents;
    const path = `ClearLedger/${filename}`;

    try {
      const base64 = await blobToBase64(blobData);

      const writeResult = await Filesystem.writeFile({
        path,
        data: base64,
        directory: dir,
        recursive: true,
      });

      console.log('[PDF Export] ✓ saved to:', writeResult.uri);

      // Attempt to open automatically
      try {
        await FileOpener.open({
          filePath: writeResult.uri,
          contentType: 'application/pdf',
          openWithDefault: true,
        });
        console.log('[PDF Export] ✓ opened with default viewer');
      } catch (openErr) {
        console.warn('[PDF Export] ⚠ auto-open failed, trying share sheet:', openErr);

        // Fallback: share sheet (Android share intent)
        try {
          const file = new File([blobData], filename, { type: 'application/pdf' });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: 'ClearLedger Export' });
            console.log('[PDF Export] ✓ shared via Web Share API');
          }
        } catch (shareErr) {
          console.warn('[PDF Export] ⚠ share also failed:', shareErr);
          // File is still saved; alert will point user there
        }
      }

      console.log('[PDF Export] ✓ Android export complete');
      return { success: true, path, uri: writeResult.uri };

    } catch (err) {
      console.error('[PDF Export] ❌ Filesystem write failed:', err);

      // Last resort on Android: Web Share API directly from memory
      try {
        const file = new File([blobData], filename, { type: 'application/pdf' });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'ClearLedger Export' });
          return { success: true };
        }
      } catch (_) { /* ignore */ }

      throw err;
    }
  }

  // ── WEB BROWSER ──────────────────────────────────────────────────────────
  const url = URL.createObjectURL(blobData);
  const a   = Object.assign(document.createElement('a'), {
    href    : url,
    download: filename,
    style   : 'display:none',
  });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);

  console.log('[PDF Export] ✓ web download triggered');
  return { success: true, path: `Downloads/${filename}` };
};

/**
 * Show a platform-appropriate success message.
 * On Android, tells the user where to find the file.
 */
export const showExportSuccess = (filename, path = null, uri = null) => {
  if (isAndroid()) {
    alert(
      `✓ PDF exported successfully!\n\n` +
      `File: ${filename}\n\n` +
      `The PDF has been opened automatically.\n` +
      `You can also find it in:\n` +
      `  Files app › ClearLedger folder`
    );
  }
  // On web, no alert needed – the browser download is self-explanatory.
};

/**
 * Share an already-saved PDF on Android.
 */
export const sharePDF = async (uri, filename) => {
  if (!isAndroid() || !window.Capacitor) return;

  try {
    await FileOpener.open({
      filePath       : uri,
      contentType    : 'application/pdf',
      openWithDefault: false,        // shows chooser instead of default app
    });
  } catch (err) {
    console.error('[PDF Export] share failed:', err);
    alert('Could not open share sheet. The file is saved in your ClearLedger folder.');
  }
};

/**
 * Show a platform-appropriate error message.
 */
export const showExportError = (error) => {
  console.error('[PDF Export] export failed:', error);
  alert(
    isAndroid()
      ? `Export failed: ${error.message}\n\nPlease try again.`
      : `Export failed: ${error.message}`
  );
};
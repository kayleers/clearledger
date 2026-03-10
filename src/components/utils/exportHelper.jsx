/**
 * GLOBAL PDF EXPORT
 * - Web: Blob URL + hidden anchor (standard download)
 * - Android/iOS WebView (Capacitor): base64 data URI opened via window.open()
 *
 * @param {Blob|ArrayBuffer} data  — PDF data
 * @param {string} filename        — e.g. "export.pdf"
 */
export const exportPDF = async (data, filename) => {
  const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' });

  if (blob.size === 0) {
    throw new Error('PDF generation produced an empty file.');
  }

  // Capacitor WebView (Android / iOS): blob URLs are blocked, use base64 data URI
  if (window.Capacitor) {
    const base64 = await blobToBase64(blob);
    // Open the data URI — Android WebView will prompt to open/save via the OS
    window.open(base64, '_system');
    return;
  }

  // Standard web: blob URL + programmatic click
  const url = window.URL.createObjectURL(blob);
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
};

/** Convert a Blob to a base64 data URI string */
const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
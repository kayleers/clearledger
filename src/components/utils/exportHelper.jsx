/**
 * GLOBAL PDF EXPORT
 * Blob URL + hidden anchor — works on web and inside Capacitor WebView.
 *
 * @param {Blob} data      — Blob produced by jsPDF or similar
 * @param {string} filename — e.g. "export.pdf"
 */
export const exportPDF = async (data, filename) => {
  const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' });

  if (blob.size === 0) {
    throw new Error('PDF generation produced an empty file.');
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';

  document.body.appendChild(a);
  a.click();

  // Delay revoke so Android WebView has time to start the download
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 1000);
};
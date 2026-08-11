'use client';

import { FormEvent, useState } from 'react';
import { Download, FileText, Loader2, Printer, Search } from 'lucide-react';
import { jsPDF } from 'jspdf';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useTheme } from '@/contexts/ThemeContext';
import batchService, { Batch } from '@/services/batchService';
import barcodeTrackingService from '@/services/barcodeTrackingService';

let jsBarcodeLoader: Promise<void> | null = null;

async function ensureJsBarcode() {
  if (typeof window === 'undefined') throw new Error('Barcode rendering is only available in the browser');
  if ((window as any).JsBarcode) return;
  if (jsBarcodeLoader) return jsBarcodeLoader;

  jsBarcodeLoader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-deshio-jsbarcode="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load barcode renderer')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
    script.async = true;
    script.dataset.deshioJsbarcode = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load barcode renderer'));
    document.head.appendChild(script);
  }).catch((error) => {
    jsBarcodeLoader = null;
    throw error;
  });

  return jsBarcodeLoader;
}

async function renderBarcodePng(code: string): Promise<string> {
  await ensureJsBarcode();
  const JsBarcode = (window as any).JsBarcode;
  if (!JsBarcode) throw new Error('Barcode renderer is unavailable');

  const canvas = document.createElement('canvas');
  JsBarcode(canvas, code, {
    format: 'CODE128',
    width: 2,
    height: 72,
    displayValue: false,
    margin: 4,
    background: '#ffffff',
    lineColor: '#000000',
  });
  return canvas.toDataURL('image/png');
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeFileName(value: string) {
  return String(value || 'batch').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'batch';
}

export default function BatchBarcodePrintPage() {
  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [barcodes, setBarcodes] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [rendering, setRendering] = useState<'print' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectBatch = async (batch: Batch) => {
    setSelectedBatch(batch);
    setBarcodes([]);
    setError(null);
    setLoadingBatch(true);

    try {
      const response = await barcodeTrackingService.getBatchBarcodes(batch.id);
      const unique = Array.from(
        new Set((response.data?.barcodes || []).map((item) => String(item.barcode || '').trim()).filter(Boolean))
      );
      setBarcodes(unique);
      if (unique.length === 0) {
        setError('This batch was found, but no barcodes are linked to it.');
      }
    } catch (err: any) {
      console.error('Failed to load batch barcodes:', err);
      setError(err?.message || 'Failed to load barcodes for this batch');
    } finally {
      setLoadingBatch(false);
    }
  };

  const handleSearch = async (event?: FormEvent) => {
    event?.preventDefault();
    const term = query.trim();
    if (!term) {
      setError('Enter a batch number to search.');
      return;
    }

    setSearching(true);
    setError(null);
    setResults([]);
    setSelectedBatch(null);
    setBarcodes([]);

    try {
      const matches = await batchService.getBatchesAll(
        { search: term, sort_by: 'created_at', sort_order: 'desc', per_page: 100 },
        { max_items: 500, max_pages: 5 }
      );

      const exact = matches.filter(
        (batch) => String(batch.batch_number || '').trim().toLowerCase() === term.toLowerCase()
      );
      const ordered = exact.length
        ? [...exact, ...matches.filter((batch) => !exact.some((item) => item.id === batch.id))]
        : matches;

      setResults(ordered);

      if (exact.length === 1) {
        await selectBatch(exact[0]);
      } else if (ordered.length === 0) {
        setError(`No batch found for “${term}”.`);
      }
    } catch (err: any) {
      console.error('Batch search failed:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to search batches');
    } finally {
      setSearching(false);
    }
  };

  const assertPrintable = () => {
    if (!selectedBatch) throw new Error('Select a batch first.');
    if (!barcodes.length) throw new Error('This batch has no barcodes to print.');
    return selectedBatch;
  };

  const renderAllBarcodeImages = async () => {
    const output: Array<{ code: string; dataUrl: string }> = [];
    for (const code of barcodes) {
      // Sequential rendering avoids creating hundreds of canvases at once on lower-end mobiles.
      // eslint-disable-next-line no-await-in-loop
      output.push({ code, dataUrl: await renderBarcodePng(code) });
    }
    return output;
  };

  const handlePrint = async () => {
    let printWindow: Window | null = null;
    try {
      const batch = assertPrintable();
      printWindow = window.open('', '_blank');
      if (!printWindow) throw new Error('Print window was blocked. Allow popups for this site and try again.');

      setRendering('print');
      setError(null);
      printWindow.document.write('<p style="font-family:Arial;padding:24px">Preparing barcode sheet…</p>');

      const rendered = await renderAllBarcodeImages();
      const productName = batch.product?.name || 'Unknown Product';
      const storeName = batch.store?.name || 'Unknown Store';

      const labels = rendered
        .map(
          ({ code, dataUrl }) => `
            <div class="barcode-card">
              <img src="${dataUrl}" alt="${escapeHtml(code)}" />
              <div class="barcode-number">${escapeHtml(code)}</div>
            </div>`
        )
        .join('');

      printWindow.document.open();
      printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Batch ${escapeHtml(batch.batch_number)} Barcodes</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #000; background: #fff; font-family: Arial, sans-serif; }
    .header { border-bottom: 1px solid #bbb; padding-bottom: 4mm; margin-bottom: 5mm; }
    .header h1 { margin: 0 0 2mm; font-size: 16pt; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5mm 8mm; font-size: 9.5pt; }
    .meta strong { font-weight: 700; }
    .barcode-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4mm 3mm; align-items: start; }
    .barcode-card { height: 30mm; border: 0.25mm solid #cfcfcf; border-radius: 1.5mm; padding: 2.5mm 2mm; display: flex; flex-direction: column; align-items: center; justify-content: center; break-inside: avoid; page-break-inside: avoid; overflow: hidden; }
    .barcode-card img { width: 100%; height: 18mm; object-fit: contain; display: block; }
    .barcode-number { margin-top: 1.5mm; max-width: 100%; text-align: center; font-family: "Courier New", monospace; font-weight: 700; font-size: 9pt; overflow-wrap: anywhere; }
    @media print { .barcode-card { break-inside: avoid; page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(productName)}</h1>
    <div class="meta">
      <div><strong>Store:</strong> ${escapeHtml(storeName)}</div>
      <div><strong>Batch ID:</strong> #${batch.id}</div>
      <div><strong>Batch Number:</strong> ${escapeHtml(batch.batch_number)}</div>
      <div><strong>Total Barcodes:</strong> ${rendered.length}</div>
    </div>
  </div>
  <div class="barcode-grid">${labels}</div>
  <script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 150); });<\/script>
</body>
</html>`);
      printWindow.document.close();
    } catch (err: any) {
      printWindow?.close();
      setError(err?.message || 'Failed to prepare print sheet');
    } finally {
      setRendering(null);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const batch = assertPrintable();
      setRendering('pdf');
      setError(null);
      await ensureJsBarcode();

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const marginX = 10;
      const contentWidth = pageWidth - marginX * 2;
      const columns = 3;
      const gapX = 3;
      const cardWidth = (contentWidth - gapX * (columns - 1)) / columns;
      const cardHeight = 30;
      const gapY = 3;
      const startY = 31;
      const bottomY = 287;
      const rowsPerPage = Math.max(1, Math.floor((bottomY - startY + gapY) / (cardHeight + gapY)));
      const perPage = rowsPerPage * columns;
      const productName = batch.product?.name || 'Unknown Product';
      const storeName = batch.store?.name || 'Unknown Store';

      const drawHeader = () => {
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        const productLines = doc.splitTextToSize(productName, 190);
        doc.text(productLines.slice(0, 2), marginX, 12);

        const metaY = productLines.length > 1 ? 22 : 18;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(`Store: ${storeName}`, marginX, metaY);
        doc.text(`Batch ID: #${batch.id}`, 108, metaY);
        doc.text(`Batch Number: ${batch.batch_number}`, marginX, metaY + 5);
        doc.text(`Total Barcodes: ${barcodes.length}`, 108, metaY + 5);
        doc.setDrawColor(180);
        doc.line(marginX, 29, 200, 29);
      };

      drawHeader();

      for (let index = 0; index < barcodes.length; index += 1) {
        if (index > 0 && index % perPage === 0) {
          doc.addPage();
          drawHeader();
        }

        const pageIndex = index % perPage;
        const column = pageIndex % columns;
        const row = Math.floor(pageIndex / columns);
        const x = marginX + column * (cardWidth + gapX);
        const y = startY + row * (cardHeight + gapY);
        const code = barcodes[index];

        // eslint-disable-next-line no-await-in-loop
        const png = await renderBarcodePng(code);
        doc.setDrawColor(205);
        doc.roundedRect(x, y, cardWidth, cardHeight, 1.5, 1.5, 'S');
        doc.addImage(png, 'PNG', x + 2.5, y + 2.5, cardWidth - 5, 18);

        let fontSize = 8;
        doc.setFont('courier', 'bold');
        doc.setFontSize(fontSize);
        while (fontSize > 5 && doc.getTextWidth(code) > cardWidth - 5) {
          fontSize -= 0.5;
          doc.setFontSize(fontSize);
        }
        doc.text(code, x + cardWidth / 2, y + 25, { align: 'center' });
      }

      doc.save(`batch_${safeFileName(batch.batch_number)}_barcodes.pdf`);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate PDF');
    } finally {
      setRendering(null);
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            toggleSidebar={() => setSidebarOpen((open) => !open)}
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Batch Barcode Print</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Search a batch number, review its linked barcodes, then print or download an A4 three-column barcode sheet.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-5">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Enter batch number..."
                      autoComplete="off"
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searching || !query.trim()}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Search Batch
                  </button>
                </form>

                {error && (
                  <div className="mt-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                )}

                {results.length > 0 && (
                  <div className="mt-5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                      Search results ({results.length})
                    </div>
                    <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                      {results.map((batch) => (
                        <button
                          key={batch.id}
                          type="button"
                          onClick={() => selectBatch(batch)}
                          className={`w-full text-left px-4 py-3 transition-colors ${
                            selectedBatch?.id === batch.id
                              ? 'bg-blue-50 dark:bg-blue-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-4">
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900 dark:text-white">{batch.batch_number}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{batch.product?.name || 'Unknown Product'}</div>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 md:text-right">
                              <div>{batch.store?.name || 'Unknown Store'}</div>
                              <div>Batch ID #{batch.id}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedBatch && (
                <div className="mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                        <FileText className="w-5 h-5" />
                        <h2 className="text-lg font-semibold">{selectedBatch.product?.name || 'Unknown Product'}</h2>
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
                        <div><span className="font-medium">Store:</span> {selectedBatch.store?.name || 'Unknown Store'}</div>
                        <div><span className="font-medium">Batch ID:</span> #{selectedBatch.id}</div>
                        <div><span className="font-medium">Batch Number:</span> {selectedBatch.batch_number}</div>
                        <div><span className="font-medium">Barcodes:</span> {loadingBatch ? 'Loading…' : barcodes.length}</div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={handlePrint}
                        disabled={loadingBatch || rendering !== null || barcodes.length === 0}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {rendering === 'print' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        Print A4
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={loadingBatch || rendering !== null || barcodes.length === 0}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {rendering === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Download PDF
                      </button>
                    </div>
                  </div>

                  <div className="p-5">
                    {loadingBatch ? (
                      <div className="py-12 flex items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading batch barcodes…
                      </div>
                    ) : barcodes.length > 0 ? (
                      <>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          A4 output uses three columns. The list below is a lightweight preview of the barcode numbers; print/PDF renders the actual CODE128 graphics with the number underneath.
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {barcodes.map((barcode, index) => (
                            <div
                              key={barcode}
                              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 flex items-center gap-3 min-w-0"
                            >
                              <span className="text-xs text-gray-400 w-7 flex-shrink-0">{index + 1}.</span>
                              <span className="font-mono text-sm text-gray-900 dark:text-white break-all">{barcode}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">No barcodes to display.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Barcode as BarcodeIcon, CheckCircle2, History, Loader2, Package, Printer, RefreshCw, ShieldCheck } from 'lucide-react';
import Barcode from 'react-barcode';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import barcodeService from '@/services/barcodeService';
import barcodeRelabelService, { ReplacementBarcodeResult } from '@/services/barcodeRelabelService';
import {
  DEFAULT_DPI as LABEL_DPI,
  LABEL_HEIGHT_MM,
  LABEL_WIDTH_MM,
  mmToIn,
  renderBarcodeLabelBase64,
} from '@/lib/barcodeLabelRenderer';

type RelabelRow = any;

const reasonOptions = [
  { value: 'lost_sticker', label: 'Lost sticker' },
  { value: 'damaged_sticker', label: 'Damaged sticker' },
  { value: 'unreadable_barcode', label: 'Unreadable barcode' },
  { value: 'manual_recovery', label: 'Manual recovery' },
];

function getErrorMessage(error: any) {
  return error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Something went wrong';
}

export default function BarcodeRelabelPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lookupBarcode, setLookupBarcode] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [batchId, setBatchId] = useState('');
  const [productId, setProductId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [customBarcode, setCustomBarcode] = useState('');
  const [relabelQuantity, setRelabelQuantity] = useState('1');
  const [reason, setReason] = useState('lost_sticker');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [generated, setGenerated] = useState<ReplacementBarcodeResult[]>([]);
  const [history, setHistory] = useState<RelabelRow[]>([]);

  const canCreate = useMemo(() => {
    const quantity = Number(relabelQuantity);
    return batchNumber.trim().length > 0 && Number.isInteger(quantity) && quantity >= 1 && !isCreating;
  }, [batchNumber, relabelQuantity, isCreating]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await barcodeRelabelService.listRelabels({ per_page: 10 });
      setHistory(response.data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleLookup = async () => {
    if (!lookupBarcode.trim()) return;
    setError(null);
    setMessage(null);
    setIsLookingUp(true);
    try {
      const response = await barcodeService.scanBarcode(lookupBarcode.trim());
      const data: any = response.data;
      if (data?.product?.id) setProductId(String(data.product.id));
      if (data?.current_batch?.id) setBatchId(String(data.current_batch.id));
      if (data?.current_batch?.batch_number) setBatchNumber(data.current_batch.batch_number);
      if (data?.current_location?.id) setStoreId(String(data.current_location.id));
      setMessage('Product, batch, and store were filled from the scanned barcode. Stock was not changed.');
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleCreate = async () => {
    setError(null);
    setMessage(null);
    setGenerated([]);

    if (!batchNumber.trim()) {
      setError('Batch Number is required. Scan any barcode from the same batch or enter the batch number manually.');
      return;
    }

    const quantity = Number(relabelQuantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      setError('Number of relabelled barcodes must be a whole number of 1 or more.');
      return;
    }

    setIsCreating(true);
    try {
      const response = await barcodeRelabelService.createRelabel({
        batch_id: batchId ? Number(batchId) : undefined,
        batch_number: batchNumber.trim(),
        product_id: productId ? Number(productId) : undefined,
        store_id: storeId ? Number(storeId) : undefined,
        barcode: customBarcode.trim() || undefined,
        quantity,
        reason,
        notes: notes.trim() || undefined,
        type: 'CODE128',
      });

      const created = response.data.replacement_barcodes?.length
        ? response.data.replacement_barcodes
        : response.data.replacement_barcode
          ? [response.data.replacement_barcode]
          : [];

      setGenerated(created);
      setMessage(response.message || `${created.length} replacement barcode(s) generated. Stock quantity was not increased.`);
      setCustomBarcode('');
      setNotes('');
      await loadHistory();
    } catch (err: any) {
      const data = err?.response?.data;
      const firstValidationError = data?.errors ? Object.values(data.errors)?.flat()?.[0] : null;
      setError(String(firstValidationError || getErrorMessage(err)));
    } finally {
      setIsCreating(false);
    }
  };

  const printLabels = async () => {
    if (generated.length === 0 || isPrinting) return;

    setError(null);
    setIsPrinting(true);

    try {
      const qz = (window as any)?.qz;
      if (!qz) throw new Error('QZ Tray not available. Please start QZ Tray and refresh.');

      if (!(await qz.websocket.isActive())) {
        await qz.websocket.connect();
      }

      let printer: string | null = null;
      try {
        const defaultPrinter = await qz.printers.getDefault();
        if (defaultPrinter && String(defaultPrinter).trim()) printer = String(defaultPrinter);
      } catch (_err) { }

      if (!printer) {
        try {
          const printers = await qz.printers.find();
          if (Array.isArray(printers) && printers.length && printers[0]) printer = String(printers[0]);
          else if (typeof printers === 'string' && printers.trim()) printer = printers;
        } catch (_err) { }
      }

      if (!printer) {
        try {
          const details = await qz.printers.details?.();
          if (Array.isArray(details) && details.length > 0) {
            const name = details[0]?.name || details[0];
            if (name) printer = String(name);
          }
        } catch (_err) { }
      }

      if (!printer) throw new Error('No printer found. Set a default printer and try again.');

      const data: any[] = [];
      for (const generatedBarcode of generated) {
        const price = Number((generatedBarcode as any).sell_price ?? (generatedBarcode as any).price ?? 0);
        const base64 = await renderBarcodeLabelBase64({
          code: generatedBarcode.barcode,
          productName: (generatedBarcode.product_name || 'Product').trim(),
          price: Number.isFinite(price) ? price : 0,
          dpi: LABEL_DPI,
          brandName: 'Deshio',
        });

        data.push({ type: 'pixel', format: 'image', flavor: 'base64', data: base64 });
      }

      const config = qz.configs.create(printer, {
        units: 'in',
        size: { width: mmToIn(LABEL_WIDTH_MM), height: mmToIn(LABEL_HEIGHT_MM) },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        density: LABEL_DPI,
        colorType: 'blackwhite',
        interpolation: 'nearest-neighbor',
        scaleContent: false,
      });

      await qz.print(config, data);
      setMessage(`${generated.length} replacement barcode(s) sent to printer.`);
    } catch (err: any) {
      console.error('Replacement barcode print failed:', err);
      if (err?.message?.includes('Unable to establish connection')) {
        setError('QZ Tray is not running. Please start QZ Tray and try again.');
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-slate-50 dark:bg-gray-950">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header darkMode={darkMode} setDarkMode={setDarkMode} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
            <ShieldCheck className="w-4 h-4" /> Lost Sticker Recovery
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Temporary Barcode Relabeling</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl">
            Generate any number of floating scan aliases while this batch still has physical stock. Alias count is independent from physical quantity and never increases stock. When the batch reaches zero, every unused original/relabel identity left in that batch is automatically retired.
          </p>
        </div>

        {(message || error) && (
          <div className={`rounded-2xl border p-4 flex items-start gap-3 ${error ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-200' : 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-900 dark:text-green-200'}`}>
            {error ? <AlertCircle className="w-5 h-5 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 mt-0.5" />}
            <div className="text-sm">{error || message}</div>
          </div>
        )}

        <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-5 space-y-5">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <BarcodeIcon className="w-5 h-5" /> Create replacement barcode(s)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Scan any barcode from the same product/batch to auto-fill details, or enter the batch manually.
              </p>
            </div>

            <div className="grid md:grid-cols-[1fr_auto] gap-3">
              <input
                value={lookupBarcode}
                onChange={(e) => setLookupBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                placeholder="Scan any existing barcode from same batch..."
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleLookup}
                disabled={isLookingUp || !lookupBarcode.trim()}
                className="rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Lookup
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Product ID</span>
                <input value={productId} onChange={(e) => { setProductId(e.target.value); setBatchId(''); }} placeholder="Optional" className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Batch Number *</span>
                <input value={batchNumber} onChange={(e) => { setBatchNumber(e.target.value); setBatchId(''); }} placeholder="Required" className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Store ID</span>
                <input value={storeId} onChange={(e) => { setStoreId(e.target.value); setBatchId(''); }} placeholder="Optional" className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm" />
              </label>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Temporary barcode</span>
                <input value={customBarcode} onChange={(e) => setCustomBarcode(e.target.value)} placeholder="Optional; first label only in bulk" className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Number of relabelled barcodes *</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={relabelQuantity}
                  onChange={(e) => setRelabelQuantity(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Reason</span>
                <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm">
                  {reasonOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Notes</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Example: print extra scan aliases for this batch; physical stock must remain unchanged" rows={3} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm" />
            </label>

            <button
              onClick={handleCreate}
              disabled={!canCreate}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarcodeIcon className="w-4 h-4" />}
              {Number(relabelQuantity) > 1 ? `Generate ${relabelQuantity} Replacement Barcodes` : 'Generate Replacement Barcode'}
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5" /> Generated label(s)
              </h2>
              {generated.length > 0 ? (
                <div className="mt-4 space-y-4">
                  <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1">
                    {generated.map((generatedBarcode, index) => (
                      <div key={generatedBarcode.id || generatedBarcode.barcode} className="rounded-2xl border border-dashed border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 p-5 text-center">
                        <p className="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-300 font-bold">Replacement Barcode {generated.length > 1 ? `${index + 1}/${generated.length}` : ''}</p>
                        <p className="text-3xl font-black text-gray-900 dark:text-white mt-2 tracking-widest break-all">{generatedBarcode.barcode}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{generatedBarcode.product_name || 'Product'} {generatedBarcode.batch_number ? `• ${generatedBarcode.batch_number}` : ''}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Stock after relabel: {generatedBarcode.batch_quantity_after_relabel ?? 'unchanged'}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={printLabels}
                    disabled={isPrinting}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-5 py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                  >
                    {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                    {isPrinting ? 'Printing...' : generated.length > 1 ? `Print All ${generated.length} Temporary Labels` : 'Print Temporary Label'}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">No replacement barcode generated yet.</p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5" /> Recent relabels
                </h2>
                <button onClick={loadHistory} className="text-xs font-semibold text-blue-600 dark:text-blue-300">Refresh</button>
              </div>
              <div className="mt-4 space-y-3">
                {isLoadingHistory && <p className="text-sm text-gray-500">Loading...</p>}
                {!isLoadingHistory && history.length === 0 && <p className="text-sm text-gray-500">No relabel records found.</p>}
                {history.map((row) => (
                  <div key={row.id} className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{row.replacement_barcode?.barcode || row.replacementBarcode?.barcode || 'N/A'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{row.product?.name || 'Product'} • {row.batch?.batch_number || 'Batch'}</p>
                      </div>
                      <span className="text-xs rounded-full px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize">{row.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

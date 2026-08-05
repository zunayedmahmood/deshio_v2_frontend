import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus, Trash2, RefreshCw, Scan, RotateCcw, AlertTriangle } from 'lucide-react';
import { Store } from '@/services/storeService';
import batchService from '@/services/batchService';
import barcodeService from '@/services/barcodeService';
import { toast } from 'react-hot-toast';

interface DispatchItem {
  batch_id: string;
  batch_number: string;
  product_name: string;
  quantity: string;
  available_quantity: number;
  manual_quantity?: number;
  scanned_quantity?: number;
}

interface CreateDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<boolean>;
  stores: Store[];
  loading: boolean;
  defaultSourceStoreId?: number;
}

type AddMode = 'batch' | 'barcode';

type ScanEntry = {
  barcode: string;
  batch_id: string;
  batch_number: string;
  product_name: string;
  scanned_at: string;
};

const EMPTY_FORM = {
  source_store_id: '',
  destination_store_id: '',
  expected_delivery_date: '',
  carrier_name: '',
  tracking_number: '',
  notes: '',
};

const DRAFT_VERSION = 2;

const normalizeDraftItem = (item: DispatchItem): DispatchItem => {
  const quantity = Math.max(0, Number.parseInt(String(item.quantity || '0'), 10) || 0);
  const scannedQuantity = Math.min(
    quantity,
    Math.max(0, Number(item.scanned_quantity ?? 0) || 0),
  );
  const manualQuantity = Math.max(
    0,
    Number(item.manual_quantity ?? quantity - scannedQuantity) || 0,
  );

  return {
    ...item,
    quantity: String(manualQuantity + scannedQuantity),
    manual_quantity: manualQuantity,
    scanned_quantity: scannedQuantity,
  };
};

const CreateDispatchModal: React.FC<CreateDispatchModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  stores,
  loading,
  defaultSourceStoreId,
}) => {
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [items, setItems] = useState<DispatchItem[]>([]);
  const itemsRef = useRef<DispatchItem[]>([]);

  // Only for UI convenience while creating dispatch (does NOT replace send/receive scan flow).
  const [addMode, setAddMode] = useState<AddMode>('batch');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanEntry[]>([]);
  const scanInputRef = useRef<HTMLInputElement | null>(null);

  // IMPORTANT: hardware barcode scanners often "type" the next barcode instantly.
  // If we lock the input while an API call is in-flight, subsequent scans are lost.
  // So we keep a small in-memory queue and process scans sequentially.
  const scanQueueRef = useRef<string[]>([]);
  const scanQueueSetRef = useRef<Set<string>>(new Set());
  const scanQueueProcessingRef = useRef(false);
  const [queuedScanCount, setQueuedScanCount] = useState(0);

  const scannedSet = useMemo(() => {
    const s = new Set<string>();
    for (const it of scanHistory) s.add(it.barcode);
    return s;
  }, [scanHistory]);
  const [currentItem, setCurrentItem] = useState({
    batch_id: '',
    quantity: '',
  });
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchData, setBatchData] = useState<any>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const draftStorageKey = useMemo(
    () => `deshio.dispatch.create-draft.v${DRAFT_VERSION}.${defaultSourceStoreId || 'any-store'}`,
    [defaultSourceStoreId],
  );

  const resetScanQueue = () => {
    scanQueueRef.current = [];
    scanQueueSetRef.current = new Set();
    scanQueueProcessingRef.current = false;
    setQueuedScanCount(0);
    setScanning(false);
  };

  const resetDraftState = () => {
    setFormData({
      ...EMPTY_FORM,
      source_store_id: defaultSourceStoreId ? String(defaultSourceStoreId) : '',
    });
    setItems([]);
    setCurrentItem({ batch_id: '', quantity: '' });
    setBatchData(null);
    setAvailableBatches([]);
    setAddMode('batch');
    setScanInput('');
    setScanError(null);
    setScanHistory([]);
    setDraftSavedAt(null);
    setIsSubmitting(false);
    resetScanQueue();
  };

  const deleteStoredDraft = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(draftStorageKey);
    }
    setDraftSavedAt(null);
  };

  const persistCurrentDraft = () => {
    if (typeof window === 'undefined') return;

    const hasMeaningfulProgress = Boolean(
      formData.destination_store_id ||
      formData.expected_delivery_date ||
      formData.carrier_name.trim() ||
      formData.tracking_number.trim() ||
      formData.notes.trim() ||
      items.length ||
      scanHistory.length,
    );

    if (!hasMeaningfulProgress) {
      window.localStorage.removeItem(draftStorageKey);
      setDraftSavedAt(null);
      return;
    }

    const savedAt = new Date().toISOString();
    window.localStorage.setItem(
      draftStorageKey,
      JSON.stringify({
        version: DRAFT_VERSION,
        saved_at: savedAt,
        formData,
        items,
        addMode,
        scanHistory,
      }),
    );
    setDraftSavedAt(savedAt);
  };

  useEffect(() => {
    setDraftHydrated(false);
  }, [draftStorageKey]);

  useEffect(() => {
    if (!isOpen || draftHydrated) return;

    let restored = false;
    try {
      const raw = window.localStorage.getItem(draftStorageKey);
      if (raw) {
        const draft = JSON.parse(raw);
        const savedSource = String(draft?.formData?.source_store_id || '');
        const sourceMatches = !defaultSourceStoreId || savedSource === String(defaultSourceStoreId);

        if (draft?.version === DRAFT_VERSION && sourceMatches) {
          setFormData({
            ...EMPTY_FORM,
            ...(draft.formData || {}),
            source_store_id: defaultSourceStoreId
              ? String(defaultSourceStoreId)
              : String(draft?.formData?.source_store_id || ''),
          });
          const restoredScans: ScanEntry[] = Array.isArray(draft.scanHistory) ? draft.scanHistory : [];
          const scannedByBatch = restoredScans.reduce<Record<string, number>>((acc, entry) => {
            acc[String(entry.batch_id)] = (acc[String(entry.batch_id)] || 0) + 1;
            return acc;
          }, {});
          setItems(Array.isArray(draft.items)
            ? draft.items.map((item: DispatchItem) => {
                const quantity = Math.max(0, Number.parseInt(String(item.quantity || '0'), 10) || 0);
                const restoredScanned = Math.min(
                  quantity,
                  Number(item.scanned_quantity ?? scannedByBatch[String(item.batch_id)] ?? 0) || 0,
                );
                return normalizeDraftItem({
                  ...item,
                  scanned_quantity: restoredScanned,
                  manual_quantity: item.manual_quantity ?? Math.max(0, quantity - restoredScanned),
                });
              })
            : []);
          setScanHistory(restoredScans);
          setAddMode(draft.addMode === 'barcode' ? 'barcode' : 'batch');
          setDraftSavedAt(draft.saved_at || null);
          restored = true;
        }
      }
    } catch (error) {
      console.warn('Unable to restore saved dispatch draft:', error);
      window.localStorage.removeItem(draftStorageKey);
    }

    if (!restored) {
      resetDraftState();
    }

    // Delay persistence until restored state has rendered; otherwise the empty
    // first render can overwrite a valid saved draft.
    const timer = window.setTimeout(() => setDraftHydrated(true), 0);
    return () => window.clearTimeout(timer);
    // resetDraftState intentionally omitted: this hydration runs only when the
    // modal opens or the storage key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, draftHydrated, draftStorageKey, defaultSourceStoreId]);

  useEffect(() => {
    if (isOpen || !draftHydrated) return;
    setIsSubmitting(false);
    setScanInput('');
    setScanError(null);
    resetScanQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, draftHydrated]);

  useEffect(() => {
    if (!draftHydrated || typeof window === 'undefined') return;
    persistCurrentDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftHydrated, draftStorageKey, formData, items, addMode, scanHistory]);

  useEffect(() => {
    if (formData.source_store_id) {
      fetchAvailableBatches();
    } else {
      setAvailableBatches([]);
      setBatchData(null);
      setCurrentItem({ batch_id: '', quantity: '' });
    }
  }, [formData.source_store_id]);

  const fetchAvailableBatches = async () => {
    if (!formData.source_store_id) return;

    try {
      setBatchLoading(true);
      const response = await batchService.getBatches({
        store_id: parseInt(formData.source_store_id),
        status: 'available',
        sort_by: 'created_at',
        sort_order: 'desc',
        per_page: 100,
      });

      const batches = response.data.data || [];
      setAvailableBatches(batches);
    } catch (error) {
      console.error('Error fetching batches:', error);
      alert('Failed to fetch available batches');
      setAvailableBatches([]);
    } finally {
      setBatchLoading(false);
    }
  };

  // Fetch full batch details when batch is selected from dropdown
  useEffect(() => {
    const fetchBatchDetails = async () => {
      if (currentItem.batch_id) {
        try {
          // Fetch full batch details with barcodes
          const response = await batchService.getBatch(parseInt(currentItem.batch_id));
          const batch = response.data;

          // Filter to count only active barcodes
          if (batch.barcode && Array.isArray(batch.barcode)) {
            const activeBarcodes = batch.barcode.filter(
              (barcode: any) => barcode.is_active === true
            );

            const filteredBatch = {
              ...batch,
              // batch.quantity is the relabel-aware physical stock returned by
              // the backend. Barcode identities can legitimately be higher (for
              // example 2 physical units represented by 3 active barcodes), so
              // never replace physical quantity with activeBarcodes.length.
              original_quantity: batch.quantity,
              active_barcodes_count: activeBarcodes.length,
              barcodes: activeBarcodes,
            };

            setBatchData(filteredBatch);
          } else {
            setBatchData(batch);
          }
        } catch (error) {
          console.error('Error fetching batch details:', error);
          alert('Failed to load batch details');
          setBatchData(null);
        }
      } else {
        setBatchData(null);
      }
    };

    fetchBatchDetails();
  }, [currentItem.batch_id]);

  const handleSourceStoreChange = (nextSourceStoreId: string) => {
    if (nextSourceStoreId === formData.source_store_id) return;

    if ((items.length > 0 || scanHistory.length > 0) && !window.confirm(
      'Changing the source store will remove all draft items and scanned barcodes. Continue?',
    )) {
      return;
    }

    setItems([]);
    setScanHistory([]);
    setCurrentItem({ batch_id: '', quantity: '' });
    setBatchData(null);
    setScanInput('');
    setScanError(null);
    resetScanQueue();
    setFormData((prev) => ({
      ...prev,
      source_store_id: nextSourceStoreId,
      destination_store_id:
        prev.destination_store_id === nextSourceStoreId ? '' : prev.destination_store_id,
    }));
  };

  const addItem = () => {
    if (addMode !== 'batch') return;

    if (!batchData || !currentItem.quantity) {
      alert('Please select a batch and enter quantity');
      return;
    }

    const quantityToAdd = parseInt(currentItem.quantity);
    const existingItemIndex = items.findIndex((item) => item.batch_id === currentItem.batch_id);

    if (existingItemIndex !== -1) {
      // Merge with existing item
      const existingItem = items[existingItemIndex];
      const newQuantity = parseInt(existingItem.quantity) + quantityToAdd;
      
      if (newQuantity > (existingItem.available_quantity || batchData.quantity)) {
        alert(`Cannot add more. Total would exceed batch limit (${batchData.quantity} active units available)`);
        return;
      }

      const updatedItems = [...items];
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity.toString(),
        manual_quantity: Number(existingItem.manual_quantity || 0) + quantityToAdd,
        scanned_quantity: Number(existingItem.scanned_quantity || 0),
      };
      setItems(updatedItems);
    } else {
      // Add new item
      if (quantityToAdd > batchData.quantity) {
        alert(`Only ${batchData.quantity} active units available`);
        return;
      }

      const newItem: DispatchItem = {
        batch_id: batchData.id.toString(),
        batch_number: batchData.batch_number,
        product_name: batchData.product.name,
        quantity: currentItem.quantity,
        available_quantity: batchData.quantity,
        manual_quantity: quantityToAdd,
        scanned_quantity: 0,
      };

      setItems([...items, newItem]);
    }

    setCurrentItem({ batch_id: '', quantity: '' });
    setBatchData(null);
  };

  const scanOneBarcode = async (value: string) => {
    const code = value.trim();
    if (!code) return;

    if (!formData.source_store_id) {
      setScanError('Select the Source Store first, then scan.');
      return;
    }

    setScanError(null);

    try {
      // Double-check duplicates (covers edge cases when scans were queued very fast)
      if (scannedSet.has(code)) {
        setScanError('This barcode is already scanned in this dispatch draft.');
        return;
      }

      const res = await barcodeService.scanBarcode(code);
      if (!res?.success) {
        setScanError(`(${code}) ${res?.message || 'Barcode not found'}`);
        return;
      }

      const data = res.data;
      const sourceId = Number(formData.source_store_id);
      const locationId = data?.current_location?.id;

      if (!locationId || locationId !== sourceId) {
        setScanError(`(${code}) Barcode is not currently at the selected source store.`);
        return;
      }

      if (!data?.current_batch?.id) {
        setScanError(`(${code}) This barcode is not linked to any active batch.`);
        return;
      }

      if (!data?.is_available) {
        setScanError(`(${code}) This barcode is not available for dispatch.`);
        return;
      }

      const batchId = String(data.current_batch.id);
      const batchNumber = data.current_batch.batch_number;
      const productName = data.product?.name || 'Unknown Product';

      const availableQty = Number(
        typeof data.quantity_available === 'number'
          ? data.quantity_available
          : data.current_batch.quantity_available ?? 0
      );

      const currentItems = itemsRef.current;
      const idx = currentItems.findIndex((it) => it.batch_id === batchId);
      let nextItems: DispatchItem[];

      if (idx === -1) {
        nextItems = [
          ...currentItems,
          {
            batch_id: batchId,
            batch_number: batchNumber,
            product_name: productName,
            quantity: '1',
            available_quantity: availableQty,
            manual_quantity: 0,
            scanned_quantity: 1,
          },
        ];
      } else {
        nextItems = [...currentItems];
        const existing = nextItems[idx];
        const existingQty = Number.parseInt(existing.quantity || '0', 10) || 0;
        const nextQty = existingQty + 1;

        const maxAllowed = existing.available_quantity || availableQty;
        if (maxAllowed > 0 && nextQty > maxAllowed) {
          setScanError(`Batch limit reached. Only ${maxAllowed} active unit(s) available.`);
          return;
        }

        nextItems[idx] = {
          ...existing,
          quantity: String(nextQty),
          available_quantity: maxAllowed,
          manual_quantity: Number(existing.manual_quantity || 0),
          scanned_quantity: Number(existing.scanned_quantity || 0) + 1,
        };
      }

      itemsRef.current = nextItems;
      setItems(nextItems);

      setScanHistory((prev) => [
        {
          barcode: code,
          batch_id: batchId,
          batch_number: batchNumber,
          product_name: productName,
          scanned_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (err: any) {
      setScanError(`(${code}) ${err?.response?.data?.message || err?.message || 'Failed to scan barcode'}`);
    }
  };

  const processScanQueue = async () => {
    if (scanQueueProcessingRef.current) return;
    if (scanQueueRef.current.length === 0) return;
    scanQueueProcessingRef.current = true;
    setScanning(true);

    try {
      while (scanQueueRef.current.length > 0) {
        const next = scanQueueRef.current.shift();
        if (!next) continue;
        scanQueueSetRef.current.delete(next);
        setQueuedScanCount(scanQueueRef.current.length);
        // eslint-disable-next-line no-await-in-loop
        await scanOneBarcode(next);
      }
    } finally {
      scanQueueProcessingRef.current = false;
      setScanning(false);
      // keep the input focused for hardware scanners
      setTimeout(() => scanInputRef.current?.focus(), 0);
    }
  };

  const enqueueBarcodeScan = () => {
    const value = scanInput.trim();
    if (!value) return;

    if (!formData.source_store_id) {
      setScanError('Select the Source Store first, then scan.');
      return;
    }

    // Clear the input immediately so the next scan doesn't overwrite the previous one.
    setScanInput('');

    // Prevent duplicates across already-scanned + queued
    if (scannedSet.has(value) || scanQueueSetRef.current.has(value)) {
      setScanError('This barcode is already scanned in this dispatch draft.');
      return;
    }

    setScanError(null);
    scanQueueRef.current.push(value);
    scanQueueSetRef.current.add(value);
    setQueuedScanCount(scanQueueRef.current.length);
    void processScanQueue();
  };

  const removeDraftScan = (barcode: string) => {
    const target = scanHistory.find((entry) => entry.barcode === barcode);
    if (!target) return;

    setScanHistory((prev) => prev.filter((entry) => entry.barcode !== barcode));
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.batch_id === target.batch_id);
      if (idx === -1) return prev;
      const next = [...prev];
      const item = next[idx];
      const manualQty = Math.max(0, Number(item.manual_quantity || 0));
      const scannedQty = Math.max(0, Number(item.scanned_quantity || 0) - 1);
      const nextQty = manualQty + scannedQty;
      if (nextQty === 0) {
        next.splice(idx, 1);
      } else {
        next[idx] = {
          ...item,
          quantity: String(nextQty),
          manual_quantity: manualQty,
          scanned_quantity: scannedQty,
        };
      }
      return next;
    });
  };

  const removeLastScan = () => {
    const last = scanHistory[0];
    if (last) removeDraftScan(last.barcode);
  };

  const clearScans = () => {
    setItems((prev) => prev.flatMap((item) => {
      const manualQty = Math.max(0, Number(item.manual_quantity || 0));
      if (manualQty === 0) return [];
      return [{
        ...item,
        quantity: String(manualQty),
        manual_quantity: manualQty,
        scanned_quantity: 0,
      }];
    }));
    setScanHistory([]);
    setScanError(null);
    resetScanQueue();
  };

  const removeItem = (index: number) => {
    const removed = items[index];
    setItems(items.filter((_, i) => i !== index));
    if (removed?.batch_id) {
      setScanHistory((prev) => prev.filter((s) => s.batch_id !== removed.batch_id));
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || loading) return;

    if (
      !formData.source_store_id ||
      !formData.destination_store_id ||
      items.length === 0
    ) {
      alert('Please fill in all required fields and add at least one item');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await onSubmit({
        ...formData,
        items: items.map((item) => ({
          ...item,
          quantity: Number.parseInt(item.quantity, 10),
        })),
        // If you scanned barcodes while creating (quick-add), attach those
        // scans to the created dispatch items immediately in the backend.
        draft_scan_history: scanHistory,
      });

      if (created) {
        deleteStoredDraft();
        resetDraftState();
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndClose = () => {
    if (isSubmitting || loading || scanning || queuedScanCount > 0) return;
    persistCurrentDraft();
    setScanInput('');
    setScanError(null);
    resetScanQueue();
    onClose();
  };

  const handleDiscardDraft = () => {
    if (isSubmitting || loading || scanning || queuedScanCount > 0) return;
    if (!window.confirm('Cancel this dispatch draft and remove all added items and scanned barcodes?')) {
      return;
    }

    deleteStoredDraft();
    resetDraftState();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full my-8">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create Dispatch
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {draftSavedAt
                  ? `Draft saved automatically at ${new Date(draftSavedAt).toLocaleTimeString()}`
                  : 'Progress is saved automatically until you create or cancel this draft.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveAndClose}
              disabled={isSubmitting || loading || scanning || queuedScanCount > 0}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Save draft and close"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Store Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Source Store *
                {defaultSourceStoreId && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Pre-selected)</span>
                )}
              </label>
              <select
                value={formData.source_store_id}
                onChange={(e) => handleSourceStoreChange(e.target.value)}
                disabled={!!defaultSourceStoreId}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                <option value="">Select Source Store</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Destination Store *
              </label>
              <select
                value={formData.destination_store_id}
                onChange={(e) =>
                  setFormData({ ...formData, destination_store_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">Select Destination Store</option>
                {stores
                  .filter((s) => s.id.toString() !== formData.source_store_id)
                  .map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Delivery & Tracking Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) =>
                  setFormData({ ...formData, expected_delivery_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Carrier Name
              </label>
              <input
                type="text"
                value={formData.carrier_name}
                onChange={(e) =>
                  setFormData({ ...formData, carrier_name: e.target.value })
                }
                placeholder="DHL, FedEx, etc."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tracking Number
            </label>
            <input
              type="text"
              value={formData.tracking_number}
              onChange={(e) =>
                setFormData({ ...formData, tracking_number: e.target.value })
              }
              placeholder="Enter tracking number"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>

          {/* Add Items Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-semibold text-gray-900 dark:text-white">
                Add Items
              </h3>
              {formData.source_store_id && (
                <button
                  onClick={fetchAvailableBatches}
                  disabled={batchLoading}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${batchLoading ? 'animate-spin' : ''}`} />
                  Refresh Batches
                </button>
              )}
            </div>

            {/* Add mode toggle (manual batch vs barcode scan) */}
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  setAddMode('batch');
                  setScanError(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${addMode === 'batch'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
              >
                Select Batch
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddMode('barcode');
                  setScanError(null);
                  setTimeout(() => scanInputRef.current?.focus(), 0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${addMode === 'barcode'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
              >
                <Scan className="w-3.5 h-3.5" /> Scan Barcodes
              </button>
              {addMode === 'barcode' && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Each scan adds <b>1 unit</b> to the matching batch. These scans will be attached to the dispatch right after you click <b>Create Dispatch</b>.
                </span>
              )}
            </div>

            {addMode === 'barcode' && (
              <div className="mb-3">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-7">
                    <div className="relative group">
                      <Scan className={`absolute left-3 top-2.5 w-4 h-4 transition-colors ${!formData.source_store_id ? 'text-gray-400' : 'text-indigo-500 group-hover:animate-pulse'}`} />
                      <input
                        ref={scanInputRef}
                        type="text"
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Tab') {
                            e.preventDefault();
                            enqueueBarcodeScan();
                            setTimeout(() => scanInputRef.current?.focus(), 0);
                          }
                        }}
                        className={`w-full pl-10 pr-3 py-2 rounded-lg border text-sm transition-all focus:ring-2 focus:ring-indigo-500/20 active:scale-[0.99] ${!formData.source_store_id
                            ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60'
                            : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:border-indigo-500'
                          }`}
                        placeholder={formData.source_store_id ? 'Scan/Type barcode and press Enter…' : 'Select source store first'}
                        disabled={!formData.source_store_id}
                      />
                      {!formData.source_store_id && (
                        <div className="absolute inset-0 z-10 cursor-not-allowed" onClick={() => toast.error('Please select a Source Store first')} />
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <button
                      type="button"
                      onClick={enqueueBarcodeScan}
                      disabled={!formData.source_store_id || !scanInput.trim()}
                      className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg text-sm flex items-center justify-center"
                      title="Scan & add"
                    >
                      <Scan className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="col-span-3 flex gap-2">
                    <button
                      type="button"
                      onClick={removeLastScan}
                      disabled={scanHistory.length === 0 || scanning}
                      className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-800 dark:text-gray-200 rounded-lg text-sm flex items-center justify-center"
                      title="Undo last scan"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={clearScans}
                      disabled={scanHistory.length === 0 || scanning}
                      className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-800 dark:text-gray-200 rounded-lg text-xs"
                      title="Clear scan list"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {scanError && (
                  <div className="mt-2 p-2 rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <div>{scanError}</div>
                  </div>
                )}

                {(scanning || queuedScanCount > 0) && (
                  <div className="mt-2 text-[11px] text-gray-600 dark:text-gray-400">
                    {scanning ? 'Processing scans' : 'Scans queued'}
                    {queuedScanCount > 0 ? ` • queued: ${queuedScanCount}` : ''}
                  </div>
                )}

                {scanHistory.length > 0 && (
                  <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700">
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                        Scanned ({scanHistory.length})
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        Latest first
                      </div>
                    </div>
                    <div className="max-h-40 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
                      {scanHistory.map((s, idx) => (
                        <div key={`${s.barcode}-${idx}`} className="px-3 py-2 flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-mono text-gray-900 dark:text-white truncate">
                              {idx + 1}. {s.barcode}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                              {s.product_name} • {s.batch_number}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDraftScan(s.barcode)}
                            disabled={scanning || isSubmitting || loading}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                            title="Remove this barcode from the draft"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sync hint */}
                {scanHistory.length > 0 && (
                  <div className="mt-2 text-[11px] text-gray-600 dark:text-gray-400">
                    These barcodes will be <b>saved to the dispatch</b> right after you click <b>Create Dispatch</b>.
                  </div>
                )}
              </div>
            )}

            <div className={`grid grid-cols-12 gap-2 mb-3 ${addMode === 'barcode' ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="col-span-6">
                <select
                  value={currentItem.batch_id}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, batch_id: e.target.value })
                  }
                  disabled={!formData.source_store_id || batchLoading}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm disabled:bg-gray-100 dark:disabled:bg-gray-600"
                >
                  <option value="">
                    {batchLoading
                      ? 'Loading batches...'
                      : !formData.source_store_id
                        ? 'Select source store first'
                        : availableBatches.length === 0
                          ? 'No available batches with active items'
                          : 'Select a batch'}
                  </option>
                  {availableBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batch_number} - {batch.product.name} ({batch.quantity} active units)
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-4">
                <input
                  type="number"
                  value={currentItem.quantity}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, quantity: e.target.value })
                  }
                  placeholder="Quantity"
                  disabled={!batchData}
                  min="1"
                  max={batchData?.quantity}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm disabled:bg-gray-100 dark:disabled:bg-gray-600"
                />
              </div>
              <div className="col-span-2">
                <button
                  onClick={addItem}
                  disabled={!batchData || !currentItem.quantity}
                  className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-sm flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {batchData && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div>
                      <strong className="text-blue-900 dark:text-blue-300">Product:</strong>{' '}
                      <span className="text-gray-900 dark:text-gray-100">{batchData.product.name}</span>
                    </div>
                    <div>
                      <strong className="text-blue-900 dark:text-blue-300">Batch:</strong>{' '}
                      <span className="font-mono text-gray-900 dark:text-gray-100">{batchData.batch_number}</span>
                    </div>
                    <div>
                      <strong className="text-blue-900 dark:text-blue-300">Available (Active):</strong>{' '}
                      <span className="text-green-600 dark:text-green-400 font-semibold">{batchData.quantity} units</span>
                      {typeof batchData.active_barcodes_count === 'number' &&
                        batchData.active_barcodes_count !== batchData.quantity && (
                          <span className="text-gray-500 dark:text-gray-500 ml-1">
                            ({batchData.active_barcodes_count} active barcode identities)
                          </span>
                        )}
                    </div>
                    <div>
                      <strong className="text-blue-900 dark:text-blue-300">Cost Price:</strong>{' '}
                      <span className="text-gray-900 dark:text-gray-100">৳{batchData.cost_price}</span>
                      {' | '}
                      <strong className="text-blue-900 dark:text-blue-300">Sell Price:</strong>{' '}
                      <span className="text-gray-900 dark:text-gray-100">৳{batchData.sell_price}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Items List */}
            {items.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">
                        Batch
                      </th>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">
                        Product
                      </th>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">
                        Quantity
                      </th>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="px-3 py-2 text-gray-900 dark:text-white font-mono text-xs">
                          {item.batch_number}
                        </td>
                        <td className="px-3 py-2 text-gray-900 dark:text-white">
                          {item.product_name}
                        </td>
                        <td className="px-3 py-2 text-gray-900 dark:text-white">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => removeItem(index)}
                            disabled={scanning || queuedScanCount > 0 || isSubmitting || loading}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes for this dispatch..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
          <button
            type="button"
            onClick={handleDiscardDraft}
            disabled={isSubmitting || loading || scanning || queuedScanCount > 0}
            className="px-4 py-2 border border-red-300 dark:border-red-800 rounded-lg text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel Draft
          </button>
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleSaveAndClose}
              disabled={isSubmitting || loading || scanning || queuedScanCount > 0}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save & Close
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || isSubmitting || scanning || queuedScanCount > 0 || items.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium"
            >
              {loading || isSubmitting ? 'Creating Dispatch...' : 'Create Dispatch'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateDispatchModal;
import { useState, useEffect, useRef } from 'react';
import { X, RotateCcw, Calculator, Barcode, Trash2, AlertCircle, Info } from 'lucide-react';
import storeService, { type Store } from '@/services/storeService';
import productReturnService from '@/services/productReturnService';
import axiosInstance from '@/lib/axios';

type ReturnReason = 'defective_product' | 'wrong_item' | 'wrong_product' | 'wrong_customer' | 'not_as_described' | 'customer_dissatisfaction' | 'size_issue' | 'color_issue' | 'quality_issue' | 'late_delivery' | 'changed_mind' | 'duplicate_order' | 'other';
type ReturnType = 'customer_return' | 'store_return' | 'warehouse_return';

interface ReturnProductModalProps {
  order: any;
  onClose: () => void;
  onReturn: (returnData: any) => Promise<void>;
  enableMobileScan?: boolean;
  allowForceLegacyBarcode?: boolean;
}

export default function ReturnProductModal({ order, onClose, onReturn, enableMobileScan = false, allowForceLegacyBarcode = false }: ReturnProductModalProps) {
  const [returnedItems, setReturnedItems] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [allowPartialRefunds, setAllowPartialRefunds] = useState(false);
  const [forceLegacyCandidateCode, setForceLegacyCandidateCode] = useState<string | null>(null);
  const [forceLegacyEnabled, setForceLegacyEnabled] = useState(false);
  const [forceLegacyOrderItemId, setForceLegacyOrderItemId] = useState<number | null>(null);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const barcodeScanTimerRef = useRef<number | null>(null);
  const barcodeScanInFlightRef = useRef(false);
  const returnQuoteTimerRef = useRef<number | null>(null);
  const returnQuoteRequestRef = useRef(0);
  const [returnQuote, setReturnQuote] = useState<any | null>(null);
  const [isReturnQuoteLoading, setIsReturnQuoteLoading] = useState(false);
  const [returnQuoteError, setReturnQuoteError] = useState<string | null>(null);

  // Return info
  const [returnReason, setReturnReason] = useState<ReturnReason>('other');
  const [returnType, setReturnType] = useState<ReturnType>('customer_return');
  const [customerNotes, setCustomerNotes] = useState('');

  // Store selection
  const [stores, setStores] = useState<Store[]>([]);
  const [receivedAtStoreId, setReceivedAtStoreId] = useState<number>(Number(order.store?.id || order.store_id || 0));

  // Refund states
  const [refundDetails, setRefundDetails] = useState({
    cash: '',
    card: '',
    bkash: '',
    nagad: ''
  });

  const [showNoteCounter, setShowNoteCounter] = useState(false);
  const [notes, setNotes] = useState({
    1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0
  });

  useEffect(() => {
    fetchStores();
    productReturnService.getPartialRefundSetting()
      .then((res: any) => setAllowPartialRefunds(Boolean(res?.data?.enabled)))
      .catch(() => setAllowPartialRefunds(false));
    if (barcodeInputRef.current) barcodeInputRef.current.focus();
  }, []);

  const fetchStores = async () => {
    try {
      const response = await storeService.getStores({ is_active: true, per_page: 100 });
      let storesData: Store[] = [];
      if (response?.success && response?.data) {
        storesData = Array.isArray(response.data.data) ? response.data.data : (Array.isArray(response.data) ? response.data : []);
      } else if (Array.isArray(response)) {
        storesData = response;
      }
      setStores(storesData);
      if (!receivedAtStoreId && storesData.length > 0) {
        setReceivedAtStoreId(Number(storesData[0].id));
      }
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    }
  };

  const normalizeBarcode = (value: any) => String(value ?? '').trim().replace(/\s+/g, '').toLowerCase();

  const collectItemBarcodes = (item: any) => {
    const result: Array<{ code: string; id?: number }> = [];
    const seen = new Set<string>();

    const pushBarcode = (value: any, fallbackId?: any) => {
      if (!value) return;

      if (typeof value === 'object') {
        const code = value.barcode ?? value.barcode_number ?? value.code ?? value.value;
        const id = value.id ?? value.product_barcode_id ?? value.barcode_id ?? fallbackId;
        pushBarcode(code, id);
        return;
      }

      const code = String(value).trim();
      if (!code) return;

      const key = normalizeBarcode(code);
      if (seen.has(key)) return;

      seen.add(key);
      result.push({
        code,
        id: fallbackId ? Number(fallbackId) : undefined,
      });
    };

    const fallbackId = item?.product_barcode_id ?? item?.barcode_id ?? item?.productBarcodeId ?? item?.barcodeId;

    (Array.isArray(item?.barcode_details) ? item.barcode_details : []).forEach((barcode: any) => pushBarcode(barcode, fallbackId));
    (Array.isArray(item?.barcodeDetails) ? item.barcodeDetails : []).forEach((barcode: any) => pushBarcode(barcode, fallbackId));
    (Array.isArray(item?.barcodes) ? item.barcodes : []).forEach((barcode: any) => pushBarcode(barcode, fallbackId));
    (Array.isArray(item?.product_barcodes) ? item.product_barcodes : []).forEach((barcode: any) => pushBarcode(barcode, fallbackId));
    pushBarcode(item?.barcode, fallbackId);
    pushBarcode(item?.barcode_number, fallbackId);
    pushBarcode(item?.sold_barcode, fallbackId);
    pushBarcode(item?.product_barcode, fallbackId);
    pushBarcode(item?.productBarcode, fallbackId);
    pushBarcode(item?.scanned_barcode, fallbackId);

    return result;
  };

  const findOrderItemByBarcode = (code: string) => {
    const target = normalizeBarcode(code);
    for (const item of order.items || []) {
      const matchedBarcode = collectItemBarcodes(item).find(barcode => normalizeBarcode(barcode.code) === target);
      if (matchedBarcode) return { orderItem: item, matchedBarcode };
    }
    return null;
  };

  const toNumberId = (value: any): number | null => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const sameId = (left: any, right: any) => {
    const l = toNumberId(left);
    const r = toNumberId(right);
    return Boolean(l && r && l === r);
  };

  const extractLookupBarcode = (lookupData: any, fallbackCode: string) => {
    const barcodeData = typeof lookupData?.barcode === 'object' ? lookupData.barcode : {};
    const directBarcode = typeof lookupData?.barcode === 'string' ? lookupData.barcode : null;

    return {
      code: barcodeData?.barcode || lookupData?.barcode_number || directBarcode || fallbackCode,
      id: toNumberId(barcodeData?.id ?? lookupData?.barcode_id ?? lookupData?.product_barcode_id ?? lookupData?.id),
      productId: toNumberId(barcodeData?.product_id ?? lookupData?.product?.id ?? lookupData?.product_id),
      batchId: toNumberId(barcodeData?.batch_id ?? lookupData?.batch?.id ?? lookupData?.current_batch?.id ?? lookupData?.current_location?.batch?.id),
    };
  };

  const findOrderItemByQuickLookup = (code: string, lookupData: any) => {
    const lookupBarcode = extractLookupBarcode(lookupData, code);
    const normalizedLookupCode = normalizeBarcode(lookupBarcode.code);

    for (const item of order.items || []) {
      const itemBarcodes = collectItemBarcodes(item);
      const itemBarcodeId = item?.product_barcode_id ?? item?.barcode_id ?? item?.productBarcodeId ?? item?.barcodeId ?? item?.product_barcode?.id ?? item?.barcode?.id ?? item?.scanned_barcode?.id;

      if (lookupBarcode.id && (sameId(itemBarcodeId, lookupBarcode.id) || itemBarcodes.some(barcode => sameId(barcode.id, lookupBarcode.id)))) {
        const matched = itemBarcodes.find(barcode => sameId(barcode.id, lookupBarcode.id)) || { code: lookupBarcode.code, id: lookupBarcode.id };
        return { orderItem: item, matchedBarcode: matched };
      }

      const matchedByCode = itemBarcodes.find(barcode => normalizeBarcode(barcode.code) === normalizedLookupCode);
      if (matchedByCode) return { orderItem: item, matchedBarcode: matchedByCode };
    }

    const productMatches = (order.items || []).filter((item: any) => {
      const itemProductId = item?.product_id ?? item?.product?.id;
      const itemBatchId = item?.product_batch_id ?? item?.batch_id ?? item?.batch?.id;
      if (!sameId(itemProductId, lookupBarcode.productId)) return false;
      if (lookupBarcode.batchId && itemBatchId && !sameId(itemBatchId, lookupBarcode.batchId)) return false;
      return true;
    });

    if (productMatches.length === 1) {
      return {
        orderItem: productMatches[0],
        matchedBarcode: { code: lookupBarcode.code, id: lookupBarcode.id ?? undefined },
      };
    }

    return null;
  };

  const resolveScannedReturnItem = async (code: string) => {
    const localMatch = findOrderItemByBarcode(code);
    if (localMatch) return localMatch;

    const response = await axiosInstance.get('/lookup/product', { params: { barcode: code, quick: 1 } });
    const lookupData = response.data?.data || response.data || {};
    return findOrderItemByQuickLookup(code, lookupData);
  };

  const asNumber = (value: any, fallback = 0) => {
    const parsed = parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const isMoneyInput = (value: string) => /^\d*(?:\.\d{0,2})?$/.test(value);
  const moneyCents = (value: unknown) => Math.round((Number(value) || 0) * 100);
  const centsToMoney = (value: number) => Math.max(0, value) / 100;
  const formatMoney = (value: unknown) => centsToMoney(moneyCents(value)).toFixed(2);

  const getItemListedUnitPrice = (item: any) => asNumber(item?.listed_unit_price ?? item?.unit_price ?? item?.price ?? item?.sale_price, 0);
  const getItemSoldAtUnitPrice = (item: any) => {
    const quantity = Math.max(1, asNumber(item?.quantity, 1));
    const explicit = item?.manual_sold_at_price ?? item?.sold_at_unit_price ?? item?.sold_at_price;
    if (explicit !== undefined && explicit !== null && explicit !== '') return asNumber(explicit, getItemListedUnitPrice(item));
    if (item?.total_amount !== undefined && item?.total_amount !== null) return asNumber(item.total_amount, 0) / quantity;
    return getItemListedUnitPrice(item);
  };

  const updateReturnedItemSoldAtPrice = (index: number, value: string) => {
    if (!isMoneyInput(value)) return;
    const manualPriceCents = moneyCents(value);
    const manualPrice = centsToMoney(manualPriceCents);
    setReturnedItems(prev => prev.map((item, i) => i === index ? {
      ...item,
      manual_sold_at_input: value,
      manual_sold_at_price: manualPrice,
      unit_price: manualPrice,
      total_price: centsToMoney(manualPriceCents * Number(item.quantity || 1)),
    } : item));
  };

  const normalizeReturnedItemSoldAtPrice = (index: number) => {
    setReturnedItems(prev => prev.map((item, i) => i === index ? {
      ...item,
      manual_sold_at_input: formatMoney(item.manual_sold_at_price),
    } : item));
  };

  const buildReturnedItem = (orderItem: any, matchedBarcode: { code: string; id?: number }, forceLegacy = false) => {
    const listedUnitPrice = getItemListedUnitPrice(orderItem);
    const soldAtUnitPrice = getItemSoldAtUnitPrice(orderItem);
    const productBarcodeId = matchedBarcode.id || orderItem.product_barcode_id || orderItem.barcode_id || orderItem.product_barcode?.id || orderItem.barcode?.id;

    return {
      order_item_id: orderItem.id,
      product_id: orderItem.product_id ?? orderItem.product?.id,
      product_batch_id: orderItem.product_batch_id || orderItem.batch_id || orderItem.batch?.id,
      product_name: orderItem.product_name || orderItem.product?.name || orderItem.name || 'Unknown Product',
      barcode: matchedBarcode.code,
      product_barcode_id: productBarcodeId,
      barcode_id: productBarcodeId,
      listed_unit_price: listedUnitPrice,
      sold_at_unit_price: soldAtUnitPrice,
      manual_sold_at_price: centsToMoney(moneyCents(soldAtUnitPrice)),
      manual_sold_at_input: formatMoney(soldAtUnitPrice),
      unit_price: centsToMoney(moneyCents(soldAtUnitPrice)),
      item_discount_amount: asNumber(orderItem.discount_amount, 0),
      order_discount_amount: asNumber(order.discount_amount || order.amounts?.discount, 0),
      quantity: 1,
      total_price: centsToMoney(moneyCents(soldAtUnitPrice)),
      force_legacy_barcode: forceLegacy,
      legacy_barcode: forceLegacy ? matchedBarcode.code : undefined,
    };
  };

  const addReturnedItem = (orderItem: any, matchedBarcode: { code: string; id?: number }) => {
    const alreadySelected = returnedItems.some(item =>
      normalizeBarcode(item.barcode) === normalizeBarcode(matchedBarcode.code) || (matchedBarcode.id && sameId(item.product_barcode_id || item.barcode_id, matchedBarcode.id))
    );
    if (alreadySelected) {
      setError('Item already selected for return');
      return false;
    }
    setError(null);
    setReturnedItems(prev => [...prev, buildReturnedItem(orderItem, matchedBarcode, forceLegacyEnabled)]);
    setForceLegacyCandidateCode(null);
    setForceLegacyOrderItemId(null);
    setBarcodeInput('');
    window.setTimeout(() => barcodeInputRef.current?.focus(), 0);
    return true;
  };

  const forceLegacyOrderItems = (order.items || []).filter((item: any) => Number(item?.product_id ?? item?.product?.id ?? 0) > 0);

  const addForcedLegacyReturnedItem = () => {
    if (!forceLegacyCandidateCode || !forceLegacyEnabled) {
      setError('Tick Force Return before adding this unknown legacy barcode.');
      return;
    }
    const orderItem = forceLegacyOrderItems.find((item: any) => sameId(item.id, forceLegacyOrderItemId));
    if (!orderItem) {
      setError('Select the exact original order item for this physical legacy barcode.');
      return;
    }
    const code = forceLegacyCandidateCode.trim();
    if (returnedItems.some(item => normalizeBarcode(item.barcode) === normalizeBarcode(code))) {
      setError('This legacy barcode is already selected for return.');
      return;
    }
    setError(null);
    setReturnedItems(prev => [...prev, buildReturnedItem(orderItem, { code }, true)]);
    setForceLegacyCandidateCode(null);
    setForceLegacyOrderItemId(null);
    setBarcodeInput('');
    window.setTimeout(() => barcodeInputRef.current?.focus(), 0);
  };

  const selectableReturnBarcodes = (order.items || []).flatMap((item: any) => {
    const barcodes = collectItemBarcodes(item);
    if (barcodes.length === 0) {
      return [{ orderItem: item, matchedBarcode: { code: item.product_sku || item.sku || `ITEM-${item.id}`, id: item.product_barcode_id || item.barcode_id } }];
    }
    return barcodes.map((matchedBarcode) => ({ orderItem: item, matchedBarcode }));
  }).filter((entry: any) => entry.matchedBarcode?.code);

  const handleBarcodeScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    if (barcodeScanInFlightRef.current) return;
    barcodeScanInFlightRef.current = true;

    try {

      setError(null);
      setForceLegacyCandidateCode(null);
      setForceLegacyOrderItemId(null);

      if (returnedItems.some(item => normalizeBarcode(item.barcode) === normalizeBarcode(code))) {
        setError('Item already scanned for return');
        setBarcodeInput('');
        return;
      }

      const found = await resolveScannedReturnItem(code);

      if (!found) {
        setError('Barcode not found in this order');
        setBarcodeInput('');
        return;
      }

      const { orderItem, matchedBarcode } = found;
      addReturnedItem(orderItem, matchedBarcode);
    } catch (err: any) {
      if (allowForceLegacyBarcode && Number(err?.response?.status) === 404) {
        // Normal lookup can miss an inactive/reset-retired identity or a barcode row
        // that was accidentally deleted. Keep only the scanned literal client-side;
        // the backend must prove that this exact order item sold it before it may
        // recover/recreate the identity. Random/unknown values are rejected.
        setForceLegacyCandidateCode(code);
        setForceLegacyOrderItemId(forceLegacyOrderItems.length === 1 ? Number(forceLegacyOrderItems[0].id) : null);
        setError(null);
      } else {
        setError(err?.response?.data?.message || 'Failed to quickly verify the scanned barcode');
      }
      setBarcodeInput('');
    } finally {
      barcodeScanInFlightRef.current = false;
    }
  };

  useEffect(() => {
    const code = barcodeInput.trim();
    if (code.length < 6) return;

    if (barcodeScanTimerRef.current) window.clearTimeout(barcodeScanTimerRef.current);
    barcodeScanTimerRef.current = window.setTimeout(() => {
      handleBarcodeScan();
    }, 120);

    return () => {
      if (barcodeScanTimerRef.current) window.clearTimeout(barcodeScanTimerRef.current);
    };
  }, [barcodeInput]);

  const removeReturnedItem = (index: number) => {
    setReturnedItems(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (returnQuoteTimerRef.current) window.clearTimeout(returnQuoteTimerRef.current);
    const requestId = ++returnQuoteRequestRef.current;
    setReturnQuote(null);
    setReturnQuoteError(null);

    if (!order?.id || returnedItems.length === 0) {
      setIsReturnQuoteLoading(false);
      return;
    }

    setIsReturnQuoteLoading(true);
    returnQuoteTimerRef.current = window.setTimeout(async () => {
      try {
        const response = await productReturnService.quoteQuickComplete({
          order_id: Number(order.id),
          return_reason: returnReason,
          return_type: returnType,
          received_at_store_id: receivedAtStoreId || undefined,
          items: returnedItems.map((item) => ({
            order_item_id: Number(item.order_item_id),
            quantity: Number(item.quantity || 1),
            product_barcode_id: item.product_barcode_id || undefined,
            unit_price: centsToMoney(moneyCents(item.manual_sold_at_price ?? item.unit_price ?? 0)),
            manual_sold_at_price: centsToMoney(moneyCents(item.manual_sold_at_price ?? item.unit_price ?? 0)),
            total_price: centsToMoney(moneyCents(item.total_price ?? 0)),
            ...(item.force_legacy_barcode ? { force_legacy_barcode: true, legacy_barcode: item.legacy_barcode || item.barcode } : {}),
          })),
        });
        if (requestId !== returnQuoteRequestRef.current) return;
        setReturnQuote(response?.data || null);
      } catch (err: any) {
        if (requestId !== returnQuoteRequestRef.current) return;
        setReturnQuoteError(err?.response?.data?.message || 'Unable to calculate the authoritative refund amount');
      } finally {
        if (requestId === returnQuoteRequestRef.current) setIsReturnQuoteLoading(false);
      }
    }, 120);

    return () => {
      if (returnQuoteTimerRef.current) window.clearTimeout(returnQuoteTimerRef.current);
    };
  }, [order?.id, returnedItems, returnReason, returnType, receivedAtStoreId]);

  const calculateTotals = () => {
    const localReturnAmountCents = returnedItems.reduce((sum, item) => sum + moneyCents(item.total_price), 0);
    const localTotalPaidCents = moneyCents(order.paid_amount || order.payments?.totalPaid || 0);
    const localOutstandingCents = moneyCents(order.outstanding_amount ?? order.payments?.remainingAmount ?? 0);
    const returnAmountCents = returnQuote ? moneyCents(returnQuote.merchandise_return_value) : localReturnAmountCents;
    const totalPaidCents = returnQuote ? moneyCents(returnQuote.source_order_paid) : localTotalPaidCents;
    const currentOutstandingCents = returnQuote ? moneyCents(returnQuote.source_order_outstanding) : localOutstandingCents;

    // While the server quote is loading, retain the old local estimate only for display.
    // Submission is blocked until the authoritative backend refund amount is available.
    const refundToCustomerCents = returnQuote
      ? moneyCents(returnQuote.amount_to_refund ?? returnQuote.refund_due ?? 0)
      : Math.max(0, returnAmountCents - currentOutstandingCents);

    return {
      returnAmountCents,
      totalPaidCents,
      currentOutstandingCents,
      refundToCustomerCents,
      returnAmount: centsToMoney(returnAmountCents),
      totalPaid: centsToMoney(totalPaidCents),
      currentOutstanding: centsToMoney(currentOutstandingCents),
      refundToCustomer: centsToMoney(refundToCustomerCents),
    };
  };

  const totals = calculateTotals();

  const cashFromNotesCents = Object.entries(notes).reduce((sum, [val, count]) => sum + (Number(val) * Number(count) * 100), 0);
  const cashFromNotes = centsToMoney(cashFromNotesCents);
  const effectiveRefundCashCents = cashFromNotesCents > 0 ? cashFromNotesCents : moneyCents(refundDetails.cash);
  const totalRefundProcessedCents = effectiveRefundCashCents + moneyCents(refundDetails.card) + moneyCents(refundDetails.bkash) + moneyCents(refundDetails.nagad);
  const remainingRefundCents = totals.refundToCustomerCents - totalRefundProcessedCents;
  const refundOverpaid = totalRefundProcessedCents > totals.refundToCustomerCents;
  const refundUnderpaid = totals.refundToCustomerCents > 0 && remainingRefundCents > 0;
  const refundBlocking = !allowPartialRefunds && refundUnderpaid;
  const effectiveRefundCash = centsToMoney(effectiveRefundCashCents);
  const totalRefundProcessed = centsToMoney(totalRefundProcessedCents);
  const remainingRefund = centsToMoney(Math.abs(remainingRefundCents));

  const handleProcessReturn = async () => {
    if (returnedItems.length === 0) {
      setError('Please scan at least one item to return');
      return;
    }

    if (!receivedAtStoreId) {
      setError('Please select the store receiving this return');
      return;
    }

    if (!returnQuote || isReturnQuoteLoading) {
      setError(returnQuoteError || 'Wait for Deshio to calculate the authoritative refund amount.');
      return;
    }

    if (refundOverpaid) {
      setError('Refund amount cannot exceed the refund due amount');
      return;
    }

    if (refundBlocking) {
      setError('Partial refunds are disabled. Enter the full refund amount before processing this return.');
      return;
    }

    setError(null);
    setIsProcessing(true);
    try {
      await onReturn({
        returnReason,
        returnType,
        receivedAtStoreId,
        selectedProducts: returnedItems,
        refundMethods: {
          cash: effectiveRefundCash,
          card: centsToMoney(moneyCents(refundDetails.card)),
          bkash: centsToMoney(moneyCents(refundDetails.bkash)),
          nagad: centsToMoney(moneyCents(refundDetails.nagad)),
          total: totalRefundProcessed
        },
        customerNotes: customerNotes.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      console.error('Return failed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to process return');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Return - Order #{order.order_number || order.id}</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">Barcode-Driven Verification</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-12 gap-6">
            {/* Left Column */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              
              {/* Return Metadata */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-6 border border-gray-200 dark:border-gray-700/50 group">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600">
                    <Info className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-sm">Return Details</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Received At Store</label>
                    <select
                      value={receivedAtStoreId}
                      onChange={(e) => setReceivedAtStoreId(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl focus:border-blue-500 outline-none transition-all text-sm font-bold uppercase tracking-widest"
                    >
                      <option value={0} disabled>Select store</option>
                      {stores.map(store => (
                        <option key={store.id} value={store.id}>{store.name}{store.is_warehouse ? ' (Warehouse)' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Return Reason</label>
                    <select
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value as ReturnReason)}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl focus:border-red-500 outline-none transition-all text-sm font-bold uppercase tracking-widest"
                    >
                      <option value="defective_product">Defective Product</option>
                      <option value="wrong_item">Wrong Item</option>
                      <option value="wrong_product">Wrong Product</option>
                      <option value="wrong_customer">Wrong Customer</option>
                      <option value="size_issue">Size Issue</option>
                      <option value="quality_issue">Quality Issue</option>
                      <option value="changed_mind">Changed Mind</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Customer Notes</label>
                  <textarea
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Enter additional details..."
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl focus:border-blue-500 outline-none transition-all text-sm font-bold uppercase tracking-widest min-h-[100px]"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-6 border border-gray-200 dark:border-gray-700/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-red-500/10 transition-all duration-500" />
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                      <Barcode className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-sm">Scan Items</h3>
                  </div>
                  <span className="px-3 py-1 bg-red-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20">
                    {returnedItems.length} Scanned
                  </span>
                </div>

                <form onSubmit={handleBarcodeScan} className="relative mb-6">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400">
                    <Barcode className="w-5 h-5" />
                  </div>
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    placeholder="SCAN ITEM BARCODE FROM ORDER..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleBarcodeScan();
                      }
                    }}
                    className="w-full pl-12 pr-4 py-5 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl focus:border-red-500 outline-none transition-all text-sm font-black placeholder:text-gray-300 dark:placeholder:text-gray-600 uppercase tracking-widest"
                  />
                </form>

                {allowForceLegacyBarcode && (
                  <div className={`mb-5 p-4 rounded-2xl border-2 transition-colors ${forceLegacyEnabled ? 'border-amber-400 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'}`}>
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={forceLegacyEnabled}
                        onChange={(e) => setForceLegacyEnabled(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-black"
                      />
                      <span>
                        <span className="block text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Force Return</span>
                        <span className="block mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                          Leave this off while adding normal barcodes. Turn it on before adding an exact legacy barcode that belongs to this order; that row is marked for Force Return while previously added normal rows stay normal. Multiple normal + forced barcodes can be submitted together. If the barcode row was accidentally deleted, Deshio may recreate that exact physical identity only when this order still proves that exact barcode was sold here.
                        </span>
                      </span>
                    </label>
                  </div>
                )}

                {allowForceLegacyBarcode && forceLegacyCandidateCode && (
                  <div className="mb-5 p-4 rounded-2xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-widest">Barcode is not currently known to Deshio</p>
                          <p className="text-sm font-mono font-black text-gray-900 dark:text-white mt-1">{forceLegacyCandidateCode}</p>
                          <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-2">Normal lookup did not find this code. Force Return will check the selected order item. If the order retains this exact sold barcode, Deshio can recreate the missing barcode row and restock it; otherwise the request is rejected. Random codes are never created.</p>
                        </div>
                        {forceLegacyEnabled ? (
                          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                            <select
                              value={forceLegacyOrderItemId ?? ''}
                              onChange={(e) => setForceLegacyOrderItemId(e.target.value ? Number(e.target.value) : null)}
                              className="w-full px-3 py-3 bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-800 rounded-xl text-sm font-bold"
                            >
                              <option value="">Select exact original order item</option>
                              {forceLegacyOrderItems.map((item: any) => (
                                <option key={item.id} value={item.id}>
                                  {item.product_name || item.product?.name || item.name || 'Product'} — Item #{item.id} — Qty {item.quantity || 1}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={addForcedLegacyReturnedItem}
                              disabled={!forceLegacyOrderItemId}
                              className="px-4 py-3 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-black uppercase tracking-widest disabled:opacity-40"
                            >
                              Add Forced Return
                            </button>
                          </div>
                        ) : (
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Tick Force Return only when this physical code was sold on the selected original order item. A deleted row can be recreated only from exact order proof; wrong-order/random codes are rejected.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {selectableReturnBarcodes.length > 0 && (
                  <div className="mb-5 p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Selectable sold barcodes from this order</p>
                    <div className="flex flex-wrap gap-2">
                      {selectableReturnBarcodes.map(({ orderItem, matchedBarcode }: any, idx: number) => {
                        const selected = returnedItems.some(item =>
                          normalizeBarcode(item.barcode) === normalizeBarcode(matchedBarcode.code) || (matchedBarcode.id && sameId(item.product_barcode_id || item.barcode_id, matchedBarcode.id))
                        );
                        return (
                          <button
                            key={`${matchedBarcode.code}-${idx}`}
                            type="button"
                            disabled={selected}
                            onClick={() => addReturnedItem(orderItem, matchedBarcode)}
                            className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${selected
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                              : 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-300 border-red-100 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/20'
                            }`}
                            title={orderItem.product_name || orderItem.product?.name || orderItem.name}
                          >
                            {matchedBarcode.code}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 scrollbar-thin">
                  {returnedItems.map((item, index) => (
                    <div key={index} className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group/item animate-in fade-in slide-in-from-left-4 duration-300">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-xs font-black text-gray-400 group-hover/item:bg-red-50 group-hover/item:text-red-500 transition-colors">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{item.product_name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{item.barcode}</p>
                            {item.force_legacy_barcode && <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[9px] font-black uppercase tracking-widest">Forced legacy return</span>}
                            <p className="text-[10px] text-gray-500 mt-1">Product price: ৳{Number(item.listed_unit_price || 0).toLocaleString()} • Sold at: ৳{Number(item.sold_at_unit_price || 0).toLocaleString()} • Item discount: ৳{Number(item.item_discount_amount || 0).toLocaleString()} • Order discount: ৳{Number(item.order_discount_amount || 0).toLocaleString()}</p>
                          </div>
                        </div>
                        <button onClick={() => removeReturnedItem(index)} className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Manual Sold At Price</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.manual_sold_at_input ?? formatMoney(item.manual_sold_at_price)}
                            onChange={(e) => updateReturnedItemSoldAtPrice(index, e.target.value)}
                            onBlur={() => normalizeReturnedItemSoldAtPrice(index)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-red-500 outline-none text-sm font-black"
                          />
                        </div>
                        <p className="text-right text-sm font-black text-gray-900 dark:text-white">Return Value: ৳{formatMoney(item.total_price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="col-span-12 lg:col-span-4">
              <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 border border-gray-200 dark:border-gray-700 shadow-2xl sticky top-0">
                <h3 className="font-black text-gray-900 dark:text-white text-lg mb-8 flex items-center gap-3 uppercase tracking-tighter">
                  <Calculator className="w-6 h-6 text-red-500" />
                  Refund Status
                </h3>

                <div className="space-y-6">
                  <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <span>Scanned Value</span>
                        <span className="text-gray-900 dark:text-white">৳{formatMoney(totals.returnAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <span>Customer Paid</span>
                        <span className="text-blue-500">৳{formatMoney(totals.totalPaid)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {(isReturnQuoteLoading || returnQuoteError) && (
                    <div className={`rounded-2xl p-3 text-[10px] font-black uppercase tracking-widest ${returnQuoteError ? 'bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400' : 'bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-400'}`}>
                      {returnQuoteError || 'Calculating refund from server…'}
                    </div>
                  )}

                  {returnQuote && (
                    <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 p-4 space-y-2 text-[10px] font-black uppercase tracking-widest">
                      <div className="flex justify-between text-gray-500"><span>Original order payable</span><span>৳{formatMoney(returnQuote.source_order_total)}</span></div>
                      <div className="flex justify-between text-gray-500"><span>Money currently paid</span><span>৳{formatMoney(returnQuote.source_order_paid)}</span></div>
                      <div className="flex justify-between text-gray-500"><span>Previously refunded</span><span>৳{formatMoney(returnQuote.source_order_refunded)}</span></div>
                      <div className="flex justify-between text-gray-500"><span>Current outstanding</span><span>৳{formatMoney(returnQuote.source_order_outstanding)}</span></div>
                    </div>
                  )}

                  <div className="pt-6 border-t-4 border-gray-50 dark:border-gray-900">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Refund Due</span>
                      <span className={`text-3xl font-black tracking-tighter ${totals.refundToCustomer > 0 ? 'text-green-500' : 'text-gray-900 dark:text-white'}`}>
                        ৳{formatMoney(totals.refundToCustomer)}
                      </span>
                    </div>
                  </div>

                  <div className={`rounded-2xl p-3 text-[10px] font-black uppercase tracking-widest ${allowPartialRefunds ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/10 dark:text-blue-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/10 dark:text-amber-400'}`}>
                    {allowPartialRefunds ? 'Partial refund is enabled: this return can be processed with a remaining refund balance.' : 'Partial refund is disabled: full refund must be entered before processing.'}
                  </div>

                  {(
                    <div className="pt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Refund Process</h4>
                        <button onClick={() => setShowNoteCounter(!showNoteCounter)} className={`text-[9px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest transition-all ${showNoteCounter ? 'bg-black text-white' : 'bg-green-50 text-green-600'}`}>
                          {showNoteCounter ? 'Close Counter' : 'Note Counter'}
                        </button>
                      </div>

                      {showNoteCounter && (
                        <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95">
                          {Object.keys(notes).reverse().map(val => (
                            <div key={val} className="flex items-center justify-between gap-2">
                              <span className="text-[9px] font-black text-gray-400 w-8">৳{val}</span>
                              <input type="number" min="0" value={notes[val as unknown as keyof typeof notes]} onChange={(e) => setNotes(prev => ({ ...prev, [val]: parseInt(e.target.value) || 0 }))} className="w-16 px-2 py-1 bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-lg text-xs font-black text-center" />
                            </div>
                          ))}
                          <div className="col-span-2 pt-3 mt-1 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase">Cash Total:</span>
                            <span className="text-xs font-black text-green-600">৳{formatMoney(cashFromNotes)}</span>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        {[
                          { id: 'cash', label: 'CASH', val: cashFromNotesCents > 0 ? formatMoney(cashFromNotes) : refundDetails.cash, readOnly: cashFromNotesCents > 0 },
                          { id: 'card', label: 'CARD', val: refundDetails.card, readOnly: false },
                          { id: 'bkash', label: 'BKASH', val: refundDetails.bkash, readOnly: false },
                          { id: 'nagad', label: 'NAGAD', val: refundDetails.nagad, readOnly: false }
                        ].map((m) => (
                          <div key={m.id} className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-green-500 transition-colors">
                              <span className="text-[9px] font-black uppercase tracking-tighter">{m.label}</span>
                            </div>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={String(m.val ?? '')}
                              readOnly={m.readOnly}
                              onChange={(e) => {
                                if (!isMoneyInput(e.target.value)) return;
                                setRefundDetails(prev => ({ ...prev, [m.id]: e.target.value }));
                                if (m.id === 'cash') setNotes({ 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 });
                              }}
                              className={`w-full pl-16 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-green-500 rounded-2xl outline-none transition-all text-sm font-black text-right ${m.readOnly ? 'bg-green-50/50' : ''}`}
                              placeholder="0.00"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <span>Processed</span>
                          <span className="text-gray-900 dark:text-white">৳{formatMoney(totalRefundProcessed)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Remaining</span>
                          <span className={`text-xl font-black tracking-tighter ${remainingRefund > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                            ৳{formatMoney(remainingRefund)}
                          </span>
                        </div>
                        {refundOverpaid && (
                          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-red-500">Refund entered is higher than refund due.</p>
                        )}
                        {refundBlocking && (
                          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-amber-500">Enter full refund or enable partial refund from Returns page.</p>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleProcessReturn}
                    disabled={isProcessing || isReturnQuoteLoading || !returnQuote || Boolean(returnQuoteError) || returnedItems.length === 0 || refundOverpaid || refundBlocking}
                    className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-3xl font-black text-xl shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 flex items-center justify-center gap-4 mt-8"
                  >
                    {isProcessing ? (
                      <div className="w-6 h-6 border-4 border-gray-300 border-t-white dark:border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <RotateCcw className="w-6 h-6" />
                        {forceLegacyEnabled ? 'COMPLETE FORCE RETURN' : 'COMPLETE RETURN'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
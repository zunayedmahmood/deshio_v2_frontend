import { useState } from 'react';
import { Barcode, Trash2, X } from 'lucide-react';
import productReturnService from '@/services/productReturnService';

interface ReceivePendingExchangeReturnModalProps {
  ret: any;
  onClose: () => void;
  onDone: () => void;
}

type StagedBarcode = {
  barcode: string;
  force?: boolean;
  force_order_item_id?: number;
};

export default function ReceivePendingExchangeReturnModal({ ret, onClose, onDone }: ReceivePendingExchangeReturnModalProps) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [stagedBarcodes, setStagedBarcodes] = useState<StagedBarcode[]>([]);
  const [qualityPassed, setQualityPassed] = useState(true);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const items = Array.isArray(ret?.return_items) ? ret.return_items : [];
  const requiredQty = Number(ret?.pending_exchange_required_qty ?? items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0));
  const receivedQty = Number(ret?.pending_exchange_received_qty ?? items.reduce((sum: number, item: any) => sum + (Array.isArray(item.returned_barcode_ids) ? item.returned_barcode_ids.length : 0), 0));
  const pendingItems = items.filter((item: any) => {
    const received = Array.isArray(item.returned_barcode_ids) ? item.returned_barcode_ids.length : 0;
    return item.order_item_id && received < Number(item.quantity || 0);
  });

  const normalizeBarcode = (value: string) => value.trim().toLowerCase();

  const stageInput = () => {
    const codes = barcodeInput
      .split(/[\n,\s]+/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (codes.length === 0) return;

    setStagedBarcodes((current) => {
      const seen = new Set(current.map((row) => normalizeBarcode(row.barcode)));
      const next = [...current];
      for (const code of codes) {
        const key = normalizeBarcode(code);
        if (!seen.has(key)) {
          next.push({ barcode: code });
          seen.add(key);
        }
      }
      return next;
    });
    setBarcodeInput('');
    setError('');
  };

  const setForceItem = (index: number, force: boolean, orderItemId?: number) => {
    setStagedBarcodes((current) => current.map((row, rowIndex) => rowIndex === index
      ? { ...row, force, force_order_item_id: force ? (orderItemId || undefined) : undefined }
      : row));
  };

  const removeStaged = (index: number) => {
    setStagedBarcodes((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleReceive = async () => {
    if (stagedBarcodes.length === 0) {
      setError('Scan at least one returned barcode.');
      return;
    }

    const barcodes = stagedBarcodes
      .filter((row) => !row.force)
      .map((row) => row.barcode);
    const forced_barcodes = stagedBarcodes
      .filter((row) => row.force && row.force_order_item_id)
      .map((row) => ({ barcode: row.barcode, order_item_id: Number(row.force_order_item_id) }));

    setLoading(true);
    setError('');
    try {
      await productReturnService.receivePendingExchangeReturn(Number(ret.id), {
        barcodes,
        forced_barcodes,
        quality_check_passed: qualityPassed,
        quality_check_notes: notes || undefined,
      });
      onDone();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to receive pending exchange return';
      setError(message.includes('was not found')
        ? `${message} If this is an existing historical identity from the exact expected item, choose Force Return and submit again; otherwise it cannot be force-created.`
        : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <Barcode className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">Receive Pending Exchange Return</h3>
              <p className="text-xs text-gray-500">{ret?.return_number || `Return #${ret?.id}`} • received {receivedQty}/{requiredQty}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
          {error && <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</div>}

          <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-3 text-xs text-orange-800 dark:text-orange-300 leading-relaxed">
            Scan the physical original only after it comes back. <strong>Force Return</strong> stays order-scoped: an existing historical identity can be recovered, and an accidentally deleted barcode row can be recreated only when the original order still proves that exact sold barcode. Random codes remain blocked.
          </div>

          {items.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 text-[10px] font-black text-gray-500 uppercase tracking-widest">Expected returned items</div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((item: any, idx: number) => {
                  const got = Array.isArray(item.returned_barcode_ids) ? item.returned_barcode_ids.length : 0;
                  return (
                    <div key={`${item.order_item_id || item.product_id}-${idx}`} className="px-3 py-2 text-xs flex items-center justify-between gap-3">
                      <span className="font-semibold text-gray-900 dark:text-white">{item.product_name || `Product #${item.product_id}`}</span>
                      <span className="font-black text-orange-600">{got}/{Number(item.quantity || 0)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              stageInput();
            }}
            className="space-y-2"
          >
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">Scan Returned Barcode</label>
            <div className="flex gap-2">
              <input
                value={barcodeInput}
                onChange={(event) => setBarcodeInput(event.target.value)}
                className="flex-1 px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Scan barcode and press Enter"
                autoFocus
              />
              <button type="submit" className="px-4 py-2 text-xs font-black uppercase tracking-widest bg-gray-900 dark:bg-white text-white dark:text-black rounded-lg">Add</button>
            </div>
            <p className="text-[10px] text-gray-500">You can paste multiple barcodes separated by line, comma, or space. Each scanned barcode is kept in the list below, so Force Return never requires typing it again.</p>
          </form>

          {stagedBarcodes.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Scanned for this receipt</p>
              {stagedBarcodes.map((row, index) => (
                <div key={`${row.barcode}-${index}`} className={`rounded-xl border p-3 ${row.force ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20' : 'border-gray-200 dark:border-gray-700'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-mono font-black text-gray-900 dark:text-white break-all">{row.barcode}</span>
                    <button type="button" onClick={() => removeStaged(index)} className="p-1.5 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
                      <input
                        type="checkbox"
                        checked={Boolean(row.force)}
                        onChange={(event) => {
                          if (!event.target.checked) {
                            setForceItem(index, false);
                            return;
                          }
                          const onlyPendingItemId = pendingItems.length === 1 ? Number(pendingItems[0].order_item_id) : undefined;
                          setForceItem(index, true, onlyPendingItemId);
                        }}
                        className="w-4 h-4 accent-amber-600"
                      />
                      Force Return
                    </label>
                    {Boolean(row.force) && pendingItems.length > 1 && (
                      <select
                        value={row.force_order_item_id || ''}
                        onChange={(event) => setForceItem(index, true, event.target.value ? Number(event.target.value) : undefined)}
                        className="flex-1 px-2 py-1.5 text-xs border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      >
                        <option value="">Select exact expected item</option>
                        {pendingItems.map((item: any) => (
                          <option key={item.order_item_id} value={item.order_item_id}>
                            {item.product_name || `Product #${item.product_id}`} — Item #{item.order_item_id}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {Boolean(row.force) && <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">Deshio will repair/stage this legacy identity only inside the successful receive transaction.</p>}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setQualityPassed(true)}
              className={`px-3 py-2 text-xs rounded-lg border font-semibold ${qualityPassed ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}
            >
              QC Passed — return to stock
            </button>
            <button
              type="button"
              onClick={() => setQualityPassed(false)}
              className={`px-3 py-2 text-xs rounded-lg border font-semibold ${!qualityPassed ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}
            >
              QC Failed — mark defective
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              placeholder="Condition, courier note, defect note..."
            />
          </div>
        </div>

        <div className="px-6 pb-6 pt-3 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
          <button onClick={handleReceive} disabled={loading || stagedBarcodes.length === 0 || stagedBarcodes.some((row) => row.force && !row.force_order_item_id)} className="flex-1 px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50 font-bold">
            {loading ? 'Receiving...' : 'Receive Scanned Items'}
          </button>
        </div>
      </div>
    </div>
  );
}

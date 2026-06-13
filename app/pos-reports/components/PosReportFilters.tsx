'use client';

import { Filter, RefreshCw } from 'lucide-react';
import type { PosFiltersPayload, PosReportFilters as PosReportFilterState } from '@/services/posReportsService';
import { joinIds, today } from './posReportUtils';

function idsFromCsv(value?: string) {
  return (value || '').split(',').map((v) => v.trim()).filter(Boolean);
}

function toggleId(csv: string | undefined, id: number) {
  const ids = idsFromCsv(csv);
  const value = String(id);
  const next = ids.includes(value) ? ids.filter((x) => x !== value) : [...ids, value];
  return joinIds(next);
}

function OptionCheck({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-700 hover:bg-stone-100 dark:text-gray-300 dark:hover:bg-gray-800">
      <input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 rounded border-gray-300" />
      <span className="truncate">{label}</span>
    </label>
  );
}

export default function PosReportFilters({
  filters,
  options,
  loading,
  onChange,
  onApply,
}: {
  filters: PosReportFilterState;
  options: PosFiltersPayload | null;
  loading?: boolean;
  onChange: (patch: Partial<PosReportFilterState>) => void;
  onApply: () => void;
}) {
  const storeIds = idsFromCsv(filters.store_ids);
  const categoryIds = idsFromCsv(filters.category_ids);
  const productIds = idsFromCsv(filters.product_ids);

  const quickRange = (days: number) => onChange({ from: today(-(days - 1)), to: today() });
  const currentMonth = () => {
    const d = new Date();
    onChange({ from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`, to: today() });
  };

  return (
    <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
          <Filter className="h-4 w-4" />
          Report Controls
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => quickRange(7)} className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-stone-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Last 7 Days</button>
          <button onClick={() => quickRange(30)} className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-stone-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Last 30 Days</button>
          <button onClick={() => quickRange(90)} className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-stone-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Last 90 Days</button>
          <button onClick={currentMonth} className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-stone-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">This Month</button>
          <button
            onClick={onApply}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-xs font-black text-white disabled:opacity-60 dark:bg-white dark:text-gray-900"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Apply / Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <div>
          <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-gray-500">From</label>
          <input type="date" value={filters.from || ''} onChange={(e) => onChange({ from: e.target.value })} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-gray-500">To</label>
          <input type="date" value={filters.to || ''} onChange={(e) => onChange({ to: e.target.value })} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-gray-500">Exact SKU</label>
          <input list="pos-report-skus" value={filters.sku || ''} onChange={(e) => onChange({ sku: e.target.value })} placeholder="Optional SKU" className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100" />
          <datalist id="pos-report-skus">
            {(options?.skus || []).map((sku) => <option key={sku} value={sku} />)}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-gray-500">Exact Product</label>
          <select value={productIds[0] || ''} onChange={(e) => onChange({ product_ids: e.target.value })} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100">
            <option value="">All products</option>
            {(options?.products || []).map((product) => (
              <option key={product.id} value={product.id}>{product.name} {product.sku ? `(${product.sku})` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-gray-500">Sort Products</label>
          <select value={filters.sort || 'sales'} onChange={(e) => onChange({ sort: e.target.value as any })} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100">
            <option value="sales">Sales high to low</option>
            <option value="profit">Profit high to low</option>
            <option value="units">Units high to low</option>
            <option value="margin">Margin high to low</option>
            <option value="stock">Stock high to low</option>
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-stone-200 p-3 dark:border-gray-800">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Stores</span>
            <button onClick={() => onChange({ store_ids: '' })} className="text-[11px] font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white">Clear</button>
          </div>
          <div className="max-h-36 overflow-y-auto">
            {(options?.stores || []).map((store) => (
              <OptionCheck key={store.id} checked={storeIds.includes(String(store.id))} onToggle={() => onChange({ store_ids: toggleId(filters.store_ids, store.id) })} label={`${store.name || 'Store'}${store.store_code ? ` · ${store.store_code}` : ''}`} />
            ))}
            {!options?.stores?.length ? <p className="text-xs text-gray-500">No stores loaded.</p> : null}
          </div>
        </div>
        <div className="rounded-xl border border-stone-200 p-3 dark:border-gray-800">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Categories</span>
            <button onClick={() => onChange({ category_ids: '' })} className="text-[11px] font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white">Clear</button>
          </div>
          <div className="max-h-36 overflow-y-auto">
            {(options?.categories || []).map((category) => (
              <OptionCheck key={category.id} checked={categoryIds.includes(String(category.id))} onToggle={() => onChange({ category_ids: toggleId(filters.category_ids, category.id) })} label={category.title || category.name || 'Category'} />
            ))}
            {!options?.categories?.length ? <p className="text-xs text-gray-500">No categories loaded.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

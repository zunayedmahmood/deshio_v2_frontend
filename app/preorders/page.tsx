'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTheme } from "@/contexts/ThemeContext";
import Link from 'next/link';
import { AlertCircle, Eye, Loader2, RefreshCw, Search, Plus, X, Ban, CalendarDays, ImageIcon, Pencil, Trash2, Save, Minus } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import type { Order as BackendOrder } from '@/services/orderService';
import axios from '@/lib/axios';
import ImageLightboxModal from '@/components/ImageLightboxModal';
import { toAbsoluteAssetUrl } from '@/lib/assetUrl';

type AlertType = 'success' | 'error';

const Alert = ({ type, message, onClose }: { type: AlertType; message: string; onClose: () => void }) => (
  <div
    className={`fixed top-4 right-4 z-50 flex items-start gap-2 px-4 py-3 rounded-lg shadow-lg ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`}
    role="alert"
  >
    <AlertCircle className="w-5 h-5 mt-0.5" />
    <div className="text-sm">
      <div className="font-semibold">{type === 'success' ? 'Success' : 'Error'}</div>
      <div className="opacity-95">{message}</div>
    </div>
    <button
      onClick={onClose}
      className="ml-2 p-1 rounded hover:bg-white/15 transition-colors"
      aria-label="Close alert"
      type="button"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);

const Modal = ({
  isOpen,
  title,
  onClose,
  children,
}: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
            type="button"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

const normalize = (v: any) => String(v ?? '').trim().toLowerCase();

const statusBadge = (value?: string | null) => {
  const s = normalize(value);
  const cls =
    s === 'completed' || s === 'delivered'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : s === 'confirmed'
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      : s === 'processing' || s === 'pending'
      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      : s === 'cancelled' || s === 'canceled' || s === 'failed'
      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';

  const label = value ? String(value).replace(/_/g, ' ') : 'N/A';

  return <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
};

const formatDateTime = (v?: string | null) => {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString();
};

export default function PreordersPage() {
  const { darkMode, setDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const [selected, setSelected] = useState<BackendOrder | null>(null);

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>('');

  const [editingOrder, setEditingOrder] = useState<BackendOrder | null>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editNotes, setEditNotes] = useState<string>('');
  const [editCustomerName, setEditCustomerName] = useState<string>('');
  const [editCustomerPhone, setEditCustomerPhone] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [productSearchResults, setProductSearchResults] = useState<any[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState<boolean>(false);

  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null);

  const handleOpenEditModal = (order: BackendOrder) => {
    setEditingOrder(order);
    setEditNotes(order.preorder_notes || (order as any).notes || '');
    setEditCustomerName(order.customer?.name || '');
    setEditCustomerPhone(order.customer?.phone || '');
    setEditItems(
      (order.items || []).filter((it: any) => it.item_type !== 'service').map((it: any) => ({
        id: it.id,
        product_id: it.product_id,
        product_name: it.product_name || it.name || 'Product',
        product_sku: it.product_sku || it.sku || '',
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
        discount_amount: Number(it.discount_amount) || 0,
        image_url: it.image_url || it.product_image || (it.images && it.images[0]?.image_url),
      }))
    );
    setProductSearchQuery('');
    setProductSearchResults([]);
  };

  const handleSearchProducts = async (q: string) => {
    setProductSearchQuery(q);
    if (!q.trim()) {
      setProductSearchResults([]);
      return;
    }
    setIsSearchingProducts(true);
    try {
      const res = await axios.get('/products', { params: { search: q.trim(), per_page: 10 } });
      const payload = res.data?.data;
      const list = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
      setProductSearchResults(list);
    } catch {
      setProductSearchResults([]);
    } finally {
      setIsSearchingProducts(false);
    }
  };

  const handleAddProductToEdit = (prod: any) => {
    const primaryImg = prod.primary_image_url || (prod.images && prod.images[0]?.image_url) || null;
    const existingIdx = editItems.findIndex((it) => Number(it.product_id) === Number(prod.id));

    if (existingIdx >= 0) {
      setEditItems((prev) =>
        prev.map((it, idx) => (idx === existingIdx ? { ...it, quantity: it.quantity + 1 } : it))
      );
    } else {
      setEditItems((prev) => [
        ...prev,
        {
          id: null,
          product_id: prod.id,
          product_name: prod.name,
          product_sku: prod.sku,
          quantity: 1,
          unit_price: Number(prod.base_price || prod.sell_price || 0),
          discount_amount: 0,
          image_url: primaryImg,
        },
      ]);
    }

    setProductSearchQuery('');
    setProductSearchResults([]);
  };

  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    const qty = Math.max(1, newQty);
    setEditItems((prev) => prev.map((it, idx) => (idx === index ? { ...it, quantity: qty } : it)));
  };

  const handleUpdateItemUnitPrice = (index: number, newPrice: number) => {
    const price = Math.max(0, newPrice);
    setEditItems((prev) => prev.map((it, idx) => (idx === index ? { ...it, unit_price: price } : it)));
  };

  const handleRemoveItemFromEdit = (index: number) => {
    setEditItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveEditPreorder = async () => {
    if (!editingOrder) return;
    const hasServiceMention = Boolean((editingOrder.items || []).some((it: any) => it.item_type === 'service'));
    if (editItems.length === 0 && !hasServiceMention) {
      setAlert({ type: 'error', message: 'Preorder must contain at least one product or service mention.' });
      return;
    }

    setIsSavingEdit(true);
    try {
      const response = await axios.patch(`/pre-orders/${editingOrder.id}`, {
        customer_name: editCustomerName,
        customer_phone: editCustomerPhone,
        preorder_notes: editNotes,
        notes: `[PREORDER] ${editNotes}`.trim(),
        items: editItems.map((it) => ({
          ...(it.id ? { id: it.id } : {}),
          product_id: it.product_id,
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount_amount: it.discount_amount || 0,
        })),
      });

      if (response.data?.success === false) {
        throw new Error(response.data?.message || 'Failed to update preorder');
      }

      setAlert({ type: 'success', message: 'Preorder updated successfully!' });
      setEditingOrder(null);
      setSelected(null);
      await fetchPreorders();
    } catch (e: any) {
      setAlert({ type: 'error', message: e?.response?.data?.message || e?.message || 'Failed to update preorder' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const hasDateRangeError = !!dateFrom && !!dateTo && dateFrom > dateTo;

  const fetchPreorders = async () => {
    if (hasDateRangeError) {
      const msg = 'From date cannot be after To date.';
      setError(msg);
      setAlert({ type: 'error', message: msg });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Use the dedicated preorder endpoint. The previous implementation fetched only
      // the newest 200 generic orders and filtered them in the browser, which caused
      // valid preorders to disappear as normal order volume increased.
      const perPage = 500;
      let page = 1;
      let lastPage = 1;
      const allOrders: BackendOrder[] = [];

      do {
        const response = await axios.get('/pre-orders', {
          params: {
            per_page: perPage,
            page,
            search: query.trim() || undefined,
            status: status || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            date_field: 'order_date',
          },
        });
        const payload = response?.data?.data;
        const data = Array.isArray(payload?.orders) ? payload.orders : [];
        allOrders.push(...(data as BackendOrder[]));

        const pagination = payload?.pagination || {};
        lastPage = Number(pagination.last_page || page) || page;
        page += 1;
      } while (page <= lastPage && page <= 50);

      setOrders(allOrders);
    } catch (e: any) {
      const msg = e?.message || 'Failed to load preorders';
      setError(msg);
      setAlert({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const canCancelPreorder = (order: BackendOrder | null | undefined) => {
    const s = normalize(order?.status);
    return !!order && !['cancelled', 'canceled', 'completed', 'delivered', 'refunded'].includes(s);
  };

  const handleCancelPreorder = async (order: BackendOrder) => {
    if (!canCancelPreorder(order)) {
      setAlert({ type: 'error', message: 'This preorder cannot be cancelled from this page.' });
      return;
    }

    const confirmed = window.confirm(`Cancel preorder ${order.order_number}?`);
    if (!confirmed) return;

    const reason = window.prompt('Cancellation reason', 'Customer cancelled preorder') || 'Cancelled from preorder page';
    setCancellingId(order.id);
    try {
      const response = await axios.post(`/pre-orders/${order.id}/cancel`, { reason });
      if (response.data?.success === false) {
        throw new Error(response.data?.message || 'Failed to cancel preorder');
      }
      setAlert({ type: 'success', message: 'Preorder cancelled successfully' });
      setSelected(null);
      await fetchPreorders();
    } catch (e: any) {
      setAlert({ type: 'error', message: e?.response?.data?.message || e?.message || 'Failed to cancel preorder' });
    } finally {
      setCancellingId(null);
    }
  };


  const handleClearFilters = () => {
    setQuery('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
  };

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved) setDarkMode(saved === 'true');
    fetchPreorders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchPreorders();
    }, 400);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return orders.filter((o) => {
      const anyO: any = o as any;

      const orderNo = normalize(o.order_number);
      const customerName = normalize(o.customer?.name);
      const phone = normalize(o.customer?.phone);
      const notes = normalize(anyO.notes);

      const matchesQuery =
        !q || orderNo.includes(q) || customerName.includes(q) || phone.includes(q) || notes.includes(q);

      const matchesStatus = !status || normalize(o.status) === normalize(status);
      const rawDate = o.created_at || o.order_date || '';
      const dateKey = rawDate ? String(rawDate).slice(0, 10) : '';
      const matchesDateFrom = !dateFrom || (dateKey && dateKey >= dateFrom);
      const matchesDateTo = !dateTo || (dateKey && dateKey <= dateTo);

      return matchesQuery && matchesStatus && matchesDateFrom && matchesDateTo;
    });
  }, [orders, query, status, dateFrom, dateTo]);

  return (
    <div className={`${darkMode ? 'dark' : ''} flex min-h-screen`}>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
        <Header darkMode={darkMode} setDarkMode={setDarkMode} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Preorders</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Standalone demand notes only. They do not create orders, reserve stock, assign stores, or affect sales and profit reports.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchPreorders}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                type="button"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <Link
                href="/pre-order"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New preorder
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Preorder no, customer, phone, product, notes..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preorder status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="stock_available">Stock currently available</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From date</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To date</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {hasDateRangeError && (
                <div className="md:col-span-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                  From date cannot be after To date. Please fix the date range before searching.
                </div>
              )}

              <div className="md:col-span-4 flex flex-wrap gap-2 justify-end">
                <button
                  onClick={fetchPreorders}
                  disabled={hasDateRangeError}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors text-sm"
                  type="button"
                >
                  <Search className="w-4 h-4" />
                  Search preorders
                </button>
                <button
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                  type="button"
                >
                  Clear filters
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-700 dark:text-gray-200">
                Showing <span className="font-semibold">{filtered.length}</span> preorder(s)
              </div>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              )}
            </div>

            {error && (
              <div className="px-4 py-3 text-sm text-red-600 dark:text-red-300 border-b border-gray-200 dark:border-gray-700">
                {error}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Preorder
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Products
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Record Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {!loading && filtered.length === 0 ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm text-gray-600 dark:text-gray-300" colSpan={7}>
                        No preorders found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{o.order_number}</div>
                            <span className="rounded bg-teal-600 px-1.5 py-0.5 text-[10px] font-bold text-white">PREORDER</span>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-300">
                            Items: {o.items?.length ?? 0} • Informational total: {o.total_amount}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 max-w-xs overflow-x-auto py-1">
                            {o.items && o.items.length > 0 ? (
                              o.items.map((it: any, idx: number) => {
                                const rawUrl = it.image_url || it.product_image || it.product?.primary_image_url || (it.images && it.images[0]?.image_url);
                                const imgSrc = toAbsoluteAssetUrl(rawUrl);
                                const pName = it.product_name || it.name || 'Product';

                                return (
                                  <div key={it.id || idx} className="flex-shrink-0">
                                    {imgSrc ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setLightboxSrc(imgSrc);
                                          setLightboxTitle(`${pName} (Preorder #${o.order_number})`);
                                        }}
                                        className="relative w-10 h-10 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 hover:ring-2 hover:ring-blue-500 transition-all flex items-center justify-center group"
                                        title={`${pName} - Click to enlarge`}
                                      >
                                        <img
                                          src={imgSrc}
                                          alt={pName}
                                          className="w-full h-full object-cover"
                                        />
                                      </button>
                                    ) : (
                                      <div className="w-10 h-10 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400" title={pName}>
                                        <ImageIcon className="w-5 h-5" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{o.customer?.name || '-'}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300">{o.customer?.phone || '-'}</div>
                        </td>

                        <td className="px-4 py-3 text-sm">
                          <span className="inline-flex rounded-full bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">PREORDER NOTE</span>
                          <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">No order / no reservation</div>
                        </td>

                        <td className="px-4 py-3 text-sm">{statusBadge(o.status)}</td>

                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{formatDateTime(o.created_at || o.order_date)}</td>

                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelected(o)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                              type="button"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(o)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm"
                              type="button"
                            >
                              <Pencil className="w-4 h-4" />
                              Edit
                            </button>
                            {canCancelPreorder(o) && (
                              <button
                                onClick={() => handleCancelPreorder(o)}
                                disabled={cancellingId === o.id}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm disabled:opacity-60"
                                type="button"
                              >
                                {cancellingId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* View Preorder Modal */}
      <Modal
        isOpen={!!selected}
        title={selected ? `Preorder ${selected.order_number}` : 'Preorder'}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">Customer</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selected.customer?.name || '-'}</div>
                <div className="text-sm text-gray-700 dark:text-gray-200">{selected.customer?.phone || '-'}</div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">Record type</div>
                <div className="text-sm font-semibold text-teal-700 dark:text-teal-300">PREORDER NOTE</div>
                <div className="text-sm text-gray-700 dark:text-gray-200">Standalone from all order workflows</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
                <div className="mt-1">{statusBadge(selected.status)}</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">Financial impact</div>
                <div className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">Not counted in sales or profit</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">Created</div>
                <div className="text-sm text-gray-900 dark:text-gray-100 mt-1">{formatDateTime(selected.created_at || selected.order_date)}</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</div>
              <div className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{(selected as any).notes || '-'}</div>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Preorder Items</div>
              {selected.items?.length ? (
                <div className="space-y-3">
                  {selected.items.map((it: any, idx: number) => {
                    const rawUrl = it.image_url || it.product_image || it.product?.primary_image_url || (it.images && it.images[0]?.image_url);
                    const imgSrc = toAbsoluteAssetUrl(rawUrl);
                    const pName = it.product_name || it.name || 'Item';

                    return (
                      <div key={it.id || `${it.product_id}-${idx}`} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3">
                          {imgSrc ? (
                            <button
                              type="button"
                              onClick={() => {
                                setLightboxSrc(imgSrc);
                                setLightboxTitle(pName);
                              }}
                              className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 hover:opacity-90 hover:ring-2 hover:ring-blue-500 transition-all flex-shrink-0"
                              title="Click to view full image"
                            >
                              <img src={imgSrc} alt={pName} className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <div className="w-14 h-14 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-gray-400 flex-shrink-0">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{pName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">SKU: {it.product_sku || it.sku || '-'}</div>
                            {it.unit_price ? (
                              <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">Price: ৳{it.unit_price}</div>
                            ) : null}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Qty: {it.quantity}</div>
                          {it.total_amount ? (
                            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">Total: ৳{it.total_amount}</div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-700 dark:text-gray-200">No items returned by API for this order.</div>
              )}
            </div>

            <div className="flex justify-between items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  const orderToEdit = selected;
                  setSelected(null);
                  handleOpenEditModal(orderToEdit);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
                type="button"
              >
                <Pencil className="w-4 h-4" />
                Edit Preorder Items
              </button>

              {selected && canCancelPreorder(selected) && (
                <button
                  onClick={() => handleCancelPreorder(selected)}
                  disabled={cancellingId === selected.id}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm disabled:opacity-60"
                  type="button"
                >
                  {cancellingId === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                  Cancel preorder
                </button>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Edit Preorder Modal */}
      <Modal
        isOpen={!!editingOrder}
        title={editingOrder ? `Edit Preorder ${editingOrder.order_number}` : 'Edit Preorder'}
        onClose={() => setEditingOrder(null)}
      >
        {editingOrder ? (
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Phone</label>
                <input
                  type="text"
                  value={editCustomerPhone}
                  onChange={(e) => setEditCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Preorder Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Optional notes for this preorder..."
              />
            </div>

            {/* Product Search and Add Section */}
            <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
                Add Product to Preorder
              </label>
              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 absolute left-3 text-gray-400" />
                  <input
                    type="text"
                    value={productSearchQuery}
                    onChange={(e) => handleSearchProducts(e.target.value)}
                    placeholder="Search product by name or SKU to add..."
                    className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {isSearchingProducts && (
                    <Loader2 className="w-4 h-4 absolute right-3 animate-spin text-gray-400" />
                  )}
                </div>

                {/* Search Results Dropdown */}
                {productSearchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-50 divide-y divide-gray-100 dark:divide-gray-700">
                    {productSearchResults.map((prod) => {
                      const img = toAbsoluteAssetUrl(prod.primary_image_url || (prod.images && prod.images[0]?.image_url));
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleAddProductToEdit(prod)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          {img ? (
                            <img src={img} alt={prod.name} className="w-9 h-9 rounded object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 flex-shrink-0">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{prod.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">SKU: {prod.sku || '-'}</div>
                          </div>
                          <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            ৳{prod.base_price || prod.sell_price || 0}
                          </div>
                          <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400 ml-1" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Items Management List */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                <span>Preorder Items ({editItems.length})</span>
                <span>Total: ৳{editItems.reduce((acc, it) => acc + (it.quantity * it.unit_price - (it.discount_amount || 0)), 0)}</span>
              </div>

              {editItems.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                  No items in this preorder. Search above to add products.
                </div>
              ) : (
                editItems.map((it, idx) => {
                  const imgSrc = toAbsoluteAssetUrl(it.image_url);
                  const itemSubtotal = (it.quantity * it.unit_price) - (it.discount_amount || 0);

                  return (
                    <div key={it.id || `new-${it.product_id}-${idx}`} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {imgSrc ? (
                          <img src={imgSrc} alt={it.product_name} className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-gray-400 flex-shrink-0">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{it.product_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">SKU: {it.product_sku || '-'}</div>
                        </div>
                      </div>

                      {/* Editable Price */}
                      <div className="w-24">
                        <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Unit Price</label>
                        <input
                          type="number"
                          min="0"
                          value={it.unit_price}
                          onChange={(e) => handleUpdateItemUnitPrice(idx, Number(e.target.value))}
                          className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-right"
                        />
                      </div>

                      {/* Editable Quantity */}
                      <div>
                        <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 text-center">Qty</label>
                        <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 p-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQuantity(idx, it.quantity - 1)}
                            className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => handleUpdateItemQuantity(idx, Number(e.target.value))}
                            className="w-10 text-center text-xs bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQuantity(idx, it.quantity + 1)}
                            className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Item Total & Remove */}
                      <div className="text-right flex items-center gap-3">
                        <div className="w-20 text-xs font-semibold text-blue-600 dark:text-blue-400">
                          ৳{itemSubtotal}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItemFromEdit(idx)}
                          className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditPreorder}
                disabled={isSavingEdit || editItems.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ImageLightboxModal
        open={!!lightboxSrc}
        src={lightboxSrc || ''}
        title={lightboxTitle}
        onClose={() => setLightboxSrc(null)}
      />

      {alert ? <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} /> : null}
    </div>
  );
}

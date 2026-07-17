'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTheme } from "@/contexts/ThemeContext";
import Link from 'next/link';
import { AlertCircle, Eye, Loader2, RefreshCw, Search, Plus, X, Ban, CalendarDays } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import type { Order as BackendOrder } from '@/services/orderService';
import axios from '@/lib/axios';

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
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const [selected, setSelected] = useState<BackendOrder | null>(null);

  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null);

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
            payment_status: paymentStatus || undefined,
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
    setPaymentStatus('');
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
  }, [query, status, paymentStatus, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return orders.filter((o) => {
      const anyO: any = o as any;

      const orderNo = normalize(o.order_number);
      const customerName = normalize(o.customer?.name);
      const phone = normalize(o.customer?.phone);
      const storeName = normalize(o.store?.name);
      const notes = normalize(anyO.notes);

      const matchesQuery =
        !q || orderNo.includes(q) || customerName.includes(q) || phone.includes(q) || storeName.includes(q) || notes.includes(q);

      const matchesStatus = !status || normalize(o.status) === normalize(status);
      const matchesPay = !paymentStatus || normalize(o.payment_status) === normalize(paymentStatus);
      const rawDate = o.created_at || o.order_date || '';
      const dateKey = rawDate ? String(rawDate).slice(0, 10) : '';
      const matchesDateFrom = !dateFrom || (dateKey && dateKey >= dateFrom);
      const matchesDateTo = !dateTo || (dateKey && dateKey <= dateTo);

      return matchesQuery && matchesStatus && matchesPay && matchesDateFrom && matchesDateTo;
    });
  }, [orders, query, status, paymentStatus, dateFrom, dateTo]);

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
                View, date-search, and cancel preorder requests from the dedicated preorder queue.
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Order no, customer, phone, store, notes..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="partially_paid">Partially paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
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
                <div className="md:col-span-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                  From date cannot be after To date. Please fix the date range before searching.
                </div>
              )}

              <div className="md:col-span-5 flex flex-wrap gap-2 justify-end">
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
                      Order
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Store
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Payment
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
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{o.order_number}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300">
                            Items: {o.items?.length ?? 0} • Total: {o.total_amount}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{o.customer?.name || '-'}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300">{o.customer?.phone || '-'}</div>
                        </td>

                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{o.store?.name || '-'}</td>

                        <td className="px-4 py-3 text-sm">{statusBadge(o.status)}</td>

                        <td className="px-4 py-3 text-sm">{statusBadge(o.payment_status)}</td>

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
                <div className="text-xs text-gray-500 dark:text-gray-400">Store</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selected.store?.name || '-'}</div>
                <div className="text-sm text-gray-700 dark:text-gray-200">Order type: {selected.order_type_label || selected.order_type}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
                <div className="mt-1">{statusBadge(selected.status)}</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">Payment</div>
                <div className="mt-1">{statusBadge(selected.payment_status)}</div>
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
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Items</div>
              {selected.items?.length ? (
                <div className="space-y-2">
                  {selected.items.map((it: any) => (
                    <div key={it.id || `${it.product_id}-${it.batch_id}-${it.product_sku}`} className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{it.product_name || it.name || 'Item'}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">SKU: {it.product_sku || it.sku || '-'}</div>
                      </div>
                      <div className="text-sm text-gray-800 dark:text-gray-100">Qty: {it.quantity}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-700 dark:text-gray-200">No items returned by API for this order.</div>
              )}
            </div>

            {selected && canCancelPreorder(selected) && (
              <div className="flex justify-end">
                <button
                  onClick={() => handleCancelPreorder(selected)}
                  disabled={cancellingId === selected.id}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 transition-colors text-sm font-medium"
                  type="button"
                >
                  {cancellingId === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                  Cancel preorder
                </button>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {alert ? <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} /> : null}
    </div>
  );
}

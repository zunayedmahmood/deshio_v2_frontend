'use client';

import { useCallback, useMemo, useState } from 'react';
import { Download, ExternalLink, Loader2, RefreshCw, Truck } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import axiosInstance from '@/lib/axios';
import { useTheme } from '@/contexts/ThemeContext';

interface TrackingRow {
  shipment_id?: number | null;
  shipment_number?: string | null;
  order_id: number;
  order_number?: string | null;
  order_date?: string | null;
  order_status?: string | null;
  order_type?: string | null;
  payment_status?: string | null;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  shipping_amount: number;
  customer_name?: string | null;
  phone?: string | null;
  store_name?: string | null;
  consignment_id: string;
  tracking_url?: string | null;
  expected_cod: number;
  local_pathao_status?: string | null;
  transfer_status?: string | null;
  collected_amount?: number | null;
  collectable_amount?: number | null;
  transfer_status_updated_at?: string | null;
  pathao_created_at?: string | null;
  pathao_order_id?: number | null;
  pathao_state?: string | null;
  pathao_order_description?: string | null;
  pathao_payment_method?: string | null;
  pathao_recipient_name?: string | null;
  pathao_recipient_phone?: string | null;
  pathao_recipient_address?: string | null;
  refreshed_at?: string | null;
}

const localDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const money = (value: number | null | undefined) =>
  value == null
    ? '—'
    : `৳${Number(value).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-BD');
};

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export default function PathaoTrackingPage() {
  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState(localDate());
  const [dateTo, setDateTo] = useState(localDate());
  const [rows, setRows] = useState<TrackingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshingIds, setRefreshingIds] = useState<Set<number>>(new Set());
  const [refreshAllRunning, setRefreshAllRunning] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const totals = useMemo(() => {
    const expected = rows.reduce((sum, row) => sum + Number(row.expected_cod || 0), 0);
    const collected = rows.reduce((sum, row) => sum + Number(row.collected_amount || 0), 0);
    return { expected, collected };
  }, [rows]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await axiosInstance.get('/shipments/pathao-tracking', {
        params: { date_from: dateFrom, date_to: dateTo },
      });
      const data = Array.isArray(response.data?.data) ? response.data.data : [];
      setRows(data);
      setMessage(`${data.length} Pathao parcel${data.length === 1 ? '' : 's'} loaded.`);
    } catch (err: any) {
      setRows([]);
      setError(err?.response?.data?.message || err?.message || 'Failed to load Pathao parcels.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);
  const refreshOne = useCallback(async (orderId: number, silent = false) => {
    setRefreshingIds(prev => new Set(prev).add(orderId));
    if (!silent) {
      setError('');
      setMessage('');
    }

    try {
      const response = await axiosInstance.post(`/shipments/pathao-tracking/${orderId}/refresh`);
      const updated = response.data?.data as TrackingRow | undefined;
      if (updated) {
        setRows(prev => prev.map(row => row.order_id === orderId ? updated : row));
      }
      if (!silent) setMessage('Tracking refreshed from Pathao.');
      return { success: true };
    } catch (err: any) {
      const reason = err?.response?.data?.message || err?.message || 'Refresh failed.';
      if (!silent) setError(reason);
      return { success: false, reason };
    } finally {
      setRefreshingIds(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  }, []);

  const refreshAll = useCallback(async () => {
    if (!rows.length || refreshAllRunning) return;

    setRefreshAllRunning(true);
    setError('');
    setMessage('');
    setRefreshProgress({ done: 0, total: rows.length });

    let failed = 0;
    const queue = [...rows];
    const workerCount = Math.min(5, queue.length);

    const worker = async () => {
      while (queue.length) {
        const row = queue.shift();
        if (!row) return;
        const result = await refreshOne(row.order_id, true);
        if (!result.success) failed += 1;
        setRefreshProgress(prev => ({ ...prev, done: prev.done + 1 }));
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    setRefreshAllRunning(false);
    setMessage(failed ? `Refresh completed with ${failed} failed parcel${failed === 1 ? '' : 's'}.` : 'All parcels refreshed from Pathao.');
  }, [rows, refreshAllRunning, refreshOne]);

  const downloadCsv = () => {
    if (!rows.length) return;

    const headers = [
      'Order Number', 'Order Date', 'Order Type', 'Order Status', 'Payment Status',
      'Customer', 'Phone', 'Store', 'Order Total', 'Paid Amount', 'Outstanding Amount', 'Shipping Amount',
      'Consignment ID', 'Pathao Order ID', 'Transfer Status', 'Transfer Status Updated At',
      'Expected COD', 'Pathao Collectable Amount', 'Collected Amount', 'Pathao State',
      'Pathao Payment Method', 'Pathao Created At', 'Pathao Recipient Name',
      'Pathao Recipient Phone', 'Pathao Recipient Address', 'Pathao Order Description',
      'Last Refreshed At', 'Tracking URL',
    ];

    const lines = [headers.map(csvCell).join(',')];
    rows.forEach(row => {
      lines.push([
        row.order_number,
        row.order_date,
        row.order_type,
        row.order_status,
        row.payment_status,
        row.customer_name,
        row.phone,
        row.store_name,
        row.total_amount,
        row.paid_amount,
        row.outstanding_amount,
        row.shipping_amount,
        row.consignment_id,
        row.pathao_order_id,
        row.transfer_status,
        row.transfer_status_updated_at,
        row.expected_cod,
        row.collectable_amount,
        row.collected_amount,
        row.pathao_state,
        row.pathao_payment_method,
        row.pathao_created_at,
        row.pathao_recipient_name,
        row.pathao_recipient_phone,
        row.pathao_recipient_address,
        row.pathao_order_description,
        row.refreshed_at,
        row.tracking_url,
      ].map(csvCell).join(','));
    });

    const blob = new Blob(['\ufeff', lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pathao-tracking_${dateFrom}_${dateTo}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} darkMode={darkMode} />
      <div className="md:ml-64 min-h-screen">
        <Header
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          toggleSidebar={() => setSidebarOpen(prev => !prev)}
        />

        <main className="p-4 md:p-6 space-y-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/30 p-2.5">
                  <Truck className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pathao Tracking</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Date-wise Deshio orders with live Pathao transfer status and collected amount.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                From
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="mt-1 block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </label>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                To
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={e => setDateTo(e.target.value)}
                  className="mt-1 block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </label>
              <button
                type="button"
                onClick={loadRows}
                disabled={loading || refreshAllRunning}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Load
              </button>
              <button
                type="button"
                onClick={refreshAll}
                disabled={!rows.length || loading || refreshAllRunning}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {refreshAllRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {refreshAllRunning ? `Refreshing ${refreshProgress.done}/${refreshProgress.total}` : 'Refresh All'}
              </button>
              <button
                type="button"
                onClick={downloadCsv}
                disabled={!rows.length}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
              >
                <Download className="h-4 w-4" />
                Download CSV
              </button>
            </div>
          </div>

          {(message || error) && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${error
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
            }`}>
              {error || message}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs text-gray-500 dark:text-gray-400">Parcels</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{rows.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs text-gray-500 dark:text-gray-400">Expected COD</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{money(totals.expected)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs text-gray-500 dark:text-gray-400">Pathao Collected</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{money(totals.collected)}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Consignment</th>
                    <th className="px-4 py-3">Transfer Status</th>
                    <th className="px-4 py-3 text-right">Expected COD</th>
                    <th className="px-4 py-3 text-right">Collected</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map(row => {
                    const refreshing = refreshingIds.has(row.order_id);
                    return (
                      <tr key={row.order_id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-3 align-top">
                          <p className="font-semibold text-gray-900 dark:text-white">{row.order_number || `#${row.order_id}`}</p>
                          <p className="text-xs text-gray-500">{formatDateTime(row.order_date)}</p>
                          <p className="mt-1 text-xs text-gray-500">{row.order_status || '—'} · {row.store_name || '—'}</p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="font-medium text-gray-800 dark:text-gray-100">{row.customer_name || '—'}</p>
                          <p className="text-xs text-gray-500">{row.phone || 'No phone'}</p>
                        </td>
                        <td className="px-4 py-3 align-top font-mono text-xs text-gray-700 dark:text-gray-300">
                          {row.consignment_id}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {row.transfer_status || 'Not refreshed'}
                          </span>
                          {row.pathao_state && <p className="mt-1 text-xs text-gray-500">State: {row.pathao_state}</p>}
                        </td>
                        <td className="px-4 py-3 text-right align-top font-medium text-gray-800 dark:text-gray-100">
                          {money(row.collectable_amount ?? row.expected_cod)}
                        </td>
                        <td className="px-4 py-3 text-right align-top font-bold text-emerald-700 dark:text-emerald-300">
                          {money(row.collected_amount)}
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-gray-500">
                          <p>{row.transfer_status_updated_at || '—'}</p>
                          <p className="mt-1">Fetched: {formatDateTime(row.refreshed_at)}</p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => refreshOne(row.order_id)}
                              disabled={refreshing || refreshAllRunning}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                              title="Refresh from Pathao using consignment ID"
                            >
                              {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                              Refresh
                            </button>
                            {row.tracking_url && (
                              <a
                                href={row.tracking_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Open
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-14 text-center text-sm text-gray-500">
                        Select a date range and click Load.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

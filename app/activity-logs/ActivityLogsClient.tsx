'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from "@/contexts/ThemeContext";
import { useSearchParams } from 'next/navigation';
import { Filter, RefreshCw, Search } from 'lucide-react';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ActivityLogTable from '@/components/activity/ActivityLogTable';
import activityService, { ActivityLogEntry, BusinessHistoryCategory } from '@/services/activityService';
import Toast from '@/components/Toast';

type UserOption = { id: number; name: string; email?: string };

const CATEGORY_OPTIONS: Array<{ value: BusinessHistoryCategory; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'orders', label: 'Orders' },
  { value: 'product-dispatches', label: 'Product Dispatches' },
  { value: 'purchase-orders', label: 'Purchase Orders' },
  { value: 'store-assignments', label: 'Store Assignments' },
  { value: 'products', label: 'Products' },
];

const EVENT_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'invoice_printed', label: 'Invoice printed' },
];

export default function ActivityLogsClient() {
  const searchParams = useSearchParams();

  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Filters
  const [category, setCategory] = useState<BusinessHistoryCategory>(
    (searchParams.get('category') as BusinessHistoryCategory) || 'all'
  );
  const [event, setEvent] = useState<string>(searchParams.get('event') || '');
  const [employeeId, setEmployeeId] = useState<string>(searchParams.get('employee_id') || '');
  const [q, setQ] = useState<string>(searchParams.get('q') || '');
  const [dateFrom, setDateFrom] = useState<string>(searchParams.get('date_from') || '');
  const [dateTo, setDateTo] = useState<string>(searchParams.get('date_to') || '');
  const [perPage, setPerPage] = useState<number>(50);
  const [debouncedQ, setDebouncedQ] = useState<string>(q);
  const [page, setPage] = useState<number>(1);
  const [meta, setMeta] = useState<{ current_page: number; per_page: number; total: number; last_page: number }>({
    current_page: 1, per_page: 50, total: 0, last_page: 1,
  });

  // Data
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>(
    { show: false, message: '', type: 'success' }
  );

  useEffect(() => {
    // load user options from statistics (most_active_users)
    (async () => {
      try {
        const stats = await activityService.getStatistics(dateFrom, dateTo);
        const opts = (stats.most_active_users || []).map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
        }));
        setUsers(opts);
      } catch {
        // non-blocking
        setUsers([]);
      }
    })();
  }, [dateFrom, dateTo]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q), 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  const loadLogs = async (targetPage = page) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await activityService.getLogs({
        category,
        date_from: dateFrom,
        date_to: dateTo,
        event: event || undefined,
        causer_id: employeeId ? Number(employeeId) : undefined,
        q: debouncedQ || undefined,
        per_page: perPage,
        page: targetPage,
      });
      setEntries(res.data || []);
      setMeta({
        current_page: Number(res.meta?.current_page || targetPage),
        per_page: Number(res.meta?.per_page || perPage),
        total: Number(res.meta?.total || 0),
        last_page: Math.max(1, Number(res.meta?.last_page || 1)),
      });
      setPage(targetPage);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load history');
      setEntries([]);
      setMeta({ current_page: 1, per_page: perPage, total: 0, last_page: 1 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    void loadLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, event, employeeId, dateFrom, dateTo, perPage, debouncedQ]);

  const goToPage = (targetPage: number) => {
    const next = Math.max(1, Math.min(meta.last_page, targetPage));
    if (next === page || isLoading) return;
    void loadLogs(next);
  };

  return (
  <div className={darkMode ? 'dark' : ''}>
    <div className="flex h-screen bg-white dark:bg-black">
      <Sidebar darkMode={darkMode} isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          title="Business History"
        />

        <main className="flex-1 overflow-auto bg-white dark:bg-black">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4">
              {/* Filters */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  <Filter className="w-4 h-4" />
                  Filters
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Category</label>
                    <select
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black text-sm"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as BusinessHistoryCategory)}
                    >
                      {CATEGORY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Event</label>
                    <select
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black text-sm"
                      value={event}
                      onChange={(e) => setEvent(e.target.value)}
                    >
                      {EVENT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Employee</label>
                    <select
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black text-sm"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                    >
                      <option value="">Any</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                          {u.email ? ` (${u.email})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">From</label>
                    <input
                      type="date"
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black text-sm"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">To</label>
                    <input
                      type="date"
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black text-sm"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Search</label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black text-sm"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="description, user, subject..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => void loadLogs(page)}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                    disabled={isLoading}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>

                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Showing <span className="font-medium">{entries.length}</span> of <span className="font-medium">{meta.total}</span> activities
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
                {error ? (
                  <div className="p-6 text-sm text-red-600 dark:text-red-400">{error}</div>
                ) : (
                  <ActivityLogTable
                    entries={entries}
                    isLoading={isLoading}
                    onCopy={(text) => {
                      navigator.clipboard.writeText(text);
                      setToast({ show: true, message: 'Copied to clipboard', type: 'success' });
                    }}
                  />
                )}
              </div>

              {!error && meta.total > 0 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <span>Rows per page</span>
                    <select
                      value={perPage}
                      onChange={(e) => setPerPage(Number(e.target.value))}
                      className="h-9 rounded-lg border border-gray-200 bg-white px-2 dark:border-gray-700 dark:bg-gray-900"
                    >
                      {[25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>Page {meta.current_page} of {meta.last_page}</span>
                    <button
                      type="button"
                      onClick={() => goToPage(page - 1)}
                      disabled={isLoading || page <= 1}
                      className="h-9 rounded-lg border border-gray-200 px-3 disabled:opacity-50 dark:border-gray-700"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => goToPage(page + 1)}
                      disabled={isLoading || page >= meta.last_page}
                      className="h-9 rounded-lg border border-gray-200 px-3 disabled:opacity-50 dark:border-gray-700"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {toast.show && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast((t) => ({ ...t, show: false }))}
            />
          )}
        </main>
      </div>
    </div>
  </div>
);
}
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  BarChart3,
  MessageCircle,
  ShoppingBag,
  ReceiptText,
  RefreshCw,
  Search,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import hrmService, {
  HRMPerformanceReport,
  HRMSalesRecord,
  HRMSalesRecordsPage,
} from '@/services/hrmService';

const emptyReport: HRMPerformanceReport = {
  items: [],
  branch_target: 0,
  total_sales: 0,
  pos_sales: 0,
  social_commerce_sales: 0,
  branch_order_count: 0,
  pos_order_count: 0,
  social_commerce_order_count: 0,
  remaining_target: 0,
  branch_achievement: 0,
};

const emptyRecords: HRMSalesRecordsPage = {
  data: [],
  current_page: 1,
  last_page: 1,
  per_page: 25,
  total: 0,
};

const money = (value: number) =>
  new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, 'dd MMM yyyy, hh:mm a');
};

export default function EmployeeSalesPage() {
  const { selectedStoreId } = useStore();
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [employeeId, setEmployeeId] = useState('all');
  const [channel, setChannel] = useState<'all' | 'counter' | 'social_commerce'>('all');
  const [search, setSearch] = useState('');
  const [report, setReport] = useState<HRMPerformanceReport>(emptyReport);
  const [records, setRecords] = useState<HRMSalesRecordsPage>(emptyRecords);
  const [page, setPage] = useState(1);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const loadReport = useCallback(async () => {
    if (!selectedStoreId) return;
    setLoadingReport(true);
    try {
      const data = await hrmService.getPerformanceReport({ store_id: selectedStoreId, month });
      setReport(data || emptyReport);
    } catch (error) {
      console.error('Failed to load employee sales report:', error);
      setReport(emptyReport);
    } finally {
      setLoadingReport(false);
    }
  }, [month, selectedStoreId]);

  const loadRecords = useCallback(async () => {
    if (!selectedStoreId) return;
    setLoadingRecords(true);
    try {
      const data = await hrmService.getSalesRecords({
        store_id: selectedStoreId,
        month,
        ...(employeeId !== 'all' ? { employee_id: Number(employeeId) } : {}),
        ...(channel !== 'all' ? { channel } : {}),
        page,
        per_page: 25,
      });
      setRecords(data);
    } catch (error) {
      console.error('Failed to load employee sales records:', error);
      setRecords(emptyRecords);
    } finally {
      setLoadingRecords(false);
    }
  }, [channel, employeeId, month, page, selectedStoreId]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    setPage(1);
  }, [month, employeeId, channel]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return report.items;
    return report.items.filter((item) =>
      item.employee.name.toLowerCase().includes(q) ||
      String(item.employee.employee_code || '').toLowerCase().includes(q),
    );
  }, [report.items, search]);

  if (!selectedStoreId) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
        <BarChart3 className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">Select a branch to view employee sales</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Sales are attributed to the employee selected on the order.</p>
      </div>
    );
  }

  const summary = [
    {
      label: 'Employee Sales',
      value: money(report.total_sales),
      note: `${report.branch_order_count} completed orders`,
      icon: ReceiptText,
      iconClass: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    },
    {
      label: 'POS Sales',
      value: money(report.pos_sales),
      note: `${report.pos_order_count} POS orders`,
      icon: ShoppingBag,
      iconClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    },
    {
      label: 'Social Commerce',
      value: money(report.social_commerce_sales),
      note: `${report.social_commerce_order_count} social orders`,
      icon: MessageCircle,
      iconClass: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
    },
    {
      label: 'Target Progress',
      value: `${Number(report.branch_achievement || 0).toFixed(1)}%`,
      note: `${money(report.remaining_target)} remaining`,
      icon: BarChart3,
      iconClass: 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Employee sales performance</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            One sales record across POS and Social Commerce, credited by the order&apos;s selected employee.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-700"
          />
          <button
            onClick={() => { void loadReport(); void loadRecords(); }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{loadingReport ? '—' : card.value}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{card.note}</p>
                </div>
                <div className={`rounded-lg p-2.5 ${card.iconClass}`}><Icon className="h-5 w-5" /></div>
              </div>
            </div>
          );
        })}
      </div>

      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 md:flex-row md:items-center md:justify-between dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Employee leaderboard</h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">POS and Social Commerce are shown separately, then combined for target achievement.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employee"
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 md:w-64 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-700"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50 text-left dark:bg-gray-900/40">
              <tr>
                {['Employee', 'POS', 'Social Commerce', 'Total Sales', 'Orders', 'Target', 'Progress'].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loadingReport ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-500">Loading employee sales…</td></tr>
              ) : filteredEmployees.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-500">No employee sales found for this month.</td></tr>
              ) : filteredEmployees.map((item, index) => (
                <tr key={item.employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                        {index === 0 && item.achieved_amount > 0 ? <Trophy className="h-4 w-4 text-amber-500" /> : item.employee.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.employee.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.employee.employee_code || 'No code'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{money(item.pos_sales_amount)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.pos_order_count} orders</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{money(item.social_commerce_sales_amount)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.social_commerce_order_count} orders</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 dark:text-white">{money(item.achieved_amount)}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">{item.order_count}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">{item.target_amount > 0 ? money(item.target_amount) : 'Not set'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex min-w-36 items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className={`h-full rounded-full ${item.achievement_percentage >= 100 ? 'bg-green-600' : 'bg-blue-600'}`}
                          style={{ width: `${Math.min(item.achievement_percentage, 100)}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs font-semibold text-gray-700 dark:text-gray-200">{item.achievement_percentage.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Sales records</h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Completed POS and Social Commerce orders attributed to employees.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="all">All employees</option>
              {report.items.map((item) => (
                <option key={item.employee.id} value={item.employee.id}>{item.employee.name}</option>
              ))}
            </select>
            <select
              value={channel}
              onChange={(event) => setChannel(event.target.value as typeof channel)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="all">All channels</option>
              <option value="counter">POS</option>
              <option value="social_commerce">Social Commerce</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px]">
            <thead className="bg-gray-50 text-left dark:bg-gray-900/40">
              <tr>
                {['Order', 'Date', 'Employee', 'Channel', 'Customer', 'Fulfillment Store', 'Amount', 'Status'].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loadingRecords ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-500">Loading sales records…</td></tr>
              ) : records.data.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-500">No matching sales records.</td></tr>
              ) : records.data.map((record: HRMSalesRecord) => (
                <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-5 py-3.5 text-sm font-medium text-gray-900 dark:text-white">{record.order_number}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">{formatDateTime(record.order_date)}</td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{record.employee?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{record.employee?.employee_code || ''}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      record.order_type === 'social_commerce'
                        ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
                        : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                    }`}>
                      {record.channel_label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-gray-800 dark:text-gray-100">{record.customer?.name || 'Walk-in / Unknown'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{record.customer?.phone || ''}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">{record.store?.name || 'Not assigned'}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 dark:text-white">{money(record.total_amount)}</td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium capitalize text-green-700 dark:bg-green-950/40 dark:text-green-300">
                      {record.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {records.total.toLocaleString()} records · Page {records.current_page} of {records.last_page}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={records.current_page <= 1 || loadingRecords}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-200"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              onClick={() => setPage((current) => Math.min(records.last_page, current + 1))}
              disabled={records.current_page >= records.last_page || loadingRecords}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-200"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

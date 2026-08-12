'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { Copy, MessageCircle, ShoppingBag, Plus, Search, Target, TrendingUp } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import hrmService, { HRMPerformanceReport } from '@/services/hrmService';
import SalesTargetModal from '@/components/hrm/SalesTargetModal';
import AccessControl from '@/components/AccessControl';

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

const money = (value: number) =>
  new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function SalesTargetsPage() {
  const { selectedStoreId } = useStore();
  const [report, setReport] = useState<HRMPerformanceReport>(emptyReport);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isLoading, setIsLoading] = useState(true);
  const [isCopying, setIsCopying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [targetModal, setTargetModal] = useState<{
    isOpen: boolean;
    employee: { id: number; name: string } | null;
    initialTarget?: number;
  }>({ isOpen: false, employee: null });

  const loadData = async () => {
    if (!selectedStoreId) return;
    setIsLoading(true);
    try {
      const reportData = await hrmService.getPerformanceReport({
        store_id: selectedStoreId,
        month: selectedMonth,
      });
      setReport(reportData || emptyReport);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load sales target data');
      setReport(emptyReport);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [selectedStoreId, selectedMonth]);

  const handleCopyLastMonth = async () => {
    if (!selectedStoreId) return;
    setIsCopying(true);
    try {
      const response = await hrmService.copyLastMonthTargets({
        store_id: selectedStoreId,
        target_month: selectedMonth,
      });
      if (response.success) {
        toast.success(response.message || 'Previous month targets copied');
        await loadData();
      } else {
        toast.error(response.message || 'Failed to copy targets');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to copy targets');
    } finally {
      setIsCopying(false);
    }
  };

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return report.items;
    return report.items.filter((item) =>
      item.employee.name.toLowerCase().includes(query) ||
      String(item.employee.employee_code || '').toLowerCase().includes(query),
    );
  }, [report.items, searchQuery]);

  const employeesWithoutTarget = report.items.filter((item) => item.target_amount <= 0).length;

  if (!selectedStoreId) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
        <Target className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">Select a branch to manage targets</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Targets are assigned employee by employee for each month.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sales targets</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Target achievement now combines employee-attributed POS and Social Commerce sales.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AccessControl roles={['super-admin', 'admin', 'branch-manager']}>
            <button
              onClick={handleCopyLastMonth}
              disabled={isCopying}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <Copy className="h-4 w-4" /> {isCopying ? 'Copying…' : 'Copy last month'}
            </button>
          </AccessControl>
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Branch target</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{isLoading ? '—' : money(report.branch_target)}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{employeesWithoutTarget} employees without a target</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">POS contribution</p>
            <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{isLoading ? '—' : money(report.pos_sales)}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{report.pos_order_count} completed POS orders</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Social Commerce contribution</p>
            <MessageCircle className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{isLoading ? '—' : money(report.social_commerce_sales)}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{report.social_commerce_order_count} completed social orders</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Overall progress</p>
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{isLoading ? '—' : `${report.branch_achievement.toFixed(1)}%`}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{money(report.remaining_target)} remaining</p>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 md:flex-row md:items-center md:justify-between dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Employee target progress</h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">The achieved amount is POS + Social Commerce for the selected employee.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search employee"
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 md:w-64 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-700"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px]">
            <thead className="bg-gray-50 text-left dark:bg-gray-900/40">
              <tr>
                {['Employee', 'Target', 'POS', 'Social Commerce', 'Total Achieved', 'Remaining', 'Progress', ''].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-500">Loading targets…</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-500">No employee target data found.</td></tr>
              ) : filteredItems.map((item) => (
                <tr key={item.employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.employee.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.employee.employee_code || 'No code'}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-200">{item.target_amount > 0 ? money(item.target_amount) : 'Not set'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-200">{money(item.pos_sales_amount)}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-200">{money(item.social_commerce_sales_amount)}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 dark:text-white">{money(item.achieved_amount)}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">{money(item.remaining_amount)}</td>
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
                  <td className="px-5 py-3.5 text-right">
                    <AccessControl roles={['super-admin', 'admin', 'branch-manager']}>
                      <button
                        onClick={() => setTargetModal({
                          isOpen: true,
                          employee: item.employee,
                          initialTarget: item.target_amount,
                        })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        <Plus className="h-3.5 w-3.5" /> Set target
                      </button>
                    </AccessControl>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {targetModal.isOpen && selectedStoreId && (
        <SalesTargetModal
          isOpen={targetModal.isOpen}
          onClose={() => setTargetModal({ isOpen: false, employee: null })}
          employee={targetModal.employee}
          onSuccess={loadData}
          storeId={selectedStoreId}
          initialTarget={targetModal.initialTarget}
          initialMonth={selectedMonth}
        />
      )}
    </div>
  );
}

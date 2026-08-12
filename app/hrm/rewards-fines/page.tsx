'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Award, Calendar, ChevronDown, ChevronUp, Edit3, MinusCircle, Plus, PlusCircle, ReceiptText, Search, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { useStore } from '@/contexts/StoreContext';
import hrmService from '@/services/hrmService';
import RewardFineDialog from '@/components/hrm/RewardFineDialog';
import AccessControl from '@/components/AccessControl';

const money = (value: number | string | null | undefined) => `৳${Number(value || 0).toLocaleString()}`;

export default function RewardsFinesPage() {
  const { selectedStoreId } = useStore();
  const [employees, setEmployees] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [entryTypeFilter, setEntryTypeFilter] = useState<'all' | 'reward' | 'fine'>('all');
  const [dialog, setDialog] = useState<{ isOpen: boolean; employee: any; editData: any }>({ isOpen: false, employee: null, editData: null });
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<number | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    if (selectedStoreId) void loadData();
  }, [selectedStoreId, selectedMonth]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await hrmService.getCumulatedRewardFine({ store_id: selectedStoreId!, month: selectedMonth, per_page: 200 });
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      setEmployees(rows);

      const totalReward = rows.reduce((sum: number, row: any) => sum + Number(row.total_reward || 0), 0);
      const totalFine = rows.reduce((sum: number, row: any) => sum + Number(row.total_fine || 0), 0);
      const totalProjectedSalary = rows.reduce(
        (sum: number, row: any) => sum + Number(row.employee?.salary || 0) + Number(row.net_adjustment || 0),
        0
      );

      setSummaryData({
        total_reward: totalReward,
        total_fine: totalFine,
        net: totalReward - totalFine,
        count: rows.length,
        total_entries: rows.reduce((sum: number, row: any) => sum + Number(row.total_entries || 0), 0),
        total_projected_salary: totalProjectedSalary,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRow = async (employeeId: number) => {
    if (expandedEmployeeId === employeeId) {
      setExpandedEmployeeId(null);
      return;
    }

    setExpandedEmployeeId(employeeId);
    setIsLoadingDetails(true);
    try {
      const data = await hrmService.getRewardFineReport({ store_id: selectedStoreId!, employee_id: employeeId, month: selectedMonth });
      setEmployeeDetails(Array.isArray(data?.rows) ? data.rows : []);
    } catch (error) {
      console.error(error);
      setEmployeeDetails([]);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const filteredEmployees = useMemo(() => employees.filter((row: any) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesText = !query ||
      row.employee?.name?.toLowerCase().includes(query) ||
      row.employee?.employee_code?.toLowerCase().includes(query);

    if (!matchesText) return false;
    if (entryTypeFilter === 'reward') return Number(row.total_reward || 0) > 0;
    if (entryTypeFilter === 'fine') return Number(row.total_fine || 0) > 0;
    return true;
  }), [employees, searchQuery, entryTypeFilter]);

  const topPositive = [...filteredEmployees].sort((a, b) => Number(b.net_adjustment || 0) - Number(a.net_adjustment || 0))[0];
  const topFine = [...filteredEmployees].sort((a, b) => Number(b.total_fine || 0) - Number(a.total_fine || 0))[0];

  if (!selectedStoreId) {
    return (
      <div className="flex h-80 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-center dark:border-gray-700 dark:bg-gray-800">
        <Award className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Select a store</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose a store to manage employee rewards and fines.</p>
      </div>
    );
  }

  const netAdjustment = Number(summaryData?.net || 0);
  const cards = [
    { label: 'Total Rewards', value: money(summaryData?.total_reward), note: 'Positive salary adjustments', icon: PlusCircle },
    { label: 'Total Fines', value: money(summaryData?.total_fine), note: 'Employee deductions', icon: MinusCircle },
    { label: 'Net Adjustment', value: `${netAdjustment >= 0 ? '+' : '-'}${money(Math.abs(netAdjustment))}`, note: 'Rewards minus fines', icon: Award },
    { label: 'Entries', value: Number(summaryData?.total_entries || 0).toLocaleString(), note: 'Entries in selected month', icon: ReceiptText },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Rewards & fines</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage monthly bonuses and penalties and preview how they affect payroll.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-900/30"
            />
          </label>
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
            {[
              { key: 'all', label: 'All' },
              { key: 'reward', label: 'Rewards' },
              { key: 'fine', label: 'Fines' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setEntryTypeFilter(tab.key as typeof entryTypeFilter)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  entryTypeFilter === tab.key
                    ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{isLoading ? '—' : card.value}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{card.note}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-2.5 text-gray-500 dark:bg-gray-700/60 dark:text-gray-300">
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Salary impact</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Projected base salary plus this month&apos;s reward/fine stack.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/40">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Projected payout pool</p>
              <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{money(summaryData?.total_projected_salary)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/40">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Highest positive adjustment</p>
              <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{topPositive?.employee?.name || '—'}</p>
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                {topPositive && Number(topPositive.net_adjustment || 0) > 0 ? `+${money(topPositive.net_adjustment)}` : 'No positive adjustment'}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/40">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Highest fine</p>
              <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{topFine?.employee?.name || '—'}</p>
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {topFine && Number(topFine.total_fine || 0) > 0 ? `-${money(topFine.total_fine)}` : 'No fines'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/60 dark:bg-blue-950/20">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200">Payroll connection</h3>
          <p className="mt-2 text-sm leading-6 text-blue-800/80 dark:text-blue-300/80">
            Pending rewards and fines feed the monthly payroll calculation, so HR can review their salary effect before salary is settled.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Employee adjustments</h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Expand an employee to review and edit individual entries.</p>
          </div>
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search employee"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full min-w-60 rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-900/30"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px]">
            <thead className="bg-gray-50 text-left dark:bg-gray-900/40">
              <tr>
                {['Employee', 'Base Salary', 'Rewards', 'Fines', 'Net Adjustment', 'Projected Salary', 'Actions'].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">Loading adjustments…</td></tr>
              ) : filteredEmployees.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">No matching employee adjustments.</td></tr>
              ) : filteredEmployees.map((row) => {
                const salary = Number(row.employee?.salary || 0);
                const projectedSalary = salary + Number(row.net_adjustment || 0);
                const expanded = expandedEmployeeId === row.employee.id;

                return (
                  <React.Fragment key={row.employee.id}>
                    <tr className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40" onClick={() => void toggleRow(row.employee.id)}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                            {row.employee.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{row.employee.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{row.employee.employee_code || 'No code'} · {row.total_entries || 0} entries</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-200">{money(salary)}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-green-700 dark:text-green-300">+{money(row.total_reward)}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-red-700 dark:text-red-300">-{money(row.total_fine)}</td>
                      <td className={`px-5 py-3.5 text-sm font-semibold ${Number(row.net_adjustment || 0) >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        {Number(row.net_adjustment || 0) >= 0 ? '+' : '-'}{money(Math.abs(Number(row.net_adjustment || 0)))}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-bold text-gray-900 dark:text-white">{money(projectedSalary)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                          <AccessControl roles={['super-admin', 'admin', 'branch-manager']}>
                            <button
                              onClick={() => setDialog({ isOpen: true, employee: row.employee, editData: null })}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add
                            </button>
                          </AccessControl>
                          <button
                            onClick={() => void toggleRow(row.employee.id)}
                            className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            aria-label={expanded ? 'Collapse entries' : 'Expand entries'}
                          >
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expanded && (
                      <tr className="bg-gray-50/60 dark:bg-gray-900/20">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex flex-col gap-2 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
                              <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{format(new Date(`${selectedMonth}-01T00:00:00`), 'MMMM yyyy')} entries</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Projected salary: {money(projectedSalary)}</p>
                              </div>
                              <AccessControl roles={['super-admin', 'admin', 'branch-manager']}>
                                <button
                                  onClick={() => setDialog({ isOpen: true, employee: row.employee, editData: null })}
                                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                                >
                                  Add reward / fine
                                </button>
                              </AccessControl>
                            </div>

                            {isLoadingDetails ? (
                              <div className="px-4 py-8 text-center text-sm text-gray-500">Loading entries…</div>
                            ) : employeeDetails.length === 0 ? (
                              <div className="px-4 py-8 text-center text-sm text-gray-500">No entries this month.</div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[720px]">
                                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {employeeDetails.map((entry: any) => (
                                      <tr key={entry.id}>
                                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{format(new Date(entry.entry_date), 'dd MMM yyyy')}</td>
                                        <td className="px-4 py-3">
                                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${entry.entry_type === 'reward' ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'}`}>
                                            {entry.entry_type === 'reward' ? 'Reward' : 'Fine'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.title}</p>
                                          {entry.notes ? <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{entry.notes}</p> : null}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{entry.is_applied ? 'Applied' : 'Pending'}</td>
                                        <td className={`px-4 py-3 text-sm font-semibold ${entry.entry_type === 'reward' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                          {entry.entry_type === 'reward' ? '+' : '-'}{money(entry.amount)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          <AccessControl roles={['super-admin', 'admin', 'branch-manager']}>
                                            <button
                                              onClick={() => setDialog({ isOpen: true, employee: row.employee, editData: entry })}
                                              className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                              title="Edit entry"
                                            >
                                              <Edit3 className="h-3.5 w-3.5" />
                                            </button>
                                          </AccessControl>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {dialog.isOpen && (
        <RewardFineDialog
          isOpen={dialog.isOpen}
          onClose={() => setDialog({ ...dialog, isOpen: false })}
          storeId={selectedStoreId}
          employee={dialog.employee}
          onSuccess={loadData}
          editData={dialog.editData}
        />
      )}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calendar, CheckCircle2, CreditCard, FileText, Receipt, Search, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import hrmService from '@/services/hrmService';
import { useStore } from '@/contexts/StoreContext';

type PayrollRow = {
  employee: {
    id: number;
    name: string;
    employee_code?: string;
  };
  basic_salary: number;
  rewards: number;
  fines: number;
  late_fees: number;
  overtime_pay: number;
  net_payable: number;
  is_paid: boolean;
  paid_info?: {
    expense_id?: number;
    expense_number?: string;
    payment_id?: number;
    payment_number?: string;
    paid_at?: string | null;
    accounting_posted?: boolean;
    transaction_ids?: number[];
    transaction_numbers?: string[];
  } | null;
};

const money = (value: number | string | null | undefined) => `৳${Number(value || 0).toLocaleString()}`;

export default function PayrollPage() {
  const { selectedStoreId } = useStore();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [sheetData, setSheetData] = useState<PayrollRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [payingEmployeeId, setPayingEmployeeId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedStoreId) void loadSalarySheet();
  }, [selectedStoreId, selectedMonth]);

  const loadSalarySheet = async () => {
    setIsLoading(true);
    try {
      const data = await hrmService.getMonthlySalarySheet({ store_id: selectedStoreId!, month: selectedMonth });
      setSheetData(Array.isArray(data?.sheet) ? data.sheet : []);
    } catch {
      toast.error('Failed to load payroll data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaySalary = async (employeeId: number) => {
    if (!window.confirm('Mark this salary as paid? This will post the payment into expense, payment, and accounting transactions.')) return;

    setPayingEmployeeId(employeeId);
    try {
      const res = await hrmService.payMonthlySalary({
        employee_id: employeeId,
        store_id: selectedStoreId!,
        month: selectedMonth,
      });

      if (res.success) {
        const txns = Array.isArray(res.data?.transaction_numbers) ? res.data.transaction_numbers.join(', ') : '';
        toast.success(txns ? `Salary paid and posted. ${txns}` : (res.message || 'Salary marked as paid.'));
        await loadSalarySheet();
      } else {
        toast.error(res.message || 'Failed to mark salary as paid.');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Error executing salary payment.');
    } finally {
      setPayingEmployeeId(null);
    }
  };

  const filteredSheet = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sheetData;

    return sheetData.filter((item) =>
      item.employee.name.toLowerCase().includes(q) ||
      (item.employee.employee_code || '').toLowerCase().includes(q)
    );
  }, [sheetData, searchQuery]);

  const totalPayable = filteredSheet.reduce((sum, row) => sum + Number(row.net_payable || 0), 0);
  const paidCount = filteredSheet.filter((row) => row.is_paid).length;
  const pendingCount = filteredSheet.length - paidCount;
  const accountingPostedCount = filteredSheet.filter((row) => row.paid_info?.accounting_posted).length;

  if (!selectedStoreId) {
    return (
      <div className="flex h-80 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-center dark:border-gray-700 dark:bg-gray-800">
        <CreditCard className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Select a store</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose a store to view and manage its payroll.</p>
      </div>
    );
  }

  const cards = [
    { label: 'Total Payable', value: money(totalPayable), note: format(new Date(`${selectedMonth}-01T00:00:00`), 'MMMM yyyy') },
    { label: 'Employees', value: filteredSheet.length.toLocaleString(), note: 'In current payroll view' },
    { label: 'Paid', value: paidCount.toLocaleString(), note: 'Salary settled' },
    { label: 'Pending', value: pendingCount.toLocaleString(), note: 'Awaiting payment' },
    { label: 'Accounting Posted', value: accountingPostedCount.toLocaleString(), note: 'Posted to transactions' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payroll</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monthly salary sheet with rewards, fines, overtime and accounting posting status.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-900/30"
            />
          </label>
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search employee"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full min-w-56 rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-900/30"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{isLoading ? '—' : card.value}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{card.note}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Salary sheet</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Marking salary paid posts the linked expense, payment and accounting transactions.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px]">
            <thead className="bg-gray-50 text-left dark:bg-gray-900/40">
              <tr>
                {['Employee', 'Basic', 'Rewards', 'Overtime', 'Fines', 'Late Fees', 'Net Payable', 'Payroll', 'Accounting', 'Action'].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <tr><td colSpan={10} className="px-5 py-12 text-center text-sm text-gray-500 dark:text-gray-400">Loading payroll…</td></tr>
              ) : filteredSheet.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center">
                    <FileText className="mx-auto mb-2 h-9 w-9 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No employees found for this month.</p>
                  </td>
                </tr>
              ) : filteredSheet.map((row) => {
                const paidInfo = row.paid_info;
                const txnLabel = paidInfo?.transaction_numbers?.length ? paidInfo.transaction_numbers.join(', ') : null;

                return (
                  <tr key={row.employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                          {row.employee.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{row.employee.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{row.employee.employee_code || 'No code'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-200">{money(row.basic_salary)}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-green-700 dark:text-green-300">+{money(row.rewards)}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-green-700 dark:text-green-300">+{money(row.overtime_pay)}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-red-700 dark:text-red-300">-{money(row.fines)}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-red-700 dark:text-red-300">-{money(row.late_fees)}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-gray-900 dark:text-white">{money(row.net_payable)}</td>
                    <td className="px-5 py-3.5">
                      {row.is_paid ? (
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-950/40 dark:text-green-300">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                          </span>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {paidInfo?.paid_at ? format(new Date(paidInfo.paid_at), 'dd MMM yyyy, hh:mm a') : 'Payment posted'}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          <AlertCircle className="h-3.5 w-3.5" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {paidInfo?.accounting_posted ? (
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            <Wallet className="h-3.5 w-3.5" /> Posted
                          </span>
                          {txnLabel ? <p className="mt-1 max-w-44 truncate text-xs text-gray-500 dark:text-gray-400" title={txnLabel}>{txnLabel}</p> : null}
                          {paidInfo?.expense_number ? <p className="text-xs text-gray-500 dark:text-gray-400">Expense: {paidInfo.expense_number}</p> : null}
                        </div>
                      ) : row.is_paid ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          <Receipt className="h-3.5 w-3.5" /> Not posted
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handlePaySalary(row.employee.id)}
                        disabled={row.is_paid || payingEmployeeId === row.employee.id}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
                      >
                        {payingEmployeeId === row.employee.id ? 'Processing…' : row.is_paid ? 'Settled' : 'Mark Paid'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

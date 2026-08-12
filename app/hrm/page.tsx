'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Users,
  UserCheck,
  ShoppingBag,
  MessageCircle,
  ArrowRight,
  Target,
  ClipboardCheck,
  WalletCards,
  Trophy,
} from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import employeeService, { Employee } from '@/services/employeeService';
import hrmService, { AttendanceRecord, HRMPerformanceReport } from '@/services/hrmService';

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

export default function HRMOverviewPage() {
  const { selectedStoreId } = useStore();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [report, setReport] = useState<HRMPerformanceReport>(emptyReport);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedStoreId) {
      setEmployees([]);
      setAttendance([]);
      setReport(emptyReport);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [employeeRows, attendanceRows, salesReport] = await Promise.all([
          employeeService.getAll({ store_id: selectedStoreId, is_active: true }),
          hrmService.getTodayAttendance(selectedStoreId),
          hrmService.getPerformanceReport({
            store_id: selectedStoreId,
            month: format(new Date(), 'yyyy-MM'),
          }),
        ]);

        setEmployees(Array.isArray(employeeRows) ? employeeRows : []);
        setAttendance(Array.isArray(attendanceRows) ? attendanceRows : []);
        setReport(salesReport || emptyReport);
      } catch (error) {
        console.error('Failed to load HRM overview:', error);
        setReport(emptyReport);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [selectedStoreId]);

  const employeeMap = useMemo(
    () => new Map(employees.map((employee) => [Number(employee.id), employee])),
    [employees],
  );

  const presentCount = attendance.filter((row) => ['present', 'late'].includes(row.status?.toLowerCase())).length;
  const lateCount = attendance.filter((row) => row.status?.toLowerCase() === 'late' || row.is_late).length;
  const topSellers = report.items.slice(0, 5);
  const recentAttendance = attendance
    .map((row) => ({ row, employee: employeeMap.get(Number(row.employee_id)) }))
    .filter((item) => item.employee)
    .slice(0, 6);

  if (!selectedStoreId) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
        <Users className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">Select a branch to open HRM</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Branch HR data and sales performance are shown branch by branch.</p>
      </div>
    );
  }

  const summaryCards = [
    {
      label: 'Active Staff',
      value: employees.length.toLocaleString(),
      note: `${presentCount} marked present today`,
      icon: Users,
      iconClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    },
    {
      label: 'Present Today',
      value: presentCount.toLocaleString(),
      note: lateCount ? `${lateCount} late arrival${lateCount === 1 ? '' : 's'}` : 'No late arrivals marked',
      icon: UserCheck,
      iconClass: 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400',
    },
    {
      label: 'Monthly Employee Sales',
      value: money(report.total_sales),
      note: `${report.branch_order_count} completed sales`,
      icon: ShoppingBag,
      iconClass: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
    },
    {
      label: 'Social Commerce Sales',
      value: money(report.social_commerce_sales),
      note: `${report.social_commerce_order_count} social-commerce orders`,
      icon: MessageCircle,
      iconClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{format(new Date(), 'MMMM yyyy')}</p>
          <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">Branch HR overview</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Attendance and employee-attributed sales from both POS and Social Commerce.
          </p>
        </div>
        <button
          onClick={() => router.push('/hrm/sales')}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
        >
          View sales records <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{loading ? '—' : card.value}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{card.note}</p>
                </div>
                <div className={`rounded-lg p-2.5 ${card.iconClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Employee sales performance</h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Monthly sales credited to the selected employee on POS and Social Commerce orders.</p>
            </div>
            <button onClick={() => router.push('/hrm/sales')} className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
              All sales
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-gray-50 text-left dark:bg-gray-900/40">
                <tr>
                  {['Employee', 'POS', 'Social Commerce', 'Total', 'Orders'].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-500">Loading sales performance…</td></tr>
                ) : topSellers.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-500">No completed employee sales this month.</td></tr>
                ) : topSellers.map((item, index) => (
                  <tr key={item.employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                          {index === 0 ? <Trophy className="h-4 w-4 text-amber-500" /> : item.employee.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{item.employee.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.employee.employee_code || 'No employee code'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-200">{money(item.pos_sales_amount)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-200">{money(item.social_commerce_sales_amount)}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 dark:text-white">{money(item.achieved_amount)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">{item.order_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Today&apos;s attendance</h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Latest marked staff for this branch.</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentAttendance.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-500">No attendance has been marked today.</div>
            ) : recentAttendance.map(({ row, employee }) => (
              <div key={row.employee_id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{employee?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{row.clock_in || 'No clock-in time'}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  row.status === 'late'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                }`}>
                  {row.status?.replace(/_/g, ' ') || 'Marked'}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push('/hrm/branch')}
            className="flex w-full items-center justify-between border-t border-gray-200 px-5 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700/40"
          >
            Manage attendance <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">HR shortcuts</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Attendance report', description: 'Review rosters and attendance', href: '/hrm/attendance', icon: ClipboardCheck },
            { label: 'Employee sales', description: 'POS + Social Commerce records', href: '/hrm/sales', icon: ShoppingBag },
            { label: 'Sales targets', description: 'Set monthly employee targets', href: '/hrm/sales-targets', icon: Target },
            { label: 'Payroll', description: 'Prepare monthly salary sheet', href: '/hrm/payroll', icon: WalletCards },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.href}
                onClick={() => router.push(action.href)}
                className="group flex items-center gap-3 rounded-lg border border-gray-200 p-4 text-left transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-700/40"
              >
                <div className="rounded-lg bg-gray-100 p-2 text-gray-700 dark:bg-gray-700 dark:text-gray-200"><Icon className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{action.label}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{action.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 transition group-hover:text-gray-600 dark:group-hover:text-gray-300" />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

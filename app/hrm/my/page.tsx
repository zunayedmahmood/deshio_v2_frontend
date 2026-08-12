'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Award, CalendarDays, Clock3, MessageCircle, ShoppingBag, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import hrmService, { AttendanceRecord } from '@/services/hrmService';

const money = (value: number) =>
  new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const dateLabel = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : format(parsed, 'EEE, dd MMM');
};

export default function MyHRMPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [performance, setPerformance] = useState<any>({});
  const [rewardsFines, setRewardsFines] = useState<any[]>([]);
  const [overtime, setOvertime] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [attendanceRows, performanceData, rewardRows, overtimeRows] = await Promise.all([
          hrmService.getMyAttendance({ month }),
          hrmService.getMyPerformance({ month }),
          hrmService.getMyRewardsFines({ month }),
          hrmService.getMyOvertime({ month }),
        ]);
        setAttendance(attendanceRows);
        setPerformance(performanceData || {});
        setRewardsFines(rewardRows);
        setOvertime(overtimeRows);
      } catch (error) {
        console.error('Failed to load employee HR dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [month]);

  const presentCount = attendance.filter((row) => ['present', 'late'].includes(row.status?.toLowerCase())).length;
  const lateCount = attendance.filter((row) => row.status?.toLowerCase() === 'late' || row.is_late).length;
  const overtimeHours = overtime.reduce((sum, row) => sum + Number(row.overtime_hours || 0), 0);
  const rewardNet = rewardsFines.reduce(
    (sum, row) => sum + (row.entry_type === 'reward' ? Number(row.amount || 0) : -Number(row.amount || 0)),
    0,
  );

  const latestAttendance = useMemo(
    () => [...attendance].sort((a, b) => String(b.attendance_date).localeCompare(String(a.attendance_date))).slice(0, 10),
    [attendance],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Employee portal</p>
          <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{user?.name || 'My HR dashboard'}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your attendance, target progress, sales and HR adjustments.</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-700"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Days present', value: presentCount.toLocaleString(), note: `${lateCount} late`, icon: CalendarDays, className: 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400' },
          { label: 'Total sales', value: money(performance.achieved || 0), note: `${performance.order_count || 0} completed orders`, icon: TrendingUp, className: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' },
          { label: 'Target progress', value: `${Number(performance.percent || 0).toFixed(1)}%`, note: performance.target ? `${money(performance.target)} target` : 'No target set', icon: Target, className: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400' },
          { label: 'Overtime', value: `${overtimeHours.toFixed(1)}h`, note: `Rewards/fines net ${money(rewardNet)}`, icon: Clock3, className: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{loading ? '—' : card.value}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{card.note}</p>
                </div>
                <div className={`rounded-lg p-2.5 ${card.className}`}><Icon className="h-5 w-5" /></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">My sales contribution</h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">POS and Social Commerce are both included in your monthly target achievement.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400"><ShoppingBag className="h-4 w-4 text-blue-600 dark:text-blue-400" /> POS</div>
              <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{money(performance.pos_sales_amount || 0)}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{performance.pos_order_count || 0} orders</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400"><MessageCircle className="h-4 w-4 text-violet-600 dark:text-violet-400" /> Social Commerce</div>
              <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{money(performance.social_commerce_sales_amount || 0)}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{performance.social_commerce_order_count || 0} orders</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400"><Target className="h-4 w-4 text-green-600 dark:text-green-400" /> Combined</div>
              <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{money(performance.achieved || 0)}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{Number(performance.percent || 0).toFixed(1)}% of target</p>
            </div>
          </div>
          <div className="px-5 pb-5">
            <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={`h-full rounded-full ${Number(performance.percent || 0) >= 100 ? 'bg-green-600' : 'bg-blue-600'}`}
                style={{ width: `${Math.min(Number(performance.percent || 0), 100)}%` }}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Rewards & fines</h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Entries for the selected month.</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {rewardsFines.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-500">No rewards or fines this month.</div>
            ) : rewardsFines.slice(0, 6).map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{row.title || 'Adjustment'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{row.entry_date ? dateLabel(row.entry_date) : ''}</p>
                </div>
                <span className={`text-sm font-semibold ${row.entry_type === 'reward' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {row.entry_type === 'reward' ? '+' : '-'}{money(Number(row.amount || 0))}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Attendance history</h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Latest attendance records in the selected month.</p>
          </div>
          <Award className="h-5 w-5 text-gray-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-gray-50 text-left dark:bg-gray-900/40">
              <tr>
                {['Date', 'Status', 'Clock in', 'Clock out', 'Overtime'].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {latestAttendance.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-500">No attendance records for this month.</td></tr>
              ) : latestAttendance.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-5 py-3.5 text-sm font-medium text-gray-900 dark:text-white">{dateLabel(row.attendance_date)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                      ['present'].includes(row.status)
                        ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                        : row.status === 'late'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          : row.status === 'absent'
                            ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {row.status?.replace(/_/g, ' ') || 'Not marked'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">{row.clock_in || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">{row.clock_out || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">{Number(row.overtime_minutes || 0)} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

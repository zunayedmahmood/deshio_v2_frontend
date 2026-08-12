'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { useStore } from '@/contexts/StoreContext';
import hrmService, { AttendancePolicy, EmployeeSchedule } from '@/services/hrmService';
import employeeService, { Employee } from '@/services/employeeService';
import {
  CalendarDays,
  Clock3,
  Settings2,
  Users,
  CheckCircle2,
  Save,
  RotateCcw,
  Search,
  ShieldCheck,
  TimerReset,
  LogIn,
  LogOut,
} from 'lucide-react';

type ReportEmployee = {
  employee: {
    id: number;
    name: string;
    employee_code?: string;
  };
  summary: Record<string, number | string>;
  daily: Array<{
    date: string;
    status: string;
    in_time?: string | null;
    out_time?: string | null;
    attendance_id?: number | null;
    source?: string;
    scheduled_start_time?: string | null;
    scheduled_end_time?: string | null;
    duty_minutes?: number;
    worked_minutes?: number;
    overtime_minutes?: number;
    undertime_minutes?: number;
    overtime_hhmm?: string;
    worked_hhmm?: string;
    duty_hhmm?: string;
  }>;
};

const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export default function AttendanceManagerPage() {
  const { selectedStoreId } = useStore();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [policy, setPolicy] = useState<AttendancePolicy | null>(null);
  const [schedules, setSchedules] = useState<EmployeeSchedule[]>([]);
  const [reportEmployees, setReportEmployees] = useState<ReportEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [isSavingRoster, setIsSavingRoster] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [manualClockTime, setManualClockTime] = useState(format(new Date(), 'HH:mm'));

  const [policyForm, setPolicyForm] = useState({
    mode: 'fixed_day_off',
    fixed_days_off: ['friday'] as string[],
    fixed_start_time: '10:00',
    fixed_end_time: '20:00',
    late_fee_per_minute: '0',
    overtime_rate_per_hour: '0',
    grace_period_minutes: '0',
    notes: '',
  });

  const [rosterForm, setRosterForm] = useState({
    start_time: '10:00',
    end_time: '20:00',
    duty_mode: 'selected_dates',
    notes: '',
    duty_dates: [] as string[],
  });

  useEffect(() => {
    if (!selectedStoreId) return;
    void loadAll();
  }, [selectedStoreId, selectedMonth, selectedDate]);

  const monthDates = useMemo(() => {
    const monthStart = startOfMonth(new Date(`${selectedMonth}-01T00:00:00`));
    const monthEnd = endOfMonth(monthStart);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [selectedMonth]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        employee.name.toLowerCase().includes(q) ||
        employee.email?.toLowerCase().includes(q) ||
        employee.phone?.toLowerCase().includes(q)
      );
    });
  }, [employees, search]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => Number(employee.id) === Number(selectedEmployeeId)) ?? null,
    [employees, selectedEmployeeId]
  );

  const selectedSchedule = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return schedules.find((row) => Number(row.employee_id) === Number(selectedEmployeeId)) ?? null;
  }, [schedules, selectedEmployeeId]);

  useEffect(() => {
    if (!selectedEmployeeId && employees.length > 0) {
      setSelectedEmployeeId(Number(employees[0].id));
    }
  }, [employees, selectedEmployeeId]);

  useEffect(() => {
    if (!policy) return;
    setPolicyForm({
      mode: policy.mode || 'fixed_day_off',
      fixed_days_off: policy.fixed_days_off || ['friday'],
      fixed_start_time: policy.fixed_start_time || '10:00',
      fixed_end_time: policy.fixed_end_time || '20:00',
      late_fee_per_minute: String(policy.late_fee_per_minute ?? 0),
      overtime_rate_per_hour: String(policy.overtime_rate_per_hour ?? 0),
      grace_period_minutes: String(policy.grace_period_minutes ?? 0),
      notes: policy.notes || '',
    });
  }, [policy]);

  useEffect(() => {
    if (!selectedSchedule) {
      setRosterForm((prev) => ({
        ...prev,
        duty_dates: [],
      }));
      return;
    }

    const monthStart = format(startOfMonth(new Date(`${selectedMonth}-01T00:00:00`)), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date(`${selectedMonth}-01T00:00:00`)), 'yyyy-MM-dd');
    const dutyDates = (selectedSchedule.duty_dates || []).filter((date) => date >= monthStart && date <= monthEnd);

    setRosterForm({
      start_time: selectedSchedule.start_time?.slice(0, 5) || '10:00',
      end_time: selectedSchedule.end_time?.slice(0, 5) || '20:00',
      duty_mode: selectedSchedule.duty_mode || 'selected_dates',
      notes: selectedSchedule.notes || '',
      duty_dates,
    });
  }, [selectedSchedule, selectedMonth]);

  const loadAll = async (): Promise<void> => {
    if (!selectedStoreId) return;

    setIsLoading(true);
    try {
      const monthStart = format(startOfMonth(new Date(`${selectedMonth}-01T00:00:00`)), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(new Date(`${selectedMonth}-01T00:00:00`)), 'yyyy-MM-dd');

      const [employeeData, policyData, scheduleData, reportData] = await Promise.all([
        employeeService.getAll({ store_id: selectedStoreId, is_active: true }),
        hrmService.getStorePolicy(selectedStoreId),
        hrmService.getSchedules({ store_id: selectedStoreId, date: monthStart }),
        hrmService.getAttendanceReport({ store_id: selectedStoreId, from: monthStart, to: monthEnd }),
      ]);

      setEmployees(employeeData);
      setPolicy(policyData);
      setSchedules(scheduleData);
      setReportEmployees(Array.isArray(reportData?.employees) ? (reportData.employees as ReportEmployee[]) : []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load attendance manager');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOffDay = (day: string): void => {
    setPolicyForm((prev) => ({
      ...prev,
      fixed_days_off: prev.fixed_days_off.includes(day)
        ? prev.fixed_days_off.filter((item) => item !== day)
        : [...prev.fixed_days_off, day],
    }));
  };

  const savePolicy = async (): Promise<void> => {
    if (!selectedStoreId) return;

    setIsSavingPolicy(true);
    try {
      await hrmService.upsertStorePolicy({
        store_id: selectedStoreId,
        mode: policyForm.mode,
        fixed_days_off: policyForm.mode === 'fixed_day_off' ? policyForm.fixed_days_off : [],
        fixed_start_time: policyForm.mode === 'fixed_day_off' ? policyForm.fixed_start_time : null,
        fixed_end_time: policyForm.mode === 'fixed_day_off' ? policyForm.fixed_end_time : null,
        late_fee_per_minute: Number(policyForm.late_fee_per_minute || 0),
        overtime_rate_per_hour: Number(policyForm.overtime_rate_per_hour || 0),
        grace_period_minutes: Number(policyForm.grace_period_minutes || 0),
        notes: policyForm.notes,
      });
      toast.success('Attendance mode saved');
      await loadAll();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not save attendance mode');
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const toggleDutyDate = (date: string): void => {
    setRosterForm((prev) => ({
      ...prev,
      duty_dates: prev.duty_dates.includes(date)
        ? prev.duty_dates.filter((item) => item !== date)
        : [...prev.duty_dates, date].sort(),
    }));
  };

  const autoFillRoster = (): void => {
    if (policyForm.mode === 'fixed_day_off') {
      const dates = monthDates
        .filter((day) => !policyForm.fixed_days_off.includes(format(day, 'EEEE').toLowerCase()))
        .map((day) => format(day, 'yyyy-MM-dd'));
      setRosterForm((prev) => ({ ...prev, duty_dates: dates }));
      return;
    }

    const firstTwentySix = monthDates.slice(0, 26).map((day) => format(day, 'yyyy-MM-dd'));
    setRosterForm((prev) => ({ ...prev, duty_dates: firstTwentySix }));
  };

  const clearRoster = (): void => {
    setRosterForm((prev) => ({ ...prev, duty_dates: [] }));
  };

  const saveRoster = async (): Promise<void> => {
    if (!selectedStoreId || !selectedEmployeeId) {
      toast.error('Select an employee first');
      return;
    }

    setIsSavingRoster(true);
    try {
      const monthStart = format(startOfMonth(new Date(`${selectedMonth}-01T00:00:00`)), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(new Date(`${selectedMonth}-01T00:00:00`)), 'yyyy-MM-dd');

      await hrmService.assignSchedule({
        employee_id: selectedEmployeeId,
        store_id: selectedStoreId,
        start_time: rosterForm.start_time,
        end_time: rosterForm.end_time,
        effective_from: monthStart,
        effective_to: monthEnd,
        duty_mode: 'selected_dates',
        duty_dates: rosterForm.duty_dates,
        notes: rosterForm.notes,
      });
      toast.success('Duty roster saved');
      await loadAll();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not save roster');
    } finally {
      setIsSavingRoster(false);
    }
  };

  const getScheduleForEmployee = (employeeId: number): EmployeeSchedule | null => {
    return schedules.find((row) => Number(row.employee_id) === Number(employeeId)) ?? null;
  };

  const isScheduledForDate = (schedule: EmployeeSchedule | null, date: string): boolean => {
    if (!schedule) return policyForm.mode !== 'always_on_duty';
    const mode = schedule.duty_mode || 'all_days';
    if (mode === 'selected_dates') return (schedule.duty_dates || []).includes(date);
    if (mode === 'weekly_pattern') {
      const dayName = format(new Date(`${date}T00:00:00`), 'EEEE').toLowerCase();
      return (schedule.weekly_days || []).includes(dayName);
    }
    return true;
  };

  const markEmployee = async (
    employeeId: number,
    action: 'clock_in' | 'clock_out' | 'absent' | 'leave'
  ): Promise<void> => {
    if (!selectedStoreId) return;

    try {
      const payloadEntry: Record<string, unknown> = {
        employee_id: employeeId,
        status: action === 'absent' ? 'absent' : action === 'leave' ? 'leave' : 'present',
      };

      if (action === 'clock_in') payloadEntry.in_time = manualClockTime;
      if (action === 'clock_out') payloadEntry.out_time = manualClockTime;

      await hrmService.markAttendance({
        store_id: selectedStoreId,
        attendance_date: selectedDate,
        entries: [payloadEntry],
      });

      toast.success('Attendance updated');
      await loadAll();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Attendance update failed');
    }
  };


  const minutesToHhmm = (minutes?: number): string => {
    const safe = Math.max(0, Number(minutes || 0));
    const hh = String(Math.floor(safe / 60)).padStart(2, '0');
    const mm = String(safe % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
    present: { label: 'P', bg: 'rgba(52,211,153,0.85)', color: '#fff' },
    late: { label: 'L', bg: 'rgba(245,158,11,0.85)', color: '#fff' },
    absent: { label: 'A', bg: 'rgba(239,68,68,0.85)', color: '#fff' },
    leave: { label: 'LV', bg: 'rgba(99,102,241,0.85)', color: '#fff' },
    half_day: { label: 'H', bg: 'rgba(249,115,22,0.85)', color: '#fff' },
    off_day_auto: { label: 'OFF', bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' },
    holiday_auto: { label: 'HD', bg: 'rgba(139,92,246,0.75)', color: '#fff' },
    upcoming: { label: 'UP', bg: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.25)' },
  };

  const reportRows = useMemo(() => {
    return reportEmployees.filter((item) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        item.employee.name.toLowerCase().includes(q) ||
        item.employee.employee_code?.toLowerCase().includes(q)
      );
    });
  }, [reportEmployees, search]);


  const attendanceTotals = useMemo(() => {
    return reportRows.reduce(
      (acc, row) => {
        acc.dutyDays += Number(row.summary.present || 0) + Number(row.summary.late || 0) + Number(row.summary.absent || 0) + Number(row.summary.leave || 0) + Number(row.summary.half_day || 0);
        acc.overtimeMinutes += Number(row.summary.overtime_minutes || 0);
        acc.workedMinutes += Number(row.summary.worked_minutes || 0);
        acc.dutyMinutes += Number(row.summary.duty_minutes || 0);
        return acc;
      },
      { dutyDays: 0, overtimeMinutes: 0, workedMinutes: 0, dutyMinutes: 0 }
    );
  }, [reportRows]);

  const dayMap = useMemo(() => {
    const map = new Map<number, ReportEmployee['daily'][number]>();
    reportEmployees.forEach((row) => {
      const dayRow = row.daily.find((item) => item.date === selectedDate);
      if (dayRow) map.set(row.employee.id, dayRow);
    });
    return map;
  }, [reportEmployees, selectedDate]);

  const statusClass = (status: string): string => {
    if (status === 'present') return 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300';
    if (status === 'late') return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
    if (status === 'absent') return 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300';
    if (status === 'leave') return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300';
    if (status === 'half_day') return 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300';
    if (status === 'holiday_auto') return 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300';
    return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300';
  };

  if (!selectedStoreId) {
    return (
      <div className="flex h-80 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-center dark:border-gray-700 dark:bg-gray-800">
        <CalendarDays className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Select a store</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose a branch to manage attendance and duty rosters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Attendance management</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure branch attendance rules, build employee duty rosters and manage daily clock-in/clock-out from one screen.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Branch policy</p>
              <h3 className="mt-1 font-semibold text-gray-900 dark:text-white">Attendance rules</h3>
            </div>
            <Settings2 className="h-5 w-5 text-gray-400" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPolicyForm((prev) => ({ ...prev, mode: 'fixed_day_off' }))}
              className={`rounded-lg border p-3 text-left transition ${policyForm.mode === 'fixed_day_off' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50'}`}
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Weekly holiday</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Shared off-day and shift hours.</p>
            </button>
            <button
              type="button"
              onClick={() => setPolicyForm((prev) => ({ ...prev, mode: 'always_on_duty' }))}
              className={`rounded-lg border p-3 text-left transition ${policyForm.mode === 'always_on_duty' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50'}`}
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Roster based</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Duty dates assigned per employee.</p>
            </button>
          </div>

          {policyForm.mode === 'fixed_day_off' && (
            <div className="mt-5">
              <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-300">Weekly off days</label>
              <div className="grid grid-cols-2 gap-2">
                {WEEK_DAYS.map((day) => {
                  const active = policyForm.fixed_days_off.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleOffDay(day)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize transition ${active ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50'}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {policyForm.mode === 'fixed_day_off' && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Shift start
                <input type="time" value={policyForm.fixed_start_time} onChange={(event) => setPolicyForm((prev) => ({ ...prev, fixed_start_time: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
              </label>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Shift end
                <input type="time" value={policyForm.fixed_end_time} onChange={(event) => setPolicyForm((prev) => ({ ...prev, fixed_end_time: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
              </label>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Grace (min)
              <input type="number" min="0" value={policyForm.grace_period_minutes} onChange={(event) => setPolicyForm((prev) => ({ ...prev, grace_period_minutes: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </label>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Late fee / min
              <input type="number" min="0" step="0.01" value={policyForm.late_fee_per_minute} onChange={(event) => setPolicyForm((prev) => ({ ...prev, late_fee_per_minute: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </label>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
              OT / hour
              <input type="number" min="0" step="0.01" value={policyForm.overtime_rate_per_hour} onChange={(event) => setPolicyForm((prev) => ({ ...prev, overtime_rate_per_hour: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </label>
          </div>

          <label className="mt-4 block text-xs font-medium text-gray-600 dark:text-gray-300">
            Notes
            <textarea value={policyForm.notes} onChange={(event) => setPolicyForm((prev) => ({ ...prev, notes: event.target.value }))} rows={2} className="mt-1.5 w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" placeholder="Optional attendance policy notes" />
          </label>

          <button onClick={() => void savePolicy()} disabled={isSavingPolicy} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            <Save className="h-4 w-4" /> {isSavingPolicy ? 'Saving…' : 'Save attendance policy'}
          </button>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 xl:col-span-2 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Employee schedule</p>
              <h3 className="mt-1 font-semibold text-gray-900 dark:text-white">Monthly duty roster</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Select an employee, set duty hours and mark their working dates for the month.</p>
            </div>
            <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Employee
              <select value={selectedEmployeeId || ''} onChange={(event) => setSelectedEmployeeId(event.target.value ? Number(event.target.value) : null)} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                <option value="">Select employee</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Duty start
              <input type="time" value={rosterForm.start_time} onChange={(event) => setRosterForm((prev) => ({ ...prev, start_time: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </label>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Duty end
              <input type="time" value={rosterForm.end_time} onChange={(event) => setRosterForm((prev) => ({ ...prev, end_time: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{selectedEmployee?.name || 'No employee selected'} · {rosterForm.duty_dates.length} duty days</p>
            <div className="flex gap-2">
              <button onClick={autoFillRoster} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"><RotateCcw className="h-3.5 w-3.5" /> Auto fill</button>
              <button onClick={clearRoster} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">Clear</button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1.5 sm:grid-cols-10 md:grid-cols-14 lg:grid-cols-16">
            {monthDates.map((day) => {
              const date = format(day, 'yyyy-MM-dd');
              const active = rosterForm.duty_dates.includes(date);
              return (
                <button key={date} type="button" onClick={() => toggleDutyDate(date)} title={format(day, 'EEEE, dd MMM yyyy')} className={`rounded-lg border px-1 py-2 text-center transition ${active ? 'border-blue-500 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}>
                  <span className="block text-[9px] uppercase opacity-70">{format(day, 'EEE').slice(0, 1)}</span>
                  <span className="block text-xs font-semibold">{format(day, 'dd')}</span>
                </button>
              );
            })}
          </div>

          <label className="mt-4 block text-xs font-medium text-gray-600 dark:text-gray-300">
            Roster notes
            <textarea value={rosterForm.notes} onChange={(event) => setRosterForm((prev) => ({ ...prev, notes: event.target.value }))} rows={2} className="mt-1.5 w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" placeholder="Optional schedule notes" />
          </label>
          <button onClick={() => void saveRoster()} disabled={isSavingRoster || !selectedEmployeeId} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white">
            <Save className="h-4 w-4" /> {isSavingRoster ? 'Saving…' : 'Save roster'}
          </button>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 lg:flex-row lg:items-end lg:justify-between dark:border-gray-700">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Daily attendance</p>
            <h3 className="mt-1 font-semibold text-gray-900 dark:text-white">Manager controls</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Record clock-in, clock-out, leave or absence using the selected manual time.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="relative">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </label>
            <label className="relative">
              <Clock3 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="time" value={manualClockTime} onChange={(event) => setManualClockTime(event.target.value)} className="rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </label>
            <label className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee" className="min-w-52 rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50 text-left dark:bg-gray-900/40">
              <tr>
                {['Employee', 'Duty', 'Status', 'In', 'Out', 'Worked', 'Overtime', 'Actions'].map((heading) => <th key={heading} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{heading}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-500">Loading attendance…</td></tr>
              ) : filteredEmployees.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-500">No employees found.</td></tr>
              ) : filteredEmployees.map((employee) => {
                const employeeId = Number(employee.id);
                const schedule = getScheduleForEmployee(employeeId);
                const dutyActive = isScheduledForDate(schedule, selectedDate);
                const day = dayMap.get(employeeId);
                const status = day?.status || (dutyActive ? 'not_marked' : 'off_day_auto');
                return (
                  <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-5 py-3.5"><p className="text-sm font-medium text-gray-900 dark:text-white">{employee.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{employee.employee_code || employee.email || ''}</p></td>
                    <td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${dutyActive ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'}`}>{dutyActive ? 'Scheduled' : 'Off duty'}</span></td>
                    <td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(status)}`}>{status.replace(/_/g, ' ')}</span></td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">{day?.in_time || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">{day?.out_time || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">{day?.worked_hhmm || minutesToHhmm(day?.worked_minutes)}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900 dark:text-white">{day?.overtime_hhmm || minutesToHhmm(day?.overtime_minutes)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        <button disabled={!dutyActive} onClick={() => void markEmployee(employeeId, 'clock_in')} className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-30"><LogIn className="h-3.5 w-3.5" /> In</button>
                        <button disabled={!dutyActive} onClick={() => void markEmployee(employeeId, 'clock_out')} className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-30 dark:bg-gray-100 dark:text-gray-900"><LogOut className="h-3.5 w-3.5" /> Out</button>
                        <button disabled={!dutyActive} onClick={() => void markEmployee(employeeId, 'leave')} className="rounded-lg border border-indigo-200 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-30 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/30">Leave</button>
                        <button disabled={!dutyActive} onClick={() => void markEmployee(employeeId, 'absent')} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-30 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30">Absent</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Planned Duty Days', value: rosterForm.duty_dates.length.toLocaleString(), note: selectedEmployee?.name || 'Selected employee', icon: CheckCircle2 },
          { label: 'Active Staff', value: employees.length.toLocaleString(), note: 'Selected branch', icon: Users },
          { label: 'Monthly Overtime', value: minutesToHhmm(attendanceTotals.overtimeMinutes), note: 'Across filtered employees', icon: Clock3 },
          { label: 'Manual Clock Time', value: manualClockTime, note: 'Used by attendance actions', icon: ShieldCheck },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p><p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{card.note}</p></div><card.icon className="h-5 w-5 text-gray-400" /></div>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
          <div><h3 className="font-semibold text-gray-900 dark:text-white">Monthly attendance matrix</h3><p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Day-by-day status plus duty-day and overtime summary.</p></div>
          <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">{format(new Date(`${selectedMonth}-01T00:00:00`), 'MMMM yyyy')}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="sticky left-0 z-10 min-w-[180px] bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">Employee</th>
                <th className="min-w-[85px] px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Duty</th>
                <th className="min-w-[85px] px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">OT</th>
                {monthDates.map((day) => <th key={day.toISOString()} className={`min-w-[34px] px-1 py-3 text-center text-[10px] font-semibold ${isToday(day) ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300' : 'text-gray-400'}`}><span className="block">{format(day, 'dd')}</span><span className="block text-[8px] font-normal">{format(day, 'EEE').slice(0, 1)}</span></th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {reportRows.length === 0 ? (
                <tr><td colSpan={monthDates.length + 3} className="px-5 py-12 text-center text-sm text-gray-500">No monthly attendance data found.</td></tr>
              ) : reportRows.map((row) => {
                const schedule = getScheduleForEmployee(row.employee.id);
                const dutyCount = schedule?.duty_dates?.filter((date) => date.startsWith(selectedMonth)).length ?? 0;
                return (
                  <tr key={row.employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="sticky left-0 z-[5] bg-white px-5 py-3 dark:bg-gray-800"><p className="text-sm font-medium text-gray-900 dark:text-white">{row.employee.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{row.employee.employee_code || 'No code'}</p></td>
                    <td className="px-3 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-200">{dutyCount || Number(row.summary.present || 0) + Number(row.summary.late || 0) + Number(row.summary.absent || 0) + Number(row.summary.leave || 0)}</td>
                    <td className="px-3 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-200">{String(row.summary.overtime_hhmm || minutesToHhmm(Number(row.summary.overtime_minutes || 0)))}</td>
                    {row.daily.map((day) => {
                      const cfg = statusConfig[day.status] || { label: '·', bg: '', color: '' };
                      return <td key={`${row.employee.id}-${day.date}`} className="px-0.5 py-3 text-center"><div title={`${day.date} · ${day.status}${day.in_time ? ` · IN ${day.in_time}` : ''}${day.out_time ? ` · OUT ${day.out_time}` : ''}`} className={`mx-auto flex h-6 min-w-6 items-center justify-center rounded px-1 text-[8px] font-bold ${statusClass(day.status)}`}>{cfg.label}</div></td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
        <TimerReset className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <p className="text-sm text-blue-800 dark:text-blue-300">Set the branch policy first. For roster-based branches, assign monthly duty dates per employee, then use Daily Attendance to record actual attendance.</p>
      </div>
    </div>
  );
}

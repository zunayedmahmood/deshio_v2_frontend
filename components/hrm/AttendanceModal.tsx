'use client';

import { useState } from 'react';
import { X, Clock, CheckCircle2, AlertCircle, Edit3 } from 'lucide-react';
import hrmService from '@/services/hrmService';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: { id: number; name: string };
  type: 'check_in' | 'check_out' | 'edit';
  record?: any;
  storeId: number;
  onSuccess: () => void;
}

export default function AttendanceModal({ isOpen, onClose, employee, type, record, storeId, onSuccess }: AttendanceModalProps) {
  const now = new Date();
  // Ensure H:i format (no seconds) — backend validates date_format:H:i
  const [time, setTime] = useState(format(now, 'HH:mm'));
  // Strip seconds if backend returns H:i:s format
  const stripSecs = (t?: string | null) => t ? t.slice(0, 5) : '';
  const [inTime, setInTime] = useState(stripSecs(record?.clock_in || record?.in_time));
  const [outTime, setOutTime] = useState(stripSecs(record?.clock_out || record?.out_time));
  const [status, setStatus] = useState(record?.status?.toLowerCase() || 'present');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState(record?.notes || '');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const todayDate = format(now, 'yyyy-MM-dd');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let res;
      if (type === 'edit') {
        if (!reason.trim()) {
          toast.error('Reason is required for manual edits.');
          setIsLoading(false);
          return;
        }
        if (!record?.id) {
          toast.error('No attendance record found to edit.');
          setIsLoading(false);
          return;
        }
        res = await hrmService.updateAttendance(record.id, {
          status,
          in_time: inTime ? inTime.slice(0, 5) : null,
          out_time: outTime ? outTime.slice(0, 5) : null,
          reason,
          notes
        });
      } else {
        // check_in or check_out — build the bulk-mark payload the backend expects
        // Helper to ensure H:i format (strip seconds if present)
        const toHHmm = (t?: string | null) => t ? t.slice(0, 5) : undefined;

        res = await hrmService.markAttendance({
          store_id: storeId,
          attendance_date: todayDate,
          entries: [
            {
              employee_id: Number(employee.id),
              status: type === 'check_in' ? 'present' : 'present',
              in_time: type === 'check_in' ? toHHmm(time) : toHHmm(record?.clock_in || record?.in_time),
              out_time: type === 'check_out' ? toHHmm(time) : undefined,
            }
          ]
        });
      }

      if (res?.success) {
        toast.success(`${employee.name}'s attendance updated!`);
        onSuccess();
        onClose();
      } else {
        toast.error(res?.message || 'Failed to update attendance');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const typeLabel = type === 'check_in' ? 'Clock In' : type === 'check_out' ? 'Clock Out' : 'Edit Attendance';
  const buttonColor = type === 'check_in' ? 'bg-black dark:bg-blue-600' : type === 'edit' ? 'bg-blue-600' : 'bg-red-600';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {type === 'edit' ? <Edit3 className="w-6 h-6 text-blue-500" /> : <Clock className="w-6 h-6 text-blue-500" />}
            {typeLabel}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-widest font-semibold">Employee</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white underline decoration-blue-500 decoration-4 underline-offset-4">
              {employee.name}
            </p>
            <p className="text-xs text-gray-400 mt-2">{format(now, 'EEEE, MMMM d, yyyy')}</p>
          </div>

          {type !== 'edit' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {type === 'check_in' ? 'Clock In Time' : 'Clock Out Time'}
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full text-4xl font-bold text-center py-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border-2 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white outline-none"
                required
              />
              <p className="text-xs text-gray-400 text-center">
                Current time: {format(now, 'hh:mm a')}
              </p>
            </div>
          )}

          {type === 'edit' && (
            <div className="space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 outline-none focus:border-blue-500"
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="leave">Leave</option>
                  <option value="half_day">Half Day</option>
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">In Time</label>
                  <input
                    type="time"
                    value={inTime}
                    onChange={(e) => setInTime(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Out Time</label>
                  <input
                    type="time"
                    value={outTime}
                    onChange={(e) => setOutTime(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason for Edit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Forgot to clock in"
                  required
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional details..."
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 outline-none"
                />
              </div>
            </div>
          )}

          {type !== 'edit' && (
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 flex gap-3 text-sm text-blue-800 dark:text-blue-300">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>
                {type === 'check_in'
                  ? 'Late entries after grace period will be automatically flagged.'
                  : 'Early exits before shift end will be flagged by the policy.'}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 px-6 rounded-2xl text-white font-bold text-lg shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${buttonColor}`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : `Confirm ${typeLabel}`}
          </button>
        </form>
      </div>
    </div>
  );
}
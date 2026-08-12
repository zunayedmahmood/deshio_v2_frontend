'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Clock, Edit3, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import hrmService from '@/services/hrmService';

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
  const stripSeconds = (value?: string | null) => value ? value.slice(0, 5) : '';
  const [time, setTime] = useState(format(now, 'HH:mm'));
  const [inTime, setInTime] = useState(stripSeconds(record?.clock_in || record?.in_time));
  const [outTime, setOutTime] = useState(stripSeconds(record?.clock_out || record?.out_time));
  const [status, setStatus] = useState(record?.status?.toLowerCase() || 'present');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState(record?.notes || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTime(format(new Date(), 'HH:mm'));
    setInTime(stripSeconds(record?.clock_in || record?.in_time));
    setOutTime(stripSeconds(record?.clock_out || record?.out_time));
    setStatus(record?.status?.toLowerCase() || 'present');
    setReason('');
    setNotes(record?.notes || '');
  }, [isOpen, record?.id, type]);

  if (!isOpen) return null;

  const isEdit = type === 'edit';
  const typeLabel = type === 'check_in' ? 'Clock in' : type === 'check_out' ? 'Clock out' : 'Edit attendance';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      let response;
      if (isEdit) {
        if (!reason.trim()) {
          toast.error('Reason is required for manual edits.');
          return;
        }
        if (!record?.id) {
          toast.error('No attendance record found to edit.');
          return;
        }
        response = await hrmService.updateAttendance(record.id, {
          status,
          in_time: inTime || null,
          out_time: outTime || null,
          reason,
          notes,
        });
      } else {
        response = await hrmService.markAttendance({
          store_id: storeId,
          attendance_date: format(now, 'yyyy-MM-dd'),
          entries: [{
            employee_id: Number(employee.id),
            status: 'present',
            in_time: type === 'check_in' ? time : stripSeconds(record?.clock_in || record?.in_time) || undefined,
            out_time: type === 'check_out' ? time : undefined,
          }],
        });
      }

      if (!response?.success) {
        toast.error(response?.message || 'Failed to update attendance');
        return;
      }

      toast.success(`${employee.name}'s attendance updated`);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update attendance');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${type === 'check_out' ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' : isEdit ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' : 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400'}`}>
              {isEdit ? <Edit3 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{typeLabel}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{employee.name} · {format(now, 'dd MMM yyyy')}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {!isEdit ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">{type === 'check_in' ? 'Clock-in time' : 'Clock-out time'}</label>
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-center text-2xl font-bold text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-900/30"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Shift rules will automatically flag late arrivals or early exits.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Status</label>
                <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  {['present', 'late', 'absent', 'leave', 'half_day'].map((value) => (
                    <option key={value} value={value}>{value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">In time</label>
                  <input type="time" value={inTime} onChange={(event) => setInTime(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Out time</label>
                  <input type="time" value={outTime} onChange={(event) => setOutTime(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Reason <span className="text-red-500">*</span></label>
                <input value={reason} onChange={(event) => setReason(event.target.value)} required placeholder="Why is this being edited?" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Notes</label>
                <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional notes" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={isLoading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isLoading ? 'Saving…' : typeLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

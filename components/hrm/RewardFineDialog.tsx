'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { BadgeDollarSign, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import hrmService from '@/services/hrmService';

interface RewardFineDialogProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: number;
  employee: { id: number; name: string } | null;
  onSuccess: () => void;
  editData?: any;
}

const rewardPresets = ['Festival Bonus', 'Overtime Bonus', 'Target Meet Bonus', 'Performance Bonus', 'Attendance Bonus', 'Special Incentive'];
const finePresets = ['Disciplinary Fine', 'Cash Shortage', 'Damage Recovery', 'Absence Penalty', 'Late Penalty', 'Policy Violation'];

export default function RewardFineDialog({ isOpen, onClose, storeId, employee, onSuccess, editData }: RewardFineDialogProps) {
  const [type, setType] = useState<'reward' | 'fine'>('reward');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editData) {
      setType(editData.entry_type);
      setAmount(String(editData.amount || ''));
      setTitle(editData.title || '');
      setNotes(editData.notes || '');
      setDate(String(editData.entry_date || '').slice(0, 10));
    } else {
      setType('reward');
      setAmount('');
      setTitle('');
      setNotes('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [editData, isOpen]);

  if (!isOpen || !employee) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      const response = editData
        ? await hrmService.updateRewardFine(editData.id, {
            entry_date: date,
            entry_type: type,
            amount: numericAmount,
            title,
            notes,
            reason: 'Manual update from UI',
          })
        : await hrmService.createRewardFine({
            store_id: storeId,
            employee_id: employee.id,
            entry_date: date,
            entry_type: type,
            amount: numericAmount,
            title,
            notes,
          });

      if (!response.success) {
        toast.error(response.message || 'Failed to save entry');
        return;
      }

      toast.success(editData ? 'Entry updated' : 'Entry created');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || 'Failed to save entry');
    } finally {
      setIsLoading(false);
    }
  };

  const presets = type === 'reward' ? rewardPresets : finePresets;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gray-100 p-2 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              <BadgeDollarSign className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{editData ? 'Edit reward / fine' : 'Add reward / fine'}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{employee.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-900/50">
            {(['reward', 'fine'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => { setType(value); setTitle(''); }}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  type === value
                    ? value === 'reward'
                      ? 'bg-white text-green-700 shadow-sm dark:bg-gray-700 dark:text-green-300'
                      : 'bg-white text-red-700 shadow-sm dark:bg-gray-700 dark:text-red-300'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {value === 'reward' ? 'Reward' : 'Fine'}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Amount (BDT)</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
              placeholder="0"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-900/30"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              placeholder="Reason/title"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-900/30"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTitle(preset)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    title === preset
                      ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Date</label>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Notes</label>
              <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">Cancel</button>
            <button
              type="submit"
              disabled={isLoading}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${type === 'reward' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {isLoading ? 'Saving…' : editData ? 'Update entry' : `Add ${type}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Target, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import hrmService from '@/services/hrmService';

interface SalesTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: { id: number; name: string } | null;
  onSuccess: () => void;
  storeId: number;
  initialTarget?: number;
  initialMonth?: string;
}

export default function SalesTargetModal({
  isOpen,
  onClose,
  employee,
  onSuccess,
  storeId,
  initialTarget,
  initialMonth,
}: SalesTargetModalProps) {
  const [targetAmount, setTargetAmount] = useState(initialTarget?.toString() || '');
  const [targetMonth, setTargetMonth] = useState(initialMonth || format(new Date(), 'yyyy-MM'));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setTargetAmount(initialTarget && initialTarget > 0 ? initialTarget.toString() : '');
    setTargetMonth(initialMonth || format(new Date(), 'yyyy-MM'));
  }, [initialTarget, initialMonth, employee?.id]);

  if (!isOpen || !employee) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(targetAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid target amount');
      return;
    }

    setIsLoading(true);
    try {
      const response = await hrmService.setSalesTarget({
        store_id: storeId,
        employee_id: employee.id,
        target_amount: amount,
        target_month: targetMonth,
      });

      if (!response.success) {
        toast.error(response.message || 'Failed to save target');
        return;
      }

      toast.success(`Sales target saved for ${employee.name}`);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to save target');
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
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Set monthly sales target</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{employee.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Target month</label>
            <input
              type="month"
              value={targetMonth}
              onChange={(event) => setTargetMonth(event.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-900/30"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Target amount (BDT)</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={targetAmount}
              onChange={(event) => setTargetAmount(event.target.value)}
              placeholder="e.g. 100000"
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-900/30"
            />
          </div>

          <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-xs text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
            Progress is calculated from the employee&apos;s completed POS and Social Commerce sales for this month.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Saving…' : 'Save target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

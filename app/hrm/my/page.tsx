'use client';

import { useState, useEffect } from 'react';
import hrmService, { AttendanceRecord } from '@/services/hrmService';
import { useAuth } from '@/contexts/AuthContext';
import {
  Clock,
  Calendar,
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';

export default function MyHRMPage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [rewardsFines, setRewardsFines] = useState<any[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [attData, perfData, rfData] = await Promise.all([
        hrmService.getMyAttendance(),
        hrmService.getMyPerformance(),
        hrmService.getMyRewardsFines()
      ]);
      setAttendance(attData);
      setPerformance(perfData);
      setRewardsFines(rfData);
    } catch (error) {
      console.error('Failed to load personal HRM data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const todayRecord = attendance.find(r => r.attendance_date === format(new Date(), 'yyyy-MM-dd'));
  const todayStatus = todayRecord?.status?.toLowerCase() ?? '';

  const getStatusBadgeClass = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'present') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (s === 'late') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    if (s === 'absent') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (s === 'leave') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (s === 'half_day') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  const formatStatus = (status: string) => {
    if (!status) return 'Not Marked';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Welcome back, {user?.name}!</h2>
            <p className="text-gray-500 dark:text-gray-400">Here's your performance and attendance overview for this month.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Today's Attendance Widget */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Today's Status
            </h3>
            {todayRecord ? (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(todayRecord.status)}`}>
                {formatStatus(todayRecord.status)}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                Not Marked
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <span className="text-sm text-gray-500 dark:text-gray-400">Check In</span>
              <span className="font-medium text-gray-900 dark:text-white">{todayRecord?.clock_in ?? '--:--'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <span className="text-sm text-gray-500 dark:text-gray-400">Check Out</span>
              <span className="font-medium text-gray-900 dark:text-white">{todayRecord?.clock_out ?? '--:--'}</span>
            </div>
            {todayRecord?.is_late && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Late entry recorded</span>
              </div>
            )}
          </div>
        </div>

        {/* Sales Target Widget */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 md:col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Monthly Sales Target
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">{format(new Date(), 'MMMM yyyy')}</span>
          </div>

          {!performance?.target ? (
            <div className="flex flex-col items-center justify-center py-6 text-gray-400 dark:text-gray-500">
              <TrendingUp className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">No sales target set for this month.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500 dark:text-gray-400">Progress</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{performance?.percent || 0}% Achievement</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-1000 ${(performance?.percent || 0) >= 100 ? 'bg-emerald-500' : (performance?.percent || 0) >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(performance?.percent || 0, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider mb-1">Achieved</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">৳{(performance?.achieved || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-1">Target</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">৳{(performance?.target || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance History */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Recent Attendance</h3>
            <span className="text-xs text-gray-400">Last {Math.min(attendance.length, 7)} records</span>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {attendance.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No attendance records found.</p>
              </div>
            ) : (
              attendance.slice(0, 7).map((record) => {
                const s = record.status?.toLowerCase();
                const isGood = s === 'present';
                const isBad = s === 'absent';
                return (
                  <div key={record.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isGood ? 'bg-green-50 text-green-600 dark:bg-green-900/20' : isBad ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20'}`}>
                        {isGood ? <CheckCircle2 className="w-5 h-5" /> : isBad ? <XCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {format(new Date(record.attendance_date), 'EEE, MMM d')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatStatus(record.status)}{record.is_late ? ' · Late' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{record.clock_in || '--:--'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{record.clock_out || '--:--'}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Rewards & Performance Insights */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-6">Performance Insights</h3>
          <div className="space-y-4">
            {attendance.filter(r => r.is_late).length > 0 && (
              <div className="flex items-start gap-4 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20">
                <AlertCircle className="w-6 h-6 text-orange-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-orange-800 dark:text-orange-300">Attendance Note</p>
                  <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                    You have been late {attendance.filter(r => r.is_late).length} times this month.
                  </p>
                </div>
              </div>
            )}
            {(performance?.percent || 0) >= 100 && (
              <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                <Award className="w-6 h-6 text-blue-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-blue-800 dark:text-blue-300">Sales Achievement 🎉</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">You reached your sales target this month!</p>
                </div>
              </div>
            )}
            {rewardsFines.length > 0 && (
              <div className="flex items-start gap-4 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20">
                <Award className="w-6 h-6 text-purple-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-purple-800 dark:text-purple-300">Rewards & Fines</p>
                  <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">
                    {rewardsFines.length} entr{rewardsFines.length === 1 ? 'y' : 'ies'}. Net: ৳{
                      rewardsFines.reduce((acc, row) => acc + (row.entry_type === 'reward' ? Number(row.amount) : -Number(row.amount)), 0).toLocaleString()
                    }
                  </p>
                </div>
              </div>
            )}
            {attendance.filter(r => r.is_late).length === 0 && (performance?.percent || 0) < 100 && rewardsFines.length === 0 && (
              <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                No new insights this month. Keep up the good work!
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl group transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <Award className="w-5 h-5 text-purple-500" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">View Reward/Fine History</span>
              </div>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isHistoryOpen ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
            </button>

            {isHistoryOpen && (
              <div className="mt-4 space-y-3 border-l-2 border-purple-500 pl-4 ml-6">
                {rewardsFines.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-2">No records found for this month.</p>
                ) : (
                  rewardsFines.map(entry => (
                    <div key={entry.id} className="flex justify-between items-center p-3 text-sm bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{entry.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(entry.entry_date), 'MMM dd, yyyy')}</p>
                      </div>
                      <span className={`font-bold ${entry.entry_type === 'reward' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {entry.entry_type === 'reward' ? '+' : '-'}৳{Number(entry.amount).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

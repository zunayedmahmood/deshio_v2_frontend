'use client';

import { useEffect, useState } from 'react';
import { Save, Search, RefreshCcw } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Toast from '@/components/Toast';
import axios from '@/lib/axios';
import customerRewardService, { LoyaltyEarningRule } from '@/services/customerRewardService';

type ToastType = 'success' | 'error' | 'info' | 'warning';
const n = (value: any) => Number(value || 0);

export default function CustomerRewardsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentRate, setCurrentRate] = useState<LoyaltyEarningRule | null>(null);
  const [rateHistory, setRateHistory] = useState<LoyaltyEarningRule[]>([]);
  const [pointsPer1000, setPointsPer1000] = useState('');
  const [takaPerPoint, setTakaPerPoint] = useState('');
  const [rateNotes, setRateNotes] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedSummary, setSelectedSummary] = useState<any>(null);
  const [manualPoints, setManualPoints] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: ToastType }>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: ToastType = 'success') => setToast({ show: true, message, type });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settings = await customerRewardService.getSettings();
      setCurrentRate(settings.current_rate);
      setRateHistory(settings.rate_history || []);
      setPointsPer1000(String(settings.current_rate?.points_per_1000 ?? 0));
      setTakaPerPoint(String(settings.current_rate?.taka_per_point ?? 1));
    } catch (error: any) {
      showToast(error?.response?.data?.message || error.message || 'Failed to load loyalty settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSettings(); }, []);

  const saveRate = async () => {
    const earn = Number(pointsPer1000);
    const value = Number(takaPerPoint);
    if (!Number.isFinite(earn) || earn < 0) return showToast('Points per Tk 1000 must be zero or greater.', 'error');
    if (!Number.isFinite(value) || value <= 0) return showToast('Taka per point must be greater than zero.', 'error');
    setSaving(true);
    try {
      await customerRewardService.updateEarningRate(earn, value, rateNotes.trim() || undefined);
      setRateNotes('');
      await loadSettings();
      showToast('Loyalty conversion updated. Existing order snapshots are unchanged.', 'success');
    } catch (error: any) {
      showToast(error?.response?.data?.message || error.message || 'Failed to update loyalty conversion.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const searchCustomer = async () => {
    if (!customerSearch.trim()) return;
    try {
      const res = await axios.get('/customers/search', { params: { search: customerSearch.trim(), limit: 10 } });
      const data = res.data?.data ?? res.data;
      setCustomerResults(Array.isArray(data) ? data : data?.data || []);
    } catch (error: any) {
      showToast(error?.response?.data?.message || error.message || 'Failed to search customer.', 'error');
    }
  };

  const selectCustomer = async (customer: any) => {
    setSelectedCustomer(customer);
    try {
      setSelectedSummary(await customerRewardService.getCustomerSummary(Number(customer.id)));
    } catch (error: any) {
      showToast(error?.response?.data?.message || error.message || 'Failed to load customer points.', 'error');
    }
  };

  const adjustPoints = async () => {
    if (!selectedCustomer) return;
    const delta = parseInt(manualPoints, 10);
    if (!delta || !manualReason.trim()) return showToast('Enter a non-zero point adjustment and reason.', 'error');
    try {
      await customerRewardService.adjustCustomerPoints(Number(selectedCustomer.id), delta, manualReason.trim());
      setManualPoints('');
      setManualReason('');
      await selectCustomer(selectedCustomer);
      showToast('Customer points adjusted.', 'success');
    } catch (error: any) {
      showToast(error?.response?.data?.message || error.message || 'Failed to adjust customer points.', 'error');
    }
  };

  const wallet = selectedSummary?.summary?.wallet;
  const account = selectedSummary?.summary?.account;
  const transactions = selectedSummary?.summary?.recent_transactions || [];

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header darkMode={darkMode} setDarkMode={setDarkMode} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Customer Loyalty Points</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Phone-based earning and direct order discount settings.</p>
                </div>
                <button onClick={loadSettings} disabled={loading} className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm dark:text-white flex items-center gap-2"><RefreshCcw className="w-4 h-4" /> Refresh</button>
              </div>

              <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Loyalty conversion</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="text-sm text-gray-700 dark:text-gray-300">Tk 1000 purchase gives
                    <div className="mt-1 flex items-center gap-2"><input type="number" min="0" step="0.01" value={pointsPer1000} onChange={(e) => setPointsPer1000(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 dark:text-white" /><span className="text-sm">points</span></div>
                  </label>
                  <label className="text-sm text-gray-700 dark:text-gray-300">1 point gives
                    <div className="mt-1 flex items-center gap-2"><span className="text-sm">৳</span><input type="number" min="0.01" step="0.01" value={takaPerPoint} onChange={(e) => setTakaPerPoint(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 dark:text-white" /><span className="text-sm">discount</span></div>
                  </label>
                </div>
                <textarea value={rateNotes} onChange={(e) => setRateNotes(e.target.value)} placeholder="Optional note for this rate change" rows={2} className="mt-4 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white" />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button onClick={saveRate} disabled={saving} className="rounded-lg bg-gray-900 text-white dark:bg-white dark:text-black px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save conversion'}</button>
                  {currentRate && <span className="text-xs text-gray-500">Current: Tk 1000 = {n(currentRate.points_per_1000)} points · 1 point = ৳{n(currentRate.taka_per_point).toFixed(2)}</span>}
                </div>
                {rateHistory.length > 1 && <div className="mt-5 border-t border-gray-100 dark:border-gray-700 pt-4"><p className="text-xs font-semibold text-gray-500 mb-2">Recent conversion history</p><div className="space-y-1 max-h-40 overflow-auto">{rateHistory.slice(0, 10).map((r) => <div key={r.id} className="text-xs text-gray-600 dark:text-gray-300">{new Date(r.active_from).toLocaleString()} — Tk 1000 = {n(r.points_per_1000)} pts; 1 pt = ৳{n(r.taka_per_point).toFixed(2)}{r.notes ? ` — ${r.notes}` : ''}</div>)}</div></div>}
              </section>

              <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Customer point lookup</h2>
                <div className="flex gap-2 mb-4"><input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchCustomer()} placeholder="Search by name, phone, email, code" className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white" /><button onClick={searchCustomer} className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm flex items-center gap-2"><Search className="w-4 h-4" /> Search</button></div>
                {customerResults.length > 0 && <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-5">{customerResults.map((c) => <button key={c.id} onClick={() => selectCustomer(c)} className="text-left rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-900"><p className="font-medium text-sm text-gray-900 dark:text-white">{c.name}</p><p className="text-xs text-gray-500">{c.phone} · {c.customer_code}</p></button>)}</div>}
                {selectedCustomer && <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><p className="text-xs text-gray-500">Selected customer</p><p className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.name}</p><p className="text-xs text-gray-500">{selectedCustomer.phone}</p><p className="mt-4 text-3xl font-semibold text-gray-900 dark:text-white">{wallet?.points_balance ?? account?.points_balance ?? 0}</p><p className="text-xs text-gray-500">points · worth ৳{n(wallet?.discount_value).toFixed(2)}</p></div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><p className="font-semibold text-gray-900 dark:text-white mb-3">Manual adjustment</p><input type="number" value={manualPoints} onChange={(e) => setManualPoints(e.target.value)} placeholder="+100 or -50" className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white mb-2" /><input value={manualReason} onChange={(e) => setManualReason(e.target.value)} placeholder="Reason required" className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white mb-3" /><button onClick={adjustPoints} className="w-full rounded-lg bg-gray-900 text-white dark:bg-white dark:text-black py-2 text-sm">Apply adjustment</button></div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><p className="font-semibold text-gray-900 dark:text-white mb-3">Recent transactions</p><div className="space-y-2 max-h-64 overflow-auto">{transactions.length === 0 && <p className="text-xs text-gray-500">No point activity yet.</p>}{transactions.map((t: any) => <div key={t.id} className="text-xs border-b border-gray-100 dark:border-gray-700 pb-2"><p className="font-medium text-gray-900 dark:text-white">{t.description}</p><p className={n(t.points_delta) >= 0 ? 'text-green-600' : 'text-red-600'}>{n(t.points_delta) >= 0 ? '+' : ''}{t.points_delta} → {t.points_balance_after}</p></div>)}</div></div>
                </div>}
              </section>
            </div>
          </main>
        </div>
      </div>
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />}
    </div>
  );
}

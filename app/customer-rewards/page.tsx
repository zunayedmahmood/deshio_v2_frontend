'use client';

import { useEffect, useMemo, useState } from 'react';
import { Gift, Save, Plus, Search, RefreshCcw } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Toast from '@/components/Toast';
import axios from '@/lib/axios';
import customerRewardService, { CustomerReward, LoyaltyEarningRule } from '@/services/customerRewardService';

type ToastType = 'success' | 'error' | 'info' | 'warning';

const emptyReward: Partial<CustomerReward> = {
  code: '',
  name: '',
  description: '',
  type: 'fixed_discount',
  points_required: 100,
  value: 50,
  minimum_order_amount: 0,
  maximum_discount_amount: undefined,
  valid_days: 30,
  is_active: true,
  is_stackable: false,
};

const n = (v: any) => Number(v || 0);

export default function CustomerRewardsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingRate, setSavingRate] = useState(false);
  const [currentRate, setCurrentRate] = useState<LoyaltyEarningRule | null>(null);
  const [rateHistory, setRateHistory] = useState<LoyaltyEarningRule[]>([]);
  const [rateInput, setRateInput] = useState('');
  const [rateNotes, setRateNotes] = useState('');
  const [rewards, setRewards] = useState<CustomerReward[]>([]);
  const [rewardForm, setRewardForm] = useState<Partial<CustomerReward>>(emptyReward);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedCustomerSummary, setSelectedCustomerSummary] = useState<any>(null);
  const [manualPoints, setManualPoints] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: ToastType }>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: ToastType = 'success') => setToast({ show: true, message, type });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [settings, rewardRows] = await Promise.all([
        customerRewardService.getSettings(),
        customerRewardService.getRewards(),
      ]);
      setCurrentRate(settings.current_rate);
      setRateHistory(settings.rate_history || []);
      setRateInput(String(settings.current_rate?.earn_percentage ?? ''));
      setRewards(rewardRows || []);
    } catch (error: any) {
      showToast(error?.response?.data?.message || error.message || 'Failed to load rewards.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const saveRate = async () => {
    const value = Number(rateInput);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      showToast('Point earning percentage must be between 0 and 100.', 'error');
      return;
    }
    setSavingRate(true);
    try {
      const rule = await customerRewardService.updateEarningRate(value, rateNotes || undefined);
      setCurrentRate(rule);
      setRateInput(String(rule.earn_percentage));
      setRateNotes('');
      await loadAll();
      showToast('Point earning percentage updated. New orders will use the new rate only.', 'success');
    } catch (error: any) {
      showToast(error?.response?.data?.message || error.message || 'Failed to update earning percentage.', 'error');
    } finally {
      setSavingRate(false);
    }
  };

  const saveReward = async () => {
    try {
      const payload = {
        ...rewardForm,
        code: String(rewardForm.code || '').trim().toUpperCase(),
        points_required: n(rewardForm.points_required),
        value: n(rewardForm.value),
        minimum_order_amount: n(rewardForm.minimum_order_amount),
        maximum_discount_amount: rewardForm.maximum_discount_amount === '' || rewardForm.maximum_discount_amount === undefined ? null : n(rewardForm.maximum_discount_amount),
        valid_days: n(rewardForm.valid_days) || 30,
      };
      if (!payload.code || !payload.name) {
        showToast('Reward code and name are required.', 'error');
        return;
      }
      await customerRewardService.createReward(payload);
      setRewardForm(emptyReward);
      setRewards(await customerRewardService.getRewards());
      showToast('Reward created.', 'success');
    } catch (error: any) {
      showToast(error?.response?.data?.message || error.message || 'Failed to create reward.', 'error');
    }
  };

  const toggleReward = async (reward: CustomerReward) => {
    try {
      await customerRewardService.updateReward(reward.id, { is_active: !reward.is_active });
      setRewards(await customerRewardService.getRewards());
    } catch (error: any) {
      showToast(error?.response?.data?.message || error.message || 'Failed to update reward.', 'error');
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
      const summary = await customerRewardService.getCustomerSummary(Number(customer.id));
      setSelectedCustomerSummary(summary);
    } catch (error: any) {
      showToast(error?.response?.data?.message || error.message || 'Failed to load customer points.', 'error');
    }
  };

  const manualAdjust = async () => {
    if (!selectedCustomer) return;
    const delta = parseInt(manualPoints, 10);
    if (!delta || !manualReason.trim()) {
      showToast('Enter a non-zero point adjustment and reason.', 'error');
      return;
    }
    try {
      await customerRewardService.adjustCustomerPoints(Number(selectedCustomer.id), delta, manualReason.trim());
      setManualPoints('');
      setManualReason('');
      await selectCustomer(selectedCustomer);
      showToast('Customer points adjusted.', 'success');
    } catch (error: any) {
      showToast(error?.response?.data?.message || error.message || 'Failed to adjust points.', 'error');
    }
  };

  const redeemForSelectedCustomer = async (reward: CustomerReward) => {
    if (!selectedCustomer) {
      showToast('Select a customer first, then redeem a reward.', 'error');
      return;
    }
    try {
      const redemption = await customerRewardService.redeemForCustomer(Number(selectedCustomer.id), Number(reward.id));
      await selectCustomer(selectedCustomer);
      showToast(`Reward issued. Code: ${redemption?.redemption_code || 'created'}`, 'success');
    } catch (error: any) {
      showToast(error?.response?.data?.message || error.message || 'Failed to redeem reward for customer.', 'error');
    }
  };

  const account = selectedCustomerSummary?.summary?.account;
  const transactions = selectedCustomerSummary?.summary?.recent_transactions || [];
  const issuedRedemptions = selectedCustomerSummary?.summary?.issued_redemptions || [];
  const activeRate = useMemo(() => Number(currentRate?.earn_percentage || 0), [currentRate]);

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header darkMode={darkMode} setDarkMode={setDarkMode} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Gift className="w-6 h-6" /> Customer Rewards</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Ledger-based points, reward redemption, and future-only earning percentage changes.</p>
                </div>
                <button onClick={loadAll} className="px-3 py-2 rounded-lg border border-gray-300 text-sm dark:border-gray-700 dark:text-gray-100 flex items-center gap-2"><RefreshCcw className="w-4 h-4" /> Refresh</button>
              </div>

              <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 lg:col-span-1">
                  <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Point earning percentage</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Current: {activeRate.toFixed(4)}% of eligible spend. Changing this affects future earning only.</p>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Earn percentage of spend</label>
                  <input value={rateInput} onChange={(e) => setRateInput(e.target.value)} type="number" min="0" max="100" step="0.0001" className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white" />
                  <label className="mt-3 block text-xs font-medium text-gray-600 dark:text-gray-300">Change note</label>
                  <textarea value={rateNotes} onChange={(e) => setRateNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white" placeholder="Example: Eid campaign rate starts today" />
                  <button disabled={savingRate} onClick={saveRate} className="mt-4 w-full bg-black text-white dark:bg-white dark:text-black rounded-lg px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"><Save className="w-4 h-4" /> Save new rate</button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 lg:col-span-2">
                  <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Rate history</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead><tr className="text-left text-xs text-gray-500"><th className="py-2">Rate</th><th>Active from</th><th>Active until</th><th>Note</th></tr></thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {rateHistory.map((r) => <tr key={r.id} className="text-gray-800 dark:text-gray-100"><td className="py-2 font-semibold">{Number(r.earn_percentage).toFixed(4)}%</td><td>{r.active_from}</td><td>{r.active_until || 'Current'}</td><td className="text-xs text-gray-500">{r.notes || '—'}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Create reward</h2>
                  <div className="space-y-3">
                    <input placeholder="CODE" value={rewardForm.code || ''} onChange={(e) => setRewardForm({ ...rewardForm, code: e.target.value.toUpperCase() })} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white" />
                    <input placeholder="Reward name" value={rewardForm.name || ''} onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white" />
                    <select value={rewardForm.type} onChange={(e) => setRewardForm({ ...rewardForm, type: e.target.value as any })} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white">
                      <option value="fixed_discount">Fixed discount</option><option value="percent_discount">Percent discount</option><option value="store_credit">Store credit</option><option value="free_delivery">Free delivery</option>
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" placeholder="Points required" value={rewardForm.points_required as any} onChange={(e) => setRewardForm({ ...rewardForm, points_required: Number(e.target.value) })} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white" />
                      <input type="number" placeholder="Value" value={rewardForm.value as any} onChange={(e) => setRewardForm({ ...rewardForm, value: Number(e.target.value) })} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" placeholder="Minimum order" value={rewardForm.minimum_order_amount as any} onChange={(e) => setRewardForm({ ...rewardForm, minimum_order_amount: Number(e.target.value) })} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white" />
                      <input type="number" placeholder="Valid days" value={rewardForm.valid_days as any} onChange={(e) => setRewardForm({ ...rewardForm, valid_days: Number(e.target.value) })} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white" />
                    </div>
                    <textarea placeholder="Description" value={rewardForm.description || ''} onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white" />
                    <button onClick={saveReward} className="w-full bg-gray-900 text-white dark:bg-white dark:text-black rounded-lg px-4 py-2 text-sm font-medium flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Create reward</button>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 lg:col-span-2">
                  <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Rewards</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {rewards.map((reward) => <div key={reward.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-gray-900 dark:text-white">{reward.name}</p><p className="text-xs text-gray-500">{reward.code} · {reward.type}</p></div><button onClick={() => toggleReward(reward)} className={`text-xs px-2 py-1 rounded-full ${reward.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{reward.is_active ? 'Active' : 'Inactive'}</button></div>
                      <div className="mt-3 text-xs text-gray-600 dark:text-gray-300 space-y-1"><p>Points: <b>{reward.points_required}</b></p><p>Value: <b>{String(reward.value)}</b></p><p>Minimum order: <b>{String(reward.minimum_order_amount || 0)}</b></p></div>
                      <button
                        onClick={() => redeemForSelectedCustomer(reward)}
                        disabled={!selectedCustomer || !reward.is_active || Number(account?.points_balance || 0) < Number(reward.points_required || 0)}
                        className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-900"
                      >
                        {selectedCustomer ? 'Redeem for selected customer' : 'Select customer to redeem'}
                      </button>
                    </div>)}
                  </div>
                </div>
              </section>

              <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Customer point lookup</h2>
                <div className="flex gap-2 mb-4"><input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchCustomer()} placeholder="Search by name, phone, email, code" className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white" /><button onClick={searchCustomer} className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm flex items-center gap-2"><Search className="w-4 h-4" /> Search</button></div>
                {customerResults.length > 0 && <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-5">{customerResults.map((c) => <button key={c.id} onClick={() => selectCustomer(c)} className="text-left rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-900"><p className="font-medium text-sm text-gray-900 dark:text-white">{c.name}</p><p className="text-xs text-gray-500">{c.phone} · {c.customer_code}</p></button>)}</div>}
                {selectedCustomer && <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><p className="text-xs text-gray-500">Selected customer</p><p className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.name}</p><p className="text-xs text-gray-500">{selectedCustomer.phone}</p><p className="mt-4 text-3xl font-semibold text-gray-900 dark:text-white">{account?.points_balance ?? 0}</p><p className="text-xs text-gray-500">Current points</p></div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><p className="font-semibold text-gray-900 dark:text-white mb-3">Manual adjustment</p><input type="number" value={manualPoints} onChange={(e) => setManualPoints(e.target.value)} placeholder="+100 or -50" className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white mb-2" /><input value={manualReason} onChange={(e) => setManualReason(e.target.value)} placeholder="Reason required" className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm dark:text-white mb-3" /><button onClick={manualAdjust} className="w-full rounded-lg bg-gray-900 text-white dark:bg-white dark:text-black py-2 text-sm">Apply adjustment</button></div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><p className="font-semibold text-gray-900 dark:text-white mb-3">Recent transactions</p><div className="space-y-2 max-h-56 overflow-auto">{transactions.map((t: any) => <div key={t.id} className="text-xs border-b border-gray-100 dark:border-gray-700 pb-2"><p className="font-medium text-gray-900 dark:text-white">{t.description}</p><p className={n(t.points_delta) >= 0 ? 'text-green-600' : 'text-red-600'}>{n(t.points_delta) >= 0 ? '+' : ''}{t.points_delta} → {t.points_balance_after}</p></div>)}</div></div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><p className="font-semibold text-gray-900 dark:text-white mb-3">Issued reward codes</p><div className="space-y-2 max-h-56 overflow-auto">{issuedRedemptions.length === 0 && <p className="text-xs text-gray-500">No reward codes yet.</p>}{issuedRedemptions.map((r: any) => <div key={r.id} className="text-xs border-b border-gray-100 dark:border-gray-700 pb-2"><p className="font-semibold text-gray-900 dark:text-white">{r.redemption_code}</p><p className="text-gray-500">{r.reward?.name || 'Reward'} · {r.status}</p><p className="text-gray-500">Discount: ৳{String(r.discount_amount || 0)}</p></div>)}</div></div>
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

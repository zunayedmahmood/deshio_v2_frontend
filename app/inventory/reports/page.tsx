'use client';

import { useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useTheme } from '@/contexts/ThemeContext';
import businessAnalyticsService, { type CommandCenterResponse, type ReportingFilters } from '@/services/businessAnalyticsService';
import {
  Activity,
  AlertTriangle,
  Boxes,
  CalendarDays,
  DollarSign,
  Download,
  Gauge,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  TrendingUp,
  Users,
} from 'lucide-react';

// New Components
import SalesTrendCard from './components/SalesTrendCard';
import BestSellersCard from './components/BestSellersCard';
import StockWatchlistCard from './components/StockWatchlistCard';
import HourlyPulseCard from './components/HourlyPulseCard';
import BranchPerformanceCard from './components/BranchPerformanceCard';
import MixChartsSection from './components/MixChartsSection';

function currency(value: number) {
  return new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function percent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function todayStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default function InventoryReportsPage() {
  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<CommandCenterResponse['data'] | null>(null);
  const [filters, setFilters] = useState<ReportingFilters>({ from: todayStr(-29), to: todayStr() });

  const loadData = async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      setError('');
      const res = await businessAnalyticsService.getCommandCenter(filters);
      setData(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load command center');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headlineCards = useMemo(() => {
    if (!data) return [];
    const k = data.kpis;
    return [
      { label: 'Net Sales', value: currency(k.net_sales), icon: DollarSign, accent: 'from-emerald-500 to-teal-400', sub: `${k.total_orders} orders` },
      { label: 'Gross Profit', value: currency(k.gross_profit), icon: TrendingUp, accent: 'from-indigo-500 to-cyan-400', sub: `Margin ${percent(k.margin_pct)}` },
      { label: 'Inventory Value', value: currency(k.inventory_value), icon: Boxes, accent: 'from-amber-500 to-orange-400', sub: `${k.low_stock_count} low stock` },
      { label: 'Repeat Customers', value: String(k.repeat_customers), icon: Users, accent: 'from-fuchsia-500 to-pink-400', sub: `${percent(k.repeat_customer_rate)} repeat rate` },
    ];
  }, [data]);

  const exportCsv = async () => {
    const response = await businessAnalyticsService.exportSummary(filters);
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `command-center-${filters.from || 'from'}-${filters.to || 'to'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header toggleSidebar={() => setSidebarOpen(true)} darkMode={darkMode} setDarkMode={setDarkMode} />
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6 xl:p-8">
          {/* Executive Header */}
          <div className="mb-8 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
                <Gauge className="h-3.5 w-3.5" /> Business Command Center
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">Inventory Intelligence & Sales Tracking</h1>
              <p className="mt-2 max-w-3xl text-base text-gray-500 dark:text-gray-400">
                Real-time visibility into cross-store performance, profitability metrics, and inventory health.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-white dark:bg-gray-900 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-gray-800">
                <div className="flex items-center px-3 border-r border-gray-100 dark:border-gray-800">
                  <Search className="w-3.5 h-3.5 text-gray-400 mr-2" />
                  <input
                    type="text"
                    placeholder="Global SKU Filter"
                    value={filters.sku || ''}
                    onChange={(e) => setFilters((p) => ({ ...p, sku: e.target.value }))}
                    className="bg-transparent border-none text-sm focus:ring-0 w-32 dark:text-gray-300"
                  />
                </div>
                <input
                  type="date"
                  value={filters.from || ''}
                  onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
                  className="bg-transparent border-none text-sm focus:ring-0 dark:text-gray-300"
                />
                <span className="flex items-center px-1 text-gray-300">→</span>
                <input
                  type="date"
                  value={filters.to || ''}
                  onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
                  className="bg-transparent border-none text-sm focus:ring-0 dark:text-gray-300"
                />
              </div>
              <button
                onClick={() => loadData()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-gray-900 transition-all hover:scale-105 active:scale-95 shadow-md"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Update Headline
              </button>
              <button
                onClick={exportCsv}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 dark:border-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900/50" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          ) : data ? (
            <div className="space-y-8 animate-in fade-in duration-700">
              {/* Primary KPIs */}
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {headlineCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 transition-all hover:shadow-lg">
                      <div className={`h-1.5 w-full bg-gradient-to-r ${card.accent}`} />
                      <div className="p-6">
                        <div className="mb-4 flex items-start justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{card.label}</p>
                            <h3 className="mt-1 text-3xl font-black text-gray-900 dark:text-white">{card.value}</h3>
                          </div>
                          <div className={`rounded-2xl bg-gradient-to-br p-3.5 text-white shadow-lg shadow-indigo-500/20 ${card.accent}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          {card.sub}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Advanced Secondary Metrics */}
              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                {[
                  { label: 'Gross Sales', value: currency(data.kpis.gross_sales), icon: ShoppingBag, color: 'text-blue-500' },
                  { label: 'Discount', value: currency(data.kpis.total_discount), icon: Activity, color: 'text-orange-500' },
                  { label: 'AOV', value: currency(data.kpis.avg_order_value), icon: DollarSign, color: 'text-indigo-500' },
                  { label: 'Returns', value: String(data.kpis.return_count), icon: AlertTriangle, color: 'text-red-500' },
                  { label: 'Refunds', value: currency(data.kpis.refund_amount), icon: CalendarDays, color: 'text-rose-500' },
                  { label: 'Out Stock', value: String(data.kpis.out_of_stock_count), icon: Package, color: 'text-gray-500' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-xl border border-gray-50 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/50 hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-all">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{item.label}</span>
                        <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">{item.value}</div>
                    </div>
                  );
                })}
              </div>

              {/* Sales Trend Section (Modular & Filterable) */}
              <SalesTrendCard initialData={data.sales_trend} initialFilters={{ from: filters.from as string, to: filters.to as string }} />

              {/* Mix Charts Section */}
              <MixChartsSection
                statusMix={data.status_mix}
                channelMix={data.order_type_mix}
                paymentMix={data.payment_status_mix}
              />

              {/* Best Sellers & Watchlist Pair */}
              <div className="grid gap-8 xl:grid-cols-3">
                <div className="xl:col-span-2">
                  <BestSellersCard initialData={data.top_products} initialFilters={{ from: filters.from as string, to: filters.to as string, store_id: filters.store_id }} />
                </div>
                <div>
                  <StockWatchlistCard initialData={data.stock_watchlist} />
                </div>
              </div>

              {/* Performance & Pulse Pair */}
              <div className="grid gap-8 xl:grid-cols-2">
                <BranchPerformanceCard initialData={data.branch_performance} initialFilters={{ from: filters.from as string, to: filters.to as string }} />
                <HourlyPulseCard data={data.today_hourly_orders} />
              </div>

              {/* Executive Insights Footer */}
              <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm dark:border-indigo-900/30 dark:bg-gray-900">
                <h3 className="mb-6 text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                  <Activity className="w-6 h-6 text-indigo-500" />
                  Strategic Insights
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {data.insights.map((insight, i) => (
                    <div key={i} className="group relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/30 transition-all hover:bg-white dark:hover:bg-gray-800 shadow-sm">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 group-hover:w-2 transition-all" />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  </div>
</div>
  );
}

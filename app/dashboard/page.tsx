"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Boxes,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  HandCoins,
  Landmark,
  PackageSearch,
  Percent,
  Printer,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  Store,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { useTheme } from "@/contexts/ThemeContext";
import dashboardService, {
  DashboardAgingBucket,
  DashboardKpi,
  DashboardOverviewPeriod,
  DashboardOverviewResponse,
} from "@/services/dashboardService";

type Overview = DashboardOverviewResponse["data"];
type IconType = React.ComponentType<{ className?: string }>;

type DashboardFilters = {
  period: DashboardOverviewPeriod;
  dateFrom: string;
  dateTo: string;
  storeId: string;
};

const formatBDT = (value: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-BD", { maximumFractionDigits: 2 }).format(Number(value || 0));

const formatValue = (kpi?: DashboardKpi) => {
  if (!kpi) return "—";
  if (kpi.format === "currency") return formatBDT(kpi.value);
  if (kpi.format === "percentage") return `${formatNumber(kpi.value)}%`;
  return formatNumber(kpi.value);
};

const todayString = () => new Date().toISOString().slice(0, 10);

const KPI_LINKS: Record<string, string> = {
  sales: "/orders",
  collection: "/transaction",
  purchase_value: "/purchase-order",
  return_value: "/returns",
  gross_profit: "/inventory/reports",
  gross_margin: "/inventory/reports",
  net_profit: "/inventory/reports",
  net_margin: "/inventory/reports",
  expenses: "/accounting",
  orders: "/orders",
  customer_due: "/orders",
  supplier_due: "/purchase-order",
  cash_balance: "/accounting",
  bank_balance: "/accounting",
  mobile_wallet_balance: "/accounting",
  stock_value: "/inventory/reports",
  fixed_asset_value: "/accounting",
  investment_balance: "/accounting",
  loan_balance: "/accounting",
  tax_liability: "/accounting",
  low_stock_count: "/inventory/reports",
  pending_orders: "/orders",
};

const KPI_ICONS: Record<string, IconType> = {
  sales: ShoppingBag,
  collection: HandCoins,
  purchase_value: Boxes,
  return_value: RotateCcw,
  gross_profit: TrendingUp,
  gross_margin: Percent,
  net_profit: CircleDollarSign,
  net_margin: Percent,
  expenses: WalletCards,
  orders: ShoppingBag,
  customer_due: Clock3,
  supplier_due: HandCoins,
  cash_balance: Banknote,
  bank_balance: Landmark,
  mobile_wallet_balance: WalletCards,
  stock_value: Boxes,
  fixed_asset_value: Building2,
  investment_balance: CircleDollarSign,
  loan_balance: Landmark,
  tax_liability: CircleDollarSign,
  low_stock_count: AlertTriangle,
  pending_orders: Clock3,
};

const KPI_GROUPS = [
  {
    title: "Sales & cash flow",
    description: "Sales, collections, purchases, and returns for the selected period.",
    keys: ["sales", "collection", "purchase_value", "return_value"],
  },
  {
    title: "Profitability",
    description: "Gross and net performance after COGS, expenses, and returns.",
    keys: ["gross_profit", "gross_margin", "net_profit", "net_margin", "expenses"],
  },
  {
    title: "Liquidity, receivables & payables",
    description: "Live balances as of the selected end date.",
    keys: ["customer_due", "supplier_due", "cash_balance", "bank_balance", "mobile_wallet_balance"],
  },
  {
    title: "Inventory, assets & operations",
    description: "Current stock position, capital balances, and open workload.",
    keys: [
      "stock_value",
      "fixed_asset_value",
      "investment_balance",
      "loan_balance",
      "tax_liability",
      "low_stock_count",
      "pending_orders",
      "orders",
    ],
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);

  const initialFilters = useMemo<DashboardFilters>(
    () => ({ period: "today", dateFrom: todayString(), dateTo: todayString(), storeId: "all" }),
    []
  );
  const [draftFilters, setDraftFilters] = useState<DashboardFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilters>(initialFilters);


  const loadOverview = useCallback(
    async (filters: DashboardFilters, refresh = false) => {
      try {
        refresh ? setRefreshing(true) : setLoading(true);
        setError(null);

        const response = await dashboardService.getOverview({
          period: filters.period,
          ...(filters.period === "custom"
            ? { date_from: filters.dateFrom, date_to: filters.dateTo }
            : {}),
          ...(filters.storeId !== "all" ? { store_id: Number(filters.storeId) } : {}),
        });

        if (!response.success || !response.data) {
          throw new Error("Dashboard response was empty.");
        }

        setOverview(response.data);
      } catch (caught: any) {
        setError(
          caught?.response?.data?.message ||
            caught?.message ||
            "Failed to load the Deshio dashboard."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadOverview(appliedFilters);
  }, [appliedFilters, loadOverview]);

  const applyFilters = () => {
    setFilterError(null);
    if (draftFilters.period === "custom") {
      if (!draftFilters.dateFrom || !draftFilters.dateTo) {
        setFilterError("Select both custom dates.");
        return;
      }
      if (draftFilters.dateFrom > draftFilters.dateTo) {
        setFilterError("The start date cannot be after the end date.");
        return;
      }
      const start = new Date(`${draftFilters.dateFrom}T00:00:00`);
      const end = new Date(`${draftFilters.dateTo}T00:00:00`);
      const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
      if (days > 367) {
        setFilterError("Choose a range of 367 days or less.");
        return;
      }
    }
    setAppliedFilters({ ...draftFilters });
  };

  const choosePeriod = (period: DashboardOverviewPeriod) => {
    const next = { ...draftFilters, period };
    setDraftFilters(next);
    setFilterError(null);
    if (period !== "custom") setAppliedFilters(next);
  };

  const chooseStore = (storeId: string) => {
    const next = { ...draftFilters, storeId };
    setDraftFilters(next);
    setAppliedFilters(next);
  };

  const resetFilters = () => {
    const next = { ...initialFilters, storeId: "all" };
    setDraftFilters(next);
    setAppliedFilters(next);
    setFilterError(null);
  };

  const refresh = () => void loadOverview(appliedFilters, true);

  const routeTo = (key: string) => {
    const route = KPI_LINKS[key];
    if (!route || !overview) return;
    const params = new URLSearchParams({
      date_from: overview.period.start_date,
      date_to: overview.period.end_date,
    });
    if (overview.scope.store_id) params.set("store_id", String(overview.scope.store_id));
    router.push(`${route}?${params.toString()}`);
  };

  const exportExcel = () => {
    if (!overview) return;
    const rows: Array<Array<string | number>> = [
      ["Deshio ERP Dashboard"],
      ["Period", `${overview.period.start_date} to ${overview.period.end_date}`],
      ["Branch", overview.scope.label],
      ["Last updated", overview.last_updated_at],
      [],
      ["KPI", "Value", "Previous Value", "Change %", "Type"],
      ...Object.values(overview.kpis).map((kpi) => [
        kpi.label,
        kpi.value,
        kpi.previous_value ?? "",
        kpi.change_percentage ?? "",
        kpi.is_snapshot ? "Snapshot" : "Period",
      ]),
      [],
      ["Channel", "Sales", "Orders", "Share %"],
      ...overview.channel_mix.map((row) => [row.label, row.sales, row.orders, row.percentage]),
      [],
      ["Top product", "SKU", "Quantity sold", "Sales"],
      ...overview.top_products.map((row) => [row.name, row.sku, row.quantity_sold, row.sales]),
    ];

    const html = `
      <html><head><meta charset="utf-8"></head><body>
      <table border="1">${rows
        .map(
          (row) =>
            `<tr>${row
              .map((cell) => `<td>${String(cell).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</td>`)
              .join("")}</tr>`
        )
        .join("")}</table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `deshio-dashboard-${overview.period.start_date}-${overview.period.end_date}.xls`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !overview) {
    return (
      <DashboardShell darkMode={darkMode} setDarkMode={setDarkMode} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <RefreshCw className="mx-auto h-10 w-10 animate-spin text-indigo-600" />
            <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Loading Deshio dashboard</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Calculating current ERP metrics…</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell darkMode={darkMode} setDarkMode={setDarkMode} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
      <div className="mx-auto w-full max-w-[1700px] space-y-6 print:max-w-none">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 print:border-0 print:shadow-none">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                <Store className="h-4 w-4" /> Deshio ERP
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Business dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                Sales, profitability, dues, liquidity, inventory, and operations using one consistent date and store scope.
              </p>
              {overview && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-900">{overview.period.label}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-900">{overview.scope.label}</span>
                  <span>Updated {new Date(overview.last_updated_at).toLocaleString("en-BD")}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 print:hidden">
              <button onClick={refresh} disabled={refreshing} className="dashboard-secondary-button">
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
              </button>
              <button onClick={exportExcel} disabled={!overview} className="dashboard-secondary-button">
                <Download className="h-4 w-4" /> Export Excel
              </button>
              <button onClick={() => window.print()} className="dashboard-secondary-button">
                <Printer className="h-4 w-4" /> Print / PDF
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70 lg:grid-cols-[1.4fr_1fr_auto] print:hidden">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Date range</label>
              <div className="flex flex-wrap gap-2">
                {(["today", "week", "month", "custom"] as DashboardOverviewPeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => choosePeriod(period)}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                      draftFilters.period === period
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    }`}
                  >
                    {period === "today" ? "Today" : period === "week" ? "This week" : period === "month" ? "This month" : "Custom"}
                  </button>
                ))}
              </div>
              {draftFilters.period === "custom" && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={draftFilters.dateFrom}
                    onChange={(event) => setDraftFilters((current) => ({ ...current, dateFrom: event.target.value }))}
                    className="dashboard-input"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={draftFilters.dateTo}
                    onChange={(event) => setDraftFilters((current) => ({ ...current, dateTo: event.target.value }))}
                    className="dashboard-input"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Store scope</label>
              <select
                value={draftFilters.storeId}
                onChange={(event) => chooseStore(event.target.value)}
                className="dashboard-input w-full"
              >
                <option value="all">All Stores</option>
                {(overview?.stores || []).map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}{store.store_code ? ` (${store.store_code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button onClick={resetFilters} className="dashboard-secondary-button h-[42px]">Reset</button>
              <button onClick={applyFilters} className="flex h-[42px] items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
                <CalendarDays className="h-4 w-4" /> Apply
              </button>
            </div>
          </div>

          {filterError && <p className="mt-3 text-sm font-medium text-rose-600">{filterError}</p>}
          {error && (
            <div className="mt-4 flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
              <span>{error}</span>
              <button onClick={refresh} className="font-semibold underline">Retry</button>
            </div>
          )}
        </section>

        {overview && (
          <>
            {KPI_GROUPS.map((group) => (
              <KpiSection key={group.title} title={group.title} description={group.description}>
                {group.keys.map((key) => (
                  <KpiCard key={key} itemKey={key} kpi={overview.kpis[key]} onOpen={() => routeTo(key)} />
                ))}
              </KpiSection>
            ))}

            <section className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
              <Panel title="Sales and purchase trend" subtitle={`${overview.period.start_date} to ${overview.period.end_date}`}>
                <SalesTrendChart rows={overview.sales_trend} />
              </Panel>
              <Panel title="Sales by channel" subtitle="Share of sales in the selected period">
                <ChannelMix rows={overview.channel_mix} />
              </Panel>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <AgingPanel title="Customer due aging" rows={overview.customer_due_aging} total={overview.kpis.customer_due?.value || 0} />
              <AgingPanel title="Supplier due aging" rows={overview.supplier_due_aging} total={overview.kpis.supplier_due?.value || 0} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Panel title="Inventory age by value" subtitle="Older stock is highlighted for closer review">
                <InventoryAge rows={overview.inventory_age} />
              </Panel>
              <Panel title="Order operations" subtitle="Status distribution in the selected period">
                <Operations rows={overview.operations} />
              </Panel>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Panel title="Top products" subtitle="Highest sales value in the selected period">
                <TopProducts rows={overview.top_products} />
              </Panel>
              <Panel
                title="Stock alerts"
                subtitle={`${formatNumber(overview.kpis.low_stock_count?.value || 0)} item(s) at or below reorder level`}
              >
                <StockAlerts rows={overview.stock_alerts} onOpen={() => router.push("/inventory/reports")} />
              </Panel>
            </section>
          </>
        )}
      </div>

      <style jsx global>{`
        .dashboard-secondary-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border-radius: 0.75rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: rgb(51 65 85);
          transition: 150ms ease;
        }
        .dashboard-secondary-button:hover { border-color: rgb(165 180 252); color: rgb(79 70 229); }
        .dark .dashboard-secondary-button { border-color: rgb(51 65 85); background: rgb(2 6 23); color: rgb(226 232 240); }
        .dashboard-input {
          border-radius: 0.75rem;
          border: 1px solid rgb(203 213 225);
          background: white;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: rgb(15 23 42);
          outline: none;
        }
        .dashboard-input:focus { border-color: rgb(99 102 241); box-shadow: 0 0 0 3px rgb(99 102 241 / 0.12); }
        .dark .dashboard-input { border-color: rgb(51 65 85); background: rgb(2 6 23); color: white; }
        @media print {
          body { background: white !important; }
          aside, header, button, select, input { display: none !important; }
          main { overflow: visible !important; padding: 0 !important; }
        }
      `}</style>
    </DashboardShell>
  );
}

function DashboardShell({
  darkMode,
  setDarkMode,
  sidebarOpen,
  setSidebarOpen,
  children,
}: {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  children: React.ReactNode;
}) {
  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900 print:h-auto print:bg-white">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header darkMode={darkMode} setDarkMode={setDarkMode} toggleSidebar={() => setSidebarOpen((open) => !open)} />
          <main className="flex-1 overflow-auto p-4 sm:p-6 print:overflow-visible print:p-0">{children}</main>
        </div>
      </div>
    </div>
  );
}

function KpiSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-lg font-bold text-slate-950 dark:text-white">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">{children}</div>
    </section>
  );
}

function KpiCard({ itemKey, kpi, onOpen }: { itemKey: string; kpi?: DashboardKpi; onOpen: () => void }) {
  const Icon = KPI_ICONS[itemKey] || CircleDollarSign;
  const change = kpi?.change_percentage;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group min-h-[150px] rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-700 print:break-inside-avoid"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
          <Icon className="h-5 w-5" />
        </div>
        <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{kpi?.label || itemKey}</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-slate-950 dark:text-white">{formatValue(kpi)}</p>
      <div className="mt-2 flex items-center gap-1.5 text-xs">
        {kpi?.is_snapshot || change === null || change === undefined ? (
          <span className="text-slate-500 dark:text-slate-400">Live balance</span>
        ) : (
          <>
            {change > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : change < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : null}
            <span className={kpi.is_positive ? "text-emerald-600" : "text-rose-600"}>
              {change > 0 ? "+" : ""}{formatNumber(change)}%
            </span>
            <span className="text-slate-400">vs previous</span>
          </>
        )}
      </div>
    </button>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 print:break-inside-avoid">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-950 dark:text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function SalesTrendChart({ rows }: { rows: Overview["sales_trend"] }) {
  if (!rows.length) return <EmptyState label="No sales data for this period." />;
  const width = 900;
  const height = 260;
  const padding = 34;
  const max = Math.max(1, ...rows.flatMap((row) => [row.sales, row.purchases]));
  const points = (key: "sales" | "purchases") =>
    rows
      .map((row, index) => {
        const x = rows.length === 1 ? width / 2 : padding + (index / (rows.length - 1)) * (width - padding * 2);
        const y = height - padding - (row[key] / max) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");
  const labels = rows.length <= 8 ? rows : rows.filter((_, index) => index % Math.ceil(rows.length / 6) === 0 || index === rows.length - 1);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-indigo-600" /> Sales</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Purchases</span>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[620px] w-full" role="img" aria-label="Sales and purchase trend chart">
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const y = height - padding - fraction * (height - padding * 2);
            return <line key={fraction} x1={padding} y1={y} x2={width - padding} y2={y} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />;
          })}
          <polyline points={points("sales")} fill="none" stroke="rgb(79 70 229)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={points("purchases")} fill="none" stroke="rgb(245 158 11)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {labels.map((row) => {
            const index = rows.findIndex((candidate) => candidate.date === row.date);
            const x = rows.length === 1 ? width / 2 : padding + (index / (rows.length - 1)) * (width - padding * 2);
            return <text key={row.date} x={x} y={height - 8} textAnchor="middle" fontSize="11" fill="currentColor" className="text-slate-500">{row.label}</text>;
          })}
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
        <MiniValue label="Sales" value={formatBDT(rows.reduce((sum, row) => sum + row.sales, 0))} />
        <MiniValue label="Purchases" value={formatBDT(rows.reduce((sum, row) => sum + row.purchases, 0))} />
        <MiniValue label="Orders" value={formatNumber(rows.reduce((sum, row) => sum + row.orders, 0))} />
      </div>
    </div>
  );
}

function ChannelMix({ rows }: { rows: Overview["channel_mix"] }) {
  return (
    <div className="space-y-5">
      {rows.map((row) => (
        <div key={row.channel}>
          <div className="mb-2 flex items-center justify-between gap-4 text-sm">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{row.label}</p>
              <p className="text-xs text-slate-500">{formatNumber(row.orders)} order(s)</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-900 dark:text-white">{formatBDT(row.sales)}</p>
              <p className="text-xs text-slate-500">{formatNumber(row.percentage)}%</p>
            </div>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
            <div className="h-full rounded-full bg-indigo-600" style={{ width: `${Math.max(0, Math.min(100, row.percentage))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AgingPanel({ title, rows, total }: { title: string; rows: DashboardAgingBucket[]; total: number }) {
  return (
    <Panel title={title} subtitle={`Total outstanding: ${formatBDT(total)}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row, index) => (
          <div key={row.key} className={`rounded-2xl border p-4 ${index === rows.length - 1 ? "border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/20" : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60"}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.label}</p>
            <p className="mt-2 text-lg font-bold text-slate-950 dark:text-white">{formatBDT(row.amount)}</p>
            <p className="mt-1 text-xs text-slate-500">{formatNumber(row.count)} record(s)</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function InventoryAge({ rows }: { rows: Overview["inventory_age"] }) {
  return (
    <div className="space-y-4">
      <div className="flex h-4 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
        {rows.map((row, index) => (
          <div
            key={row.key}
            className={index === 0 ? "bg-emerald-500" : index === 1 ? "bg-sky-500" : index === 2 ? "bg-amber-500" : "bg-rose-500"}
            style={{ width: `${row.percentage}%` }}
            title={`${row.label}: ${formatBDT(row.value)}`}
          />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row, index) => (
          <div key={row.key} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className={`h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-emerald-500" : index === 1 ? "bg-sky-500" : index === 2 ? "bg-amber-500" : "bg-rose-500"}`} />
              <span className="text-xs font-semibold text-slate-500">{formatNumber(row.percentage)}%</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{row.label}</p>
            <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{formatBDT(row.value)}</p>
            <p className="text-xs text-slate-500">{formatNumber(row.quantity)} unit(s)</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Operations({ rows }: { rows: Overview["operations"] }) {
  if (!rows.length) return <EmptyState label="No orders in this period." />;
  const total = rows.reduce((sum, row) => sum + row.count, 0) || 1;
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const percentage = (row.count / total) * 100;
        return (
          <div key={row.status} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {row.status === "delivered" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : row.status === "cancelled" ? <RotateCcw className="h-4 w-4 text-rose-500" /> : <Clock3 className="h-4 w-4 text-indigo-500" />}
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{row.label}</span>
              </div>
              <span className="text-sm font-bold text-slate-950 dark:text-white">{formatNumber(row.count)}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${percentage}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopProducts({ rows }: { rows: Overview["top_products"] }) {
  if (!rows.length) return <EmptyState label="No product sales in this period." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
            <th className="pb-3 font-semibold">Product</th>
            <th className="pb-3 font-semibold">SKU</th>
            <th className="pb-3 text-right font-semibold">Qty</th>
            <th className="pb-3 text-right font-semibold">Sales</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.product_id} className="border-b border-slate-100 last:border-0 dark:border-slate-900">
              <td className="py-3 font-medium text-slate-900 dark:text-white">{row.name}</td>
              <td className="py-3 text-slate-500">{row.sku}</td>
              <td className="py-3 text-right text-slate-700 dark:text-slate-300">{formatNumber(row.quantity_sold)}</td>
              <td className="py-3 text-right font-semibold text-slate-950 dark:text-white">{formatBDT(row.sales)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StockAlerts({ rows, onOpen }: { rows: Overview["stock_alerts"]; onOpen: () => void }) {
  if (!rows.length) return <EmptyState label="No low-stock or out-of-stock alerts." />;
  return (
    <div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.product_id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{row.name}</p>
              <p className="text-xs text-slate-500">{row.sku} · Reorder at {formatNumber(row.reorder_point)}</p>
            </div>
            <div className="text-right">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === "out_of_stock" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"}`}>
                {formatNumber(row.quantity)} left
              </span>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onOpen} className="mt-4 flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
        Open inventory reports <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function MiniValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70">
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 text-center dark:border-slate-700">
      <PackageSearch className="h-8 w-8 text-slate-400" />
      <p className="mt-2 text-sm text-slate-500">{label}</p>
    </div>
  );
}

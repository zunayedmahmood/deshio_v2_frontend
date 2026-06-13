'use client';

import { useEffect, useMemo, useState } from 'react';
import posReportsService from '@/services/posReportsService';
import type { PosFiltersPayload, PosReportFilters as PosReportFilterState } from '@/services/posReportsService';
import PosReportFrame from '../components/PosReportFrame';
import PosReportHeader from '../components/PosReportHeader';
import PosReportFiltersPanel from '../components/PosReportFilters';
import { BarList, KpiCard, LoadingBlock, Panel, SimpleTable, formatters } from '../components/PosReportWidgets';
import { money, number, pct, today } from '../components/posReportUtils';

export default function PosProductAnalysisPage() {
  const [filters, setFilters] = useState<PosReportFilterState>({ from: today(-29), to: today(), sort: 'sales', limit: 50 });
  const [options, setOptions] = useState<PosFiltersPayload | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [filterPayload, products] = await Promise.all([
        options ? Promise.resolve(options) : posReportsService.getFilters(),
        posReportsService.getProducts(filters),
      ]);
      setOptions(filterPayload);
      setData(products);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load product report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = data?.summary || {};
  const topProductsForChart = useMemo(() => (data?.products || []).slice(0, 12).map((p: any) => ({ label: p.name, value: p.net_sales })), [data]);

  return (
    <PosReportFrame>
      <PosReportHeader active="products" />
      <PosReportFiltersPanel filters={filters} options={options} loading={loading} onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))} onApply={loadData} />

      {error ? <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div> : null}
      {loading && !data ? <LoadingBlock /> : null}

      {data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <KpiCard label="Products Sold" value={number(summary.products_sold)} sub="Unique products in report" />
            <KpiCard label="Units Sold" value={number(summary.units_sold)} sub="Total pieces sold" />
            <KpiCard label="Product Sales" value={money(summary.net_sales)} sub="From listed products" tone="good" />
            <KpiCard label="Product Profit" value={money(summary.gross_profit)} sub={`Avg margin ${pct(summary.avg_margin_percent)}`} tone={Number(summary.avg_margin_percent || 0) < 20 ? 'warn' : 'good'} />
            <KpiCard label="Current Stock" value={number(summary.stock_on_hand)} sub="Filtered store stock" />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <Panel title="Top POS Products" subtitle="Shows the products that actually sold through the counter, not online/social orders.">
                <BarList rows={topProductsForChart} limit={12} />
              </Panel>
            </div>
            <Panel title="Fast Moving but Low Stock" subtitle="These are good candidates for quick replenishment.">
              <SimpleTable
                rows={data.fast_moving_low_stock || []}
                columns={[
                  { key: 'name', label: 'Product' },
                  { key: 'units_sold', label: 'Sold', align: 'right', format: formatters.number },
                  { key: 'stock_on_hand', label: 'Stock', align: 'right', format: formatters.number },
                ]}
              />
            </Panel>
          </div>

          <Panel title="Low Profit Watchlist" subtitle="A CA would ask: are these discounted too much, cost entered wrong, or naturally low-margin items?">
            <SimpleTable
              rows={data.low_profit_watchlist || []}
              columns={[
                { key: 'name', label: 'Product' },
                { key: 'sku', label: 'SKU' },
                { key: 'net_sales', label: 'Sales', align: 'right', format: formatters.money },
                { key: 'gross_profit', label: 'Profit', align: 'right', format: formatters.money },
                { key: 'margin_percent', label: 'Margin', align: 'right', format: formatters.pct },
              ]}
            />
          </Panel>

          <Panel title="Product Ledger-style Report" subtitle="The owner-friendly product table: quantity, sales, profit, margin, stock and stock cover.">
            <SimpleTable
              rows={data.products || []}
              columns={[
                { key: 'name', label: 'Product' },
                { key: 'sku', label: 'SKU' },
                { key: 'category', label: 'Category' },
                { key: 'orders', label: 'Memos', align: 'right', format: formatters.number },
                { key: 'units_sold', label: 'Sold', align: 'right', format: formatters.number },
                { key: 'net_sales', label: 'Sales', align: 'right', format: formatters.money },
                { key: 'discount_amount', label: 'Discount', align: 'right', format: formatters.money },
                { key: 'gross_profit', label: 'Profit', align: 'right', format: formatters.money },
                { key: 'margin_percent', label: 'Margin', align: 'right', format: formatters.pct },
                { key: 'stock_on_hand', label: 'Stock', align: 'right', format: formatters.number },
                { key: 'stock_cover_days', label: 'Cover Days', align: 'right', format: (v) => (v === null || v === undefined ? '—' : `${v}`) },
              ]}
            />
          </Panel>
        </div>
      ) : null}
    </PosReportFrame>
  );
}

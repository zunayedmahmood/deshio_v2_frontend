'use client';

import { useEffect, useMemo, useState } from 'react';
import posReportsService from '@/services/posReportsService';
import type { PosFiltersPayload, PosReportFilters as PosReportFilterState } from '@/services/posReportsService';
import PosReportFrame from '../components/PosReportFrame';
import PosReportHeader from '../components/PosReportHeader';
import PosReportFiltersPanel from '../components/PosReportFilters';
import { BarList, KpiCard, LoadingBlock, Panel, SimpleTable, formatters } from '../components/PosReportWidgets';
import { money, number, pct, today } from '../components/posReportUtils';

export default function PosStoreStaffPage() {
  const [filters, setFilters] = useState<PosReportFilterState>({ from: today(-29), to: today() });
  const [options, setOptions] = useState<PosFiltersPayload | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [filterPayload, stores] = await Promise.all([
        options ? Promise.resolve(options) : posReportsService.getFilters(),
        posReportsService.getStores(filters),
      ]);
      setOptions(filterPayload);
      setData(stores);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load store report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = data?.summary || {};
  const storeChartRows = useMemo(() => (data?.stores || []).map((row: any) => ({ label: row.store_name, value: row.net_sales })), [data]);
  const staffChartRows = useMemo(() => (data?.staff || []).slice(0, 10).map((row: any) => ({ label: row.employee_name, value: row.sales })), [data]);

  return (
    <PosReportFrame>
      <PosReportHeader active="stores" />
      <PosReportFiltersPanel filters={filters} options={options} loading={loading} onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))} onApply={loadData} />

      {error ? <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div> : null}
      {loading && !data ? <LoadingBlock /> : null}

      {data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <KpiCard label="Active Stores" value={number(summary.stores_count)} sub="Stores with POS sales" />
            <KpiCard label="POS Memos" value={number(summary.orders)} sub="Counter invoices" />
            <KpiCard label="Pieces Sold" value={number(summary.units)} sub="Total units" />
            <KpiCard label="Store Sales" value={money(summary.net_sales)} sub="Counter only" tone="good" />
            <KpiCard label="Store Profit" value={money(summary.gross_profit)} sub={`Margin ${pct(summary.avg_margin_percent)}`} tone={Number(summary.avg_margin_percent || 0) < 20 ? 'warn' : 'good'} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Store-wise Sales Share" subtitle="Which branch is carrying showroom revenue in the selected period.">
              <BarList rows={storeChartRows} limit={12} />
            </Panel>
            <Panel title="Salesman / Cashier Performance" subtitle="Uses salesman if selected in POS, otherwise created-by employee.">
              <BarList rows={staffChartRows} limit={10} />
            </Panel>
          </div>

          <Panel title="Store Comparison" subtitle="Simple management table: sales, profit, margin, average memo, share and returns.">
            <SimpleTable
              rows={data.stores || []}
              columns={[
                { key: 'store_name', label: 'Store' },
                { key: 'orders', label: 'Memos', align: 'right', format: formatters.number },
                { key: 'units', label: 'Pieces', align: 'right', format: formatters.number },
                { key: 'net_sales', label: 'Sales', align: 'right', format: formatters.money },
                { key: 'gross_profit', label: 'Profit', align: 'right', format: formatters.money },
                { key: 'margin_percent', label: 'Margin', align: 'right', format: formatters.pct },
                { key: 'avg_order_value', label: 'Avg Memo', align: 'right', format: formatters.money },
                { key: 'sales_share_percent', label: 'Share', align: 'right', format: formatters.pct },
                { key: 'return_amount', label: 'Returns', align: 'right', format: formatters.money },
              ]}
            />
          </Panel>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Staff Ledger" subtitle="Good for incentives, training needs and store-floor accountability.">
              <SimpleTable
                rows={data.staff || []}
                columns={[
                  { key: 'employee_name', label: 'Employee' },
                  { key: 'orders', label: 'Memos', align: 'right', format: formatters.number },
                  { key: 'sales', label: 'Sales', align: 'right', format: formatters.money },
                  { key: 'avg_order_value', label: 'Avg Memo', align: 'right', format: formatters.money },
                ]}
              />
            </Panel>
            <Panel title="Payment by Store" subtitle="Cross-check cash/card/mobile banking collection by branch.">
              <SimpleTable
                rows={data.payment_by_store || []}
                columns={[
                  { key: 'store_name', label: 'Store' },
                  { key: 'label', label: 'Method' },
                  { key: 'value', label: 'Collected', align: 'right', format: formatters.money },
                ]}
              />
            </Panel>
          </div>
        </div>
      ) : null}
    </PosReportFrame>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import posReportsService from '@/services/posReportsService';
import type { PosFiltersPayload, PosReportFilters as PosReportFilterState } from '@/services/posReportsService';
import PosReportFrame from './components/PosReportFrame';
import PosReportHeader from './components/PosReportHeader';
import PosReportFiltersPanel from './components/PosReportFilters';
import { BarList, KpiCard, LineChart, LoadingBlock, Panel, SimpleTable, formatters } from './components/PosReportWidgets';
import { dateLabel, money, number, pct, today } from './components/posReportUtils';

export default function PosReportsOverviewPage() {
  const [filters, setFilters] = useState<PosReportFilterState>({ from: today(-29), to: today() });
  const [options, setOptions] = useState<PosFiltersPayload | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [filterPayload, overview] = await Promise.all([
        options ? Promise.resolve(options) : posReportsService.getFilters(),
        posReportsService.getOverview(filters),
      ]);
      setOptions(filterPayload);
      setData(overview);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load POS report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpi = data?.kpis || {};
  const periodText = data?.period ? `${dateLabel(data.period.from)} to ${dateLabel(data.period.to)}` : '';

  const hourlyRows = useMemo(() => (data?.hourly || []).map((row: any) => ({ ...row, value: row.sales })), [data]);

  return (
    <PosReportFrame>
      <PosReportHeader active="overview" />
      <PosReportFiltersPanel filters={filters} options={options} loading={loading} onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))} onApply={loadData} />

      {error ? <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div> : null}
      {loading && !data ? <LoadingBlock /> : null}

      {data ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Selected Period</p>
            <p className="mt-1 text-lg font-black text-gray-950 dark:text-white">{periodText}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Net POS Sales" value={money(kpi.net_sales)} sub={`${number(kpi.total_orders)} orders`} tone="good" />
            <KpiCard label="Gross Profit" value={money(kpi.gross_profit)} sub={`Margin ${pct(kpi.gross_margin_percent)}`} tone={Number(kpi.gross_margin_percent || 0) < 20 ? 'warn' : 'good'} />
            <KpiCard label="Average Memo" value={money(kpi.avg_order_value)} sub={`${number(kpi.units_sold)} pieces sold`} />
            <KpiCard label="Return / Refund" value={money(kpi.return_amount)} sub={`${number(kpi.return_count)} returns · ${pct(kpi.return_rate_percent)} rate`} tone={Number(kpi.return_rate_percent || 0) > 5 ? 'bad' : 'plain'} />
            <KpiCard label="Gross Sales" value={money(kpi.gross_sales)} sub="Before discount" />
            <KpiCard label="Discount Given" value={money(kpi.discount_amount)} sub="Check if discount is controlled" tone="warn" />
            <KpiCard label="Paid Collected" value={money(kpi.paid_amount)} sub="From order records" />
            <KpiCard label="Due / Outstanding" value={money(kpi.due_amount)} sub="Needs collection follow-up" tone={Number(kpi.due_amount || 0) > 0 ? 'bad' : 'plain'} />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <Panel title="Date-wise POS Sales" subtitle="Simple daily trend. Good for seeing Eid rush, weekend pull, dead days and campaign effect.">
                <LineChart rows={data.trend || []} valueKey="sales" />
              </Panel>
            </div>
            <Panel title="CA-style Notes" subtitle="Plain-language action points generated from the selected report.">
              <div className="space-y-3">
                {(data.insights || []).length ? data.insights.map((note: string, index: number) => (
                  <div key={index} className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm font-semibold leading-6 text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                    {note}
                  </div>
                )) : <p className="text-sm font-semibold text-gray-500">No notes yet. Try a wider date range.</p>}
              </div>
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel title="Category Mix" subtitle="Which product families are carrying the showroom sales.">
              <BarList rows={data.category_mix || []} />
            </Panel>
            <Panel title="Payment Mix" subtitle="Cash/card/mobile banking contribution from completed payments.">
              <BarList rows={data.payment_mix || []} />
            </Panel>
            <Panel title="Hourly Rush" subtitle="Use this to plan staff, lunch breaks and cash counter load.">
              <BarList rows={hourlyRows} formatter={money} limit={12} />
            </Panel>
          </div>

          <Panel title="Daily Register" subtitle="Old-school day-by-day table for cross-checking POS performance.">
            <SimpleTable
              rows={data.trend || []}
              columns={[
                { key: 'label', label: 'Date' },
                { key: 'orders', label: 'Memos', align: 'right', format: formatters.number },
                { key: 'units', label: 'Pieces', align: 'right', format: formatters.number },
                { key: 'sales', label: 'Sales', align: 'right', format: formatters.money },
                { key: 'profit', label: 'Gross Profit', align: 'right', format: formatters.money },
              ]}
            />
          </Panel>
        </div>
      ) : null}
    </PosReportFrame>
  );
}

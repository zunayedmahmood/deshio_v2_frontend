'use client';

import React from 'react';
import { money, number, pct } from './posReportUtils';

export function KpiCard({ label, value, sub, tone = 'plain' }: { label: string; value: string; sub?: string; tone?: 'plain' | 'good' | 'warn' | 'bad' }) {
  const toneClass = {
    plain: 'border-stone-200 bg-white dark:border-gray-800 dark:bg-gray-900',
    good: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30',
    warn: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30',
    bad: 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30',
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-gray-950 dark:text-white">{value}</p>
      {sub ? <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{sub}</p> : null}
    </div>
  );
}

export function Panel({ title, subtitle, children, right }: { title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-black text-gray-950 dark:text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function LoadingBlock() {
  return <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm font-bold text-gray-500 dark:border-gray-700">Loading report...</div>;
}

export function EmptyBlock({ text = 'No data found for the selected filters.' }: { text?: string }) {
  return <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm font-bold text-gray-500 dark:border-gray-700">{text}</div>;
}

export function LineChart({ rows, valueKey = 'sales' }: { rows: any[]; valueKey?: string }) {
  if (!rows?.length) return <EmptyBlock />;
  const values = rows.map((row) => Number(row[valueKey] || 0));
  const max = Math.max(...values, 1);
  const width = 900;
  const height = 260;
  const pad = 36;
  const step = rows.length > 1 ? (width - pad * 2) / (rows.length - 1) : 0;
  const y = (value: number) => height - pad - (value / max) * (height - pad * 2);
  const path = rows.map((row, i) => `${i === 0 ? 'M' : 'L'} ${pad + i * step} ${y(Number(row[valueKey] || 0))}`).join(' ');

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] min-w-[760px] w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((p) => {
          const yy = pad + p * (height - pad * 2);
          const val = max - p * max;
          return (
            <g key={p}>
              <line x1={pad} x2={width - pad} y1={yy} y2={yy} stroke="currentColor" strokeOpacity="0.12" strokeDasharray="4 4" />
              <text x={pad - 8} y={yy + 4} textAnchor="end" fontSize="10" className="fill-gray-500">{money(val)}</text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-gray-900 dark:text-white" />
        {rows.map((row, i) => {
          const x = pad + i * step;
          const yy = y(Number(row[valueKey] || 0));
          const show = rows.length <= 14 || i % Math.ceil(rows.length / 8) === 0 || i === rows.length - 1;
          return (
            <g key={`${row.label}-${i}`}>
              <circle cx={x} cy={yy} r="4" className="fill-white stroke-gray-900 dark:stroke-white" strokeWidth="2" />
              {show ? <text x={x} y={height - 9} textAnchor="middle" fontSize="10" className="fill-gray-500">{String(row.label).slice(5)}</text> : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function BarList({ rows, valueKey = 'value', labelKey = 'label', formatter = money, limit = 10 }: { rows: any[]; valueKey?: string; labelKey?: string; formatter?: (v: any) => string; limit?: number }) {
  const list = (rows || []).slice(0, limit);
  if (!list.length) return <EmptyBlock />;
  const max = Math.max(...list.map((row) => Number(row[valueKey] || 0)), 1);
  return (
    <div className="space-y-3">
      {list.map((row, index) => {
        const value = Number(row[valueKey] || 0);
        return (
          <div key={`${row[labelKey]}-${index}`}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs font-bold">
              <span className="truncate text-gray-700 dark:text-gray-300">{row[labelKey]}</span>
              <span className="shrink-0 text-gray-950 dark:text-white">{formatter(value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-gray-800">
              <div className="h-full rounded-full bg-gray-900 dark:bg-white" style={{ width: `${Math.max(2, (value / max) * 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SimpleTable({ columns, rows }: { columns: Array<{ key: string; label: string; align?: 'left' | 'right'; format?: (v: any, row: any) => string }>; rows: any[] }) {
  if (!rows?.length) return <EmptyBlock />;
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-gray-800">
      <table className="min-w-full divide-y divide-stone-200 text-sm dark:divide-gray-800">
        <thead className="bg-stone-100 dark:bg-gray-950">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`px-3 py-3 text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-400 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
          {rows.map((row, i) => (
            <tr key={row.id || row.product_id || row.store_id || `${row.name}-${i}`} className="hover:bg-stone-50 dark:hover:bg-gray-800/50">
              {columns.map((col) => (
                <td key={col.key} className={`px-3 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                  {col.format ? col.format(row[col.key], row) : row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const formatters = { money, number, pct };

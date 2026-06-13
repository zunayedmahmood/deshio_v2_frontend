'use client';

import Link from 'next/link';
import { BarChart3, Boxes, Store } from 'lucide-react';

const tabs = [
  { label: 'Overview', href: '/pos-reports', icon: BarChart3 },
  { label: 'Product Analysis', href: '/pos-reports/products', icon: Boxes },
  { label: 'Store & Staff', href: '/pos-reports/stores', icon: Store },
];

export default function PosReportHeader({ active }: { active: 'overview' | 'products' | 'stores' }) {
  return (
    <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex rounded border border-stone-300 bg-stone-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-stone-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            POS Reports
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white md:text-3xl">
            Counter Sales Reporting
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-400">
            Old-school owner reports for POS sales only: sales, profit, products, stores, staff, payment mix and action points.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              (active === 'overview' && tab.href === '/pos-reports') ||
              (active === 'products' && tab.href.includes('/products')) ||
              (active === 'stores' && tab.href.includes('/stores'));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  isActive
                    ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                    : 'border-stone-200 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

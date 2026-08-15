'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Download, FileSpreadsheet, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import axiosInstance from '@/lib/axios';
import { useTheme } from '@/contexts/ThemeContext';

type ReportId =
  | 'sale-orders'
  | 'sale-returns'
  | 'purchases'
  | 'purchase-returns'
  | 'dispatch-transfers'
  | 'journal'
  | 'ledger'
  | 'trial-balance'
  | 'income-statement'
  | 'balance-sheet';

interface ColumnDef {
  key: string;
  label: string;
}

interface AccountOption {
  id: number;
  account_code: string;
  name: string;
}

interface ViewData {
  title: string;
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
  summary?: Record<string, unknown>;
  note?: string;
}

const operationalReports: { id: ReportId; label: string }[] = [
  { id: 'sale-orders', label: 'Daily Sale Order' },
  { id: 'sale-returns', label: 'Daily Sale Return' },
  { id: 'purchases', label: 'Daily Purchase' },
  { id: 'purchase-returns', label: 'Daily Purchase Return' },
  { id: 'dispatch-transfers', label: 'Daily Dispatch Transfer' },
];

const accountingReports: { id: ReportId; label: string }[] = [
  { id: 'journal', label: 'Journal' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'trial-balance', label: 'Trial Balance' },
  { id: 'income-statement', label: 'Income Statement' },
  { id: 'balance-sheet', label: 'Balance Sheet' },
];

const operationalIds = new Set<ReportId>(operationalReports.map(report => report.id));

const localDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const firstDayOfMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return value;
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: unknown) =>
  `৳${toNumber(value).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const prettyKey = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const htmlCell = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const isMoneyColumn = (column: ColumnDef) => {
  const label = column.label.toLowerCase();
  return (
    label.includes(' tk') ||
    label.endsWith('tk') ||
    ['cpu', 'rpu', 'debit', 'credit', 'balance', 'amount'].includes(label) ||
    label.includes('value cost') ||
    label.includes('value retail') ||
    label.includes('total cp') ||
    label.includes('total rp')
  );
};

export default function AccountCheckingPage() {
  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<ReportId>('sale-orders');
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth());
  const [dateTo, setDateTo] = useState(localDate());
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [view, setView] = useState<ViewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    axiosInstance
      .get('/accounts', { params: { leaf_only: true, active: true, per_page: 1000 } })
      .then((response: any) => {
        if (!alive) return;
        const payload = response.data?.data;
        const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
        const normalized = rows
          .map((row: any) => ({ id: Number(row.id), account_code: row.account_code ?? '', name: row.name ?? '' }))
          .filter((row: AccountOption) => row.id > 0);
        setAccounts(normalized);
        if (!selectedAccountId && normalized.length) setSelectedAccountId(normalized[0].id);
      })
      .catch(() => {
        if (alive) setAccounts([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const selectedAccount = useMemo(
    () => accounts.find(account => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );

  const buildJournalView = (data: any): ViewData => {
    const rows = (data?.entries ?? []).flatMap((entry: any) =>
      (entry?.entries ?? []).map((line: any) => ({
        date: entry.date ?? '',
        voucher_number: entry.group_id || `${entry.reference_type ?? 'REF'}-${entry.reference_id ?? ''}`,
        account_code: line.account_code ?? '',
        account_name: line.account_name ?? '',
        debit: line.debit === '-' ? 0 : toNumber(line.debit),
        credit: line.credit === '-' ? 0 : toNumber(line.credit),
        description: entry.description ?? '',
      })),
    );

    return {
      title: 'Journal',
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'voucher_number', label: 'Voucher Number' },
        { key: 'account_code', label: 'Account Code' },
        { key: 'account_name', label: 'Account Name' },
        { key: 'debit', label: 'Debit' },
        { key: 'credit', label: 'Credit' },
        { key: 'description', label: 'Description' },
      ],
      rows,
      summary: { journal_entries: data?.total_entries ?? 0, lines: rows.length },
    };
  };

  const buildLedgerView = (data: any): ViewData => ({
    title: `Ledger${data?.account?.name ? ` — ${data.account.name}` : ''}`,
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'voucher_number', label: 'Voucher Number' },
      { key: 'account_code', label: 'Account Code' },
      { key: 'account_name', label: 'Account Name' },
      { key: 'debit', label: 'Debit' },
      { key: 'credit', label: 'Credit' },
      { key: 'balance', label: 'Balance' },
    ],
    rows: (data?.transactions ?? []).map((row: any) => ({
      date: row.transaction_date ?? '',
      voucher_number: row.transaction_number ?? '',
      account_code: data?.account?.account_code ?? selectedAccount?.account_code ?? '',
      account_name: data?.account?.name ?? selectedAccount?.name ?? '',
      debit: toNumber(row.debit),
      credit: toNumber(row.credit),
      balance: toNumber(row.balance),
    })),
    summary: {
      opening_balance: toNumber(data?.opening_balance),
      closing_balance: toNumber(data?.closing_balance),
    },
  });

  const buildTrialBalanceView = (data: any): ViewData => ({
    title: 'Trial Balance',
    columns: [
      { key: 'account_name', label: 'Account Name' },
      { key: 'debit', label: 'Debit' },
      { key: 'credit', label: 'Credit' },
    ],
    rows: (data?.accounts ?? []).map((row: any) => ({
      account_name: row.account_name ?? '',
      debit: row.debit_balance === '-' ? 0 : toNumber(row.debit_balance),
      credit: row.credit_balance === '-' ? 0 : toNumber(row.credit_balance),
    })),
    summary: {
      total_debits: toNumber(data?.totals?.total_debits),
      total_credits: toNumber(data?.totals?.total_credits),
      difference: toNumber(data?.totals?.difference),
      balanced: data?.totals?.is_balanced ? 'Yes' : 'No',
    },
  });

  const buildIncomeStatementView = (data: any): ViewData => {
    const rows: Record<string, unknown>[] = [];
    const push = (section: string, item: string, amount: unknown) => rows.push({ section, item, amount: toNumber(amount) });

    (data?.revenue?.by_account ?? []).forEach((row: any) => push('Revenue', row.account_name, row.amount ?? row.formatted_amount));
    if (!(data?.revenue?.by_account ?? []).length) {
      push('Revenue', 'Sale', data?.revenue?.sales_revenue);
    }
    push('Revenue', 'Total Revenue', data?.revenue?.total_revenue);
    push('Cost of Goods Sold', 'Cost of Goods Sold', data?.cost_of_goods_sold);
    push('Gross Profit', 'Gross Profit', data?.gross_profit?.amount);
    (data?.operating_expenses?.by_account ?? []).forEach((row: any) => push('Operating Expenses', row.account_name, row.amount ?? row.formatted_amount));
    push('Operating Expenses', 'Total Operating Expenses', data?.operating_expenses?.total);
    push('Net Profit', 'Net Profit', data?.net_profit?.amount);

    return {
      title: 'Income Statement',
      columns: [
        { key: 'section', label: 'Section' },
        { key: 'item', label: 'Account / Item' },
        { key: 'amount', label: 'Amount' },
      ],
      rows,
      summary: {
        total_revenue: toNumber(data?.revenue?.total_revenue),
        cogs: toNumber(data?.cost_of_goods_sold),
        gross_profit: toNumber(data?.gross_profit?.amount),
        operating_expenses: toNumber(data?.operating_expenses?.total),
        net_profit: toNumber(data?.net_profit?.amount),
      },
      note: 'Ledger-based statement. It does not invent the template’s 30% tax line unless tax is actually posted to the general ledger.',
    };
  };

  const buildBalanceSheetView = (data: any): ViewData => {
    const rows: Record<string, unknown>[] = [];
    const push = (section: string, item: string, amount: unknown) => rows.push({ section, item, amount: toNumber(amount) });

    (data?.assets?.current_assets?.cash_and_bank?.breakdown ?? []).forEach((row: any) => push('Current Assets', row.account, row.balance));
    push('Current Assets', 'Inventory', data?.assets?.current_assets?.inventory);
    push('Current Assets', 'Accounts Receivable - Customer', data?.assets?.current_assets?.accounts_receivable);
    (data?.assets?.current_assets?.other_current_assets?.breakdown ?? []).forEach((row: any) => push('Current Assets', row.account, row.balance));
    push('Current Assets', 'Total Current Assets', data?.assets?.current_assets?.total_current_assets);
    (data?.assets?.non_current_assets?.breakdown ?? []).forEach((row: any) => push('Non-Current Assets', row.account, row.balance));
    push('Non-Current Assets', 'Total Non-Current Assets', data?.assets?.non_current_assets?.total);
    push('Assets', 'Total Assets', data?.assets?.total_assets);
    push('Current Liabilities', 'Accounts Payable', data?.liabilities?.current_liabilities?.accounts_payable);
    (data?.liabilities?.current_liabilities?.other_liabilities?.breakdown ?? []).forEach((row: any) => push('Current Liabilities', row.account, row.balance));
    push('Current Liabilities', 'Total Current Liabilities', data?.liabilities?.current_liabilities?.total_current_liabilities);
    (data?.equity?.owner_equity?.breakdown ?? []).forEach((row: any) => push('Equity', row.account, row.balance));
    push('Equity', 'Net Income / Retained Earnings', data?.equity?.retained_earnings);
    push('Equity', 'Total Equity', data?.equity?.total_equity);
    push('Liabilities and Equity', 'Total Liabilities and Equity', data?.total_liabilities_and_equity);

    return {
      title: 'Balance Sheet',
      columns: [
        { key: 'section', label: 'Section' },
        { key: 'item', label: 'Account / Item' },
        { key: 'amount', label: 'Amount' },
      ],
      rows,
      summary: {
        total_assets: toNumber(data?.assets?.total_assets),
        total_liabilities: toNumber(data?.liabilities?.total_liabilities),
        total_equity: toNumber(data?.equity?.total_equity),
        difference: toNumber(data?.accounting_equation?.difference),
        balanced: data?.accounting_equation?.is_balanced ? 'Yes' : 'No',
      },
    };
  };

  const loadReport = useCallback(async () => {
    if (activeReport === 'ledger' && !selectedAccountId) {
      setError('Select an account for the ledger report.');
      setView(null);
      return;
    }

    setLoading(true);
    setError('');

    try {
      let nextView: ViewData;

      if (operationalIds.has(activeReport)) {
        const response = await axiosInstance.get(`/reporting/account-checking/${activeReport}`, {
          params: { date_from: dateFrom, date_to: dateTo },
        });
        const data = response.data?.data ?? {};
        nextView = {
          title: data.title ?? activeReport,
          columns: data.columns ?? [],
          rows: data.rows ?? [],
          summary: data.summary ?? {},
        };
      } else if (activeReport === 'journal') {
        const response = await axiosInstance.get('/accounting/journal-entries', {
          params: { date_from: dateFrom, date_to: dateTo },
        });
        nextView = buildJournalView(response.data?.data ?? {});
      } else if (activeReport === 'ledger') {
        const response = await axiosInstance.get(`/transactions/ledger/${selectedAccountId}`, {
          params: { date_from: dateFrom, date_to: dateTo },
        });
        nextView = buildLedgerView(response.data?.data ?? {});
      } else if (activeReport === 'trial-balance') {
        const response = await axiosInstance.get('/accounting/trial-balance', {
          params: { as_of_date: dateTo },
        });
        nextView = buildTrialBalanceView(response.data?.data ?? {});
      } else if (activeReport === 'income-statement') {
        const response = await axiosInstance.get('/accounting/income-statement', {
          params: { date_from: dateFrom, date_to: dateTo },
        });
        nextView = buildIncomeStatementView(response.data?.data ?? {});
      } else {
        const response = await axiosInstance.get('/accounting/balance-sheet', {
          params: { as_of_date: dateTo },
        });
        nextView = buildBalanceSheetView(response.data?.data ?? {});
      }

      setView(nextView);
    } catch (err: any) {
      setView(null);
      setError(err?.response?.data?.message || err?.message || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  }, [activeReport, dateFrom, dateTo, selectedAccountId, selectedAccount]);

  useEffect(() => {
    if (activeReport === 'ledger' && !selectedAccountId) return;
    loadReport();
  }, [activeReport, dateFrom, dateTo, selectedAccountId]);

  const downloadCsv = () => {
    if (!view || !view.rows.length) return;

    const lines = [view.columns.map(column => csvCell(column.label)).join(',')];
    view.rows.forEach(row => {
      lines.push(view.columns.map(column => csvCell(row[column.key])).join(','));
    });

    const blob = new Blob(['\ufeff', lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeReport}_${dateFrom}_${dateTo}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    if (!view || !view.rows.length) return;

    const period = activeReport === 'trial-balance' || activeReport === 'balance-sheet'
      ? `As of ${dateTo}`
      : `${dateFrom} to ${dateTo}`;
    const headers = view.columns.map(column => `<th>${htmlCell(column.label)}</th>`).join('');
    const rows = view.rows
      .map(row => `<tr>${view.columns.map(column => `<td>${htmlCell(row[column.key])}</td>`).join('')}</tr>`)
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>table{border-collapse:collapse}th,td{border:1px solid #999;padding:6px 9px;white-space:nowrap}th{font-weight:700}</style></head><body><h2>${htmlCell(view.title)}</h2><p>${htmlCell(period)}</p><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></body></html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeReport}_${dateFrom}_${dateTo}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const renderValue = (column: ColumnDef, value: unknown) => {
    if (isMoneyColumn(column)) return money(value);
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} darkMode={darkMode} />
      <div className="min-h-screen md:ml-64">
        <Header
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          toggleSidebar={() => setSidebarOpen(previous => !previous)}
        />

        <main className="space-y-5 p-4 md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-200 p-2.5 dark:bg-slate-800">
                  <FileSpreadsheet className="h-5 w-5 text-slate-800 dark:text-slate-100" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Account Checking Reports</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Read-only reports matching the supplied Sale &amp; Purchase and Accounts workbooks.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                No order, stock, payment, accounting, Pathao, or database records are edited from this page.
              </div>
            </div>

            <Link
              href="/pathao-tracking"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <Truck className="h-4 w-4" />
              Pathao Collection Check
            </Link>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
              <FileSpreadsheet className="h-4 w-4" /> Sale &amp; Purchase
            </div>
            <div className="flex flex-wrap gap-2">
              {operationalReports.map(report => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setActiveReport(report.id)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${activeReport === report.id
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'}`}
                >
                  {report.label}
                </button>
              ))}
            </div>

            <div className="mb-3 mt-5 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
              <BookOpen className="h-4 w-4" /> Accounts
            </div>
            <div className="flex flex-wrap gap-2">
              {accountingReports.map(report => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setActiveReport(report.id)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${activeReport === report.id
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'}`}
                >
                  {report.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
              From
              <input
                type="date"
                value={dateFrom}
                onChange={(event: any) => setDateFrom(event.target.value)}
                className="mt-1 block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </label>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
              To / As of
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={(event: any) => setDateTo(event.target.value)}
                className="mt-1 block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </label>

            {activeReport === 'ledger' && (
              <label className="min-w-[280px] text-xs font-medium text-gray-600 dark:text-gray-300">
                Ledger Account
                <select
                  value={selectedAccountId ?? ''}
                  onChange={(event: any) => setSelectedAccountId(event.target.value ? Number(event.target.value) : null)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_code} — {account.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              type="button"
              onClick={loadReport}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={downloadExcel}
              disabled={!view?.rows.length}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={!view?.rows.length}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          {view && (
            <>
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">{view.title}</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activeReport === 'trial-balance' || activeReport === 'balance-sheet'
                        ? `As of ${dateTo}`
                        : `${dateFrom} to ${dateTo}`}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{view.rows.length} row(s)</div>
                </div>

                {view.note && (
                  <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    {view.note}
                  </div>
                )}

                {view.summary && Object.keys(view.summary).length > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                    {Object.entries(view.summary).map(([key, value]) => (
                      <div key={key} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{prettyKey(key)}</div>
                        <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                          {typeof value === 'number' && !key.includes('qty') && !key.includes('count') && !key.includes('orders') && !key.includes('lines') && !key.includes('entries') && !key.includes('units')
                            ? money(value)
                            : String(value ?? '—')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 text-left text-xs uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      <tr>
                        {view.columns.map(column => (
                          <th key={column.key} className="whitespace-nowrap px-4 py-3 font-semibold">{column.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {!view.rows.length && (
                        <tr>
                          <td colSpan={view.columns.length} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                            No rows for this date range.
                          </td>
                        </tr>
                      )}
                      {view.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="text-gray-700 dark:text-gray-200">
                          {view.columns.map(column => (
                            <td
                              key={column.key}
                              className={`whitespace-nowrap px-4 py-3 ${isMoneyColumn(column) ? 'text-right font-medium tabular-nums' : ''}`}
                            >
                              {renderValue(column, row[column.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

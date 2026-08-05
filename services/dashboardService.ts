import axiosInstance from '@/lib/axios';

export type StoresSummaryPeriod = 'today' | 'week' | 'month' | 'year';

export interface StoresSummaryQuery {
  period?: StoresSummaryPeriod;
  date_from?: string;
  date_to?: string;
}

export interface StoresSummaryResponse {
  success: boolean;
  data: {
    period: {
      type: StoresSummaryPeriod | 'custom';
      start_date: string;
      end_date: string;
    };
    overall_totals: {
      total_sales: number;
      total_orders: number;
      total_inventory_value: number;
      total_profit: number;
      total_returns: number;
    };
    stores: Array<{
      store: {
        id: number;
        name: string;
        store_code: string;
        store_type: string;
        address?: string | null;
      };
      sales: {
        total_sales: number;
        total_orders: number;
        avg_order_value: string;
        paid_amount: number;
        outstanding_amount: number;
        orders_by_status: Record<string, number>;
        orders_by_payment_status: Record<string, number>;
        orders_by_type: Record<string, number>;
      };
      performance: {
        gross_profit: number;
        gross_margin_percentage: string;
        expenses: number;
        net_profit: number;
        net_margin_percentage: string;
        cogs: number;
      };
      inventory: {
        total_value: number;
        total_products: number;
        low_stock_count: number;
        out_of_stock_count: number;
      };
      top_products: Array<{
        product_id: number;
        product_name: string;
        sku: string;
        quantity_sold: number;
        revenue: number;
      }>;
      returns: {
        total_returns: number;
        return_rate: string;
      };
      customers: {
        unique_customers: number;
        repeat_customers: number;
      };
    }>;
    store_count: number;
  };
}


export type DashboardOverviewPeriod = 'today' | 'week' | 'month' | 'custom';

export interface DashboardOverviewQuery {
  period?: DashboardOverviewPeriod;
  date_from?: string;
  date_to?: string;
  store_id?: number;
}

export interface DashboardKpi {
  label: string;
  value: number;
  previous_value: number | null;
  change_percentage: number | null;
  trend: 'up' | 'down' | 'flat';
  is_positive: boolean | null;
  format: 'currency' | 'percentage' | 'number';
  comparison_label: string;
  is_snapshot: boolean;
}

export interface DashboardOverviewResponse {
  success: boolean;
  data: {
    brand: 'Deshio';
    period: {
      type: DashboardOverviewPeriod;
      start_date: string;
      end_date: string;
      previous_start_date: string;
      previous_end_date: string;
      label: string;
    };
    scope: {
      store_id: number | null;
      store: { id: number; name: string; store_code?: string | null } | null;
      label: string;
      can_select_store: true;
    };
    last_updated_at: string;
    kpis: Record<string, DashboardKpi>;
    sales_trend: Array<{
      date: string;
      label: string;
      sales: number;
      purchases: number;
      orders: number;
    }>;
    channel_mix: Array<{
      channel: string;
      label: string;
      sales: number;
      orders: number;
      percentage: number;
    }>;
    top_products: Array<{
      product_id: number;
      name: string;
      sku: string;
      quantity_sold: number;
      sales: number;
    }>;
    operations: Array<{ status: string; label: string; count: number }>;
    customer_due_aging: DashboardAgingBucket[];
    supplier_due_aging: DashboardAgingBucket[];
    inventory_age: Array<{
      key: string;
      label: string;
      value: number;
      quantity: number;
      percentage: number;
    }>;
    stock_alerts: Array<{
      product_id: number;
      name: string;
      sku: string;
      quantity: number;
      reorder_point: number;
      status: 'out_of_stock' | 'low_stock';
    }>;
    stores: Array<{
      id: number;
      name: string;
      store_code?: string | null;
      is_online: boolean;
      is_warehouse: boolean;
    }>;
  };
}

export interface DashboardAgingBucket {
  key: string;
  label: string;
  amount: number;
  count: number;
}

const numeric = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const arrayOf = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);

/**
 * Keep the page render-safe when an older backend omits a newly introduced
 * dashboard section or serializes a numeric database value as a string.
 */
const normalizeOverview = (raw: any): DashboardOverviewResponse['data'] => {
  const rawKpis = raw?.kpis && typeof raw.kpis === 'object' ? raw.kpis : {};
  const kpis = Object.fromEntries(
    Object.entries(rawKpis).map(([key, value]: [string, any]) => [
      key,
      {
        label: String(value?.label ?? key),
        value: numeric(value?.value),
        previous_value: value?.previous_value == null ? null : numeric(value.previous_value),
        change_percentage: value?.change_percentage == null ? null : numeric(value.change_percentage),
        trend: value?.trend === 'up' || value?.trend === 'down' ? value.trend : 'flat',
        is_positive: typeof value?.is_positive === 'boolean' ? value.is_positive : null,
        format: value?.format === 'percentage' || value?.format === 'number' ? value.format : 'currency',
        comparison_label: String(value?.comparison_label ?? ''),
        is_snapshot: Boolean(value?.is_snapshot),
      } as DashboardKpi,
    ])
  );

  return {
    brand: 'Deshio',
    period: {
      type: ['today', 'week', 'month', 'custom'].includes(raw?.period?.type)
        ? raw.period.type
        : 'today',
      start_date: String(raw?.period?.start_date ?? ''),
      end_date: String(raw?.period?.end_date ?? ''),
      previous_start_date: String(raw?.period?.previous_start_date ?? ''),
      previous_end_date: String(raw?.period?.previous_end_date ?? ''),
      label: String(raw?.period?.label ?? 'Today'),
    },
    scope: {
      store_id: raw?.scope?.store_id == null ? null : numeric(raw.scope.store_id),
      store: raw?.scope?.store ?? null,
      label: String(raw?.scope?.label ?? 'All Stores'),
      can_select_store: true,
    },
    last_updated_at: String(raw?.last_updated_at ?? new Date().toISOString()),
    kpis,
    sales_trend: arrayOf<any>(raw?.sales_trend).map((row) => ({
      date: String(row?.date ?? ''),
      label: String(row?.label ?? ''),
      sales: numeric(row?.sales),
      purchases: numeric(row?.purchases),
      orders: numeric(row?.orders),
    })),
    channel_mix: arrayOf<any>(raw?.channel_mix).map((row) => ({
      channel: String(row?.channel ?? 'unknown'),
      label: String(row?.label ?? row?.channel ?? 'Unknown'),
      sales: numeric(row?.sales),
      orders: numeric(row?.orders),
      percentage: numeric(row?.percentage),
    })),
    top_products: arrayOf<any>(raw?.top_products).map((row) => ({
      product_id: numeric(row?.product_id),
      name: String(row?.name ?? 'Unknown product'),
      sku: String(row?.sku ?? 'N/A'),
      quantity_sold: numeric(row?.quantity_sold),
      sales: numeric(row?.sales),
    })),
    operations: arrayOf<any>(raw?.operations).map((row) => ({
      status: String(row?.status ?? 'unknown'),
      label: String(row?.label ?? row?.status ?? 'Unknown'),
      count: numeric(row?.count),
    })),
    customer_due_aging: arrayOf<any>(raw?.customer_due_aging).map((row) => ({
      key: String(row?.key ?? ''),
      label: String(row?.label ?? ''),
      amount: numeric(row?.amount),
      count: numeric(row?.count),
    })),
    supplier_due_aging: arrayOf<any>(raw?.supplier_due_aging).map((row) => ({
      key: String(row?.key ?? ''),
      label: String(row?.label ?? ''),
      amount: numeric(row?.amount),
      count: numeric(row?.count),
    })),
    inventory_age: arrayOf<any>(raw?.inventory_age).map((row) => ({
      key: String(row?.key ?? ''),
      label: String(row?.label ?? ''),
      value: numeric(row?.value),
      quantity: numeric(row?.quantity),
      percentage: numeric(row?.percentage),
    })),
    stock_alerts: arrayOf<any>(raw?.stock_alerts).map((row) => ({
      product_id: numeric(row?.product_id),
      name: String(row?.name ?? 'Unknown product'),
      sku: String(row?.sku ?? 'N/A'),
      quantity: numeric(row?.quantity),
      reorder_point: numeric(row?.reorder_point),
      status: row?.status === 'out_of_stock' ? 'out_of_stock' : 'low_stock',
    })),
    stores: arrayOf<any>(raw?.stores).map((store) => ({
      id: numeric(store?.id),
      name: String(store?.name ?? 'Unnamed store'),
      store_code: store?.store_code == null ? null : String(store.store_code),
      is_online: Boolean(store?.is_online),
      is_warehouse: Boolean(store?.is_warehouse),
    })),
  };
};

const dashboardService = {
  async getOverview(params: DashboardOverviewQuery = {}) {
    const response = await axiosInstance.get('/dashboard/overview', { params });
    const payload = response.data as DashboardOverviewResponse;

    if (payload?.success && payload?.data) {
      return { ...payload, data: normalizeOverview(payload.data) };
    }

    return payload;
  },

  async getStoresSummary(params: StoresSummaryQuery = {}) {
    const response = await axiosInstance.get('/dashboard/stores-summary', { params });
    return response.data as StoresSummaryResponse;
  },
};

export default dashboardService;

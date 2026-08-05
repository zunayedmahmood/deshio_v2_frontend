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

const dashboardService = {
  async getOverview(params: DashboardOverviewQuery = {}) {
    const response = await axiosInstance.get('/dashboard/overview', { params });
    return response.data as DashboardOverviewResponse;
  },

  async getStoresSummary(params: StoresSummaryQuery = {}) {
    const response = await axiosInstance.get('/dashboard/stores-summary', { params });
    return response.data as StoresSummaryResponse;
  },
};

export default dashboardService;

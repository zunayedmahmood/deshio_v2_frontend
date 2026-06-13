import axios from '@/lib/axios';

export interface PosReportFilters {
  from?: string;
  to?: string;
  store_ids?: string;
  category_ids?: string;
  product_ids?: string;
  sku?: string;
  limit?: number;
  sort?: 'sales' | 'profit' | 'units' | 'margin' | 'stock';
}

export interface PosFilterOption {
  id: number;
  name?: string;
  title?: string;
  sku?: string;
  store_code?: string;
  category?: string;
}

export interface PosFiltersPayload {
  stores: PosFilterOption[];
  categories: PosFilterOption[];
  products: PosFilterOption[];
  skus: string[];
}

const cleanParams = (filters: PosReportFilters = {}) => {
  const params: Record<string, any> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params[key] = value;
  });
  return params;
};

const unwrap = (response: any) => response.data?.data ?? response.data;

class PosReportsService {
  async getFilters(): Promise<PosFiltersPayload> {
    const response = await axios.get('/pos-reports/filters');
    return unwrap(response);
  }

  async getOverview(filters: PosReportFilters) {
    const response = await axios.get('/pos-reports/overview', { params: cleanParams(filters) });
    return unwrap(response);
  }

  async getProducts(filters: PosReportFilters) {
    const response = await axios.get('/pos-reports/products', { params: cleanParams(filters) });
    return unwrap(response);
  }

  async getStores(filters: PosReportFilters) {
    const response = await axios.get('/pos-reports/stores', { params: cleanParams(filters) });
    return unwrap(response);
  }
}

const posReportsService = new PosReportsService();
export default posReportsService;

import api from '@/lib/axios';
import { toAbsoluteAssetUrl } from '@/lib/assetUrl';

export interface LiveProductImage {
  id: number;
  url: string;
  is_primary?: boolean;
  alt_text?: string | null;
}

export interface LiveProduct {
  id: number;
  product_id: number;
  live_item_id?: number;
  name: string;
  base_name?: string;
  variation_suffix?: string | null;
  sku: string;
  description?: string | null;
  category?: { id: number; name: string; slug?: string | null } | null;
  images: LiveProductImage[];
  selling_price: number;
  price: number;
  stock_quantity: number;
  total_stock: number;
  reserved_inventory: number;
  available_inventory: number;
  in_stock: boolean;
  is_displaying_now: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface LiveFeedData {
  is_live: boolean;
  displaying_now_enabled: boolean;
  displaying_now: LiveProduct | null;
  products: LiveProduct[];
  updated_at?: string | null;
}

export interface LiveAdminData {
  settings: {
    is_live: boolean;
    displaying_now_enabled: boolean;
    updated_at?: string | null;
  };
  products: LiveProduct[];
  updated_at?: string | null;
}

const toNumber = (value: any, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeImages = (images: any): LiveProductImage[] => {
  if (!Array.isArray(images)) return [];
  return images
    .map((image, index) => {
      const url = toAbsoluteAssetUrl(image?.url || image?.image_url || image?.image || image?.path || '');
      if (!url) return null;
      return {
        id: toNumber(image?.id, index + 1),
        url,
        is_primary: Boolean(image?.is_primary ?? image?.primary ?? index === 0),
        alt_text: image?.alt_text ?? null,
      } as LiveProductImage;
    })
    .filter((image): image is LiveProductImage => Boolean(image));
};

export const normalizeLiveProduct = (raw: any): LiveProduct => ({
  id: toNumber(raw?.id ?? raw?.product_id, 0),
  product_id: toNumber(raw?.product_id ?? raw?.id, 0),
  live_item_id: raw?.live_item_id != null ? toNumber(raw.live_item_id, 0) : undefined,
  name: String(raw?.name || raw?.base_name || 'Product'),
  base_name: raw?.base_name || undefined,
  variation_suffix: raw?.variation_suffix ?? null,
  sku: String(raw?.sku || ''),
  description: raw?.description ?? null,
  category: raw?.category || null,
  images: normalizeImages(raw?.images),
  selling_price: toNumber(raw?.selling_price ?? raw?.price, 0),
  price: toNumber(raw?.price ?? raw?.selling_price, 0),
  stock_quantity: toNumber(raw?.stock_quantity ?? raw?.total_stock, 0),
  total_stock: toNumber(raw?.total_stock ?? raw?.stock_quantity, 0),
  reserved_inventory: toNumber(raw?.reserved_inventory, 0),
  available_inventory: toNumber(raw?.available_inventory, 0),
  in_stock: Boolean(raw?.in_stock),
  is_displaying_now: Boolean(raw?.is_displaying_now),
  sort_order: raw?.sort_order != null ? toNumber(raw.sort_order, 0) : undefined,
  created_at: raw?.created_at,
  updated_at: raw?.updated_at,
});

const normalizeFeed = (payload: any): LiveFeedData => {
  const data = payload?.data ?? payload ?? {};
  const products = Array.isArray(data.products) ? data.products.map(normalizeLiveProduct) : [];
  const displayingNow = data.displaying_now ? normalizeLiveProduct(data.displaying_now) : null;

  return {
    is_live: Boolean(data.is_live),
    displaying_now_enabled: Boolean(data.displaying_now_enabled),
    displaying_now: displayingNow,
    products,
    updated_at: data.updated_at ?? null,
  };
};

const normalizeAdmin = (payload: any): LiveAdminData => {
  const data = payload?.data ?? payload ?? {};
  return {
    settings: {
      is_live: Boolean(data?.settings?.is_live),
      displaying_now_enabled: Boolean(data?.settings?.displaying_now_enabled),
      updated_at: data?.settings?.updated_at ?? null,
    },
    products: Array.isArray(data.products) ? data.products.map(normalizeLiveProduct) : [],
    updated_at: data.updated_at ?? null,
  };
};

const liveProductService = {
  async getFeed(): Promise<LiveFeedData> {
    const response = await api.get('/live/products-feed');
    return normalizeFeed(response.data);
  },

  async getAdminFeed(): Promise<LiveAdminData> {
    const response = await api.get('/live/products');
    return normalizeAdmin(response.data);
  },

  async addProduct(productId: number): Promise<LiveAdminData> {
    const response = await api.post('/live/products/items', { product_id: productId });
    return normalizeAdmin(response.data);
  },

  async removeProduct(productId: number): Promise<LiveAdminData> {
    const response = await api.delete(`/live/products/items/${productId}`);
    return normalizeAdmin(response.data);
  },

  async updateStatus(payload: { is_live?: boolean; displaying_now_enabled?: boolean; confirm_stop?: boolean }): Promise<LiveAdminData> {
    const response = await api.patch('/live/products/status', payload);
    return normalizeAdmin(response.data);
  },

  async setDisplayingNow(productId: number | null): Promise<LiveAdminData> {
    const response = await api.patch('/live/products/displaying-now', { product_id: productId });
    return normalizeAdmin(response.data);
  },
};

export default liveProductService;

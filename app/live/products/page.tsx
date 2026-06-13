'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useTheme } from '@/contexts/ThemeContext';
import liveProductService, { LiveAdminData, LiveProduct } from '@/services/liveProductService';
import api from '@/lib/axios';

type SearchProduct = {
  id: number;
  name: string;
  sku: string;
  selling_price?: number;
  stock_quantity?: number;
  reserved_stock_quantity?: number;
  images?: Array<{ image_url?: string; url?: string }>;
};

const extractProducts = (payload: any): SearchProduct[] => {
  const raw = payload?.data?.data?.data || payload?.data?.data || payload?.data || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((p: any) => ({
    id: Number(p.id),
    name: String(p.name || p.base_name || 'Product'),
    sku: String(p.sku || ''),
    selling_price: Number(p.selling_price || p.price || 0),
    stock_quantity: Number(p.stock_quantity || 0),
    reserved_stock_quantity: Number(p.reserved_stock_quantity || p.reserved_inventory || 0),
    images: Array.isArray(p.images) ? p.images : [],
  })).filter((p: SearchProduct) => p.id > 0);
};

export default function LiveProductsAdminPage() {
  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [feed, setFeed] = useState<LiveAdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [searching, setSearching] = useState(false);

  const selectedIds = useMemo(() => new Set((feed?.products || []).map((p) => p.product_id)), [feed]);
  const displayingNow = useMemo(() => (feed?.products || []).find((p) => p.is_displaying_now) || null, [feed]);

  const loadFeed = async () => {
    try {
      setError(null);
      const data = await liveProductService.getAdminFeed();
      setFeed(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load live products.');
    } finally {
      setLoading(false);
    }
  };

  const runSearch = async () => {
    try {
      setSearching(true);
      const res = await api.get('/products', {
        params: {
          search: search.trim() || undefined,
          per_page: 20,
          group_by_sku: false,
          sort_by: 'created_at',
          sort_direction: 'desc',
        },
      });
      setSearchResults(extractProducts(res.data));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Product search failed.');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    loadFeed();
    runSearch();
    const timer = window.setInterval(() => loadFeed(), 10000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFeed = (data: LiveAdminData) => {
    setFeed(data);
    setError(null);
  };

  const toggleLive = async () => {
    if (!feed) return;
    const nextLive = !feed.settings.is_live;

    if (!nextLive) {
      const first = window.confirm('Are you sure you want to stop the live product feed?');
      if (!first) return;
      const second = window.confirm('Final confirmation: customers will see “Ekhono Live Shuru Hoini”. Stop now?');
      if (!second) return;
    }

    try {
      setSaving(true);
      const data = await liveProductService.updateStatus({ is_live: nextLive, confirm_stop: !nextLive });
      applyFeed(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update live status.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDisplayingNow = async () => {
    if (!feed) return;
    try {
      setSaving(true);
      const data = await liveProductService.updateStatus({ displaying_now_enabled: !feed.settings.displaying_now_enabled });
      applyFeed(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update Displaying Now.');
    } finally {
      setSaving(false);
    }
  };

  const addProduct = async (productId: number) => {
    try {
      setSaving(true);
      const data = await liveProductService.addProduct(productId);
      applyFeed(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to add product.');
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (productId: number) => {
    const ok = window.confirm('Remove this product from the live feed?');
    if (!ok) return;
    try {
      setSaving(true);
      const data = await liveProductService.removeProduct(productId);
      applyFeed(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to remove product.');
    } finally {
      setSaving(false);
    }
  };

  const setDisplaying = async (product: LiveProduct) => {
    try {
      setSaving(true);
      const nextId = product.is_displaying_now ? null : product.product_id;
      const data = await liveProductService.setDisplayingNow(nextId);
      applyFeed(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update selected displayed product.');
    } finally {
      setSaving(false);
    }
  };

  const content = () => {
    if (loading) {
      return <div className="p-6 bg-white border">Loading Social-Media Live...</div>;
    }

    return (
      <div className="p-6 space-y-5 text-gray-900 dark:text-gray-100">
        <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Social-Media Live</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Prepare individual products for Facebook Live. Customer URL: /e-commerce/live/productsfeed
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={loadFeed}
                disabled={saving}
                className="px-3 py-2 border border-gray-400 bg-white dark:bg-gray-800 text-sm flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              <button
                onClick={toggleDisplayingNow}
                disabled={saving}
                className={`px-4 py-2 border text-sm font-semibold ${feed?.settings.displaying_now_enabled ? 'bg-amber-100 border-amber-600 text-amber-900' : 'bg-white dark:bg-gray-800 border-gray-400'}`}
              >
                Displaying Now: {feed?.settings.displaying_now_enabled ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={toggleLive}
                disabled={saving}
                className={`px-5 py-2 border text-sm font-bold ${feed?.settings.is_live ? 'bg-green-100 border-green-700 text-green-900' : 'bg-gray-900 border-gray-900 text-white'}`}
              >
                {feed?.settings.is_live ? 'Live is ON' : 'Go Live'}
              </button>
            </div>
          </div>
          {error && <div className="mt-4 p-3 border border-red-300 bg-red-50 text-red-700 text-sm">{error}</div>}
        </div>

        {displayingNow && feed?.settings.displaying_now_enabled && (
          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-400 p-4">
            <p className="text-xs uppercase tracking-wide font-bold text-yellow-800 dark:text-yellow-200">Displaying Now</p>
            <p className="mt-1 font-semibold">{displayingNow.name}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">SKU: {displayingNow.sku} | Stock: {displayingNow.available_inventory} available / {displayingNow.reserved_inventory} reserved</p>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.35fr] gap-5">
          <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700">
            <div className="p-3 border-b border-gray-300 dark:border-gray-700 font-semibold">Add Products</div>
            <div className="p-3 flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
                placeholder="Search product name or SKU"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              />
              <button onClick={runSearch} disabled={searching} className="px-4 py-2 bg-gray-900 text-white text-sm flex items-center gap-2">
                <Search className="w-4 h-4" /> Search
              </button>
            </div>
            <div className="max-h-[620px] overflow-auto">
              <table className="w-full text-sm border-t border-gray-200 dark:border-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="text-left p-2 border-b">Product</th>
                    <th className="text-left p-2 border-b">SKU</th>
                    <th className="text-right p-2 border-b">Stock</th>
                    <th className="text-center p-2 border-b">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((product) => (
                    <tr key={product.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="p-2 align-top font-medium">{product.name}</td>
                      <td className="p-2 align-top font-mono text-xs">{product.sku}</td>
                      <td className="p-2 align-top text-right">{product.stock_quantity || 0}</td>
                      <td className="p-2 align-top text-center">
                        <button
                          onClick={() => addProduct(product.id)}
                          disabled={saving || selectedIds.has(product.id)}
                          className="px-3 py-1 border border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800"
                        >
                          {selectedIds.has(product.id) ? 'Added' : 'Add'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {searchResults.length === 0 && (
                    <tr><td colSpan={4} className="p-6 text-center text-gray-500">No products found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700">
            <div className="p-3 border-b border-gray-300 dark:border-gray-700 font-semibold">Products in This Live</div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="text-center p-2 border-b">Displaying Now</th>
                    <th className="text-left p-2 border-b">Product</th>
                    <th className="text-left p-2 border-b">SKU</th>
                    <th className="text-right p-2 border-b">Stock</th>
                    <th className="text-right p-2 border-b">Reserved</th>
                    <th className="text-right p-2 border-b">Available</th>
                    <th className="text-center p-2 border-b">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {(feed?.products || []).map((product) => (
                    <tr key={product.product_id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={product.is_displaying_now}
                          disabled={!feed?.settings.displaying_now_enabled || saving}
                          onChange={() => setDisplaying(product)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="p-2 font-medium">{product.name}</td>
                      <td className="p-2 font-mono text-xs">{product.sku}</td>
                      <td className="p-2 text-right">{product.total_stock}</td>
                      <td className="p-2 text-right">{product.reserved_inventory}</td>
                      <td className="p-2 text-right font-semibold">{product.available_inventory}</td>
                      <td className="p-2 text-center">
                        <button onClick={() => removeProduct(product.product_id)} disabled={saving} className="px-2 py-1 border border-red-400 text-red-700 inline-flex items-center gap-1">
                          <Trash2 className="w-4 h-4" /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(feed?.products || []).length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-500">No products added yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header darkMode={darkMode} setDarkMode={setDarkMode} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-auto">{content()}</main>
        </div>
      </div>
    </div>
  );
}

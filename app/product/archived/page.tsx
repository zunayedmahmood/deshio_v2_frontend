'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, List, Grid } from 'lucide-react';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Toast from '@/components/Toast';
import ProductListItem from '@/components/ProductListItem';
import { productService, Product } from '@/services/productService';
import categoryService, { Category } from '@/services/categoryService';
import { ProductGroup } from '@/types/product';


export default function ArchivedProductsPage() {
  const router = useRouter();

  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        productService.getAll({ is_archived: true, per_page: 100, group_by_sku: true }),
        categoryService.getAll({ per_page: 500 }),
      ]);

      setProducts(productsRes.data || []);

      // categoryService.getAll can return either a paginated object or a tree array
      const cats = Array.isArray(categoriesRes) ? categoriesRes : categoriesRes.data;
      setCategories(cats || []);
    } catch (e) {
      console.error(e);
      showToast('Failed to load archived products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to normalize images
  const getImageUrl = (imagePath: string | null | undefined): string | null => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
    return `${baseUrl}/storage/${imagePath}`;
  };

  const getCategoryPath = useCallback((categoryId: number): string => {
    const findPath = (cats: Category[], id: number, path: string[] = []): string[] | null => {
      for (const cat of cats) {
        const newPath = [...path, cat.title];
        if (String(cat.id) === String(id)) {
          return newPath;
        }
        const childCategories = cat.children || cat.all_children || [];
        if (childCategories.length > 0) {
          const found = findPath(childCategories, id, newPath);
          if (found) return found;
        }
      }
      return null;
    };

    const path = findPath(categories, categoryId);
    return path ? path.join(' > ') : 'Uncategorized';
  }, [categories]);

  // Grouping logic for the frontend (to match ProductListClient behavior)
  const productGroups = useMemo((): ProductGroup[] => {
    if (products.length === 0) return [];

    return products.map((product) => {
      const primaryImg = product.images?.find(img => img.is_primary && img.is_active)
        ?? product.images?.find(img => img.is_active)
        ?? product.images?.[0];
      const primaryImageUrl = primaryImg ? getImageUrl(primaryImg.image_path) : null;

      const serverVariants: any[] = (product as any).variants ?? [];

      const allVariants = [
        {
          id: product.id,
          name: product.name,
          sku: product.sku,
          variation_suffix: (product as any).variation_suffix,
          image: primaryImageUrl,
          selling_price: (product as any).selling_price,
          in_stock: (product as any).in_stock,
          stock_quantity: (product as any).stock_quantity,
        },
        ...serverVariants.map((v: any) => {
          const vImg = v.images?.[0];
          const vImgUrl = vImg
            ? (vImg.url?.startsWith('http') ? vImg.url : getImageUrl(vImg.image_path ?? vImg.url))
            : null;

          return {
            id: v.id,
            name: v.name,
            sku: v.sku,
            variation_suffix: v.variation_suffix,
            image: vImgUrl,
            selling_price: v.selling_price,
            in_stock: v.in_stock,
            stock_quantity: v.stock_quantity,
          };
        }),
      ];

      // ✅ NEW: Apply stripping variation_suffix from name for the header
      let baseName = (product as any).base_name || product.name || '';
      const firstVariant = allVariants[0];
      if (!(product as any).base_name && firstVariant.variation_suffix) {
        const suffix = firstVariant.variation_suffix;
        if (baseName.endsWith(suffix)) {
            baseName = baseName.substring(0, baseName.length - suffix.length).trim();
            if (baseName.endsWith('-')) {
                baseName = baseName.substring(0, baseName.length - 1).trim();
            }
        }
      }

      return {
        sku: product.sku,
        baseName: baseName,
        totalVariants: allVariants.length,
        variants: allVariants,
        primaryImage: primaryImageUrl,
        categoryPath: getCategoryPath(product.category_id),
        category_id: product.category_id,
        hasVariations: allVariants.length > 1,
        sellingPrice: (product as any).selling_price ?? null,
        inStock: (product as any).in_stock ?? null,
        stockQuantity: (product as any).stock_quantity ?? null,
      };
    });
  }, [products, getCategoryPath]);

  const handleRestore = async (id: number) => {
    try {
      await productService.restore(id);
      showToast('Product restored successfully', 'success');
      // remove from archived view immediately
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error(e);
      showToast('Failed to restore product', 'error');
    }
  };

  const handleRestoreAll = async (group: ProductGroup) => {
    try {
      const ids = group.variants.map((v) => v.id);
      await productService.bulkUpdate({
        product_ids: ids,
        action: 'restore',
      });
      setProducts((prev) => prev.filter((p) => !ids.includes(p.id)));
      showToast(`Restored all variations of SKU: ${group.sku}`, 'success');
    } catch (err) {
      console.error('Error restoring all variations:', err);
      showToast('Failed to restore variations', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await productService.delete(id);
      showToast('Product deleted successfully', 'success');
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error(e);
      showToast('Failed to delete product', 'error');
    }
  };

  const handleView = (id: number) => {
    router.push(`/product/${id}`);
  };

  return (
    <div className={`${darkMode ? 'dark' : ''} flex h-screen`}>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/product/list')}
                  className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Product List
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Archived Products</h1>
              </div>

              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-colors ${viewMode === 'list'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-colors ${viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    title="Grid view"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={loadData}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
              </div>
            ) : productGroups.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-10 text-center">
                <p className="text-gray-600 dark:text-gray-300">No archived products found.</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                {productGroups.map((group) => (
                  <ProductListItem
                    key={`${group.sku}-${group.variants[0].id}`}
                    productGroup={group}
                    onDelete={handleDelete}
                    onView={handleView}
                    onRestore={handleRestore}
                    onRestoreAll={handleRestoreAll}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

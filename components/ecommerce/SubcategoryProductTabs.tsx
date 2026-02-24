'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import catalogService, { CatalogCategory, SimpleProduct } from '@/services/catalogService';
import { buildCardProductsFromResponse, getCardNewestSortKey } from '@/lib/ecommerceCardUtils';
import PremiumProductCard from '@/components/ecommerce/ui/PremiumProductCard';
import SectionHeader from '@/components/ecommerce/ui/SectionHeader';
import { useCart } from '@/app/e-commerce/CartContext';

interface CategoryTabData {
  category: CatalogCategory;
  products: SimpleProduct[];
  loading: boolean;
  loaded: boolean;
  error?: string;
}

const flattenLeafCategories = (nodes: CatalogCategory[]): CatalogCategory[] => {
  const leaves: CatalogCategory[] = [];
  const walk = (list: CatalogCategory[]) => {
    list.forEach((node) => {
      const children = Array.isArray(node.children) ? node.children : [];
      if (children.length > 0) walk(children);
      else leaves.push(node);
    });
  };
  walk(nodes);
  return leaves;
};

const SubcategoryProductTabs: React.FC<{ tabsCount?: number; productsPerTab?: number }> = ({
  tabsCount = 6,
  productsPerTab = 8,
}) => {
  const router = useRouter();
  const { addToCart } = useCart();
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [tabData, setTabData] = useState<Record<number, CategoryTabData>>({});
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  useEffect(() => {
    let mounted = true;
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const tree = await catalogService.getCategories();
        // Include all named categories (don't exclude those with product_count=0 as it may be stale)
        const allCats = flattenLeafCategories(tree).filter((c) => Boolean(c?.name));
        // Sort by product_count descending, then by id ascending as tiebreaker
        allCats.sort((a, b) => {
          const countDiff = Number(b.product_count || 0) - Number(a.product_count || 0);
          if (countDiff !== 0) return countDiff;
          return Number(a.id || 0) - Number(b.id || 0);
        });
        // If we have fewer leaf categories than requested, also include parent categories
        let leaves = allCats.slice(0, tabsCount);
        if (leaves.length < 2) {
          // Fallback: include all categories (not just leaves)
          const allFlat: CatalogCategory[] = [];
          const walkAll = (list: CatalogCategory[]) => list.forEach(c => { allFlat.push(c); if (c.children) walkAll(c.children); });
          walkAll(tree);
          leaves = allFlat.filter(c => Boolean(c?.name)).sort((a,b) => Number(b.product_count||0)-Number(a.product_count||0)).slice(0,tabsCount);
        }
        if (!mounted) return;
        setCategories(leaves);
        if (leaves.length > 0) setActiveCategoryId((prev) => prev ?? leaves[0].id);
      } catch (error) {
        console.error('Error loading subcategory tabs:', error);
      } finally {
        if (mounted) setLoadingCategories(false);
      }
    };
    loadCategories();
    return () => {
      mounted = false;
    };
  }, [tabsCount]);

  useEffect(() => {
    if (!activeCategoryId) return;
    const selected = categories.find((c) => c.id === activeCategoryId);
    if (!selected) return;
    const existing = tabData[activeCategoryId];
    if (existing?.loaded || existing?.loading) return;

    let mounted = true;
    const fetchProducts = async () => {
      setTabData((prev) => ({
        ...prev,
        [activeCategoryId]: {
          category: selected,
          products: prev[activeCategoryId]?.products || [],
          loading: true,
          loaded: false,
        },
      }));

      const attempts = [
        { category_id: selected.id, sort_by: 'newest' as const, sort_order: 'desc' as const },
        { category_id: selected.id, category: selected.name, sort_by: 'newest' as const, sort_order: 'desc' as const },
        { category: selected.name, category_slug: selected.slug, sort_by: 'newest' as const, sort_order: 'desc' as const },
        // Last resort: fetch newest products with no category filter
        { sort_by: 'newest' as const, sort_order: 'desc' as const },
      ];

      let finalProducts: SimpleProduct[] = [];
      let finalError: string | undefined;

      for (const attempt of attempts) {
        try {
          const response = await catalogService.getProducts({
            page: 1,
            per_page: Math.max(productsPerTab * 5, 40),
            ...(attempt as any),
          });

          const cards = buildCardProductsFromResponse(response)
            .sort((a, b) => getCardNewestSortKey(b) - getCardNewestSortKey(a))
            .slice(0, productsPerTab);

          if (cards.length > 0) {
            finalProducts = cards;
            finalError = undefined;
            break;
          }
          finalProducts = cards;
        } catch (error) {
          finalError = 'Failed to load products';
        }
      }

      if (!mounted) return;
      setTabData((prev) => ({
        ...prev,
        [activeCategoryId]: {
          category: selected,
          products: finalProducts,
          loading: false,
          loaded: true,
          error: finalError,
        },
      }));
    };

    fetchProducts();
    return () => {
      mounted = false;
    };
  }, [activeCategoryId, categories, productsPerTab, tabData]);

  const handleImageError = (productId: number) => {
    setImageErrors((prev) => {
      if (prev.has(productId)) return prev;
      const next = new Set(prev);
      next.add(productId);
      return next;
    });
  };

  const handleProductClick = (product: SimpleProduct) => {
    router.push(`/e-commerce/product/${product.id}`);
  };

  const handleAddToCart = async (product: SimpleProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.has_variants) {
      router.push(`/e-commerce/product/${product.id}`);
      return;
    }
    try {
      await addToCart(product.id, 1);
      router.push('/e-commerce/checkout');
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const activeTab = activeCategoryId ? tabData[activeCategoryId] : null;

  if (loadingCategories) {
    return (
      <section className="ec-section">
        <div className="ec-container">
          <div className="ec-surface p-4 sm:p-6 lg:p-7">
            <div className="h-3 w-40 rounded bg-neutral-200" />
            <div className="mt-3 h-8 w-64 rounded bg-neutral-200" />
            <div className="mt-6 flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-9 w-28 rounded-full border border-neutral-200 bg-neutral-100 animate-pulse" />
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: productsPerTab }).map((_, i) => (
                <div key={i} className="ec-card overflow-hidden rounded-2xl animate-pulse">
                  <div className="aspect-[4/5] bg-neutral-100" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 rounded bg-neutral-100" />
                    <div className="h-4 rounded bg-neutral-100" />
                    <div className="h-4 w-1/2 rounded bg-neutral-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="ec-section">
      <div className="ec-container">
        <div className="ec-surface p-4 sm:p-6 lg:p-7">
          <SectionHeader
            eyebrow="WoodMart style"
            title="Shop by Subcategory"
            subtitle="Switch tabs to explore dedicated product selections by subcategory"
            actionLabel={activeTab?.category ? `View ${activeTab.category.name}` : undefined}
            onAction={activeTab?.category ? () => router.push(activeTab.category.slug ? `/e-commerce/${activeTab.category.slug}` : `/e-commerce/products?category_id=${activeTab.category.id}`) : undefined}
          />

          <div className="mb-5 flex flex-wrap gap-2">
            {categories.map((category) => {
              const active = category.id === activeCategoryId;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategoryId(category.id)}
                  className={`ec-pill ${active ? 'ec-pill-active' : ''}`}
                >
                  {category.name}
                  {Number(category.product_count || 0) > 0 ? (
                    <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-white/15 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
                      {category.product_count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {activeTab?.loading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: productsPerTab }).map((_, i) => (
                <div key={i} className="ec-card overflow-hidden rounded-2xl animate-pulse">
                  <div className="aspect-[4/5] bg-neutral-100" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 rounded bg-neutral-100" />
                    <div className="h-4 rounded bg-neutral-100" />
                    <div className="h-4 w-1/2 rounded bg-neutral-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab && activeTab.products.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {activeTab.products.map((product) => (
                <PremiumProductCard
                  key={`${activeTab.category.id}-${product.id}`}
                  product={product}
                  compact
                  imageErrored={imageErrors.has(product.id)}
                  onImageError={handleImageError}
                  onOpen={handleProductClick}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-neutral-600">
              No products found in this subcategory yet.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default SubcategoryProductTabs;

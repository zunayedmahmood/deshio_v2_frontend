'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import catalogService, { CatalogCategory, SimpleProduct } from '@/services/catalogService';
import { buildCardProductsFromResponse } from '@/lib/ecommerceCardUtils';
import PremiumProductCard from '@/components/ecommerce/ui/PremiumProductCard';
import { useCart } from '@/app/e-commerce/CartContext';
import { fireToast } from '@/lib/globalToast';

/* ─── helpers ────────────────────────────────────────────────────────────── */

const normalizeKey = (v: unknown): string =>
  String(v || '').toLowerCase().trim().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');

const catSlug = (c: CatalogCategory) =>
  c.slug || c.name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

/** Flatten the full category tree into a flat array */
const flattenAll = (nodes: CatalogCategory[]): CatalogCategory[] => {
  const out: CatalogCategory[] = [];
  const walk = (list: CatalogCategory[]) =>
    list.forEach(n => { out.push(n); if (n.children?.length) walk(n.children); });
  walk(nodes);
  return out;
};

/**
 * Build the set of IDs and name-keys that this category (and all its descendants) own.
 * A product matches if its category id or name/slug is in this set.
 */
const buildAllowedSet = (cat: CatalogCategory) => {
  const ids  = new Set<number>();
  const keys = new Set<string>();
  const walk = (node: CatalogCategory) => {
    if (node.id)   ids.add(Number(node.id));
    if (node.name) keys.add(normalizeKey(node.name));
    if (node.slug) keys.add(normalizeKey(node.slug));
    node.children?.forEach(walk);
  };
  walk(cat);
  return { ids, keys };
};

/**
 * Does this product's attached category match the allowed set?
 * Checks category.id, category.name, category.slug, and legacy flat fields.
 */
const productMatchesCat = (
  product: SimpleProduct,
  allowed: { ids: Set<number>; keys: Set<string> }
): boolean => {
  if (allowed.ids.size === 0 && allowed.keys.size === 0) return true;

  const cat: any = (product as any)?.category;

  // id match
  const catId = Number(cat?.id || 0);
  if (catId > 0 && allowed.ids.has(catId)) return true;

  // name / slug match
  const checkKeys = [
    cat?.name,
    cat?.slug,
    (product as any)?.category_name,
    (product as any)?.category_slug,
  ]
    .map(v => normalizeKey(v))
    .filter(Boolean);

  return checkKeys.some(k => allowed.keys.has(k));
};

/**
 * Does the product's base_name / name / display_name contain this category's name?
 * Used as a heuristic when products are tagged with a parent category only.
 * e.g. product named "Jordan 1 High Union LA" contains "jordan 1 high"
 */
const productNameContainsCat = (product: SimpleProduct, catName: string): boolean => {
  const needle = normalizeKey(catName);
  if (!needle) return false;
  const haystack = normalizeKey(
    [product.display_name, product.base_name, product.name].filter(Boolean).join(' ')
  );
  return haystack.includes(needle);
};

/* ─── component ─────────────────────────────────────────────────────────── */

interface TabData {
  category: CatalogCategory;
  products: SimpleProduct[];
  loading: boolean;
  loaded: boolean;
}

const GRADIENTS = [
  'linear-gradient(160deg,#e8e4df 0%,#d3cdc5 40%,#b8b0a5 100%)',
  'linear-gradient(160deg,#dde4e8 0%,#c5cdd3 40%,#a5b0b8 100%)',
  'linear-gradient(160deg,#e8e4df 0%,#c8c2ba 40%,#a59e95 100%)',
];

interface SubcategoryProductTabsProps {
  tabsCount?: number;
  productsPerTab?: number;
  /** Parent category matchers (slug or name). Example: ["sneakers"] */
  parentQueries?: string[];
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** If parent category isn't found, hide the whole section instead of falling back to random leaves. */
  hideIfNotFound?: boolean;
}


const SubcategoryProductTabs: React.FC<SubcategoryProductTabsProps> = ({
  tabsCount = 6,
  productsPerTab = 8,
  parentQueries = ['sneakers', 'sneaker'],
  eyebrow,
  title,
  subtitle,
  hideIfNotFound = true,
}) => {
  const router = useRouter();
  const { addToCart } = useCart();

  const [allCats,     setAllCats]     = useState<CatalogCategory[]>([]);
  const [tabs,        setTabs]        = useState<CatalogCategory[]>([]);
  const [activeId,    setActiveId]    = useState<number | null>(null); // null means "All Products"
  const [tabData,     setTabData]     = useState<Record<string, TabData>>({}); // use string key to handle 'all'
  const [loadingCats, setLoadingCats] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [parentLabel, setParentLabel] = useState<string>('');
  const [parentNode,  setParentNode]  = useState<CatalogCategory | null>(null);
const findParentNode = (flat: CatalogCategory[], queries: string[]): CatalogCategory | null => {
  const q = (queries || []).map(normalizeKey).filter(Boolean);
  if (!q.length) return null;

  // Exact match by slug or name
  for (const needle of q) {
    const exact =
      flat.find(c => normalizeKey(c?.slug) === needle || normalizeKey(c?.name) === needle) || null;
    if (exact) return exact;
  }

  // Contains match (e.g. "Sneakers Collection", "Fashion Accessories")
  for (const needle of q) {
    const relaxed =
      flat.find(
        c => normalizeKey(c?.slug).includes(needle) || normalizeKey(c?.name).includes(needle)
      ) || null;
    if (relaxed) return relaxed;
  }

  return null;
};

  const uniqById = (list: CatalogCategory[]): CatalogCategory[] => {
    const seen = new Set<number>();
    const out: CatalogCategory[] = [];
    list.forEach(c => {
      const id = Number(c?.id || 0);
      if (!id || seen.has(id)) return;
      seen.add(id);
      out.push(c);
    });
    return out;
  };

  /* ── load category tree ─────────────────────────────────────────── */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const tree = await catalogService.getCategories();
        const flat = flattenAll(tree);

        
/**
 * "Shop by Subcategory" section:
 * - Find a parent category by slug/name (parentQueries)
 * - Show ALL subcategories under that parent
 * - Top 3 (by product_count) appear as image banner cards
 * - The rest appear as pill/capsule tabs
 */
        const parent = findParentNode(flat, parentQueries);
        if (alive) {
          setParentLabel(parent?.name || '');
          setParentNode(parent);
        }
        let selected: CatalogCategory[] = [];

        if (parent) {
          if (parent.children?.length) {
            const descendants = flattenAll(parent.children);
            let leaves = descendants.filter(c => c.name && !c.children?.length);
            if (!leaves.length) leaves = descendants.filter(c => c.name);
            selected = uniqById(leaves);
          } else {
            selected = [parent];
          }

          selected.sort((a, b) => Number(b.product_count || 0) - Number(a.product_count || 0));
        }

        if (!selected.length && !hideIfNotFound) {
          let leaves = flat.filter(c => c.name && !c.children?.length);
          leaves.sort((a, b) => Number(b.product_count || 0) - Number(a.product_count || 0));
          selected = leaves.slice(0, tabsCount);

          if (selected.length < 2) {
            const allNamed = [...flat].filter(c => c.name);
            allNamed.sort((a, b) => Number(b.product_count || 0) - Number(a.product_count || 0));
            selected = allNamed.slice(0, tabsCount);
          }
        }

        if (!alive) return;
        setAllCats(flat);
        setTabs(selected);
        // Default to "All Products" (null activeId)
        setActiveId(null);
      } catch (e) {
        console.error('SubcategoryTabs: failed to load categories', e);
      }
      if (alive) setLoadingCats(false);
    })();
    return () => { alive = false; };
  }, [tabsCount]);

  /**
   * Ensure top 3 banner cards have an image.
   * If category image is missing, use the first product image from that subcategory.
   */
  useEffect(() => {
    let alive = true;
    const top3 = tabs.slice(0, 3);
    if (!top3.length) return;

    (async () => {
      for (const cat of top3) {
        const existing = heroImgByCat[cat.id];
        const direct = cat.image_url || (cat as any).image || '';
        if (existing || direct) continue;

        try {
          const response = await catalogService.getProducts({
            page: 1,
            per_page: 6,
            category_id: cat.id,
            sort_by: 'newest',
            sort_order: 'desc',
          } as any);
          const cards = buildCardProductsFromResponse(response);
          const img = (cards?.[0]?.images?.[0] as any)?.url || '';
          if (alive && img) {
            setHeroImgByCat(prev => ({ ...prev, [cat.id]: img }));
          }
        } catch {
          // ignore
        }
      }
    })();

    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.map(t => t.id).join('|')]);

  /* ── fetch products for active tab ──────────────────────────────── */
  useEffect(() => {
    // If activeId is null, we are in "All Products" for the parentNode
    // If we have categories but no explicit selection yet, wait for logic above.
    if (activeId === undefined) return; 

    const key = activeId === null ? 'all' : String(activeId);
    if (tabData[key]?.loaded || tabData[key]?.loading) return;

    const cat = activeId === null ? (parentNode || null) : tabs.find(c => c.id === activeId);
    if (!cat && activeId !== null) return;

    let alive = true;
    setTabData(p => ({ ...p, [key]: { category: cat!, products: [], loading: true, loaded: false } }));

    (async () => {
      const allowed = cat ? buildAllowedSet(cat) : { ids: new Set<number>(), keys: new Set<string>() };

      // Find parent category (products may be tagged with parent instead of child)
      const parent = cat ? (allCats.find(c => c.id === cat.parent_id) || null) : null;

      const fetchAttempts: Record<string, any>[] = [];
      
      if (activeId === null && parentNode) {
        // "All Products" mode for parent
        fetchAttempts.push(
          { category_id: parentNode.id, sort_by: 'newest', sort_order: 'desc' },
          { category_slug: parentNode.slug, sort_by: 'newest', sort_order: 'desc' },
          { sort_by: 'newest', sort_order: 'desc', per_page: 120 }
        );
      } else if (cat) {
        // Specific subcategory mode
        fetchAttempts.push(
          { category_id: cat.id,                                    sort_by: 'newest', sort_order: 'desc' },
          { category_id: cat.id, category: cat.name,                sort_by: 'newest', sort_order: 'desc' },
          { category: cat.name,  category_slug: cat.slug,           sort_by: 'newest', sort_order: 'desc' },
          ...(parent ? [
            { category_id: parent.id,                               sort_by: 'newest', sort_order: 'desc' },
            { category_id: parent.id, category: parent.name,        sort_by: 'newest', sort_order: 'desc' },
          ] : [])
        );
      } else {
        // Fallback catch-all if we have no parent either
        fetchAttempts.push({ sort_by: 'newest', sort_order: 'desc', per_page: 120 });
      }

      let products: SimpleProduct[] = [];

      for (const params of fetchAttempts) {
        try {
          const response = await catalogService.getProducts({
            page: 1,
            per_page: Math.max(productsPerTab * 8, 80),
            ...(params as any),
          });

          const cards = buildCardProductsFromResponse(response);

          // Pass 1: strict category match
          const strict = cards.filter(p => productMatchesCat(p, allowed));

          if (strict.length > 0) {
            products = strict.slice(0, productsPerTab);
            break;
          }

          // Pass 2: heuristic
          if (cat) {
            const byName = cards.filter(p => productNameContainsCat(p, cat.name));
            if (byName.length > 0) {
              products = byName.slice(0, productsPerTab);
              break;
            }
          } else {
             // For "All Products", just take whatever we found
             products = cards.slice(0, productsPerTab);
             break;
          }
        } catch { /* try next attempt */ }
      }

      if (alive) {
        setTabData(p => ({ ...p, [key]: { category: cat!, products, loading: false, loaded: true } }));
      }
    })();

    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, tabs.length, allCats.length, parentNode?.id]);

  const activeKey = activeId === null ? 'all' : String(activeId);
  const activeTab = tabData[activeKey];
  const onImgError = (id: number) => setImageErrors(prev => { const s = new Set(prev); s.add(id); return s; });

  const onProductClick = (p: SimpleProduct) => router.push(`/e-commerce/product/${p.id}`);
  const onAddToCart    = async (p: SimpleProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    if (p.has_variants) { router.push(`/e-commerce/product/${p.id}`); return; }
    try {
      await addToCart(p.id, 1);
      fireToast(`Added to cart: ${p?.name || 'Item'}`, 'success');
    } catch (error: any) {
      fireToast(error?.message || 'Failed to add to cart', 'error');
    }
  };

  /* ── skeleton ── */
  if (loadingCats) {
    return (
      <section className="bg-white py-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 space-y-2">
            <div className="h-3 w-32 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-8 w-56 bg-gray-100 rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-4 mb-8 overflow-hidden">
            {[1,2,3,4,5].map(i => <div key={i} className="h-10 w-24 bg-gray-50 rounded-full flex-shrink-0 animate-pulse" />)}
          </div>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
             {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/5] rounded-2xl bg-gray-50 mb-4" />
                  <div className="h-4 bg-gray-50 rounded-full w-3/4" />
                </div>
              ))}
          </div>
        </div>
      </section>
    );
  }

  if (!tabs.length && hideIfNotFound && !parentNode) return null;

  /* ── main ── */
  return (
    <section className="bg-white py-12 sm:py-20 border-t border-gray-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-10">
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 mb-2 block">
            {eyebrow ?? 'Collections'}
          </span>
          <h2 className="text-3xl sm:text-4xl font-light text-black tracking-tight"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {title ?? (parentLabel ? `Shop ${parentLabel}` : 'Shop All')}
          </h2>
          {subtitle && (
            <p className="mt-2 text-gray-500 max-w-lg text-sm sm:text-base">
              {subtitle}
            </p>
          )}
        </div>

        {/* Scrollable text-based sub-category slider */}
        <div className="relative mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-8 overflow-x-auto pb-4 scrollbar-hide no-scrollbar">
            {/* All Products Tab */}
            <button
              onClick={() => setActiveId(null)}
              className={`text-sm sm:text-base font-medium whitespace-nowrap pb-2 border-b-2 transition-all duration-300 ${
                activeId === null 
                  ? 'text-black border-black' 
                  : 'text-gray-400 border-transparent hover:text-black'
              }`}
              style={{ fontFamily: "'Jost', sans-serif" }}
            >
              All Products
            </button>

            {/* Sub-category Tabs */}
            {tabs.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveId(cat.id)}
                className={`text-sm sm:text-base font-medium whitespace-nowrap pb-2 border-b-2 transition-all duration-300 ${
                  activeId === cat.id 
                    ? 'text-black border-black' 
                    : 'text-gray-400 border-transparent hover:text-black'
                }`}
                style={{ fontFamily: "'Jost', sans-serif" }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div className="min-h-[400px]">
          {activeTab?.loading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-4">
              {Array.from({ length: productsPerTab }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/5] rounded-2xl bg-gray-50 mb-4" />
                  <div className="h-4 bg-gray-50 rounded-full w-3/4" />
                </div>
              ))}
            </div>
          ) : activeTab?.products.length ? (
            <div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-3 lg:grid-cols-4">
              {activeTab.products.map(p => (
                <PremiumProductCard
                  key={`${activeKey}-${p.id}`}
                  product={p}
                  compact
                  imageErrored={imageErrors.has(p.id)}
                  onImageError={onImgError}
                  onOpen={onProductClick}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <p className="text-gray-400 font-medium">No products found in this collection</p>
              <button 
                onClick={() => setActiveId(null)}
                className="mt-4 text-xs font-bold uppercase tracking-widest text-black underline"
              >
                Back to All Products
              </button>
            </div>
          )}
        </div>

        {/* View All Button */}
        {activeTab?.category && activeTab.products.length > 0 && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={() => router.push(`/e-commerce/${encodeURIComponent(catSlug(activeTab.category))}`)}
              className="px-10 py-4 bg-black text-white text-xs font-bold uppercase tracking-widest rounded-full hover:bg-gray-800 transition-all active:scale-95"
            >
              View Full {activeTab.category.name} Collection
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default SubcategoryProductTabs;
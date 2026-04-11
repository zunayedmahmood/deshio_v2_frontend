'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import catalogService, { CatalogCategory } from '@/services/catalogService';
import { toAbsoluteAssetUrl } from '@/lib/assetUrl';
import SectionHeader from '@/components/ecommerce/ui/SectionHeader';

const slugify = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

/**
 * Home "Shop by Category" should show TOP-LEVEL categories (not subcategories).
 * If the API ever returns a flat list, we fall back gracefully.
 */
const getTopLevelCategories = (items: CatalogCategory[]): CatalogCategory[] => {
  const named = (Array.isArray(items) ? items : []).filter(c => c && c.name);

  // Prefer top-level categories if present
  const top = named.filter(c => (c.parent_id ?? null) === null);
  const base = top.length ? top : named;

  // Sort by product_count desc, then name for stability
  return [...base].sort((a, b) => {
    const da = Number(a.product_count || 0);
    const db = Number(b.product_count || 0);
    if (db !== da) return db - da;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
};

const PALETTE = [
  ['#f8f9fa', '#e9ecef'],
  ['#f1f3f5', '#dee2e6'],
  ['#e9ecef', '#ced4da'],
  ['#f8f9fa', '#e9ecef'],
  ['#f1f3f5', '#dee2e6'],
  ['#e9ecef', '#ced4da'],
  ['#f8f9fa', '#e9ecef'],
  ['#f1f3f5', '#dee2e6'],
  ['#e9ecef', '#ced4da'],
  ['#f8f9fa', '#e9ecef'],
];

interface OurCategoriesProps {
  categories?: CatalogCategory[];
  loading?: boolean;
}

const OurCategories: React.FC<OurCategoriesProps> = ({ categories: categoriesProp, loading = false }) => {
  const router = useRouter();
  const [categories, setCategories] = React.useState<CatalogCategory[]>(categoriesProp || []);
  const [isFetching, setIsFetching] = React.useState<boolean>(!categoriesProp);
  const [isExpanded, setIsExpanded] = React.useState(false);

  React.useEffect(() => {
    if (categoriesProp) { setCategories(categoriesProp); setIsFetching(false); }
  }, [categoriesProp]);

  React.useEffect(() => {
    if (categoriesProp) return;
    let active = true;
    setIsFetching(true);
    catalogService.getCategories()
      .then(data => { if (active) setCategories(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setCategories([]); })
      .finally(() => { if (active) setIsFetching(false); });
    return () => { active = false; };
  }, [categoriesProp]);

  const allDisplay = getTopLevelCategories(categories || []);
  const initialLimit = 4;
  const display = isExpanded ? allDisplay : allDisplay.slice(0, initialLimit);

  if (loading || isFetching) {
    return (
      <section className="bg-white py-12 sm:py-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 space-y-3">
            <div className="h-4 w-32 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-10 w-64 bg-gray-100 rounded-lg animate-pulse" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[340/540] rounded-2xl bg-gray-50 mb-4" />
                <div className="h-4 bg-gray-50 rounded-full w-3/4 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (allDisplay.length === 0) return null;

  return (
    <section className="bg-[var(--bg-depth)] py-16 sm:py-24">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[var(--cyan)] mb-4 block" style={{ fontFamily: "'DM Mono', monospace" }}>
            Discovery
          </span>
          <h2 className="text-4xl sm:text-5xl font-medium text-[var(--text-primary)] tracking-tight"
            style={{ fontFamily: "'Cormorant Garamond', serif", lineHeight: 1 }}>
            Explore Collections
          </h2>
          <p className="mt-4 text-[var(--text-secondary)] max-w-lg text-[15px] leading-relaxed">
            Curated essentials handcrafted for quality, longevity, and everyday style.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {allDisplay.map((cat, i) => {
            const imgSrc = toAbsoluteAssetUrl(cat.image || cat.image_url || '');
            const [from, to] = PALETTE[i % PALETTE.length];

            return (
              <button
                key={cat.id}
                onClick={() => router.push(`/e-commerce/${encodeURIComponent(cat.slug || slugify(cat.name))}`)}
                className="group relative flex flex-col items-center w-full"
                type="button"
              >
                <div
                  className="relative w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border-default)] transition-all duration-700 group-hover:shadow-2xl group-hover:border-[var(--border-strong)]"
                  style={{ aspectRatio: '340/500' }}
                >
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={cat.name}
                      className="absolute inset-0 h-full w-full object-cover mix-blend-multiply transition-transform duration-1000 group-hover:scale-110"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{ background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)` }}
                    />
                  )}

                  {/* Subtle warm hover overlay */}
                  <div className="absolute inset-0 bg-[rgba(28,24,18,0)] transition-colors duration-500 group-hover:bg-[rgba(28,24,18,0.06)]" />

                  {/* Category Label at bottom */}
                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col items-start text-left">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2"
                      style={{ fontFamily: "'DM Mono', monospace" }}>
                      {cat.product_count || 0} Pieces
                    </span>
                    <h3 className="text-xl sm:text-2xl font-medium text-[var(--text-primary)] leading-tight"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                      {cat.name}
                    </h3>
                    
                    {/* CTA Chip */}
                    <div className="mt-6 px-4 py-2 bg-[var(--bg-root)] text-[var(--text-primary)] rounded-[var(--radius-sm)] text-[10px] font-bold uppercase tracking-widest opacity-0 translate-y-2 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0"
                         style={{ fontFamily: "'DM Mono', monospace" }}>
                      Shop Collection
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default OurCategories;

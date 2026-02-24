'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ShoppingBag, Star, Truck, Shield, RefreshCw, Headphones } from 'lucide-react';
import catalogService, { CatalogCategory } from '@/services/catalogService';

const FEATURES = [
  { icon: Truck,       text: 'Free Delivery',   sub: 'On orders ৳1,000+' },
  { icon: Shield,      text: 'Authentic',        sub: '100% genuine products' },
  { icon: RefreshCw,   text: 'Easy Returns',     sub: '7-day return policy' },
  { icon: Headphones,  text: 'Support',          sub: 'Dedicated customer care' },
];

const BRAND = 'Errum';

export default function HeroSection() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);

  useEffect(() => {
    catalogService.getCategories()
      .then((tree) => {
        // Get top-level or most popular categories for quick links
        const flat: CatalogCategory[] = [];
        const walk = (list: CatalogCategory[]) => list.forEach(c => { flat.push(c); if (c.children?.length) walk(c.children); });
        walk(tree);
        const top = flat
          .filter(c => c.name)
          .sort((a, b) => Number(b.product_count || 0) - Number(a.product_count || 0))
          .slice(0, 5);
        setCategories(top);
      })
      .catch(() => {});
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-neutral-200/70 bg-gradient-to-b from-white to-[#f6f5f2]">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-10 h-72 w-72 rounded-full bg-amber-100/40 blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-neutral-200/30 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #000 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
      </div>

      <div className="ec-container relative py-10 sm:py-12 lg:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* ── Left: headline + CTAs ── */}
          <div>
            <p className="ec-eyebrow">Official Store · Bangladesh</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-neutral-900 sm:text-5xl lg:text-6xl">
              {BRAND}{' '}
              <span className="text-amber-700">Premium</span>{' '}
              <br className="hidden sm:block" />
              Fashion & Lifestyle
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-600 sm:text-base">
              Discover curated collections — clothing, shoes, bags and accessories. 
              Fast delivery across Bangladesh with easy returns.
            </p>

            {/* CTA buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/e-commerce/products" className="ec-btn ec-btn-primary inline-flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Shop Now
              </Link>
              <Link href="/e-commerce/categories" className="ec-btn ec-btn-secondary inline-flex items-center gap-2">
                Browse Categories
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Dynamic category quick links */}
            {categories.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/e-commerce/${encodeURIComponent(cat.slug || cat.name)}`}
                    className="rounded-full border border-neutral-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-neutral-700 backdrop-blur hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 transition-colors"
                  >
                    {cat.name}
                    {Number(cat.product_count || 0) > 0 && (
                      <span className="ml-1 text-neutral-400">({cat.product_count})</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: visual panel ── */}
          <div className="relative">
            <div className="ec-surface relative mx-auto max-w-md p-3 sm:max-w-lg">
              <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-white via-neutral-50 to-amber-50 p-5 sm:p-6">
                <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-amber-200/35 blur-2xl" />
                <div className="absolute -left-8 bottom-6 h-28 w-28 rounded-full bg-neutral-200/35 blur-2xl" />

                <div className="relative z-10 space-y-4">
                  {/* Stat row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: '500+', label: 'Products' },
                      { value: '4.9★', label: 'Rating' },
                      { value: '10k+', label: 'Happy Customers' },
                    ].map(({ value, label }) => (
                      <div key={label} className="rounded-xl border border-neutral-200 bg-white p-3 text-center shadow-sm">
                        <div className="text-base font-bold text-amber-700">{value}</div>
                        <div className="mt-0.5 text-[10px] text-neutral-500">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Promo card */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-amber-800">New Season Collection</p>
                        <p className="mt-0.5 text-[11px] text-amber-700">Up to 30% off selected items</p>
                      </div>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-700 text-white">
                        <Star className="h-4 w-4 fill-white" />
                      </span>
                    </div>
                  </div>

                  {/* Feature list */}
                  <div className="grid grid-cols-2 gap-2">
                    {FEATURES.map(({ icon: Icon, text, sub }) => (
                      <div key={text} className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                        <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
                        <div>
                          <p className="text-xs font-semibold text-neutral-900">{text}</p>
                          <p className="text-[10px] text-neutral-500">{sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div className="pointer-events-none absolute -bottom-4 -left-4 hidden rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-md lg:block">
              <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">Est.</div>
              <div className="text-sm font-bold text-neutral-900">{BRAND} Store</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Navigation from '@/components/ecommerce/Navigation';
import HeroSection from '@/components/ecommerce/HeroSection';
import dynamic from 'next/dynamic';

const CollectionTiles = dynamic(() => import('@/components/ecommerce/CollectionTiles'), {
  loading: () => <div style={{ minHeight: '400px', margin: '40px 0' }} className="w-full bg-[var(--bg-surface-2)] animate-pulse rounded-2xl" />
});
const NewArrivals = dynamic(() => import('@/components/ecommerce/NewArrivals'), {
  loading: () => <div style={{ minHeight: '600px', margin: '40px 0' }} className="w-full bg-[var(--bg-surface-2)] animate-pulse rounded-2xl" />
});
const SubcategoryProductTabs = dynamic(() => import('@/components/ecommerce/SubcategoryProductTabs'), {
  loading: () => <div style={{ minHeight: '800px', margin: '40px 0' }} className="w-full bg-[var(--bg-surface-2)] animate-pulse rounded-2xl" />
});
const InstagramReelViewer = dynamic(() => import('@/components/ecommerce/InstagramReelViewer'), {
  ssr: false,
  loading: () => <div style={{ minHeight: '760px', margin: '40px 0' }} className="w-full bg-[var(--bg-surface-2)] animate-pulse rounded-2xl" />
});
const BanneredCollections = dynamic(() => import('@/components/ecommerce/BanneredCollections'), {
  loading: () => <div style={{ minHeight: '360px', margin: '40px 0' }} className="w-full bg-[var(--bg-surface-2)] animate-pulse rounded-2xl" />
});
import SectionReveal from '@/components/ecommerce/SectionReveal';
import catalogService, { CatalogCategory } from '@/services/catalogService';
import homepageService, { HomepageSection } from '@/services/homepageService';

const CUSTOM_SECTIONS: Record<string, { eyebrow: string; subtitle: string; queries: string[] }> = {
  'sneakers': {
    eyebrow: "Sneakers",
    subtitle: "Explore sneaker collections—highs, lows, and everything in between.",
    queries: ['sneakers', 'sneaker']
  },
  'clothing': {
    eyebrow: "Clothing",
    subtitle: "Browse tees, hoodies, jackets and more.",
    queries: ['clothing', 'apparel']
  },
  'backpacks': {
    eyebrow: "Backpacks",
    subtitle: "From daily carry to travel-ready packs.",
    queries: ['backpack', 'backpacks', 'bagpack', 'bagpacks']
  },
  'fashion-accessories': {
    eyebrow: "Fashion Accessories",
    subtitle: "Caps, socks, belts, and the finishing touches.",
    queries: ['fashion accessories', 'fashion accessory', 'fashion-accessories']
  }
};

export default function HomePage() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>([]);

  useEffect(() => {
    homepageService.getPublic()
      .then(setHomepageSections)
      .catch(console.error);

    catalogService.getCategories()
      .then(tree => {
        const top = tree.filter(c => !c.parent_id);
        setCategories(top.sort((a, b) => (b.product_count || 0) - (a.product_count || 0)));
      })
      .catch(console.error);
  }, []);


  const normalizeHomepageItems = (items: any[] = []) => items
    .filter(Boolean)
    .map((item, index) => ({
      id: item.id ?? index + 1,
      type: item.type || 'collection',
      title: item.title || item.name || 'Collection',
      subtitle: item.subtitle || item.description || '',
      image: item.image || item.image_url || item.thumbnail_url || item.banner_url || '',
      href: item.href || item.link_url || item.url || '/e-commerce/products',
      show_text: item.show_text !== false,
    }))
    .filter((item) => item.image);

  const renderHomepageSection = (section: HomepageSection) => {
    const settings = section.settings || {};
    const items = normalizeHomepageItems(Array.isArray(settings.items) ? settings.items : []);

    if (section.type === 'hero_banner') {
      return (
        <section key={section.id} className="relative min-h-[520px] overflow-hidden bg-neutral-950 text-white">
          {section.image_url && <img src={section.image_url} alt={section.title || 'Homepage banner'} className="absolute inset-0 h-full w-full object-cover opacity-80" />}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
          <div className="relative z-10 mx-auto flex min-h-[520px] max-w-7xl flex-col justify-center px-6 py-20">
            {section.subtitle && <p className="mb-4 text-xs font-bold uppercase tracking-[0.35em] text-white/70">{section.subtitle}</p>}
            {section.title && <h1 className="max-w-3xl text-5xl font-light leading-tight md:text-7xl">{section.title}</h1>}
            {(section.link_url || section.button_text) && (
              <a href={section.link_url || '/e-commerce/products'} className="mt-8 inline-flex w-fit rounded-full bg-white px-7 py-3 text-sm font-bold uppercase tracking-wider text-black transition hover:bg-white/90">
                {section.button_text || 'Shop Now'}
              </a>
            )}
          </div>
        </section>
      );
    }

    if (section.type === 'collection_tiles') {
      return <SectionReveal key={section.id}><CollectionTiles collections={items.length ? items : undefined} categories={!items.length ? categories : undefined} /></SectionReveal>;
    }

    if (section.type === 'bannered_collections') {
      return <SectionReveal key={section.id}><BanneredCollections items={items.slice(0, 3) as any} /></SectionReveal>;
    }

    if (section.type === 'instagram_reels') {
      return <SectionReveal key={section.id} threshold={0.05}><InstagramReelViewer /></SectionReveal>;
    }

    if (section.type === 'new_arrivals') {
      return <SectionReveal key={section.id}><NewArrivals limit={Number(settings.limit || 40)} /></SectionReveal>;
    }

    if (section.type === 'category_tabs') {
      const parentQueries = Array.isArray(settings.parentQueries)
        ? settings.parentQueries
        : [settings.parentSlug || settings.parentQuery || section.title || 'products'].filter(Boolean);
      return (
        <SectionReveal key={section.id} threshold={0.1}>
          <SubcategoryProductTabs
            parentQueries={parentQueries}
            eyebrow={section.title || settings.eyebrow || parentQueries[0]}
            subtitle={section.subtitle || settings.subtitle || `Explore our curated ${section.title || parentQueries[0]} selection.`}
            productsPerTab={Number(settings.productsPerTab || 8)}
          />
        </SectionReveal>
      );
    }

    return null;
  };

  return (
    <div className="ec-root min-h-screen" style={{ background: '#ffffff' }}>
      <Navigation />

      {homepageSections.length > 0 ? (
        homepageSections.map(renderHomepageSection)
      ) : (
        <>
          {/* 1. Hero section */}
          <HeroSection />

          {/* 2. Collection Tiles */}
          <SectionReveal>
            <CollectionTiles categories={categories} />
          </SectionReveal>

          {/* 3. Instagram Reels Feed */}
          <SectionReveal threshold={0.05}>
            <InstagramReelViewer />
          </SectionReveal>

          {/* 4. New Arrivals */}
          <SectionReveal>
            <NewArrivals limit={40} />
          </SectionReveal>

          {/* 5. Dynamic Shop by Subcategory sections (categories wise) */}
          {categories.map((cat) => {
            const slug = (cat.slug || cat.name).toLowerCase();
            const custom = CUSTOM_SECTIONS[slug] ||
              Object.values(CUSTOM_SECTIONS).find(s => s.queries.includes(slug));

            return (
              <SectionReveal key={cat.id} threshold={0.1}>
                <SubcategoryProductTabs
                  parentQueries={custom ? custom.queries : [slug]}
                  eyebrow={custom ? custom.eyebrow : cat.name}
                  subtitle={custom ? custom.subtitle : `Explore our curated selection of quality ${cat.name} essentials.`}
                />
              </SectionReveal>
            );
          })}
        </>
      )}
    </div>
  );
}

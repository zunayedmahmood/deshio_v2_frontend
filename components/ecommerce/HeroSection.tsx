'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Search as SearchIcon, X, Facebook, Instagram, Youtube, MessageCircle } from 'lucide-react';

import catalogService, { type CatalogCategory } from '@/services/catalogService';
import {
  CLIENT_FACEBOOK,
  CLIENT_INSTAGRAM,
  CLIENT_YOUTUBE,
  CLIENT_PHONE,
} from '@/lib/constants';

/* ──────────────────────────────────────────────────────────────────────────
   Hero (background image + search + socials)
   - No navigation/menu link required (home uses it directly)
   - Search routes to /e-commerce/search?q=
────────────────────────────────────────────────────────────────────────── */

/* Image attribution: https://unsplash.com/photos/a-pair-of-black-and-red-shoes-on-a-white-surface-7y0ywfipHdg?utm_source=unsplash&utm_medium=referral&utm_content=creditShareLink */


const toWaMeLink = (phone: string) => {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits}`;
};

const HERO_IMAGE_PATH = '/e-commerce-hero.jpg';

export default function HeroSection() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [bgUrl, setBgUrl] = useState<string>(HERO_IMAGE_PATH);
  const [topCategories, setTopCategories] = useState<CatalogCategory[]>([]);

  // HERO IMAGE SETTINGS
  // In the future, logic for dynamic banners based on promos or seasons can be added here.
  useEffect(() => {
    // Current logic: Use static hero image
    setBgUrl(HERO_IMAGE_PATH);
  }, []);

  // Fetch top-level categories for “quick chips”.
  useEffect(() => {
    let alive = true;

    catalogService
      .getCategories()
      .then((tree) => {
        const flat: CatalogCategory[] = [];
        const walk = (list: CatalogCategory[]) =>
          list.forEach((c) => {
            flat.push(c);
            if (c.children?.length) walk(c.children);
          });
        walk(tree);

        const parents = flat
          .filter((c) => (c.parent_id === null || c.parent_id === undefined) && c.name)
          .sort((a, b) => Number(b.product_count || 0) - Number(a.product_count || 0))
          .slice(0, 8);

        if (!alive) return;
        setTopCategories(parents);
      })
      .catch(() => { });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const socials = useMemo(() => {
    const items = [
      { label: 'Facebook', href: CLIENT_FACEBOOK, Icon: Facebook },
      { label: 'Instagram', href: CLIENT_INSTAGRAM, Icon: Instagram },
      { label: 'YouTube', href: CLIENT_YOUTUBE, Icon: Youtube },
      { label: 'WhatsApp', href: toWaMeLink(CLIENT_PHONE), Icon: MessageCircle },
    ];
    return items.filter((s) => Boolean(s.href));
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/e-commerce/search?q=${encodeURIComponent(q)}`);
  };

  const clear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <section className="ec-root relative overflow-hidden min-h-screen flex flex-col justify-center">
      {/* Background & Overlays */}
      <div className="absolute inset-0 bg-[var(--bg-root)]">
        {bgUrl ? (
          <div className="absolute inset-0 bg-black/10 z-0">
            <img
              src={bgUrl}
              alt="Hero background"
              className="h-full w-full object-cover object-center opacity-70 mix-blend-multiply transition-opacity duration-1000"
              onError={() => setBgUrl('')}
            />
          </div>
        ) : null}

        {/* Premium atmospheric glows */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(900px 600px at 15% 15%, var(--cyan-glow), transparent 60%), radial-gradient(700px 520px at 85% 75%, var(--gold-glow), transparent 60%)',
            opacity: 0.4,
          }}
        />

        {/* Ivory depth gradient lead-in */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-root)] via-transparent to-transparent" />
      </div>

      {/* Socials (hidden on small) */}
      {socials.length > 0 && (
        <div className="pointer-events-none absolute left-8 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-4 lg:flex">
          {socials.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto group flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300"
              style={{
                background: 'var(--bg-lifted)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-sm)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--cyan)';
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
              aria-label={label}
              title={label}
            >
              <Icon size={16} className="text-[var(--text-muted)] group-hover:text-[var(--cyan)] transition-colors" />
            </a>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="ec-container relative z-10 flex flex-col justify-center py-20">
        <div className="mx-auto w-full max-w-3xl text-center ec-anim-fade-up">

          <h1
            className="text-[var(--text-primary)]"
            style={{
              fontSize: 'clamp(40px, 8vw, 84px)',
              lineHeight: 0.95,
              letterSpacing: '-0.04em',
              fontFamily: "'Cormorant Garamond', serif"
            }}
          >
            Refining the Art of <span className="italic" style={{ color: 'var(--gold)' }}>Lifestyle</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-[var(--text-primary)] font-semibold">
            Explore our curated collections of footwear, apparel, and accessories—designed for those who appreciate the finer details of everyday confidence.
          </p>

          {/* Search bar */}
          <form onSubmit={onSubmit} className="mx-auto mt-10 w-full max-w-2xl">
            <div
              className="relative overflow-hidden rounded-[var(--radius-lg)] backdrop-blur-md"
              style={{
                background: 'rgba(255, 254, 252, 0.85)', // High-opacity ivory fallback
                border: '1px solid var(--border-strong)',
                boxShadow: 'var(--shadow-lifted)',
              }}
            >
              <SearchIcon className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, collections..."
                className="w-full bg-transparent py-5 pl-14 pr-32 text-[15px] text-[var(--text-primary)] font-semibold outline-none placeholder:text-[var(--text-muted)]"
                autoComplete="off"
              />

              {query && (
                <button
                  type="button"
                  onClick={clear}
                  className="absolute right-32 top-1/2 -translate-y-1/2 p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  aria-label="Clear"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              <button
                type="submit"
                disabled={!query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 ec-btn-primary px-6 py-2.5 text-[12px] font-bold uppercase tracking-wider"
              >
                Search
              </button>
            </div>
          </form>

          {/* Quick category chips */}
          {topCategories.length > 0 && (
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {topCategories.map((c) => (
                <Link
                  key={c.id}
                  href={`/e-commerce/${encodeURIComponent(c.slug || c.name)}`}
                  className="rounded-full px-5 py-2 text-[11px] font-bold uppercase tracking-widest transition-all border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] hover:bg-[var(--cyan-pale)]"
                  style={{ fontFamily: "'DM Mono', monospace" }}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}

          {/* Socials (mobile) */}
          {socials.length > 0 && (
            <div className="mt-10 flex items-center justify-center gap-4 lg:hidden">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={`m-${label}`}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-12 w-12 items-center justify-center rounded-full transition-all"
                  style={{
                    background: 'var(--bg-lifted)',
                    border: '1px solid var(--border-default)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                  aria-label={label}
                  title={label}
                >
                  <Icon size={18} className="text-[var(--text-muted)]" />
                </a>
              ))}
            </div>
          )}

          {/* Secondary CTA */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Link href="/e-commerce/products" className="ec-btn-primary px-10 py-4 text-xs font-bold uppercase tracking-[0.2em]">
              Shop Now
            </Link>
            <Link
              href="/e-commerce/categories"
              className="ec-btn-ghost px-10 py-4 text-xs font-bold uppercase tracking-[0.2em]"
            >
              Collections
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

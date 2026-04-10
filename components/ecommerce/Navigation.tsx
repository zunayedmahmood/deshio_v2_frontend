'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingCart, Search, User, ChevronDown, LogOut, Heart, Package, Menu, X, Grid3X3 } from 'lucide-react';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import catalogService, { CatalogCategory } from '@/services/catalogService';
import cartService from '@/services/cartService';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const catSlug = (c: { name: string; slug?: string }) =>
  slugify(c.name);

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { customer, isAuthenticated, logout } = useCustomerAuth();

  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [showCats, setShowCats] = useState(false);
  const [mobileActiveCat, setMobileActiveCat] = useState<number | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());
  const [scrolled, setScrolled] = useState(false);

  const userRef = useRef<HTMLDivElement>(null);
  const catsRef = useRef<HTMLDivElement>(null);

  /* Scroll shadow */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Categories */
  useEffect(() => {
    catalogService.getCategories().then(setCategories).catch(() => { });
  }, []);

  /* Cart */
  const refreshCartCount = () =>
    cartService
      .getCartSummary()
      .then((s) => setCartCount(Number((s as any)?.total_items || 0)))
      .catch(() => setCartCount(0));

  useEffect(() => {
    refreshCartCount();
  }, [isAuthenticated]);

  useEffect(() => {
    const h = () => refreshCartCount();
    window.addEventListener('cart-updated', h);
    window.addEventListener('customer-auth-changed', h);
    return () => {
      window.removeEventListener('cart-updated', h);
      window.removeEventListener('customer-auth-changed', h);
    };
  }, [isAuthenticated]);

  /* Click outside */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUser(false);
      if (catsRef.current && !catsRef.current.contains(e.target as Node)) setShowCats(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* Close mobile on route change */
  useEffect(() => {
    setMobileOpen(false);
    setIsClosing(false);
    setShowCats(false);
    setShowUser(false);
  }, [pathname]);

  const closeMobileMenu = () => {
    setIsClosing(true);
    setTimeout(() => {
      setMobileOpen(false);
      setIsClosing(false);
    }, 450);
  };

  const handleLogout = async () => {
    setShowUser(false);
    try { await logout(); router.push('/e-commerce'); } catch { }
  };

  const isActive = (href: string) => pathname === href;

  return (
    <>

      {/* ── Main navbar ─────────────────────────────────────────────── */}
      <nav
        className={`ec-nav sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'shadow-[var(--shadow-lifted)] border-b-transparent' : 'border-b-[var(--border-default)]'}`}
      >
        <div className="ec-container">
          <div className="flex h-16 items-center justify-between gap-6 sm:h-[68px]">

            {/* ── Logo ── */}
            <Link href="/e-commerce" className="flex-shrink-0 flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Errum"
                className="h-8 w-auto object-contain"
              />
              <div
                className="flex items-center text-[var(--text-primary)]"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 600, letterSpacing: '0.08em' }}
              >
                <span className="text-[var(--cyan)]">ERRUM</span>
              </div>
            </Link>

            {/* ── Desktop nav links ── */}
            <div className="hidden lg:flex items-center gap-8">
              <Link href="/e-commerce" className={`ec-nav-link ${isActive('/e-commerce') ? 'ec-nav-link-active' : ''}`}>
                Home
              </Link>

              {/* Categories mega-dropdown */}
              <div className="relative" ref={catsRef}>
                <button
                  onClick={() => setShowCats(v => !v)}
                  className={`ec-nav-link flex items-center gap-1 ${showCats ? 'ec-nav-link-active' : ''}`}
                >
                  Categories
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showCats ? 'rotate-180' : ''}`} />
                </button>

                {showCats && categories.length > 0 && (
                  <div className="absolute left-1/2 top-full mt-3 -translate-x-1/2 w-[520px] rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-lifted)] shadow-[var(--shadow-lifted)] overflow-hidden">
                    {/* Dropdown header */}
                    <div className="border-b border-[var(--border-default)] px-5 py-3 flex items-center justify-between">
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.18em', color: 'var(--text-muted)' }}>
                        ALL CATEGORIES
                      </span>
                      <Link
                        href="/e-commerce/categories"
                        className="text-[11px] text-[var(--cyan)] hover:text-[var(--cyan-bright)] transition-colors font-medium"
                        onClick={() => setShowCats(false)}
                      >
                        View all →
                      </Link>
                    </div>

                    {/* Category grid */}
                    <div className="p-4 grid grid-cols-2 gap-1 max-h-[400px] overflow-y-auto">
                      {categories.map(cat => (
                        <div key={cat.id}>
                            <Link
                              href={`/e-commerce/${encodeURIComponent(catSlug(cat))}`}
                              onClick={() => setShowCats(false)}
                              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[var(--text-primary)] hover:bg-[var(--cyan-pale)] hover:text-[var(--cyan)] transition-all group"
                              style={{ background: 'transparent' }}
                            >
                              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-[var(--cyan)] border border-[var(--border-default)]"
                                style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                                {cat.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-[var(--text-primary)] truncate transition-colors group-hover:text-[var(--cyan)]">{cat.name}</p>
                                {cat.children && cat.children.length > 0 && (
                                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{cat.children.length} subcategories</p>
                                )}
                              </div>
                            </Link>

                          {/* Sub-category pills under each parent - all shown with toggle */}
                          {cat.children && cat.children.length > 0 && (
                            <div className="pl-[46px] pb-2 flex flex-col gap-0.5">
                              {(expandedCats.has(cat.id) ? cat.children : cat.children.slice(0, 3)).map(child => (
                                <Link
                                  key={child.id}
                                  href={`/e-commerce/${encodeURIComponent(catSlug(child))}`}
                                  onClick={() => setShowCats(false)}
                                  className="text-[11px] text-[var(--text-muted)] hover:text-[var(--cyan)] py-0.5 transition-colors"
                                >
                                  {child.name}
                                </Link>
                              ))}
                              {cat.children.length > 3 && (
                                <button
                                  onClick={e => { e.stopPropagation(); setExpandedCats(prev => { const s = new Set(prev); s.has(cat.id) ? s.delete(cat.id) : s.add(cat.id); return s; }); }}
                                  className="text-[11px] text-left transition-colors mt-0.5"
                                  style={{ color: 'var(--gold-light)' }}
                                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--gold-light)')}
                                >
                                  {expandedCats.has(cat.id) ? '↑ Show less' : `+ ${cat.children.length - 3} more`}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Link href="/e-commerce/about" className={`ec-nav-link ${isActive('/e-commerce/about') ? 'ec-nav-link-active' : ''}`}>About</Link>
              <Link href="/e-commerce/contact" className={`ec-nav-link ${isActive('/e-commerce/contact') ? 'ec-nav-link-active' : ''}`}>Contact</Link>
            </div>

            {/* ── Right icons ── */}
            <div className="flex items-center gap-1 sm:gap-2">

              {/* Search */}
              <Link
                href="/e-commerce/search"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--cyan)] hover:bg-[var(--cyan-pale)] transition-all"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </Link>

              {/* Account */}
              {isAuthenticated ? (
                <div className="relative hidden sm:block" ref={userRef}>
                  <button
                    onClick={() => setShowUser(v => !v)}
                    className="flex h-9 items-center gap-2 rounded-full px-3 text-[var(--text-secondary)] hover:text-[var(--cyan)] hover:bg-[var(--cyan-pale)] transition-all"
                  >
                    <User className="h-4 w-4" />
                    <span className="text-[12px] font-medium hidden md:block">{customer?.name?.split(' ')[0]}</span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${showUser ? 'rotate-180' : ''}`} />
                  </button>
                  {showUser && (
                    <div className="absolute right-0 top-full mt-2 w-52 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--bg-lifted)] py-2 shadow-[var(--shadow-lifted)]">
                      <div className="px-4 py-3 border-b border-[var(--border-default)]">
                        <p className="text-[13px] font-semibold text-[var(--text-primary)]">{customer?.name}</p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">{customer?.email}</p>
                      </div>
                      {[
                        { href: '/e-commerce/my-account', icon: User, label: 'My Account' },
                        { href: '/e-commerce/orders', icon: Package, label: 'My Orders' },
                        { href: '/e-commerce/wishlist', icon: Heart, label: 'Wishlist' },
                      ].map(({ href, icon: Icon, label }) => (
                        <Link key={href} href={href} onClick={() => setShowUser(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-[var(--text-secondary)] hover:text-[var(--cyan)] hover:bg-[var(--cyan-pale)] transition-all"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </Link>
                      ))}
                      <div className="mx-4 my-1 border-t border-[var(--border-default)]" />
                      <button onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all text-left"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/e-commerce/login"
                  className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--cyan)] hover:bg-[var(--cyan-pale)] transition-all"
                  aria-label="Login"
                >
                  <User className="h-4 w-4" />
                </Link>
              )}

              {/* Cart */}
              <Link href="/e-commerce/cart" aria-label="Cart"
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--cyan)] hover:bg-[var(--cyan-pale)] transition-all"
              >
                <ShoppingCart className="h-4 w-4" />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--cyan)] px-0.5 text-[9px] font-bold text-[var(--text-on-accent)]">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={() => (mobileOpen ? closeMobileMenu() : setMobileOpen(true))}
                className="lg:hidden flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--cyan)] hover:bg-[var(--cyan-pale)] transition-all ml-1"
                aria-label="Menu"
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile menu Drawer ── */}
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <div
              className={`lg:hidden fixed inset-0 z-[100] bg-black/60 backdrop-blur-md ${isClosing ? 'ec-anim-backdrop-out' : 'ec-anim-backdrop'}`}
              onClick={closeMobileMenu}
            />

            {/* Side Drawer */}
            <div className={`lg:hidden fixed top-0 right-0 bottom-0 z-[101] w-[85%] max-w-[400px] bg-[#0d0d0d] shadow-[-20px_0_80px_rgba(0,0,0,0.8)] flex flex-col ${isClosing ? 'ec-anim-slide-out-right' : 'ec-anim-slide-in-right'}`}>
              {/* Drawer Header */}
              <div className="flex h-16 items-center justify-between px-6 border-b border-[var(--border-default)]">
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                  MENU
                </span>
                <button
                  onClick={closeMobileMenu}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto ec-scrollbar px-6 py-8 space-y-8">

                {/* Auth section */}
                <div className="ec-anim-fade-up ec-delay-1">
                  {isAuthenticated ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-[var(--cyan-pale)] flex items-center justify-center border border-[var(--cyan-border)]">
                          <User className="h-5 w-5 text-[var(--cyan)]" />
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-[var(--text-primary)]">{customer?.name}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{customer?.email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { href: '/e-commerce/my-account', label: 'Profile' },
                          { href: '/e-commerce/orders', label: 'Orders' },
                          { href: '/e-commerce/wishlist', label: 'Saved' },
                        ].map(({ href, label }) => (
                          <Link key={href} href={href}
                            className="rounded-xl bg-[var(--bg-surface)] py-3 text-center text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all border border-[var(--border-default)]"
                          >
                            {label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Link href="/e-commerce/login"
                      className="group flex items-center justify-between rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 transition-all hover:bg-[var(--bg-surface-2)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[var(--cyan-pale)] flex items-center justify-center">
                          <User className="h-4 w-4 text-[var(--cyan)]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">Login / Register</p>
                          <p className="text-[11px] text-[var(--text-muted)]">Track your orders & save favorites</p>
                        </div>
                      </div>
                      <ChevronDown className="-rotate-90 h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                    </Link>
                  )}
                </div>

                {/* Primary Nav */}
                <div className="space-y-2 ec-anim-fade-up ec-delay-2">
                  <p className="text-[10px] font-bold tracking-[0.2em] text-[var(--text-muted)] uppercase mb-4" style={{ fontFamily: "'DM Mono', monospace" }}>Navigation</p>
                  {[
                    { href: '/e-commerce', label: 'Home' },
                    { href: '/e-commerce/products', label: 'Shop All' },
                    { href: '/e-commerce/about', label: 'Our Story' },
                    { href: '/e-commerce/contact', label: 'Get in Touch' },
                  ].map(({ href, label }) => (
                    <Link key={href} href={href}
                      className="flex items-center justify-between py-3 text-[18px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all border-b border-[var(--border-default)]"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      {label}
                      <ChevronDown className="-rotate-90 h-3.5 w-3.5 opacity-20" />
                    </Link>
                  ))}
                </div>

                {/* Categories */}
                <div className="space-y-4 ec-anim-fade-up ec-delay-3">
                  <p className="text-[10px] font-bold tracking-[0.2em] text-[var(--text-muted)] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>Collections</p>
                  <div className="grid grid-cols-1 gap-1">
                    {categories.slice(0, 10).map(cat => (
                      <div key={cat.id} className="space-y-1">
                        <div className={`flex items-center border-l-4 transition-all ${pathname.includes(catSlug(cat)) ? 'border-[var(--cyan)]' : 'border-transparent'}`}>
                          <Link href={`/e-commerce/${encodeURIComponent(catSlug(cat))}`}
                            className={`flex-1 py-2 pl-3 text-[16px] font-medium transition-colors ${pathname.includes(catSlug(cat)) ? 'text-[var(--cyan)]' : 'text-[var(--text-secondary)]'}`}
                          >
                            {cat.name}
                          </Link>
                          {cat.children && cat.children.length > 0 && (
                            <button
                              onClick={() => setMobileActiveCat(mobileActiveCat === cat.id ? null : cat.id)}
                              className="p-3 text-[var(--text-muted)] hover:text-[var(--cyan)] transition-colors"
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform ${mobileActiveCat === cat.id ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>
                        {mobileActiveCat === cat.id && (
                          <div className="pl-6 border-l border-[var(--border-default)] space-y-1 py-1 mb-2">
                            {cat.children?.map(child => (
                              <Link key={child.id} href={`/e-commerce/${encodeURIComponent(catSlug(child))}`}
                                className={`block py-1.5 text-[14px] transition-colors ${pathname.includes(catSlug(child)) ? 'text-[var(--cyan)]' : 'text-[var(--text-muted)]'}`}
                              >
                                {child.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <Link href="/e-commerce/categories" className="inline-block mt-2 text-[12px] text-[var(--cyan)] font-medium hover:underline">
                      View all collections →
                    </Link>
                  </div>
                </div>

                {/* Footer block */}
                <div className="pt-8 mt-4 border-t border-[var(--border-default)] ec-anim-fade-up ec-delay-4">
                  {isAuthenticated ? (
                    <button onClick={() => { closeMobileMenu(); handleLogout(); }}
                      className="flex w-full items-center gap-3 py-3 text-[14px] text-[var(--text-muted)] hover:text-[var(--status-danger)] transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out of account
                    </button>
                  ) : (
                    <p className="text-[11px] text-[var(--text-muted)] text-center italic">
                      Step into the world of ERRUM
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </nav>
    </>
  );
};

export default Navbar;


'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingCart, Search, User, ChevronDown, LogOut, Heart, Package, Menu, X, Grid3X3 } from 'lucide-react';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import catalogService, { CatalogCategory } from '@/services/catalogService';
import cartService from '@/services/cartService';
import { useCart } from '@/app/e-commerce/CartContext';


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
  const { setIsCartOpen } = useCart();


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
                  <div className="absolute left-1/2 top-full mt-4 -translate-x-1/2 w-[1000px] rounded-[var(--radius-xl)] border border-[var(--border-strong)] bg-[var(--bg-lifted)] shadow-[var(--shadow-lifted)] overflow-hidden">
                    {/* Dropdown header */}
                    <div className="border-b border-[var(--border-default)] px-8 py-5 flex items-center justify-between bg-[var(--bg-surface)]">
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', fontWeight: 700, letterSpacing: '0.22em', color: 'var(--text-muted)' }}>
                        ALL CATEGORIES
                      </span>
                      <Link
                        href="/e-commerce/categories"
                        className="text-[13px] text-[var(--cyan)] hover:text-[var(--cyan-bright)] transition-colors font-bold uppercase tracking-widest"
                        onClick={() => setShowCats(false)}
                      >
                        Explore all →
                      </Link>
                    </div>

                    {/* Category grid */}
                    <div className="p-8 grid grid-cols-3 gap-x-8 gap-y-6 max-h-[600px] overflow-y-auto ec-scrollbar">
                      {categories.map(cat => (
                        <div key={cat.id} className="group/item">
                          <Link
                            href={`/e-commerce/${encodeURIComponent(catSlug(cat))}`}
                            onClick={() => setShowCats(false)}
                            className="flex items-center gap-5 rounded-2xl px-4 py-4 text-[var(--text-primary)] hover:bg-[var(--cyan-pale)] transition-all"
                            style={{ background: 'transparent' }}
                          >
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-[16px] font-bold text-[var(--cyan)] border border-[var(--border-default)] bg-[var(--bg-depth)] group-hover/item:border-[var(--cyan-border)]"
                              style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                              {cat.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[16.5px] font-bold text-[var(--text-primary)] truncate transition-colors group-hover/item:text-[var(--cyan)]">{cat.name}</p>
                              {cat.children && cat.children.length > 0 && (
                                <p className="text-[11.5px] text-[var(--text-muted)] mt-1 tracking-wide font-medium uppercase">{cat.children.length} collections</p>
                              )}
                            </div>
                          </Link>

                          {/* Sub-category pills under each parent - all shown with toggle */}
                          {cat.children && cat.children.length > 0 && (
                            <div className="pl-[72px] pb-4 flex flex-col gap-2">
                              {(expandedCats.has(cat.id) ? cat.children : cat.children.slice(0, 4)).map(child => (
                                <Link
                                  key={child.id}
                                  href={`/e-commerce/${encodeURIComponent(catSlug(child))}`}
                                  onClick={() => setShowCats(false)}
                                  className="text-[15.5px] font-medium text-[var(--text-primary)] hover:text-[var(--text-primary)] py-0.5 transition-colors relative flex items-center"
                                >
                                  <span className="w-1.5 h-px bg-[var(--border-strong)] mr-3 opacity-40"></span>
                                  {child.name}
                                </Link>
                              ))}
                              {cat.children.length > 4 && (
                                <button
                                  onClick={e => { e.stopPropagation(); setExpandedCats(prev => { const s = new Set(prev); s.has(cat.id) ? s.delete(cat.id) : s.add(cat.id); return s; }); }}
                                  className="text-[11px] font-bold text-left transition-colors mt-1 pl-3 uppercase tracking-widest"
                                  style={{ color: 'var(--gold-light)' }}
                                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--gold-light)')}
                                >
                                  {expandedCats.has(cat.id) ? '↑ Show fewer' : `+ ${cat.children.length - 4} collections`}
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
              <button
                onClick={() => setIsCartOpen(true)}
                aria-label="Cart"
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--cyan)] hover:bg-[var(--cyan-pale)] transition-all"
              >
                <ShoppingCart className="h-4 w-4" />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--cyan)] px-0.5 text-[9px] font-bold text-[var(--text-on-accent)]">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>


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
              className={`lg:hidden fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm ${isClosing ? 'ec-anim-backdrop-out' : 'ec-anim-backdrop'}`}
              onClick={closeMobileMenu}
            />

            {/* Side Drawer */}
            <div className={`lg:hidden fixed top-0 right-0 bottom-0 z-[1001] w-[85%] max-w-[400px] bg-[var(--bg-root)] shadow-[-20px_0_80px_rgba(0,0,0,0.12)] flex flex-col border-l border-[var(--border-default)] ${isClosing ? 'ec-anim-slide-out-right' : 'ec-anim-slide-in-right'}`}>
              {/* Drawer Header */}
              <div className="flex h-16 items-center justify-between px-6 border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                  MENU
                </span>
                <button
                  onClick={closeMobileMenu}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all bg-[var(--bg-depth)] border border-[var(--border-default)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto ec-scrollbar px-6 py-8 space-y-8">

                {/* Auth section */}
                <div className="ec-anim-fade-up ec-delay-1">
                  {isAuthenticated ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm">
                        <div className="h-12 w-12 rounded-full bg-[var(--cyan-pale)] flex items-center justify-center border border-[var(--cyan-border)] shadow-sm">
                          <User className="h-5 w-5 text-[var(--cyan)]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold text-[var(--text-primary)] truncate">{customer?.name}</p>
                          <p className="text-[11px] text-[var(--text-muted)] truncate">{customer?.email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { href: '/e-commerce/my-account', label: 'Profile' },
                          { href: '/e-commerce/orders', label: 'Orders' },
                          { href: '/e-commerce/wishlist', label: 'Saved' },
                        ].map(({ href, label }) => (
                          <Link key={href} href={href}
                            className="rounded-xl bg-[var(--bg-depth)] py-3 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all border border-[var(--border-default)]"
                            style={{ fontFamily: "'DM Mono', monospace" }}
                          >
                            {label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Link href="/e-commerce/login"
                      className="group flex items-center justify-between rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 transition-all hover:border-[var(--cyan-border)] shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-[var(--cyan-pale)] flex items-center justify-center border border-[var(--cyan-border)] shadow-sm">
                          <User className="h-5 w-5 text-[var(--cyan)]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">Log In / Sign Up</p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Unlock rewards & track orders</p>
                        </div>
                      </div>
                      <ChevronDown className="-rotate-90 h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--cyan)] transition-colors" />
                    </Link>
                  )}
                </div>

                {/* Primary Nav */}
                <div className="space-y-2 ec-anim-fade-up ec-delay-2">
                  <p className="text-[10px] font-bold tracking-[0.2em] text-[var(--text-muted)] uppercase mb-4" style={{ fontFamily: "'DM Mono', monospace" }}>Directory</p>
                  {[
                    { href: '/e-commerce', label: 'Homepage' },
                    { href: '/e-commerce/products', label: 'The Collection' },
                    { href: '/e-commerce/about', label: 'Our Promise' },
                    { href: '/e-commerce/contact', label: 'Contact Us' },
                  ].map(({ href, label }) => (
                    <Link key={href} href={href}
                      className="flex items-center justify-between py-4 text-[19px] font-medium text-[var(--text-secondary)] hover:text-[var(--cyan)] transition-all border-b border-[var(--border-default)]"
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
                    {categories.slice(0, 12).map(cat => (
                      <div key={cat.id} className="space-y-1">
                        <div className={`flex items-center transition-all rounded-xl ${pathname.includes(catSlug(cat)) ? 'bg-[var(--cyan-pale)]' : 'hover:bg-[var(--bg-depth)]'}`}>
                          <Link href={`/e-commerce/${encodeURIComponent(catSlug(cat))}`}
                            className={`flex-1 py-3 pl-4 text-[16px] font-semibold transition-colors ${pathname.includes(catSlug(cat)) ? 'text-[var(--cyan)]' : 'text-[var(--text-secondary)]'}`}
                          >
                            {cat.name}
                          </Link>
                          {cat.children && cat.children.length > 0 && (
                            <button
                              onClick={() => setMobileActiveCat(mobileActiveCat === cat.id ? null : cat.id)}
                              className="p-4 text-[var(--text-muted)] hover:text-[var(--cyan)] transition-colors"
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform ${mobileActiveCat === cat.id ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>
                        {mobileActiveCat === cat.id && (
                          <div className="pl-8 space-y-1 py-2 mb-2">
                            {cat.children?.map(child => (
                              <Link key={child.id} href={`/e-commerce/${encodeURIComponent(catSlug(child))}`}
                                className={`block py-2 text-[14px] transition-colors relative flex items-center ${pathname.includes(catSlug(child)) ? 'text-[var(--cyan)] font-bold' : 'text-[var(--text-muted)]'}`}
                              >
                                <span className="w-1.5 h-px bg-[var(--border-default)] mr-3 opacity-40"></span>
                                {child.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <Link href="/e-commerce/categories" className="block text-center mt-4 py-3 rounded-xl border border-[var(--border-default)] text-[12px] text-[var(--cyan)] font-bold uppercase tracking-widest hover:bg-[var(--bg-surface)] transition-all">
                      View all collections
                    </Link>
                  </div>
                </div>

                {/* Footer block */}
                <div className="pt-8 mt-4 border-t border-[var(--border-default)] ec-anim-fade-up ec-delay-4">
                  {isAuthenticated ? (
                    <button onClick={() => { closeMobileMenu(); handleLogout(); }}
                      className="flex w-full items-center justify-center gap-3 py-4 rounded-xl bg-[var(--status-danger-pale)] text-[12px] font-bold uppercase tracking-widest text-[var(--status-danger)] hover:bg-[var(--status-danger)] hover:text-white transition-all shadow-sm"
                      style={{ fontFamily: "'DM Mono', monospace" }}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-[11px] text-[var(--text-muted)] italic">
                        Step into the world of ERRUM
                      </p>
                    </div>
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


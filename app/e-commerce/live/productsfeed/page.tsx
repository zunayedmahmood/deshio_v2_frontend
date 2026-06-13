'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, RefreshCw } from 'lucide-react';
import { useCart } from '@/app/e-commerce/CartContext';
import liveProductService, { LiveFeedData, LiveProduct } from '@/services/liveProductService';

const POLL_MS = 5000;

const formatTaka = (value: number) => `৳${Number(value || 0).toLocaleString('bn-BD')}`;

const productImage = (product: LiveProduct) => product.images?.[0]?.url || '/images/placeholder-product.jpg';

function StockLine({ product }: { product: LiveProduct }) {
  const allReserved = product.total_stock > 0 && product.available_inventory <= 0;

  return (
    <div className="live-stock-row">
      <span>স্টক: <b>{product.available_inventory.toLocaleString('bn-BD')}</b></span>
      <span>অর্ডার হয়েছে: <b>{product.reserved_inventory.toLocaleString('bn-BD')}</b></span>
      {allReserved && <span className="sold-pill">সব অর্ডার হয়েছে</span>}
    </div>
  );
}

function LiveProductCard({
  product,
  onOpen,
  onAddToCart,
  onBuyNow,
}: {
  product: LiveProduct;
  onOpen: (product: LiveProduct) => void;
  onAddToCart: (product: LiveProduct) => void;
  onBuyNow: (product: LiveProduct) => void;
}) {
  const disabled = product.available_inventory <= 0;

  return (
    <article className="live-product-card" onClick={() => onOpen(product)}>
      <div className="product-img-wrap">
        <img src={productImage(product)} alt={product.name} className="product-img" />
        {disabled && <div className="stock-overlay">স্টক শেষ</div>}
      </div>

      <div className="product-body">
        <p className="product-sku">SKU: {product.sku}</p>
        <h3>{product.name}</h3>
        <p className="product-price">{formatTaka(product.selling_price)}</p>
        <StockLine product={product} />

        <div className="card-actions">
          <button
            type="button"
            disabled={disabled}
            className="buy-now-btn"
            onClick={(e) => { e.stopPropagation(); onBuyNow(product); }}
          >
            এখনই কিনুন
          </button>
          <button
            type="button"
            disabled={disabled}
            className="cart-btn"
            onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
          >
            কার্টে রাখুন
          </button>
        </div>
      </div>
    </article>
  );
}

function FeaturedNow({
  product,
  onOpen,
  onAddToCart,
  onBuyNow,
}: {
  product: LiveProduct;
  onOpen: (product: LiveProduct) => void;
  onAddToCart: (product: LiveProduct) => void;
  onBuyNow: (product: LiveProduct) => void;
}) {
  const disabled = product.available_inventory <= 0;

  return (
    <section className="featured-now" onClick={() => onOpen(product)}>
      <div className="featured-label">এখন লাইভে দেখানো হচ্ছে</div>
      <div className="featured-content">
        <div className="featured-image-box">
          <img src={productImage(product)} alt={product.name} className="featured-image" />
        </div>
        <div className="featured-info">
          <p className="product-sku">SKU: {product.sku}</p>
          <h2>{product.name}</h2>
          <p className="featured-price">{formatTaka(product.selling_price)}</p>
          <StockLine product={product} />
          <div className="featured-actions">
            <button
              type="button"
              disabled={disabled}
              className="buy-now-btn large"
              onClick={(e) => { e.stopPropagation(); onBuyNow(product); }}
            >
              এখনই কিনুন
            </button>
            <button
              type="button"
              disabled={disabled}
              className="cart-btn large"
              onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
            >
              কার্টে রাখুন
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LiveProductsFeedPage() {
  const router = useRouter();
  const { cart, addToCart } = useCart();
  const [feed, setFeed] = useState<LiveFeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyProductId, setBusyProductId] = useState<number | null>(null);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0), [cart]);

  const fetchFeed = useCallback(async (isInitial = false) => {
    try {
      const data = await liveProductService.getFeed();
      setFeed(data);
      setError(null);
    } catch (err: any) {
      setError('লাইভ পণ্যগুলো আনতে সমস্যা হচ্ছে। একটু পরে আবার চেষ্টা করুন।');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed(true);
    const timer = window.setInterval(() => fetchFeed(false), POLL_MS);
    return () => window.clearInterval(timer);
  }, [fetchFeed]);

  const openProduct = (product: LiveProduct) => {
    router.push(`/e-commerce/product/${product.product_id}`);
  };

  const addOneToCart = async (product: LiveProduct, goCheckout = false) => {
    try {
      setBusyProductId(product.product_id);
      await addToCart(product.product_id, 1);
      setNotice(goCheckout ? null : 'পণ্যটি কার্টে যোগ হয়েছে।');
      if (goCheckout) router.push('/e-commerce/checkout');
    } catch (err: any) {
      setNotice(err?.message || 'কার্টে যোগ করা যায়নি।');
    } finally {
      setBusyProductId(null);
      window.setTimeout(() => setNotice(null), 2500);
    }
  };

  const products = feed?.products || [];
  const featured = feed?.displaying_now || null;

  return (
    <main className="live-feed-page">
      <style>{`
        .live-feed-page {
          min-height: 100vh;
          color: #2a1713;
          background:
            radial-gradient(circle at 12px 12px, rgba(114, 24, 37, 0.10) 2px, transparent 3px),
            radial-gradient(circle at 36px 36px, rgba(20, 59, 92, 0.10) 2px, transparent 3px),
            linear-gradient(135deg, rgba(255, 248, 229, 0.98), rgba(252, 239, 215, 0.98));
          background-size: 48px 48px, 48px 48px, auto;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Noto Sans Bengali', 'Segoe UI', sans-serif;
          font-size: 18px;
        }
        .live-topbar {
          position: sticky;
          top: 0;
          z-index: 40;
          border-bottom: 2px solid rgba(114, 24, 37, 0.25);
          background: rgba(255, 248, 229, 0.96);
          backdrop-filter: blur(10px);
        }
        .live-topbar-inner {
          max-width: 1180px;
          margin: 0 auto;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }
        .brand-title {
          font-size: 24px;
          line-height: 1.2;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: #721825;
        }
        .brand-subtitle {
          font-size: 14px;
          color: #6d5148;
          margin-top: 3px;
        }
        .go-cart-btn {
          border: 0;
          border-radius: 999px;
          background: #721825;
          color: #fff7e7;
          padding: 12px 18px;
          font-size: 17px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 8px 18px rgba(114, 24, 37, 0.22);
        }
        .live-container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 22px 18px 46px;
        }
        .hero-box {
          border: 2px solid rgba(114, 24, 37, 0.22);
          border-radius: 24px;
          padding: 22px;
          background:
            linear-gradient(90deg, rgba(114, 24, 37, 0.08), rgba(20, 59, 92, 0.06)),
            rgba(255, 252, 242, 0.88);
          margin-bottom: 18px;
        }
        .hero-box h1 {
          margin: 0;
          font-size: clamp(28px, 5vw, 46px);
          line-height: 1.12;
          color: #5a1420;
          letter-spacing: -0.04em;
        }
        .hero-box p {
          margin: 10px 0 0;
          color: #61453d;
          font-size: 18px;
          line-height: 1.7;
          max-width: 760px;
        }
        .notice {
          position: fixed;
          left: 50%;
          bottom: 22px;
          transform: translateX(-50%);
          z-index: 60;
          background: #143b5c;
          color: white;
          border-radius: 999px;
          padding: 12px 18px;
          font-weight: 800;
          box-shadow: 0 12px 30px rgba(0,0,0,0.18);
        }
        .not-live-box,
        .loading-box {
          min-height: 62vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 28px;
        }
        .message-card {
          width: min(620px, 100%);
          background: rgba(255, 252, 242, 0.94);
          border: 2px solid rgba(114, 24, 37, 0.22);
          border-radius: 28px;
          padding: 34px 22px;
        }
        .message-card h1 {
          margin: 0 0 12px;
          color: #721825;
          font-size: clamp(30px, 7vw, 54px);
          line-height: 1.1;
        }
        .message-card p {
          margin: 0;
          color: #65473e;
          font-size: 19px;
          line-height: 1.7;
        }
        .featured-shell { min-height: 240px; margin-bottom: 24px; }
        .featured-now {
          cursor: pointer;
          border: 3px solid #721825;
          border-radius: 28px;
          background:
            repeating-linear-gradient(45deg, rgba(114, 24, 37, 0.055) 0 10px, rgba(20, 59, 92, 0.045) 10px 20px),
            #fffaf0;
          overflow: hidden;
          box-shadow: 0 18px 42px rgba(83, 33, 24, 0.15);
        }
        .featured-label {
          background: #721825;
          color: #fff7e7;
          padding: 11px 18px;
          font-size: 18px;
          font-weight: 900;
        }
        .featured-content {
          display: grid;
          grid-template-columns: minmax(170px, 280px) 1fr;
          gap: 22px;
          padding: 18px;
          align-items: center;
        }
        .featured-image-box {
          aspect-ratio: 1 / 1.15;
          border-radius: 22px;
          overflow: hidden;
          background: #f2e5ce;
          border: 1px solid rgba(114, 24, 37, 0.15);
        }
        .featured-image,
        .product-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          display: block;
        }
        .featured-info h2 {
          margin: 4px 0 8px;
          font-size: clamp(26px, 4vw, 42px);
          line-height: 1.18;
          color: #2a1713;
        }
        .featured-price {
          margin: 0 0 10px;
          color: #721825;
          font-size: 30px;
          font-weight: 900;
        }
        .product-sku {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
          color: #876357;
          letter-spacing: 0.02em;
        }
        .live-stock-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          font-size: 16px;
          color: #4f332c;
          margin-top: 8px;
        }
        .live-stock-row span {
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(114, 24, 37, 0.14);
          border-radius: 999px;
          padding: 6px 10px;
        }
        .sold-pill {
          background: #721825 !important;
          color: white;
          border-color: #721825 !important;
          font-weight: 800;
        }
        .featured-actions,
        .card-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-top: 16px;
        }
        .buy-now-btn,
        .cart-btn {
          border: 0;
          border-radius: 16px;
          font-weight: 900;
          cursor: pointer;
        }
        .buy-now-btn {
          flex: 1.4;
          background: #721825;
          color: #fff7e7;
          padding: 14px 14px;
          font-size: 18px;
        }
        .cart-btn {
          flex: 1;
          background: #143b5c;
          color: white;
          padding: 12px 12px;
          font-size: 16px;
        }
        .buy-now-btn.large { font-size: 22px; padding: 16px 18px; }
        .cart-btn.large { font-size: 18px; padding: 14px 16px; }
        .buy-now-btn:disabled,
        .cart-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .section-title {
          margin: 0 0 14px;
          color: #321b15;
          font-size: 28px;
          font-weight: 900;
        }
        .products-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }
        .live-product-card {
          cursor: pointer;
          border-radius: 22px;
          overflow: hidden;
          background: rgba(255, 252, 242, 0.96);
          border: 1px solid rgba(114, 24, 37, 0.18);
          box-shadow: 0 10px 28px rgba(83, 33, 24, 0.10);
        }
        .product-img-wrap {
          position: relative;
          aspect-ratio: 2 / 2.55;
          background: #f2e5ce;
        }
        .stock-overlay {
          position: absolute;
          inset: 0;
          background: rgba(42, 23, 19, 0.62);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 900;
        }
        .product-body {
          padding: 14px;
        }
        .product-body h3 {
          margin: 5px 0 8px;
          font-size: 19px;
          line-height: 1.32;
          color: #2a1713;
          min-height: 50px;
        }
        .product-price {
          margin: 0;
          font-weight: 900;
          color: #721825;
          font-size: 22px;
        }
        .refresh-line {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #72544a;
          font-size: 14px;
          margin-top: 8px;
        }
        @media (max-width: 980px) {
          .products-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 720px) {
          .live-feed-page { font-size: 17px; }
          .live-topbar-inner { padding: 12px 14px; }
          .brand-title { font-size: 21px; }
          .brand-subtitle { display: none; }
          .go-cart-btn { font-size: 15px; padding: 11px 14px; }
          .live-container { padding: 16px 12px 34px; }
          .hero-box { padding: 18px; border-radius: 20px; }
          .featured-content { grid-template-columns: 120px 1fr; gap: 12px; padding: 12px; }
          .featured-info h2 { font-size: 24px; }
          .featured-price { font-size: 24px; }
          .featured-actions, .card-actions { flex-direction: column; align-items: stretch; }
          .products-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .product-body { padding: 12px; }
          .product-body h3 { font-size: 17px; min-height: 44px; }
          .product-price { font-size: 20px; }
          .buy-now-btn { font-size: 17px; }
          .cart-btn { font-size: 15px; }
        }
      `}</style>

      <header className="live-topbar">
        <div className="live-topbar-inner">
          <div>
            <div className="brand-title">দেশীয় Live Collection</div>
            <div className="brand-subtitle">লাইভে দেখানো পণ্যগুলো এখানে একসাথে দেখুন</div>
          </div>
          <button type="button" className="go-cart-btn" onClick={() => router.push('/e-commerce/checkout')}>
            <ShoppingCart className="w-5 h-5" /> কার্টে যান {cartCount > 0 ? `(${cartCount.toLocaleString('bn-BD')})` : ''}
          </button>
        </div>
      </header>

      {loading ? (
        <div className="loading-box">
          <div className="message-card">
            <RefreshCw className="w-10 h-10 mx-auto mb-4 animate-spin" />
            <h1>লোড হচ্ছে...</h1>
            <p>লাইভ পণ্যের তালিকা আনা হচ্ছে।</p>
          </div>
        </div>
      ) : !feed?.is_live ? (
        <div className="not-live-box">
          <div className="message-card">
            <h1>এখনও Live শুরু হয়নি</h1>
            <p>Ekhono Live Shuru Hoini</p>
          </div>
        </div>
      ) : (
        <div className="live-container">
          <section className="hero-box">
            <h1>লাইভের পছন্দের পণ্য এখন সরাসরি কিনুন</h1>
            <p>লাইভে যে পণ্যটি ভালো লাগে, এখানে ছবি দেখে পছন্দ করুন। “এখনই কিনুন” চাপলে সরাসরি চেকআউটে যেতে পারবেন।</p>
            {error && <p style={{ color: '#721825', fontWeight: 800 }}>{error}</p>}
            <div className="refresh-line"><RefreshCw className="w-4 h-4" /> পেজ নিজে নিজে আপডেট হচ্ছে, রিলোড করার দরকার নেই।</div>
          </section>

          <div className="featured-shell">
            {featured && feed.displaying_now_enabled && (
              <FeaturedNow
                product={featured}
                onOpen={openProduct}
                onAddToCart={(product) => addOneToCart(product, false)}
                onBuyNow={(product) => addOneToCart(product, true)}
              />
            )}
          </div>

          <h2 className="section-title">লাইভের সব পণ্য</h2>
          <section className="products-grid">
            {products.map((product) => (
              <LiveProductCard
                key={product.product_id}
                product={product}
                onOpen={openProduct}
                onAddToCart={(item) => addOneToCart(item, false)}
                onBuyNow={(item) => addOneToCart(item, true)}
              />
            ))}
          </section>

          {products.length === 0 && (
            <div className="message-card" style={{ margin: '30px auto' }}>
              <h1>পণ্য যোগ করা হয়নি</h1>
              <p>অ্যাডমিন লাইভ পণ্য যোগ করলে এখানে দেখা যাবে।</p>
            </div>
          )}
        </div>
      )}

      {notice && <div className="notice">{busyProductId ? 'কার্টে যোগ হচ্ছে...' : notice}</div>}
    </main>
  );
}

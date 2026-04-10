'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import catalogService, { SimpleProduct } from '@/services/catalogService';
import { buildCardProductsFromResponse } from '@/lib/ecommerceCardUtils';
import PremiumProductCard from '@/components/ecommerce/ui/PremiumProductCard';

/**
 * 7.3 — "New Arrivals" Strip: Auto-Scroll Ticker
 * A horizontal auto-scrolling strip of new arrival cards.
 * Infinite loop using CSS @keyframes ticker.
 */
export default function NewArrivalsTicker() {
  const router = useRouter();
  const [products, setProducts] = useState<SimpleProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const fetchNewArrivals = async () => {
      try {
        const response = await catalogService.getProducts({
          page: 1,
          per_page: 12, // Enough for a smooth loop
          sort_by: 'newest',
          new_arrivals: true,
        });
        const cards = buildCardProductsFromResponse(response);
        setProducts(cards);
      } catch (error) {
        console.error('Error fetching arrivals for ticker:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNewArrivals();
  }, []);

  if (isLoading || products.length === 0) return null;

  // Duplicate products to create seamless loop
  const displayProducts = [...products, ...products];

  return (
    <div className="ec-ticker-container bg-[var(--bg-surface)] border-y border-[var(--border-default)] py-4">
      <div
        className={`ec-ticker-track ${isPaused ? 'paused' : ''}`}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setTimeout(() => setIsPaused(false), 2000)}
      >
        {displayProducts.map((product, idx) => (
          <div key={`${product.id}-${idx}`} className="inline-flex items-center mx-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mr-3" style={{ fontFamily: "'DM Mono', monospace" }}>New Arrival</span>
            <span className="text-[14px] font-medium text-[var(--text-secondary)] uppercase tracking-tight" style={{ fontFamily: "'Jost', sans-serif" }}>{product.name}</span>
            <span className="ml-6 text-[var(--cyan)]">●</span>
          </div>
        ))}
      </div>
    </div>
  );
}


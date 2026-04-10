'use client';

import React from 'react';
import Image from 'next/image';
import { Heart, ArrowRight } from 'lucide-react';
import { SimpleProduct } from '@/services/catalogService';
import { getAdditionalVariantCount, getCardPriceText, getCardStockLabel, getVariantListForCard } from '@/lib/ecommerceCardUtils';
import { wishlistUtils } from '@/lib/wishlistUtils';
import { usePromotion } from '@/contexts/PromotionContext';

interface PremiumProductCardProps {
  product: SimpleProduct;
  imageErrored?: boolean;
  onImageError?: (id: number) => void;
  onOpen: (product: SimpleProduct) => void;
  onAddToCart: (product: SimpleProduct, e: React.MouseEvent) => void | Promise<void>;
  compact?: boolean;
  animDelay?: number;
}

const PremiumProductCard: React.FC<PremiumProductCardProps> = ({
  product, imageErrored = false, onImageError, onOpen, onAddToCart, compact = false, animDelay = 0,
}) => {
  const { getApplicablePromotion } = usePromotion();
  const [isInWishlist, setIsInWishlist] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isHeartBeating, setIsHeartBeating] = React.useState(false);

  React.useEffect(() => {
    const updateWishlistStatus = () => {
      setIsInWishlist(wishlistUtils.isInWishlist(product.id));
    };
    updateWishlistStatus();
    window.addEventListener('wishlist-updated', updateWishlistStatus);
    return () => window.removeEventListener('wishlist-updated', updateWishlistStatus);
  }, [product.id]);

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsHeartBeating(true);
    setTimeout(() => setIsHeartBeating(false), 300);

    if (isInWishlist) {
      wishlistUtils.remove(product.id);
    } else {
      wishlistUtils.add({
        id: product.id,
        name: product.name,
        image: product.images?.[0]?.url || '/placeholder-product.png',
        price: Number(product.selling_price ?? 0),
        sku: product.sku || '',
      });
    }
  };

  // 2.3 — Urgency Signals
  const stock = Number(product.stock_quantity || 0);
  const isLowStock = stock > 0 && stock <= 5;

  // Stable pseudo-random sold count
  const fakeSold = React.useMemo(() => (product.id % 47) + 12, [product.id]);

  // New arrival check (within 14 days)
  const isNew = React.useMemo(() => {
    const createdAt = (product as any).created_at;
    if (!createdAt) return false;
    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 14;
  }, [product]);

  const primaryImage = product.images?.[0]?.url || '';
  const shouldFallback = imageErrored || !primaryImage;
  const imageUrl = shouldFallback ? '/images/placeholder-product.jpg' : primaryImage;
  const extraVariants = getAdditionalVariantCount(product);
  const stockLabel = getCardStockLabel(product);
  const hasStock = stockLabel !== 'Out of Stock';
  const categoryName = typeof product.category === 'object' && product.category ? product.category.name : '';

  // Promotion / SALE badge
  const categoryId = typeof product.category === 'object' && product.category ? (product.category as { id?: number }).id ?? null : null;
  const salePromo = getApplicablePromotion(product.id, categoryId);
  const salePercent = salePromo?.discount_value ?? 0;
  const originalPrice = Number(product.selling_price ?? 0);
  const salePrice = salePromo ? Math.max(0, originalPrice - (originalPrice * salePercent) / 100) : null;

  // 4.4 — Price Range Display
  const variants = React.useMemo(() => getVariantListForCard(product), [product]);
  const prices = variants.map(v => Number(v.selling_price || 0)).filter(p => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : originalPrice;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : minPrice;
  const hasPriceRange = minPrice !== maxPrice;

  return (
    <article
      onClick={() => onOpen(product)}
      className="group relative flex flex-col overflow-hidden rounded-[var(--radius-md)] 
        bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-[var(--shadow-card)]
        transition-all duration-[220ms] ease-[var(--ease-smooth)]
        hover:-translate-y-[3px] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-lifted)]
        ec-anim-fade-up"
      style={{
        animationDelay: `${animDelay}ms`,
        animationFillMode: 'both'
      }}
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] bg-[var(--bg-depth)] overflow-hidden">
        {/* Loading Shimmer */}
        {!isLoaded && !imageErrored && (
          <div className="absolute inset-0 z-[1] animate-shimmer" />
        )}

        <Image
          src={imageUrl}
          alt={product.display_name || product.base_name || product.name}
          fill
          className={`object-cover object-top transition-all duration-700 group-hover:scale-[1.06] ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
          onError={shouldFallback || !onImageError ? undefined : () => onImageError(product.id)}
        />

        {/* Badges (top-left stacking) */}
        <div className="absolute top-[10px] left-[10px] flex flex-col gap-1 z-10">
          {isNew && (
            <span className="ec-badge-live text-[11px] px-2 py-0.5 font-medium">
              New
            </span>
          )}
          {salePromo && salePercent > 0 && (
            <span className="ec-badge-urgent text-[11px] px-2.5 py-1 font-bold tracking-wider">
              {salePercent}% OFF
            </span>
          )}
          {isLowStock && (
            <span className="bg-[rgba(224,82,82,0.12)] border border-[rgba(224,82,82,0.28)] text-[#e88] rounded-[var(--radius-pill)] text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
              🔥 ONLY {stock} LEFT
            </span>
          )}
        </div>

        {/* Wishlist Heart */}
        <div className="absolute right-[10px] top-[10px] z-10 sm:opacity-0 sm:scale-90 transition-all duration-300 sm:group-hover:opacity-100 sm:group-hover:scale-100">
          <button
            onClick={handleToggleWishlist}
            className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-all border ${isInWishlist
              ? 'bg-[var(--bg-lifted)] border-[var(--gold-border)] text-[var(--gold)]'
              : 'bg-[var(--bg-surface-2)] border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              } ${isHeartBeating ? 'animate-heart-beat' : ''}`}
          >
            <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-[var(--gold)]' : ''}`} />
          </button>
        </div>

        {/* Variant Count Pill — Desktop Only */}
        {extraVariants > 0 && (
          <span className="absolute bottom-2 right-2 text-[11px] font-mono 
            bg-[rgba(17,18,16,0.72)] backdrop-blur-md px-2 py-0.5 rounded-[var(--radius-sm)]
            text-[var(--ivory-muted)] z-10 hidden sm:block">+{extraVariants} sizes</span>
        )}

        {/* Action Bar — Desktop Hover */}
        <div className="absolute bottom-0 inset-x-0 h-[56px] 
            bg-gradient-to-t from-[var(--bg-depth)] to-transparent
            flex items-end pb-3 px-3
            translate-y-full group-hover:translate-y-0
            transition-transform duration-[320ms] ease-[var(--ease-smooth)]
            hidden sm:flex">
          <button
            onClick={e => { e.stopPropagation(); onOpen(product); }}
            className="ec-btn-primary w-full text-[13px] h-[40px]"
          >
            Choose Options
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-3">
        {categoryName && (
          <p className="text-[11px] uppercase tracking-[0.08em] font-mono text-[var(--text-muted)]">
            {categoryName}
          </p>
        )}
        <h3 className="text-[14px] md:text-[16px] font-[Cormorant_Garamond] 
          text-[var(--text-primary)] line-clamp-2 leading-snug font-medium min-h-[2.5rem] group-hover:text-[var(--cyan)] transition-colors">
          {product.display_name || product.base_name || product.name}
        </h3>

        {/* Price Row */}
        <div className="flex items-center justify-between mt-1 pt-3 border-t border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            {salePromo && salePrice !== null ? (
              <>
                <span className="text-[16px] font-bold text-[var(--gold)]" style={{ fontFamily: "'Jost', sans-serif" }}>
                  ৳{salePrice.toFixed(0)}
                </span>
                <span className="text-[12px] line-through text-[var(--text-muted)] font-mono" style={{ fontFamily: "'Jost', sans-serif" }}>
                  ৳{originalPrice.toFixed(0)}
                </span>
              </>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-[16px] font-bold text-[var(--gold)]" style={{ fontFamily: "'Jost', sans-serif" }}>
                  ৳{minPrice.toLocaleString()}
                </span>
                {hasPriceRange && (
                  <span className="text-[12px] text-[var(--text-secondary)] font-medium" style={{ fontFamily: "'Jost', sans-serif" }}>
                    – ৳{maxPrice.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="h-7 w-7 flex items-center justify-center rounded-full bg-[var(--bg-surface-2)] text-[var(--text-muted)] group-hover:bg-[var(--cyan)] group-hover:text-[var(--text-on-accent)] transition-all">
            <ArrowRight size={14} />
          </div>
        </div>
      </div>


    </article>
  );
};


export default PremiumProductCard;

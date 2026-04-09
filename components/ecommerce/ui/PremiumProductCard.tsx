'use client';

import React from 'react';
import Image from 'next/image';
import { Heart, ArrowRight } from 'lucide-react';
import { SimpleProduct } from '@/services/catalogService';
import { getAdditionalVariantCount, getCardPriceText, getCardStockLabel } from '@/lib/ecommerceCardUtils';
import { wishlistUtils } from '@/lib/wishlistUtils';
import { usePromotion } from '@/contexts/PromotionContext';

interface PremiumProductCardProps {
  product: SimpleProduct;
  imageErrored?: boolean;
  onImageError?: (id: number) => void;
  onOpen: (product: SimpleProduct) => void;
  onAddToCart: (product: SimpleProduct, e: React.MouseEvent) => void | Promise<void>;
  compact?: boolean;
}

const PremiumProductCard: React.FC<PremiumProductCardProps> = ({
  product, imageErrored = false, onImageError, onOpen, onAddToCart, compact = false,
}) => {
  const { getApplicablePromotion } = usePromotion();
  const [isInWishlist, setIsInWishlist] = React.useState(false);

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

  const primaryImage   = product.images?.[0]?.url || '';
  const shouldFallback = imageErrored || !primaryImage;
  const imageUrl       = shouldFallback ? '/images/placeholder-product.jpg' : primaryImage;
  const extraVariants  = getAdditionalVariantCount(product);
  const stockLabel     = getCardStockLabel(product);
  const hasStock       = stockLabel !== 'Out of Stock';
  const categoryName   = typeof product.category === 'object' && product.category ? product.category.name : '';

  // Promotion / SALE badge
  const categoryId   = typeof product.category === 'object' && product.category ? (product.category as { id?: number }).id ?? null : null;
  const salePromo    = getApplicablePromotion(product.id, categoryId);
  const salePercent  = salePromo?.discount_value ?? 0;
  const originalPrice = Number(product.selling_price ?? 0);
  const salePrice     = salePromo ? Math.max(0, originalPrice - (originalPrice * salePercent) / 100) : null;

  return (
    <article
      onClick={() => onOpen(product)}
      className="bg-white group cursor-pointer overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
      style={{ borderRadius: '24px' }}
    >
      {/* Image */}
      <div className="relative overflow-hidden aspect-[3/4] bg-[#f9f9f9]">
        <Image
          src={imageUrl}
          alt={product.display_name || product.base_name || product.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          onError={shouldFallback || !onImageError ? undefined : () => onImageError(product.id)}
        />

        {/* Wishlist toggle - always visible on mobile for quick access */}
        <div className="absolute right-3 top-3 z-10 sm:opacity-0 sm:scale-90 sm:group-hover:opacity-100 sm:group-hover:scale-100 transition-all duration-300">
          <button
            onClick={handleToggleWishlist}
            className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-all border ${
              isInWishlist 
                ? 'bg-black border-black text-white' 
                : 'bg-white/80 border-gray-100 text-black/40 hover:text-black hover:bg-white'
            }`}
          >
            <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* SALE badge */}
        {salePromo && (
          <div className="absolute top-3 left-3 z-10">
            <span
              className="bg-black text-white px-3 py-1 rounded-lg text-[9px] font-bold tracking-widest uppercase"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              {salePercent}% OFF
            </span>
          </div>
        )}

        {/* Variant count */}
        {extraVariants > 0 && (
          <div className="absolute left-3 bottom-3 z-10 transition-transform sm:group-hover:-translate-y-14">
            <span className="rounded-full px-3 py-1 text-[9px] font-bold text-black border border-black/5 bg-white/90 backdrop-blur-sm tracking-wider"
                  style={{ fontFamily: "'DM Mono', monospace" }}>
              +{extraVariants} variants
            </span>
          </div>
        )}

        {/* Slide-up action bar */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-y-0 hidden sm:block">
          <div className="p-3">
            <button
              onClick={e => {
                e.stopPropagation();
                onOpen(product);
              }}
              className="w-full rounded-xl py-3.5 text-[11px] font-bold text-white bg-black transition-all active:scale-95 shadow-xl uppercase tracking-widest"
              style={{ fontFamily: "'Jost', sans-serif" }}
            >
              Choose Options
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className={compact ? 'p-4' : 'p-5 sm:p-6'}>
        <div className="flex justify-between items-start gap-2 mb-2">
          {categoryName ? (
            <p className="truncate text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400"
               style={{ fontFamily: "'DM Mono', monospace" }}>
              {categoryName}
            </p>
          ) : <div />}
          {hasStock && (
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-500 uppercase tracking-widest" style={{ fontFamily: "'DM Mono', monospace" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden xs:inline">In Stock</span>
            </span>
          )}
        </div>
        
        <h3 className="line-clamp-2 font-medium leading-snug group-hover:text-black transition-colors"
            style={{ 
              fontFamily: "'Cormorant Garamond', serif", 
              fontSize: compact ? '16px' : '18px', 
              color: '#111', 
              minHeight: compact ? '2.5rem' : '3rem' 
            }}>
          {product.display_name || product.base_name || product.name}
        </h3>
        
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-4">
          {salePromo && salePrice !== null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-black" style={{ fontFamily: "'Jost', sans-serif" }}>
                ৳{salePrice.toFixed(0)}
              </span>
              <span className="text-xs line-through text-gray-300" style={{ fontFamily: "'Jost', sans-serif" }}>
                ৳{originalPrice.toFixed(0)}
              </span>
            </div>
          ) : (
            <span className="text-lg font-bold text-black" style={{ fontFamily: "'Jost', sans-serif" }}>
              {getCardPriceText(product)}
            </span>
          )}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400 group-hover:bg-black group-hover:text-white transition-all duration-300">
            <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </article>
  );
};

export default PremiumProductCard;

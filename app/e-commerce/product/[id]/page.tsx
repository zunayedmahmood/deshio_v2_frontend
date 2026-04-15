'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Heart,
  Share2,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

import PremiumProductCard from '@/components/ecommerce/ui/PremiumProductCard';
import { usePromotion } from '@/contexts/PromotionContext';


import { useCart } from '@/app/e-commerce/CartContext';
import Navigation from '@/components/ecommerce/Navigation';
import { getBaseProductName, getColorLabel, getSizeLabel } from '@/lib/productNameUtils';
import { adaptCatalogGroupedProducts, groupProductsByMother } from '@/lib/ecommerceProductGrouping';
import CartSidebar from '@/components/ecommerce/cart/CartSidebar';
import catalogService, {
  Product,
  ProductCategory,
  ProductDetailResponse,
  SimpleProduct,
  ProductImage
} from '@/services/catalogService';
import cartService from '@/services/cartService';
import { wishlistUtils } from '@/lib/wishlistUtils';
import ProductImageGallery from '@/components/ecommerce/ProductImageGallery';
import VariantSelector from '@/components/ecommerce/VariantSelector';
import StickyAddToCart from '@/components/ecommerce/StickyAddToCart';

// Types for product variations
export interface ProductVariant {
  id: number;
  name: string;
  sku: string;
  color?: string;
  size?: string;
  variation_suffix?: string | null;
  option_label?: string;
  selling_price: number | null; // ✅ allow null safely
  in_stock: boolean;
  stock_quantity: number | null;
  available_inventory: number | null; // ✅ from reserved_products — drives button & badge
  images: ProductImage[] | null; // ✅ allow null safely
}

const normalizeVariantText = (value: any): string =>
  String(value ?? '')
    .trim()
    .replace(/[‐‑‒–—−﹘﹣－]/g, '-')
    .replace(/\s+/g, ' ');

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const parseMarketSizePairs = (value: string): string[] => {
  const text = normalizeVariantText(value)
    .replace(/[|,;/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return [];

  const pairs: string[] = [];
  const seen = new Set<string>();
  const re = /(US|EU|UK|BD|CM|MM)\s*[:\-]?\s*(\d{1,3}(?:\.\d+)?)/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const market = String(match[1] || '').toUpperCase();
    const size = String(match[2] || '').trim();
    if (!market || !size) continue;

    const key = `${market}-${size}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push(`${market} ${size}`);
  }

  // Helpful fallback for values like "40 US 7" where EU is implied.
  if (pairs.length > 0) {
    const hasUS = pairs.some((p) => p.startsWith('US '));
    const hasEU = pairs.some((p) => p.startsWith('EU '));

    if (hasUS && !hasEU) {
      const twoDigit = text.match(/\b(3\d|4\d|5\d|60)\b/);
      if (twoDigit && !seen.has(`EU-${twoDigit[1]}`)) {
        pairs.unshift(`EU ${twoDigit[1]}`);
      }
    }
  }

  return pairs;
};

const normalizeSizeDescriptor = (value: string): string | undefined => {
  const text = normalizeVariantText(value);
  if (!text) return undefined;

  const pairs = parseMarketSizePairs(text);
  if (pairs.length > 0) {
    return Array.from(new Set(pairs)).join(' / ');
  }

  return undefined;
};

const SIZE_WORD_TOKENS = new Set([
  'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL',
  'FREE SIZE', 'FREESIZE', 'ONE SIZE', 'ONESIZE',
]);

const isLikelySizeToken = (token: string): boolean => {
  const t = normalizeVariantText(token).toUpperCase();
  if (!t) return false;
  if (SIZE_WORD_TOKENS.has(t)) return true;

  if (parseMarketSizePairs(t).length > 0) return true;

  if (/^\d{1,3}$/.test(t)) {
    const n = Number(t);
    // shoes/apparel size ranges + compact single digit sizes.
    return (n >= 1 && n <= 15) || (n >= 20 && n <= 60);
  }

  if (/^\d{1,3}(US|EU|UK|BD|CM|MM)$/i.test(t)) return true;

  return /^(US|EU|UK|BD|CM|MM)\s*\d{1,3}(?:\.\d+)?$/i.test(t);
};

const MARKET_SIZE_TOKENS = new Set(['US', 'EU', 'UK', 'BD', 'CM', 'MM']);
const NON_COLOR_TOKENS = new Set(['NA', 'N/A', 'NOT', 'APPLICABLE', 'NOT APPLICABLE']);

const isNumericToken = (value: string): boolean => /^\d{1,3}(?:\.\d+)?$/.test(normalizeVariantText(value));

const prettifyToken = (token: string): string => {
  const t = normalizeVariantText(token).replace(/_/g, ' ');
  if (!t) return '';
  const up = t.toUpperCase();
  if (MARKET_SIZE_TOKENS.has(up) || NON_COLOR_TOKENS.has(up)) return up;
  if (isNumericToken(t)) return t;
  return t
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

const normalizeColorToken = (token: string): string => {
  const up = normalizeVariantText(token).toUpperCase();
  if (NON_COLOR_TOKENS.has(up)) return '';
  return prettifyToken(token);
};

const parseVariationSuffix = (suffix?: string | null): { color?: string; size?: string; label?: string } => {
  const raw = normalizeVariantText(suffix || '');
  if (!raw) return {};

  const marketPairsFromRaw = parseMarketSizePairs(raw);
  const trimmed = raw.startsWith('-') ? raw.slice(1) : raw;
  const tokens = trimmed.split('-').map((t) => normalizeVariantText(t)).filter(Boolean);
  if (!tokens.length) {
    const sizeOnly = normalizeSizeDescriptor(raw);
    return sizeOnly
      ? { size: sizeOnly, label: sizeOnly }
      : {};
  }

  const usedAsSize = new Set<number>();
  const sizeParts: string[] = [];

  // First pass: explicit market-size pairs (e.g., US-7, EU-40)
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const current = tokens[i];
    const next = tokens[i + 1];
    const currentUp = current.toUpperCase();
    const nextIsNumeric = isNumericToken(next);

    if (MARKET_SIZE_TOKENS.has(currentUp) && nextIsNumeric) {
      sizeParts.push(`${currentUp} ${next}`);
      usedAsSize.add(i);
      usedAsSize.add(i + 1);
      i += 1;
      continue;
    }

    // Pattern like 40-US-7 should preserve 40 and only pair US-7.
    const nextUp = next.toUpperCase();
    const hasTrailingNumeric = i + 2 < tokens.length && isNumericToken(tokens[i + 2]);
    if (isNumericToken(current) && MARKET_SIZE_TOKENS.has(nextUp) && !hasTrailingNumeric) {
      sizeParts.push(`${nextUp} ${current}`);
      usedAsSize.add(i);
      usedAsSize.add(i + 1);
      i += 1;
    }
  }

  // Second pass: leftover tokens that look like size values (e.g., 7, 40, XL)
  for (let i = 0; i < tokens.length; i += 1) {
    if (usedAsSize.has(i)) continue;
    const token = tokens[i];
    if (isLikelySizeToken(token)) {
      // If US size already exists and this is a plain 2-digit number, treat as EU size.
      const hasUS = sizeParts.some((s) => s.startsWith('US '));
      const n = Number(token);
      if (hasUS && /^\d{2}$/.test(token) && n >= 30 && n <= 60) {
        sizeParts.push(`EU ${token}`);
      } else {
        sizeParts.push(prettifyToken(token));
      }
      usedAsSize.add(i);
    }
  }

  // Ensure market-size pairs are never lost for values like "EU 40 US 7"
  // where tokenization may keep them in a single token.
  marketPairsFromRaw.forEach((pair) => sizeParts.push(pair));

  const colorTokens = tokens
    .filter((_, idx) => !usedAsSize.has(idx))
    .map((t) => normalizeColorToken(t))
    .filter(Boolean);

  const color = colorTokens.length ? colorTokens.join(' ') : undefined;
  const dedupedSizeParts = Array.from(new Set(sizeParts.filter(Boolean)));
  const size = dedupedSizeParts.length ? dedupedSizeParts.join(' / ') : undefined;

  const label =
    (color && size && `${color} / ${size}`) ||
    color ||
    size ||
    tokens.map((t) => prettifyToken(t)).filter(Boolean).join(' ');

  return { color, size, label: label || undefined };
};

const deriveVariantMeta = (variant: any, name: string) => {
  const parsed = parseVariationSuffix(variant?.variation_suffix);

  const rawColor = normalizeVariantText(variant?.attributes?.color || variant?.color);
  const rawSize = normalizeVariantText(variant?.attributes?.size || variant?.size);

  const color =
    (rawColor ? normalizeColorToken(rawColor) : '') ||
    parsed.color ||
    getColorLabel(name) ||
    undefined;

  const size =
    (rawSize ? normalizeSizeDescriptor(rawSize) || prettifyToken(rawSize) : '') ||
    parsed.size ||
    normalizeSizeDescriptor(name || '') ||
    getSizeLabel(name) ||
    undefined;

  const variationSuffix = normalizeVariantText(variant?.variation_suffix || '') || null;

  const optionLabel =
    normalizeVariantText(
      variant?.option_label ||
      parsed.label ||
      (variationSuffix ? parseVariationSuffix(variationSuffix).label : '') ||
      [color, size].filter(Boolean).join(' / ')
    ) ||
    undefined;

  return { color, size, variationSuffix, optionLabel };
};

const getVariationDisplayLabel = (variant: ProductVariant, index: number): string => {
  const explicit = normalizeVariantText(variant.option_label || '');
  if (explicit) return explicit;

  const parts = [normalizeVariantText(variant.color || ''), normalizeVariantText(variant.size || '')]
    .filter(Boolean);

  if (parts.length > 0) {
    return parts.join(' / ');
  }

  const fromSuffix = parseVariationSuffix(variant.variation_suffix).label;
  if (fromSuffix) return normalizeVariantText(fromSuffix);

  if (variant.sku) return `SKU ${variant.sku}`;
  return `Option ${index + 1}`;
};

const getCategoryId = (category: Product['category'] | null | undefined): number | undefined => {
  if (!category || typeof category === 'string') return undefined;
  const id = Number(category.id);
  return Number.isFinite(id) ? id : undefined;
};

const getCategoryName = (category: Product['category'] | null | undefined): string | undefined => {
  if (!category) return undefined;
  if (typeof category === 'string') {
    const value = category.trim();
    return value || undefined;
  }

  const value = String(category.name || '').trim();
  return value || undefined;
};

const getCategorySlug = (category: Product['category'] | null | undefined): string | undefined => {
  if (!category) return undefined;
  if (typeof category === 'string') return slugify(category);
  if (category.slug) return category.slug;
  return slugify(category.name);
};


const getNewestKey = (product: SimpleProduct): number => {
  const variantIds = Array.isArray((product as any).variants)
    ? ((product as any).variants as any[]).map((v) => Number(v?.id) || 0)
    : [];
  const selfId = Number(product?.id) || 0;
  return Math.max(selfId, ...variantIds);
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id ? parseInt(params.id as string) : null;

  const { refreshCart } = useCart();
  const { getApplicablePromotion } = usePromotion();

  // State
  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<SimpleProduct[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartSidebarOpen, setCartSidebarOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [cartStatus, setCartStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [liveViewers, setLiveViewers] = useState(0);
  const [isStickyVisible, setIsStickyVisible] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<SimpleProduct[]>([]);
  const mainCtaRef = useRef<HTMLButtonElement>(null);

  // 3.2 — Live Viewers Calculation
  useEffect(() => {
    const updateViewers = () => {
      if (!productId) return;
      const bracket = Math.floor(Date.now() / (1000 * 60 * 5));
      const seed = (parseInt(productId.toString(), 36) + bracket) % 23 + 4;
      setLiveViewers(seed);
    };

    updateViewers();
    const interval = setInterval(updateViewers, 1000 * 60 * 5);
    return () => clearInterval(interval);
  }, [productId]);

  // 3.7 — Recently Viewed Logic
  useEffect(() => {
    if (product) {
      const existingRaw = localStorage.getItem('ec_recently_viewed');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const productSummary: SimpleProduct = {
        id: product.id,
        name: product.name,
        selling_price: Number(selectedVariant?.selling_price || product.selling_price),
        in_stock: product.in_stock,
        stock_quantity: product.stock_quantity,
        images: product.images,
        sku: product.sku
      };

      const filtered = existing.filter((p: any) => p.id !== product.id);
      const updated = [productSummary, ...filtered].slice(0, 8);
      localStorage.setItem('ec_recently_viewed', JSON.stringify(updated));
      setRecentlyViewed(updated.filter(p => p.id !== product.id));
    }
  }, [product, selectedVariant]);

  // Sticky Bar Observer
  useEffect(() => {
    if (!mainCtaRef.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsStickyVisible(!entry.isIntersecting);
    }, { threshold: 0 });

    observer.observe(mainCtaRef.current);
    return () => observer.disconnect();
  }, [loading]);

  // ✅ Safe price formatter (prevents toLocaleString crash)
  const formatBDT = (value: any) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return '৳0.00';
    return `৳${n.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`;
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    const token =
      localStorage.getItem('auth_token') ||
      localStorage.getItem('customer_token') ||
      localStorage.getItem('token');
    return !!token;
  };


  // Fetch product data and variations
  useEffect(() => {
    if (!productId) {
      setError('Invalid product ID');
      setLoading(false);
      return;
    }

    const fetchProductAndVariations = async () => {
      // Prevent redundant loading if the ID is already handled
      if (selectedVariant && selectedVariant.id === productId) return;

      // If the ID exists in our variants list, just switch selection and end early
      const existingMatch = productVariants.find(v => v.id === productId);
      if (existingMatch) {
        setSelectedVariant(existingMatch);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response: ProductDetailResponse = await catalogService.getProduct(productId, { include_availability: false });
        const mainProduct = response.product;

        setProduct(mainProduct);
        setRelatedProducts(response.related_products || []);

        const directVariantsRaw = Array.isArray((mainProduct as any).variants)
          ? (mainProduct as any).variants
          : [];

        const buildVariantFromAny = (variant: any): ProductVariant => {
          const name = variant?.name || '';
          const meta = deriveVariantMeta(variant, name);

          return {
            id: Number(variant?.id),
            name,
            sku: variant?.sku || `product-${variant?.id}`,
            color: meta.color,
            size: meta.size,
            variation_suffix: meta.variationSuffix,
            option_label: meta.optionLabel,
            selling_price: Number(variant?.selling_price ?? variant?.price ?? 0),
            in_stock:
              typeof variant?.in_stock === 'boolean'
                ? variant.in_stock
                : Number(variant?.stock_quantity || 0) > 0,
            stock_quantity: Number(variant?.stock_quantity || 0),
            available_inventory: variant?.available_inventory != null
              ? Number(variant.available_inventory)
              : Number(variant?.stock_quantity || 0),
            images: Array.isArray(variant?.images) ? variant.images : [],
          };
        };

        // Prefer backend-provided grouped variants from single-product endpoint
        if (directVariantsRaw.length > 0) {
          const deduped = new Map<number, ProductVariant>();

          directVariantsRaw.forEach((variant: any) => {
            const normalized = buildVariantFromAny(variant);
            if (!deduped.has(normalized.id)) deduped.set(normalized.id, normalized);
          });

          const currentVariant = buildVariantFromAny(mainProduct);
          if (!deduped.has(currentVariant.id)) deduped.set(currentVariant.id, currentVariant);

          const variations = Array.from(deduped.values()).sort((a, b) => {
            const aColor = (a.color || '').toLowerCase();
            const bColor = (b.color || '').toLowerCase();
            const aSize = (a.size || '').toLowerCase();
            const bSize = (b.size || '').toLowerCase();

            if (aColor !== bColor) return aColor.localeCompare(bColor);
            return aSize.localeCompare(bSize);
          });

          setProductVariants(variations);
          setSelectedVariant(
            variations.find((v) => v.id === productId) ||
            variations.find((v) => v.in_stock) ||
            variations[0] ||
            null
          );

          return;
        }

        const allProductsResponse = await catalogService.getProducts({
          // Pull a wider range so we can find sibling variations even when each variation has a unique SKU.
          per_page: 500,
        });

        setAllProducts(allProductsResponse.products);

        const mainBaseName = getBaseProductName(
          mainProduct.name || '',
          (mainProduct as any).base_name || undefined
        );
        const mainCategoryId = getCategoryId(mainProduct.category);

        const groupedFromApi = Array.isArray(allProductsResponse.grouped_products)
          ? adaptCatalogGroupedProducts(allProductsResponse.grouped_products)
          : [];

        const grouped = groupedFromApi.length > 0
          ? groupedFromApi
          : groupProductsByMother(allProductsResponse.products, {
            // Home sections group by mother name irrespective of category payload shape.
            // Use same behavior on details page so "X options" always matches.
            useCategoryInKey: false,
            preferSkuGrouping: false,
          });

        const selectedGroupById = grouped.find((g) =>
          g.variants.some((v) => Number(v.id) === Number(mainProduct.id))
        );

        const selectedGroupByRule = grouped.find((g) => {
          const sameSku = !!mainProduct.sku && g.variants.some((v) => v.sku === mainProduct.sku);

          const sameBase =
            g.baseName.trim().toLowerCase() === mainBaseName.trim().toLowerCase();

          const sameCategory = mainCategoryId
            ? !g.category?.id || g.category.id === mainCategoryId
            : true;

          return sameSku || (sameBase && sameCategory);
        });

        const selectedGroup = selectedGroupById || selectedGroupByRule;

        const variations: ProductVariant[] = (selectedGroup?.variants || [])
          .map((variant) => {
            const raw = (variant as any).raw || {};
            const meta = deriveVariantMeta(raw, variant.name || raw?.name || '');

            return {
              id: variant.id,
              name: variant.name,
              sku: variant.sku || `product-${variant.id}`,
              color: meta.color || variant.color || getColorLabel(variant.name),
              size: meta.size || variant.size || getSizeLabel(variant.name),
              variation_suffix: meta.variationSuffix || raw?.variation_suffix || null,
              option_label: meta.optionLabel,
              selling_price: variant.price ?? raw.selling_price ?? null,
              in_stock: !!variant.in_stock,
              stock_quantity: variant.stock_quantity ?? raw.stock_quantity ?? 0,
              available_inventory: (variant as any).available_inventory ?? raw.available_inventory ?? variant.stock_quantity ?? raw.stock_quantity ?? 0,
              images: raw.images ?? [],
            } as ProductVariant;
          })
          .sort((a, b) => {
            const aColor = (a.color || '').toLowerCase();
            const bColor = (b.color || '').toLowerCase();
            const aSize = (a.size || '').toLowerCase();
            const bSize = (b.size || '').toLowerCase();

            if (aColor !== bColor) return aColor.localeCompare(bColor);
            return aSize.localeCompare(bSize);
          });

        // ✅ If no variations were found for this SKU, still show the product itself
        if (variations.length === 0) {
          const selfMeta = deriveVariantMeta(mainProduct as any, mainProduct.name);
          const selfVariant: ProductVariant = {
            id: mainProduct.id,
            name: mainProduct.name,
            sku: mainProduct.sku || `product-${mainProduct.id}`,
            color: selfMeta.color || getColorLabel(mainProduct.name),
            size: selfMeta.size || getSizeLabel(mainProduct.name),
            variation_suffix: selfMeta.variationSuffix || (mainProduct as any).variation_suffix || null,
            option_label: selfMeta.optionLabel,
            selling_price: (mainProduct as any).selling_price ?? null,
            in_stock: !!(mainProduct as any).in_stock,
            stock_quantity: (mainProduct as any).stock_quantity ?? 0,
            available_inventory: (mainProduct as any).available_inventory ?? (mainProduct as any).stock_quantity ?? 0,
            images: (mainProduct as any).images ?? [],
          };

          setProductVariants([selfVariant]);
          setSelectedVariant(selfVariant);
          return;
        }

        setProductVariants(variations);

        const currentVariant = variations.find(v => v.id === productId);
        if (currentVariant) {
          setSelectedVariant(currentVariant);
        } else if (variations.length > 0) {
          setSelectedVariant(variations[0]);
        }

      } catch (err: any) {
        console.error('Error fetching product:', err);
        setError(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProductAndVariations();
  }, [productId]);

  const variationChoices = useMemo(() => {
    return productVariants
      .map((variant, index) => ({
        variant,
        label: getVariationDisplayLabel(variant, index),
      }))
      .sort((a, b) => {
        // In-stock first
        if (a.variant.in_stock !== b.variant.in_stock) {
          return a.variant.in_stock ? -1 : 1;
        }

        // Keep same labels grouped
        const lcmp = a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' });
        if (lcmp !== 0) return lcmp;

        return a.variant.id - b.variant.id;
      });
  }, [productVariants]);

  // Listen for wishlist updates
  useEffect(() => {
    const updateWishlistStatus = () => {
      if (selectedVariant) {
        setIsInWishlist(wishlistUtils.isInWishlist(selectedVariant.id));
      }
    };
    updateWishlistStatus();
    window.addEventListener('wishlist-updated', updateWishlistStatus);
    return () => window.removeEventListener('wishlist-updated', updateWishlistStatus);
  }, [selectedVariant]);

  // Handlers
  const handleVariantChange = (variant: ProductVariant) => {
    // 3.8 — Prevent scroll-to-top on variant change
    if (typeof window !== 'undefined') {
      (window as any).__ERRUM_SKIP_SCROLL__ = true;
    }
    setSelectedVariant(variant);
    setSelectedImageIndex(0);
    setQuantity(1);
    // 3.5 — No page reload
    window.history.pushState(null, '', `/e-commerce/product/${variant.id}`);
  };

  const handleToggleWishlist = () => {
    if (!selectedVariant) return;

    if (isInWishlist) {
      wishlistUtils.remove(selectedVariant.id);
    } else {
      wishlistUtils.add({
        id: selectedVariant.id,
        name: selectedVariant.name,
        image: (selectedVariant.images && selectedVariant.images[0]?.url) || '',
        price: Number(selectedVariant.selling_price ?? 0),
        sku: selectedVariant.sku,
      });
    }
  };

  // Add to cart
  const handleAddToCart = async () => {
    if (!selectedVariant || !selectedVariant.in_stock) return;

    const stockQty = Number(selectedVariant.stock_quantity ?? 0);
    const currentAvailable = Number(selectedVariant.available_inventory ?? stockQty);
    if (currentAvailable <= 0) return;

    try {
      setIsAdding(true);
      setCartStatus('loading');

      await cartService.addToCart({
        product_id: selectedVariant.id,
        quantity: quantity,
        variant_options: {
          color: selectedVariant.color,
          size: selectedVariant.size,
        },
        notes: undefined
      });

      await refreshCart();

      setCartStatus('success');
      setTimeout(() => {
        setIsAdding(false);
        setCartStatus('idle');
        setCartSidebarOpen(true);
      }, 2000);

    } catch (error: any) {
      console.error('Error adding to cart:', error);
      setIsAdding(false);

      const errorMessage = error.message || '';
      const displayMessage = errorMessage.includes('Insufficient stock')
        ? errorMessage
        : 'Failed to add item to cart. Please try again.';
      alert(displayMessage);
    }
  };

  const handleBuyItNow = async () => {
    if (!selectedVariant || !selectedVariant.in_stock) return;

    const stockQty = Number(selectedVariant.stock_quantity ?? 0);
    const currentAvailable = Number(selectedVariant.available_inventory ?? stockQty);
    if (currentAvailable <= 0) return;

    try {
      setIsAdding(true);
      const res = await cartService.addToCart({
        product_id: selectedVariant.id,
        quantity: quantity,
        variant_options: {
          color: selectedVariant.color,
          size: selectedVariant.size,
        },
        notes: undefined
      });

      const cartItemId = res?.cart_item?.id;
      if (cartItemId) {
        localStorage.setItem('checkout-selected-items', JSON.stringify([cartItemId]));
        router.push('/e-commerce/checkout');
      } else {
        // Fallback: try to find the item in the cart
        const cartData = await cartService.getCart();
        const addedItem = cartData.cart_items.find(it => it.product_id === selectedVariant.id);
        if (addedItem) {
          localStorage.setItem('checkout-selected-items', JSON.stringify([addedItem.id]));
          router.push('/e-commerce/checkout');
        } else {
          router.push('/e-commerce');
        }
      }
    } catch (error: any) {
      console.error('Error in Buy it Now:', error);
      alert(error.message || 'Failed to process Buy it Now. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleQuickAddToCart = async (item: SimpleProduct, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!item.in_stock) return;

    try {
      const color = getColorLabel(item.name);
      const size = getSizeLabel(item.name);

      await cartService.addToCart({
        product_id: item.id,
        quantity: 1,
        variant_options: { color, size },
        notes: undefined
      });

      await refreshCart();
      setCartSidebarOpen(true);

    } catch (error: any) {
      console.error('Error adding to cart:', error);

      const errorMessage = error.message || '';
      const displayMessage = errorMessage.includes('Insufficient stock')
        ? errorMessage
        : 'Failed to add item to cart. Please try again.';
      alert(displayMessage);
    }
  };



  const handleQuantityChange = (delta: number) => {
    if (!selectedVariant) return;
    const availQty = Number(selectedVariant.available_inventory ?? selectedVariant.stock_quantity ?? 0);
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= availQty) {
      setQuantity(newQuantity);
    }
  };

  const handlePrevImage = () => {
    if (!selectedVariant) return;
    const imgs = Array.isArray(selectedVariant.images) ? selectedVariant.images : [];
    if (imgs.length === 0) return;

    setSelectedImageIndex(prev =>
      prev === 0 ? imgs.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    if (!selectedVariant) return;
    const imgs = Array.isArray(selectedVariant.images) ? selectedVariant.images : [];
    if (imgs.length === 0) return;

    setSelectedImageIndex(prev =>
      prev === imgs.length - 1 ? 0 : prev + 1
    );
  };

  const handleShare = () => {
    if (navigator.share && product) {
      navigator.share({
        title: product.name,
        text: product.short_description || product.description,
        url: window.location.href,
      }).catch(err => console.log('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  // ---------------------------
  // Loading / Error
  // ---------------------------
  if (loading) {
    return (
      <div className="ec-root bg-[var(--bg-root)] min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto border-[var(--cyan)]"></div>
            <p className="mt-4 text-sm text-[var(--text-muted)]">Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product || !selectedVariant) {
    return (
      <div className="ec-root bg-[var(--bg-root)] min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
              Product Not Found
            </h1>
            <p className="mb-6 text-sm text-[var(--text-muted)]">{error}</p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--text-primary)] px-5 py-3 text-xs font-semibold text-[var(--bg-root)] hover:opacity-90 transition"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }
  // ---------------------------
  // Derived safe values
  // ---------------------------
  const baseName = (product as any).base_name || getBaseProductName(product.name);

  const originalSellingPrice = Number(selectedVariant.selling_price ?? 0);
  const costPrice = Number((product as any).cost_price ?? 0);
  
  const categoryId = getCategoryId(product.category);
  const salePromo = getApplicablePromotion(selectedVariant.id, categoryId ?? null);
  const salePercent = salePromo?.discount_value ?? 0;
  const salePrice = salePromo ? Math.max(0, originalSellingPrice - (originalSellingPrice * salePercent) / 100) : null;
  const sellingPrice = salePrice ?? originalSellingPrice;

  const stockQty = Number(selectedVariant.stock_quantity ?? 0);
  // available_inventory = total - reserved. Falls back to stockQty if backend doesn't send it.
  const availableInventory = Number(selectedVariant.available_inventory ?? stockQty);

  const safeImages =
    Array.isArray(selectedVariant.images) && selectedVariant.images.length > 0
      ? selectedVariant.images
      : [{ id: 0, url: '/placeholder-product.png', is_primary: true, alt_text: 'Product' } as any];

  const primaryImage = safeImages[selectedImageIndex]?.url || safeImages[0]?.url;

  const discountPercent = salePromo
    ? salePercent
    : costPrice > sellingPrice && costPrice > 0
      ? Math.round(((costPrice - sellingPrice) / costPrice) * 100)
      : 0;

  const hasMultipleVariants = productVariants.length > 1;
  const selectedVariantIndex = Math.max(
    0,
    productVariants.findIndex((variant) => variant.id === selectedVariant.id)
  );
  const selectedVariationLabel = getVariationDisplayLabel(selectedVariant, selectedVariantIndex);

  // ---------------------------
  // Main render
  // ---------------------------
  return (
    <div className="bg-[var(--bg-root)] min-h-screen text-[var(--text-primary)]">
      <Navigation />
      <CartSidebar isOpen={cartSidebarOpen} onClose={() => setCartSidebarOpen(false)} />

      {/* Breadcrumb */}
      <div className="border-b border-[var(--border-default)]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 hidden sm:block">
          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-medium tracking-[0.1em] text-[var(--text-muted)]"
            style={{ fontFamily: "'DM Mono', monospace" }}>
            <button onClick={() => router.push('/e-commerce')} className="hover:text-[var(--text-primary)] transition-colors">HOME</button>
            <span className="text-[var(--border-strong)]">›</span>
            <button onClick={() => router.back()} className="hover:text-[var(--text-primary)] transition-colors uppercase">
              {getCategoryName(product.category) || 'PRODUCTS'}
            </button>
            <span className="text-[var(--border-strong)]">›</span>
            <span className="text-[var(--text-secondary)] uppercase truncate max-w-xs">{baseName}</span>
          </div>
        </div>
      </div>

      {/* Main product section */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8 sm:pt-28 sm:pb-12 md:pt-16 md:pb-16">
        <div className="grid lg:grid-cols-[6fr_4fr] gap-10 lg:gap-20 items-start">

          {/* 3.1 — Image Gallery */}
          <ProductImageGallery
            images={safeImages}
            productName={baseName}
            discountPercent={discountPercent}
            inStock={selectedVariant.in_stock}
          />

          {/* ── Buy Column ── */}
          <div className="lg:sticky lg:top-24 space-y-8">
            <div className="space-y-6">
              {/* Product Info */}
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--text-muted)] mb-2"
                  style={{ fontFamily: "'DM Mono', monospace" }}>
                  {getCategoryName(product.category) || 'ERRUM COLLECTION'}
                </p>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-[var(--text-primary)] tracking-tight"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {baseName}
                </h1>

                <div className="mt-6 flex flex-wrap items-baseline gap-4">
                  <span className="text-3xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Jost', sans-serif" }}>
                    {formatBDT(sellingPrice)}
                  </span>
                  {(costPrice > sellingPrice || salePromo) && originalSellingPrice > 0 && (
                    <span className="text-xl line-through text-[var(--text-muted)] opacity-60" style={{ fontFamily: "'Jost', sans-serif" }}>
                      {formatBDT(salePromo ? originalSellingPrice : Math.max(costPrice, originalSellingPrice))}
                    </span>
                  )}
                </div>
              </div>

              {/* Urgency & Social Proof */}
              <div className="space-y-4 py-6 border-y border-[var(--border-default)]">
                {/* Live Activity (3.2) */}
                <div className="ec-badge-live px-3 py-2 flex items-center gap-2 w-fit">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-[var(--cyan)] animate-pulse" />
                  <span>{liveViewers} people viewing this right now</span>
                </div>

                {/* Stock Progress Bar (3.3) */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      color: availableInventory <= 5 ? 'var(--status-danger)' : availableInventory <= 10 ? 'var(--gold-bright)' : 'var(--status-success)'
                    }}>
                    <span>
                      {availableInventory <= 0 ? 'Out of stock' :
                        availableInventory <= 5 ? `🔥 Almost gone! Only ${availableInventory} left` :
                          availableInventory <= 10 ? `Selling fast — only ${availableInventory} left` :
                            'In Stock'}
                    </span>
                  </div>
                  <div className="h-[6px] w-full bg-[var(--bg-lifted)] rounded-[var(--radius-pill)] overflow-hidden">
                    <div
                      className={`h-full transition-[width,background-color] duration-700 ease-out rounded-[var(--radius-pill)] ${
                        availableInventory <= 5 ? 'bg-[var(--status-danger)] animate-pulse' :
                        availableInventory <= 10 ? 'bg-[var(--status-warning)]' :
                        'bg-[var(--status-success)]'
                      }`}
                      style={{ width: `${Math.min((availableInventory / 25) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 3.5 — Variant Selector */}
              {hasMultipleVariants && (
                <VariantSelector
                  variants={productVariants}
                  selectedVariant={selectedVariant}
                  onVariantChange={handleVariantChange}
                  baseName={baseName}
                />
              )}

              {/* Quantity + CTAs */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center h-[56px] border border-[var(--border-default)] rounded-2xl overflow-hidden bg-[var(--bg-surface)]">
                    <button onClick={() => handleQuantityChange(-1)} disabled={quantity <= 1}
                      className="px-4 h-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-30">
                      <Minus size={16} />
                    </button>
                    <span className="min-w-[40px] text-center font-bold text-[var(--text-primary)]">{quantity}</span>
                    <button onClick={() => handleQuantityChange(1)} disabled={quantity >= availableInventory}
                      className="px-4 h-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-30">
                      <Plus size={16} />
                    </button>
                  </div>

                  <button
                    ref={mainCtaRef}
                    onClick={handleAddToCart}
                    disabled={!selectedVariant.in_stock || isAdding || availableInventory <= 0}
                    className={`flex-1 h-[56px] rounded-2xl font-bold uppercase tracking-widest text-[10px] sm:text-xs flex items-center justify-center gap-3 transition-all active:scale-95 disabled:bg-[var(--bg-surface-2)] disabled:text-[var(--text-muted)] disabled:shadow-none shadow-[var(--shadow-card)] ${
                      cartStatus === 'success' ? 'bg-[var(--status-success)] text-[var(--text-on-accent)]' : 'ec-btn-primary'
                    }`}
                  >
                    {cartStatus === 'idle' && <ShoppingCart size={18} />}
                    {cartStatus === 'loading' && <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {cartStatus === 'success' && <span>✓ Added!</span>}
                    {cartStatus === 'idle' && (availableInventory <= 0 ? 'SOLD OUT' : 'ADD TO CART')}
                  </button>
                </div>

                <button
                  onClick={handleBuyItNow}
                  disabled={!selectedVariant.in_stock || isAdding || availableInventory <= 0}
                  className="w-full h-[56px] bg-transparent text-[var(--text-primary)] border-2 border-[var(--text-primary)] rounded-2xl font-bold uppercase tracking-widest text-xs transition-all hover:bg-[var(--text-primary)] hover:text-[var(--bg-root)] active:scale-95 disabled:opacity-50"
                >
                  BUY IT NOW
                </button>
              </div>

              {/* Payment Options */}
              <div className="pt-2">
                <img
                  src="/payment_option.png"
                  alt="Payment Options"
                  className="w-full h-auto object-contain"
                />
              </div>

              {/* Accordion Sections */}
              <div className="pt-8 space-y-px border-t border-[var(--border-default)]">
                {[
                  { title: 'Description', content: product.description || product.short_description },
                  { title: 'Additional Information', content: `SKU: ${selectedVariant.sku}\nCategory: ${getCategoryName(product.category)}` }
                ].map((section, idx) => (
                  <details key={idx} className="group py-4 border-b border-[var(--border-default)]">
                    <summary className="flex items-center justify-between cursor-pointer list-none">
                      <span className="text-sm font-bold uppercase tracking-widest text-[var(--text-primary)]" style={{ fontFamily: "'Jost', sans-serif" }}>
                        {section.title}
                      </span>
                      <Plus size={18} className="text-[var(--text-muted)] group-open:rotate-45 transition-transform" />
                    </summary>
                    <div className="mt-4 text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                      {section.content}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 sm:mt-24 py-16 bg-[var(--bg-surface)] border-y border-[var(--border-default)] -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="max-w-[1400px] mx-auto">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text-muted)] mb-2 block">Pairs Well With</span>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 gap-4">
                <h2 className="text-3xl sm:text-4xl font-light text-[var(--text-primary)] tracking-tight"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Related Essentials
                </h2>
                <button
                  onClick={() => {
                    const slug = getCategorySlug(product.category);
                    if (slug) {
                      router.push(`/e-commerce/${slug}`);
                    } else {
                      router.push('/e-commerce/search?category=' + getCategoryId(product.category));
                    }
                  }}
                  className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)] border-b border-[var(--text-primary)] pb-1 hover:opacity-60 transition-all self-start"
                >
                  View Full Collection
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6 sm:gap-8 sm:grid-cols-3 lg:grid-cols-4">
                {relatedProducts.map(item => (
                  <PremiumProductCard
                    key={item.id}
                    product={item}
                    compact
                    onOpen={(p) => router.push(`/e-commerce/product/${p.id}`)}
                    onAddToCart={(p, e) => handleQuickAddToCart(p, e)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3.7 — Recently Viewed Strip */}
        {recentlyViewed.length > 0 && (
          <div className="py-16 bg-[var(--bg-surface)] border-b border-[var(--border-default)] -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="max-w-[1400px] mx-auto">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text-muted)] mb-2 block" style={{ fontFamily: "'DM Mono', monospace" }}>Your History</span>
              <h2 className="text-3xl sm:text-4xl font-light text-[var(--text-primary)] tracking-tight mb-10"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Recently Viewed
              </h2>
              <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide no-scrollbar">
                {recentlyViewed.map(item => (
                  <div key={item.id} className="min-w-[180px] sm:min-w-[220px]">
                    <PremiumProductCard
                      product={item}
                      compact
                      onOpen={(p) => router.push(`/e-commerce/product/${p.id}`)}
                      onAddToCart={(p, e) => handleQuickAddToCart(p, e)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <StickyAddToCart
        isVisible={isStickyVisible}
        productName={selectedVariant.name}
        priceText={formatBDT(sellingPrice)}
        isAdding={isAdding}
        disabled={!selectedVariant.in_stock || availableInventory <= 0}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}

import type { Campaign, PublicPromotion } from '@/services/campaignService';

type PromotionLike = Pick<
  Campaign | PublicPromotion,
  'id' | 'name' | 'type' | 'discount_value' | 'maximum_discount' | 'applicable_products' | 'applicable_categories' | 'is_automatic'
> & { minimum_purchase?: number | null };

export interface PromotionPricingItem {
  productId: number;
  categoryId?: number | null;
  quantity: number;
  unitPrice: number;
  lineDiscountAmount?: number;
}

const ids = (value?: number[] | null) => (value || []).map(Number).filter(Number.isFinite);

export const promotionAppliesToItem = (promotion: PromotionLike, item: PromotionPricingItem) => {
  const productIds = ids(promotion.applicable_products);
  const categoryIds = ids(promotion.applicable_categories);
  if (productIds.length === 0 && categoryIds.length === 0) return true;
  if (productIds.includes(Number(item.productId))) return true;
  return item.categoryId != null && categoryIds.includes(Number(item.categoryId));
};

export const automaticPercentageDiscount = (
  promotions: PromotionLike[],
  item: PromotionPricingItem,
  cartSubtotal = 0,
) => {
  const lineTotal = Math.max(0, Number(item.unitPrice) || 0) * Math.max(1, Number(item.quantity) || 1);
  let best: { amount: number; promotion: PromotionLike } | null = null;

  for (const promotion of promotions) {
    if (!promotion.is_automatic || promotion.type !== 'percentage') continue;
    if (promotion.minimum_purchase && cartSubtotal > 0 && cartSubtotal < Number(promotion.minimum_purchase)) continue;
    if (!promotionAppliesToItem(promotion, item)) continue;

    let amount = lineTotal * (Number(promotion.discount_value) / 100);
    if (promotion.maximum_discount) amount = Math.min(amount, Number(promotion.maximum_discount));
    amount = Math.min(lineTotal, Math.max(0, amount));
    if (!best || amount > best.amount) best = { amount, promotion };
  }

  return best ? { ...best, amount: Math.round(best.amount * 100) / 100 } : null;
};

export const automaticFixedDiscount = (
  promotions: PromotionLike[],
  items: PromotionPricingItem[],
  subtotalAfterLineDiscounts: number,
) => {
  const subtotal = Math.max(0, Number(subtotalAfterLineDiscounts) || 0);
  let best: { amount: number; promotion: PromotionLike } | null = null;

  if (subtotal <= 0 || items.length === 0) return null;

  for (const promotion of promotions) {
    if (!promotion.is_automatic || promotion.type !== 'fixed') continue;
    if (promotion.minimum_purchase && subtotal < Number(promotion.minimum_purchase)) continue;

    const hasScope = ids(promotion.applicable_products).length > 0 || ids(promotion.applicable_categories).length > 0;
    const eligibleSubtotal = items.reduce((sum, item) => {
      if (hasScope && !promotionAppliesToItem(promotion, item)) return sum;
      const gross = Math.max(0, Number(item.unitPrice) || 0) * Math.max(1, Number(item.quantity) || 1);
      return sum + Math.max(0, gross - Math.max(0, Number(item.lineDiscountAmount) || 0));
    }, 0);
    if (hasScope && eligibleSubtotal <= 0) continue;

    let amount = Math.min(Number(promotion.discount_value) || 0, hasScope ? eligibleSubtotal : subtotal, subtotal);
    if (promotion.maximum_discount) amount = Math.min(amount, Number(promotion.maximum_discount));
    amount = Math.max(0, amount);
    if (!best || amount > best.amount) best = { amount, promotion };
  }

  return best ? { ...best, amount: Math.round(best.amount * 100) / 100 } : null;
};

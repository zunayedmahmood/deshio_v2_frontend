# E-commerce Module: Bugs and Integrity Report

## 1. Redundant and Inconsistent Utilities

### Asset URL Resolution
- **Issue**: There are three competing implementations of `toAbsoluteAssetUrl`:
  1. `@/lib/assetUrl.ts`: Most robust, handles legacy path normalization (e.g., `/category/` to `/categories/`).
  2. `@/lib/urlUtils.ts`: Simple implementation, misses legacy normalization.
  3. `@/services/catalogService.ts`: Internal implementation with slightly different environment variable priority.
- **Impact**: Images may break or resolve incorrectly depending on which page/component is being viewed. For example, `CartContext` uses `assetUrl`, while `order-confirmation` uses `urlUtils`.

---

## 2. Cart State and Synchronization

### Navigation vs. CartContext
- **Issue**: `components/ecommerce/Navigation.tsx` manually fetches `cartCount` via `cartService.getCartSummary()` and listens to `cart-updated` events. It should instead consume the `cart` state directly from `CartProvider`.
- **Impact**: Redundant API calls on every page load and potential race conditions where the header count differs from the sidebar count.

### Cart vs. Checkout Totals
- **Issue**: `app/e-commerce/cart/page.tsx` calculates the total without accounting for public promotions (provided by `PromotionContext`). Discounts only appear once the user reaches `CheckoutClient.tsx`.
- **Impact**: Poor user experience; users see a higher price in their cart than what they eventually pay, which can lead to cart abandonment.

---

## 3. Product and Variant Logic

### Inconsistent Grouping
- **Issue**: `[slug]/page.tsx` uses `groupProductsByMother`, while `products/page.tsx` relies on backend `group_by_sku`.
- **Impact**: Inconsistent UI behavior and product card displays between the "All Products" feed and specific "Category" pages. use group_by_sku in both pages.

---

## 4. TypeScript and Integrity Issues

### Overuse of `any`
- **Issue**: Extensive use of `any` and `any[]` in `CheckoutClient.tsx`, `[slug]/page.tsx`, and `PremiumProductCard.tsx`.
- **Impact**: TypeScript is unable to catch property name mismatches (e.g., `productId` vs `product_id`) which are prevalent in the service layer.

### Service Layer Mismatch
- **Issue**: `catalogService.ts` and `productService.ts` define overlapping but slightly different `Product` and `Image` interfaces.
- **Impact**: Confusion for developers and increased risk of runtime errors when passing data between e-commerce and admin components.

---

## 5. UI/UX and Stability

### Hardware Scanner Race Conditions
- **Issue**: `FindStockClient.tsx` and `CreateDispatchModal.tsx` attempt to manage hardware scanner input. Rapid scans can cause lost characters or multiple overlapping API calls.
- **Impact**: Unreliable stock lookup in high-speed environments.

### Receipt Printing Offline Fallback
- **Issue**: `OrderDetailsModal.tsx` alerts "QZ Tray is offline" but doesn't always provide a clear path to the browser's native print-to-PDF fallback.
- **Impact**: Frustrated staff when hardware integration is down.
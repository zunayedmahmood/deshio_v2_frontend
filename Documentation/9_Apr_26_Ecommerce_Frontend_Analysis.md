# Deshio V2 E-Commerce Module: Definitive Frontend Technical Manual

**Date:** April 9, 2026  
**Revision:** 1.4 (Comprehensive Engineering Reference)  
**Module:** E-Commerce  
**Tech Stack:** Next.js 15, React 19, Tailwind CSS 4, Radix UI, Lucide Icons

---

## 1. Architectural Philosophy
The Deshio V2 E-Commerce module is engineered for high-intent shopping. The architecture prioritizes **Performance**, **Aesthetics**, and **Variant Management**. Unlike traditional flat-catalog structures, Deshio V2 treats "Products" as logical groups of SKUs (Mother-Child variants), necessitating a sophisticated frontend grouping and resolution engine.

---

## 2. Global Design System & Utility Classes

The visual identity is defined by a specialized set of CSS utilities located primarily in `globals.css` and applied via the `.ec-` prefix.

### 2.1 CSS Variables (Design Tokens)
| Variable | Value | Usage |
| :--- | :--- | :--- |
| `--gold` | `#b07c3a` | Primary buttons, active tabs, highlights. |
| `--gold-light` | `#d4a96a` | Hover states, secondary accents. |
| `--gold-pale` | `#e8d5b5` | Subtle backgrounds and borders. |
| `--ink-black` | `#0d0d0d` | The standard root background color. |

### 2.2 Global Classes
- **`.ec-root`**: Resets the viewport, sets the default background to `--ink-black`, and applies the primary font stack (`Jost`).
- **`.ec-surface`**: A container class providing a semi-transparent background with a subtle border (`1px solid rgba(255,255,255,0.08)`) and high blur backdrop.
- **`.ec-card`**: The base for all product and collection tiles. Implements overflow hiding and smooth transition for hover effects.
- **`.ec-anim-fade-up`**: A standard entry animation for all sections, providing a cascading "reveal" effect as the user scrolls.
- **`.ec-darkify`**: A helper class used on body or root containers to enforce dark mode color variables regardless of system settings.

---

## 3. Dynamic Routing & Segment Resolution

### 3.1 Category Slugs (`app/e-commerce/[slug]/page.tsx`)
The category page uses a catch-all style dynamic segment to handle thousands of potential categories.
- **Normalization:** The `normalizeKey` function converts URL slugs (e.g., `nike-air-max`) into human-readable keys (`nike air max`) for comparison against the category tree.
- **Flattening Logic:** The `flattenCategories` utility recursively traverses the nested category tree provided by the backend to find matches at any depth.
- **SEO Optimization:** Uses `metadata` generators to ensure category-specific titles and descriptions are indexed correctly.

### 3.2 Product Detail Routing (`app/e-commerce/product/[id]/page.tsx`)
Product IDs drive the detail view. However, the UI handles "Variant-Aware" routing:
- **Canonical URLs:** The base product ID serves as the primary route.
- **Variant Switching:** Selecting a different color/size variant triggers a `router.push` to that specific variant's ID, ensuring the "Copy Link" feature always points to the exact selection (color/size) the customer is viewing.

---

## 4. Global State & Context Providers

### 4.1 `CartProvider` (`app/e-commerce/CartContext.tsx`)
The heartbeat of the shopping experience.
- **Data Model:** Uses the `CartSidebarItem` type which includes `productId`, `name`, `price`, `image`, `quantity`, `maxQuantity`, `sku`, `color`, and `size`.
- **Validation Engine:** The `validateCart` function is a crucial bridge to the backend, checking real-time stock levels across all branches before allowing a checkout transition.
- **Event Bus:** Dispatches `cart-updated` events to notify non-React-component logic (like legacy utility scripts) of changes.

### 4.2 `CustomerAuthProvider` (`contexts/CustomerAuthContext.tsx`)
Handles the "Customer" side of the multi-auth system.
- **Dual-Token Strategy:** Distinguishes between `authToken` (Admin) and `auth_token` (Customer) to prevent permission leakage.
- **Auto-Login:** Attempts to refresh the customer session on mount using the stored JWT.

### 4.3 `PromotionContext` (`contexts/PromotionContext.tsx`)
- **Real-time Discounting:** Calculates applicable discounts based on the current date and product ID.
- **Hooks:** `usePromotion` allows any card to instantly show "Sale" badges without redundant API calls.

---

## 5. Component Deep Dive

### 5.1 Navigation (`components/ecommerce/Navigation.tsx`)
The most complex navigational element in the system.
- **Search Integration:** Includes an inline search trigger that routes to the dedicated search client.
- **Mega-Menu Heuristics:**
  - Automatically sorts top-level categories by `product_count`.
  - Implements "expanded" states for sub-categories within the dropdown.
- **Mobile Responsiveness:** Uses a custom drawer implementation with animated transitions via Tailwind.

### 5.2 Subcategory Product Tabs (`components/ecommerce/SubcategoryProductTabs.tsx`)
- **Intent-Based Filtering:** Matches products based on "queries" (e.g., "sneakers").
- **Product Filtering Logic:**
  - `buildAllowedSet`: Gathers all descendant category IDs.
  - `productMatchesCat`: A strict validator that checks if a product belongs to the targeted category tree.
  - `productNameContainsCat`: A fallback heuristic that searches the product title for category keywords.

### 5.3 Premium Product Card (`components/ecommerce/ui/PremiumProductCard.tsx`)
The card utilizes a dual-layered approach for interactive states:
- **Level 1 (Static):** Displays the primary variant image, name, category, and price.
- **Level 2 (Hover):** Slides up an "Action Bar" with a "Choose Options" button using a `cubic-bezier(0.32, 0.72, 0, 1)` transition for a "magnetic" feel.
- **Price Resolution:** Logic to display a range (e.g. `৳1,200 - ৳1,500`) if variant prices differ.

---

## 6. Checkout & Payment Logistics

### 6.1 SSLCommerz Integration (`components/ecommerce/SSLCommerzPayment.tsx`)
- **Gateway Workflow:** 
  1.  Calls `initializePayment` to get a `payment_url`.
  2.  Stores `sslc_payment_intent` in `localStorage`.
  3.  Redirects user to the bank's secure page.
- **Status Checker:** The `PaymentStatusChecker` component monitors the URL on return (`/my-account` or `/order-confirmation`) to verify successful transaction completion.

### 6.2 Multi-Step Checkout (`CheckoutClient.tsx`)
- **State Transitioning:** Tracks progression through `shipping` → `payment` → `review`.
- **Validation:** Implements synchronous `localStorage` writes for `checkout-selected-items` to prevent data loss during quick navigations.

---

## 7. Product Resolution Engine (`lib/ecommerceProductGrouping.ts`)

This core utility is responsible for the unique Mother-Child experience:
- **Base Name Extraction:** Strips color and size suffixes from SKU strings to find sibling products.
- **Representative Picker:** Automatically selects the "best" variant to show in the grid based on:
  1.  Stock availability (In-stock first).
  2.  Pricing (Lowest price first).
  3.  Primary Image presence.
- **Image Propagation:** A recursive logic that scans siblings for images. If "Red Shoe" has no photo but "Blue Shoe" does, the Mother Card uses the Blue photo as a fallback to maintain visual integrity.

---

## 8. Mobile Optimization Strategy

### 8.1 Touch-First Interactions
- **Drawer Behavior:** Both the `CartSidebar` and `CategorySidebar` use 100% height drawers on mobile with easy-to-hit "X" buttons.
- **Tab Sliders:** The `SubcategoryTabs` uses `overflow-x-auto` with `scrollbar-hide` to allow natural thumb-scrolling through categories.

### 8.2 Performance on Low-End Devices
- **Skeleton Screens:** Every section (New Arrivals, Featured, Grid) includes a custom `.animate-pulse` placeholder set to match the final layout exactly, preventing Layout Shift (CLS).
- **Lazy Loading:** Next.js `Image` component is configured with `priority` only for Hero elements; all grid cards use native lazy loading.

---

## 9. Inventory Hardware Bridge (`FindStockClient.tsx`)

A unique feature for Deshio V2 is the store employe-accessible Stock Finder:
- **Technology:** `html5-qrcode` integration.
- **Scanning Flow:**
  - Requests camera permissions on-demand.
  - Feeds into `performSearch(barcode)`.
  - Clears camera lock immediately after success to save battery.
- **Data Display:** Uses `InventoryMetric` sub-components to show a "Scoreboard" of physical stock across all branches. useful for store employees.

---

## 10. Service Layer Mapping (Frontend to Backend)

| Frontend Feature | Service Utility | API Endpoint Prefix |
| :--- | :--- | :--- |
| Catalog / Feed | `catalogService.ts` | `/api/catalog/*` |
| Cart Ops | `cartService.ts` | `/api/customer/cart/*` |
| Addresses | `checkoutService.ts` | `/api/customer/addresses/*` |
| Checkout | `checkoutService.ts` | `/api/checkout/*` |
| Profile | `customerProfileService.ts` | `/api/customer/profile` |
| Registration | `customerRegistrationService.ts` | `/api/register` |
| Stock Finder | `productService.ts` | `/api/products/barcode/*` |

---

## 11. Component Event System

To maintain loosely coupled components, the application utilizes a custom event bus:
- **`cart-updated`**: Triggered by `CartContext` after any add/remove/update action. Listened to by `Navigation` to refresh badges.
- **`wishlist-updated`**: Triggered by `wishlistUtils`. Listened to by `PremiumProductCard` to toggle heart icons.
- **`customer-auth-changed`**: Triggered on login/logout. Listened to by the `CartProvider` to merge guest carts with user accounts.
- **`global-toast`**: Used by the `fireToast` utility to show non-blocking notifications.

---

## 12. Developer Guide: Best Practices

When contributing to the e-commerce module, developers MUST adhere to:
1.  **Strict Typing:** Never use `any` for product data; always use `SimpleProduct` or `ProductDetailResponse`.
2.  **Asset Handling:** Always use `toAbsoluteAssetUrl` for images to ensure proxying and backend origin resolution works across environments.
3.  **Visual Hooks:** Use `.ec-root` as the parent for any new page to inherit atmospheric glow and grid settings.
4.  **Testing:** Any changes to `CartContext` must be verified across both Guest and Authenticated modes.
5.  **Hooks First:** Prefer `useMemo` for any object or array transformation within render functions to maintain a 60fps UI.

---

## 13. Conclusion
The e-commerce frontend of Deshio V2 is a feature-rich, visually stunning application. By merging fashion-grade aesthetics with rigorous engineering, it provides a scalable foundation for Deshio's nationwide digital presence. The module is designed to feel "alive"—responsive to stock changes, user interactions, and promotional cycles.

---

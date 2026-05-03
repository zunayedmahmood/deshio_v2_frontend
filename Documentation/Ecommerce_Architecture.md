# Deshio V2 - E-commerce Frontend Architecture

This document provides an exhaustive, structured overview of the `app/e-commerce` directory and the supporting `components/ecommerce` library. Deshio V2's e-commerce frontend is designed as a premium, high-performance storefront that prioritizes mobile UX, visual storytelling, and seamless variation handling.

---

## 1. Architectural Foundation & State Management

The application leverages Next.js 15 (App Router) and React 19. State is managed through a combination of React Context for global UI/business state and `localStorage` for cross-session persistence (Cart, Wishlist, Recently Viewed).

### 1.1 Global Layout (`app/e-commerce/layout.tsx`)
The root layout serves as the injection point for essential context providers and global UI elements:
- **`CustomerAuthProvider`**: Manages the authentication state for e-commerce customers (using the `auth_token` key). It handles login, registration, and password updates.
- **`PromotionContext`**: Centralizes the logic for identifying and applying active discounts. It maps product IDs and category IDs to active backend campaigns.
- **`GlobalCartSidebar`**: A singleton instance of the `CartSidebar` that slides from the right. It is controlled by the `CartContext`.
- **`ScrollToTopOnRouteChange`**: Fixes a common Next.js issue by forcing a reset of the scroll position to `(0,0)` on every navigation, unless explicitly bypassed (e.g., during variant switching on the PDP).

### 1.2 Cart System (`app/e-commerce/CartContext.tsx`)
The `CartContext` acts as the orchestrator for all shopping bag operations.
- **Persistence**: It interacts with the backend via `cartService`. Upon initialization, it fetches the server-side cart.
- **Guest Merging**: It facilitates the "Guest to Customer" transition. If a user adds items as a guest and subsequently logs in, the context triggers a `mergeGuestCart` operation.
- **Dynamic Pricing**: The `getTotalPrice` method doesn't just sum constants; it queries the `PromotionContext` to ensure the final subtotal reflects active discounts in real-time.
- **Inventory Sync**: It monitors `available_inventory` fields returned by the cart API to show "Over Stock" warnings directly in the sidebar.

---

## 2. Discovery & Catalog Interfaces

Deshio V2 uses a sophisticated discovery system that balances deep filtering for power users with high-end visual "Collections" for casual browsers.

### 2.1 The Landing Experience (`app/e-commerce/page.tsx`)
The home page is built using `next/dynamic` to ensure fast initial paint times for critical hero content while lazy-loading secondary sections.
- **`HeroSection`**: Features a prominent search bar that acts as the primary navigational tool. It also displays "Quick Category Chips" for the most populated collections.
- **`InstagramReelViewer`**: A custom-built carousel that processes `InstagramEmbed` components. It uses a `ResizeObserver` on the active slide to ensure the container perfectly wraps the iframe content, avoiding vertical layout shifts.
- **`SubcategoryProductTabs`**: One of the most dynamic components on the home page. It allows users to browse a major category (like "Sneakers") through subcategory tabs (e.g., "High-Tops", "Low-Tops") without leaving the page. It fetches products on-demand as tabs are clicked.

### 2.2 Category & Product Feeds (`products/page.tsx` & `[slug]/page.tsx`)
These pages share a common underlying architecture for managing catalog data.
- **URL Synchronization**: All filter states (Search query, category ID, sort order, price range) are mirrored in the URL. This allows users to share filtered views and use the browser's back/forward buttons naturally.
- **SKU Grouping Logic**: To avoid overwhelming the user with duplicate entries (e.g., showing five identical shirts because they exist in different colors), the frontend implements SKU-based grouping. It uses `groupProductsByMother` to identify variations and selects a "representative" item to display in the grid.
- **`PremiumProductCard`**: The primary display unit. It features:
    - **Hover Swapping**: Automatically swaps the primary image for a secondary one when hovered.
    - **Urgency Badges**: Dynamically renders "NEW" (if < 14 days old), "SALE" (if promotion exists), or "SOLD OUT" (based on aggregate stock of all variations).
    - **Price Ranges**: If variations of the same product have different prices, the card renders a range (e.g., "৳1,200 – ৳1,800").

### 2.3 Search Experience (`app/e-commerce/search/search-client.tsx`)
The search page provides a high-end search-as-you-type experience.
- **Debouncing**: Input changes are debounced by 500ms before updating the URL and triggering a backend fetch.
- **Mobile Adaptation**: On small screens, the desktop sidebar is hidden, replaced by a bottom-anchored "Filters & Sorting" pill that opens a clean bottom-sheet drawer.

---

## 3. The Product Detail Page (PDP)

The PDP (`app/e-commerce/product/[id]/page.tsx`) is the core conversion engine of the storefront, handling highly complex variation and inventory logic.

### 3.1 Variation Parsing & Normalization
Deshio's backend data can sometimes contain inconsistent naming conventions for sizes and colors. The PDP uses a robust parsing engine:
- **`parseMarketSizePairs`**: Uses Regex to extract standard sizes like "US 7", "EU 40", or "UK 6.5" from concatenated strings.
- **`deriveVariantMeta`**: Consolidates information from `variation_suffix`, `option_label`, and product `attributes` to build a clean UI label for the variant selector.

### 3.2 Real-time Inventory & Scarcity
Scarcity is communicated through multiple visual signals:
- **Available Inventory**: The UI specifically looks at `available_inventory` (Physical stock minus Reserved stock).
- **Progress Bars**: An animated bar shows the relative stock level (Red/Pulsing for < 5 units, Yellow for < 10 units, Green for healthy stock).
- **Live Proof**: A simulated "Live Viewers" component adds a sense of urgency.

### 3.3 Media Experience
- **`ProductImageGallery`**: A responsive gallery component. On desktop, it supports thumbnail-hover navigation. On mobile, it uses CSS Scroll Snapping for a native-feeling carousel experience.
- **Sticky CTA**: On mobile, a `StickyAddToCart` bar appears at the top of the screen once the user scrolls past the main buy section, ensuring the "Add to Cart" action is always one tap away.

---

## 4. Checkout & Payment Infrastructure

The checkout flow handles the complex transition from browser intent to a confirmed order.

### 4.1 Consolidating the Flow (`app/e-commerce/cart/page.tsx`)
The standalone cart page is deprecated. The system now uses a `GlobalCartSidebar` for all cart modifications. Navigating to `/cart` or clicking checkout in the sidebar simply prepares the `localStorage` payload of selected items and redirects to the unified checkout page.

### 4.2 Unified Checkout (`app/e-commerce/checkout/CheckoutClient.tsx`)
- **Dual Flow Support**:
    - **Guest Flow**: A streamlined, single-form experience. It captures essential delivery info and uses `guestCheckoutService` for submission.
    - **Member Flow**: A structured 3-step process (Shipping → Payment → Review). It integrates with `checkoutService` to manage a user's address book.
- **Delivery Calculation**: The `shipping_charge` is not hardcoded. It is calculated dynamically based on the selected `city` (e.g., Inside Dhaka vs. Outside Dhaka) using `checkoutService.calculateDeliveryCharge`.

### 4.3 Payment Integrations
- **SSLCommerz (`SSLCommerzPayment.tsx`)**: The primary online payment gateway.
    - **Handshake**: The component calls the backend to initialize an SSLCommerz session.
    - **Secure Redirect**: Displays a "Secure Handshake" overlay to inform the user they are being redirected to a bank-level encrypted gateway.
    - **Status Recovery**: Post-redirect, the `Paymentstatuschecker.tsx` component (located in `MyAccountShell`) checks for stored "Payment Intents" and verifies the final transaction status with the backend.
- **Cash on Delivery (COD)**: A standard offline method where the order is placed immediately with a `pending_payment` status.

---

## 5. Post-Purchase & Tracking

### 5.1 Confirmation Screens
- **`thank-you`**: A lightweight, fast-loading splash page shown immediately. It uses `localStorage` data for zero-latency UI rendering.
- **`order-confirmation`**: The full digital receipt, fetching the latest status from the database. It allows users to print receipts or jump directly to tracking.

### 5.2 Order Tracking
Deshio provides two ways to track an order:
- **By Order Number**: A vertical timeline view showing the order's progression through internal statuses (Pending → Processing → Shipped → Delivered).
- **By Phone Number**: Designed for guests. It fetches all recent orders associated with a phone number, allowing users to track multiple deliveries without an account.

---

## 6. Key Business Logic Mechanisms

### 6.1 SKU-Based Product Grouping
To maintain a high-end catalog feel, Deshio avoids showing repetitive variations.
- **The "Mother" Concept**: Products are grouped by a shared "Base Name."
- **Representative Logic**: The system automatically picks the most relevant variant to show in the feed (prioritizing in-stock items).
- **Variant Counting**: Cards show labels like "+4 more colors" using `getAdditionalVariantCount`.

### 6.2 The Promotion Engine
The frontend doesn't just show discounts; it calculates them defensively.
- It checks the `PromotionContext` at the `CartItem` and `PremiumProductCard` levels.
- Discounts are applied as percentages of the `selling_price`.
- The system renders strike-through pricing only if the current active promotion offers a genuine saving.

### 6.3 Mobile-First UX Strategy
- **Bottom Navigation**: Replaces the desktop header for better thumb-reachability.
- **Bottom Sheets**: All complex filter interactions on mobile use bottom-up drawers instead of modals or sidebars.
- **Optimized Images**: Uses the `toAbsoluteAssetUrl` utility to route images through a proxy, handling cross-domain issues and ensuring responsive sizing.

### 6.4 Image Proxying & Error Handling
- **Proxy**: Categories and products often serve images from the Laravel `/storage` directory. The frontend routes these through `/api/proxy-image?url=...` to solve CORS issues.
- **Graceful Fallbacks**: Every product card and gallery slide implements an `onError` handler that replaces broken images with a stylish placeholder or a brand-colored gradient.

---

## 7. Component Glossary

| Component | Responsibility |
| :--- | :--- |
| `PremiumProductCard` | Standard grid unit with hover-swaps and badges. |
| `CategorySidebar` | Faceted navigation for catalog pages. |
| `InstagramReelViewer` | Social proof through embedded video content. |
| `StickyAddToCart` | Mobile-only conversion tool for long product pages. |
| `VariantSelector` | Handles complex size/color selection logic on the PDP. |
| `CartItem` | Individual row in the sidebar with quantity validation. |
| `Navigation` | Global header/bottom-bar with cart count indicators. |
| `Paymentstatuschecker` | Recovers payment state after external redirects. |

---
*Generated: April 18, 2026 | Deshio Frontend Architecture Documentation*

# Splayd E-Commerce UI Blueprint
**Source:** https://splayd.com.bd  
**Platform:** Shopify (Theme: T4S / EcomRise)  
**Pages Crawled:** 40  
**CSS Framework:** Custom CSS (no Tailwind) — uses a proprietary `t4s-` utility class system  

---

## 1. Site Overview

Splayd is a Bangladeshi fashion e-commerce store selling clothing (shirts, t-shirts, polo, panjabi, women's 3-pieces, pants), sneakers (Nike Air Force, Air Jordan, Jordan 4, SB Dunks), accessories, and perfumes. The UI is built on Shopify using the T4S/EcomRise theme and follows a clean, minimalist aesthetic with a black/white/grey palette accented by warm tones.

---

## 2. Design Tokens

### 2.1 Color Palette
| Role | Value |
|------|-------|
| Primary background | `#fff` / `#f5f5f5` / `#f7f7f7` |
| Primary text | `#222` / `#333` / `#000` |
| Borders/dividers | `#ccc` / `#ddd` / `#eee` / `#e0e0e0` / `#dfe3` |
| Accent / CTA | `#e81e` (red-orange) |
| Secondary accent | `#56cf` (teal/green) |
| Muted/disabled | `#abb1` / `#a9a9` |
| Overlay dark | `rgba(0,0,0,0.5)` / `#0000001a` / `#0000004d` |
| Overlay light | `rgba(255,255,255,0.15)` |
| Link / highlight | `#1095` (blue) |
| Sale/badge | `#ff4e` (orange-yellow) / `#ffb1` (light gold) |

### 2.2 Typography
| Role | Family |
|------|--------|
| Primary body font | `Poppins` (Google Font) |
| Accent / headings | `Libre Baskerville` (Google Font, italic variant used) |
| Icon fonts | `Line Awesome Brands`, `Line Awesome Free` |
| Slider icons | `swiper-icons` |
| Fallback | `Arial, Helvetica, sans-serif` |

### 2.3 Spacing
Common spacing values: `0`, `5px`, `8px`, `10px`, `15px`, `20px`, `30px`. Horizontal gutters use `0 15px` and `0 30px 0 15px` patterns. Container inner padding follows `0 8px` and `10px 20px`.

### 2.4 Border Radii
Buttons use `var(--btn-radius)` / `var(--pr-btn-radius-size)`. Cards use `var(--item-rd)`. Common raw values: `2px`, `3px`, `4px`, `5px`, `6px`, `8px`, `12px`, `40px`, `50%`, `100%`.

### 2.5 Shadows
- Cards on hover: `0 0 20px rgb(0 0 0 / 20%)`
- Subtle elevation: `rgba(17,17,26,0.1) 0px 4px 16px`
- Input autofill: `0 0 0 1000px #FFF inset`
- Subtle lines: `0 1px #d4d6d866`

### 2.6 CSS Custom Properties (Key Variables)
```
--font-family-1         Primary font (Poppins)
--font-body-family      Body font reference
--btn-radius            Button border radius
--pr-btn-radius-size    Product button radius
--item-rd               Card/item border radius
--text-fs               Base text font size
--border-w              Border width (used in back-to-top: 2px)
--cricle-normal         Back-to-top circle idle color (#f5f5f5)
--cricle-active         Back-to-top circle active color (#000)
--brc-cl                Breadcrumb color (#f2f2f2)
--brc_mgb               Breadcrumb margin bottom (5px)
--list-mb               Tab list margin bottom
--li-mb / --li-pl       List item spacing overrides
```

---

## 3. Global Layout Structure

Every page follows the same shell:

```
<body.t4sp-theme>
  ├── a.skip-to-content-link (accessibility, visually hidden)
  ├── div.t4s-close-overlay (modal/drawer background, opacity-0 default)
  ├── div.t4s-website-wrapper
  │   ├── [announcement banner strip]
  │   ├── header#shopify-section-header-inline (.t4s-section-header)
  │   ├── main#MainContent (.content-for-layout)
  │   └── footer
  └── [floating widgets: back-to-top, cart drawer, sales notification]
```

**Body class flags** (feature toggles on `<html>`):
- `t4sp-theme` — base theme identifier
- `t4s-wrapper__full_width` — full-width layout mode
- `rtl_false` — LTR direction
- `swatch_color_style_2` — swatch display style
- `pr_border_style_1` — product card border mode
- `pr_img_effect_0` — product image hover effect
- `badge_shape_2` — badge shape variant
- `css_for_wis_app_true` — wishlist app CSS enabled
- `t4_compare_true` — product comparison enabled
- `t4s-sidebar-qv` — quick view with sidebar mode
- `t4s-cart-count` — cart count badge active
- `is-remove-unavai-2` — hide unavailable variants option

---

## 4. Components

### 4.1 Navbar / Header
**Structure:**
- Sticky inline header (`#shopify-section-header-inline`)
- Left: Logo (`h1.site-header__logo`, hidden on mobile with `t4s-d-none`, shown as image)
- Center/Right: Navigation links + icon actions
- Icon actions (SVG sprite-based): Search, Account, Wishlist/Heart, Cart
- Cart icon includes an animated badge counter (`span.t4s-count-box` with transition via `t4s-ts-op`)
- Sticky sentinel div (`#t4s-hsticky__sentinel`) triggers sticky behavior via scroll observation
- Sticky state class: sticky bar activates at scroll threshold with `t4s-op-0` fading in

**SVG Icons used in header (sprite IDs):**
`icon-h-search`, `icon-h-account`, `icon-h-heart`, `icon-h-cart`

**Behavior:**
- Transparent/white on scroll
- Mobile: collapses to hamburger (sidebar drawer nav)
- Search icon opens fullscreen search overlay

---

### 4.2 Announcement Banner Strip
**Element:** `#shopify-section-announcement-bar`  
**Classes:** `t4-section-announcement-bar`, `t4s_bk_flickity`, `t4s_tp_cd`  
**Behavior:** Rotating/scrolling text using Flickity carousel. Displays promotional messages, shipping notices, or sale announcements. Full-width, typically a single line of colored text on a dark or brand-color background.

---

### 4.3 Hero / Slideshow
**Element:** `div.t4s-slideshow`  
**Classes:** `t4s-row`, `t4s-row-cols-1`, `t4s-gx-0`, `t4s-flicky-slider`, `t4s_position_8`, `t4s_cover`, `t4s_ratioadapt`, `t4s-slide-eff-slide`  
**Dot navigation:** `t4s-dots-style-elessi`, `t4s-dots-cl-dark`, `t4s-dots-default`, `t4s-dots-round-true`  
**Mobile dots:** visible (`t4s-dots-hidden-mobile-false`)  
**Slider buttons:** SVG symbols `svg-slider-btn___prev-1`, `svg-slider-btn___next-1`  
**Image style:** Cover-fit, aspect-ratio adaptive, full-width  
**Slide transition:** Slide effect  

---

### 4.4 Product Card
The most reused component across the site.

**Outer wrapper:** `div.t4s-product.t4s-pr-grid.t4s-pr-style1`  
**Inner structure:**
```
div.t4s-product-wrapper
  └── div.t4s-product-inner
        ├── div.t4s-product-img          (image container)
        │   ├── a.t4s-full-width-link    (entire card clickable)
        │   ├── img.t4s-product-main-img.lazyloadt4s  (lazy-loaded main image)
        │   ├── div.t4s-product-badge    (e.g. "Sale", "New", "Hot")
        │   └── div.t4s-product-btns    (action buttons overlay)
        │       └── div.t4s-product-btns2
        │             ├── [Add to Cart button]   (icon: t4s-icon-atc)
        │             ├── [Quick View button]    (icon: t4s-icon-qv)
        │             ├── [Compare button]       (icon: t4s-icon-cp / t4s-icon-cp-added)
        │             └── [Wishlist button]      (icon: t4s-icon-wis / t4s-icon-wis-added)
        └── div.t4s-product-info
              └── div.t4s-product-info__inner
                    ├── h3/a.t4s-product-title
                    ├── div.t4s-product-rating
                    │   ├── div.ryviu-collection.t4s-grid-rating  (star rating)
                    │   └── ryviu-widget-total                    (review count)
                    └── div.t4s-product-price  (with sale/compare-at pricing)
```

**Hover behavior:** Button overlay (`t4s-product-btns`) fades in. Countdown timer (`.t4s-product-countdown`) becomes visible if enabled.  
**Lazy loading:** Images use `lazyloadt4s` class with a loader element (`lazyloadt4s-loader`).  
**Skeleton loading:** `t4s-skeleton-element`, `ske-mrl-20`, `ske-h-50`, `ske-shine` (shimmer animation).

---

### 4.5 Collection / Product Grid (Collection Pages)
**Layout structure:**
```
main#MainContent
  └── div.t4s-container
        ├── nav.breadcrumbs (breadcrumb trail)
        ├── div.t4s-row
        │   ├── aside.t4s-sidebar.t4s-col-lg-3   (filter sidebar, hidden on mobile: t4s-dn)
        │   └── div.t4s-col-lg-9                 (product grid area)
        │         ├── [toolbar: sort dropdown + view toggle]
        │         ├── div.t4s-row (product cards grid)
        │         └── div.t4s-pagination-wrapper
```

**Sort dropdown:** `div.t4s-dropdown.t4s-dropdown__sortby` — "Sort by" text hidden on mobile (`t4s-d-none t4s-d-md-block`) with short label on mobile (`t4s-d-md-none`).

**Pagination / Load More:**
- Progress bar style: `div.t4s-lm-bar.t4s-btn-color-primary` with text count `span.t4s-lm-bar--txt` and fill `div.t4s-lm-bar--progress`
- Load more button: `a.t4s-loadmore-btn.t4s-btn.t4s-btn-style-outline.t4s-btn-size-large.t4s-btn-color-primary.t4s-btn-effect-rectangle-out`

**Filter Sidebar (Desktop):**
- `aside.t4s-sidebar` (hidden on mobile via `t4s-dn`, shown at `t4s-col-lg-3`)
- Contains loading placeholder (`div.t4s-loading--bg`) until AJAX filters load

---

### 4.6 Product Detail Page (PDP)
**URL pattern:** `/products/[product-handle]`  
**Main content child count:** ~1450 DOM elements (rich page)

**Layout:**
```
div.t4s-container
  └── div.t4s-row
        ├── [Left: Image Gallery]
        └── [Right: Product Info Panel]
```

**Image Gallery (Left):**
- Uses Flickity slider (`t4s-flicky-slider`)
- Thumbnail strip below main image
- Zoom/lightbox via PhotoSwipe (`pswp` classes)
- Share button: `button.pswp__button.pswp__button--share` + `div.pswp__share-tooltip`

**Product Info Panel (Right):**
- Product title (`h1`)
- Rating widget (`div.t4s-product-rating` + Ryviu integration)
- Price block (`div.t4s-product-price`)
- Variant selectors (color swatches — `swatch_color_style_2`)
- Size selector
- Quantity input
- Add to Cart button
- Wishlist + Compare icons
- Product description/tabs

---

### 4.7 Cart Widget / Drawer
**Trigger:** Cart icon in header (`span.t4s-pr.t4s-icon-cart__wrap`)  
**Cart count badge:** `span.t4s-count-box` (animated opacity transition, `t4s-ts-op`)  
**Cart SVG icon:** `t4s-icon--cart`  
**Cart page URL:** `/cart`  
**Behavior:** Likely a slide-out drawer (AJAX cart). Cart page is a standard Shopify cart layout with product rows, quantity adjusters, and checkout CTA.

---

### 4.8 Search
**Trigger:** Search icon in header (`svg.t4s-icon.t4s-icon--search`)  
**Search container:** `div.search-s[…]` (full class truncated in data)  
**Search page URL:** `/search`  
**Behavior:** Fullscreen or dropdown search overlay. Displays predictive results and a search results page following the same product grid layout.

---

### 4.9 Tabs (Tabbed Product Collections)
**Element:** `section#shopify-section-template--*__tabs_collection_*`  
**Classes:** `t4s-section-all`, `t4s_bk_flickity`, `t4s_tp_tab2`, `t4s-tabs-collection`  
**CSS variable:** `--list-mb` (tab underline spacing)  
**Behavior:** Tabbed interface where each tab displays a filtered product collection carousel. Flickity powers the product carousel within each tab. Tabs use `min-height: 40px` on links.

---

### 4.10 Modal / Overlay
**Overlay backdrop:** `div.t4s-close-overlay.t4s-op-0` — full-screen dark overlay, hidden by default, shown when any modal/drawer is open.  
**Quick View modal:** Triggered from product card quick-view button, loads product detail in a modal without page navigation.  
**Image modal:** Contains `div.t4s-cat-content.t4s-source-image.t4s-eff.t4s-eff-dark-overlay` — category/banner image with dark overlay effect.

---

### 4.11 Footer
**Structure:**
```
footer
  ├── [Multi-column links grid]
  │   ├── Column: Brand info / logo
  │   ├── Column: Quick Links
  │   ├── Column: Customer Service
  │   └── Column: Newsletter signup
  ├── div.t4s-prs-footer.t4s-has-btn-none.t4s-text-center
  │   └── a.t4s-btn.t4s-btn-base.t4s-viewall-btn  ("View All" CTA)
  └── [Copyright bar + payment icons]
```

**Column headings:** `span.t4s-footer-heading.t4s-col-heading`  
**Footer links:** `a.t4s-footer-link`  
**Newsletter form:** `form#t4s-form-footer-12.t4s-newsletter__form`  
  - Hidden inputs (form_type, UTF8, contact tokens)  
  - `div.t4s-newsletter__fields` with email input  
  - Submit button  

---

### 4.12 Newsletter Form
**ID:** `t4s-form-footer-12`  
**Classes:** `t4s-pr`, `t4s-z-100`, `t4s-newsletter__form`  
**Fields container:** `div.t4s-newsletter__fields`  
**Hidden fields:** 3 hidden inputs (Shopify form authenticity tokens)  
**Behavior:** AJAX submit, inline success/error message display via `span.t4s-notices__mess`

---

### 4.13 Alert / Notice System
**Sales notification:** `<er-sales-notification class="ecomrise-sales-notification">` — Web Component that shows popup toasts of recent purchases (social proof).  
**Form messages:** `span.t4s-notices__mess` — inline status messages.  
**Behavior:** Bottom-corner popups with customer name + product + time ago.

---

### 4.14 Breadcrumb
**Element:** `nav.breadcrumbs`  
**ARIA:** `role="navigation"`, `aria-label="breadcrumbs"`  
**Structure:** `ul.breadcrumbs__list > li.breadcrumbs__item > a.t4s-dib`  
**CSS variables:** `--brc-cl: #f2f2f2`, `--brc_mgb: 5px`  
**Example:** Home › Collections › New Arrivals

---

### 4.15 Back to Top Button
**Element:** `a#t4s-backToTop.t4s-back-to-top.t4s-back-to-top__design1`  
**Position:** Fixed (`t4s-pf`)  
**Default state:** Hidden (`t4s-op-0`)  
**ARIA:** `aria-label="Back to the top"`  
**Visual:** SVG circular progress indicator  
**CSS variables:**  
```
--border-w: 2px
--cricle-normal: #f5f5f5   (idle ring color)
--cricle-active: #000000   (scroll progress ring color)
```
**Classes:** `t4s-progress_bar_false` (no circular progress bar variant active)

---

### 4.16 Wishlist / Compare
**Wishlist icon SVG symbol:** `t4s-icon-wis` / `t4s-icon-wis-added` (toggled on add)  
**Compare icon SVG symbol:** `t4s-icon-cp` / `t4s-icon-cp-added` (toggled on add)  
**Behavior:** Enabled globally (`t4_compare_true` on body, `css_for_wis_app_true`). Wishlist powered by a third-party Shopify app.

---

### 4.17 Rating Widget
**Provider:** Ryviu reviews app  
**Elements:** `div.ryviu-collection.t4s-grid-rating` (star display) + `<ryviu-widget-total>` Web Component (count)  
**Container:** `div.t4s-product-rating`  
**Placement:** Below product title on cards and PDP

---

### 4.18 Badge / Tag
**Element:** `div.t4s-product-badge`  
**Placement:** Overlaid on product image (top-left typically)  
**Badge shapes:** Controlled by `badge_shape_2` body class  
**Common badge types:** Sale (percentage discount), New, Hot, Sold Out

---

### 4.19 Dropdown Menu
**Element:** `div.t4s-dropdown.t4s-dropdown__sortby`  
**Structure:** `button` trigger + `span` label (desktop: `t4s-d-md-block`, mobile: `t4s-d-md-none`) + `svg.t4s-icon-select-arrow`  
**Usage:** Sort by dropdown on collection pages (Price, Newest, Best Selling, etc.)

---

### 4.20 Social Links
**Trigger context:** PhotoSwipe lightbox share button (`button.pswp__button.pswp__button--share`)  
**Share tooltip:** `div.pswp__share-tooltip`  
**Footer social icons:** Line Awesome icon font classes

---

### 4.21 Icon Block
**Page context:** `/pages/reels`  
**Structure:** `div.icon-wrapper` containing dual-state SVG icons  
```
div.icon-wrapper
  ├── svg.like-icon-outline + path   (default/empty state)
  └── svg.like-icon-filled + path    (active/liked state)
```
**Usage:** Like/heart interaction on video reels page

---

### 4.22 Store Cards (Outlets Page)
**Page:** `/pages/all-outlets`  
**Element:** `div.store-card` with `text-align: start`  
**Children:** `h4` (store name), `p` (address lines × 3), `img` (store photo), `a` (directions/maps link), `p` (hours)

---

### 4.23 Reels / Video Page
**Page:** `/pages/reels`  
**DOM size:** ~256 children in main content  
**Features:** Video reel cards with like icon toggle (outline ↔ filled SVG), mute/unmute controls (`icon-unmuted`, `icon-muted`)

---

### 4.24 Button System
All buttons follow the pattern:
```
.t4s-btn
  .t4s-btn-base
  .t4s-btn-style-[default|outline|solid]
  .t4s-btn-size-[small|medium|large]
  .t4s-btn-color-[primary|dark|light|white]
  .t4s-btn-effect-[default|rectangle-out|...]
  .t4s-btn-icon-[true|false]
```

**Common button variants:**
| Variant | Usage |
|---------|-------|
| `style-default` + `color-dark` | Primary CTA (View All, etc.) |
| `style-outline` + `color-primary` | Load More button |
| `style-default` + `color-primary` | Add to Cart |
| `t4s-btn-loading__svg` | Button with loading spinner state |

---

## 5. Page Templates

### 5.1 Homepage (`/`)
**Sections (top → bottom):**
1. Announcement banner strip (Flickity carousel)
2. Sticky header
3. Hero slideshow (full-width, slide effect, dot navigation)
4. Tabbed collections section (Flickity-powered carousels per tab)
5. Featured product / category banners
6. Product grid sections
7. Newsletter signup block
8. Footer

---

### 5.2 Collection Page (`/collections/[handle]`)
**URL examples:** `/collections/new-arrivals`, `/collections/t-shirts`, `/collections/women`  
**Layout:**
1. Header
2. Breadcrumb nav
3. Two-column: Sidebar (filter, desktop only) + Product grid (3→4 columns desktop)
4. Sort dropdown toolbar
5. Product cards grid (lazy loaded)
6. Load More button + progress bar
7. Footer

**Sidebar filters:** Hidden on mobile (`t4s-dn`), 3-column on desktop (`t4s-col-lg-3`)  
**Product area:** 9-column on desktop (`t4s-col-lg-9`)

---

### 5.3 Product Detail Page (`/products/[handle]`)
**Layout:**
1. Header + Breadcrumb
2. Two-column: Image gallery left + Product info right
3. Image gallery: Main Flickity slider + thumbnail strip + PhotoSwipe zoom
4. Info panel: Title, Rating, Price, Variants (size/color swatches), Qty, ATC button, Wishlist/Compare
5. Product description accordion/tabs
6. Related products / "You may also like" section (product carousel)
7. Footer

---

### 5.4 Cart Page (`/cart`)
**Layout:** Single column centered, header + footer  
**Content:** Line items table (image, name, variant, qty stepper, price), subtotal, checkout button  
**DOM size:** ~107 main children (lighter page)

---

### 5.5 Search Page (`/search`)
**Layout:** Same as collection page but without sidebar  
**Content:** Search input at top, results grid below  
**DOM size:** ~50 main children

---

### 5.6 Static Pages
| Page | URL | Notes |
|------|-----|-------|
| All Outlets | `/pages/all-outlets` | Grid of `div.store-card` components |
| Our Story | `/pages/our-story` | Text-only brand narrative (~43 main children) |
| Reels | `/pages/reels` | Video reel grid with like/mute interactions |

---

## 6. Assets & Icons

### 6.1 SVG Sprite Symbols
All icons are SVG sprites referenced via `<use href="#symbol-id">`:

| Symbol ID | Usage |
|-----------|-------|
| `icon-h-search` | Header search icon |
| `icon-h-account` | Header account icon |
| `icon-h-heart` | Header wishlist icon |
| `icon-h-cart` | Header cart icon |
| `svg-slider-btn___prev-1` | Slider previous button |
| `svg-slider-btn___next-1` | Slider next button |
| `t4s-icon-btn` | Generic button icon |
| `t4s-icon-loading` | Loading spinner |
| `t4s-icon-search` | In-page search icon |
| `t4s-icon-close` | Close/dismiss icon |
| `t4s-icon-atc` | Add to Cart icon |
| `t4s-icon-qv` | Quick View icon |
| `t4s-icon-cp` / `t4s-icon-cp-added` | Compare (default / active) |
| `t4s-icon-wis` / `t4s-icon-wis-added` | Wishlist (default / active) |

### 6.2 Inline Icon Classes (Line Awesome)
`icon--minus`, `icon--plus`, `icon-close`, `icon-wrapper`, `icon-unmuted`, `icon-muted`

### 6.3 Logo
**File:** `Splayd_Logo_Black_PNG_e4f3ae0b-161e-436c-9fb3-054c6ca288de.png`  
**Placement:** `h1.site-header__logo` (hidden text, shows as image)

---

## 7. JavaScript Behaviors & Third-Party Integrations

| Library / Feature | Evidence |
|-------------------|----------|
| **Flickity** (carousel) | `t4s_bk_flickity`, `t4s-flicky-slider` classes everywhere |
| **Swiper** (v11.2.10) | Imported in CSS sources (may be used for mobile sliders) |
| **PhotoSwipe** | `pswp`, `pswp__button`, `pswp__share-tooltip` classes |
| **Ryviu Reviews** | `ryviu-collection`, `<ryviu-widget-total>` Web Component |
| **EcomRise Sales Notification** | `<er-sales-notification>` Web Component |
| **Lazy Loading** | Custom `lazyloadt4s` class system with loader shimmer |
| **AJAX Cart** | Cart count badge updates without page reload |
| **AJAX Filters** | Sidebar filter loads via fetch (loading placeholder) |
| **Sticky Header** | Intersection Observer on `#t4s-hsticky__sentinel` |
| **Back to Top** | Scroll-based opacity reveal + SVG circular progress |

---

## 8. Accessibility

- Skip-to-content link: `a.skip-to-content-link.visually-hidden`
- ARIA labels on cart count, search, back-to-top
- Breadcrumb: `role="navigation"`, `aria-label="breadcrumbs"`
- Icon SVGs marked `aria-hidden="true"` + `role="presentation"`
- PhotoSwipe share button has semantic `button` element

---

## 9. Responsive Breakpoints (Inferred from Classes)

| Class suffix | Breakpoint |
|-------------|------------|
| (none) | Mobile-first base |
| `-md-` | Medium (tablet ~768px) |
| `-lg-` | Large (desktop ~992px) |

Key responsive behaviors:
- Sidebar: `t4s-col-lg-3` (desktop) / `t4s-dn` (hidden mobile)
- Logo text: `t4s-d-none` default, shows at breakpoint
- Sort label: `t4s-d-none t4s-d-md-block` (full text desktop only)
- Navigation: collapses to drawer/hamburger on mobile

---

## 10. Key CSS Class Reference for Replication

```
Layout utilities:
  t4s-container        — max-width container
  t4s-row              — flex row (like Bootstrap row)
  t4s-col-12           — full width column
  t4s-col-lg-3/9       — responsive columns
  t4s-d-flex           — display: flex
  t4s-d-none           — display: none
  t4s-d-md-block       — display: block at md+
  t4s-pa               — position: absolute
  t4s-pf               — position: fixed
  t4s-pr               — position: relative
  t4s-oh               — overflow: hidden
  t4s-op-0             — opacity: 0
  t4s-ts-op            — transition: opacity
  t4s-pe-none          — pointer-events: none
  t4s-z-100            — z-index: 100
  t4s-w-100            — width: 100%
  t4s-lh-1             — line-height: 1
  t4s-dn               — display: none (mobile)
  t4s-full-width-link  — absolute fill anchor link
  t4s-text-center      — text-align: center
  t4s-text-start       — text-align: start
  t4s-text-md-start    — text-align: start at md+
  t4s-align-items-center — align-items: center
  t4s-justify-content-between — justify-content: space-between
  t4s-fnt-fm-inherit   — font-family: inherit

Product-specific:
  t4s-product          — product card root
  t4s-pr-grid          — grid display mode
  t4s-pr-style1        — style variant 1
  t4s_ratio / t4s-oh   — aspect-ratio image container
  lazyloadt4s          — lazy load trigger class
  lazyloadt4s-loader   — shimmer loader element
  t4s-skeleton-element — skeleton placeholder
  ske-shine            — shimmer animation
```


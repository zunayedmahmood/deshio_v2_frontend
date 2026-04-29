# Errum V2 E-Commerce: Colour Palette Overhaul & Design Upgrade Guide

**Date:** April 10, 2026  
**Scope:** Full E-Commerce Module — `app/e-commerce/**` + `components/ecommerce/**`  
**Stack:** Next.js 15, React 19, Tailwind CSS 4, globals.css  
**Reference site studied:** splayd.com.bd (light base, clean cards, strong accent logic)

---

> **How to use this document:** Each numbered section is a self-contained prompt chunk. Feed one section at a time to AI when implementing. The palette section (Section 0) must be implemented first — all other sections depend on it.

---

## Section 0 — Global Colour Palette Overhaul (`globals.css`)

### Design Direction

Moving away from pitch-black dominance toward a **"Dark Ivory"** aesthetic:  
a rich, warm near-dark background that reads as dark but avoids harshness. Think **aged parchment at midnight** — deep but not void. Large content areas get breathing room with off-white/ivory surfaces. Cyan enters as the brand accent (client logo), harmonising with the existing gold rather than competing with it. Gold shifts to a support/highlight role for price and CTA details.

The reference site (splayd.com.bd) teaches us: **clean card surfaces, strong accent isolation, no visual noise in the base**. We take that discipline but apply it to a dark-luxury direction.

### New CSS Variable Definitions

Replace all existing `--gold`, `--ink-black`, and related tokens in `globals.css` with the following complete set:

```css
/* ============================================================
   ERRUM V2 — NEW DESIGN TOKEN SET
   Replace existing :root block entirely
   ============================================================ */
:root {

  /* --- Base Backgrounds --- */
  --bg-root:        #111210;   /* Deep warm-charcoal. Not pure black. Replaces --ink-black */
  --bg-depth:       #0e0e0c;   /* Slightly deeper, used for nav, footer, sidebars */
  --bg-surface:     #1c1c19;   /* Card and panel base. Warm dark, not grey */
  --bg-surface-2:   #242420;   /* Hover/active state for surfaces */
  --bg-lifted:      #2a2a26;   /* Elevated elements: modals, dropdowns */

  /* --- Ivory / Off-white Surfaces (replaces pure-white usage) --- */
  --ivory:          #f5f0e8;   /* Primary off-white. Used for section dividers, feature panels */
  --ivory-dim:      #e8e2d6;   /* Secondary off-white, borders on light elements */
  --ivory-ghost:    rgba(245, 240, 232, 0.06);  /* Subtle tint for card hover overlays */
  --ivory-border:   rgba(245, 240, 232, 0.10);  /* Default border color on dark surfaces */
  --ivory-muted:    rgba(245, 240, 232, 0.45);  /* Secondary text, metadata, labels */
  --ivory-faint:    rgba(245, 240, 232, 0.18);  /* Dividers, skeleton backgrounds */

  /* --- Cyan (Brand Primary) --- */
  --cyan:           #00c4cc;   /* Brand cyan from client logo — primary interactive accent */
  --cyan-bright:    #00dde6;   /* Hover state for cyan elements */
  --cyan-dim:       #00a8b0;   /* Active/pressed state */
  --cyan-pale:      rgba(0, 196, 204, 0.12);   /* Cyan-tinted surface, e.g. active tab bg */
  --cyan-glow:      rgba(0, 196, 204, 0.20);   /* Glow effect for focus rings, live badges */
  --cyan-border:    rgba(0, 196, 204, 0.30);   /* Cyan-accent borders */

  /* --- Gold (Support / Price / Luxury Detail) --- */
  --gold:           #c49a4a;   /* Refined from #b07c3a — warmer, less orange */
  --gold-bright:    #ddb96a;   /* Hover on gold elements */
  --gold-dim:       #a07838;   /* Active/pressed gold */
  --gold-pale:      rgba(196, 154, 74, 0.12);  /* Gold-tinted surfaces */
  --gold-glow:      rgba(196, 154, 74, 0.20);  /* Gold glow for urgency badges */
  --gold-border:    rgba(196, 154, 74, 0.28);  /* Gold accent borders */

  /* --- Semantic / Status --- */
  --status-success: #2ecc8a;   /* In-stock, delivered, success */
  --status-warning: #e6a817;   /* Low stock, amber urgency */
  --status-danger:  #e05252;   /* Out of stock, error, critical */
  --status-info:    var(--cyan);

  /* --- Typography Scale --- */
  --text-primary:   #f0ebe0;   /* Primary body text — warm off-white, not stark white */
  --text-secondary: rgba(240, 235, 224, 0.60);  /* Subtext, metadata */
  --text-muted:     rgba(240, 235, 224, 0.35);  /* Placeholder, disabled text */
  --text-inverse:   #111210;   /* Text on light/ivory surfaces */

  /* --- Borders & Dividers --- */
  --border-default: rgba(240, 235, 224, 0.08);   /* Standard card borders */
  --border-strong:  rgba(240, 235, 224, 0.16);   /* Emphasized borders */
  --border-cyan:    var(--cyan-border);
  --border-gold:    var(--gold-border);

  /* --- Shadows --- */
  --shadow-card:    0 2px 16px rgba(0, 0, 0, 0.32), 0 1px 4px rgba(0, 0, 0, 0.20);
  --shadow-lifted:  0 8px 32px rgba(0, 0, 0, 0.48), 0 2px 8px rgba(0, 0, 0, 0.24);
  --shadow-cyan:    0 0 20px rgba(0, 196, 204, 0.15);
  --shadow-gold:    0 0 16px rgba(196, 154, 74, 0.15);

  /* --- Radii --- */
  --radius-sm:  6px;
  --radius-md:  10px;
  --radius-lg:  16px;
  --radius-xl:  24px;
  --radius-pill: 999px;

  /* --- Transitions --- */
  --ease-smooth:   cubic-bezier(0.32, 0.72, 0, 1);   /* Existing magnetic ease — keep */
  --ease-bounce:   cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out:      cubic-bezier(0.0, 0.0, 0.3, 1);   /* From reference site */
  --transition-fast:   100ms var(--ease-smooth);
  --transition-base:   220ms var(--ease-smooth);
  --transition-slow:   380ms var(--ease-smooth);
}
```

### Global Class Updates

Update the following base utility classes in `globals.css`:

```css
/* Root container — warmer base replaces pure black */
.ec-root {
  background-color: var(--bg-root);
  color: var(--text-primary);
  /* Retain existing atmospheric glows and grid texture — do NOT remove */
}

/* Surface class — now uses warm dark instead of near-black */
.ec-surface {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-default);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* Card base — add radius + refined shadow */
.ec-card {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  transition: border-color var(--transition-base),
              box-shadow var(--transition-base),
              transform var(--transition-base);
}

.ec-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-lifted);
}

/* Ivory section — for alternating light panels on homepage etc. */
.ec-panel-ivory {
  background-color: var(--ivory);
  color: var(--text-inverse);
}

/* Cyan accent button */
.ec-btn-primary {
  background-color: var(--cyan);
  color: var(--bg-root);
  border-radius: var(--radius-sm);
  font-weight: 600;
  transition: background-color var(--transition-fast),
              box-shadow var(--transition-fast),
              transform var(--transition-fast);
}
.ec-btn-primary:hover {
  background-color: var(--cyan-bright);
  box-shadow: var(--shadow-cyan);
}
.ec-btn-primary:active {
  background-color: var(--cyan-dim);
  transform: scale(0.97);
}

/* Gold accent button (price CTAs, premium highlights) */
.ec-btn-gold {
  background-color: var(--gold);
  color: var(--bg-root);
  border-radius: var(--radius-sm);
  font-weight: 600;
  transition: background-color var(--transition-fast),
              box-shadow var(--transition-fast);
}
.ec-btn-gold:hover {
  background-color: var(--gold-bright);
  box-shadow: var(--shadow-gold);
}

/* Ghost/outline button */
.ec-btn-ghost {
  background-color: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  transition: border-color var(--transition-fast),
              background-color var(--transition-fast);
}
.ec-btn-ghost:hover {
  border-color: var(--cyan-border);
  background-color: var(--cyan-pale);
  color: var(--cyan);
}

/* Live / urgency badge */
.ec-badge-live {
  background-color: var(--cyan-pale);
  border: 1px solid var(--cyan-border);
  color: var(--cyan);
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-cyan);
}

/* Urgency / low stock badge */
.ec-badge-urgent {
  background-color: var(--gold-pale);
  border: 1px solid var(--gold-border);
  color: var(--gold-bright);
  border-radius: var(--radius-pill);
}
```

### Background Atmospheric Glow Update

The existing glow blobs should update their colors to match the new palette. In the layout component where glow blobs are rendered:

```css
/* Glow blob 1 — Cyan (replace existing gold blob) */
.ec-glow-1 {
  background: radial-gradient(ellipse at 30% 20%, rgba(0, 196, 204, 0.08) 0%, transparent 60%);
}

/* Glow blob 2 — Gold (keep, but subtler) */
.ec-glow-2 {
  background: radial-gradient(ellipse at 70% 80%, rgba(196, 154, 74, 0.06) 0%, transparent 55%);
}
```

### Migration Notes
- Every existing `#0d0d0d` → replace with `var(--bg-root)`
- Every existing `--gold` usage that was a **button/CTA** → replace with `var(--cyan)` 
- Every existing `--gold` usage that was a **price or luxury highlight** → keep as `var(--gold)` (new value)
- Every existing `rgba(255,255,255,0.XX)` border/text → replace with equivalent `var(--ivory-*)` token
- All `text-white` Tailwind classes on body text → replace with a custom `text-[var(--text-primary)]` or add a utility class `.ec-text` to globals

---

## Section 1 — `PremiumProductCard.tsx` (Design Standardisation)

### Goal
The card is the most-rendered component. It has visual inconsistencies across pages (different border treatments, mismatched hover states, varying image aspect ratios). This section standardises it and makes it feel consistently live and premium.

### Colour & Visual Changes

**Card Shell:**
- Background: `var(--bg-surface)`
- Border: `1px solid var(--border-default)` — consistent across all usage contexts
- Border-radius: `var(--radius-md)` — `10px`, same everywhere. No more flat-edged variants unless explicitly `compact` mode
- On hover: border transitions to `var(--border-strong)`, card lifts `translateY(-3px)`, shadow deepens to `var(--shadow-lifted)`

**Product Image Container:**
- Aspect ratio: locked to `aspect-[3/4]` on all breakpoints (portrait card, consistent across grid)
- Background: `var(--bg-depth)` while loading (not transparent — prevents white flash on slow load)
- Image `object-fit: cover`, `object-position: center top` (shows face/top of garment, not feet)

**Product Name:**
- Font: *Cormorant Garamond* (existing), `16px` desktop, `14px` mobile
- Colour: `var(--text-primary)`
- Overflow: `line-clamp-2` — max two lines, consistent height

**Price:**
- Single price: `var(--gold)` — the gold is reserved for price across the whole site
- Range price: lower bound in `var(--gold)`, dash + upper bound in `var(--text-secondary)`
- Sale/promotional price: sale price in `var(--gold)`, original in `var(--text-muted)` with `line-through`

**Category / Vendor Label:**
- Colour: `var(--text-muted)`
- Font: *DM Mono* (existing), `11px`
- Uppercase, `letter-spacing: 0.08em`

**Action Bar (Hover reveal on desktop, persistent on mobile):**
- Background: `linear-gradient(to top, var(--bg-depth) 0%, transparent 100%)`
- "Choose Options" button: use `.ec-btn-primary` (cyan) — this is the primary CTA, it gets the brand accent
- Height: `56px` on desktop, `48px` on mobile

**Badges (top-left stacking):**
- New: `background: var(--cyan-pale)`, `border: 1px solid var(--cyan-border)`, text `var(--cyan)`, `border-radius: var(--radius-pill)`
- Sale: `background: var(--gold-pale)`, `border: 1px solid var(--gold-border)`, text `var(--gold-bright)`
- Low Stock (🔥): `background: rgba(224, 82, 82, 0.12)`, `border: 1px solid rgba(224, 82, 82, 0.28)`, text `#e88`
- Badges stack vertically with `4px` gap, `top: 10px left: 10px`

**Wishlist Heart:**
- Default: `var(--text-muted)` 
- Active/filled: `var(--gold)` — gold heart, intentionally warm and premium
- Tap animation: scale 1 → 1.4 → 1, duration 280ms, `var(--ease-bounce)`

**Variant Count Pill ("+12 sizes"):**
- Bottom of image, semi-transparent: `background: rgba(17,18,16, 0.72)`, `backdrop-filter: blur(8px)`
- Text: `var(--ivory-muted)`, *DM Mono*, `11px`
- Border-radius: `var(--radius-sm)`

### CSS / Tailwind Implementation Snippet

```tsx
// PremiumProductCard.tsx — class structure reference

// Card shell
<article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-md)] 
  bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-[var(--shadow-card)]
  transition-all duration-[220ms] ease-[var(--ease-smooth)]
  hover:-translate-y-[3px] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-lifted)]">

  {/* Image */}
  <div className="relative aspect-[3/4] bg-[var(--bg-depth)] overflow-hidden">
    <Image fill className="object-cover object-top transition-transform duration-500 
      group-hover:scale-105" ... />
    {/* Badges */}
    <div className="absolute top-[10px] left-[10px] flex flex-col gap-1 z-10">
      {isNew && <span className="ec-badge-live text-[11px] px-2 py-0.5 font-medium">New</span>}
      {isOnSale && <span className="ec-badge-urgent text-[11px] px-2 py-0.5">Sale</span>}
    </div>
    {/* Variant count */}
    {variantCount > 1 && (
      <span className="absolute bottom-2 right-2 text-[11px] font-mono 
        bg-[rgba(17,18,16,0.72)] backdrop-blur-md px-2 py-0.5 rounded-[var(--radius-sm)]
        text-[var(--ivory-muted)]">+{variantCount - 1} sizes</span>
    )}
  </div>

  {/* Info */}
  <div className="flex flex-col gap-1 p-3">
    <p className="text-[11px] uppercase tracking-[0.08em] font-mono text-[var(--text-muted)]">
      {category}
    </p>
    <h3 className="text-[14px] md:text-[16px] font-[Cormorant_Garamond] 
      text-[var(--text-primary)] line-clamp-2 leading-snug">{name}</h3>
    <p className="text-[14px] text-[var(--gold)] font-medium mt-0.5">{price}</p>
  </div>

  {/* Action bar — desktop hover / mobile persistent */}
  <div className="absolute bottom-0 inset-x-0 h-[56px] 
    bg-gradient-to-t from-[var(--bg-depth)] to-transparent
    flex items-end pb-3 px-3
    translate-y-full group-hover:translate-y-0
    transition-transform duration-[320ms] ease-[var(--ease-smooth)]
    md:translate-y-full
    [@media(hover:none)]:translate-y-0 [@media(hover:none)]:relative 
    [@media(hover:none)]:h-auto [@media(hover:none)]:bg-none [@media(hover:none)]:pt-0">
    <button className="ec-btn-primary w-full text-[13px] h-[40px]">Choose Options</button>
  </div>
</article>
```

### Consistency Rules (Apply Everywhere the Card is Used)
- `compact` mode: same border-radius, same colours, just smaller padding (`p-2`) and smaller image (`aspect-square`)
- Grid pages: always 2-col on mobile, 3-col on tablet, 4-col on desktop
- The card must never appear on a pure `#000` background — always on `var(--bg-root)` or `var(--bg-surface)` minimum

---

## Section 2 — Navigation (`Navigation.tsx`)

### Colour Changes
- Nav bar background: `var(--bg-depth)` with `border-bottom: 1px solid var(--border-default)` — subtle separation from page
- Logo: if text-based, use *Cormorant Garamond* with the brand cyan `var(--cyan)` for any icon/accent element in it
- Nav links (desktop): `var(--text-secondary)` default, `var(--text-primary)` on hover, no underline — use a thin `var(--cyan)` underline on active route
- Cart badge: background `var(--cyan)`, text `var(--bg-root)` — this is the primary live indicator, it gets cyan
- Search icon: `var(--text-secondary)`, hover `var(--cyan)`
- Mega-menu dropdown: `background: var(--bg-lifted)`, `border: 1px solid var(--border-strong)`, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-lifted)`
- Sub-category pills in mega-menu: `background: var(--bg-surface-2)` default, `background: var(--cyan-pale)` + `border: var(--cyan-border)` on hover

### Active Route Indicator
```css
.nav-link-active {
  color: var(--cyan);
  position: relative;
}
.nav-link-active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0; right: 0;
  height: 2px;
  background: var(--cyan);
  border-radius: 2px;
}
```

### Mobile Drawer
- Drawer background: `var(--bg-depth)` 
- Handle bar (drag indicator): `var(--border-strong)`
- Category items: left-border `3px solid transparent` default, `3px solid var(--cyan)` on active
- Bottom of drawer: show a thin strip with brand store locations in `var(--text-muted)` *DM Mono* font

---

## Section 3 — Category / Listing Page (`[slug]/page.tsx` + `SubcategoryProductTabs.tsx`)

### Page Background
- Page root: `var(--bg-root)`
- Category hero banner area: `var(--bg-depth)` with a subtle bottom fade into `var(--bg-root)` — creates depth without a hard line

### SubcategoryTabs
- Tab container: `background: var(--bg-surface)`, `border-bottom: 1px solid var(--border-default)`
- Inactive tab: `color: var(--text-secondary)`, `background: transparent`
- Active tab: `color: var(--cyan)`, `background: var(--cyan-pale)`, `border-radius: var(--radius-sm)`
- Active indicator bar: `2px` bottom border in `var(--cyan)` (not gold — cyan owns navigation/selection)
- Tab hover: `color: var(--text-primary)`, `background: var(--ivory-ghost)`

### Filter / Sort Controls
- Filter pill button (mobile): `background: var(--bg-lifted)`, `border: 1px solid var(--border-strong)`, `color: var(--text-primary)`
- Active filter chips: `background: var(--cyan-pale)`, `border: 1px solid var(--cyan-border)`, `color: var(--cyan)`
- Sort dropdown: same surface treatment as mega-menu — `var(--bg-lifted)` with `var(--border-strong)`

### Urgency Signals (colours)
- Low stock `🔥` badge: red-amber variant (see card badge spec above)
- "X sold" ghost text: `var(--text-muted)`, `font-mono`
- New arrival dot: `var(--status-success)` pulsing dot — green for freshness, separate from brand cyan

### Empty State
- Icon: `var(--text-muted)` opacity, large (80px)
- "Nothing here yet" text: `var(--text-secondary)`
- CTA: `.ec-btn-ghost`

---

## Section 4 — Product Detail Page (`product/[id]/page.tsx`)

### Page Layout Background
- Page: `var(--bg-root)`
- Product section: no explicit surface — the content floats on root
- Related products section at bottom: use `var(--bg-surface)` as a full-width band to visually separate it from the main content — creates a "shelf" feel

### Image Gallery
- Container background: `var(--bg-depth)` — makes the product image pop
- Thumbnail strip: `var(--bg-surface)` background, active thumbnail gets `border: 2px solid var(--cyan)`
- Mobile carousel dots: active dot `var(--cyan)`, inactive `var(--border-strong)`

### Variant Selectors
- Colour swatches: active state: `ring-2 ring-offset-2 ring-[var(--cyan)]` — cyan ring, not gold
- Size chips: `background: var(--bg-surface-2)`, `border: 1px solid var(--border-default)`, `color: var(--text-primary)`
  - Active: `background: var(--cyan-pale)`, `border: 1px solid var(--cyan)]`, `color: var(--cyan)`
  - Out of stock: `opacity: 0.35`, diagonal CSS strikethrough overlay

### Urgency Block (Viewer Count + Stock Bar)
- Viewer count: use `.ec-badge-live` — cyan tinted, with a `●` pulsing dot in `var(--cyan)` before the text
- Stock bar track: `background: var(--bg-lifted)`, `border-radius: var(--radius-pill)`, height `6px`
- Stock bar fill:
  - `> 20` units: `var(--status-success)` (green)
  - `6–20` units: `var(--status-warning)` (amber)
  - `1–5` units: animate between `var(--status-warning)` and `var(--status-danger)` with a subtle CSS `@keyframes pulse-color`
- Urgency text below bar: `var(--gold-bright)` for "Selling fast", `var(--status-danger)` for "Almost gone"

### Add to Cart Button
- Main CTA: `.ec-btn-primary` (cyan) — **this is the most important button on the site, it gets the brand colour**
- "Added!" success state: brief background flash to `var(--status-success)`, then return to cyan
- Spinner: white/ivory on cyan background

### Sticky Bottom Bar (Mobile)
- Background: `var(--bg-depth)` with `border-top: 1px solid var(--border-strong)`, `backdrop-filter: blur(16px)`
- Price in bar: `var(--gold)` 
- CTA in bar: `.ec-btn-primary` full-width

### Breadcrumb
- Text: `var(--text-muted)` *DM Mono* `11px`
- Separator `›`: `var(--border-strong)`
- Current page: `var(--text-secondary)`

### Recently Viewed Strip
- Section background: `var(--bg-surface)` band
- Section label: `var(--text-muted)` *DM Mono* uppercase
- Cards: standard `PremiumProductCard` compact mode

---

## Section 5 — Cart Sidebar (`CartSidebar.tsx`)

### Background & Shell
- Sidebar panel: `background: var(--bg-depth)`, `border-left: 1px solid var(--border-default)`
- Header ("Your Bag"): use *Cormorant Garamond* for the title, `var(--text-primary)`
- Backdrop overlay: `rgba(17, 18, 16, 0.70)` with `backdrop-filter: blur(4px)` — warmer than pure black overlay

### Cart Items
- Item row: `background: var(--bg-surface)`, `border-radius: var(--radius-md)`, `border: 1px solid var(--border-default)`
- Product name: `var(--text-primary)`, `Jost`, `14px`
- SKU / variant detail: `var(--text-muted)`, *DM Mono*, `11px`
- Price per item: `var(--gold)`
- Quantity stepper buttons (`+` / `−`): `background: var(--bg-lifted)`, `border: 1px solid var(--border-strong)`, `color: var(--text-primary)`, `border-radius: var(--radius-sm)`
- Quantity value: `var(--text-primary)`, `font-weight: 600`
- Remove icon: `var(--text-muted)`, hover `var(--status-danger)`

### Stock Warning
- Item border changes to `1px solid rgba(224, 82, 82, 0.4)` 
- Warning text below item: `var(--status-danger)`, `12px`

### Footer (Subtotal + Checkout)
- Divider above footer: `1px solid var(--border-default)`
- "Subtotal" label: `var(--text-secondary)`
- Subtotal amount: `var(--text-primary)`, `Cormorant Garamond`, `20px`
- Delivery note: `var(--text-muted)`, `12px`
- Checkout button: `.ec-btn-primary` full-width — cyan

### Empty State
- Ghost bag icon: `var(--text-muted)`, `56px`
- Message: `var(--text-secondary)`
- "Start Shopping" CTA: `.ec-btn-ghost`

---

## Section 6 — Checkout (`CheckoutClient.tsx`)

### Step Progress Bar
- Track: `var(--bg-lifted)`
- Completed fill: `var(--cyan)`
- Completed step dot: `var(--cyan)` with a `✓` in `var(--bg-root)`
- Active step dot: `var(--cyan-pale)` background, `var(--cyan)` border, `var(--cyan)` text
- Inactive step: `var(--text-muted)`
- Connector line: `var(--border-default)`

### Form Fields
- Input background: `var(--bg-surface-2)`
- Input border: `1px solid var(--border-strong)`
- Input border on focus: `1px solid var(--cyan)`, `box-shadow: 0 0 0 3px var(--cyan-glow)`
- Input text: `var(--text-primary)`
- Label: `var(--text-secondary)`, `12px`, `font-weight: 500`
- Error border: `1px solid var(--status-danger)`
- Error text: `var(--status-danger)`, `12px`
- Placeholder: `var(--text-muted)`

### Order Summary Panel
- Panel: `background: var(--bg-surface)`, `border: 1px solid var(--border-default)`, `border-radius: var(--radius-lg)`
- Item name: `var(--text-primary)`, `14px`
- Item price: `var(--gold)`
- Total row: `border-top: 1px solid var(--border-strong)`, total amount in `var(--text-primary)`, `Cormorant Garamond`, `20px`
- Promo/discount row: `var(--status-success)` text

### SSLCommerz Overlay
- Full-screen: `background: var(--bg-depth)` at `95%` opacity, `backdrop-filter: blur(8px)`
- Spinner: `var(--cyan)` ring
- "Taking you to secure payment..." text: `var(--text-secondary)`
- Lock icon: `var(--status-success)` (green = trust signal)

---

## Section 7 — Homepage (`app/e-commerce/page.tsx`)

### Overall Rhythm — Light/Dark Alternation
The homepage should alternate between dark and semi-light sections rather than being uniformly dark. This creates visual breathing room and prevents the "endless black pit" feel the client wants to move away from.

Proposed section background sequence:
1. Hero: `var(--bg-root)` (dark, atmospheric)
2. New Arrivals Ticker: `var(--bg-depth)` (slightly deeper, contained strip)
3. New Arrivals Grid: `var(--bg-root)`
4. Featured / Collection Tiles: **`var(--ivory)` with `var(--text-inverse)`** — this is the big contrast moment, an ivory section mid-page. Feels like a magazine editorial break.
5. Instagram Reels / Social Proof: `var(--bg-surface)` (subtle lift)
6. Trust/Footer lead-in: `var(--bg-depth)`

### Hero Section
- Atmospheric glows: update to use new `var(--cyan-glow)` + `var(--gold-glow)` (already spec'd in Section 0)
- Hero headline: *Cormorant Garamond*, `var(--text-primary)`
- Hero CTA primary: `.ec-btn-primary` (cyan)
- Hero CTA secondary: `.ec-btn-ghost`

### New Arrivals Ticker Strip
- Background: `var(--bg-depth)`
- Text: `var(--text-muted)` for label, `var(--text-secondary)` for product names in ticker
- Separator dot: `var(--cyan)` — the brand colour punctuates the flow

### New Arrivals / Featured Grid
- Section header label (*DM Mono*, uppercase): `var(--cyan)` for the category label, `var(--text-primary)` for the section title
- "View All" link: `var(--cyan)` with `→` arrow, hover underline in `var(--cyan)`
- Cards: standard `PremiumProductCard` spec from Section 1

### Collection / Category Tiles (the Ivory Panel)
When this section uses the ivory background:
- Tile card: `background: var(--ivory-dim)`, `border: 1px solid rgba(17,18,16, 0.10)`
- Tile title overlay: `color: var(--text-inverse)` (dark on light)
- Hover overlay: `rgba(17,18,16,0.12)` darkening
- CTA chip on tile: `background: var(--bg-root)`, `color: var(--ivory)` — inverted for contrast

### Instagram Reels Viewer
- Keep the 3D carousel behaviour unchanged (it's a signature feature)
- Update the reel container border to `var(--border-default)` 
- Active reel indicator: `var(--cyan)` dot

### Section Reveal Animations
- Retain the existing `SectionReveal` / `ec-anim-fade-up` — these are confirmed working and valued
- Update: the animation should combine `opacity 0→1` with `translateY 16px→0` (existing may only do one — ensure both)

---

## Section 8 — My Account (`/my-account/**`)

### Account Sidebar (Desktop)
- Background: `var(--bg-depth)` 
- Active nav item: left border `3px solid var(--cyan)`, text `var(--cyan)`, background `var(--cyan-pale)`
- Inactive: `var(--text-secondary)`, hover `var(--text-primary)` + `var(--ivory-ghost)` bg
- User avatar placeholder: gradient `from-[var(--cyan-dim)] to-[var(--gold-dim)]`

### Mobile Bottom Tabs
- Tab bar: `background: var(--bg-depth)`, `border-top: 1px solid var(--border-default)`
- Active tab icon + label: `var(--cyan)`
- Inactive: `var(--text-muted)`

### Order Cards
- Card: standard `.ec-card` treatment
- Status pill colours:
  - Processing: `background: rgba(230, 168, 23, 0.12)`, `color: var(--status-warning)`, `border: 1px solid rgba(230,168,23,0.28)`
  - Shipped: `background: var(--cyan-pale)`, `color: var(--cyan)`, `border: var(--cyan-border)` — brand cyan for active movement
  - Delivered: `background: rgba(46, 204, 138, 0.12)`, `color: var(--status-success)`, `border: 1px solid rgba(46,204,138,0.28)`
  - Cancelled: `background: rgba(224, 82, 82, 0.12)`, `color: var(--status-danger)`, `border: 1px solid rgba(224,82,82,0.28)`

### Order Timeline
- Track line: `var(--bg-lifted)` 
- Completed step: `var(--status-success)` fill
- Active step: `var(--cyan)` with subtle `var(--cyan-glow)` shadow
- Future step: `var(--bg-lifted)` fill, `var(--border-strong)` dot outline
- Timeline text: `var(--text-secondary)`, active step text `var(--cyan)`

### Payment Success Animation
- Full-screen background: `var(--bg-root)` 
- SVG checkmark stroke: `var(--status-success)` drawing in over 600ms
- "Order Placed!" text: *Cormorant Garamond*, `var(--text-primary)`
- Order ID in *DM Mono*: `var(--cyan)`

---

## Section 9 — Footer (`Footer.tsx`)

### Background
- Footer: `var(--bg-depth)`, `border-top: 1px solid var(--border-default)`

### Colour Updates
- Store card borders: `var(--border-default)`, hover `var(--cyan-border)` — subtle cyan highlight on hover signals interactivity
- Store names: `var(--text-primary)`, *Jost* semi-bold
- Phone/map links: `var(--cyan)` — interactive elements always get the brand accent
- Promise section icons: `var(--gold)` — gold for quality/trust signals
- Social icons default: `var(--text-muted)`, hover: platform colour (existing values in design tokens are usable, e.g. `--instagram-cl`)
- Copyright line: `var(--text-muted)`, *DM Mono*, `11px`

---

## Appendix A — Colour Role Reference Card

> Quick lookup for developers implementing any component.

| Context | Colour Variable |
|---|---|
| Page / root background | `--bg-root` |
| Card / panel background | `--bg-surface` |
| Elevated element (modal, dropdown) | `--bg-lifted` |
| Nav / footer / sidebar background | `--bg-depth` |
| Light / ivory panel sections | `--ivory` |
| Primary body text | `--text-primary` |
| Secondary / subtext | `--text-secondary` |
| Muted / disabled / metadata | `--text-muted` |
| Text on ivory/light backgrounds | `--text-inverse` |
| **Primary CTA (buttons, links, active states)** | **`--cyan`** |
| Active tab / selection indicator | `--cyan` |
| Focus ring | `--cyan-glow` |
| Live / viewer badge | `--cyan-pale` + `--cyan-border` |
| **Price display** | **`--gold`** |
| CTA secondary (Add to Wishlist, premium detail) | `--gold` |
| Low stock urgency | `--gold-bright` / `--status-warning` |
| Critical urgency (almost gone, error) | `--status-danger` |
| Success (in stock, delivered, confirmed) | `--status-success` |
| Default borders | `--border-default` |
| Emphasized borders | `--border-strong` |

---

## Appendix B — What Is NOT Changing

To be explicit — the following are confirmed working and must be preserved:

- **Atmospheric glow blobs** — update colours to new tokens, but keep the effect
- **56×56 grid texture** on `.ec-root` — keep
- **SectionReveal / IntersectionObserver animations** — keep, refine colours only
- **Instagram Reels 3D carousel** — keep, CSS perspective unchanged
- **New Arrivals infinite ticker** — keep, update text colours only
- **Cormorant Garamond / Jost / DM Mono** typography stack — keep all three
- **`--ease-smooth` cubic-bezier(0.32, 0.72, 0, 1)** — keep (it's the signature feel)
- **Mother-Child grouping + variant counter pill** — keep, update pill colours to new tokens
- **`ec-anim-fade-up` + staggered card entrances** — keep

---

*End of Design Upgrade Document*

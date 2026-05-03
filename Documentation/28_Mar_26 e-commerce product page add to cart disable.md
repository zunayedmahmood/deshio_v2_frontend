# E-Commerce Product Page: Available Inventory & Add-to-Cart Gate

**Date:** 28 Mar 2026  
**Files Changed:**
- `Deshio_be/app/Http/Controllers/EcommerceCatalogController.php`
- `app/e-commerce/product/[id]/page.tsx`

---

## Overview

The product detail page now surfaces **available inventory** (i.e. total stock minus reserved orders) instead of raw batch stock. This ensures customers cannot add items to cart that are already fully reserved for pending orders.

---

## Backend Changes (`EcommerceCatalogController.php`)

### `getProduct()` — Main Product

After fetching the product, a lookup is made to `reserved_products`:

```php
$mainReserved = \App\Models\ReservedProduct::where('product_id', $product->id)->first();
$availableInventory = $mainReserved
    ? (int) $mainReserved->available_inventory
    : $totalStock; // safe fallback for products without a reserved_products row
```

The response now includes `available_inventory` alongside `stock_quantity`:

```php
'stock_quantity'      => $totalStock,
'available_inventory' => $availableInventory,
'in_stock'            => $totalStock > 0,
```

### `getProduct()` — Variants Map

Each sibling variant also gets `available_inventory` resolved per-variant:

```php
$variantReserved = \App\Models\ReservedProduct::where('product_id', $variant->id)->first();
$variantAvailableInventory = $variantReserved
    ? (int) $variantReserved->available_inventory
    : $variantStock;
// ...
'available_inventory' => $variantAvailableInventory,
```

### Edge Cases

| Scenario | Behaviour |
|---|---|
| No `reserved_products` row for product | `available_inventory` falls back to `stock_quantity` — no change in UX |
| `available_inventory = 0`, but `stock_quantity > 0` | Stock is fully reserved; button disabled, red badge shown |
| `stock_quantity = 0` | `OUT OF STOCK` still shown (product is truly out) |

---

## Frontend Changes (`product/[id]/page.tsx`)

### `ProductVariant` Interface
```ts
available_inventory: number | null; // from reserved_products — drives button & badge
```

### `buildVariantFromAny` (variant mapping)
```ts
available_inventory: variant?.available_inventory != null
  ? Number(variant.available_inventory)
  : Number(variant?.stock_quantity || 0),
```

### Derived Value
```ts
const availableInventory = Number(selectedVariant.available_inventory ?? stockQty);
```

### Stock Status Badge

Three states now:
1. **`AVAILABLE FOR ORDER · IN STOCK (N)`** — green, stock available for ordering
2. **`ALL STOCK RESERVED`** — red, product has stock but all is reserved for pending orders
3. **`OUT OF STOCK`** — red, no batch stock at all

### Add-to-Cart Button

```tsx
disabled={!selectedVariant.in_stock || isAdding || availableInventory <= 0}
// Text:
{isAdding ? 'Added ✓' : availableInventory <= 0 ? 'All stock already reserved' : 'Add to Cart'}
```

- When disabled due to reservation: opacity 0.4, `cursor: not-allowed`
- Gold glow box-shadow removed when reserved (visual feedback)

### `handleAddToCart` Guard
```ts
if (currentAvailable <= 0) return;
```

### Quantity Stepper Cap
```ts
const availQty = Number(selectedVariant.available_inventory ?? selectedVariant.stock_quantity ?? 0);
if (newQuantity >= 1 && newQuantity <= availQty) { ... }
```
Prevents quantity from going above available (non-reserved) stock.

---

## What Is NOT Changed

- Branch-wise inventory section — untouched
- `stock_quantity` field — still returned for reference, only `available_inventory` drives UX
- Cart backend validation — not changed (handled separately by reservation logic)

# Social Commerce Page: Prevent Reserved Stock Selling

**Date:** 28 Mar 2026  
**Files Changed:**
- `Deshio_be/app/Http/Controllers/EcommerceCatalogController.php`
- `app/social-commerce/page.tsx`

---

## Overview

The social commerce product search grid now reflects available (non-reserved) inventory. Products with `available_inventory = 0` are visually disabled and non-interactive, preventing staff from accidentally placing orders against fully-reserved stock.

---

## Backend Changes (`EcommerceCatalogController.php`)

### `formatProductForApi()` — used by both grouped and flat list/search endpoints

A `reserved_products` lookup is now performed for every product in list and search results:

```php
$reservedRow = \App\Models\ReservedProduct::where('product_id', $product->id)->first();
$availableInventory = $reservedRow ? (int) $reservedRow->available_inventory : $stockQuantity;

// Added to returned array:
'available_inventory' => $availableInventory,
```

**Edge case:** Products with no `reserved_products` row (legacy/POS products) fall back to `stock_quantity` — no breakage.

---

## Frontend Changes (`app/social-commerce/page.tsx`)

### 1. `ProductSearchResult` Interface

Added new field:
```ts
availableInventory: number; // from reserved_products — drives UI
```

### 2. Search Result Mapping (catalog search path)

```ts
const rawAvailableInventory = (product as any).available_inventory;
const availableInventory = rawAvailableInventory != null
  ? Number(rawAvailableInventory)
  : Number(product.stock_quantity ?? 0); // fallback for safety
```

### 3. Legacy Batch Search Path (`buildAggregatedProductResults`)

The old multi-store batch fallback also gets `availableInventory: totalAvailable` to satisfy the interface. Since this code path doesn't call the catalog endpoint, it has no access to `reserved_products`, so it uses batch stock as a conservative estimate.

### 4. `handleProductSelect` Guard

```ts
const avail = Number(product?.availableInventory ?? product?.available ?? 0);
if (avail <= 0) return; // silently abort — card is visually disabled
```

### 5. Product Card JSX

| Change | Before | After |
|---|---|---|
| Product name | `truncate` (1 line) | `break-words whitespace-normal` (wraps fully) |
| Stock label | `Available: {stock_quantity}` (always green) | `Available: {availableInventory}` (green) **or** `All stock reserved` (red) |
| Card when reserved | Normal clickable card | Red-tinted border, `opacity-60`, `cursor-not-allowed`, tooltip |

Reserved card classes:
```css
border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 cursor-not-allowed opacity-60
```

---

## Edge Cases Handled

| Scenario | Behaviour |
|---|---|
| No `reserved_products` row | Falls back to `stock_quantity` → card works normally |
| `available_inventory > 0` | Green "Available: N" label, card is fully clickable |
| `available_inventory = 0`, `stock_quantity > 0` | Red "All stock reserved" label, card is un-clickable |
| `stock_quantity = 0` | Product already filtered out by backend (`in_stock` filter) |
| Branch-wise inventory section | **Untouched** ✓ |

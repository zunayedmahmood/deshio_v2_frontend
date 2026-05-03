# Implementation Plan: Enhancing Stock Visibility with Reserved Inventory

**Date**: April 12, 2026
**Subject**: Integration of `reserved_inventory` and `available_inventory` across Social Commerce, Store Assignment, and Inventory View.

---

## 1. Overview
Currently, the system uses `total_stock` (sum of batch quantities) as the primary indicator of availability. However, for e-commerce and social commerce, we have a `reserved_products` table that tracks global reservations. This plan outlines how to surface these metrics and ensure availability checks are driven by `available_inventory` (Total - Reserved).

---

## 2. Backend Enhancements (Laravel)

### 2.1. `EcommerceCatalogController.php`
- **Modify `formatProductForApi`**:
    - Include `reserved_inventory` in the returned array.
    - Path: `Deshio_be/app/Http/Controllers/EcommerceCatalogController.php`
- **Modify `getGroupedProducts`**:
    - When aggregating variants, calculate `total_available_inventory` and `total_reserved_inventory` across the SKU group.

### 2.2. `InventoryController.php`
- **Verify `getGlobalInventory`**:
    - Ensure it consistently returns `available_quantity` and `reserved_quantity` for both product-level and store-level breakdowns.
    - Path: `Deshio_be/app/Http/Controllers/InventoryController.php`

---

## 3. Frontend Service Updates (TypeScript)

### 3.1. `types/product.ts`
- **Update `Product` interface**:
    - Add `reserved_inventory?: number;`
    - Add `available_inventory?: number;`

### 3.2. `services/inventoryService.ts`
- **Update `GlobalInventoryItem` interface**:
    - Add `available_quantity: number;`
    - Add `reserved_quantity: number;`

### 3.3. `services/catalogService.ts`
- **Update `CatalogGroupedProduct` interface**:
    - Add `total_available: number;`
    - Add `total_reserved: number;`
- **Update `normalizeProduct`**:
    - Ensure `available_inventory` is mapped from `raw.available_inventory`.
    - Extract `reserved_inventory` from `raw.reserved_inventory` or calculate it if missing.
- **Update `normalizeGroupedProduct`**:
    - Sum up `available_inventory` as `total_available`.
    - Sum up `reserved_inventory` as `total_reserved`.

---

## 4. Page-Specific Implementations

### 4.1. Social Commerce Product List
**File**: `app/social-commerce/page.tsx`

- **Interface Update**: Ensure `ProductSearchResult` includes `reservedInventory` and `availableInventory`.
- **Aggregation Logic**:
    - Update `buildAggregatedProductResults` to correctly map `availableInventory` and `reservedInventory` from the `catalogService` results.
- **UI Rendering**:
    - **Group Level**: Display `reserved_inventory` next to `total_stock`. 
        - *Example*: `Stock: 100 | Reserved: 5`
    - **Variant Level**: Display reserved count for the specific variant.
    - **Availability Check**: Ensure `addToCart` strictly uses `available_inventory` (already partially implemented, verify against `selectedProduct`).

### 4.2. Store Assignment
**File**: `app/store-assingment/page.tsx`

- **Normalization Logic**:
    - Update `normalizeAvailableStoresPayload` to extract:
        - `physical_quantity` (as Total)
        - `assigned_quantity` (as Reserved)
        - `available_quantity` (as Available)
- **UI Rendering**:
    - In the **Inventory Details** panel (Right Column), update the product rows to show:
        - `Total: {physical_quantity}`
        - `Reserved: {assigned_quantity}`
        - `Available: {available_quantity}`
- **Logic**: Continue using `available_quantity` for `can_fulfill` logic.

### 4.3. Inventory View
**File**: `app/inventory/view/page.tsx`

- **Interface Update**: Update `GroupedProduct` and `ProductVariation` to include `reservedQuantity` and `availableQuantity`.
- **Aggregation Logic**:
    - Update `buildGroupsFromInventory` to sum `item.available_quantity` and `item.reserved_quantity`.
- **UI Rendering**:
    - **Dropdown Title Area**: Beside the "Total Stock" number, add a smaller indicator for reserved stock.
        - *Example*: `Total Stock: 150 (Reserved: 12)`
    - **Expanded Variation Rows**: Show available vs reserved for each variation.
    - **Store Table**: If applicable, show store-specific reservation if available from API.

---

## 5. Validation Strategy
1. **API Consistency**: Manually test `/catalog/products` and `/inventory/global` endpoints to verify field presence.
2. **Stock Deduction Test**: Create a Social Commerce order, assign it to a store, and verify that `reserved_inventory` increases and `available_inventory` decreases in the UI without affecting physical `total_stock` until fulfilled.
3. **Availability Blocking**: Verify that adding a product to the cart is blocked when `quantity > available_inventory`, even if `quantity <= total_stock`.

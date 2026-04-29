# 27_Mar_26 store assingment by prod_id compatibilty check.md

## 1. Context & Objective
The client has clarified that in this system:
- **`product_id`**: Uniquely identifies a specific **Variant** (e.g., Saree - Red - Silk - 42).
- **`SKU`**: Is a shared identifier for a **Product Group** (e.g., all sizes/colors of the same Saree design).
- **Core Goal**: Store assignment must strictly use the `product_id` (Variant) and its specific `ProductBatch` records. We must **stop all SKU-level grouping** and aggregation for assignment purposes.

---

## 2. Identified Compatibility Issues

### 2.1 Frontend: The "SKU Fallback" Logic (CRITICAL)
In `app/store-assingment/page.tsx`, the `buildWarehouseRowsFromInventory` helper (used for warehouse fulfillment checks) contains a logic flaw that masks variant-level stockouts:
```javascript
const byPid = pid ? toNumber(w.byProduct.get(pid)) : 0;
const bySku = sku ? toNumber(w.bySku.get(sku)) : 0;
const available = Math.max(byPid, bySku); // <--- ERROR
```
**Issue**: By taking the `Math.max`, the UI will show a store is capable of fulfilling an order for "Size S" if it has *any* size of that SKU in stock. 
**Fix**: Remove the `bySku` calculation and rely solely on `byPid`.

### 2.2 Backend: Ambiguous Inventory Queries
In `InventoryController::getGlobalInventory`, the query aggregates batches by `product_id`. While this is correct for variants, the `searchProductAcrossStores` method uses `whereAnyLike(..., ['name', 'sku'], $search)`.
**Issue**: Searching by SKU returns a collection of variants. If the assignment logic uses this search to verify availability, it receives an array of products, which are then often summed together in the UI's `storeData['total_items_available']`.
**Fix**: Ensure `getAvailableStores` strictly filters by the `product_id` found in the `order_items` table and never performs a secondary search by SKU.

### 2.3 Data Integrity: Batch to Product Mapping
The `ProductBatch` model links to `product_id`. 
**Risk**: If an employee receives a batch of "Saree Group (SKU: 123)" and assigns it to a "Master" `product_id` rather than the specific variant `product_id`, the store assignment will show 0 availability for the variants even if the physical items are in the store.
**Solution**: The system must enforce that `ProductBatch` always points to the specific variant ID, never a generic group ID.

---

## 3. Proposed Fixes & Architectural Alignment

### 3.1 Backend: Refactoring `OrderManagementController`
We must harden `getAvailableStores` to ensure it is variant-pure:
- **Strict Query**: The `ProductBatch` query in `getAvailableStores` is already using `product_id`. However, we must ensure that `orderItem->product_id` is never a "Master" ID.
- **Validation**: Add a check to ensure the `product_id` being assigned is an "Active Variant" and not a soft-deleted or archived one.
- **Recommendation Engine**: Update `getRecommendation()` to weight stores higher if they have the **exact batches** with the best FIFO (Expiry) for that specific `product_id`, ignoring other products in the same SKU group.

### 3.2 Frontend: Purifying the Assignment UI
- **Remove SKU Aggregation**: In `normalizeAvailableStoresPayload`, delete the `orderReqByProduct` logic that groups by SKU. It must group by `product_id` to ensure "Size S" and "Size M" are treated as two distinct requirements.
- **Batch Visibility**: Update the "Inventory Details" panel on the right side of the Store Assignment page to explicitly show the **Batch Number** and **Expiry** for the variant, confirming to the manager that they are assigning a specific physical unit.

---

## 4. Implementation Strategy

### Step 1: Frontend Cleanup
- Edit `app/store-assingment/page.tsx` to remove `bySku` and all SKU-level grouping maps.
- Update the item summary to display `product_name` (which includes variation suffixes) to distinguish variants with the same SKU.

### Step 2: Backend Hardening
- Audit `OrderManagementController::assignOrderToStore` to ensure `ReservedProduct` (Reserved Stock) is decremented for the specific `product_id` (Variant) only.
- Ensure `ProductBatchObserver` is correctly updating `total_inventory` at the variant level.

### Step 3: Verification
- **Test Case**: Create an order for a specific variant (ID: 101, SKU: A). Ensure a store with 100 units of variant (ID: 102, SKU: A) shows **0% Fulfillment** for this order.

---

## 5. Summary of Changes for Gemini
This plan shifts the system from a **"SKU-Fulfillable"** model to a **"Variant-Batch-Fulfillable"** model. This is essential for preventing "Ghost Fulfillment" where the system thinks an order can be filled because it sees stock for the *same type* of product, but in the *wrong variation*.

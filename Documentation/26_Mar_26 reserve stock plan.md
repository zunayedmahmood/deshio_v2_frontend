# Inventory Reservation & Stock Deduction Refactor Plan

## 1. Problem Statement
Currently, the system uses two different stock deduction strategies that conflict:
- **E-commerce/Social-Commerce (Placement)**: Deducts stock immediately using a global FIFO strategy (often hitting Store 1) but does not record the `batch_id` on the order.
- **Store Fulfillment (Scanning)**: Deducts stock again from the fulfilling store's batch because it sees `batch_id` as null.
- **POS/Counter**: Deducts stock immediately from the local store's batch.
- **Visibility**: Global inventory counts do not account for pending (unassigned) online orders, leading to over-selling in physical stores.

## 2. Proposed Solution: The "Reservation" Model
Instead of deducting stock at the moment of order placement, we will **reserve** it. Stock will only be physically deducted from a batch when the order is **assigned to a store**.

### 2.1 New Database Table: `reserved_products`
This table will maintain a real-time cache of global stock status to ensure high-performance lookups.

| Column | Type | Description |
|--------|------|-------------|
| product_id | Foreign Key | Links to `products` table |
| total_inventory | Integer | Sum of all `quantity` in `product_batches` for this product |
| reserved_inventory | Integer | Sum of quantities in all `pending` or `pending_assignment` online orders |
| available_inventory | Integer | `total_inventory` - `reserved_inventory` |

*Note: While a dedicated table is good for performance, we must ensure it stays in sync via Eloquent Observers or Database Triggers whenever `product_batches` or `orders` change.*

### 2.2 Functional Changes

#### A. Order Placement (E-commerce & Social Commerce)
- **Action**: STOP calling `$batch->save()` or `$batch->decrement()`.
- **New Action**: 
    1. Validate that `available_inventory` in `reserved_products` is >= requested quantity.
    2. Create the order with `status = pending_assignment`.
    3. Increment `reserved_inventory` for that `product_id`.
    4. Set `product_batch_id = null` in `order_items`.

#### B. Store Assignment (`assignOrderToStore`)
- **Action**: This becomes the single point of truth for physical stock deduction.
- **New Logic**:
    1. Select the store (manually or recommended).
    2. Perform FIFO deduction **within that store's batches**.
    3. Update `order_items` with the `product_batch_id` used for deduction.
    4. Decrement `reserved_inventory` (since it's now a physical deduction).
    5. Update `total_inventory` in the reservation table.

#### C. Fulfillment (Scanning)
- **Action**: STOP stock deduction in `StoreFulfillmentController`.
- **New Logic**: The barcode scanning will only verify the item and update the `product_barcode_id` and status to `in_shipment`. Since the batch was already decremented during "Assignment", no further quantity change is needed.

#### D. POS / Counter Sales
- **Action**: POS must remain immediate.
- **New Logic**:
    1. Before sale, check if Store's Local Stock > Global Reservation Gap? No, simpler:
    2. **Rule**: A physical sale is allowed if `local_batch->quantity > 0` AND `global_available_inventory > 0`.
    3. In the edge case where 3 stores have 1 item each and 1 online order is pending:
        - Store A: Sells 1 (Success). Global Available becomes 1.
        - Store B: Sells 1 (Success). Global Available becomes 0.
        - Store C: Sells 1 (BLOCKED). Even though Store C has 1 physical unit, the `global_available_inventory` is 0 because of the pending online reservation.

#### E. Order Cancellation
- **Action**: Release the reservation.
- **New Logic**:
    1. If order was `pending_assignment` (unassigned): Decrement `reserved_inventory`.
    2. If order was already `assigned` (stock deducted): Increment the specific `product_batch->quantity` and update `total_inventory`.

## 3. Integrity & Edge Cases

### 3.1 Synchronization
To prevent the `reserved_products` table from drifting, we will implement `ProductBatchObserver`:
- `saved`: Recalculate `total_inventory`.
- `deleted`: Recalculate `total_inventory`.

And `OrderObserver`:
- `created` (if online): Increment `reserved_inventory`.
- `updated` (status change): If moving from `pending_assignment` to `cancelled`, decrement `reserved_inventory`.

### 3.2 Race Conditions
All stock/reservation updates must be wrapped in `DB::beginTransaction()` with `sharedLock()` or `lockForUpdate()` on the reservation record to prevent two customers from reserving the last item simultaneously.

## 4. Implementation Workplan
1. **Migration**: Create `reserved_products` table and seed it with current data.
2. **Observers**: Implement `ProductBatchObserver` and `OrderObserver` for automatic sync.
3. **Refactor Placement**: Update `GuestCheckoutController`, `EcommerceOrderController`, and `OrderController` to use reservations.
4. **Refactor Assignment**: Update `OrderManagementController::assignOrderToStore` to handle FIFO batch deduction.
5. **Refactor Fulfillment**: Remove decrement logic from `StoreFulfillmentController`.
6. **Refactor POS**: Add global availability check to POS creation logic.
7. **Validation**: Update `InventoryController` and search APIs to report `available_inventory` instead of raw sums.

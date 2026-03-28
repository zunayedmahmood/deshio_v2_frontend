# Product & Inventory Lifecycles - Errum V2

This document provides a comprehensive technical overview of the lifecycles associated with products, batches, barcodes, and inventory movements within the Errum V2 ecosystem.

## 1. Product Lifecycle
The Product entity represents the "Master Data" or "Template" for items sold in the system.

### State Transitions: Active / Archived / Restored / Permanent Delete
Products in Errum V2 follow a soft-delete pattern to prevent data loss while allowing for catalog cleanup.

**Lifecycle Flow:**
```
[ Draft/New ] -> [ Active ] <--> [ Archived ] -> [ Permanent Delete ]
                    |               ^
                    |               |
                    +---------------+
```

*   **Active**: The product is visible in the e-commerce catalog and POS. It can have active batches and barcodes.
*   **Archived**: The product is soft-deleted (`deleted_at` timestamp set). It is hidden from search results but historical data (orders, transactions) remains intact.
*   **Restored**: Moving a product from the Recycle Bin back to the Active state.
*   **Permanent Delete**: Hard deletion from the database. This is only possible for products that have never been used in a transaction (enforced by DB foreign keys).

---

## 2. Inventory Reservation Lifecycle
Errum V2 utilizes a "Virtual Reservation" system to prevent overselling for online orders.

### The Flow: Commitment (Reservation) → Deduction (Physical Movement)
The system separates the *intent to buy* from the *physical removal* of stock.

**Diagram:**
```
[ Order Placed ] -> [ Reservation Created ] -> [ Store Assigned ] -> [ Item Scanned ] -> [ Stock Deducted ]
      |                      |                        |                    |                  |
      |                      v                        v                    v                  v
      +------------> (Total Inv: 100)        (Total Inv: 100)      (Total Inv: 100)    (Total Inv: 99)
                     (Reserved: 0)           (Reserved: 1)         (Reserved: 1)       (Reserved: 0)
                     (Available: 100)        (Available: 99)       (Available: 99)     (Available: 99)
```

1.  **Commitment**: When an E-commerce or Social Commerce order is created, `OrderItemObserver` increments the `reserved_inventory` in the `reserved_products` table.
2.  **Deduction**: Stock is NOT deducted from `product_batches` during order placement. It is only deducted when a store employee scans a physical barcode in `StoreFulfillmentController::scanBarcode`.

---

## 3. Product Batch Lifecycle
Batches are the bridge between Products and physical locations. They hold cost and sell prices.

### Stages: Active → Available → Low Stock → Expiring Soon → Expired
*   **Active**: Batch is created and marked as `is_active = true`.
*   **Available**: `availability = true` and `quantity > 0`.
*   **Low Stock**: Quantity falls below the threshold (default 10).
*   **Expiring Soon**: `expiry_date` is within 30 days.
*   **Expired**: `expiry_date` is reached. The batch is automatically hidden from POS and E-commerce.

---

## 4. Barcode Tracking Lifecycle
Every individual unit in the system is tracked by a unique Barcode (SN/ID).

### Flow: Scan → Current Location → Movement History → Stagnant
*   **Scan**: The primary entry point for all movements (sale, transfer, return).
*   **Current Location**: Tracked via `current_store_id` and `current_status`.
*   **Movement History**: Every location change is logged in the `product_movements` table.
*   **Stagnant**: An internal reporting state for items that haven't moved in a specified period (e.g., 90 days).

---

## 5. Product Dispatch Lifecycle (Internal Transfer)
This lifecycle manages the movement of stock between stores or from warehouse to store.

**Flow:**
1.  **Create**: Initiator creates a Dispatch Request.
2.  **Approve**: Manager approves the transfer.
3.  **Scan (Source)**: Sender scans barcodes to move them into `in_transit` status.
4.  **Dispatch**: The shipment is marked as dispatched.
5.  **Receive (Destination)**: Recipient scans barcodes to move them into `in_shop` status at the new store.

---

## 6. Inventory Rebalancing Lifecycle
Data-driven stock optimization.

**Flow:**
*   **Suggestion**: System identifies a store with high stock and a store with high demand for the same product.
*   **Create**: Admin creates a Rebalance Request based on suggestion.
*   **Approve/Reject**: Target store confirms if they can spare the stock.
*   **Complete**: Follows the Dispatch Lifecycle to move goods.

---

## 7. Defective Product Lifecycle
Handles damaged or malfunctioning goods.

**Flow:**
*   **Mark Defective**: Employee flags a barcode as defective. Status changes to `defective`.
*   **Inspect**: Quality Control determines the issue.
*   **Outcome**:
    *   **Make Available**: Minor issue fixed; back to saleable stock.
    *   **Sell (Discount)**: Sold as "Defective/Refurbished" at a lower price.
    *   **Dispose**: Discarded; quantity removed from batch.
    *   **Return to Vendor**: Shipped back for replacement/credit.

---

## 8. Product Image Lifecycle
Manages visual presentation for e-commerce.

**Flow:**
*   **Upload**: Multi-image support via `ProductImageController`.
*   **Reorder**: Drag-and-drop ordering in frontend.
*   **Make Primary**: The primary image shown in thumbnails.
*   **Toggle Active**: Hide/Show images without deleting.

---

## 9. Edge Cases & Error Handling

| Edge Case | System Behavior |
| :--- | :--- |
| **Overselling** | The `Available` stock check in `OrderManagementController` prevents assignment if `reserved_inventory` > `total_inventory`. |
| **Partial Scan** | Order status remains `picking`. `reserved_inventory` is only released for the specific units scanned. |
| **Batch Expiry** | `ProductBatchObserver` hides the batch, but existing reservations for that product still hold against the `total_inventory`. |
| **Cross-Store Return** | If a customer returns to a different store, the system creates a new batch at the receiving store if one doesn't exist. |

---

## 10. Integrity Issues & Suggested Fixes

### Issue 1: Race Condition in Reservation Creation
**Location**: `OrderItemObserver::incrementReservation`
**Description**: The check `if ($reservedRecord = ...)` followed by `create` is not atomic. Simultaneous orders for a new product can create duplicate rows in `reserved_products`.
**Suggested Fix**: Use `ReservedProduct::updateOrCreate(['product_id' => $productId], [...])` and ensure there is a unique database constraint on `product_id`.

### Issue 2: Inconsistent `total_inventory` Sync
**Location**: `ProductBatchObserver::syncReservedProduct`
**Description**: Calculating the sum of batches and then updating a separate table is non-atomic. High-frequency batch updates (e.g., bulk stock import) can lead to stale `total_inventory` values.
**Suggested Fix**: Use an atomic SQL update:
```sql
UPDATE reserved_products 
SET total_inventory = (SELECT SUM(quantity) FROM product_batches WHERE product_id = ?)
WHERE product_id = ?
```

### Issue 3: Stale `Available` Inventory with Phantom Reservations
**Location**: `ProductBatchObserver`
**Description**: Using `max(0, $total - $reserved)` hides cases where reservations exceed stock. If stock is added, it may immediately be "swallowed" by cancelled but unreleased reservations.
**Suggested Fix**: Allow `available_inventory` to go negative and implement a "Reservation Audit" job that reconciles `reserved_inventory` against `OrderItem::where('status', 'pending')->sum('quantity')`.

### Issue 4: Barcode Selection in `markReadyForShipment`
**Location**: `StoreFulfillmentController::markReadyForShipment`
**Description**: The "Fail-Safe" manual fulfillment does not strictly link barcodes to the order. It just decrements batch quantities.
**Suggested Fix**: Force-assign the oldest available barcodes (`FIFO`) in the store to the `order_items` during manual fulfillment to maintain individual unit tracking integrity.

# Order Lifecycles - Errum V2 (POS, Social, E-commerce)

This document details the complete lifecycle of orders within Errum V2, covering the three primary sales channels: **Point of Sale (POS)**, **Social Commerce**, and **E-commerce**.

## 1. Order Status Lifecycle
All online orders (Social/E-com) follow a rigorous state machine to ensure inventory integrity and customer transparency.

### Standard Flow:
```
[ Pending Assignment ] -> [ Pending ] -> [ Confirmed ] -> [ Processing ] -> [ Ready for Pickup ] -> [ Shipped ] -> [ Delivered ]
          |                  |                |                |                    |                  |
          v                  v                v                v                    v                  v
     (Unassigned)       (Store Assigned) (Valid/Paid)    (Picking Stock)      (Packed/Labels)     (In Transit)   (Finalized)
```

1.  **Pending Assignment**: The order is placed but no store has been assigned to fulfill it. It resides in the "Unassigned" pool.
2.  **Pending**: A store (or multiple stores) has been assigned. The store employee sees this in their dashboard.
3.  **Confirmed**: Payment (if online) is verified, or a staff member confirms the order after contacting the customer.
4.  **Processing**: The order is actively being picked. Barcodes are being scanned.
5.  **Ready for Pickup/Shipment**: Picking is complete. Packaging and shipping labels (e.g., Pathao) are generated.
6.  **Shipped**: The courier has picked up the package.
7.  **Delivered**: Final state. System marks physical deduction as final and releases any lingering reservations.

---

## 2. Order Channel Lifecycle
Errum V2 treats each channel with specific logic tailored to its UX requirements.

### A. Counter Sale (POS)
*   **Characteristics**: Instant fulfillment. No reservation needed.
*   **Lifecycle**: `Created` -> `Paid` -> `Completed` (all in seconds).
*   **Integrity**: Direct batch deduction at the moment of sale.

### B. Social Commerce (Facebook/WhatsApp/Phone)
*   **Characteristics**: Manual entry by staff. Requires manual stock reservation.
*   **Lifecycle**: `Draft` -> `Customer Confirmed` -> `Assigned` -> `Fulfilled`.
*   **Key Feature**: Ad Attribution. Orders can be linked to active campaigns to track ROI.

### C. E-commerce (Website/App)
*   **Characteristics**: Fully automated. Automatic reservation.
*   **Lifecycle**: `Checkout` -> `Payment Gateway (SSLCommerz)` -> `Assigned` -> `Fulfilled`.
*   **Key Feature**: Real-time stock availability check against `Available Inventory` (Total - Reserved).

---

## 3. Fulfillment Lifecycle
The transition from a "Document" (Order) to "Physical Goods" (Package).

### The "Scanning" Process:
1.  **Validation**: Verify that the item belongs to the order.
2.  **Reservation Check**: Ensure the item was reserved globally.
3.  **Physical Selection**: Scan a specific Barcode.
4.  **Batch Sync**: The `ProductBatch` linked to that barcode has its quantity decremented by 1.
5.  **Status Update**: `OrderItem` status changes from `pending` to `scanned`.

---

## 4. Scanning/Fulfillment Process Detail
This is the core of the `StoreFulfillmentController`.

### Physical Deduction Logic:
```php
// Step 1: Scan Barcode
$barcode = ProductBarcode::where('barcode', $input)->first();

// Step 2: Associate with Order Item
$item = OrderItem::where('order_id', $id)->where('product_id', $barcode->product_id)->first();

// Step 3: Atomic Update
DB::transaction(function() {
    $barcode->status = 'sold';
    $batch = $barcode->batch;
    $batch->decrement('quantity', 1); // physical deduction
    $item->scan_status = 'scanned';
    $item->product_barcode_id = $barcode->id;
});
```

---

## 5. Multi-Store Fulfillment Lifecycle
Used when no single store has all items in an order.

### The Split-Order Logic:
1.  **Detection**: `OrderManagementController` identifies that no store can fulfill 100%.
2.  **Allocation**:
    *   Item A -> Store 1
    *   Item B -> Store 2
3.  **Multi-Store Status**: Order status set to `multi_store_assigned`.
4.  **Fulfillment Tasks**: Two separate fulfillment tasks are generated for Store 1 and Store 2.
5.  **Consolidation**: Items are either shipped separately or moved to a "Central Hub" for combined shipping.

---

## 6. Pre-Order Lifecycle
Allows selling items before they arrive in stock.

### Flow:
1.  **Stock Unavailable**: Product set as "Pre-Order" in CMS.
2.  **Trending**: High volume of pre-orders detected.
3.  **Mark Stock Available**: PO received for pre-ordered items.
4.  **Ready to Fulfill**: Pre-orders automatically move to `Pending Assignment`.

---

## 7. Order Tracking Lifecycle (Courier Integration)
Integration with Pathao/Steadfast.

1.  **Courier API**: Handshake between Errum V2 and Pathao.
2.  **Tracking Number**: Generated and saved to `shipments` table.
3.  **Webhooks**: Courier sends status updates (Picked up -> Out for Delivery -> Delivered).
4.  **Auto-Finalization**: System marks order as `delivered` when courier webhook confirms success.

---

## 8. Edge Cases & Error Handling

| Scenario | System Response |
| :--- | :--- |
| **Duplicate Scan** | `StoreFulfillmentController` throws 422: "Barcode already scanned for this order." |
| **Wrong Item Scanned** | System checks `product_id`. If mismatch, throws "Item not found in this order." |
| **Order Cancelled Mid-Fulfillment** | `OrderObserver` releases all reservations. Any scanned barcodes must be manually returned to stock. |
| **Store Rejects Assignment** | Order moves back to `Pending Assignment` pool. |

---

## 9. Examples & Data Structures

### Order Metadata Example:
```json
{
  "order_number": "ORD-20260329-001",
  "channel": "social_commerce",
  "fulfillment_type": "multi_store",
  "fulfillment_details": [
    { "item_id": 101, "assigned_store_id": 1, "status": "scanned" },
    { "item_id": 102, "assigned_store_id": 5, "status": "pending" }
  ]
}
```

---

## 10. Integrity Issues & Suggested Fixes

### Issue 1: Split-Order Fulfillment Mismatch
**Description**: `StoreFulfillmentController` often queries by `order->store_id`. In multi-store orders, `order->store_id` is null.
**Suggested Fix**: Update controller queries to use `OrderItem->assigned_store_id` when `order->fulfillment_type == 'multi_store'`.

### Issue 2: Partial Fulfillment Reservation Release
**Description**: When an order is partially fulfilled and the rest is cancelled, the `OrderObserver` might release the *entire* reservation quantity instead of just the remaining.
**Suggested Fix**: Use `quantity - scanned_quantity` when calculating reservation release.

### Issue 3: Race Condition in Pathao Handshake
**Description**: If two staff members click "Generate Label" simultaneously, two different Pathao orders might be created for one Errum order.
**Suggested Fix**: Add a `is_processing_shipment` flag (atomic lock) to the `orders` table during API calls.

### Issue 4: Pre-Order Virtual Inventory
**Description**: Pre-orders don't have physical stock, but they *reserve* from a non-existent pool.
**Suggested Fix**: Introduce a `virtual_batch` for pre-orders to track commitments against expected PO quantities, keeping them separate from physical `ReservedProduct` counts.

### Issue 5: Customer Address Sync in Multi-Store
**Description**: If a customer updates their address, it might not sync to all sub-shipments in a multi-store order.
**Suggested Fix**: Use an `addresses` table with foreign keys on both `Order` and `Shipment` entities instead of duplicating text fields.

### Issue 6: Payment Verification Loophole
**Description**: A Social Commerce order can be marked as `Confirmed` without a linked `Transaction`.
**Suggested Fix**: Enforce `RequiredTransaction` validation in the `confirmed` state transition for specific channels.

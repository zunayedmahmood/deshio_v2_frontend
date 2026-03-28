# Returns, Refunds & Support Lifecycles - Errum V2

This document details the processes for handling product returns, issuing refunds, and managing customer inquiries in the Errum V2 system.

## 1. Product Return Lifecycle
Returns are complex because they involve physical logistics, financial reversal, and inventory reconciliation.

### Return States:
```
[ Pending ] -> [ Approved ] -> [ Processing ] -> [ Completed ] -> [ Refunded ]
     |             |                |                |
     |             v                v                v
     +-------> [ Rejected ]   [ QC Failed ]    [ Cancelled ]
```

1.  **Pending**: Customer or staff initiates a return request. No physical goods have been received.
2.  **Approved**: Staff confirms the return is eligible based on the order date and return reason.
3.  **Processing**: Goods are received at the store. The `quality_check` is underway.
4.  **Completed**: QC has passed. Inventory has been restored to the batch.
5.  **Refunded**: The financial portion of the return is finalized.
6.  **Rejected/QC Failed**: Return is denied, and goods are sent back to the customer or marked as a loss.

---

## 2. Inventory Restoration (Cross-Store Logic)
When a product is returned, it must be put back into the system's stock.

### Workflow:
*   **Original Store Return**: Item is added back to its original `ProductBatch`. Barcode status changes to `in_shop`.
*   **Cross-Store Return**: If returned to a different store (e.g., Warehouse instead of Shop):
    1.  System searches for an existing batch of that product in the receiving store.
    2.  If none exists, a new "Return Batch" is created using the original's pricing and cost.
    3.  A `ProductMovement` of type `return` is recorded for audit.

---

## 3. Automated Defective Marking
If a return reason is `defective_product` or `quality_issue`, the system auto-flags the barcode during the `complete` phase.

**Logic Chain**:
*   `complete()` called on `ProductReturn`.
*   System maps `return_reason` to `defect_type`.
*   `ProductBarcode::markAsDefective()` called for the specific units.
*   Item is removed from saleable stock and moved to the `Defective Products` dashboard.

---

## 4. Refund Lifecycle
The financial settlement of a completed return.

### Refund Methods:
*   **Original Method**: Reverses the card or bank transaction (automated via SSLCommerz API if supported).
*   **Cash**: Manual payout recorded as a `credit` transaction.
*   **Store Credit**: Generates a unique `store_credit_code` for the customer.
*   **Exchange**: Links the refund value to a new `Order`.

---

## 5. Contact Message Lifecycle (Customer Support)
Handles public inquiries from the website.

**States**:
*   **New**: Unread message.
*   **Read**: Staff has viewed the message.
*   **Replied**: Staff has provided an answer (admin reply saved).
*   **Archived**: Resolution reached; hidden from the active queue.

---

## 6. Exchange Lifecycle (Return + New Sale)
Exchanges are handled as two distinct events linked together for auditing.

1.  **Return Path**: Original item is processed through the standard Return Lifecycle.
2.  **Credit Path**: Instead of cash/bank refund, the amount is held as a "Temporary Credit".
3.  **Sale Path**: A new order is created.
4.  **Linking**: `ProductReturnController::exchange` links the new order ID to the return request.

---

## 7. Edge Cases & Safety Rules

| Scenario | System Rule |
| :--- | :--- |
| **Return after 30 days** | System flags as "Out of Policy" but allows staff override if permissions allow. |
| **Partial Return of Split Batch** | The system identifies the specific `product_barcode_id` from the `OrderItem` to ensure the correct batch is incremented. |
| **Refund Method unavailable** | Staff can pivot to `Store Credit` as a fallback. |
| **Non-Barcode Item Return** | `ProductReturnController` throws an error. Non-barcode items are NOT returnable in the standard flow. |

---

## 8. Examples & Data Structures

### Return Item Object:
```json
{
  "order_item_id": 500,
  "product_id": 20,
  "quantity": 1,
  "unit_price": 1200,
  "returned_barcode_ids": [5678],
  "reason": "defective_product",
  "qc_passed": true
}
```

---

## 9. Integrity Issues & Suggested Fixes

### Issue 1: Phantom Inventory in Cross-Store Returns
**Description**: When a new batch is created during a cross-store return, some attributes (like custom taxes or notes) from the original batch are lost.
**Suggested Fix**: Update `restoreInventoryForReturn` to deep-copy all `ProductBatch` metadata from the original batch ID.

### Issue 2: Race Condition in Duplicate Returns
**Description**: The check for existing returns in `ProductReturnController::store` is non-atomic.
**Suggested Fix**: Use a `unique` composite index on `product_returns` table for `(order_id, status)` where status is not `rejected` or `cancelled`.

### Issue 3: Manual Refund Over-payment
**Description**: Staff can enter a `total_refund_amount` greater than the customer's actual paid amount in the order.
**Suggested Fix**: Add a hard validation: `refund_amount <= (order->paid_amount - order->total_refunded)`.

### Issue 4: Barcode Status Mismatch during Reject
**Description**: If a return is rejected *after* being received, the barcode might stay in `in_warehouse` instead of moving back to `with_customer` (for the customer to pick up).
**Suggested Fix**: In the `reject()` method, implement an automated location update to a virtual "Customer Pickup/Rejected" status.

### Issue 5: Refund Transaction Tracking
**Description**: `RefundController` creates two transactions (Cash & Revenue Reversal) but does not link them via a single `batch_id` or parent `transaction_id`.
**Suggested Fix**: Implement a `parent_transaction_id` in the `transactions` table to group related double-entry records.

### Issue 6: Defective Auto-Marking Ambiguity
**Description**: If `returned_barcode_ids` is empty, the system picks the oldest available barcode. This might pick a good unit instead of the bad one.
**Suggested Fix**: Make `returned_barcode_ids` a mandatory field in the frontend `ProductReturn` form. Prevent submission if no barcodes are selected.

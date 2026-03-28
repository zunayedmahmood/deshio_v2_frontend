# Purchase, Vendor, Admin & Marketing Lifecycles - Errum V2

This document provides technical documentation for the administrative, procurement, and marketing backend of Errum V2.

## 1. Purchase Order (PO) Lifecycle
Procurement from vendors to warehouses.

### PO Statuses:
```
[ Draft ] -> [ Approved ] -> [ Partially Received ] -> [ Received ]
     |            |                      |
     v            v                      v
[ Cancelled ]  [ Overdue ]             [ Closed ]
```

1.  **Draft**: Order is being built. Items can be added/removed.
2.  **Approved**: Manager authorizes the purchase. Price and quantities are locked.
3.  **Partially Received**: Some items have arrived. Initial batches are created.
4.  **Received**: 100% of quantities have arrived. All stock is available.
5.  **Cancelled**: Order aborted before receipt.

---

## 2. Vendor Payment Lifecycle
Managing debt and advance payments to suppliers.

### The Flow:
*   **Create Payment**: Link to a specific PO or mark as "Advance".
*   **Allocate Advance**: If a payment was "Advance", staff can later link it to a new PO.
*   **Cancel/Refund**: Handle corrections or returns of funds.

**Integrity**: Sum of allocations must always equal `VendorPayment->amount`.

---

## 3. Employee Lifecycle
Managing staff access and organization.

### Key Events:
*   **Active / Inactive**: Soft status toggle for system access.
*   **Transfer**: Move an employee from one store to another (updates `store_id`).
*   **Role Change**: Transition between permissions (e.g., Cashier to Manager).
*   **MFA Management**: Setup and recovery of multi-factor authentication.

---

## 4. Service Order Lifecycle
Managing service-based sales (e.g., repairs, custom work).

### Stages:
```
[ Pending ] -> [ Confirmed ] -> [ In Progress ] -> [ Completed ]
     |               |                |                |
     v               v                v                v
[ Cancelled ]  [ Payment Unpaid ] [ Payment Partial ] [ Payment Paid ]
```

*   **Confirm**: Service availability checked.
*   **Start**: Labor begins.
*   **Complete**: Service rendered. Final invoice generated.

---

## 5. Ad Campaign Lifecycle
Attributing sales to marketing efforts.

### The Flow:
1.  **Create**: Set platform (FB/Insta), budget, and duration.
2.  **Target Products**: Explicitly link specific items to the campaign.
3.  **Active / Inactive**: Toggle attribution logic.
4.  **Attribution Health**: Job runs nightly to link orders containing targeted products during the campaign window.

---

## 6. Promotion Lifecycle
Managing coupons and discounts.

### Flow:
*   **Create**: Define type (Percentage/Fixed) and constraints (Min Purchase/Expiry).
*   **Validate Code**: Frontend API call to check eligibility for a customer's cart.
*   **Apply to Order**: Permanent link created in `promotion_usages`.
*   **Usage History**: Audit log of all orders that benefited from the promotion.

---

## 7. Recycle Bin Lifecycle
A safety net for accidental deletions.

### Retention Policy (7-Day Rule):
1.  **Soft Delete**: Item is moved to bin (`deleted_at` set).
2.  **7-Day Recovery**: User can see the item and "Restore" it.
3.  **Permanent Delete**: After 7 days, a scheduled task calls `forceDelete()`.

---

## 8. Edge Cases & Administrative Rules

| Entity | Edge Case | Mitigation |
| :--- | :--- | :--- |
| **PO** | **Price Discrepancy** | Receiving clerk can adjust `unit_cost` during receipt, triggering a price update in the Batch. |
| **Employee** | **Self-Deletion** | System hard-block: An employee cannot deactivate their own account. |
| **Promotion** | **Usage Limit Overrun** | Atomic `increment` on `usage_count` with DB constraint. |
| **Vendor** | **Credit Note Mapping** | Credit notes from returns are treated as "Advance Payments" in the vendor ledger. |

---

## 9. Integrity Issues & Suggested Fixes

### Issue 1: Advance Payment Over-Allocation
**Description**: `VendorPaymentController::allocateAdvance` lacks a row-level lock during the unallocated balance check.
**Suggested Fix**: Use `DB::table('vendor_payments')->where('id', $id)->lockForUpdate()->first()` before proceeding with allocation.

### Issue 2: Service Order Stock Sync
**Description**: Service orders can include parts, but they don't seem to trigger the same reservation logic as standard orders.
**Suggested Fix**: Integrate `OrderItemObserver` logic into `ServiceOrderItem` to reserve physical parts needed for repairs.

### Issue 3: Campaign Attribution Overlap
**Description**: If a product is in two active campaigns, the system attributes to the first one it finds.
**Suggested Fix**: Split the revenue attribution proportionally between all active campaigns that target the product.

### Issue 4: Recycle Bin Cleanup Gaps
**Description**: `RecycleBinController::autoCleanup` has "Similar for other models" comments, suggesting incomplete coverage.
**Suggested Fix**: Create a `SoftDeletable` interface and use reflection to find all models using the `SoftDeletes` trait for automatic cleanup.

### Issue 5: Promotion Code Collision
**Description**: Unique code generation in `PromotionController` uses `Str::random(8)` in a loop, but without a database unique constraint, a collision is possible during high concurrency.
**Suggested Fix**: Add a `UNIQUE` constraint to the `code` column in the `promotions` table.

### Issue 6: Employee Hierarchy Recursion
**Description**: `assignManager` prevents direct self-assignment but not circular chains (A manages B, B manages A).
**Suggested Fix**: Implement a recursive check in `EmployeeController` to ensure the new manager is not a subordinate of the current employee.

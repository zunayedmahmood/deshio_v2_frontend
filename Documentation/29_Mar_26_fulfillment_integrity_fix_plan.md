# WORKPLAN: Order Status & Inventory Integrity Fixes

This plan addresses several critical issues discovered in the order fulfillment and store assignment lifecycles.

## 1. Problem Identification

### Issue A: Premature Batch Assignment
In `OrderManagementController::assignStore`, the system currently performs a FIFO search to assign a `product_batch_id` to every item in the order.
*   **Conflict:** Online orders (E-commerce/Social) use global reservations. Physical stock deduction ONLY happens during barcode scanning at the branch. 
*   **Result:** The "intended" batch assigned by the office may differ from what the branch staff actually picks, causing data confusion.

### Issue B: Incorrect Social Commerce Initial Status
When a Social Commerce order is created with a `store_id` already provided, the system assigns it a status of `pending`.
*   **Conflict:** The social-commerce/package page shows weird behaviour for`assigned_to_store`

### Issue C: Fulfillment Scan Failures
Fullfilment in that social-commerce/package page is not working properly for the new enum assign to store.

---

## 2. Technical Implementation Plan (Antigravity Prompts)

### Step 1: Remove Batch Assignment from Store Routing
> **Prompt:** "Modify `Deshio_be/app/Http/Controllers/OrderManagementController.php`. In the `assignStore` method, remove the logic that loops through `$order->items` and updates `product_batch_id`. The system should only update the `store_id` and the order `status` to `assigned_to_store`. Stock batches will be determined dynamically during the barcode scanning phase.

### Step 2: Fix Social Commerce Creation Status
> **Prompt:** "Modify `Deshio_be/app/Http/Controllers/OrderController.php`. In the `create` method, update the initial status logic. If the `order_type` is `social_commerce` and a `store_id` is provided in the request, set the `initialStatus` to `assigned_to_store` instead of `pending`. This ensures the order immediately appears in the branch's fulfillment queue."

### Step 3: Refine Scanning Permissions
> **Prompt:** "check the backend for social commerce package page for methods allow scanning for orders with all statuses. Also, verify that if an order item already has a `product_batch_id` assigned, it is overwritten by the batch associated with the physical barcode being scanned."

---

## 3. Integrity Verification

After applying these changes, we must verify:
1.  **Creation:** Social Commerce orders with a store assigned must show up in `orders` table as `assigned_to_store`.
2.  **Assignment:** Manual store assignment via Admin Panel must NOT touch `product_batch_id` in `order_items`.
3.  **Fulfillment:** Branch staff must be able to see and scan these orders successfully.
4.  **Stock Deduction:** Verify that `product_batches.quantity` ONLY decreases when the barcode is scanned, not when the order is created or assigned.

# Workplan: Fixing Social Commerce Issues (Discount, Payment, Stock, Pathao)

This workplan addresses four critical issues identified in the Social Commerce module of Deshio V2.

## Issues and Root Causes

### 1. Discount Not Applied
*   **Problem:** A discount applied in Social Commerce was lost after order placement.
*   **Root Cause:** The frontend (`app/social-commerce/amount-details/page.tsx`) calculates a `totalDiscount` but sends `discount_amount: 0` in the top-level order creation request. While it sends discounts per item, the backend total calculation logic and some views rely on the top-level `discount_amount` field.
*   **File:** `app/social-commerce/amount-details/page.tsx`

### 2. Partial Payment Failure
*   **Problem:** Partial payments made during social commerce checkout did not reflect correctly.
*   **Root Cause 1:** The frontend performs order creation and payment in two separate requests. If the second request fails, the order remains unpaid.
*   **Root Cause 2:** String mismatch for payment status. The database ENUM uses `partial`, but some older logic or observers might expect `partially_paid`.
*   **Root Cause 3:** Bug in `OrderController::create` (Line 668) where it tries to access `$request->payment_type` instead of `$request->payment['payment_type']`.

### 3. Stock Validation Failure
*   **Problem:** Orders placed in branches with no stock.
*   **Root Cause 1:** `OrderController::create` skips local stock validation if `batch_id` is null (which is always null for Social Commerce orders from the frontend).
*   **Root Cause 2:** `OrderItemObserver` only increments `ReservedProduct` (global reservation) if order status is `pending_assignment`. If a store is selected during Social Commerce, the status is `pending`, so reservation is skipped.
*   **Root Cause 3:** `OrderController` only deducts physical stock immediately for `counter` orders. Social commerce orders with a specific store are left in a state where stock is neither reserved nor deducted.

### 4. Pathao Collectable Amount 0
*   **Problem:** When sending to Pathao, the "Collectable Amount" became 0.
*   **Root Cause:** `Shipment::createFromOrder` (Line 680) only sets `cod_amount` if `payment_status` is exactly `pending`. If the order is `partial` or `unpaid`, it sets `cod_amount` to `null`, which Pathao interprets as 0.
*   **File:** `Deshio_be/app/Models/Shipment.php`

---

## Execution Plan

### Phase 1: Backend Fixes (Laravel)

#### Step 1: Fix Pathao Collectable Amount
**File:** `Deshio_be/app/Models/Shipment.php`
*   Locate `createFromOrder` method.
*   Change `'cod_amount' => $order->payment_status === 'pending' ? $order->total_amount : null,`
*   To: `'cod_amount' => $order->outstanding_amount,`

#### Step 2: Fix Stock Reservation Logic
**File:** `Deshio_be/app/Observers/OrderItemObserver.php`
*   Update `created`, `updated`, and `deleted` methods.
*   Change status check from `=== 'pending_assignment'` to `in_array($order->status, ['pending_assignment', 'pending'])` for `ecommerce` and `social_commerce` order types.
*   This ensures that even if a store is selected (status = `pending`), the global stock is still reserved until physical scanning.

#### Step 3: Fix Order Creation Payment Access
**File:** `Deshio_be/app/Http/Controllers/OrderController.php`
*   In the `create` method, locate the payment processing block (around Line 660).
*   Change `$request->payment_type` to `$request->payment['payment_type']`.

#### Step 4: Add Stock Check for Specific Store Assignment
**File:** `Deshio_be/app/Http/Controllers/OrderController.php`
*   In the `create` method, before creating the order, if `store_id` is provided for `social_commerce`, perform a sum of stock for that product across all batches in that store to ensure at least one branch has it, and there's enough available_inventory from reserved products.
*   Actually, ensuring the `OrderItemObserver` handles `pending` status is the most important part for reservation.

### Phase 2: Frontend Fixes (Next.js)

#### Step 5: Fix Discount Payload
**File:** `app/social-commerce/amount-details/page.tsx`
*   In `handlePlaceOrder`, update the `axios.post('/orders', ...)` payload.
*   Change `discount_amount: 0,` to `discount_amount: totalDiscount,`.

#### Step 6: Improve Payment Processing Sequence
**File:** `app/social-commerce/amount-details/page.tsx`
*   Improve the error handling for the payment request so that if it fails, the user is notified that the order was created but payment failed, and they are redirected to the order page to retry payment.

---

## Verification Steps

1.  **Test Pathao Amount:**
    *   Create a Social Commerce order with a partial payment.
    *   Create a shipment for it.
    *   Verify `cod_amount` in the `shipments` table matches the `outstanding_amount` of the order.
    *   Send to Pathao and verify the collectable amount in the Pathao dashboard (or logs).

2.  **Test Stock Reservation:**
    *   Place a Social Commerce order for a product with 5 available stock.
    *   Verify `reserved_inventory` in `reserved_products` table increases by the ordered quantity.
    *   Verify `available_inventory` decreases.

3.  **Test Discount:**
    *   Apply a discount in Social Commerce.
    *   Place the order.
    *   Check the order details in the admin panel to ensure the discount is reflected in the total.

4.  **Test Partial Payment:**
    *   Place an order with a partial payment.
    *   Check `payment_status` in the `orders` table (should be `partial`).
    *   Check `paid_amount` and `outstanding_amount`.

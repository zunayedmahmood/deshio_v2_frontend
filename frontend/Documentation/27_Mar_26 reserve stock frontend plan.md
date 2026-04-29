# Frontend Reserve Stock Implementation Plan (27 Mar)

## 1. Overview and Core Functionality
The backend has been refactored to use a **Reservation Model**. Stock is no longer instantly physically deducted from a specific store (e.g., Store 1) upon placing an online order. Instead, global stock is *reserved*, reducing the `available_inventory` while maintaining the physical `product_batches` untouched until the order is officially assigned to a store. 

This document outlines how the existing frontend code interacts with this new backend architecture, verifying current behaviors and proposing **only strictly necessary** frontend adjustments to match the updated backend models.

---

## 2. Component Analysis & Verifications

### A. E-Commerce Checkout (`app/e-commerce/checkout/page.tsx`)
- **Current Behavior**: The `/e-commerce/checkout` page currently submits the order payload with `store_id: null` intentionally.
- **Backend Interaction**: This is **perfectly aligned** with the new backend logic. When the backend receives `store_id: null` via `EcommerceOrderController` or `GuestCheckoutController`, it bypasses physical batch deduction. Instead, it validates the request against `available_inventory` in the `reserved_products` table and reserves the stock globally (setting the order status to `pending_assignment`).
- **Issue/UX Flaw**: If the product page UI displays total physical stock rather than `available_inventory`, a customer might try to purchase an item that is physically in-store but already reserved by another online order. 
- **Required Action**: Either format the frontend Product/Cart UI to read `available_inventory` (if exposed by the Catalog API) instead of raw `inventory`, OR ensure the frontend gracefully handles the `400 Bad Request: "Insufficient globally available inventory"` error thrown by the backend during checkout. No structural changes to the checkout form payload are necessary.

### B. Social Commerce (`app/social-commerce/page.tsx`)
- **Current Behavior**: The payload intelligently constructs `store_id`. For standard items, it assigns `store_id: null`. For defective/replacement items, it explicitly binds `store_id: selectedProduct.store_id`.
- **Backend Interaction**: This aligns perfectly with the backend. Normal social-commerce orders will reserve global stock (pending assignment). Defective/special replacements that specify a store will instantly deduct physical stock from that specific store's batch.
- **Required Action**: None. The dynamic `store_id` behavior cleanly integrates with the new conditional reservation flow.

### C. Store Assignment (`app/store-assingment/page.tsx`)
- **Current Behavior**: This page fetches `inventoryDetails` showing `available_quantity` and `required_quantity` mapped against different stores to help admins assign unfulfilled orders. It then calls `assignOrderToStore(selectedOrderId, { store_id: ... })`.
- **Backend Interaction**: In the new architecture, the `assignOrderToStore` endpoint is the **single source of truth** for physical stock deduction. It takes the order, grabs the recommended `store_id` from the frontend, and physically deducts the quantity from that store's physical batch using FIFO logic, simultaneously releasing the global reservation.
- **Required Action**: None structurally. Visually, the frontend logic comparing `available_quantity >= required_quantity` accurately guarantees that admins only assign orders to stores with sufficient physical capacity.

### D. POS / Counter Sales (`app/pos/page.tsx`)
- **Current Behavior**: POS selects an outlet and explicitly binds `store_id : parseInt(selectedOutlet)`.
- **Backend Interaction**: Because `store_id` is passed, the backend immediately deducts physical stock. Furthermore, the backend `OrderController` now possesses a global reservation check. If a POS attempts to sell the absolute last unit that is already reserved by an online E-commerce order, the backend will block it to prevent overselling.
- **Required Action**: Ensure the POS interface correctly catches and toasts the `400` error thrown if the attempt breaches the globally reserved limits.

---

## 3. Workplan (Strictly Necessary Changes)

Given the constraints to *not* introduce structural or additional logic changes, the only required adjustments are UX/UI error-handling alignments to the new backend validators:

1. **E-Commerce Checkout Error Handling**:
   - Verify that the `axios` or `fetch` catch block in `e-commerce/checkout/page.tsx` properly surfaces the backend's `400` response (`"Insufficient globally available inventory..."`) to the `Toast` system.
2. **Product Page Inventory Values (Optional but recommended)**:
   - If `app/e-commerce/product/[id]/page.tsx` displays stock numbers to customers, modify the mapped property from `variant.inventory` to `variant.available_inventory` (assuming the backend resource returns it).
3. **POS Error Handling**:
   - Verify that `pos/page.tsx` handles the overarching global availability constraint error. If an admin tries to blindly sell a reserved item, they must receive the error toast clearly.

No fundamentally new APIs, form fields, or logical architectures are needed on the frontend. The nullification of `batch_id` and `store_id` in online contexts was already present and acts as the perfect trigger for the backend's new Reservation Model.

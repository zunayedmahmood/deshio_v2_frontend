# Errum V2 - Integrity and Risk Audit Report

**Date:** April 7, 2026
**Auditor:** Gemini CLI
**Scope:** Frontend (Next.js 15), Backend (Laravel)

---

## 1. Critical Security Vulnerabilities

### 1.1. Public Employee Signup with Role Assignment
- **Issue:** The `AuthController@signup` method is public and allows providing a `role_id`.
- **Risk:** Anyone can create an employee account and assign themselves a "Super Admin" role by guessing or discovering the role ID.
- **Location:** `app/Http/Controllers/AuthController.php`
- **Proposed Solution:** Remove public `signup` or protect it with high-level administrative permissions.

### 1.2. Public Exposure of Sensitive Business Data
- **Issue:** Many inventory and financial routes in `InventoryController` are nested under the public `catalog` prefix.
- **Exposed Data:** Global inventory breakdown by store, cost prices, total inventory value, low stock alerts, and stock aging.
- **Risk:** Competitors or attackers can scrape the entire business financial and stock health.
- **Location:** `routes/api.php` (Lines 114-122) and `InventoryController.php`.
- **Proposed Solution:** Move administrative inventory routes to the `auth:api` protected group.

### 1.3. Improper Auth Scoping (Cross-Store Data Access)
- **Issue:** The backend relies on the frontend to inject `store_id` and does not verify if the authenticated employee actually belongs to that store.
- **Risk:** A malicious employee can change the `store_id` in `localStorage` or via API request to access/modify data of any other store.
- **Location:** `OrderController@index`, `InventoryController`, and `lib/axios.ts` (client-side enforcement only).
- **Proposed Solution:** Implement a backend middleware to verify and enforce `store_id` based on the authenticated user's assignment.

### 1.4. Unused RBAC Middleware
- **Issue:** The `CheckPermission` middleware is defined but not aliased in `Kernel.php` or used in `api.php`.
- **Risk:** Granular permissions are not enforced. Any employee with a token can access any administrative endpoint (e.g., creating other employees, changing roles, viewing salaries).
- **Location:** `app/Http/Kernel.php`, `app/Http/Middleware/CheckPermission.php`.
- **Proposed Solution:** Alias the middleware and apply it to all administrative routes in `api.php`.

### 1.5. SQL Injection Risk in Product Group Edit
- **Issue:** `Product::updateBaseNameForSkuGroup` directly concatenates input into `DB::raw`.
- **Risk:** Potential SQL injection if the base name input is not sanitized.
- **Location:** `app/Models/Product.php` (Line 125).
- **Proposed Solution:** Use parameter binding or string escaping for the raw query.

---

## 2. Integrity & Logic Issues

### 2.1. Inventory Reservation Leak (Soft Deletes)
- **Issue:** Soft-deleting an `Order` does not trigger the release of reserved inventory in `OrderItemObserver`.
- **Risk:** Inventory remains "reserved" forever for deleted orders, causing artificial stock shortages.
- **Location:** `app/Observers/OrderItemObserver.php` and `app/Models/Order.php`.
- **Proposed Solution:** Add an `OrderObserver@deleted` handler to release reservations for all items in the order.

### 2.2. Inventory Race Condition (Duplicate Items)
- **Issue:** The stock validation in `GuestCheckoutController` happens in a loop before any database updates.
- **Risk:** If a request contains multiple entries for the same product, the validation for the second entry will not see the "decrement" from the first entry, potentially allowing overselling.
- **Location:** `app/Http/Controllers/GuestCheckoutController.php`.
- **Proposed Solution:** Aggregate items by `product_id` before the validation loop or update the reservation record immediately within the transaction.

### 2.3. Incorrect Reservation Update on Item Change
- **Issue:** `OrderItemObserver@updated` only checks for `quantity` changes, not `product_id` changes.
- **Risk:** Changing an item's product (e.g., replacement) results in orphaned reservations for the old product and no reservation for the new one.
- **Location:** `app/Observers/OrderItemObserver.php`.
- **Proposed Solution:** Check for `isDirty('product_id')` and handle decrement/increment accordingly.

---

## 3. Performance & Architecture

### 3.1. N+1 Queries (Frontend)
- **Issue:** `InventoryClient.tsx` lazy-loads metadata and images by making separate `getById` calls for every visible item.
- **Risk:** Hundreds of API calls on page load, slowing down the UI and stressing the backend.
- **Location:** `app/inventory/view/page.tsx` (`enrichProduct` function).
- **Proposed Solution:** Include basic metadata (hero image, color, size) in the `getGlobalInventory` response.

### 3.2. N+1 Queries (Backend)
- **Issue:** `OrderController@index` accesses `createdBy` relationship which is not eager-loaded in the `with()` call.
- **Location:** `app/Http/Controllers/OrderController.php`.
- **Proposed Solution:** Add `createdBy` to the eager-loading array.

### 3.3. Monolithic Route File
- **Issue:** `routes/api.php` is nearly 100KB with 1700 lines of code.
- **Risk:** Performance overhead for route registration on every request and extreme difficulty in auditing security rules.
- **Proposed Solution:** Split routes into module-specific files (e.g., `routes/api/orders.php`, `routes/api/auth.php`).

### 3.4. Inefficient Aggregations
- **Issue:** `Order::getOrderStats` runs 9 separate database queries.
- **Location:** `app/Models/Order.php`.
- **Proposed Solution:** Use a single query with `selectRaw` and conditional `SUM/COUNT` statements.

---

## 4. Data Privacy Risks

### 4.1. Exposure of Employee Salaries
- **Issue:** The `salary` field in `Employee` model is not hidden.
- **Risk:** Any employee with access to employee lists or profiles can see others' salaries.
- **Proposed Solution:** Add `salary` to the `$hidden` array in the `Employee` model or use a Resource class to filter it.

### 4.2. Exposure of Cost Margins
- **Issue:** `total_cogs` and `gross_margin` are returned in standard order list responses.
- **Risk:** Sensitive profit data is visible to low-level employees like delivery staff or cashiers.
- **Proposed Solution:** Restrict these fields to users with specific "view-margins" permissions.

---

## Summary of Risks
The system currently faces **high risk** in both security (due to open signup and missing RBAC) and data integrity (due to flawed inventory observers). Immediate action is recommended on sections 1.1, 1.2, 1.4, and 2.1.

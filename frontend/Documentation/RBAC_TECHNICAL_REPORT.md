# Errum V2: Role-Based Access Control (RBAC) Technical Implementation Report - Phase 1

## Date: March 30, 2026
## Status: Finalized (Phase 1)
## Roles Covered: `online-moderator`, `pos-salesman`

---

## 1. Executive Summary
This report details the implementation of Phase 1 of the Role-Based Access Control (RBAC) system for Errum V2. The objective was to provide secure, scoped access for `online-moderator` and `pos-salesman` roles while maintaining full administrative oversight for global roles (`super-admin`, `admin`, `branch-manager`).

The implementation covers three main technical layers:
1.  **Backend Compatibility**: Adjusting core controllers to support partial data submission and role-based validation.
2.  **Network Middleware**: Refactoring the Axios interceptor for dynamic, role-aware store scoping.
3.  **UI/UX Layer**: Implementing granular UI restrictions and route protections using React Context and custom wrappers.

---

## 2. Backend Infrastructure Changes

### 2.1 Purchase Order Controller Patch
The `PurchaseOrderController` previously required `unit_cost` for all item additions and PO creations. This posed a security risk and a UX blocker for roles like `online-moderator` who are tasked with order processing but should not see sensitive cost-price data.

**Key Changes in `app/Http/Controllers/PurchaseOrderController.php`**:
- **Validation Rules**: Changed `unit_cost` from `required` to `nullable`.
- **Defaulting Logic**: Implemented fallback logic to set `unit_cost` to `0` if omitted by the frontend.
- **Transactions**: Ensured that `total_amount` and `subtotal_amount` calculations handle null/zero costs gracefully during the `draft` phase.

```php
// Before:
'items.*.unit_cost' => 'required|numeric|min:0',

// After:
'items.*.unit_cost' => 'nullable|numeric|min:0',
```

---

## 3. Network Layer: Dynamic Store Scoping

The application transitioned from a hardcoded path-prefix scoping model to a dynamic, role-based scoping model. This ensures that any new module added to the system is automatically protected without manual prefix registration.

### 3.1 Axios Interceptor Refactor (`lib/axios.ts`)
The `axiosInstance` now inspects the user's role before every request. Global roles (`super-admin`, `admin`, `branch-manager`) are allowed to bypass scoping, while all other roles are automatically restricted to their assigned `store_id`.

**Logic Breakdown**:
- **Identification**: The interceptor checks `AuthContext` flags (`isGlobal`, `isScoped`).
- **Store Retrieval**: Retrieves `storeId` from `localStorage` (managed by `AuthContext`).
- **Injection**:
    - For `GET` and `DELETE` requests: Injects `store_id` into `params`.
    - For `POST`, `PUT`, `PATCH` requests: Injects `store_id` into the request body.

**Path Exceptions**:
Certain paths are exempt from automatic scoping to avoid breaking core functionality:
- `/auth/**` (Login/Logout)
- `/public/**` (Catalog access)
- `/customers/**` (E-commerce client routes)
- `/stores` (Initial store selection)

---

## 4. Frontend Security Model

### 4.1 AuthContext Improvements
The `AuthContext` was enhanced with named helpers to simplify role checks across the codebase. This prevents "magic string" role checks and provides a single source of truth for role permissions.

**New Helpers**:
- `canAccessPOS`: `['super-admin', 'admin', 'branch-manager', 'pos-salesman']`
- `canAccessOrders`: `['super-admin', 'admin', 'branch-manager', 'online-moderator']`
- `canAccessInventory`: `['super-admin', 'admin', 'branch-manager', 'online-moderator', 'pos-salesman']`

### 4.2 RouteGuard Component
The `RouteGuard` component was deployed globally to protect entire sections of the application. It performs pre-render checks and redirects unauthorized users to either the store selector or the dashboard.

**Deployment Points**:
- `app/accounting/layout.tsx`
- `app/settings/layout.tsx`
- `app/inventory/reports/layout.tsx`
- *And all other administrative modules.*

### 4.3 AccessControl Component
For fine-grained UI restrictions, the `AccessControl` component was implemented. This allows developers to hide specific buttons, columns, or data fields without disrupting the overall layout.

---

## 5. Role-Specific Implementation Details

### 5.1 Online Moderator (`online-moderator`)
The moderator role is focused on Social Commerce and Order Management. While they have access to the Purchase Orders module for tracking shipments and receiving goods, they must not see financial/cost data.

**UI Overrides in `app/purchase-order/page.tsx`**:
- **Unit Cost Column**: Hidden in both the main list view and the expanded item details.
- **Totals Summary**: Financial summaries (Total Cost, Subtotal Cost) are hidden.
- **PO Approval**: The "Approve" button is hidden, as moderators should only reach the `draft` or `partially_received` states; final approval remains an admin/manager task.

### 5.2 POS Salesman (`pos-salesman`)
Salesmen are restricted to their assigned physical branch. Their view of the enrollment/fulfillment queue must be relevant to their physical location.

**Changes in `app/social-commerce/package/page.tsx`**:
- **Order Type Filtering**: The `fetchPendingOrders` function was updated to inject `order_types=['pos', 'video-shopping', 'walking-customer']` when the user is a salesman.
- **Fulfillment Queue**: This ensures that salesmen only see local or hybrid orders that they are physically responsible for packing and delivering from the branch.

---

## 6. Verification Metrics

| Feature | Role | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| Accounting Access | Online Moderator | Redirect to Dashboard | PASS |
| Purchase Order Cost | Online Moderator | Elements not rendered in DOM | PASS |
| POS Queue Filtering | POS Salesman | Only POS/Walking/Video orders visible | PASS |
| CRUD Store Scoping | POS Salesman | `store_id` auto-injected in request body | PASS |
| Admin Global Bypass | Super Admin | Access all stores without `store_id` injection | PASS |

---

## 7. Future Roadmap (Phase 2)
1.  **Activity Logging**: Implement role-based auditing to track which user modified which order.
2.  **Notification Scoping**: Ensure push notifications and toasts are only sent to roles related to the event's branch.
3.  **Variable Pricing**: Allow admins to set role-specific discounts or pricing tiers.

---

## 8. Conclusion
The RBAC Phase 1 rollout successfully bridges the gap between hardware-level integration (POS/Printers) and high-level administrative management. By combining backend validation flexibility with frontend interceptor-driven scoping, we have created a robust, scalable security architecture for Errum V2.

---
*End of Report*

---

### Appendix A: Modified Files List
- `errum_be/app/Http/Controllers/PurchaseOrderController.php`
- `lib/axios.ts`
- `contexts/AuthContext.tsx`
- `components/AccessControl.tsx`
- `components/RouteGuard.tsx`
- `lib/accessMap.ts`
- `app/purchase-order/page.tsx`
- `app/social-commerce/package/page.tsx`
- `app/accounting/layout.tsx`
- `app/settings/layout.tsx`
- `app/inventory/layout.tsx`
- `app/orders/layout.tsx`
- `app/pos/layout.tsx`
- `app/employees/layout.tsx`
- `app/returns/layout.tsx`
- `app/lookup/layout.tsx`
- `services/orderService.ts`
- `services/productService.ts`

---
### Appendix B: Technical Debt Resolved
- Removed legacy `STORE_SCOPED_PREFIXES` from `lib/axios.ts`.
- Standardized `roles` prop across all RBAC components.
- Resolved type-mismatches in `productService` for `is_archived` param.

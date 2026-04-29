# Technical Proposal: RBAC & Access Control Modernization
**Errum V2** — 30 Mar 2026

---

## 1. Executive Summary

This proposal outlines a comprehensive strategy to refactor the Role-Based Access Control (RBAC) system in Errum V2. The primary goal is to shift from a backend-heavy permission-middleware architecture to a streamlined, frontend-driven **"Role & Feature" responsiveness model**. By removing hierarchical "levels" and transitioning to a fixed set of business-aligned roles, we will simplify system management while enhancing the user experience through contextual UI adaptation.

The refactor will focus on three pillars:

- **Backend**: Simplifying the `roles` table, removing the `level` column, and establishing a core set of 6 roles.
- **Frontend**: Implementing a centralized access control layer in `AuthContext` to enable/disable features based on role and store assignment.
- **Store Scoping**: Refining the automated `axios` interceptor logic to ensure branch-level users are strictly confined to their assigned location while maintaining global visibility for administrators.

---

## 2. Current System Analysis & Identified Issues

### 2.1 The "Level" Hierarchy Problem

Currently, the system uses an integer-based `level` (e.g., Super Admin = `100`, Viewer = `10`) to determine hierarchy. While this seems intuitive, it creates several issues:

- **Ambiguity**: Does Level 70 (Warehouse Manager) inherently have all permissions of Level 60 (Sales Rep)? In a complex ERP, "higher" does not always mean "more". A Warehouse Manager needs access to inventory adjustments but not necessarily to payroll.
- **Maintenance Overhead**: Adding a new role between Level 70 and 80 requires manual adjustment of levels and potentially breaking logic that uses `>=` or `<=` operators.
- **API Complexity**: The backend often has to perform level-based checks which are harder to audit than explicit role-based checks.

### 2.2 Fragmented Permission Management

The system currently maintains a `permissions` table and a `role_permissions` pivot. While flexible, the goal is to move towards **no middleware in the backend**.

- **Legacy Middleware**: `routes/api.php` still contains various protected groups that rely on permission strings.
- **Database Bloat**: Hundreds of discrete permissions (e.g., `orders.view`, `orders.edit`, `orders.delete`) make the role management UI overwhelming for administrators.

### 2.3 Store Scoping Inconsistencies

The `axios` interceptor currently uses a heuristic based on role slugs and permission strings (`stores.create`, etc.) to decide if a request should be injected with a `store_id`. This logic is decentralized and risks **data leakage** if new endpoints are added without being manually included in the `STORE_SCOPED_PREFIXES` array.

---

## 3. Proposed Backend Refactoring

### 3.1 Role Model & Schema Updates

The `Role` model and migration will be simplified. The `level` column will be deprecated and eventually dropped in favor of a strictly named role set.

**`[MODIFY]` `roles` table**

- **Remove**: `level` column.
- **Fixed Roles (Seeder)**:

| `super-admin` | Super Admin | System orchestrator |
| `admin` | Admin | General administrator |
| `branch-manager` | Branch Manager | Operations leader for a specific branch |
| `online-moderator` | Online Moderator | Handles social commerce orders and store assignment |
| `pos-salesman` | POS Salesman | Handles POS counter duty and online order fulfillment |
| `employee` | Employee | Basic staff for customer interaction and inventory |

### 3.2 Endpoint Simplification

The backend will move towards a **"Flat Auth"** model:

- **Authentication**: All non-public routes will still require `auth:api` (JWT verification).
- **Authorization**: The backend will enforce a basic "Is this user an Employee?" check. Specific "can they see this button?" logic moves to the frontend.
- **Store Enforcement**: Instead of complex permission middleware, controllers will rely on the `store_id` injected by the frontend, with backend validation to ensure a non-admin cannot override their assigned `store_id`.

---

## 4. Proposed Frontend Architecture

### 4.1 Centralized Access Control — The `useAccess` Hook

A centralized feature map will replace scattered `hasPermission('orders.view')` checks. Components will instead call `canAccess('ORDERS_MODULE')`.

```typescript
// Proposed Feature Mapping
const FEATURE_ROLES = {
  SALES_POS:                ['pos-salesman', 'branch-manager', 'admin', 'super-admin'],
  ACCOUNTING_REPORTS:       ['branch-manager', 'admin', 'super-admin'],
  INVENTORY_MANAGEMENT:     ['branch-manager', 'employee', 'admin', 'super-admin'],
  SOCIAL_COMMERCE_PACKAGE:  ['pos-salesman', 'branch-manager', 'admin', 'super-admin'],
  SYSTEM_SETTINGS:          ['super-admin'],
};
```

### 4.2 Updating `AuthContext.tsx`

`AuthContext` will be updated to expose a refined user object and helper methods that evaluate the new role set.

```typescript
interface AuthContextType {
  // ... existing fields ...
  role: 'super-admin' | 'admin' | 'branch-manager' | 'online-moderator' | 'pos-salesman' | 'employee';
  isGlobal: boolean; // true for super-admin and admin
  isScoped: boolean; // true for all others
}
```

### 4.3 Automated Store Scoping in `axios.ts`

The interceptor will be simplified to use the `isGlobal` flag from user state:

- If `isGlobal` is **`false`** → always inject the user's `store_id` into `POST`/`PUT`/`PATCH` bodies and `GET`/`DELETE` query params.
- If `isGlobal` is **`true`** → allow the UI to control `store_id`, enabling multi-store switching.

---

## 5. Role–Feature Access Matrix

| Feature Module | Super Admin | Admin | Branch Manager | Online Mod | POS Salesman | Employee |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard (Global) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dashboard (Branch) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Inventory (Global) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Inventory (Branch) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| POS Checkout | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Social Comm. / Package | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Accounting / Ledger | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Employee Management | ✅ | ✅ | ✅ (Branch) | ❌ | ❌ | ❌ |
| System Logs / Tech | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Vendor Management | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ad Campaigns | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Returns & Refunds | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Store Settings | ✅ | ✅ | ✅ (Branch) | ❌ | ❌ | ❌ |

### 5.1 Special Case: POS Salesman & "Package" Logic

The `pos-salesman` role is specifically designed for showroom operations. Unlike a general `employee`, they need access to specialized sales tools like Social Commerce Packages. To prevent data leaks or unauthorized cross-branch visibility:

- **Automatic Scoping**: Any API call to `/social-commerce/package-orders` will have an enforced `store_id` header or parameter.
- **UI Masking**: If a POS Salesman attempts to access a package transferred to another branch, the frontend will proactively hide `Edit` and `Delete` actions — even if the list item is visible.

---

## 6. Technical Migration & Data Integrity

### 6.1 Database Migration (Laravel)

The transition requires a safe migration path to avoid locking out existing users.

```php
// Migration: 2026_03_30_xxxxxx_refactor_roles_table.php
public function up()
{
    Schema::table('roles', function (Blueprint $table) {
        $table->dropColumn('level');
    });

    $roles = [
        ['slug' => 'super-admin',     'title' => 'Super Admin'],
        ['slug' => 'admin',           'title' => 'Admin'],
        ['slug' => 'branch-manager',  'title' => 'Branch Manager'],
        ['slug' => 'online-moderator','title' => 'Online Moderator'],
        ['slug' => 'pos-salesman',    'title' => 'POS Salesman'],
        ['slug' => 'employee',        'title' => 'Employee'],
    ];

    foreach ($roles as $role) {
        DB::table('roles')->updateOrInsert(['slug' => $role['slug']], $role);
    }
}
```

### 6.2 Data Mapping for Existing Users

Existing users with legacy roles will be mapped to the new standard roles during migration:

| Legacy Role | New Role |
|---|---|
| `sales-rep` | `pos-salesman` |
| `manager` | `branch-manager` |
| `viewer` | `employee` (limited) |
| `warehouse-staff` | `employee` |

---

## 7. Frontend Integration Strategy (Next.js)

### 7.1 Enhancing `AuthContext` with Role-Based Utilities

Permission-string checks will be replaced with high-level role checks.

```typescript
// app/contexts/AuthContext.tsx enhancement
export const useAuth = () => {
  const context = useContext(AuthContext);

  const isRole = (roleSlugs: string | string[]) => {
    const userRole = context?.user?.role?.slug;
    if (!userRole) return false;
    return Array.isArray(roleSlugs) ? roleSlugs.includes(userRole) : userRole === roleSlugs;
  };

  return {
    ...context,
    canAccessPOS:       isRole(['super-admin', 'admin', 'branch-manager', 'pos-salesman']),
    canManageStore:     isRole(['super-admin', 'admin', 'branch-manager']),
    canViewAccounting:  isRole(['super-admin', 'admin', 'branch-manager']),
  };
};
```

### 7.2 The `AccessControl` Wrapper Component

Components can be wrapped to provide a consistent "Locked" or "Hidden" state.

```tsx
<AccessControl roles={['admin', 'super-admin']} fallback={<p>Admin Only</p>}>
  <SystemSettings />
</AccessControl>
```

---

## 8. Store Scoping — The "Inter-Branch" Security Model

### 8.1 Request Interceptor Logic

The `axios.ts` interceptor is the **"Silent Sentinel"**. It ensures that even if a user manipulates the frontend URL to view another store's ID, the API request will be corrected to their assigned location.

**Logic Flow:**

```
Interceptor fires on every request
        ↓
Is user isGlobal (Super Admin / Admin)?
        ↓
   YES → Allow UI to control store_id freely
        ↓
   NO  → Is store_id present in request?
        ↓
   YES → Does it match user.storeId?
        ↓
   NO  → OVERWRITE with user.storeId  ← security enforced here
```

This ensures a Branch Manager from Store A cannot — accidentally or maliciously — access orders from Store B.

### 8.2 Backend Verification

Since the frontend is not fully trusted, the backend will implement a simple global guard in `Controller.php` or a dedicated middleware:

```php
// Backend enforcement (optional but recommended for baseline safety)
if ($user->role->slug !== 'super-admin' && $request->has('store_id')) {
    if ($request->store_id != $user->store_id) {
        abort(403, 'Unauthorized store access');
    }
}
```

---

## 9. Updating the Employees Page

The Employees page (`app/employees/page.tsx`) currently lists all employees. With the new system:

- **Branch Managers**: Will only see employees in their assigned `store_id`.
- **Admins**: Will see the full global list with a dropdown to filter by store.
- **POS Salesmen / Employees**: Access to this page will be **revoked**.

### 9.1 UI Updates

- Remove `level` displays from employee cards and tables.
- Update the "Role" dropdown in Create/Edit modals to pull from the new 6-role set.
- Add a "Store" tag that is automatically set for branch-level managers when creating new staff.

---

## 10. Efficiency & Performance Gains

| Area | Impact |
|---|---|
| API Latency | De-loading `roles` and `permissions` tables during auth checks saves **10–20ms per request** |
| Code Simplicity | Removing 50+ backend permission checks makes the codebase significantly easier to read and maintain |
| Frontend Hydration | Smaller user objects in JWT/`localStorage` mean faster initial page loads and less browser memory usage |

---

## 11. Implementation Roadmap

### Phase 1 — Foundation *(Days 1–2)*
- Remove `level` column and update `RoleSeeder`.
- Update `Employee` model to simplify role relations.
- Audit all `routes/api.php` for lingering permission middleware.

### Phase 2 — Interceptor & Context *(Day 3)*
- Refactor `axios.ts` for strictly role-based store scoping.
- Update `AuthContext.tsx` to use the new `isGlobal` and `isScoped` flags.

### Phase 3 — Module-by-Module Migration *(Days 4–7)*
- Apply `AccessControl` component to:
  - POS Module
  - Social Commerce (Package orders)
  - Accounting Reports
  - Inventory & Transfers
- Update the `Employees` page to reflect new filtering and visibility rules.

### Phase 4 — Verification & Polishing *(Day 8)*
- Automated testing of cross-store access attempts.
- Manual verification of `pos-salesman` limitations.
- Final documentation of the new role mapping.

---

## 12. Conclusion

The proposed refactor will transform Errum V2 into a more robust and scalable ERP system. By aligning the software architecture with real-world business roles — **Super Admin, Admin, Branch Manager, Online Moderator, POS Salesman, Employee** — we eliminate technical debt and provide a superior development and user experience.
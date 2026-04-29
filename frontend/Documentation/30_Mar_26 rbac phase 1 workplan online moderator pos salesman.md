# RBAC Frontend Implementation — Phase 1 Workplan
**Errum V2** — 30 Mar 2026
**Roles in scope: `online-moderator`, `pos-salesman`**

---

## Overview

This workplan covers the first implementation phase of the frontend RBAC rollout. We are building two things in parallel:

1. **A centralized access control foundation** — the single source of truth for who sees what, built once and reused everywhere.
2. **Role-specific UI responsiveness** — per-page changes for `online-moderator` and `pos-salesman` only, applied after the foundation is in place.

All other roles (`branch-manager`, `employee`, etc.) are untouched in this phase.

---

## Step 1 — Build the Foundation in `AuthContext.tsx`

> Do this first. Every subsequent step depends on it.

### 1.1 Update the Role Type

Replace the old role type with the current role set:

```typescript
type RoleSlug =
  | 'super-admin'
  | 'admin'
  | 'branch-manager'
  | 'online-moderator'
  | 'pos-salesman'
  | 'employee';
```

### 1.2 Add Role Flags to the Context

Expose two computed boolean flags on the context so components never need to compare strings directly:

```typescript
interface AuthContextType {
  // ... existing fields ...
  role: RoleSlug;
  isGlobal: boolean;  // true for super-admin and admin only
  isScoped: boolean;  // true for all others
}
```

Compute them from the user object when the context initializes:

```typescript
const isGlobal = ['super-admin', 'admin'].includes(user?.role?.slug);
const isScoped = !isGlobal;
```

### 1.3 Add the `isRole()` Utility and Named Helpers

Expose a generic `isRole()` checker plus pre-built named helpers for the most common checks:

```typescript
export const useAuth = () => {
  const context = useContext(AuthContext);

  const isRole = (slugs: RoleSlug | RoleSlug[]): boolean => {
    const userRole = context?.user?.role?.slug;
    if (!userRole) return false;
    return Array.isArray(slugs) ? slugs.includes(userRole) : userRole === slugs;
  };

  return {
    ...context,
    isRole,
    // Named helpers — extend this list as new pages are covered
    canAccessPOS:              isRole(['super-admin', 'admin', 'branch-manager', 'pos-salesman']),
    canAccessSocialCommerce:   isRole(['super-admin', 'admin', 'branch-manager', 'online-moderator', 'pos-salesman']),
    canAccessInventory:        isRole(['super-admin', 'admin', 'branch-manager', 'online-moderator', 'pos-salesman']),
    canAccessOrders:           isRole(['super-admin', 'admin', 'branch-manager', 'online-moderator']),
    canAccessPurchaseOrders:   isRole(['super-admin', 'admin', 'branch-manager', 'online-moderator']),
    canAccessPackagePage:      isRole(['super-admin', 'admin', 'branch-manager', 'pos-salesman']),
  };
};
```

---

## Step 2 — Build the `<AccessControl>` Component

Create `app/components/AccessControl.tsx`. This is the single wrapper used across all pages to show, hide, or replace UI based on role.

```tsx
// app/components/AccessControl.tsx
import { useAuth } from '@/contexts/AuthContext';
import { RoleSlug } from '@/types/roles';

interface AccessControlProps {
  roles: RoleSlug[];
  children: React.ReactNode;
  fallback?: React.ReactNode; // optional replacement UI; defaults to null (hidden)
}

export default function AccessControl({ roles, children, fallback = null }: AccessControlProps) {
  const { isRole } = useAuth();
  return isRole(roles) ? <>{children}</> : <>{fallback}</>;
}
```

**Usage pattern:**

```tsx
// Hide entirely
<AccessControl roles={['super-admin', 'admin']}>
  <ApprovePOButton />
</AccessControl>

// Replace with a placeholder
<AccessControl roles={['super-admin', 'admin']} fallback={<span className="text-gray-400">—</span>}>
  <CostPriceCell value={item.cost_price} />
</AccessControl>
```

---

## Step 3 — Build the Page-Level Route Guard

Create a `withRoleGuard` HOC (or a `<RouteGuard>` component) that wraps entire pages. If a user navigates to a route they're not permitted to access, they are redirected to their appropriate landing page instead of seeing a 403.

```tsx
// app/components/RouteGuard.tsx
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { RoleSlug } from '@/types/roles';

interface RouteGuardProps {
  allowedRoles: RoleSlug[];
  children: React.ReactNode;
}

export default function RouteGuard({ allowedRoles, children }: RouteGuardProps) {
  const { isRole, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isRole(allowedRoles)) {
      router.replace('/dashboard'); // redirect to safe default
    }
  }, [isLoading]);

  if (isLoading || !isRole(allowedRoles)) return null;
  return <>{children}</>;
}
```

---

## Step 4 — Centralized Page Access Map

Define which roles can access which pages in one place. This is the hardcoded map that drives `RouteGuard` across the app. Add it to `lib/accessMap.ts` or alongside `AuthContext`.

```typescript
// lib/accessMap.ts
import { RoleSlug } from '@/types/roles';

export const PAGE_ACCESS: Record<string, RoleSlug[]> = {
  '/dashboard':                      ['super-admin', 'admin', 'branch-manager', 'online-moderator', 'pos-salesman', 'employee'],
  '/social-commerce':                ['super-admin', 'admin', 'branch-manager', 'online-moderator'],
  '/social-commerce/package':        ['super-admin', 'admin', 'branch-manager', 'pos-salesman'],
  '/inventory':                      ['super-admin', 'admin', 'branch-manager', 'online-moderator', 'pos-salesman'],
  '/inventory/reports':              ['super-admin', 'admin', 'branch-manager'],
  '/orders':                         ['super-admin', 'admin', 'branch-manager', 'online-moderator'],
  '/purchase-orders':                ['super-admin', 'admin', 'branch-manager', 'online-moderator'],
  '/pos':                            ['super-admin', 'admin', 'branch-manager', 'pos-salesman'],
  '/accounting':                     ['super-admin', 'admin', 'branch-manager'],
  '/employees':                      ['super-admin', 'admin', 'branch-manager'],
  '/settings':                       ['super-admin', 'admin'],
};
```

Wrap each page's root layout with `<RouteGuard allowedRoles={PAGE_ACCESS['/your-route']}>`.

---

## Step 5 — `online-moderator` Page-by-Page Changes

### 5.1 Social Commerce (`/social-commerce` and `/social-commerce/amount-details`)

**Access**: ✅ Full access to place orders.

No UI changes needed beyond the route guard. The existing social commerce order flow is unchanged.

---

### 5.2 Inventory Pages (`/inventory/*`)

**Access**: ✅ All inventory pages **except** `/inventory/reports`.

The route guard on `/inventory/reports` handles the block. No further in-page changes needed for this role.

---

### 5.3 Orders Page (`/orders`)

**Access**: ✅ Can view, edit, and update all orders in all store.

---

### 5.4 Purchase Orders Page (`/purchase-order`)

**Access**: ✅ Can create POs (quantity + selling price only). ❌ Cannot see `cost_price`. ❌ Cannot approve POs.

**Changes required:**

**A — Hide `cost_price` column in the PO list table:**

```tsx
<AccessControl roles={['super-admin', 'admin', 'branch-manager']}>
  <th>Cost Price</th>
</AccessControl>

// and in each row:
<AccessControl roles={['super-admin', 'admin', 'branch-manager']} fallback={<td>—</td>}>
  <td>{item.cost_price}</td>
</AccessControl>
```

**B — Hide `cost_price` field in the Create/Edit PO form:**

```tsx
<AccessControl roles={['super-admin', 'admin', 'branch-manager']}>
  <div>
    <label>Cost Price</label>
    <input name="cost_price" ... />
  </div>
</AccessControl>
```

> ⚠️ Confirm the backend already allows `cost_price` to be `null` or absent on PO creation. If not, a backend patch is required before this frontend change goes live.

**C — Hide the Approve button:**

```tsx
<AccessControl roles={['super-admin', 'admin', 'branch-manager']}>
  <ApprovePOButton poId={po.id} />
</AccessControl>
```

---

### 5.5 full access to (`/store-assignment` and `/social-commerce/package`)

---



## Step 6 — `pos-salesman` Page-by-Page Changes

### 6.1 POS Page (`/pos`)

**Access**: ✅ Full access.

Route guard applied. No in-page restrictions for this role.

---

### 6.2 Inventory Pages (`/inventory`)

**Access**: ✅ Can view stock across all branches (read-only view).

No in-page UI changes needed. The route guard grants access; the `isScoped` flag on the interceptor does not restrict inventory reads since the moderator needs cross-branch visibility.

> If inventory pages have any "Transfer Stock" or "Adjust Batch" actions that `pos-salesman` should not perform, wrap those in `<AccessControl roles={['super-admin', 'admin', 'branch-manager']}>` at that time.

---

### 6.3 Social Commerce Package Page (`/social-commerce/package`)

**Access**: ✅ Can access, but **only sees online orders (e-commerce + social-commerce) scoped to their branch**.

**Changes required:**

The package list page fetches orders to fulfill. For `pos-salesman`, the fetch must filter by:
- `order_type`: `social_commerce` or `ecommerce` only (exclude `pos` orders)
- `store_id`: their assigned store only (already handled by the `axios` interceptor if `isScoped` is `true`)

Apply the `order_type` filter conditionally in the fetch call:

```typescript
const { isRole, user } = useAuth();
const isPOSSalesman = isRole('pos-salesman');

const params = {
  store_id: user.store_id,
  ...(isPOSSalesman && { order_types: ['social_commerce', 'ecommerce'] }),
};

const response = await axios.get('/social-commerce/package-orders', { params });
```

No additional UI elements need to be hidden on this page for this role.

---

## Step 7 — `axios.ts` Interceptor Update

Update the interceptor to use the `isGlobal` flag rather than any permission-string heuristics.

```typescript
// lib/axios.ts — request interceptor
axiosInstance.interceptors.request.use((config) => {
  const user = getUserFromStorage(); // however auth state is currently read
  if (!user) return config;

  const isGlobal = ['super-admin', 'admin'].includes(user.role?.slug);

  if (!isGlobal && user.store_id && !config.skipStoreScope) {
    // Inject store_id into body for mutating requests
    if (['post', 'put', 'patch'].includes(config.method || '')) {
      config.data = { ...config.data, store_id: user.store_id };
    }
    // Inject store_id into params for read requests
    if (['get', 'delete'].includes(config.method || '')) {
      config.params = { ...config.params, store_id: user.store_id };
    }
  }

  return config;
});
```

> This replaces any existing `STORE_SCOPED_PREFIXES` array logic entirely.

### Per-Request Scope Override (`skipStoreScope`)

For cases where a scoped role needs cross-branch read access on a specific call (e.g., `online-moderator` viewing inventory across all stores), pass `skipStoreScope: true` on the request config. The interceptor will skip store injection for that call only.

```typescript
// Cross-branch read — store_id will NOT be injected
const response = await axios.get('/inventory', {
  params: { all_stores: true },
  skipStoreScope: true,
});
```

To prevent TypeScript from complaining about the custom flag, extend the Axios config type:

```typescript
// types/axios.d.ts
import 'axios';
declare module 'axios' {
  interface AxiosRequestConfig {
    skipStoreScope?: boolean;
  }
}
```

---

## Completion Checklist

### Foundation
- [ ] `RoleSlug` type updated with all 6 current roles
- [ ] `isGlobal` / `isScoped` flags added to `AuthContext`
- [ ] `isRole()` and named helpers exported from `useAuth()`
- [ ] `<AccessControl>` component created
- [ ] `<RouteGuard>` component created
- [ ] `PAGE_ACCESS` map defined in `lib/accessMap.ts`
- [ ] `axios.ts` interceptor refactored

### `online-moderator`
- [ ] Route guard applied: `/social-commerce`, `/inventory/*` (excluding `/inventory/reports`), `/orders`, `/purchase-orders`
- [ ] `/inventory/reports` blocked via route guard
- [ ] PO list: `cost_price` column hidden
- [ ] PO form: `cost_price` field hidden
- [ ] PO list: Approve button hidden
- [ ] Backend confirmed: PO creation works without `cost_price`

### `pos-salesman`
- [ ] Route guard applied: `/pos`, `/inventory`, `/social-commerce/package`
- [ ] Package page: fetch filtered to `social_commerce` + `ecommerce` order types only
- [ ] Package page: store scoping confirmed via interceptor
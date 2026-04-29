# Errum V2 RBAC Centralized Reference

## Scoped Access Control Strategy (Phase 1)
Effective: 30 Mar 2026
Roles in scope: `online-moderator`, `pos-salesman`

---

## 1. Role Classification

| Role | Slug | Global Access | Automated Scoping | Main Domain |
| :--- | :--- | :--- | :--- | :--- |
| Super Admin | `super-admin` | ✅ | ❌ No | Global |
| Admin | `admin` | ✅ | ❌ No | Global |
| Branch Manager| `branch-manager` | ❌ No | ❌ No (Handles manually if needed) | Local Branch |
| Online Moderator | `online-moderator` | ❌ No | ✅ Yes | Social Commerce / PO |
| POS Salesman | `pos-salesman` | ❌ No | ✅ Yes | POS / Local Fulfillment |
| Employee | `employee` | ❌ No | ✅ Yes | General tasks |

---

## 2. Automated Scoping (Axios Interceptor)

All requests made via `axiosInstance` are automatically scoped to the user's `store_id` unless one of the following criteria is met:
1.  User is in a **Global Role** (`super-admin`, `admin`).
2.  Route is a **Public Route** (`/catalog`, `/login`, etc.).
3.  Route is a **Customer Route** (`/customer-auth`, `/cart`, etc.).
4.  The request explicitly includes `skipStoreScope: true` in the config.

### Usage Example: Scoping Override
For cross-store inventory lookups where a scoped role needs full catalog visibility:
```typescript
const res = await axiosInstance.get('/inventory/global-stock', {
  skipStoreScope: true, // Manual bypass
  params: { ... }
});
```

---

## 3. UI Layer: `AccessControl` and `RouteGuard`

### AccessControl Component
Hide or show specific UI fragments based on user roles.
```tsx
<AccessControl roles={['super-admin', 'admin', 'branch-manager']}>
  <ApproveButton />
</AccessControl>
```

### RouteGuard (Layout Level)
Protect entire modules or pages. Redirects to `/dashboard` on unauthorized access.
Usage in `layout.tsx`:
```tsx
<RouteGuard allowedRoles={PAGE_ACCESS['/accounting']}>
  {children}
</RouteGuard>
```

---

## 4. Specific Business Logic Rules

### Purchase Orders (`/purchase-order`)
- **Online Moderator**:
    - **Visibility**: 🚫 Cannot see `unit_cost` or subtotal cost.
    - **Actions**: 🚫 Cannot approve `draft` POs.
    - **Backend**: Allowed to submit POs with null `unit_cost` (defaults to 0 on server).

### Social Commerce Package (`/social-commerce/package`)
- **POS Salesman**:
    - **Filter**: Automatically filtered to only show `pos`, `video-shopping`, and `walking-customer` order types via `fetchPendingOrders` logic.
    - **Scope**: Native `store_id` enforcement via interceptor.

---

## 5. Technical Specification

- **Context**: `AuthContext.tsx`
- **Hook**: `useAuth()` (provides `isRole()`, `isGlobal`, `isScoped` helpers)
- **Interceptor**: `lib/axios.ts`
- **Mapping**: `lib/accessMap.ts`
- **TS Extensions**: `types/axios.d.ts` (adds `skipStoreScope` to `AxiosRequestConfig`)

---

## 6. Best Practices

### When to use `skipStoreScope`
- **Catalog Management**: Global product searches that must ignore store inventory.
- **Reporting**: Aggregating data from multiple outlets.
- **Transfers**: Inter-store stock movement source-lookup.

### When NOT to use `skipStoreScope` (Default Scoping preferred)
- **POS Transactions**: Sales MUST be recorded against the user's branch for accounting.
- **Order Processing**: Fulfillment MUST be tied to the branch where items are stored.
- **Batch Adjustments**: Physical inventory corrections are location-specific.

### Implementation Checklist for Developers
- [ ] Wrap new admin pages with `<RouteGuard allowedRoles={PAGE_ACCESS['/path']}>`.
- [ ] Use `<AccessControl roles={['...']}>` for sensitive fields (e.g., `cost_price`).
- [ ] Ensure any new mutating controllers in the backend accept `store_id` if they aren't globally scoped on the server.

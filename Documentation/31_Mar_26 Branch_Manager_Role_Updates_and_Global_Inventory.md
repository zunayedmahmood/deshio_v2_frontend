# Documentation: Branch Manager Role Refinement & Global RBAC Cleanup (31 Mar 2026)

This document summarizes the changes made to the Deshio V2 platform to tighten the `branch-manager` role's access, standardize administrative page security, and implement global visibility for key operations like returns and inventory.

## 1. Branch Manager Role Refinement

The `branch-manager` role has been significantly tightened to focus solely on branch operations, removing access to centralized administrative and financial modules.

### Feature Access Restrictions (`lib/accessMap.ts`)
- **Modules Removed**: The following routes are NO LONGER accessible to the `branch-manager`:
    - `/accounting`, `/transaction` (Financials restricted to Admin only)
    - `/vendor`, `/purchase-order` (Procurement restricted to Admin/Moderator)
    - `/employees` (HR restricted to Admin only)
    - `/store-assignment`, `/category`, `/gallery`, `/campaigns` (System setup restricted to Admin only)
- **Social Commerce Scoping**: Access is now strictly limited to `/social-commerce/package`. All other sub-routes (Dashboard, Amount Details, etc.) have been removed for this role.

### Enhanced Features for Branch Managers
- **Purchase History (`app/purchase-history/page.tsx`)**:
    - The manager's assigned store is now **pre-selected** in the filter dropdown by default.
    - Managers retain the ability to switch stores for cross-outlet history lookups.
- **Cross-Store Returns (`app/returns/page.tsx`)**:
    - Granted **global visibility** for returns. Managers can now view return/exchange data from all stores to facilitate easier cross-branch customer service.
    - Updated `productReturnService.ts` to support `skipStoreScope` for this purpose.

---

## 2. POS Interface Lockdown

To maintain consistency with the `pos-salesman` role, the Store Selection on the POS page has been enforced for Branch Managers.

- **Store Selection (`app/pos/page.tsx`)**: 
    - The store selection dropdown is now **permanently disabled** for Branch Managers and POS Salesmen.
    - These users are locked into their assigned branch to ensure transactional integrity at the point of sale.

---

## 3. Global RBAC Cleanup & Security

### Admin-Only Lockdown
The following modules are now restricted to `super-admin` and `admin` roles only:
- `/campaigns`, `/transaction`, `/category`, `/gallery`, `/accounting`, `/employees`

### System Cleanup (Sidebar Removal)
- **Full Menu Removal**: The "Access Control" (Roles & Permissions) menu has been **completely removed** from the `Sidebar.tsx` for **EVERYBODY**. This simplifies the UI and enforces a programmatic-only management of roles for the current deployment phase.
- **Inventory Reports**: Restricted strictly to `super-admin` and `admin`.

---

## 4. Implementation Summary

| Component | Change Summary |
| --- | --- |
| `lib/accessMap.ts` | Finalized page-level backend permissions. |
| `components/Sidebar.tsx` | Removed "Access Control" from the UI for all roles. |
| `app/pos/page.tsx` | Enforced unchangeable store selection for Branch Managers. |
| `app/returns/page.tsx` | Enabled global cross-outlet returns tracking. |
| `app/purchase-history/page.tsx` | Implemented pre-selection of the manager's assigned branch. |


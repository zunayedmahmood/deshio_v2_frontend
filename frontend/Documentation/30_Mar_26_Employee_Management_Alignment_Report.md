# Employee Management Frontend Alignment (30 Mar 2026)

## Overview
Following the backend RBAC refactor and store-scoping strategy update, the Employee Management module has been updated to ensure consistency with the new 6-role canonical set and to implement controller-governed store isolation for branch roles.

## Changes Implemented

### 1. Employee Management Page (`app/employees/page.tsx`)
- **Role-Based Access Control**:
  - Implemented client-side authorization using `useAuth`.
  - Access is now strictly limited to `super-admin`, `admin`, and `branch-manager`.
  - Unauthorized users (Online Moderators, POS Salesmen, etc.) are now redirected to a standard `AccessDenied` view.
- **Store Scoping for Branch Managers**:
  - If a `branch-manager` accesses the page, the `store_id` filter is automatically initialized to their assigned `store_id`.
  - The store selection dropdown is hidden for Branch Managers to prevent data leak attempts.
- **Global Administrator Flexibility**:
  - `super-admin` and `admin` roles retain the ability to view all employees across all stores using a new store filter dropdown.
- **Statistics Isolation**:
  - Updated the stats fetching logic to be aware of the user's role-based scope.

### 2. Employee Creation & Editing (`CreateEmployeeModal.tsx`, `EditEmployeeModal.tsx`)
- **Store Locking**:
  - For `branch-manager` users, the store selection is now pre-populated with their assigned store and the field is `disabled`.
  - Global administrators can still select any active store.
- **Role Filtering**:
  - Prevented non-global managers from creating or assigning administrative roles (`super-admin`, `admin`).
  - The role list now pulls dynamically from the backend, which has been purged of the `accountant` role.
- **Data Consistency**:
  - Enforced `Number()` casting for IDs to ensure compatibility with the `AuthContext` state.

### 3. Backend Service Reinforcement (`EmployeeController.php`)
- **Stats Scoping**:
  - Updated `getEmployeeStats()` to honor the same scoping logic as the employee list.
  - Non-global roles now receive statistics only for their assigned store.
- **List Scoping**:
  - Re-verified that the `getEmployees()` endpoint correctly isolates data for branch roles while allowing global roles to filter by `store_id`.

## Security & Behavior Policies

| Feature | Super Admin / Admin | Branch Manager | Others |
| :--- | :--- | :--- | :--- |
| **Page Access** | ✅ Full Access | ✅ Scoped Access | ❌ Access Denied |
| **Data Visibility** | Global (All Stores) | Restricted (Own Store) | N/A |
| **Actions** | Add/Edit/Delete globally | Add/Edit/Delete local | N/A |
| **Role Assignment** | All 6 Roles | Restricted (Staff only) | N/A |

## Verification Results
- [x] **Access Control**: Attempting to access `/employees` as a POS Salesman displays the `AccessDenied` component.
- [x] **Data Isolation**: Branch Managers only see employees assigned to their specific `store_id`.
- [x] **Modal Logic**: Store field is locked for Branch Managers while remaining open for Admins.
- [x] **Stats Audit**: Dashboard stats now match the filtered employee count for branch-level users.
- [x] **Cleanup**: All references to the decommissioned `accountant` role have been removed from the UI.

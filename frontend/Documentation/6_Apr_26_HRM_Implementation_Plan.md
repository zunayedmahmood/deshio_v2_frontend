# HRM Implementation & Enhancement Workplan (6 Apr 2026)

This document outlines the detailed steps required to complete and robustify the Human Resource Management (HRM) system in Errum V2.

## 1. Database & Model Schema Updates

### 1.1 Store Attendance Policy
Add fields to `store_attendance_policies` to support automated financial calculations.
- **File**: `errum_be/app/Models/StoreAttendancePolicy.php`
- **Migration**: Create a migration to add:
    - `late_fee_per_minute` (decimal, default 0)
    - `overtime_rate_per_hour` (decimal, default 0)
    - `grace_period_minutes` (integer, default 0)

### 1.2 Orders Table
Enable tracking of the actual salesperson responsible for a sale, separate from the user who created the record.
- **File**: `errum_be/app/Models/Order.php`
- **Migration**: Create a migration to add `salesman_id` (nullable, foreign key to `employees.id`).

### 1.3 Attendance & Overtime
Ensure calculations are stored for historical accuracy even if policies change.
- **File**: `errum_be/app/Models/EmployeeAttendance.php`
    - Add `late_minutes` (integer)
    - Add `late_fee` (decimal)
- **File**: `errum_be/app/Models/EmployeeOvertime.php`
    - Add `overtime_pay` (decimal)

---

## 2. Backend Logic Improvements

### 2.1 Automated Late & Overtime Calculation
Update the attendance marking logic to automatically calculate financial impacts.
- **File**: `errum_be/app/Http/Controllers/AttendanceController.php`
- **Logic**:
    - In `markAttendance`, if `status` is `late`, calculate `late_minutes` (Actual In - Schedule Start).
    - If `late_minutes > grace_period_minutes`, calculate `late_fee = (late_minutes - grace_period_minutes) * late_fee_per_minute`.
    - In `markOvertime`, calculate `overtime_pay = (overtime_minutes / 60) * overtime_rate_per_hour`.

### 2.2 Sales Performance Tracking
Shift performance tracking from "who created the order" to "who is the assigned salesman".
- **File**: `errum_be/app/Services/SalesTargetAggregationService.php`
- **Change**: In `recomputeDailySales`, change the query to filter by `salesman_id` instead of `created_by`. Fallback to `created_by` if `salesman_id` is null (for backward compatibility).

### 2.3 Sales Target Management
Simplify monthly target setting for managers.
- **File**: `errum_be/app/Http/Controllers/SalesTargetController.php`
- **Feature**: Add `copyLastMonthTargets(Request $request)` method.
    - Input: `store_id`, `target_month`.
    - Logic: Fetch targets for `target_month - 1` and `updateOrCreate` for the current month.

---

## 3. Frontend Implementation (Next.js)

### 3.1 Attendance Management (Branch Manager)
Fix the mismatch between frontend "Clock In/Out" and backend bulk marking.
- **File**: `app/hrm/branch/page.tsx` & `components/hrm/AttendanceModal.tsx`
- **Tasks**:
    - Update `AttendanceModal` to send data in the format expected by `AttendanceController@markAttendance`.
    - Add an "Edit" button for each attendance row to allow managers to fix arrival/departure mistakes (using `AttendanceController@updateAttendance`).
    - Implement a "Duty Check" indicator in the staff list based on the `EmployeeWorkSchedule`.

### 3.2 Sales Targets (Branch Manager)
- **File**: `app/hrm/sales-targets/page.tsx`
- **Tasks**:
    - Add a "Copy from Last Month" button that triggers the new backend endpoint.
    - Ensure the targets list is editable directly or via a modal.

### 3.3 Rewards & Fines (Branch Manager)
- **File**: `app/hrm/rewards-fines/page.tsx`
- **Tasks**:
    - Fully implement the listing of rewards and fines for the branch.
    - Integrate the `RewardFineDialog` for creating and editing entries.

### 3.4 Employee My Panel (Self-Service)
- **File**: `app/hrm/my/page.tsx`
- **Tasks**:
    - Replace dummy notifications with real data from `EmployeePanelController@getMyRewardsFines`.
    - Show a breakdown of "Total Rewards" and "Total Fines" for the current month.
    - Show detailed performance insights (e.g., "3 Lates this month" calculated from real attendance data).

### 3.5 Store Panel (View Only)
- **File**: `app/hrm/layout.tsx` (or a shared component)
- **Tasks**:
    - Implement the "View Only" restriction for non-managers.
    - Pre-select the user's branch for all HRM views.

---

## 4. Integrity & Robustness

### 4.1 RBAC Enforcement
- **Backend**: Ensure `assertStoreAccess` is used in all HRM and Sales Target controllers.
- **Frontend**: Use the `AccessControl` component to hide "Edit" or "Set" buttons from non-managers/admins.

### 4.2 Data Integrity
- Ensure that when an order is updated/cancelled in the POS, `SalesTargetAggregationService` is triggered to re-sync `EmployeeDailySale`.
- Prevent deleting attendance records that have been "applied" to a salary month (already partially handled by `is_applied` flag in `EmployeeRewardFine`, should be extended to `EmployeeAttendance`).

---

## 5. File List for Implementation

### Backend
- `errum_be/app/Http/Controllers/AttendanceController.php`
- `errum_be/app/Http/Controllers/SalesTargetController.php`
- `errum_be/app/Http/Controllers/EmployeePanelController.php`
- `errum_be/app/Services/SalesTargetAggregationService.php`
- `errum_be/app/Models/StoreAttendancePolicy.php`
- `errum_be/app/Models/Order.php`
- `errum_be/app/Models/EmployeeAttendance.php`
- `errum_be/app/Models/EmployeeOvertime.php`

### Frontend
- `app/hrm/branch/page.tsx`
- `app/hrm/my/page.tsx`
- `app/hrm/attendance/page.tsx`
- `app/hrm/sales-targets/page.tsx`
- `app/hrm/rewards-fines/page.tsx`
- `components/hrm/AttendanceModal.tsx`
- `components/hrm/SalesTargetModal.tsx`
- `components/hrm/RewardFineDialog.tsx`
- `services/hrmService.ts`
- `app/pos/page.tsx` (ensure `salesman_id` is handled)

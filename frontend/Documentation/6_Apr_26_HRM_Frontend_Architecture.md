# HRM Frontend Features & Architecture (6 Apr 2026)

## Overview
The HRM frontend is designed to provide a seamless interface for both individual employees and branch managers to manage attendance, track performance, and oversee store policies. All routes are prefixed with `/hrm` to ensure logical grouping.

---

## 1. Routing Structure & Access

| Route | View | Accessible By | Description |
| :--- | :--- | :--- | :--- |
| `/hrm/my` | **Personal Portal** | All Employees | Self-service dashboard for personal attendance, performance, and rewards. |
| `/hrm/branch` | **Branch Panel** | Managers, Admins | Overview of branch-wide operations, today's attendance, and rankings. |
| `/hrm/attendance` | **Logs & Reports** | Managers, Admins | Detailed attendance history with filtering and export capabilities. |
| `/hrm/sales-targets` | **Goal Management** | Managers, Admins | Interface for setting monthly targets and tracking achievements. |
| `/hrm/rewards-fines` | **Incentives** | Managers, Admins | Management of employee bonuses, fines, and historical records. |

---

## 2. Key Features

### 2.1 Dynamic Store Context
- **Scoped View**: Branch managers are automatically locked to their assigned store.
- **Admin Override**: Super Admins and Admins see a global store selector dropdown at the top of the HRM pages, allowing them to switch context instantly.

### 2.2 Attendance Marking Engine
- **Live Check-in/out**: A dedicated modal in the Branch Panel allows managers to record employee timings with a single click.
- **Auto-Computation**: The system automatically calculates **Overtime** and **Undertime** based on the store's `AttendancePolicy` (e.g., late entry grace periods).
- **Status Indicators**: Visual cues (Green/Yellow/Red) indicate whether an employee is on time, late, or absent.

### 2.3 Sales Target Dashboard
- **Visual Progress**: Dynamic progress bars show individual and branch-wide target achievements.
- **Historical Analysis**: Sidebars/Modals provide a deep dive into an employee's target history and consistency over time.

### 2.4 Reward & Fine Management
- **Instant Recognition**: Managers can issue rewards or fines directly from the employee card.
- **Audit Trail**: Every incentive or penalty is logged with a reason code and the manager's name.

---

## 3. UI/UX Components

### Sidebar Integration
A new top-level **HRM** section is added to the main navigation, with smart visibility logic based on the user's role.

### Dashboard Widgets
- **Daily Attendance Chart**: Shows percentage of present vs. absent staff for the current day.
- **Top Performers**: Leaderboard based on sales target achievement.

---

## 4. Technical Integration
- **State Management**: Uses React Context for `StoreContext` within the HRM module.
- **Service Layer**: All interactions go through `hrmService.ts` which uses the centralized `axiosInstance` for multi-auth and store-scoping.

---
*End of Documentation*

# Backend RBAC Refactor Report (30 Mar 2026)

## Overview
This document summarizes the backend refactoring performed to modernize the Role-Based Access Control (RBAC) system. These changes transition the system from a legacy permission-based model to a streamlined, role-based architecture while maintaining broad visibility for administrative roles.

## Changes Implemented

### 1. Authentication Layer (`AuthController.php`)
- **Refactor**: Modified the `me()` endpoint to stop loading the deprecated `role.permissions` relationship.
- **Rationale**: Reduces payload size and prevents the frontend from relying on deprecated permission data, aligning with the new role-slug-only access control strategy.

### 2. Route Security (`routes/api.php`)
- **Refactor**: Removed the legacy `permission:system.settings.edit` middleware from the product `force-delete` route.
- **Rationale**: Part of the initiative to decommission the legacy `CheckPermission` middleware in favor of explicit role checks.

### 3. Product Management (`ProductController.php`)
- **Refactor**: Implemented an explicit `super-admin` role check within the `forceDelete()` method.
- **Rationale**: Ensures that only high-level global administrators can perform permanent deletions.

### 4. Note Model Visibility (`Note.php`)
- **Refactor**: Rewrote `scopeVisibleTo` and `isVisibleTo` logic to use role-based checks.
- **Logic**: Users with administrative roles (`super-admin`, `admin`, `branch-manager`, `online-moderator`) have visibility into all notes. 
- **Rationale**: Replaces legacy permission checks while ensuring administrators retain cross-store visibility as per business requirements.

### 5. Database Cleanup: Dropping Role Levels
- **Action**: Created migration `2026_03_30_000001_refactor_roles_drop_level_column.php` to permanently drop the `level` column from the `roles` table.
- **Action**: Removed all remaining hardcoded `level` references in the backend, including in `TestSocialCommerceFlow.php`.
- **Rationale**: The hierarchy `level` is no longer used for authorization. Roles are now treated as flat, distinct entities.

## How the System Behaves to Roles

The system now operates on a simplified set of **6 canonical roles**. Authorization is driven by the role's `slug`.

### Role Visibility Policy
The backend is designed to be "dumb" regarding store-scoping at the global level. Broad visibility is preserved for administrative roles to facilitate multi-store operations (e.g., Online Moderators overseeing all online orders).

#### 1. Administrative Roles (Broad Visibility)
- **`super-admin`**: Full system orchestrator.
- **`admin`**: General administrator with global visibility.
- **`branch-manager`**: Oversees specific branch operations but retains visibility into global data where necessary.
- **`online-moderator`**: Centralized role for managing social-commerce orders across all branches.

#### 2. Staff Roles (Branch-Focused)
- **`pos-salesman`**: Focused on local branch POS and fulfillment.
- **`employee`**: Basic branch staff.

### Core Behaviors
- **No Global Store Sentinel**: There is no hardcoded global middleware forcing `store_id` isolation. This ensures that roles like `online-moderator` can access data across multiple stores as required by the business logic.
- **Private Data Visibility**: Private notes and sensitive administrative information are accessible to all defined administrative roles.
- **Data Isolation**: Where specific response isolation is needed, it is handled at the controller level via request parameters rather than enforced globally at the middleware layer.

## Verification Results
- [x] **Grep Audit**: Confirmed `hasPermission` usage is confined to its definition and the legacy middleware.
- [x] **Route Audit**: Confirmed `permission:` middleware is removed.
- [x] **Database Cleanup**: Confirmed `level` column is dropped and references are removed.
- [x] **Middleware Audit**: Verified the removal of the `EnsureStoreScoping` global sentinel.
- [x] **Role Audit**: Confirmed the complete removal of the `accountant` role across the backend.

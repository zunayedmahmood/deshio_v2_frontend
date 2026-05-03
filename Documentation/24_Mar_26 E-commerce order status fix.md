# 24_Mar_26 E-commerce Order Status Fix

## Overview
This update ensures consistency in the order creation workflow for all e-commerce sales channels (both guest and authenticated). The entry-point status for these orders is now strictly unified to `pending_assignment`, allowing them to properly appear in the administrative "Pending Store Assignment" queue.

## Problem
Previously, guest checkout orders were being initialized with a status of `pending`. This caused several issues:
1. **Broken Workflow**: These orders were skipping the store assignment phase despite being unassigned to any specific store at creation.
2. **Missing Visibility**: In the ERP side, `pending` orders with no `store_id` were effectively invisible in both branch-level dashboards and the centralized global "Unassigned Orders" list.
3. **Status Corruption**: The `SslcommerzController` used an invalid status value (`pending_payment`) in failure and cancellation callbacks. Since this value was not in the database ENUM definition, it caused unexpected fallbacks to the default `pending` status, further contributing to the visibility issue.

## Changes Made

### 1. Guest Checkout Status Update
Modified `GuestCheckoutController.php` to set the initial status to `pending_assignment` instead of `pending`.
- **Affected method**: `checkout()`
- **Logic**: This ensures that even guest orders correctly enter the multi-store assignment pipeline.

### 2. SSLCommerz Callback Status Normalization
Removed the non-existent `pending_payment` status and replaced it with `pending_assignment`.
- **Affected file**: `SslcommerzController.php`
- **Logic**: When a payment attempt fails or is cancelled, the order remains in its entry state (`pending_assignment`) but with an `unpaid` payment status. This allows the customer to retry or an employee to follow up without the record disappearing from assignment lists.

## Behavioral Impact
- **New Orders**: All orders created from `/e-commerce` now consistently start as `pending_assignment`.
- **Store-Scoping**: Branch users will no longer see these orders until they are manually or automatically assigned to a specific `store_id` via the `OrderManagementController`.
- **ERP Visibility**: Orders will now appear correctly in the `getPendingAssignmentOrders` result in the specialized administrative module.

## Examples and Edge Cases

### Case 1: Simple COD (Cash on Delivery) Guest Order
- **Action**: Guest completes checkout with COD.
- **Old Behavior**: Order saved as `status = 'pending'`, `payment_status = 'pending'`. Resulted in orphan order (unassigned but marked as ready for processing).
- **New Behavior**: Order saved as `status = 'pending_assignment'`, `payment_status = 'pending'`. Order correctly appears in the "Unassigned Orders" list for employee action.

### Case 2: SSLCommerz Failure
- **Action**: Customer enters payment portal but cancels.
- **Old Behavior**: Order status set to `pending_payment` (invalid). DB fell back to `pending`. Visibility lost.
- **New Behavior**: Order status set to `pending_assignment`. Order correctly remains in the assignment queue, allowing for later payment correction or recovery.

## Files Affected
1. `Deshio_be/app/Http/Controllers/GuestCheckoutController.php`
2. `Deshio_be/app/Http/Controllers/SslcommerzController.php`
3. `Documentation/24_Mar_26 E-commerce order status fix.md` (this file)

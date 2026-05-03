# Frontend Reserve Stock Changes (27 March 2026)

## Overview
This document summarizes the frontend adjustments made to align the `Deshio_v2` UI with the newly introduced **Backend Reservation Model**. The objective was to ensure that global reservations block overselling while preserving existing API structures and workflows.

## 1. Payload Verifications (No Architectural Rewrites Required)
A comprehensive audit confirmed the frontend naturally triggers the correct behaviors in the new backend architecture:
- **E-Commerce Checkout (`app/e-commerce/checkout/page.tsx`)**: Naturally submits `store_id: null`, successfully triggering the new *global reservation* track.
- **Social Commerce (`app/social-commerce/amount-details/page.tsx`)**: Handles warehouse-assigned orders with `store_id: null` and locally-assigned variants with explicit `store_id` seamlessly.
- **POS / Counter (`app/pos/page.tsx`)**: Implicitly transmits the exact terminal's `store_id`, successfully triggering the physical stock *immediate deduction*.
- **Store Assignment (`app/store-assingment/page.tsx`)**: Evaluates `available_quantity` locally and leverages the `assignOrderToStore` endpoint as the single pivot for physical physical stock decrementing.

## 2. Implemented Code Enhancements

### A. E-Commerce Product Variants `available_inventory` Binding
**File Modified**: `app/e-commerce/product/[id]/page.tsx`
- **Issue**: Standard product variants were hard-binding `in_stock` logic to `stock_quantity` (physical stock). This could misleadingly show items as "In Stock" when technically that last item was *globally reserved* by another unassigned online order.
- **Change**: Updated the variant data derivations to prioritize `available_inventory`. 
  - *Example*: `stock_quantity: Number(variant?.available_inventory ?? (variant?.stock_quantity || 0))`
  - *Result*: The public e-commerce UI now strictly adheres to available limits, pre-emptively hiding out-of-stock reserved variations without requiring a checkout rejection.

### B. Validation Error Surface Alignment
**Files Modified**: 
- `app/e-commerce/checkout/page.tsx`
- `app/store-assingment/page.tsx`
- **Issue**: The new backend reservation constraints introduced hard stops on invalid checks, throwing `400 Bad Request: "Insufficient globally available inventory"`. The frontend apps were not explicitly passing down this error.
- **Change**: Injected nested object extractions into the `try/catch` response validators.
  - *Checkout snippet*: `setError(error?.response?.data?.message || error.message || 'Failed to place order...');`
  - *Assignment snippet*: `displayToast(error?.response?.data?.message || error?.message || 'Failed to assign order', 'error');`
  - *Result*: If parallel customers checkout simultaneously resulting in a race condition, the frontend now distinctively informs the user *why* their final stock transaction dropped instead of generating a generic "System Error".

*Note: The POS and Social Commerce modules were verified and effectively extracted backend JSON properties natively without changes.*

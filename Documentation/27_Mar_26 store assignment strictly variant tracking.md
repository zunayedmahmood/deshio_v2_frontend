# Store Assignment: Variant Tracking Hardening (27 March 2026)

## Overview
This document outlines the strict technical alignments pushed to the Store Assignment module. These updates officially drop partial `SKU` fallback inferences, forcing the interface to map explicitly to physical variants (`product_id`) and physical batches constraints.

## 1. Frontend: Removing SKU Agnosticism
**File Modified**: `app/store-assingment/page.tsx`
- **Issue Discovered**: The frontend's `buildWarehouseRowsFromInventory` dynamically assumed fulfillment potential if the parent `SKU` had stock (`Math.max(byPid, bySku)`). This produced false positives: e.g., an order needing a "Size S" might say 100% fulfillable because the warehouse had "Size M" of the same SKU group.
- **Implemented Fix**: Severed and deleted the `bySku` aggregators entirely. The logic now strictly relies on strict variant identities (`const available = byPid`), mapping identical variations correctly at checkout to the assignment process.

## 2. Backend: Variant Verification
**File Modified**: `Deshio_be/app/Http/Controllers/OrderManagementController.php`
- **Issue Discovered**: Although `ProductBatch` is uniquely tied to variant `product_id`, the system was theoretically susceptible to binding to Master Group IDs or Soft-Deleted products.
- **Implemented Fix**: Injected an active variant verifier locally inside `getAvailableStores()` and `assignOrderToStore()`.
  ```php
  if (!$orderItem->product || $orderItem->product->is_archived) { ... }
  ```
  If an assigned requirement does not match a hard physical variant instance, the fulfillment capability is automatically voided (returned as `400` during physical assignment or forced to `0` capacity during lookup).

## 3. Backend: FIFO Weighted Recommendations
**File Modified**: `Deshio_be/app/Http/Controllers/OrderManagementController.php`
- **Issue Discovered**: The assignment recommendation previously suggested any store with a `100%` generic capacity for the required group without considering which store needed to divest the batch first based on expiration guidelines.
- **Implemented Fix**: Extensively rewrote the `getRecommendation()` subset. Rather than just returning the first capable payload, the algorithm searches vertically across capable stores to evaluate `['batches']['expiry_date']`. It then formally selects the optimal `bestStore` based on the earliest expiry benchmark, significantly lowering physical waste metrics. 

## Conclusion
The store fulfillment logic is fundamentally variant-pure. A user ordering a "Size S" uniquely reserves and directs the fulfillment workflow strictly down the "Size S" batch track, rejecting all Master-SKU illusions and optimally mapping assigning orders using FIFO priority.

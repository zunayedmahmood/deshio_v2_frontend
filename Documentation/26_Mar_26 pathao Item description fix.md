# Pathao API Integration Fixes - 26 March 2026

## Objective
The objective was to fix the `item_description` field in Pathao shipments to show a detailed, itemized list of products and their quantities. Additionally, based on the official Pathao Developer API manual, several other "strictly necessary" logic fixes were implemented to ensure successful order creation.

## Issues Identified
1. **Truncated Descriptions**: The `Shipment` model previously limited descriptions to the first 3 items and omitted quantities.
2. **Inconsistent Delivery Type Mapping**: The `PathaoService` was mapping `express` to `48` and `regular` to `12`, which is the exact opposite of the official Pathao manual (`12` for On Demand/Express, `48` for Normal).
3. **Invalid Weight Minimum**: The `ShipmentController` used a minimum weight of `0.1kg`, but the Pathao manual explicitly states a minimum requirement of `0.5kg`.
4. **Multi-Store Descrepancies**: Multi-store shipments lacked the detailed product-quantity format.

## Implementation Details

### 1. Itemized Description (`Shipment.php`)
- Rewrote `getPackageDescription()` to iterate through all items in the order.
- Format: `Product Name (Variant) qty:X` joined by newlines.
- Added a safety truncation at **250 characters** to prevent API payload errors while maintaining maximum detail.

### 2. Delivery Type Alignment (`PathaoService.php`)
- Corrected the `delivery_type` mapping to match the Pathao Merchant API:
    - **12**: On Demand / Express.
    - **48**: Normal / Regular.

### 3. Weight Constraint (`ShipmentController.php`)
- Updated the `item_weight` calculation to use `max($totalWeight, 0.5)` to satisfy the Pathao API's minimum weight requirement.

### 4. Multi-Store Item listing (`MultiStoreShipmentController.php`)
- Updated the manual `item_description` construction to adopt the new `qty:X` format with newline separators.

## Files Modified

### Backend (Laravel)
- **`Deshio_be/app/Models/Shipment.php`**:
    - Updated `getPackageDescription()` for detailed item listing and truncation.
- **`Deshio_be/app/Services/PathaoService.php`**:
    - Fixed `delivery_type` mapping (12 vs 48).
- **`Deshio_be/app/Http/Controllers/ShipmentController.php`**:
    - Adjusted minimum weight calculation to `0.5kg`.
- **`Deshio_be/app/Http/Controllers/MultiStoreShipmentController.php`**:
    - Updated `item_description` to include quantities and newlines.

## Verification Checklist
- [x] Item descriptions show full variant names and quantities.
- [x] Description length is capped at 250 characters.
- [x] `express` delivery maps to ID `12`.
- [x] Minimum payload weight is `0.5kg`.

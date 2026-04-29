# Backend: Search Logic Refinement (March 2026)

This document outlines the architectural changes made to the product search system to improve relevance, performance, and domain alignment (Fashion/Lifestyle).

## Key Changes

### 1. Unified Search Scope
- **Exclusion of Descriptions**: The `description` field has been removed from all search matching queries and relevance scoring across `EcommerceCatalogController`, `ProductSearchController`, `ProductController`, and `InventoryController`. This significantly reduces Noise and improves performance by avoiding expensive LIKE operations on large text fields.
- **Priority Fields**: Search now focuses strictly on `Name`, `SKU`, `Category`, and `Custom Fields` (Color/Size).

### 2. Domain-Specific Phonetic Mapping
- Replaced legacy food-related keywords (e.g., "biryani", "burger") with fashion and lifestyle terminology in `ProductSearchController@productKeywords`.
- **New Keyword Map Examples**:
  - `sneakers`, `shoes`, `loafers`
  - `panjabi`, `kurta`, `thobes`
  - `sunglasses`, `eyewear`
  - `hoodie`, `sweatshirt`, `jacket`

### 3. Relevance Scoring V2
The `scoreAndRankResults` algorithm has been overhauled with the following weights:
- **Exact Name Match**: +100 points
- **Exact SKU Match**: +80 points
- **Starts-with Name Match**: +60 points
- **Category Match**: Increased weight manually to +40 points.
- **Attribute Boosts**:
  - **Color match**: +30 points (boosts products matching a specific color term).
  - **Size match**: +20 points (exact matches on size fields).

### 4. Advanced Search Logic
- **Multi-Word Queries**: Implemented logic to handle queries like "blue panjabi" by splitting terms and applying multi-stage matching (Exact -> StartsWith -> Contains -> Fuzzy).
- **SKU Grouping**: Added `group_by_sku` support to the `advancedSearch` endpoint to allow the frontend to receive unique product families rather than individual variants.

## Technical Implementation Details
- **Trait**: `DatabaseAgnosticSearch` remains the primary utility for cross-database LIKE operations.
- **Controllers Updated**:
  - `EcommerceCatalogController.php`
  - `ProductSearchController.php`
  - `ProductController.php`
  - `InventoryController.php`

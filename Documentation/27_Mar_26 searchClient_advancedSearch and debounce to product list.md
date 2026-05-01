# Frontend: Advanced Search Integration and Debounce Optimization (March 2026)

This documentation details the frontend improvements to the search experience across e-commerce and administrative modules.

## Key Changes

### 1. Advanced Search Connectivity
- **Search Client (`search-client.tsx`)**: Updated to call the new `/products/advanced-search` endpoint via `catalogService.advancedSearch`.
  - **Fuzzy Search Enabling**: The frontend now requests fuzzy matching (`enable_fuzzy: true`) when it returns zero or very low exact results from the primary query.
  - **SKU Grouping**: Enabled `group_by_sku: true` for the search client, ensuring that search result cards represent unique product designs rather than redundant variant listings.

### 2. Debounce Delay (1000ms)
- **Problem**: Lower debounce (350-500ms) caused excessive API load and UI "jumping" while users were mid-typing, especially with larger multi-word fashion queries.
- **Solution**: Increased the search input debounce to `1000ms` in `ProductListClient.tsx` (the main administrative product list). This ensures that searches only trigger once a user has stabilized their intent, resulting in much cleaner, more relevant results and reduced server load.

### 3. Integrated Service Methods
- **`catalogService.ts`**: Added the `advancedSearch` method to handle the POST request correctly and normalize response data into the existing `SimpleProduct` shape.
- **Improved Type Support**: Ensuring that the results from the relevance-ranked backend display accurately in the `PremiumProductCard`.

## Future Performance Notes
- Recommend implementing a second, faster debounce (300ms) for client-side filtering if search result count is low (< 50).
- Monitor `advancedSearch` latency as the catalog grows.

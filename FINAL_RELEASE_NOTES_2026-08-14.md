# Deshio Frontend — Activity Log + Campaign Pricing Update (2026-08-14)

## Activity Log
- Replaced the old client-side “download every page from five history endpoints, merge, then filter” workflow with one backend-paginated feed.
- Search, employee, category, event and date filters now execute on the backend.
- Added rows-per-page and previous/next pagination.

## Campaign visibility and pricing
- Manual/public coupons remain visible through the public promotion API but are no longer mistaken for automatic discounts.
- Automatic percentage/fixed campaign pricing is wired into POS, Social Commerce, e-commerce checkout and exchange replacement pricing.
- Product/category IDs are carried through the relevant sales item models so scoped campaigns can be evaluated.
- Social Commerce edit mode explicitly disables current automatic campaign re-evaluation and keeps the order's stored line/order discounts.
- Checkout passes the entered coupon code to authenticated and guest order creation, with automatic and manual campaign amounts reflected in the summary.

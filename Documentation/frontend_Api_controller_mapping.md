# Deshio V2 Frontend Page to Backend Controller Mapping

This document provides a comprehensive mapping of frontend pages (Next.js) to their respective backend controller methods (Laravel) in the Deshio V2 project.

---

## Dashboard

### app/dashboard/page.tsx
- `DashboardController@todayMetrics`: Fetches key performance indicators for the current day (sales, orders, etc.).
- `DashboardController@last30DaysSales`: Retrieves daily sales data for the past 30 days for trend analysis.
- `DashboardController@salesByChannel`: Breakdown of sales by source (POS, E-commerce, Social Commerce).
- `DashboardController@topStoresBySales`: Lists stores ranked by their sales performance.
- `DashboardController@todayTopProducts`: Identifies the best-selling products for the current day.
- `DashboardController@slowMovingProducts`: Lists products with low turnover rates.
- `DashboardController@lowStockProducts`: Alerts for products that are below their minimum stock threshold.
- `DashboardController@inventoryAgeByValue`: Analyzes inventory value based on how long items have been in stock.
- `DashboardController@operationsToday`: Summary of operational tasks and status for the day.

---

## POS (Point of Sale)

### app/pos/page.tsx
- `OrderController@create`: Initializes a new order (Counter/POS type).
- `OrderController@complete`: Finalizes the order, reduces inventory, and marks it as completed.
- `PaymentController@getMethodsByCustomerType`: Fetches available payment methods (Cash, Card, Mobile Banking) based on customer type.
- `EmployeeController@getEmployees`: Lists active employees for selection as sales agents.
- `StoreController@getStores`: Retrieves available stores for location-based operations.
- `ProductController@index`: Fetches products with basic details for the POS item selection.
- `ProductBatchController@index`: Retrieves available batches for specific products to handle FIFO/LIFO.
- `DefectiveProductController@sell`: Specialized endpoint to sell items marked as defective at a discount.
- `PaymentController@addInstallmentPayment`: Handles partial payments for installment-based orders.
- `PaymentController@processPayment`: Processes a standard single-method payment.
- `OrderPaymentController@storeSplitPayment`: Handles complex split payments across multiple methods.

---

## Product Management

### app/product/list/page.tsx
- `ProductController@index`: Main endpoint for listing products with support for filtering, sorting, and pagination.
- `ProductSearchController@advancedSearch`: Multi-word fuzzy search for finding products across SKU, name, and attributes.
- `CategoriesController@getCategoryTree`: Retrieves the hierarchical category structure for filtering.
- `VendorController@getVendors`: Lists active vendors for product filtering.
- `EcommerceCatalogController@getProduct`: Fetches public-facing product metadata (prices, stock status) for the list view.
- `ProductController@destroy`: Deletes or archives a product record.

### app/product/[id]/page.tsx
- `ProductController@show`: Retrieves detailed administrative information for a single product.
- `ProductImageController@getProductImages`: Lists all images associated with the product.
- `ProductAttributeController@index`: Fetches attributes (size, color, etc.) assigned to the product.

### app/product/add/page.tsx
- `ProductController@store`: Creates a new product record.
- `ProductController@update`: Updates an existing product record.
- `CategoriesController@getCategoryTree`: Used for selecting the product category.
- `VendorController@getVendors`: Used for assigning a vendor to the product.

---

## Inventory Management

### app/inventory/view/page.tsx
- `InventoryController@getGlobalInventory`: Comprehensive view of stock levels for all products across all stores/warehouses.
- `CategoriesController@index`: Lists categories for inventory organization.
- `DefectiveProductController@index`: Lists items identified as defective or used.
- `ProductController@show`: Used for lazy-loading product details in the inventory list.
- `ProductImageController@getPrimaryImage`: Fetches the main image for products in the inventory view.

---

## Order Management

### app/orders/page.tsx
- `OrderController@index`: Lists all orders (Admin view) with advanced filtering.
- `OrderController@getStatistics`: Fetches summary counts for different order statuses (Pending, Processing, etc.).
- `OrderController@show`: Detailed view of a specific order, its items, and history.
- `OrderController@fulfill`: Warehouse-level fulfillment action for e-commerce orders.
- `OrderController@cancel`: Cancels an order and releases any reserved inventory.
- `OrderController@setIntendedCourier`: Assigns a shipping provider to the order.

---

## Accounting & Transactions

### app/accounting/page.tsx
- `AccountController@index`: Lists the Chart of Accounts.
- `AccountingReportController@journal`: Generates the General Journal report for a date range.
- `AccountingReportController@trialBalance`: Generates the Trial Balance financial statement.
- `AccountingTransactionController@index`: Lists individual accounting transactions.
- `AccountingReportController@ledger`: Generates the General Ledger for a specific account.

### app/transaction/page.tsx
- `TransactionController@index`: Lists all financial transactions (Sales, Returns, Payments).
- `TransactionController@show`: View details of a specific transaction and its accounting impact.

---

## Vendor & Purchase Management

### app/vendor/page.tsx
- `VendorController@getVendors`: Lists all vendors managed in the system.
- `VendorController@store`: Adds a new vendor record.
- `VendorController@update`: Updates vendor contact or terms information.
- `VendorController@destroy`: Deletes a vendor.
- `PurchaseOrderController@store`: Creates a new Purchase Order for restocking.
- `VendorPaymentController@getMethods`: Lists available methods for paying vendors.
- `VendorController@getOutstanding`: Calculates the current balance owed to a vendor.
- `VendorPaymentController@store`: Records a payment made to a vendor.

---

## Returns & Refunds

### app/returns/page.tsx
- `ProductReturnController@index`: Lists all product return requests.
- `ProductReturnController@getStatistics`: Summary of return statuses and values.
- `ProductReturnController@approve`: Admin approval of a return request.
- `ProductReturnController@reject`: Rejection of a return with a reason.
- `ProductReturnController@process`: Final processing of a return, updating inventory and batch levels.
- `RefundController@store`: Initializes a refund for a returned item.
- `RefundController@process`: Moves a refund to the processing stage.
- `RefundController@complete`: Marks a refund as successfully paid out to the customer.

---

## E-commerce Storefront (Customer Facing)

### app/e-commerce/page.tsx (Home)
- `EcommerceCatalogController@getFeatured`: Fetches products marked as "Featured" for the home page slider.
- `EcommerceCatalogController@getNewArrivals`: Lists the most recently added products.
- `EcommerceCatalogController@getCategories`: Lists root categories for the navigation menu.

### app/e-commerce/products/page.tsx
- `EcommerceCatalogController@search`: Public product search with price range and attribute filters.
- `EcommerceCatalogController@getCategoryProducts`: Lists products within a specific category.

### app/e-commerce/product/[id]/page.tsx
- `EcommerceCatalogController@getProduct`: Public detailed view of a product, including its variants and related items.

### app/e-commerce/cart/page.tsx
- `CartController@index`: Retrieves the current user's shopping cart items.
- `CartController@add`: Adds an item to the cart.
- `CartController@update`: Modifies quantities in the cart.
- `CartController@remove`: Deletes an item from the cart.

### app/e-commerce/checkout/page.tsx
- `EcommerceCheckoutController@store`: Finalizes the checkout process and creates the order.
- `PaymentController@getMethods`: Lists public payment gateways (SSLCommerz, bKash, etc.).

### app/e-commerce/my-account/page.tsx
- `CustomerProfileController@show`: Retrieves the logged-in customer's profile and order history.
- `WishlistController@index`: Lists the customer's bookmarked products.

---

## Marketing & Campaigns

### app/campaigns/page.tsx
- `CampaignController@index`: Lists all marketing campaigns.
- `CampaignController@store`: Creates a new campaign (Email/SMS).
- `CampaignController@update`: Modifies campaign details or schedule.
- `CampaignController@destroy`: Deletes a campaign.
- `CampaignController@send`: Triggers the dispatch of campaign messages to customers.

---

## User & Employee Management

### app/employees/page.tsx
- `EmployeeController@getEmployees`: Lists all staff members with their assigned roles and stores.
- `EmployeeController@store`: Adds a new employee and sets up their system access.
- `EmployeeController@update`: Updates employee details, role, or store assignment.
- `RoleController@index`: Fetches available system roles (Admin, Manager, Staff).
- `StoreController@getStores`: Used for assigning employees to specific branch locations.

---

## System & Activity Logs

### app/activity-logs/page.tsx
- `ActivityLogController@index`: Retrieves a history of system-wide activities (Logins, Updates, Deletions) for auditing.

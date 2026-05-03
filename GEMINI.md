# Deshio V2 - Project Context

## Project Overview
Deshio V2 is a full-stack e-commerce and inventory management system designed for multi-store operations. It features a modern Next.js frontend and a large-scale Laravel backend. The system handles everything from customer-facing e-commerce to administrative tasks like inventory management, POS (Point of Sale), order fulfillment, accounting, and marketing campaigns.

### Key Technologies
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, Radix UI, Lucide Icons.
- **Backend**: Laravel (API-based, monolithic architecture).
- **Printing**: QZ Tray integration for hardware-level printing (receipts, barcodes).
- **State Management**: React Context API (`AuthContext`, `ThemeContext`, `CartContext`).
- **HTTP Client**: Axios with custom interceptors for multi-auth (Admin/Staff vs. Customers) and automatic store-scoping for branch-level users.

## Project Structure

### Root Directory (Next.js Frontend)
- `app/`: Next.js App Router directory containing pages, layouts, and API routes.
  - `accounting/`, `inventory/`, `orders/`, `pos/`, `product/`: Specialized administrative modules.
  - `e-commerce/`: Customer-facing storefront components and context.
  - `api/`: Frontend API routes (proxies and local logic).
- `components/`: Reusable React components organized by feature.
- `contexts/`: Global state providers (`AuthContext.tsx`, `ThemeContext.tsx`, `CustomerAuthContext.tsx`).
- `lib/`: Utility functions and shared logic (e.g., `axios.ts`, `receipt.ts`).
- `Documentation/`: Detailed records of feature updates and architectural decisions.
- `public/`: Static assets.
- `types/`: Global TypeScript type definitions.

### Backend (`Deshio_be/`)
- `app/Http/Controllers/`: Large set of controllers handling business logic for all modules (Orders, Inventory, Customers, Accounting, Campaigns).
- `app/Models/`: Database models representing the core entities.
- `routes/`: API route definitions (e.g., `api.php`).
- `database/`: Migrations, seeders, and factories.

## Authentication & Authorization

### Multi-Auth System
- **Admin/Staff**: Authenticate against admin endpoints; token stored as `authToken` in `localStorage`.
- **Customers**: Authenticate against customer endpoints (e-commerce); token stored as `auth_token` in `localStorage`.

### Permissions & RBAC
- Role-Based Access Control is enforced on the backend.
- **Store-scoping**: Branch users are restricted to their assigned `store_id`. The frontend `axios` interceptor automatically injects `store_id` into relevant API requests (Orders, Transactions, etc.).

## Development Workflow

### Key Commands
#### Frontend
- `npm run dev`: Start the development server.
- `npm run build`: Build the production application.
- `npm run start`: Start the production server.
- `npm run lint`: Run ESLint.

#### Backend (Laravel)
- `php artisan serve`: Start the Laravel development server (defaults to port 8000).
- `php artisan migrate`: Run database migrations.
- `php artisan db:seed`: Seed the database with initial/test data.

### Coding Standards
- **TypeScript**: Mandatory for all frontend code.
- **API Calls**: Always use the centralized `axiosInstance` from `@/lib/axios` to ensure proper auth and store scoping.
- **UI Components**: Use Radix UI primitives for accessibility and Tailwind CSS for styling.

## Notable Features
- **Seamless Search**: Intelligent multi-word search logic for products.
- **Hardware Integration**: QZ Tray for thermal printer and barcode label printing.
- **Multi-Store Management**: Automatic scoping of data based on user role and store assignment.
- **Global Toast System**: Centralized error and notification handling.

## Documentation
Refer to the `Documentation/` directory for specific implementation details on:
- Inventory reports and charts.
- Product list optimization and search logic.
- Mobile viewport polishing.
- SQL performance fixes for catalog and search.

# Deployment Context
- Backend API: https://backend2.Deshiobd.com/
- Frontend: https://Deshio-v2.vercel.app/
- Rules: Always use `web_fetch` to check live status.

# Errum V2: Comprehensive Finance & Accounting Implementation Plan (7 Apr 2026)

## 1. Executive Summary
This document outlines the strategic workplan to transition the Errum V2 accounting module from a basic transaction logger to a full-scale double-entry bookkeeping system. The goal is to ensure that every business event (Purchase, Sale, Return, Exchange) correctly affects the General Ledger across multiple accounts (Cash, Inventory, COGS, Revenue, Tax).

## 2. Theoretical Framework (Double-Entry Logic)
Based on the provided requirements and standard accounting principles, the following logic will be implemented:

### 2.1. Purchase Transactions (Restocking)
*   **Goal**: Record the acquisition of assets and the corresponding cash outflow/liability.
*   **Logic**:
    *   **Debit**: `Inventory` (Asset increases)
    *   **Credit**: `Cash` (Asset decreases) or `Accounts Payable` (Liability increases)

### 2.2. Sales Transactions
*   **Goal**: Record revenue, cash inflow, and the cost of the asset sold.
*   **Logic (Primary Entry)**:
    *   **Debit**: `Cash` (Asset increases)
    *   **Credit**: `Sales Revenue` (Income increases)
    *   **Credit**: `Tax Liability` (Liability increases - VAT/Tax collected)
*   **Logic (Secondary Entry - COGS)**:
    *   **Debit**: `Cost of Goods Sold (COGS)` (Expense increases)
    *   **Credit**: `Inventory` (Asset decreases)

### 2.3. Return Transactions (Reversal of Sale)
*   **Goal**: Reverse the financial impact of a sale when a customer returns a product.
*   **Logic (Primary Entry)**:
    *   **Debit**: `Sales Revenue` (Income decreases)
    *   **Debit**: `Tax Liability` (Liability decreases - Tax being returned)
    *   **Credit**: `Cash` (Asset decreases - refund issued)
*   **Logic (Secondary Entry - COGS Reversal)**:
    *   **Debit**: `Inventory` (Asset increases - item back in stock)
    *   **Credit**: `Cost of Goods Sold (COGS)` (Expense decreases)

### 2.4. Exchange Transactions
Exchanges are complex as they involve a "Netting" of two products. We will treat them as a combined Return + Sale event.

#### Scenario A: Same Price Exchange
*   **Old Item Reversal**:
    *   **Debit**: `Inventory` (Old item back in stock)
    *   **Credit**: `COGS` (Reversing old cost)
*   **New Item Recording**:
    *   **Debit**: `COGS` (New item cost)
    *   **Credit**: `Inventory` (New item out of stock)
*   *Note: No cash or revenue impact.*

#### Scenario B: Exchange with More Expensive Product
*   **Old Item Reversal**: (Same as above)
*   **New Item Recording**: (Same as above)
*   **Net Difference Entry**:
    *   **Debit**: `Cash` (Customer pays difference)
    *   **Credit**: `Sales Revenue` (Additional revenue earned)

#### Scenario C: Exchange with Less Expensive Product
*   **Old Item Reversal**: (Same as above)
*   **New Item Recording**: (Same as above)
*   **Net Difference Entry**:
    *   **Debit**: `Sales Revenue` (Revenue reduced)
    *   **Credit**: `Cash` (Store refunds difference)

---

## 3. Backend Implementation Strategy (Laravel)

### 3.1. Model Enhancements (`Transaction.php`)
The `Transaction` model is the engine of the accounting system. We need to add or update methods to handle the new logic.

*   **Update `createFromRefund(Refund $refund)`**:
    *   Currently, it only handles Cash and Revenue.
    *   **Change**: Add logic to handle Tax Liability reversal.
    *   **New Method `createFromReturnCOGS(ProductReturn $return)`**: This will handle the Inventory (Debit) and COGS (Credit) side of a return.
*   **Update `createFromVendorPayment(VendorPayment $payment)`**:
    *   Currently, it only credits Cash.
    *   **Change**: Add a corresponding Debit to the `Inventory` account for the value of the items purchased.
*   **New Method `createFromExchange(ProductReturn $return, Order $newOrder)`**:
    *   This will calculate the net difference and post the appropriate entries for the old and new items.

### 3.2. Observer Updates
We will leverage Laravel Observers to automate these entries without cluttering Controllers.

*   **`RefundObserver`**: Update to trigger COGS/Inventory reversal when a refund is completed.
*   **`ProductReturnObserver`**: Triggered when a return is "Pass QC" and items are restored to stock.
*   **`OrderPaymentObserver`**: Ensure that "Store Credit" or "Exchange" payments are identified so they don't double-count cash flow.

### 3.3. Controller Fixes (`AccountingReportController.php`)
*   **Case Sensitivity**: Standardize the check for `debit` vs `Debit`. All backend logic should use lowercase `debit` and `credit` for consistency with the frontend.
*   **Account Discovery**: Update `getTAccount` to be more robust in identifying accounts by `sub_type` rather than just `account_code`.
*   **Ledger Logic**: Ensure `getTAccount` correctly calculates the running balance based on account type (Assets/Expenses: Dr-Cr; Liabilities/Equity/Income: Cr-Dr).

---

## 4. Frontend Implementation Strategy (Next.js)

### 4.1. Accounting Dashboard (`app/accounting/page.tsx`)
*   **Account Ledger Dropdown**: Ensure the dropdown is populated with all leaf-level accounts from the Chart of Accounts.
*   **Topic Selection Logic**: When a user selects "1000	Current Assets,     1001	Cash and Cash Equivalents, 1002	Accounts Receivable, 1003	Inventory, 1100	Fixed Assets, 1101	Property, Plant and Equipment, 1102	Accumulated Depreciation, 2000	Current Liabilities, 2001	Accounts Payable, 2002	Tax Payable, 3000	Owner Equity, 3001	Retained Earnings, 4000	Revenue, 4001	Sales Revenue, 4002	Service Revenue, 5000	Expenses, 5001	Operating Expenses, 5002	Cost of Goods Sold  from the dropdown, the page should fetch the specific ledger for that account.
*   **Data Normalization**: Update `accountingService.ts` to ensure that regardless of the backend response (T-Account format or flat Transaction list), the UI displays a clean ledger with:
    *   Date
    *   Reference (Order #, Return #, etc.)
    *   Description
    *   Debit Amount
    *   Credit Amount
    *   Running Balance

### 4.2. Reporting Components
*   **Trial Balance**: Ensure the "Trial Balance" tab correctly shows all accounts, not just Cash. It must aggregate debits and credits for every account code.
*   **Journal Entries**: Enhance the Journal view to group transactions by their `reference_id` (e.g., all 4 lines of a sale entry should be shown together).

---

## 5. Affected Files & Modules

### Backend (Laravel)
| File Path | Responsibility |
|-----------|----------------|
| `app/Models/Transaction.php` | Centralized methods for double-entry generation. |
| `app/Models/Account.php` | Balance calculation logic and account type definitions. |
| `app/Http/Controllers/AccountingReportController.php` | Ledger (T-Account) and Trial Balance API logic. |
| `app/Http/Controllers/AccountController.php` | Chart of Accounts management. |
| `app/Observers/RefundObserver.php` | Triggering reversals on return. |
| `app/Observers/VendorPaymentObserver.php` | Triggering inventory increase on purchase. |
| `app/Http/Controllers/ProductReturnController.php` | Linking exchange orders to returns. |

### Frontend (Next.js)
| File Path | Responsibility |
|-----------|----------------|
| `app/accounting/page.tsx` | Main UI for Ledger, Journal, and Trial Balance. |
| `services/accountingService.ts` | API client and data normalization logic. |
| `components/Sidebar.tsx` | Navigation to accounting modules. |

---

## 6. Workplan & Milestones

### Phase 1: Core Engine Refinement
*   Standardize `debit/credit` casing across BE and FE.
*   Implement `getInventoryAccountId()` and `getCOGSAccountId()` helpers in `Transaction.php`.
*   Fix the running balance calculation in `AccountingReportController@getTAccount`.

### Phase 2: Transaction Automation
*   Implement COGS reversal in `RefundObserver`.
*   Implement Inventory increase in `VendorPaymentObserver`.
*   Create the `Exchange` transaction handler to manage Scenario A, B, and C.

### Phase 3: Reporting & Ledger
*   Ensure all ledger topics (Inventory, Revenue, COGS, etc.) are working in the UI.
*   Add "Export to CSV" for individual ledgers.
*   Audit the Trial Balance to ensure `Total Debits == Total Credits`.

### Phase 4: Validation & Cleanup 
*   Verify Scenario-wise transactions against the user's manual ledger examples.
*   Check for "Orphaned Transactions" (entries without a counter-entry).
*   Perform a production safety check to ensure existing orders aren't retroactively affected in a way that breaks historical data.

---

## 7. Critical Considerations
1.  **Production Safety**: All new accounting entries should only trigger for *new* transactions. Historical orders should remain untouched to prevent balance shifts.
2.  **Store Scoping**: In a multi-store environment, the "Inventory" and "Cash" accounts must be scoped by `store_id` so branch managers only see their own ledgers.
3.  **Accuracy**: Floating point math should be avoided; always use `decimal` in the database and `round(amount, 2)` in PHP/JS.

---
**End of Plan**

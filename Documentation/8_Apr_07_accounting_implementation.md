# Accounting Workplan Implementation - Changelog

**Date:** 2026-04-07  
**Status:** Complete

---

## Summary

Implemented the full double-entry bookkeeping workplan from `7_Apr_26_accounting_plan.md`. All 16 account codes (1000-5002) were already present in the DB. The primary gaps were in the automated transaction triggers for vendor payments, refunds, and exchanges.

---

## Changes Made

### 1. `Deshio_be/app/Models/Transaction.php`

#### `createFromVendorPayment()` — **FIXED**
- **Before:** Only created a single Credit entry to Cash (money going out).
- **After:** Creates **2 entries** for full double-entry:
  - **Debit: Inventory (1003)** — stock asset received
  - **Credit: Cash (1001)** — cash asset paid to vendor

#### `createFromRefund()` — **ENHANCED**
- **Before:** Created Debit to Sales Revenue + Credit to Cash for the full refund amount.
- **After:** Creates **3 entries** with correct tax split:
  - **Credit: Cash (1001)** — full refund amount going out
  - **Debit: Sales Revenue (4001)** — net revenue reversed (excl. tax)
  - **Debit: Tax Payable (2002)** — proportional tax liability reversed (using order's tax_amount/total_amount ratio)

#### `createFromRefundCOGS()` — **NEW**
- Called when returned items are restocked. Creates 2 entries:
  - **Debit: Inventory (1003)** — items back on shelf (asset increases)
  - **Credit: COGS (5002)** — cost of goods expense reversed

#### `createFromExchange()` — **NEW**
- Handles all 3 exchange scenarios for `ProductReturn → new Order`:
  - **Always:** Swap Inventory/COGS for old and new items (4 entries)
  - **Scenario B (new > old):** Debit Cash + Credit Sales Revenue for the upcharge
  - **Scenario C (new < old):** Debit Sales Revenue + Credit Cash for the store refund
  - **Scenario A (same price):** Only the COGS/Inventory swap, no cash/revenue entries

---

### 2. `Deshio_be/app/Observers/RefundObserver.php`

#### **REWRITTEN**
- Added `createCOGSReversalIfApplicable()` private helper method.
- After `createFromRefund()` fires, the helper checks if the refund's `order_id` links to a completed `ProductReturn` with `total_return_value > 0`.
- If found and no existing COGS debit entry exists for that return (idempotency guard), calls `Transaction::createFromRefundCOGS($productReturn)`.
- Same check runs in `updated()` when status changes to `completed`.

---

### 3. `Deshio_be/app/Http/Controllers/ProductReturnController.php`

#### `exchange()` — **WIRED**
- Added `use App\Models\Transaction;` import.
- Inside the DB transaction, after `$return->save()` and before `DB::commit()`:
  ```php
  Transaction::createFromExchange($return, $newOrder);
  ```
- Handles all 3 price scenarios automatically.

---

### 4. `Deshio_be/app/Http/Controllers/AccountingReportController.php`

#### `getTAccount()` — **BUG FIX**
- **Before:** Used `'Debit'` and `'Credit'` (capitalized) in comparisons and DB `CASE WHEN` queries.
- **After:** Fixed to lowercase `'debit'` and `'credit'` to match the actual DB values.
- Also fixed the response field names: `account_code`, `name`, `type`, `sub_type` (was using wrong aliases `code`, `account_name`, `account_type`, `category`).

---

## Account Coverage

| Account | Code | Automated By |
|---------|------|--------------|
| Cash and Cash Equivalents | 1001 | `createFromOrderPayment`, `createFromRefund`, `createFromVendorPayment`, `createFromExchange` |
| Accounts Receivable | 1002 | Manual entry |
| Inventory | 1003 | `createFromVendorPayment` (debit), `createFromOrderCOGS` (credit), `createFromRefundCOGS` (debit), `createFromExchange` |
| Property, Plant & Equipment | 1101 | Manual entry |
| Accumulated Depreciation | 1102 | Manual entry |
| Accounts Payable | 2001 | Manual entry |
| Tax Payable | 2002 | `createFromOrderPayment` (credit), `createFromRefund` (debit) |
| Retained Earnings | 3001 | Manual entry |
| Sales Revenue | 4001 | `createFromOrderPayment` (credit), `createFromRefund` (debit), `createFromExchange` |
| Service Revenue | 4002 | Manual entry |
| Operating Expenses | 5001 | `createFromExpense` |
| Cost of Goods Sold | 5002 | `createFromOrderCOGS` (debit), `createFromRefundCOGS` (credit), `createFromExchange` |

> Parent accounts (1000, 1100, 2000, 3000, 4000, 5000) are summary-only and do not receive transactions directly.

---

## Notes

- All lint errors from Intelephense are pre-existing false positives related to missing IDE stubs for Laravel helpers (`now()`, `auth()`, `response()`). They do not affect runtime.
- The `RefundObserver::createCOGSReversalIfApplicable` has an **idempotency guard** — it checks for existing Inventory debit entries before creating new ones, preventing duplicate COGS reversal if the observer fires multiple times.
- Manual transaction entry via `POST /transactions` and the accounting UI (all 16 accounts in the ledger dropdown) were already fully functional.

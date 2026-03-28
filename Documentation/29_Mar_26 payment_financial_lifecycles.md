# Payment & Financial Lifecycles - Errum V2

This document explains the financial architecture of Errum V2, detailing how payments are processed, recorded, and reconciled across different sale types.

## 1. Payment Status Lifecycle
Errum V2 uses a granular payment status system to track the financial state of an order relative to its total value.

### Status Transitions:
```
[ Pending ] -> [ Partial ] -> [ Paid ]
     |             |            |
     +-------------+------------+-----> [ Refunded ]
     |
     v
[ Failed / Unpaid ]
```

*   **Pending**: Default state for new orders (except POS). No verified payment has been received.
*   **Partial**: At least one payment has been made, but the `paid_amount` < `total_amount`.
*   **Paid**: Total payments equal or exceed the order value.
*   **Failed**: Specific to online payments (SSLCommerz) where the transaction was not successful.
*   **Refunded**: One or more payments have been reversed or credited back to the customer.

---

## 2. Installment Lifecycle
Used for high-value items, allowing customers to pay over time.

### The Flow:
1.  **Setup Plan**: Admin defines the number of installments and due dates.
2.  **Create Schedule**: System generates `Installment` records linked to the `Order`.
3.  **Add Installment Payment**: Customer pays a single installment.
4.  **Update Progress**: System automatically calculates the remaining balance and updates the order's `payment_status`.

---

## 3. Advanced Payment Lifecycle
Errum V2 supports complex financial scenarios beyond simple cash/card transactions.

### A. Split Payment
*   **Definition**: A single order paid using multiple methods (e.g., $50 Cash + $100 Card).
*   **Implementation**: `OrderPayment` acts as the parent, with multiple `PaymentSplit` records.
*   **Integrity**: The sum of `PaymentSplit` amounts MUST equal the `OrderPayment->amount`.

### B. Cash Denomination Tracking
*   **Context**: Primarily for POS and physical stores.
*   **Flow**: When a cash payment is received, the system can record the specific notes (e.g., 2 x 500 BDT) for cash drawer reconciliation.

---

## 4. SSLCommerz Payment Flow
The integration with the SSLCommerz gateway follows a strict security handshake.

**Sequence Diagram:**
1.  **Initiate**: Frontend requests payment. Backend calls SSLCommerz `Session Create` API.
2.  **Redirect**: User is sent to SSLCommerz hosted page.
3.  **Handshake**: User pays. SSLCommerz redirects back to Backend `Success` URL.
4.  **Validation**: Backend calls SSLCommerz `Order Validation` API to verify the transaction.
5.  **IPN (Instant Payment Notification)**: A server-to-server callback used as a fail-safe if the user closes the browser before redirection.

---

## 5. Transaction Lifecycle
The `Transaction` model is the "Single Source of Truth" for the General Ledger.

**Flow:**
*   **Create**: Triggered by an `OrderPayment` completion or manual entry.
*   **Complete**: Funds are confirmed in the bank/cash account.
*   **Fail**: Transaction was aborted or rejected.
*   **Cancel**: Reversal of an existing transaction (before it is reconciled).

---

## 6. Accounting: Double-Entry Principles
Every completed `OrderPayment` generates a balanced transaction set.

| Account | Type | Impact |
| :--- | :--- | :--- |
| **Cash/Bank** | Debit | Increases Assets |
| **Sales Revenue** | Credit | Increases Income |
| **Tax Payable** | Credit | Increases Liability |

---

## 7. Inclusive Tax Proportionality
Errum V2 calculates tax on a per-payment basis for accurate reporting during partial payments.

**Example**:
*   Order Total: $115 (including 15% tax = $15).
*   Partial Payment 1: $50.
*   Calculated Tax: $(15 / 115) * 50 = $6.52$.
*   Calculated Revenue: $50 - 6.52 = $43.48$.

---

## 8. Edge Cases & Financial Safety

| Edge Case | Mitigation |
| :--- | :--- |
| **Overpayment** | System triggers a warning. Excess can be converted to "Store Credit" (Refund model). |
| **Currency Mismatch** | `Transaction` records store the `exchange_rate` at the time of the transaction. |
| **Gateway Timeout** | The IPN listener ensures the order is marked `Paid` even if the user's internet fails post-payment. |
| **Refund on Partial Payment** | Refunds are prioritized against the most recent payment method. |

---

## 9. Integrity Issues & Suggested Fixes

### Issue 1: Split Payment Atomicity
**Description**: `OrderPaymentController::storeSplitPayment` creates records in a loop. If the server crashes mid-loop, some splits are created but the total is wrong.
**Suggested Fix**: Wrap the entire loop in a `DB::transaction`. Ensure the final `update` on `OrderPayment` is only done if all splits pass validation.

### Issue 2: Decoupled Payment vs. Transaction Status
**Description**: An `OrderPayment` can be marked "Completed" while its corresponding `Transaction` is "Pending".
**Suggested Fix**: Implement an Observer on `OrderPayment` that automatically transitions the `Transaction` status when the payment status changes.

### Issue 3: Manual Transaction Type Mismatch
**Description**: `TransactionController` auto-detects type (money-in/money-out) based on hardcoded strings. This is fragile.
**Suggested Fix**: Use an Enum for `TransactionType` and explicitly map every `ReferenceType` (Order, PO, Expense) to a specific Accounting Direction.

### Issue 4: Tax Calculation Rounding Errors
**Description**: Calculating tax on partial payments can lead to 0.01 differences when summed up.
**Suggested Fix**: Store the "Remaining Tax to Record" on the `Order` and allocate all remaining cents to the final payment.

### Issue 5: SSLCommerz Session Expiry
**Description**: A user might initiate a session and leave. The order stays `Pending` but the stock is reserved.
**Suggested Fix**: Implement a cleanup job that cancels `ecommerce` orders if the linked SSLCommerz session has expired without success.

### Issue 6: Store Credit Expiry Integrity
**Description**: Store credits are tracked in the `Refund` table. There is no automated trigger to mark them as `expired` in the ledger.
**Suggested Fix**: Add a scheduled task to `RecycleBinController` or a new `AccountingTask` to transition expired store credits to a "Forfeited Credit" revenue account.

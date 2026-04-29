# Remove VAT Fields from Social Commerce Amount Details

**Date:** 27 Mar 2026  
**File Changed:** `app/social-commerce/amount-details/page.tsx`

---

## Change Summary

Removed the VAT and VAT Rate input fields from the Social Commerce Amount Details page. VAT is now hardcoded to `0` — it is no longer calculated, displayed, or editable by the user.

---

## What Changed

### 1. State removed
```tsx
// REMOVED:
const [vatRate, setVatRate] = useState('5');
```

### 2. Calculation hardcoded to 0
```tsx
// BEFORE:
const vat = (subtotal * parseFloat(vatRate)) / 100;
const total = subtotal + vat + transport;

// AFTER:
const vat = 0; // VAT removed — hardcoded to 0
const total = subtotal + transport;
```

> The `vat` variable is kept as `0` (instead of being fully removed) to avoid touching any downstream display logic that might still reference it.

### 3. UI inputs removed
The following two side-by-side input fields were removed from the Payment Details section:

- **VAT** — read-only field showing calculated VAT amount (`৳X.XX`)
- **VAT Rate %** — editable number input (previously defaulted to `5`)

---

## Backend Impact

The backend receives `shipping_amount` (transport) but `vat_amount` is not sent as a separate field in this flow. The `total` sent to the backend is now:

```
total = subtotal + transport
```

No backend changes required.

---

## Rationale

VAT handling for social commerce orders is managed at a different level (accounting/invoicing). The per-order VAT input on the amount details page was redundant, confusing, and defaulted to 5% which could accidentally inflate order totals.

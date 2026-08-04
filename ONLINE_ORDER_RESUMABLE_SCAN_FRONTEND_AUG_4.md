# Online Order Resumable Scan Frontend — August 4, 2026

## Behavior

- Every accepted scan is sent to the backend immediately; it is no longer only React/local state.
- Reopening an order rebuilds scan progress from persisted order-item barcode links.
- Reloading or leaving the page no longer loses accepted scans.
- The order remains in the packing queue as `assigned_to_store` until **Pack & Confirm Order** is selected.
- The final button performs one backend completion request; fulfillment, stock deduction, barcode sale status, and order confirmation are handled transactionally by the backend.
- The old local-only **Reset All Scans** control is replaced with **Reload Saved Scans** so the UI cannot pretend persisted scans were removed.
- Barcode Lookup displays `reserved_for_order` as **Reserved for Open Order**.

## Patched pages

- `app/social-commerce/package/page.tsx`
- `app/social-commerce_example/package/page.tsx`
- `app/store-fulfillment/page.tsx`
- `app/lookup/page.tsx`

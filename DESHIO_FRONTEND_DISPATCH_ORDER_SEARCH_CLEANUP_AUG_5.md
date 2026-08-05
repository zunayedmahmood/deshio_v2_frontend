# Deshio Frontend Fixes — 5 August 2026

## Dispatch creation draft

- Dispatch creation progress is automatically saved in browser local storage.
- Closing the panel with the X button or **Save & Close** keeps store selections, delivery/tracking fields, items, and scanned barcodes.
- Reopening **Create Dispatch** resumes the saved draft instead of opening a blank/stale modal.
- Added individual scanned-barcode removal, undo-last-scan, clear-scans, item removal, and **Cancel Draft**.
- Manual quantities and barcode-added quantities are tracked separately so removing scans does not remove manually added units.
- The create button now has a dedicated loading state, awaits the API result, and is always re-enabled after a failed request.
- A successful creation clears the local draft.

## Online order edit product search

- Replaced `/products/advanced-search` in the active `/orders` edit-product picker.
- Search now uses the same store-aware batch endpoint as Social Commerce:
  `GET /batches?store_id={id}&status=available&search={query}&page=1&per_page=100`.
- Online-order results are grouped by product, sum available stock across store batches, and show the minimum batch selling price.
- Online orders must have an assigned store before adding products.

## Removed frontend modules

Removed from the sidebar and deleted from the frontend source:

- Cash Sheet / Monthly Sheet
- Branch Costs
- Admin Panel
- Owner Panel
- Summary View
- `services/cashSheetService.ts`

## Packing scanner cleanup

- Removed the mobile-camera scanning option from `/social-commerce/package`.
- Removed the same obsolete control from the duplicate example packing page.
- USB/hardware scanner and manual barcode entry remain available.

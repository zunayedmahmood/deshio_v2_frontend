# Online Order Fulfillment Frontend Contract Fixes — 2026-08-04

The packing page now hydrates persisted scans from all current backend response forms and excludes scanned split rows from pending-row selection. This preserves partial scans across reloads and ensures the next accepted barcode is sent against the actual remaining order-item row.

The primary API flow remains:

1. `POST /barcodes/scan`
2. `POST /store/fulfillment/orders/{id}/scan-barcode`
3. `GET /orders/{id}` to rehydrate saved progress
4. `PATCH /orders/{id}/complete` for atomic confirmation

The service types accept canonical `barcode_id`, `barcode_number`, `is_scanned`, `scan_status`, string barcodes, and nested barcode objects.

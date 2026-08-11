# Deshio Dashboard Frontend Update — August 5, 2026

## Updated
- Rebuilt `/dashboard` with Deshio branding
- Dashboard loads for every authenticated ERP account without role checks
- Store selector includes **All Stores** and every active individual store
- All accounts can use the store selector; it is never disabled based on role or assigned store
- Today / This Week / This Month / Custom date controls
- Apply, Reset, Refresh, Export Excel, and Print/PDF controls
- Grouped KPI cards with previous-period trends
- Clickable KPI cards preserve the selected date and store in drill-down links
- Sales/purchase trend chart, channel mix, due aging, inventory age, operations, top products, and stock alerts
- Responsive light/dark UI and print layout
- Last-updated and selected-store indicators

## Validation
- TypeScript syntax checking completed for:
  - `app/dashboard/page.tsx`
  - `services/dashboardService.ts`
- No dashboard role gate or forced account-store selection remains
- `store_id` is sent only for an individual store; **All Stores** omits it
- No ERRUM/Errum branding remains in the dashboard files
- No new frontend dependency was introduced

## Runtime hotfix
- Normalizes dashboard API values before rendering so null, missing arrays, or numeric strings cannot crash the page.
- Shows the backend's detailed debug error when one is returned instead of replacing it with only a generic message.
- Uses the browser's local calendar date instead of UTC for the Today filter.
- Makes Excel download cleanup reliable across browsers.

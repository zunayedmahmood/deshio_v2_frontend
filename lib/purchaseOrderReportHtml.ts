import { PurchaseOrder } from '@/services/purchase-order.service';
import { jsPDF } from 'jspdf';

const esc = (value: any): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const num = (value: any): number => {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: any): string => num(value).toFixed(2);
const moneyLabel = (value: any): string => `BDT ${money(value)}`;

const intVal = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fmtDate = (value: any): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const safeFilePart = (value: any): string => String(value ?? 'report')
  .trim()
  .replace(/[^a-z0-9._-]+/gi, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80) || 'report';

const employeeName = (value: any): string => {
  if (!value) return '—';
  return value.name || value.full_name || value.employee_name || value.username || value.email || String(value);
};

const itemBatch = (item: any): any => item?.productBatch || item?.product_batch || item?.batch || item?.product_batch_data;
const itemName = (item: any): string => item?.product_name || item?.product?.name || itemBatch(item)?.product?.name || '—';
const itemSku = (item: any): string => item?.product_sku || item?.product?.sku || itemBatch(item)?.product?.sku || '';
const itemOrderedQty = (item: any): number => intVal(item?.quantity_ordered);
const itemReceivedQty = (item: any): number => intVal(item?.quantity_received);
const itemPendingQty = (item: any): number => intVal(item?.quantity_pending ?? (itemOrderedQty(item) - itemReceivedQty(item)));
const itemUnitCost = (item: any): number => num(item?.unit_cost ?? itemBatch(item)?.cost_price);
const itemTotalCost = (item: any): number => num(item?.total_cost ?? (itemUnitCost(item) * itemOrderedQty(item)));

const poSubtotal = (po: any): number => num(po?.subtotal ?? po?.subtotal_amount ?? po?.items?.reduce?.((sum: number, item: any) => sum + itemTotalCost(item), 0) ?? 0);
const poTotal = (po: any): number => num(po?.total_amount ?? poSubtotal(po));
const poPaid = (po: any): number => num(po?.paid_amount);
const poOutstanding = (po: any): number => num(po?.outstanding_amount ?? (poTotal(po) - poPaid(po)));
const orderedQty = (po: any): number => (po?.items || []).reduce((sum: number, item: any) => sum + itemOrderedQty(item), 0);
const receivedQty = (po: any): number => (po?.items || []).reduce((sum: number, item: any) => sum + itemReceivedQty(item), 0);

const baseStyle = `
  * { box-sizing: border-box; }
  body { font-family: Calibri, Arial, sans-serif; color: #111827; margin: 0; padding: 24px; background: #f3f4f6; }
  .sheet { max-width: 1120px; margin: 0 auto; background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-radius: 14px; }
  .top { display: flex; justify-content: space-between; gap: 18px; border-bottom: 2px solid #111827; padding-bottom: 16px; margin-bottom: 18px; }
  .brand { font-size: 24px; font-weight: 800; letter-spacing: .02em; }
  .muted { color: #6b7280; font-size: 12px; }
  h1 { margin: 0; font-size: 22px; }
  h2 { margin: 24px 0 10px; font-size: 16px; }
  .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
  .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; background: #fafafa; }
  .label { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
  .value { margin-top: 3px; font-size: 14px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
  th { background: #111827; color: #fff; text-align: left; padding: 8px; border: 1px solid #111827; }
  td { padding: 7px 8px; border: 1px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  .right { text-align: right; }
  .center { text-align: center; }
  .summary { width: 360px; margin-left: auto; margin-top: 14px; }
  .summary td:first-child { font-weight: 700; }
  .grand td { font-size: 14px; font-weight: 800; background: #f9fafb; }
  .status { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #eef2ff; color: #3730a3; font-weight: 700; font-size: 11px; }
  .print-actions { position: sticky; top: 0; background: #fff; padding: 8px 0 16px; text-align: right; }
  .print-actions button { border: 0; border-radius: 8px; padding: 9px 14px; background: #111827; color: white; cursor: pointer; font-weight: 700; }
  @media print { body { background: #fff; padding: 0; } .sheet { border: 0; border-radius: 0; max-width: none; } .print-actions { display: none; } }
`;

function triggerDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function downloadTextFile(content: string, filename: string, mime: string): void {
  triggerDownload(new Blob([content], { type: mime }), filename);
}

export function openPurchaseOrderPrintWindow(html: string): void {
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
}

export function buildSinglePurchaseOrderPrintHtml(po: PurchaseOrder | any): string {
  const items = Array.isArray(po?.items) ? po.items : [];
  const rows = items.map((item: any, index: number) => {
    const qOrdered = itemOrderedQty(item);
    const qReceived = itemReceivedQty(item);
    const pending = itemPendingQty(item);
    const unitCost = itemUnitCost(item);
    const totalCost = itemTotalCost(item);
    const batch = itemBatch(item);
    return `
      <tr>
        <td class="center">${index + 1}</td>
        <td><strong>${esc(itemName(item))}</strong><br><span class="muted">${esc(itemSku(item))}</span></td>
        <td class="right">${qOrdered}</td>
        <td class="right">${qReceived}</td>
        <td class="right">${pending}</td>
        <td class="right">${money(unitCost)}</td>
        <td class="right">${money(item?.unit_sell_price)}</td>
        <td>${esc(batch?.batch_number || item?.batch_number || '—')}</td>
        <td class="right">${money(totalCost)}</td>
      </tr>`;
  }).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>PO Report - ${esc(po?.po_number || po?.id || '')}</title>
  <style>${baseStyle}</style>
</head>
<body>
  <div class="sheet">
    <div class="print-actions"><button onclick="window.print()">Print / Save as PDF</button></div>
    <div class="top">
      <div>
        <div class="brand">Deshio</div>
        <div class="muted">Purchase Order Report generated from frontend live PO data</div>
      </div>
      <div class="right">
        <h1>Purchase Order</h1>
        <div class="muted">Generated: ${fmtDate(new Date().toISOString())}</div>
      </div>
    </div>

    <div class="grid">
      <div class="card"><div class="label">PO Number</div><div class="value">${esc(po?.po_number)}</div></div>
      <div class="card"><div class="label">Status</div><div class="value"><span class="status">${esc(po?.status)}</span></div></div>
      <div class="card"><div class="label">Payment</div><div class="value">${esc(po?.payment_status)}</div></div>
      <div class="card"><div class="label">Order Date</div><div class="value">${fmtDate(po?.order_date || po?.created_at)}</div></div>
      <div class="card"><div class="label">Vendor</div><div class="value">${esc(po?.vendor?.name || '—')}</div></div>
      <div class="card"><div class="label">Store / Warehouse</div><div class="value">${esc(po?.store?.name || '—')}</div></div>
      <div class="card"><div class="label">Created By</div><div class="value">${esc(employeeName(po?.createdBy || po?.created_by))}</div></div>
      <div class="card"><div class="label">Received By</div><div class="value">${esc(employeeName(po?.receivedBy || po?.received_by))}</div></div>
      <div class="card"><div class="label">Ordered Qty</div><div class="value">${orderedQty(po)}</div></div>
      <div class="card"><div class="label">Received Qty</div><div class="value">${receivedQty(po)}</div></div>
      <div class="card"><div class="label">Expected Delivery</div><div class="value">${fmtDate(po?.expected_delivery_date)}</div></div>
      <div class="card"><div class="label">Received At</div><div class="value">${fmtDate(po?.received_at)}</div></div>
    </div>

    <h2>Items</h2>
    <table>
      <thead><tr><th>#</th><th>Product</th><th class="right">Ordered</th><th class="right">Received</th><th class="right">Pending</th><th class="right">Cost</th><th class="right">Sell</th><th>Batch</th><th class="right">Total Cost</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="9" class="center">No items found</td></tr>'}</tbody>
    </table>

    <table class="summary">
      <tr><td>Subtotal</td><td class="right">${money(poSubtotal(po))}</td></tr>
      <tr><td>Tax</td><td class="right">${money(po?.tax_amount)}</td></tr>
      <tr><td>Discount</td><td class="right">${money(po?.discount_amount)}</td></tr>
      <tr><td>Shipping</td><td class="right">${money(po?.shipping_cost)}</td></tr>
      <tr class="grand"><td>Total</td><td class="right">${money(poTotal(po))}</td></tr>
      <tr><td>Paid</td><td class="right">${money(poPaid(po))}</td></tr>
      <tr><td>Outstanding</td><td class="right">${money(poOutstanding(po))}</td></tr>
    </table>

    ${po?.notes ? `<h2>Notes</h2><div class="card">${esc(po.notes)}</div>` : ''}
  </div>
</body>
</html>`;
}

export function buildPurchaseOrderSummaryPrintHtml(purchaseOrders: any[], filters: Record<string, any> = {}): string {
  const totals = purchaseOrders.reduce((acc, po) => {
    acc.count += 1;
    acc.ordered += orderedQty(po);
    acc.received += receivedQty(po);
    acc.subtotal += poSubtotal(po);
    acc.total += poTotal(po);
    acc.paid += poPaid(po);
    acc.outstanding += poOutstanding(po);
    return acc;
  }, { count: 0, ordered: 0, received: 0, subtotal: 0, total: 0, paid: 0, outstanding: 0 });

  const filterText = Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ') || 'All purchase orders';

  const rows = purchaseOrders.map((po, index) => `
    <tr>
      <td class="center">${index + 1}</td>
      <td><strong>${esc(po?.po_number)}</strong><br><span class="muted">ID: ${esc(po?.id)}</span></td>
      <td>${esc(po?.vendor?.name || '—')}</td>
      <td>${esc(po?.store?.name || '—')}</td>
      <td>${fmtDate(po?.order_date || po?.created_at)}</td>
      <td><span class="status">${esc(po?.status)}</span></td>
      <td>${esc(po?.payment_status)}</td>
      <td class="right">${orderedQty(po)}</td>
      <td class="right">${receivedQty(po)}</td>
      <td class="right">${money(poTotal(po))}</td>
      <td class="right">${money(poPaid(po))}</td>
      <td class="right">${money(poOutstanding(po))}</td>
    </tr>`).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Purchase Order Summary Report</title>
  <style>${baseStyle}</style>
</head>
<body>
  <div class="sheet">
    <div class="print-actions"><button onclick="window.print()">Print / Save as PDF</button></div>
    <div class="top">
      <div>
        <div class="brand">Deshio</div>
        <div class="muted">Purchase Order Summary generated from frontend live PO API data</div>
      </div>
      <div class="right">
        <h1>PO Summary Report</h1>
        <div class="muted">Generated: ${fmtDate(new Date().toISOString())}</div>
      </div>
    </div>

    <div class="grid">
      <div class="card"><div class="label">PO Count</div><div class="value">${totals.count}</div></div>
      <div class="card"><div class="label">Ordered Qty</div><div class="value">${totals.ordered}</div></div>
      <div class="card"><div class="label">Received Qty</div><div class="value">${totals.received}</div></div>
      <div class="card"><div class="label">Total Amount</div><div class="value">${money(totals.total)}</div></div>
      <div class="card"><div class="label">Paid</div><div class="value">${money(totals.paid)}</div></div>
      <div class="card"><div class="label">Outstanding</div><div class="value">${money(totals.outstanding)}</div></div>
      <div class="card" style="grid-column: span 2;"><div class="label">Filters</div><div class="value" style="font-size:12px;">${esc(filterText)}</div></div>
    </div>

    <h2>Purchase Orders</h2>
    <table>
      <thead><tr><th>#</th><th>PO</th><th>Vendor</th><th>Store</th><th>Date</th><th>Status</th><th>Payment</th><th class="right">Ordered</th><th class="right">Received</th><th class="right">Total</th><th class="right">Paid</th><th class="right">Outstanding</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="12" class="center">No purchase orders found</td></tr>'}</tbody>
    </table>
  </div>
</body>
</html>`;
}

type PdfDoc = InstanceType<typeof jsPDF>;

const pdfMoney = (value: any): string => `BDT ${money(value)}`;

const setPdfFont = (doc: PdfDoc, size: number, bold = false, gray = 17): void => {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(gray, gray, gray);
};

const drawPdfFooter = (doc: PdfDoc, label: string): void => {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    doc.setDrawColor(229, 231, 235);
    doc.line(10, height - 9, width - 10, height - 9);
    setPdfFont(doc, 7.5, false, 107);
    doc.text(label, 10, height - 4.5);
    doc.text(`Page ${page} of ${pages}`, width - 10, height - 4.5, { align: 'right' });
  }
};

const drawPdfTableHeader = (
  doc: PdfDoc,
  y: number,
  columns: Array<{ label: string; width: number; align?: 'left' | 'right' | 'center' }>,
  startX = 10,
): number => {
  const height = 9;
  let x = startX;
  doc.setFillColor(31, 41, 55);
  doc.rect(startX, y, columns.reduce((sum, column) => sum + column.width, 0), height, 'F');
  setPdfFont(doc, 7.4, true, 255);
  columns.forEach((column) => {
    const textX = column.align === 'right'
      ? x + column.width - 2
      : column.align === 'center'
        ? x + (column.width / 2)
        : x + 2;
    doc.text(column.label, textX, y + 5.8, {
      align: column.align === 'right' ? 'right' : column.align === 'center' ? 'center' : 'left',
    });
    x += column.width;
  });
  return y + height;
};

const drawPdfMetric = (doc: PdfDoc, x: number, y: number, width: number, label: string, value: string): void => {
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(x, y, width, 17, 1.5, 1.5, 'FD');
  setPdfFont(doc, 7, true, 107);
  doc.text(label.toUpperCase(), x + 3, y + 5);
  setPdfFont(doc, 11, true, 17);
  doc.text(value, x + 3, y + 12.3);
};

const drawSinglePoPageHeading = (doc: PdfDoc, po: any, continuation = false): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('DESHIO', 10, 10.5);
  doc.setFontSize(12.5);
  doc.text(continuation ? 'Purchase Order Report - continued' : 'Purchase Order Report', 10, 18);
  doc.setFontSize(13);
  doc.text(String(po?.po_number || po?.id || '-'), pageWidth - 10, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Generated ${fmtDate(new Date().toISOString())}`, pageWidth - 10, 18, { align: 'right' });
  return 30;
};

const drawSinglePoTableHeader = (doc: PdfDoc, y: number): number => drawPdfTableHeader(doc, y, [
  { label: '#', width: 8, align: 'center' },
  { label: 'Product / SKU', width: 70 },
  { label: 'Ordered', width: 20, align: 'right' },
  { label: 'Received', width: 20, align: 'right' },
  { label: 'Pending', width: 20, align: 'right' },
  { label: 'Unit Cost', width: 26, align: 'right' },
  { label: 'Sell Price', width: 26, align: 'right' },
  { label: 'Batch', width: 57 },
  { label: 'Total Cost', width: 30, align: 'right' },
]);

export function downloadSinglePurchaseOrderPdf(po: PurchaseOrder | any): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let y = drawSinglePoPageHeading(doc, po);

  const infoGap = 5;
  const infoWidth = (pageWidth - (margin * 2) - infoGap) / 2;
  const infoHeight = 29;
  const leftX = margin;
  const rightX = margin + infoWidth + infoGap;

  doc.setDrawColor(229, 231, 235);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(leftX, y, infoWidth, infoHeight, 2, 2, 'FD');
  doc.roundedRect(rightX, y, infoWidth, infoHeight, 2, 2, 'FD');

  setPdfFont(doc, 7, true, 107);
  doc.text('SUPPLIER & DESTINATION', leftX + 4, y + 5);
  setPdfFont(doc, 11, true, 17);
  doc.text(String(po?.vendor?.name || '-'), leftX + 4, y + 11);
  setPdfFont(doc, 8.5, false, 55);
  doc.text(`Store / Warehouse: ${String(po?.store?.name || '-')}`, leftX + 4, y + 17);
  doc.text(`Created By: ${employeeName(po?.createdBy || po?.created_by)}`, leftX + 4, y + 22.5);
  doc.text(`Received By: ${employeeName(po?.receivedBy || po?.received_by)}`, leftX + 4, y + 27.5);

  setPdfFont(doc, 7, true, 107);
  doc.text('ORDER DETAILS', rightX + 4, y + 5);
  setPdfFont(doc, 8.5, false, 55);
  doc.text(`Order Date: ${fmtDate(po?.order_date || po?.created_at)}`, rightX + 4, y + 11);
  doc.text(`Expected: ${fmtDate(po?.expected_delivery_date)}`, rightX + 4, y + 16.5);
  doc.text(`Received: ${fmtDate(po?.received_at)}`, rightX + 4, y + 22);

  const statusText = String(po?.status || '-').replace(/_/g, ' ');
  const paymentText = String(po?.payment_status || '-').replace(/_/g, ' ');
  const badgeY = y + 25;
  const badge1Width = Math.max(26, doc.getTextWidth(statusText) + 8);
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(rightX + infoWidth - badge1Width - 4, badgeY - 5, badge1Width, 6.5, 3, 3, 'F');
  doc.setTextColor(55, 48, 163);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.text(statusText.toUpperCase(), rightX + infoWidth - 4 - (badge1Width / 2), badgeY - 0.8, { align: 'center' });
  const badge2Width = Math.max(26, doc.getTextWidth(paymentText) + 8);
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(rightX + infoWidth - badge1Width - badge2Width - 7, badgeY - 5, badge2Width, 6.5, 3, 3, 'F');
  setPdfFont(doc, 7.4, true, 75);
  doc.text(paymentText.toUpperCase(), rightX + infoWidth - badge1Width - 7 - (badge2Width / 2), badgeY - 0.8, { align: 'center' });

  y += infoHeight + 6;
  const metricGap = 4;
  const metricWidth = (pageWidth - (margin * 2) - (metricGap * 4)) / 5;
  const metrics = [
    ['Ordered Qty', String(orderedQty(po))],
    ['Received Qty', String(receivedQty(po))],
    ['PO Total', pdfMoney(poTotal(po))],
    ['Paid', pdfMoney(poPaid(po))],
    ['Outstanding', pdfMoney(poOutstanding(po))],
  ];
  metrics.forEach(([label, value], index) => drawPdfMetric(doc, margin + index * (metricWidth + metricGap), y, metricWidth, label, value));
  y += 24;

  setPdfFont(doc, 10.5, true, 17);
  doc.text('Items', margin, y);
  y += 3;
  y = drawSinglePoTableHeader(doc, y);

  const items = Array.isArray(po?.items) ? po.items : [];
  const widths = [8, 70, 20, 20, 20, 26, 26, 57, 30];
  const tableWidth = widths.reduce((sum, width) => sum + width, 0);

  if (items.length === 0) {
    doc.setDrawColor(229, 231, 235);
    doc.rect(margin, y, tableWidth, 12);
    setPdfFont(doc, 8.5, false, 107);
    doc.text('No items found.', margin + (tableWidth / 2), y + 7.5, { align: 'center' });
    y += 12;
  } else {
    items.forEach((item: any, index: number) => {
      const batch = itemBatch(item);
      const productLines = doc.splitTextToSize(itemName(item), widths[1] - 4) as string[];
      const sku = itemSku(item);
      const batchLines = doc.splitTextToSize(String(batch?.batch_number || item?.batch_number || '-'), widths[7] - 4) as string[];
      const productLineCount = Math.min(productLines.length, 3) + (sku ? 1 : 0);
      const rowHeight = Math.max(12, 4 + (Math.max(productLineCount, Math.min(batchLines.length, 3), 1) * 4));

      if (y + rowHeight > pageHeight - 20) {
        doc.addPage('a4', 'landscape');
        y = drawSinglePoPageHeading(doc, po, true) + 3;
        y = drawSinglePoTableHeader(doc, y);
      }

      doc.setDrawColor(229, 231, 235);
      if (index % 2 === 1) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, y, tableWidth, rowHeight, 'F');
      }
      doc.rect(margin, y, tableWidth, rowHeight);

      let x = margin;
      widths.slice(0, -1).forEach((width) => {
        x += width;
        doc.line(x, y, x, y + rowHeight);
      });

      let cellX = margin;
      setPdfFont(doc, 8, false, 55);
      doc.text(String(index + 1), cellX + (widths[0] / 2), y + 7, { align: 'center' });
      cellX += widths[0];

      setPdfFont(doc, 8, true, 17);
      const visibleProductLines = productLines.slice(0, 3);
      doc.text(visibleProductLines, cellX + 2, y + 5.2);
      if (sku) {
        setPdfFont(doc, 7, false, 107);
        doc.text(String(sku), cellX + 2, y + 5.2 + (visibleProductLines.length * 4));
      }
      cellX += widths[1];

      const numericValues = [
        itemOrderedQty(item),
        itemReceivedQty(item),
        itemPendingQty(item),
        pdfMoney(itemUnitCost(item)),
        pdfMoney(item?.unit_sell_price),
      ];
      numericValues.forEach((value, valueIndex) => {
        const width = widths[valueIndex + 2];
        setPdfFont(doc, 7.7, false, 55);
        doc.text(String(value), cellX + width - 2, y + 7, { align: 'right' });
        cellX += width;
      });

      setPdfFont(doc, 7.2, false, 55);
      doc.text(batchLines.slice(0, 3), cellX + 2, y + 5.2);
      cellX += widths[7];
      setPdfFont(doc, 7.7, true, 17);
      doc.text(pdfMoney(itemTotalCost(item)), cellX + widths[8] - 2, y + 7, { align: 'right' });

      y += rowHeight;
    });
  }

  const summaryHeight = 45;
  if (y + summaryHeight > pageHeight - 18) {
    doc.addPage('a4', 'landscape');
    y = drawSinglePoPageHeading(doc, po, true) + 5;
  } else {
    y += 6;
  }

  const totalsWidth = 78;
  const totalsX = pageWidth - margin - totalsWidth;
  const summaryRows: Array<[string, string, boolean?]> = [
    ['Subtotal', pdfMoney(poSubtotal(po))],
    ['Tax', pdfMoney(po?.tax_amount)],
    ['Discount', pdfMoney(po?.discount_amount)],
    ['Shipping', pdfMoney(po?.shipping_cost)],
    ['Total', pdfMoney(poTotal(po)), true],
    ['Paid', pdfMoney(poPaid(po))],
    ['Outstanding', pdfMoney(poOutstanding(po)), true],
  ];
  let totalsY = y;
  summaryRows.forEach(([label, value, strong], index) => {
    const rowHeight = strong ? 7.5 : 6.2;
    if (strong) {
      doc.setFillColor(index === 4 ? 243 : 249, index === 4 ? 244 : 250, index === 4 ? 246 : 251);
      doc.rect(totalsX, totalsY, totalsWidth, rowHeight, 'F');
    }
    doc.setDrawColor(229, 231, 235);
    doc.line(totalsX, totalsY + rowHeight, totalsX + totalsWidth, totalsY + rowHeight);
    setPdfFont(doc, strong ? 8.6 : 7.8, Boolean(strong), strong ? 17 : 75);
    doc.text(label, totalsX + 2, totalsY + rowHeight - 2.2);
    doc.text(value, totalsX + totalsWidth - 2, totalsY + rowHeight - 2.2, { align: 'right' });
    totalsY += rowHeight;
  });

  if (po?.notes) {
    const notesWidth = totalsX - margin - 7;
    setPdfFont(doc, 8.5, true, 17);
    doc.text('Notes', margin, y + 4);
    setPdfFont(doc, 8, false, 75);
    const noteLines = doc.splitTextToSize(String(po.notes), notesWidth) as string[];
    doc.text(noteLines.slice(0, 8), margin, y + 10);
  }

  drawPdfFooter(doc, `Deshio Purchase Order - ${String(po?.po_number || po?.id || '-')}`);
  doc.save(`purchase-order-${safeFilePart(po?.po_number || po?.id)}.pdf`);
}

const drawSummaryHeading = (doc: PdfDoc, filters: Record<string, any>): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('DESHIO', 10, 10.5);
  doc.setFontSize(12.5);
  doc.text('Purchase Order Summary Report', 10, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Generated ${fmtDate(new Date().toISOString())}`, pageWidth - 10, 11, { align: 'right' });
  const filterText = Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ') || 'All purchase orders';
  doc.text(filterText, pageWidth - 10, 18, { align: 'right', maxWidth: 155 });
  return 31;
};

const summaryColumns = [
  { label: '#', width: 7, align: 'center' as const },
  { label: 'PO', width: 30 },
  { label: 'Vendor', width: 39 },
  { label: 'Store', width: 24 },
  { label: 'Date', width: 23 },
  { label: 'Status', width: 22 },
  { label: 'Payment', width: 21 },
  { label: 'Ordered', width: 14, align: 'right' as const },
  { label: 'Received', width: 15, align: 'right' as const },
  { label: 'Total', width: 23, align: 'right' as const },
  { label: 'Paid', width: 22, align: 'right' as const },
  { label: 'Outstanding', width: 26, align: 'right' as const },
];

export function downloadPurchaseOrderSummaryPdf(purchaseOrders: any[], filters: Record<string, any> = {}): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let y = drawSummaryHeading(doc, filters);

  const totals = purchaseOrders.reduce((acc, po) => {
    acc.count += 1;
    acc.ordered += orderedQty(po);
    acc.received += receivedQty(po);
    acc.total += poTotal(po);
    acc.paid += poPaid(po);
    acc.outstanding += poOutstanding(po);
    return acc;
  }, { count: 0, ordered: 0, received: 0, total: 0, paid: 0, outstanding: 0 });

  const pageWidth = doc.internal.pageSize.getWidth();
  const metricGap = 4;
  const metricWidth = (pageWidth - (margin * 2) - (metricGap * 5)) / 6;
  const metrics = [
    ['PO Count', String(totals.count)],
    ['Ordered', String(totals.ordered)],
    ['Received', String(totals.received)],
    ['Total', pdfMoney(totals.total)],
    ['Paid', pdfMoney(totals.paid)],
    ['Outstanding', pdfMoney(totals.outstanding)],
  ];
  metrics.forEach(([label, value], index) => drawPdfMetric(doc, margin + index * (metricWidth + metricGap), y, metricWidth, label, value));
  y += 24;

  y = drawPdfTableHeader(doc, y, summaryColumns);
  const tableWidth = summaryColumns.reduce((sum, column) => sum + column.width, 0);

  if (purchaseOrders.length === 0) {
    doc.setDrawColor(229, 231, 235);
    doc.rect(margin, y, tableWidth, 12);
    setPdfFont(doc, 8.5, false, 107);
    doc.text('No purchase orders found.', margin + (tableWidth / 2), y + 7.5, { align: 'center' });
  } else {
    purchaseOrders.forEach((po, index) => {
      const vendorLines = doc.splitTextToSize(String(po?.vendor?.name || '-'), summaryColumns[2].width - 4) as string[];
      const rowHeight = Math.max(10, 4 + (Math.min(vendorLines.length, 2) * 4));
      if (y + rowHeight > pageHeight - 18) {
        doc.addPage('a4', 'landscape');
        y = drawSummaryHeading(doc, filters) + 2;
        y = drawPdfTableHeader(doc, y, summaryColumns);
      }

      if (index % 2 === 1) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, y, tableWidth, rowHeight, 'F');
      }
      doc.setDrawColor(229, 231, 235);
      doc.rect(margin, y, tableWidth, rowHeight);
      let x = margin;
      summaryColumns.slice(0, -1).forEach((column) => {
        x += column.width;
        doc.line(x, y, x, y + rowHeight);
      });

      const values = [
        String(index + 1),
        String(po?.po_number || '-'),
        vendorLines.slice(0, 2),
        String(po?.store?.name || '-'),
        fmtDate(po?.order_date || po?.created_at),
        String(po?.status || '-').replace(/_/g, ' '),
        String(po?.payment_status || '-').replace(/_/g, ' '),
        String(orderedQty(po)),
        String(receivedQty(po)),
        pdfMoney(poTotal(po)),
        pdfMoney(poPaid(po)),
        pdfMoney(poOutstanding(po)),
      ];

      x = margin;
      values.forEach((value, valueIndex) => {
        const column = summaryColumns[valueIndex];
        setPdfFont(doc, valueIndex === 1 ? 7.4 : 7, valueIndex === 1, valueIndex === 1 ? 17 : 55);
        const align = column.align || 'left';
        const textX = align === 'right'
          ? x + column.width - 2
          : align === 'center'
            ? x + column.width / 2
            : x + 2;
        doc.text(value as any, textX, y + 6.3, { align });
        x += column.width;
      });
      y += rowHeight;
    });
  }

  drawPdfFooter(doc, 'Deshio Purchase Order Summary');
  doc.save(`purchase-order-summary-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function downloadSinglePurchaseOrderHtml(po: PurchaseOrder | any): void {
  downloadTextFile(
    buildSinglePurchaseOrderPrintHtml(po),
    `purchase-order-${safeFilePart(po?.po_number || po?.id)}.html`,
    'text/html;charset=utf-8;'
  );
}

export function downloadPurchaseOrderSummaryHtml(purchaseOrders: any[], filters: Record<string, any> = {}): void {
  downloadTextFile(
    buildPurchaseOrderSummaryPrintHtml(purchaseOrders, filters),
    `purchase-order-summary-${new Date().toISOString().slice(0, 10)}.html`,
    'text/html;charset=utf-8;'
  );
}

export function purchaseOrdersToCsv(purchaseOrders: any[]): string {
  const headers = ['PO ID','PO Number','Vendor','Store','Order Date','Status','Payment Status','Ordered Qty','Received Qty','Subtotal','Tax','Discount','Shipping','Total','Paid','Outstanding','Created By','Received By'];
  const lines = [headers];
  purchaseOrders.forEach((po) => {
    lines.push([
      po?.id,
      po?.po_number,
      po?.vendor?.name || '',
      po?.store?.name || '',
      fmtDate(po?.order_date || po?.created_at),
      po?.status,
      po?.payment_status,
      orderedQty(po),
      receivedQty(po),
      money(poSubtotal(po)),
      money(po?.tax_amount),
      money(po?.discount_amount),
      money(po?.shipping_cost),
      money(poTotal(po)),
      money(poPaid(po)),
      money(poOutstanding(po)),
      employeeName(po?.createdBy || po?.created_by),
      employeeName(po?.receivedBy || po?.received_by),
    ]);
  });
  return lines.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}

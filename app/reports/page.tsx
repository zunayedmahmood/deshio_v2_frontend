'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  FileSpreadsheet,
  Loader2,
  Package,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
} from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import orderService, { type Order } from '@/services/orderService';
import purchaseOrderService, { PurchaseOrder } from '@/services/purchase-order.service';
import storeService, { Store } from '@/services/storeService';
import batchService from '@/services/batchService';
import dispatchService, { type ProductDispatch, type DispatchItem } from '@/services/dispatchService';
import { vendorService, Vendor } from '@/services/vendorService';

type ReportTab = 'po' | 'daily-sales' | 'sales' | 'booking-installment' | 'dispatch-transfer' | 'delivery' | 'category-sales' | 'sales-stock';

interface PoReportRow {
  category: string;
  supplierName: string;
  totalPoQty: number;
  totalPoAmountWithoutVat: number;
  vat: number;
  totalPoAmountWithVat: number;
  returnAmount: number;
  totalValue: number;
  poCount: number;
}

interface DailySalesRow {
  shopName: string;
  salesAmount: number;
  invoiceQty: number;
  itemQty: number;
  salesPercent: number;
}

interface SalesReportRow {
  creationDate: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  productNameAndQty: string;
  productSpecification: string;
  productAttribute: string;
  subTotalPrice: number;
  discount: number;
  priceAfterDiscount: number;
  deliveryCharge: number;
  totalPrice: number;
  paidAmount: number;
  dueAmount: number;
  deliveryPartner: string;
  deliveryArea: string;
  paymentMethod: string;
  orderStatus: string;
  rawStatus: string;
}

interface BookingInstallmentReportRow {
  customerName: string;
  mobile: string;
  productName: string;
  color: string;
  size: string;
  mrp: number;
  status: string;
  rawStatus: string;
  makingCost: number;
  installmentAmount: number;
  installmentPaid: number;
  installmentDue: number;
  invoiceNumber: string;
  orderDate: string;
}

interface DispatchTransferReportRow {
  category: string;
  productCode: string;
  color: string;
  size: string;
  transferQty: number;
  transferValue: number;
  dispatchNumber: string;
  fromStore: string;
  toStore: string;
  status: string;
  rawStatus: string;
  transferDate: string;
}

interface DeliveryReportRow {
  category: string;
  productCode: string;
  color: string;
  size: string;
  unitPrice: number;
  deliveryQty: number;
  deliveredValue: number;
  dispatchNumber: string;
  fromStore: string;
  toStore: string;
  status: string;
  rawStatus: string;
  deliveryDate: string;
}

interface SalesStockReportRow {
  category: string;
  productCode: string;
  color: string;
  size: string;
  soldQty: number;
  subTotal: number;
  stockQty: number;
  stockValue: number;
  storeName: string;
}

interface CategoryWiseSalesReportRow {
  category: string;
  soldQty: number;
  subTotal: number;
  discountAmount: number;
  exchangeAmount: number;
  returnAmount: number;
  netSalesWithoutVat: number;
  vatAmount: number;
  netAmount: number;
}

const today = () => new Date().toISOString().slice(0, 10);
const firstDayOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const toNum = (value: any): number => {
  const n = typeof value === 'string' ? Number.parseFloat(value.replace(/,/g, '')) : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const money = (value: any): string => toNum(value).toLocaleString('en-BD', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const qty = (value: any): string => toNum(value).toLocaleString('en-BD', {
  maximumFractionDigits: 2,
});

const percent = (value: any): string => `${(toNum(value) * 100).toLocaleString('en-BD', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}%`;

const esc = (value: any): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const safeFilePart = (value: string): string => value
  .trim()
  .replace(/[^a-z0-9._-]+/gi, '-')
  .replace(/^-+|-+$/g, '') || 'all';

const displayDateRange = (fromDate: string, toDate: string) => {
  if (fromDate && toDate && fromDate === toDate) return fromDate;
  if (fromDate || toDate) return `${fromDate || 'Start'} to ${toDate || 'End'}`;
  return 'All dates';
};

const triggerDownload = (content: string, filename: string, mime: string) => {
  const blob = new Blob(['\ufeff', content], { type: mime });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const openPrintWindow = (html: string) => {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=800');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
};

const unwrapVendors = (value: any): Vendor[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.data)) return value.data.data;
  return [];
};

const unwrapStores = (value: any): Store[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.data)) return value.data.data;
  return [];
};

// ─────────────────────────────────────────────────────────────────────────────
// Purchase Order report helpers: matches uploaded PO Report.xlsx
// ─────────────────────────────────────────────────────────────────────────────

const itemBatch = (item: any): any => item?.productBatch || item?.product_batch || item?.batch || item?.product_batch_data;
const itemProduct = (item: any): any => item?.product || itemBatch(item)?.product || item?.product_data || {};

const resolveCategory = (item: any): string => {
  const product = itemProduct(item);
  const batch = itemBatch(item);
  const candidates = [
    item?.category_name,
    item?.category?.name,
    item?.category?.title,
    item?.product_category_name,
    product?.category_name,
    product?.category?.name,
    product?.category?.title,
    product?.product_category?.name,
    product?.categories?.[0]?.name,
    batch?.category_name,
    batch?.product?.category?.name,
  ];
  const found = candidates.find((candidate) => String(candidate || '').trim().length > 0);
  return String(found || 'Uncategorized').trim();
};

const resolveSupplier = (po: any): string => {
  const candidates = [
    po?.vendor?.name,
    po?.supplier?.name,
    po?.vendor_name,
    po?.supplier_name,
    po?.vendor?.company_name,
  ];
  const found = candidates.find((candidate) => String(candidate || '').trim().length > 0);
  return String(found || 'Unknown Supplier').trim();
};

const itemQuantity = (item: any): number => toNum(
  item?.quantity_ordered ??
  item?.ordered_quantity ??
  item?.quantity ??
  item?.qty ??
  0
);

const itemUnitCost = (item: any): number => {
  const batch = itemBatch(item);
  return toNum(
    item?.unit_cost ??
    item?.cost_price ??
    item?.purchase_price ??
    batch?.cost_price ??
    batch?.purchase_price ??
    0
  );
};

const itemLineSubtotal = (item: any): number => {
  const direct = toNum(
    item?.total_cost ??
    item?.line_total ??
    item?.subtotal ??
    item?.total_amount ??
    0
  );
  if (direct > 0) return direct;
  return itemQuantity(item) * itemUnitCost(item);
};

const orderedQtyFromPo = (po: any): number => {
  const items = Array.isArray(po?.items) ? po.items : [];
  if (items.length) return items.reduce((sum: number, item: any) => sum + itemQuantity(item), 0);
  return toNum(po?.total_quantity ?? po?.quantity_ordered ?? po?.qty ?? 0);
};

const poSubtotal = (po: any): number => {
  const items = Array.isArray(po?.items) ? po.items : [];
  const itemSum = items.reduce((sum: number, item: any) => sum + itemLineSubtotal(item), 0);
  if (itemSum > 0) return itemSum;
  return toNum(po?.subtotal_amount ?? po?.subtotal ?? po?.total_amount_without_vat ?? po?.amount_without_vat ?? 0);
};

const poVat = (po: any): number => toNum(
  po?.tax_amount ??
  po?.vat ??
  po?.vat_amount ??
  po?.total_vat ??
  0
);

const poReturnAmount = (po: any): number => toNum(
  po?.return_amount ??
  po?.returned_amount ??
  po?.vendor_return_amount ??
  po?.return_total ??
  po?.metadata?.return_amount ??
  po?.metadata?.vendor_return_amount ??
  0
);

const itemReturnAmount = (item: any): number => toNum(
  item?.return_amount ??
  item?.returned_amount ??
  item?.vendor_return_amount ??
  item?.rtv_amount ??
  item?.metadata?.return_amount ??
  item?.metadata?.vendor_return_amount ??
  0
);

const buildPoRows = (purchaseOrders: PurchaseOrder[] | any[]): PoReportRow[] => {
  const grouped = new Map<string, PoReportRow>();

  purchaseOrders.forEach((po: any) => {
    const supplierName = resolveSupplier(po);
    const items = Array.isArray(po?.items) ? po.items : [];
    const baseAmount = poSubtotal(po);
    const taxAmount = poVat(po);
    const returnedAmount = poReturnAmount(po);

    if (!items.length) {
      const category = 'Uncategorized';
      const key = `${category}|||${supplierName}`;
      const existing = grouped.get(key) || {
        category,
        supplierName,
        totalPoQty: 0,
        totalPoAmountWithoutVat: 0,
        vat: 0,
        totalPoAmountWithVat: 0,
        returnAmount: 0,
        totalValue: 0,
        poCount: 0,
      };
      existing.totalPoQty += orderedQtyFromPo(po);
      existing.totalPoAmountWithoutVat += baseAmount;
      existing.vat += taxAmount;
      existing.returnAmount += returnedAmount;
      existing.poCount += 1;
      grouped.set(key, existing);
      return;
    }

    const itemSubtotalSum = items.reduce((sum: number, item: any) => sum + itemLineSubtotal(item), 0) || baseAmount || 1;
    items.forEach((item: any) => {
      const category = resolveCategory(item);
      const lineSubtotal = itemLineSubtotal(item);
      const ratio = itemSubtotalSum > 0 ? lineSubtotal / itemSubtotalSum : 0;
      const lineVat = taxAmount * ratio;
      const directReturn = itemReturnAmount(item);
      const lineReturn = directReturn > 0 ? directReturn : returnedAmount * ratio;
      const key = `${category}|||${supplierName}`;
      const existing = grouped.get(key) || {
        category,
        supplierName,
        totalPoQty: 0,
        totalPoAmountWithoutVat: 0,
        vat: 0,
        totalPoAmountWithVat: 0,
        returnAmount: 0,
        totalValue: 0,
        poCount: 0,
      };
      existing.totalPoQty += itemQuantity(item);
      existing.totalPoAmountWithoutVat += lineSubtotal;
      existing.vat += lineVat;
      existing.returnAmount += lineReturn;
      existing.poCount += 1;
      grouped.set(key, existing);
    });
  });

  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      totalPoAmountWithVat: row.totalPoAmountWithoutVat + row.vat,
      totalValue: row.totalPoAmountWithoutVat + row.vat - row.returnAmount,
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.supplierName.localeCompare(b.supplierName));
};

const summarizePoRows = (rows: PoReportRow[]) => rows.reduce((acc, row) => {
  acc.totalPoQty += row.totalPoQty;
  acc.totalPoAmountWithoutVat += row.totalPoAmountWithoutVat;
  acc.vat += row.vat;
  acc.totalPoAmountWithVat += row.totalPoAmountWithVat;
  acc.returnAmount += row.returnAmount;
  acc.totalValue += row.totalValue;
  return acc;
}, {
  totalPoQty: 0,
  totalPoAmountWithoutVat: 0,
  vat: 0,
  totalPoAmountWithVat: 0,
  returnAmount: 0,
  totalValue: 0,
});

const buildPoExcelHtml = (rows: PoReportRow[], fromDate: string, toDate: string): string => {
  const totals = summarizePoRows(rows);
  const bodyRows = rows.map((row) => `
    <tr>
      <td>${esc(row.category)}</td>
      <td>${esc(row.supplierName)}</td>
      <td style="mso-number-format:'0.00'; text-align:right;">${row.totalPoQty}</td>
      <td style="mso-number-format:'0.00'; text-align:right;">${row.totalPoAmountWithoutVat.toFixed(2)}</td>
      <td style="mso-number-format:'0.00'; text-align:right;">${row.vat.toFixed(2)}</td>
      <td style="mso-number-format:'0.00'; text-align:right;">${row.totalPoAmountWithVat.toFixed(2)}</td>
      <td style="mso-number-format:'0.00'; text-align:right;">${row.returnAmount.toFixed(2)}</td>
      <td style="mso-number-format:'0.00'; text-align:right;">${row.totalValue.toFixed(2)}</td>
    </tr>
  `).join('');

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>PO Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; }
    table { border-collapse: collapse; }
    td, th { border: 1px solid #333; padding: 6px 8px; }
    .title { font-size: 18px; font-weight: 700; text-align: center; background: #f3f4f6; }
    .meta { font-weight: 700; }
    .header { font-weight: 700; background: #d9eaf7; text-align: center; }
    .total { font-weight: 700; background: #fef3c7; }
  </style>
</head>
<body>
  <table>
    <tr><td colspan="8" class="title">Purchase Order Report</td></tr>
    <tr><td class="meta">Date:</td><td>From: ${esc(fromDate || 'All')}</td><td></td><td>To: ${esc(toDate || 'All')}</td><td colspan="4"></td></tr>
    <tr class="header"><td>Category</td><td>Supplier Name</td><td>Total PO Qty</td><td>Total PO Amount without VAT</td><td>VAT</td><td>Total PO Amount with VAT</td><td>Return Amount</td><td>Total Value</td></tr>
    ${bodyRows || '<tr><td colspan="8">No data</td></tr>'}
    <tr class="total"><td colspan="2">Grand Total</td><td style="text-align:right;">${totals.totalPoQty}</td><td style="text-align:right;">${totals.totalPoAmountWithoutVat.toFixed(2)}</td><td style="text-align:right;">${totals.vat.toFixed(2)}</td><td style="text-align:right;">${totals.totalPoAmountWithVat.toFixed(2)}</td><td style="text-align:right;">${totals.returnAmount.toFixed(2)}</td><td style="text-align:right;">${totals.totalValue.toFixed(2)}</td></tr>
  </table>
</body>
</html>`;
};

const buildPoPrintHtml = (rows: PoReportRow[], fromDate: string, toDate: string): string => {
  const totals = summarizePoRows(rows);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Purchase Order Report</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; margin: 0; padding: 24px; color: #111827; }
    .sheet { max-width: 1180px; margin: 0 auto; }
    h1 { text-align: center; margin: 0 0 14px; font-size: 22px; }
    .meta { display: flex; gap: 24px; margin-bottom: 14px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #111827; padding: 7px 8px; }
    th { background: #e5f0ff; text-align: center; }
    .right { text-align: right; }
    .total td { font-weight: 700; background: #fef3c7; }
    .actions { text-align: right; margin-bottom: 16px; }
    .actions button { background: #111827; color: #fff; border: 0; border-radius: 8px; padding: 9px 14px; font-weight: 700; cursor: pointer; }
    @media print { .actions { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
    <h1>Purchase Order Report</h1>
    <div class="meta"><strong>Date:</strong><span>From: ${esc(fromDate || 'All')}</span><span>To: ${esc(toDate || 'All')}</span></div>
    <table>
      <thead><tr><th>Category</th><th>Supplier Name</th><th>Total PO Qty</th><th>Total PO Amount without VAT</th><th>VAT</th><th>Total PO Amount with VAT</th><th>Return Amount</th><th>Total Value</th></tr></thead>
      <tbody>
        ${rows.map((row) => `<tr><td>${esc(row.category)}</td><td>${esc(row.supplierName)}</td><td class="right">${qty(row.totalPoQty)}</td><td class="right">৳${money(row.totalPoAmountWithoutVat)}</td><td class="right">৳${money(row.vat)}</td><td class="right">৳${money(row.totalPoAmountWithVat)}</td><td class="right">৳${money(row.returnAmount)}</td><td class="right">৳${money(row.totalValue)}</td></tr>`).join('') || '<tr><td colspan="8" style="text-align:center;">No data</td></tr>'}
        <tr class="total"><td colspan="2">Grand Total</td><td class="right">${qty(totals.totalPoQty)}</td><td class="right">৳${money(totals.totalPoAmountWithoutVat)}</td><td class="right">৳${money(totals.vat)}</td><td class="right">৳${money(totals.totalPoAmountWithVat)}</td><td class="right">৳${money(totals.returnAmount)}</td><td class="right">৳${money(totals.totalValue)}</td></tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Daily Sales report helpers: matches uploaded Daily Sales Report.xlsx
// ─────────────────────────────────────────────────────────────────────────────

const cancelledStatuses = new Set(['cancelled', 'canceled', 'deleted', 'void', 'refunded']);

const isValidSalesOrder = (order: any): boolean => {
  const status = String(order?.status || '').toLowerCase();
  if (cancelledStatuses.has(status)) return false;
  if (order?.is_preorder) return false;
  const notes = String(order?.notes || '').toUpperCase();
  if (notes.includes('[PREORDER]')) return false;
  return true;
};

const resolveShopName = (order: any): string => {
  const candidates = [
    order?.store?.name,
    order?.store_name,
    order?.branch_name,
    order?.shop_name,
    order?.outlet_name,
  ];
  const found = candidates.find((candidate) => String(candidate || '').trim().length > 0);
  return String(found || 'Unknown Shop').trim();
};

const orderSalesAmount = (order: any): number => toNum(
  order?.total_amount ??
  order?.grand_total ??
  order?.net_total ??
  order?.subtotal ??
  0
);

const orderItemQuantity = (order: any): number => {
  const productQty = Array.isArray(order?.items)
    ? order.items.reduce((sum: number, item: any) => sum + toNum(item?.quantity ?? item?.qty ?? item?.quantity_ordered ?? 0), 0)
    : 0;
  const serviceQty = Array.isArray(order?.services)
    ? order.services.reduce((sum: number, service: any) => sum + toNum(service?.quantity ?? service?.qty ?? 1), 0)
    : 0;
  const fallback = productQty + serviceQty;
  return fallback > 0 ? fallback : 1;
};

const buildDailySalesRows = (orders: Order[] | any[]): DailySalesRow[] => {
  const grouped = new Map<string, DailySalesRow>();

  orders.filter(isValidSalesOrder).forEach((order: any) => {
    const shopName = resolveShopName(order);
    const existing = grouped.get(shopName) || {
      shopName,
      salesAmount: 0,
      invoiceQty: 0,
      itemQty: 0,
      salesPercent: 0,
    };

    existing.salesAmount += orderSalesAmount(order);
    existing.invoiceQty += 1;
    existing.itemQty += orderItemQuantity(order);
    grouped.set(shopName, existing);
  });

  const totalSales = Array.from(grouped.values()).reduce((sum, row) => sum + row.salesAmount, 0);
  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      salesPercent: totalSales > 0 ? row.salesAmount / totalSales : 0,
    }))
    .sort((a, b) => b.salesAmount - a.salesAmount || a.shopName.localeCompare(b.shopName));
};

const summarizeDailySales = (rows: DailySalesRow[]) => rows.reduce((acc, row) => {
  acc.salesAmount += row.salesAmount;
  acc.invoiceQty += row.invoiceQty;
  acc.itemQty += row.itemQty;
  return acc;
}, {
  salesAmount: 0,
  invoiceQty: 0,
  itemQty: 0,
});

const buildDailySalesExcelHtml = (rows: DailySalesRow[], fromDate: string, toDate: string): string => {
  const totals = summarizeDailySales(rows);
  const dateLabel = displayDateRange(fromDate, toDate);
  const bodyRows = rows.map((row) => `
    <tr>
      <td>${esc(row.shopName)}</td>
      <td style="mso-number-format:'0.00'; text-align:right;">${row.salesAmount.toFixed(2)}</td>
      <td style="mso-number-format:'0'; text-align:right;">${row.invoiceQty}</td>
      <td style="mso-number-format:'0'; text-align:right;">${row.itemQty}</td>
      <td style="mso-number-format:'0.00%'; text-align:right;">${row.salesPercent}</td>
    </tr>
  `).join('');

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Daily Sales</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; }
    table { border-collapse: collapse; }
    td, th { border: 1px solid #333; padding: 6px 8px; }
    .title { font-size: 18px; font-weight: 700; text-align: center; background: #f3f4f6; }
    .date { font-weight: 700; }
    .header { font-weight: 700; background: #d9eaf7; text-align: center; }
    .total { font-weight: 700; background: #fef3c7; }
  </style>
</head>
<body>
  <table>
    <tr><td colspan="5" class="title">Daily Sales Status</td></tr>
    <tr><td class="date">Date: ${esc(dateLabel)}</td><td colspan="4"></td></tr>
    <tr class="header"><td>Shop Name</td><td>Sales Amount</td><td>Invoice Qty</td><td>Item Qty</td><td>Sales % of total shop sales</td></tr>
    ${bodyRows || '<tr><td colspan="5">No data</td></tr>'}
    <tr class="total"><td>Total</td><td style="text-align:right;">${totals.salesAmount.toFixed(2)}</td><td style="text-align:right;">${totals.invoiceQty}</td><td style="text-align:right;">${totals.itemQty}</td><td style="text-align:right;">${totals.salesAmount > 0 ? 1 : 0}</td></tr>
    <tr><td colspan="4"></td><td>Sales % of total shop sales= (shop sales/ total sales)</td></tr>
  </table>
</body>
</html>`;
};

const buildDailySalesPrintHtml = (rows: DailySalesRow[], fromDate: string, toDate: string): string => {
  const totals = summarizeDailySales(rows);
  const dateLabel = displayDateRange(fromDate, toDate);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Daily Sales Status</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; margin: 0; padding: 24px; color: #111827; }
    .sheet { max-width: 920px; margin: 0 auto; }
    h1 { text-align: center; margin: 0 0 14px; font-size: 22px; }
    .date { margin-bottom: 14px; font-weight: 700; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #111827; padding: 7px 8px; }
    th { background: #e5f0ff; text-align: center; }
    .right { text-align: right; }
    .total td { font-weight: 700; background: #fef3c7; }
    .note { color: #6b7280; font-size: 11px; }
    .actions { text-align: right; margin-bottom: 16px; }
    .actions button { background: #111827; color: #fff; border: 0; border-radius: 8px; padding: 9px 14px; font-weight: 700; cursor: pointer; }
    @media print { .actions { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
    <h1>Daily Sales Status</h1>
    <div class="date">Date: ${esc(dateLabel)}</div>
    <table>
      <thead><tr><th>Shop Name</th><th>Sales Amount</th><th>Invoice Qty</th><th>Item Qty</th><th>Sales % of total shop sales</th></tr></thead>
      <tbody>
        ${rows.map((row) => `<tr><td>${esc(row.shopName)}</td><td class="right">৳${money(row.salesAmount)}</td><td class="right">${qty(row.invoiceQty)}</td><td class="right">${qty(row.itemQty)}</td><td class="right">${percent(row.salesPercent)}</td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;">No data</td></tr>'}
        <tr class="total"><td>Total</td><td class="right">৳${money(totals.salesAmount)}</td><td class="right">${qty(totals.invoiceQty)}</td><td class="right">${qty(totals.itemQty)}</td><td class="right">${totals.salesAmount > 0 ? '100.00%' : '0.00%'}</td></tr>
        <tr><td colspan="4"></td><td class="note">Sales % of total shop sales= (shop sales/ total sales)</td></tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Detailed Sales report helpers: matches uploaded Sales Report (2).csv
// ─────────────────────────────────────────────────────────────────────────────

const titleCase = (value: any): string => String(value ?? '')
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\b\w/g, (char) => char.toUpperCase());

const firstText = (candidates: any[], fallback = ''): string => {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;
    if (typeof candidate === 'object') continue;
    const value = String(candidate).trim();
    if (value.length > 0) return value;
  }
  return String(fallback ?? '').trim();
};

const asObject = (value: any): any => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return {};
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try { return JSON.parse(trimmed); } catch { return { address: trimmed }; }
    }
    return { address: trimmed };
  }
  return {};
};

const reportDate = (value: any): string => {
  const input = firstText([value]);
  if (!input) return '';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const resolveAddressObject = (order: any): any => asObject(
  order?.shipping_address ??
  order?.delivery_address ??
  order?.customer_address ??
  order?.customer?.address ??
  order?.address
);

const resolveCustomerAddress = (order: any): string => {
  const address = resolveAddressObject(order);
  if (typeof address?.address === 'string' && address.address.trim()) return address.address.trim();

  const parts = [
    address?.line1,
    address?.address_line_1,
    address?.address1,
    address?.street_address,
    address?.street,
    address?.house,
    address?.area,
    address?.zone,
    address?.city,
    address?.district,
    address?.division,
    address?.country,
  ].filter((part) => String(part ?? '').trim().length > 0);

  return parts.join(', ') || firstText([
    order?.customer?.address,
    order?.customer_address,
    order?.shipping_address_text,
  ]);
};

const resolveDeliveryArea = (order: any): string => {
  const address = resolveAddressObject(order);
  return firstText([
    order?.delivery_area,
    order?.pathao_area,
    order?.pathao_zone,
    order?.pathao_city,
    address?.area,
    address?.zone,
    address?.district,
    address?.city,
    address?.division,
  ], '');
};

const resolveDeliveryPartner = (order: any): string => {
  const shipment = Array.isArray(order?.shipments) ? order.shipments[0] : order?.shipment;
  return titleCase(firstText([
    order?.delivery_partner,
    order?.courier_name,
    order?.courier?.name,
    order?.intended_courier,
    shipment?.delivery_partner,
    shipment?.courier_name,
    shipment?.courier,
    shipment?.provider,
  ], ''));
};

const resolvePaymentMethod = (order: any): string => {
  const payments = Array.isArray(order?.payments) ? order.payments : [];
  const methods = payments
    .map((payment: any) => firstText([payment?.payment_method, payment?.method, payment?.payment_method_name]))
    .filter(Boolean);
  return firstText([
    order?.payment_method,
    order?.payment_method_name,
    methods.join(', '),
  ], titleCase(order?.payment_status || ''));
};

const resolveOrderStatusText = (order: any): string => {
  const raw = firstText([order?.status_label, order?.order_status, order?.status], '');
  const statusText = titleCase(raw);
  const due = toNum(order?.outstanding_amount ?? order?.due_amount ?? 0);
  const payment = String(order?.payment_status || '').toLowerCase();
  const status = String(order?.status || '').toLowerCase();

  if (due > 0 && ['delivered', 'completed', 'fulfilled'].includes(status)) return `${statusText || 'Delivered'} - Payment Due`;
  if ((payment === 'paid' || due <= 0) && ['delivered', 'completed', 'fulfilled'].includes(status)) return `${statusText || 'Delivered'} - Paid`;
  return statusText || 'Unknown';
};

const orderItemName = (item: any): string => firstText([
  item?.product_name,
  item?.product?.name,
  item?.product?.product_name,
  item?.name,
  item?.title,
], 'Product');

const orderItemQty = (item: any): number => toNum(item?.quantity ?? item?.qty ?? item?.quantity_ordered ?? 1) || 1;

const orderItemSpec = (item: any): string => {
  const batch = item?.productBatch || item?.product_batch || item?.batch || {};
  const product = item?.product || batch?.product || {};
  return firstText([
    item?.specification,
    item?.product_specification,
    item?.weight ? `weight: ${item.weight}` : '',
    product?.weight ? `weight: ${product.weight}` : '',
    batch?.weight ? `weight: ${batch.weight}` : '',
    product?.specification,
    product?.description_short,
    item?.sku ? `SKU: ${item.sku}` : '',
    item?.product_sku ? `SKU: ${item.product_sku}` : '',
  ]);
};

const orderItemAttribute = (item: any): string => {
  const objectAttrs = [item?.attributes, item?.attribute].find((value) => value && typeof value === 'object');
  if (objectAttrs) {
    return Object.entries(objectAttrs)
      .filter(([, val]) => String(val ?? '').trim().length > 0)
      .map(([key, val]) => `${titleCase(key)}: ${val}`)
      .join(', ');
  }

  return firstText([
    item?.attribute,
    item?.attributes,
    item?.variation_name,
    item?.variant_name,
    item?.size_name,
    item?.color_name,
    item?.size ? `Size: ${item.size}` : '',
    item?.color ? `Color: ${item.color}` : '',
  ]);
};

const numberedMultiline = (values: string[]): string => {
  const clean = values.map((value) => String(value || '').trim()).filter(Boolean);
  if (clean.length <= 1) return clean[0] || '';
  return clean.map((value, index) => `${index + 1}. ${value}`).join('\n\n');
};

const resolveProductLines = (order: any): { names: string; specs: string; attrs: string; itemQty: number } => {
  const productItems = Array.isArray(order?.items) ? order.items : [];
  const services = Array.isArray(order?.services) ? order.services : [];

  const itemLines = productItems.map((item: any) => `${orderItemName(item)} - ${qty(orderItemQty(item))}`);
  const serviceLines = services.map((service: any) => `${firstText([service?.service_name, service?.name], 'Service')} - ${qty(toNum(service?.quantity ?? service?.qty ?? 1) || 1)}`);

  const specs = productItems.map(orderItemSpec).concat(services.map((service: any) => firstText([service?.category, service?.service_code])));
  const attrs = productItems.map(orderItemAttribute).concat(services.map(() => ''));
  const itemQty = productItems.reduce((sum: number, item: any) => sum + orderItemQty(item), 0)
    + services.reduce((sum: number, service: any) => sum + (toNum(service?.quantity ?? service?.qty ?? 1) || 1), 0);

  return {
    names: numberedMultiline([...itemLines, ...serviceLines]),
    specs: numberedMultiline(specs),
    attrs: numberedMultiline(attrs),
    itemQty: itemQty || 1,
  };
};

const isDetailedSalesOrder = (order: any): boolean => {
  if (order?.is_preorder) return false;
  const notes = String(order?.notes || '').toUpperCase();
  if (notes.includes('[PREORDER]')) return false;
  const status = String(order?.status || '').toLowerCase();
  return status !== 'deleted' && status !== 'void';
};

const buildSalesReportRows = (orders: Order[] | any[]): SalesReportRow[] => orders
  .filter(isDetailedSalesOrder)
  .map((order: any) => {
    const products = resolveProductLines(order);
    const subtotal = toNum(order?.subtotal ?? order?.sub_total ?? order?.items_total ?? 0);
    const discount = toNum(order?.total_discount ?? order?.discount_amount ?? order?.item_discount ?? 0);
    const priceAfterDiscount = Math.max(subtotal - discount, 0);
    const deliveryCharge = toNum(order?.shipping_amount ?? order?.delivery_charge ?? 0);
    const totalPrice = toNum(order?.total_amount ?? order?.grand_total ?? (priceAfterDiscount + deliveryCharge));
    const paidAmount = toNum(order?.paid_amount ?? order?.payments_total ?? 0);
    const dueAmount = toNum(order?.outstanding_amount ?? order?.due_amount ?? Math.max(totalPrice - paidAmount, 0));

    return {
      creationDate: reportDate(order?.order_date ?? order?.created_at),
      invoiceNumber: firstText([order?.order_number, order?.invoice_number, order?.invoice_no], `#${order?.id ?? ''}`),
      customerName: firstText([order?.customer?.name, order?.customer_name], 'Walk-in Customer'),
      customerPhone: firstText([order?.customer?.phone, order?.customer_phone, order?.phone], ''),
      customerAddress: resolveCustomerAddress(order),
      productNameAndQty: products.names,
      productSpecification: products.specs,
      productAttribute: products.attrs,
      subTotalPrice: subtotal,
      discount,
      priceAfterDiscount,
      deliveryCharge,
      totalPrice,
      paidAmount,
      dueAmount,
      deliveryPartner: resolveDeliveryPartner(order),
      deliveryArea: resolveDeliveryArea(order),
      paymentMethod: resolvePaymentMethod(order),
      orderStatus: resolveOrderStatusText(order),
      rawStatus: String(order?.status || '').toLowerCase(),
    };
  })
  .sort((a, b) => b.invoiceNumber.localeCompare(a.invoiceNumber));

const summarizeSalesRows = (rows: SalesReportRow[]) => rows.reduce((acc, row) => {
  acc.subTotalPrice += row.subTotalPrice;
  acc.discount += row.discount;
  acc.priceAfterDiscount += row.priceAfterDiscount;
  acc.deliveryCharge += row.deliveryCharge;
  acc.totalPrice += row.totalPrice;
  acc.paidAmount += row.paidAmount;
  acc.dueAmount += row.dueAmount;
  return acc;
}, {
  subTotalPrice: 0,
  discount: 0,
  priceAfterDiscount: 0,
  deliveryCharge: 0,
  totalPrice: 0,
  paidAmount: 0,
  dueAmount: 0,
});

const salesReportHeaders = [
  'Creation Date',
  'Invoice Number',
  'Customer Name',
  'Customer Phone',
  'Customer Address',
  'Product Name And Q T Y',
  'Product Specification',
  'Product Attribute',
  'Sub Total Price',
  'Discount',
  'Price After Discount',
  'Delivery Charge',
  'Total Price',
  'Paid Amount',
  'Due Amount',
  'Delivery Partner',
  'Delivery Area',
  'Payment Method',
  'Order Status',
];

const salesRowToCells = (row: SalesReportRow): any[] => [
  row.creationDate,
  row.invoiceNumber,
  row.customerName,
  row.customerPhone,
  row.customerAddress,
  row.productNameAndQty,
  row.productSpecification,
  row.productAttribute,
  row.subTotalPrice,
  row.discount,
  row.priceAfterDiscount,
  row.deliveryCharge,
  row.totalPrice,
  row.paidAmount,
  row.dueAmount,
  row.deliveryPartner,
  row.deliveryArea,
  row.paymentMethod,
  row.orderStatus,
];

const buildSalesReportExcelHtml = (rows: SalesReportRow[], fromDate: string, toDate: string): string => {
  const totals = summarizeSalesRows(rows);
  const bodyRows = rows.map((row) => `
    <tr>
      <td>${esc(row.creationDate)}</td>
      <td>${esc(row.invoiceNumber)}</td>
      <td>${esc(row.customerName)}</td>
      <td style="mso-number-format:'@';">${esc(row.customerPhone)}</td>
      <td>${esc(row.customerAddress)}</td>
      <td style="white-space: pre-line;">${esc(row.productNameAndQty)}</td>
      <td style="white-space: pre-line;">${esc(row.productSpecification)}</td>
      <td style="white-space: pre-line;">${esc(row.productAttribute)}</td>
      <td style="mso-number-format:'0.00'; text-align:right;">${row.subTotalPrice.toFixed(2)}</td>
      <td style="mso-number-format:'0.00'; text-align:right;">${row.discount.toFixed(2)}</td>
      <td style="mso-number-format:'0.00'; text-align:right;">${row.priceAfterDiscount.toFixed(2)}</td>
      <td style="mso-number-format:'0.00'; text-align:right;">${row.deliveryCharge.toFixed(2)}</td>
      <td style="mso-number-format:'0.00'; text-align:right;">${row.totalPrice.toFixed(2)}</td>
      <td style="mso-number-format:'0.00'; text-align:right;">${row.paidAmount.toFixed(2)}</td>
      <td style="mso-number-format:'0.00'; text-align:right;">${row.dueAmount.toFixed(2)}</td>
      <td>${esc(row.deliveryPartner)}</td>
      <td>${esc(row.deliveryArea)}</td>
      <td>${esc(row.paymentMethod)}</td>
      <td>${esc(row.orderStatus)}</td>
    </tr>
  `).join('');

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sales Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; }
    table { border-collapse: collapse; }
    td, th { border: 1px solid #333; padding: 6px 8px; vertical-align: top; }
    .title { font-size: 18px; font-weight: 700; text-align: center; background: #f3f4f6; }
    .header { font-weight: 700; background: #d9eaf7; text-align: center; }
    .total { font-weight: 700; background: #fef3c7; }
  </style>
</head>
<body>
  <table>
    <tr><td colspan="19" class="title">Sales Report</td></tr>
    <tr><td><strong>Date:</strong></td><td>From: ${esc(fromDate || 'All')}</td><td>To: ${esc(toDate || 'All')}</td><td colspan="16"></td></tr>
    <tr class="header">${salesReportHeaders.map((header) => `<td>${esc(header)}</td>`).join('')}</tr>
    ${bodyRows || '<tr><td colspan="19">No data</td></tr>'}
    <tr class="total"><td colspan="8">Total</td><td style="text-align:right;">${totals.subTotalPrice.toFixed(2)}</td><td style="text-align:right;">${totals.discount.toFixed(2)}</td><td style="text-align:right;">${totals.priceAfterDiscount.toFixed(2)}</td><td style="text-align:right;">${totals.deliveryCharge.toFixed(2)}</td><td style="text-align:right;">${totals.totalPrice.toFixed(2)}</td><td style="text-align:right;">${totals.paidAmount.toFixed(2)}</td><td style="text-align:right;">${totals.dueAmount.toFixed(2)}</td><td colspan="4"></td></tr>
  </table>
</body>
</html>`;
};

const buildSalesReportPrintHtml = (rows: SalesReportRow[], fromDate: string, toDate: string): string => {
  const totals = summarizeSalesRows(rows);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Sales Report</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; margin: 0; padding: 18px; color: #111827; }
    h1 { text-align: center; margin: 0 0 12px; font-size: 22px; }
    .meta { margin-bottom: 14px; font-size: 13px; display: flex; gap: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th, td { border: 1px solid #111827; padding: 5px 6px; vertical-align: top; }
    th { background: #e5f0ff; text-align: center; }
    .right { text-align: right; white-space: nowrap; }
    .wrap { white-space: pre-line; min-width: 130px; }
    .total td { font-weight: 700; background: #fef3c7; }
    .actions { text-align: right; margin-bottom: 16px; }
    .actions button { background: #111827; color: #fff; border: 0; border-radius: 8px; padding: 9px 14px; font-weight: 700; cursor: pointer; }
    @media print { .actions { display: none; } body { padding: 0; } table { font-size: 8px; } }
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
  <h1>Sales Report</h1>
  <div class="meta"><strong>Date:</strong><span>From: ${esc(fromDate || 'All')}</span><span>To: ${esc(toDate || 'All')}</span></div>
  <table>
    <thead><tr>${salesReportHeaders.map((header) => `<th>${esc(header)}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.map((row) => `<tr>
        <td>${esc(row.creationDate)}</td><td>${esc(row.invoiceNumber)}</td><td>${esc(row.customerName)}</td><td>${esc(row.customerPhone)}</td><td class="wrap">${esc(row.customerAddress)}</td><td class="wrap">${esc(row.productNameAndQty)}</td><td class="wrap">${esc(row.productSpecification)}</td><td class="wrap">${esc(row.productAttribute)}</td><td class="right">৳${money(row.subTotalPrice)}</td><td class="right">৳${money(row.discount)}</td><td class="right">৳${money(row.priceAfterDiscount)}</td><td class="right">৳${money(row.deliveryCharge)}</td><td class="right">৳${money(row.totalPrice)}</td><td class="right">৳${money(row.paidAmount)}</td><td class="right">৳${money(row.dueAmount)}</td><td>${esc(row.deliveryPartner)}</td><td>${esc(row.deliveryArea)}</td><td>${esc(row.paymentMethod)}</td><td>${esc(row.orderStatus)}</td>
      </tr>`).join('') || '<tr><td colspan="19" style="text-align:center;">No data</td></tr>'}
      <tr class="total"><td colspan="8">Total</td><td class="right">৳${money(totals.subTotalPrice)}</td><td class="right">৳${money(totals.discount)}</td><td class="right">৳${money(totals.priceAfterDiscount)}</td><td class="right">৳${money(totals.deliveryCharge)}</td><td class="right">৳${money(totals.totalPrice)}</td><td class="right">৳${money(totals.paidAmount)}</td><td class="right">৳${money(totals.dueAmount)}</td><td colspan="4"></td></tr>
    </tbody>
  </table>
</body>
</html>`;
};


// ─────────────────────────────────────────────────────────────────────────────
// Booking, Making & Installment helpers: matches uploaded Excel template
// ─────────────────────────────────────────────────────────────────────────────

const bookingInstallmentHeaders = [
  'Customer Name',
  'Mobile',
  'Product Name',
  'Color',
  'Size',
  'MRP',
  'Status',
  'Making Cost',
  'Installment Amount',
  'Installment Paid',
  'Installment Due',
];

const resolveOrderMarkerText = (order: any): string => [
  order?.status,
  order?.payment_status,
  order?.order_type,
  order?.notes,
  order?.metadata?.status,
  order?.metadata?.type,
  order?.metadata?.booking_status,
  order?.metadata?.making_status,
  order?.installment_info ? 'installment' : '',
  order?.installment_plan ? 'installment' : '',
].map((value) => String(value || '').toLowerCase()).join(' ');

const isBookingMakingInstallmentOrder = (order: any): boolean => {
  if (!isDetailedSalesOrder(order)) return false;
  if (order?.is_installment === true || order?.is_installment === 1) return true;
  if (order?.installment_info || order?.installment_plan) return true;
  const marker = resolveOrderMarkerText(order);
  return /\b(booked|booking|making|installment|emi|partial|advance)\b/.test(marker);
};

const resolveItemColor = (item: any): string => {
  const attrs = item?.attributes && typeof item.attributes === 'object' ? item.attributes : {};
  const attr = item?.attribute && typeof item.attribute === 'object' ? item.attribute : {};
  const batch = item?.productBatch || item?.product_batch || item?.batch || {};
  const product = item?.product || batch?.product || {};
  return firstText([
    item?.color,
    item?.color_name,
    attrs?.color,
    attrs?.Color,
    attr?.color,
    attr?.Color,
    item?.variant_color,
    item?.variation_color,
    batch?.color,
    product?.color,
  ], '-');
};

const resolveItemSize = (item: any): string => {
  const attrs = item?.attributes && typeof item.attributes === 'object' ? item.attributes : {};
  const attr = item?.attribute && typeof item.attribute === 'object' ? item.attribute : {};
  const batch = item?.productBatch || item?.product_batch || item?.batch || {};
  const product = item?.product || batch?.product || {};
  return firstText([
    item?.size,
    item?.size_name,
    attrs?.size,
    attrs?.Size,
    attr?.size,
    attr?.Size,
    item?.variant_size,
    item?.variation_size,
    batch?.size,
    product?.size,
  ], '-');
};

const itemLineAmountForReport = (item: any): number => {
  const direct = toNum(item?.total_amount ?? item?.line_total ?? item?.total_price ?? 0);
  if (direct > 0) return direct;
  const price = toNum(item?.unit_price ?? item?.price ?? item?.selling_price ?? item?.product?.selling_price ?? 0);
  return price * orderItemQty(item);
};

const resolveMakingCost = (item: any, order: any): number => toNum(
  item?.making_cost ??
  item?.makingCost ??
  item?.metadata?.making_cost ??
  item?.product?.making_cost ??
  item?.productBatch?.making_cost ??
  item?.product_batch?.making_cost ??
  item?.batch?.making_cost ??
  order?.making_cost ??
  order?.metadata?.making_cost ??
  0
);

const resolveBookingStatus = (order: any): string => {
  const marker = resolveOrderMarkerText(order);
  if (marker.includes('making')) return 'Making';
  if (order?.is_installment === true || order?.is_installment === 1 || order?.installment_info || order?.installment_plan || marker.includes('installment') || marker.includes('emi')) {
    const due = toNum(order?.outstanding_amount ?? order?.due_amount ?? 0);
    if (due <= 0 && String(order?.payment_status || '').toLowerCase() === 'paid') return 'Installment Paid';
    return 'Installment';
  }
  if (marker.includes('advance')) return 'Advance';
  if (marker.includes('book')) return 'Booked';
  return titleCase(order?.status || 'Booked');
};

const buildBookingInstallmentRows = (orders: Order[] | any[]): BookingInstallmentReportRow[] => orders
  .filter(isBookingMakingInstallmentOrder)
  .flatMap((order: any) => {
    const items = Array.isArray(order?.items) && order.items.length ? order.items : [{
      product_name: firstText([order?.product_name, order?.requested_product?.name], 'Product'),
      quantity: 1,
      unit_price: order?.total_amount,
    }];

    const subtotal = items.reduce((sum: number, item: any) => sum + itemLineAmountForReport(item), 0) || toNum(order?.subtotal ?? order?.total_amount ?? 0) || 1;
    const totalPayable = toNum(order?.total_amount ?? order?.grand_total ?? subtotal);
    const paidTotal = toNum(order?.paid_amount ?? order?.payments_total ?? 0);
    const dueTotal = toNum(order?.outstanding_amount ?? order?.due_amount ?? Math.max(totalPayable - paidTotal, 0));
    const status = resolveBookingStatus(order);

    return items.map((item: any) => {
      const line = itemLineAmountForReport(item) || (subtotal / Math.max(items.length, 1));
      const ratio = subtotal > 0 ? line / subtotal : 1 / Math.max(items.length, 1);
      return {
        customerName: firstText([order?.customer?.name, order?.customer_name], 'Walk-in Customer'),
        mobile: firstText([order?.customer?.phone, order?.customer_phone, order?.phone], ''),
        productName: orderItemName(item),
        color: resolveItemColor(item),
        size: resolveItemSize(item),
        mrp: line,
        status,
        rawStatus: status.toLowerCase(),
        makingCost: resolveMakingCost(item, order),
        installmentAmount: totalPayable * ratio,
        installmentPaid: paidTotal * ratio,
        installmentDue: dueTotal * ratio,
        invoiceNumber: firstText([order?.order_number, order?.invoice_number, order?.invoice_no], `#${order?.id ?? ''}`),
        orderDate: reportDate(order?.order_date ?? order?.created_at),
      };
    });
  })
  .sort((a, b) => a.customerName.localeCompare(b.customerName) || b.invoiceNumber.localeCompare(a.invoiceNumber));

const summarizeBookingInstallmentRows = (rows: BookingInstallmentReportRow[]) => rows.reduce((acc, row) => {
  acc.mrp += row.mrp;
  acc.makingCost += row.makingCost;
  acc.installmentAmount += row.installmentAmount;
  acc.installmentPaid += row.installmentPaid;
  acc.installmentDue += row.installmentDue;
  return acc;
}, {
  mrp: 0,
  makingCost: 0,
  installmentAmount: 0,
  installmentPaid: 0,
  installmentDue: 0,
});

const bookingRowToCells = (row: BookingInstallmentReportRow): any[] => [
  row.customerName,
  row.mobile,
  row.productName,
  row.color,
  row.size,
  row.mrp,
  row.status,
  row.makingCost,
  row.installmentAmount,
  row.installmentPaid,
  row.installmentDue,
];

const buildBookingInstallmentExcelHtml = (rows: BookingInstallmentReportRow[], fromDate: string, toDate: string): string => {
  const totals = summarizeBookingInstallmentRows(rows);
  const bodyRows = rows.map((row) => `
    <tr>
      <td>${esc(row.customerName)}</td>
      <td style="mso-number-format:'@';">${esc(row.mobile)}</td>
      <td>${esc(row.productName)}</td>
      <td>${esc(row.color)}</td>
      <td>${esc(row.size)}</td>
      <td style="mso-number-format:'0.00'; text-align:right;">${row.mrp.toFixed(2)}</td>
      <td>${esc(row.status)}</td>
      <td style="mso-number-format:'0.00'; text-align:right;">${row.makingCost.toFixed(2)}</td>
      <td style="mso-number-format:'0.00'; text-align:right;">${row.installmentAmount.toFixed(2)}</td>
      <td style="mso-number-format:'0.00'; text-align:right;">${row.installmentPaid.toFixed(2)}</td>
      <td style="mso-number-format:'0.00'; text-align:right;">${row.installmentDue.toFixed(2)}</td>
    </tr>
  `).join('');

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Booking Installment</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; }
    table { border-collapse: collapse; }
    td, th { border: 1px solid #333; padding: 6px 8px; }
    .title { font-size: 18px; font-weight: 700; text-align: center; background: #f3f4f6; }
    .header { font-weight: 700; background: #d9eaf7; text-align: center; }
    .total { font-weight: 700; background: #fef3c7; }
  </style>
</head>
<body>
  <table>
    <tr><td colspan="11" class="title">BOOKING, MAKING &amp; INSTALLMENT</td></tr>
    <tr><td><strong>Date:</strong></td><td>From: ${esc(fromDate || 'All')}</td><td>To: ${esc(toDate || 'All')}</td><td colspan="8"></td></tr>
    <tr class="header">${bookingInstallmentHeaders.map((header) => `<td>${esc(header)}</td>`).join('')}</tr>
    ${bodyRows || '<tr><td colspan="11">No data</td></tr>'}
    <tr class="total"><td colspan="5">Total</td><td style="text-align:right;">${totals.mrp.toFixed(2)}</td><td></td><td style="text-align:right;">${totals.makingCost.toFixed(2)}</td><td style="text-align:right;">${totals.installmentAmount.toFixed(2)}</td><td style="text-align:right;">${totals.installmentPaid.toFixed(2)}</td><td style="text-align:right;">${totals.installmentDue.toFixed(2)}</td></tr>
  </table>
</body>
</html>`;
};

const buildBookingInstallmentPrintHtml = (rows: BookingInstallmentReportRow[], fromDate: string, toDate: string): string => {
  const totals = summarizeBookingInstallmentRows(rows);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Booking, Making & Installment</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; margin: 0; padding: 20px; color: #111827; }
    h1 { text-align: center; margin: 0 0 12px; font-size: 22px; }
    .meta { margin-bottom: 14px; font-size: 13px; display: flex; gap: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #111827; padding: 6px 7px; vertical-align: top; }
    th { background: #e5f0ff; text-align: center; }
    .right { text-align: right; white-space: nowrap; }
    .total td { font-weight: 700; background: #fef3c7; }
    .actions { text-align: right; margin-bottom: 16px; }
    .actions button { background: #111827; color: #fff; border: 0; border-radius: 8px; padding: 9px 14px; font-weight: 700; cursor: pointer; }
    @media print { .actions { display: none; } body { padding: 0; } table { font-size: 9px; } }
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
  <h1>BOOKING, MAKING &amp; INSTALLMENT</h1>
  <div class="meta"><strong>Date:</strong><span>From: ${esc(fromDate || 'All')}</span><span>To: ${esc(toDate || 'All')}</span></div>
  <table>
    <thead><tr>${bookingInstallmentHeaders.map((header) => `<th>${esc(header)}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.map((row) => `<tr><td>${esc(row.customerName)}</td><td>${esc(row.mobile)}</td><td>${esc(row.productName)}</td><td>${esc(row.color)}</td><td>${esc(row.size)}</td><td class="right">৳${money(row.mrp)}</td><td>${esc(row.status)}</td><td class="right">৳${money(row.makingCost)}</td><td class="right">৳${money(row.installmentAmount)}</td><td class="right">৳${money(row.installmentPaid)}</td><td class="right">৳${money(row.installmentDue)}</td></tr>`).join('') || '<tr><td colspan="11" style="text-align:center;">No booking/installment data found</td></tr>'}
      <tr class="total"><td colspan="5">Total</td><td class="right">৳${money(totals.mrp)}</td><td></td><td class="right">৳${money(totals.makingCost)}</td><td class="right">৳${money(totals.installmentAmount)}</td><td class="right">৳${money(totals.installmentPaid)}</td><td class="right">৳${money(totals.installmentDue)}</td></tr>
    </tbody>
  </table>
</body>
</html>`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Dispatch / Transfer report helpers: matches uploaded Transfer Report.xlsx
// ─────────────────────────────────────────────────────────────────────────────

const dispatchTransferHeaders = [
  'Category',
  'Product Code',
  'Color',
  'Size',
  'Transfer Qty',
  'Transfer Value',
];

const normalizeStatus = (value: any): string => String(value || '').toLowerCase().replace(/\s+/g, '_');

const dispatchDate = (dispatch: any): string => reportDate(dispatch?.dispatch_date ?? dispatch?.created_at);

const resolveDispatchStoreName = (dispatch: any, key: 'source' | 'destination'): string => {
  const store = key === 'source' ? dispatch?.source_store : dispatch?.destination_store;
  return firstText([
    store?.name,
    key === 'source' ? dispatch?.source_store_name : dispatch?.destination_store_name,
    key === 'source' ? dispatch?.from_store_name : dispatch?.to_store_name,
  ], key === 'source' ? 'Source Store' : 'Destination Store');
};

const dispatchItemProduct = (item: any): any => item?.product || item?.batch?.product || item?.product_batch?.product || item?.productBatch?.product || {};
const dispatchItemBatch = (item: any): any => item?.batch || item?.product_batch || item?.productBatch || {};

const resolveDispatchCategory = (item: any): string => {
  const product = dispatchItemProduct(item);
  const batch = dispatchItemBatch(item);
  return firstText([
    item?.category_name,
    item?.category?.name,
    product?.category_name,
    product?.category?.name,
    product?.product_category?.name,
    product?.categories?.[0]?.name,
    batch?.category_name,
    batch?.product?.category?.name,
  ], 'Uncategorized');
};

const resolveDispatchProductCode = (item: any): string => {
  const product = dispatchItemProduct(item);
  const batch = dispatchItemBatch(item);
  return firstText([
    item?.product_code,
    item?.sku,
    product?.sku,
    product?.product_code,
    product?.code,
    batch?.sku,
    batch?.barcode,
    batch?.batch_number,
  ], '-');
};

const resolveDispatchColor = (item: any): string => {
  const product = dispatchItemProduct(item);
  const batch = dispatchItemBatch(item);
  const attrs = item?.attributes && typeof item.attributes === 'object' ? item.attributes : {};
  const metadata = item?.metadata && typeof item.metadata === 'object' ? item.metadata : {};
  return firstText([
    item?.color,
    item?.color_name,
    attrs?.color,
    attrs?.Color,
    metadata?.color,
    metadata?.Color,
    batch?.color,
    batch?.color_name,
    batch?.color?.name,
    product?.color,
    product?.color_name,
  ], '-');
};

const resolveDispatchSize = (item: any): string => {
  const product = dispatchItemProduct(item);
  const batch = dispatchItemBatch(item);
  const attrs = item?.attributes && typeof item.attributes === 'object' ? item.attributes : {};
  const metadata = item?.metadata && typeof item.metadata === 'object' ? item.metadata : {};
  return firstText([
    item?.size,
    item?.size_name,
    attrs?.size,
    attrs?.Size,
    metadata?.size,
    metadata?.Size,
    batch?.size,
    batch?.size_name,
    batch?.size?.name,
    product?.size,
    product?.size_name,
  ], '-');
};

const dispatchItemQuantity = (item: any): number => toNum(item?.quantity ?? item?.qty ?? item?.transfer_quantity ?? 0);

const dispatchItemTransferValue = (item: any): number => {
  const direct = toNum(item?.total_value ?? item?.transfer_value ?? item?.line_total ?? item?.total_amount ?? 0);
  if (direct > 0) return direct;
  const qtyValue = dispatchItemQuantity(item);
  const unit = toNum(item?.unit_price ?? item?.selling_price ?? item?.price ?? item?.batch?.selling_price ?? item?.product?.selling_price ?? 0);
  return qtyValue * unit;
};

const isReportableDispatch = (dispatch: any): boolean => {
  const status = normalizeStatus(dispatch?.status);
  return !['cancelled', 'canceled', 'deleted', 'void'].includes(status);
};

const buildDispatchTransferRows = (dispatches: ProductDispatch[] | any[]): DispatchTransferReportRow[] => {
  const grouped = new Map<string, DispatchTransferReportRow>();

  dispatches.filter(isReportableDispatch).forEach((dispatch: any) => {
    const items = Array.isArray(dispatch?.items) ? dispatch.items : [];
    const fromStore = resolveDispatchStoreName(dispatch, 'source');
    const toStore = resolveDispatchStoreName(dispatch, 'destination');
    const status = titleCase(dispatch?.status || 'Draft');
    const rawStatus = normalizeStatus(dispatch?.status || 'draft');
    const transferDate = dispatchDate(dispatch);
    const dispatchNumber = firstText([dispatch?.dispatch_number, dispatch?.reference_number], `#${dispatch?.id ?? ''}`);

    items.forEach((item: DispatchItem | any) => {
      const category = resolveDispatchCategory(item);
      const productCode = resolveDispatchProductCode(item);
      const color = resolveDispatchColor(item);
      const size = resolveDispatchSize(item);
      const key = [category, productCode, color, size, fromStore, toStore, rawStatus].join('|||');
      const existing = grouped.get(key) || {
        category,
        productCode,
        color,
        size,
        transferQty: 0,
        transferValue: 0,
        dispatchNumber,
        fromStore,
        toStore,
        status,
        rawStatus,
        transferDate,
      };
      existing.transferQty += dispatchItemQuantity(item);
      existing.transferValue += dispatchItemTransferValue(item);
      existing.dispatchNumber = existing.dispatchNumber.includes(dispatchNumber)
        ? existing.dispatchNumber
        : `${existing.dispatchNumber}, ${dispatchNumber}`;
      grouped.set(key, existing);
    });
  });

  return Array.from(grouped.values())
    .sort((a, b) => a.category.localeCompare(b.category) || a.productCode.localeCompare(b.productCode) || a.color.localeCompare(b.color) || a.size.localeCompare(b.size));
};

const summarizeDispatchTransferRows = (rows: DispatchTransferReportRow[]) => rows.reduce((acc, row) => {
  acc.transferQty += row.transferQty;
  acc.transferValue += row.transferValue;
  return acc;
}, { transferQty: 0, transferValue: 0 });

const dispatchTransferRowToCells = (row: DispatchTransferReportRow): any[] => [
  row.category,
  row.productCode,
  row.color,
  row.size,
  row.transferQty,
  row.transferValue,
];

const buildDispatchTransferExcelHtml = (rows: DispatchTransferReportRow[], fromDate: string, toDate: string, fromStore: string, toStore: string): string => {
  const totals = summarizeDispatchTransferRows(rows);
  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Transfer Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; }
    table { border-collapse: collapse; }
    td, th { border: 1px solid #333; padding: 6px 8px; }
    .brand { font-size: 18px; font-weight: 700; text-align: center; }
    .title { font-size: 16px; font-weight: 700; text-align: center; background: #f3f4f6; }
    .header { font-weight: 700; background: #d9eaf7; text-align: center; }
    .total { font-weight: 700; background: #fef3c7; }
  </style>
</head>
<body>
  <table>
    <tr><td colspan="6" class="brand">DESHIO</td></tr>
    <tr><td colspan="6" class="title">TRANSFER REPORT</td></tr>
    <tr><td><strong>DATE:</strong></td><td>${esc(displayDateRange(fromDate, toDate))}</td><td colspan="4"></td></tr>
    <tr><td><strong>FROM:</strong> ${esc(fromStore || 'All Stores')}</td><td><strong>TO:</strong> ${esc(toStore || 'All Stores')}</td><td colspan="4"></td></tr>
    <tr class="header">${dispatchTransferHeaders.map((header) => `<td>${esc(header)}</td>`).join('')}</tr>
    ${rows.map((row) => `<tr><td>${esc(row.category)}</td><td>${esc(row.productCode)}</td><td>${esc(row.color)}</td><td>${esc(row.size)}</td><td style="mso-number-format:'0.00'; text-align:right;">${row.transferQty}</td><td style="mso-number-format:'0.00'; text-align:right;">${row.transferValue.toFixed(2)}</td></tr>`).join('') || '<tr><td colspan="6">No dispatch transfer data found</td></tr>'}
    <tr class="total"><td>TOTAL</td><td colspan="3"></td><td style="text-align:right;">${totals.transferQty}</td><td style="text-align:right;">${totals.transferValue.toFixed(2)}</td></tr>
  </table>
</body>
</html>`;
};

const buildDispatchTransferPrintHtml = (rows: DispatchTransferReportRow[], fromDate: string, toDate: string, fromStore: string, toStore: string): string => {
  const totals = summarizeDispatchTransferRows(rows);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Transfer Report</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; margin: 0; padding: 20px; color: #111827; }
    h1, h2 { text-align: center; margin: 0; }
    h1 { font-size: 24px; }
    h2 { font-size: 18px; margin-top: 4px; margin-bottom: 12px; }
    .meta { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 14px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #111827; padding: 7px 8px; }
    th { background: #e5f0ff; text-align: center; }
    .right { text-align: right; white-space: nowrap; }
    .total td { font-weight: 700; background: #fef3c7; }
    .actions { text-align: right; margin-bottom: 16px; }
    .actions button { background: #111827; color: #fff; border: 0; border-radius: 8px; padding: 9px 14px; font-weight: 700; cursor: pointer; }
    @media print { .actions { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
  <h1>DESHIO</h1>
  <h2>TRANSFER REPORT</h2>
  <div class="meta"><span><strong>Date:</strong> ${esc(displayDateRange(fromDate, toDate))}</span><span><strong>From:</strong> ${esc(fromStore || 'All Stores')}</span><span><strong>To:</strong> ${esc(toStore || 'All Stores')}</span></div>
  <table>
    <thead><tr>${dispatchTransferHeaders.map((header) => `<th>${esc(header)}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.map((row) => `<tr><td>${esc(row.category)}</td><td>${esc(row.productCode)}</td><td>${esc(row.color)}</td><td>${esc(row.size)}</td><td class="right">${qty(row.transferQty)}</td><td class="right">৳${money(row.transferValue)}</td></tr>`).join('') || '<tr><td colspan="6" style="text-align:center;">No dispatch transfer data found</td></tr>'}
      <tr class="total"><td>TOTAL</td><td colspan="3"></td><td class="right">${qty(totals.transferQty)}</td><td class="right">৳${money(totals.transferValue)}</td></tr>
    </tbody>
  </table>
</body>
</html>`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Delivery report helpers: matches uploaded Delivery Report.xlsx
// ─────────────────────────────────────────────────────────────────────────────

const deliveryReportHeaders = ['Category', 'Product Code', 'Color', 'Size', 'Unit Price', 'Delivery Qty', 'Delivered Value'];

const deliveryDispatchDate = (dispatch: any): string => reportDate(
  dispatch?.actual_delivery_date ??
  dispatch?.delivered_at ??
  dispatch?.delivery_date ??
  dispatch?.received_at ??
  dispatch?.dispatch_date ??
  dispatch?.created_at
);

const isDeliveredDispatch = (dispatch: any): boolean => {
  const status = normalizeStatus(dispatch?.status);
  const deliveryStatus = normalizeStatus(dispatch?.delivery_status);
  if (['cancelled', 'canceled', 'deleted', 'void'].includes(status)) return false;
  return ['delivered', 'completed', 'received', 'closed'].includes(status)
    || ['delivered', 'completed', 'received', 'closed'].includes(deliveryStatus);
};

const deliveryItemQuantity = (item: any, dispatch: any): number => {
  const metadata = item?.metadata && typeof item.metadata === 'object' ? item.metadata : {};
  const direct = toNum(
    item?.delivered_quantity ??
    item?.received_quantity ??
    item?.quantity_delivered ??
    item?.quantity_received ??
    metadata?.delivered_quantity ??
    metadata?.received_quantity ??
    0
  );
  if (direct > 0) return direct;
  return isDeliveredDispatch(dispatch) ? dispatchItemQuantity(item) : 0;
};

const deliveryItemUnitPrice = (item: any): number => {
  const batch = dispatchItemBatch(item);
  const product = dispatchItemProduct(item);
  const direct = toNum(
    item?.unit_price ??
    item?.selling_price ??
    item?.price ??
    item?.sale_price ??
    batch?.unit_price ??
    batch?.selling_price ??
    batch?.sell_price ??
    product?.selling_price ??
    product?.price ??
    0
  );
  if (direct > 0) return direct;
  const quantityValue = dispatchItemQuantity(item);
  const totalValue = toNum(item?.total_value ?? item?.delivered_value ?? item?.line_total ?? item?.total_amount ?? 0);
  return quantityValue > 0 ? totalValue / quantityValue : 0;
};

const deliveryItemDeliveredValue = (item: any, dispatch: any): number => {
  const quantityValue = deliveryItemQuantity(item, dispatch);
  const direct = toNum(item?.delivered_value ?? item?.received_value ?? item?.delivery_value ?? 0);
  if (direct > 0) return direct;
  return quantityValue * deliveryItemUnitPrice(item);
};

const buildDeliveryReportRows = (dispatches: ProductDispatch[] | any[]): DeliveryReportRow[] => {
  const grouped = new Map<string, DeliveryReportRow>();

  dispatches.filter(isDeliveredDispatch).forEach((dispatch: any) => {
    const items = Array.isArray(dispatch?.items) ? dispatch.items : [];
    const fromStore = resolveDispatchStoreName(dispatch, 'source');
    const toStore = resolveDispatchStoreName(dispatch, 'destination');
    const status = titleCase(dispatch?.status || dispatch?.delivery_status || 'Delivered');
    const rawStatus = normalizeStatus(dispatch?.status || dispatch?.delivery_status || 'delivered');
    const deliveryDateValue = deliveryDispatchDate(dispatch);
    const dispatchNumber = firstText([dispatch?.dispatch_number, dispatch?.reference_number], `#${dispatch?.id ?? ''}`);

    items.forEach((item: DispatchItem | any) => {
      const deliveryQty = deliveryItemQuantity(item, dispatch);
      if (deliveryQty <= 0) return;
      const category = resolveDispatchCategory(item);
      const productCode = resolveDispatchProductCode(item);
      const color = resolveDispatchColor(item);
      const size = resolveDispatchSize(item);
      const unitPrice = deliveryItemUnitPrice(item);
      const key = [category, productCode, color, size, unitPrice, fromStore, toStore].join('|||');
      const existing = grouped.get(key) || {
        category,
        productCode,
        color,
        size,
        unitPrice,
        deliveryQty: 0,
        deliveredValue: 0,
        dispatchNumber,
        fromStore,
        toStore,
        status,
        rawStatus,
        deliveryDate: deliveryDateValue,
      };
      existing.deliveryQty += deliveryQty;
      existing.deliveredValue += deliveryItemDeliveredValue(item, dispatch);
      existing.dispatchNumber = existing.dispatchNumber.includes(dispatchNumber)
        ? existing.dispatchNumber
        : `${existing.dispatchNumber}, ${dispatchNumber}`;
      grouped.set(key, existing);
    });
  });

  return Array.from(grouped.values())
    .sort((a, b) => a.category.localeCompare(b.category) || a.productCode.localeCompare(b.productCode) || a.color.localeCompare(b.color) || a.size.localeCompare(b.size) || a.unitPrice - b.unitPrice);
};

const summarizeDeliveryReportRows = (rows: DeliveryReportRow[]) => rows.reduce((acc, row) => {
  acc.deliveryQty += row.deliveryQty;
  acc.deliveredValue += row.deliveredValue;
  return acc;
}, { deliveryQty: 0, deliveredValue: 0 });

const deliveryReportRowToCells = (row: DeliveryReportRow): any[] => [
  row.category,
  row.productCode,
  row.color,
  row.size,
  row.unitPrice,
  row.deliveryQty,
  row.deliveredValue,
];

const buildDeliveryReportExcelHtml = (rows: DeliveryReportRow[], fromDate: string, toDate: string, fromStore: string, toStore: string): string => {
  const totals = summarizeDeliveryReportRows(rows);
  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Delivery Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; }
    table { border-collapse: collapse; }
    td, th { border: 1px solid #333; padding: 6px 8px; }
    .brand { font-size: 18px; font-weight: 700; text-align: center; }
    .title { font-size: 16px; font-weight: 700; text-align: center; background: #f3f4f6; }
    .header { font-weight: 700; background: #d9eaf7; text-align: center; }
    .total { font-weight: 700; background: #fef3c7; }
  </style>
</head>
<body>
  <table>
    <tr><td colspan="7" class="brand">DESHIO</td></tr>
    <tr><td colspan="7" class="title">DELIVERY REPORT</td></tr>
    <tr><td><strong>DATE:</strong></td><td>${esc(displayDateRange(fromDate, toDate))}</td><td colspan="5"></td></tr>
    <tr><td><strong>FROM:</strong> ${esc(fromStore || 'All Stores')}</td><td><strong>TO:</strong> ${esc(toStore || 'All Stores')}</td><td colspan="5"></td></tr>
    <tr class="header">${deliveryReportHeaders.map((header) => `<td>${esc(header)}</td>`).join('')}</tr>
    ${rows.map((row) => `<tr><td>${esc(row.category)}</td><td>${esc(row.productCode)}</td><td>${esc(row.color)}</td><td>${esc(row.size)}</td><td style="mso-number-format:'0.00'; text-align:right;">${row.unitPrice.toFixed(2)}</td><td style="mso-number-format:'0.00'; text-align:right;">${row.deliveryQty}</td><td style="mso-number-format:'0.00'; text-align:right;">${row.deliveredValue.toFixed(2)}</td></tr>`).join('') || '<tr><td colspan="7">No delivery data found</td></tr>'}
    <tr class="total"><td>TOTAL</td><td colspan="4"></td><td style="text-align:right;">${totals.deliveryQty}</td><td style="text-align:right;">${totals.deliveredValue.toFixed(2)}</td></tr>
  </table>
</body>
</html>`;
};

const buildDeliveryReportPrintHtml = (rows: DeliveryReportRow[], fromDate: string, toDate: string, fromStore: string, toStore: string): string => {
  const totals = summarizeDeliveryReportRows(rows);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Delivery Report</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; margin: 0; padding: 20px; color: #111827; }
    h1, h2 { text-align: center; margin: 0; }
    h1 { font-size: 24px; }
    h2 { font-size: 18px; margin-top: 4px; margin-bottom: 12px; }
    .meta { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 14px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #111827; padding: 7px 8px; }
    th { background: #e5f0ff; text-align: center; }
    .right { text-align: right; white-space: nowrap; }
    .total td { font-weight: 700; background: #fef3c7; }
    .actions { text-align: right; margin-bottom: 16px; }
    .actions button { background: #111827; color: #fff; border: 0; border-radius: 8px; padding: 9px 14px; font-weight: 700; cursor: pointer; }
    @media print { .actions { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
  <h1>DESHIO</h1>
  <h2>DELIVERY REPORT</h2>
  <div class="meta"><span><strong>Date:</strong> ${esc(displayDateRange(fromDate, toDate))}</span><span><strong>From:</strong> ${esc(fromStore || 'All Stores')}</span><span><strong>To:</strong> ${esc(toStore || 'All Stores')}</span></div>
  <table>
    <thead><tr>${deliveryReportHeaders.map((header) => `<th>${esc(header)}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.map((row) => `<tr><td>${esc(row.category)}</td><td>${esc(row.productCode)}</td><td>${esc(row.color)}</td><td>${esc(row.size)}</td><td class="right">৳${money(row.unitPrice)}</td><td class="right">${qty(row.deliveryQty)}</td><td class="right">৳${money(row.deliveredValue)}</td></tr>`).join('') || '<tr><td colspan="7" style="text-align:center;">No delivery data found</td></tr>'}
      <tr class="total"><td>TOTAL</td><td colspan="4"></td><td class="right">${qty(totals.deliveryQty)}</td><td class="right">৳${money(totals.deliveredValue)}</td></tr>
    </tbody>
  </table>
</body>
</html>`;
};


// ─────────────────────────────────────────────────────────────────────────────
// Sales & Stock report helpers: matches uploaded Sales & Stock Report.xlsx
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Category Wise Sales report helpers: matches uploaded Category Wise Sales Report.xlsx
// ─────────────────────────────────────────────────────────────────────────────

const categoryWiseSalesHeaders = [
  'Category',
  'Sold Qty',
  'SUB Total',
  'Discount Amount',
  'Exchange Amount',
  'Return Amount',
  'Net Sales (without VAT)',
  'VAT Amount (7.5)',
  'Net Amount',
];

const categoryVatRate = 0.075;

const salesStockHeaders = ['Category', 'Product Code', 'Color', 'Size', 'Sold Qty', 'SUB Total', 'Stock Qty', 'Stock Value'];

const stockBatchProduct = (batch: any): any => batch?.product || batch?.product_data || {};

const resolveSalesStockCategory = (source: any): string => {
  const product = source?.product || source?.productBatch?.product || source?.product_batch?.product || source?.batch?.product || stockBatchProduct(source) || {};
  const batch = source?.productBatch || source?.product_batch || source?.batch || source || {};
  return firstText([source?.category_name, source?.category?.name, source?.category?.title, product?.category_name, product?.category?.name, product?.category?.title, product?.product_category?.name, product?.categories?.[0]?.name, batch?.category_name, batch?.category?.name, batch?.product?.category?.name], 'Uncategorized');
};

const resolveSalesStockProductCode = (source: any): string => {
  const product = source?.product || source?.productBatch?.product || source?.product_batch?.product || source?.batch?.product || stockBatchProduct(source) || {};
  const batch = source?.productBatch || source?.product_batch || source?.batch || source || {};
  return firstText([source?.product_code, source?.product_sku, source?.sku, product?.sku, product?.product_code, product?.code, batch?.sku, batch?.product_sku, batch?.batch_number], '-');
};

const resolveSalesStockColor = (source: any): string => {
  const attrs = source?.attributes && typeof source.attributes === 'object' ? source.attributes : {};
  const attr = source?.attribute && typeof source.attribute === 'object' ? source.attribute : {};
  const metadata = source?.metadata && typeof source.metadata === 'object' ? source.metadata : {};
  const product = source?.product || source?.productBatch?.product || source?.product_batch?.product || source?.batch?.product || stockBatchProduct(source) || {};
  const batch = source?.productBatch || source?.product_batch || source?.batch || source || {};
  return firstText([source?.color, source?.color_name, attrs?.color, attrs?.Color, attr?.color, attr?.Color, metadata?.color, metadata?.Color, batch?.color, batch?.color_name, batch?.color?.name, product?.color, product?.color_name], '-');
};

const resolveSalesStockSize = (source: any): string => {
  const attrs = source?.attributes && typeof source.attributes === 'object' ? source.attributes : {};
  const attr = source?.attribute && typeof source.attribute === 'object' ? source.attribute : {};
  const metadata = source?.metadata && typeof source.metadata === 'object' ? source.metadata : {};
  const product = source?.product || source?.productBatch?.product || source?.product_batch?.product || source?.batch?.product || stockBatchProduct(source) || {};
  const batch = source?.productBatch || source?.product_batch || source?.batch || source || {};
  return firstText([source?.size, source?.size_name, attrs?.size, attrs?.Size, attr?.size, attr?.Size, metadata?.size, metadata?.Size, batch?.size, batch?.size_name, batch?.size?.name, product?.size, product?.size_name], '-');
};

const salesStockKey = (category: string, productCode: string, color: string, size: string) => [category, productCode, color, size].join('|||');

const orderItemSubtotalForStock = (item: any): number => {
  const direct = toNum(item?.total_amount ?? item?.line_total ?? item?.subtotal ?? item?.total_price ?? 0);
  if (direct > 0) return direct;
  const quantityValue = orderItemQty(item);
  const unit = toNum(item?.unit_price ?? item?.selling_price ?? item?.price ?? item?.product?.selling_price ?? item?.productBatch?.sell_price ?? item?.product_batch?.sell_price ?? 0);
  return quantityValue * unit;
};

const orderLevelDiscountAmount = (order: any): number => toNum(
  order?.total_discount ??
  order?.discount_amount ??
  order?.item_discount ??
  order?.coupon_discount ??
  order?.reward_discount ??
  0
);

const orderItemDiscountAmount = (item: any, order: any, itemSubtotal: number, orderItemsSubtotal: number): number => {
  const direct = toNum(
    item?.discount_amount ??
    item?.discount ??
    item?.line_discount ??
    item?.item_discount ??
    item?.coupon_discount ??
    item?.reward_discount ??
    item?.metadata?.discount_amount ??
    0
  );
  if (direct > 0) return direct;
  const orderDiscount = orderLevelDiscountAmount(order);
  if (orderDiscount <= 0 || orderItemsSubtotal <= 0 || itemSubtotal <= 0) return 0;
  return orderDiscount * (itemSubtotal / orderItemsSubtotal);
};

const orderItemExchangeAmount = (item: any): number => Math.abs(toNum(
  item?.exchange_amount ??
  item?.exchange_adjustment ??
  item?.adjustment_amount ??
  item?.amount_adjustment ??
  item?.exchange_difference ??
  item?.metadata?.exchange_amount ??
  item?.metadata?.exchange_adjustment ??
  0
));

const orderItemUnitPriceForReturn = (item: any, itemSubtotal: number): number => {
  const direct = toNum(item?.unit_price ?? item?.selling_price ?? item?.price ?? item?.product?.selling_price ?? item?.productBatch?.sell_price ?? item?.product_batch?.sell_price ?? 0);
  if (direct > 0) return direct;
  const quantityValue = orderItemQty(item);
  return quantityValue > 0 ? itemSubtotal / quantityValue : itemSubtotal;
};

const orderItemReturnAmount = (item: any, itemSubtotal: number): number => {
  const direct = toNum(
    item?.return_amount ??
    item?.returned_amount ??
    item?.refund_amount ??
    item?.refunded_amount ??
    item?.return_refund_amount ??
    item?.metadata?.return_amount ??
    item?.metadata?.refund_amount ??
    item?.return?.amount ??
    item?.return?.refund_amount ??
    0
  );
  if (direct > 0) return direct;
  const returnedQty = toNum(item?.returned_quantity ?? item?.return_quantity ?? item?.qty_returned ?? item?.metadata?.returned_quantity ?? 0);
  if (returnedQty <= 0) return 0;
  return returnedQty * orderItemUnitPriceForReturn(item, itemSubtotal);
};

const buildCategoryWiseSalesRows = (orders: Order[] | any[]): CategoryWiseSalesReportRow[] => {
  const grouped = new Map<string, CategoryWiseSalesReportRow>();

  orders.filter(isValidSalesOrder).forEach((order: any) => {
    const items = Array.isArray(order?.items) ? order.items : [];
    const orderItemsSubtotal = items.reduce((sum: number, item: any) => sum + orderItemSubtotalForStock(item), 0);

    items.forEach((item: any) => {
      const soldQty = orderItemQty(item);
      if (soldQty <= 0) return;

      const category = resolveSalesStockCategory(item);
      const existing = grouped.get(category) || {
        category,
        soldQty: 0,
        subTotal: 0,
        discountAmount: 0,
        exchangeAmount: 0,
        returnAmount: 0,
        netSalesWithoutVat: 0,
        vatAmount: 0,
        netAmount: 0,
      };

      const subTotal = orderItemSubtotalForStock(item);
      const discountAmount = orderItemDiscountAmount(item, order, subTotal, orderItemsSubtotal);
      const exchangeAmount = orderItemExchangeAmount(item);
      const returnAmount = orderItemReturnAmount(item, subTotal);
      const netSalesWithoutVat = Math.max(subTotal - discountAmount - exchangeAmount - returnAmount, 0);
      const vatAmount = netSalesWithoutVat * categoryVatRate;
      const netAmount = netSalesWithoutVat + vatAmount;

      existing.soldQty += soldQty;
      existing.subTotal += subTotal;
      existing.discountAmount += discountAmount;
      existing.exchangeAmount += exchangeAmount;
      existing.returnAmount += returnAmount;
      existing.netSalesWithoutVat += netSalesWithoutVat;
      existing.vatAmount += vatAmount;
      existing.netAmount += netAmount;
      grouped.set(category, existing);
    });
  });

  return Array.from(grouped.values())
    .filter((row) => row.soldQty > 0 || row.subTotal > 0 || row.netAmount > 0)
    .sort((a, b) => a.category.localeCompare(b.category));
};

const summarizeCategoryWiseSalesRows = (rows: CategoryWiseSalesReportRow[]) => rows.reduce((acc, row) => {
  acc.soldQty += row.soldQty;
  acc.subTotal += row.subTotal;
  acc.discountAmount += row.discountAmount;
  acc.exchangeAmount += row.exchangeAmount;
  acc.returnAmount += row.returnAmount;
  acc.netSalesWithoutVat += row.netSalesWithoutVat;
  acc.vatAmount += row.vatAmount;
  acc.netAmount += row.netAmount;
  return acc;
}, {
  soldQty: 0,
  subTotal: 0,
  discountAmount: 0,
  exchangeAmount: 0,
  returnAmount: 0,
  netSalesWithoutVat: 0,
  vatAmount: 0,
  netAmount: 0,
});

const categoryWiseSalesRowToCells = (row: CategoryWiseSalesReportRow): any[] => [
  row.category,
  row.soldQty,
  row.subTotal,
  row.discountAmount,
  row.exchangeAmount,
  row.returnAmount,
  row.netSalesWithoutVat,
  row.vatAmount,
  row.netAmount,
];

const buildCategoryWiseSalesExcelHtml = (rows: CategoryWiseSalesReportRow[], fromDate: string, toDate: string, storeName: string): string => {
  const totals = summarizeCategoryWiseSalesRows(rows);
  const dateLabel = displayDateRange(fromDate, toDate);
  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Category Wise Sales</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; }
    table { border-collapse: collapse; }
    td, th { border: 1px solid #333; padding: 6px 8px; }
    .title { font-size: 18px; font-weight: 700; text-align: center; }
    .meta { font-weight: 700; }
    .header { font-weight: 700; background: #d9eaf7; text-align: center; }
    .total { font-weight: 700; background: #fef3c7; }
  </style>
</head>
<body>
  <table>
    <tr><td colspan="9" class="title">Deshio</td></tr>
    <tr><td colspan="9" class="title">Category Wise Sales Report</td></tr>
    <tr><td colspan="9" class="meta">Store: ${esc(storeName || 'All Stores')}</td></tr>
    <tr><td colspan="9" class="meta">Period: ${esc(dateLabel)}</td></tr>
    <tr class="header">${categoryWiseSalesHeaders.map((header) => `<td>${esc(header)}</td>`).join('')}</tr>
    ${rows.map((row) => `<tr><td>${esc(row.category)}</td><td style="mso-number-format:'0.00'; text-align:right;">${row.soldQty}</td><td style="mso-number-format:'0.00'; text-align:right;">${row.subTotal.toFixed(2)}</td><td style="mso-number-format:'0.00'; text-align:right;">${row.discountAmount.toFixed(2)}</td><td style="mso-number-format:'0.00'; text-align:right;">${row.exchangeAmount.toFixed(2)}</td><td style="mso-number-format:'0.00'; text-align:right;">${row.returnAmount.toFixed(2)}</td><td style="mso-number-format:'0.00'; text-align:right;">${row.netSalesWithoutVat.toFixed(2)}</td><td style="mso-number-format:'0.00'; text-align:right;">${row.vatAmount.toFixed(2)}</td><td style="mso-number-format:'0.00'; text-align:right;">${row.netAmount.toFixed(2)}</td></tr>`).join('') || '<tr><td colspan="9">No category sales data found</td></tr>'}
    <tr class="total"><td>Grand Total</td><td style="text-align:right;">${totals.soldQty}</td><td style="text-align:right;">${totals.subTotal.toFixed(2)}</td><td style="text-align:right;">${totals.discountAmount.toFixed(2)}</td><td style="text-align:right;">${totals.exchangeAmount.toFixed(2)}</td><td style="text-align:right;">${totals.returnAmount.toFixed(2)}</td><td style="text-align:right;">${totals.netSalesWithoutVat.toFixed(2)}</td><td style="text-align:right;">${totals.vatAmount.toFixed(2)}</td><td style="text-align:right;">${totals.netAmount.toFixed(2)}</td></tr>
  </table>
</body>
</html>`;
};

const buildCategoryWiseSalesPrintHtml = (rows: CategoryWiseSalesReportRow[], fromDate: string, toDate: string, storeName: string): string => {
  const totals = summarizeCategoryWiseSalesRows(rows);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Category Wise Sales Report</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; margin: 0; padding: 24px; color: #111827; }
    .sheet { max-width: 1180px; margin: 0 auto; }
    h1, h2 { text-align: center; margin: 0; }
    h1 { font-size: 20px; }
    h2 { font-size: 16px; margin-bottom: 12px; }
    .meta { font-weight: 700; margin: 3px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
    th, td { border: 1px solid #111827; padding: 7px 8px; }
    th { background: #e5f0ff; text-align: center; }
    .right { text-align: right; }
    .total td { font-weight: 700; background: #fef3c7; }
    .actions { text-align: right; margin-bottom: 16px; }
    .actions button { background: #111827; color: #fff; border: 0; border-radius: 8px; padding: 9px 14px; font-weight: 700; cursor: pointer; }
    @media print { .actions { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
    <h1>Deshio</h1>
    <h2>Category Wise Sales Report</h2>
    <div class="meta">Store: ${esc(storeName || 'All Stores')}</div>
    <div class="meta">Period: ${esc(displayDateRange(fromDate, toDate))}</div>
    <table>
      <thead><tr>${categoryWiseSalesHeaders.map((header) => `<th>${esc(header)}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows.map((row) => `<tr><td>${esc(row.category)}</td><td class="right">${qty(row.soldQty)}</td><td class="right">৳${money(row.subTotal)}</td><td class="right">৳${money(row.discountAmount)}</td><td class="right">৳${money(row.exchangeAmount)}</td><td class="right">৳${money(row.returnAmount)}</td><td class="right">৳${money(row.netSalesWithoutVat)}</td><td class="right">৳${money(row.vatAmount)}</td><td class="right">৳${money(row.netAmount)}</td></tr>`).join('') || '<tr><td colspan="9" style="text-align:center;">No category sales data found</td></tr>'}
        <tr class="total"><td>Grand Total</td><td class="right">${qty(totals.soldQty)}</td><td class="right">৳${money(totals.subTotal)}</td><td class="right">৳${money(totals.discountAmount)}</td><td class="right">৳${money(totals.exchangeAmount)}</td><td class="right">৳${money(totals.returnAmount)}</td><td class="right">৳${money(totals.netSalesWithoutVat)}</td><td class="right">৳${money(totals.vatAmount)}</td><td class="right">৳${money(totals.netAmount)}</td></tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;
};

const batchStockQty = (batch: any): number => toNum(batch?.available_quantity ?? batch?.stock_quantity ?? batch?.quantity_available ?? batch?.quantity ?? 0);

const batchStockValue = (batch: any): number => {
  const qtyValue = batchStockQty(batch);
  const direct = toNum(batch?.sell_value ?? batch?.total_sell_value ?? batch?.stock_value ?? 0);
  if (direct > 0) return direct;
  const unit = toNum(batch?.sell_price ?? batch?.selling_price ?? batch?.price ?? batch?.product?.selling_price ?? batch?.product?.base_price ?? 0);
  return qtyValue * unit;
};

const isReportableBatch = (batch: any): boolean => {
  const status = normalizeStatus(batch?.status);
  if (['deleted', 'inactive', 'cancelled', 'canceled', 'void'].includes(status)) return false;
  if (batch?.is_active === false || batch?.is_active === 0) return false;
  return batchStockQty(batch) > 0;
};

const buildSalesStockRows = (orders: Order[] | any[], batches: any[]): SalesStockReportRow[] => {
  const grouped = new Map<string, SalesStockReportRow>();

  const ensureRow = (source: any): SalesStockReportRow => {
    const category = resolveSalesStockCategory(source);
    const productCode = resolveSalesStockProductCode(source);
    const color = resolveSalesStockColor(source);
    const size = resolveSalesStockSize(source);
    const key = salesStockKey(category, productCode, color, size);
    const existing = grouped.get(key) || { category, productCode, color, size, soldQty: 0, subTotal: 0, stockQty: 0, stockValue: 0, storeName: '' };
    grouped.set(key, existing);
    return existing;
  };

  orders.filter(isValidSalesOrder).forEach((order: any) => {
    const items = Array.isArray(order?.items) ? order.items : [];
    items.forEach((item: any) => {
      const row = ensureRow(item);
      row.soldQty += orderItemQty(item);
      row.subTotal += orderItemSubtotalForStock(item);
    });
  });

  batches.filter(isReportableBatch).forEach((batch: any) => {
    const row = ensureRow(batch);
    row.stockQty += batchStockQty(batch);
    row.stockValue += batchStockValue(batch);
    const storeName = firstText([batch?.store?.name, batch?.store_name], '');
    if (storeName && !row.storeName.includes(storeName)) row.storeName = row.storeName ? `${row.storeName}, ${storeName}` : storeName;
  });

  return Array.from(grouped.values())
    .filter((row) => row.soldQty > 0 || row.stockQty > 0)
    .sort((a, b) => a.category.localeCompare(b.category) || a.productCode.localeCompare(b.productCode) || a.color.localeCompare(b.color) || a.size.localeCompare(b.size));
};

const summarizeSalesStockRows = (rows: SalesStockReportRow[]) => rows.reduce((acc, row) => {
  acc.soldQty += row.soldQty;
  acc.subTotal += row.subTotal;
  acc.stockQty += row.stockQty;
  acc.stockValue += row.stockValue;
  return acc;
}, { soldQty: 0, subTotal: 0, stockQty: 0, stockValue: 0 });

const salesStockRowToCells = (row: SalesStockReportRow): any[] => [row.category, row.productCode, row.color, row.size, row.soldQty, row.subTotal, row.stockQty, row.stockValue];

const buildSalesStockExcelHtml = (rows: SalesStockReportRow[], fromDate: string, toDate: string, storeName: string): string => {
  const totals = summarizeSalesStockRows(rows);
  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sales Stock Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; }
    table { border-collapse: collapse; }
    td, th { border: 1px solid #333; padding: 6px 8px; }
    .brand { font-size: 18px; font-weight: 700; text-align: center; }
    .title { font-size: 16px; font-weight: 700; text-align: center; background: #f3f4f6; }
    .header { font-weight: 700; background: #d9eaf7; text-align: center; }
    .total { font-weight: 700; background: #fef3c7; }
  </style>
</head>
<body>
  <table>
    <tr><td colspan="8" class="brand">DESHIO</td></tr>
    <tr><td colspan="8" class="title">Sales &amp; Stock Report</td></tr>
    <tr><td><strong>DATE:</strong></td><td>${esc(displayDateRange(fromDate, toDate))}</td><td><strong>STORE:</strong></td><td>${esc(storeName || 'All Stores')}</td><td colspan="4"></td></tr>
    <tr class="header">${salesStockHeaders.map((header) => `<td>${esc(header)}</td>`).join('')}</tr>
    ${rows.map((row) => `<tr><td>${esc(row.category)}</td><td>${esc(row.productCode)}</td><td>${esc(row.color)}</td><td>${esc(row.size)}</td><td style="mso-number-format:'0.00'; text-align:right;">${row.soldQty}</td><td style="mso-number-format:'0.00'; text-align:right;">${row.subTotal.toFixed(2)}</td><td style="mso-number-format:'0.00'; text-align:right;">${row.stockQty}</td><td style="mso-number-format:'0.00'; text-align:right;">${row.stockValue.toFixed(2)}</td></tr>`).join('') || '<tr><td colspan="8">No sales or stock data found</td></tr>'}
    <tr class="total"><td>TOTAL</td><td colspan="3"></td><td style="text-align:right;">${totals.soldQty}</td><td style="text-align:right;">${totals.subTotal.toFixed(2)}</td><td style="text-align:right;">${totals.stockQty}</td><td style="text-align:right;">${totals.stockValue.toFixed(2)}</td></tr>
  </table>
</body>
</html>`;
};

const buildSalesStockPrintHtml = (rows: SalesStockReportRow[], fromDate: string, toDate: string, storeName: string): string => {
  const totals = summarizeSalesStockRows(rows);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Sales & Stock Report</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; margin: 0; padding: 20px; color: #111827; }
    h1, h2 { text-align: center; margin: 0; }
    h1 { font-size: 24px; }
    h2 { font-size: 18px; margin-top: 4px; margin-bottom: 12px; }
    .meta { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 14px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #111827; padding: 7px 8px; }
    th { background: #e5f0ff; text-align: center; }
    .right { text-align: right; white-space: nowrap; }
    .total td { font-weight: 700; background: #fef3c7; }
    .actions { text-align: right; margin-bottom: 16px; }
    .actions button { background: #111827; color: #fff; border: 0; border-radius: 8px; padding: 9px 14px; font-weight: 700; cursor: pointer; }
    @media print { .actions { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
  <h1>DESHIO</h1>
  <h2>Sales & Stock Report</h2>
  <div class="meta"><strong>Date:</strong><span>${esc(displayDateRange(fromDate, toDate))}</span><strong>Store:</strong><span>${esc(storeName || 'All Stores')}</span></div>
  <table>
    <thead><tr>${salesStockHeaders.map((header) => `<th>${esc(header)}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.map((row) => `<tr><td>${esc(row.category)}</td><td>${esc(row.productCode)}</td><td>${esc(row.color)}</td><td>${esc(row.size)}</td><td class="right">${qty(row.soldQty)}</td><td class="right">৳${money(row.subTotal)}</td><td class="right">${qty(row.stockQty)}</td><td class="right">৳${money(row.stockValue)}</td></tr>`).join('') || '<tr><td colspan="8" style="text-align:center;">No sales or stock data found</td></tr>'}
      <tr class="total"><td>TOTAL</td><td colspan="3"></td><td class="right">${qty(totals.soldQty)}</td><td class="right">৳${money(totals.subTotal)}</td><td class="right">${qty(totals.stockQty)}</td><td class="right">৳${money(totals.stockValue)}</td></tr>
    </tbody>
  </table>
</body>
</html>`;
};


export default function ReportsCenterPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportTab>('po');

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  const [poFromDate, setPoFromDate] = useState(firstDayOfMonth());
  const [poToDate, setPoToDate] = useState(today());
  const [poVendorId, setPoVendorId] = useState('');
  const [poSearch, setPoSearch] = useState('');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [poLoading, setPoLoading] = useState(false);
  const [poError, setPoError] = useState('');
  const [poLoadedAt, setPoLoadedAt] = useState('');

  const [dailyFromDate, setDailyFromDate] = useState(today());
  const [dailyToDate, setDailyToDate] = useState(today());
  const [dailyStoreId, setDailyStoreId] = useState('');
  const [dailySearch, setDailySearch] = useState('');
  const [dailyOrders, setDailyOrders] = useState<Order[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState('');
  const [dailyLoadedAt, setDailyLoadedAt] = useState('');

  const [salesFromDate, setSalesFromDate] = useState(today());
  const [salesToDate, setSalesToDate] = useState(today());
  const [salesStatus, setSalesStatus] = useState('');
  const [salesPaymentMethod, setSalesPaymentMethod] = useState('');
  const [salesDeliveryPartner, setSalesDeliveryPartner] = useState('');
  const [salesSearch, setSalesSearch] = useState('');
  const [salesOrders, setSalesOrders] = useState<Order[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState('');
  const [salesLoadedAt, setSalesLoadedAt] = useState('');

  const [bookingFromDate, setBookingFromDate] = useState(today());
  const [bookingToDate, setBookingToDate] = useState(today());
  const [bookingStatus, setBookingStatus] = useState('');
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingOrders, setBookingOrders] = useState<Order[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingLoadedAt, setBookingLoadedAt] = useState('');

  const [dispatchFromDate, setDispatchFromDate] = useState(today());
  const [dispatchToDate, setDispatchToDate] = useState(today());
  const [dispatchSourceStoreId, setDispatchSourceStoreId] = useState('');
  const [dispatchDestinationStoreId, setDispatchDestinationStoreId] = useState('');
  const [dispatchStatus, setDispatchStatus] = useState('');
  const [dispatchSearch, setDispatchSearch] = useState('');
  const [dispatches, setDispatches] = useState<ProductDispatch[]>([]);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchError, setDispatchError] = useState('');
  const [dispatchLoadedAt, setDispatchLoadedAt] = useState('');

  const [deliveryFromDate, setDeliveryFromDate] = useState(today());
  const [deliveryToDate, setDeliveryToDate] = useState(today());
  const [deliverySourceStoreId, setDeliverySourceStoreId] = useState('');
  const [deliveryDestinationStoreId, setDeliveryDestinationStoreId] = useState('');
  const [deliverySearch, setDeliverySearch] = useState('');
  const [deliveryDispatches, setDeliveryDispatches] = useState<ProductDispatch[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState('');
  const [deliveryLoadedAt, setDeliveryLoadedAt] = useState('');

  const [salesStockFromDate, setSalesStockFromDate] = useState(today());
  const [salesStockToDate, setSalesStockToDate] = useState(today());
  const [salesStockStoreId, setSalesStockStoreId] = useState('');
  const [salesStockSearch, setSalesStockSearch] = useState('');
  const [salesStockOrders, setSalesStockOrders] = useState<Order[]>([]);
  const [salesStockBatches, setSalesStockBatches] = useState<any[]>([]);
  const [salesStockLoading, setSalesStockLoading] = useState(false);
  const [salesStockError, setSalesStockError] = useState('');
  const [salesStockLoadedAt, setSalesStockLoadedAt] = useState('');

  const [categorySalesFromDate, setCategorySalesFromDate] = useState(today());
  const [categorySalesToDate, setCategorySalesToDate] = useState(today());
  const [categorySalesStoreId, setCategorySalesStoreId] = useState('');
  const [categorySalesSearch, setCategorySalesSearch] = useState('');
  const [categorySalesOrders, setCategorySalesOrders] = useState<Order[]>([]);
  const [categorySalesLoading, setCategorySalesLoading] = useState(false);
  const [categorySalesError, setCategorySalesError] = useState('');
  const [categorySalesLoadedAt, setCategorySalesLoadedAt] = useState('');

  const poRows = useMemo(() => buildPoRows(purchaseOrders), [purchaseOrders]);
  const poTotals = useMemo(() => summarizePoRows(poRows), [poRows]);

  const dailyRows = useMemo(() => {
    const rows = buildDailySalesRows(dailyOrders);
    const q = dailySearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.shopName.toLowerCase().includes(q));
  }, [dailyOrders, dailySearch]);
  const dailyTotals = useMemo(() => summarizeDailySales(dailyRows), [dailyRows]);

  const salesRows = useMemo(() => {
    const rows = buildSalesReportRows(salesOrders);
    const query = salesSearch.trim().toLowerCase();
    return rows.filter((row) => {
      if (salesStatus && row.rawStatus !== salesStatus) return false;
      if (salesPaymentMethod && row.paymentMethod.toLowerCase() !== salesPaymentMethod.toLowerCase()) return false;
      if (salesDeliveryPartner && row.deliveryPartner.toLowerCase() !== salesDeliveryPartner.toLowerCase()) return false;
      if (!query) return true;
      return salesRowToCells(row).some((cell) => String(cell ?? '').toLowerCase().includes(query));
    });
  }, [salesOrders, salesSearch, salesStatus, salesPaymentMethod, salesDeliveryPartner]);
  const salesTotals = useMemo(() => summarizeSalesRows(salesRows), [salesRows]);
  const salesStatusOptions = useMemo(() => Array.from(new Set(buildSalesReportRows(salesOrders).map((row) => row.rawStatus).filter(Boolean))).sort(), [salesOrders]);
  const salesPaymentOptions = useMemo(() => Array.from(new Set(buildSalesReportRows(salesOrders).map((row) => row.paymentMethod).filter(Boolean))).sort(), [salesOrders]);
  const salesDeliveryPartnerOptions = useMemo(() => Array.from(new Set(buildSalesReportRows(salesOrders).map((row) => row.deliveryPartner).filter(Boolean))).sort(), [salesOrders]);

  const bookingRows = useMemo(() => {
    const rows = buildBookingInstallmentRows(bookingOrders);
    const query = bookingSearch.trim().toLowerCase();
    return rows.filter((row) => {
      if (bookingStatus && row.rawStatus !== bookingStatus) return false;
      if (!query) return true;
      return bookingRowToCells(row).concat(row.invoiceNumber, row.orderDate).some((cell) => String(cell ?? '').toLowerCase().includes(query));
    });
  }, [bookingOrders, bookingSearch, bookingStatus]);
  const bookingTotals = useMemo(() => summarizeBookingInstallmentRows(bookingRows), [bookingRows]);
  const bookingStatusOptions = useMemo(() => Array.from(new Set(buildBookingInstallmentRows(bookingOrders).map((row) => row.rawStatus).filter(Boolean))).sort(), [bookingOrders]);

  const dispatchRows = useMemo(() => {
    const rows = buildDispatchTransferRows(dispatches);
    const query = dispatchSearch.trim().toLowerCase();
    return rows.filter((row) => {
      if (dispatchStatus && row.rawStatus !== dispatchStatus) return false;
      if (!query) return true;
      return dispatchTransferRowToCells(row).concat(row.dispatchNumber, row.fromStore, row.toStore, row.status, row.transferDate).some((cell) => String(cell ?? '').toLowerCase().includes(query));
    });
  }, [dispatches, dispatchSearch, dispatchStatus]);
  const dispatchTotals = useMemo(() => summarizeDispatchTransferRows(dispatchRows), [dispatchRows]);
  const dispatchStatusOptions = useMemo(() => Array.from(new Set(buildDispatchTransferRows(dispatches).map((row) => row.rawStatus).filter(Boolean))).sort(), [dispatches]);
  const selectedDispatchSourceStore = useMemo(() => stores.find((store: any) => String(store.id) === String(dispatchSourceStoreId))?.name || '', [stores, dispatchSourceStoreId]);
  const selectedDispatchDestinationStore = useMemo(() => stores.find((store: any) => String(store.id) === String(dispatchDestinationStoreId))?.name || '', [stores, dispatchDestinationStoreId]);

  const deliveryRows = useMemo(() => {
    const rows = buildDeliveryReportRows(deliveryDispatches);
    const query = deliverySearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => deliveryReportRowToCells(row).concat(row.dispatchNumber, row.fromStore, row.toStore, row.status, row.deliveryDate).some((cell) => String(cell ?? '').toLowerCase().includes(query)));
  }, [deliveryDispatches, deliverySearch]);
  const deliveryTotals = useMemo(() => summarizeDeliveryReportRows(deliveryRows), [deliveryRows]);
  const selectedDeliverySourceStore = useMemo(() => stores.find((store: any) => String(store.id) === String(deliverySourceStoreId))?.name || '', [stores, deliverySourceStoreId]);
  const selectedDeliveryDestinationStore = useMemo(() => stores.find((store: any) => String(store.id) === String(deliveryDestinationStoreId))?.name || '', [stores, deliveryDestinationStoreId]);

  const salesStockRows = useMemo(() => {
    const rows = buildSalesStockRows(salesStockOrders, salesStockBatches);
    const query = salesStockSearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => salesStockRowToCells(row).concat(row.storeName).some((cell) => String(cell ?? '').toLowerCase().includes(query)));
  }, [salesStockOrders, salesStockBatches, salesStockSearch]);
  const salesStockTotals = useMemo(() => summarizeSalesStockRows(salesStockRows), [salesStockRows]);
  const selectedSalesStockStore = useMemo(() => stores.find((store: any) => String(store.id) === String(salesStockStoreId))?.name || '', [stores, salesStockStoreId]);

  const categorySalesRows = useMemo(() => {
    const rows = buildCategoryWiseSalesRows(categorySalesOrders);
    const query = categorySalesSearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => categoryWiseSalesRowToCells(row).some((cell) => String(cell ?? '').toLowerCase().includes(query)));
  }, [categorySalesOrders, categorySalesSearch]);
  const categorySalesTotals = useMemo(() => summarizeCategoryWiseSalesRows(categorySalesRows), [categorySalesRows]);
  const selectedCategorySalesStore = useMemo(() => stores.find((store: any) => String(store.id) === String(categorySalesStoreId))?.name || '', [stores, categorySalesStoreId]);

  useEffect(() => {
    let mounted = true;
    vendorService.getAll({ per_page: 1000, is_active: true })
      .then((response: any) => {
        if (mounted) setVendors(unwrapVendors(response));
      })
      .catch(() => {
        if (mounted) setVendors([]);
      });

    storeService.getAllStores()
      .then((response: any) => {
        if (mounted) setStores(unwrapStores(response));
      })
      .catch(() => {
        if (mounted) setStores([]);
      });

    return () => { mounted = false; };
  }, []);

  const enrichPurchaseOrders = async (rows: PurchaseOrder[]): Promise<PurchaseOrder[]> => {
    const output: PurchaseOrder[] = [];
    const chunkSize = 8;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const resolved = await Promise.all(chunk.map(async (po: any) => {
        const items = Array.isArray(po?.items) ? po.items : [];
        const hasUsableItems = items.length > 0 && items.some((item: any) => itemLineSubtotal(item) > 0 || itemQuantity(item) > 0);
        if (hasUsableItems) return po;
        try {
          const detail = await purchaseOrderService.getById(Number(po.id));
          return ((detail as any)?.data || po) as PurchaseOrder;
        } catch {
          return po;
        }
      }));
      output.push(...resolved);
    }
    return output;
  };

  const enrichOrders = async (rows: Order[]): Promise<Order[]> => {
    const output: Order[] = [];
    const chunkSize = 10;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const resolved = await Promise.all(chunk.map(async (order: any) => {
        if (Array.isArray(order?.items) || Array.isArray(order?.services)) return order;
        try {
          return await orderService.getById(Number(order.id), true);
        } catch {
          return order;
        }
      }));
      output.push(...resolved);
    }
    return output;
  };

  const unwrapDispatchList = (response: any): { rows: ProductDispatch[]; lastPage: number } => {
    const candidates = [response?.data?.data, response?.data, response];
    const paginatedPayload = candidates.find((candidate) => (
      candidate &&
      !Array.isArray(candidate) &&
      (Array.isArray(candidate.data) || candidate.current_page !== undefined || candidate.total !== undefined)
    ));
    const arrayPayload = candidates.find((candidate) => Array.isArray(candidate));
    const payload = paginatedPayload || { data: arrayPayload || [] };
    return {
      rows: Array.isArray(payload.data) ? payload.data : [],
      lastPage: Number(payload.last_page || 1),
    };
  };

  const enrichDispatches = async (rows: ProductDispatch[]): Promise<ProductDispatch[]> => {
    const output: ProductDispatch[] = [];
    const chunkSize = 8;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const resolved = await Promise.all(chunk.map(async (dispatch: any) => {
        if (Array.isArray(dispatch?.items) && dispatch.items.length) return dispatch;
        try {
          const detail = await dispatchService.getDispatch(Number(dispatch.id));
          return ((detail as any)?.data?.data || (detail as any)?.data || detail || dispatch) as ProductDispatch;
        } catch {
          return dispatch;
        }
      }));
      output.push(...resolved);
    }
    return output;
  };

  const loadPoReport = useCallback(async () => {
    if (poFromDate && poToDate && poFromDate > poToDate) {
      setPoError('From date cannot be after To date.');
      return;
    }

    setPoLoading(true);
    setPoError('');
    try {
      const allRows: PurchaseOrder[] = [];
      let page = 1;
      let lastPage = 1;
      do {
        const response = await purchaseOrderService.getAll({
          from_date: poFromDate || undefined,
          to_date: poToDate || undefined,
          vendor_id: poVendorId ? Number(poVendorId) : undefined,
          search: poSearch || undefined,
          per_page: 250,
          page,
          sort_by: 'order_date',
          sort_direction: 'desc',
        });
        const payload = (response as any)?.data || {};
        const pageRows = Array.isArray(payload?.data) ? payload.data : [];
        allRows.push(...pageRows);
        lastPage = Number(payload?.last_page || 1);
        page += 1;
      } while (page <= lastPage && page <= 20);

      const detailed = await enrichPurchaseOrders(allRows);
      setPurchaseOrders(detailed);
      setPoLoadedAt(new Date().toLocaleString());
    } catch (err: any) {
      setPoError(err?.response?.data?.message || err?.message || 'Failed to load PO report.');
      setPurchaseOrders([]);
    } finally {
      setPoLoading(false);
    }
  }, [poFromDate, poToDate, poVendorId, poSearch]);

  const loadDailySalesReport = useCallback(async () => {
    if (dailyFromDate && dailyToDate && dailyFromDate > dailyToDate) {
      setDailyError('From date cannot be after To date.');
      return;
    }

    setDailyLoading(true);
    setDailyError('');
    try {
      const allRows: Order[] = [];
      let page = 1;
      let lastPage = 1;
      do {
        const response = await orderService.getAll({
          date_from: dailyFromDate || undefined,
          date_to: dailyToDate || undefined,
          date_type: 'order_date',
          date_filter_type: 'order_date',
          store_id: dailyStoreId || undefined,
          per_page: 250,
          page,
          sort_by: 'order_date',
          sort_order: 'desc',
          skipStoreScope: true,
          exclude_preorders: 1,
        } as any);
        allRows.push(...(Array.isArray(response?.data) ? response.data : []));
        lastPage = Number(response?.last_page || 1);
        page += 1;
      } while (page <= lastPage && page <= 20);

      const detailed = await enrichOrders(allRows);
      setDailyOrders(detailed);
      setDailyLoadedAt(new Date().toLocaleString());
    } catch (err: any) {
      setDailyError(err?.response?.data?.message || err?.message || 'Failed to load daily sales report.');
      setDailyOrders([]);
    } finally {
      setDailyLoading(false);
    }
  }, [dailyFromDate, dailyToDate, dailyStoreId]);

  const loadSalesReport = useCallback(async () => {
    if (salesFromDate && salesToDate && salesFromDate > salesToDate) {
      setSalesError('From date cannot be after To date.');
      return;
    }

    setSalesLoading(true);
    setSalesError('');
    try {
      const allRows: Order[] = [];
      let page = 1;
      let lastPage = 1;
      do {
        const response = await orderService.getAll({
          date_from: salesFromDate || undefined,
          date_to: salesToDate || undefined,
          date_type: 'order_date',
          date_filter_type: 'order_date',
          search: salesSearch || undefined,
          per_page: 250,
          page,
          sort_by: 'order_date',
          sort_order: 'desc',
          skipStoreScope: true,
          exclude_preorders: 1,
        } as any);
        allRows.push(...(Array.isArray(response?.data) ? response.data : []));
        lastPage = Number(response?.last_page || 1);
        page += 1;
      } while (page <= lastPage && page <= 20);

      const detailed = await enrichOrders(allRows);
      setSalesOrders(detailed);
      setSalesLoadedAt(new Date().toLocaleString());
    } catch (err: any) {
      setSalesError(err?.response?.data?.message || err?.message || 'Failed to load sales report.');
      setSalesOrders([]);
    } finally {
      setSalesLoading(false);
    }
  }, [salesFromDate, salesToDate, salesSearch]);

  const loadBookingReport = useCallback(async () => {
    if (bookingFromDate && bookingToDate && bookingFromDate > bookingToDate) {
      setBookingError('From date cannot be after To date.');
      return;
    }

    setBookingLoading(true);
    setBookingError('');
    try {
      const allRows: Order[] = [];
      let page = 1;
      let lastPage = 1;
      do {
        const response = await orderService.getAll({
          date_from: bookingFromDate || undefined,
          date_to: bookingToDate || undefined,
          date_type: 'order_date',
          date_filter_type: 'order_date',
          search: bookingSearch || undefined,
          per_page: 250,
          page,
          sort_by: 'order_date',
          sort_order: 'desc',
          skipStoreScope: true,
          exclude_preorders: 1,
        } as any);
        allRows.push(...(Array.isArray(response?.data) ? response.data : []));
        lastPage = Number(response?.last_page || 1);
        page += 1;
      } while (page <= lastPage && page <= 20);

      const detailed = await enrichOrders(allRows);
      setBookingOrders(detailed);
      setBookingLoadedAt(new Date().toLocaleString());
    } catch (err: any) {
      setBookingError(err?.response?.data?.message || err?.message || 'Failed to load booking/installment report.');
      setBookingOrders([]);
    } finally {
      setBookingLoading(false);
    }
  }, [bookingFromDate, bookingToDate, bookingSearch]);

  const loadDispatchTransferReport = useCallback(async () => {
    if (dispatchFromDate && dispatchToDate && dispatchFromDate > dispatchToDate) {
      setDispatchError('From date cannot be after To date.');
      return;
    }

    setDispatchLoading(true);
    setDispatchError('');
    try {
      const allRows: ProductDispatch[] = [];
      let page = 1;
      let lastPage = 1;
      do {
        const response = await dispatchService.getDispatches({
          date_from: dispatchFromDate || undefined,
          date_to: dispatchToDate || undefined,
          source_store_id: dispatchSourceStoreId ? Number(dispatchSourceStoreId) : undefined,
          destination_store_id: dispatchDestinationStoreId ? Number(dispatchDestinationStoreId) : undefined,
          status: dispatchStatus || undefined,
          search: dispatchSearch || undefined,
          per_page: 250,
          page,
          sort_by: 'dispatch_date',
          sort_order: 'desc',
        } as any);
        const payload = unwrapDispatchList(response);
        allRows.push(...payload.rows);
        lastPage = payload.lastPage;
        page += 1;
      } while (page <= lastPage && page <= 20);

      const detailed = await enrichDispatches(allRows);
      setDispatches(detailed);
      setDispatchLoadedAt(new Date().toLocaleString());
    } catch (err: any) {
      setDispatchError(err?.response?.data?.message || err?.message || 'Failed to load dispatch transfer report.');
      setDispatches([]);
    } finally {
      setDispatchLoading(false);
    }
  }, [dispatchFromDate, dispatchToDate, dispatchSourceStoreId, dispatchDestinationStoreId, dispatchStatus, dispatchSearch]);

  const loadDeliveryReport = useCallback(async () => {
    if (deliveryFromDate && deliveryToDate && deliveryFromDate > deliveryToDate) {
      setDeliveryError('From date cannot be after To date.');
      return;
    }

    setDeliveryLoading(true);
    setDeliveryError('');
    try {
      const allRows: ProductDispatch[] = [];
      let page = 1;
      let lastPage = 1;
      do {
        const response = await dispatchService.getDispatches({
          date_from: deliveryFromDate || undefined,
          date_to: deliveryToDate || undefined,
          source_store_id: deliverySourceStoreId ? Number(deliverySourceStoreId) : undefined,
          destination_store_id: deliveryDestinationStoreId ? Number(deliveryDestinationStoreId) : undefined,
          status: 'delivered',
          search: deliverySearch || undefined,
          per_page: 250,
          page,
          sort_by: 'actual_delivery_date',
          sort_order: 'desc',
        } as any);
        const payload = unwrapDispatchList(response);
        allRows.push(...payload.rows);
        lastPage = payload.lastPage;
        page += 1;
      } while (page <= lastPage && page <= 20);

      const detailed = await enrichDispatches(allRows);
      setDeliveryDispatches(detailed);
      setDeliveryLoadedAt(new Date().toLocaleString());
    } catch (err: any) {
      setDeliveryError(err?.response?.data?.message || err?.message || 'Failed to load delivery report.');
      setDeliveryDispatches([]);
    } finally {
      setDeliveryLoading(false);
    }
  }, [deliveryFromDate, deliveryToDate, deliverySourceStoreId, deliveryDestinationStoreId, deliverySearch]);

  const loadCategoryWiseSalesReport = useCallback(async () => {
    if (categorySalesFromDate && categorySalesToDate && categorySalesFromDate > categorySalesToDate) {
      setCategorySalesError('From date cannot be after To date.');
      return;
    }

    setCategorySalesLoading(true);
    setCategorySalesError('');
    try {
      const allRows: Order[] = [];
      let page = 1;
      let lastPage = 1;
      do {
        const response = await orderService.getAll({
          date_from: categorySalesFromDate || undefined,
          date_to: categorySalesToDate || undefined,
          date_type: 'order_date',
          date_filter_type: 'order_date',
          store_id: categorySalesStoreId || undefined,
          search: categorySalesSearch || undefined,
          per_page: 250,
          page,
          sort_by: 'order_date',
          sort_order: 'desc',
          skipStoreScope: true,
          exclude_preorders: 1,
        } as any);
        allRows.push(...(Array.isArray(response?.data) ? response.data : []));
        lastPage = Number(response?.last_page || 1);
        page += 1;
      } while (page <= lastPage && page <= 20);

      const detailed = await enrichOrders(allRows);
      setCategorySalesOrders(detailed);
      setCategorySalesLoadedAt(new Date().toLocaleString());
    } catch (err: any) {
      setCategorySalesError(err?.response?.data?.message || err?.message || 'Failed to load category wise sales report.');
      setCategorySalesOrders([]);
    } finally {
      setCategorySalesLoading(false);
    }
  }, [categorySalesFromDate, categorySalesToDate, categorySalesStoreId, categorySalesSearch]);

  const loadSalesStockReport = useCallback(async () => {
    if (salesStockFromDate && salesStockToDate && salesStockFromDate > salesStockToDate) {
      setSalesStockError('From date cannot be after To date.');
      return;
    }

    setSalesStockLoading(true);
    setSalesStockError('');
    try {
      const allRows: Order[] = [];
      let page = 1;
      let lastPage = 1;
      do {
        const response = await orderService.getAll({
          date_from: salesStockFromDate || undefined,
          date_to: salesStockToDate || undefined,
          date_type: 'order_date',
          date_filter_type: 'order_date',
          store_id: salesStockStoreId || undefined,
          search: salesStockSearch || undefined,
          per_page: 250,
          page,
          sort_by: 'order_date',
          sort_order: 'desc',
          skipStoreScope: true,
          exclude_preorders: 1,
        } as any);
        allRows.push(...(Array.isArray(response?.data) ? response.data : []));
        lastPage = Number(response?.last_page || 1);
        page += 1;
      } while (page <= lastPage && page <= 20);

      const detailedOrders = await enrichOrders(allRows);
      const batches = await batchService.getBatchesAll({
        store_id: salesStockStoreId || undefined,
        status: 'available',
        per_page: 250,
      } as any, { max_items: 5000, max_pages: 40 });

      setSalesStockOrders(detailedOrders);
      setSalesStockBatches(Array.isArray(batches) ? batches : []);
      setSalesStockLoadedAt(new Date().toLocaleString());
    } catch (err: any) {
      setSalesStockError(err?.response?.data?.message || err?.message || 'Failed to load sales & stock report.');
      setSalesStockOrders([]);
      setSalesStockBatches([]);
    } finally {
      setSalesStockLoading(false);
    }
  }, [salesStockFromDate, salesStockToDate, salesStockStoreId, salesStockSearch]);


  useEffect(() => {
    loadPoReport();
    loadDailySalesReport();
    loadSalesReport();
    loadBookingReport();
    loadDispatchTransferReport();
    loadDeliveryReport();
    loadCategoryWiseSalesReport();
    loadSalesStockReport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  const resetPoFilters = () => {
    setPoFromDate(firstDayOfMonth());
    setPoToDate(today());
    setPoVendorId('');
    setPoSearch('');
  };

  const resetDailyFilters = () => {
    setDailyFromDate(today());
    setDailyToDate(today());
    setDailyStoreId('');
    setDailySearch('');
  };

  const resetSalesFilters = () => {
    setSalesFromDate(today());
    setSalesToDate(today());
    setSalesStatus('');
    setSalesPaymentMethod('');
    setSalesDeliveryPartner('');
    setSalesSearch('');
  };

  const resetBookingFilters = () => {
    setBookingFromDate(today());
    setBookingToDate(today());
    setBookingStatus('');
    setBookingSearch('');
  };

  const resetDispatchFilters = () => {
    setDispatchFromDate(today());
    setDispatchToDate(today());
    setDispatchSourceStoreId('');
    setDispatchDestinationStoreId('');
    setDispatchStatus('');
    setDispatchSearch('');
  };

  const resetDeliveryFilters = () => {
    setDeliveryFromDate(today());
    setDeliveryToDate(today());
    setDeliverySourceStoreId('');
    setDeliveryDestinationStoreId('');
    setDeliverySearch('');
  };

  const resetCategorySalesFilters = () => {
    setCategorySalesFromDate(today());
    setCategorySalesToDate(today());
    setCategorySalesStoreId('');
    setCategorySalesSearch('');
  };

  const resetSalesStockFilters = () => {
    setSalesStockFromDate(today());
    setSalesStockToDate(today());
    setSalesStockStoreId('');
    setSalesStockSearch('');
  };

  const downloadPoExcel = () => {
    triggerDownload(
      buildPoExcelHtml(poRows, poFromDate, poToDate),
      `po-report-${safeFilePart(poFromDate)}-${safeFilePart(poToDate)}.xls`,
      'application/vnd.ms-excel;charset=utf-8'
    );
  };

  const downloadPoCsv = () => {
    const header = ['Category', 'Supplier Name', 'Total PO Qty', 'Total PO Amount without VAT', 'VAT', 'Total PO Amount with VAT', 'Return Amount', 'Total Value'];
    const lines = [header, ...poRows.map((row) => [
      row.category,
      row.supplierName,
      row.totalPoQty,
      row.totalPoAmountWithoutVat,
      row.vat,
      row.totalPoAmountWithVat,
      row.returnAmount,
      row.totalValue,
    ])].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','));
    triggerDownload(lines.join('\n'), `po-report-${safeFilePart(poFromDate)}-${safeFilePart(poToDate)}.csv`, 'text/csv;charset=utf-8');
  };

  const downloadDailyExcel = () => {
    triggerDownload(
      buildDailySalesExcelHtml(dailyRows, dailyFromDate, dailyToDate),
      `daily-sales-report-${safeFilePart(dailyFromDate)}-${safeFilePart(dailyToDate)}.xls`,
      'application/vnd.ms-excel;charset=utf-8'
    );
  };

  const downloadDailyCsv = () => {
    const header = ['Shop Name', 'Sales Amount', 'Invoice Qty', 'Item Qty', 'Sales % of total shop sales'];
    const lines = [header, ...dailyRows.map((row) => [
      row.shopName,
      row.salesAmount,
      row.invoiceQty,
      row.itemQty,
      row.salesPercent,
    ])].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','));
    triggerDownload(lines.join('\n'), `daily-sales-report-${safeFilePart(dailyFromDate)}-${safeFilePart(dailyToDate)}.csv`, 'text/csv;charset=utf-8');
  };

  const downloadSalesExcel = () => {
    triggerDownload(
      buildSalesReportExcelHtml(salesRows, salesFromDate, salesToDate),
      `sales-report-${safeFilePart(salesFromDate)}-${safeFilePart(salesToDate)}.xls`,
      'application/vnd.ms-excel;charset=utf-8'
    );
  };

  const downloadSalesCsv = () => {
    const lines = [salesReportHeaders, ...salesRows.map(salesRowToCells)]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','));
    triggerDownload(lines.join('\n'), `sales-report-${safeFilePart(salesFromDate)}-${safeFilePart(salesToDate)}.csv`, 'text/csv;charset=utf-8');
  };

  const downloadBookingExcel = () => {
    triggerDownload(
      buildBookingInstallmentExcelHtml(bookingRows, bookingFromDate, bookingToDate),
      `booking-making-installment-${safeFilePart(bookingFromDate)}-${safeFilePart(bookingToDate)}.xls`,
      'application/vnd.ms-excel;charset=utf-8'
    );
  };

  const downloadBookingCsv = () => {
    const lines = [bookingInstallmentHeaders, ...bookingRows.map(bookingRowToCells)]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','));
    triggerDownload(lines.join('\n'), `booking-making-installment-${safeFilePart(bookingFromDate)}-${safeFilePart(bookingToDate)}.csv`, 'text/csv;charset=utf-8');
  };

  const downloadDispatchExcel = () => {
    triggerDownload(
      buildDispatchTransferExcelHtml(dispatchRows, dispatchFromDate, dispatchToDate, selectedDispatchSourceStore, selectedDispatchDestinationStore),
      `dispatch-transfer-report-${safeFilePart(dispatchFromDate)}-${safeFilePart(dispatchToDate)}.xls`,
      'application/vnd.ms-excel;charset=utf-8'
    );
  };

  const downloadDispatchCsv = () => {
    const lines = [dispatchTransferHeaders, ...dispatchRows.map(dispatchTransferRowToCells)]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','));
    triggerDownload(lines.join('\n'), `dispatch-transfer-report-${safeFilePart(dispatchFromDate)}-${safeFilePart(dispatchToDate)}.csv`, 'text/csv;charset=utf-8');
  };


  const downloadDeliveryExcel = () => {
    triggerDownload(
      buildDeliveryReportExcelHtml(deliveryRows, deliveryFromDate, deliveryToDate, selectedDeliverySourceStore, selectedDeliveryDestinationStore),
      `delivery-report-${safeFilePart(deliveryFromDate)}-${safeFilePart(deliveryToDate)}.xls`,
      'application/vnd.ms-excel;charset=utf-8'
    );
  };

  const downloadDeliveryCsv = () => {
    const lines = [deliveryReportHeaders, ...deliveryRows.map(deliveryReportRowToCells)]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','));
    triggerDownload(lines.join('\n'), `delivery-report-${safeFilePart(deliveryFromDate)}-${safeFilePart(deliveryToDate)}.csv`, 'text/csv;charset=utf-8');
  };


  const downloadCategorySalesExcel = () => {
    triggerDownload(
      buildCategoryWiseSalesExcelHtml(categorySalesRows, categorySalesFromDate, categorySalesToDate, selectedCategorySalesStore),
      `category-wise-sales-report-${safeFilePart(categorySalesFromDate)}-${safeFilePart(categorySalesToDate)}.xls`,
      'application/vnd.ms-excel;charset=utf-8'
    );
  };

  const downloadCategorySalesCsv = () => {
    const lines = [categoryWiseSalesHeaders, ...categorySalesRows.map(categoryWiseSalesRowToCells)]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','));
    triggerDownload(lines.join('\n'), `category-wise-sales-report-${safeFilePart(categorySalesFromDate)}-${safeFilePart(categorySalesToDate)}.csv`, 'text/csv;charset=utf-8');
  };

  const downloadSalesStockExcel = () => {
    triggerDownload(
      buildSalesStockExcelHtml(salesStockRows, salesStockFromDate, salesStockToDate, selectedSalesStockStore),
      `sales-stock-report-${safeFilePart(salesStockFromDate)}-${safeFilePart(salesStockToDate)}.xls`,
      'application/vnd.ms-excel;charset=utf-8'
    );
  };

  const downloadSalesStockCsv = () => {
    const lines = [salesStockHeaders, ...salesStockRows.map(salesStockRowToCells)]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','));
    triggerDownload(lines.join('\n'), `sales-stock-report-${safeFilePart(salesStockFromDate)}-${safeFilePart(salesStockToDate)}.csv`, 'text/csv;charset=utf-8');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      <div className="flex">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports Center</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                All Excel-style operational reports are kept here in one page.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('po')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${activeTab === 'po' ? 'bg-black text-white border-black' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'}`}
              >
                <Package className="w-4 h-4" /> PO Report
              </button>
              <button
                onClick={() => setActiveTab('daily-sales')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${activeTab === 'daily-sales' ? 'bg-black text-white border-black' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'}`}
              >
                <ShoppingCart className="w-4 h-4" /> Daily Sales Report
              </button>
              <button
                onClick={() => setActiveTab('sales')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${activeTab === 'sales' ? 'bg-black text-white border-black' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'}`}
              >
                <FileSpreadsheet className="w-4 h-4" /> Sales Report
              </button>
              <button
                onClick={() => setActiveTab('booking-installment')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${activeTab === 'booking-installment' ? 'bg-black text-white border-black' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'}`}
              >
                <FileSpreadsheet className="w-4 h-4" /> Booking / Installment
              </button>
              <button
                onClick={() => setActiveTab('dispatch-transfer')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${activeTab === 'dispatch-transfer' ? 'bg-black text-white border-black' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'}`}
              >
                <Package className="w-4 h-4" /> Dispatch Transfer
              </button>
              <button
                onClick={() => setActiveTab('delivery')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${activeTab === 'delivery' ? 'bg-black text-white border-black' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'}`}
              >
                <Package className="w-4 h-4" /> Delivery Report
              </button>
              <button
                onClick={() => setActiveTab('category-sales')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${activeTab === 'category-sales' ? 'bg-black text-white border-black' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'}`}
              >
                <BarChart3 className="w-4 h-4" /> Category Sales
              </button>
              <button
                onClick={() => setActiveTab('sales-stock')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${activeTab === 'sales-stock' ? 'bg-black text-white border-black' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'}`}
              >
                <BarChart3 className="w-4 h-4" /> Sales &amp; Stock
              </button>
            </div>
          </div>

          {activeTab === 'po' && (
            <section>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From date</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input type="date" value={poFromDate} onChange={(e) => setPoFromDate(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To date</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input type="date" value={poToDate} onChange={(e) => setPoToDate(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier</label>
                      <select value={poVendorId} onChange={(e) => setPoVendorId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                        <option value="">All suppliers</option>
                        {vendors.map((vendor: any) => <option key={vendor.id} value={String(vendor.id)}>{vendor.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search PO</label>
                      <div className="flex gap-2">
                        <input value={poSearch} onChange={(e) => setPoSearch(e.target.value)} placeholder="PO number" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                        <button onClick={loadPoReport} disabled={poLoading} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-60">
                          <Search className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={resetPoFilters} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm text-gray-800 dark:text-gray-100">
                      <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                    <button onClick={loadPoReport} disabled={poLoading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-900 text-sm disabled:opacity-60">
                      {poLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Generate
                    </button>
                    <button onClick={downloadPoExcel} disabled={!poRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm disabled:opacity-60">
                      <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                    <button onClick={downloadPoCsv} disabled={!poRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-60">
                      <Download className="w-4 h-4" /> CSV
                    </button>
                    <button onClick={() => openPrintWindow(buildPoPrintHtml(poRows, poFromDate, poToDate))} disabled={!poRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800 text-sm disabled:opacity-60">
                      <Printer className="w-4 h-4" /> Print
                    </button>
                  </div>
                </div>
              </div>

              {poError && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">{poError}</div>}

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <SummaryCard label="Categories / Suppliers" value={qty(poRows.length)} />
                <SummaryCard label="Total PO Qty" value={qty(poTotals.totalPoQty)} />
                <SummaryCard label="Without VAT" value={`৳${money(poTotals.totalPoAmountWithoutVat)}`} />
                <SummaryCard label="VAT" value={`৳${money(poTotals.vat)}`} />
                <SummaryCard label="Total Value" value={`৳${money(poTotals.totalValue)}`} />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <TableHeader title="Purchase Order Report" subtitle={`${poLoadedAt ? `Last loaded: ${poLoadedAt}` : 'Generate to load report'} • ${purchaseOrders.length} PO records scanned`} loading={poLoading} />
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-blue-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                      <tr>
                        <Th align="left">Category</Th>
                        <Th align="left">Supplier Name</Th>
                        <Th>Total PO Qty</Th>
                        <Th>Total PO Amount without VAT</Th>
                        <Th>VAT</Th>
                        <Th>Total PO Amount with VAT</Th>
                        <Th>Return Amount</Th>
                        <Th>Total Value</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {!poLoading && poRows.length === 0 ? (
                        <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">No PO report data found for this filter.</td></tr>
                      ) : poRows.map((row) => (
                        <tr key={`${row.category}-${row.supplierName}`} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                          <Td strong>{row.category}</Td>
                          <Td>{row.supplierName}</Td>
                          <Td right>{qty(row.totalPoQty)}</Td>
                          <Td right>৳{money(row.totalPoAmountWithoutVat)}</Td>
                          <Td right>৳{money(row.vat)}</Td>
                          <Td right>৳{money(row.totalPoAmountWithVat)}</Td>
                          <Td right>৳{money(row.returnAmount)}</Td>
                          <Td right strong>৳{money(row.totalValue)}</Td>
                        </tr>
                      ))}
                      {poRows.length > 0 && (
                        <tr className="bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 font-semibold">
                          <Td colSpan={2}>Grand Total</Td>
                          <Td right>{qty(poTotals.totalPoQty)}</Td>
                          <Td right>৳{money(poTotals.totalPoAmountWithoutVat)}</Td>
                          <Td right>৳{money(poTotals.vat)}</Td>
                          <Td right>৳{money(poTotals.totalPoAmountWithVat)}</Td>
                          <Td right>৳{money(poTotals.returnAmount)}</Td>
                          <Td right>৳{money(poTotals.totalValue)}</Td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'daily-sales' && (
            <section>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From date</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input type="date" value={dailyFromDate} onChange={(e) => setDailyFromDate(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To date</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input type="date" value={dailyToDate} onChange={(e) => setDailyToDate(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shop / Store</label>
                      <select value={dailyStoreId} onChange={(e) => setDailyStoreId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                        <option value="">All shops</option>
                        {stores.map((store: any) => <option key={store.id} value={String(store.id)}>{store.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search shop</label>
                      <div className="flex gap-2">
                        <input value={dailySearch} onChange={(e) => setDailySearch(e.target.value)} placeholder="Shop name" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                        <button onClick={loadDailySalesReport} disabled={dailyLoading} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-60">
                          <Search className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={resetDailyFilters} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm text-gray-800 dark:text-gray-100">
                      <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                    <button onClick={loadDailySalesReport} disabled={dailyLoading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-900 text-sm disabled:opacity-60">
                      {dailyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Generate
                    </button>
                    <button onClick={downloadDailyExcel} disabled={!dailyRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm disabled:opacity-60">
                      <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                    <button onClick={downloadDailyCsv} disabled={!dailyRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-60">
                      <Download className="w-4 h-4" /> CSV
                    </button>
                    <button onClick={() => openPrintWindow(buildDailySalesPrintHtml(dailyRows, dailyFromDate, dailyToDate))} disabled={!dailyRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800 text-sm disabled:opacity-60">
                      <Printer className="w-4 h-4" /> Print
                    </button>
                  </div>
                </div>
              </div>

              {dailyError && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">{dailyError}</div>}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <SummaryCard label="Shops" value={qty(dailyRows.length)} icon={<BarChart3 className="w-4 h-4" />} />
                <SummaryCard label="Sales Amount" value={`৳${money(dailyTotals.salesAmount)}`} />
                <SummaryCard label="Invoice Qty" value={qty(dailyTotals.invoiceQty)} />
                <SummaryCard label="Item Qty" value={qty(dailyTotals.itemQty)} />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <TableHeader title="Daily Sales Status" subtitle={`${dailyLoadedAt ? `Last loaded: ${dailyLoadedAt}` : 'Generate to load report'} • Date: ${displayDateRange(dailyFromDate, dailyToDate)}`} loading={dailyLoading} />
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-blue-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                      <tr>
                        <Th align="left">Shop Name</Th>
                        <Th>Sales Amount</Th>
                        <Th>Invoice Qty</Th>
                        <Th>Item Qty</Th>
                        <Th>Sales % of total shop sales</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {!dailyLoading && dailyRows.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">No sales found for this filter.</td></tr>
                      ) : dailyRows.map((row) => (
                        <tr key={row.shopName} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                          <Td strong>{row.shopName}</Td>
                          <Td right>৳{money(row.salesAmount)}</Td>
                          <Td right>{qty(row.invoiceQty)}</Td>
                          <Td right>{qty(row.itemQty)}</Td>
                          <Td right>{percent(row.salesPercent)}</Td>
                        </tr>
                      ))}
                      {dailyRows.length > 0 && (
                        <tr className="bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 font-semibold">
                          <Td>Total</Td>
                          <Td right>৳{money(dailyTotals.salesAmount)}</Td>
                          <Td right>{qty(dailyTotals.invoiceQty)}</Td>
                          <Td right>{qty(dailyTotals.itemQty)}</Td>
                          <Td right>{dailyTotals.salesAmount > 0 ? '100.00%' : '0.00%'}</Td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                  Sales % of total shop sales = shop sales / total sales. Cancelled/deleted/refunded orders and preorders are excluded.
                </div>
              </div>
            </section>
          )}


          {activeTab === 'sales' && (
            <section>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                  <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 flex-1">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From date</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input type="date" value={salesFromDate} onChange={(e) => setSalesFromDate(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To date</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input type="date" value={salesToDate} onChange={(e) => setSalesToDate(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order Status</label>
                      <select value={salesStatus} onChange={(e) => setSalesStatus(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                        <option value="">All statuses</option>
                        {salesStatusOptions.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                      <select value={salesPaymentMethod} onChange={(e) => setSalesPaymentMethod(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                        <option value="">All methods</option>
                        {salesPaymentOptions.map((method) => <option key={method} value={method}>{method}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Partner</label>
                      <select value={salesDeliveryPartner} onChange={(e) => setSalesDeliveryPartner(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                        <option value="">All partners</option>
                        {salesDeliveryPartnerOptions.map((partner) => <option key={partner} value={partner}>{partner}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                      <div className="flex gap-2">
                        <input value={salesSearch} onChange={(e) => setSalesSearch(e.target.value)} placeholder="Invoice / customer / phone" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                        <button onClick={loadSalesReport} disabled={salesLoading} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-60">
                          <Search className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={resetSalesFilters} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm text-gray-800 dark:text-gray-100">
                      <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                    <button onClick={loadSalesReport} disabled={salesLoading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-900 text-sm disabled:opacity-60">
                      {salesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Generate
                    </button>
                    <button onClick={downloadSalesExcel} disabled={!salesRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm disabled:opacity-60">
                      <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                    <button onClick={downloadSalesCsv} disabled={!salesRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-60">
                      <Download className="w-4 h-4" /> CSV
                    </button>
                    <button onClick={() => openPrintWindow(buildSalesReportPrintHtml(salesRows, salesFromDate, salesToDate))} disabled={!salesRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800 text-sm disabled:opacity-60">
                      <Printer className="w-4 h-4" /> Print
                    </button>
                  </div>
                </div>
              </div>

              {salesError && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">{salesError}</div>}

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <SummaryCard label="Invoices" value={qty(salesRows.length)} />
                <SummaryCard label="Subtotal" value={`৳${money(salesTotals.subTotalPrice)}`} />
                <SummaryCard label="Total Price" value={`৳${money(salesTotals.totalPrice)}`} />
                <SummaryCard label="Paid Amount" value={`৳${money(salesTotals.paidAmount)}`} />
                <SummaryCard label="Due Amount" value={`৳${money(salesTotals.dueAmount)}`} />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <TableHeader title="Sales Report" subtitle={`${salesLoadedAt ? `Last loaded: ${salesLoadedAt}` : 'Generate to load report'} • Date: ${displayDateRange(salesFromDate, salesToDate)}`} loading={salesLoading} />
                <div className="overflow-x-auto">
                  <table className="min-w-[2200px] text-xs">
                    <thead className="bg-blue-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                      <tr>
                        {salesReportHeaders.map((header) => <th key={header} className="px-3 py-3 border-r border-blue-100 dark:border-gray-600 text-left whitespace-nowrap">{header}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {!salesLoading && salesRows.length === 0 ? (
                        <tr><td colSpan={19} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">No sales found for this filter.</td></tr>
                      ) : salesRows.map((row) => (
                        <tr key={row.invoiceNumber} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 align-top">
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">{row.creationDate}</td>
                          <td className="px-3 py-2 text-gray-900 dark:text-white font-semibold whitespace-nowrap">{row.invoiceNumber}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 min-w-[160px]">{row.customerName}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">{row.customerPhone}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 min-w-[220px]">{row.customerAddress}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 min-w-[220px] whitespace-pre-line">{row.productNameAndQty}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 min-w-[180px] whitespace-pre-line">{row.productSpecification}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 min-w-[160px] whitespace-pre-line">{row.productAttribute}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">৳{money(row.subTotalPrice)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">৳{money(row.discount)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">৳{money(row.priceAfterDiscount)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">৳{money(row.deliveryCharge)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-semibold whitespace-nowrap">৳{money(row.totalPrice)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">৳{money(row.paidAmount)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">৳{money(row.dueAmount)}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">{row.deliveryPartner}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">{row.deliveryArea}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">{row.paymentMethod}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">{row.orderStatus}</td>
                        </tr>
                      ))}
                      {salesRows.length > 0 && (
                        <tr className="bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 font-semibold">
                          <td colSpan={8} className="px-3 py-2 text-gray-900 dark:text-white">Total</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(salesTotals.subTotalPrice)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(salesTotals.discount)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(salesTotals.priceAfterDiscount)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(salesTotals.deliveryCharge)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(salesTotals.totalPrice)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(salesTotals.paidAmount)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(salesTotals.dueAmount)}</td>
                          <td colSpan={4}></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                  This report follows the uploaded Sales Report CSV structure. Preorders and deleted/void orders are excluded.
                </div>
              </div>
            </section>
          )}

          {activeTab === 'booking-installment' && (
            <section>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From date</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input type="date" value={bookingFromDate} onChange={(e) => setBookingFromDate(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To date</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input type="date" value={bookingToDate} onChange={(e) => setBookingToDate(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                      <select value={bookingStatus} onChange={(e) => setBookingStatus(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                        <option value="">All booking/installment statuses</option>
                        {bookingStatusOptions.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                      <div className="flex gap-2">
                        <input value={bookingSearch} onChange={(e) => setBookingSearch(e.target.value)} placeholder="Customer / mobile / product" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                        <button onClick={loadBookingReport} disabled={bookingLoading} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-60">
                          <Search className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={resetBookingFilters} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm text-gray-800 dark:text-gray-100">
                      <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                    <button onClick={loadBookingReport} disabled={bookingLoading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-900 text-sm disabled:opacity-60">
                      {bookingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Generate
                    </button>
                    <button onClick={downloadBookingExcel} disabled={!bookingRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm disabled:opacity-60">
                      <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                    <button onClick={downloadBookingCsv} disabled={!bookingRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-60">
                      <Download className="w-4 h-4" /> CSV
                    </button>
                    <button onClick={() => openPrintWindow(buildBookingInstallmentPrintHtml(bookingRows, bookingFromDate, bookingToDate))} disabled={!bookingRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800 text-sm disabled:opacity-60">
                      <Printer className="w-4 h-4" /> Print
                    </button>
                  </div>
                </div>
              </div>

              {bookingError && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">{bookingError}</div>}

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <SummaryCard label="Rows" value={qty(bookingRows.length)} />
                <SummaryCard label="MRP" value={`৳${money(bookingTotals.mrp)}`} />
                <SummaryCard label="Making Cost" value={`৳${money(bookingTotals.makingCost)}`} />
                <SummaryCard label="Installment Paid" value={`৳${money(bookingTotals.installmentPaid)}`} />
                <SummaryCard label="Installment Due" value={`৳${money(bookingTotals.installmentDue)}`} />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <TableHeader title="BOOKING, MAKING & INSTALLMENT" subtitle={`${bookingLoadedAt ? `Last loaded: ${bookingLoadedAt}` : 'Generate to load report'} • Date: ${displayDateRange(bookingFromDate, bookingToDate)}`} loading={bookingLoading} />
                <div className="overflow-x-auto">
                  <table className="min-w-[1300px] text-sm">
                    <thead className="bg-blue-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                      <tr>
                        {bookingInstallmentHeaders.map((header) => <th key={header} className="px-3 py-3 border-r border-blue-100 dark:border-gray-600 text-left whitespace-nowrap">{header}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {!bookingLoading && bookingRows.length === 0 ? (
                        <tr><td colSpan={11} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">No booking, making, or installment data found for this filter.</td></tr>
                      ) : bookingRows.map((row, index) => (
                        <tr key={`${row.invoiceNumber}-${index}`} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 align-top">
                          <td className="px-3 py-2 text-gray-900 dark:text-white font-semibold min-w-[150px]">{row.customerName}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">{row.mobile}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 min-w-[220px]">{row.productName}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">{row.color}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">{row.size}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">৳{money(row.mrp)}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">{row.status}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">৳{money(row.makingCost)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">৳{money(row.installmentAmount)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">৳{money(row.installmentPaid)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-semibold whitespace-nowrap">৳{money(row.installmentDue)}</td>
                        </tr>
                      ))}
                      {bookingRows.length > 0 && (
                        <tr className="bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 font-semibold">
                          <td colSpan={5} className="px-3 py-2 text-gray-900 dark:text-white">Total</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(bookingTotals.mrp)}</td>
                          <td></td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(bookingTotals.makingCost)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(bookingTotals.installmentAmount)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(bookingTotals.installmentPaid)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(bookingTotals.installmentDue)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                  This report follows the uploaded Booking, Making & Installment Excel structure. It pulls booking/making/installment-like orders and excludes preorders/deleted/void orders.
                </div>
              </div>
            </section>
          )}


          {activeTab === 'dispatch-transfer' && (
            <section>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 flex-1">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From date</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input type="date" value={dispatchFromDate} onChange={(e) => setDispatchFromDate(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To date</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input type="date" value={dispatchToDate} onChange={(e) => setDispatchToDate(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From store</label>
                      <select value={dispatchSourceStoreId} onChange={(e) => setDispatchSourceStoreId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                        <option value="">All source stores</option>
                        {stores.map((store: any) => <option key={store.id} value={String(store.id)}>{store.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To store</label>
                      <select value={dispatchDestinationStoreId} onChange={(e) => setDispatchDestinationStoreId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                        <option value="">All destination stores</option>
                        {stores.map((store: any) => <option key={store.id} value={String(store.id)}>{store.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                      <select value={dispatchStatus} onChange={(e) => setDispatchStatus(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                        <option value="">All statuses</option>
                        {dispatchStatusOptions.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                      <div className="flex gap-2">
                        <input value={dispatchSearch} onChange={(e) => setDispatchSearch(e.target.value)} placeholder="Dispatch / product / store" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                        <button onClick={loadDispatchTransferReport} disabled={dispatchLoading} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-60">
                          <Search className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={resetDispatchFilters} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm text-gray-800 dark:text-gray-100">
                      <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                    <button onClick={loadDispatchTransferReport} disabled={dispatchLoading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-900 text-sm disabled:opacity-60">
                      {dispatchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Generate
                    </button>
                    <button onClick={downloadDispatchExcel} disabled={!dispatchRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm disabled:opacity-60">
                      <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                    <button onClick={downloadDispatchCsv} disabled={!dispatchRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-60">
                      <Download className="w-4 h-4" /> CSV
                    </button>
                    <button onClick={() => openPrintWindow(buildDispatchTransferPrintHtml(dispatchRows, dispatchFromDate, dispatchToDate, selectedDispatchSourceStore, selectedDispatchDestinationStore))} disabled={!dispatchRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800 text-sm disabled:opacity-60">
                      <Printer className="w-4 h-4" /> Print
                    </button>
                  </div>
                </div>
              </div>

              {dispatchError && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">{dispatchError}</div>}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <SummaryCard label="Transfer Lines" value={qty(dispatchRows.length)} />
                <SummaryCard label="Dispatches Scanned" value={qty(dispatches.length)} />
                <SummaryCard label="Transfer Qty" value={qty(dispatchTotals.transferQty)} />
                <SummaryCard label="Transfer Value" value={`৳${money(dispatchTotals.transferValue)}`} />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <TableHeader title="TRANSFER REPORT" subtitle={`${dispatchLoadedAt ? `Last loaded: ${dispatchLoadedAt}` : 'Generate to load report'} • Date: ${displayDateRange(dispatchFromDate, dispatchToDate)} • From: ${selectedDispatchSourceStore || 'All'} • To: ${selectedDispatchDestinationStore || 'All'}`} loading={dispatchLoading} />
                <div className="overflow-x-auto">
                  <table className="min-w-[900px] text-sm">
                    <thead className="bg-blue-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                      <tr>
                        {dispatchTransferHeaders.map((header) => <th key={header} className="px-3 py-3 border-r border-blue-100 dark:border-gray-600 text-left whitespace-nowrap">{header}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {!dispatchLoading && dispatchRows.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">No dispatch transfer data found for this filter.</td></tr>
                      ) : dispatchRows.map((row, index) => (
                        <tr key={`${row.category}-${row.productCode}-${row.color}-${row.size}-${index}`} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 align-top">
                          <td className="px-3 py-2 text-gray-900 dark:text-white font-semibold min-w-[180px]">{row.category}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">{row.productCode}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">{row.color}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">{row.size}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">{qty(row.transferQty)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-semibold whitespace-nowrap">৳{money(row.transferValue)}</td>
                        </tr>
                      ))}
                      {dispatchRows.length > 0 && (
                        <tr className="bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 font-semibold">
                          <td className="px-3 py-2 text-gray-900 dark:text-white">TOTAL</td>
                          <td colSpan={3}></td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">{qty(dispatchTotals.transferQty)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(dispatchTotals.transferValue)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                  This report follows the uploaded Transfer Report Excel structure for dispatches: category, product code, color, size, transfer quantity, and transfer value.
                </div>
              </div>
            </section>
          )}


          {activeTab === 'delivery' && (
            <section>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From date</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input type="date" value={deliveryFromDate} onChange={(e) => setDeliveryFromDate(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To date</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input type="date" value={deliveryToDate} onChange={(e) => setDeliveryToDate(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From store</label>
                      <select value={deliverySourceStoreId} onChange={(e) => setDeliverySourceStoreId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                        <option value="">All source stores</option>
                        {stores.map((store: any) => <option key={store.id} value={String(store.id)}>{store.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To store</label>
                      <select value={deliveryDestinationStoreId} onChange={(e) => setDeliveryDestinationStoreId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                        <option value="">All destination stores</option>
                        {stores.map((store: any) => <option key={store.id} value={String(store.id)}>{store.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                      <div className="flex gap-2">
                        <input value={deliverySearch} onChange={(e) => setDeliverySearch(e.target.value)} placeholder="Category / code / color / size" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                        <button onClick={loadDeliveryReport} disabled={deliveryLoading} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-60">
                          <Search className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={resetDeliveryFilters} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm text-gray-800 dark:text-gray-100">
                      <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                    <button onClick={loadDeliveryReport} disabled={deliveryLoading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-900 text-sm disabled:opacity-60">
                      {deliveryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Generate
                    </button>
                    <button onClick={downloadDeliveryExcel} disabled={!deliveryRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm disabled:opacity-60">
                      <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                    <button onClick={downloadDeliveryCsv} disabled={!deliveryRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-60">
                      <Download className="w-4 h-4" /> CSV
                    </button>
                    <button onClick={() => openPrintWindow(buildDeliveryReportPrintHtml(deliveryRows, deliveryFromDate, deliveryToDate, selectedDeliverySourceStore, selectedDeliveryDestinationStore))} disabled={!deliveryRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800 text-sm disabled:opacity-60">
                      <Printer className="w-4 h-4" /> Print
                    </button>
                  </div>
                </div>
              </div>

              {deliveryError && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">{deliveryError}</div>}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <SummaryCard label="Delivery Lines" value={qty(deliveryRows.length)} />
                <SummaryCard label="Dispatches Scanned" value={qty(deliveryDispatches.length)} />
                <SummaryCard label="Delivery Qty" value={qty(deliveryTotals.deliveryQty)} />
                <SummaryCard label="Delivered Value" value={`৳${money(deliveryTotals.deliveredValue)}`} />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <TableHeader title="DELIVERY REPORT" subtitle={`${deliveryLoadedAt ? `Last loaded: ${deliveryLoadedAt}` : 'Generate to load report'} • Date: ${displayDateRange(deliveryFromDate, deliveryToDate)} • From: ${selectedDeliverySourceStore || 'All'} • To: ${selectedDeliveryDestinationStore || 'All'}`} loading={deliveryLoading} />
                <div className="overflow-x-auto">
                  <table className="min-w-[1000px] text-sm">
                    <thead className="bg-blue-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                      <tr>{deliveryReportHeaders.map((header) => <th key={header} className="px-3 py-3 border-r border-blue-100 dark:border-gray-600 text-left whitespace-nowrap">{header}</th>)}</tr>
                    </thead>
                    <tbody>
                      {!deliveryLoading && deliveryRows.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">No delivery data found for this filter.</td></tr>
                      ) : deliveryRows.map((row, index) => (
                        <tr key={`${row.category}-${row.productCode}-${row.color}-${row.size}-${row.unitPrice}-${index}`} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 align-top">
                          <td className="px-3 py-2 text-gray-900 dark:text-white font-semibold min-w-[180px]">{row.category}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">{row.productCode}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">{row.color}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">{row.size}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-semibold whitespace-nowrap">৳{money(row.unitPrice)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">{qty(row.deliveryQty)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-semibold whitespace-nowrap">৳{money(row.deliveredValue)}</td>
                        </tr>
                      ))}
                      {deliveryRows.length > 0 && (
                        <tr className="bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 font-semibold">
                          <td className="px-3 py-2 text-gray-900 dark:text-white">TOTAL</td>
                          <td colSpan={4}></td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">{qty(deliveryTotals.deliveryQty)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(deliveryTotals.deliveredValue)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                  This report follows the uploaded Delivery Report Excel structure: category, product code, color, size, unit price, delivery quantity, and delivered value from completed dispatch deliveries.
                </div>
              </div>
            </section>
          )}

          {activeTab === 'category-sales' && (
            <section>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From date</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input type="date" value={categorySalesFromDate} onChange={(e) => setCategorySalesFromDate(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To date</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input type="date" value={categorySalesToDate} onChange={(e) => setCategorySalesToDate(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store</label>
                      <select value={categorySalesStoreId} onChange={(e) => setCategorySalesStoreId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                        <option value="">All stores</option>
                        {stores.map((store: any) => <option key={store.id} value={String(store.id)}>{store.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                      <div className="flex gap-2">
                        <input value={categorySalesSearch} onChange={(e) => setCategorySalesSearch(e.target.value)} placeholder="Category" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                        <button onClick={loadCategoryWiseSalesReport} disabled={categorySalesLoading} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-60">
                          <Search className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={resetCategorySalesFilters} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm text-gray-800 dark:text-gray-100">
                      <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                    <button onClick={loadCategoryWiseSalesReport} disabled={categorySalesLoading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-900 text-sm disabled:opacity-60">
                      {categorySalesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Generate
                    </button>
                    <button onClick={downloadCategorySalesExcel} disabled={!categorySalesRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm disabled:opacity-60">
                      <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                    <button onClick={downloadCategorySalesCsv} disabled={!categorySalesRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-60">
                      <Download className="w-4 h-4" /> CSV
                    </button>
                    <button onClick={() => openPrintWindow(buildCategoryWiseSalesPrintHtml(categorySalesRows, categorySalesFromDate, categorySalesToDate, selectedCategorySalesStore))} disabled={!categorySalesRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800 text-sm disabled:opacity-60">
                      <Printer className="w-4 h-4" /> Print
                    </button>
                  </div>
                </div>
              </div>

              {categorySalesError && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">{categorySalesError}</div>}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <SummaryCard label="Sold Qty" value={qty(categorySalesTotals.soldQty)} />
                <SummaryCard label="Sub Total" value={`৳${money(categorySalesTotals.subTotal)}`} />
                <SummaryCard label="Discount + Return" value={`৳${money(categorySalesTotals.discountAmount + categorySalesTotals.exchangeAmount + categorySalesTotals.returnAmount)}`} />
                <SummaryCard label="Net Amount" value={`৳${money(categorySalesTotals.netAmount)}`} />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <TableHeader title="CATEGORY WISE SALES REPORT" subtitle={`${categorySalesLoadedAt ? `Last loaded: ${categorySalesLoadedAt}` : 'Generate to load report'} • Period: ${displayDateRange(categorySalesFromDate, categorySalesToDate)} • Store: ${selectedCategorySalesStore || 'All Stores'}`} loading={categorySalesLoading} />
                <div className="overflow-x-auto">
                  <table className="min-w-[1180px] text-sm">
                    <thead className="bg-blue-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                      <tr>{categoryWiseSalesHeaders.map((header) => <th key={header} className="px-3 py-3 border-r border-blue-100 dark:border-gray-600 text-left whitespace-nowrap">{header}</th>)}</tr>
                    </thead>
                    <tbody>
                      {!categorySalesLoading && categorySalesRows.length === 0 ? (
                        <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">No category wise sales data found for this filter.</td></tr>
                      ) : categorySalesRows.map((row, index) => (
                        <tr key={`${row.category}-${index}`} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 align-top">
                          <td className="px-3 py-2 text-gray-900 dark:text-white font-semibold min-w-[180px]">{row.category}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">{qty(row.soldQty)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-semibold whitespace-nowrap">৳{money(row.subTotal)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">৳{money(row.discountAmount)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">৳{money(row.exchangeAmount)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">৳{money(row.returnAmount)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-semibold whitespace-nowrap">৳{money(row.netSalesWithoutVat)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">৳{money(row.vatAmount)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-semibold whitespace-nowrap">৳{money(row.netAmount)}</td>
                        </tr>
                      ))}
                      {categorySalesRows.length > 0 && (
                        <tr className="bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 font-semibold">
                          <td className="px-3 py-2 text-gray-900 dark:text-white">Grand Total</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">{qty(categorySalesTotals.soldQty)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(categorySalesTotals.subTotal)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(categorySalesTotals.discountAmount)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(categorySalesTotals.exchangeAmount)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(categorySalesTotals.returnAmount)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(categorySalesTotals.netSalesWithoutVat)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(categorySalesTotals.vatAmount)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(categorySalesTotals.netAmount)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                  This report follows the uploaded Category Wise Sales Report Excel structure. VAT is calculated at 7.5% on net sales after discount, exchange and return amounts.
                </div>
              </div>
            </section>
          )}

          {activeTab === 'sales-stock' && (
            <section>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From date</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input type="date" value={salesStockFromDate} onChange={(e) => setSalesStockFromDate(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To date</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input type="date" value={salesStockToDate} onChange={(e) => setSalesStockToDate(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store</label>
                      <select value={salesStockStoreId} onChange={(e) => setSalesStockStoreId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                        <option value="">All stores</option>
                        {stores.map((store: any) => <option key={store.id} value={String(store.id)}>{store.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                      <div className="flex gap-2">
                        <input value={salesStockSearch} onChange={(e) => setSalesStockSearch(e.target.value)} placeholder="Category / code / color / size" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                        <button onClick={loadSalesStockReport} disabled={salesStockLoading} className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-60">
                          <Search className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={resetSalesStockFilters} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm text-gray-800 dark:text-gray-100">
                      <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                    <button onClick={loadSalesStockReport} disabled={salesStockLoading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-900 text-sm disabled:opacity-60">
                      {salesStockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Generate
                    </button>
                    <button onClick={downloadSalesStockExcel} disabled={!salesStockRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm disabled:opacity-60">
                      <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                    <button onClick={downloadSalesStockCsv} disabled={!salesStockRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-60">
                      <Download className="w-4 h-4" /> CSV
                    </button>
                    <button onClick={() => openPrintWindow(buildSalesStockPrintHtml(salesStockRows, salesStockFromDate, salesStockToDate, selectedSalesStockStore))} disabled={!salesStockRows.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800 text-sm disabled:opacity-60">
                      <Printer className="w-4 h-4" /> Print
                    </button>
                  </div>
                </div>
              </div>

              {salesStockError && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">{salesStockError}</div>}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <SummaryCard label="Sold Qty" value={qty(salesStockTotals.soldQty)} />
                <SummaryCard label="Sales Subtotal" value={`৳${money(salesStockTotals.subTotal)}`} />
                <SummaryCard label="Stock Qty" value={qty(salesStockTotals.stockQty)} />
                <SummaryCard label="Stock Value" value={`৳${money(salesStockTotals.stockValue)}`} />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <TableHeader title="SALES & STOCK REPORT" subtitle={`${salesStockLoadedAt ? `Last loaded: ${salesStockLoadedAt}` : 'Generate to load report'} • Date: ${displayDateRange(salesStockFromDate, salesStockToDate)} • Store: ${selectedSalesStockStore || 'All Stores'}`} loading={salesStockLoading} />
                <div className="overflow-x-auto">
                  <table className="min-w-[1000px] text-sm">
                    <thead className="bg-blue-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                      <tr>{salesStockHeaders.map((header) => <th key={header} className="px-3 py-3 border-r border-blue-100 dark:border-gray-600 text-left whitespace-nowrap">{header}</th>)}</tr>
                    </thead>
                    <tbody>
                      {!salesStockLoading && salesStockRows.length === 0 ? (
                        <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">No sales or stock data found for this filter.</td></tr>
                      ) : salesStockRows.map((row, index) => (
                        <tr key={`${row.category}-${row.productCode}-${row.color}-${row.size}-${index}`} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 align-top">
                          <td className="px-3 py-2 text-gray-900 dark:text-white font-semibold min-w-[180px]">{row.category}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">{row.productCode}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">{row.color}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">{row.size}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">{qty(row.soldQty)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-semibold whitespace-nowrap">৳{money(row.subTotal)}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200 whitespace-nowrap">{qty(row.stockQty)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-semibold whitespace-nowrap">৳{money(row.stockValue)}</td>
                        </tr>
                      ))}
                      {salesStockRows.length > 0 && (
                        <tr className="bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 font-semibold">
                          <td className="px-3 py-2 text-gray-900 dark:text-white">TOTAL</td>
                          <td colSpan={3}></td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">{qty(salesStockTotals.soldQty)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(salesStockTotals.subTotal)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">{qty(salesStockTotals.stockQty)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white">৳{money(salesStockTotals.stockValue)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                  This report follows the uploaded Sales & Stock Report Excel structure: category, product code, color, size, sold quantity, sales subtotal, current stock quantity, and current stock value.
                </div>
              </div>
            </section>
          )}


        </main>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon?: any }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
        {icon ? <span className="text-gray-400">{icon}</span> : null}
      </div>
      <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function TableHeader({ title, subtitle, loading }: { title: string; subtitle: string; loading: boolean }) {
  return (
    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>
      {loading && <span className="inline-flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading details…</span>}
    </div>
  );
}

function Th({ children, align = 'right' }: { children?: any; align?: 'left' | 'right' }) {
  return (
    <th className={`px-4 py-3 border-r border-blue-100 dark:border-gray-600 ${align === 'left' ? 'text-left' : 'text-right'}`}>
      {children}
    </th>
  );
}

function Td({ children, right, strong, colSpan }: { children?: any; right?: boolean; strong?: boolean; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={`px-4 py-2 text-gray-700 dark:text-gray-200 ${right ? 'text-right' : 'text-left'} ${strong ? 'font-semibold text-gray-900 dark:text-white' : ''}`}>
      {children}
    </td>
  );
}

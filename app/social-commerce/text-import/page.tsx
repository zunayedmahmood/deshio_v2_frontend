'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  Loader2,
  Package,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useTheme } from '@/contexts/ThemeContext';
import { fireToast } from '@/lib/globalToast';
import axios from '@/lib/axios';
import catalogService, { Product } from '@/services/catalogService';

interface ParsedOrderDraft {
  raw: string;
  name: string;
  phone: string;
  address: string;
  skuCounts: Record<string, number>;
  skuList: string[];
  pastedTotal: number | null;
}

interface ResolvedSkuItem {
  code: string;
  quantity: number;
  productId: number;
  productName: string;
  sku: string;
  unitPrice: number;
  available: number | null;
}

interface OrderLinePreview extends ResolvedSkuItem {
  baseAmount: number;
  discountAmount: number;
  finalAmount: number;
}

const bdMoney = new Intl.NumberFormat('en-BD', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const formatMoney = (value: number): string => bdMoney.format(round2(value));

const normalizeSku = (value: string): string => String(value || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

const normalizePhone = (rawPhone: string): string => {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (digits.startsWith('880') && digits.length >= 13) return digits.slice(2, 13);
  return digits;
};

const looksLikeSkuLine = (line: string): boolean => {
  const trimmed = line.trim();
  return !!trimmed && /^[\d\s,;/|+-]+$/.test(trimmed) && /\d/.test(trimmed);
};

const extractPhoneMatch = (text: string): RegExpMatchArray | null => {
  return text.match(/(?:\+?88)?01[3-9]\d{8}/);
};

const parseModeratorText = (rawInput: string): ParsedOrderDraft => {
  const raw = rawInput.trim();
  if (!raw) {
    throw new Error('Please paste the moderator text first.');
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error('No usable lines found in the pasted text.');
  }

  const customerLineIndex = Math.max(
    0,
    lines.findIndex((line) => !!extractPhoneMatch(line))
  );
  const customerLine = lines[customerLineIndex] || lines[0];

  const phoneMatch = extractPhoneMatch(customerLine) || extractPhoneMatch(raw);
  if (!phoneMatch) {
    throw new Error('Could not detect a Bangladeshi phone number in the pasted text.');
  }

  const phone = normalizePhone(phoneMatch[0]);
  const phoneIndex = customerLine.indexOf(phoneMatch[0]);
  const name = customerLine.slice(0, Math.max(0, phoneIndex)).trim();
  const addressChunks: string[] = [];

  const postPhoneChunk = customerLine
    .slice(phoneIndex + phoneMatch[0].length)
    .trim()
    .replace(/^[-,:]+/, '')
    .trim();

  if (postPhoneChunk) addressChunks.push(postPhoneChunk);

  let pastedTotal: number | null = null;
  const skuTokens: string[] = [];

  lines.forEach((line, index) => {
    if (index === customerLineIndex) return;

    const totalMatch = line.match(/\b(?:total|bill|amount)\b[^\d]*([\d,.]+)/i);
    if (totalMatch) {
      pastedTotal = Number(String(totalMatch[1]).replace(/,/g, '')) || null;
      return;
    }

    if (looksLikeSkuLine(line)) {
      const found = line.match(/\d+/g) || [];
      skuTokens.push(...found);
      return;
    }

    if (/\d/.test(line) && !/[a-zA-Z]/.test(line)) {
      const found = line.match(/\d+/g) || [];
      skuTokens.push(...found);
      return;
    }

    addressChunks.push(line);
  });

  if (pastedTotal === null) {
    const looseTotalMatch = raw.match(/\b(?:total|bill|amount)\b[^\d]*([\d,.]+)/i);
    if (looseTotalMatch) {
      pastedTotal = Number(String(looseTotalMatch[1]).replace(/,/g, '')) || null;
    }
  }

  if (!name) {
    throw new Error('Could not detect the customer name. Put the name before the phone number.');
  }

  if (skuTokens.length === 0) {
    throw new Error('Could not detect any product codes. Put the SKUs on their own numeric line.');
  }

  const skuCounts = skuTokens.reduce<Record<string, number>>((acc, sku) => {
    const key = String(sku).trim();
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    raw,
    name,
    phone,
    address: addressChunks.join(', ').replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim(),
    skuCounts,
    skuList: Object.keys(skuCounts),
    pastedTotal,
  };
};

const buildPricingPreview = (items: ResolvedSkuItem[], targetTotal: number | null) => {
  const safeItems = items.map((item) => ({
    ...item,
    baseAmount: round2(item.unitPrice * item.quantity),
  }));

  const computedSubtotal = round2(safeItems.reduce((sum, item) => sum + item.baseAmount, 0));
  const effectiveTarget = targetTotal !== null && Number.isFinite(targetTotal) ? round2(targetTotal) : computedSubtotal;

  let shippingAmount = 0;
  let discountBudget = 0;

  if (effectiveTarget > computedSubtotal) {
    shippingAmount = round2(effectiveTarget - computedSubtotal);
  } else if (effectiveTarget < computedSubtotal) {
    discountBudget = round2(computedSubtotal - effectiveTarget);
  }

  let remainingDiscount = discountBudget;
  const lines: OrderLinePreview[] = safeItems.map((item, index) => {
    let discountAmount = 0;

    if (discountBudget > 0) {
      if (index === safeItems.length - 1) {
        discountAmount = round2(remainingDiscount);
      } else {
        discountAmount = round2((item.baseAmount / computedSubtotal) * discountBudget);
        remainingDiscount = round2(remainingDiscount - discountAmount);
      }

      if (discountAmount > item.baseAmount) {
        const overflow = round2(discountAmount - item.baseAmount);
        discountAmount = item.baseAmount;
        remainingDiscount = round2(remainingDiscount + overflow);
      }
    }

    return {
      ...item,
      discountAmount,
      finalAmount: round2(item.baseAmount - discountAmount),
    };
  });

  const finalSubtotal = round2(lines.reduce((sum, item) => sum + item.finalAmount, 0));
  const grandTotal = round2(finalSubtotal + shippingAmount);

  return {
    lines,
    computedSubtotal,
    finalSubtotal,
    shippingAmount,
    totalDiscount: round2(lines.reduce((sum, item) => sum + item.discountAmount, 0)),
    grandTotal,
    effectiveTarget,
  };
};

async function resolveSkuProduct(code: string, quantity: number): Promise<ResolvedSkuItem | null> {
  const normalizedCode = normalizeSku(code);
  const response = await catalogService.searchProducts({
    q: code,
    per_page: 25,
    group_by_sku: false,
  });

  const products = Array.isArray(response.products) ? response.products : [];
  const exactMatches = products.filter((product) => normalizeSku(product.sku) === normalizedCode);
  const candidatePool = exactMatches.length > 0 ? exactMatches : products;

  const ranked = [...candidatePool].sort((a: Product, b: Product) => {
    const aAvail = Number(a.available_inventory ?? a.stock_quantity ?? 0);
    const bAvail = Number(b.available_inventory ?? b.stock_quantity ?? 0);
    if ((bAvail > 0 ? 1 : 0) !== (aAvail > 0 ? 1 : 0)) {
      return (bAvail > 0 ? 1 : 0) - (aAvail > 0 ? 1 : 0);
    }
    return a.id - b.id;
  });

  const chosen = ranked[0];
  if (!chosen) return null;

  return {
    code,
    quantity,
    productId: Number(chosen.id),
    productName: chosen.display_name || chosen.name,
    sku: chosen.sku || code,
    unitPrice: Number(chosen.selling_price || chosen.price || 0),
    available:
      chosen.available_inventory !== undefined && chosen.available_inventory !== null
        ? Number(chosen.available_inventory)
        : chosen.stock_quantity !== undefined
          ? Number(chosen.stock_quantity)
          : null,
  };
}

export default function SocialCommerceAmountDetailsPage() {
  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [rawText, setRawText] = useState(`Sabrina islam 01832239897 mitali 121 raynogor sylhet\n754 901 303\ntotal 2890`);
  const [draft, setDraft] = useState<ParsedOrderDraft | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [targetTotal, setTargetTotal] = useState('');
  const [salesBy, setSalesBy] = useState('');

  const [resolvedItems, setResolvedItems] = useState<ResolvedSkuItem[]>([]);
  const [unresolvedSkus, setUnresolvedSkus] = useState<string[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string>('');
  const [existingCustomerName, setExistingCustomerName] = useState<string>('');

  useEffect(() => {
    const storedName = localStorage.getItem('userName') || '';
    setSalesBy(storedName);
  }, []);

  useEffect(() => {
    const lookupExistingCustomer = async () => {
      if (!customerPhone || customerPhone.length < 11) {
        setExistingCustomerName('');
        return;
      }

      try {
        const response = await axios.post('/customers/find-by-phone', { phone: customerPhone });
        const payload = response.data?.data ?? response.data;
        const customer = payload?.customer ?? payload;
        if (customer?.name) {
          setExistingCustomerName(String(customer.name));
        } else {
          setExistingCustomerName('');
        }
      } catch {
        setExistingCustomerName('');
      }
    };

    lookupExistingCustomer();
  }, [customerPhone]);

  const pricingPreview = useMemo(() => {
    const totalValue = targetTotal.trim() ? Number(targetTotal) : Number.NaN;
    return buildPricingPreview(resolvedItems, Number.isFinite(totalValue) ? totalValue : null);
  }, [resolvedItems, targetTotal]);

  const hasStockIssue = resolvedItems.some(
    (item) => item.available !== null && item.available >= 0 && item.quantity > item.available
  );

  const handleParseAndResolve = async () => {
    try {
      setCreatedOrderNumber('');
      setIsResolving(true);
      const parsed = parseModeratorText(rawText);
      setDraft(parsed);
      setCustomerName(parsed.name);
      setCustomerPhone(parsed.phone);
      setCustomerAddress(parsed.address);
      setTargetTotal(parsed.pastedTotal !== null ? String(parsed.pastedTotal) : '');

      const entries = Object.entries(parsed.skuCounts);
      const results = await Promise.all(
        entries.map(async ([code, quantity]) => {
          try {
            return await resolveSkuProduct(code, quantity);
          } catch (error) {
            console.error(`Failed to resolve SKU ${code}`, error);
            return null;
          }
        })
      );

      const resolved = results.filter(Boolean) as ResolvedSkuItem[];
      const unresolved = entries
        .filter(([code]) => !resolved.find((item) => item.code === code))
        .map(([code]) => code);

      setResolvedItems(resolved);
      setUnresolvedSkus(unresolved);

      if (resolved.length === 0) {
        fireToast('No valid products could be matched from the pasted SKUs.', 'error');
        return;
      }

      if (unresolved.length > 0) {
        fireToast(`Some SKUs could not be matched: ${unresolved.join(', ')}`, 'warning');
      } else {
        fireToast('Text parsed and products matched successfully.', 'success');
      }
    } catch (error: any) {
      console.error(error);
      setDraft(null);
      setResolvedItems([]);
      setUnresolvedSkus([]);
      fireToast(error?.message || 'Failed to parse the moderator text.', 'error');
    } finally {
      setIsResolving(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      fireToast('Please keep customer name, phone, and address filled in.', 'error');
      return;
    }

    if (resolvedItems.length === 0) {
      fireToast('No matched products are ready for order creation.', 'error');
      return;
    }

    if (unresolvedSkus.length > 0) {
      fireToast('Resolve or remove unmatched SKUs before creating the order.', 'error');
      return;
    }

    if (hasStockIssue) {
      fireToast('One or more items exceed currently available stock.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      setCreatedOrderNumber('');

      const orderData = {
        order_type: 'social_commerce',
        customer: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
        },
        shipping_address: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          street: customerAddress.trim(),
        },
        store_id: null,
        items: pricingPreview.lines.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount_amount: item.discountAmount,
        })),
        shipping_amount: pricingPreview.shippingAmount,
        notes: [
          'Social Commerce text import.',
          salesBy ? `Moderator: ${salesBy}.` : '',
          draft?.raw ? `Pasted text: ${draft.raw.replace(/\s+/g, ' ').trim()}` : '',
          `Parsed SKUs: ${Object.entries(draft?.skuCounts || {})
            .map(([sku, qty]) => `${sku}x${qty}`)
            .join(', ')}`,
          targetTotal.trim() ? `Target total: ${targetTotal}.` : '',
        ]
          .filter(Boolean)
          .join(' '),
      };

      const response = await axios.post('/orders', orderData);
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to create order.');
      }

      const order = response.data.data;
      setCreatedOrderNumber(order?.order_number || `#${order?.id || ''}`);
      fireToast(`Order ${order?.order_number || ''} created successfully.`, 'success');
    } catch (error: any) {
      console.error(error);
      fireToast(error?.response?.data?.message || error?.message || 'Failed to create order.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header darkMode={darkMode} setDarkMode={setDarkMode} toggleSidebar={() => setSidebarOpen(true)} />

      <div className="flex">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        <main className="flex-1 p-4 md:p-6 space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ClipboardPaste className="w-6 h-6" />
                Social Commerce Text Import
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Paste the moderator text, auto-detect customer info + SKU list, then create the social-commerce order.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/social-commerce"
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm hover:bg-white dark:hover:bg-gray-800"
              >
                Open regular page
              </Link>
              <button
                onClick={handleParseAndResolve}
                disabled={isResolving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-medium disabled:opacity-60"
              >
                {isResolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Parse & match products
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                  <ClipboardPaste className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Paste moderator text</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Expected format: first line customer details, next line SKU list, last line total.
                  </p>
                </div>
              </div>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={10}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent p-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
                placeholder={`Sabrina islam 01832239897 mitali 121 raynogor sylhet\n754 901 303\ntotal 2890`}
              />

              <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">How it reads the text</div>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Name = text before the phone number</li>
                  <li>Address = text after the phone number</li>
                  <li>SKUs = numeric tokens on the SKU line(s)</li>
                  <li>Total = number after words like total / bill / amount</li>
                </ul>
              </div>
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Parsed details</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Review and edit before creating the order.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Customer name</span>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Phone</span>
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(normalizePhone(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2"
                  />
                </label>
                <label className="space-y-1 text-sm md:col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Address</span>
                  <textarea
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Target total</span>
                  <input
                    value={targetTotal}
                    onChange={(e) => setTargetTotal(e.target.value.replace(/[^\d.]/g, ''))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2"
                    placeholder="2890"
                  />
                </label>
                <div className="space-y-1 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Moderator</span>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-900/40">
                    {salesBy || 'Not found from local storage'}
                  </div>
                </div>
              </div>

              {existingCustomerName && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                  Existing customer found with this phone: <span className="font-semibold">{existingCustomerName}</span>
                </div>
              )}

              {draft && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 px-4 py-3">
                    <div className="text-gray-500 dark:text-gray-400">Unique SKUs</div>
                    <div className="font-semibold text-lg">{draft.skuList.length}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 px-4 py-3">
                    <div className="text-gray-500 dark:text-gray-400">Parsed quantity</div>
                    <div className="font-semibold text-lg">
                      {Object.values(draft.skuCounts).reduce((sum, qty) => sum + qty, 0)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 px-4 py-3">
                    <div className="text-gray-500 dark:text-gray-400">Pasted total</div>
                    <div className="font-semibold text-lg">
                      {draft.pastedTotal !== null ? `${formatMoney(draft.pastedTotal)} ৳` : 'Not found'}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Product match preview
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Current prices are pulled from the catalog. If the pasted total is lower, discount is auto-distributed across the items.
                </p>
              </div>
              {unresolvedSkus.length > 0 && (
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-4 h-4" />
                  Unmatched: {unresolvedSkus.join(', ')}
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Qty</th>
                    <th className="px-4 py-3 font-medium">Available</th>
                    <th className="px-4 py-3 font-medium">Unit price</th>
                    <th className="px-4 py-3 font-medium">Discount</th>
                    <th className="px-4 py-3 font-medium">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingPreview.lines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        Parse the text first to preview matched products here.
                      </td>
                    </tr>
                  ) : (
                    pricingPreview.lines.map((item) => {
                      const stockIssue = item.available !== null && item.quantity > item.available;
                      return (
                        <tr key={item.code} className="border-t border-gray-100 dark:border-gray-700/70">
                          <td className="px-4 py-3 font-medium">{item.code}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.productName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Matched catalog SKU: {item.sku}</div>
                          </td>
                          <td className="px-4 py-3">{item.quantity}</td>
                          <td className="px-4 py-3">
                            <span className={stockIssue ? 'text-red-600 dark:text-red-300 font-semibold' : ''}>
                              {item.available ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">{formatMoney(item.unitPrice)} ৳</td>
                          <td className="px-4 py-3">{formatMoney(item.discountAmount)} ৳</td>
                          <td className="px-4 py-3 font-semibold">{formatMoney(item.finalAmount)} ৳</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/40 px-4 py-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">Catalog subtotal</div>
                <div className="text-xl font-semibold mt-1">{formatMoney(pricingPreview.computedSubtotal)} ৳</div>
              </div>
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/40 px-4 py-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">Auto discount</div>
                <div className="text-xl font-semibold mt-1">{formatMoney(pricingPreview.totalDiscount)} ৳</div>
              </div>
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/40 px-4 py-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">Shipping / extra</div>
                <div className="text-xl font-semibold mt-1">{formatMoney(pricingPreview.shippingAmount)} ৳</div>
              </div>
              <div className="rounded-2xl bg-black text-white dark:bg-white dark:text-black px-4 py-4">
                <div className="text-sm opacity-80">Final order total</div>
                <div className="text-xl font-semibold mt-1">{formatMoney(pricingPreview.grandTotal)} ৳</div>
              </div>
            </div>

            {hasStockIssue && (
              <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-200">
                One or more requested quantities are higher than the currently available stock. Adjust the pasted SKU list or stock first.
              </div>
            )}

            {createdOrderNumber && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
                Order created successfully: <span className="font-semibold">{createdOrderNumber}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 justify-end">
              <button
                onClick={handleParseAndResolve}
                disabled={isResolving}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900/40 disabled:opacity-60"
              >
                Refresh parse
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={isSubmitting || isResolving || pricingPreview.lines.length === 0 || unresolvedSkus.length > 0 || hasStockIssue}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                Create social-commerce order
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

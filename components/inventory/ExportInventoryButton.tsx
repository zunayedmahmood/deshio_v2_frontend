'use client';

import React, { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import inventoryService, { GlobalInventoryItem } from '@/services/inventoryService';

interface ExportInventoryButtonProps {
  categories: any[];
  allStores: { id: number; name: string }[];
}

export default function ExportInventoryButton({ categories, allStores }: ExportInventoryButtonProps) {
  const [exporting, setExporting] = useState(false);

  const getCategoryPaths = (categoryId: number | undefined, cats: any[]) => {
    if (!categoryId) return { category: 'Uncategorized', subcategory: '-' };
    const cat = cats.find(c => c.id === categoryId);
    if (!cat) return { category: 'Uncategorized', subcategory: '-' };

    if (cat.parent_id) {
      const parent = cats.find(c => c.id === cat.parent_id);
      return {
        category: parent ? parent.title : cat.title,
        subcategory: parent ? cat.title : '-',
      };
    }
    return { category: cat.title, subcategory: '-' };
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      
      // Fetch ALL data
      const response = await inventoryService.getGlobalInventory({ skipStoreScope: true });
      const items = response.data || [];

      // Group by SKU
      const skuMap = new Map<string, {
        sku: string;
        productName: string;
        variations: any[];
        totalStock: number;
      }>();

      items.forEach(item => {
        const sku = item.sku || `NO-SKU-${item.product_id}`;
        if (!skuMap.has(sku)) {
          skuMap.set(sku, {
            sku: item.sku || 'NO-SKU',
            productName: item.base_name || item.product_name,
            variations: [],
            totalStock: 0
          });
        }
        const group = skuMap.get(sku)!;
        group.variations.push(item);
        group.totalStock += item.total_quantity;
      });

      const groups = Array.from(skuMap.values());

      // Generate HTML Table for Excel
      let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Inventory Report</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            table { border-collapse: collapse; }
            th { background-color: #f3f4f6; font-weight: bold; border: 1px solid #d1d5db; padding: 8px; text-align: left; }
            td { border: 1px solid #d1d5db; padding: 8px; vertical-align: top; }
            .text-center { text-align: center; }
            .bg-blue { background-color: #eff6ff; }
            .bg-emerald { background-color: #ecfdf5; }
            .font-bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Subcategory</th>
                <th>Variation</th>
                ${allStores.map(s => `<th>${s.name}</th>`).join('')}
                <th>Available</th>
                <th>Physical</th>
                <th>Reserved</th>
                <th>SKU Total</th>
              </tr>
            </thead>
            <tbody>
      `;

      groups.forEach(group => {
        group.variations.forEach((v, vIdx) => {
          const { category, subcategory } = getCategoryPaths(v.category_id, categories);
          const rowSpan = group.variations.length;

          html += `<tr>`;
          if (vIdx === 0) {
            html += `
              <td rowspan="${rowSpan}">${group.sku}</td>
              <td rowspan="${rowSpan}">${group.productName}</td>
              <td rowspan="${rowSpan}">${category}</td>
              <td rowspan="${rowSpan}">${subcategory}</td>
            `;
          }

          html += `<td>${v.variation_suffix || 'Default'}</td>`;

          // Store columns
          allStores.forEach(store => {
            const storeStock = v.stores.find((s: any) => s.store_id === store.id);
            html += `<td class="text-center">${storeStock ? storeStock.quantity : '-'}</td>`;
          });

          html += `
            <td class="text-center bg-blue">${v.available_quantity || 0}</td>
            <td class="text-center">${v.total_quantity || 0}</td>
            <td class="text-center">${v.reserved_quantity || 0}</td>
          `;

          if (vIdx === 0) {
            html += `<td rowspan="${rowSpan}" class="text-center bg-emerald font-bold">${group.totalStock}</td>`;
          }

          html += `</tr>`;
        });
      });

      html += `
            </tbody>
          </table>
        </body>
        </html>
      `;

      // Download
      const fileName = `Inventory_Report_${new Date().toISOString().split('T')[0]}.xls`;
      const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export inventory data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg transition-colors shadow-sm font-semibold"
    >
      {exporting ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <FileSpreadsheet className="w-5 h-5" />
      )}
      {exporting ? 'Processing All Data...' : 'Print / Export Excel'}
    </button>
  );
}

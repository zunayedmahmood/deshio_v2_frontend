# Browser Alerts List

This document contains a list of all native browser `alert()` calls found in the frontend code of Errum V2. These should be replaced with modern popup modals (e.g., using Radix UI/Dialog or a premium toast system).

## Summary
- **Total occurrences:** 214
- **Files affected:** 45+

---

## Detailed List by File

### [app/defects/page.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/app/defects/page.tsx)
- Line 207: `alert('Please enter barcode');`
- Line 212: `alert('Please enter return reason or mark as used');`
- Line 217: `alert('Please select the store location');`
- Line 247: `alert(error.message || 'Error processing defect');`
- Line 312: `alert('Please enter selling price');`
- Line 329: `alert('Error: Missing batch information. Please try again.');`
- Line 348: `alert(error.message || 'Error processing sale');`
- Line 367: `alert(error.message || 'Error removing defect');`
- Line 389: `alert('Please select items to return');`

### [app/defects/sale/page.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/app/defects/sale/page.tsx)
- Line 114: `alert('Defect data not loaded');`
- Line 119: `alert('Please enter a valid selling price');`

### [app/gallery/page.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/app/gallery/page.tsx)
- Line 229: `alert('Failed to copy. Please try again.');`
- Line 353: `alert('Failed to copy. Please try again.');`

### [app/extra/page.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/app/extra/page.tsx)
- Line 208: `alert('Please enter barcode');`
- Line 213: `alert('Please select at least one: Defect or Used Item');`
- Line 218: `alert('Please enter defect reason');`
- Line 223: `alert('Please select the store location');`
- Line 267: `alert(error.message || 'Error processing item');`
- Line 332: `alert('Please enter selling price');`
- Line 349: `alert('Error: Missing batch information. Please try again.');`
- Line 368: `alert(error.message || 'Error processing sale');`
- Line 387: `alert(error.message || 'Error removing item');`
- Line 409: `alert('Please select items to return');`

### [app/extra/sale/page.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/app/extra/sale/page.tsx)
- Line 114: `alert('Defect data not loaded');`
- Line 119: `alert('Please enter a valid selling price');`

### [app/accounting/page.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/app/accounting/page.tsx)
- Line 76: `alert(error.response?.data?.message || 'Failed to fetch accounting data');`
- Line 106: `alert(error.response?.data?.message || 'Failed to fetch journal entries');`
- Line 135: `alert('Failed to fetch trial balance');`
- Line 139: `alert(error.response?.data?.message || error.message || 'Failed to fetch trial balance');`
- Line 172: `alert(error.response?.data?.message || 'Failed to fetch transactions');`
- Line 196: `alert(error.response?.data?.message || 'Failed to fetch ledger');`
- Line 267: `alert('Failed to export data');`

### [app/product/field/page.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/app/product/field/page.tsx)
- Line 65: `alert('Please fill in all required fields (Name and Type)');`
- Line 91: `alert(errorMessage);`
- Line 102: `alert('Please fill in all required fields (Name and Type)');`
- Line 131: `alert(errorMessage);`
- Line 148: `alert(errorMessage);`

### [app/e-commerce/checkout/page.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/app/e-commerce/checkout/page.tsx)
- Line 138: `alert('Selected items are no longer in your cart. Redirecting...');`

### [app/e-commerce/product/[id]/page.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/app/e-commerce/product/[id]/page.tsx)
- Line 665: `alert(displayMessage);`
- Line 695: `alert(displayMessage);`
- Line 739: `alert('Link copied to clipboard!');`

### [app/e-commerce/cart/page.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/app/e-commerce/cart/page.tsx)
- Line 93: `alert(err.message || 'Failed to update quantity');`
- Line 120: `alert(err.message || 'Failed to remove item');`
- Line 144: `alert(err.message || 'Failed to delete items');`
- Line 160: `alert(err.message || 'Failed to clear cart');`
- Line 190: `alert('Please select at least one item to checkout');`
- Line 200: `alert(`Cart validation failed:\n${issues}`);`
- Line 223: `alert(err.message || 'Failed to proceed to checkout. Please try again.');`
- Line 522: `alert('Coupon functionality coming soon!');`
- Line 563: `alert('Address change functionality coming soon!');`

### [app/pre-order/page.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/app/pre-order/page.tsx)
- Line 76: `alert('Error: ' + message);`
- Line 79: `alert(message);`
- Line 326: `alert('Please select a product and enter quantity');`
- Line 352: `alert('Please fill in customer name and phone number');`
- Line 356: `alert('Please add products to cart');`
- Line 360: `alert('Please select a store');`
- Line 372: `alert(`Please fill in the following international address fields:\n• ${missingFields.join('\n• ')}`);`
- Line 383: `alert(`Please fill in the following delivery address fields:\n• ${missingFields.join('\n• ')}`);`

### [app/employees/page.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/app/employees/page.tsx)
- Line 136: `alert('Failed to delete employee');`
- Line 147: `alert('Failed to activate employee');`
- Line 160: `alert('Failed to deactivate employee');`
- Line 166: `alert('Please select employees first');`
- Line 182: `alert('Failed to update employee status');`

### [app/employees/[id]/page.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/app/employees/%5Bid%5D/page.tsx)
- Line 70: `alert('Failed to load employee details');`
- Line 83: `alert('Failed to activate employee');`
- Line 94: `alert('Failed to deactivate employee');`
- Line 105: `alert('Failed to delete employee');`

### [app/campaigns/page.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/app/campaigns/page.tsx)
- Line 277: `alert(err?.response?.data?.message || 'Failed to delete');`

### [app/purchase-history/page.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/app/purchase-history/page.tsx)
- Line 233: `alert('Failed to delete order. Please try again.');`
- Line 246: `alert('Failed to load order details. Please try again.');`
- Line 265: `alert('Failed to load order details. Please try again.');`
- Line 281: `alert('QZ Tray is offline. Opening receipt preview (Print → Save as PDF).');`
- Line 286: `alert(`✅ Receipt printed for order #${fullOrder.order_number || fullOrder.id}`);`
- Line 289: `alert(`Failed to print receipt: ${error?.message || 'Unknown error'}`);`
- Line 380: `alert('✅ Return processed successfully!');`
- Line 386: `alert(`Error: ${errorMsg}`);`
- Line 556: `alert(baseMessage + financialMessage);`
- Line 587: `alert(successMessage);`
- Line 600: `alert(`❌ Exchange failed: ${errorMsg}\n\nPlease check the console for details.`);`

### [app/orders/OrdersClient.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/app/orders/OrdersClient.tsx)
- Line 1171: `alert('Failed to fetch orders: ' + (error?.message || 'Unknown error'));`
- Line 1380: `alert('Failed to load order details: ' + error.message);`
- Line 1419: `alert('Order marker updated successfully');`
- Line 1421: `alert(e?.message || 'Failed to update order marker');`
- Line 1466: `alert(e?.message || 'Failed to open installment modal');`
- Line 1477: `alert('Please select a payment method');`
- Line 1481: `alert('Please enter a valid amount');`
- Line 1507: `alert('Installment payment added successfully');`
- Line 1510: `alert(e?.message || 'Failed to add installment payment');`
- Line 1535: `alert('Failed to load order details: ' + error.message);`
- Line 1553: `alert('Order updated, but failed to refresh details. Please reopen the editor.');`
- Line 1568: `alert(...)`
- Line 1578: `alert('Failed to load order details for return. Please try again.');`
- Line 1588: `alert(...)`
- Line 1598: `alert('Failed to load order details for exchange. Please try again.');`
- Line 1672: `alert('✅ Return processed successfully!');`
- Line 1679: `alert(`Error: ${errorMsg}`);`
- Line 1801: `alert(msg);`
- Line 1808: `alert(`❌ Exchange failed: ${errorMsg}`);`
- Line 1818: `alert('Order cancelled successfully!');`
- Line 1821: `alert(`Failed to cancel order: ${error.message}`);`
- Line 1916: `alert('Please select at least one order to send to Pathao.');`
- Line 1996: `alert(`Bulk Send to Pathao Completed!\n\nSuccess: ${successCount}\nFailed: ${failedCount}`);`
- Line 2107: `alert(`Bulk Send to Pathao Completed!\n\nSuccess: ${successCount}\nFailed: ${failedCount}`);`
- Line 2143: `alert(`Failed to complete bulk send: ${error?.response?.data?.message || error.message || 'Unknown error'}`);`
- Line 2170: `alert('Please select at least one order to print.');`
- Line 2178: `alert('No Social Commerce orders selected. Please select Social Commerce orders to print invoices.');`
- Line 2220: `alert('Opened invoice preview. Use Print → Save as PDF.');`
- Line 2244: `alert(`Bulk invoice print completed!\nSuccess: ${successCount}\nFailed: ${failedCount}`);`
- Line 2256: `alert('Please select at least one order to print.');`
- Line 2277: `alert('Please select a printer first.');`
- Line 2316: `alert('Opened receipt preview. Use Print → Save as PDF.');`
- Line 2340: `alert(`Bulk print completed!\nSuccess: ${successCount}\nFailed: ${failedCount}`);`
- Line 2365: `alert(`Already sent to Pathao.\nConsignment ID: ${shipment.pathao_consignment_id}`);`
- Line 2380: `alert('Failed to create/get shipment ID for this order.');`
- Line 2385: `alert(...)`
- Line 2401: `alert(`Failed to send to Pathao: ${error?.response?.data?.message || error.message || 'Unknown error'}`);`
- Line 2431: `alert('Please select a printer first.');`
- Line 2436: `alert('QZ Tray is offline. Opening receipt preview (Print → Save as PDF).');`
- Line 2442: `alert('✅ Receipt ready (printed or opened in preview)!');`
- Line 2445: `alert(`Failed to print receipt: ${error?.message || 'Unknown error'}`);`
- Line 2453: `alert('Invoice printing is only available for Social Commerce orders.');`
- Line 2475: `alert('QZ Tray is offline. Opening invoice preview (Print → Save as PDF).');`
- Line 2484: `alert('✅ Invoice ready (printed or opened in preview)!');`
- Line 2487: `alert(`Failed to print invoice: ${error?.message || 'Unknown error'}`);`
- Line 2662: `alert(msg);`
- Line 2668: `alert('Store information is missing for this order.');`
- Line 2777: `alert(msg);`
- Line 2802: `alert(msg);`
- Line 3001: `alert('Order updated successfully.');`
- Line 3004: `alert(response.data?.message || 'Failed to update order.');`
- Line 3015: `alert(msg);`
- Line 4209: `alert('Consignment ID copied');`

### [app/pos/page.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/app/pos/page.tsx)
- Line 995: `alert(...)`
- Line 1046: `alert(`Error: ${errorMessage}\n\nCheck console for details.`);`

### [app/social-commerce/page.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/app/social-commerce/page.tsx)
- Line 119: `alert('Error: ' + message);`
- Line 122: `alert(message);`
- Line 647: `alert('Please select a product and enter quantity');`
- Line 657: `alert(`Only ${selectedProduct.available} units available across all branches`);`
- Line 703: `alert('Please fill in customer name and phone number');`
- Line 707: `alert('Please add products to cart');`
- Line 714: `alert('Please fill in international address');`
- Line 719: `alert('Please enter full delivery address');`
- Line 802: `alert('Failed to process order');`

### [lib/receiptHtml.ts](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/lib/receiptHtml.ts)
- Line 147: `alert('Popup blocked. Please allow popups to preview receipt.');`
- Line 159: `alert('Popup blocked. Please allow popups to preview receipts.');`

### [components/AddItemModal.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/components/AddItemModal.tsx)
- Line 60: `alert('Please fill in all fields');`

### [components/ReturnToVendorModal.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/components/ReturnToVendorModal.tsx)
- Line 71: `alert('Please select a vendor');`
- Line 76: `alert('Please provide return notes');`

### [components/ecommerce/cart/CartItem.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/components/ecommerce/cart/CartItem.tsx)
- Line 61: `alert(error.message || 'Failed to update quantity');`
- Line 85: `alert(error.message || 'Failed to update quantity');`
- Line 109: `alert(error.message || 'Failed to remove item');`

### [components/sales/ExchangeProductModal.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/components/sales/ExchangeProductModal.tsx)
- Line 250: `alert(`Only ${p.available} units available`);`
- Line 315: `alert('Please select at least one product to exchange');`
- Line 320: `alert('Please add replacement products');`
- Line 330: `alert('Please set valid quantities for all selected products');`
- Line 405: `alert(error.message || 'Failed to process exchange');`
- Line 642: `onError={(msg) => alert(msg)}`

### [components/sales/ReturnProductModal.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/components/sales/ReturnProductModal.tsx)
- Line 218: `alert('Please select at least one product to return');`
- Line 228: `alert('Please set quantities for all selected products');`
- Line 276: `alert(error.message || 'Failed to process return');`

### [components/AddCategoryDialog.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/components/AddCategoryDialog.tsx)
- Line 190: `alert('Please fill in title');`

### [components/MultiBarcodePrinter.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/components/MultiBarcodePrinter.tsx)
- Line 386: `alert("QZ Tray library not loaded. Please refresh the page or install QZ Tray.");`
- Line 395: `alert("No printer available. Please set a default printer and try again.");`
- Line 401: `alert("Nothing selected to print.");`
- Line 446: `alert(`✅ ${data.length} label(s) sent to printer "${printerToUse}" successfully!`);`
- Line 452: `alert(...)`
- Line 456: `alert(`Print failed: ${msg}`);`

### [components/employees/CreateEmployeeModal.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/components/employees/CreateEmployeeModal.tsx)
- Line 136: `alert('Employee created successfully!');`
- Line 146: `alert(error.response?.data?.message || 'Failed to create employee');`

### [components/employees/EditEmployeeModal.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/components/employees/EditEmployeeModal.tsx)
- Line 119: `alert('Employee updated successfully!');`
- Line 128: `alert(error.response?.data?.message || 'Failed to update employee');`

### [components/BatchPrinter.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/components/BatchPrinter.tsx)
- Line 442: `alert("QZ Tray library not loaded. Please refresh the page or install QZ Tray.");`
- Line 453: `alert("No printer available. Please check your printer settings and try again.");`
- Line 498: `alert(`✅ ${data.length} barcode(s) sent to printer "${printerToUse}" successfully!`);`
- Line 504: `alert(...)`
- Line 508: `alert("Printer not properly configured. Reloading printer settings...");`
- Line 511: `alert(`Print failed: ${err.message || "Unknown error"}`);`

### [components/StoreCard.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/components/StoreCard.tsx)
- Line 54: `alert(error.response?.data?.message || 'Failed to delete store');`

### [components/dispatch/CreateDispatchModal.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/components/dispatch/CreateDispatchModal.tsx)
- Line 159: `alert('Failed to fetch available batches');`
- Line 195: `alert('Failed to load batch details');`
- Line 210: `alert('Please select a batch and enter quantity');`
- Line 216: `alert(`Only ${batchData.quantity} active units available`);`
- Line 221: `alert('This batch has already been added');`
- Line 431: `alert('Please fill in all required fields and add at least one item');`

### [components/orders/EditOrderModal.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/components/orders/EditOrderModal.tsx)
- Line 90: `alert('Please select a product and enter a valid quantity');`
- Line 127: `alert(`Updated ${selectedProduct.name}: Quantity increased to ${newQty}`);`
- Line 184: `alert('Cannot remove the last product. Order must have at least one product.');`
- Line 259: `alert('Failed to save order. Please try again.');`

### [components/orders/ExchangeProductModal.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/components/orders/ExchangeProductModal.tsx)
- Line 194: `alert('Please enter quantity');`
- Line 200: `alert('Please enter a valid quantity');`
- Line 208: `alert(`Only ${availableQty} units available for this batch`);`
- Line 221: `alert(`Only ${availableQty} units available for this batch. You already have ${updated[existingIndex].quantity} in cart.`);`
- Line 260: `alert(`Only ${product.available} units available for this batch`);`
- Line 317: `alert('Please select at least one product to exchange');`
- Line 322: `alert('Please select replacement products');`
- Line 332: `alert('Please set quantities for all selected products');`
- Line 381: `alert('Exchange processed successfully!');`
- Line 385: `alert(error.message || 'Failed to process exchange');`

### [components/orders/ReturnProductModal.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/components/orders/ReturnProductModal.tsx)
- Line 114: `alert('Please select at least one product to return');`
- Line 124: `alert('Please set quantities for all selected products');`
- Line 190: `alert(message);`
- Line 194: `alert(error.message || 'Failed to process return');`

### [components/orders/OrderDetailsModal.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/components/orders/OrderDetailsModal.tsx)
- Line 55: `alert('Please select a printer first.');`
- Line 60: `alert('QZ Tray is offline. Opening receipt preview (Print → Save as PDF).');`
- Line 66: `alert(`Receipt ready for Order #${order.orderNumber || order.id}`);`
- Line 69: `alert(`Failed to print receipt: ${error?.message || 'Unknown error'}`);`
- Line 101: `alert(`This order already has a Pathao shipment.\nConsignment ID: ${existingShipment.pathao_consignment_id}`);`
- Line 107: `alert(`Order sent to Pathao successfully!\nConsignment ID: ${updatedShipment.pathao_consignment_id}\nTracking: ${updatedShipment.pathao_tracking_number}`);`
- Line 119: `alert(`Shipment created and sent to Pathao successfully!\nShipment #: ${shipment.shipment_number}\nConsignment ID: ${shipment.pathao_consignment_id}`);`
- Line 122: `alert(`Failed to send to Pathao: ${error.message}`);`

### [components/GroupedAllBarcodesPrinter.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/components/GroupedAllBarcodesPrinter.tsx)
- Line 81: `alert("No barcodes found to print.");`
- Line 98: `alert(e?.message || "Failed to prepare barcodes");`

### [components/NewCategoryForm.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/components/NewCategoryForm.tsx)
- Line 29: `alert('Failed to create category. Please try again.');`

### [components/BarcodeSelectionModal.tsx](file:///home/zunayed-mahmood-tahsin/storage/Fullstack-Laravel-Next/errum_v2/components/BarcodeSelectionModal.tsx)
- Line 75: `alert("Please select at least one barcode to print");`

---
*Note: This list covers basic `alert()` calls. It is recommended to use the project's global toast system or specialized Radix UI Dialog components for a premium user experience.*

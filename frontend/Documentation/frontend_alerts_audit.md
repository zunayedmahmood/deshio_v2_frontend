# Browser Alerts Audit - Frontend

This document contains a comprehensive list of all native `alert()` calls found in the Errum V2 frontend code. These should be replaced with consistent, stylish pop-up modals or toast notifications to improve the user experience.

---

## Components

### `components/AddItemModal.tsx`
- **L60**: `alert('Please fill in all fields');`

### `components/BarcodeSelectionModal.tsx`
- **L75**: `alert("Please select at least one barcode to print");`

### `components/GroupedAllBarcodesPrinter.tsx`
- **L81**: `alert("No barcodes found to print.");`
- **L98**: `alert(e?.message || "Failed to prepare barcodes");`

### `components/NewCategoryForm.tsx`
- **L29**: `alert('Failed to create category. Please try again.');`

### `components/orders/ReturnProductModal.tsx`
- **L114**: `alert('Please select at least one product to return');`
- **L124**: `alert('Please set quantities for all selected products');`
- **L190**: `alert(message);`
- **L194**: `alert(error.message || 'Failed to process return');`

### `components/orders/ExchangeProductModal.tsx`
- **L194**: `alert('Please enter quantity');`
- **L200**: `alert('Please enter a valid quantity');`
- **L208**: `alert(\`Only ${availableQty} units available for this batch\`);`
- **L221**: `alert(\`Only ${availableQty} units available for this batch. You already have ${updated[existingIndex].quantity} in cart.\`);`
- **L260**: `alert(\`Only ${product.available} units available for this batch\`);`
- **L317**: `alert('Please select at least one product to exchange');`
- **L322**: `alert('Please select replacement products');`
- **L332**: `alert('Please set quantities for all selected products');`
- **L381**: `alert('Exchange processed successfully!');`
- **L385**: `alert(error.message || 'Failed to process exchange');`

### `components/orders/OrderDetailsModal.tsx`
- **L55**: `alert('Please select a printer first.');`
- **L60**: `alert('QZ Tray is offline. Opening receipt preview (Print → Save as PDF).');`
- **L66**: `alert(\`Receipt ready for Order #${order.orderNumber || order.id}\`);`
- **L69**: `alert(\`Failed to print receipt: ${error?.message || 'Unknown error'}\`);`
- **L101**: `alert(\`This order already has a Pathao shipment.\nConsignment ID: ${existingShipment.pathao_consignment_id}\`);`
- **L107**: `alert(\`Order sent to Pathao successfully!\nConsignment ID: ${updatedShipment.pathao_consignment_id}\nTracking: ${updatedShipment.pathao_tracking_number}\`);`
- **L119**: `alert(\`Shipment created and sent to Pathao successfully!\nShipment #: ${shipment.shipment_number}\nConsignment ID: ${shipment.pathao_consignment_id}\`);`
- **L122**: `alert(\`Failed to send to Pathao: ${error.message}\`);`

### `components/orders/EditOrderModal.tsx`
- **L90**: `alert('Please select a product and enter a valid quantity');`
- **L127**: `alert(\`Updated ${selectedProduct.name}: Quantity increased to ${newQty}\`);`
- **L184**: `alert('Cannot remove the last product. Order must have at least one product.');`
- **L259**: `alert('Failed to save order. Please try again.');`

### `components/dispatch/CreateDispatchModal.tsx`
- **L159**: `alert('Failed to fetch available batches');`
- **L195**: `alert('Failed to load batch details');`
- **L210**: `alert('Please select a batch and enter quantity');`
- **L216**: `alert(\`Only ${batchData.quantity} active units available\`);`
- **L221**: `alert('This batch has already been added');`
- **L431**: `alert('Please fill in all required fields and add at least one item');`

### `components/StoreCard.tsx`
- **L54**: `alert(error.response?.data?.message || 'Failed to delete store');`

### `components/BatchPrinter.tsx`
- **L442**: `alert("QZ Tray library not loaded. Please refresh the page or install QZ Tray.");`
- **L453**: `alert("No printer available. Please check your printer settings and try again.");`
- **L498**: `alert(\`✅ ${data.length} barcode(s) sent to printer "${printerToUse}" successfully!\`);`
- **L504**: `alert(...)`
- **L508**: `alert("Printer not properly configured. Reloading printer settings...");`
- **L511**: `alert(\`Print failed: ${err.message || "Unknown error"}\`);`

### `components/employees/CreateEmployeeModal.tsx`
- **L136**: `alert('Employee created successfully!');`
- **L146**: `alert(error.response?.data?.message || 'Failed to create employee');`

### `components/employees/EditEmployeeModal.tsx`
- **L119**: `alert('Employee updated successfully!');`
- **L128**: `alert(error.response?.data?.message || 'Failed to update employee');`

### `components/AddCategoryDialog.tsx`
- **L190**: `alert('Please fill in title');`

### `components/MultiBarcodePrinter.tsx`
- **L386**: `alert("QZ Tray library not loaded. Please refresh the page or install QZ Tray.");`
- **L395**: `alert("No printer available. Please set a default printer and try again.");`
- **L401**: `alert("Nothing selected to print.");`
- **L446**: `alert(\`✅ ${data.length} label(s) sent to printer "${printerToUse}" successfully!\`);`
- **L452**: `alert(...)`
- **L456**: `alert(\`Print failed: ${msg}\`);`

### `components/sales/ReturnProductModal.tsx`
- **L218**: `alert('Please select at least one product to return');`
- **L228**: `alert('Please set quantities for all selected products');`
- **L276**: `alert(error.message || 'Failed to process return');`

### `components/ReturnToVendorModal.tsx`
- **L71**: `alert('Please select a vendor');`
- **L76**: `alert('Please provide return notes');`

### `components/sales/ExchangeProductModal.tsx`
- **L250**: `alert(\`Only ${p.available} units available\`);`
- **L315**: `alert('Please select at least one product to exchange');`
- **L320**: `alert('Please add replacement products');`
- **L330**: `alert('Please set valid quantities for all selected products');`
- **L405**: `alert(error.message || 'Failed to process exchange');`
- **L642**: `onError={(msg) => alert(msg)}`

### `components/ecommerce/cart/CartItem.tsx`
- **L61**: `alert(error.message || 'Failed to update quantity');`
- **L85**: `alert(error.message || 'Failed to update quantity');`
- **L109**: `alert(error.message || 'Failed to remove item');`

---

## App Pages

### `app/social-commerce/page.tsx`
- **L119**: `alert('Error: ' + message);`
- **L122**: `alert(message);`
- **L647**: `alert('Please select a product and enter quantity');`
- **L657**: `alert(\`Only ${selectedProduct.available} units available across all branches\`);`
- **L703**: `alert('Please fill in customer name and phone number');`
- **L707**: `alert('Please add products to cart');`
- **L714**: `alert('Please fill in international address');`
- **L719**: `alert('Please enter full delivery address');`
- **L802**: `alert('Failed to process order');`

### `app/pos/page.tsx`
- **L995**: `alert(...)`
- **L1046**: `alert(\`Error: ${errorMessage}\n\nCheck console for details.\`);`

### `app/purchase-history/page.tsx`
- **L233**: `alert('Failed to delete order. Please try again.');`
- **L246**: `alert('Failed to load order details. Please try again.');`
- **L265**: `alert('Failed to load order details. Please try again.');`
- **L281**: `alert('QZ Tray is offline. Opening receipt preview (Print → Save as PDF).');`
- **L286**: `alert(\`✅ Receipt printed for order #${fullOrder.order_number || fullOrder.id}\`);`
- **L289**: `alert(\`Failed to print receipt: ${error?.message || 'Unknown error'}\`);`
- **L380**: `alert('✅ Return processed successfully!');`
- **L386**: `alert(\`Error: ${errorMsg}\`);`
- **L556**: `alert(baseMessage + financialMessage);`
- **L587**: `alert(successMessage);`
- **L600**: `alert(\`❌ Exchange failed: ${errorMsg}\n\nPlease check the console for details.\`);`

### `app/orders/OrdersClient.tsx`
- **L1171**: `alert('Failed to fetch orders: ' + (error?.message || 'Unknown error'));`
- **L1380**: `alert('Failed to load order details: ' + error.message);`
- **L1419**: `alert('Order marker updated successfully');`
- **L1421**: `alert(e?.message || 'Failed to update order marker');`
- **L1466**: `alert(e?.message || 'Failed to open installment modal');`
- **L1477**: `alert('Please select a payment method');`
- **L1481**: `alert('Please enter a valid amount');`
- **L1507**: `alert('Installment payment added successfully');`
- **L1510**: `alert(e?.message || 'Failed to add installment payment');`
- **L1535**: `alert('Failed to load order details: ' + error.message);`
- **L1553**: `alert('Order updated, but failed to refresh details. Please reopen the editor.');`
- **L1568**: `alert(...)`
- **L1578**: `alert('Failed to load order details for return. Please try again.');`
- **L1588**: `alert(...)`
- **L1598**: `alert('Failed to load order details for exchange. Please try again.');`
- **L1672**: `alert('✅ Return processed successfully!');`
- **L1679**: `alert(\`Error: ${errorMsg}\`);`
- **L1801**: `alert(msg);`
- **L1808**: `alert(\`❌ Exchange failed: ${errorMsg}\`);`
- **L1818**: `alert('Order cancelled successfully!');`
- **L1821**: `alert(\`Failed to cancel order: ${error.message}\`);`
- **L1916**: `alert('Please select at least one order to send to Pathao.');`
- **L1996**: `alert(\`Bulk Send to Pathao Completed!\n\nSuccess: ${successCount}\nFailed: ${failedCount}\`);`
- **L2107**: `alert(\`Bulk Send to Pathao Completed!\n\nSuccess: ${successCount}\nFailed: ${failedCount}\`);`
- **L2143**: `alert(\`Failed to complete bulk send: ${error?.response?.data?.message || error.message || 'Unknown error'}\`);`
- **L2170**: `alert('Please select at least one order to print.');`
- **L2178**: `alert('No Social Commerce orders selected. Please select Social Commerce orders to print invoices.');`
- **L2220**: `alert('Opened invoice preview. Use Print → Save as PDF.');`
- **L2244**: `alert(\`Bulk invoice print completed!\nSuccess: ${successCount}\nFailed: ${failedCount}\`);`
- **L2256**: `alert('Please select at least one order to print.');`
- **L2277**: `alert('Please select a printer first.');`
- **L2316**: `alert('Opened receipt preview. Use Print → Save as PDF.');`
- **L2340**: `alert(\`Bulk print completed!\nSuccess: ${successCount}\nFailed: ${failedCount}\`);`
- **L2365**: `alert(\`Already sent to Pathao.\nConsignment ID: ${shipment.pathao_consignment_id}\`);`
- **L2380**: `alert('Failed to create/get shipment ID for this order.');`
- **L2385**: `alert(...)`
- **L2401**: `alert(\`Failed to send to Pathao: ${error?.response?.data?.message || error.message || 'Unknown error'}\`);`
- **L2431**: `alert('Please select a printer first.');`
- **L2436**: `alert('QZ Tray is offline. Opening receipt preview (Print → Save as PDF).');`
- **L2442**: `alert('✅ Receipt ready (printed or opened in preview)!');`
- **L2445**: `alert(\`Failed to print receipt: ${error?.message || 'Unknown error'}\`);`
- **L2453**: `alert('Invoice printing is only available for Social Commerce orders.');`
- **L2475**: `alert('QZ Tray is offline. Opening invoice preview (Print → Save as PDF).');`
- **L2484**: `alert('✅ Invoice ready (printed or opened in preview)!');`
- **L2487**: `alert(\`Failed to print invoice: ${error?.message || 'Unknown error'}\`);`
- **L2662**: `alert(msg);`
- **L2668**: `alert('Store information is missing for this order.');`
- **L2777**: `alert(msg);`
- **L2802**: `alert(msg);`
- **L3001**: `alert('Order updated successfully.');`
- **L3004**: `alert(response.data?.message || 'Failed to update order.');`
- **L3015**: `alert(msg);`
- **L4209**: `alert('Consignment ID copied');`

### `app/campaigns/page.tsx`
- **L277**: `catch (err: any) { alert(err?.response?.data?.message || 'Failed to delete'); }`

### `app/employees/page.tsx`
- **L136**: `alert('Failed to delete employee');`
- **L147**: `alert('Failed to activate employee');`
- **L160**: `alert('Failed to deactivate employee');`
- **L166**: `alert('Please select employees first');`
- **L182**: `alert('Failed to update employee status');`

### `app/employees/[id]/page.tsx`
- **L70**: `alert('Failed to load employee details');`
- **L83**: `alert('Failed to activate employee');`
- **L94**: `alert('Failed to deactivate employee');`
- **L105**: `alert('Failed to delete employee');`

### `app/pre-order/page.tsx`
- **L76**: `alert('Error: ' + message);`
- **L79**: `alert(message);`
- **L326**: `alert('Please select a product and enter quantity');`
- **L352**: `alert('Please fill in customer name and phone number');`
- **L356**: `alert('Please add products to cart');`
- **L360**: `alert('Please select a store');`
- **L372**: `alert(\`Please fill in the following international address fields:\n• ${missingFields.join('\n• ')}\`);`
- **L383**: `alert(\`Please fill in the following delivery address fields:\n• ${missingFields.join('\n• ')}\`);`

### `app/e-commerce/cart/page.tsx`
- **L93**: `alert(err.message || 'Failed to update quantity');`
- **L120**: `alert(err.message || 'Failed to remove item');`
- **L144**: `alert(err.message || 'Failed to delete items');`
- **L160**: `alert(err.message || 'Failed to clear cart');`
- **L190**: `alert('Please select at least one item to checkout');`
- **L200**: `alert(\`Cart validation failed:\n${issues}\`);`
- **L223**: `alert(err.message || 'Failed to proceed to checkout. Please try again.');`
- **L522**: `alert('Coupon functionality coming soon!');`
- **L563**: `alert('Address change functionality coming soon!');`

### `app/e-commerce/product/[id]/page.tsx`
- **L665**: `alert(displayMessage);`
- **L695**: `alert(displayMessage);`
- **L739**: `alert('Link copied to clipboard!');`

### `app/e-commerce/checkout/page.tsx`
- **L138**: `alert('Selected items are no longer in your cart. Redirecting...');`

### `app/product/field/page.tsx`
- **L65**: `alert('Please fill in all required fields (Name and Type)');`
- **L91**: `alert(errorMessage);`
- **L102**: `alert('Please fill in all required fields (Name and Type)');`
- **L131**: `alert(errorMessage);`
- **L148**: `alert(errorMessage);`

### `app/accounting/page.tsx`
- **L76**: `alert(error.response?.data?.message || 'Failed to fetch accounting data');`
- **L106**: `alert(error.response?.data?.message || 'Failed to fetch journal entries');`
- **L135**: `alert('Failed to fetch trial balance');`
- **L139**: `alert(error.response?.data?.message || error.message || 'Failed to fetch trial balance');`
- **L172**: `alert(error.response?.data?.message || 'Failed to fetch transactions');`
- **L196**: `alert(error.response?.data?.message || 'Failed to fetch ledger');`
- **L267**: `alert('Failed to export data');`

### `app/extra/sale/page.tsx`
- **L114**: `alert('Defect data not loaded');`
- **L119**: `alert('Please enter a valid selling price');`

### `app/extra/page.tsx`
- **L208**: `alert('Please enter barcode');`
- **L213**: `alert('Please select at least one: Defect or Used Item');`
- **L218**: `alert('Please enter defect reason');`
- **L223**: `alert('Please select the store location');`
- **L267**: `alert(error.message || 'Error processing item');`
- **L332**: `alert('Please enter selling price');`
- **L349**: `alert('Error: Missing batch information. Please try again.');`
- **L368**: `alert(error.message || 'Error processing sale');`
- **L387**: `alert(error.message || 'Error removing item');`
- **L409**: `alert('Please select items to return');`

### `app/gallery/page.tsx`
- **L229**: `alert('Failed to copy. Please try again.');`
- **L353**: `alert('Failed to copy. Please try again.');`

### `app/defects/sale/page.tsx`
- **L114**: `alert('Defect data not loaded');`
- **L119**: `alert('Please enter a valid selling price');`

### `app/defects/page.tsx`
- **L207**: `alert('Please enter barcode');`
- **L212**: `alert('Please enter return reason or mark as used');`
- **L217**: `alert('Please select the store location');`
- **L247**: `alert(error.message || 'Error processing defect');`
- **L312**: `alert('Please enter selling price');`
- **L329**: `alert('Error: Missing batch information. Please try again.');`
- **L348**: `alert(error.message || 'Error processing sale');`
- **L367**: `alert(error.message || 'Error removing defect');`
- **L389**: `alert('Please select items to return');`

---

## Libraries

### `lib/receiptHtml.ts`
- **L147**: `alert('Popup blocked. Please allow popups to preview receipt.');`
- **L159**: `alert('Popup blocked. Please allow popups to preview receipts.');`

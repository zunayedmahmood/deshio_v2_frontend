'use client';

import { useState, useEffect } from 'react';
import { useTheme } from "@/contexts/ThemeContext";
import { Search, Barcode, User, Package, Trash2, ShoppingCart, AlertCircle, StoreIcon, ChevronDown, ChevronUp, Calendar, MapPin, Image as ImageIcon, Truck, RotateCcw, X, DollarSign } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import SellDefectModal from '@/components/SellDefectModal';
import ReturnToVendorModal from '@/components/ReturnToVendorModal';
import Toast from '@/components/Toast';
import defectIntegrationService from '@/services/defectIntegrationService';
import storeService from '@/services/storeService';
import { vendorService } from '@/services/vendorService';
import defectiveProductService from '@/services/defectiveProductService';
import type { DefectiveProduct } from '@/services/defectiveProductService';
import type { Store } from '@/services/storeService';
import type { Vendor } from '@/services/vendorService';

interface DefectItem {
  id: string;
  barcode: string;
  productId: number;
  productName: string;
  status: 'pending' | 'approved' | 'sold' | 'returned_to_vendor';
  addedBy: string;
  addedAt: string;
  originalOrderId?: number;
  customerPhone?: string;
  sellingPrice?: number;
  originalSellingPrice?: number;
  costPrice?: number;
  costPriceSource?: string;
  vendorReturnValue?: number;
  returnReason?: string;
  store?: string;
  storeId?: number;
  vendor?: string;
  vendorId?: number;
  vendorName?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  image?: string;
  batchId?: number;
  barcodeStatus?: string;
}

interface DefectSaleItem extends DefectItem {
  batchId: number;
  sellingPrice: number;
  storeId?: number;
}

const formatPrice = (price: number | undefined | null): string => {
  if (price === undefined || price === null) return '0.00';
  const numPrice = typeof price === 'string' ? parseFloat(price) : Number(price);
  if (isNaN(numPrice)) return '0.00';
  return numPrice.toFixed(2);
};

export default function DefectsPage() {
  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [defects, setDefects] = useState<DefectItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [expandedDefect, setExpandedDefect] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'defects' | 'used' | 'employee_use'>('all');
  
  // Defect Identification
  const [barcodeInput, setBarcodeInput] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [isUsedItem, setIsUsedItem] = useState(false);
  const [isEmployeeUsage, setIsEmployeeUsage] = useState(false);
  const [isDefect, setIsDefect] = useState(false);
  const [storeForDefect, setStoreForDefect] = useState('');
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [defectImage, setDefectImage] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Toast state
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    show: false,
    message: '',
    type: 'success',
  });
  
  // Sell modal
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<DefectItem | null>(null);
  const [sellPrice, setSellPrice] = useState('');
  const [sellType, setSellType] = useState<'pos' | 'social'>('pos');

  // Bulk sell modal
  const [bulkSellModalOpen, setBulkSellModalOpen] = useState(false);
  const [bulkSellItems, setBulkSellItems] = useState<DefectSaleItem[]>([]);
  const [bulkSellPrices, setBulkSellPrices] = useState<Record<string, string>>({});
  const [bulkSellType, setBulkSellType] = useState<'pos' | 'social'>('pos');
  
  // Vendor return
  const [returnToVendorModalOpen, setReturnToVendorModalOpen] = useState(false);
  const [selectedDefectsForVendor, setSelectedDefectsForVendor] = useState<string[]>([]);

  useEffect(() => {
    fetchStores();
    fetchVendors();
    fetchDefects();
  }, []);

  useEffect(() => {
    fetchDefects();
  }, [selectedStore, selectedVendor]);

  const fetchStores = async () => {
    try {
      const result = await storeService.getStores({ is_active: true });
      if (result.success) {
        const storesData = Array.isArray(result.data) 
          ? result.data 
          : (result.data?.data || []);
        setStores(storesData);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const vendorsData = await vendorService.getAll({ is_active: true });
      setVendors(vendorsData);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchDefects = async () => {
    try {
      const filters: any = {
        per_page: -1
      };
      if (selectedStore !== 'all') {
        filters.store_id = parseInt(selectedStore);
      }
      if (selectedVendor !== 'all') {
        filters.vendor_id = parseInt(selectedVendor);
      }
      
      const result = await defectIntegrationService.getDefectiveProducts(filters);
      
      const defectiveData = result.data?.data || result.data || [];
      
      const transformedDefects: DefectItem[] = defectiveData.map((d: DefectiveProduct) => {
        let imageUrl: string | undefined = undefined;
        
        if (d.defect_images && Array.isArray(d.defect_images) && d.defect_images.length > 0) {
          const imagePath = d.defect_images[0];
          
          if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            imageUrl = imagePath;
          } else {
            const cleanPath = imagePath.replace(/^\/+/, '');
            let apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
            apiUrl = apiUrl.replace(/\/api\/?$/, '');
            
            if (apiUrl) {
              imageUrl = `${apiUrl}/storage/${cleanPath}`;
            } else {
              imageUrl = `/storage/${cleanPath}`;
            }
          }
        }

        const parsePrice = (value: any): number | undefined => {
          if (value === null || value === undefined) return undefined;
          const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
          return isNaN(parsed) ? undefined : parsed;
        };

        let mappedStatus: 'pending' | 'approved' | 'sold' | 'returned_to_vendor';
        if (d.status === 'available_for_sale') {
          mappedStatus = 'approved';
        } else if (d.status === 'sold') {
          mappedStatus = 'sold';
        } else if (d.status === 'returned_to_vendor') {
          mappedStatus = 'returned_to_vendor';
        } else if (d.status === 'identified' || d.status === 'inspected') {
          mappedStatus = 'pending';
        } else {
          mappedStatus = 'pending';
        }

        return {
          id: d.id.toString(),
          barcode: d.barcode?.barcode || '',
          productId: d.product_id,
          productName: d.product?.name || 'Unknown Product',
          status: mappedStatus,
          addedBy: d.identifiedBy?.name || 'System',
          addedAt: d.identified_at,
          originalSellingPrice: parsePrice(d.original_price),
          costPrice: parsePrice(
            d.cost_price ??
            d.vendor_return_value ??
            d.metadata?.vendor_return_unit_cost ??
            d.metadata?.cost_price_snapshot ??
            d.batch?.cost_price ??
            d.barcode?.batch?.cost_price ??
            d.product?.cost_price
          ),
          costPriceSource: d.cost_price_source || d.metadata?.vendor_return_cost_source,
          vendorReturnValue: parsePrice(d.vendor_return_value),
          returnReason: d.defect_description,
          store: d.store?.name,
          storeId: d.store_id,
          vendor: d.product?.vendor?.name || d.product?.vendor_name || d.vendor?.name,
          vendorId: (() => {
            const rawVendorId =
              d.product?.vendor_id ??
              d.product?.vendor?.id ??
              d.metadata?.product_vendor_id ??
              d.metadata?.vendor_id ??
              d.vendor?.id;
            const parsedVendorId = Number(rawVendorId);
            return Number.isFinite(parsedVendorId) && parsedVendorId > 0 ? parsedVendorId : undefined;
          })(),
          vendorName:
            d.product?.vendor?.name ||
            d.product?.vendor?.business_name ||
            d.product?.vendor_name ||
            d.metadata?.product_vendor_name ||
            d.vendor?.name,
          vendorPhone: d.product?.vendor?.phone || d.vendor?.phone,
          vendorEmail: d.product?.vendor?.email || d.vendor?.email,
          image: imageUrl,
          sellingPrice: parsePrice(d.suggested_selling_price),
          batchId: d.product_batch_id,
          barcodeStatus: d.barcode?.current_status,
        };
      });
      
      setDefects(transformedDefects);
    } catch (error: any) {
      console.error('Error fetching defects:', error);
      setErrorMessage(error.message || 'Failed to fetch defects');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleBarcodeCheck = async (value: string) => {
    setBarcodeInput(value);
    if (value.trim().length > 3) {
      try {
        const scanResult = await defectIntegrationService.scanBarcode(value);
        setScannedProduct(scanResult);
      } catch (error) {
        setScannedProduct(null);
      }
    } else {
      setScannedProduct(null);
    }
  };

  const handleDefectImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDefectImage(e.target.files[0]);
    }
  };

  const handleMarkAsDefective = async () => {
    if (!barcodeInput.trim()) {
      alert('Please enter barcode');
      return;
    }

    if (!isDefect && !isUsedItem && !isEmployeeUsage) {
      alert('Please select at least one: Defect, Used Item, or Employee Usage');
      return;
    }

    if (isDefect && !returnReason) {
      alert('Please enter defect reason');
      return;
    }

    if (!storeForDefect) {
      alert('Please select the store location');
      return;
    }

    setLoading(true);
    try {
      // Build description based on selections
      const tags: string[] = [];
      if (isDefect) tags.push('DEFECT');
      if (isUsedItem) tags.push('USED_ITEM');
      if (isEmployeeUsage) tags.push('EMPLOYEE_USE');

      let description = '';
      if (tags.length > 0) {
        description = isDefect && returnReason
          ? `${tags.join(' + ')} - ${returnReason}`
          : `${tags.join(' + ')} - Product marked for ${isEmployeeUsage ? 'employee usage' : 'used item'}`;
      } else {
        description = returnReason;
      }

      await defectIntegrationService.markAsDefective({
        barcode: barcodeInput,
        store_id: parseInt(storeForDefect),
        defect_type: isDefect ? 'physical_damage' : 'other',
        defect_description: description,
        severity: isDefect ? 'moderate' : 'minor',
        is_used_item: isUsedItem,
        is_employee_usage: isEmployeeUsage,
        defect_images: defectImage ? [defectImage] : undefined,
        internal_notes: `Identified by employee at store ${storeForDefect}`,
      });

      const statusParts: string[] = [];
      if (isDefect) statusParts.push('defective');
      if (isUsedItem) statusParts.push('used');
      if (isEmployeeUsage) statusParts.push('employee usage');
      const statusText = statusParts.join(' and ');
      setSuccessMessage(`Item marked as ${statusText} successfully!`);
      
      setBarcodeInput('');
      setReturnReason('');
      setIsUsedItem(false);
      setIsEmployeeUsage(false);
      setIsDefect(false);
      setStoreForDefect('');
      setScannedProduct(null);
      setDefectImage(null);
      fetchDefects();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'Error processing item');
    } finally {
      setLoading(false);
    }
  };

  const prepareDefectForSale = async (defect: DefectItem): Promise<DefectSaleItem> => {
    const fullDetails = await defectIntegrationService.getDefectiveById(defect.id);

    if (!fullDetails.product_batch_id) {
      throw new Error(`${defect.productName} is missing batch information and cannot be sold.`);
    }

    let currentStatus = fullDetails.status;

    if (currentStatus === 'identified') {
      await defectIntegrationService.inspectDefect(defect.id, {
        severity: fullDetails.severity || 'moderate',
        internal_notes: 'Auto-inspected for sale preparation',
      });
      currentStatus = 'inspected';
    }

    if (currentStatus === 'inspected') {
      await defectIntegrationService.makeAvailableForSale(defect.id);
      currentStatus = 'available_for_sale';
    } else if (currentStatus === 'sold') {
      throw new Error(`${defect.productName} has already been sold.`);
    } else if (currentStatus !== 'available_for_sale') {
      throw new Error(`${defect.productName} cannot be sold while status is ${currentStatus}.`);
    }

    const suggestedPrice = Number.parseFloat(
      fullDetails.suggested_selling_price?.toString() ||
      defect.sellingPrice?.toString() ||
      fullDetails.original_price?.toString() ||
      '0'
    );

    return {
      ...defect,
      batchId: fullDetails.product_batch_id,
      storeId: fullDetails.store_id || defect.storeId,
      sellingPrice: Number.isFinite(suggestedPrice) ? suggestedPrice : 0,
    };
  };

  const handleSellClick = async (defect: DefectItem) => {
    setLoading(true);
    setErrorMessage('');

    try {
      const saleItem = await prepareDefectForSale(defect);

      setSelectedDefect(saleItem);
      setSellPrice(saleItem.sellingPrice > 0 ? saleItem.sellingPrice.toString() : '0');
      setSellType('pos');
      setSellModalOpen(true);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Unknown error occurred';
      setErrorMessage(`Failed: ${message}`);
      setTimeout(() => setErrorMessage(''), 7000);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSellClick = async () => {
    if (selectedDefectsForVendor.length === 0) {
      alert('Please select items to sell');
      return;
    }

    const selectedItems = pendingDefects.filter((defect) => selectedDefectsForVendor.includes(defect.id));

    if (selectedItems.length === 0) {
      alert('Selected items are no longer available for sale');
      return;
    }

    const storeNames = new Set(selectedItems.map((item) => item.store || 'N/A'));
    if (storeNames.size > 1) {
      alert('Please select items from one store only. A single POS/Social order cannot mix extra items from multiple stores.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const preparedItems: DefectSaleItem[] = [];
      for (const defect of selectedItems) {
        preparedItems.push(await prepareDefectForSale(defect));
      }

      const storeIds = new Set(preparedItems.map((item) => item.storeId || 0).filter(Boolean));
      if (storeIds.size > 1) {
        throw new Error('Selected items belong to different stores. Please sell items from one store in one order.');
      }

      const prices: Record<string, string> = {};
      preparedItems.forEach((item) => {
        prices[item.id] = item.sellingPrice > 0 ? item.sellingPrice.toString() : '';
      });

      setBulkSellItems(preparedItems);
      setBulkSellPrices(prices);
      setBulkSellType('pos');
      setBulkSellModalOpen(true);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Could not prepare selected items for sale';
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(''), 8000);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSell = async () => {
    if (bulkSellItems.length === 0) {
      alert('No items selected');
      return;
    }

    const invalidItem = bulkSellItems.find((item) => {
      const price = Number.parseFloat(bulkSellPrices[item.id] || '0');
      return !Number.isFinite(price) || price <= 0;
    });

    if (invalidItem) {
      alert(`Please enter a valid selling price for ${invalidItem.productName}`);
      return;
    }

    setLoading(true);

    try {
      const defectItems = bulkSellItems.map((item) => ({
        id: item.id,
        barcode: item.barcode,
        productId: item.productId,
        productName: item.productName,
        sellingPrice: Number.parseFloat(bulkSellPrices[item.id]),
        store: item.store,
        storeId: item.storeId,
        batchId: item.batchId,
      }));

      sessionStorage.setItem('defectItems', JSON.stringify(defectItems));
      sessionStorage.removeItem('defectItem');

      const ids = defectItems.map((item) => item.id).join(',');
      const url = bulkSellType === 'pos'
        ? `/pos?defects=${encodeURIComponent(ids)}`
        : `/social-commerce?defects=${encodeURIComponent(ids)}`;

      setBulkSellModalOpen(false);
      setSelectedDefectsForVendor([]);

      setTimeout(() => {
        window.location.href = url;
      }, 100);
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'Error processing bulk sale');
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async () => {
    if (!selectedDefect || !sellPrice) {
      alert('Please enter selling price');
      return;
    }

    setLoading(true);
    try {
      const defectData = {
        id: selectedDefect.id,
        barcode: selectedDefect.barcode,
        productId: selectedDefect.productId,
        productName: selectedDefect.productName,
        sellingPrice: parseFloat(sellPrice),
        store: selectedDefect.store,
        storeId: selectedDefect.storeId,
        batchId: selectedDefect.batchId,
      };

      if (!defectData.batchId) {
        alert('Error: Missing batch information. Please try again.');
        setLoading(false);
        return;
      }
      
      sessionStorage.setItem('defectItem', JSON.stringify(defectData));
      sessionStorage.removeItem('defectItems');

      const url = sellType === 'pos'
        ? `/pos?defect=${selectedDefect.id}`
        : `/social-commerce?defect=${selectedDefect.id}`;
      
      setSellModalOpen(false);
      
      setTimeout(() => {
        window.location.href = url;
      }, 100);
      
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'Error processing sale');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (defectId: string) => {
    const defect = defects.find((item) => item.id === defectId);
    const confirmed = confirm(
      `Delete the defect/extra marking${defect ? ` for ${defect.productName} (${defect.barcode})` : ''}?\n\n` +
      'This will restore the barcode to regular sellable inventory. It will not dispose or destroy the physical product.'
    );

    if (!confirmed) return;

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await defectiveProductService.restoreToInventory(parseInt(defectId), {
        restore_notes: 'Defect marking deleted/reverted from Extra Items panel',
      });
      
      await fetchDefects();
      setSelectedDefectsForVendor(prev => prev.filter(id => id !== defectId));
      setSuccessMessage('Defect marking deleted. Product is now available for normal sale.');
      setToast({
        show: true,
        message: 'Defect marking deleted and product restored to stock',
        type: 'success',
      });
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error: any) {
      console.error('Error deleting defect marking:', error);
      const message = error.response?.data?.message || error.message || 'Error deleting defect marking';
      setErrorMessage(message);
      setToast({
        show: true,
        message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreToInventory = async (defect: DefectItem) => {
    const confirmed = confirm(
      `Restore ${defect.productName} (${defect.barcode}) to regular inventory?\n\n` +
      'This will remove the defect/used/employee-use marking and make the barcode available for normal POS, online orders, packing, and product search again.'
    );

    if (!confirmed) return;

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await defectiveProductService.restoreToInventory(parseInt(defect.id), {
        restore_notes: 'Defect marking reverted from Extra Items panel',
      });

      await fetchDefects();
      setSelectedDefectsForVendor(prev => prev.filter(id => id !== defect.id));
      setSuccessMessage('Defect marking removed. Product is now available for normal sale.');
      setToast({
        show: true,
        message: 'Product restored to regular inventory',
        type: 'success',
      });
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error: any) {
      console.error('Error restoring item:', error);
      const message = error.response?.data?.message || error.message || 'Error restoring item';
      setErrorMessage(message);
      setToast({
        show: true,
        message: 'Failed to restore product',
        type: 'error',
      });
      setTimeout(() => setErrorMessage(''), 7000);
    } finally {
      setLoading(false);
    }
  };

  const toggleDefectSelection = (defectId: string) => {
    setSelectedDefectsForVendor(prev =>
      prev.includes(defectId)
        ? prev.filter(id => id !== defectId)
        : [...prev, defectId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDefectsForVendor.length === pendingDefects.length) {
      setSelectedDefectsForVendor([]);
    } else {
      setSelectedDefectsForVendor(pendingDefects.map(d => d.id));
    }
  };

  const handleReturnToVendor = async (vendorId: number, notes: string) => {
    if (selectedDefectsForVendor.length === 0) {
      alert('Please select items to return');
      return;
    }

    setLoading(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      const returnedDefectIds: string[] = [];

      for (const defectId of selectedDefectsForVendor) {
        try {
          await defectiveProductService.returnToVendor(parseInt(defectId), {
            vendor_id: vendorId,
            vendor_notes: notes,
          });
          successCount++;
          returnedDefectIds.push(defectId);
        } catch (error: any) {
          errorCount++;
          const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
          errors.push(`Item ${defectId}: ${errorMsg}`);
        }
      }

      if (successCount > 0) {
        const returnedValue = returnedDefectIds
          .map(id => defects.find(d => d.id === id))
          .filter(Boolean)
          .reduce((sum, item) => sum + Number(item?.costPrice || 0), 0);
        const formattedReturnedValue = `৳${formatPrice(returnedValue)}`;
        const successMsg = errorCount === 0
          ? `Successfully returned ${successCount} item${successCount > 1 ? 's' : ''} to vendor. Total cost value: ${formattedReturnedValue}.`
          : `Returned ${successCount} item${successCount > 1 ? 's' : ''} to vendor worth ${formattedReturnedValue}. ${errorCount} failed.`;
        
        setToast({
          show: true,
          message: successMsg,
          type: errorCount === 0 ? 'success' : 'warning',
        });
        
        await fetchDefects();
        setSelectedDefectsForVendor([]);
        setReturnToVendorModalOpen(false);
      }

      if (errorCount > 0 && successCount === 0) {
        const errorMessage = errors.join('\n');
        setToast({
          show: true,
          message: `Failed to return ${errorCount} item${errorCount > 1 ? 's' : ''}`,
          type: 'error',
        });
        setErrorMessage(errorMessage);
        setTimeout(() => setErrorMessage(''), 8000);
      }

    } catch (error: any) {
      console.error('Bulk return error:', error);
      setToast({
        show: true,
        message: error.message || 'Failed to process returns',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleDefectDetails = (defectId: string) => {
    setExpandedDefect(expandedDefect === defectId ? null : defectId);
  };

  const pendingDefects = defects.filter(d => {
    const isPending = d.status === 'pending' || d.status === 'approved';
    if (!isPending) return false;
    
    if (filterType === 'all') return true;
    
    const hasUsedTag = d.returnReason?.includes('USED_ITEM');
    const hasEmployeeUseTag = d.returnReason?.includes('EMPLOYEE_USE') || d.barcodeStatus === 'employee_use';
    // An item is a defect if:
    // 1. It has "DEFECT" tag in description, OR
    // 2. It has a description that's not only a usage tag, OR  
    // 3. It doesn't have usage tags and has some description
    const hasDefectTag = d.returnReason?.includes('DEFECT') || 
                         (d.returnReason &&
                          !d.returnReason.startsWith('USED_ITEM') &&
                          !d.returnReason.startsWith('EMPLOYEE_USE') &&
                          d.returnReason.trim().length > 0);
    
    if (filterType === 'used') return hasUsedTag;
    if (filterType === 'employee_use') return hasEmployeeUseTag;
    if (filterType === 'defects') return hasDefectTag;
    
    return true;
  });
  
  const soldDefects = defects.filter(d => d.status === 'sold');
  const returnedDefects = defects.filter(d => d.status === 'returned_to_vendor');

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            darkMode={darkMode} 
            setDarkMode={setDarkMode} 
            toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
          />

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Extra Items Management
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage defective and used items
                </p>
              </div>

              {/* Success Message */}
              {successMessage && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <p className="text-green-800 dark:text-green-300">{successMessage}</p>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <p className="text-red-800 dark:text-red-300 whitespace-pre-line">{errorMessage}</p>
                </div>
              )}

              {/* Store and Vendor Selection */}
              <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StoreIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Store & Vendor Selection</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Select store/vendor to view items • Barcode scanning auto-detects store
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedStore}
                      onChange={(e) => setSelectedStore(e.target.value)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="all">View all stores</option>
                      {stores.map(store => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedVendor}
                      onChange={(e) => setSelectedVendor(e.target.value)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="all">View all vendors</option>
                      {vendors.map(vendor => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel - Form */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Barcode className="w-5 h-5" />
                    Scan Barcode
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Barcode Scanner / Manual Entry
                      </label>
                      <input
                        type="text"
                        value={barcodeInput}
                        onChange={(e) => handleBarcodeCheck(e.target.value)}
                        placeholder="Scan or enter barcode..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      {scannedProduct && (
                        <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded">
                          <p className="text-sm font-medium text-green-800 dark:text-green-300">
                            {scannedProduct.product?.name}
                          </p>
                          <p className="text-xs text-green-700 dark:text-green-400">
                            Available: {scannedProduct.is_available ? 'Yes' : 'No'} • 
                            Location: {scannedProduct.current_location?.name || 'N/A'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Checkboxes */}
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                        <input
                          type="checkbox"
                          id="isDefect"
                          checked={isDefect}
                          onChange={(e) => setIsDefect(e.target.checked)}
                          className="mt-0.5 w-4 h-4"
                        />
                        <label htmlFor="isDefect" className="flex-1 cursor-pointer">
                          <div className="text-sm font-medium text-red-900 dark:text-red-300">
                            Mark as Defective
                          </div>
                          <div className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                            Check this if the item is defective or damaged
                          </div>
                        </label>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                        <input
                          type="checkbox"
                          id="isUsed"
                          checked={isUsedItem}
                          onChange={(e) => setIsUsedItem(e.target.checked)}
                          className="mt-0.5 w-4 h-4"
                        />
                        <label htmlFor="isUsed" className="flex-1 cursor-pointer">
                          <div className="text-sm font-medium text-blue-900 dark:text-blue-300">
                            Mark as Used Item
                          </div>
                          <div className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                            Check this if the item has been used
                          </div>
                        </label>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                        <input
                          type="checkbox"
                          id="isEmployeeUsage"
                          checked={isEmployeeUsage}
                          onChange={(e) => setIsEmployeeUsage(e.target.checked)}
                          className="mt-0.5 w-4 h-4"
                        />
                        <label htmlFor="isEmployeeUsage" className="flex-1 cursor-pointer">
                          <div className="text-sm font-medium text-amber-900 dark:text-amber-300">
                            Mark as Employee Usage
                          </div>
                          <div className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                            Check this if the item is being used internally by an employee
                          </div>
                        </label>
                      </div>
                    </div>

                    {isDefect && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Defect Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={returnReason}
                          onChange={(e) => setReturnReason(e.target.value)}
                          placeholder="Enter defect reason..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Item Image {isDefect && <span className="text-xs text-gray-500">(Optional)</span>}
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleDefectImageChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Store Location <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={storeForDefect}
                        onChange={(e) => setStoreForDefect(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select store...</option>
                        {stores.map(store => (
                          <option key={store.id} value={store.id}>
                            {store.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleMarkAsDefective}
                      disabled={loading}
                      className="w-full py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
                    >
                      {loading ? 'Processing...' : 'Submit'}
                    </button>
                  </div>
                </div>

                {/* Right Panel - Items List */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Pending Items */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Extra Items ({pendingDefects.length})
                        </h3>
                        <div className="flex items-center gap-2">
                          {selectedDefectsForVendor.length > 0 && (
                            <>
                              <button
                                onClick={handleBulkSellClick}
                                disabled={loading}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                              >
                                <ShoppingCart className="w-4 h-4" />
                                Sell Selected ({selectedDefectsForVendor.length})
                              </button>
                              <button
                                onClick={() => setReturnToVendorModalOpen(true)}
                                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                              >
                                <Truck className="w-4 h-4" />
                                Return to Vendor ({selectedDefectsForVendor.length})
                              </button>
                              <span className="px-2 py-1 rounded-md bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-xs font-semibold border border-orange-200 dark:border-orange-800">
                                Return value: ৳{formatPrice(
                                  selectedDefectsForVendor
                                    .map(id => defects.find(d => d.id === id))
                                    .filter(Boolean)
                                    .reduce((sum, item) => sum + Number(item?.costPrice || 0), 0)
                                )}
                              </span>
                            </>
                          )}
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedStore === 'all' ? 'All stores' : stores.find(s => s.id.toString() === selectedStore)?.name}
                            {' • '}
                            {selectedVendor === 'all' ? 'All vendors' : vendors.find(v => v.id.toString() === selectedVendor)?.name}
                          </span>
                        </div>
                      </div>
                      
                      {/* Filter Buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setFilterType('all')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                              filterType === 'all'
                                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            All
                          </button>
                          <button
                            onClick={() => setFilterType('defects')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                              filterType === 'defects'
                                ? 'bg-red-600 text-white'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30'
                            }`}
                          >
                            Defects
                          </button>
                          <button
                            onClick={() => setFilterType('used')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                              filterType === 'used'
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/30'
                            }`}
                          >
                            Used
                          </button>
                          <button
                            onClick={() => setFilterType('employee_use')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                              filterType === 'employee_use'
                                ? 'bg-amber-600 text-white'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/30'
                            }`}
                          >
                            Employee Usage
                          </button>
                        </div>
                        
                        {pendingDefects.length > 0 && (
                          <button
                            onClick={toggleSelectAll}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                          >
                            {selectedDefectsForVendor.length === pendingDefects.length ? 'Deselect All' : 'Select All'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
                      {pendingDefects.length === 0 ? (
                        <div className="p-8 text-center">
                          <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                          <p className="text-gray-500 dark:text-gray-400">No extra items found</p>
                        </div>
                      ) : (
                        pendingDefects.map((defect) => {
                          const hasUsedTag = defect.returnReason?.includes('USED_ITEM');
                          const hasEmployeeUseTag = defect.returnReason?.includes('EMPLOYEE_USE') || defect.barcodeStatus === 'employee_use';
                          const hasDefectTag = defect.returnReason?.includes('DEFECT') || 
                                              (defect.returnReason &&
                                               !defect.returnReason.startsWith('USED_ITEM') &&
                                               !defect.returnReason.startsWith('EMPLOYEE_USE') &&
                                               defect.returnReason.trim().length > 0);

                          return (
                            <div key={defect.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <div className="px-4 py-3">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={selectedDefectsForVendor.includes(defect.id)}
                                      onChange={() => toggleDefectSelection(defect.id)}
                                      className="mt-1 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                    />
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                          {defect.productName}
                                        </h4>
                                        {hasDefectTag && (
                                          <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded font-medium">
                                            Defect
                                          </span>
                                        )}
                                        {hasUsedTag && (
                                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded font-medium">
                                            Used
                                          </span>
                                        )}
                                        {hasEmployeeUseTag && (
                                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded font-medium">
                                            Employee Use
                                          </span>
                                        )}
                                      </div>
                                      
                                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                          <Barcode className="w-3 h-3" />
                                          {defect.barcode}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <MapPin className="w-3 h-3" />
                                          {defect.store || 'N/A'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Truck className="w-3 h-3" />
                                          {defect.vendor || 'N/A'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          {new Date(defect.addedAt).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1 font-semibold text-gray-800 dark:text-gray-200">
                                          <DollarSign className="w-3 h-3" />
                                          Cost ৳{formatPrice(defect.costPrice)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => toggleDefectDetails(defect.id)}
                                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                                    >
                                      {expandedDefect === defect.id ? (
                                        <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedDefectsForVendor([defect.id]);
                                        setReturnToVendorModalOpen(true);
                                      }}
                                      className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                                      title="Return to Vendor"
                                    >
                                      <Truck className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleSellClick(defect)}
                                      className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                      title="Sell"
                                    >
                                      <ShoppingCart className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleRestoreToInventory(defect)}
                                      disabled={loading}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50"
                                      title="Restore to regular inventory"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleRemove(defect.id)}
                                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                      title="Delete defect marking and restore to stock"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {expandedDefect === defect.id && (
                                <div className="px-4 pb-4 pt-2 bg-gray-50 dark:bg-gray-900/50">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {defect.image ? (
                                      <div className="space-y-2">
                                        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                          <ImageIcon className="w-3 h-3" />
                                          Item Image
                                        </h5>
                                        <div className="relative aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                                          <img
                                            src={defect.image}
                                            alt="Item"
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg">
                                        <div className="text-center">
                                          <ImageIcon className="w-8 h-8 mx-auto mb-1 text-gray-400" />
                                          <p className="text-xs text-gray-500">No image</p>
                                        </div>
                                      </div>
                                    )}

                                    <div className="space-y-3">
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                          <p className="text-gray-500 dark:text-gray-400 mb-0.5">Product ID</p>
                                          <p className="text-gray-900 dark:text-white font-medium">#{defect.productId}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-500 dark:text-gray-400 mb-0.5">Added By</p>
                                          <p className="text-gray-900 dark:text-white font-medium">{defect.addedBy}</p>
                                        </div>
                                      </div>

                                      {defect.returnReason && (
                                        <div>
                                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                            Reason
                                          </p>
                                          <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600">
                                            {defect.returnReason}
                                          </p>
                                        </div>
                                      )}

                                      {(defect.costPrice || defect.originalSellingPrice) && (
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                          {defect.costPrice && (
                                            <div>
                                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Cost Price</p>
                                              <p className="text-sm text-gray-900 dark:text-white font-medium">
                                                ৳{formatPrice(defect.costPrice)}
                                              </p>
                                              {defect.costPriceSource && (
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                  Source: {defect.costPriceSource.replace(/_/g, ' ')}
                                                </p>
                                              )}
                                            </div>
                                          )}
                                          {defect.originalSellingPrice && (
                                            <div>
                                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Original Price</p>
                                              <p className="text-sm text-gray-900 dark:text-white font-medium">
                                                ৳{formatPrice(defect.originalSellingPrice)}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Sold Items */}
                  {soldDefects.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Sold Items ({soldDefects.length})
                        </h3>
                      </div>

                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {soldDefects.map((defect) => (
                          <div key={defect.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                {defect.productName}
                              </h4>
                              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded">
                                Sold
                              </span>
                            </div>
                            <div className="flex items-center gap-x-4 text-xs text-gray-600 dark:text-gray-400">
                              <span>{defect.barcode}</span>
                              <span>৳{formatPrice(defect.sellingPrice)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Returned to Vendor Items */}
                  {returnedDefects.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <Truck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          Returned to Vendor ({returnedDefects.length})
                        </h3>
                      </div>

                      <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
                        {returnedDefects.map((defect) => (
                          <div key={defect.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                    {defect.productName}
                                  </h4>
                                  <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded flex items-center gap-1">
                                    <Truck className="w-3 h-3" />
                                    Returned
                                  </span>
                                </div>
                                <div className="flex items-center gap-x-4 text-xs text-gray-600 dark:text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <Barcode className="w-3 h-3" />
                                    {defect.barcode}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {defect.store || 'N/A'}
                                  </span>
                                  {defect.costPrice && (
                                    <span>Cost: ৳{formatPrice(defect.costPrice)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Sell Modal */}
      {selectedDefect && (
        <SellDefectModal
          isOpen={sellModalOpen}
          onClose={() => setSellModalOpen(false)}
          defect={selectedDefect}
          sellPrice={sellPrice}
          setSellPrice={setSellPrice}
          sellType={sellType}
          setSellType={setSellType}
          onSell={handleSell}
          loading={loading}
        />
      )}

      {/* Bulk Sell Modal */}
      {bulkSellModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-300 dark:border-gray-600">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Sell selected extra items
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {bulkSellItems.length} item{bulkSellItems.length === 1 ? '' : 's'} will be added to one {bulkSellType === 'pos' ? 'POS' : 'Social Commerce'} order.
                </p>
              </div>
              <button
                onClick={() => setBulkSellModalOpen(false)}
                disabled={loading}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <StoreIcon className="w-4 h-4" />
                  Sale Platform
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBulkSellType('pos')}
                    className={`flex-1 py-2 px-3 border rounded-md text-sm font-medium transition-all ${
                      bulkSellType === 'pos'
                        ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    POS
                  </button>
                  <button
                    onClick={() => setBulkSellType('social')}
                    className={`flex-1 py-2 px-3 border rounded-md text-sm font-medium transition-all ${
                      bulkSellType === 'social'
                        ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Social Commerce
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {bulkSellItems.map((item, index) => (
                  <div key={item.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-6 h-6 rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-semibold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <p className="font-medium text-gray-900 dark:text-white truncate">{item.productName}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400 pl-8">
                          <span className="flex items-center gap-1"><Barcode className="w-3 h-3" />{item.barcode}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.store || 'N/A'}</span>
                          <span>Batch #{item.batchId}</span>
                        </div>
                      </div>
                      <div className="w-36 shrink-0">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> Price
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={bulkSellPrices[item.id] || ''}
                          onChange={(e) => setBulkSellPrices((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
                These items will stay marked as extra/defective resale items. If the order is cancelled later, they will return to the Extra panel instead of regular stock.
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2 justify-end">
              <button
                onClick={() => setBulkSellModalOpen(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSell}
                disabled={loading || bulkSellItems.length === 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md font-medium flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                {loading ? 'Processing...' : `Sell ${bulkSellItems.length} item${bulkSellItems.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return to Vendor Modal */}
      <ReturnToVendorModal
        isOpen={returnToVendorModalOpen}
        onClose={() => setReturnToVendorModalOpen(false)}
        selectedDefects={selectedDefectsForVendor}
        allDefects={defects}
        onReturn={handleReturnToVendor}
        loading={loading}
      />

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
          duration={5000}
        />
      )}
    </div>
  );
}
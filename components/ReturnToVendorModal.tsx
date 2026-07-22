import { useState, useEffect } from 'react';
import { X, Truck, AlertCircle, Package, DollarSign, FileText, Check } from 'lucide-react';
import { vendorService } from '@/services/vendorService';

interface Vendor {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface DefectItem {
  id: string;
  barcode: string;
  productId: number;
  productName: string;
  status: string;
  addedBy: string;
  addedAt: string;
  originalSellingPrice?: number;
  costPrice?: number;
  costPriceSource?: string;
  vendorReturnValue?: number;
  vendorId?: number;
  vendorName?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  returnReason?: string;
  store?: string;
  image?: string;
}

interface ReturnToVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDefects: string[];
  allDefects: DefectItem[];
  onReturn: (vendorId: number, notes: string) => Promise<void>;
  loading: boolean;
}

export default function ReturnToVendorModal({
  isOpen,
  onClose,
  selectedDefects,
  allDefects,
  onReturn,
  loading
}: ReturnToVendorModalProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [loadingVendors, setLoadingVendors] = useState(false);

  const selectedDefectItems = allDefects.filter(d => selectedDefects.includes(d.id));
  const selectedVendorIds = Array.from(new Set(
    selectedDefectItems
      .map(item => item.vendorId)
      .filter((vendorId): vendorId is number => Number.isFinite(Number(vendorId)))
  ));
  const hasMixedVendors = selectedVendorIds.length > 1;
  const hasMissingVendor = selectedDefectItems.some(item => !item.vendorId);
  const inferredVendorId = selectedVendorIds.length === 1 ? selectedVendorIds[0] : null;
  const inferredVendorFromItem = inferredVendorId
    ? selectedDefectItems.find(item => item.vendorId === inferredVendorId)
    : null;

  useEffect(() => {
    if (isOpen) {
      fetchVendors();
    }
  }, [isOpen]);

  const fetchVendors = async () => {
    setLoadingVendors(true);
    try {      
      // Fetch active vendors
      const vendorsList = await vendorService.getAll({ is_active: true });
      
      setVendors(vendorsList);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoadingVendors(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    if (hasMixedVendors) {
      setSelectedVendor('');
      return;
    }

    if (inferredVendorId) {
      setSelectedVendor(String(inferredVendorId));
      return;
    }

    setSelectedVendor('');
  }, [isOpen, hasMixedVendors, inferredVendorId, selectedDefects.join(',')]);

  const handleSubmit = async () => {
    if (hasMixedVendors) {
      alert('Selected items belong to multiple vendors. Please return items from one vendor at a time.');
      return;
    }

    if (!selectedVendor) {
      alert('Please select a vendor');
      return;
    }

    if (inferredVendorId && Number(selectedVendor) !== inferredVendorId) {
      alert('The return vendor must match the selected product vendor.');
      return;
    }

    if (!returnNotes.trim()) {
      alert('Please provide return notes');
      return;
    }

    try {
      await onReturn(parseInt(selectedVendor), returnNotes);
      handleClose();
    } catch (error) {
      console.error('Error returning to vendor:', error);
    }
  };

  const handleClose = () => {
    setSelectedVendor('');
    setReturnNotes('');
    onClose();
  };

  const totalValue = selectedDefectItems.reduce((sum, item) => sum + Number(item.costPrice || item.vendorReturnValue || 0), 0);
  const missingCostCount = selectedDefectItems.filter(item => Number(item.costPrice || item.vendorReturnValue || 0) <= 0).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Truck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Return to Vendor
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedDefects.length} item{selectedDefects.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Summary Card */}
          <div className="mb-6 p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Items</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedDefects.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Return Value (Cost)</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ৳{totalValue.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Inferred Vendor */}
          <div className={`mb-6 p-4 rounded-lg border ${
            hasMixedVendors
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : hasMissingVendor
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
          }`}>
            <div className="flex items-start gap-3">
              <Truck className={`w-5 h-5 mt-0.5 ${
                hasMixedVendors
                  ? 'text-red-600 dark:text-red-400'
                  : hasMissingVendor
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-purple-600 dark:text-purple-400'
              }`} />
              <div>
                <p className={`text-sm font-semibold ${
                  hasMixedVendors
                    ? 'text-red-800 dark:text-red-300'
                    : hasMissingVendor
                      ? 'text-yellow-800 dark:text-yellow-300'
                      : 'text-purple-800 dark:text-purple-300'
                }`}>
                  {hasMixedVendors
                    ? 'Multiple vendors selected'
                    : inferredVendorId
                      ? `Vendor preselected: ${inferredVendorFromItem?.vendorName || vendors.find(v => v.id === inferredVendorId)?.name || `Vendor #${inferredVendorId}`}`
                      : 'Vendor could not be detected from selected product'}
                </p>
                <p className={`mt-1 text-xs ${
                  hasMixedVendors
                    ? 'text-red-700 dark:text-red-400'
                    : hasMissingVendor
                      ? 'text-yellow-700 dark:text-yellow-400'
                      : 'text-purple-700 dark:text-purple-400'
                }`}>
                  {hasMixedVendors
                    ? 'Please select products from one vendor only. Return-to-vendor should be processed vendor-wise.'
                    : inferredVendorId
                      ? 'The return vendor is taken from the product/vendor record and locked for this return.'
                      : 'Select the vendor manually only if this product record does not have a vendor assigned.'}
                </p>
              </div>
            </div>
          </div>

          {/* Selected Items */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Selected Items
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              {selectedDefectItems.map((item) => (
                <div
                  key={item.id}
                  className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {item.productName}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-mono">{item.barcode}</span>
                        <span>•</span>
                        <span>{item.store}</span>
                        {item.vendorName && (
                          <>
                            <span>•</span>
                            <span className="text-purple-700 dark:text-purple-300">Vendor: {item.vendorName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        ৳{Number(item.costPrice || item.vendorReturnValue || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Cost{item.costPriceSource ? ` • ${item.costPriceSource.replace(/_/g, ' ')}` : ''}
                      </p>
                    </div>
                  </div>
                  {item.returnReason && (
                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 px-2 py-1 rounded">
                      {item.returnReason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {missingCostCount > 0 && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {missingCostCount} selected item{missingCostCount === 1 ? '' : 's'} has no cost price snapshot. Please check the batch cost before returning to vendor.
            </div>
          )}

          {/* Vendor Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Vendor <span className="text-red-500">*</span>
            </label>
            {loadingVendors ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              </div>
            ) : (
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={loading || hasMixedVendors || Boolean(inferredVendorId)}
              >
                <option value="">{hasMixedVendors ? 'Select one vendor group first' : 'Choose vendor...'}</option>
                {inferredVendorId && !vendors.some(vendor => vendor.id === inferredVendorId) && (
                  <option value={inferredVendorId}>
                    {inferredVendorFromItem?.vendorName || `Vendor #${inferredVendorId}`}
                  </option>
                )}
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name} {vendor.phone ? `(${vendor.phone})` : ''}
                  </option>
                ))}
              </select>
            )}
            {inferredVendorId && !hasMixedVendors && (
              <p className="mt-2 text-xs text-purple-700 dark:text-purple-300">
                Vendor is preselected from the product record, so staff cannot accidentally return it to another vendor.
              </p>
            )}
            {hasMixedVendors && (
              <p className="mt-2 text-xs text-red-700 dark:text-red-300">
                Mixed-vendor returns are blocked. Deselect items from other vendors and submit one vendor return at a time.
              </p>
            )}
            {selectedVendor && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                {vendors.find(v => v.id.toString() === selectedVendor) && (
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-300">
                      {vendors.find(v => v.id.toString() === selectedVendor)?.name}
                    </p>
                    <div className="mt-1 space-y-0.5 text-xs text-blue-700 dark:text-blue-400">
                      {vendors.find(v => v.id.toString() === selectedVendor)?.email && (
                        <p>Email: {vendors.find(v => v.id.toString() === selectedVendor)?.email}</p>
                      )}
                      {vendors.find(v => v.id.toString() === selectedVendor)?.phone && (
                        <p>Phone: {vendors.find(v => v.id.toString() === selectedVendor)?.phone}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Return Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Return Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="Provide reason for return, condition of items, and any other relevant details..."
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              This information will be included in the return documentation
            </p>
          </div>

          {/* Warning */}
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Important Notice
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                Once returned to vendor, these items cannot be sold or disposed. The total above is the cost value being sent back to the vendor and will be saved with the return record.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || hasMixedVendors || !selectedVendor || (Boolean(inferredVendorId) && Number(selectedVendor) !== inferredVendorId) || !returnNotes.trim()}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Return to Vendor • ৳{totalValue.toFixed(2)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
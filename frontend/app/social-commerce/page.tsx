'use client';

 import { useState, useEffect, useMemo } from 'react';
 import { useRouter } from 'next/navigation';
 import { useTheme } from "@/contexts/ThemeContext";
 import { useAuth } from '@/contexts/AuthContext';
import { 
  Search, X, Globe, AlertCircle, Wrench, RefreshCw, User, ShoppingBag, Info,
  DollarSign, CreditCard, Wallet, MapPin, Truck, ChevronDown, ChevronRight, Plus, Minus, Store as StoreIcon 
} from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import CustomerTagManager from '@/components/customers/CustomerTagManager';
import axios from '@/lib/axios';
import storeService from '@/services/storeService';
import productImageService from '@/services/productImageService';
import batchService from '@/services/batchService';
 import catalogService, { CatalogGroupedProduct, Product } from '@/services/catalogService';
 import inventoryService, { GlobalInventoryItem } from '@/services/inventoryService';
 import shipmentService from '@/services/shipmentService';
import { fireToast } from '@/lib/globalToast';
import paymentService from '@/services/paymentService';

import ServiceSelector, { ServiceItem } from '@/components/ServiceSelector';

interface DefectItem {
  id: string;
  barcode: string;
  productId: number;
  productName: string;
  sellingPrice?: number;
  store?: string;
  batchId: number;
}

interface CartProduct {
  id: number | string;
  product_id: number;
  batch_id: number | null;
  productName: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  amount: number;
  isDefective?: boolean;
  defectId?: string;
  store_id?: number | null;
  store_name?: string | null;
  sku?: string;
}

interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  type: string;
  supports_partial: boolean;
  requires_reference: boolean;
  fixed_fee: number;
  percentage_fee: number;
}

interface ProductSearchResult {
  id: number;
  name: string;
  sku: string;
  mainImage: string;
  available: number;          // total batch stock (kept for backwards-compat)
  availableInventory: number; // from reserved_products — drives UI
  minPrice: number;
  maxPrice: number;
  batchesCount: number;
  expiryDate?: string | null;
  daysUntilExpiry?: number | null;
  attributes: {
    Price: number;
    mainImage: string;
  };
  branchStocks?: { store_name: string; quantity: number }[];
}

export default function SocialCommercePage() {
  const { darkMode, setDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]); // Kept for backward compatibility if needed
  const [allBatches, setAllBatches] = useState<any[]>([]); // Kept for backward compatibility if needed
  const [inventoryStats, setInventoryStats] = useState<{ total_stock: number; active_batches: number } | null>(null);
  const [stores, setStores] = useState<any[]>([]);  const [date, setDate] = useState(getTodayDate());
  const [salesBy, setSalesBy] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [socialId, setSocialId] = useState('');
  const [isInternational, setIsInternational] = useState(false);

  // ✅ Domestic
  const [streetAddress, setStreetAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isPathaoAuto, setIsPathaoAuto] = useState(true);
  
  // ✅ Pathao Location States
  const [pathaoCities, setPathaoCities] = useState<any[]>([]);
  const [pathaoZones, setPathaoZones] = useState<any[]>([]);
  const [pathaoAreas, setPathaoAreas] = useState<any[]>([]);
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');

  // ✅ International
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [internationalCity, setInternationalCity] = useState('');
  const [internationalPostalCode, setInternationalPostalCode] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [minPriceFilter, setMinPriceFilter] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');
  const [exactPriceFilter, setExactPriceFilter] = useState('');
  
  const [searchResults, setSearchResults] = useState<CatalogGroupedProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartProduct[]>([]);
  const [serviceCart, setServiceCart] = useState<ServiceItem[]>([]);

  const [storeAssignmentType, setStoreAssignmentType] = useState<'auto' | 'specific'>('specific');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  
  // ✅ Payment States
  const [transportCost, setTransportCost] = useState('0');
  const [paymentOption, setPaymentOption] = useState<'full' | 'partial' | 'none'>('full');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [codPaymentMethod, setCodPaymentMethod] = useState('');

  // ✅ Installment / EMI States
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(3);
  const [installmentPaymentMode, setInstallmentPaymentMode] = useState<'cash' | 'card' | 'bkash' | 'bank_transfer'>('cash');
  const [installmentTransactionReference, setInstallmentTransactionReference] = useState('');
  const [installmentPayingNow, setInstallmentPayingNow] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [inventoryStats, setInventoryStats] = useState<any>(null);

  const { user } = useAuth();
  const router = useRouter();

  function getTodayDate() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[today.getMonth()];
    const year = today.getFullYear();
    return `${day}-${month}-${year}`;
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'error') {
      console.error('Error:', message);
      alert('Error: ' + message);
    } else {
      console.log('Success:', message);
      alert(message);
    }
  };

  const getImageUrl = (imagePath: string | null | undefined): string => {
    if (!imagePath) return '/placeholder-image.jpg';

    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';

    if (imagePath.startsWith('/storage')) {
      return `${baseUrl}${imagePath}`;
    }

    return `${baseUrl}/storage/product-images/${imagePath}`;
  };

  const fetchPrimaryImage = async (productId: number): Promise<string> => {
    try {
      const images = await productImageService.getProductImages(productId);

      const primaryImage = images.find((img: any) => img.is_primary && img.is_active);

      if (primaryImage) {
        return getImageUrl(primaryImage.image_url || primaryImage.image_path);
      }

      const firstActiveImage = images.find((img: any) => img.is_active);
      if (firstActiveImage) {
        return getImageUrl(firstActiveImage.image_url || firstActiveImage.image_path);
      }

      return '/placeholder-image.jpg';
    } catch (error) {
      console.error('Error fetching product images:', error);
      return '/placeholder-image.jpg';
    }
  };

  const fetchStores = async () => {
    try {
      const response = await storeService.getStores({ is_active: true, per_page: 1000 });
      let storesData: any[] = [];

      if (response?.success && response?.data) {
        storesData = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data.data)
            ? response.data.data
            : [];
      } else if (Array.isArray((response as any)?.data)) {
        storesData = (response as any).data;
      }

      setStores(storesData);
      
      // Preselect first online store
      const onlineStore = storesData.find((s: any) => s.is_online);
      if (onlineStore) {
        setSelectedStoreId(String(onlineStore.id));
        setStoreAssignmentType('specific');
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      setStores([]);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await axios.get('/payment-methods', {
        params: { customer_type: 'social_commerce' }
      });

      if (response.data.success) {
        const methods = response.data.data.payment_methods || response.data.data || [];
        setPaymentMethods(methods);

        // Set default payment methods
        const mobileMethod = methods.find((m: PaymentMethod) => m.type === 'mobile_banking');
        const cashMethod = methods.find((m: PaymentMethod) => m.type === 'cash');

        if (mobileMethod) setSelectedPaymentMethod(String(mobileMethod.id));
        if (cashMethod) setCodPaymentMethod(String(cashMethod.id));
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/products', { params: { per_page: 1000 } });
      let productsData: any[] = [];

      if (response.data?.success && response.data?.data) {
        productsData = Array.isArray(response.data.data)
          ? response.data.data
          : Array.isArray(response.data.data.data)
            ? response.data.data.data
            : [];
      } else if (Array.isArray(response.data)) {
        productsData = response.data;
      }

      setAllProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      setAllProducts([]);
    }
  };

  // ✅ Fetch batches from ALL stores
  const fetchAllBatches = async () => {
    if (stores.length === 0) return;

    try {
      setIsLoadingData(true);
      console.log('📦 Fetching batches from all stores');

      const allBatchesPromises = stores.map(async (store) => {
        try {
          const batchesData = await batchService.getAvailableBatches(store.id);
          return batchesData
            .filter((batch: any) => batch.quantity > 0)
            .map((batch: any) => ({
              ...batch,
              store_id: store.id,
              store_name: store.name,
            }));
        } catch (err) {
          console.warn(`⚠️ Failed to fetch batches for store ${store.name}`, err);
          return [];
        }
      });

      const batchArrays = await Promise.all(allBatchesPromises);
      const flattenedBatches = batchArrays.flat();

      setAllBatches(flattenedBatches);
      console.log('✅ Total batches loaded:', flattenedBatches.length);
    } catch (error: any) {
      console.error('❌ Batch fetch error:', error);
      setAllBatches([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  // ✅ Build aggregated product cards from all matching batches.
  // This mirrors Deshio Social Commerce behavior:
  // - one product card per product
  // - available = total stock across all branches / batches
  // - batch_id is NOT selected here; it will be assigned during packing/scanning
  const buildAggregatedProductResults = (products: any[], batches: any[]): ProductSearchResult[] => {
    const productMap = new Map<number, ProductSearchResult>();

    for (const prod of products || []) {
      const pid = Number(prod?.id || 0);
      if (!pid) continue;

      const productBatches = (batches || []).filter((batch: any) => {
        const batchProductId = Number(batch?.product?.id || batch?.product_id || 0);
        return batchProductId === pid && Number(batch?.quantity || 0) > 0;
      });

      if (productBatches.length === 0) continue;

      const prices = productBatches
        .map((batch: any) => Number(String(batch?.sell_price ?? '0').replace(/[^0-9.-]/g, '')))
        .filter((price: number) => Number.isFinite(price));

      const totalAvailable = productBatches.reduce(
        (sum: number, batch: any) => sum + Math.max(0, Number(batch?.quantity || 0)),
        0
      );

      const imageUrl = getImageUrl(
        prod?.primary_image_url ||
        prod?.main_image ||
        prod?.image_url ||
        prod?.image_path ||
        prod?.thumbnail ||
        null
      );

      const earliestExpiryBatch = productBatches.reduce((best: any, current: any) => {
        const bestDays = Number(best?.days_until_expiry);
        const currentDays = Number(current?.days_until_expiry);

        if (!Number.isFinite(currentDays)) return best;
        if (!best || !Number.isFinite(bestDays) || currentDays < bestDays) return current;
        return best;
      }, null);

      productMap.set(pid, {
        id: pid,
        name: String(prod?.name || 'Unknown product'),
        sku: String(prod?.sku || ''),
        mainImage: imageUrl,
        available: totalAvailable,
        availableInventory: totalAvailable, // legacy batch path — no reserved_products data here
        minPrice: prices.length ? Math.min(...prices) : 0,
        maxPrice: prices.length ? Math.max(...prices) : 0,
        batchesCount: productBatches.length,
        expiryDate: earliestExpiryBatch?.expiry_date ?? null,
        daysUntilExpiry: Number.isFinite(Number(earliestExpiryBatch?.days_until_expiry))
          ? Number(earliestExpiryBatch?.days_until_expiry)
          : null,
        attributes: {
          Price: prices.length ? Math.min(...prices) : 0,
          mainImage: imageUrl,
        },
      });
    }

    return Array.from(productMap.values()).sort((a, b) => {
      const aStock = Number(a.available || 0);
      const bStock = Number(b.available || 0);
      if (bStock !== aStock) return bStock - aStock;
      return a.name.localeCompare(b.name);
    });
  };

  const formatPriceRangeLabel = (product: ProductSearchResult | any) => {
    const minP = Number(product?.minPrice ?? product?.attributes?.Price ?? 0);
    const maxP = Number(product?.maxPrice ?? product?.attributes?.Price ?? minP);

    if (Number.isFinite(minP) && Number.isFinite(maxP) && minP > 0 && maxP > 0 && minP !== maxP) {
      return `${minP} - ${maxP} ৳`;
    }

    const v = Number(product?.attributes?.Price ?? minP ?? 0);
    return `${Number.isFinite(v) ? v : 0} ৳`;
  };

  const performMultiStoreSearch = async (query: string): Promise<ProductSearchResult[]> => {
    const queryLower = query.toLowerCase().trim();
    console.log('🔍 Multi-store search for:', queryLower);

    const matchedProducts = allProducts.filter((prod: any) => {
      const productName = String(prod?.name || '').toLowerCase();
      const productSku = String(prod?.sku || '').toLowerCase();

      return (
        productName === queryLower ||
        productSku === queryLower ||
        productName.startsWith(queryLower) ||
        productSku.startsWith(queryLower) ||
        productName.includes(queryLower) ||
        productSku.includes(queryLower)
      );
    });

    const results = buildAggregatedProductResults(matchedProducts, allBatches);

    // Backfill images only when needed
    const enrichedResults = await Promise.all(
      results.map(async (product) => {
        if (product.mainImage && product.mainImage !== '/placeholder-image.jpg') return product;
        return {
          ...product,
          mainImage: await fetchPrimaryImage(product.id),
          attributes: {
            ...product.attributes,
            mainImage: await fetchPrimaryImage(product.id),
          },
        };
      })
    );

    return enrichedResults;
  };

  const calculateAmount = (basePrice: number, qty: number, discPer: number, discTk: number) => {
    const baseAmount = basePrice * qty;
    const percentDiscount = (baseAmount * discPer) / 100;
    const totalDiscount = percentDiscount + discTk;
    return Math.max(0, baseAmount - totalDiscount);
  };

  // 🔍 Helper: check if customer exists + get last order
  const handlePhoneBlur = async () => {
    const rawPhone = userPhone.trim();
    const phone = rawPhone.replace(/\D/g, '');
    if (!phone) {
      setExistingCustomer(null);
      setLastOrderInfo(null);
      setCustomerCheckError(null);
      return;
    }

    try {
      setIsCheckingCustomer(true);
      setCustomerCheckError(null);

      // Prefer new endpoint (Customer Tags API): POST /customers/find-by-phone
      let customer: any = null;
      try {
        const response = await axios.post('/customers/find-by-phone', { phone });
        const payload = response.data?.data ?? response.data;
        customer = payload?.customer ?? payload;
      } catch (e: any) {
        // Fallback for older builds: GET /customers/by-phone
        try {
          const response = await axios.get('/customers/by-phone', { params: { phone } });
          const payload = response.data?.data ?? response.data;
          customer = payload?.customer ?? payload;
        } catch {
          customer = null;
        }
      }

      if (customer?.id) {
        setExistingCustomer(customer);

        if (!userName && customer.name) setUserName(customer.name);
        if (!userEmail && customer.email) setUserEmail(customer.email);

        // Best-effort: get last order from customer orders (if endpoint exists)
        try {
          const lastOrderRes = await axios.get(`/customers/${customer.id}/orders`, {
            params: { per_page: 1, sort_by: 'order_date', sort_order: 'desc' },
          });
          const payload = lastOrderRes.data?.data ?? lastOrderRes.data;
          const list = payload?.data ?? payload?.orders ?? payload ?? [];
          const last = Array.isArray(list) ? list[0] : null;
          if (last) {
            setLastOrderInfo({
              date: last?.order_date || last?.created_at || last?.date,
              summary_text: last?.summary_text || last?.order_number || `Order #${last?.id ?? ''}`,
              total_amount: last?.total_amount ?? last?.total,
            });
          } else {
            setLastOrderInfo(null);
          }
        } catch (err) {
          // Fallback to older summary endpoint if present
          try {
            const lastOrderRes = await axios.get(`/customers/${customer.id}/last-order-summary`);
            if (lastOrderRes.data?.success) {
              setLastOrderInfo(lastOrderRes.data.data);
            } else {
              setLastOrderInfo(null);
            }
          } catch {
            console.warn('Failed to load last order info', err);
            setLastOrderInfo(null);
          }
        }
      } else {
        setExistingCustomer(null);
        setLastOrderInfo(null);
      }
    } catch (err) {
      console.error('Customer lookup failed', err);
      setExistingCustomer(null);
      setLastOrderInfo(null);
      setCustomerCheckError('Could not check existing customer. Please try again.');
    } finally {
      setIsCheckingCustomer(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const defectId = urlParams.get('defect');

    if (defectId) {
      console.log('🔍 DEFECT ID IN URL:', defectId);

      const defectData = sessionStorage.getItem('defectItem');
      console.log('📦 Checking sessionStorage:', defectData);

      if (defectData) {
        try {
          const defect = JSON.parse(defectData);
          console.log('✅ Loaded defect from sessionStorage:', defect);

          if (!defect.batchId) {
            console.error('❌ Missing batch_id in defect data');
            showToast('Error: Defect item is missing batch information', 'error');
            return;
          }

          setDefectiveProduct(defect);

          const defectCartItem: CartProduct = {
            id: Date.now(),
            product_id: defect.productId,
            batch_id: defect.batchId,
            productName: `${defect.productName} [DEFECTIVE]`,
            quantity: 1,
            unit_price: defect.sellingPrice || 0,
            discount_amount: 0,
            amount: defect.sellingPrice || 0,
            isDefective: true,
            defectId: defect.id,
            store_id: defect.store_id || 0,
            store_name: defect.store || 'Unknown',
          };

          setCart(prev => [...prev, defectCartItem]);
          showToast(`Defective item added to cart: ${defect.productName}`, 'success');
          sessionStorage.removeItem('defectItem');
        } catch (error) {
          console.error('❌ Error parsing defect data:', error);
          showToast('Error loading defect item', 'error');
        }
      } else {
        console.warn('⚠️ No defect data in sessionStorage');
        showToast('Defect item data not found. Please return to defects page.', 'error');
      }
    }
  }, []);

  // Sync state with localStorage
  useEffect(() => {
    // Load state from localStorage on mount - ONLY ONCE
    const savedState = localStorage.getItem('social_commerce_state');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setUserName(state.userName || '');
        setUserEmail(state.userEmail || '');
        setUserPhone(state.userPhone || '');
        setSocialId(state.socialId || '');
        setStreetAddress(state.streetAddress || '');
        setPostalCode(state.postalCode || '');
        setIsInternational(state.isInternational || false);
        setCountry(state.country || '');
        setState(state.state || '');
        setInternationalCity(state.internationalCity || '');
        setInternationalPostalCode(state.internationalPostalCode || '');
        setDeliveryAddress(state.deliveryAddress || '');
        setIsPathaoAuto(state.isPathaoAuto !== undefined ? state.isPathaoAuto : true);
        setSelectedCityId(state.selectedCityId || '');
        setSelectedZoneId(state.selectedZoneId || '');
        setSelectedAreaId(state.selectedAreaId || '');
        
        // Restore cart items
        if (state.cart && Array.isArray(state.cart)) {
          setCart(state.cart);
        }
        if (state.serviceCart && Array.isArray(state.serviceCart)) {
          setServiceCart(state.serviceCart);
        }
      } catch (e) {
        console.error('Failed to load state', e);
      }
    }

    // Load queue items from localStorage - ONLY ONCE
    const savedQueue = localStorage.getItem('social_commerce_queue');
    if (savedQueue) {
      try {
        const queueItems = JSON.parse(savedQueue);
        if (Array.isArray(queueItems) && queueItems.length > 0) {
          const cartItems: CartProduct[] = queueItems.map(item => ({
            id: Date.now() + Math.random(), // Unique ID for cart
            product_id: item.product_id,
            batch_id: item.batch_id,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_amount: item.discount_amount,
            amount: item.amount,
          }));
          setCart(prev => [...prev, ...cartItems]);
          // Clear queue after loading
          localStorage.removeItem('social_commerce_queue');
          
          // Show success toast
          showToast(`Added ${cartItems.length} items from product list`, 'success');
        }
      } catch (e) {
        console.error('Failed to load queue', e);
      }
    }

    const loadInitialData = async () => {
      try {
        setIsLoadingData(true);
        await Promise.all([
          fetchStores(),
          fetchPaymentMethods().catch(() => null),
          fetchPathaoCities().catch(() => null)
        ]);
      } catch (err) {
        console.error('Failed to load initial data', err);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadInitialData();
  }, []); // Run only once on mount

  // Separate effect for user synchronization
  useEffect(() => {
    if (user?.name) {
      setSalesBy(user.name);
    }
  }, [user]);

  // Pathao Location Fetching
  const fetchPathaoCities = async () => {
    try {
      const cities = await shipmentService.getPathaoCities();
      setPathaoCities(cities);
    } catch (e) {
      console.error('Failed to fetch cities', e);
    }
  };

  useEffect(() => {
    if (selectedCityId) {
      const fetchZones = async () => {
        try {
          const zones = await shipmentService.getPathaoZones(Number(selectedCityId));
          setPathaoZones(zones);
          setPathaoAreas([]);
        } catch (e) {
          console.error('Failed to fetch zones', e);
        }
      };
      fetchZones();
    }
  }, [selectedCityId]);

  useEffect(() => {
    if (selectedZoneId) {
      const fetchAreas = async () => {
        try {
          const areas = await shipmentService.getPathaoAreas(Number(selectedZoneId));
          setPathaoAreas(areas);
        } catch (e) {
          console.error('Failed to fetch areas', e);
        }
      };
      fetchAreas();
    }
  }, [selectedZoneId]);

  // Save state to localStorage whenever it changes (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      const stateToSave = {
        userName,
        userEmail,
        userPhone,
        socialId,
        streetAddress,
        postalCode,
        isInternational,
        country,
        state,
        internationalCity,
        internationalPostalCode,
        deliveryAddress,
        isPathaoAuto,
        selectedCityId,
        selectedZoneId,
        selectedAreaId,
        cart,
        serviceCart,
      };
      localStorage.setItem('social_commerce_state', JSON.stringify(stateToSave));
    }, 500);
    return () => clearTimeout(timer);
  }, [userName, userEmail, userPhone, socialId, streetAddress, postalCode, isInternational, country, state, internationalCity, internationalPostalCode, deliveryAddress, isPathaoAuto, selectedCityId, selectedZoneId, selectedAreaId, cart, serviceCart]);

  // ✅ Search effect using e-commerce catalog search
  useEffect(() => {
    if (!searchQuery.trim() && !minPriceFilter && !maxPriceFilter && !exactPriceFilter) {
      setSearchResults([]);
      return;
    }

    let active = true;
    const delayDebounce = setTimeout(async () => {
      try {
        setIsLoadingData(true);
        
        const params: any = {
          q: searchQuery,
          per_page: 50,
          group_by_sku: true,
        };

        if (minPriceFilter) params.min_price = minPriceFilter;
        if (maxPriceFilter) params.max_price = maxPriceFilter;
        if (exactPriceFilter) {
          params.min_price = exactPriceFilter;
          params.max_price = exactPriceFilter;
        }

        const response = await catalogService.searchProducts(params);

        if (active && response && response.grouped_products) {
          setSearchResults(response.grouped_products);
        }
      } catch (error: any) {
        console.error('❌ Search failed:', error);
      } finally {
        if (active) setIsLoadingData(false);
      }
    }, 500);

    return () => {
      active = false;
      clearTimeout(delayDebounce);
    };
  }, [searchQuery, minPriceFilter, maxPriceFilter, exactPriceFilter]);

  useEffect(() => {
    if (selectedProduct && quantity) {
      const price = parseFloat(String(selectedProduct.attributes?.Price ?? selectedProduct.price ?? 0));
      const qty = parseFloat(quantity) || 0;
      const discPer = parseFloat(discountPercent) || 0;
      const discTk = parseFloat(discountTk || '0');

      const finalAmount = calculateAmount(price, qty, discPer, discTk);
      setAmount(finalAmount.toFixed(2));
    } else {
      setAmount('0.00');
    }
  }, [selectedProduct, quantity, discountPercent, discountTk]);

  const handleGroupClick = async (group: CatalogGroupedProduct) => {
    if (expandedGroupId === group.base_name) {
      setExpandedGroupId(null);
      setSelectedProductInventory(null);
    } else {
      setExpandedGroupId(group.base_name);
      // Fetch global inventory for the main variant's product ID as a representative
      // The user wants a table showing stores. We can fetch for the base product or per variant.
      // Usually, it's better to show it when a variant is selected or for the whole group.
      // Let's fetch for the group's main variant first.
      try {
        const inv = await inventoryService.getGlobalInventory({ product_id: group.main_variant.id });
        if (inv.success && inv.data.length > 0) {
          setSelectedProductInventory(inv.data[0]);
        }
      } catch (err) {
        console.error('Failed to fetch group inventory', err);
      }
    }
  };

  const handleVariantSelect = async (variant: Product, group: CatalogGroupedProduct) => {
    const price = variant.selling_price;

    // Add to cart directly or set as "selected" for qty adjustment
    // The user's current UI has a "Quantity" and "Add to Cart" button below.
    // Let's keep that but auto-fill the selected variant.

    setSelectedProduct({
      ...variant,
      base_name: group.base_name,
      mainImage: group.main_variant.images?.[0]?.url || '/placeholder-image.jpg',
    });

    setQuantity('1');
    setDiscountPercent('');
    setDiscountTk('');

    // Fetch specific inventory for this variant
    try {
      const inv = await inventoryService.getGlobalInventory({ product_id: variant.id });
      if (inv.success && inv.data.length > 0) {
        setSelectedProductInventory(inv.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch variant inventory', err);
    }
  };

  const addToCart = () => {
    if (!selectedProduct || !quantity || parseInt(quantity) <= 0) {
      fireToast('Please select a product and enter quantity', 'error');
      return;
    }

    const price = Number(selectedProduct.selling_price || selectedProduct.price || 0);
    const qty = parseInt(quantity);
    const discPer = parseFloat(discountPercent) || 0;
    const discTk = parseFloat(discountTk || '0');

    const avail = selectedProduct.available_inventory ?? selectedProduct.stock_quantity ?? 0;
    if (qty > avail && !selectedProduct.isDefective) {
      fireToast(`Only ${avail} units available`, 'error');
      return;
    }

    const baseAmount = price * qty;
    const discountValue = discPer > 0 ? (baseAmount * discPer) / 100 : discTk;
    const finalAmount = baseAmount - discountValue;

    const newItem: CartProduct = {
      id: Date.now(),
      product_id: selectedProduct.id,
      batch_id: selectedProduct.isDefective ? selectedProduct.batchId : null,
      productName: selectedProduct.isDefective
        ? `${selectedProduct.productName} [DEFECTIVE]`
        : `${selectedProduct.base_name}${selectedProduct.variation_suffix ? ` - ${selectedProduct.variation_suffix}` : ''}`,
      sku: selectedProduct.sku,
      quantity: qty,
      unit_price: price,
      discount_amount: discountValue,
      amount: finalAmount,
      isDefective: selectedProduct.isDefective,
      defectId: selectedProduct.defectId,
      store_id: selectedProduct.isDefective ? selectedProduct.store_id : null,
      store_name: selectedProduct.isDefective ? selectedProduct.store_name : null,
    };

    setCart([...cart, newItem]);
    setSelectedProduct(null);
    setQuantity('');
    setDiscountPercent('');
    setDiscountTk('');
    setAmount('0.00');
    // Keep expandedGroupId but clear inventory if we want
  };

  const removeFromCart = (id: number | string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const totalDiscount = cart.reduce((sum, item) => sum + (item.discount_amount || 0), 0);
  const serviceTotalAmount = serviceCart.reduce((sum, item) => sum + item.amount, 0);
  const orderTotal = subtotal - totalDiscount + serviceTotalAmount + (parseFloat(transportCost) || 0);

  // ✅ Installment calculations
  const suggestedInstallmentAmount = useMemo(() => {
    if (!isInstallment || orderTotal <= 0) return 0;
    const n = Math.max(2, Math.min(24, Number(installmentCount) || 2));
    return Math.ceil((orderTotal / n) * 100) / 100;
  }, [isInstallment, installmentCount, orderTotal]);

  const actualPayingNow = useMemo(() => {
    if (!isInstallment) return 0;
    const custom = parseFloat(installmentPayingNow);
    if (custom > 0) return Math.min(custom, orderTotal);
    return suggestedInstallmentAmount;
  }, [isInstallment, installmentPayingNow, suggestedInstallmentAmount, orderTotal]);

  const installmentRemaining = useMemo(() => {
    return Math.max(0, orderTotal - actualPayingNow);
  }, [orderTotal, actualPayingNow]);

  const installmentPaymentMethodId = useMemo(() => {
    if (!isInstallment) return null;
    const method = paymentMethods.find(m => {
      if (installmentPaymentMode === 'cash') return m.type === 'cash' || m.code === 'cash';
      if (installmentPaymentMode === 'card') return m.type === 'card' || m.code === 'card';
      if (installmentPaymentMode === 'bkash') return m.type === 'mobile_banking' || m.code === 'bkash';
      if (installmentPaymentMode === 'bank_transfer') return m.type === 'bank_transfer' || m.code === 'bank_transfer';
      return false;
    });
    return method?.id || (paymentMethods[0]?.id ?? 1);
  }, [isInstallment, installmentPaymentMode, paymentMethods]);

  const addServiceToCart = (service: ServiceItem) => {
    setServiceCart((prev) => [...prev, service]);
    fireToast(`Service "${service.serviceName}" added`, 'success');
  };

  const removeServiceFromCart = (id: number) => {
    setServiceCart((prev) => prev.filter((s) => s.id !== id));
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all data and start a new order?')) {
      setCart([]);
      setServiceCart([]);
      setUserName('');
      setUserPhone('');
      setUserEmail('');
      setSocialId('');
      setStreetAddress('');
      setPostalCode('');
      setCountry('');
      setState('');
      setInternationalCity('');
      setInternationalPostalCode('');
      setDeliveryAddress('');
      setSelectedCityId('');
      setSelectedZoneId('');
      setSelectedAreaId('');
      setIsInternational(false);
      setIsPathaoAuto(true);
      setTransportCost('0');
      setPaymentOption('full');
      setAdvanceAmount('');
      setSelectedPaymentMethod('');
      setTransactionReference('');
      setPaymentNotes('');
      setOrderNotes('');
      setCodPaymentMethod('');
      setIsInstallment(false);
      setInstallmentCount(3);
      setInstallmentPaymentMode('cash');
      setInstallmentTransactionReference('');
      setInstallmentPayingNow('');
      
      localStorage.removeItem('social_commerce_state');
      localStorage.removeItem('social_commerce_queue');
      
      fireToast('Form cleared successfully', 'success');
    }
  };

  const handleConfirmOrder = async () => {
    if (!userName || !userPhone) {
      fireToast('Please fill in customer name and phone number', 'error');
      return;
    }
    if (cart.length === 0 && serviceCart.length === 0) {
      fireToast('Please add products or services to cart', 'error');
      return;
    }

    // ✅ Validate delivery address
    if (isInternational) {
      if (!country || !internationalCity || (!deliveryAddress && !streetAddress)) {
        fireToast('Please fill in international address', 'error');
        return;
      }
    } else {
      if (!streetAddress) {
        fireToast('Please enter full delivery address', 'error');
        return;
      }
    }

    // Store assignment validation
    if (storeAssignmentType === 'specific' && !selectedStoreId) {
      fireToast('Please select a store or choose auto-assign', 'error');
      return;
    }

    // Payment validation
    if (paymentOption !== 'none') {
      if (!selectedPaymentMethod) {
        fireToast('Please select a payment method', 'error');
        return;
      }
      const method = paymentMethods.find(m => String(m.id) === selectedPaymentMethod);
      if (method?.requires_reference && !transactionReference.trim()) {
        fireToast(`Please enter transaction reference for ${method.name}`, 'error');
        return;
      }
    }

    if (paymentOption === 'partial') {
      const adv = parseFloat(advanceAmount) || 0;
      if (adv <= 0 || adv >= subtotal - totalDiscount + (parseFloat(transportCost) || 0)) {
        fireToast('Please enter a valid advance amount', 'error');
        return;
      }
      if (!codPaymentMethod) {
        fireToast('Please select COD payment method', 'error');
        return;
      }
    }

    if (paymentOption === 'none' && !codPaymentMethod) {
      fireToast('Please select COD payment method for full amount', 'error');
      return;
    }

    try {
      setIsProcessingOrder(true);
      console.log('📦 CREATING SOCIAL COMMERCE ORDER');

      const total = orderTotal;

      const shipping_address = isInternational
        ? {
          name: userName,
          phone: userPhone,
          street: deliveryAddress || streetAddress,
          city: internationalCity,
          state: state || undefined,
          country,
          postal_code: internationalPostalCode || undefined,
        }
        : {
          name: userName,
          phone: userPhone,
          street: streetAddress,
          postal_code: postalCode || undefined,
          pathao_city_id: !isPathaoAuto ? Number(selectedCityId) : undefined,
          pathao_zone_id: !isPathaoAuto ? Number(selectedZoneId) : undefined,
          pathao_area_id: !isPathaoAuto ? Number(selectedAreaId) : undefined,
        };

      const orderData = {
        order_type: 'social_commerce',
        customer: {
          name: userName,
          email: userEmail || undefined,
          phone: userPhone,
        },
        shipping_address,
        store_id: storeAssignmentType === 'specific' ? parseInt(selectedStoreId) : null,
        items: cart.map(item => ({
          product_id: item.product_id,
          batch_id: item.isDefective ? item.batch_id : null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount,
        })),
        // Services attached to the order
        services: serviceCart.map(s => ({
          service_id: s.serviceId,
          service_name: s.serviceName,
          quantity: s.quantity,
          unit_price: s.price,
          discount_amount: 0,
          total_amount: s.amount,
          category: s.category,
        })),
        shipping_amount: parseFloat(transportCost) || 0,
        notes: paymentNotes.trim(),
        // Installment plan (if enabled)
        ...(isInstallment
          ? {
            installment_plan: {
              total_installments: Math.max(2, Math.min(24, Number(installmentCount) || 2)),
              installment_amount: suggestedInstallmentAmount,
              start_date: undefined,
            },
          }
          : {}),
      };

      const response = await axios.post('/orders', orderData);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create order');
      }

      const createdOrder = response.data.data;
      console.log('✅ Order created:', createdOrder.order_number);

      // Handle defective items
      const defectiveItems = cart.filter(item => item.isDefective);
      for (const defectItem of defectiveItems) {
        try {
          await axios.post(`/defects/${defectItem.defectId}/mark-sold`, {
            order_id: createdOrder.id,
            selling_price: defectItem.unit_price,
            sale_notes: `Sold via Social Commerce - Order #${createdOrder.order_number}`,
            sold_at: new Date().toISOString()
          });
        } catch (err) {
          console.error(`Failed to mark defective ${defectItem.defectId} as sold`, err);
        }
      }

      // Handle Payment
      if (isInstallment) {
        // ✅ Installment/EMI: collect first payment now
        if (installmentPaymentMethodId && actualPayingNow > 0) {
          console.log('💳 Processing installment/EMI first payment...');
          await paymentService.addInstallmentPayment(createdOrder.id, {
            payment_method_id: installmentPaymentMethodId,
            amount: actualPayingNow,
            auto_complete: true,
            notes: `Social Commerce installment/EMI - 1st of ${Math.max(2, Math.min(24, Number(installmentCount) || 2))}`,
            payment_data: installmentTransactionReference
              ? { transaction_reference: installmentTransactionReference }
              : {},
          });
          console.log('✅ Installment payment processed');
        }
      } else if (paymentOption !== 'none') {
        const method = paymentMethods.find(m => String(m.id) === selectedPaymentMethod);
        const amountToPay = paymentOption === 'full' ? total : (parseFloat(advanceAmount) || 0);

        const paymentData: any = {
          payment_method_id: parseInt(selectedPaymentMethod),
          amount: amountToPay,
          payment_type: paymentOption === 'full' ? 'full' : 'partial',
          auto_complete: true,
          notes: paymentNotes.trim(),
          payment_data: {
            mobile_number: userPhone,
            provider: method?.name,
            transaction_id: transactionReference,
            payment_stage: paymentOption === 'full' ? 'full' : 'advance'
          }
        };

        if (method?.requires_reference) {
          paymentData.transaction_reference = transactionReference;
          paymentData.external_reference = transactionReference;
        }

        await axios.post(`/orders/${createdOrder.id}/payments/simple`, paymentData);
      }

      fireToast(`Order ${createdOrder.order_number} placed successfully!`, 'success');

      // Cleanup and NOT redirecting
      setCart([]);
      setServiceCart([]);
      setUserName('');
      setUserPhone('');
      setUserEmail('');
      setSocialId('');
      setStreetAddress('');
      setPostalCode('');
      setCountry('');
      setState('');
      setInternationalCity('');
      setInternationalPostalCode('');
      setDeliveryAddress('');
      localStorage.removeItem('social_commerce_state');
      localStorage.removeItem('social_commerce_queue');
      setCountry('');
      setState('');
      setInternationalCity('');
      setInternationalPostalCode('');
      setDeliveryAddress('');
      setIsInternational(false);
      setTransportCost('0');
      setPaymentOption('full');
      setAdvanceAmount('');
      setTransactionReference('');
      setPaymentNotes('');
      setExistingCustomer(null);
      setLastOrderInfo(null);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedProduct(null);
      setExpandedGroupId(null);
      setSelectedProductInventory(null);

    } catch (error: any) {
      console.error('❌ Error:', error);
      fireToast(error.response?.data?.message || error.message || 'Failed to process order', 'error');
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const renderOrderSummary = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <div className="bg-teal-500 w-2 h-2 rounded-full"></div>
          Order Summary ({cart.length + serviceCart.length} items)
        </h3>
      </div>

      <div className="max-h-[380px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Product</th>
              <th className="px-2 py-2 text-center font-medium">Qty</th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {cart.length === 0 && serviceCart.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 italic">
                  Cart is empty
                </td>
              </tr>
            ) : (
              <>
                {cart.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{item.productName}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">SKU: {item.sku}</p>
                    </td>
                    <td className="px-2 py-3 text-center text-gray-700 dark:text-gray-300">{item.quantity}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                      <div className="flex flex-col items-end">
                        <span>{(item.unit_price * item.quantity).toLocaleString()} Tk</span>
                        {(item.discount_amount || 0) > 0 && (
                          <span className="text-[10px] text-red-500 font-medium">
                            - {item.discount_amount.toLocaleString()} Tk (Disc)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Service Items */}
                {serviceCart.length > 0 && (
                  <>
                    <tr>
                      <td colSpan={4} className="px-4 py-2 bg-amber-50/60 dark:bg-amber-900/10">
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Wrench size={10} /> Services
                        </span>
                      </td>
                    </tr>
                    {serviceCart.map((svc) => (
                      <tr key={`svc-${svc.id}`} className="hover:bg-amber-50/40 dark:hover:bg-amber-900/10 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-white">{svc.serviceName}</p>
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 capitalize">{svc.category}</p>
                        </td>
                        <td className="px-2 py-3 text-center text-gray-700 dark:text-gray-300">{svc.quantity}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                          {svc.amount.toLocaleString()} Tk
                        </td>
                        <td className="px-2 py-3 text-center">
                          <button
                            onClick={() => removeServiceFromCart(svc.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 space-y-4">
        {/* Pricing Summary */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Products Subtotal</span>
            <span className="font-medium text-gray-900 dark:text-white">{subtotal.toLocaleString()} ৳</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-xs text-red-500">
              <span>Discount</span>
              <span className="font-medium">-{totalDiscount.toLocaleString()} ৳</span>
            </div>
          )}
          {serviceTotalAmount > 0 && (
            <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400">
              <span>Services</span>
              <span className="font-medium">+{serviceTotalAmount.toLocaleString()} ৳</span>
            </div>
          )}
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600 dark:text-gray-400">Transport Cost</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={transportCost === '0' ? '' : transportCost}
                placeholder="0"
                onChange={(e) => {
                  const val = e.target.value;
                  setTransportCost(val === '' ? '0' : val);
                }}
                className="w-20 px-2 py-1 text-right text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-teal-500 outline-none"
              />
              <span className="text-gray-400 font-medium">৳</span>
            </div>
          </div>
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between text-lg font-bold text-teal-600 dark:text-teal-400">
            <span>Total</span>
            <span>{(subtotal - totalDiscount + serviceTotalAmount + (parseFloat(transportCost) || 0)).toLocaleString()} ৳</span>
          </div>
        </div>

        {/* Store Assignment */}
        <div className="space-y-2 pt-2">
          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Logistics & Store</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setStoreAssignmentType('auto')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${storeAssignmentType === 'auto'
                ? 'bg-teal-500 text-white border-teal-500 shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <Truck size={14} /> Auto
            </button>
            <button
              onClick={() => setStoreAssignmentType('specific')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${storeAssignmentType === 'specific'
                ? 'bg-teal-500 text-white border-teal-500 shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <StoreIcon size={14} /> Manual
            </button>
          </div>
          {storeAssignmentType === 'specific' && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="">Select Store Branch</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Payment Logic */}
        <div className="space-y-2 pt-2">
          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Payment Flow</label>
          <div className="flex gap-2">
            {[
              { id: 'full', label: 'Full', icon: <DollarSign size={14} /> },
              { id: 'partial', label: 'Partial', icon: <Wallet size={14} /> },
              { id: 'none', label: 'None', icon: <X size={14} /> }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setPaymentOption(opt.id as any);
                  if (opt.id === 'none') setAdvanceAmount('');
                }}
                className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${paymentOption === opt.id
                  ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>

          {(paymentOption === 'full' || paymentOption === 'partial') && (
            <div className="space-y-2 pt-1">
              {paymentOption === 'partial' && (
                <input
                  type="number"
                  placeholder="Advance Amount"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select Payment Method</option>
                {paymentMethods.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Transaction Reference"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {(paymentOption === 'partial' || paymentOption === 'none') && (
            <select
              value={codPaymentMethod}
              onChange={(e) => setCodPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select COD Method</option>
              {paymentMethods.filter(m => m.type === 'cash').map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
        </div>

        <button
          onClick={handleConfirmOrder}
          disabled={(cart.length === 0 && serviceCart.length === 0) || isProcessingOrder}
          className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isProcessingOrder ? 'Creating Order...' : 'Confirm Order'}
        </button>
      </div>
    </div>
  );

  const renderProductSearch = () => (
    <div className="space-y-6 flex-1 flex flex-col min-h-0">
      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products by SKU or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-teal-500 rounded-lg outline-none transition-all dark:text-white"
          />
        </div>
      </div>

      {/* Selected Component - Qty, Discount, Add */}
      {selectedProduct && (
        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl p-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white">{selectedProduct.base_name}</h4>
              <p className="text-xs text-teal-600 dark:text-teal-400">{selectedProduct.variation_suffix || 'Base Style'} - {selectedProduct.sku}</p>
              <p className="text-sm font-bold mt-1 text-teal-700 dark:text-teal-300">{selectedProduct.selling_price} ৳</p>
            </div>
            <button onClick={() => setSelectedProduct(null)} className="p-1 hover:bg-teal-100 rounded-full"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Quantity</label>
              <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full p-2 text-sm border rounded-lg bg-white dark:bg-gray-800" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Disc %</label>
              <input type="number" value={discountPercent} onChange={(e) => { setDiscountPercent(e.target.value); setDiscountTk(''); }} className="w-full p-2 text-sm border rounded-lg bg-white dark:bg-gray-800" placeholder="0" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Disc ৳</label>
              <input type="number" value={discountTk} onChange={(e) => { setDiscountTk(e.target.value); setDiscountPercent(''); }} className="w-full p-2 text-sm border rounded-lg bg-white dark:bg-gray-800" placeholder="0" />
            </div>
            <button onClick={addToCart} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-lg text-sm">Add to Cart</button>
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-3 flex-1 overflow-y-auto pr-2 scrollbar-hide" style={{ maxHeight: '600px' }}>
        {searchResults.map((group) => (
          <div key={group.base_name} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div
              onClick={() => handleGroupClick(group)}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50"
            >
              <div className="flex items-center gap-4">
                <img
                  src={group.main_variant.images?.[0]?.url || '/placeholder-image.jpg'}
                  alt={group.base_name}
                  className="w-12 h-12 object-cover rounded-lg border"
                />
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">{group.base_name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-bold text-teal-600">{group.min_price} ৳</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">Available: {group.total_available ?? group.total_stock}</span>
                    {group.total_reserved ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-full">Reserved: {group.total_reserved}</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <ChevronDown size={16} className={`transition-transform ${expandedGroupId === group.base_name ? 'rotate-180' : ''}`} />
            </div>

            {expandedGroupId === group.base_name && (
              <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/20">
                {[group.main_variant, ...group.variants].map((variant) => (
                  <div
                    key={variant.id}
                    onClick={() => handleVariantSelect(variant, group)}
                    className="p-3 flex items-center justify-between border-b last:border-0 border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-white dark:hover:bg-gray-800"
                  >
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{variant.variation_suffix || 'Standard'}</span>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="font-bold">{variant.selling_price} ৳</span>
                      <span className="text-gray-400">|</span>
                      <span className={(variant.available_inventory ?? variant.stock_quantity) > 0 ? 'text-green-600' : 'text-red-500'}>
                        Avail: {variant.available_inventory ?? variant.stock_quantity}
                      </span>
                      {variant.reserved_inventory ? (
                        <span className="text-blue-500 font-medium">({variant.reserved_inventory} Res)</span>
                      ) : null}
                      <Plus size={14} className="text-teal-600" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderBranchAvailability = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <StoreIcon size={16} className="text-teal-500" />
          Branch Availability {selectedProduct ? `- ${selectedProduct.variation_suffix || selectedProduct.base_name}` : ''}
        </h3>
      </div>
      <div className="p-4 flex-1">
        {!selectedProductInventory ? (
          <div className="py-8 text-center text-xs text-gray-400 italic">Select a product to see branch-wise stock</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b dark:border-gray-700">
                <th className="text-left py-2 font-medium">Branch</th>
                <th className="text-center py-2 font-medium">Status</th>
                <th className="text-right py-2 font-medium">Qty</th>
              </tr>
            </thead>
            <tbody>
              {stores.map(branch => {
                const s = selectedProductInventory.stores.find(s => s.store_id === branch.id);
                const qty = s?.quantity || 0;
                return (
                  <tr key={branch.id} className="border-b last:border-0 border-gray-50 dark:border-gray-700/50">
                    <td className="py-3 font-medium">{branch.name}</td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${qty > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {qty > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold text-sm">
                      <div className="flex flex-col items-end">
                        <span>{qty}</span>
                        <span className="text-[10px] text-gray-400 font-normal">Physical</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderCustomerDetails = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-6 flex flex-col justify-center">
      <div className="flex items-center justify-between border-b pb-4">
        <h3 className="text-sm font-bold flex items-center gap-2"><MapPin size={16} className="text-teal-500" /> Delivery Details</h3>
        <button onClick={() => setIsInternational(!isInternational)} className="text-[10px] font-bold px-3 py-1.5 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg hover:bg-teal-100 transition-colors">
          {isInternational ? 'International Shipping' : 'Domestic Delivery'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Customer Name*</label>
            <input placeholder="Name" value={userName} onChange={e => setUserName(e.target.value)} className="w-full p-2.5 text-sm border rounded-lg bg-gray-50 dark:bg-gray-900 border-none outline-none focus:ring-1 focus:ring-teal-500 text-gray-900 dark:text-white" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Phone Number*</label>
            <input placeholder="Phone" value={userPhone} onChange={e => setUserPhone(e.target.value)} onBlur={handlePhoneBlur} className="w-full p-2.5 text-sm border rounded-lg bg-gray-50 dark:bg-gray-900 border-none outline-none focus:ring-1 focus:ring-teal-500 text-gray-900 dark:text-white" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Street Address*</label>
            <textarea placeholder="Address" value={streetAddress} onChange={e => setStreetAddress(e.target.value)} rows={3} className="w-full p-2.5 text-sm border rounded-lg bg-gray-50 dark:bg-gray-900 border-none outline-none focus:ring-1 focus:ring-teal-500 resize-none text-gray-900 dark:text-white" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Email Address</label>
            <input placeholder="Email" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="w-full p-2.5 text-sm border rounded-lg bg-gray-50 dark:bg-gray-900 border-none outline-none focus:ring-1 focus:ring-teal-500 text-gray-900 dark:text-white" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Social Media ID</label>
            <input placeholder="Social ID" value={socialId} onChange={e => setSocialId(e.target.value)} className="w-full p-2.5 text-sm border rounded-lg bg-gray-50 dark:bg-gray-900 border-none outline-none focus:ring-1 focus:ring-teal-500 text-gray-900 dark:text-white" />
          </div>
          {isInternational && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Country</label>
                <input placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} className="w-full p-2 text-xs border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">City</label>
                <input placeholder="City" value={internationalCity} onChange={e => setInternationalCity(e.target.value)} className="w-full p-2 text-xs border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />
              </div>
            </div>
          )}
          {existingCustomer && (
            <div className="text-[10px] p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-800 font-medium text-teal-800 dark:text-teal-300">
              <span className="font-bold">Returning Customer:</span> {existingCustomer.total_orders} total orders found.
            </div>
          )}
        </div>
      </div>
    </div>
  );


  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6 lg:p-10">
            <div className="max-w-[1400px] mx-auto space-y-8">
              {/* Top Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Social Commerce</h1>
                  <button
                    onClick={handleClearAll}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-500 hover:text-white border border-red-200 hover:bg-red-500 rounded-xl transition-all shadow-sm"
                  >
                    <RefreshCw size={14} /> Clear All
                  </button>
                </div>
                
                <div className="flex items-start gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Sales By</label>
                    <div className="bg-gray-100 dark:bg-gray-800/50 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[180px] shadow-sm">
                      {salesBy || 'System User'}
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Date <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type="text"
                        value={date}
                        readOnly
                        className="bg-white dark:bg-gray-800 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-900 dark:text-white w-40 shadow-sm focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Store</label>
                    <div>
                      <div className="bg-gray-100 dark:bg-gray-800/50 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-900 dark:text-white uppercase min-w-[160px] shadow-sm">
                        {selectedStore?.name || 'Main Warehouse'}
                      </div>
                      <p className="text-[10px] font-bold text-green-500 mt-1.5 ml-1 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        {inventoryStats?.active_batches || 0} batches available
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left Column - Form Data */}
                <div className="lg:col-span-3 space-y-6">
                  {/* Customer Information */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="p-6">
                      <h2 className="text-base font-bold text-gray-800 dark:text-white">Customer Information</h2>
                      
                      <div className="mt-6 space-y-5">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">User Name*</label>
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            className="w-full bg-white dark:bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm focus:ring-1 focus:ring-teal-500 outline-none transition-all placeholder:text-gray-300"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">User Phone Number*</label>
                          <input
                            type="text"
                            placeholder="Phone Number"
                            value={userPhone}
                            onChange={(e) => setUserPhone(e.target.value)}
                            onBlur={handlePhoneBlur}
                            className="w-full bg-white dark:bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm focus:ring-1 focus:ring-teal-500 outline-none transition-all placeholder:text-gray-300"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Full Address*</label>
                          <textarea
                            placeholder="House 71, Road 15, Sector 11, Uttara, Dhaka"
                            value={streetAddress}
                            onChange={(e) => setStreetAddress(e.target.value)}
                            rows={3}
                            className="w-full bg-white dark:bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm focus:ring-1 focus:ring-teal-500 outline-none transition-all resize-none placeholder:text-gray-300"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Postal Code</label>
                          <input
                            type="text"
                            placeholder="e.g., 1212"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            className="w-full bg-white dark:bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm focus:ring-1 focus:ring-teal-500 outline-none transition-all placeholder:text-gray-300"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">User Email</label>
                          <input
                            type="email"
                            placeholder="sample@email.com (optional)"
                            value={userEmail}
                            onChange={(e) => setUserEmail(e.target.value)}
                            className="w-full bg-white dark:bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm focus:ring-1 focus:ring-teal-500 outline-none transition-all placeholder:text-gray-300"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Social ID</label>
                          <input
                            type="text"
                            placeholder="Enter Social ID"
                            value={socialId}
                            onChange={(e) => setSocialId(e.target.value)}
                            className="w-full bg-white dark:bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm focus:ring-1 focus:ring-teal-500 outline-none transition-all placeholder:text-gray-300"
                          />
                        </div>

                        {/* Domestic/International Toggle */}
                        <div className="flex p-1 bg-white border border-gray-200 dark:bg-gray-800 rounded-xl mt-4">
                          <button
                            onClick={() => setIsInternational(false)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${!isInternational ? 'bg-[#1a1f2c] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                          >
                            <span>🔥</span> Domestic
                          </button>
                          <button
                            onClick={() => setIsInternational(true)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${isInternational ? 'bg-[#1a1f2c] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                          >
                            <Globe size={16} className={isInternational ? 'text-white' : 'text-gray-400'} /> International
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Add-on Services */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-gray-800 dark:text-white">Add-on Services</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Add service items (tailoring, wash, repair, etc.)</p>
                    </div>
                    <ServiceSelector
                      onAddService={addServiceToCart}
                      darkMode={darkMode}
                      allowManualPrice={true}
                    />
                  </div>

                  {/* Delivery Details */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-center gap-3">
                        <h2 className="text-base font-bold text-gray-800 dark:text-white">Delivery Details</h2>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-[#c2410c] dark:text-orange-400 rounded-full text-[10px] font-bold">
                          <span>🏠</span> Domestic
                        </div>
                      </div>
                      
                      <div className="mt-6 space-y-6">
                        {!isInternational ? (
                          <div className="space-y-6">
                            <div className="bg-[#f8fafc] dark:bg-gray-800/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-xs font-bold text-gray-800 dark:text-white tracking-tight">Auto-detect Pathao location</p>
                                <p className="text-[11px] text-gray-500 mt-1 font-medium leading-relaxed max-w-[280px]">When ON, City/Zone/Area are not required. Pathao will infer the location from the full address text.</p>
                              </div>
                              <input
                                type="checkbox"
                                checked={isPathaoAuto}
                                onChange={(e) => setIsPathaoAuto(e.target.checked)}
                                className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                              />
                            </div>
                            
                            <p className="text-[11px] text-gray-400 italic px-1">
                              Tip: include area + city (e.g., <span className="font-bold">Uttara, Dhaka</span>) in the address above.
                            </p>
                          </div>
                        ) : null}

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Order Notes</label>
                          <textarea
                            placeholder="Special instructions, landmark, preferred delivery note, packaging note, etc."
                            value={orderNotes}
                            onChange={(e) => setOrderNotes(e.target.value)}
                            rows={3}
                            className="w-full bg-white dark:bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm focus:ring-1 focus:ring-teal-500 outline-none transition-all resize-none placeholder:text-gray-300"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Cart & Search */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Search Product */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/50">
                      <h2 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                        <Search size={18} className="text-teal-500" />
                        Search Product
                      </h2>
                    </div>
                    <div className="p-6 space-y-5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type to search product..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="flex-1 bg-white dark:bg-gray-800 px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none transition-all shadow-sm placeholder:text-gray-300 dark:placeholder:text-gray-600"
                        />
                        <input
                          type="number"
                          placeholder="Min ৳"
                          value={minPriceFilter}
                          onChange={(e) => setMinPriceFilter(e.target.value)}
                          className="w-20 bg-white dark:bg-gray-800 px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold focus:ring-2 focus:ring-teal-500 outline-none transition-all shadow-sm text-center placeholder:text-gray-300 dark:placeholder:text-gray-600"
                        />
                        <input
                          type="number"
                          placeholder="Max ৳"
                          value={maxPriceFilter}
                          onChange={(e) => setMaxPriceFilter(e.target.value)}
                          className="w-20 bg-white dark:bg-gray-800 px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold focus:ring-2 focus:ring-teal-500 outline-none transition-all shadow-sm text-center placeholder:text-gray-300 dark:placeholder:text-gray-600"
                        />
                        <input
                          type="number"
                          placeholder="Exact ৳"
                          value={exactPriceFilter}
                          onChange={(e) => setExactPriceFilter(e.target.value)}
                          className="w-20 bg-blue-50 dark:bg-blue-900/10 px-3 py-3 rounded-xl border border-blue-200 dark:border-blue-900 text-xs font-black focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm text-center text-blue-700 dark:text-blue-300 placeholder:text-blue-200 dark:placeholder:text-blue-800"
                        />
                        <button className="bg-black dark:bg-white text-white dark:text-black p-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center">
                          <Search size={22} strokeWidth={2.5} />
                        </button>
                      </div>

                      <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-between gap-6 transition-all hover:border-teal-400 group">
                        <div className="flex-1">
                          <p className="text-[11px] leading-relaxed font-semibold text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                            Click a product card to stage it instantly, or open Product List for bigger browsing.
                          </p>
                        </div>
                        <button
                          onClick={() => router.push(`/product/list?mode=social_commerce&redirect=/social-commerce`)}
                          className="flex-shrink-0 bg-white dark:bg-gray-900 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-[11px] font-black text-gray-900 dark:text-white hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all shadow-md whitespace-nowrap uppercase tracking-widest"
                        >
                          Browse Product List
                        </button>
                      </div>

                      <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex items-start gap-3">
                        <div className="bg-indigo-500/10 p-1 rounded-md text-indigo-600 dark:text-indigo-400">
                          <Info size={14} />
                        </div>
                        <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 leading-tight">
                          Instant stage mode is on. Click any product card to add it to the staged list, then edit quantity, discount, or final amount there before adding everything to cart.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cart */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/50 flex items-center justify-between">
                      <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Cart ({cart.length + serviceCart.length} items)</h2>
                    </div>
                    
                    <div className="flex-1 min-h-[400px]">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-800">
                          <tr>
                            <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                            <th className="px-4 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</th>
                            <th className="px-4 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Price</th>
                            <th className="px-4 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                            <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {cart.length === 0 && serviceCart.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-20 text-center text-gray-300 dark:text-gray-600 italic text-sm font-medium">
                                <div className="flex flex-col items-center gap-2">
                                  <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-200 dark:text-gray-700">
                                    <ShoppingBag size={24} />
                                  </div>
                                  No products in cart
                                </div>
                              </td>
                            </tr>
                          ) : (
                            <>
                              {cart.map((item) => (
                                <tr key={item.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                  <td className="px-6 py-5">
                                    <p className="text-xs font-black text-gray-900 dark:text-white truncate max-w-[150px]">{item.productName}</p>
                                    <p className="text-[10px] text-gray-500 font-mono mt-1 uppercase tracking-tighter">{item.sku}</p>
                                  </td>
                                  <td className="px-4 py-5 text-center text-xs font-black text-gray-700 dark:text-gray-300">
                                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">{item.quantity}</span>
                                  </td>
                                  <td className="px-4 py-5 text-right text-xs font-bold text-gray-600 dark:text-gray-400">{item.unit_price.toLocaleString()}</td>
                                  <td className="px-4 py-5 text-right text-xs font-black text-gray-900 dark:text-white">{item.amount.toLocaleString()}</td>
                                  <td className="px-6 py-5 text-center">
                                    <button
                                      onClick={() => removeFromCart(item.id)}
                                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                      title="Remove from cart"
                                    >
                                      <X size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {serviceCart.map((svc) => (
                                <tr key={`svc-${svc.id}`} className="group hover:bg-amber-50/20 dark:hover:bg-amber-900/10 transition-colors">
                                  <td className="px-6 py-5 border-l-4 border-amber-400">
                                    <p className="text-xs font-black text-amber-700 dark:text-amber-400 truncate max-w-[150px]">{svc.serviceName}</p>
                                    <p className="text-[10px] text-amber-600 dark:text-amber-500 uppercase tracking-widest mt-1 font-bold">{svc.category}</p>
                                  </td>
                                  <td className="px-4 py-5 text-center text-xs font-black text-amber-700 dark:text-amber-300">
                                    <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/30 rounded-md">{svc.quantity}</span>
                                  </td>
                                  <td className="px-4 py-5 text-right text-xs font-bold text-amber-700 dark:text-amber-300">{svc.price.toLocaleString()}</td>
                                  <td className="px-4 py-5 text-right text-xs font-black text-amber-700 dark:text-amber-400">{svc.amount.toLocaleString()}</td>
                                  <td className="px-6 py-5 text-center">
                                    <button
                                      onClick={() => removeServiceFromCart(svc.id)}
                                      className="p-2 text-amber-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                      <X size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-6 bg-gray-50/80 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 space-y-4">
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-bold text-gray-500">Subtotal:</span>
                        <div className="text-right">
                          <p className="text-xl font-black text-gray-900 dark:text-white">{orderTotal.toFixed(2)} Tk</p>
                          {totalDiscount > 0 && <p className="text-[10px] font-bold text-red-500 mt-0.5">- {totalDiscount.toFixed(2)} Tk Discount</p>}
                        </div>
                      </div>

                      {/* ✅ Installment / EMI Section */}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isInstallment}
                            onChange={(e) => setIsInstallment(e.target.checked)}
                            className="h-4 w-4 accent-teal-600 rounded"
                          />
                          Installment / EMI
                        </label>

                        {isInstallment && (
                          <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400">Total installments</label>
                                <input
                                  type="number"
                                  min={2}
                                  max={24}
                                  value={installmentCount === 0 ? '' : installmentCount}
                                  placeholder="3"
                                  onChange={(e) => setInstallmentCount(e.target.value === '' ? 0 : Number(e.target.value))}
                                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400">Paying now</label>
                                <div className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-bold text-gray-900 dark:text-white">
                                  ৳{suggestedInstallmentAmount.toFixed(2)}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400">Payment method</label>
                                <select
                                  value={installmentPaymentMode}
                                  onChange={(e) => setInstallmentPaymentMode(e.target.value as any)}
                                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                >
                                  <option value="cash">Cash</option>
                                  <option value="card">Card</option>
                                  <option value="bkash">bKash</option>
                                  <option value="bank_transfer">Bank Transfer</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400">Txn ref (optional)</label>
                                <input
                                  value={installmentTransactionReference}
                                  onChange={(e) => setInstallmentTransactionReference(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                  placeholder="e.g. Txn ID"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400">Paying now (flexible)</label>
                              <input
                                type="number"
                                value={installmentPayingNow}
                                placeholder={suggestedInstallmentAmount.toFixed(2)}
                                onChange={(e) => setInstallmentPayingNow(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                              />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                              <span>Suggested per installment: <span className="font-bold text-gray-700 dark:text-gray-300">৳{suggestedInstallmentAmount.toFixed(2)}</span></span>
                              <span>Remaining after today: <span className="font-bold text-gray-700 dark:text-gray-300">৳{installmentRemaining.toFixed(2)}</span></span>
                            </div>
                          </div>
                        )}
                      </div>

                      {isInternational && (
                        <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-center gap-3">
                          <Globe size={16} className="text-blue-500" />
                          <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">International shipping rates will apply</p>
                        </div>
                      )}

                      <button
                        onClick={handleConfirmOrder}
                        disabled={(cart.length === 0 && serviceCart.length === 0) || isProcessingOrder}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl shadow-xl shadow-teal-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:scale-100"
                      >
                        {isProcessingOrder ? 'Processing...' : isInstallment ? `Confirm Order (EMI: ৳${actualPayingNow.toFixed(2)} now)` : 'Confirm Order'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
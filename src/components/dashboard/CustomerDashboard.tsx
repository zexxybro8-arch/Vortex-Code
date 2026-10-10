import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, type ApiRedeemCode } from '../../services/api';
import type { DashboardTab, StoreProduct } from '../../types';
import { HowToRedeem } from './HowToRedeem';
import { SupportTab } from './SupportTab';
import { formatMaskedCode, formatFullCode } from '../../utils/codeFormat';
import { PaymentCheckoutModal, type CheckoutData } from '../checkout/PaymentCheckoutModal';
import {
  Search,
  Zap,
  ShieldCheck,
  ShoppingBag,
  Key,
  Check,
  Tag,
  ArrowUpDown,
  Sparkles,
  Info,
  LogOut,
  User as UserIcon,
  HelpCircle,
  Ticket,
  AlertCircle,
  ChevronDown,
  Copy,
  Gift,
  ArrowRight,
  History,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const { user, orders, addToast, triggerAuthRequired, refreshCustomerOrders, dashboardTab } = useAuth();

  const [activeTab, setActiveTab] = useState<DashboardTab>((dashboardTab as DashboardTab) || 'redeem-code');

  useEffect(() => {
    if (dashboardTab) {
      setActiveTab(dashboardTab as DashboardTab);
    }
  }, [dashboardTab]);
  
  // Store Filters State
  const [selectedDenomination, setSelectedDenomination] = useState<string>('ALL VALUES');
  const [buyingProductId, setBuyingProductId] = useState<string | null>(null);
  const [buyingCodeId, setBuyingCodeId] = useState<string | null>(null);

  // Payment Checkout Modal State
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // Live Products and securely masked unused codes from single source of truth (Database)
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [unusedCodes, setUnusedCodes] = useState<ApiRedeemCode[]>([]);
  const [activeCategories, setActiveCategories] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  // Request counter ref to prevent race conditions from out-of-order async responses
  const fetchRequestIdRef = React.useRef(0);

  // Verified Purchase History State from Database
  const [verifiedPurchases, setVerifiedPurchases] = useState<any[]>([]);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState<boolean>(false);
  const [purchasesError, setPurchasesError] = useState<string | null>(null);
  const [unmaskedCodeIds, setUnmaskedCodeIds] = useState<Record<string, boolean>>({});
  const [accountQueryInput, setAccountQueryInput] = useState<string>('');
  const [queriedAccountId, setQueriedAccountId] = useState<string>('');

  const loadPurchaseHistory = useCallback(async (accountIdOverride?: string) => {
    setIsLoadingPurchases(true);
    setPurchasesError(null);
    try {
      const targetId = accountIdOverride !== undefined
        ? accountIdOverride.trim()
        : (user?.customerId || user?.id || '');
      const email = accountIdOverride ? undefined : user?.email;
      setQueriedAccountId(targetId);

      const res = await api.getPurchaseHistory(targetId, email);
      if (res && res.success && Array.isArray(res.purchases)) {
        setVerifiedPurchases(res.purchases);
      } else {
        setVerifiedPurchases([]);
      }
    } catch (err: any) {
      console.warn('Failed to load purchase history:', err);
      setPurchasesError('Unable to load purchase records from server.');
      setVerifiedPurchases([]);
    } finally {
      setIsLoadingPurchases(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'purchase-history' || activeTab === 'my-orders') {
      loadPurchaseHistory();
    }
  }, [activeTab, loadPurchaseHistory]);

  // Helper to match unused redeem codes to a product deterministically
  const getUnusedCodesForProduct = useCallback(
    (prod: StoreProduct, codes: ApiRedeemCode[]): ApiRedeemCode[] => {
      if (!prod || prod.enabled === false) return [];
      return codes.filter((c) => {
        if (c.status && c.status !== 'UNUSED') return false;
        if (c.productId && c.productId === prod.id) return true;
        if (
          c.denomination &&
          (c.denomination === prod.denomination ||
            c.denomination === `₹${prod.priceRupees}` ||
            Number(c.price) === prod.priceRupees)
        ) {
          return true;
        }
        return false;
      });
    },
    []
  );

  const fetchLiveDatabaseData = useCallback(async () => {
    const currentRequestId = ++fetchRequestIdRef.current;
    try {
      // Fetch live products, unused codes, and active categories from database
      const [apiProds, apiCodes, apiCats] = await Promise.all([
        api.getProducts(),
        api.getRedeemCodes(undefined, 'UNUSED'),
        api.getCategories(false),
      ]);

      // Ignore out-of-order stale response
      if (currentRequestId !== fetchRequestIdRef.current) return;

      if (Array.isArray(apiCats)) {
        setActiveCategories(apiCats);
      }

      if (Array.isArray(apiProds)) {
        const mapped: StoreProduct[] = apiProds.map((p) => {
          const isEnabled = p.enabled !== undefined ? Boolean(p.enabled) : true;
          const stock = Number(p.stock ?? 0);
          return {
            id: p.id,
            name: p.name || 'Google Play Recharge Code',
            priceRupees: Number(p.price),
            rewardValueRupees: Number(p.rewardValue || p.price * 15),
            denomination: p.denomination || `₹${p.price}`,
            category: (p.category as any) || 'DIGITAL REWARDS',
            stockStatus: !isEnabled ? 'OUT OF STOCK' : stock > 0 ? 'AVAILABLE' : 'OUT OF STOCK',
            deliveryInfo: '⚡ Instant Automated Vault Key Delivery',
            badge: !isEnabled ? 'DISABLED' : stock > 0 ? `${stock} Available` : 'OUT OF STOCK',
            image: p.image || 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png',
            description: p.description || '',
            stock,
            soldCount: Number(p.soldCount ?? 0),
            totalCodes: Number(p.totalCodes ?? 0),
            enabled: isEnabled,
          };
        });
        setProducts(mapped);
      }

      if (Array.isArray(apiCodes)) {
        setUnusedCodes(apiCodes);
      }

      setInventoryError(null);
    } catch (err: any) {
      if (currentRequestId !== fetchRequestIdRef.current) return;
      console.warn('Network sync notice in CustomerDashboard (retaining last valid inventory state):', err);
      
      // If no inventory is loaded yet (initial boot failure), show error state instead of fake 0 stock
      setProducts((prev) => {
        if (prev.length === 0) {
          setInventoryError('Unable to load inventory from server. Retrying connection...');
        }
        return prev; // NEVER clear existing valid inventory state on transient errors
      });
    } finally {
      if (currentRequestId === fetchRequestIdRef.current) {
        setIsLoadingData(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchLiveDatabaseData();
    // Continuous background synchronization every 2.5s for real-time stock/price sync
    const interval = setInterval(fetchLiveDatabaseData, 2500);
    return () => clearInterval(interval);
  }, [fetchLiveDatabaseData]);

  useEffect(() => {
    // Check for payment callback params from the redirect url
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment_success') === 'true') {
      addToast('success', 'Payment verified successfully! Your recharge code has been delivered to your Purchase History.');
      setActiveTab('purchase-history'); // Switch to Purchase History tab to view code immediately
      refreshCustomerOrders();
      loadPurchaseHistory();
      // Clean query params so they don't persist on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('payment_pending') === 'true') {
      const orderId = params.get('order_id');
      if (orderId) {
        addToast('info', 'Payment received! Finalizing bank verification...');
        api.getCheckoutOrderStatus(orderId).then((res) => {
          if (res?.success && res.order) {
            setCheckoutData({
              order: res.order,
              gatewayOrder: { gatewayOrderId: res.order.gatewayOrderId || orderId },
              gatewayConfig: {
                isConfigured: true,
                currency: 'INR',
                merchantName: 'Vortex Digital Store',
                webhookConfigured: true,
                provider: 'famupigateway',
              },
              productImage: 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png',
              isPendingVerification: true,
            });
            setIsCheckoutModalOpen(true);
          }
        }).catch(() => {});
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('payment_failed') === 'true') {
      const err = params.get('error') || 'Payment failed or cancelled';
      addToast('error', `Checkout notice: ${err}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [addToast, refreshCustomerOrders]);

  // Dynamically compute active denominations strictly from enabled categories and enabled products
  const categoryDenominations = activeCategories
    .filter((c) => c.enabled !== false)
    .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
    .map((c) => c.denomination);

  const productDenominations = products
    .filter((p) => p.enabled)
    .map((p) => p.denomination);

  const activeDenomsList =
    categoryDenominations.length > 0
      ? categoryDenominations
      : Array.from(new Set(productDenominations));

  const denominations = ['ALL VALUES', ...activeDenomsList];

  // Auto-reset filter if active category was disabled while user was viewing it
  useEffect(() => {
    if (selectedDenomination !== 'ALL VALUES' && !denominations.includes(selectedDenomination)) {
      setSelectedDenomination('ALL VALUES');
    }
  }, [denominations, selectedDenomination]);

  // Helper to get total UNUSED stock count for any denomination button with 100% mathematical consistency
  const getDenominationStockCount = useCallback((denom: string): number => {
    if (denom === 'ALL VALUES') {
      return products.reduce((sum, p) => {
        if (!p.enabled) return sum;
        const pCodes = getUnusedCodesForProduct(p, unusedCodes);
        const count = pCodes.length > 0 ? pCodes.length : (p.stock ?? 0);
        return sum + count;
      }, 0);
    }

    const matchingProd = products.find(
      (p) => p.enabled && (p.denomination === denom || p.denomination === `₹${denom.replace(/\D/g, '')}`)
    );
    if (!matchingProd) return 0;
    const pCodes = getUnusedCodesForProduct(matchingProd, unusedCodes);
    return pCodes.length > 0 ? pCodes.length : (matchingProd.stock ?? 0);
  }, [products, unusedCodes, getUnusedCodesForProduct]);

  // Build the items to display based on selected denomination
  interface DisplayCardItem {
    key: string;
    product: StoreProduct;
    codeRecord?: ApiRedeemCode;
    maskedCode: string;
    isOutOfStock: boolean;
    availableStockCount: number;
  }

  const displayItems: DisplayCardItem[] = [];

  const targetProducts =
    selectedDenomination === 'ALL VALUES'
      ? products.filter((p) => p.enabled)
      : products.filter(
          (p) =>
            p.enabled &&
            (p.denomination === selectedDenomination ||
              p.denomination === `₹${selectedDenomination.replace(/\D/g, '')}`)
        );

  targetProducts.forEach((prod) => {
    const prodUnusedCodes = getUnusedCodesForProduct(prod, unusedCodes);
    const totalStock = prodUnusedCodes.length > 0 ? prodUnusedCodes.length : (prod.stock ?? 0);
    const isOut = !prod.enabled || totalStock <= 0;

    if (isOut) {
      displayItems.push({
        key: `out_${prod.id}`,
        product: prod,
        maskedCode: 'OUT OF STOCK',
        isOutOfStock: true,
        availableStockCount: 0,
      });
    } else {
      if (prodUnusedCodes.length > 0) {
        prodUnusedCodes.forEach((c) => {
          displayItems.push({
            key: `code_${c.id}`,
            product: prod,
            codeRecord: c,
            maskedCode: c.codeMasked || c.code || 'CSGY AGTS **** ****',
            isOutOfStock: false,
            availableStockCount: totalStock,
          });
        });
      } else {
        displayItems.push({
          key: `prod_${prod.id}`,
          product: prod,
          maskedCode: 'CSGY AGTS **** ****',
          isOutOfStock: false,
          availableStockCount: totalStock,
        });
      }
    }
  });

  const handleBuyNow = async (product: StoreProduct, codeId?: string) => {
    if (product.enabled === false) {
      addToast('error', 'This recharge category is currently unavailable.');
      return;
    }

    const isCategoryDisabled =
      activeCategories.length > 0 &&
      !activeCategories.some(
        (c) =>
          c.enabled !== false &&
          (c.denomination === product.denomination ||
            c.denomination === `₹${product.denomination.replace(/\D/g, '')}`)
      );

    if (isCategoryDisabled) {
      addToast('error', 'This recharge category is currently unavailable.');
      return;
    }

    if (product.stockStatus === 'OUT OF STOCK' || (product.stock !== undefined && product.stock <= 0)) {
      addToast('error', 'OUT OF STOCK: No redeem codes available for this product.');
      return;
    }

    if (!user) {
      triggerAuthRequired('Purchase Google Play Recharge Code');
      return;
    }

    // Force clear previous checkout and fulfillment states before creating a new unique order
    setCheckoutData(null);
    setIsCheckoutModalOpen(false);
    setBuyingProductId(product.id);
    if (codeId) setBuyingCodeId(codeId);

    try {
      // 1. Identify product in DB & create checkout record with server-verified price
      const checkoutRes = await api.createCheckoutOrder({
        productId: product.id,
        codeId,
        customerName: user.fullName || user.username || 'Verified Customer',
        customerEmail: user.email,
        customerId: user.customerId || user.id,
      });

      if (checkoutRes && checkoutRes.success && checkoutRes.order) {
        const paymentUrl = checkoutRes.gatewayOrder?.paymentUrl;
        if (paymentUrl && typeof paymentUrl === 'string' && paymentUrl.trim().length > 0) {
          // Immediately redirect the user to the Payment Gateway page!
          window.location.href = paymentUrl;
          return;
        }

        // Open local checkout modal as fallback if no external redirect URL returned
        setCheckoutData({
          order: checkoutRes.order,
          gatewayOrder: checkoutRes.gatewayOrder,
          gatewayConfig: checkoutRes.gatewayConfig,
          productImage: product.image,
        });
        setIsCheckoutModalOpen(true);
      }
    } catch (err: any) {
      addToast('error', err.message || 'Checkout initiation failed. Please try again.');
    } finally {
      setBuyingProductId(null);
      setBuyingCodeId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* MAIN VIEWPORT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-2 pb-6 space-y-6">
        
        {/* Account Dashboard Top Navigation Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('redeem-code')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'redeem-code'
                  ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>REDEEM STORE</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!user) {
                  triggerAuthRequired('View Account Purchase History');
                  return;
                }
                setActiveTab('purchase-history');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'purchase-history' || activeTab === 'my-orders'
                  ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>PURCHASE HISTORY</span>
              {verifiedPurchases.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-extrabold ${
                  activeTab === 'purchase-history' || activeTab === 'my-orders'
                    ? 'bg-slate-950 text-emerald-400'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {verifiedPurchases.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('how-to-redeem')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'how-to-redeem'
                  ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>HOW TO REDEEM</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('support')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'support'
                  ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SUPPORT</span>
            </button>
          </div>

          {user && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono shrink-0 ml-auto">
              <span className="text-slate-500">Account ID:</span>
              <span className="text-emerald-400 font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                {user.customerId || user.id}
              </span>
            </div>
          )}
        </div>

        {activeTab === 'redeem-code' && (
          <div className="space-y-6">
            
            {/* SELECT RECHARGE AMOUNT / DENOMINATION FILTER BAR */}
            <div className="sticky top-14 sm:top-16 z-20 p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-slate-800/90 space-y-3 shadow-xl backdrop-blur-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>SELECT REDEEM CODE / AMOUNT:</span>
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                {denominations.map((denom) => {
                  const stockCount = getDenominationStockCount(denom);
                  const isSelected = selectedDenomination === denom;

                  return (
                    <button
                      key={denom}
                      onClick={() => setSelectedDenomination(denom)}
                      className={`px-4 py-2 text-xs font-mono font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                      }`}
                    >
                      <span>{denom}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          isSelected
                            ? 'bg-slate-950/30 text-slate-950 font-black'
                            : stockCount > 0
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {stockCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* INVENTORY ERROR STATE */}
            {inventoryError && products.length === 0 && (
              <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-center space-y-3 font-mono">
                <AlertCircle className="w-8 h-8 text-rose-400 mx-auto animate-bounce" />
                <p className="text-sm font-bold">{inventoryError}</p>
                <button
                  onClick={() => fetchLiveDatabaseData()}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Retry Connecting to Database
                </button>
              </div>
            )}

            {/* PRODUCT / REDEEM CODE CARDS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayItems.map((item) => {
                const prod = item.product;
                const isBuying =
                  (buyingProductId === prod.id && (!item.codeRecord || buyingCodeId === item.codeRecord.id)) ||
                  (buyingCodeId !== null && item.codeRecord && buyingCodeId === item.codeRecord.id);

                return (
                  <div
                    key={item.key}
                    className="bg-slate-900/95 border border-emerald-500/30 hover:border-emerald-400 rounded-3xl p-5 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-950/40 flex flex-col justify-between space-y-4 relative group neon-glow"
                  >
                    
                    {/* 1. TOP AREA: Product Icon + Large Title */}
                    <div className="flex items-center gap-3.5">
                      {/* Product Icon Box */}
                      <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-inner p-1.5 group-hover:scale-105 transition-transform overflow-hidden">
                        <img
                          src={prod.image || 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png'}
                          alt="Google Play Logo"
                          className="w-full h-full object-contain rounded-xl"
                        />
                      </div>

                      {/* Product Title & Dynamic Green Subtitle */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-snug truncate group-hover:text-emerald-300 transition-colors">
                          {prod.name}
                        </h3>
                        <div className="text-xs sm:text-sm font-mono font-extrabold text-emerald-400">
                          Pay ₹{prod.priceRupees.toLocaleString('en-IN')} and Get a ₹{prod.rewardValueRupees.toLocaleString('en-IN')} Redeem Code
                        </div>
                      </div>
                    </div>

                    {/* 2. PRICE & BALANCE (Split Grid) */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/30 space-y-0.5 font-mono">
                        <div className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest">
                          PRICE
                        </div>
                        <div className="text-lg sm:text-xl font-black text-white">
                          ₹{prod.priceRupees}
                        </div>
                      </div>

                      <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/30 space-y-0.5 font-mono">
                        <div className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest">
                          REDEEM CODE
                        </div>
                        <div className="text-lg sm:text-xl font-black text-emerald-400">
                          ₹{prod.rewardValueRupees.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    {/* 3. RECHARGE CODE CONTAINER */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono font-bold text-emerald-400/90 uppercase tracking-wider flex items-center justify-between">
                        <span>RECHARGE CODE</span>
                        {item.isOutOfStock ? (
                          <span className="text-rose-400 font-extrabold text-[9px] uppercase">OUT OF STOCK</span>
                        ) : (
                          <span className="text-emerald-400 font-extrabold text-[9px] uppercase font-mono">
                            {item.availableStockCount} AVAILABLE
                          </span>
                        )}
                      </div>

                      {/* Large Horizontal Code Box (Exact underlying database code format masked before purchase) */}
                      <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/40 flex items-center justify-between gap-2 font-mono shadow-inner">
                        <div className="text-xs sm:text-sm font-black tracking-widest text-slate-200 truncate">
                          {item.isOutOfStock ? (
                            <span className="text-slate-500 italic">OUT OF STOCK</span>
                          ) : (
                            item.maskedCode
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (item.isOutOfStock) return;
                            navigator.clipboard.writeText(item.maskedCode);
                            addToast('info', `Code preview [${item.maskedCode}] copied!`);
                          }}
                          disabled={item.isOutOfStock}
                          className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-slate-900 rounded-lg transition-colors shrink-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Copy Code Key Preview"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* 4. REDEEM BUTTON (Large Full-Width Horizontally Centered Cyber Button) */}
                    <button
                      type="button"
                      onClick={() => handleBuyNow(prod, item.codeRecord?.id)}
                      disabled={isBuying || item.isOutOfStock}
                      className={`w-full py-3 px-4 rounded-2xl font-extrabold text-xs sm:text-sm tracking-wider transition-all flex items-center justify-center cursor-pointer shadow-lg ${
                        item.isOutOfStock
                          ? 'bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed'
                          : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-emerald-500/25 hover:shadow-emerald-500/40 border border-emerald-300'
                      }`}
                    >
                      {isBuying ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      ) : item.isOutOfStock ? (
                        <span className="mx-auto font-mono uppercase">OUT OF STOCK</span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-slate-950/20 flex items-center justify-center shrink-0">
                            <Gift className="w-3.5 h-3.5 text-slate-950" />
                          </div>
                          <span className="text-slate-950 font-bold">|</span>
                          <span className="text-slate-950 font-black tracking-wide">REDEEM NOW</span>
                          <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform ml-0.5" />
                        </div>
                      )}
                    </button>

                  </div>
                );
              })}
            </div>

            {displayItems.length === 0 && (
              <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <p className="text-slate-300 font-bold text-sm">No redeem codes match your selected filter.</p>
                <button
                  onClick={() => {
                    setSelectedDenomination('ALL VALUES');
                  }}
                  className="text-xs text-emerald-400 hover:underline cursor-pointer"
                >
                  Reset filter
                </button>
              </div>
            )}

          </div>
        )}

        {activeTab === 'how-to-redeem' && <HowToRedeem />}

        {activeTab === 'support' && <SupportTab />}

        {(activeTab === 'purchase-history' || activeTab === 'my-orders') && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Box */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <History className="w-4 h-4" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">PURCHASE HISTORY</h2>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                    VERIFIED VAULT
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Account-specific verified recharge orders and delivered digital redeem codes.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                  <span className="text-slate-500 mr-1.5">Account ID:</span>
                  <span className="text-emerald-400 font-bold">
                    {queriedAccountId || user?.customerId || user?.id || 'Unassigned'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => loadPurchaseHistory(queriedAccountId || undefined)}
                  disabled={isLoadingPurchases}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/30 text-slate-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Refresh Purchase Records from Database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isLoadingPurchases ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Quick Account ID Verification & Lookup Bar */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Verify specific Account ID records directly against backend database:</span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (accountQueryInput.trim()) {
                    loadPurchaseHistory(accountQueryInput.trim());
                  }
                }}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <input
                  type="text"
                  value={accountQueryInput}
                  onChange={(e) => setAccountQueryInput(e.target.value)}
                  placeholder="e.g. 7CPDK9A1S18P6MFP"
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 flex-1 sm:w-56"
                />
                <button
                  type="submit"
                  disabled={isLoadingPurchases || !accountQueryInput.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs font-mono cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  Verify ID
                </button>
                {queriedAccountId && queriedAccountId !== (user?.customerId || user?.id) && (
                  <button
                    type="button"
                    onClick={() => {
                      setAccountQueryInput('');
                      loadPurchaseHistory();
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-mono cursor-pointer"
                    title="Reset to current user account"
                  >
                    Reset
                  </button>
                )}
              </form>
            </div>

            {/* Loading State */}
            {isLoadingPurchases && (
              <div className="py-12 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-3 text-center">
                <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-mono text-slate-400">Verifying database transaction records...</p>
              </div>
            )}

            {/* Empty State: EXACT Required Text: "No verified purchase record found." */}
            {!isLoadingPurchases && verifiedPurchases.length === 0 && (
              <div className="text-center py-12 px-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-500 mx-auto">
                  <ShieldCheck className="w-6 h-6 text-emerald-400/60" />
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-200">
                  No verified purchase record found.
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {queriedAccountId ? (
                    <>No verified purchase records found in the database for Account ID <span className="font-mono text-emerald-400 font-bold">{queriedAccountId}</span>.</>
                  ) : (
                    <>No verified purchases found for this account. Only real, successfully paid transactions confirmed by the payment gateway will appear here.</>
                  )}
                </p>
              </div>
            )}

            {/* Populated Verified Purchase Records */}
            {!isLoadingPurchases && verifiedPurchases.length > 0 && (
              <div className="space-y-4">
                {verifiedPurchases.map((rec: any) => {
                  const isUnmasked = Boolean(unmaskedCodeIds[rec.orderId]);
                  const displayCode = isUnmasked ? formatFullCode(rec.redeemCode) : formatMaskedCode(rec.redeemCode);

                  return (
                    <div
                      key={rec.orderId}
                      className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 sm:p-6 transition-all space-y-4 shadow-xl"
                    >
                      {/* Top Header: Order ID & Date */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-emerald-400 font-bold">
                            Order ID: {rec.orderId}
                          </span>
                          {rec.orderNumber && rec.orderNumber !== rec.orderId && (
                            <span className="text-[11px] font-mono text-slate-500">
                              ({rec.orderNumber})
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono text-slate-400">
                          Purchase Date: <span className="text-slate-200">{rec.purchaseDate}</span>
                        </div>
                      </div>

                      {/* Middle Details: Product, Amount, Status Badges */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Product</div>
                          <h3 className="text-base font-bold text-white mt-0.5">
                            {rec.product || 'Google Play Recharge Code'}
                          </h3>
                          <div className="text-xs font-mono text-emerald-400 mt-1">
                            {rec.denomination || `₹${rec.amount}`}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Purchase Status: {rec.purchaseStatus || 'Purchased'}</span>
                          </span>

                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Payment Status: {rec.paymentStatus || 'Paid'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Redeem Code Display with Unmask and Copy */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono shadow-inner">
                        <div className="space-y-1">
                          <div className="text-[11px] text-slate-400">Redeem Code:</div>
                          <div className="text-base sm:text-lg font-bold text-emerald-300 tracking-wider">
                            {displayCode}
                          </div>
                          {rec.pin && (
                            <div className="text-xs text-slate-400">
                              PIN: <strong className="text-emerald-400">{rec.pin}</strong>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setUnmaskedCodeIds((prev) => ({
                                ...prev,
                                [rec.orderId]: !prev[rec.orderId],
                              }));
                            }}
                            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title={isUnmasked ? 'Mask Code' : 'Reveal Full Redeem Code'}
                          >
                            {isUnmasked ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(rec.redeemCode);
                              addToast('success', 'Full redeem code copied to clipboard!');
                            }}
                            className="py-2 px-3.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Code</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      <PaymentCheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => {
          setIsCheckoutModalOpen(false);
          setCheckoutData(null);
        }}
        checkoutData={checkoutData}
        onPaymentSuccess={async () => {
          await fetchLiveDatabaseData();
          await refreshCustomerOrders();
          await loadPurchaseHistory();
        }}
      />

    </div>
  );
};

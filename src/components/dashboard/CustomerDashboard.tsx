import React, { useState, useEffect, useCallback } from 'react';
import { UIDVerificationModal } from './UIDVerificationModal';
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
  X,
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

  // UID Verification State
  const [isUidModalOpen, setIsUidModalOpen] = useState(false);
  const [isVerifyingUid, setIsVerifyingUid] = useState(false);
  const [productToVerify, setProductToVerify] = useState<StoreProduct | null>(null);



  // Live Products and securely masked unused codes from single source of truth (Database)
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [unusedCodes, setUnusedCodes] = useState<ApiRedeemCode[]>([]);
  const [activeCategories, setActiveCategories] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  // Request counter ref to prevent race conditions from out-of-order async responses
  const fetchRequestIdRef = React.useRef(0);

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
            cardBadgeText: (p as any).cardBadgeText || 'DIAMONDS',
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
      addToast('success', 'Payment verified successfully! Your recharge code has been delivered to your Vault.');
      setActiveTab('my-orders'); // Switch to My Orders / Vault tab to view code immediately
      refreshCustomerOrders();
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
                isConfigured: false,
                currency: 'INR',
                merchantName: 'Vortex Digital Store',
                webhookConfigured: false,
                provider: 'none',
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
      ? products.filter((p) => p.enabled && p.category !== 'DIAMONDS')
      : products.filter(
          (p) =>
            p.enabled &&
            p.category !== 'DIAMONDS' &&
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
            availableStockCount: 1,
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

    if (product.category === 'DIAMONDS') {
      setProductToVerify(product);
      setIsUidModalOpen(true);
      return;
    }

    // Skip stock check for Diamond products (already handled, but keep for other categories)
    if (product.category !== 'DIAMONDS' && (product.stockStatus === 'OUT OF STOCK' || (product.stock !== undefined && product.stock <= 0))) {
      addToast('error', 'OUT OF STOCK: No redeem codes available for this product.');
      return;
    }

    if (!user) {
      triggerAuthRequired('Purchase');
      return;
    }

    await initiatePurchase(product, codeId);
  };

  const initiatePurchase = async (product: StoreProduct, codeId?: string) => {
    setBuyingProductId(product.id);
    if (codeId) setBuyingCodeId(codeId);

    try {
      const res = await api.createCheckoutOrder({
        productId: product.id,
        codeId,
        customerName: user!.fullName,
        customerEmail: user!.email,
        customerId: user!.customerId || user!.id,
      });

      if (!res.success) {
        if (res.error?.includes('temporarily unavailable')) {
          addToast('info', 'Payment service temporarily unavailable. Please try again later.');
        } else {
          addToast('error', res.error || 'Failed to initiate checkout.');
        }
        return;
      }

      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        addToast('error', 'Failed to retrieve secure checkout URL.');
      }
    } catch (err: any) {
      if (err.message?.includes('temporarily unavailable')) {
        addToast('info', 'Payment service temporarily unavailable. Please try again later.');
      } else {
        addToast('error', err.message || 'Checkout could not be initialized.');
      }
    } finally {
      setBuyingProductId(null);
      setBuyingCodeId(null);
    }
  };





  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* MAIN VIEWPORT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-2 pb-6 space-y-6">
        
        {activeTab === 'redeem-code' && (
          <div className="space-y-6">
            
            {/* SELECT RECHARGE AMOUNT / DENOMINATION FILTER BAR */}
            <div className="sticky top-14 sm:top-16 z-20 p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-slate-800/90 space-y-3 shadow-xl backdrop-blur-md">
              {/* CATEGORY TABS */}
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('redeem-code')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs ${activeTab === 'redeem-code' ? 'bg-emerald-400 text-slate-950' : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'}`}
                >
                  <Ticket className="w-4 h-4" />
                  REDEEM CODE
                </button>
                <button
                  onClick={() => setActiveTab('diamonds')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs ${activeTab === 'diamonds' ? 'bg-emerald-400 text-slate-950' : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'}`}
                >
                  <Sparkles className="w-4 h-4" />
                  DIAMONDS
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
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

        {activeTab === 'diamonds' && (
          <div className="space-y-6">
            <div className="sticky top-14 sm:top-16 z-20 p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-slate-800/90 space-y-3 shadow-xl backdrop-blur-md">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('redeem-code')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
                >
                  <Ticket className="w-4 h-4" />
                  REDEEM CODE
                </button>
                <button
                  onClick={() => setActiveTab('diamonds')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs bg-emerald-400 text-slate-950"
                >
                  <Sparkles className="w-4 h-4" />
                  DIAMONDS
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {(products.filter(p => p.enabled && p.category === 'DIAMONDS').length > 0
                ? products.filter(p => p.enabled && p.category === 'DIAMONDS')
                : [{
                    id: 'demo-100-diamonds',
                    name: '100 Diamonds',
                    quantity: 100,
                    priceRupees: 80,
                    image: 'https://i.ibb.co/HDkCvRrY/file-00000000e09c82119087489c4d51e78a.png',
                    enabled: true,
                    category: 'DIAMONDS'
                  }]
              ).map((p) => (
                    <div 
                      key={p.id} 
                      onClick={() => handleBuyNow(p)}
                      className="bg-slate-950/90 border rounded-3xl p-3 sm:p-4 flex flex-col items-center text-center cursor-pointer group hover:border-cyan-400 transition-all duration-300 relative overflow-hidden backdrop-blur-xl"
                      style={{
                        borderColor: p.glowSettings?.borderColor || '#06b6d4',
                        boxShadow: p.glowSettings?.glowColor 
                            ? `0 0 5px ${p.glowSettings.glowColor}, 0 0 12px ${p.glowSettings.glowColor}80, 0 0 25px ${p.glowSettings.glowColor}55`
                            : '0 0 5px #00F5FF, 0 0 12px rgba(0, 245, 255, 0.8), 0 0 25px rgba(0, 140, 255, 0.55), 0 0 45px rgba(0, 100, 255, 0.25)'
                      }}
                    >
                      {/* Top Decorative Neon Frame & Title */}
                      <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-950/60 border text-cyan-300 font-black text-[11px] tracking-wider mb-3 shadow-[inset_0_1px_3px_rgba(6,182,212,0.3)]"
                           style={{ borderColor: p.glowSettings?.borderColor || '#06b6d4' }}>
                        <Sparkles className="w-3.5 h-3.5" style={{ color: p.glowSettings?.glowColor || '#06b6d4' }} />
                        <span>{p.cardBadgeText || 'DIAMONDS'}</span>
                      </div>

                      {/* Middle Image Section */}
                      <img 
                        src={p.image || 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png'} 
                        alt={p.name || 'Free Fire Diamonds'} 
                        className="w-full aspect-square object-contain rounded-2xl filter drop-shadow-[0_0_12px_rgba(6,182,212,0.35)] group-hover:scale-105 transition-transform duration-300" 
                      />


                      {/* Bottom Futuristic Price Button */}
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuyNow(p);
                        }}
                        className="mt-3 w-full border rounded-2xl p-1.5 flex items-center justify-between text-[#06111F] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                          backgroundColor: p.glowSettings?.buttonBgColor || '#38BDF8',
                          borderColor: p.glowSettings?.borderColor || '#06b6d4',
                          boxShadow: p.glowSettings?.glowColor ? `0 0 15px ${p.glowSettings.glowColor}66` : '0 0 15px rgba(56, 189, 248, 0.4), inset 0 0 10px rgba(255,255,255,0.2)'
                        }}
                      >
                        <div className="flex-1 text-center font-black text-[#06111F] text-base tracking-wider px-1 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                          PAY ₹{p.priceRupees}
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-cyan-950/50 border flex items-center justify-center text-cyan-300 shrink-0 shadow-[inset_0_0_8px_rgba(0,245,255,0.4)]"
                             style={{ borderColor: p.glowSettings?.borderColor || '#06b6d4' }}>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                  </div>
              ))}
            </div>
            {products.filter(p => p.enabled && p.category === 'DIAMONDS').length === 0 && (
                <div className="text-center py-12 text-slate-400">No diamond products currently available. (Demo mode active)</div>
            )}
          </div>
        )}

        {activeTab === 'how-to-redeem' && <HowToRedeem />}

        {activeTab === 'support' && <SupportTab />}

        {activeTab === 'my-orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div>
                <h2 className="text-xl font-bold text-white">My Orders & Vault</h2>
                <p className="text-xs text-slate-400">Copy secret code keys and review purchase receipts.</p>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/30">
                {orders.length} Keys Claimed
              </span>
            </div>

            {orders.length === 0 && (
              <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
                <p className="text-slate-400 text-sm">No orders yet. Purchase a voucher to receive your digital code key.</p>
              </div>
            )}

            {orders.map((ord) => (
              <div
                key={ord.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="font-mono text-emerald-400 font-bold">{ord.orderNumber}</span>
                  <span className="text-slate-400 font-mono">{ord.purchaseDate}</span>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm">{ord.codeTitle}</h3>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    Code Key Delivered
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between font-mono text-xs">
                  <div className="space-y-0.5">
                    <span className="text-emerald-300 font-bold tracking-wider text-sm">{ord.redeemCode}</span>
                    {ord.pin && (
                      <div className="text-[11px] text-slate-400 font-mono">
                        PIN: <strong className="text-emerald-400">{ord.pin}</strong>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(ord.redeemCode);
                      addToast('success', 'Full secret code copied to clipboard!');
                    }}
                    className="py-1.5 px-3 bg-emerald-400 text-slate-950 font-bold rounded-lg hover:bg-emerald-300 text-[11px] cursor-pointer"
                  >
                    Copy Key
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      <UIDVerificationModal
        isOpen={isUidModalOpen}
        onClose={() => setIsUidModalOpen(false)}
        onVerify={async (uid: string) => {
          setIsVerifyingUid(true);
          try {
            const response = await fetch('/api/freefire/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uid }),
            });
            const data = await response.json();
            if (data.success) {
              addToast('success', `Verified: ${data.nickname}`);
              return { 
                nickname: data.nickname, 
                level: data.level, 
                guild: data.guild, 
                diamondQuantity: productToVerify?.cardBadgeText || productToVerify?.name // Use exact card name from badge
              };
            } else {
              addToast('error', data.error || 'Invalid UID');
              return null;
            }
          } catch (err) {
            addToast('error', 'Verification service unavailable');
            return null;
          } finally {
            setIsVerifyingUid(false);
          }
        }}
        isVerifying={isVerifyingUid}
        onContinue={async () => {
          if (productToVerify) {
            await initiatePurchase(productToVerify);
          }
        }}
      />

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
        }}
      />



    </div>
  );
};

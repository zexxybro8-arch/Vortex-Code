import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, type ApiRedeemCode } from '../../services/api';
import type { DashboardTab, StoreProduct } from '../../types';
import { HowToRedeem } from './HowToRedeem';
import { SupportTab } from './SupportTab';
import { formatMaskedCode, formatFullCode } from '../../utils/codeFormat';
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
} from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const { user, orders, addToast, triggerAuthRequired, refreshCustomerOrders } = useAuth();

  const [activeTab, setActiveTab] = useState<DashboardTab>('redeem-code');
  
  // Store Filters State
  const [selectedDenomination, setSelectedDenomination] = useState<string>('ALL VALUES');
  const [buyingProductId, setBuyingProductId] = useState<string | null>(null);
  const [buyingCodeId, setBuyingCodeId] = useState<string | null>(null);

  // Live Products and Unused Redeem Codes from single source of truth (Database)
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [unusedCodes, setUnusedCodes] = useState<ApiRedeemCode[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  const fetchLiveDatabaseData = useCallback(async () => {
    try {
      // 1. Fetch live products with exact database computed stock
      const [apiProds, apiCodes] = await Promise.all([
        api.getProducts(),
        api.getRedeemCodes(undefined, 'UNUSED'),
      ]);

      if (apiProds) {
        const mapped: StoreProduct[] = apiProds.map((p) => {
          const isEnabled = p.enabled !== undefined ? Boolean(p.enabled) : true;
          // Available stock must strictly come from UNUSED codes in the database
          const stock = Number(p.stock ?? 0);
          return {
            id: p.id,
            name: p.name || 'Google Play Recharge Code',
            priceRupees: Number(p.price),
            rewardValueRupees: Number(p.rewardValue || p.price * 15),
            denomination: p.denomination || `₹${p.price}`,
            category: (p.category as any) || 'DIGITAL REWARDS',
            stockStatus: !isEnabled
              ? 'OUT OF STOCK'
              : stock > 0
              ? 'AVAILABLE'
              : 'OUT OF STOCK',
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

      if (apiCodes) {
        setUnusedCodes(apiCodes);
      }
    } catch (err) {
      console.error('Error fetching live database inventory in CustomerDashboard:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveDatabaseData();
    // Continuous background synchronization every 2.5s for real-time stock/price sync
    const interval = setInterval(fetchLiveDatabaseData, 2500);
    return () => clearInterval(interval);
  }, [fetchLiveDatabaseData]);

  const defaultDenominations = ['ALL VALUES', '₹100', '₹120', '₹150', '₹200', '₹300', '₹500', '₹700', '₹900'];
  const extraDenoms = products
    .map((p) => p.denomination)
    .filter((d) => d && !defaultDenominations.includes(d));
  const denominations = [...defaultDenominations, ...Array.from(new Set(extraDenoms))];

  // Helper to get total UNUSED stock count for any denomination button
  const getDenominationStockCount = (denom: string): number => {
    if (denom === 'ALL VALUES') {
      return unusedCodes.length;
    }
    const matchingProd = products.find((p) => p.denomination === denom);
    if (!matchingProd || matchingProd.enabled === false) return 0;
    return matchingProd.stock ?? 0;
  };

  // Build the items to display based on selected denomination
  // For a selected denomination:
  // Return ALL records where status = "UNUSED" AND matching product/denomination
  // If 0 UNUSED codes, show the out-of-stock representation for that product
  interface DisplayCardItem {
    key: string;
    product: StoreProduct;
    codeRecord?: ApiRedeemCode;
    maskedCode: string;
    isOutOfStock: boolean;
    availableStockCount: number;
  }

  const displayItems: DisplayCardItem[] = [];

  if (selectedDenomination === 'ALL VALUES') {
    // Show cards across all products
    products.forEach((prod) => {
      const prodUnusedCodes = unusedCodes.filter((c) => c.productId === prod.id);
      const isOut = !prod.enabled || (prod.stock !== undefined && prod.stock <= 0) || prodUnusedCodes.length === 0;

      if (isOut) {
        displayItems.push({
          key: `out_${prod.id}`,
          product: prod,
          maskedCode: 'OUT OF STOCK',
          isOutOfStock: true,
          availableStockCount: 0,
        });
      } else {
        // Display each UNUSED code from the database for this product
        prodUnusedCodes.forEach((c) => {
          displayItems.push({
            key: `code_${c.id}`,
            product: prod,
            codeRecord: c,
            maskedCode: c.codeMasked || formatMaskedCode(c.code),
            isOutOfStock: false,
            availableStockCount: prod.stock ?? prodUnusedCodes.length,
          });
        });
      }
    });
  } else {
    // Specific denomination selected (e.g. ₹100 or ₹120)
    const matchingProd = products.find((p) => p.denomination === selectedDenomination);
    const denomUnusedCodes = unusedCodes.filter(
      (c) => c.denomination === selectedDenomination || (matchingProd && c.productId === matchingProd.id)
    );

    const isOut =
      !matchingProd ||
      matchingProd.enabled === false ||
      (matchingProd.stock !== undefined && matchingProd.stock <= 0) ||
      denomUnusedCodes.length === 0;

    if (isOut) {
      if (matchingProd) {
        displayItems.push({
          key: `out_${matchingProd.id}`,
          product: matchingProd,
          maskedCode: 'OUT OF STOCK',
          isOutOfStock: true,
          availableStockCount: 0,
        });
      }
    } else {
      // Return ALL UNUSED codes matching this product/denomination
      denomUnusedCodes.forEach((c) => {
        displayItems.push({
          key: `code_${c.id}`,
          product: matchingProd!,
          codeRecord: c,
          maskedCode: c.codeMasked || formatMaskedCode(c.code),
          isOutOfStock: false,
          availableStockCount: matchingProd!.stock ?? denomUnusedCodes.length,
        });
      });
    }
  }

  const handleBuyNow = async (product: StoreProduct, codeId?: string) => {
    if (product.enabled === false) {
      addToast('error', 'This item is currently unavailable.');
      return;
    }

    if (product.stockStatus === 'OUT OF STOCK' || (product.stock !== undefined && product.stock <= 0)) {
      addToast('error', 'This item is currently out of stock. Please check back later.');
      return;
    }

    if (!user) {
      triggerAuthRequired('Purchase Google Play Recharge Code');
      return;
    }

    setBuyingProductId(product.id);
    if (codeId) setBuyingCodeId(codeId);

    try {
      const res = await api.purchaseProduct({
        productId: product.id,
        codeId,
        customerName: user.fullName || user.username || 'Verified Customer',
        customerEmail: user.email,
        paymentMethod: 'Direct Payment Gateway',
      });

      if (res && res.success && res.order) {
        const deliveredCode = res.order.deliveredCode || 'Encrypted Key Generated';
        addToast('success', `🎉 Code purchased for ${res.order.productName}! Secret key [${deliveredCode}] saved to your Vault.`);
        // Immediately synchronize with database
        await fetchLiveDatabaseData();
        await refreshCustomerOrders();
      }
    } catch (err: any) {
      addToast('error', err.message || 'Purchase failed. Please try again.');
    } finally {
      setBuyingProductId(null);
      setBuyingCodeId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* TAB NAVIGATION BAR (Horizontally Scrollable) */}
      <div className="bg-slate-950 border-b border-slate-800/90 sticky top-20 z-30 px-3 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-2.5 overflow-x-auto scrollbar-none">
          
          {/* TAB 1: REDEEM CODE */}
          <button
            onClick={() => setActiveTab('redeem-code')}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wider transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'redeem-code'
                ? 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 border border-emerald-300'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>REDEEM CODE</span>
          </button>

          {/* TAB 2: HOW TO REDEEM */}
          <button
            onClick={() => setActiveTab('how-to-redeem')}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wider transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'how-to-redeem'
                ? 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 border border-emerald-300'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>HOW TO REDEEM</span>
          </button>

          {/* TAB 3: SUPPORT */}
          <button
            onClick={() => setActiveTab('support')}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wider transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'support'
                ? 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 border border-emerald-300'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>SUPPORT</span>
          </button>

          {/* MY ORDERS TAB */}
          <button
            onClick={() => setActiveTab('my-orders')}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wider transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'my-orders'
                ? 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 border border-emerald-300'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>MY ORDERS & VAULT ({orders.length})</span>
          </button>

        </div>
      </div>

      {/* MAIN VIEWPORT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {activeTab === 'redeem-code' && (
          <div className="space-y-6">
            
            {/* SELECT RECHARGE AMOUNT / DENOMINATION FILTER BAR */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800/90 space-y-3 shadow-xl backdrop-blur-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>SELECT RECHARGE AMOUNT / DENOMINATION:</span>
                </div>
                <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
                  <span>Available Stock:</span>
                  <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                    {unusedCodes.length} UNUSED CODES IN DATABASE
                  </span>
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

                      {/* Product Title */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-snug truncate group-hover:text-emerald-300 transition-colors">
                          {prod.name}
                        </h3>
                        <div className="text-[10px] font-mono text-emerald-400/90 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-2">
                          <span>{prod.category}</span>
                          <span>·</span>
                          <span>{prod.denomination}</span>
                        </div>
                      </div>
                    </div>

                    {/* 2. PRICE + BALANCE (Two Side-by-Side Separate Boxes) */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* PRICE BOX */}
                      <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/30 space-y-0.5 font-mono">
                        <div className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest">
                          PRICE
                        </div>
                        <div className="text-lg sm:text-xl font-black text-white">
                          ₹{prod.priceRupees}
                        </div>
                      </div>

                      {/* REWARD VALUE BOX */}
                      <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/30 space-y-0.5 font-mono">
                        <div className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest">
                          REWARD VALUE
                        </div>
                        <div className="text-lg sm:text-xl font-black text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]">
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

    </div>
  );
};

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AdminUser,
  AdminTab,
  AdminDashboardStats,
  AdminOrder,
  AdminCustomer,
  AdminPayment,
  AdminRedeemCode,
} from '../types/admin';
import { StoreProduct } from '../types';
import { adminAuthService, AdminLoginCredentials } from '../services/adminAuthService';
import { api } from '../services/api';

function mapApiProductToStore(p: any): StoreProduct {
  const stock = Number(p.stock ?? 0);
  const isEnabled = p.enabled !== undefined ? Boolean(p.enabled) : true;
  return {
    id: p.id,
    name: p.name || 'Google Play Recharge Code',
    priceRupees: Number(p.price),
    rewardValueRupees: Number(p.rewardValue || p.reward_value || p.price * 15),
    denomination: p.denomination || `₹${p.price}`,
    category: (p.category as any) || 'DIGITAL REWARDS',
    stockStatus: !isEnabled
      ? 'OUT OF STOCK'
      : stock > 0
      ? 'AVAILABLE'
      : 'OUT OF STOCK',
    deliveryInfo: '⚡ Instant Automated Vault Key Delivery',
    badge: stock > 0 ? `${stock} Available` : 'OUT OF STOCK',
    image: p.image || 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png',
    description: p.description || '',
    stock,
    soldCount: Number(p.soldCount ?? 0),
    totalCodes: Number(p.totalCodes ?? 0),
    enabled: isEnabled,
  };
}

import {
  formatFullCode,
  formatMaskedCode,
  normalizeCode,
  validateCode,
} from '../utils/codeFormat';

function mapApiCodeToAdmin(c: any): AdminRedeemCode {
  return {
    id: c.id,
    productId: c.productId,
    productName: c.productName || 'Google Play Recharge Code',
    codeMasked: formatMaskedCode(c.code),
    fullCodeSecret: formatFullCode(c.code),
    pin: c.pin || '9842',
    denominationRupees: c.denomination ? Number(c.denomination.replace(/\D/g, '')) || 100 : 100,
    denomination: c.denomination,
    orderId: c.orderId,
    status: c.status === 'UNUSED' ? 'AVAILABLE' : c.status === 'SOLD' ? 'USED' : 'RESERVED',
    createdAt: c.createdAt ? c.createdAt.substring(0, 10) : new Date().toISOString().substring(0, 10),
    usedAt: c.usedAt || undefined,
  };
}

function mapApiOrderToAdmin(o: any): AdminOrder {
  return {
    id: o.id,
    orderNumber: o.orderNumber || o.id,
    customerName: o.customerName || 'Customer',
    customerEmail: o.customerEmail || 'customer@example.com',
    productName: o.productName || 'Google Play Recharge Code',
    amountRupees: Number(o.amount || 0),
    paymentStatus: o.paymentStatus || 'PAID',
    deliveryStatus: o.deliveryStatus || 'DELIVERED',
    createdAt: o.createdAt ? o.createdAt.substring(0, 16).replace('T', ' ') : new Date().toISOString().substring(0, 16),
  };
}

interface AdminContextType {
  adminUser: AdminUser | null;
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;
  adminLogin: (credentials: AdminLoginCredentials) => Promise<void>;
  adminLogout: () => void;
  isLoading: boolean;

  // Products
  products: StoreProduct[];
  addProduct: (product: Omit<StoreProduct, 'id'>) => Promise<void>;
  updateProduct: (id: string, updated: Partial<StoreProduct>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // Redeem Codes
  redeemCodes: AdminRedeemCode[];
  addRedeemCodes: (newCodes: Omit<AdminRedeemCode, 'id'>[]) => Promise<void>;
  addSingleRedeemCode: (productId: string, code: string, pin?: string) => Promise<any>;
  addBulkRedeemCodes: (productId: string, codesText: string) => Promise<any>;
  deleteRedeemCode: (id: string, force?: boolean) => Promise<any>;

  // Orders
  orders: AdminOrder[];
  updateOrderStatus: (id: string, paymentStatus: any, deliveryStatus: any) => Promise<void>;

  // Customers
  customers: AdminCustomer[];
  toggleCustomerStatus: (id: string) => void;

  // Payments
  payments: AdminPayment[];

  // Settings
  storeSettings: {
    storeName: string;
    subtitle: string;
    supportEmail: string;
    currencySymbol: string;
    enableAutoFulfillment: boolean;
    famupigatewayBaseUrl: string;
    famupigatewayApiKey: string;
    famupigatewayWebhookSecret: string;
    famupigatewayExpiryMinutes: number;
    appUrl: string;
  };
  updateStoreSettings: (newSettings: any) => void;

  stats: AdminDashboardStats;
  refreshData: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const getInitialAdminTab = (): AdminTab => {
  if (typeof window === 'undefined') return 'dashboard';
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const full = `${path} ${search} ${hash}`;

  if (full.includes('customers')) return 'customers';
  if (full.includes('products')) return 'products';
  if (full.includes('categories')) return 'categories';
  if (full.includes('denominations')) return 'denominations';
  if (full.includes('redeem-codes') || full.includes('codes')) return 'redeem-codes';
  if (full.includes('orders')) return 'orders';
  if (full.includes('settings')) return 'settings';
  return 'dashboard';
};

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [adminTab, setAdminTabInternal] = useState<AdminTab>(getInitialAdminTab);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate the admin session on mount via server-side HttpOnly cookie check
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/admin/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.admin) {
            setAdminUser(data.admin);
          }
        }
      } catch (err) {
        console.warn('Admin session validation failed or not signed in:', err);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [redeemCodes, setRedeemCodes] = useState<AdminRedeemCode[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [customerOverrides, setCustomerOverrides] = useState<Record<string, 'ACTIVE' | 'SUSPENDED'>>({});

  // Compute real customers dynamically from real database orders
  const uniqueCustomerEmails = Array.from(new Set(orders.map((o) => o.customerEmail.toLowerCase())));
  const customers: AdminCustomer[] = uniqueCustomerEmails.map((email, idx) => {
    const custOrders = orders.filter((o) => o.customerEmail.toLowerCase() === email);
    const totalSpent = custOrders.reduce((sum, o) => sum + (o.paymentStatus === 'PAID' ? o.amountRupees : 0), 0);
    const firstName = custOrders[0]?.customerName || email.split('@')[0];
    const firstDate = custOrders[custOrders.length - 1]?.createdAt.substring(0, 10) || new Date().toISOString().substring(0, 10);
    const id = `cust_${idx + 1}`;
    return {
      id,
      fullName: firstName,
      email,
      registrationDate: firstDate,
      orderCount: custOrders.length,
      totalSpentRupees: totalSpent,
      status: customerOverrides[id] || 'ACTIVE',
    };
  });

  // Compute real payments dynamically from real database orders
  const payments: AdminPayment[] = orders
    .filter((o) => o.paymentStatus === 'PAID')
    .map((o) => ({
      id: `pay_${o.id}`,
      transactionId: `TXN-${o.orderNumber.replace(/[^A-Z0-9]/gi, '')}`,
      orderId: o.orderNumber,
      customerEmail: o.customerEmail,
      amountRupees: o.amountRupees,
      paymentMethod: 'Direct Payment Gateway',
      status: 'SUCCESS',
      createdAt: o.createdAt,
    }));

  const [storeSettings, setStoreSettings] = useState({
    storeName: 'VORTEX CODE',
    subtitle: 'SECURE DIGITAL STORE',
    supportEmail: 'support@vortexcode.com',
    currencySymbol: '₹',
    enableAutoFulfillment: true,
    famupigatewayBaseUrl: 'https://famupigateway.site/api',
    famupigatewayApiKey: '',
    famupigatewayWebhookSecret: '',
    famupigatewayExpiryMinutes: 5,
    appUrl: 'https://vortexcode.shop',
  });

  const setAdminTab = (tab: AdminTab) => {
    setAdminTabInternal(tab);
    if (typeof window !== 'undefined') {
      const newPath = `/developer/${tab}`;
      if (window.location.pathname !== newPath) {
        window.history.pushState({ adminTab: tab }, '', newPath);
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setAdminTabInternal(getInitialAdminTab());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch real data from backend API & Database
  const refreshData = useCallback(async () => {
    if (!adminUser) return; // Securely skip if not authenticated
    try {
      const [apiProducts, apiCodes, apiOrders, apiSettings] = await Promise.all([
        api.getProducts().catch((err) => {
          console.error('Failed to load products from API:', err);
          return [];
        }),
        api.getRedeemCodes(undefined, undefined, undefined, true).catch((err) => {
          console.error('Failed to load codes from API:', err);
          return [];
        }),
        api.getOrders().catch((err) => {
          console.error('Failed to load orders from API:', err);
          return [];
        }),
        api.getStoreSettings().catch((err) => {
          console.error('Failed to load store settings from API:', err);
          return null;
        }),
      ]);

      if (apiProducts && apiProducts.length > 0) {
        setProducts(apiProducts.map(mapApiProductToStore));
      }
      if (apiCodes) {
        setRedeemCodes(apiCodes.map(mapApiCodeToAdmin));
      }
      if (apiOrders) {
        setOrders(apiOrders.map(mapApiOrderToAdmin));
      }
      if (apiSettings) {
        setStoreSettings(apiSettings);
      }
    } catch (err) {
      console.error('Error refreshing admin data from DB:', err);
    }
  }, [adminUser]);

  // Initial load
  useEffect(() => {
    if (adminUser) {
      refreshData();
    }
  }, [refreshData, adminUser]);

  // Periodic background synchronization every 3 seconds to ensure real-time consistency
  useEffect(() => {
    if (!adminUser) return;
    const interval = setInterval(() => {
      refreshData();
    }, 3000);
    return () => clearInterval(interval);
  }, [refreshData, adminUser]);

  const adminLogin = async (credentials: AdminLoginCredentials) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: credentials.identifier,
          password: credentials.password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Administrative authentication failed');
      }

      setAdminUser(data.admin);
      setAdminTab('dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const adminLogout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (e) {
      console.error('Backend logout call exception:', e);
    } finally {
      setAdminUser(null);
      setIsLoading(false);
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/developer/login');
      }
    }
  };

  // Real Database Product Actions
  const addProduct = async (prodData: Omit<StoreProduct, 'id'>) => {
    setIsLoading(true);
    try {
      await api.createProduct({
        name: prodData.name,
        price: prodData.priceRupees,
        rewardValue: prodData.rewardValueRupees,
        denomination: prodData.denomination,
        category: prodData.category,
        description: prodData.description,
        image: prodData.image,
      });
      await refreshData();
    } finally {
      setIsLoading(false);
    }
  };

  const updateProduct = async (id: string, updated: Partial<StoreProduct>) => {
    setIsLoading(true);
    try {
      const payload: any = {};
      if (updated.name !== undefined) payload.name = updated.name;
      if (updated.priceRupees !== undefined) payload.price = updated.priceRupees;
      if (updated.rewardValueRupees !== undefined) payload.rewardValue = updated.rewardValueRupees;
      if (updated.denomination !== undefined) payload.denomination = updated.denomination;
      if (updated.category !== undefined) payload.category = updated.category;
      if (updated.description !== undefined) payload.description = updated.description;
      if (updated.image !== undefined) payload.image = updated.image;
      if (updated.enabled !== undefined) payload.enabled = updated.enabled ? 1 : 0;
      if (updated.stockStatus !== undefined) {
        if (updated.stockStatus === 'OUT OF STOCK') {
          payload.enabled = 0;
        } else if (updated.stockStatus === 'AVAILABLE') {
          payload.enabled = 1;
        }
      }

      await api.updateProduct(id, payload);
      await refreshData();
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    setIsLoading(true);
    try {
      await api.deleteProduct(id);
      await refreshData();
    } finally {
      setIsLoading(false);
    }
  };

  // Real Database Redeem Codes Actions
  const addSingleRedeemCode = async (productId: string, code: string, pin?: string) => {
    setIsLoading(true);
    try {
      const result = await api.addRedeemCode({ productId, code, pin });
      await refreshData();
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const addBulkRedeemCodes = async (productId: string, codesText: string) => {
    setIsLoading(true);
    try {
      const result = await api.addBulkRedeemCodes(productId, codesText);
      await refreshData();
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const addRedeemCodes = async (newCodes: Omit<AdminRedeemCode, 'id'>[]) => {
    setIsLoading(true);
    try {
      for (const c of newCodes) {
        const targetProd =
          (c.productId && products.find((p) => p.id === c.productId)) ||
          products.find((p) => p.name === c.productName || p.denomination === `₹${c.denominationRupees}`) ||
          products[0];

        if (targetProd) {
          await api.addRedeemCode({
            productId: targetProd.id,
            code: c.fullCodeSecret,
            pin: c.pin,
          });
        }
      }
      await refreshData();
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRedeemCode = async (id: string, force?: boolean) => {
    setIsLoading(true);
    try {
      const result = await api.deleteRedeemCode(id, force);
      await refreshData();
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  // Real Database Order Status Action
  const updateOrderStatus = async (
    id: string,
    paymentStatus: 'PAID' | 'PENDING' | 'REFUNDED',
    deliveryStatus: 'DELIVERED' | 'PROCESSING' | 'FAILED'
  ) => {
    setIsLoading(true);
    try {
      await api.updateOrderStatus(id, paymentStatus, deliveryStatus);
      await refreshData();
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCustomerStatus = (id: string) => {
    setCustomerOverrides((prev) => ({
      ...prev,
      [id]: prev[id] === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED',
    }));
  };

  const updateStoreSettings = async (newSettings: any) => {
    setIsLoading(true);
    try {
      const merged = { ...storeSettings, ...newSettings };
      const updated = await api.updateStoreSettings(merged);
      if (updated) {
        setStoreSettings(updated);
      }
    } catch (err: any) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamically compute stats strictly from actual database records
  const totalSalesRupees = orders.reduce(
    (sum, o) => sum + (o.paymentStatus === 'PAID' ? o.amountRupees : 0),
    0
  );
  const todayStr = new Date().toISOString().substring(0, 10);
  const todaysSalesRupees = orders
    .filter((o) => o.paymentStatus === 'PAID' && o.createdAt.startsWith(todayStr))
    .reduce((sum, o) => sum + o.amountRupees, 0);

  const availableRedeemCodesCount = redeemCodes.filter((c) => c.status === 'AVAILABLE').length;
  const usedRedeemCodesCount = redeemCodes.filter((c) => c.status === 'USED').length;

  const stats: AdminDashboardStats = {
    totalSalesRupees,
    todaysSalesRupees,
    totalOrders: orders.length,
    pendingOrders: orders.filter((o) => o.paymentStatus === 'PENDING').length,
    availableRedeemCodes: availableRedeemCodesCount,
    usedRedeemCodes: usedRedeemCodesCount,
    registeredCustomers: customers.length,
  };

  return (
    <AdminContext.Provider
      value={{
        adminUser,
        adminTab,
        setAdminTab,
        adminLogin,
        adminLogout,
        isLoading,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        redeemCodes,
        addRedeemCodes,
        addSingleRedeemCode,
        addBulkRedeemCodes,
        deleteRedeemCode,
        orders,
        updateOrderStatus,
        customers,
        toggleCustomerStatus,
        payments,
        storeSettings,
        updateStoreSettings,
        stats,
        refreshData,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};


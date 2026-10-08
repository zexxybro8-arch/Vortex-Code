import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AdminUser,
  AdminTab,
  AdminDashboardStats,
  AdminOrder,
  AdminCustomer,
  AdminPayment,
  AdminRedeemCode,
  AdminCategory,
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
    status:
      c.status === 'UNUSED' || c.status === 'AVAILABLE'
        ? 'AVAILABLE'
        : c.status === 'SOLD' || c.status === 'USED'
        ? 'USED'
        : c.status === 'DISABLED'
        ? 'DISABLED'
        : 'RESERVED',
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

  // Categories
  categories: AdminCategory[];
  addCategory: (cat: { name: string; denomination: string; enabled?: boolean; sortOrder?: number }) => Promise<any>;
  updateCategory: (id: string, updates: Partial<AdminCategory>) => Promise<any>;
  toggleCategory: (id: string) => Promise<any>;
  deleteCategory: (id: string) => Promise<any>;

  // Redeem Codes
  redeemCodes: AdminRedeemCode[];
  addRedeemCodes: (newCodes: Omit<AdminRedeemCode, 'id'>[]) => Promise<void>;
  addSingleRedeemCode: (
    productId: string,
    code: string,
    pin?: string,
    status?: 'AVAILABLE' | 'RESERVED' | 'USED' | 'DISABLED'
  ) => Promise<any>;
  addBulkRedeemCodes: (productId: string, codesText: string) => Promise<any>;
  updateRedeemCode: (id: string, updates: any) => Promise<any>;
  deleteRedeemCode: (id: string, force?: boolean) => Promise<any>;

  // Orders
  orders: AdminOrder[];
  updateOrderStatus: (id: string, paymentStatus: any, deliveryStatus: any) => Promise<void>;

  // Customers
  customers: AdminCustomer[];
  toggleCustomerStatus: (id: string) => void;

  // Payments
  payments: AdminPayment[];

  // Settings & Branding
  storeSettings: {
    storeName: string;
    websiteName: string;
    subtitle: string;
    tagline: string;
    logoUrl: string;
    supportEmail: string;
    currencySymbol: string;
    enableAutoFulfillment: boolean;
    telegramEnabled: boolean;
    telegramUrl: string;
    contactEnabled?: boolean;
    contactPlatform?: 'telegram' | 'whatsapp' | 'custom';
    contactUrl?: string;
    contactIconUrl?: string;
    contactLabel?: string;
    contactWidgetSize?: number;
    contactWidgetRight?: number;
    contactWidgetBottom?: number;
    contactWidgetMobileSize?: number;
    contactWidgetMobileRight?: number;
    contactWidgetMobileBottom?: number;
    contactIconSize?: number;
    contactMobileIconSize?: number;
    famupigatewayBaseUrl: string;
    famupigatewayApiKey: string;
    famupigatewayWebhookSecret: string;
    famupigatewayExpiryMinutes: number;
    appUrl: string;
  };
  updateStoreSettings: (newSettings: any) => void;
  updateBranding: (branding: { logoUrl: string; websiteName: string; tagline: string }) => Promise<any>;
  updateContactSettings: (contact: {
    contactEnabled?: boolean;
    contactPlatform?: 'telegram' | 'whatsapp' | 'custom';
    contactUrl?: string;
    contactIconUrl?: string;
    contactLabel?: string;
    contactWidgetSize?: number;
    contactWidgetRight?: number;
    contactWidgetBottom?: number;
    contactWidgetMobileSize?: number;
    contactWidgetMobileRight?: number;
    contactWidgetMobileBottom?: number;
    contactIconSize?: number;
    contactMobileIconSize?: number;
    telegramEnabled?: boolean;
    telegramUrl?: string;
  }) => Promise<any>;

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
  const [users, setUsers] = useState<any[]>([]);

  // Compute real customers dynamically from real database users
  const customers: AdminCustomer[] = users.map((u) => {
    const custOrders = orders.filter((o) => o.customerEmail.toLowerCase() === u.email.toLowerCase());
    const totalSpent = custOrders.reduce((sum, o) => sum + (o.paymentStatus === 'PAID' ? o.amountRupees : 0), 0);
    return {
      id: u.customerId,
      fullName: u.fullName,
      email: u.email,
      registrationDate: u.createdAt ? u.createdAt.substring(0, 10) : new Date().toISOString().substring(0, 10),
      orderCount: custOrders.length,
      totalSpentRupees: totalSpent,
      status: u.status || 'ACTIVE',
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
    websiteName: 'VORTEX CODE',
    subtitle: 'SECURE DIGITAL STORE',
    tagline: 'SECURE DIGITAL STORE',
    logoUrl: '',
    supportEmail: 'support@vortexcode.com',
    currencySymbol: '₹',
    enableAutoFulfillment: true,
    telegramEnabled: true,
    telegramUrl: 'https://t.me/VortexCodeSupport',
    contactEnabled: true,
    contactPlatform: 'telegram' as 'telegram' | 'whatsapp' | 'custom',
    contactUrl: 'https://t.me/VortexCodeSupport',
    contactIconUrl: '',
    contactLabel: 'Contact Admin',
    contactWidgetSize: 60,
    contactWidgetRight: 30,
    contactWidgetBottom: 30,
    contactWidgetMobileSize: 55,
    contactWidgetMobileRight: 35,
    contactWidgetMobileBottom: 110,
    contactIconSize: 42,
    contactMobileIconSize: 42,
    famupigatewayBaseUrl: 'https://famupigateway.site/api',
    famupigatewayApiKey: 'Famcfc08cd92c090e3718e9ad92155eb0fc',
    famupigatewayWebhookSecret: '87116d2de22f33c0250df8cf721461952ad1545632beb18caca04a9b2ac1916f',
    famupigatewayExpiryMinutes: 5,
    appUrl: 'https://vortexcode.shop',
  });

  const [categories, setCategories] = useState<AdminCategory[]>([]);

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
      const [apiProducts, apiCodes, apiOrders, apiSettings, apiCats, apiUsers] = await Promise.all([
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
        api.getAdminCategories().catch((err) => {
          console.error('Failed to load categories from API:', err);
          return [];
        }),
        api.getAdminUsers().catch((err) => {
          console.error('Failed to load users from API:', err);
          return [];
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
      if (apiCats) {
        setCategories(apiCats);
      }
      if (apiUsers) {
        setUsers(apiUsers);
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
    } catch (err) {
      console.error('Failed to create product:', err);
      throw err;
    }
  };

  const updateProduct = async (id: string, updated: Partial<StoreProduct>) => {
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
    } catch (err) {
      console.error('Failed to update product:', err);
      throw err;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await api.deleteProduct(id);
      await refreshData();
    } catch (err) {
      console.error('Failed to delete product:', err);
      throw err;
    }
  };

  // Real Database Redeem Codes Actions
  const addSingleRedeemCode = async (
    productId: string,
    code: string,
    pin?: string,
    status?: 'AVAILABLE' | 'RESERVED' | 'USED' | 'DISABLED'
  ) => {
    try {
      const result = await api.addRedeemCode({ productId, code, pin, status });
      await refreshData();
      return result;
    } catch (err) {
      console.error('Failed to add redeem code:', err);
      throw err;
    }
  };

  const addBulkRedeemCodes = async (productId: string, codesText: string) => {
    try {
      const result = await api.addBulkRedeemCodes(productId, codesText);
      await refreshData();
      return result;
    } catch (err) {
      console.error('Failed to add bulk codes:', err);
      throw err;
    }
  };

  const updateRedeemCode = async (
    id: string,
    updates: {
      code?: string;
      pin?: string;
      status?: string;
      productId?: string;
    }
  ) => {
    try {
      const result = await api.updateRedeemCode(id, updates);
      await refreshData();
      return result;
    } catch (err) {
      console.error('Failed to update redeem code:', err);
      throw err;
    }
  };

  const addRedeemCodes = async (newCodes: Omit<AdminRedeemCode, 'id'>[]) => {
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
    } catch (err) {
      console.error('Failed to add redeem codes:', err);
      throw err;
    }
  };

  const deleteRedeemCode = async (id: string, force?: boolean) => {
    try {
      const result = await api.deleteRedeemCode(id, force);
      await refreshData();
      return result;
    } catch (err) {
      console.error('Failed to delete redeem code:', err);
      throw err;
    }
  };

  // Real Database Order Status Action
  const updateOrderStatus = async (
    id: string,
    paymentStatus: 'PAID' | 'PENDING' | 'REFUNDED',
    deliveryStatus: 'DELIVERED' | 'PROCESSING' | 'FAILED'
  ) => {
    try {
      await api.updateOrderStatus(id, paymentStatus, deliveryStatus);
      await refreshData();
    } catch (err) {
      console.error('Failed to update order status:', err);
      throw err;
    }
  };

  const toggleCustomerStatus = async (id: string) => {
    try {
      const userToToggle = users.find(u => u.customerId === id);
      if (!userToToggle) return;
      const newStatus = userToToggle.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
      await api.updateUserStatus(id, newStatus);
      await refreshData();
    } catch (err) {
      console.error('Failed to toggle customer status:', err);
    }
  };

  const addCategory = async (catData: {
    name: string;
    denomination: string;
    enabled?: boolean;
    sortOrder?: number;
  }) => {
    try {
      const created = await api.createCategory(catData);
      await refreshData();
      return created;
    } catch (err) {
      console.error('Failed to create category:', err);
      throw err;
    }
  };

  const updateCategory = async (id: string, updates: Partial<AdminCategory>) => {
    try {
      const updated = await api.updateCategory(id, updates);
      await refreshData();
      return updated;
    } catch (err) {
      console.error('Failed to update category:', err);
      throw err;
    }
  };

  const toggleCategory = async (id: string) => {
    try {
      const toggled = await api.toggleCategory(id);
      await refreshData();
      return toggled;
    } catch (err) {
      console.error('Failed to toggle category:', err);
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const res = await api.deleteCategory(id);
      await refreshData();
      return res;
    } catch (err) {
      console.error('Failed to delete category:', err);
      throw err;
    }
  };

  const updateStoreSettings = async (newSettings: any) => {
    try {
      const merged = { ...storeSettings, ...newSettings };
      const updated = await api.updateStoreSettings(merged);
      if (updated) {
        setStoreSettings(updated);
      }
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      throw err;
    }
  };

  const updateBranding = async (branding: { logoUrl: string; websiteName: string; tagline: string }) => {
    try {
      const updated = await api.updateBranding(branding);
      if (updated) {
        setStoreSettings((prev) => ({
          ...prev,
          logoUrl: updated.logoUrl !== undefined ? updated.logoUrl : branding.logoUrl,
          websiteName: updated.websiteName || branding.websiteName,
          storeName: updated.websiteName || branding.websiteName,
          tagline: updated.tagline || branding.tagline,
          subtitle: updated.tagline || branding.tagline,
        }));
      }
      return updated;
    } catch (err) {
      console.error('Failed to save branding:', err);
      throw err;
    }
  };

  const updateContactSettings = async (contact: {
    contactEnabled?: boolean;
    contactPlatform?: 'telegram' | 'whatsapp' | 'custom';
    contactUrl?: string;
    contactIconUrl?: string;
    contactLabel?: string;
    contactWidgetSize?: number;
    contactWidgetRight?: number;
    contactWidgetBottom?: number;
    contactWidgetMobileSize?: number;
    contactWidgetMobileRight?: number;
    contactWidgetMobileBottom?: number;
    contactIconSize?: number;
    contactMobileIconSize?: number;
    telegramEnabled?: boolean;
    telegramUrl?: string;
  }) => {
    try {
      const updated = await api.updateContactSettings(contact);
      if (updated) {
        setStoreSettings((prev) => ({
          ...prev,
          ...updated,
          contactEnabled: updated.contactEnabled !== undefined ? updated.contactEnabled : (contact.contactEnabled ?? prev.contactEnabled),
          contactPlatform: updated.contactPlatform || contact.contactPlatform || prev.contactPlatform,
          contactUrl: updated.contactUrl || contact.contactUrl || prev.contactUrl,
          contactIconUrl: updated.contactIconUrl !== undefined ? updated.contactIconUrl : (contact.contactIconUrl ?? prev.contactIconUrl),
          contactLabel: updated.contactLabel || contact.contactLabel || prev.contactLabel,
          contactWidgetSize: updated.contactWidgetSize !== undefined ? Number(updated.contactWidgetSize) : (contact.contactWidgetSize ?? prev.contactWidgetSize),
          contactWidgetRight: updated.contactWidgetRight !== undefined ? Number(updated.contactWidgetRight) : (contact.contactWidgetRight ?? prev.contactWidgetRight),
          contactWidgetBottom: updated.contactWidgetBottom !== undefined ? Number(updated.contactWidgetBottom) : (contact.contactWidgetBottom ?? prev.contactWidgetBottom),
          contactWidgetMobileSize: updated.contactWidgetMobileSize !== undefined ? Number(updated.contactWidgetMobileSize) : (contact.contactWidgetMobileSize ?? prev.contactWidgetMobileSize),
          contactWidgetMobileRight: updated.contactWidgetMobileRight !== undefined ? Number(updated.contactWidgetMobileRight) : (contact.contactWidgetMobileRight ?? prev.contactWidgetMobileRight),
          contactWidgetMobileBottom: updated.contactWidgetMobileBottom !== undefined ? Number(updated.contactWidgetMobileBottom) : (contact.contactWidgetMobileBottom ?? prev.contactWidgetMobileBottom),
          contactIconSize: updated.contactIconSize !== undefined ? Number(updated.contactIconSize) : (contact.contactIconSize ?? prev.contactIconSize),
          contactMobileIconSize: updated.contactMobileIconSize !== undefined ? Number(updated.contactMobileIconSize) : (contact.contactMobileIconSize ?? prev.contactMobileIconSize),
          telegramEnabled: updated.telegramEnabled !== undefined ? updated.telegramEnabled : (contact.contactEnabled ?? prev.telegramEnabled),
          telegramUrl: updated.telegramUrl || contact.contactUrl || prev.telegramUrl,
        }));
      }
      return updated;
    } catch (err) {
      console.error('Failed to save contact settings:', err);
      throw err;
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

  const todaysSalesOrdersCount = orders
    .filter((o) => o.paymentStatus === 'PAID' && o.createdAt.startsWith(todayStr))
    .length;

  const stats: AdminDashboardStats = {
    totalSalesRupees,
    todaysSalesRupees,
    todaysOrders: todaysSalesOrdersCount,
    totalOrders: orders.length,
    pendingOrders: orders.filter((o) => o.paymentStatus === 'PENDING').length,
    availableRedeemCodes: availableRedeemCodesCount,
    usedRedeemCodes: usedRedeemCodesCount,
    registeredCustomers: users.length,
    activeMembers: users.filter((u) => u.status === 'ACTIVE').length,
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
        categories,
        addCategory,
        updateCategory,
        toggleCategory,
        deleteCategory,
        redeemCodes,
        addRedeemCodes,
        addSingleRedeemCode,
        addBulkRedeemCodes,
        updateRedeemCode,
        deleteRedeemCode,
        orders,
        updateOrderStatus,
        customers,
        toggleCustomerStatus,
        payments,
        storeSettings,
        updateStoreSettings,
        updateBranding,
        updateContactSettings,
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


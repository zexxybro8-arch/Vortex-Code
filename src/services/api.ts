export interface ApiProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  rewardValue: number;
  denomination: string;
  enabled: boolean;
  image: string;
  createdAt: string;
  updatedAt: string;
  stock: number;
  soldCount: number;
  totalCodes: number;
  stockStatus: 'AVAILABLE' | 'OUT OF STOCK' | 'DISABLED';
}

export interface ApiRedeemCode {
  id: string;
  productId: string;
  productName: string;
  denomination: string;
  price?: number;
  rewardValue?: number;
  category?: string;
  code: string;
  codeFull?: string;
  codeMasked?: string;
  pin: string;
  status: 'UNUSED' | 'RESERVED' | 'SOLD';
  orderId: string | null;
  createdAt: string;
  usedAt: string | null;
}

export interface ApiOrder {
  id: string;
  orderNumber: string;
  productId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  paymentStatus: string;
  deliveryStatus: string;
  deliveredCodeId: string | null;
  deliveredCode: string | null;
  deliveredPin: string | null;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Safe HTTP JSON fetcher that reads raw response text first
 * to prevent 'Unexpected end of JSON input' SyntaxErrors.
 */
async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const raw = await res.text();

  let data: any = null;
  try {
    data = raw.trim() ? JSON.parse(raw) : null;
  } catch (err) {
    console.error(`Invalid non-JSON response from [${options?.method || 'GET'} ${url}]:`, raw.substring(0, 300));
    throw new Error(`Server returned an invalid non-JSON response (${res.status} ${res.statusText}).`);
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || `Request failed with status ${res.status} ${res.statusText}`;
    throw new Error(errorMsg);
  }

  if (data && typeof data === 'object' && data.success === false && data.status !== 'PENDING') {
    throw new Error(data.error || data.message || 'Operation failed on server');
  }

  return data;
}

export const api = {
  // Products
  async getProducts(): Promise<ApiProduct[]> {
    const data = await safeFetchJson('/api/products');
    return data.products || [];
  },

  async getProduct(id: string): Promise<ApiProduct> {
    const data = await safeFetchJson(`/api/products/${encodeURIComponent(id)}`);
    return data.product;
  },

  async createProduct(productData: {
    name: string;
    category?: string;
    description?: string;
    price: number;
    rewardValue?: number;
    denomination?: string;
    image?: string;
  }): Promise<ApiProduct> {
    const data = await safeFetchJson('/api/products', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'SAGAR551'
      },
      body: JSON.stringify(productData),
    });
    return data.product;
  },

  async updateProduct(id: string, updates: Partial<ApiProduct>): Promise<ApiProduct> {
    const data = await safeFetchJson(`/api/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'SAGAR551'
      },
      body: JSON.stringify(updates),
    });
    return data.product;
  },

  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    return safeFetchJson(`/api/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'x-admin-token': 'SAGAR551'
      }
    });
  },

  // Redeem Codes
  async getRedeemCodes(productId?: string, status?: string, denomination?: string, isAdmin: boolean = false): Promise<ApiRedeemCode[]> {
    const params = new URLSearchParams();
    if (productId) params.set('productId', productId);
    if (status) params.set('status', status);
    if (denomination && denomination !== 'ALL VALUES') params.set('denomination', denomination);

    const headers: Record<string, string> = {};
    if (isAdmin) {
      headers['x-admin-token'] = 'SAGAR551';
    }

    const data = await safeFetchJson(`/api/redeem-codes?${params.toString()}`, { headers });
    return data.codes || [];
  },

  async addRedeemCode(codeData: {
    productId: string;
    code: string;
    pin?: string;
    status?: string;
  }): Promise<any> {
    return safeFetchJson('/api/redeem-codes', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'SAGAR551'
      },
      body: JSON.stringify(codeData),
    });
  },

  async addBulkRedeemCodes(productId: string, codesText: string): Promise<{ success: boolean; addedCount: number; message: string }> {
    return safeFetchJson('/api/redeem-codes/bulk', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'SAGAR551'
      },
      body: JSON.stringify({ productId, codesText }),
    });
  },

  async updateRedeemCode(id: string, updates: {
    code?: string;
    pin?: string;
    status?: string;
    productId?: string;
  }): Promise<any> {
    return safeFetchJson(`/api/redeem-codes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'SAGAR551'
      },
      body: JSON.stringify(updates),
    });
  },

  async updateRedeemCodeStatus(id: string, status: 'UNUSED' | 'RESERVED' | 'SOLD' | 'DISABLED'): Promise<any> {
    return safeFetchJson(`/api/redeem-codes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'SAGAR551'
      },
      body: JSON.stringify({ status }),
    });
  },

  async deleteRedeemCode(id: string, force?: boolean): Promise<{ success: boolean; id: string; message?: string }> {
    const url = `/api/redeem-codes/${encodeURIComponent(id)}${force ? '?force=true' : ''}`;
    return safeFetchJson(url, {
      method: 'DELETE',
      headers: {
        'x-admin-token': 'SAGAR551'
      }
    });
  },

  // Orders
  async getOrders(email?: string): Promise<ApiOrder[]> {
    try {
      const params = new URLSearchParams();
      if (email) params.set('email', email);

      const headers: Record<string, string> = {};
      if (!email) {
        headers['x-admin-token'] = 'SAGAR551';
      }

      const data = await safeFetchJson(`/api/orders?${params.toString()}`, { headers });
      return data.orders || [];
    } catch (err) {
      console.warn('api.getOrders connection notice:', err);
      return [];
    }
  },

  async getOrder(id: string, email?: string): Promise<ApiOrder | null> {
    const params = new URLSearchParams();
    if (email) params.set('email', email);

    const headers: Record<string, string> = {};
    if (!email) {
      headers['x-admin-token'] = 'SAGAR551';
    }

    try {
      const data = await safeFetchJson(`/api/orders/${encodeURIComponent(id)}?${params.toString()}`, { headers });
      return data.order || null;
    } catch (err: any) {
      if (err.message?.includes('404') || err.message?.includes('not found')) return null;
      throw err;
    }
  },

  async updateOrderStatus(id: string, paymentStatus: string, deliveryStatus: string): Promise<any> {
    const data = await safeFetchJson(`/api/orders/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'SAGAR551'
      },
      body: JSON.stringify({ paymentStatus, deliveryStatus }),
    });
    return data.order;
  },

  async purchaseProduct(data: {
    productId?: string;
    codeId?: string;
    customerName: string;
    customerEmail: string;
    paymentMethod?: string;
  }): Promise<{ success: boolean; order: any }> {
    return safeFetchJson('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Checkout & Payment Gateway
  async getPaymentConfig(): Promise<any> {
    try {
      const data = await safeFetchJson('/api/payment/config');
      return data?.config || null;
    } catch {
      return null;
    }
  },

  async createCheckoutOrder(data: {
    productId: string;
    codeId?: string;
    customerName: string;
    customerEmail: string;
    customerId?: string;
  }): Promise<{
    success: boolean;
    order: any;
    gatewayOrder: any;
    gatewayConfig: any;
    isOutOfStock?: boolean;
    error?: string;
  }> {
    return safeFetchJson('/api/checkout/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async verifyPayment(data: {
    orderId: string;
    gatewayPaymentId?: string;
    gatewayOrderId?: string;
    gatewaySignature?: string;
    isSimulatedVerification?: boolean;
  }): Promise<{
    success: boolean;
    status?: 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED';
    order: any;
    message?: string;
    alreadyFulfilled?: boolean;
    rawGatewayResponse?: any;
  }> {
    return safeFetchJson('/api/checkout/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async getCheckoutOrderStatus(id: string): Promise<{
    success: boolean;
    order: any;
  }> {
    return safeFetchJson(`/api/checkout/order-status/${encodeURIComponent(id)}`);
  },

  // Store Settings & Branding
  async getStoreSettings(): Promise<any> {
    try {
      const data = await safeFetchJson('/api/settings');
      return data?.settings || null;
    } catch {
      return null;
    }
  },

  async updateStoreSettings(settings: Record<string, any>): Promise<any> {
    const data = await safeFetchJson('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': 'SAGAR551',
      },
      body: JSON.stringify(settings),
    });
    return data.settings;
  },

  async updateBranding(branding: { logoUrl: string; websiteName: string; tagline: string }): Promise<any> {
    const data = await safeFetchJson('/api/admin/branding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': 'SAGAR551',
      },
      body: JSON.stringify(branding),
    });
    return data.settings;
  },

  // Categories
  async getCategories(all = false): Promise<any[]> {
    try {
      const url = all ? '/api/categories?all=true' : '/api/categories';
      const data = await safeFetchJson(url);
      return data?.categories || [];
    } catch {
      return [];
    }
  },

  async getAdminCategories(): Promise<any[]> {
    try {
      const data = await safeFetchJson('/api/admin/categories');
      return data?.categories || [];
    } catch {
      return [];
    }
  },

  async createCategory(categoryData: {
    name: string;
    denomination: string;
    enabled?: boolean;
    sortOrder?: number;
  }): Promise<any> {
    const data = await safeFetchJson('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryData),
    });
    return data.category;
  },

  async updateCategory(
    id: string,
    categoryData: {
      name?: string;
      denomination?: string;
      enabled?: boolean;
      sortOrder?: number;
    }
  ): Promise<any> {
    const data = await safeFetchJson(`/api/admin/categories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryData),
    });
    return data.category;
  },

  async toggleCategory(id: string): Promise<any> {
    const data = await safeFetchJson(`/api/admin/categories/${encodeURIComponent(id)}/toggle`, {
      method: 'PATCH',
    });
    return data.category;
  },

  async deleteCategory(id: string): Promise<any> {
    return safeFetchJson(`/api/admin/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};

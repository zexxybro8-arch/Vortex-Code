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

export const api = {
  // Products
  async getProducts(): Promise<ApiProduct[]> {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch products from database');
      const data = await res.json();
      return data.products || [];
    } catch (err) {
      console.warn('api.getProducts connection notice:', err);
      return [];
    }
  },

  async getProduct(id: string): Promise<ApiProduct> {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Failed to fetch product');
    const data = await res.json();
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
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'SAGAR551'
      },
      body: JSON.stringify(productData),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to create product in database');
    }
    return data.product;
  },

  async updateProduct(id: string, updates: Partial<ApiProduct>): Promise<ApiProduct> {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'SAGAR551'
      },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update product in database');
    }
    return data.product;
  },

  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'x-admin-token': 'SAGAR551'
      }
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to disable product');
    }
    return data;
  },

  // Redeem Codes
  async getRedeemCodes(productId?: string, status?: string, denomination?: string, isAdmin: boolean = false): Promise<ApiRedeemCode[]> {
    try {
      const params = new URLSearchParams();
      if (productId) params.set('productId', productId);
      if (status) params.set('status', status);
      if (denomination && denomination !== 'ALL VALUES') params.set('denomination', denomination);

      const headers: Record<string, string> = {};
      if (isAdmin) {
        headers['x-admin-token'] = 'SAGAR551';
      }

      const res = await fetch(`/api/redeem-codes?${params.toString()}`, {
        headers
      });
      if (!res.ok) throw new Error('Failed to fetch redeem codes from database');
      const data = await res.json();
      return data.codes || [];
    } catch (err) {
      console.warn('api.getRedeemCodes connection notice:', err);
      return [];
    }
  },

  async addRedeemCode(codeData: {
    productId: string;
    code: string;
    pin?: string;
  }): Promise<any> {
    const res = await fetch('/api/redeem-codes', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'SAGAR551'
      },
      body: JSON.stringify(codeData),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to add redeem code to database');
    }
    return data;
  },

  async addBulkRedeemCodes(productId: string, codesText: string): Promise<{ success: boolean; addedCount: number; message: string }> {
    const res = await fetch('/api/redeem-codes/bulk', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'SAGAR551'
      },
      body: JSON.stringify({ productId, codesText }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to add bulk redeem codes to database');
    }
    return data;
  },

  async updateRedeemCodeStatus(id: string, status: 'UNUSED' | 'RESERVED' | 'SOLD'): Promise<any> {
    const res = await fetch(`/api/redeem-codes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'SAGAR551'
      },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update code status');
    }
    return data;
  },

  async deleteRedeemCode(id: string, force?: boolean): Promise<{ success: boolean; id: string; message?: string }> {
    const url = `/api/redeem-codes/${encodeURIComponent(id)}${force ? '?force=true' : ''}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'x-admin-token': 'SAGAR551'
      }
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete code from database');
    }
    return data;
  },

  // Orders
  async getOrders(email?: string): Promise<ApiOrder[]> {
    try {
      const params = new URLSearchParams();
      if (email) params.set('email', email);

      const headers: Record<string, string> = {};
      // If we don't have an email, then it's an admin requesting all orders
      if (!email) {
        headers['x-admin-token'] = 'SAGAR551';
      }

      const res = await fetch(`/api/orders?${params.toString()}`, {
        headers
      });
      if (!res.ok) throw new Error('Failed to fetch orders from database');
      const data = await res.json();
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

    const res = await fetch(`/api/orders/${encodeURIComponent(id)}?${params.toString()}`, {
      headers
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('Failed to fetch order');
    }
    const data = await res.json();
    return data.order || null;
  },

  async updateOrderStatus(id: string, paymentStatus: string, deliveryStatus: string): Promise<any> {
    const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-token': 'SAGAR551'
      },
      body: JSON.stringify({ paymentStatus, deliveryStatus }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update order status');
    }
    return data.order;
  },

  async purchaseProduct(data: {
    productId?: string;
    codeId?: string;
    customerName: string;
    customerEmail: string;
    paymentMethod?: string;
  }): Promise<{ success: boolean; order: any }> {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Purchase failed');
    }
    return result;
  },

  // Checkout & Payment Gateway
  async getPaymentConfig(): Promise<any> {
    try {
      const res = await fetch('/api/payment/config');
      if (!res.ok) return null;
      const data = await res.json();
      return data.config;
    } catch (err) {
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
    const res = await fetch('/api/checkout/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Failed to initiate checkout order');
    }
    return result;
  },

  async verifyPayment(data: {
    orderId: string;
    gatewayPaymentId?: string;
    gatewayOrderId?: string;
    gatewaySignature?: string;
    isSimulatedVerification?: boolean;
  }): Promise<{
    success: boolean;
    order: any;
    message?: string;
    alreadyFulfilled?: boolean;
  }> {
    const res = await fetch('/api/checkout/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Payment verification failed');
    }
    return result;
  },

  // Store Settings
  async getStoreSettings(): Promise<any> {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) return null;
      const data = await res.json();
      return data.settings;
    } catch {
      return null;
    }
  },

  async updateStoreSettings(settings: Record<string, any>): Promise<any> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update store settings');
    }
    return data.settings;
  },
};

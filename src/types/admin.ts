export type AdminTab =
  | 'dashboard'
  | 'branding'
  | 'categories'
  | 'redeem-codes'
  | 'products'
  | 'denominations'
  | 'orders'
  | 'customers'
  | 'contact'
  | 'settings';

export interface AdminCategory {
  id: string;
  name: string;
  denomination: string;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
  availableStock?: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Store Manager';
  lastLogin: string;
}

export interface AdminDashboardStats {
  totalSalesRupees: number;
  todaysSalesRupees: number;
  totalOrders: number;
  todaysOrders: number;
  pendingOrders: number;
  availableRedeemCodes: number;
  usedRedeemCodes: number;
  registeredCustomers: number;
  activeMembers: number;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  productName: string;
  amountRupees: number;
  paymentStatus: 'PAID' | 'PENDING' | 'REFUNDED';
  deliveryStatus: 'DELIVERED' | 'PROCESSING' | 'FAILED';
  createdAt: string;
}

export interface AdminCustomer {
  id: string;
  fullName: string;
  email: string;
  registrationDate: string;
  orderCount: number;
  totalSpentRupees: number;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface AdminPayment {
  id: string;
  transactionId: string;
  orderId: string;
  customerEmail: string;
  amountRupees: number;
  paymentMethod: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  createdAt: string;
}

export interface AdminRedeemCode {
  id: string;
  productId?: string;
  productName: string;
  codeMasked: string; // e.g. "VRX-****-****-8810"
  fullCodeSecret: string;
  pin: string;
  denominationRupees: number;
  denomination?: string;
  orderId?: string | null;
  status: 'AVAILABLE' | 'USED' | 'RESERVED' | 'DISABLED';
  createdAt: string;
  usedByCustomerEmail?: string;
  usedAt?: string;
}

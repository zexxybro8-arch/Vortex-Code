export type AuthView = 'landing' | 'login' | 'register' | 'forgot-password' | 'dashboard' | 'store' | 'vault' | 'order-lookup';

export type DashboardTab = 'redeem-code' | 'how-to-redeem' | 'support' | 'my-orders';

export interface User {
  id: string;
  fullName: string;
  email: string;
  username: string;
  mobileNumber?: string;
  isGuest: boolean;
  avatarUrl?: string;
  createdAt: string;
  security2FA: boolean;
  balance?: number;
}

export interface StoreProduct {
  id: string;
  name: string;
  priceRupees: number;
  rewardValueRupees: number;
  denomination: string; // e.g. "₹100", "₹120", "₹150", "₹200", etc.
  category: 'GAMING' | 'DIGITAL REWARDS' | 'OTHER';
  stockStatus: 'AVAILABLE' | 'LIMITED STOCK' | 'OUT OF STOCK';
  deliveryInfo: string;
  badge?: string;
  image: string;
  description: string;
  stock?: number;
  soldCount?: number;
  totalCodes?: number;
  enabled?: boolean;
}

export interface RedeemCode {
  id: string;
  productId?: string;
  denomination?: string;
  priceRupees?: number;
  title: string;
  category: string;
  value: number;
  code: string;
  codeMasked?: string;
  pin?: string;
  status: 'available' | 'claimed' | 'expired';
  claimedAt?: string;
  image: string;
  description: string;
}

export interface OrderItem {
  id: string;
  orderNumber: string;
  codeTitle: string;
  priceRupees: number;
  rewardValueRupees: number;
  codeValue?: number;
  redeemCode: string;
  pin?: string;
  category: string;
  purchaseDate: string;
  status: 'Completed' | 'Delivered' | 'Processing';
  paymentMethod: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  orderId?: string;
  status: 'Open' | 'Resolved' | 'In Progress';
  createdAt: string;
}

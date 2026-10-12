/**
 * Payment Service Types & Interfaces for Trust Gateway Integration
 */

export interface PaymentGatewayConfig {
  provider: string;
  isConfigured: boolean;
  currency: string;
  merchantName: string;
  message?: string;
  publicKey?: string;
  webhookConfigured?: boolean;
}

export interface CreatePaymentOrderParams {
  orderId: string;
  orderNumber: string;
  amount: number; // in INR
  currency: string;
  productId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  customerId?: string;
  orderType?: 'PURCHASE' | 'DEPOSIT' | 'DIAMOND_PURCHASE';
  callbackUrl?: string;
}

export interface PaymentGatewayOrderResponse {
  gatewayOrderId?: string;
  amount: number;
  payableAmount?: number;
  currency: string;
  provider: string;
  status: 'created' | 'unconfigured' | 'unavailable';
  paymentUrl?: string;
  message?: string;
  token?: string;
  expiresAt?: string;
}

export interface PaymentVerificationParams {
  orderId: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  expectedAmount?: number;
  userId?: string;
}

export interface PaymentVerificationResult {
  isValid: boolean;
  orderId: string;
  gatewayOrderId?: string;
  amount: number;
  payableAmount?: number;
  transactionId?: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  error?: string;
  rawGatewayResponse?: any;
}

/**
 * Standard Provider Interface for payment gateways
 */
export interface IPaymentGatewayProvider {
  name: string;
  isConfigured(): boolean;
  getConfig(): PaymentGatewayConfig;
  createOrder(params: CreatePaymentOrderParams): Promise<PaymentGatewayOrderResponse>;
  verifyPayment(params: PaymentVerificationParams): Promise<PaymentVerificationResult>;
  verifyWebhookSignature?(rawBody: string, signature: string, payload?: any): boolean;
}

export interface PaymentGatewayConfig {
  provider: 'razorpay' | 'cashfree' | 'stripe' | 'custom';
  isConfigured: boolean;
  currency: string;
  publicKey?: string;
  merchantName: string;
  webhookConfigured: boolean;
}

export interface CreatePaymentOrderParams {
  orderId: string;
  orderNumber: string;
  amount: number; // in INR rupees
  currency: string;
  productId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
}

export interface PaymentGatewayOrderResponse {
  gatewayOrderId?: string;
  amount: number;
  currency: string;
  keyId?: string;
  provider: string;
  status: 'created' | 'unconfigured' | 'ready';
}

export interface PaymentVerificationParams {
  orderId: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
}

export interface PaymentVerificationResult {
  isValid: boolean;
  orderId: string;
  amount: number;
  transactionId?: string;
  error?: string;
}

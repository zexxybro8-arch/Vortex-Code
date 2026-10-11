import type {
  PaymentGatewayConfig,
  CreatePaymentOrderParams,
  PaymentGatewayOrderResponse,
  PaymentVerificationParams,
  PaymentVerificationResult,
  IPaymentGatewayProvider,
} from './types';
import { trustGatewayProvider } from './trustGateway';

/**
 * Modular Payment Gateway Manager
 * 
 * Configured with Trust Gateway provider.
 * Follows strict zero-trust rules:
 * - Never returns fake payment successes
 * - Never delivers codes or credits wallet balances without genuine verified payment
 * - No sandbox simulators or mock redirects
 * - Keeps verification strictly server-side
 */
export class PaymentGatewayManager implements IPaymentGatewayProvider {
  public readonly name = 'PaymentGatewayManager';
  private activeProvider: IPaymentGatewayProvider;
  private merchantName = 'Vortex Digital Store';
  private currency = 'INR';

  constructor(provider?: IPaymentGatewayProvider) {
    this.activeProvider = provider || trustGatewayProvider;
  }

  /**
   * Register or swap payment gateway provider
   */
  public registerProvider(provider: IPaymentGatewayProvider): void {
    this.activeProvider = provider;
  }

  /**
   * Get active provider
   */
  public getActiveProvider(): IPaymentGatewayProvider {
    return this.activeProvider;
  }

  /**
   * Check whether gateway is actively configured with valid credentials
   */
  public isConfigured(): boolean {
    return this.activeProvider ? this.activeProvider.isConfigured() : false;
  }

  /**
   * Dynamic credentials updater
   */
  public updateCredentials(settings: Record<string, any>): void {
    if (this.activeProvider && 'updateCredentials' in (this.activeProvider as any)) {
      (this.activeProvider as any).updateCredentials(settings);
    }
  }

  /**
   * Returns current gateway configuration (public-safe data only)
   */
  public getConfig(): PaymentGatewayConfig {
    if (this.activeProvider) {
      return this.activeProvider.getConfig();
    }

    return {
      provider: 'none',
      isConfigured: false,
      currency: this.currency,
      merchantName: this.merchantName,
      message: 'Payment service temporarily unavailable. Please try again later.',
      webhookConfigured: false,
    };
  }

  /**
   * Initializes a payment order.
   */
  public async createOrder(params: CreatePaymentOrderParams): Promise<PaymentGatewayOrderResponse> {
    if (!this.activeProvider || !this.activeProvider.isConfigured()) {
      throw new Error('Payment service temporarily unavailable. Please try again later.');
    }
    return this.activeProvider.createOrder(params);
  }

  /**
   * Alias for backward-compatible call in codebase
   */
  public async createGatewayOrder(params: CreatePaymentOrderParams): Promise<PaymentGatewayOrderResponse> {
    return this.createOrder(params);
  }

  /**
   * Server-side payment status verification.
   */
  public async verifyPayment(params: PaymentVerificationParams): Promise<PaymentVerificationResult> {
    if (!this.activeProvider || !this.activeProvider.isConfigured()) {
      return {
        isValid: false,
        status: 'PENDING',
        orderId: params.orderId,
        gatewayOrderId: params.gatewayOrderId,
        amount: 0,
        error: 'Payment service temporarily unavailable. Please try again later.',
      };
    }
    return this.activeProvider.verifyPayment(params);
  }

  /**
   * Alias for backward-compatible checkPaymentStatus call
   */
  public async checkPaymentStatus(orderId: string, expectedAmount?: number): Promise<PaymentVerificationResult> {
    return this.verifyPayment({ orderId, expectedAmount });
  }

  /**
   * Webhook signature verification
   */
  public verifyWebhookSignature(rawBody: string, signature: string, payload?: any): boolean {
    if (this.activeProvider && this.activeProvider.verifyWebhookSignature) {
      return this.activeProvider.verifyWebhookSignature(rawBody, signature, payload);
    }
    return false;
  }
}

export const paymentGateway = new PaymentGatewayManager();

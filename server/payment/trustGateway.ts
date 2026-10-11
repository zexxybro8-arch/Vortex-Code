import crypto from 'crypto';
import type {
  CreatePaymentOrderParams,
  PaymentGatewayConfig,
  PaymentGatewayOrderResponse,
  PaymentVerificationParams,
  PaymentVerificationResult,
  IPaymentGatewayProvider,
} from './types';

/**
 * Trust Gateway UPI Payment Integration
 * 
 * Official Documentation: https://trustgateway.in/docs
 * Base URL: https://trustgateway.in
 * 
 * API Endpoints:
 * - Create Order: POST https://trustgateway.in/api/v1/orders/create
 * - Verify Status: GET https://trustgateway.in/api/v1/orders/status/:order_id
 * - Webhook Signature: HMAC-SHA256 over `order_id|amount.toFixed(2)|status|utr-or-NONE`
 */
export class TrustGatewayProvider implements IPaymentGatewayProvider {
  public readonly name = 'TrustGateway';
  private baseUrl: string;
  private apiKey: string;
  private webhookSecret: string;
  private merchantName: string = 'Vortex Digital Store';
  private requestTimeoutMs: number = 12000;
  private fetchFn: typeof fetch;

  constructor(options?: { baseUrl?: string; apiKey?: string; webhookSecret?: string; fetchFn?: typeof fetch }) {
    this.baseUrl = (options?.baseUrl || process.env.TRUST_GATEWAY_BASE_URL || 'https://trustgateway.in').replace(/\/+$/, '');
    this.apiKey = (options?.apiKey || process.env.TRUST_GATEWAY_API_KEY || '').trim();
    this.webhookSecret = (options?.webhookSecret || process.env.TRUST_GATEWAY_WEBHOOK_SECRET || '').trim();
    this.fetchFn = options?.fetchFn || globalThis.fetch.bind(globalThis);
  }

  public setFetchFn(fn: typeof fetch): void {
    this.fetchFn = fn;
  }

  public setApiKey(key: string): void {
    this.apiKey = key.trim();
  }

  public setWebhookSecret(secret: string): void {
    this.webhookSecret = secret.trim();
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  public updateCredentials(settings: Record<string, any>): void {
    if (settings.trustGatewayApiKey && typeof settings.trustGatewayApiKey === 'string') {
      this.apiKey = settings.trustGatewayApiKey.trim();
    } else if (process.env.TRUST_GATEWAY_API_KEY) {
      this.apiKey = process.env.TRUST_GATEWAY_API_KEY.trim();
    }

    if (settings.trustGatewayWebhookSecret && typeof settings.trustGatewayWebhookSecret === 'string') {
      this.webhookSecret = settings.trustGatewayWebhookSecret.trim();
    } else if (process.env.TRUST_GATEWAY_WEBHOOK_SECRET) {
      this.webhookSecret = process.env.TRUST_GATEWAY_WEBHOOK_SECRET.trim();
    }

    if (settings.trustGatewayBaseUrl && typeof settings.trustGatewayBaseUrl === 'string') {
      this.baseUrl = settings.trustGatewayBaseUrl.trim().replace(/\/+$/, '');
    }
  }

  public getConfig(): PaymentGatewayConfig {
    return {
      provider: 'trustgateway',
      isConfigured: this.isConfigured(),
      currency: 'INR',
      merchantName: this.merchantName,
      message: this.isConfigured()
        ? 'Trust Gateway UPI is active and secure.'
        : 'Payment service temporarily unavailable. Please try again later.',
      webhookConfigured: Boolean(this.webhookSecret || this.apiKey),
    };
  }

  /**
   * 1. TRUST GATEWAY ORDER CREATION
   * POST https://trustgateway.in/api/v1/orders/create
   * Headers:
   *   X-API-Key: process.env.TRUST_GATEWAY_API_KEY
   *   Content-Type: application/json
   */
  public async createOrder(params: CreatePaymentOrderParams): Promise<PaymentGatewayOrderResponse> {
    if (!this.isConfigured()) {
      throw new Error('Payment service temporarily unavailable. Please try again later.');
    }

    if (!params.amount || params.amount <= 0 || isNaN(params.amount)) {
      throw new Error('Invalid payment amount. Amount must be a positive number.');
    }

    const formattedAmount = Number(params.amount).toFixed(2);
    const orderNote = params.orderNumber || params.orderId || 'Order';

    const requestPayload = {
      amount: formattedAmount,
      note: orderNote,
    };

    const endpoint = `${this.baseUrl}/api/v1/orders/create`;

    // Safe sanitized logging - Never log API keys or secrets
    console.log(`[TrustGateway CreateOrder] Order: ${params.orderId} | Amount: ₹${formattedAmount} | Note: ${orderNote}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await this.fetchFn(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const rawText = await response.text();
      let resData: any = null;
      try {
        resData = rawText.trim() ? JSON.parse(rawText) : null;
      } catch (parseErr) {
        console.warn(`[TrustGateway Notice] Non-JSON response for Order ${params.orderId}:`, rawText.substring(0, 150));
      }

      if (!response.ok) {
        const statusCode = response.status;
        const errMsg = resData?.message || resData?.error || `Gateway returned HTTP ${statusCode}`;

        if (statusCode === 400) {
          throw new Error(`Trust Gateway rejected order: ${errMsg}`);
        } else if (statusCode === 401 || statusCode === 403) {
          throw new Error('Trust Gateway authentication failed. Please verify TRUST_GATEWAY_API_KEY.');
        } else if (statusCode === 429) {
          throw new Error('Trust Gateway rate limit exceeded. Please try again shortly.');
        } else if (statusCode >= 500) {
          throw new Error('Trust Gateway service error. Please try again later.');
        }
        throw new Error(`Trust Gateway Error: ${errMsg}`);
      }

      // Check success response payload format:
      // Typically: { status: "success", data: { order_id, checkout_url, amount, payable_amount } }
      // Or flat: { order_id, checkout_url, ... }
      const payloadData = resData?.data || resData;

      if (!payloadData || (resData?.status && resData.status !== 'success' && resData.status !== true && resData.status !== 'created')) {
        const errorMsg = resData?.message || resData?.error || 'Order creation declined by gateway.';
        throw new Error(`Trust Gateway Error: ${errorMsg}`);
      }

      const gatewayOrderId = String(
        payloadData.order_id ||
        payloadData.id ||
        payloadData.gateway_order_id ||
        resData.order_id ||
        ''
      ).trim();

      const rawCheckoutUrl = String(
        payloadData.checkout_url ||
        payloadData.payment_url ||
        resData.checkout_url ||
        resData.payment_url ||
        ''
      ).trim();

      if (!rawCheckoutUrl) {
        throw new Error('Trust Gateway succeeded but no hosted checkout URL was returned.');
      }

      // Format full hosted checkout URL
      const hostedPaymentUrl = rawCheckoutUrl.startsWith('http://') || rawCheckoutUrl.startsWith('https://')
        ? rawCheckoutUrl
        : `${this.baseUrl}${rawCheckoutUrl.startsWith('/') ? '' : '/'}${rawCheckoutUrl}`;

      const payableAmountNum = Number(
        payloadData.payable_amount !== undefined
          ? payloadData.payable_amount
          : (payloadData.amount !== undefined ? payloadData.amount : params.amount)
      );

      console.log(`[TrustGateway Order Created] Local: ${params.orderId} | GatewayID: ${gatewayOrderId} | Payable: ₹${payableAmountNum}`);

      return {
        gatewayOrderId: gatewayOrderId || params.orderId,
        amount: params.amount,
        payableAmount: isNaN(payableAmountNum) ? params.amount : payableAmountNum,
        currency: 'INR',
        provider: 'trustgateway',
        status: 'created',
        paymentUrl: hostedPaymentUrl,
        expiresAt: payloadData.expires_at || undefined,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Trust Gateway connection timed out. Please try again.');
      }
      console.error(`[TrustGateway Exception] Order ${params.orderId} failed:`, err.message);
      throw err;
    }
  }

  /**
   * 2. PAYMENT STATUS VERIFICATION
   * GET https://trustgateway.in/api/v1/orders/status/:order_id
   * Headers:
   *   X-API-Key: process.env.TRUST_GATEWAY_API_KEY
   */
  public async verifyPayment(params: PaymentVerificationParams): Promise<PaymentVerificationResult> {
    if (!this.isConfigured()) {
      return {
        isValid: false,
        status: 'PENDING',
        orderId: params.orderId,
        gatewayOrderId: params.gatewayOrderId,
        amount: 0,
        error: 'Trust Gateway is not configured with live credentials.',
      };
    }

    const identifier = (params.gatewayOrderId || params.orderId).trim();
    if (!identifier) {
      return {
        isValid: false,
        status: 'PENDING',
        orderId: params.orderId,
        amount: 0,
        error: 'Missing order identifier for status query.',
      };
    }

    const endpoint = `${this.baseUrl}/api/v1/orders/status/${encodeURIComponent(identifier)}`;
    console.log(`[TrustGateway Verify Request] Identifier: ${identifier}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await this.fetchFn(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-API-Key': this.apiKey,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const rawText = await response.text();
      let resData: any = null;
      try {
        resData = rawText.trim() ? JSON.parse(rawText) : null;
      } catch (parseErr) {
        console.warn(`[TrustGateway Status Notice] Non-JSON response for ${identifier}:`, rawText.substring(0, 150));
      }

      if (!response.ok) {
        const statusCode = response.status;
        const errorMsg = resData?.message || resData?.error || `Gateway returned HTTP ${statusCode}`;

        if (statusCode === 404) {
          return {
            isValid: false,
            status: 'PENDING',
            orderId: params.orderId,
            gatewayOrderId: identifier,
            amount: params.expectedAmount || 0,
            error: 'Order status not found on gateway yet. Waiting for customer payment.',
            rawGatewayResponse: resData,
          };
        }

        return {
          isValid: false,
          status: 'PENDING',
          orderId: params.orderId,
          gatewayOrderId: identifier,
          amount: params.expectedAmount || 0,
          error: errorMsg,
          rawGatewayResponse: resData,
        };
      }

      if (!resData) {
        return {
          isValid: false,
          status: 'PENDING',
          orderId: params.orderId,
          gatewayOrderId: identifier,
          amount: params.expectedAmount || 0,
          error: 'Empty response received from gateway.',
        };
      }

      const data = resData.data || resData;
      const rawStatus = data.status !== undefined ? data.status : resData.status;
      const statusStr = String(rawStatus || '').toUpperCase().trim();

      const gatewayOrderId = String(data.order_id || resData.order_id || identifier);
      const utr = String(data.utr || data.bank_utr || data.transaction_id || data.txn_id || '').trim();
      const settledAmount = Number(data.payable_amount !== undefined ? data.payable_amount : (data.amount || resData.amount || 0));

      console.log(`[TrustGateway Status Received] ID: ${gatewayOrderId} | Status: ${statusStr} | Amount: ₹${settledAmount} | UTR: ${utr ? 'YES' : 'NO'}`);

      // Verify that settled amount matches expected payable amount
      if (params.expectedAmount && settledAmount > 0) {
        const diff = Math.abs(settledAmount - params.expectedAmount);
        if (diff > 0.05) {
          console.warn(`[TrustGateway Security Alert] Amount mismatch for ${identifier}: expected ₹${params.expectedAmount}, got ₹${settledAmount}`);
          return {
            isValid: false,
            status: 'FAILED',
            orderId: params.orderId,
            gatewayOrderId,
            amount: settledAmount,
            payableAmount: settledAmount,
            error: `Payment amount mismatch: expected ₹${params.expectedAmount} but gateway recorded ₹${settledAmount}.`,
            rawGatewayResponse: data,
          };
        }
      }

      const isPaid =
        statusStr === 'PAID' ||
        statusStr === 'COMPLETED' ||
        statusStr === 'SUCCESS' ||
        statusStr === 'TXN_SUCCESS' ||
        statusStr === 'CAPTURED';

      const isFailed =
        statusStr === 'FAILED' ||
        statusStr === 'DECLINED' ||
        statusStr === 'REJECTED' ||
        statusStr === 'CANCELLED' ||
        statusStr === 'FAILURE';

      const isExpired = statusStr === 'EXPIRED' || statusStr === 'TIMEOUT';

      if (isPaid) {
        return {
          isValid: true,
          status: 'PAID',
          orderId: params.orderId,
          gatewayOrderId,
          amount: settledAmount || params.expectedAmount || 0,
          payableAmount: settledAmount || params.expectedAmount || 0,
          transactionId: utr || `tg_${gatewayOrderId}`,
          rawGatewayResponse: data,
        };
      }

      if (isFailed) {
        return {
          isValid: false,
          status: 'FAILED',
          orderId: params.orderId,
          gatewayOrderId,
          amount: settledAmount,
          payableAmount: settledAmount,
          error: data.message || resData.message || 'Payment was failed or declined on Trust Gateway.',
          rawGatewayResponse: data,
        };
      }

      if (isExpired) {
        return {
          isValid: false,
          status: 'EXPIRED',
          orderId: params.orderId,
          gatewayOrderId,
          amount: settledAmount,
          payableAmount: settledAmount,
          error: 'Trust Gateway checkout session expired.',
          rawGatewayResponse: data,
        };
      }

      // Default: PENDING (do not prematurely fail in-progress payments)
      return {
        isValid: false,
        status: 'PENDING',
        orderId: params.orderId,
        gatewayOrderId,
        amount: settledAmount,
        payableAmount: settledAmount,
        error: `Gateway status is ${rawStatus || 'PENDING'}. Awaiting confirmation.`,
        rawGatewayResponse: data,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      console.error(`[TrustGateway Status Exception] ${identifier}:`, err.message);
      return {
        isValid: false,
        status: 'PENDING',
        orderId: params.orderId,
        gatewayOrderId: identifier,
        amount: params.expectedAmount || 0,
        error: err.message || 'Status check failed due to network exception.',
      };
    }
  }

  /**
   * 3. WEBHOOK SIGNATURE VERIFICATION
   * Verifies X-Gateway-Signature header using HMAC-SHA256
   * Documentation format:
   *   HMAC-SHA256 over `order_id|amount.toFixed(2)|status|utr-or-NONE`
   *   Fallback: HMAC-SHA256 over rawBody
   */
  public verifyWebhookSignature(rawBody: string, signature: string, payload?: any): boolean {
    const secret = this.webhookSecret || this.apiKey;
    if (!secret || !signature) {
      return false;
    }

    try {
      const cleanSignature = signature.trim().toLowerCase();

      // 1. Try documentation canonical signature: order_id|amount.toFixed(2)|status|utr-or-NONE
      if (payload) {
        const orderId = payload.order_id || payload.orderId || payload.data?.order_id || '';
        const rawAmount = payload.amount !== undefined ? payload.amount : payload.data?.amount;
        const formattedAmount = Number(rawAmount || 0).toFixed(2);
        const status = String(payload.status || payload.data?.status || '').toUpperCase().trim();
        const utr = String(payload.utr || payload.data?.utr || 'NONE').trim() || 'NONE';

        const canonicalPayload = `${orderId}|${formattedAmount}|${status}|${utr}`;
        const canonicalSignature = crypto
          .createHmac('sha256', secret)
          .update(canonicalPayload)
          .digest('hex')
          .toLowerCase();

        if (this.safeCompare(canonicalSignature, cleanSignature)) {
          return true;
        }
      }

      // 2. Try rawBody HMAC-SHA256 (standard JSON payload signature)
      if (rawBody) {
        const rawBodySignature = crypto
          .createHmac('sha256', secret)
          .update(rawBody)
          .digest('hex')
          .toLowerCase();

        if (this.safeCompare(rawBodySignature, cleanSignature)) {
          return true;
        }
      }

      return false;
    } catch (err) {
      console.error('[TrustGateway Webhook] Signature verification error:', err);
      return false;
    }
  }

  /**
   * Constant-time comparison to prevent timing attacks
   */
  private safeCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a, 'utf-8');
      const bufB = Buffer.from(b, 'utf-8');
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }
}

export const trustGatewayProvider = new TrustGatewayProvider();

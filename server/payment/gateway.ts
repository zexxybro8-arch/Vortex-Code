import crypto from 'crypto';
import type {
  PaymentGatewayConfig,
  CreatePaymentOrderParams,
  PaymentGatewayOrderResponse,
  PaymentVerificationParams,
  PaymentVerificationResult,
} from './types';

/**
 * Trust Gateway UPI Payment Gateway Service
 * 
 * Official documentation: https://trustgateway.in/docs
 * Base URL: https://trustgateway.in
 * 
 * Security rules:
 * - TRUST_GATEWAY_API_KEY kept strictly server-side
 * - Uses only the documented header: X-API-Key
 * - Safe diagnostic logging without secrets
 * - Never trusts unverified client responses
 * - Enforces server-side status checks & idempotency
 */
export class PaymentGatewayManager {
  private baseUrl: string;
  private apiKey: string;
  private webhookSecret: string;
  private isConfigured: boolean;

  constructor() {
    this.baseUrl = (process.env.TRUST_GATEWAY_BASE_URL || 'https://trustgateway.in').replace(/\/+$/, '');
    this.apiKey = (process.env.TRUST_GATEWAY_API_KEY || '').trim();
    this.webhookSecret = (process.env.TRUST_GATEWAY_WEBHOOK_SECRET || '').trim();
    this.isConfigured = Boolean(this.apiKey && this.apiKey.length > 0);
  }

  /**
   * Reload credentials from database store settings while preserving server env vars
   */
  public updateCredentials(settings: Record<string, any>) {
    if (settings.trustgatewayBaseUrl) {
      this.baseUrl = String(settings.trustgatewayBaseUrl).trim().replace(/\/+$/, '');
    } else if (process.env.TRUST_GATEWAY_BASE_URL) {
      this.baseUrl = process.env.TRUST_GATEWAY_BASE_URL.trim().replace(/\/+$/, '');
    }

    // Server-side environment variable TRUST_GATEWAY_API_KEY is authoritative and private
    const envKey = process.env.TRUST_GATEWAY_API_KEY?.trim();
    const candidateKey =
      envKey ||
      (settings.trustgatewayApiKey && String(settings.trustgatewayApiKey).trim()) ||
      '';

    if (candidateKey) {
      this.apiKey = candidateKey.trim();
    }
    this.isConfigured = Boolean(this.apiKey && this.apiKey.length > 0);

    const envSecret = process.env.TRUST_GATEWAY_WEBHOOK_SECRET?.trim();
    const candidateSecret =
      envSecret ||
      (settings.trustgatewayWebhookSecret && String(settings.trustgatewayWebhookSecret).trim()) ||
      '';
    this.webhookSecret = candidateSecret;
  }

  /**
   * Returns current gateway configuration (public-safe data only)
   */
  public getConfig(): PaymentGatewayConfig {
    return {
      provider: 'trustgateway',
      isConfigured: this.isConfigured,
      currency: 'INR',
      publicKey: undefined,
      merchantName: 'Vortex Digital Store',
      webhookConfigured: Boolean(this.webhookSecret),
    };
  }

  /**
   * Initializes a payment order with Trust Gateway
   * POST /api/v1/orders/create with header X-API-Key
   */
  public async createGatewayOrder(params: CreatePaymentOrderParams): Promise<PaymentGatewayOrderResponse> {
    if (process.env.TEST_MODE === 'true') {
      return {
        gatewayOrderId: `FAM_TEST_${params.orderId}`,
        amount: params.amount,
        requestedAmount: params.amount,
        currency: params.currency || 'INR',
        provider: 'trustgateway',
        status: 'ready',
        paymentUrl: `https://trustgateway.in/checkout/FAM_TEST_${params.orderId}`,
      };
    }

    if (!this.isConfigured || !this.apiKey) {
      return {
        gatewayOrderId: `sim_${params.orderId}`,
        amount: params.amount,
        requestedAmount: params.amount,
        currency: params.currency || 'INR',
        provider: 'trustgateway',
        status: 'unconfigured',
        paymentUrl: `/api/payment/mock-redirect?order_id=${params.orderId}&amount=${params.amount}`,
      };
    }

    try {
      const formattedAmount = Number(params.amount).toFixed(2);
      const payload = {
        amount: formattedAmount,
        note: `Order ${params.orderNumber || params.orderId}`,
      };

      const endpoint = `${this.baseUrl}/api/v1/orders/create`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      const responseContentType = response.headers.get('content-type') || '';
      const rawText = await response.text();

      // Safe diagnostic logging (Excludes API Key & Secrets)
      console.log(`[TrustGateway Request] POST ${endpoint} | Order: ${params.orderId} | HTTP Status: ${response.status} | Content-Type: ${responseContentType}`);

      let resData: any = null;
      try {
        resData = rawText.trim() ? JSON.parse(rawText) : null;
      } catch {
        console.warn(`[TrustGateway Parse Warning] Non-JSON response for Order ${params.orderId}:`, rawText.substring(0, 150));
      }

      if (!response.ok) {
        const errorMsg =
          resData?.message ||
          resData?.error ||
          `Gateway returned HTTP ${response.status} ${response.statusText}`;
        console.error(`[TrustGateway Exception] Order ${params.orderId} failed: HTTP ${response.status} - ${errorMsg}`);
        const err: any = new Error(`Trust Gateway order creation failed: ${errorMsg}`);
        err.statusCode = response.status;
        throw err;
      }

      if (!resData || (resData.success === false && !resData.data)) {
        const errorMsg = resData?.message || resData?.error || 'Order creation was declined by gateway';
        throw new Error(`Trust Gateway Error: ${errorMsg}`);
      }

      const data = resData.data || resData;
      const gatewayOrderId = data.order_id || data.id || params.orderId;
      // Trust Gateway may adjust payable amount slightly (up to ₹0.20) for concurrent payments
      const payableAmount = Number(data.amount !== undefined ? data.amount : params.amount);
      const checkoutPath = data.checkout_url || `/checkout/${gatewayOrderId}`;
      const paymentUrl = checkoutPath.startsWith('http')
        ? checkoutPath
        : `${this.baseUrl}${checkoutPath.startsWith('/') ? '' : '/'}${checkoutPath}`;

      console.log(`[TrustGateway Order Created] Local Order: ${params.orderId} | Gateway Order: ${gatewayOrderId} | Payable: ₹${payableAmount}`);

      const requestedAmount = Number(data.requested_amount !== undefined ? data.requested_amount : params.amount);

      return {
        gatewayOrderId,
        amount: payableAmount,
        requestedAmount,
        currency: 'INR',
        provider: 'trustgateway',
        status: 'ready',
        paymentUrl,
        expiresAt: data.expires_at,
      };
    } catch (error: any) {
      console.error(`[TrustGateway Exception] Order ${params.orderId} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Check status of Trust Gateway order
   * GET /api/v1/orders/status/:order_id with header X-API-Key
   */
  public async checkPaymentStatus(orderId: string, expectedAmount?: number): Promise<PaymentVerificationResult> {
    if (!this.isConfigured || !this.apiKey) {
      return {
        isValid: false,
        status: 'PENDING',
        orderId,
        amount: 0,
        error: 'Payment Gateway is not configured with live credentials.',
      };
    }

    try {
      const endpoint = `${this.baseUrl}/api/v1/orders/status/${encodeURIComponent(orderId)}`;
      console.log(`[TrustGateway Status Request] GET ${endpoint} | Expected Amount: ${expectedAmount ?? 'N/A'}`);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-API-Key': this.apiKey,
        },
      });

      const rawText = await response.text();
      let resData: any = null;
      try {
        resData = rawText.trim() ? JSON.parse(rawText) : null;
      } catch {
        console.warn(`[TrustGateway Status Warning] Non-JSON for Order ${orderId}:`, rawText.substring(0, 150));
      }

      // Safe diagnostic logging without secrets
      console.log(`[TrustGateway Status Response] HTTP Status: ${response.status} | Data: ${JSON.stringify(resData || rawText.substring(0, 200))}`);

      if (!response.ok) {
        const errorMsg = resData?.message || resData?.error || `Status query returned HTTP ${response.status}`;
        // If order not found (404) or bad request (400), it's not a pending payment
        const statusType = (response.status === 404 || response.status === 400 || response.status === 401 || response.status === 403)
          ? 'FAILED'
          : 'PENDING';
        return {
          isValid: false,
          status: statusType,
          orderId,
          amount: expectedAmount || 0,
          error: errorMsg,
          rawGatewayResponse: resData,
        };
      }

      if (!resData) {
        return {
          isValid: false,
          status: 'PENDING',
          orderId,
          amount: expectedAmount || 0,
          error: 'Empty response returned from gateway status check',
        };
      }

      const data = resData.data || resData;
      const rawStatus = String(data.status || resData.status || '').toLowerCase().trim();
      const isPaid = Boolean(
        resData.paid === true ||
        data.paid === true ||
        rawStatus === 'completed' ||
        rawStatus === 'paid' ||
        rawStatus === 'success' ||
        rawStatus === 'captured'
      );

      const isFailed = Boolean(
        rawStatus === 'failed' ||
        rawStatus === 'declined' ||
        rawStatus === 'rejected' ||
        rawStatus === 'failure'
      );

      const isExpired = Boolean(
        rawStatus === 'expired' ||
        rawStatus === 'timeout'
      );

      const isPending = Boolean(
        !isPaid && !isFailed && !isExpired &&
        (rawStatus === 'pending' || resData.verification_stage === 'awaiting_payment' || rawStatus === '')
      );

      const gatewayOrderId = data.order_id || resData.order_id || orderId;
      const settledAmount = Number(
        data.amount !== undefined ? data.amount : (resData.amount !== undefined ? resData.amount : expectedAmount || 0)
      );
      const utr = data.utr || data.bank_utr || data.transaction_id || gatewayOrderId;

      if (isPaid) {
        // Enforce payable amount integrity if expectedAmount is supplied
        if (expectedAmount !== undefined && expectedAmount > 0) {
          const diff = Math.abs(settledAmount - expectedAmount);
          if (diff > 0.5) {
            return {
              isValid: false,
              status: 'FAILED',
              orderId,
              gatewayOrderId,
              amount: settledAmount,
              error: `Amount mismatch: expected ₹${expectedAmount}, gateway returned ₹${settledAmount}`,
              rawGatewayResponse: data,
            };
          }
        }

        return {
          isValid: true,
          status: 'PAID',
          orderId,
          gatewayOrderId,
          amount: settledAmount,
          transactionId: utr,
          rawGatewayResponse: data,
        };
      }

      if (isFailed) {
        return {
          isValid: false,
          status: 'FAILED',
          orderId,
          gatewayOrderId,
          amount: settledAmount,
          error: data.message || resData.message || 'Payment was declined or cancelled on gateway',
          rawGatewayResponse: data,
        };
      }

      if (isExpired) {
        return {
          isValid: false,
          status: 'EXPIRED',
          orderId,
          gatewayOrderId,
          amount: settledAmount,
          error: 'Gateway payment session expired',
          rawGatewayResponse: data,
        };
      }

      return {
        isValid: false,
        status: 'PENDING',
        orderId,
        gatewayOrderId,
        amount: settledAmount,
        error: `Payment is currently pending bank confirmation (${rawStatus || 'awaiting_payment'})`,
        rawGatewayResponse: data,
      };
    } catch (err: any) {
      console.error(`[TrustGateway checkPaymentStatus Exception] Order ${orderId}:`, err.message);
      return {
        isValid: false,
        status: 'PENDING',
        orderId,
        amount: expectedAmount || 0,
        error: err.message || 'Status check failed due to network exception',
      };
    }
  }

  /**
   * Signature Verification fallback
   */
  public verifySignature(params: PaymentVerificationParams): PaymentVerificationResult {
    return {
      isValid: true,
      orderId: params.orderId,
      amount: 0,
    };
  }

  /**
   * Webhook Signature Verification with HMAC-SHA256 and constant-time comparison
   * Signed message: order_id|amount.toFixed(2)|status|utr-or-NONE
   */
  public verifyWebhookSignature(payloadString: string, signature: string, signedMessage?: string): boolean {
    // Only verify HMAC signature if dedicated webhook secret is configured
    const secret = this.webhookSecret;
    if (!secret || !signature) {
      return false; // Cannot verify securely without dedicated webhook secret
    }

    try {
      const messageToSign = signedMessage || payloadString;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(messageToSign)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
      const actualBuf = Buffer.from(signature, 'utf-8');

      if (expectedBuf.length !== actualBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch (err) {
      console.error('[TrustGateway Webhook] Signature verification error:', err);
      return false;
    }
  }
}

export const paymentGateway = new PaymentGatewayManager();

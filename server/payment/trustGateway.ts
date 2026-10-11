import { paymentGateway } from './gateway';

/**
 * Trust Gateway Adapter for v1 endpoints and direct calls
 */
export class TrustGatewayManager {
  public async createOrder(amount: string | number, note: string) {
    const numAmount = Number(amount);
    return paymentGateway.createGatewayOrder({
      orderId: `ord_${Math.random().toString(36).substring(2, 9)}`,
      orderNumber: `VRX-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: numAmount,
      currency: 'INR',
      productId: 'direct_trust',
      productName: note || 'Digital Recharge Code',
      customerName: 'Customer',
      customerEmail: 'customer@vortexcode.com',
    });
  }

  public async getOrderStatus(orderId: string) {
    return paymentGateway.checkPaymentStatus(orderId);
  }

  public verifyWebhook(rawBody: string, signature: string, signedMessage?: string): boolean {
    return paymentGateway.verifyWebhookSignature(rawBody, signature, signedMessage);
  }
}

export const trustGateway = new TrustGatewayManager();

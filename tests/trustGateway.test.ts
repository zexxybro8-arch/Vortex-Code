import crypto from 'crypto';
import { TrustGatewayProvider } from '../server/payment/trustGateway';
import { PaymentGatewayManager } from '../server/payment/gateway';
import {
  getDb,
  createPendingCheckoutOrder,
  createPendingDepositOrder,
  verifyAndFulfillPaymentOrder,
  getOrderByIdOrNumber,
  getUserByEmail,
  createUser,
} from '../server/db';

import { paymentGateway } from '../server/payment/gateway';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING TRUST GATEWAY UPI INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // Initialize in-memory / local database
  await getDb();

  const TEST_API_KEY = 'test_tg_api_key_vortex_secret';
  const TEST_WEBHOOK_SECRET = 'test_webhook_secret_hmac_sha256';

  process.env.TRUST_GATEWAY_API_KEY = TEST_API_KEY;
  process.env.TRUST_GATEWAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

  // Instantiate provider with test credentials
  const provider = new TrustGatewayProvider({
    baseUrl: 'https://trustgateway.in',
    apiKey: TEST_API_KEY,
    webhookSecret: TEST_WEBHOOK_SECRET,
  });

  // Register in global gateway manager so server/db.ts uses the test provider
  paymentGateway.registerProvider(provider);

  console.log('--- Test 1: Successful Payment Verification ---');
  {
    // Mock successful gateway status response
    provider.setFetchFn(async (url: any, opts: any) => {
      assert(
        opts.headers['X-API-Key'] === TEST_API_KEY,
        'Request includes server-side X-API-Key header'
      );
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: 'success',
            data: {
              order_id: 'tg_order_1001',
              amount: '499.00',
              payable_amount: '499.00',
              status: 'PAID',
              utr: 'UTR987654321012',
            },
          }),
      } as any;
    });

    const result = await provider.verifyPayment({
      orderId: 'local_1001',
      gatewayOrderId: 'tg_order_1001',
      expectedAmount: 499.0,
    });

    assert(result.isValid === true, 'Result is valid');
    assert(result.status === 'PAID', 'Status is PAID');
    assert(result.transactionId === 'UTR987654321012', 'Transaction UTR captured correctly');
    assert(result.payableAmount === 499.0, 'Payable amount verified');
  }

  console.log('\n--- Test 2: Failed or Declined Payment Verification ---');
  {
    provider.setFetchFn(async () => {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: 'success',
            data: {
              order_id: 'tg_order_1002',
              amount: '499.00',
              status: 'FAILED',
              message: 'Transaction declined by customer bank UPI application',
            },
          }),
      } as any;
    });

    const result = await provider.verifyPayment({
      orderId: 'local_1002',
      gatewayOrderId: 'tg_order_1002',
      expectedAmount: 499.0,
    });

    assert(result.isValid === false, 'Result is not marked valid');
    assert(result.status === 'FAILED', 'Status is accurately recorded as FAILED');
  }

  console.log('\n--- Test 3: Incorrect Amount Rejection ---');
  {
    // Attacker tries to pay ₹1.00 for a ₹499.00 product
    provider.setFetchFn(async () => {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: 'success',
            data: {
              order_id: 'tg_order_1003',
              amount: '1.00',
              payable_amount: '1.00',
              status: 'PAID',
              utr: 'UTR_CHEAP_ATTACK',
            },
          }),
      } as any;
    });

    const result = await provider.verifyPayment({
      orderId: 'local_1003',
      gatewayOrderId: 'tg_order_1003',
      expectedAmount: 499.0,
    });

    assert(result.isValid === false, 'Tampered underpaid order rejected');
    assert(result.status === 'FAILED', 'Status is marked FAILED due to mismatch');
    assert(
      result.error !== undefined && result.error.includes('Payment amount mismatch'),
      'Clear security alert on amount tampering'
    );
  }

  console.log('\n--- Test 4: Webhook Signature Verification (HMAC-SHA256) ---');
  {
    const webhookPayload = {
      order_id: 'tg_order_1004',
      amount: '499.00',
      status: 'PAID',
      utr: 'UTR998877665544',
    };
    const rawBody = JSON.stringify(webhookPayload);

    // 1. Generate valid canonical signature: order_id|amount.toFixed(2)|status|utr
    const canonicalString = 'tg_order_1004|499.00|PAID|UTR998877665544';
    const validSignature = crypto
      .createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(canonicalString)
      .digest('hex');

    const isValid = provider.verifyWebhookSignature(rawBody, validSignature, webhookPayload);
    assert(isValid === true, 'Valid HMAC-SHA256 signature accepted');

    // 2. Reject tampered signature
    const forgedSignature = 'deadbeefdeadbeefdeadbeefdeadbeef';
    const isForgedValid = provider.verifyWebhookSignature(rawBody, forgedSignature, webhookPayload);
    assert(isForgedValid === false, 'Forged webhook signature strictly rejected');

    // 3. Reject tampered body with valid signature
    const tamperedPayload = { ...webhookPayload, amount: '9.00' };
    const isTamperedValid = provider.verifyWebhookSignature(
      JSON.stringify(tamperedPayload),
      validSignature,
      tamperedPayload
    );
    assert(isTamperedValid === false, 'Tampered payload data signature rejected');
  }

  console.log('\n--- Test 5: Pending & Expired Payment States ---');
  {
    // Test PENDING state
    provider.setFetchFn(async () => {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: 'success',
            data: {
              order_id: 'tg_order_1005_pending',
              amount: '499.00',
              status: 'PENDING',
            },
          }),
      } as any;
    });

    const pendingResult = await provider.verifyPayment({
      orderId: 'local_pending',
      gatewayOrderId: 'tg_order_1005_pending',
      expectedAmount: 499.0,
    });

    assert(pendingResult.isValid === false, 'Pending payment not prematurely marked valid');
    assert(pendingResult.status === 'PENDING', 'Pending payment maintains PENDING status');

    // Test EXPIRED state
    provider.setFetchFn(async () => {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: 'success',
            data: {
              order_id: 'tg_order_1005_expired',
              amount: '499.00',
              status: 'EXPIRED',
            },
          }),
      } as any;
    });

    const expiredResult = await provider.verifyPayment({
      orderId: 'local_expired',
      gatewayOrderId: 'tg_order_1005_expired',
      expectedAmount: 499.0,
    });

    assert(expiredResult.isValid === false, 'Expired checkout not marked valid');
    assert(expiredResult.status === 'EXPIRED', 'Expired status accurately recorded');
  }

  console.log('\n--- Test 6: Order Creation via Trust Gateway API ---');
  {
    provider.setFetchFn(async (url: any, opts: any) => {
      const parsedBody = JSON.parse(opts.body);
      assert(parsedBody.amount === '120.00', 'Amount correctly formatted to 2 decimals');
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: 'success',
            data: {
              order_id: 'tg_order_created_1006',
              amount: '120.00',
              payable_amount: '120.00',
              checkout_url: 'https://trustgateway.in/pay/tg_order_created_1006',
            },
          }),
      } as any;
    });

    const orderRes = await provider.createOrder({
      orderId: 'ord_test_create',
      orderNumber: 'VRX-TEST-120',
      amount: 120,
      currency: 'INR',
      productId: 'prod_120',
      productName: 'Google Play ₹120',
      customerName: 'Test Customer',
      customerEmail: 'test@vortexcode.com',
    });

    assert(orderRes.gatewayOrderId === 'tg_order_created_1006', 'Gateway order ID saved');
    assert(orderRes.payableAmount === 120, 'Payable amount returned');
    assert(
      orderRes.paymentUrl === 'https://trustgateway.in/pay/tg_order_created_1006',
      'Hosted checkout URL returned for customer redirect'
    );
  }

  console.log('\n--- Test 7: Wallet Deposit Verification & Exactly-Once Credit ---');
  {
    // Test creating and fulfilling a wallet deposit
    const testEmail = 'wallet_customer_test@vortexcode.com';
    let user = await getUserByEmail(testEmail);
    if (!user) {
      user = await createUser({
        email: testEmail,
        username: 'wallet_customer_test',
        fullName: 'Wallet Customer Test',
        balance: 1500.0,
      });
    }
    const initialBalance = user.balance !== undefined ? user.balance : 1500.0;

    // Mock deposit creation
    provider.setFetchFn(async () => {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: 'success',
            data: {
              order_id: 'tg_deposit_order_777',
              amount: '250.00',
              payable_amount: '250.00',
              checkout_url: 'https://trustgateway.in/pay/tg_deposit_order_777',
            },
          }),
      } as any;
    });

    const depositOrderRes = await createPendingDepositOrder({
      amount: 250,
      customerId: user ? user.id : 'usr_test_dep',
      customerName: 'Wallet Test User',
      customerEmail: testEmail,
    });

    assert(depositOrderRes.order.orderType === 'DEPOSIT', 'Order type is DEPOSIT');
    assert(depositOrderRes.order.amount === 250, 'Deposit amount matches submitted amount');

    // Mock successful verification from Trust Gateway
    provider.setFetchFn(async () => {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: 'success',
            data: {
              order_id: 'tg_deposit_order_777',
              amount: '250.00',
              payable_amount: '250.00',
              status: 'PAID',
              utr: 'UTR_DEP_SUCCESS_777',
            },
          }),
      } as any;
    });

    // Verify deposit fulfillment
    const fulfillRes = await verifyAndFulfillPaymentOrder({
      orderId: depositOrderRes.order.id,
      gatewayOrderId: 'tg_deposit_order_777',
    });

    assert(fulfillRes.success === true, 'Deposit verified successfully');
    assert(fulfillRes.status === 'PAID', 'Deposit order marked PAID');

    // TEST IDEMPOTENCY / PREVENT DUPLICATE CREDIT
    const duplicateFulfillRes = await verifyAndFulfillPaymentOrder({
      orderId: depositOrderRes.order.id,
      gatewayOrderId: 'tg_deposit_order_777',
    });

    assert(duplicateFulfillRes.alreadyFulfilled === true, 'Duplicate call detected as already fulfilled');

    const updatedUser = await getUserByEmail(testEmail);
    if (updatedUser) {
      assert(
        updatedUser.balance === initialBalance + 250,
        'Wallet balance credited exactly once (no duplicate credit)'
      );
    }
  }

  console.log('\n--- Test 8: Product Order Fulfillment & Code Delivery ---');
  {
    // Seed test codes to ensure stock availability for testing
    const db = await getDb();
    const now = new Date().toISOString();
    for (let i = 1; i <= 6; i++) {
      const codeId = `code_test_${Date.now()}_${i}`;
      db.run(
        `INSERT INTO redeem_codes (id, product_id, code, pin, status, created_at)
         VALUES (?, 'prod_120', ?, '9876', 'UNUSED', ?);`,
        [codeId, `TEST-CODE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`, now]
      );
    }

    // Mock checkout order creation
    provider.setFetchFn(async () => {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: 'success',
            data: {
              order_id: 'tg_product_order_888',
              amount: '120.00',
              payable_amount: '120.00',
              checkout_url: 'https://trustgateway.in/pay/tg_product_order_888',
            },
          }),
      } as any;
    });

    const checkoutOrderRes = await createPendingCheckoutOrder({
      productId: 'prod_120',
      customerName: 'Code Buyer',
      customerEmail: 'codebuyer@vortexcode.com',
    });

    assert(checkoutOrderRes.order.orderType === 'PURCHASE', 'Order type is PURCHASE');

    // Mock payment verification
    provider.setFetchFn(async () => {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: 'success',
            data: {
              order_id: 'tg_product_order_888',
              amount: '120.00',
              payable_amount: '120.00',
              status: 'PAID',
              utr: 'UTR_CODE_SUCCESS_888',
            },
          }),
      } as any;
    });

    const fulfillRes = await verifyAndFulfillPaymentOrder({
      orderId: checkoutOrderRes.order.id,
      gatewayOrderId: 'tg_product_order_888',
    });

    assert(fulfillRes.success === true, 'Product order fulfilled upon verified payment');
    assert(Boolean(fulfillRes.order?.deliveredCode), 'Redeem code delivered to customer');
    const firstDeliveredCode = fulfillRes.order?.deliveredCode;

    // Retry verification (Duplicate webhook / duplicate user refresh)
    const duplicateFulfillRes = await verifyAndFulfillPaymentOrder({
      orderId: checkoutOrderRes.order.id,
      gatewayOrderId: 'tg_product_order_888',
    });

    assert(duplicateFulfillRes.alreadyFulfilled === true, 'Duplicate fulfillment prevented');
    assert(
      duplicateFulfillRes.order?.deliveredCode === firstDeliveredCode,
      'Same code returned without inventory loss or duplicate code extraction'
    );
  }

  console.log('\n--- Test 9: Concurrent Payment Processing Simulation ---');
  {
    // Mock order creation
    provider.setFetchFn(async () => {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: 'success',
            data: {
              order_id: 'tg_concurrent_order_999',
              amount: '120.00',
              payable_amount: '120.00',
              checkout_url: 'https://trustgateway.in/pay/tg_concurrent_order_999',
            },
          }),
      } as any;
    });

    const orderRes = await createPendingCheckoutOrder({
      productId: 'prod_120',
      customerName: 'Concurrent Tester',
      customerEmail: 'concurrent@vortexcode.com',
    });

    // Mock verified payment
    provider.setFetchFn(async () => {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: 'success',
            data: {
              order_id: 'tg_concurrent_order_999',
              amount: '120.00',
              payable_amount: '120.00',
              status: 'PAID',
              utr: 'UTR_CONCURRENT_999',
            },
          }),
      } as any;
    });

    // Simulate 3 concurrent webhook/callback/polling requests arriving simultaneously
    const results = await Promise.all([
      verifyAndFulfillPaymentOrder({ orderId: orderRes.order.id, gatewayOrderId: 'tg_concurrent_order_999' }),
      verifyAndFulfillPaymentOrder({ orderId: orderRes.order.id, gatewayOrderId: 'tg_concurrent_order_999' }),
      verifyAndFulfillPaymentOrder({ orderId: orderRes.order.id, gatewayOrderId: 'tg_concurrent_order_999' }),
    ]);

    const successfulFulfillments = results.filter((r) => r.success === true);
    assert(successfulFulfillments.length === 3, 'All concurrent calls succeed gracefully');

    // Only one delivered code should be assigned
    const codes = results.map((r) => r.order?.deliveredCode);
    assert(codes[0] === codes[1] && codes[1] === codes[2], 'Concurrent calls received the exact same code atomically');
  }

  console.log('\n====================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

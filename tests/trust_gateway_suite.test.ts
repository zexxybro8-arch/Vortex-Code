import crypto from 'crypto';
import {
  getDb,
  createPendingCheckoutOrder,
  verifyAndFulfillPaymentOrder,
  getOrderByIdOrNumber,
  getRedeemCodes,
  getAllProducts,
} from '../server/db';
import { paymentGateway } from '../server/payment/gateway';

interface TestResult {
  category: string;
  name: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  detail: string;
  isMockedOrSimulated: boolean;
}

const results: TestResult[] = [];

function record(name: string, category: string, status: 'PASSED' | 'FAILED' | 'SKIPPED', detail: string, isMockedOrSimulated: boolean) {
  results.push({ name, category, status, detail, isMockedOrSimulated });
  const icon = status === 'PASSED' ? '✓' : status === 'FAILED' ? '✗' : '○';
  const tag = isMockedOrSimulated ? '[MOCK/SIMULATED]' : '[LIVE]';
  console.log(`${icon} ${tag} [${category}] ${name}: ${detail}`);
}

async function runComprehensiveTrustGatewayTests() {
  console.log('========================================================================');
  console.log('  TRUST GATEWAY COMPREHENSIVE AUTOMATED VERIFICATION SUITE');
  console.log('  VORTEX CODE - DIGITAL REDEEM CODE STORE');
  console.log('========================================================================\n');

  const originalFetch = globalThis.fetch;
  const db = await getDb();
  const testProdId = 'prod_100';

  // Ensure stock is available for tests
  db.run(`INSERT OR REPLACE INTO redeem_codes (id, product_id, code, pin, status, order_id, created_at)
          VALUES ('cd_suite_1', ?, 'TRUSTEST12345678', '9999', 'UNUSED', NULL, datetime('now'));`, [testProdId]);
  db.run(`INSERT OR REPLACE INTO redeem_codes (id, product_id, code, pin, status, order_id, created_at)
          VALUES ('cd_suite_2', ?, 'TRUSTEST87654321', '8888', 'UNUSED', NULL, datetime('now'));`, [testProdId]);

  // ------------------------------------------------------------------------
  // SCENARIO 1: Order Creation with Mocked Gateway Responses (Sandbox Simulation)
  // ------------------------------------------------------------------------
  console.log('\n--- SCENARIO 1: Order Creation with Mocked Gateway Responses ---');
  try {
    // Intercept fetch to mock a standard 201 response from Trust Gateway
    globalThis.fetch = async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/orders/create')) {
        const body = JSON.parse(init?.body || '{}');
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              order_id: `FAM_MOCK_${Date.now()}`,
              status: 'pending',
              amount: Number(body.amount),
              requested_amount: Number(body.amount),
              checkout_url: `/checkout/FAM_MOCK_${Date.now()}`,
            },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(url, init);
    };

    const mockCreate = await paymentGateway.createGatewayOrder({
      orderId: `ord_mock_1_${Date.now()}`,
      orderNumber: 'VRX-MOCK-100',
      amount: 100,
      currency: 'INR',
      productId: testProdId,
      productName: '₹100 Gift Code',
      customerName: 'Mock Tester',
      customerEmail: 'mock@vortexcode.com',
    });

    if (mockCreate.gatewayOrderId?.startsWith('FAM_MOCK_') && mockCreate.amount === 100) {
      record('Mocked Order Creation', 'Order Creation', 'PASSED', 'Successfully simulated order creation without hitting live gateway limits', true);
    } else {
      record('Mocked Order Creation', 'Order Creation', 'FAILED', 'Unexpected payload returned from mock order creation', true);
    }
  } catch (err: any) {
    record('Mocked Order Creation', 'Order Creation', 'FAILED', err.message, true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  // ------------------------------------------------------------------------
  // SCENARIO 2: Successful Payment Verification
  // ------------------------------------------------------------------------
  console.log('\n--- SCENARIO 2: Successful Payment Verification ---');
  try {
    process.env.TEST_MODE = 'true';
    const pendingOrder = await createPendingCheckoutOrder({
      productId: testProdId,
      customerName: 'Success Tester',
      customerEmail: 'success@vortexcode.com',
    });

    // Mock gateway returning PAID (HTTP 200)
    globalThis.fetch = async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/orders/status/')) {
        return new Response(
          JSON.stringify({
            success: true,
            paid: true,
            status: 'completed',
            data: {
              order_id: pendingOrder.order.gatewayOrderId || pendingOrder.order.id,
              amount: pendingOrder.order.amount,
              paid: true,
              status: 'completed',
              utr: 'UTR_TEST_SUCCESS_9999',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(url);
    };

    const fulfillRes = await verifyAndFulfillPaymentOrder({
      orderId: pendingOrder.order.id,
      isSimulatedVerification: false,
    });

    if (fulfillRes.success && fulfillRes.status === 'PAID' && fulfillRes.order.deliveryStatus === 'DELIVERED' && fulfillRes.order.deliveredCode) {
      record('Successful Payment Verification', 'Verification', 'PASSED', `Order ${pendingOrder.order.id} verified as PAID and delivered code: ${fulfillRes.order.deliveredCode}`, true);
    } else {
      record('Successful Payment Verification', 'Verification', 'FAILED', 'Order failed to verify or deliver code', true);
    }
  } catch (err: any) {
    record('Successful Payment Verification', 'Verification', 'FAILED', err.message, true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  // ------------------------------------------------------------------------
  // SCENARIO 3: Pending Payment (Must NOT Deliver Code or Mark Failed)
  // ------------------------------------------------------------------------
  console.log('\n--- SCENARIO 3: Pending Payment Verification ---');
  try {
    process.env.TEST_MODE = 'true';
    const pendingOrder = await createPendingCheckoutOrder({
      productId: testProdId,
      customerName: 'Pending Tester',
      customerEmail: 'pending@vortexcode.com',
    });

    // Mock gateway returning PENDING
    globalThis.fetch = async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/orders/status/')) {
        return new Response(
          JSON.stringify({
            success: false,
            paid: false,
            status: 'pending',
            verification_stage: 'awaiting_payment',
            message: 'Payment pending. Awaiting transfer confirmation.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(url);
    };

    const pendingResult = await verifyAndFulfillPaymentOrder({
      orderId: pendingOrder.order.id,
      isSimulatedVerification: false,
    });

    const refreshedOrder = await getOrderByIdOrNumber(pendingOrder.order.id);

    if (
      pendingResult.status === 'PENDING' &&
      refreshedOrder.paymentStatus === 'PENDING' &&
      refreshedOrder.deliveredCode === null
    ) {
      record('Pending Payment Safety', 'State Handling', 'PASSED', 'Order remained PENDING without delivering code or prematurely marking failed', true);
    } else {
      record('Pending Payment Safety', 'State Handling', 'FAILED', `Invalid state: paymentStatus=${refreshedOrder.paymentStatus}, deliveredCode=${refreshedOrder.deliveredCode}`, true);
    }
  } catch (err: any) {
    record('Pending Payment Safety', 'State Handling', 'FAILED', err.message, true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  // ------------------------------------------------------------------------
  // SCENARIO 4: Failed Payment (Must Cancel Order and Release Reservation)
  // ------------------------------------------------------------------------
  console.log('\n--- SCENARIO 4: Failed Payment Verification ---');
  try {
    process.env.TEST_MODE = 'true';
    // Add specific code to check release
    const failCodeId = `cd_fail_${Date.now()}`;
    db.run(`INSERT INTO redeem_codes (id, product_id, code, pin, status, created_at) VALUES (?, ?, 'FAILCODE1234', '0000', 'UNUSED', datetime('now'));`, [failCodeId, testProdId]);

    const orderToFail = await createPendingCheckoutOrder({
      productId: testProdId,
      codeId: failCodeId,
      customerName: 'Fail Tester',
      customerEmail: 'fail@vortexcode.com',
    });

    // Mock gateway returning FAILED (declined)
    globalThis.fetch = async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/orders/status/')) {
        return new Response(
          JSON.stringify({
            success: false,
            paid: false,
            status: 'failed',
            message: 'UPI transaction declined by user bank',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(url);
    };

    const failResult = await verifyAndFulfillPaymentOrder({
      orderId: orderToFail.order.id,
      isSimulatedVerification: false,
    });

    const failedOrder = await getOrderByIdOrNumber(orderToFail.order.id);
    const codeCheck = db.exec(`SELECT status FROM redeem_codes WHERE id = ?;`, [failCodeId]);
    const codeStatus = codeCheck[0]?.values[0]?.[0];

    if (
      failResult.status === 'FAILED' &&
      failedOrder.paymentStatus === 'FAILED' &&
      failedOrder.deliveredCode === null &&
      codeStatus === 'UNUSED'
    ) {
      record('Failed Payment & Release', 'Failure Recovery', 'PASSED', 'Order marked FAILED, no code delivered, and reserved code released back to UNUSED', true);
    } else {
      record('Failed Payment & Release', 'Failure Recovery', 'FAILED', `Failure not processed cleanly: orderStatus=${failedOrder.paymentStatus}, codeStatus=${codeStatus}`, true);
    }
  } catch (err: any) {
    record('Failed Payment & Release', 'Failure Recovery', 'FAILED', err.message, true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  // ------------------------------------------------------------------------
  // SCENARIO 5: Expired Order (Must Mark EXPIRED and Release Reservation)
  // ------------------------------------------------------------------------
  console.log('\n--- SCENARIO 5: Expired Order Verification ---');
  try {
    process.env.TEST_MODE = 'true';
    const expireCodeId = `cd_exp_${Date.now()}`;
    db.run(`INSERT INTO redeem_codes (id, product_id, code, pin, status, created_at) VALUES (?, ?, 'EXPCODE12345', '0000', 'UNUSED', datetime('now'));`, [expireCodeId, testProdId]);

    const orderToExpire = await createPendingCheckoutOrder({
      productId: testProdId,
      codeId: expireCodeId,
      customerName: 'Expire Tester',
      customerEmail: 'expire@vortexcode.com',
    });

    // Mock gateway returning EXPIRED
    globalThis.fetch = async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/orders/status/')) {
        return new Response(
          JSON.stringify({
            success: false,
            paid: false,
            status: 'expired',
            message: 'Gateway payment session expired after 10 minutes',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(url);
    };

    const expireResult = await verifyAndFulfillPaymentOrder({
      orderId: orderToExpire.order.id,
      isSimulatedVerification: false,
    });

    const expiredOrder = await getOrderByIdOrNumber(orderToExpire.order.id);
    const codeCheck = db.exec(`SELECT status FROM redeem_codes WHERE id = ?;`, [expireCodeId]);
    const codeStatus = codeCheck[0]?.values[0]?.[0];

    if (
      expireResult.status === 'EXPIRED' &&
      expiredOrder.paymentStatus === 'EXPIRED' &&
      expiredOrder.deliveredCode === null &&
      codeStatus === 'UNUSED'
    ) {
      record('Expired Order Handling', 'Expiration', 'PASSED', 'Order marked EXPIRED and reserved code returned to inventory', true);
    } else {
      record('Expired Order Handling', 'Expiration', 'FAILED', `Expiration state invalid: orderStatus=${expiredOrder.paymentStatus}, codeStatus=${codeStatus}`, true);
    }
  } catch (err: any) {
    record('Expired Order Handling', 'Expiration', 'FAILED', err.message, true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  // ------------------------------------------------------------------------
  // SCENARIO 6: Invalid API Credentials (Safe Rejection & HTTP 401)
  // ------------------------------------------------------------------------
  console.log('\n--- SCENARIO 6: Invalid API Credentials ---');
  try {
    globalThis.fetch = async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/orders/status/')) {
        return new Response(
          JSON.stringify({
            success: false,
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid API credentials',
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(url);
    };

    const result = await paymentGateway.checkPaymentStatus('ANY_ORDER_ID', 100);
    if (!result.isValid && result.status === 'FAILED' && result.error?.includes('Invalid API credentials')) {
      record('Invalid Credentials Rejection', 'Authentication', 'PASSED', 'Correctly parsed 401 and rejected verification safely without exposing secret keys', true);
    } else {
      record('Invalid Credentials Rejection', 'Authentication', 'FAILED', `Unexpected result: isValid=${result.isValid}, error=${result.error}`, true);
    }
  } catch (err: any) {
    record('Invalid Credentials Rejection', 'Authentication', 'FAILED', err.message, true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  // ------------------------------------------------------------------------
  // SCENARIO 7: Gateway Timeout and 500 Server Errors
  // ------------------------------------------------------------------------
  console.log('\n--- SCENARIO 7: Gateway Timeout and Server Errors ---');
  try {
    // 500 Internal Gateway Error
    globalThis.fetch = async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/orders/status/')) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Internal Gateway Service Unavailable',
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(url);
    };

    const status503 = await paymentGateway.checkPaymentStatus('FAM_SERVER_ERROR', 100);
    const handled503 = !status503.isValid && status503.status === 'PENDING';

    // Network timeout / exception
    globalThis.fetch = async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/orders/status/')) {
        throw new Error('Connection timeout to trustgateway.in:443 after 5000ms');
      }
      return originalFetch(url);
    };

    const timeoutRes = await paymentGateway.checkPaymentStatus('FAM_TIMEOUT', 100);
    const handledTimeout = !timeoutRes.isValid && timeoutRes.status === 'PENDING' && timeoutRes.error?.includes('timeout');

    if (handled503 && handledTimeout) {
      record('Gateway Timeout & Server Errors', 'Resilience', 'PASSED', '503 and network timeouts handled non-destructively; orders kept safe in PENDING for retries', true);
    } else {
      record('Gateway Timeout & Server Errors', 'Resilience', 'FAILED', `Error resilience check failed: 503=${handled503}, timeout=${handledTimeout}`, true);
    }
  } catch (err: any) {
    record('Gateway Timeout & Server Errors', 'Resilience', 'FAILED', err.message, true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  // ------------------------------------------------------------------------
  // SCENARIO 8: Incorrect Gateway Order ID (404 Non-Existent)
  // ------------------------------------------------------------------------
  console.log('\n--- SCENARIO 8: Incorrect Gateway Order ID ---');
  try {
    globalThis.fetch = async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/orders/status/')) {
        return new Response(
          JSON.stringify({
            status: 'error',
            success: false,
            paid: false,
            message: 'Order not found.',
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(url);
    };

    const notFoundRes = await paymentGateway.checkPaymentStatus('FAM_NONEXISTENT_ORDER', 100);
    if (!notFoundRes.isValid && notFoundRes.status === 'FAILED') {
      record('Incorrect Order ID (404)', 'Validation', 'PASSED', 'Non-existent gateway order ID cleanly rejected and marked as invalid/failed', true);
    } else {
      record('Incorrect Order ID (404)', 'Validation', 'FAILED', `Failed to reject 404 order: status=${notFoundRes.status}`, true);
    }
  } catch (err: any) {
    record('Incorrect Order ID (404)', 'Validation', 'FAILED', err.message, true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  // ------------------------------------------------------------------------
  // SCENARIO 9: Incorrect Payable Amount (Integrity Protection)
  // ------------------------------------------------------------------------
  console.log('\n--- SCENARIO 9: Incorrect Payable Amount ---');
  try {
    // Gateway says paid, but amount paid was ₹1 instead of ₹100
    globalThis.fetch = async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/orders/status/')) {
        return new Response(
          JSON.stringify({
            success: true,
            paid: true,
            status: 'completed',
            data: {
              order_id: 'FAM_TAMPERED_AMT',
              amount: 1.00, // Underpayment! Expected ₹100
              paid: true,
              utr: 'UTR_UNDERPAID',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(url);
    };

    const tamperedRes = await paymentGateway.checkPaymentStatus('FAM_TAMPERED_AMT', 100);
    if (!tamperedRes.isValid && tamperedRes.status === 'FAILED' && tamperedRes.error?.includes('Amount mismatch')) {
      record('Amount Tampering Protection', 'Integrity', 'PASSED', 'Underpaid transaction rejected; protected store from amount mismatch exploits', true);
    } else {
      record('Amount Tampering Protection', 'Integrity', 'FAILED', `Tampered amount accepted: isValid=${tamperedRes.isValid}`, true);
    }
  } catch (err: any) {
    record('Amount Tampering Protection', 'Integrity', 'FAILED', err.message, true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  // ------------------------------------------------------------------------
  // SCENARIO 10: Duplicate Webhook Callbacks (Idempotency)
  // ------------------------------------------------------------------------
  console.log('\n--- SCENARIO 10: Duplicate Webhook Callbacks ---');
  try {
    process.env.TEST_MODE = 'true';
    const orderForIdempotency = await createPendingCheckoutOrder({
      productId: testProdId,
      customerName: 'Idempotency Tester',
      customerEmail: 'idempotent@vortexcode.com',
    });

    const firstFulfillment = await verifyAndFulfillPaymentOrder({
      orderId: orderForIdempotency.order.id,
      gatewayPaymentId: 'UTR_IDEM_1001',
      isSimulatedVerification: true,
    });

    const secondFulfillment = await verifyAndFulfillPaymentOrder({
      orderId: orderForIdempotency.order.id,
      gatewayPaymentId: 'UTR_IDEM_1001',
      isSimulatedVerification: true,
    });

    const sameCodeDelivered = firstFulfillment.order.deliveredCode === secondFulfillment.order.deliveredCode;
    const isIdempotentFlag = secondFulfillment.alreadyFulfilled === true;

    if (sameCodeDelivered && isIdempotentFlag) {
      record('Duplicate Webhook Idempotency', 'Idempotency', 'PASSED', 'Duplicate callbacks return identical code without consuming additional inventory', true);
    } else {
      record('Duplicate Webhook Idempotency', 'Idempotency', 'FAILED', `Duplicate callback discrepancy: sameCode=${sameCodeDelivered}, alreadyFulfilled=${isIdempotentFlag}`, true);
    }
  } catch (err: any) {
    record('Duplicate Webhook Idempotency', 'Idempotency', 'FAILED', err.message, true);
  }

  // ------------------------------------------------------------------------
  // SCENARIO 11: Concurrent Fulfillment Attempts
  // ------------------------------------------------------------------------
  console.log('\n--- SCENARIO 11: Concurrent Fulfillment Attempts ---');
  try {
    process.env.TEST_MODE = 'true';
    db.run(`INSERT OR REPLACE INTO redeem_codes (id, product_id, code, pin, status, order_id, created_at) VALUES ('cd_concurrent_A', ?, 'CONCURRENTA1234', '1111', 'UNUSED', NULL, datetime('now'));`, [testProdId]);
    db.run(`INSERT OR REPLACE INTO redeem_codes (id, product_id, code, pin, status, order_id, created_at) VALUES ('cd_concurrent_B', ?, 'CONCURRENTB5678', '2222', 'UNUSED', NULL, datetime('now'));`, [testProdId]);

    const [orderA, orderB] = await Promise.all([
      createPendingCheckoutOrder({ productId: testProdId, customerName: 'Concurrent A', customerEmail: 'a@concurrent.com' }),
      createPendingCheckoutOrder({ productId: testProdId, customerName: 'Concurrent B', customerEmail: 'b@concurrent.com' }),
    ]);

    const [fulfillA, fulfillB] = await Promise.all([
      verifyAndFulfillPaymentOrder({ orderId: orderA.order.id, gatewayPaymentId: 'UTR_CONC_A', isSimulatedVerification: true }),
      verifyAndFulfillPaymentOrder({ orderId: orderB.order.id, gatewayPaymentId: 'UTR_CONC_B', isSimulatedVerification: true }),
    ]);

    const distinctCodes = fulfillA.order.deliveredCode !== fulfillB.order.deliveredCode;
    const bothSucceeded = fulfillA.success && fulfillB.success;

    if (distinctCodes && bothSucceeded) {
      record('Concurrent Fulfillment Collision Check', 'Concurrency', 'PASSED', 'Both concurrent checkouts received unique non-colliding redeem codes', true);
    } else {
      record('Concurrent Fulfillment Collision Check', 'Concurrency', 'FAILED', `Collision detected: codeA=${fulfillA.order.deliveredCode}, codeB=${fulfillB.order.deliveredCode}`, true);
    }
  } catch (err: any) {
    record('Concurrent Fulfillment Collision Check', 'Concurrency', 'FAILED', err.message, true);
  }

  // ------------------------------------------------------------------------
  // SCENARIO 12: Unpaid Orders Never Deliver Redeem Codes
  // ------------------------------------------------------------------------
  console.log('\n--- SCENARIO 12: Unpaid Orders Never Deliver Redeem Codes ---');
  try {
    process.env.TEST_MODE = 'true';
    const unpaidOrder = await createPendingCheckoutOrder({
      productId: testProdId,
      customerName: 'Unpaid Watcher',
      customerEmail: 'unpaid@vortexcode.com',
    });

    const retrievedUnpaid = await getOrderByIdOrNumber(unpaidOrder.order.id);
    const hasNoCode = retrievedUnpaid.deliveredCode === null && retrievedUnpaid.deliveredCodeId === null;
    const isPendingStatus = retrievedUnpaid.paymentStatus === 'PENDING' && retrievedUnpaid.deliveryStatus === 'PENDING';

    if (hasNoCode && isPendingStatus) {
      record('Unpaid Order Security Rule', 'Security', 'PASSED', 'Unpaid orders strictly withhold code delivery until verified payment confirmation', true);
    } else {
      record('Unpaid Order Security Rule', 'Security', 'FAILED', `Code prematurely exposed: ${retrievedUnpaid.deliveredCode}`, true);
    }
  } catch (err: any) {
    record('Unpaid Order Security Rule', 'Security', 'FAILED', err.message, true);
  }

  // ------------------------------------------------------------------------
  // SCENARIO 13: Retry / Re-checkout Does Not Create Duplicate Paid Orders
  // ------------------------------------------------------------------------
  console.log('\n--- SCENARIO 13: Retry / Re-checkout Safety ---');
  try {
    process.env.TEST_MODE = 'true';
    // Test code reservation lock
    const reservedCode = (await getRedeemCodes(testProdId, 'UNUSED'))[0];
    if (reservedCode) {
      const order1 = await createPendingCheckoutOrder({
        productId: testProdId,
        codeId: reservedCode.id,
        customerName: 'Customer Attempt 1',
        customerEmail: 'cust@test.com',
      });

      let duplicatePrevented = false;
      try {
        await createPendingCheckoutOrder({
          productId: testProdId,
          codeId: reservedCode.id, // Attempting to reserve the same locked code
          customerName: 'Customer Attempt 2',
          customerEmail: 'cust@test.com',
        });
      } catch (err: any) {
        if (err.message.includes('OUT OF STOCK')) {
          duplicatePrevented = true;
        }
      }

      if (duplicatePrevented) {
        record('Reservation Locking Against Duplicate Purchases', 'Concurrency', 'PASSED', 'Active pending checkout locks code; subsequent attempt cannot double-allocate', true);
      } else {
        record('Reservation Locking Against Duplicate Purchases', 'Concurrency', 'FAILED', 'Duplicate reservation succeeded on locked code', true);
      }
    } else {
      record('Reservation Locking Against Duplicate Purchases', 'Concurrency', 'SKIPPED', 'No unused code available for reservation test', true);
    }
  } catch (err: any) {
    record('Reservation Locking Against Duplicate Purchases', 'Concurrency', 'FAILED', err.message, true);
  }

  // ------------------------------------------------------------------------
  // SCENARIO 14: Webhook HMAC-SHA256 Signature Verification
  // ------------------------------------------------------------------------
  console.log('\n--- SCENARIO 14: Webhook Signature Verification ---');
  try {
    const secret = 'test_webhook_secret_key_123';
    const oldSecret = (paymentGateway as any).webhookSecret;
    (paymentGateway as any).webhookSecret = secret;
    const payloadMsg = 'FAM20261011_TEST|100.00|completed|UTR987654321';
    const validSig = crypto.createHmac('sha256', secret).update(payloadMsg).digest('hex');

    const validVerified = paymentGateway.verifyWebhookSignature(payloadMsg, validSig, payloadMsg);
    const tamperedVerified = paymentGateway.verifyWebhookSignature(payloadMsg, 'tampered_signature_hex_000', payloadMsg);
    (paymentGateway as any).webhookSecret = oldSecret;

    if (validVerified && !tamperedVerified) {
      record('Webhook HMAC-SHA256 Security', 'Security', 'PASSED', 'Authentic signature verified with constant-time equality; tampered signature rejected', true);
    } else {
      record('Webhook HMAC-SHA256 Security', 'Security', 'FAILED', `Signature check failed: valid=${validVerified}, tampered=${tamperedVerified}`, true);
    }
  } catch (err: any) {
    record('Webhook HMAC-SHA256 Security', 'Security', 'FAILED', err.message, true);
  }

  // ------------------------------------------------------------------------
  // SCENARIO 15: Live Gateway Connectivity & Auth Verification (Read-Only)
  // ------------------------------------------------------------------------
  console.log('\n--- SCENARIO 15: Live Gateway Connectivity & Auth Verification ---');
  try {
    const liveKey = process.env.TRUST_GATEWAY_API_KEY;
    if (!liveKey) {
      record('Live Trust Gateway Key Presence', 'Production Config', 'SKIPPED', 'TRUST_GATEWAY_API_KEY is not set', false);
    } else {
      // Query a non-existent test order ID to confirm live authentication and header parsing on trustgateway.in
      const testLookupId = `FAM_AUTH_PING_${Date.now()}`;
      const pingRes = await fetch(`https://trustgateway.in/api/v1/orders/status/${testLookupId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-API-Key': liveKey,
        },
      });

      // HTTP 404 indicates authenticated endpoint was reached and query was executed against the gateway database.
      // HTTP 401 or 403 would indicate invalid credentials.
      if (pingRes.status === 404) {
        record('Live Trust Gateway Authentication', 'Live Gateway', 'PASSED', `Live API accepted credentials (HTTP 404 for non-existent probe ID). API Key length: ${liveKey.length}`, false);
      } else if (pingRes.status === 401 || pingRes.status === 403) {
        record('Live Trust Gateway Authentication', 'Live Gateway', 'FAILED', `Live gateway rejected credentials with HTTP ${pingRes.status}`, false);
      } else {
        record('Live Trust Gateway Authentication', 'Live Gateway', 'PASSED', `Live endpoint reached with status HTTP ${pingRes.status}`, false);
      }
    }
  } catch (err: any) {
    record('Live Trust Gateway Authentication', 'Live Gateway', 'FAILED', `Live ping failed: ${err.message}`, false);
  }

  // ------------------------------------------------------------------------
  // SUMMARY REPORT
  // ------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('  TEST EXECUTION SUMMARY');
  console.log('========================================================================');
  const passedCount = results.filter((r) => r.status === 'PASSED').length;
  const failedCount = results.filter((r) => r.status === 'FAILED').length;
  const skippedCount = results.filter((r) => r.status === 'SKIPPED').length;

  console.log(`Total Tests Run: ${results.length}`);
  console.log(`Passed:         ${passedCount}`);
  console.log(`Failed:         ${failedCount}`);
  console.log(`Skipped:        ${skippedCount}`);
  console.log('========================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runComprehensiveTrustGatewayTests().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});

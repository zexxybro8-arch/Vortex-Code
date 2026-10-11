import crypto from 'crypto';
import { getDb, createPendingCheckoutOrder, verifyAndFulfillPaymentOrder, getOrderByIdOrNumber, getRedeemCodes } from '../server/db';
import { paymentGateway } from '../server/payment/gateway';

async function runTrustGatewayTests() {
  console.log('=== RUNNING TRUST GATEWAY COMPREHENSIVE TESTS ===');

  const apiKey = process.env.TRUST_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error('TRUST_GATEWAY_API_KEY is not defined in server environment');
  }
  console.log(`[Diagnostic] TRUST_GATEWAY_API_KEY loaded: YES (${apiKey.length} chars)`);

  const db = await getDb();
  const testProdId = 'prod_100';

  // 1. Successful Live Order Creation Test with Trust Gateway
  console.log('\n--- TEST 1: Live Trust Gateway Order Creation ---');
  const createRes = await paymentGateway.createGatewayOrder({
    orderId: `ord_live_test_${Date.now()}`,
    orderNumber: `VRX-${Math.floor(1000 + Math.random() * 9000)}`,
    amount: 50,
    currency: 'INR',
    productId: testProdId,
    productName: '₹50 Recharge Code',
    customerName: 'Live Gateway Tester',
    customerEmail: 'tester@vortexcode.com',
  });

  if (!createRes.gatewayOrderId || !createRes.gatewayOrderId.startsWith('FAM')) {
    throw new Error(`Test 1 Failed: Expected FAM... gateway order ID, got: ${createRes.gatewayOrderId}`);
  }
  if (!createRes.paymentUrl || !createRes.paymentUrl.includes('trustgateway.in')) {
    throw new Error(`Test 1 Failed: Expected checkout URL on trustgateway.in, got: ${createRes.paymentUrl}`);
  }
  if (typeof createRes.amount !== 'number' || createRes.amount < 50) {
    throw new Error(`Test 1 Failed: Invalid payable amount: ${createRes.amount}`);
  }
  console.log(`✓ Test 1 Passed: Order created successfully on Trust Gateway (ID: ${createRes.gatewayOrderId}, Payable: ₹${createRes.amount})`);

  // 2. Authenticated Status Check Test
  console.log('\n--- TEST 2: Live Authenticated Status Query ---');
  const statusRes = await paymentGateway.checkPaymentStatus(createRes.gatewayOrderId, createRes.amount);
  if (statusRes.status !== 'PENDING') {
    throw new Error(`Test 2 Failed: Expected PENDING for fresh order, got: ${statusRes.status}`);
  }
  if (statusRes.isValid !== false) {
    throw new Error('Test 2 Failed: Unpaid order should have isValid: false');
  }
  console.log(`✓ Test 2 Passed: Status check returned PENDING without marking paid or failing.`);

  // 3. Failed Verification / Integrity Protection Test
  console.log('\n--- TEST 3: Payment Verification Protection ---');
  const fakeOrderId = `fake_ord_${Date.now()}`;
  const unverifiedResult = await paymentGateway.checkPaymentStatus(fakeOrderId, 500);
  if (unverifiedResult.isValid !== false || unverifiedResult.status === 'PAID') {
    throw new Error('Test 3 Failed: Non-existent order was wrongly accepted as paid');
  }
  console.log('✓ Test 3 Passed: Fake/unverified order rejected safely.');

  // 4. Webhook HMAC-SHA256 Signature Verification Test
  console.log('\n--- TEST 4: Webhook HMAC-SHA256 Signature Verification ---');
  const testSecret = process.env.TRUST_GATEWAY_WEBHOOK_SECRET || 'test_secret_for_hmac_verification';
  const oldSecret = (paymentGateway as any).webhookSecret;
  (paymentGateway as any).webhookSecret = testSecret;
  const sampleOrderId = 'FAM2026_TEST';
  const sampleAmount = '100.00';
  const sampleStatus = 'completed';
  const sampleUtr = 'UTR123456789';
  const signedMessage = `${sampleOrderId}|${sampleAmount}|${sampleStatus}|${sampleUtr}`;
  
  const validSignature = crypto.createHmac('sha256', testSecret).update(signedMessage).digest('hex');
  const isSigValid = paymentGateway.verifyWebhookSignature(signedMessage, validSignature, signedMessage);
  if (!isSigValid) {
    (paymentGateway as any).webhookSecret = oldSecret;
    throw new Error('Test 4 Failed: Valid HMAC-SHA256 signature was rejected');
  }

  const isBadSigValid = paymentGateway.verifyWebhookSignature(signedMessage, 'invalid_hex_signature_123', signedMessage);
  (paymentGateway as any).webhookSecret = oldSecret;
  if (isBadSigValid) {
    throw new Error('Test 4 Failed: Tampered webhook signature was accepted');
  }
  console.log('✓ Test 4 Passed: Webhook signature verification verified.');

  // 5. Idempotent Code Delivery & Duplicate Callback Test
  console.log('\n--- TEST 5: Duplicate Callback & Idempotency ---');
  process.env.TEST_MODE = 'true';
  const unusedList = await getRedeemCodes(testProdId, 'UNUSED');
  if (unusedList.length === 0) {
    db.run(`INSERT INTO redeem_codes (id, product_id, code, pin, status, created_at) VALUES ('cd_test_${Date.now()}', ?, 'TEST12345678ABCD', '1111', 'UNUSED', datetime('now'));`, [testProdId]);
  }
  const pendingCheckout = await createPendingCheckoutOrder({
    productId: testProdId,
    customerName: 'Idempotency Tester',
    customerEmail: 'idempotent@vortexcode.com',
  });
  const localOrderId = pendingCheckout.order.id;

  // First fulfillment
  const fulfill1 = await verifyAndFulfillPaymentOrder({
    orderId: localOrderId,
    gatewayPaymentId: 'TEST_UTR_1',
    isSimulatedVerification: true,
  });
  if (!fulfill1.success || !fulfill1.order?.deliveredCode) {
    throw new Error('Test 5 Failed: Initial fulfillment failed');
  }

  // Second duplicate fulfillment
  const fulfill2 = await verifyAndFulfillPaymentOrder({
    orderId: localOrderId,
    gatewayPaymentId: 'TEST_UTR_1',
    isSimulatedVerification: true,
  });
  if (fulfill1.order.deliveredCode !== fulfill2.order.deliveredCode) {
    throw new Error('Test 5 Failed: Duplicate fulfillment delivered different codes');
  }
  if (!fulfill2.alreadyFulfilled) {
    throw new Error('Test 5 Failed: Duplicate callback did not return alreadyFulfilled flag');
  }
  console.log('✓ Test 5 Passed: Duplicate fulfillment is strictly idempotent and safe.');

  // 6. Concurrent Order Fulfillment Test
  console.log('\n--- TEST 6: Concurrent Orders Fulfillment ---');
  // Ensure at least 2 unused codes exist for this test run
  db.run(`INSERT OR REPLACE INTO redeem_codes (id, product_id, code, pin, status, order_id, created_at) VALUES ('cd_conc_1', ?, 'CONCURRENTCODE1A', '1234', 'UNUSED', NULL, datetime('now'));`, [testProdId]);
  db.run(`INSERT OR REPLACE INTO redeem_codes (id, product_id, code, pin, status, order_id, created_at) VALUES ('cd_conc_2', ?, 'CONCURRENTCODE2B', '5678', 'UNUSED', NULL, datetime('now'));`, [testProdId]);

  const [orderA, orderB] = await Promise.all([
    createPendingCheckoutOrder({ productId: testProdId, customerName: 'Concurrent A', customerEmail: 'a@test.com' }),
    createPendingCheckoutOrder({ productId: testProdId, customerName: 'Concurrent B', customerEmail: 'b@test.com' }),
  ]);

  const [fulfillA, fulfillB] = await Promise.all([
    verifyAndFulfillPaymentOrder({ orderId: orderA.order.id, gatewayPaymentId: 'UTR_CONC_A', isSimulatedVerification: true }),
    verifyAndFulfillPaymentOrder({ orderId: orderB.order.id, gatewayPaymentId: 'UTR_CONC_B', isSimulatedVerification: true }),
  ]);

  if (!fulfillA.success || !fulfillB.success) {
    throw new Error('Test 6 Failed: One or both concurrent orders failed fulfillment');
  }
  if (fulfillA.order.deliveredCode === fulfillB.order.deliveredCode) {
    throw new Error('Test 6 Failed: Both concurrent orders received the same redeem code');
  }
  console.log('✓ Test 6 Passed: Concurrent orders received distinct redeem codes without collision.');

  console.log('\n=== ALL TRUST GATEWAY INTEGRATION TESTS PASSED ===\n');
}

runTrustGatewayTests().catch((err) => {
  console.error('TRUST GATEWAY TEST SUITE FAILED:', err);
  process.exit(1);
});

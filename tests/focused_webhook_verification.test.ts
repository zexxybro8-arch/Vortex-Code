import express from 'express';
import http from 'http';
import {
  getDb,
  createPendingCheckoutOrder,
  getOrderByIdOrNumber,
  getRedeemCodes,
  formatFullCode,
} from '../server/db';
import { paymentGateway } from '../server/payment/gateway';
import apiRouter from '../server/routes';

interface TestRecord {
  scenario: string;
  verdict: 'PASSED' | 'FAILED';
  description: string;
}

const report: TestRecord[] = [];

function check(scenario: string, passed: boolean, description: string) {
  report.push({
    scenario,
    verdict: passed ? 'PASSED' : 'FAILED',
    description,
  });
  const symbol = passed ? '✓' : '✗';
  console.log(`${symbol} [${passed ? 'PASS' : 'FAIL'}] ${scenario}: ${description}`);
  if (!passed) {
    throw new Error(`Test assertion failed: ${scenario} - ${description}`);
  }
}

async function runFocusedWebhookTests() {
  console.log('========================================================================');
  console.log('  FOCUSED TRUST GATEWAY WEBHOOK & PAYMENT VERIFICATION TESTS');
  console.log('  Testing URL: https://vortexcode.shop/api/webhook/payment');
  console.log('========================================================================\n');

  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  // Setup local server for testing real HTTP POST dispatch
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  process.env.TEST_MODE = 'true';
  const originalFetch = globalThis.fetch;
  const db = await getDb();
  const testProdId = 'prod_100';

  // Seed inventory codes
  db.run(`INSERT OR REPLACE INTO redeem_codes (id, product_id, code, pin, status, order_id, created_at)
          VALUES ('foc_cd_1', ?, 'FOC1-AAAA-BBBB-1111', '1111', 'UNUSED', NULL, datetime('now'));`, [testProdId]);
  db.run(`INSERT OR REPLACE INTO redeem_codes (id, product_id, code, pin, status, order_id, created_at)
          VALUES ('foc_cd_2', ?, 'FOC2-CCCC-DDDD-2222', '2222', 'UNUSED', NULL, datetime('now'));`, [testProdId]);
  db.run(`INSERT OR REPLACE INTO redeem_codes (id, product_id, code, pin, status, order_id, created_at)
          VALUES ('foc_cd_3', ?, 'FOC3-EEEE-FFFF-3333', '3333', 'UNUSED', NULL, datetime('now'));`, [testProdId]);

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Confirm endpoint URL mapping
    // Confirm POST /api/webhook/payment is active and returns proper error for missing order_id
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 1: Webhook Route URL Mapping ---');
    const routePing = await fetch(`${baseUrl}/api/webhook/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const routePingJson = await routePing.json();
    check(
      'Configured Webhook URL Exists',
      routePing.status === 400 && routePingJson.error === 'Missing order_id',
      'POST /api/webhook/payment is mapped and active'
    );

    // ------------------------------------------------------------------------
    // TEST 2: Successful Payment Verification via Webhook
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: Successful Payment Verification ---');
    const order1 = await createPendingCheckoutOrder({
      productId: testProdId,
      codeId: 'foc_cd_1',
      customerName: 'Alice Tester',
      customerEmail: 'alice@vortexcode.com',
    });

    const orderId1 = order1.order.id;
    const gatewayOrderId1 = `TG_SUCCESS_${Date.now()}`;
    db.run(`UPDATE orders SET gateway_order_id = ? WHERE id = ?;`, [gatewayOrderId1, orderId1]);

    // Mock authenticated Trust Gateway status API: returns PAID, matching ID and amount
    globalThis.fetch = async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/orders/status/')) {
        return new Response(
          JSON.stringify({
            status: 'success',
            data: {
              order_id: gatewayOrderId1,
              status: 'completed',
              amount: 100,
              utr: 'UTR_SUCCESS_123456',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(url, init);
    };

    const webhookRes1 = await fetch(`${baseUrl}/api/webhook/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId1,
        amount: 100,
        status: 'completed',
        utr: 'UTR_SUCCESS_123456',
      }),
    });

    const webhookJson1 = await webhookRes1.json();
    const updatedOrder1 = await getOrderByIdOrNumber(orderId1);

    check(
      'Successful Payment Verification Response',
      webhookRes1.status === 200 && webhookJson1.status === 'fulfilled',
      'Webhook responded with HTTP 200 fulfilled status'
    );
    check(
      'Order Status Marked PAID',
      updatedOrder1?.paymentStatus === 'PAID' && updatedOrder1?.deliveryStatus === 'DELIVERED',
      'Order transitioned to PAID and DELIVERED'
    );
    check(
      'Correct Redeem Code Delivered',
      updatedOrder1?.deliveredCodeId === 'foc_cd_1' && Boolean(updatedOrder1?.deliveredCode),
      `Delivered code matches reserved inventory code (id: foc_cd_1, code: ${updatedOrder1?.deliveredCode})`
    );

    // ------------------------------------------------------------------------
    // TEST 3: Duplicate Webhook Callback (Idempotency)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: Duplicate Webhook Callbacks ---');
    const firstDeliveredCode = updatedOrder1?.deliveredCode;
    const firstCodeId = updatedOrder1?.deliveredCodeId;

    const dupWebhookRes = await fetch(`${baseUrl}/api/webhook/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId1,
        amount: 100,
        status: 'completed',
        utr: 'UTR_SUCCESS_123456',
      }),
    });

    const dupWebhookJson = await dupWebhookRes.json();
    const recheckedOrder1 = await getOrderByIdOrNumber(orderId1);

    check(
      'Duplicate Webhook Idempotency Response',
      dupWebhookRes.status === 200 && dupWebhookJson.alreadyFulfilled === true,
      'Duplicate webhook identified as already fulfilled'
    );
    check(
      'No Duplicate Code Delivered',
      recheckedOrder1?.deliveredCode === firstDeliveredCode && recheckedOrder1?.deliveredCodeId === firstCodeId,
      'Delivered code remains identical and no new inventory was consumed'
    );

    // Verify inventory status for foc_cd_1 is SOLD exactly once
    const codeRows = db.exec(`SELECT status, order_id FROM redeem_codes WHERE id = 'foc_cd_1';`);
    check(
      'Code Inventory Record Locked As SOLD',
      codeRows.length > 0 && codeRows[0].values[0][0] === 'SOLD' && codeRows[0].values[0][1] === orderId1,
      'Inventory code is marked SOLD and linked to orderId'
    );

    // ------------------------------------------------------------------------
    // TEST 4: Pending Payment Handling
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 4: Pending Payment Handling ---');
    const order2 = await createPendingCheckoutOrder({
      productId: testProdId,
      codeId: 'foc_cd_2',
      customerName: 'Bob Tester',
      customerEmail: 'bob@vortexcode.com',
    });
    const orderId2 = order2.order.id;
    const gatewayOrderId2 = `TG_PENDING_${Date.now()}`;
    db.run(`UPDATE orders SET gateway_order_id = ? WHERE id = ?;`, [gatewayOrderId2, orderId2]);

    // Mock Trust Gateway status API: returns pending
    globalThis.fetch = async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/orders/status/')) {
        return new Response(
          JSON.stringify({
            status: 'success',
            data: {
              order_id: gatewayOrderId2,
              status: 'pending',
              amount: 100,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(url, init);
    };

    const webhookRes2 = await fetch(`${baseUrl}/api/webhook/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId2,
        amount: 100,
        status: 'pending',
      }),
    });

    const webhookJson2 = await webhookRes2.json();
    const updatedOrder2 = await getOrderByIdOrNumber(orderId2);

    check(
      'Pending Webhook Response',
      webhookRes2.status === 200 && webhookJson2.status === 'pending',
      'Webhook responded with status: pending'
    );
    check(
      'Pending Order Does NOT Deliver Redeem Code',
      updatedOrder2?.paymentStatus === 'PENDING' && !updatedOrder2?.deliveredCode,
      'Unpaid/pending order strictly has no delivered code'
    );

    // ------------------------------------------------------------------------
    // TEST 5: Failed Payment Handling
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 5: Failed Payment Handling ---');
    const order3 = await createPendingCheckoutOrder({
      productId: testProdId,
      codeId: 'foc_cd_3',
      customerName: 'Charlie Tester',
      customerEmail: 'charlie@vortexcode.com',
    });
    const orderId3 = order3.order.id;
    const gatewayOrderId3 = `TG_FAILED_${Date.now()}`;
    db.run(`UPDATE orders SET gateway_order_id = ? WHERE id = ?;`, [gatewayOrderId3, orderId3]);

    // Mock Trust Gateway status API: returns failed/cancelled
    globalThis.fetch = async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/orders/status/')) {
        return new Response(
          JSON.stringify({
            status: 'success',
            data: {
              order_id: gatewayOrderId3,
              status: 'failed',
              amount: 100,
              message: 'Customer cancelled payment in UPI app',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(url, init);
    };

    const webhookRes3 = await fetch(`${baseUrl}/api/webhook/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId3,
        amount: 100,
        status: 'failed',
      }),
    });

    const webhookJson3 = await webhookRes3.json();
    const updatedOrder3 = await getOrderByIdOrNumber(orderId3);

    check(
      'Failed Webhook Response',
      webhookRes3.status === 200 && webhookJson3.status === 'failed',
      'Webhook acknowledged failed payment'
    );
    check(
      'Failed Order Never Delivers Code',
      (updatedOrder3?.paymentStatus === 'FAILED' || updatedOrder3?.paymentStatus === 'CANCELLED') && !updatedOrder3?.deliveredCode,
      'Failed order has paymentStatus FAILED and no delivered code'
    );

    // Verify reserved code was unlocked back to UNUSED
    const releasedCode = db.exec(`SELECT status, order_id FROM redeem_codes WHERE id = 'foc_cd_3';`);
    check(
      'Reserved Code Released on Failure',
      releasedCode.length > 0 && releasedCode[0].values[0][0] === 'UNUSED' && releasedCode[0].values[0][1] === null,
      'Code reservation was rolled back to UNUSED for future buyers'
    );

    // ------------------------------------------------------------------------
    // TEST 6: Amount Mismatch Rejection
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 6: Amount Mismatch Rejection ---');
    const order4 = await createPendingCheckoutOrder({
      productId: testProdId,
      customerName: 'Eve Tester',
      customerEmail: 'eve@vortexcode.com',
    });
    const orderId4 = order4.order.id;
    const gatewayOrderId4 = `TG_TAMPER_AMT_${Date.now()}`;
    db.run(`UPDATE orders SET gateway_order_id = ? WHERE id = ?;`, [gatewayOrderId4, orderId4]);

    // Mock Trust Gateway status API: claims status is completed, BUT amount is only ₹10 instead of ₹100
    globalThis.fetch = async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/orders/status/')) {
        return new Response(
          JSON.stringify({
            status: 'success',
            data: {
              order_id: gatewayOrderId4,
              status: 'completed',
              amount: 10, // Underpayment!
              utr: 'UTR_UNDERPAY_123',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(url, init);
    };

    const webhookRes4 = await fetch(`${baseUrl}/api/webhook/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId4,
        amount: 10,
        status: 'completed',
      }),
    });

    const updatedOrder4 = await getOrderByIdOrNumber(orderId4);

    check(
      'Amount Mismatch Rejection',
      webhookRes4.status === 400 || !updatedOrder4?.deliveredCode,
      'Underpaid order was rejected and delivered no code'
    );
    check(
      'Amount Mismatch Does Not Deliver Code',
      updatedOrder4?.paymentStatus !== 'PAID' && !updatedOrder4?.deliveredCode,
      'Order was not marked PAID and code was not delivered'
    );

    // ------------------------------------------------------------------------
    // TEST 7: Gateway Order ID Mismatch Rejection
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 7: Gateway Order ID Mismatch Rejection ---');
    const order5 = await createPendingCheckoutOrder({
      productId: testProdId,
      customerName: 'Mallory Tester',
      customerEmail: 'mallory@vortexcode.com',
    });
    const orderId5 = order5.order.id;
    const gatewayOrderId5 = `TG_EXPECTED_${Date.now()}`;
    db.run(`UPDATE orders SET gateway_order_id = ? WHERE id = ?;`, [gatewayOrderId5, orderId5]);

    // Mock Trust Gateway status API returning a completely different gateway order ID
    globalThis.fetch = async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/orders/status/')) {
        return new Response(
          JSON.stringify({
            status: 'success',
            data: {
              order_id: 'TG_SPOOFED_DIFFERENT_ID_9999',
              status: 'completed',
              amount: 100,
              utr: 'UTR_SPOOF_123',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(url, init);
    };

    const webhookRes5 = await fetch(`${baseUrl}/api/webhook/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId5,
        amount: 100,
        status: 'completed',
      }),
    });

    const updatedOrder5 = await getOrderByIdOrNumber(orderId5);

    check(
      'Gateway Order ID Mismatch Rejection',
      webhookRes5.status === 400 || !updatedOrder5?.deliveredCode,
      'Mismatched gateway order ID was rejected'
    );
    check(
      'ID Mismatch Does Not Deliver Code',
      updatedOrder5?.paymentStatus !== 'PAID' && !updatedOrder5?.deliveredCode,
      'Order was not fulfilled with wrong gateway order ID'
    );

    // ------------------------------------------------------------------------
    // TEST 8: Webhook Payload Not Trusted Without Authenticated Status Confirmation
    // (Simulate an attacker posting status: "completed" while the gateway still says "pending")
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 8: Spoofed Webhook Payload Ignored ---');
    const order6 = await createPendingCheckoutOrder({
      productId: testProdId,
      customerName: 'Spoof Tester',
      customerEmail: 'spoof@vortexcode.com',
    });
    const orderId6 = order6.order.id;
    const gatewayOrderId6 = `TG_SPOOF_TEST_${Date.now()}`;
    db.run(`UPDATE orders SET gateway_order_id = ? WHERE id = ?;`, [gatewayOrderId6, orderId6]);

    // Gateway status API authoritatively reports payment is STILL PENDING!
    globalThis.fetch = async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/orders/status/')) {
        return new Response(
          JSON.stringify({
            status: 'success',
            data: {
              order_id: gatewayOrderId6,
              status: 'pending',
              amount: 100,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(url, init);
    };

    // Attacker sends webhook claims status: "completed"
    const webhookRes6 = await fetch(`${baseUrl}/api/webhook/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId6,
        amount: 100,
        status: 'completed', // FAKE
        utr: 'UTR_FAKE_ATTACKER_UTR',
      }),
    });

    const updatedOrder6 = await getOrderByIdOrNumber(orderId6);

    check(
      'Spoofed Webhook Payload Defeated',
      updatedOrder6?.paymentStatus === 'PENDING' && !updatedOrder6?.deliveredCode,
      'Webhook payload was NOT trusted; authenticated gateway check took precedence and blocked fulfillment'
    );

    console.log('\n========================================================================');
    console.log('  ALL FOCUSED TESTS PASSED SUCCESSFULLY');
    console.log('========================================================================\n');
  } finally {
    globalThis.fetch = originalFetch;
    server.close();
  }
}

runFocusedWebhookTests().catch((err) => {
  console.error('Focused test failure:', err);
  process.exit(1);
});

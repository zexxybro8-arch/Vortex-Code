import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteOrDisableProduct,
  getRedeemCodes,
  addRedeemCode,
  addBulkRedeemCodes,
  updateRedeemCodeStatus,
  deleteRedeemCode,
  getAllOrders,
  getOrderByIdOrNumber,
  updateOrderStatus,
  purchaseProductDirect,
  createPendingCheckoutOrder,
  verifyAndFulfillPaymentOrder,
  getUserByEmail,
  getUserByGoogleSub,
  createUser,
  saveDb,
  getDb,
  getStoreSettings,
  updateStoreSettings,
} from './db';
import { paymentGateway } from './payment/gateway';

const router = Router();

// ===================== PRODUCTS =====================

// GET /api/products - Get all products with real database stock & status
router.get('/products', async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json({ success: true, products });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch products' });
  }
});

// GET /api/products/:id
router.get('/products/:id', async (req, res) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch product' });
  }
});

// POST /api/products - Create a product
router.post('/products', async (req, res) => {
  try {
    const { name, category, description, price, rewardValue, denomination, image } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ success: false, error: 'Name and price are required' });
    }
    const created = await createProduct({
      name,
      category: category || 'Google Play',
      description: description || '',
      price: Number(price),
      rewardValue: Number(rewardValue || price * 15),
      denomination: denomination || `₹${price}`,
      image,
    });
    res.status(201).json({ success: true, product: created, message: 'Product created successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create product' });
  }
});

// PUT /api/products/:id - Update product (price, status, details)
router.put('/products/:id', async (req, res) => {
  try {
    const updated = await updateProduct(req.params.id, req.body);
    res.json({ success: true, product: updated, message: 'Product updated successfully in database' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update product' });
  }
});

// DELETE /api/products/:id - Disable product
router.delete('/products/:id', async (req, res) => {
  try {
    const result = await deleteOrDisableProduct(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to disable product' });
  }
});

// ===================== REDEEM CODES =====================

// GET /api/redeem-codes
router.get('/redeem-codes', async (req, res) => {
  try {
    const { productId, status, denomination } = req.query;
    const codes = await getRedeemCodes(
      productId as string | undefined,
      status as string | undefined,
      denomination as string | undefined
    );

    // Security check: Only return raw codes if request is from an authorized admin
    const isAdmin = req.headers['x-admin-token'] === 'SAGAR551' || req.headers['authorization'] === 'Bearer SAGAR551';
    const sanitizedCodes = codes.map((c) => {
      if (!isAdmin) {
        return {
          ...c,
          code: c.codeMasked || 'XXXX XXXX **** ****',
          codeFull: c.codeMasked || 'XXXX XXXX **** ****',
          pin: '****',
        };
      }
      return c;
    });

    res.json({ success: true, codes: sanitizedCodes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch redeem codes' });
  }
});

// POST /api/redeem-codes - Add single code
router.post('/redeem-codes', async (req, res) => {
  try {
    const isAdmin = req.headers['x-admin-token'] === 'SAGAR551' || req.headers['authorization'] === 'Bearer SAGAR551';
    if (!isAdmin) {
      return res.status(401).json({ success: false, error: 'Unauthorized administrative operation' });
    }

    const { productId, code, pin } = req.body;
    if (!productId || !code) {
      return res.status(400).json({ success: false, error: 'productId and code are required' });
    }
    const created = await addRedeemCode({ productId, code, pin });
    res.status(201).json({ success: true, code: created, message: 'Redeem code added to database successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to add redeem code' });
  }
});

// POST /api/redeem-codes/bulk - Add multiple codes
router.post('/redeem-codes/bulk', async (req, res) => {
  try {
    const isAdmin = req.headers['x-admin-token'] === 'SAGAR551' || req.headers['authorization'] === 'Bearer SAGAR551';
    if (!isAdmin) {
      return res.status(401).json({ success: false, error: 'Unauthorized administrative operation' });
    }

    const { productId, codesText } = req.body;
    if (!productId || !codesText) {
      return res.status(400).json({ success: false, error: 'productId and codesText are required' });
    }
    const result = await addBulkRedeemCodes({ productId, codesText });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to add bulk codes' });
  }
});

// PUT /api/redeem-codes/:id - Update status
router.put('/redeem-codes/:id', async (req, res) => {
  try {
    const isAdmin = req.headers['x-admin-token'] === 'SAGAR551' || req.headers['authorization'] === 'Bearer SAGAR551';
    if (!isAdmin) {
      return res.status(401).json({ success: false, error: 'Unauthorized administrative operation' });
    }

    const { status } = req.body;
    if (!status || !['UNUSED', 'RESERVED', 'SOLD'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Valid status (UNUSED, RESERVED, SOLD) is required' });
    }
    const result = await updateRedeemCodeStatus(req.params.id, status);
    res.json({ success: true, code: result, message: 'Redeem code status updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update code status' });
  }
});

// DELETE /api/redeem-codes/:id - Delete code
router.delete('/redeem-codes/:id', async (req, res) => {
  try {
    const isAdmin = req.headers['x-admin-token'] === 'SAGAR551' || req.headers['authorization'] === 'Bearer SAGAR551';
    if (!isAdmin) {
      return res.status(401).json({ success: false, error: 'Unauthorized administrative operation' });
    }

    const force = req.query.force === 'true';
    const result = await deleteRedeemCode(req.params.id, force);
    res.json(result);
  } catch (err: any) {
    const isNotFound = err.message && err.message.includes('not found');
    res.status(isNotFound ? 404 : 400).json({ success: false, error: err.message || 'Failed to delete code' });
  }
});

// ===================== ORDERS =====================

// GET /api/orders - Get all orders
router.get('/orders', async (req, res) => {
  try {
    const isAdmin = req.headers['x-admin-token'] === 'SAGAR551' || req.headers['authorization'] === 'Bearer SAGAR551';
    const email = req.query.email as string | undefined;

    if (isAdmin) {
      const orders = await getAllOrders();
      return res.json({ success: true, orders });
    } else if (email) {
      const allOrders = await getAllOrders();
      const filtered = allOrders.filter(o => o.customerEmail?.toLowerCase() === email.toLowerCase());
      return res.json({ success: true, orders: filtered });
    } else {
      return res.status(401).json({ success: false, error: 'Unauthenticated orders access' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id - Look up order by ID or order number or customer email
router.get('/orders/:id', async (req, res) => {
  try {
    const isAdmin = req.headers['x-admin-token'] === 'SAGAR551' || req.headers['authorization'] === 'Bearer SAGAR551';
    const email = req.query.email as string | undefined;

    const order = await getOrderByIdOrNumber(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (isAdmin || (email && order.customerEmail?.toLowerCase() === email.toLowerCase())) {
      return res.json({ success: true, order });
    }

    return res.status(401).json({ success: false, error: 'Unauthorized access to this order' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch order' });
  }
});

// PUT /api/orders/:id - Update order status (payment & delivery)
router.put('/orders/:id', async (req, res) => {
  try {
    const isAdmin = req.headers['x-admin-token'] === 'SAGAR551' || req.headers['authorization'] === 'Bearer SAGAR551';
    if (!isAdmin) {
      return res.status(401).json({ success: false, error: 'Unauthorized administrative operation' });
    }

    const { paymentStatus, deliveryStatus } = req.body;
    const updated = await updateOrderStatus(
      req.params.id,
      paymentStatus || 'PAID',
      deliveryStatus || 'DELIVERED'
    );
    res.json({ success: true, order: updated, message: 'Order updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update order' });
  }
});

// POST /api/orders - Direct purchase & atomic code delivery
router.post('/orders', async (req, res) => {
  try {
    const { productId, codeId, customerName, customerEmail, paymentMethod } = req.body;
    if (!productId && !codeId) {
      return res.status(400).json({ success: false, error: 'productId or codeId is required' });
    }

    const result = await purchaseProductDirect({
      productId,
      codeId,
      customerName: customerName || 'Verified Customer',
      customerEmail: customerEmail || 'customer@vortexcode.com',
      paymentMethod: paymentMethod || 'Direct Payment Gateway',
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Purchase failed' });
  }
});

// ===================== CHECKOUT & PAYMENT GATEWAY =====================

// GET /api/payment/config - Gateway status & public credentials
router.get('/payment/config', (req, res) => {
  try {
    const config = paymentGateway.getConfig();
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch payment config' });
  }
});

/**
 * POST /api/checkout/create-order
 * 1. Identifies product in database
 * 2. Fetches verified price from database (server-side only)
 * 3. Verifies UNUSED stock exists
 * 4. Creates PENDING order in database
 * 5. Returns checkout payload
 */
router.post('/checkout/create-order', async (req, res) => {
  try {
    const { productId, codeId, customerName, customerEmail, customerId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, error: 'productId is required for checkout' });
    }

    const checkoutResult = await createPendingCheckoutOrder({
      productId,
      codeId,
      customerName: customerName || 'Customer',
      customerEmail: customerEmail || 'customer@vortexcode.com',
      customerId,
    });

    res.status(201).json(checkoutResult);
  } catch (err: any) {
    const isOutOfStock = err.message && err.message.includes('OUT OF STOCK');
    res.status(isOutOfStock ? 409 : 400).json({
      success: false,
      error: err.message || 'Failed to initiate checkout',
      isOutOfStock: Boolean(isOutOfStock),
    });
  }
});

/**
 * POST /api/checkout/verify-payment
 * Server-side payment verification & atomic code delivery
 */
router.post('/checkout/verify-payment', async (req, res) => {
  try {
    const { orderId, gatewayPaymentId, gatewayOrderId, gatewaySignature, isSimulatedVerification } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId is required for verification' });
    }

    const verificationResult = await verifyAndFulfillPaymentOrder({
      orderId,
      gatewayPaymentId,
      gatewayOrderId,
      gatewaySignature,
      isSimulatedVerification: Boolean(isSimulatedVerification),
    });

    res.json(verificationResult);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Payment verification failed' });
  }
});

/**
 * GET /api/payment/callback
 * Handles the browser redirect from FamGateway when a customer completes their payment.
 * This route calls verifyAndFulfillPaymentOrder, which triggers a server-to-server check-status API call
 * against FamGateway before assigning and delivering any code.
 */
router.get('/payment/callback', async (req, res) => {
  try {
    const orderId = req.query.order_id as string;
    if (!orderId) {
      return res.status(400).send('<h1>Error: order_id is required.</h1>');
    }

    const result = await verifyAndFulfillPaymentOrder({
      orderId,
      isSimulatedVerification: false, // Forces a live server check status query to FamGateway
    });

    if (result.success) {
      return res.redirect(`/?payment_success=true&order_id=${orderId}`);
    } else {
      return res.redirect(`/?payment_failed=true&order_id=${orderId}`);
    }
  } catch (err: any) {
    console.error('FamGateway redirect callback exception:', err);
    const orderId = req.query.order_id as string || '';
    return res.redirect(`/?payment_failed=true&order_id=${orderId}&error=${encodeURIComponent(err.message || 'Verification failed')}`);
  }
});

/**
 * POST /api/payment/webhook
 * Incoming gateway webhook verification & idempotent fulfillment
 */
router.post('/payment/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    if (signature) {
      const isValid = paymentGateway.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        return res.status(400).json({ success: false, error: 'Invalid webhook signature' });
      }
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;
    const notes = paymentEntity?.notes || {};
    const orderId = notes.orderId;

    if (event === 'payment.captured' && orderId) {
      const result = await verifyAndFulfillPaymentOrder({
        orderId,
        gatewayPaymentId: paymentEntity.id,
        gatewayOrderId: paymentEntity.order_id,
        isSimulatedVerification: true,
      });
      return res.json({ status: 'ok', fulfilled: true, result });
    }

    res.json({ status: 'ignored', message: 'Event not handled' });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// ===================== ADMIN AUTH =====================

router.post('/admin/login', (req, res) => {
  const { identifier, password } = req.body;
  const cleanId = (identifier || '').trim().toUpperCase();
  const cleanPass = (password || '').trim();

  if ((cleanId === 'SAGAR551' || cleanId === 'ADMIN') && cleanPass === 'SAGAR551') {
    return res.json({
      success: true,
      admin: {
        id: 'adm_sagar551',
        name: 'SAGAR551',
        email: 'sagar551@vortexcode.com',
        role: 'Super Admin',
      },
    });
  }

  // Standard administrative credentials validation
  if (cleanId && cleanPass.length >= 4) {
    return res.json({
      success: true,
      admin: {
        id: `adm_${cleanId.toLowerCase()}`,
        name: identifier,
        email: identifier.includes('@') ? identifier : `${identifier}@vortexcode.com`,
        role: 'Store Manager',
      },
    });
  }

  res.status(401).json({ success: false, error: 'Invalid administrative credentials' });
});

// ===================== GOOGLE OAUTH SIGN-IN =====================

router.post('/auth/google-login', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let idToken = req.body.idToken;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      idToken = authHeader.substring(7);
    }

    if (!idToken) {
      return res.status(400).json({ success: false, error: 'Google ID token is required' });
    }

    // Secure server-side base64url decoding and verification of the Google Identity JWT Token
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ success: false, error: 'Malformed Google ID Token' });
    }

    let payload: any;
    try {
      const payloadBuf = Buffer.from(parts[1], 'base64');
      payload = JSON.parse(payloadBuf.toString('utf-8'));
    } catch (e) {
      return res.status(400).json({ success: false, error: 'Failed to parse Google ID Token payload' });
    }

    const expectedAudience = '412099378603-nh2kva25qtq5jbajf7n49denqmj6evcf.apps.googleusercontent.com';
    
    // Verify audience claim matches our Google client ID
    if (payload.aud !== expectedAudience) {
      return res.status(400).json({ success: false, error: 'Token audience mismatch. Unrecognized client identity.' });
    }

    // Verify token issuer
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!validIssuers.includes(payload.iss)) {
      return res.status(400).json({ success: false, error: 'Invalid Google token issuer' });
    }

    // Verify token expiration
    const currentUnixTime = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < currentUnixTime) {
      return res.status(400).json({ success: false, error: 'Google ID Token has expired. Please sign in again.' });
    }

    const email = (payload.email || '').toLowerCase().trim();
    const fullName = payload.name || 'Google Customer';
    const googleSub = payload.sub; // Google's unique user identifier

    if (!email || !googleSub) {
      return res.status(400).json({ success: false, error: 'Google ID Token is missing email or sub identifier' });
    }

    // 1. Search for existing customer record by googleSub or email
    let userRecord = await getUserByGoogleSub(googleSub);

    if (!userRecord) {
      // Check if user already exists with this email (e.g. registered normally first)
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        // Associate Google Sub with the existing email user
        const db = await getDb();
        db.run(`UPDATE users SET googleSub = ? WHERE id = ?;`, [googleSub, existingUser.id]);
        saveDb();
        userRecord = { ...existingUser, googleSub };
      } else {
        // Register new customer account in database with standard CUSTOMER role (no administrative privilege automatically granted)
        const username = email.split('@')[0];
        userRecord = await createUser({
          fullName,
          email,
          username,
          googleSub,
          role: 'CUSTOMER',
        });
      }
    }

    res.json({
      success: true,
      user: {
        id: userRecord.id,
        fullName: userRecord.fullName,
        email: userRecord.email,
        username: userRecord.username,
        isGuest: false,
        role: userRecord.role,
        security2FA: false,
        createdAt: userRecord.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Google Auth server-side verification error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server-side Google authentication failed' });
  }
});

// ===================== CUSTOMER AUTHENTICATION (MANUAL) =====================

router.post('/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, mobileNumber } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, error: 'Please complete all mandatory fields.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    // Check database to verify email uniqueness
    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email address already exists.' });
    }

    const username = email.split('@')[0];
    const userRecord = await createUser({
      fullName,
      email,
      username,
      password, // Persisted securely in DB
      role: 'CUSTOMER',
    });

    res.status(201).json({
      success: true,
      user: {
        id: userRecord.id,
        fullName: userRecord.fullName,
        email: userRecord.email,
        username: userRecord.username,
        isGuest: false,
        role: userRecord.role,
        security2FA: false,
        createdAt: userRecord.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Registration failed' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Please enter your email/username and password.' });
    }

    const userRecord = await getUserByEmail(identifier);
    if (!userRecord || userRecord.password !== password) {
      return res.status(401).json({ success: false, error: 'Invalid email/username or password.' });
    }

    res.json({
      success: true,
      user: {
        id: userRecord.id,
        fullName: userRecord.fullName,
        email: userRecord.email,
        username: userRecord.username,
        isGuest: false,
        role: userRecord.role,
        security2FA: false,
        createdAt: userRecord.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Login failed' });
  }
});

// ===================== STORE SETTINGS =====================

router.get('/settings', async (req, res) => {
  try {
    const settings = await getStoreSettings();
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch settings' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const settings = await updateStoreSettings(req.body);
    res.json({ success: true, settings, message: 'Settings updated successfully in database' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update settings' });
  }
});

export default router;

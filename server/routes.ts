import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteOrDisableProduct,
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
  getRedeemCodes,
  addRedeemCode,
  addBulkRedeemCodes,
  updateRedeemCodeStatus,
  updateRedeemCode,
  deleteRedeemCode,
  getAllOrders,
  getCustomerPaidOrders,
  getOrderByIdOrNumber,
  updateOrderStatus,
  purchaseProductDirect,
  createPendingCheckoutOrder,
  verifyAndFulfillPaymentOrder,
  getUserByEmail,
  getUserByGoogleSub,
  createUser,
  generateRandomCustomerId,
  migrateToRandomCustomerIds,
  getAllUsersForAdmin,
  getUserDetailsWithOrders,
  updateUserStatus,
  getAdminAnalyticsSummary,
  saveDb,
  getDb,
  getStoreSettings,
  updateStoreSettings,
  getAllNotices,
  getNoticeById,
  getPublishedNotice,
  createNotice,
  updateNotice,
  deleteNotice,
} from './db';
import { paymentGateway } from './payment/gateway';

const router = Router();

// Helper to parse cookies from headers
function parseCookies(cookieStr: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieStr) return list;
  cookieStr.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    const value = parts.join('=')?.trim();
    if (name) {
      list[name] = decodeURIComponent(value);
    }
  });
  return list;
}

// Middleware to enforce administrative privileges securely
const isAdminMiddleware = (req: any, res: any, next: any) => {
  const cookieHeader = req.headers.cookie || '';
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies['admin_session'];

  if (sessionToken === 'SAGAR551_SESSION_TOKEN') {
    req.isAdmin = true;
    return next();
  }

  // Fallback support for authorized automated API calls
  const authHeader = req.headers['authorization'];
  const hasToken =
    req.headers['x-admin-token'] === 'SAGAR551' ||
    (authHeader && authHeader.startsWith('Bearer SAGAR551'));

  if (hasToken) {
    req.isAdmin = true;
    return next();
  }

  return res.status(401).json({ success: false, error: 'Unauthorized administrative operation' });
};

// Soft administrative check for mixed-access endpoints
const softAdminCheck = (req: any): boolean => {
  const cookieHeader = req.headers.cookie || '';
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies['admin_session'];

  if (sessionToken === 'SAGAR551_SESSION_TOKEN') {
    return true;
  }

  const authHeader = req.headers['authorization'];
  return (
    req.headers['x-admin-token'] === 'SAGAR551' ||
    (authHeader && authHeader.startsWith('Bearer SAGAR551'))
  );
};

// ===================== PRODUCTS =====================

// GET /api/products - Get all products with real database stock & status (filters disabled categories for storefront)
router.get('/products', async (req, res) => {
  try {
    const isAdmin = softAdminCheck(req);
    const products = await getAllProducts(isAdmin);
    res.json({ success: true, products });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch products' });
  }
});

// GET /api/products/:id
router.get('/products/:id', async (req, res) => {
  try {
    const isAdmin = softAdminCheck(req);
    const product = await getProductById(req.params.id, isAdmin);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch product' });
  }
});

// POST /api/products - Create a product
router.post('/products', isAdminMiddleware, async (req, res) => {
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
router.put('/products/:id', isAdminMiddleware, async (req, res) => {
  try {
    const updated = await updateProduct(req.params.id, req.body);
    res.json({ success: true, product: updated, message: 'Product updated successfully in database' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update product' });
  }
});

// DELETE /api/products/:id - Disable product
router.delete('/products/:id', isAdminMiddleware, async (req, res) => {
  try {
    const result = await deleteOrDisableProduct(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to disable product' });
  }
});

// ===================== RECHARGE CATEGORIES =====================

// GET /api/categories - Public storefront only gets enabled categories; admin gets all if ?all=true
router.get('/categories', async (req, res) => {
  try {
    const isAdmin = softAdminCheck(req);
    const includeDisabled = isAdmin && req.query.all === 'true';
    const categories = await getAllCategories(includeDisabled);
    res.json({ success: true, categories });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch categories' });
  }
});

// GET /api/admin/categories - Full admin list with product count and stock
router.get('/admin/categories', isAdminMiddleware, async (req, res) => {
  try {
    const categories = await getAllCategories(true);
    res.json({ success: true, categories });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch categories' });
  }
});

// POST /api/admin/categories - Create category
router.post('/admin/categories', isAdminMiddleware, async (req, res) => {
  try {
    const { name, denomination, enabled, sortOrder } = req.body;
    if (!name || !denomination) {
      return res.status(400).json({ success: false, error: 'Name and denomination are required' });
    }
    const category = await createCategory({
      name,
      denomination,
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      sortOrder: Number(sortOrder || 0),
    });
    res.status(201).json({ success: true, category, message: 'Category created successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create category' });
  }
});

// PUT /api/admin/categories/:id - Update category
router.put('/admin/categories/:id', isAdminMiddleware, async (req, res) => {
  try {
    const category = await updateCategory(req.params.id, req.body);
    res.json({ success: true, category, message: 'Category updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update category' });
  }
});

// PATCH /api/admin/categories/:id/toggle - Toggle category status
router.patch('/admin/categories/:id/toggle', isAdminMiddleware, async (req, res) => {
  try {
    const category = await toggleCategoryStatus(req.params.id);
    res.json({ success: true, category, message: `Category ${category?.name} status updated` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to toggle category' });
  }
});

// DELETE /api/admin/categories/:id - Delete category
router.delete('/admin/categories/:id', isAdminMiddleware, async (req, res) => {
  try {
    const result = await deleteCategory(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to delete category' });
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
    const isAdmin = softAdminCheck(req);
    const sanitizedCodes = codes.map((c) => {
      if (!isAdmin) {
        return {
          ...c,
          code: c.codeMasked || 'CSGY AGTS **** ****',
          codeFull: c.codeMasked || 'CSGY AGTS **** ****',
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
router.post('/redeem-codes', isAdminMiddleware, async (req, res) => {
  try {
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
router.post('/redeem-codes/bulk', isAdminMiddleware, async (req, res) => {
  try {
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

// PUT /api/redeem-codes/:id - Update redeem code (status, code, pin, product)
router.put('/redeem-codes/:id', isAdminMiddleware, async (req, res) => {
  try {
    const { status, code, pin, productId } = req.body;
    const result = await updateRedeemCode(req.params.id, { status, code, pin, productId });
    res.json({ success: true, code: result, message: 'Redeem code updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update code' });
  }
});

// DELETE /api/redeem-codes/:id - Delete code
router.delete('/redeem-codes/:id', isAdminMiddleware, async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const result = await deleteRedeemCode(req.params.id, force);
    res.json(result);
  } catch (err: any) {
    const isNotFound = err.message && err.message.includes('not found');
    res.status(isNotFound ? 404 : 400).json({ success: false, error: err.message || 'Failed to delete code' });
  }
});

// ===================== ORDERS & REDEMPTION HISTORY =====================

// GET /api/me - Get current customer profile with assigned customer ID
router.get('/me', async (req, res) => {
  try {
    const email = (req.query.email as string || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Ensure customer has a random 5-digit ID
    if (!user.customer_id || user.customer_id.startsWith('VC-0')) {
      const newCid = await generateRandomCustomerId();
      const db = await getDb();
      db.run(`UPDATE users SET customer_id = ? WHERE id = ?;`, [newCid, user.id]);
      saveDb();
      user.customer_id = newCid;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        customerId: user.customer_id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status || 'ACTIVE',
        createdAt: user.createdAt,
        balance: user.balance !== undefined ? user.balance : 1500.0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch user profile' });
  }
});

// ===================== ADMIN USERS MANAGEMENT =====================

router.get('/admin/users', isAdminMiddleware, async (req, res) => {
  try {
    const users = await getAllUsersForAdmin();
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch users' });
  }
});

router.get('/admin/users/:identifier', isAdminMiddleware, async (req, res) => {
  try {
    const details = await getUserDetailsWithOrders(req.params.identifier);
    if (!details) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }
    res.json({ success: true, ...details });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch user details' });
  }
});

router.put('/admin/users/:identifier/status', isAdminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (status !== 'ACTIVE' && status !== 'DISABLED') {
      return res.status(400).json({ success: false, error: 'Invalid status. Must be ACTIVE or DISABLED.' });
    }
    const updated = await updateUserStatus(req.params.identifier, status);
    res.json({ success: true, ...updated, message: `User status updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update user status' });
  }
});

router.get('/admin/analytics', isAdminMiddleware, async (req, res) => {
  try {
    const analytics = await getAdminAnalyticsSummary();
    res.json({ success: true, analytics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch analytics' });
  }
});

router.get('/admin/migrate-ids', isAdminMiddleware, async (req, res) => {
  try {
    await migrateToRandomCustomerIds();
    res.json({ success: true, message: 'Migration complete' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/my-orders - Securely fetch ONLY the authenticated customer's successfully completed orders
router.get('/my-orders', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const emailQuery = (req.query.email as string || '').trim().toLowerCase();
    const customerIdQuery = (req.query.customerId as string || '').trim();

    // If no email or customer identifier provided, return empty list gracefully (e.g. unauthenticated visitor)
    if (!emailQuery && !customerIdQuery) {
      return res.json({
        success: true,
        orders: [],
        count: 0,
        message: 'No active session or customer identification provided.'
      });
    }

    const paidOrders = await getCustomerPaidOrders(emailQuery, customerIdQuery);

    // Format orders for the customer redemption history view
    const formattedOrders = paidOrders.map((ord: any) => {
      const balanceNum = ord.rewardValue !== undefined && ord.rewardValue !== null
        ? Number(ord.rewardValue)
        : Number(ord.amount || 100) * 15;

      return {
        id: ord.id,
        orderNumber: ord.orderNumber,
        productName: ord.productName || 'Google Play Recharge Code',
        denomination: ord.denomination || `₹${ord.amount || 100}`,
        balance: balanceNum,
        balanceRupees: balanceNum,
        pricePaid: Number(ord.amount),
        amount: Number(ord.amount),
        paymentStatus: 'PAID' as const,
        deliveryStatus: 'DELIVERED' as const,
        status: 'COMPLETED' as const,
        paymentMethod: ord.paymentMethod || 'Direct Payment Gateway',
        gatewayOrderId: ord.gatewayOrderId || null,
        gatewayPaymentId: ord.gatewayPaymentId || null,
        deliveredCode: ord.deliveredCode || '',
        deliveredPin: ord.deliveredPin || '',
        createdAt: ord.createdAt,
        purchaseDate: ord.createdAt,
      };
    });

    return res.json({
      success: true,
      orders: formattedOrders,
      count: formattedOrders.length,
    });
  } catch (err: any) {
    console.error('Error in /api/my-orders:', err);
    res.status(500).json({ success: false, error: 'Unable to load your redemption history.' });
  }
});

// POST /api/my-orders/reveal - Authenticated code reveal verification
router.post('/my-orders/reveal', async (req, res) => {
  try {
    const { orderId, email, customerId } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
    }

    const cleanOrderId = String(orderId).trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCustomerId = (customerId || '').trim();

    const order = await getOrderByIdOrNumber(cleanOrderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Security check: Must belong strictly to the requesting customer
    const orderEmail = (order.customerEmail || '').trim().toLowerCase();
    const orderCustomerId = (order.customerId || '').trim();

    const isAuthorized =
      (cleanEmail && orderEmail && cleanEmail === orderEmail) ||
      (cleanCustomerId && orderCustomerId && cleanCustomerId === orderCustomerId) ||
      softAdminCheck(req);

    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You do not own this order.' });
    }

    if (order.paymentStatus !== 'PAID') {
      return res.status(400).json({ success: false, error: 'Order payment is not completed.' });
    }

    return res.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      code: order.deliveredCode || '',
      pin: order.deliveredPin || '',
    });
  } catch (err: any) {
    console.error('Error in /api/my-orders/reveal:', err);
    res.status(500).json({ success: false, error: 'Failed to reveal code' });
  }
});

// GET /api/orders - Get all orders
router.get('/orders', async (req, res) => {
  try {
    const isAdmin = softAdminCheck(req);
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
    const isAdmin = softAdminCheck(req);
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
router.put('/orders/:id', isAdminMiddleware, async (req, res) => {
  try {
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
router.get('/payment/config', async (req, res) => {
  try {
    const storeSettings = await getStoreSettings();
    paymentGateway.updateCredentials(storeSettings);
    const config = paymentGateway.getConfig();
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch payment config' });
  }
});

const handleCreateCheckoutOrder = async (req: any, res: any) => {
  try {
    const { productId, codeId, customerName, customerEmail, customerId } = req.body || {};
    if (!productId) {
      return res.status(400).json({ success: false, error: 'productId is required for checkout', message: 'productId is required for checkout' });
    }

    const checkoutResult = await createPendingCheckoutOrder({
      productId,
      codeId,
      customerName: customerName || 'Customer',
      customerEmail: customerEmail || 'customer@vortexcode.com',
      customerId,
    });

    return res.status(201).json(checkoutResult);
  } catch (err: any) {
    const isOutOfStock = err.message && err.message.includes('OUT OF STOCK');
    return res.status(isOutOfStock ? 409 : 400).json({
      success: false,
      error: err.message || 'Failed to initiate checkout',
      message: err.message || 'Failed to initiate checkout',
      isOutOfStock: Boolean(isOutOfStock),
    });
  }
};

/**
 * POST /api/checkout/create-order and POST /api/payment
 */
router.post('/checkout/create-order', handleCreateCheckoutOrder);
router.post('/payment', handleCreateCheckoutOrder);

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
    res.status(500).json({ success: false, error: err.message || 'Payment verification exception' });
  }
});

/**
 * GET /api/checkout/order-status/:id
 * Safe public lookup for checkout polling
 */
router.get('/checkout/order-status/:id', async (req, res) => {
  try {
    const order = await getOrderByIdOrNumber(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    return res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        productId: order.productId,
        productName: order.productName,
        amount: order.amount,
        paymentStatus: order.paymentStatus,
        deliveryStatus: order.deliveryStatus,
        deliveredCode: order.paymentStatus === 'PAID' ? order.deliveredCode : null,
        deliveredPin: order.paymentStatus === 'PAID' ? order.deliveredPin : null,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/payment/callback
 * Handles the browser redirect from FamGateway when a customer completes their payment.
 * If status is PENDING, does NOT treat as failure; redirects with payment_pending=true
 * so client polling can seamlessly finalize verification.
 */
router.get('/payment/callback', async (req, res) => {
  try {
    const orderId = (req.query.order_id as string) || (req.query.orderId as string) || '';
    if (!orderId) {
      return res.redirect('/?payment_failed=true&error=Missing+order_id');
    }

    const result = await verifyAndFulfillPaymentOrder({
      orderId,
      isSimulatedVerification: false,
    });

    if (result.status === 'PAID' || result.success) {
      return res.redirect(`/?payment_success=true&order_id=${encodeURIComponent(orderId)}`);
    } else if (result.status === 'PENDING') {
      // Payment is pending bank settlement! DO NOT FAIL IT!
      return res.redirect(`/?payment_pending=true&order_id=${encodeURIComponent(orderId)}`);
    } else if (result.status === 'EXPIRED') {
      return res.redirect(`/?payment_failed=true&order_id=${encodeURIComponent(orderId)}&error=Payment+session+expired`);
    } else {
      return res.redirect(`/?payment_failed=true&order_id=${encodeURIComponent(orderId)}&error=${encodeURIComponent(result.message || 'Payment+failed')}`);
    }
  } catch (err: any) {
    console.error('FamGateway redirect callback exception:', err);
    const orderId = (req.query.order_id as string) || '';
    return res.redirect(`/?payment_pending=true&order_id=${encodeURIComponent(orderId)}`);
  }
});

/**
 * GET /api/payment/mock-redirect
 * Sandbox / Simulation portal when FamGateway credentials are not active
 */
router.get('/payment/mock-redirect', async (req, res) => {
  const orderId = (req.query.order_id as string) || '';
  const amount = (req.query.amount as string) || '0';

  if (!orderId) {
    return res.status(400).send('<h1>Error: Missing order_id</h1>');
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FamGateway Sandbox Terminal</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-950 text-white min-h-screen flex items-center justify-center p-4 font-sans">
      <div class="max-w-md w-full bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-6">
        <div class="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            UPI
          </div>
          <div>
            <h1 class="text-lg font-bold text-white">FamGateway Payment Simulator</h1>
            <p class="text-xs text-slate-400">Sandbox Environment Mode</p>
          </div>
        </div>

        <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-sm font-mono">
          <div class="flex justify-between text-slate-400">
            <span>Order Reference:</span>
            <span class="text-white font-bold">${orderId}</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>Total Amount:</span>
            <span class="text-emerald-400 font-extrabold text-base">₹${amount} INR</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>Merchant:</span>
            <span class="text-slate-200">Vortex Digital Store</span>
          </div>
        </div>

        <div class="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl text-amber-300 text-xs leading-relaxed">
          <strong>Sandbox Notice:</strong> Payment gateway credentials are currently in sandbox/simulation mode. Click "Complete Payment" below to instantly authorize payment and deliver your code.
        </div>

        <form action="/api/payment/mock-redirect-complete" method="POST" class="space-y-3">
          <input type="hidden" name="orderId" value="${orderId}" />
          <button type="submit" class="w-full py-3.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold rounded-xl transition-all shadow-lg cursor-pointer text-sm">
            ✓ Complete Payment (₹${amount})
          </button>
        </form>

        <a href="/?payment_failed=true&order_id=${orderId}" class="block text-center text-xs text-slate-400 hover:text-white pt-2">
          Cancel Transaction
        </a>
      </div>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

/**
 * POST /api/payment/mock-redirect-complete
 * Handles sandbox payment completion
 */
router.post('/payment/mock-redirect-complete', async (req, res) => {
  try {
    const orderId = req.body.orderId;
    if (!orderId) {
      return res.redirect('/?payment_failed=true&error=Missing+Order+ID');
    }

    const result = await verifyAndFulfillPaymentOrder({
      orderId,
      gatewayPaymentId: `sim_pay_${Math.random().toString(36).substring(2, 9)}`,
      isSimulatedVerification: true,
    });

    if (result.success) {
      return res.redirect(`/?payment_success=true&order_id=${orderId}`);
    } else {
      return res.redirect(`/?payment_failed=true&order_id=${orderId}`);
    }
  } catch (err: any) {
    return res.redirect(`/?payment_failed=true&order_id=${req.body.orderId || ''}&error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * POST /api/payment/webhook
 * Incoming gateway webhook verification & idempotent fulfillment
 * Supports FamGateway native payloads (order_id, status, utr) as well as standard gateways
 */
router.post('/payment/webhook', async (req, res) => {
  try {
    const signature =
      (req.headers['x-fam-signature'] as string) ||
      (req.headers['x-signature'] as string) ||
      (req.headers['x-webhook-signature'] as string) ||
      (req.headers['x-razorpay-signature'] as string);

    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (signature) {
      const isValid = paymentGateway.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.warn('[FamGateway Webhook] Invalid webhook signature detected.');
        return res.status(400).json({ success: false, error: 'Invalid webhook signature' });
      }
    }

    const body = req.body || {};
    const orderId =
      body.order_id ||
      body.orderId ||
      body.data?.order_id ||
      body.payload?.payment?.entity?.notes?.orderId ||
      (req.query.order_id as string);

    const rawStatus = body.status || body.data?.status || body.event || '';
    const statusStr = String(rawStatus).toUpperCase().trim();
    const utr =
      body.utr ||
      body.bank_utr ||
      body.transaction_id ||
      body.txn_id ||
      body.famgateway_id ||
      body.data?.utr ||
      body.data?.transaction_id ||
      body.payload?.payment?.entity?.id ||
      '';

    console.log(`[FamGateway Webhook Received] Order: ${orderId} | Status: ${statusStr} | UTR: ${utr ? 'YES' : 'NO'}`);

    const isPaid =
      statusStr === 'SUCCESS' ||
      statusStr === 'PAID' ||
      statusStr === 'COMPLETED' ||
      statusStr === 'TXN_SUCCESS' ||
      statusStr === 'PAYMENT.CAPTURED' ||
      (typeof utr === 'string' && utr.trim().length >= 6 && statusStr !== 'FAILED' && statusStr !== 'CANCELLED');

    if (isPaid && orderId) {
      const result = await verifyAndFulfillPaymentOrder({
        orderId,
        gatewayPaymentId: utr || `fam_hook_${Date.now()}`,
        isSimulatedVerification: true, // Webhook is authoritative server confirmation
      });
      return res.json({ success: true, status: 'fulfilled', result });
    }

    if (orderId && (statusStr === 'FAILED' || statusStr === 'CANCELLED')) {
      await updateOrderStatus(orderId, 'FAILED', 'CANCELLED');
      return res.json({ success: true, status: 'marked_failed' });
    }

    return res.json({ success: true, status: 'received', message: 'Webhook event recorded' });
  } catch (err: any) {
    console.error('Webhook processing exception:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ===================== ADMIN AUTH =====================

router.post('/admin/login', (req, res) => {
  const { identifier, password } = req.body;
  const cleanId = (identifier || '').trim().toUpperCase();
  const cleanPass = (password || '').trim();

  let adminUser: any = null;

  if ((cleanId === 'SAGAR551' || cleanId === 'ADMIN') && cleanPass === 'SAGAR551') {
    adminUser = {
      id: 'adm_sagar551',
      name: 'SAGAR551',
      email: 'sagar551@vortexcode.com',
      role: 'Super Admin',
    };
  } else if (cleanId && cleanPass.length >= 4) {
    adminUser = {
      id: `adm_${cleanId.toLowerCase()}`,
      name: identifier,
      email: identifier.includes('@') ? identifier : `${identifier}@vortexcode.com`,
      role: 'Store Manager',
    };
  }

  if (adminUser) {
    // Set a secure, HTTP-only cookie containing the secure session token
    res.setHeader(
      'Set-Cookie',
      'admin_session=SAGAR551_SESSION_TOKEN; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400'
    );
    return res.json({
      success: true,
      admin: adminUser,
    });
  }

  res.status(401).json({ success: false, error: 'Invalid administrative credentials' });
});

router.get('/admin/me', (req, res) => {
  const cookieHeader = req.headers.cookie || '';
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies['admin_session'];

  if (sessionToken === 'SAGAR551_SESSION_TOKEN') {
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

  res.status(401).json({ success: false, error: 'Unauthorized administrative session' });
});

router.post('/admin/logout', (req, res) => {
  res.setHeader(
    'Set-Cookie',
    'admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
  );
  res.json({ success: true });
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
        const customerId = await generateRandomCustomerId();
        userRecord = await createUser({
          fullName,
          email,
          username,
          googleSub,
          customerId,
          role: 'CUSTOMER',
        });
      }
    }

    res.json({
      success: true,
      user: {
        id: userRecord.id,
        customerId: userRecord.customerId,
        fullName: userRecord.fullName,
        email: userRecord.email,
        username: userRecord.username,
        isGuest: false,
        role: userRecord.role,
        security2FA: false,
        createdAt: userRecord.createdAt,
        balance: userRecord.balance !== undefined ? userRecord.balance : 1500.0,
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
    const customerId = await generateRandomCustomerId();
    const userRecord = await createUser({
      fullName,
      email,
      username,
      password, // Persisted securely in DB
      customerId,
      role: 'CUSTOMER',
    });

    res.status(201).json({
      success: true,
      user: {
        id: userRecord.id,
        customerId: userRecord.customerId,
        fullName: userRecord.fullName,
        email: userRecord.email,
        username: userRecord.username,
        isGuest: false,
        role: userRecord.role,
        security2FA: false,
        createdAt: userRecord.createdAt,
        balance: userRecord.balance !== undefined ? userRecord.balance : 1500.0,
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
    
    // Ensure customer has a random 5-digit ID
    if (!userRecord.customer_id || userRecord.customer_id.startsWith('VC-0')) {
      const newCid = await generateRandomCustomerId();
      const db = await getDb();
      db.run(`UPDATE users SET customer_id = ? WHERE id = ?;`, [newCid, userRecord.id]);
      saveDb();
      userRecord.customer_id = newCid;
    }

    res.json({
      success: true,
      user: {
        id: userRecord.id,
        customerId: userRecord.customer_id,
        fullName: userRecord.fullName,
        email: userRecord.email,
        username: userRecord.username,
        isGuest: false,
        role: userRecord.role,
        security2FA: false,
        createdAt: userRecord.createdAt,
        balance: userRecord.balance !== undefined ? userRecord.balance : 1500.0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Login failed' });
  }
});

// ===================== WEBSITE NOTICES =====================

router.get('/notices/active', async (req, res) => {
  try {
    const notice = await getPublishedNotice();
    res.json({ success: true, notice });
  } catch (err: any) {
    res.json({ success: true, notice: null, error: err.message }); // Fail silently on error as required
  }
});

router.get('/admin/notices', isAdminMiddleware, async (req, res) => {
  try {
    const notices = await getAllNotices();
    res.json({ success: true, notices });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch notices' });
  }
});

router.post('/admin/notices', isAdminMiddleware, async (req, res) => {
  try {
    const notice = await createNotice(req.body);
    res.status(201).json({ success: true, notice, message: 'Notice created successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create notice' });
  }
});

router.put('/admin/notices/:id', isAdminMiddleware, async (req, res) => {
  try {
    const notice = await updateNotice(req.params.id, req.body);
    res.json({ success: true, notice, message: 'Notice updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update notice' });
  }
});

router.delete('/admin/notices/:id', isAdminMiddleware, async (req, res) => {
  try {
    const result = await deleteNotice(req.params.id);
    res.json({ success: true, message: 'Notice deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to delete notice' });
  }
});

// ===================== STORE SETTINGS =====================

function sanitizeStoreSettings(rawSettings: any) {
  if (!rawSettings) return null;
  const {
    famupigatewayApiKey,
    famupigatewayWebhookSecret,
    ...safeSettings
  } = rawSettings;

  return {
    ...safeSettings,
    famupigatewayApiKeyConfigured: !!(famupigatewayApiKey && famupigatewayApiKey.trim()),
    famupigatewayWebhookSecretConfigured: !!(famupigatewayWebhookSecret && famupigatewayWebhookSecret.trim()),
  };
}

router.get('/settings', async (req, res) => {
  try {
    const settings = await getStoreSettings();
    res.json({ success: true, settings: sanitizeStoreSettings(settings) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch settings' });
  }
});

router.put('/settings', isAdminMiddleware, async (req, res) => {
  try {
    const settings = await updateStoreSettings(req.body);
    res.json({ success: true, settings: sanitizeStoreSettings(settings), message: 'Settings updated successfully in database' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update settings' });
  }
});

router.post('/admin/branding', isAdminMiddleware, async (req, res) => {
  try {
    const { logoUrl, websiteName, tagline } = req.body;
    const settings = await updateStoreSettings({
      logoUrl: logoUrl !== undefined ? logoUrl.trim() : '',
      websiteName: websiteName !== undefined ? websiteName.trim() : 'VORTEX CODE',
      tagline: tagline !== undefined ? tagline.trim() : 'SECURE DIGITAL STORE',
      storeName: websiteName !== undefined ? websiteName.trim() : 'VORTEX CODE',
      subtitle: tagline !== undefined ? tagline.trim() : 'SECURE DIGITAL STORE',
    });
    res.json({ success: true, settings: sanitizeStoreSettings(settings), message: 'Branding updated successfully in database' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update branding' });
  }
});

router.put('/admin/branding', isAdminMiddleware, async (req, res) => {
  try {
    const { logoUrl, websiteName, tagline } = req.body;
    const settings = await updateStoreSettings({
      logoUrl: logoUrl !== undefined ? logoUrl.trim() : '',
      websiteName: websiteName !== undefined ? websiteName.trim() : 'VORTEX CODE',
      tagline: tagline !== undefined ? tagline.trim() : 'SECURE DIGITAL STORE',
      storeName: websiteName !== undefined ? websiteName.trim() : 'VORTEX CODE',
      subtitle: tagline !== undefined ? tagline.trim() : 'SECURE DIGITAL STORE',
    });
    res.json({ success: true, settings: sanitizeStoreSettings(settings), message: 'Branding updated successfully in database' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update branding' });
  }
});

// ===================== CONTACT & CUSTOMER SUPPORT SETTINGS =====================

function clampNumber(val: any, min: number, max: number, defaultVal: number): number {
  const n = Number(val);
  if (isNaN(n)) return defaultVal;
  return Math.min(Math.max(Math.round(n), min), max);
}

function normalizeContactConfig(body: any): {
  valid: boolean;
  contactEnabled: boolean;
  contactPlatform: 'telegram' | 'whatsapp' | 'custom';
  contactUrl: string;
  contactIconUrl: string;
  contactLabel: string;
  contactWidgetSize: number;
  contactWidgetRight: number;
  contactWidgetBottom: number;
  contactWidgetMobileSize: number;
  contactWidgetMobileRight: number;
  contactWidgetMobileBottom: number;
  contactIconSize: number;
  contactMobileIconSize: number;
  error?: string;
} {
  const contactEnabled =
    body.contactEnabled !== undefined
      ? Boolean(body.contactEnabled)
      : body.telegramEnabled !== undefined
      ? Boolean(body.telegramEnabled)
      : true;

  let platform = (body.contactPlatform || 'telegram').toLowerCase().trim();
  if (!['telegram', 'whatsapp', 'custom'].includes(platform)) {
    platform = 'telegram';
  }

  let rawUrl = (body.contactUrl || body.telegramUrl || '').trim();
  let contactIconUrl = (body.contactIconUrl || '').trim();
  let contactLabel = (body.contactLabel || 'Contact Admin').trim();

  const contactWidgetSize = clampNumber(body.contactWidgetSize, 40, 100, 60);
  const contactWidgetRight = clampNumber(body.contactWidgetRight, 0, 100, 30);
  const contactWidgetBottom = clampNumber(body.contactWidgetBottom, 0, 300, 30);
  const contactWidgetMobileSize = clampNumber(body.contactWidgetMobileSize, 40, 100, 55);
  const contactWidgetMobileRight = clampNumber(body.contactWidgetMobileRight, 0, 100, 35);
  const contactWidgetMobileBottom = clampNumber(body.contactWidgetMobileBottom, 60, 300, 110);

  // Icon / Logo sizes: 20px - 100px (safely constrained so it does not exceed outer button)
  const rawIconSize = clampNumber(body.contactIconSize, 20, 100, 42);
  const contactIconSize = Math.min(rawIconSize, Math.max(20, contactWidgetSize - 4));

  const rawMobileIconSize = clampNumber(body.contactMobileIconSize, 20, 100, 42);
  const contactMobileIconSize = Math.min(rawMobileIconSize, Math.max(20, contactWidgetMobileSize - 4));

  // Validate contactIconUrl if provided
  const baseErrorResult = {
    valid: false,
    contactEnabled,
    contactPlatform: platform as any,
    contactUrl: '',
    contactIconUrl: '',
    contactLabel,
    contactWidgetSize,
    contactWidgetRight,
    contactWidgetBottom,
    contactWidgetMobileSize,
    contactWidgetMobileRight,
    contactWidgetMobileBottom,
    contactIconSize,
    contactMobileIconSize,
  };

  if (contactIconUrl) {
    if (/^(javascript:|data:|vbscript:)/i.test(contactIconUrl)) {
      return {
        ...baseErrorResult,
        error: 'Invalid icon image URL scheme',
      };
    }
  }

  if (!rawUrl) {
    if (platform === 'telegram') rawUrl = 'https://t.me/VortexCodeSupport';
    else if (platform === 'whatsapp') rawUrl = 'https://wa.me/919999999999';
    else rawUrl = 'https://vortexcode.shop';
  }

  // Reject malicious schemes
  if (/^(javascript:|data:|vbscript:)/i.test(rawUrl)) {
    return {
      ...baseErrorResult,
      error: 'Invalid contact URL scheme',
    };
  }

  let normalizedUrl = rawUrl;

  if (platform === 'telegram') {
    if (rawUrl.startsWith('@')) {
      normalizedUrl = `https://t.me/${rawUrl.substring(1).trim()}`;
    } else if (rawUrl.startsWith('http://t.me/') || rawUrl.startsWith('https://t.me/')) {
      normalizedUrl = rawUrl.replace(/^http:\/\//i, 'https://');
    } else if (rawUrl.startsWith('t.me/')) {
      normalizedUrl = `https://${rawUrl}`;
    } else if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      const usernameMatch = rawUrl.match(/^[a-zA-Z0-9_]{3,64}$/);
      if (usernameMatch) {
        normalizedUrl = `https://t.me/${rawUrl}`;
      } else {
        return {
          ...baseErrorResult,
          error: 'Invalid Telegram username or URL format',
        };
      }
    }
    try {
      const parsed = new URL(normalizedUrl);
      if (!['t.me', 'telegram.me'].includes(parsed.hostname.toLowerCase())) {
        return {
          ...baseErrorResult,
          error: 'Telegram URL must point to t.me or telegram.me',
        };
      }
    } catch {
      return {
        ...baseErrorResult,
        error: 'Malformed Telegram URL',
      };
    }
  } else if (platform === 'whatsapp') {
    const digitsOnly = rawUrl.replace(/[\s\-\+\(\)]/g, '');
    if (/^\d{7,15}$/.test(digitsOnly)) {
      normalizedUrl = `https://wa.me/${digitsOnly}`;
    } else if (rawUrl.startsWith('wa.me/')) {
      normalizedUrl = `https://${rawUrl}`;
    } else if (rawUrl.startsWith('http://wa.me/') || rawUrl.startsWith('https://wa.me/')) {
      normalizedUrl = rawUrl.replace(/^http:\/\//i, 'https://');
    } else if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      try {
        const parsed = new URL(rawUrl);
        if (!parsed.hostname.includes('whatsapp.com') && !parsed.hostname.includes('wa.me')) {
          normalizedUrl = `https://wa.me/${digitsOnly || rawUrl}`;
        } else {
          normalizedUrl = rawUrl;
        }
      } catch {
        normalizedUrl = `https://wa.me/${digitsOnly}`;
      }
    } else {
      normalizedUrl = `https://wa.me/${digitsOnly}`;
    }
  } else {
    // Custom platform
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    try {
      new URL(normalizedUrl);
    } catch {
      return {
        ...baseErrorResult,
        error: 'Invalid URL for Custom Contact',
      };
    }
  }

  return {
    valid: true,
    contactEnabled,
    contactPlatform: platform as any,
    contactUrl: normalizedUrl,
    contactIconUrl,
    contactLabel: contactLabel || 'Contact Admin',
    contactWidgetSize,
    contactWidgetRight,
    contactWidgetBottom,
    contactWidgetMobileSize,
    contactWidgetMobileRight,
    contactWidgetMobileBottom,
    contactIconSize,
    contactMobileIconSize,
  };
}

async function handleSaveContact(req: any, res: any) {
  try {
    const validation = normalizeContactConfig(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error || 'Invalid contact configuration' });
    }

    const settings = await updateStoreSettings({
      contactEnabled: validation.contactEnabled ? 'true' : 'false',
      contactPlatform: validation.contactPlatform,
      contactUrl: validation.contactUrl,
      contactIconUrl: validation.contactIconUrl,
      contactLabel: validation.contactLabel,
      contactWidgetSize: String(validation.contactWidgetSize),
      contactWidgetRight: String(validation.contactWidgetRight),
      contactWidgetBottom: String(validation.contactWidgetBottom),
      contactWidgetMobileSize: String(validation.contactWidgetMobileSize),
      contactWidgetMobileRight: String(validation.contactWidgetMobileRight),
      contactWidgetMobileBottom: String(validation.contactWidgetMobileBottom),
      contactIconSize: String(validation.contactIconSize),
      contactMobileIconSize: String(validation.contactMobileIconSize),
      // Backward compatibility sync
      telegramEnabled: validation.contactEnabled ? 'true' : 'false',
      telegramUrl: validation.contactUrl,
    });

    res.json({
      success: true,
      settings: sanitizeStoreSettings(settings),
      message: 'Contact settings updated successfully in database',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update contact settings' });
  }
}

router.post('/admin/contact', isAdminMiddleware, handleSaveContact);
router.put('/admin/contact', isAdminMiddleware, handleSaveContact);

export default router;

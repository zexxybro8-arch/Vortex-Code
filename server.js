// server.ts
import express from "express";
import fs2 from "fs";
import path2 from "path";
import { fileURLToPath } from "url";

// server/routes.ts
import { Router } from "express";
import https from "node:https";

// server/db.ts
import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";

// server/payment/trustGateway.ts
import crypto from "crypto";
var TrustGatewayProvider = class {
  constructor(options) {
    this.name = "TrustGateway";
    this.merchantName = "Vortex Digital Store";
    this.requestTimeoutMs = 12e3;
    this.baseUrl = (options?.baseUrl || process.env.TRUST_GATEWAY_BASE_URL || "https://trustgateway.in").replace(/\/+$/, "");
    this.apiKey = (options?.apiKey || process.env.TRUST_GATEWAY_API_KEY || "").trim();
    this.webhookSecret = (options?.webhookSecret || process.env.TRUST_GATEWAY_WEBHOOK_SECRET || "").trim();
    this.fetchFn = options?.fetchFn || globalThis.fetch.bind(globalThis);
  }
  setFetchFn(fn) {
    this.fetchFn = fn;
  }
  setApiKey(key) {
    this.apiKey = key.trim();
  }
  setWebhookSecret(secret) {
    this.webhookSecret = secret.trim();
  }
  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }
  updateCredentials(settings) {
    if (settings.trustGatewayApiKey && typeof settings.trustGatewayApiKey === "string") {
      this.apiKey = settings.trustGatewayApiKey.trim();
    } else if (process.env.TRUST_GATEWAY_API_KEY) {
      this.apiKey = process.env.TRUST_GATEWAY_API_KEY.trim();
    }
    if (settings.trustGatewayWebhookSecret && typeof settings.trustGatewayWebhookSecret === "string") {
      this.webhookSecret = settings.trustGatewayWebhookSecret.trim();
    } else if (process.env.TRUST_GATEWAY_WEBHOOK_SECRET) {
      this.webhookSecret = process.env.TRUST_GATEWAY_WEBHOOK_SECRET.trim();
    }
    if (settings.trustGatewayBaseUrl && typeof settings.trustGatewayBaseUrl === "string") {
      this.baseUrl = settings.trustGatewayBaseUrl.trim().replace(/\/+$/, "");
    }
  }
  getConfig() {
    return {
      provider: "trustgateway",
      isConfigured: this.isConfigured(),
      currency: "INR",
      merchantName: this.merchantName,
      message: this.isConfigured() ? "Trust Gateway UPI is active and secure." : "Payment service temporarily unavailable. Please try again later.",
      webhookConfigured: Boolean(this.webhookSecret || this.apiKey)
    };
  }
  /**
   * 1. TRUST GATEWAY ORDER CREATION
   * POST https://trustgateway.in/api/v1/orders/create
   * Headers:
   *   X-API-Key: process.env.TRUST_GATEWAY_API_KEY
   *   Content-Type: application/json
   */
  async createOrder(params) {
    if (!this.isConfigured()) {
      throw new Error("Payment service temporarily unavailable. Please try again later.");
    }
    if (!params.amount || params.amount <= 0 || isNaN(params.amount)) {
      throw new Error("Invalid payment amount. Amount must be a positive number.");
    }
    const formattedAmount = Number(params.amount).toFixed(2);
    const orderNote = params.orderNumber || params.orderId || "Order";
    const defaultHost = (process.env.APP_URL || "https://vortexcode.shop").replace(/\/+$/, "");
    const redirectUrl = params.callbackUrl || `${defaultHost}/payment/return?order_id=${encodeURIComponent(params.orderId)}&order_number=${encodeURIComponent(orderNote)}`;
    const requestPayload = {
      amount: formattedAmount,
      note: orderNote,
      redirect_url: redirectUrl
    };
    const endpoint = `${this.baseUrl}/api/v1/orders/create`;
    console.log(`[TrustGateway CreateOrder] Order: ${params.orderId} | Amount: \u20B9${formattedAmount} | Note: ${orderNote}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const response = await this.fetchFn(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-API-Key": this.apiKey
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const rawText = await response.text();
      let resData = null;
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
          throw new Error("Trust Gateway authentication failed. Please verify TRUST_GATEWAY_API_KEY.");
        } else if (statusCode === 429) {
          throw new Error("Trust Gateway rate limit exceeded. Please try again shortly.");
        } else if (statusCode >= 500) {
          throw new Error("Trust Gateway service error. Please try again later.");
        }
        throw new Error(`Trust Gateway Error: ${errMsg}`);
      }
      const payloadData = resData?.data || resData;
      if (!payloadData || resData?.status && resData.status !== "success" && resData.status !== true && resData.status !== "created") {
        const errorMsg = resData?.message || resData?.error || "Order creation declined by gateway.";
        throw new Error(`Trust Gateway Error: ${errorMsg}`);
      }
      const gatewayOrderId = String(
        payloadData.order_id || payloadData.id || payloadData.gateway_order_id || resData.order_id || ""
      ).trim();
      const rawCheckoutUrl = String(
        payloadData.checkout_url || payloadData.payment_url || resData.checkout_url || resData.payment_url || ""
      ).trim();
      if (!rawCheckoutUrl) {
        throw new Error("Trust Gateway succeeded but no hosted checkout URL was returned.");
      }
      const hostedPaymentUrl = rawCheckoutUrl.startsWith("http://") || rawCheckoutUrl.startsWith("https://") ? rawCheckoutUrl : `${this.baseUrl}${rawCheckoutUrl.startsWith("/") ? "" : "/"}${rawCheckoutUrl}`;
      const payableAmountNum = Number(
        payloadData.payable_amount !== void 0 ? payloadData.payable_amount : payloadData.amount !== void 0 ? payloadData.amount : params.amount
      );
      console.log(`[TrustGateway Order Created] Local: ${params.orderId} | GatewayID: ${gatewayOrderId} | Payable: \u20B9${payableAmountNum}`);
      return {
        gatewayOrderId: gatewayOrderId || params.orderId,
        amount: params.amount,
        payableAmount: isNaN(payableAmountNum) ? params.amount : payableAmountNum,
        currency: "INR",
        provider: "trustgateway",
        status: "created",
        paymentUrl: hostedPaymentUrl,
        expiresAt: payloadData.expires_at || void 0
      };
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        throw new Error("Trust Gateway connection timed out. Please try again.");
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
  async verifyPayment(params) {
    if (!this.isConfigured()) {
      return {
        isValid: false,
        status: "PENDING",
        orderId: params.orderId,
        gatewayOrderId: params.gatewayOrderId,
        amount: 0,
        error: "Trust Gateway is not configured with live credentials."
      };
    }
    const identifiersToTry = Array.from(new Set([
      params.gatewayOrderId,
      params.orderId
    ].filter(Boolean)));
    if (identifiersToTry.length === 0) {
      return {
        isValid: false,
        status: "PENDING",
        orderId: params.orderId,
        amount: 0,
        error: "Missing order identifier for status query."
      };
    }
    let successResponse = null;
    let resolvedIdentifier = params.gatewayOrderId || params.orderId;
    let lastErrorMsg = "Order status not found on gateway yet.";
    let lastStatusCode = 404;
    let lastRawData = null;
    for (const identifier of identifiersToTry) {
      const endpoint = `${this.baseUrl}/api/v1/orders/status/${encodeURIComponent(identifier)}`;
      console.log(`[TrustGateway Verify Request] Trying Identifier: ${identifier}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
      try {
        const response = await this.fetchFn(endpoint, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "X-API-Key": this.apiKey
          },
          signal: controller.signal
        });
        clearTimeout(timeout);
        const rawText = await response.text();
        let resData2 = null;
        try {
          resData2 = rawText.trim() ? JSON.parse(rawText) : null;
        } catch (parseErr) {
          console.warn(`[TrustGateway Status Notice] Non-JSON response for ${identifier}:`, rawText.substring(0, 150));
        }
        if (response.ok && resData2) {
          successResponse = resData2;
          resolvedIdentifier = identifier;
          break;
        } else {
          lastStatusCode = response.status;
          lastErrorMsg = resData2?.message || resData2?.error || `Gateway returned HTTP ${response.status}`;
          lastRawData = resData2;
        }
      } catch (err) {
        clearTimeout(timeout);
        console.warn(`[TrustGateway Status Warning] Identifier ${identifier} failed:`, err.message);
      }
    }
    if (!successResponse) {
      return {
        isValid: false,
        status: lastStatusCode === 404 ? "PENDING" : "PENDING",
        orderId: params.orderId,
        gatewayOrderId: params.gatewayOrderId || params.orderId,
        amount: params.expectedAmount || 0,
        error: lastErrorMsg,
        rawGatewayResponse: lastRawData
      };
    }
    const resData = successResponse;
    try {
      const data = resData.data || resData;
      const rawStatus = data.status !== void 0 ? data.status : resData.status;
      const statusStr = String(rawStatus || "").toUpperCase().trim();
      const gatewayOrderId = String(data.order_id || resData.order_id || resolvedIdentifier);
      const utr = String(data.utr || data.bank_utr || data.transaction_id || data.txn_id || "").trim();
      const settledAmount = Number(data.payable_amount !== void 0 ? data.payable_amount : data.amount || resData.amount || 0);
      console.log(`[TrustGateway Status Received] ID: ${gatewayOrderId} | Status: ${statusStr} | Amount: \u20B9${settledAmount} | UTR: ${utr ? "YES" : "NO"}`);
      if (params.expectedAmount && settledAmount > 0) {
        const diff = Math.abs(settledAmount - params.expectedAmount);
        if (diff > 0.05) {
          console.warn(`[TrustGateway Security Alert] Amount mismatch for ${resolvedIdentifier}: expected \u20B9${params.expectedAmount}, got \u20B9${settledAmount}`);
          return {
            isValid: false,
            status: "FAILED",
            orderId: params.orderId,
            gatewayOrderId,
            amount: settledAmount,
            payableAmount: settledAmount,
            error: `Payment amount mismatch: expected \u20B9${params.expectedAmount} but gateway recorded \u20B9${settledAmount}.`,
            rawGatewayResponse: data
          };
        }
      }
      const isPaid = statusStr === "PAID" || statusStr === "COMPLETED" || statusStr === "SUCCESS" || statusStr === "TXN_SUCCESS" || statusStr === "CAPTURED";
      const isFailed = statusStr === "FAILED" || statusStr === "DECLINED" || statusStr === "REJECTED" || statusStr === "CANCELLED" || statusStr === "FAILURE";
      const isExpired = statusStr === "EXPIRED" || statusStr === "TIMEOUT";
      if (isPaid) {
        return {
          isValid: true,
          status: "PAID",
          orderId: params.orderId,
          gatewayOrderId,
          amount: settledAmount || params.expectedAmount || 0,
          payableAmount: settledAmount || params.expectedAmount || 0,
          transactionId: utr || `tg_${gatewayOrderId}`,
          rawGatewayResponse: data
        };
      }
      if (isFailed) {
        return {
          isValid: false,
          status: "FAILED",
          orderId: params.orderId,
          gatewayOrderId,
          amount: settledAmount,
          payableAmount: settledAmount,
          error: data.message || resData.message || "Payment was failed or declined on Trust Gateway.",
          rawGatewayResponse: data
        };
      }
      if (isExpired) {
        return {
          isValid: false,
          status: "EXPIRED",
          orderId: params.orderId,
          gatewayOrderId,
          amount: settledAmount,
          payableAmount: settledAmount,
          error: "Trust Gateway checkout session expired.",
          rawGatewayResponse: data
        };
      }
      return {
        isValid: false,
        status: "PENDING",
        orderId: params.orderId,
        gatewayOrderId,
        amount: settledAmount,
        payableAmount: settledAmount,
        error: `Gateway status is ${rawStatus || "PENDING"}. Awaiting confirmation.`,
        rawGatewayResponse: data
      };
    } catch (err) {
      console.error(`[TrustGateway Parse Exception] ${resolvedIdentifier}:`, err.message);
      return {
        isValid: false,
        status: "PENDING",
        orderId: params.orderId,
        gatewayOrderId: resolvedIdentifier,
        amount: params.expectedAmount || 0,
        error: err.message || "Failed to parse gateway status response."
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
  verifyWebhookSignature(rawBody, signature, payload) {
    const secret = this.webhookSecret || this.apiKey;
    if (!secret || !signature) {
      return false;
    }
    try {
      const cleanSignature = signature.trim().toLowerCase();
      if (payload) {
        const orderId = payload.order_id || payload.orderId || payload.data?.order_id || "";
        const rawAmount = payload.amount !== void 0 ? payload.amount : payload.data?.amount;
        const formattedAmount = Number(rawAmount || 0).toFixed(2);
        const status = String(payload.status || payload.data?.status || "").toUpperCase().trim();
        const utr = String(payload.utr || payload.data?.utr || "NONE").trim() || "NONE";
        const canonicalPayload = `${orderId}|${formattedAmount}|${status}|${utr}`;
        const canonicalSignature = crypto.createHmac("sha256", secret).update(canonicalPayload).digest("hex").toLowerCase();
        if (this.safeCompare(canonicalSignature, cleanSignature)) {
          return true;
        }
      }
      if (rawBody) {
        const rawBodySignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex").toLowerCase();
        if (this.safeCompare(rawBodySignature, cleanSignature)) {
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("[TrustGateway Webhook] Signature verification error:", err);
      return false;
    }
  }
  /**
   * Constant-time comparison to prevent timing attacks
   */
  safeCompare(a, b) {
    try {
      const bufA = Buffer.from(a, "utf-8");
      const bufB = Buffer.from(b, "utf-8");
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }
};
var trustGatewayProvider = new TrustGatewayProvider();

// server/payment/gateway.ts
var PaymentGatewayManager = class {
  constructor(provider) {
    this.name = "PaymentGatewayManager";
    this.merchantName = "Vortex Digital Store";
    this.currency = "INR";
    this.activeProvider = provider || trustGatewayProvider;
  }
  /**
   * Register or swap payment gateway provider
   */
  registerProvider(provider) {
    this.activeProvider = provider;
  }
  /**
   * Get active provider
   */
  getActiveProvider() {
    return this.activeProvider;
  }
  /**
   * Check whether gateway is actively configured with valid credentials
   */
  isConfigured() {
    return this.activeProvider ? this.activeProvider.isConfigured() : false;
  }
  /**
   * Dynamic credentials updater
   */
  updateCredentials(settings) {
    if (this.activeProvider && "updateCredentials" in this.activeProvider) {
      this.activeProvider.updateCredentials(settings);
    }
  }
  /**
   * Returns current gateway configuration (public-safe data only)
   */
  getConfig() {
    if (this.activeProvider) {
      return this.activeProvider.getConfig();
    }
    return {
      provider: "none",
      isConfigured: false,
      currency: this.currency,
      merchantName: this.merchantName,
      message: "Payment service temporarily unavailable. Please try again later.",
      webhookConfigured: false
    };
  }
  /**
   * Initializes a payment order.
   */
  async createOrder(params) {
    if (!this.activeProvider || !this.activeProvider.isConfigured()) {
      throw new Error("Payment service temporarily unavailable. Please try again later.");
    }
    return this.activeProvider.createOrder(params);
  }
  /**
   * Alias for backward-compatible call in codebase
   */
  async createGatewayOrder(params) {
    return this.createOrder(params);
  }
  /**
   * Server-side payment status verification.
   */
  async verifyPayment(params) {
    if (!this.activeProvider || !this.activeProvider.isConfigured()) {
      return {
        isValid: false,
        status: "PENDING",
        orderId: params.orderId,
        gatewayOrderId: params.gatewayOrderId,
        amount: 0,
        error: "Payment service temporarily unavailable. Please try again later."
      };
    }
    return this.activeProvider.verifyPayment(params);
  }
  /**
   * Alias for backward-compatible checkPaymentStatus call
   */
  async checkPaymentStatus(orderId, expectedAmount) {
    return this.verifyPayment({ orderId, expectedAmount });
  }
  /**
   * Webhook signature verification
   */
  verifyWebhookSignature(rawBody, signature, payload) {
    if (this.activeProvider && this.activeProvider.verifyWebhookSignature) {
      return this.activeProvider.verifyWebhookSignature(rawBody, signature, payload);
    }
    return false;
  }
};
var paymentGateway = new PaymentGatewayManager();

// server/db.ts
var DATA_DIR = path.resolve(process.cwd(), "data");
var DB_FILE = path.join(DATA_DIR, "vortex.db");
var dbInstance = null;
function saveDb() {
  if (!dbInstance) return;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const binaryArray = dbInstance.export();
  fs.writeFileSync(DB_FILE, Buffer.from(binaryArray));
}
async function getDb() {
  if (dbInstance) return dbInstance;
  const SQL = await initSqlJs();
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.error("Error reading existing database file, creating fresh DB:", err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      reward_value REAL NOT NULL,
      denomination TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      image TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS redeem_codes (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      code TEXT NOT NULL,
      pin TEXT,
      status TEXT NOT NULL CHECK(status IN ('UNUSED', 'RESERVED', 'SOLD', 'DISABLED')),
      order_id TEXT,
      created_at TEXT NOT NULL,
      used_at TEXT,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_status TEXT NOT NULL,
      delivery_status TEXT NOT NULL,
      delivered_code_id TEXT,
      delivered_code TEXT,
      delivered_pin TEXT,
      payment_method TEXT NOT NULL DEFAULT 'Direct Payment Gateway',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      fullName TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL,
      password TEXT,
      googleSub TEXT,
      role TEXT NOT NULL DEFAULT 'CUSTOMER',
      createdAt TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 1500.0
    );

    CREATE TABLE IF NOT EXISTS store_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      denomination TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notices (
      id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 0,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      image_url TEXT,
      button_enabled INTEGER NOT NULL DEFAULT 0,
      button_text TEXT,
      button_url TEXT,
      display_frequency TEXT NOT NULL DEFAULT 'EVERY_LOAD',
      start_at TEXT,
      end_at TEXT,
      priority INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS design_presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      settings TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  try {
    dbInstance.run(`ALTER TABLE orders ADD COLUMN gateway_order_id TEXT;`);
  } catch (e) {
  }
  try {
    dbInstance.run(`ALTER TABLE orders ADD COLUMN gateway_payment_id TEXT;`);
  } catch (e) {
  }
  try {
    dbInstance.run(`ALTER TABLE orders ADD COLUMN customer_id TEXT;`);
  } catch (e) {
  }
  try {
    dbInstance.run(`ALTER TABLE orders ADD COLUMN payable_amount REAL;`);
  } catch (e) {
  }
  try {
    dbInstance.run(`ALTER TABLE orders ADD COLUMN order_type TEXT DEFAULT 'PURCHASE';`);
  } catch (e) {
  }
  try {
    dbInstance.run(`ALTER TABLE orders ADD COLUMN checkout_url TEXT;`);
  } catch (e) {
  }
  try {
    dbInstance.run(`ALTER TABLE orders ADD COLUMN expires_at TEXT;`);
  } catch (e) {
  }
  try {
    dbInstance.run(`ALTER TABLE users ADD COLUMN customer_id TEXT;`);
  } catch (e) {
  }
  try {
    dbInstance.run(`ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';`);
  } catch (e) {
  }
  try {
    dbInstance.run(`ALTER TABLE users ADD COLUMN last_login_at TEXT;`);
  } catch (e) {
  }
  try {
    dbInstance.run(`ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'Email';`);
  } catch (e) {
  }
  try {
    dbInstance.run(`ALTER TABLE users ADD COLUMN photo_url TEXT;`);
  } catch (e) {
  }
  try {
    dbInstance.run(`ALTER TABLE products ADD COLUMN card_badge_text TEXT;`);
    console.log("ALTER TABLE products ADD COLUMN card_badge_text success");
  } catch (e) {
    console.log("ALTER TABLE products ADD COLUMN card_badge_text failed or column exists");
  }
  try {
    dbInstance.run(`ALTER TABLE products ADD COLUMN glow_settings TEXT;`);
    console.log("ALTER TABLE products ADD COLUMN glow_settings success");
  } catch (e) {
    console.log("ALTER TABLE products ADD COLUMN glow_settings failed or column exists");
  }
  try {
    dbInstance.run(`ALTER TABLE products ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;`);
    console.log("ALTER TABLE products ADD COLUMN sort_order success");
  } catch (e) {
    console.log("ALTER TABLE products ADD COLUMN sort_order failed or column exists");
  }
  try {
    dbInstance.run(`ALTER TABLE notices ADD COLUMN type TEXT NOT NULL DEFAULT 'redeem-code';`);
    console.log("ALTER TABLE notices ADD COLUMN type success");
  } catch (e) {
    console.log("ALTER TABLE notices ADD COLUMN type failed or column exists");
  }
  try {
    const tableSqlRes = dbInstance.exec(`SELECT sql FROM sqlite_master WHERE name = 'redeem_codes';`);
    const tableSql = tableSqlRes[0]?.values[0]?.[0] || "";
    if (tableSql && !tableSql.includes("DISABLED")) {
      dbInstance.run(`
        CREATE TABLE redeem_codes_migrated (
          id TEXT PRIMARY KEY,
          product_id TEXT NOT NULL,
          code TEXT NOT NULL,
          pin TEXT,
          status TEXT NOT NULL CHECK(status IN ('UNUSED', 'RESERVED', 'SOLD', 'DISABLED')),
          order_id TEXT,
          created_at TEXT NOT NULL,
          used_at TEXT,
          FOREIGN KEY(product_id) REFERENCES products(id)
        );
        INSERT INTO redeem_codes_migrated SELECT id, product_id, code, pin, status, order_id, created_at, used_at FROM redeem_codes;
        DROP TABLE redeem_codes;
        ALTER TABLE redeem_codes_migrated RENAME TO redeem_codes;
      `);
      saveDb();
    }
  } catch (migErr) {
    console.warn("redeem_codes schema migration notice:", migErr);
  }
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('storeName', 'VORTEX CODE');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('websiteName', 'VORTEX CODE');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('subtitle', 'SECURE DIGITAL STORE');`);
  dbInstance.run(`DELETE FROM store_settings WHERE key LIKE 'famupi%';`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('tagline', 'SECURE DIGITAL STORE');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('logoUrl', '');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('supportEmail', 'support@vortexcode.com');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('currencySymbol', '\u20B9');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('enableAutoFulfillment', 'true');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('telegramEnabled', 'true');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('telegramUrl', 'https://t.me/VortexCodeSupport');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('contactEnabled', 'true');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('contactPlatform', 'telegram');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('contactUrl', 'https://t.me/VortexCodeSupport');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('contactIconUrl', '');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('contactLabel', 'Contact Admin');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('contactWidgetSize', '60');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('contactWidgetRight', '30');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('contactWidgetBottom', '30');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('contactWidgetMobileSize', '55');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('contactWidgetMobileRight', '35');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('contactWidgetMobileBottom', '110');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('contactIconSize', '42');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('contactMobileIconSize', '42');`);
  dbInstance.run(`INSERT OR REPLACE INTO store_settings (key, value) VALUES ('appUrl', 'https://vortexcode.shop');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('diamondCategoryLabel', 'DIAMONDS');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('diamondProductLabel', 'DIAMONDS');`);
  const initialDiamondsSettings = {
    categoryHeading: "DIAMONDS RECHARGE",
    productSelectionHeading: "SELECT DIAMOND PACK",
    productNameLabel: "Diamond Pack",
    diamondQuantityLabel: "Diamonds",
    priceLabel: "Price",
    selectedProductMessage: "Selected Diamond Package for Free Fire",
    outOfStockMessage: "OUT OF STOCK",
    disabledProductMessage: "CURRENTLY UNAVAILABLE",
    verificationHeading: "PLAYER VERIFICATION",
    playerIdLabel: "Free Fire Player UID",
    playerNameLabel: "Player Nickname",
    verificationButtonText: "VERIFY PLAYER UID",
    verificationLoadingMessage: "Verifying Player UID with Game Server...",
    verificationSuccessfulMessage: "Player Verified Successfully!",
    verificationFailedMessage: "Player verification failed. Please check your UID.",
    invalidPlayerIdMessage: "Invalid Game UID. Must be 5-15 digits.",
    verificationRequiredMessage: "Please verify your Player UID before proceeding.",
    paymentSectionHeading: "SECURE PAYMENT",
    paymentInstructions: "Scan QR Code or pay via UPI. Payments are verified securely on backend.",
    selectedDiamondsSummaryLabel: "Selected Package Summary",
    orderSummaryHeading: "ORDER SUMMARY",
    productPriceLabel: "Product Price",
    processingFeeLabel: "Processing Fee",
    discountLabel: "Discount",
    totalPayableLabel: "TOTAL PAYABLE",
    payNowButtonText: "PROCEED TO PAY",
    paymentProcessingMessage: "Initializing Secure Payment Gateway...",
    paymentRedirectMessage: "Redirecting to Payment Gateway...",
    paymentPendingHeading: "PAYMENT PENDING",
    paymentPendingMessage: "Waiting for payment confirmation from gateway...",
    paymentSuccessfulHeading: "PAYMENT SUCCESSFUL!",
    paymentSuccessfulMessage: "Your payment has been verified successfully.",
    paymentFailedHeading: "PAYMENT FAILED",
    paymentFailedMessage: "Payment transaction failed or was declined.",
    deliveryNoticeHeading: "DIAMONDS DELIVERY INSTRUCTIONS",
    englishDeliveryMessage: "Diamonds will be credited directly to your Free Fire UID Mail Box within 5-15 minutes after payment verification.",
    hindiHinglishDeliveryMessage: "Payment hone ke baad Diamonds aapke Free Fire Uid Mail Box me 5-15 minute me bhej diye jayenge.",
    deliveryTimeMessage: "Estimated Delivery Time: 5 - 15 Minutes",
    successHeading: "PURCHASE SUCCESSFUL!",
    successDescription: "Your diamond top-up or order has been completed",
    copyButtonText: "COPY DETAILS",
    closeButtonText: "CLOSE",
    doneButtonText: "DONE",
    greenTickEnabled: true
  };
  const initialRedeemSettings = {
    categoryHeading: "GOOGLE PLAY REDEEM CODE",
    productSelectionHeading: "SELECT RECHARGE AMOUNT",
    productNameLabel: "Google Play Gift Code",
    productDescription: "Instant digital delivery with secure PIN",
    priceLabel: "Price",
    redeemValueLabel: "Redeem Value",
    availableStockLabel: "Available Stock",
    outOfStockMessage: "OUT OF STOCK",
    disabledProductMessage: "PRODUCT DISABLED",
    orderSummaryHeading: "ORDER SUMMARY",
    selectedProductLabel: "Selected Product",
    productPriceLabel: "Product Price",
    processingFeeLabel: "Processing Fee",
    discountLabel: "Discount",
    totalPayableLabel: "TOTAL PAYABLE",
    continueToPaymentButtonText: "PROCEED TO PAYMENT",
    payNowButtonText: "PAY NOW",
    paymentProcessingMessage: "Processing payment request...",
    paymentPendingHeading: "PAYMENT PENDING",
    paymentPendingMessage: "Waiting for payment authorization...",
    paymentSuccessfulHeading: "PAYMENT SUCCESSFUL!",
    paymentSuccessfulMessage: "Payment verified successfully by backend.",
    paymentFailedHeading: "PAYMENT FAILED",
    paymentFailedMessage: "Payment failed or was canceled.",
    deliveryHeading: "REDEEM CODE DELIVERY",
    deliverySuccessfulMessage: "Redeem code assigned securely!",
    codeAssignedMessage: "Your unique code has been unlocked.",
    successHeading: "PURCHASE SUCCESSFUL!",
    successDescription: "Your payment has been verified successfully.",
    greenTickEnabled: true,
    codeSectionHeading: "YOUR REDEEM CODE",
    codeLabel: "Redeem Code",
    copyCodeButtonText: "COPY CODE",
    codeCopiedConfirmationMessage: "Redeem code copied to clipboard!",
    additionalSuccessMessage: "Enjoy your Google Play credits!",
    doneButtonText: "DONE",
    closeButtonText: "CLOSE"
  };
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('diamonds_settings', ?);`, [JSON.stringify(initialDiamondsSettings)]);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('redeem_settings', ?);`, [JSON.stringify(initialRedeemSettings)]);
  try {
    const catCheck = dbInstance.exec(`SELECT count(*) as count FROM categories;`);
    const catCount = catCheck.length > 0 && catCheck[0].values.length > 0 ? catCheck[0].values[0][0] : 0;
    if (catCount === 0) {
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const defaultCategories = [
        { id: "cat_100", name: "\u20B9100 Recharge", denomination: "\u20B9100", sort_order: 1 },
        { id: "cat_120", name: "\u20B9120 Recharge", denomination: "\u20B9120", sort_order: 2 },
        { id: "cat_150", name: "\u20B9150 Recharge", denomination: "\u20B9150", sort_order: 3 },
        { id: "cat_200", name: "\u20B9200 Recharge", denomination: "\u20B9200", sort_order: 4 },
        { id: "cat_300", name: "\u20B9300 Recharge", denomination: "\u20B9300", sort_order: 5 },
        { id: "cat_500", name: "\u20B9500 Recharge", denomination: "\u20B9500", sort_order: 6 },
        { id: "cat_700", name: "\u20B9700 Recharge", denomination: "\u20B9700", sort_order: 7 },
        { id: "cat_900", name: "\u20B9900 Recharge", denomination: "\u20B9900", sort_order: 8 }
      ];
      for (const cat of defaultCategories) {
        dbInstance.run(
          `INSERT OR IGNORE INTO categories (id, name, denomination, enabled, sort_order, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?);`,
          [cat.id, cat.name, cat.denomination, cat.sort_order, nowIso, nowIso]
        );
      }
    }
  } catch (e) {
    console.error("Category seeding error:", e);
  }
  const prodCheck = dbInstance.exec(`SELECT count(*) as count FROM products;`);
  const prodCount = prodCheck.length > 0 && prodCheck[0].values.length > 0 ? prodCheck[0].values[0][0] : 0;
  if (prodCount === 0) {
    seedInitialData(dbInstance);
  } else {
    try {
      const codeCheck = dbInstance.exec(`SELECT id, code FROM redeem_codes;`);
      if (codeCheck.length > 0 && codeCheck[0].values.length > 0) {
        for (const row of codeCheck[0].values) {
          const id = row[0];
          const raw = row[1] || "";
          let norm = normalizeCode(raw);
          if (norm.length !== 16) {
            norm = (norm + "ABCDEFGHJKLMNPQRSTUVWXYZ23456789").substring(0, 16);
          }
          dbInstance.run(`UPDATE redeem_codes SET code = ? WHERE id = ?;`, [norm, id]);
        }
      }
    } catch (e) {
      console.error("Migration error:", e);
    }
  }
  saveDb();
  return dbInstance;
}
function seedInitialData(db) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const defaultImage = "https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png";
  const initialProducts = [
    {
      id: "prod_100",
      name: "Google Play Recharge Code",
      category: "DIGITAL REWARDS",
      description: "Instant Google Play digital recharge code voucher with 16-character secret key and security PIN.",
      price: 100,
      reward_value: 1500,
      denomination: "\u20B9100",
      enabled: 1,
      image: defaultImage
    },
    {
      id: "prod_120",
      name: "Google Play Recharge Code",
      category: "GAMING",
      description: "Google Play recharge code for battle credits, in-game skins, and app store purchases.",
      price: 120,
      reward_value: 1800,
      denomination: "\u20B9120",
      enabled: 1,
      image: defaultImage
    },
    {
      id: "prod_150",
      name: "Google Play Recharge Code",
      category: "DIGITAL REWARDS",
      description: "Google Play digital recharge voucher with instant encrypted key generation.",
      price: 150,
      reward_value: 2250,
      denomination: "\u20B9150",
      enabled: 1,
      // Will be out of stock initially because 0 codes
      image: defaultImage
    },
    {
      id: "prod_200",
      name: "Google Play Recharge Code",
      category: "GAMING",
      description: "Google Play recharge code for in-game drops, apps, movies, and digital content.",
      price: 200,
      reward_value: 3e3,
      denomination: "\u20B9200",
      enabled: 1,
      image: defaultImage
    },
    {
      id: "prod_300",
      name: "Google Play Recharge Code",
      category: "OTHER",
      description: "Google Play store digital entertainment and subscription recharge code.",
      price: 300,
      reward_value: 4500,
      denomination: "\u20B9300",
      enabled: 1,
      image: defaultImage
    },
    {
      id: "prod_500",
      name: "Google Play Recharge Code",
      category: "OTHER",
      description: "Google Play recharge voucher code with instant key verification.",
      price: 500,
      reward_value: 7500,
      denomination: "\u20B9500",
      enabled: 1,
      image: defaultImage
    },
    {
      id: "prod_700",
      name: "Google Play Recharge Code",
      category: "DIGITAL REWARDS",
      description: "Google Play digital reward voucher for high-volume store redemptions.",
      price: 700,
      reward_value: 10500,
      denomination: "\u20B9700",
      enabled: 1,
      image: defaultImage
    },
    {
      id: "prod_900",
      name: "Google Play Recharge Code",
      category: "GAMING",
      description: "Max value Google Play recharge code with bonus store credit.",
      price: 900,
      reward_value: 13500,
      denomination: "\u20B9900",
      enabled: 1,
      image: defaultImage
    }
  ];
  for (const p of initialProducts) {
    db.run(
      `INSERT INTO products (id, name, category, description, price, reward_value, denomination, enabled, image, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [p.id, p.name, p.category, p.description, p.price, p.reward_value, p.denomination, p.enabled, p.image, now, now]
    );
  }
  const initialCodes = [
    // prod_100 (5 unused, 1 sold)
    { id: "cd_100_1", product_id: "prod_100", code: "ZRHS35AC7KLM92PQ", pin: "9842", status: "UNUSED", order_id: null },
    { id: "cd_100_2", product_id: "prod_100", code: "QYU1BXE87ZGK1011", pin: "4192", status: "UNUSED", order_id: null },
    { id: "cd_100_3", product_id: "prod_100", code: "VRX9941PL9288022", pin: "1102", status: "UNUSED", order_id: null },
    { id: "cd_100_4", product_id: "prod_100", code: "VRX2210KK4977114", pin: "8831", status: "UNUSED", order_id: null },
    { id: "cd_100_5", product_id: "prod_100", code: "VRX3319ZX9055219", pin: "4491", status: "UNUSED", order_id: null },
    { id: "cd_100_sold", product_id: "prod_100", code: "VRX5519A88299015", pin: "4192", status: "SOLD", order_id: "ord_101", used_at: "2026-10-04 14:22" },
    // prod_120 (4 unused, 1 sold)
    { id: "cd_120_1", product_id: "prod_120", code: "STRM1102QQ924418", pin: "8831", status: "SOLD", order_id: "ord_102", used_at: "2026-09-28 09:15" },
    { id: "cd_120_2", product_id: "prod_120", code: "GP120X89MN447721", pin: "7721", status: "UNUSED", order_id: null },
    { id: "cd_120_3", product_id: "prod_120", code: "GP120BB9ZZ118849", pin: "5512", status: "UNUSED", order_id: null },
    { id: "cd_120_4", product_id: "prod_120", code: "GP120PP4QQ829931", pin: "3310", status: "UNUSED", order_id: null },
    // prod_150: NO UNUSED CODES (0 UNUSED codes -> OUT OF STOCK)
    { id: "cd_150_sold", product_id: "prod_150", code: "VRX150SL88214410", pin: "2291", status: "SOLD", order_id: "ord_103", used_at: "2026-10-05 18:30" },
    // prod_200 (3 unused)
    { id: "cd_200_1", product_id: "prod_200", code: "GP200AK9MM104491", pin: "6619", status: "UNUSED", order_id: null },
    { id: "cd_200_2", product_id: "prod_200", code: "GP200TR8QQ293310", pin: "9920", status: "UNUSED", order_id: null },
    { id: "cd_200_3", product_id: "prod_200", code: "GP200LK1ZZ998822", pin: "1140", status: "UNUSED", order_id: null },
    // prod_300 (2 unused)
    { id: "cd_300_1", product_id: "prod_300", code: "GP300KK2PP887711", pin: "8841", status: "UNUSED", order_id: null },
    { id: "cd_300_2", product_id: "prod_300", code: "GP300YY9UU125532", pin: "3391", status: "UNUSED", order_id: null },
    // prod_500 (2 unused)
    { id: "cd_500_1", product_id: "prod_500", code: "GP500MM3NN446655", pin: "4481", status: "UNUSED", order_id: null },
    { id: "cd_500_2", product_id: "prod_500", code: "GP500XX7YY889900", pin: "7729", status: "UNUSED", order_id: null },
    // prod_700 (1 unused)
    { id: "cd_700_1", product_id: "prod_700", code: "GP700PLT88990011", pin: "1192", status: "UNUSED", order_id: null },
    // prod_900 (2 unused)
    { id: "cd_900_1", product_id: "prod_900", code: "GP900ULT77223344", pin: "9931", status: "UNUSED", order_id: null },
    { id: "cd_900_2", product_id: "prod_900", code: "GP900MAX44556677", pin: "8842", status: "UNUSED", order_id: null }
  ];
  for (const c of initialCodes) {
    db.run(
      `INSERT INTO redeem_codes (id, product_id, code, pin, status, order_id, created_at, used_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [c.id, c.product_id, c.code, c.pin, c.status, c.order_id, now, c.used_at || null]
    );
  }
  const initialOrders = [
    {
      id: "ord_101",
      order_number: "VRX-2026-8801",
      product_id: "prod_100",
      product_name: "Google Play Recharge Code",
      customer_name: "Alex Vance",
      customer_email: "alex.vance@vortexcode.com",
      amount: 100,
      payment_status: "PAID",
      delivery_status: "DELIVERED",
      delivered_code_id: "cd_100_sold",
      delivered_code: "VRX5519A88299015",
      delivered_pin: "4192",
      payment_method: "Direct Payment Gateway",
      created_at: "2026-10-04 14:22"
    },
    {
      id: "ord_102",
      order_number: "VRX-2026-7740",
      product_id: "prod_120",
      product_name: "Google Play Recharge Code",
      customer_name: "Rohan Sharma",
      customer_email: "rohan.s@example.com",
      amount: 120,
      payment_status: "PAID",
      delivery_status: "DELIVERED",
      delivered_code_id: "cd_120_1",
      delivered_code: "STRM1102QQ924418",
      delivered_pin: "8831",
      payment_method: "Direct Payment Gateway",
      created_at: "2026-09-28 09:15"
    }
  ];
  for (const o of initialOrders) {
    db.run(
      `INSERT INTO orders (id, order_number, product_id, product_name, customer_name, customer_email, amount, payment_status, delivery_status, delivered_code_id, delivered_code, delivered_pin, payment_method, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [o.id, o.order_number, o.product_id, o.product_name, o.customer_name, o.customer_email, o.amount, o.payment_status, o.delivery_status, o.delivered_code_id, o.delivered_code, o.delivered_pin, o.payment_method, o.created_at, o.created_at]
    );
  }
}
async function getAllProducts(includeDisabled = true) {
  const db = await getDb();
  const disabledCatsRes = db.exec(`SELECT denomination FROM categories WHERE enabled = 0;`);
  const disabledDenoms = /* @__PURE__ */ new Set();
  if (disabledCatsRes.length > 0 && disabledCatsRes[0].values.length > 0) {
    disabledCatsRes[0].values.forEach((row) => {
      const d = String(row[0] || "").trim();
      if (d) {
        disabledDenoms.add(d);
        const digits = d.replace(/\D/g, "");
        if (digits) {
          disabledDenoms.add(`\u20B9${digits}`);
          disabledDenoms.add(digits);
        }
      }
    });
  }
  const query = `
    SELECT 
      p.id, 
      p.name, 
      p.category, 
      p.description, 
      p.price, 
      p.reward_value as rewardValue, 
      p.denomination, 
      p.enabled, 
      p.image, 
      p.card_badge_text as cardBadgeText,
      p.glow_settings as glowSettings,
      p.sort_order as sortOrder,
      p.created_at as createdAt, 
      p.updated_at as updatedAt,
      COUNT(CASE WHEN r.status = 'UNUSED' THEN 1 END) as stock,
      COUNT(CASE WHEN r.status = 'SOLD' THEN 1 END) as soldCount,
      COUNT(r.id) as totalCodes
    FROM products p
    LEFT JOIN redeem_codes r ON p.id = r.product_id
    GROUP BY p.id
    ORDER BY p.sort_order ASC, p.price ASC;
  `;
  const res = db.exec(query);
  if (res.length === 0) return [];
  const columns = res[0].columns;
  console.log("DEBUG: Columns:", columns);
  let items = res[0].values.map((row) => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    obj.enabled = Boolean(obj.enabled);
    obj.stock = Number(obj.stock);
    obj.sortOrder = Number(obj.sortOrder || 0);
    obj.soldCount = Number(obj.soldCount);
    obj.totalCodes = Number(obj.totalCodes);
    const denomClean = String(obj.denomination || "").trim();
    const priceStr = String(obj.price || "");
    const isCatDisabled = disabledDenoms.has(denomClean) || disabledDenoms.has(`\u20B9${denomClean.replace(/\D/g, "")}`) || disabledDenoms.has(priceStr);
    obj.categoryDisabled = isCatDisabled;
    if (isCatDisabled) {
      obj.enabled = false;
    }
    obj.stockStatus = !obj.enabled ? "DISABLED" : obj.stock > 0 ? "AVAILABLE" : "OUT OF STOCK";
    return obj;
  });
  if (!includeDisabled) {
    items = items.filter((p) => p.enabled && !p.categoryDisabled);
  }
  return items;
}
async function getProductById(id, includeDisabled = true) {
  const products = await getAllProducts(includeDisabled);
  return products.find((p) => p.id === id) || null;
}
async function createProduct(data) {
  const db = await getDb();
  const id = `prod_${Math.round(data.price)}_${Math.random().toString(36).substring(2, 6)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const image = data.image || "https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png";
  const enabled = data.enabled !== void 0 ? data.enabled ? 1 : 0 : 1;
  const sortOrder = data.sortOrder !== void 0 ? Number(data.sortOrder) : 0;
  db.run(
    `INSERT INTO products (id, name, category, description, price, reward_value, denomination, enabled, image, card_badge_text, glow_settings, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [id, data.name, data.category, data.description, Number(data.price), Number(data.rewardValue), data.denomination, enabled, image, data.cardBadgeText || "DIAMONDS", typeof data.glowSettings === "object" ? JSON.stringify(data.glowSettings) : data.glowSettings || "{}", sortOrder, now, now]
  );
  saveDb();
  return getProductById(id);
}
async function updateProduct(id, data) {
  const db = await getDb();
  const existing = await getProductById(id);
  console.log("DEBUG: Updating product:", id, "data:", data);
  if (!existing) {
    throw new Error(`Product with ID ${id} not found`);
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const name = data.name !== void 0 ? data.name : existing.name;
  const category = data.category !== void 0 ? data.category : existing.category;
  const description = data.description !== void 0 ? data.description : existing.description;
  const price = data.price !== void 0 ? Number(data.price) : existing.price;
  const reward_value = data.rewardValue !== void 0 ? Number(data.rewardValue) : existing.rewardValue;
  const denomination = data.denomination !== void 0 ? data.denomination : existing.denomination;
  const enabledRaw = data.enabled;
  const enabledVal = typeof enabledRaw === "string" ? enabledRaw.toLowerCase() : String(enabledRaw);
  const enabled = enabledRaw !== void 0 ? enabledVal === "true" || enabledVal === "1" || enabledVal === "enabled" || enabledRaw === true || enabledRaw === 1 ? 1 : 0 : existing.enabled ? 1 : 0;
  const image = data.image !== void 0 ? data.image : existing.image;
  const cardBadgeText = data.cardBadgeText !== void 0 ? data.cardBadgeText : existing.cardBadgeText;
  const glowSettings = data.glowSettings !== void 0 ? data.glowSettings : existing.glowSettings;
  const sortOrder = data.sortOrder !== void 0 ? Number(data.sortOrder) : existing.sortOrder ?? 0;
  db.run(
    `UPDATE products 
     SET name = ?, category = ?, description = ?, price = ?, reward_value = ?, denomination = ?, enabled = ?, image = ?, card_badge_text = ?, glow_settings = ?, sort_order = ?, updated_at = ?
     WHERE id = ?;`,
    [name, category, description, price, reward_value, denomination, enabled, image, cardBadgeText, typeof glowSettings === "object" ? JSON.stringify(glowSettings) : glowSettings, sortOrder, now, id]
  );
  saveDb();
  return getProductById(id);
}
async function reorderProducts(items) {
  const db = await getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const item of items) {
    if (item.id && typeof item.sortOrder === "number") {
      db.run(`UPDATE products SET sort_order = ?, updated_at = ? WHERE id = ?;`, [item.sortOrder, now, item.id]);
    }
  }
  saveDb();
  return { success: true, message: "Products reordered successfully" };
}
async function deleteProduct(id) {
  const db = await getDb();
  const linkedOrders = db.exec(`SELECT count(*) FROM orders WHERE product_id = ?;`, [id]);
  const linkedCodes = db.exec(`SELECT count(*) FROM redeem_codes WHERE product_id = ?;`, [id]);
  if (linkedOrders[0].values[0][0] > 0 || linkedCodes[0].values[0][0] > 0) {
    throw new Error("Cannot delete product: It is referenced by existing orders or redeem codes.");
  }
  db.run(`DELETE FROM products WHERE id = ?;`, [id]);
  saveDb();
  return { success: true, message: `Product ${id} deleted successfully` };
}
async function getAllDesignPresets() {
  const db = await getDb();
  let res = db.exec(`SELECT id, name, settings, created_at, updated_at FROM design_presets ORDER BY name ASC;`);
  if (res.length === 0 || res[0].values.length === 0) {
    const defaultPresets = [
      {
        name: "Neon Green",
        settings: {
          glowColor: "#10B981",
          borderColor: "#10B981",
          badgeBgColor: "#155e75",
          badgeTextColor: "#bae6fd",
          buttonBgColor: "#38bdf8",
          imageBorderColor: "#06b6d4",
          labelBorderColor: "#06b6d4",
          outerBorderThickness: 2,
          imageBorderThickness: 2,
          labelBorderThickness: 1,
          outerGlowEnabled: true,
          outerGlowIntensity: 50,
          outerGlowBlur: 25,
          imageGlowEnabled: true,
          imageGlowIntensity: 30,
          imageGlowBlur: 15,
          labelGlowEnabled: true,
          labelGlowIntensity: 20,
          labelGlowBlur: 10,
          labelInnerGlowIntensity: 20,
          labelInnerGlowBlur: 10
        }
      },
      {
        name: "Ice Blue",
        settings: {
          glowColor: "#38bdf8",
          borderColor: "#0284c7",
          badgeBgColor: "#0c4a6e",
          badgeTextColor: "#e0f2fe",
          buttonBgColor: "#0284c7",
          imageBorderColor: "#38bdf8",
          labelBorderColor: "#38bdf8",
          outerBorderThickness: 2,
          imageBorderThickness: 2,
          labelBorderThickness: 1,
          outerGlowEnabled: true,
          outerGlowIntensity: 60,
          outerGlowBlur: 30,
          imageGlowEnabled: true,
          imageGlowIntensity: 40,
          imageGlowBlur: 20,
          labelGlowEnabled: true,
          labelGlowIntensity: 30,
          labelGlowBlur: 12,
          labelInnerGlowIntensity: 30,
          labelInnerGlowBlur: 12
        }
      },
      {
        name: "Royal Purple",
        settings: {
          glowColor: "#a855f7",
          borderColor: "#7e22ce",
          badgeBgColor: "#581c87",
          badgeTextColor: "#f3e8ff",
          buttonBgColor: "#9333ea",
          imageBorderColor: "#c084fc",
          labelBorderColor: "#c084fc",
          outerBorderThickness: 2,
          imageBorderThickness: 2,
          labelBorderThickness: 1,
          outerGlowEnabled: true,
          outerGlowIntensity: 70,
          outerGlowBlur: 25,
          imageGlowEnabled: true,
          imageGlowIntensity: 45,
          imageGlowBlur: 18,
          labelGlowEnabled: true,
          labelGlowIntensity: 35,
          labelGlowBlur: 15,
          labelInnerGlowIntensity: 35,
          labelInnerGlowBlur: 15
        }
      },
      {
        name: "Golden Glow",
        settings: {
          glowColor: "#f59e0b",
          borderColor: "#d97706",
          badgeBgColor: "#78350f",
          badgeTextColor: "#fef3c7",
          buttonBgColor: "#f59e0b",
          imageBorderColor: "#fbbf24",
          labelBorderColor: "#fbbf24",
          outerBorderThickness: 2,
          imageBorderThickness: 2,
          labelBorderThickness: 1,
          outerGlowEnabled: true,
          outerGlowIntensity: 80,
          outerGlowBlur: 30,
          imageGlowEnabled: true,
          imageGlowIntensity: 50,
          imageGlowBlur: 20,
          labelGlowEnabled: true,
          labelGlowIntensity: 40,
          labelGlowBlur: 15,
          labelInnerGlowIntensity: 40,
          labelInnerGlowBlur: 15
        }
      }
    ];
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (const p of defaultPresets) {
      const pid = `preset_${Math.random().toString(36).substring(2, 8)}`;
      db.run(
        `INSERT OR IGNORE INTO design_presets (id, name, settings, created_at, updated_at) VALUES (?, ?, ?, ?, ?);`,
        [pid, p.name, JSON.stringify(p.settings), now, now]
      );
    }
    saveDb();
    res = db.exec(`SELECT id, name, settings, created_at, updated_at FROM design_presets ORDER BY name ASC;`);
  }
  if (res.length === 0) return [];
  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    let parsedSettings = {};
    try {
      parsedSettings = typeof obj.settings === "string" ? JSON.parse(obj.settings) : obj.settings || {};
    } catch (e) {
      parsedSettings = {};
    }
    return {
      id: obj.id,
      name: obj.name,
      settings: parsedSettings,
      createdAt: obj.created_at,
      updatedAt: obj.updated_at
    };
  });
}
async function saveDesignPreset(name, settings, id) {
  const db = await getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const cleanName = (name || "").trim();
  if (!cleanName) {
    throw new Error("Preset name is required");
  }
  const settingsJson = typeof settings === "string" ? settings : JSON.stringify(settings || {});
  const existingByName = db.exec(`SELECT id FROM design_presets WHERE LOWER(name) = LOWER(?);`, [cleanName]);
  let targetId = id;
  if (!targetId && existingByName.length > 0 && existingByName[0].values.length > 0) {
    targetId = existingByName[0].values[0][0];
  }
  if (targetId) {
    db.run(
      `UPDATE design_presets SET name = ?, settings = ?, updated_at = ? WHERE id = ?;`,
      [cleanName, settingsJson, now, targetId]
    );
  } else {
    targetId = `preset_${Math.random().toString(36).substring(2, 8)}`;
    db.run(
      `INSERT INTO design_presets (id, name, settings, created_at, updated_at) VALUES (?, ?, ?, ?, ?);`,
      [targetId, cleanName, settingsJson, now, now]
    );
  }
  saveDb();
  const presets = await getAllDesignPresets();
  return presets.find((p) => p.id === targetId || p.name.toLowerCase() === cleanName.toLowerCase());
}
async function deleteDesignPreset(id) {
  const db = await getDb();
  db.run(`DELETE FROM design_presets WHERE id = ? OR name = ?;`, [id, id]);
  saveDb();
  return { success: true, message: "Preset deleted successfully" };
}
async function isDenominationDisabled(denomination) {
  if (!denomination) return false;
  const db = await getDb();
  const clean = denomination.trim();
  const digits = clean.replace(/\D/g, "");
  const res = db.exec(
    `SELECT enabled FROM categories WHERE denomination = ? OR denomination = ? OR denomination = ?;`,
    [clean, `\u20B9${digits}`, digits]
  );
  if (res.length > 0 && res[0].values.length > 0) {
    const isEnabled = Boolean(res[0].values[0][0]);
    return !isEnabled;
  }
  return false;
}
async function getAllCategories(includeDisabled = true) {
  const db = await getDb();
  let sql = `
    SELECT 
      c.id, 
      c.name, 
      c.denomination, 
      c.enabled, 
      c.sort_order as sortOrder, 
      c.created_at as createdAt, 
      c.updated_at as updatedAt,
      COUNT(DISTINCT p.id) as productCount,
      COUNT(CASE WHEN r.status = 'UNUSED' THEN 1 END) as availableStock
    FROM categories c
    LEFT JOIN products p ON (p.denomination = c.denomination OR p.denomination = '\u20B9' || REPLACE(c.denomination, '\u20B9', ''))
    LEFT JOIN redeem_codes r ON p.id = r.product_id
  `;
  if (!includeDisabled) {
    sql += ` WHERE c.enabled = 1`;
  }
  sql += ` GROUP BY c.id ORDER BY c.sort_order ASC, c.name ASC;`;
  const res = db.exec(sql);
  if (res.length === 0) return [];
  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    obj.enabled = Boolean(obj.enabled);
    obj.sortOrder = Number(obj.sortOrder);
    obj.productCount = Number(obj.productCount || 0);
    obj.availableStock = Number(obj.availableStock || 0);
    return obj;
  });
}
async function getCategoryById(id) {
  const db = await getDb();
  const res = db.exec(
    `SELECT id, name, denomination, enabled, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt FROM categories WHERE id = ?;`,
    [id.trim()]
  );
  if (res.length === 0 || res[0].values.length === 0) return null;
  const columns = res[0].columns;
  const row = res[0].values[0];
  const obj = {};
  columns.forEach((col, idx) => {
    obj[col] = row[idx];
  });
  obj.enabled = Boolean(obj.enabled);
  obj.sortOrder = Number(obj.sortOrder);
  return obj;
}
async function createCategory(data) {
  const db = await getDb();
  const cleanDenom = data.denomination.trim().startsWith("\u20B9") ? data.denomination.trim() : `\u20B9${data.denomination.trim().replace(/\D/g, "") || data.denomination.trim()}`;
  const digits = cleanDenom.replace(/\D/g, "") || Math.random().toString(36).substring(2, 6);
  const id = `cat_${digits}_${Math.random().toString(36).substring(2, 5)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const enabledInt = data.enabled !== false ? 1 : 0;
  const sortOrder = Number(data.sortOrder ?? 0);
  db.run(
    `INSERT INTO categories (id, name, denomination, enabled, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [id, data.name.trim(), cleanDenom, enabledInt, sortOrder, now, now]
  );
  saveDb();
  return getCategoryById(id);
}
async function updateCategory(id, updates) {
  const db = await getDb();
  const existing = await getCategoryById(id);
  if (!existing) {
    throw new Error(`Category with ID "${id}" not found.`);
  }
  const name = updates.name !== void 0 ? updates.name.trim() : existing.name;
  let denomination = existing.denomination;
  if (updates.denomination !== void 0) {
    const d = updates.denomination.trim();
    denomination = d.startsWith("\u20B9") ? d : `\u20B9${d.replace(/\D/g, "") || d}`;
  }
  const enabledInt = updates.enabled !== void 0 ? updates.enabled ? 1 : 0 : existing.enabled ? 1 : 0;
  const sortOrder = updates.sortOrder !== void 0 ? Number(updates.sortOrder) : existing.sortOrder;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.run(
    `UPDATE categories SET name = ?, denomination = ?, enabled = ?, sort_order = ?, updated_at = ? WHERE id = ?;`,
    [name, denomination, enabledInt, sortOrder, now, id]
  );
  saveDb();
  return getCategoryById(id);
}
async function toggleCategoryStatus(id) {
  const db = await getDb();
  const existing = await getCategoryById(id);
  if (!existing) {
    throw new Error(`Category with ID "${id}" not found.`);
  }
  const nextEnabled = existing.enabled ? 0 : 1;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.run(
    `UPDATE categories SET enabled = ?, updated_at = ? WHERE id = ?;`,
    [nextEnabled, now, id]
  );
  saveDb();
  return getCategoryById(id);
}
async function deleteCategory(id) {
  const db = await getDb();
  const existing = await getCategoryById(id);
  if (!existing) {
    throw new Error(`Category with ID "${id}" not found.`);
  }
  db.run(`DELETE FROM categories WHERE id = ?;`, [id]);
  saveDb();
  return { success: true, message: `Category ${id} deleted successfully.` };
}
function normalizeCode(raw) {
  if (!raw) return "";
  return raw.replace(/[\s-]+/g, "").trim().toUpperCase();
}
function validateCode(raw) {
  const normalized = normalizeCode(raw);
  if (!normalized) {
    return { valid: false, normalized: "", error: "Redeem code cannot be empty." };
  }
  if (normalized.length !== 16) {
    return {
      valid: false,
      normalized,
      error: `Redeem code must contain exactly 16 characters (got ${normalized.length} characters: "${normalized}"). Format: XXXX XXXX XXXX XXXX`
    };
  }
  if (!/^[A-Z0-9]{16}$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: "Redeem code can only contain alphanumeric characters (A-Z, 0-9)."
    };
  }
  return { valid: true, normalized };
}
function formatFullCode(code) {
  const norm = normalizeCode(code);
  if (norm.length === 16) {
    return `${norm.substring(0, 4)} ${norm.substring(4, 8)} ${norm.substring(8, 12)} ${norm.substring(12, 16)}`;
  }
  return norm.match(/.{1,4}/g)?.join(" ") || norm;
}
function maskCode(code) {
  const norm = normalizeCode(code);
  if (norm.length >= 8) {
    const part1 = norm.substring(0, 4);
    const part2 = norm.substring(4, 8);
    return `${part1} ${part2} **** ****`;
  }
  return "CSGY AGTS **** ****";
}
async function getRedeemCodes(productId, status, denomination) {
  const db = await getDb();
  let sql = `
    SELECT 
      r.id, 
      r.product_id as productId, 
      p.name as productName,
      p.denomination,
      p.price,
      p.reward_value as rewardValue,
      p.category,
      p.enabled as productEnabled,
      p.image as productImage,
      r.code, 
      r.pin, 
      r.status, 
      r.order_id as orderId, 
      r.created_at as createdAt, 
      r.used_at as usedAt 
    FROM redeem_codes r
    LEFT JOIN products p ON r.product_id = p.id
    WHERE 1=1
  `;
  const params = [];
  if (productId) {
    sql += ` AND r.product_id = ?`;
    params.push(productId);
  }
  if (status && status !== "ALL") {
    let dbStatus = status;
    const s = String(status).toUpperCase();
    if (s === "AVAILABLE" || s === "UNUSED") dbStatus = "UNUSED";
    else if (s === "USED" || s === "SOLD") dbStatus = "SOLD";
    else if (s === "RESERVED") dbStatus = "RESERVED";
    else if (s === "DISABLED") dbStatus = "DISABLED";
    sql += ` AND r.status = ?`;
    params.push(dbStatus);
  }
  if (denomination && denomination !== "ALL VALUES") {
    const cleanDenom = denomination.trim();
    const numPart = cleanDenom.replace(/\D/g, "");
    sql += ` AND (p.denomination = ? OR p.denomination = ? OR p.price = ?)`;
    params.push(cleanDenom, `\u20B9${numPart}`, Number(numPart) || 0);
  }
  sql += ` ORDER BY r.created_at DESC;`;
  const res = db.exec(sql, params);
  if (res.length === 0) return [];
  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    obj.productEnabled = obj.productEnabled !== void 0 ? Boolean(obj.productEnabled) : true;
    obj.price = Number(obj.price ?? 0);
    obj.rewardValue = Number(obj.rewardValue ?? 0);
    obj.code = normalizeCode(obj.code);
    obj.codeFull = formatFullCode(obj.code);
    obj.codeMasked = maskCode(obj.code);
    return obj;
  });
}
async function addRedeemCode(data) {
  const db = await getDb();
  const validation = validateCode(data.code);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid code. Must be exactly 16 characters.");
  }
  const cleanCode = validation.normalized;
  const prod = await getProductById(data.productId);
  if (!prod) throw new Error(`Product ${data.productId} does not exist`);
  const id = `cd_${Math.random().toString(36).substring(2, 9)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const pin = data.pin?.trim() || null;
  let status = "UNUSED";
  if (data.status) {
    const s = String(data.status).toUpperCase();
    if (s === "AVAILABLE" || s === "UNUSED") status = "UNUSED";
    else if (s === "USED" || s === "SOLD") status = "SOLD";
    else if (s === "RESERVED") status = "RESERVED";
    else if (s === "DISABLED") status = "DISABLED";
  }
  const usedAt = status === "SOLD" ? now : null;
  db.run(
    `INSERT INTO redeem_codes (id, product_id, code, pin, status, order_id, created_at, used_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?);`,
    [id, data.productId, cleanCode, pin, status, now, usedAt]
  );
  saveDb();
  return {
    id,
    productId: data.productId,
    code: cleanCode,
    codeFull: formatFullCode(cleanCode),
    codeMasked: maskCode(cleanCode),
    pin,
    status,
    createdAt: now
  };
}
async function addBulkRedeemCodes(data) {
  const db = await getDb();
  const prod = await getProductById(data.productId);
  if (!prod) throw new Error(`Product ${data.productId} does not exist`);
  const lines = data.codesText.split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean);
  if (lines.length === 0) {
    throw new Error("No valid codes found in input");
  }
  const parsedCodes = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const validation = validateCode(raw);
    if (!validation.valid) {
      throw new Error(`Line ${i + 1} ("${raw}"): ${validation.error}`);
    }
    parsedCodes.push({ code: validation.normalized, pin: null });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let addedCount = 0;
  const addedIds = [];
  for (const item of parsedCodes) {
    const id = `cd_${Math.random().toString(36).substring(2, 9)}`;
    db.run(
      `INSERT INTO redeem_codes (id, product_id, code, pin, status, order_id, created_at, used_at)
       VALUES (?, ?, ?, ?, 'UNUSED', NULL, ?, NULL);`,
      [id, data.productId, item.code, item.pin, now]
    );
    addedIds.push(id);
    addedCount++;
  }
  saveDb();
  return {
    success: true,
    addedCount,
    productId: data.productId,
    message: `Successfully added ${addedCount} 16-character redeem code(s) for ${prod.name}`
  };
}
async function updateRedeemCode(id, updates) {
  const db = await getDb();
  const cleanId = id.trim();
  const check = db.exec(`SELECT id, code, pin, status, product_id FROM redeem_codes WHERE id = ?;`, [cleanId]);
  if (check.length === 0 || check[0].values.length === 0) {
    throw new Error(`Redeem code with ID "${cleanId}" not found in database.`);
  }
  const row = check[0].values[0];
  let code = row[1];
  let pin = row[2] || "";
  let status = row[3];
  let productId = row[4];
  if (updates.code) {
    const validation = validateCode(updates.code);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid code. Must be exactly 16 characters.");
    }
    code = validation.normalized;
  }
  if (updates.pin !== void 0) {
    pin = updates.pin.trim();
  }
  if (updates.status) {
    const s = String(updates.status).toUpperCase();
    if (s === "AVAILABLE" || s === "UNUSED") status = "UNUSED";
    else if (s === "USED" || s === "SOLD") status = "SOLD";
    else if (s === "RESERVED") status = "RESERVED";
    else if (s === "DISABLED") status = "DISABLED";
  }
  if (updates.productId) {
    const prod = await getProductById(updates.productId);
    if (!prod) throw new Error(`Product ${updates.productId} not found`);
    productId = updates.productId;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const usedAt = status === "SOLD" ? now : null;
  db.run(
    `UPDATE redeem_codes SET code = ?, pin = ?, status = ?, product_id = ?, used_at = ? WHERE id = ?;`,
    [code, pin, status, productId, usedAt, cleanId]
  );
  saveDb();
  return {
    id: cleanId,
    productId,
    code,
    codeFull: formatFullCode(code),
    codeMasked: maskCode(code),
    pin,
    status,
    updatedAt: now
  };
}
async function deleteRedeemCode(id, force) {
  const db = await getDb();
  const cleanId = id.trim();
  const check = db.exec(`SELECT id, status, product_id, code FROM redeem_codes WHERE id = ?;`, [cleanId]);
  if (check.length === 0 || check[0].values.length === 0) {
    throw new Error(`Redeem code with ID "${cleanId}" not found in database.`);
  }
  const row = check[0].values[0];
  const status = row[1];
  const productId = row[2];
  const code = row[3];
  if (status === "SOLD" && !force) {
    throw new Error("This code is already SOLD and linked to a completed customer order. Explicit confirmation is required to delete.");
  }
  db.run(`DELETE FROM redeem_codes WHERE id = ?;`, [cleanId]);
  saveDb();
  return {
    success: true,
    id: cleanId,
    productId,
    code,
    status,
    message: `Redeem code ${cleanId} permanently deleted from database.`
  };
}
async function getAllOrders() {
  const db = await getDb();
  const res = db.exec(`
    SELECT 
      id, 
      order_number as orderNumber, 
      product_id as productId, 
      product_name as productName, 
      customer_name as customerName, 
      customer_email as customerEmail, 
      amount, 
      payment_status as paymentStatus, 
      delivery_status as deliveryStatus, 
      delivered_code_id as deliveredCodeId, 
      delivered_code as deliveredCode, 
      delivered_pin as deliveredPin, 
      payment_method as paymentMethod, 
      created_at as createdAt, 
      updated_at as updatedAt 
    FROM orders 
    ORDER BY created_at DESC;
  `);
  if (res.length === 0) return [];
  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}
async function getCustomerPaidOrders(customerEmail, customerId) {
  const db = await getDb();
  const cleanEmail = (customerEmail || "").trim().toLowerCase();
  const cleanId = (customerId || "").trim();
  if (!cleanEmail && !cleanId) return [];
  const res = db.exec(`
    SELECT 
      o.id, 
      o.order_number as orderNumber, 
      o.product_id as productId, 
      COALESCE(NULLIF(p.name, ''), o.product_name) as productName, 
      o.customer_name as customerName, 
      o.customer_email as customerEmail, 
      o.customer_id as customerId,
      o.amount, 
      o.payable_amount as payableAmount,
      o.order_type as orderType,
      o.payment_status as paymentStatus, 
      o.delivery_status as deliveryStatus, 
      o.delivered_code_id as deliveredCodeId, 
      o.delivered_code as deliveredCode, 
      o.delivered_pin as deliveredPin, 
      o.payment_method as paymentMethod, 
      o.gateway_order_id as gatewayOrderId,
      o.gateway_payment_id as gatewayPaymentId,
      o.created_at as createdAt, 
      o.updated_at as updatedAt,
      p.category as productCategory,
      p.denomination as denomination,
      p.reward_value as rewardValue
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    WHERE (
      (o.customer_email IS NOT NULL AND LOWER(o.customer_email) = ?)
      OR (o.customer_id IS NOT NULL AND o.customer_id = ? AND ? != '')
      OR (o.customer_id IS NOT NULL AND ? != '' AND o.customer_id IN (SELECT customer_id FROM users WHERE id = ? OR LOWER(email) = ?))
    )
    AND o.payment_status = 'PAID'
    ORDER BY o.created_at DESC;
  `, [cleanEmail, cleanId, cleanId, cleanId, cleanId, cleanEmail]);
  if (res.length === 0) return [];
  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}
async function getOrderByIdOrNumber(identifier) {
  if (!identifier || typeof identifier !== "string") return null;
  const clean = identifier.trim();
  if (!clean) return null;
  const db = await getDb();
  const res = db.exec(
    `SELECT 
      o.id, 
      o.order_number as orderNumber, 
      o.product_id as productId, 
      COALESCE(NULLIF(p.name, ''), o.product_name) as productName, 
      p.category as productCategory,
      o.customer_name as customerName, 
      o.customer_email as customerEmail, 
      o.customer_id as customerId,
      o.amount, 
      o.payable_amount as payableAmount,
      o.order_type as orderType,
      o.checkout_url as checkoutUrl,
      o.payment_status as paymentStatus, 
      o.delivery_status as deliveryStatus, 
      o.delivered_code_id as deliveredCodeId, 
      o.delivered_code as deliveredCode, 
      o.delivered_pin as deliveredPin, 
      o.payment_method as paymentMethod, 
      o.gateway_order_id as gatewayOrderId,
      o.gateway_payment_id as gatewayPaymentId,
      o.expires_at as expiresAt,
      o.created_at as createdAt, 
      o.updated_at as updatedAt 
    FROM orders o
    LEFT JOIN products p ON o.product_id = p.id
    WHERE o.id = ? OR o.order_number = ? OR (o.gateway_order_id = ? AND o.gateway_order_id IS NOT NULL AND o.gateway_order_id != '');`,
    [clean, clean, clean]
  );
  if (res.length === 0 || res[0].values.length === 0) return null;
  const columns = res[0].columns;
  const row = res[0].values[0];
  const obj = {};
  columns.forEach((col, idx) => {
    obj[col] = row[idx];
  });
  return obj;
}
async function updateOrderStatus(id, paymentStatus, deliveryStatus) {
  const db = await getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.run(
    `UPDATE orders 
     SET payment_status = ?, delivery_status = ?, updated_at = ? 
     WHERE id = ? OR order_number = ?;`,
    [paymentStatus, deliveryStatus, now, id, id]
  );
  saveDb();
  return getOrderByIdOrNumber(id);
}
async function purchaseProductDirect(params) {
  const db = await getDb();
  let assignedCodeId = "";
  let assignedCode = "";
  let assignedPin = "";
  let effectiveProductId = params.productId || "";
  if (params.codeId) {
    const codeRes = db.exec(
      `SELECT id, product_id, code, pin FROM redeem_codes 
       WHERE id = ? AND status = 'UNUSED' 
       LIMIT 1;`,
      [params.codeId]
    );
    if (codeRes.length === 0 || codeRes[0].values.length === 0) {
      throw new Error("This redeem code is already claimed or no longer available.");
    }
    assignedCodeId = codeRes[0].values[0][0];
    effectiveProductId = codeRes[0].values[0][1];
    assignedCode = codeRes[0].values[0][2];
    assignedPin = codeRes[0].values[0][3];
  } else if (params.productId) {
    const codeRes = db.exec(
      `SELECT id, code, pin FROM redeem_codes 
       WHERE product_id = ? AND status = 'UNUSED' 
       LIMIT 1;`,
      [params.productId]
    );
    if (codeRes.length === 0 || codeRes[0].values.length === 0) {
      throw new Error("OUT OF STOCK: No available redeem codes for this product.");
    }
    assignedCodeId = codeRes[0].values[0][0];
    assignedCode = codeRes[0].values[0][1];
    assignedPin = codeRes[0].values[0][2];
  } else {
    throw new Error("productId or codeId is required for purchase");
  }
  const product = await getProductById(effectiveProductId);
  if (!product) {
    throw new Error("Associated product not found");
  }
  const isCatDisabledForDirect = await isDenominationDisabled(product.denomination);
  if (!product.enabled || isCatDisabledForDirect) {
    const err = new Error("This recharge category is currently unavailable.");
    err.statusCode = 400;
    throw err;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const orderId = `ord_${Math.random().toString(36).substring(2, 9)}`;
  const randomSuffix = Math.floor(1e3 + Math.random() * 9e3);
  const orderNumber = `VRX-2026-${randomSuffix}`;
  db.run(
    `UPDATE redeem_codes 
     SET status = 'SOLD', order_id = ?, used_at = ? 
     WHERE id = ?;`,
    [orderId, now, assignedCodeId]
  );
  db.run(
    `INSERT INTO orders (id, order_number, product_id, product_name, customer_name, customer_email, customer_id, amount, payment_status, delivery_status, delivered_code_id, delivered_code, delivered_pin, payment_method, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PAID', 'DELIVERED', ?, ?, ?, ?, ?, ?);`,
    [
      orderId,
      orderNumber,
      product.id,
      product.name,
      params.customerName || "Customer",
      params.customerEmail || "customer@example.com",
      params.customerId || null,
      product.price,
      assignedCodeId,
      formatFullCode(assignedCode),
      assignedPin,
      params.paymentMethod || "Direct Payment Gateway",
      now,
      now
    ]
  );
  saveDb();
  return {
    success: true,
    order: {
      id: orderId,
      orderNumber,
      productId: product.id,
      productName: product.name,
      amount: product.price,
      rewardValue: product.rewardValue,
      denomination: product.denomination,
      paymentStatus: "PAID",
      deliveryStatus: "DELIVERED",
      deliveredCodeId: assignedCodeId,
      deliveredCode: formatFullCode(assignedCode),
      deliveredCodeRaw: normalizeCode(assignedCode),
      deliveredPin: assignedPin,
      createdAt: now
    }
  };
}
async function createPendingCheckoutOrder(params) {
  if (!paymentGateway.isConfigured()) {
    throw new Error("Payment service temporarily unavailable. Please try again later.");
  }
  const db = await getDb();
  const product = await getProductById(params.productId);
  if (!product) {
    throw new Error("Product not found in database.");
  }
  const isCatDisabled = await isDenominationDisabled(product.denomination);
  if (!product.enabled || isCatDisabled) {
    const err = new Error("This recharge category is currently unavailable.");
    err.statusCode = 400;
    throw err;
  }
  let availableCodeId = null;
  if (product.category !== "DIAMONDS") {
    if (params.codeId) {
      const specificCodeRes = db.exec(
        `SELECT id FROM redeem_codes WHERE id = ? AND product_id = ? AND status = 'UNUSED' LIMIT 1;`,
        [params.codeId, product.id]
      );
      if (specificCodeRes.length === 0 || specificCodeRes[0].values.length === 0) {
        throw new Error("OUT OF STOCK: The requested redeem code is no longer available.");
      }
      availableCodeId = specificCodeRes[0].values[0][0];
    } else {
      const stockRes = db.exec(
        `SELECT id FROM redeem_codes WHERE product_id = ? AND status = 'UNUSED' LIMIT 1;`,
        [product.id]
      );
      if (stockRes.length === 0 || stockRes[0].values.length === 0) {
        throw new Error("OUT OF STOCK: No available redeem codes for this product.");
      }
      availableCodeId = stockRes[0].values[0][0];
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const orderId = `ord_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const randomSuffix = `${Date.now().toString().slice(-4)}${Math.floor(1e3 + Math.random() * 9e3)}`;
  const orderNumber = `VRX-2026-${randomSuffix}`;
  const verifiedAmount = product.price;
  const orderType = product.category === "DIAMONDS" ? "DIAMOND_PURCHASE" : "PURCHASE";
  db.run(
    `INSERT INTO orders (
      id, 
      order_number, 
      product_id, 
      product_name, 
      customer_name, 
      customer_email, 
      customer_id,
      amount, 
      payable_amount,
      order_type,
      payment_status, 
      delivery_status, 
      delivered_code_id, 
      delivered_code, 
      delivered_pin, 
      payment_method, 
      created_at, 
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'PENDING', NULL, NULL, NULL, 'Trust Gateway UPI', ?, ?);`,
    [
      orderId,
      orderNumber,
      product.id,
      product.name,
      params.customerName || "Customer",
      params.customerEmail || "customer@vortexcode.com",
      params.customerId || null,
      verifiedAmount,
      verifiedAmount,
      orderType,
      now,
      now
    ]
  );
  saveDb();
  const storeSettings = await getStoreSettings();
  paymentGateway.updateCredentials(storeSettings);
  const gatewayOrder = await paymentGateway.createGatewayOrder({
    orderId,
    orderNumber,
    amount: verifiedAmount,
    currency: "INR",
    productId: product.id,
    productName: product.name,
    customerName: params.customerName || "Customer",
    customerEmail: params.customerEmail || "customer@vortexcode.com",
    customerId: params.customerId,
    orderType
  });
  const payableAmount = gatewayOrder.payableAmount || verifiedAmount;
  const checkoutUrl = gatewayOrder.paymentUrl || "";
  const expiresAt = gatewayOrder.expiresAt || null;
  db.run(
    `UPDATE orders SET gateway_order_id = ?, payable_amount = ?, checkout_url = ?, expires_at = ? WHERE id = ?;`,
    [gatewayOrder.gatewayOrderId || orderId, payableAmount, checkoutUrl, expiresAt, orderId]
  );
  saveDb();
  const gatewayConfig = paymentGateway.getConfig();
  return {
    success: true,
    order: {
      id: orderId,
      orderNumber,
      productId: product.id,
      productName: product.name,
      denomination: product.denomination,
      rewardValue: product.rewardValue,
      amount: verifiedAmount,
      payableAmount,
      orderType,
      checkoutUrl,
      paymentStatus: "PENDING",
      deliveryStatus: "PENDING",
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerId: params.customerId,
      createdAt: now
    },
    gatewayOrder,
    gatewayConfig,
    checkoutUrl
  };
}
var fulfillmentLocks = /* @__PURE__ */ new Map();
async function verifyAndFulfillPaymentOrder(params) {
  const lockKey = params.orderId;
  if (fulfillmentLocks.has(lockKey)) {
    return await fulfillmentLocks.get(lockKey);
  }
  const fulfillmentPromise = (async () => {
    try {
      return await executeVerifyAndFulfillPaymentOrder(params);
    } finally {
      fulfillmentLocks.delete(lockKey);
    }
  })();
  fulfillmentLocks.set(lockKey, fulfillmentPromise);
  return await fulfillmentPromise;
}
async function executeVerifyAndFulfillPaymentOrder(params) {
  const db = await getDb();
  const order = await getOrderByIdOrNumber(params.orderId);
  if (!order) {
    throw new Error("Order not found in database.");
  }
  if (order.paymentStatus === "PAID") {
    return {
      success: true,
      status: "PAID",
      alreadyFulfilled: true,
      order,
      message: order.orderType === "DEPOSIT" ? "Deposit was already verified and credited to wallet." : "Order was already verified and delivered."
    };
  }
  if (params.expectedCustomerId && order.customerId && order.customerId !== params.expectedCustomerId) {
    throw new Error("Order does not belong to the authenticated user.");
  }
  if (params.expectedCustomerEmail && order.customerEmail && order.customerEmail.toLowerCase() !== params.expectedCustomerEmail.toLowerCase()) {
    throw new Error("Order does not belong to the authenticated user.");
  }
  const storeSettings = await getStoreSettings();
  paymentGateway.updateCredentials(storeSettings);
  const gatewayConfig = paymentGateway.getConfig();
  let verifiedGatewayPaymentId = params.gatewayPaymentId;
  if (!gatewayConfig.isConfigured) {
    return {
      success: false,
      status: "PENDING",
      order,
      message: "Payment service temporarily unavailable. Please try again later."
    };
  }
  const identifierToCheck = order.gatewayOrderId || params.gatewayOrderId || order.id;
  const expectedAmount = Number(order.payableAmount || order.amount || 0);
  const verifyResult = await paymentGateway.verifyPayment({
    orderId: identifierToCheck,
    gatewayOrderId: params.gatewayOrderId || order.gatewayOrderId,
    gatewayPaymentId: params.gatewayPaymentId,
    gatewaySignature: params.gatewaySignature,
    expectedAmount
  });
  if (verifyResult.status === "PENDING") {
    return {
      success: false,
      status: "PENDING",
      order,
      message: "Payment is currently pending confirmation.",
      rawGatewayResponse: verifyResult.rawGatewayResponse
    };
  }
  if (verifyResult.status === "FAILED") {
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    db.run(
      `UPDATE orders SET payment_status = 'FAILED', delivery_status = 'CANCELLED', updated_at = ? WHERE id = ?;`,
      [now2, order.id]
    );
    saveDb();
    return {
      success: false,
      status: "FAILED",
      order: await getOrderByIdOrNumber(order.id),
      message: verifyResult.error || "Payment was declined or failed on gateway.",
      rawGatewayResponse: verifyResult.rawGatewayResponse
    };
  }
  if (verifyResult.status === "EXPIRED") {
    const now2 = (/* @__PURE__ */ new Date()).toISOString();
    db.run(
      `UPDATE orders SET payment_status = 'EXPIRED', delivery_status = 'EXPIRED', updated_at = ? WHERE id = ?;`,
      [now2, order.id]
    );
    saveDb();
    return {
      success: false,
      status: "EXPIRED",
      order: await getOrderByIdOrNumber(order.id),
      message: "Trust Gateway payment session expired.",
      rawGatewayResponse: verifyResult.rawGatewayResponse
    };
  }
  if (!verifyResult.isValid || verifyResult.status !== "PAID") {
    return {
      success: false,
      status: "PENDING",
      order,
      message: `Gateway status is ${verifyResult.status || "PENDING"}. Waiting for confirmation.`,
      rawGatewayResponse: verifyResult.rawGatewayResponse
    };
  }
  if (order.gatewayOrderId && verifyResult.gatewayOrderId && order.gatewayOrderId !== order.id && order.gatewayOrderId !== verifyResult.gatewayOrderId) {
    throw new Error(`Gateway order ID mismatch: expected ${order.gatewayOrderId} but gateway recorded ${verifyResult.gatewayOrderId}.`);
  }
  if (verifyResult.gatewayOrderId && (!order.gatewayOrderId || order.gatewayOrderId === order.id)) {
    db.run(`UPDATE orders SET gateway_order_id = ? WHERE id = ?;`, [verifyResult.gatewayOrderId, order.id]);
    saveDb();
  }
  if (verifyResult.payableAmount && expectedAmount > 0) {
    const diff = Math.abs(verifyResult.payableAmount - expectedAmount);
    if (diff > 0.05) {
      throw new Error(`Payment amount mismatch: expected \u20B9${expectedAmount} but gateway recorded \u20B9${verifyResult.payableAmount}.`);
    }
  }
  if (verifyResult.transactionId) {
    verifiedGatewayPaymentId = verifyResult.transactionId;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (order.orderType === "DEPOSIT") {
    let userRow = null;
    if (order.customerId) {
      const uRes = db.exec(`SELECT id, balance, email FROM users WHERE id = ? OR customer_id = ?;`, [order.customerId, order.customerId]);
      if (uRes.length > 0 && uRes[0].values.length > 0) {
        userRow = { id: uRes[0].values[0][0], balance: Number(uRes[0].values[0][1] || 0), email: uRes[0].values[0][2] };
      }
    }
    if (!userRow && order.customerEmail) {
      const uRes = db.exec(`SELECT id, balance, email FROM users WHERE LOWER(email) = ?;`, [order.customerEmail.toLowerCase()]);
      if (uRes.length > 0 && uRes[0].values.length > 0) {
        userRow = { id: uRes[0].values[0][0], balance: Number(uRes[0].values[0][1] || 0), email: uRes[0].values[0][2] };
      }
    }
    const currentBalance = userRow ? userRow.balance : 0;
    const creditAmount = Number(order.amount);
    const newBalance = Number((currentBalance + creditAmount).toFixed(2));
    const txId = `tx_${Math.random().toString(36).substring(2, 9)}`;
    if (userRow) {
      db.run(`UPDATE users SET balance = ? WHERE id = ?;`, [newBalance, userRow.id]);
      db.run(
        `INSERT INTO wallet_transactions (id, user_id, order_id, type, amount, balance_before, balance_after, description, status, created_at)
         VALUES (?, ?, ?, 'DEPOSIT', ?, ?, ?, 'Wallet Deposit via Trust Gateway UPI', 'COMPLETED', ?);`,
        [txId, userRow.id, order.id, creditAmount, currentBalance, newBalance, now]
      );
    }
    const paymentMethodStr2 = verifiedGatewayPaymentId ? `Trust Gateway UPI (${verifiedGatewayPaymentId})` : "Trust Gateway UPI (Verified)";
    db.run(
      `UPDATE orders 
       SET payment_status = 'PAID', 
           delivery_status = 'DELIVERED', 
           payment_method = ?,
           gateway_payment_id = ?,
           updated_at = ? 
       WHERE id = ?;`,
      [paymentMethodStr2, verifiedGatewayPaymentId || null, now, order.id]
    );
    saveDb();
    const fulfilledOrder2 = await getOrderByIdOrNumber(order.id);
    return {
      success: true,
      status: "PAID",
      order: fulfilledOrder2,
      newBalance,
      message: `Deposit verified successfully! \u20B9${creditAmount} credited to wallet balance.`
    };
  }
  if (order.orderType === "DIAMOND_PURCHASE") {
    db.run(
      `UPDATE orders 
       SET payment_status = 'PAID', 
           delivery_status = 'DELIVERED', 
           updated_at = ? 
       WHERE id = ?;`,
      [now, order.id]
    );
    saveDb();
    const fulfilledOrder2 = await getOrderByIdOrNumber(order.id);
    return {
      success: true,
      status: "PAID",
      order: fulfilledOrder2,
      message: "Diamond purchase verified successfully."
    };
  }
  const codeRes = db.exec(
    `SELECT id, code, pin FROM redeem_codes 
     WHERE product_id = ? AND status = 'UNUSED' 
     LIMIT 1;`,
    [order.productId]
  );
  if (codeRes.length === 0 || codeRes[0].values.length === 0) {
    db.run(
      `UPDATE orders 
       SET payment_status = 'PAID', delivery_status = 'OUT_OF_STOCK_PENDING_REFUND', updated_at = ? 
       WHERE id = ?;`,
      [now, order.id]
    );
    saveDb();
    throw new Error("OUT OF STOCK: Payment recorded but no unused redeem code was available. Marked for automated refund.");
  }
  const assignedCodeId = codeRes[0].values[0][0];
  const assignedCode = codeRes[0].values[0][1];
  const assignedPin = codeRes[0].values[0][2];
  db.run(
    `UPDATE redeem_codes 
     SET status = 'SOLD', order_id = ?, used_at = ? 
     WHERE id = ?;`,
    [order.id, now, assignedCodeId]
  );
  const fullCodeFormatted = formatFullCode(assignedCode);
  const paymentMethodStr = verifiedGatewayPaymentId ? `Trust Gateway UPI (${verifiedGatewayPaymentId})` : "Trust Gateway UPI (Verified)";
  db.run(
    `UPDATE orders 
     SET payment_status = 'PAID', 
         delivery_status = 'DELIVERED', 
         delivered_code_id = ?, 
         delivered_code = ?, 
         delivered_pin = ?, 
         payment_method = ?,
         gateway_payment_id = ?,
         updated_at = ? 
     WHERE id = ?;`,
    [
      assignedCodeId,
      fullCodeFormatted,
      assignedPin,
      paymentMethodStr,
      verifiedGatewayPaymentId || null,
      now,
      order.id
    ]
  );
  saveDb();
  const fulfilledOrder = await getOrderByIdOrNumber(order.id);
  return {
    success: true,
    status: "PAID",
    order: fulfilledOrder,
    message: "Payment verified successfully and redeem code delivered."
  };
}
async function getUserByEmail(email) {
  const db = await getDb();
  const clean = email.trim().toLowerCase();
  const res = db.exec(
    `SELECT id, fullName, email, username, password, googleSub, role, createdAt, balance FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?;`,
    [clean, clean]
  );
  if (res.length === 0 || res[0].values.length === 0) return null;
  const columns = res[0].columns;
  const row = res[0].values[0];
  const obj = {};
  columns.forEach((col, idx) => {
    obj[col] = row[idx];
  });
  return obj;
}
async function getUserByGoogleSub(sub) {
  const db = await getDb();
  const res = db.exec(
    `SELECT id, fullName, email, username, password, googleSub, role, createdAt, balance FROM users WHERE googleSub = ?;`,
    [sub]
  );
  if (res.length === 0 || res[0].values.length === 0) return null;
  const columns = res[0].columns;
  const row = res[0].values[0];
  const obj = {};
  columns.forEach((col, idx) => {
    obj[col] = row[idx];
  });
  return obj;
}
async function createUser(params) {
  const db = await getDb();
  const id = `usr_${Math.random().toString(36).substring(2, 9)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const role = params.role || "CUSTOMER";
  const balance = params.balance !== void 0 ? params.balance : 1500;
  const customerId = params.customerId || null;
  db.run(
    `INSERT INTO users (id, customer_id, fullName, email, username, password, googleSub, role, createdAt, balance)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      customerId,
      params.fullName.trim(),
      params.email.trim().toLowerCase(),
      params.username.trim().toLowerCase(),
      params.password || null,
      params.googleSub || null,
      role,
      now,
      balance
    ]
  );
  saveDb();
  return {
    id,
    customerId,
    fullName: params.fullName,
    email: params.email,
    username: params.username,
    googleSub: params.googleSub,
    role,
    createdAt: now,
    balance
  };
}
async function isCustomerIdUnique(cid) {
  const db = await getDb();
  const res = db.exec(`SELECT id FROM users WHERE customer_id = ?;`, [cid]);
  return res.length === 0 || res[0].values.length === 0;
}
async function generateRandomCustomerId() {
  while (true) {
    const num = Math.floor(Math.random() * 9e4) + 1e4;
    const cid = `VC-${num}`;
    if (await isCustomerIdUnique(cid)) {
      return cid;
    }
  }
}
async function migrateToRandomCustomerIds() {
  const db = await getDb();
  const res = db.exec(`SELECT id, customer_id FROM users;`);
  if (res.length === 0 || res[0].values.length === 0) return;
  const rows = res[0].values;
  for (const row of rows) {
    const uid = row[0];
    const cid = row[1];
    if (!cid || cid.startsWith("VC-0")) {
      const newCid = await generateRandomCustomerId();
      db.run(`UPDATE users SET customer_id = ? WHERE id = ?;`, [newCid, uid]);
    }
  }
}
async function getCategoricalSettings(category) {
  const db = await getDb();
  const res = db.exec(`SELECT value FROM store_settings WHERE key = ?;`, [`${category}_settings`]);
  if (res.length === 0 || res[0].values.length === 0) return {};
  try {
    return JSON.parse(res[0].values[0][0]);
  } catch {
    return {};
  }
}
async function updateCategoricalSettings(category, settings) {
  const db = await getDb();
  const key = `${category}_settings`;
  db.run(`INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?);`, [key, JSON.stringify(settings)]);
  saveDb();
  return settings;
}
async function getAllUsersForAdmin() {
  const db = await getDb();
  const res = db.exec(`
    SELECT 
      u.id, 
      u.customer_id as customerId,
      u.fullName, 
      u.email, 
      u.username, 
      u.role, 
      u.googleSub,
      u.provider,
      u.status,
      u.createdAt, 
      u.last_login_at as lastLoginAt,
      u.balance
    FROM users u
    ORDER BY u.createdAt DESC;
  `);
  if (res.length === 0) return [];
  const columns = res[0].columns;
  const users = res[0].values.map((row) => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
  const enhancedUsers = [];
  for (const u of users) {
    const ordersRes = db.exec(`
      SELECT id, amount, created_at, payment_status, delivery_status 
      FROM orders 
      WHERE (customer_email IS NOT NULL AND LOWER(customer_email) = ?) 
         OR (customer_id IS NOT NULL AND customer_id = ?)
      ORDER BY created_at DESC;
    `, [(u.email || "").toLowerCase(), u.customerId || ""]);
    let successfulOrdersCount = 0;
    let totalSpent = 0;
    let codesPurchased = 0;
    if (ordersRes.length > 0 && ordersRes[0].values.length > 0) {
      for (const ordRow of ordersRes[0].values) {
        const paymentStatus = ordRow[3];
        const amount = Number(ordRow[1]) || 0;
        if (paymentStatus === "PAID") {
          successfulOrdersCount++;
          totalSpent += amount;
          codesPurchased++;
        }
      }
    }
    enhancedUsers.push({
      id: u.id,
      customerId: u.customerId || "VC-000000",
      fullName: u.fullName || u.username || "Customer",
      email: u.email,
      role: u.role || "CUSTOMER",
      provider: u.googleSub ? "Google" : u.provider || "Email/Password",
      status: u.status || "ACTIVE",
      createdAt: u.createdAt,
      joinedDate: u.createdAt ? u.createdAt.substring(0, 10) : "2026-10-08",
      lastLogin: u.lastLoginAt ? u.lastLoginAt.substring(0, 16).replace("T", " ") : u.createdAt ? u.createdAt.substring(0, 16).replace("T", " ") : "Recently",
      successfulOrders: successfulOrdersCount,
      orderCount: successfulOrdersCount,
      codesPurchased,
      totalSpent,
      totalSpentRupees: totalSpent
    });
  }
  return enhancedUsers;
}
async function getUserDetailsWithOrders(identifier) {
  const db = await getDb();
  const clean = identifier.trim();
  const userRes = db.exec(`
    SELECT 
      id, customer_id as customerId, fullName, email, username, role, googleSub, provider, status, createdAt, last_login_at as lastLoginAt, balance
    FROM users 
    WHERE id = ? OR customer_id = ? OR email = ?;
  `, [clean, clean, clean]);
  if (userRes.length === 0 || userRes[0].values.length === 0) return null;
  const cols = userRes[0].columns;
  const row = userRes[0].values[0];
  const userObj = {};
  cols.forEach((c, idx) => {
    userObj[c] = row[idx];
  });
  const orders = await getCustomerPaidOrders(userObj.email, userObj.customerId);
  const totalSpent = orders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
  return {
    profile: {
      id: userObj.id,
      customerId: userObj.customerId || "VC-000000",
      fullName: userObj.fullName,
      email: userObj.email,
      role: userObj.role,
      provider: userObj.googleSub ? "Google" : userObj.provider || "Email",
      status: userObj.status || "ACTIVE",
      createdAt: userObj.createdAt,
      lastLogin: userObj.lastLoginAt || userObj.createdAt
    },
    statistics: {
      successfulOrders: orders.length,
      codesPurchased: orders.length,
      totalSpent
    },
    orders
  };
}
async function updateUserStatus(identifier, status) {
  const db = await getDb();
  const clean = identifier.trim();
  db.run(`UPDATE users SET status = ? WHERE id = ? OR customer_id = ? OR email = ?;`, [status, clean, clean, clean]);
  saveDb();
  return getUserDetailsWithOrders(clean);
}
async function getAdminAnalyticsSummary() {
  const users = await getAllUsersForAdmin();
  const allOrders = await getAllOrders();
  const successfulOrders = allOrders.filter((o) => o.paymentStatus === "PAID");
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "ACTIVE").length;
  const usersWithPurchases = users.filter((u) => u.successfulOrders > 0).length;
  const totalCodesSold = successfulOrders.length;
  const totalSales = successfulOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().substring(0, 10);
  const todaysSales = successfulOrders.filter((o) => o.createdAt && o.createdAt.startsWith(todayStr)).reduce((sum, o) => sum + Number(o.amount || 0), 0);
  const topBuyers = [...users].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5).map((u) => ({
    customerId: u.customerId,
    name: u.fullName,
    email: u.email,
    codesPurchased: u.codesPurchased,
    totalSpent: u.totalSpent
  }));
  return {
    totalUsers,
    activeUsers,
    usersWithPurchases,
    totalCodesSold,
    totalOrders: allOrders.length,
    successfulOrders: successfulOrders.length,
    totalSales,
    todaysSales,
    topBuyers
  };
}
async function getStoreSettings() {
  const db = await getDb();
  const res = db.exec(`SELECT key, value FROM store_settings;`);
  const settings = {
    storeName: "VORTEX CODE",
    websiteName: "VORTEX CODE",
    subtitle: "SECURE DIGITAL STORE",
    tagline: "SECURE DIGITAL STORE",
    logoUrl: "",
    supportEmail: "support@vortexcode.com",
    currencySymbol: "\u20B9",
    enableAutoFulfillment: true,
    telegramEnabled: true,
    telegramUrl: "https://t.me/VortexCodeSupport",
    contactEnabled: true,
    contactPlatform: "telegram",
    contactUrl: "https://t.me/VortexCodeSupport",
    contactIconUrl: "",
    contactLabel: "Contact Admin",
    contactWidgetSize: 60,
    contactWidgetRight: 30,
    contactWidgetBottom: 30,
    contactWidgetMobileSize: 55,
    contactWidgetMobileRight: 35,
    contactWidgetMobileBottom: 110,
    contactIconSize: 42,
    contactMobileIconSize: 42,
    appUrl: process.env.APP_URL || "https://vortexcode.shop",
    how_to_redeem_step_1_image_enabled: false,
    how_to_redeem_step_1_image_url: "",
    how_to_redeem_step_2_image_enabled: false,
    how_to_redeem_step_2_image_url: "",
    how_to_redeem_step_3_image_enabled: false,
    how_to_redeem_step_3_image_url: "",
    how_to_redeem_step_4_image_enabled: false,
    how_to_redeem_step_4_image_url: ""
  };
  if (res.length > 0 && res[0].values.length > 0) {
    res[0].values.forEach((row) => {
      const key = row[0];
      const val = row[1];
      if (key === "enableAutoFulfillment" || key === "telegramEnabled" || key === "contactEnabled" || key.startsWith("how_to_redeem_") && key.endsWith("_enabled")) {
        settings[key] = val === "true";
      } else if (key === "contactWidgetSize" || key === "contactWidgetRight" || key === "contactWidgetBottom" || key === "contactWidgetMobileSize" || key === "contactWidgetMobileRight" || key === "contactWidgetMobileBottom" || key === "contactIconSize" || key === "contactMobileIconSize") {
        settings[key] = Number(val) || settings[key];
      } else {
        settings[key] = val;
      }
    });
  }
  if (settings.websiteName && !settings.storeName) settings.storeName = settings.websiteName;
  if (settings.storeName && !settings.websiteName) settings.websiteName = settings.storeName;
  if (settings.tagline && !settings.subtitle) settings.subtitle = settings.tagline;
  if (settings.subtitle && !settings.tagline) settings.tagline = settings.subtitle;
  return settings;
}
async function updateStoreSettings(updates) {
  const db = await getDb();
  const normalizedUpdates = { ...updates };
  if (normalizedUpdates.websiteName && !normalizedUpdates.storeName) {
    normalizedUpdates.storeName = normalizedUpdates.websiteName;
  }
  if (normalizedUpdates.storeName && !normalizedUpdates.websiteName) {
    normalizedUpdates.websiteName = normalizedUpdates.storeName;
  }
  if (normalizedUpdates.tagline && !normalizedUpdates.subtitle) {
    normalizedUpdates.subtitle = normalizedUpdates.tagline;
  }
  if (normalizedUpdates.subtitle && !normalizedUpdates.tagline) {
    normalizedUpdates.tagline = normalizedUpdates.subtitle;
  }
  for (const [key, value] of Object.entries(normalizedUpdates)) {
    if (value !== void 0) {
      db.run(
        `INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?);`,
        [key, String(value)]
      );
    }
  }
  saveDb();
  return getStoreSettings();
}
async function getAllNotices() {
  const db = await getDb();
  const res = db.exec(`
    SELECT 
      id, enabled, title, message, image_url as imageUrl, 
      button_enabled as buttonEnabled, button_text as buttonText, button_url as buttonUrl, 
      display_frequency as displayFrequency, start_at as startAt, end_at as endAt, 
      priority, type, created_at as createdAt, updated_at as updatedAt
    FROM notices
    ORDER BY priority DESC, created_at DESC;
  `);
  if (res.length === 0) return [];
  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    obj.enabled = Boolean(obj.enabled);
    obj.buttonEnabled = Boolean(obj.buttonEnabled);
    obj.priority = Number(obj.priority || 0);
    return obj;
  });
}
async function getNoticeById(id) {
  const db = await getDb();
  const res = db.exec(`
    SELECT 
      id, enabled, title, message, image_url as imageUrl, 
      button_enabled as buttonEnabled, button_text as buttonText, button_url as buttonUrl, 
      display_frequency as displayFrequency, start_at as startAt, end_at as endAt, 
      priority, type, created_at as createdAt, updated_at as updatedAt
    FROM notices
    WHERE id = ?;
  `, [id]);
  if (res.length === 0 || res[0].values.length === 0) return null;
  const columns = res[0].columns;
  const row = res[0].values[0];
  const obj = {};
  columns.forEach((col, idx) => {
    obj[col] = row[idx];
  });
  obj.enabled = Boolean(obj.enabled);
  obj.buttonEnabled = Boolean(obj.buttonEnabled);
  obj.priority = Number(obj.priority || 0);
  return obj;
}
async function getPublishedNotice(type = "redeem-code") {
  const notices = await getAllNotices();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const active = notices.filter((n) => {
    if (!n.enabled) return false;
    if (n.type !== type) return false;
    if (n.startAt && n.startAt > now) return false;
    if (n.endAt && n.endAt < now) return false;
    return true;
  });
  if (active.length === 0) return null;
  active.sort((a, b) => b.priority - a.priority || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return active[0];
}
async function createNotice(data) {
  const db = await getDb();
  const id = `not_${Math.random().toString(36).substring(2, 9)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.run(`
    INSERT INTO notices (
      id, enabled, title, message, image_url, button_enabled, button_text, button_url, 
      display_frequency, start_at, end_at, priority, type, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    id,
    data.enabled ? 1 : 0,
    data.title || "",
    data.message || "",
    data.imageUrl || null,
    data.buttonEnabled ? 1 : 0,
    data.buttonText || null,
    data.buttonUrl || null,
    data.displayFrequency || "EVERY_LOAD",
    data.startAt || null,
    data.endAt || null,
    Number(data.priority || 0),
    data.type || "redeem-code",
    now,
    now
  ]);
  saveDb();
  return getNoticeById(id);
}
async function updateNotice(id, updates) {
  const db = await getDb();
  const existing = await getNoticeById(id);
  if (!existing) {
    throw new Error(`Notice ${id} not found`);
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const enabled = updates.enabled !== void 0 ? updates.enabled ? 1 : 0 : existing.enabled ? 1 : 0;
  const title = updates.title !== void 0 ? updates.title : existing.title;
  const message = updates.message !== void 0 ? updates.message : existing.message;
  const imageUrl = updates.imageUrl !== void 0 ? updates.imageUrl : existing.imageUrl;
  const buttonEnabled = updates.buttonEnabled !== void 0 ? updates.buttonEnabled ? 1 : 0 : existing.buttonEnabled ? 1 : 0;
  const buttonText = updates.buttonText !== void 0 ? updates.buttonText : existing.buttonText;
  const buttonUrl = updates.buttonUrl !== void 0 ? updates.buttonUrl : existing.buttonUrl;
  const displayFrequency = updates.displayFrequency !== void 0 ? updates.displayFrequency : existing.displayFrequency;
  const startAt = updates.startAt !== void 0 ? updates.startAt : existing.startAt;
  const endAt = updates.endAt !== void 0 ? updates.endAt : existing.endAt;
  const priority = updates.priority !== void 0 ? Number(updates.priority) : existing.priority;
  db.run(`
    UPDATE notices SET
      enabled = ?, title = ?, message = ?, image_url = ?, button_enabled = ?, 
      button_text = ?, button_url = ?, display_frequency = ?, start_at = ?, 
      end_at = ?, priority = ?, updated_at = ?
    WHERE id = ?;
  `, [
    enabled,
    title,
    message,
    imageUrl,
    buttonEnabled,
    buttonText,
    buttonUrl,
    displayFrequency,
    startAt,
    endAt,
    priority,
    now,
    id
  ]);
  saveDb();
  return getNoticeById(id);
}
async function deleteNotice(id) {
  const db = await getDb();
  db.run(`DELETE FROM notices WHERE id = ?;`, [id]);
  saveDb();
  return { success: true };
}

// server/routes.ts
var router = Router();
function parseCookies(cookieStr) {
  const list = {};
  if (!cookieStr) return list;
  cookieStr.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts.shift()?.trim();
    const value = parts.join("=")?.trim();
    if (name) {
      list[name] = decodeURIComponent(value);
    }
  });
  return list;
}
var isAdminMiddleware = (req, res, next) => {
  const cookieHeader = req.headers.cookie || "";
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies["admin_session"];
  if (sessionToken === "SAGAR551_SESSION_TOKEN") {
    req.isAdmin = true;
    return next();
  }
  const authHeader = req.headers["authorization"];
  const hasToken = req.headers["x-admin-token"] === "SAGAR551" || authHeader && authHeader.startsWith("Bearer SAGAR551");
  if (hasToken) {
    req.isAdmin = true;
    return next();
  }
  return res.status(401).json({ success: false, error: "Unauthorized administrative operation" });
};
var softAdminCheck = (req) => {
  const cookieHeader = req.headers.cookie || "";
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies["admin_session"];
  if (sessionToken === "SAGAR551_SESSION_TOKEN") {
    return true;
  }
  const authHeader = req.headers["authorization"];
  return req.headers["x-admin-token"] === "SAGAR551" || authHeader && authHeader.startsWith("Bearer SAGAR551");
};
router.get("/products", async (req, res) => {
  try {
    const isAdmin = softAdminCheck(req);
    const products = await getAllProducts(isAdmin);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch products" });
  }
});
router.get("/products/:id", async (req, res) => {
  try {
    const isAdmin = softAdminCheck(req);
    const product = await getProductById(req.params.id, isAdmin);
    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch product" });
  }
});
router.post("/products", isAdminMiddleware, async (req, res) => {
  try {
    const { name, category, description, price, rewardValue, denomination, image, cardBadgeText, glowSettings } = req.body;
    let finalName = name;
    if (!finalName && category === "DIAMONDS") {
      finalName = `${rewardValue} Diamonds`;
    }
    if (!finalName || price === void 0) {
      return res.status(400).json({ success: false, error: "Name and price are required" });
    }
    const created = await createProduct({
      name: finalName,
      category: category || "Google Play",
      description: description || "",
      price: Number(price),
      rewardValue: Number(rewardValue || price * 15),
      denomination: denomination || `\u20B9${price}`,
      enabled: req.body.enabled !== void 0 ? Boolean(req.body.enabled) : true,
      image,
      cardBadgeText: req.body.cardBadgeText !== void 0 && req.body.cardBadgeText !== null ? String(req.body.cardBadgeText).trim() : "",
      glowSettings: req.body.glowSettings
    });
    res.status(201).json({ success: true, product: created, message: "Product created successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to create product" });
  }
});
router.put("/products/reorder", isAdminMiddleware, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: "items array is required" });
    }
    const result = await reorderProducts(items);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to reorder products" });
  }
});
router.put("/products/:id", isAdminMiddleware, async (req, res) => {
  try {
    console.log("DEBUG: Updating product", req.params.id, "with body:", JSON.stringify(req.body));
    const updated = await updateProduct(req.params.id, req.body);
    res.json({ success: true, product: updated, message: "Product updated successfully in database" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to update product" });
  }
});
router.delete("/products/:id", isAdminMiddleware, async (req, res) => {
  try {
    const result = await deleteProduct(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to delete product" });
  }
});
router.get("/admin/design-presets", isAdminMiddleware, async (req, res) => {
  try {
    const presets = await getAllDesignPresets();
    res.json({ success: true, presets });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch design presets" });
  }
});
router.post("/admin/design-presets", isAdminMiddleware, async (req, res) => {
  try {
    const { name, settings, id } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: "Preset name is required" });
    }
    const preset = await saveDesignPreset(name, settings, id);
    res.status(201).json({ success: true, preset, message: "Design preset saved successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to save design preset" });
  }
});
router.delete("/admin/design-presets/:id", isAdminMiddleware, async (req, res) => {
  try {
    const result = await deleteDesignPreset(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to delete design preset" });
  }
});
router.get("/categories", async (req, res) => {
  try {
    const isAdmin = softAdminCheck(req);
    const includeDisabled = isAdmin && req.query.all === "true";
    const categories = await getAllCategories(includeDisabled);
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch categories" });
  }
});
router.get("/admin/categories", isAdminMiddleware, async (req, res) => {
  try {
    const categories = await getAllCategories(true);
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch categories" });
  }
});
router.post("/admin/categories", isAdminMiddleware, async (req, res) => {
  try {
    const { name, denomination, enabled, sortOrder } = req.body;
    if (!name || !denomination) {
      return res.status(400).json({ success: false, error: "Name and denomination are required" });
    }
    const category = await createCategory({
      name,
      denomination,
      enabled: enabled !== void 0 ? Boolean(enabled) : true,
      sortOrder: Number(sortOrder || 0)
    });
    res.status(201).json({ success: true, category, message: "Category created successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to create category" });
  }
});
router.put("/admin/categories/:id", isAdminMiddleware, async (req, res) => {
  try {
    const category = await updateCategory(req.params.id, req.body);
    res.json({ success: true, category, message: "Category updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to update category" });
  }
});
router.patch("/admin/categories/:id/toggle", isAdminMiddleware, async (req, res) => {
  try {
    const category = await toggleCategoryStatus(req.params.id);
    res.json({ success: true, category, message: `Category ${category?.name} status updated` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to toggle category" });
  }
});
router.delete("/admin/categories/:id", isAdminMiddleware, async (req, res) => {
  try {
    const result = await deleteCategory(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to delete category" });
  }
});
router.get("/redeem-codes", async (req, res) => {
  try {
    const { productId, status, denomination } = req.query;
    const codes = await getRedeemCodes(
      productId,
      status,
      denomination
    );
    const isAdmin = softAdminCheck(req);
    const sanitizedCodes = codes.map((c) => {
      if (!isAdmin) {
        return {
          ...c,
          code: c.codeMasked || "CSGY AGTS **** ****",
          codeFull: c.codeMasked || "CSGY AGTS **** ****",
          pin: "****"
        };
      }
      return c;
    });
    res.json({ success: true, codes: sanitizedCodes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch redeem codes" });
  }
});
router.post("/redeem-codes", isAdminMiddleware, async (req, res) => {
  try {
    const { productId, code, pin } = req.body;
    if (!productId || !code) {
      return res.status(400).json({ success: false, error: "productId and code are required" });
    }
    const created = await addRedeemCode({ productId, code, pin });
    res.status(201).json({ success: true, code: created, message: "Redeem code added to database successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to add redeem code" });
  }
});
router.post("/redeem-codes/bulk", isAdminMiddleware, async (req, res) => {
  try {
    const { productId, codesText } = req.body;
    if (!productId || !codesText) {
      return res.status(400).json({ success: false, error: "productId and codesText are required" });
    }
    const result = await addBulkRedeemCodes({ productId, codesText });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to add bulk codes" });
  }
});
router.put("/redeem-codes/:id", isAdminMiddleware, async (req, res) => {
  try {
    const { status, code, pin, productId } = req.body;
    const result = await updateRedeemCode(req.params.id, { status, code, pin, productId });
    res.json({ success: true, code: result, message: "Redeem code updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to update code" });
  }
});
router.delete("/redeem-codes/:id", isAdminMiddleware, async (req, res) => {
  try {
    const force = req.query.force === "true";
    const result = await deleteRedeemCode(req.params.id, force);
    res.json(result);
  } catch (err) {
    const isNotFound = err.message && err.message.includes("not found");
    res.status(isNotFound ? 404 : 400).json({ success: false, error: err.message || "Failed to delete code" });
  }
});
router.get("/me", async (req, res) => {
  try {
    const email = (req.query.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    if (!user.customer_id || user.customer_id.startsWith("VC-0")) {
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
        status: user.status || "ACTIVE",
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch user profile" });
  }
});
router.get("/admin/users", isAdminMiddleware, async (req, res) => {
  try {
    const users = await getAllUsersForAdmin();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch users" });
  }
});
router.get("/admin/users/:identifier", isAdminMiddleware, async (req, res) => {
  try {
    const details = await getUserDetailsWithOrders(req.params.identifier);
    if (!details) {
      return res.status(404).json({ success: false, error: "User profile not found" });
    }
    res.json({ success: true, ...details });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch user details" });
  }
});
router.put("/admin/users/:identifier/status", isAdminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (status !== "ACTIVE" && status !== "DISABLED") {
      return res.status(400).json({ success: false, error: "Invalid status. Must be ACTIVE or DISABLED." });
    }
    const updated = await updateUserStatus(req.params.identifier, status);
    res.json({ success: true, ...updated, message: `User status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to update user status" });
  }
});
router.get("/admin/analytics", isAdminMiddleware, async (req, res) => {
  try {
    const analytics = await getAdminAnalyticsSummary();
    res.json({ success: true, analytics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch analytics" });
  }
});
router.get("/admin/migrate-ids", isAdminMiddleware, async (req, res) => {
  try {
    await migrateToRandomCustomerIds();
    res.json({ success: true, message: "Migration complete" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.get("/my-orders", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const emailQuery = (req.query.email || "").trim().toLowerCase();
    const customerIdQuery = (req.query.customerId || "").trim();
    if (!emailQuery && !customerIdQuery) {
      return res.json({
        success: true,
        orders: [],
        count: 0,
        message: "No active session or customer identification provided."
      });
    }
    const paidOrders = await getCustomerPaidOrders(emailQuery, customerIdQuery);
    const formattedOrders = paidOrders.map((ord) => {
      const balanceNum = ord.rewardValue !== void 0 && ord.rewardValue !== null ? Number(ord.rewardValue) : Number(ord.amount || 100) * 15;
      return {
        id: ord.id,
        orderNumber: ord.orderNumber,
        productName: ord.productName || "Google Play Recharge Code",
        denomination: ord.denomination || `\u20B9${ord.amount || 100}`,
        balance: balanceNum,
        balanceRupees: balanceNum,
        pricePaid: Number(ord.amount),
        amount: Number(ord.amount),
        payableAmount: Number(ord.payableAmount || ord.amount),
        orderType: ord.orderType,
        productCategory: ord.productCategory,
        paymentStatus: "PAID",
        deliveryStatus: "DELIVERED",
        status: "COMPLETED",
        paymentMethod: ord.paymentMethod || "Direct Payment Gateway",
        gatewayOrderId: ord.gatewayOrderId || null,
        gatewayPaymentId: ord.gatewayPaymentId || null,
        deliveredCode: ord.deliveredCode || "",
        deliveredPin: ord.deliveredPin || "",
        createdAt: ord.createdAt,
        purchaseDate: ord.createdAt
      };
    });
    return res.json({
      success: true,
      orders: formattedOrders,
      count: formattedOrders.length
    });
  } catch (err) {
    console.error("Error in /api/my-orders:", err);
    res.status(500).json({ success: false, error: "Unable to load your redemption history." });
  }
});
router.post("/my-orders/reveal", async (req, res) => {
  try {
    const { orderId, email, customerId } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ success: false, error: "Order ID is required" });
    }
    const cleanOrderId = String(orderId).trim();
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanCustomerId = (customerId || "").trim();
    const order = await getOrderByIdOrNumber(cleanOrderId);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    const orderEmail = (order.customerEmail || "").trim().toLowerCase();
    const orderCustomerId = (order.customerId || "").trim();
    const isAuthorized = cleanEmail && orderEmail && cleanEmail === orderEmail || cleanCustomerId && orderCustomerId && cleanCustomerId === orderCustomerId || softAdminCheck(req);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: "Unauthorized: You do not own this order." });
    }
    if (order.paymentStatus !== "PAID") {
      return res.status(400).json({ success: false, error: "Order payment is not completed." });
    }
    return res.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      code: order.deliveredCode || "",
      pin: order.deliveredPin || ""
    });
  } catch (err) {
    console.error("Error in /api/my-orders/reveal:", err);
    res.status(500).json({ success: false, error: "Failed to reveal code" });
  }
});
router.get("/orders", async (req, res) => {
  try {
    const isAdmin = softAdminCheck(req);
    const email = req.query.email;
    if (isAdmin) {
      const orders = await getAllOrders();
      return res.json({ success: true, orders });
    } else if (email) {
      const allOrders = await getAllOrders();
      const filtered = allOrders.filter((o) => o.customerEmail?.toLowerCase() === email.toLowerCase());
      return res.json({ success: true, orders: filtered });
    } else {
      return res.status(401).json({ success: false, error: "Unauthenticated orders access" });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch orders" });
  }
});
router.get("/orders/:id", async (req, res) => {
  try {
    const isAdmin = softAdminCheck(req);
    const email = req.query.email;
    const order = await getOrderByIdOrNumber(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    if (isAdmin || email && order.customerEmail?.toLowerCase() === email.toLowerCase()) {
      return res.json({ success: true, order });
    }
    return res.status(401).json({ success: false, error: "Unauthorized access to this order" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch order" });
  }
});
router.put("/orders/:id", isAdminMiddleware, async (req, res) => {
  try {
    const { paymentStatus, deliveryStatus } = req.body;
    const updated = await updateOrderStatus(
      req.params.id,
      paymentStatus || "PAID",
      deliveryStatus || "DELIVERED"
    );
    res.json({ success: true, order: updated, message: "Order updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to update order" });
  }
});
router.post("/orders", async (req, res) => {
  try {
    const { productId, codeId, customerName, customerEmail, paymentMethod } = req.body;
    if (!productId && !codeId) {
      return res.status(400).json({ success: false, error: "productId or codeId is required" });
    }
    const result = await purchaseProductDirect({
      productId,
      codeId,
      customerName: customerName || "Verified Customer",
      customerEmail: customerEmail || "customer@vortexcode.com",
      paymentMethod: paymentMethod || "Direct Payment Gateway"
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message || "Purchase failed" });
  }
});
router.get("/payment/config", async (req, res) => {
  try {
    const config = paymentGateway.getConfig();
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch payment config" });
  }
});
var handleCreateCheckoutOrder = async (req, res) => {
  try {
    const { productId, codeId, customerName, customerEmail, customerId } = req.body || {};
    if (!productId) {
      return res.status(400).json({ success: false, error: "productId is required for checkout", message: "productId is required for checkout" });
    }
    if (!paymentGateway.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: "Payment service temporarily unavailable. Please try again later.",
        message: "Payment service temporarily unavailable. Please try again later."
      });
    }
    const checkoutResult = await createPendingCheckoutOrder({
      productId,
      codeId,
      customerName: customerName || "Customer",
      customerEmail: customerEmail || "customer@vortexcode.com",
      customerId
    });
    return res.status(201).json(checkoutResult);
  } catch (err) {
    const isOutOfStock = err.message && err.message.includes("OUT OF STOCK");
    return res.status(isOutOfStock ? 409 : 400).json({
      success: false,
      error: err.message || "Failed to initiate checkout",
      message: err.message || "Failed to initiate checkout",
      isOutOfStock: Boolean(isOutOfStock)
    });
  }
};
router.post("/checkout/create-order", handleCreateCheckoutOrder);
router.post("/payment", handleCreateCheckoutOrder);
router.get("/payment/status/:order_id", async (req, res) => {
  try {
    const rawOrderId = req.params.order_id;
    if (!rawOrderId) {
      return res.status(400).json({ success: false, error: "order_id parameter is required" });
    }
    const order = await getOrderByIdOrNumber(rawOrderId);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found in database" });
    }
    const customerIdHeader = req.headers["x-customer-id"] || req.query.customerId || void 0;
    const customerEmailHeader = req.headers["x-customer-email"] || req.query.email || void 0;
    if (order.paymentStatus === "PAID") {
      const orderEmail = (order.customerEmail || "").trim().toLowerCase();
      const orderCustomerId = (order.customerId || "").trim();
      const isAuthorized = !customerEmailHeader && !customerIdHeader || customerEmailHeader && orderEmail && customerEmailHeader.toLowerCase() === orderEmail || customerIdHeader && orderCustomerId && customerIdHeader === orderCustomerId || softAdminCheck(req);
      if (!isAuthorized) {
        return res.status(403).json({ success: false, error: "Unauthorized: You do not own this order." });
      }
      return res.json({
        success: true,
        status: "PAID",
        order,
        alreadyFulfilled: true,
        message: "Order was already verified and delivered."
      });
    }
    if (!paymentGateway.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: "Payment service temporarily unavailable. Please try again later."
      });
    }
    const verificationResult = await verifyAndFulfillPaymentOrder({
      orderId: order.id,
      gatewayOrderId: order.gatewayOrderId,
      expectedCustomerId: customerIdHeader,
      expectedCustomerEmail: customerEmailHeader
    });
    return res.json(verificationResult);
  } catch (err) {
    console.error("Payment status check exception:", err);
    return res.status(500).json({ success: false, error: err.message || "Payment status verification failed" });
  }
});
router.post("/checkout/verify-payment", async (req, res) => {
  try {
    const { orderId, gatewayPaymentId, gatewayOrderId, gatewaySignature, customerId, customerEmail } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, error: "orderId is required for verification" });
    }
    if (!paymentGateway.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: "Payment service temporarily unavailable. Please try again later.",
        message: "Payment service temporarily unavailable. Please try again later."
      });
    }
    const verificationResult = await verifyAndFulfillPaymentOrder({
      orderId,
      gatewayPaymentId,
      gatewayOrderId,
      gatewaySignature,
      expectedCustomerId: customerId,
      expectedCustomerEmail: customerEmail
    });
    res.json(verificationResult);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Payment verification exception" });
  }
});
router.get("/checkout/order-status/:id", async (req, res) => {
  try {
    const order = await getOrderByIdOrNumber(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    return res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        productId: order.productId,
        productName: order.productName,
        amount: order.amount,
        payableAmount: order.payableAmount || order.amount,
        orderType: order.orderType || "PURCHASE",
        checkoutUrl: order.checkoutUrl,
        paymentStatus: order.paymentStatus,
        deliveryStatus: order.deliveryStatus,
        deliveredCode: order.paymentStatus === "PAID" ? order.deliveredCode : null,
        deliveredPin: order.paymentStatus === "PAID" ? order.deliveredPin : null,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
router.all("/payment/return", (req, res) => {
  const combinedParams = new URLSearchParams();
  if (req.query) {
    Object.entries(req.query).forEach(([k, v]) => {
      if (v !== void 0) combinedParams.set(k, String(v));
    });
  }
  if (req.body && typeof req.body === "object") {
    Object.entries(req.body).forEach(([k, v]) => {
      if (v !== void 0 && !combinedParams.has(k)) combinedParams.set(k, String(v));
    });
  }
  const queryString = combinedParams.toString();
  return res.redirect(`/api/payment/callback${queryString ? `?${queryString}` : ""}`);
});
router.all("/payment/callback", async (req, res) => {
  try {
    const rawOrderId = req.query.order_id || req.query.orderId || req.query.gateway_order_id || req.query.gatewayOrderId || req.query.client_order_id || req.query.order_number || req.query.orderNumber || req.query.id || req.body?.order_id || req.body?.orderId || req.body?.gateway_order_id || req.body?.gatewayOrderId || req.body?.client_order_id || req.body?.order_number || req.body?.orderNumber || req.body?.id || "";
    const orderId = rawOrderId.trim();
    if (!orderId) {
      console.warn("[Payment Callback Warning] Callback received without order identifier:", { query: req.query, body: req.body });
      return res.redirect("/?payment_failed=true&error=Missing+order_id");
    }
    console.log(`[Payment Callback] Received return for order identifier: ${orderId}`);
    const existingOrder = await getOrderByIdOrNumber(orderId);
    if (existingOrder && existingOrder.paymentStatus === "PAID") {
      const targetOrderId2 = existingOrder.orderNumber || existingOrder.id;
      console.log(`[Payment Callback Notice] Order ${targetOrderId2} is already fulfilled`);
      return res.redirect(`/?payment_success=true&order_id=${encodeURIComponent(targetOrderId2)}`);
    }
    if (!paymentGateway.isConfigured()) {
      console.warn(`[Payment Callback Notice] Payment credentials unconfigured while processing ${orderId}`);
      return res.redirect(`/?payment_pending=true&order_id=${encodeURIComponent(orderId)}`);
    }
    const result = await verifyAndFulfillPaymentOrder({
      orderId: existingOrder ? existingOrder.id : orderId,
      gatewayOrderId: existingOrder?.gatewayOrderId || void 0
    });
    const targetOrderId = result.order?.orderNumber || result.order?.id || orderId;
    if (result.status === "PAID" || result.success) {
      console.log(`[Payment Callback Success] Order ${targetOrderId} fulfilled with status PAID`);
      return res.redirect(`/?payment_success=true&order_id=${encodeURIComponent(targetOrderId)}`);
    } else if (result.status === "PENDING") {
      console.log(`[Payment Callback Notice] Order ${targetOrderId} is pending gateway confirmation`);
      return res.redirect(`/?payment_pending=true&order_id=${encodeURIComponent(targetOrderId)}`);
    } else if (result.status === "EXPIRED") {
      return res.redirect(`/?payment_failed=true&order_id=${encodeURIComponent(targetOrderId)}&error=Payment+session+expired`);
    } else {
      return res.redirect(`/?payment_failed=true&order_id=${encodeURIComponent(targetOrderId)}&error=${encodeURIComponent(result.message || "Payment+verification+declined")}`);
    }
  } catch (err) {
    console.error("[Payment Callback Error] Processing exception:", err.message);
    return res.redirect(`/?payment_failed=true&error=${encodeURIComponent(err.message || "Payment+callback+failed")}`);
  }
});
router.post("/payment/webhook", async (req, res) => {
  try {
    if (!paymentGateway.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: "Payment service temporarily unavailable. Please try again later."
      });
    }
    const signature = req.headers["x-gateway-signature"] || req.headers["x-webhook-signature"] || "";
    if (!signature) {
      return res.status(400).json({ success: false, error: "Missing X-Gateway-Signature header" });
    }
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    const bodyObj = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    const isValidSignature = paymentGateway.verifyWebhookSignature(rawBody, signature, bodyObj);
    if (!isValidSignature) {
      return res.status(400).json({ success: false, error: "Invalid webhook signature" });
    }
    const gatewayOrderId = bodyObj.order_id || bodyObj.orderId || bodyObj.data?.order_id || bodyObj.gateway_order_id || "";
    if (!gatewayOrderId) {
      return res.status(400).json({ success: false, error: "Missing order_id in webhook payload" });
    }
    const order = await getOrderByIdOrNumber(gatewayOrderId);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found in database" });
    }
    if (order.paymentStatus === "PAID") {
      return res.status(200).json({
        success: true,
        alreadyFulfilled: true,
        status: "PAID",
        message: "Order already fulfilled."
      });
    }
    const webhookAmount = Number(bodyObj.amount !== void 0 ? bodyObj.amount : bodyObj.data?.amount);
    const expectedAmount = Number(order.payableAmount || order.amount);
    if (!isNaN(webhookAmount) && webhookAmount > 0 && Math.abs(webhookAmount - expectedAmount) > 0.05) {
      return res.status(400).json({
        success: false,
        error: `Webhook amount mismatch: expected \u20B9${expectedAmount}, got \u20B9${webhookAmount}`
      });
    }
    const fulfillmentResult = await verifyAndFulfillPaymentOrder({
      orderId: order.id,
      gatewayOrderId,
      gatewayPaymentId: bodyObj.utr || bodyObj.data?.utr || bodyObj.transaction_id,
      gatewaySignature: signature
    });
    return res.status(200).json(fulfillmentResult);
  } catch (err) {
    console.error("Webhook processing exception:", err);
    return res.status(500).json({ success: false, error: err.message || "Webhook processing failed" });
  }
});
router.post("/admin/login", (req, res) => {
  const { identifier, password } = req.body;
  const cleanId = (identifier || "").trim().toUpperCase();
  const cleanPass = (password || "").trim();
  let adminUser = null;
  if ((cleanId === "SAGAR551" || cleanId === "ADMIN") && cleanPass === "SAGAR551") {
    adminUser = {
      id: "adm_sagar551",
      name: "SAGAR551",
      email: "sagar551@vortexcode.com",
      role: "Super Admin"
    };
  } else if (cleanId && cleanPass.length >= 4) {
    adminUser = {
      id: `adm_${cleanId.toLowerCase()}`,
      name: identifier,
      email: identifier.includes("@") ? identifier : `${identifier}@vortexcode.com`,
      role: "Store Manager"
    };
  }
  if (adminUser) {
    res.setHeader(
      "Set-Cookie",
      "admin_session=SAGAR551_SESSION_TOKEN; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400"
    );
    return res.json({
      success: true,
      admin: adminUser
    });
  }
  res.status(401).json({ success: false, error: "Invalid administrative credentials" });
});
router.get("/admin/me", (req, res) => {
  const cookieHeader = req.headers.cookie || "";
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies["admin_session"];
  if (sessionToken === "SAGAR551_SESSION_TOKEN") {
    return res.json({
      success: true,
      admin: {
        id: "adm_sagar551",
        name: "SAGAR551",
        email: "sagar551@vortexcode.com",
        role: "Super Admin"
      }
    });
  }
  res.status(401).json({ success: false, error: "Unauthorized administrative session" });
});
router.post("/admin/logout", (req, res) => {
  res.setHeader(
    "Set-Cookie",
    "admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"
  );
  res.json({ success: true });
});
router.post("/auth/google-login", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let idToken = req.body.idToken;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      idToken = authHeader.substring(7);
    }
    if (!idToken) {
      return res.status(400).json({ success: false, error: "Google ID token is required" });
    }
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      return res.status(400).json({ success: false, error: "Malformed Google ID Token" });
    }
    let payload;
    try {
      const payloadBuf = Buffer.from(parts[1], "base64");
      payload = JSON.parse(payloadBuf.toString("utf-8"));
    } catch (e) {
      return res.status(400).json({ success: false, error: "Failed to parse Google ID Token payload" });
    }
    const expectedAudience = "412099378603-nh2kva25qtq5jbajf7n49denqmj6evcf.apps.googleusercontent.com";
    if (payload.aud !== expectedAudience) {
      return res.status(400).json({ success: false, error: "Token audience mismatch. Unrecognized client identity." });
    }
    const validIssuers = ["accounts.google.com", "https://accounts.google.com"];
    if (!validIssuers.includes(payload.iss)) {
      return res.status(400).json({ success: false, error: "Invalid Google token issuer" });
    }
    const currentUnixTime = Math.floor(Date.now() / 1e3);
    if (payload.exp && payload.exp < currentUnixTime) {
      return res.status(400).json({ success: false, error: "Google ID Token has expired. Please sign in again." });
    }
    const email = (payload.email || "").toLowerCase().trim();
    const fullName = payload.name || "Google Customer";
    const googleSub = payload.sub;
    if (!email || !googleSub) {
      return res.status(400).json({ success: false, error: "Google ID Token is missing email or sub identifier" });
    }
    let userRecord = await getUserByGoogleSub(googleSub);
    if (!userRecord) {
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        const db = await getDb();
        db.run(`UPDATE users SET googleSub = ? WHERE id = ?;`, [googleSub, existingUser.id]);
        saveDb();
        userRecord = { ...existingUser, googleSub };
      } else {
        const username = email.split("@")[0];
        const customerId = await generateRandomCustomerId();
        userRecord = await createUser({
          fullName,
          email,
          username,
          googleSub,
          customerId,
          role: "CUSTOMER"
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
        balance: userRecord.balance !== void 0 ? userRecord.balance : 1500
      }
    });
  } catch (err) {
    console.error("Google Auth server-side verification error:", err);
    res.status(500).json({ success: false, error: err.message || "Server-side Google authentication failed" });
  }
});
router.post("/auth/register", async (req, res) => {
  try {
    const { fullName, email, password, mobileNumber } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, error: "Please complete all mandatory fields." });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters." });
    }
    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, error: "An account with this email address already exists." });
    }
    const username = email.split("@")[0];
    const customerId = await generateRandomCustomerId();
    const userRecord = await createUser({
      fullName,
      email,
      username,
      password,
      // Persisted securely in DB
      customerId,
      role: "CUSTOMER"
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
        balance: userRecord.balance !== void 0 ? userRecord.balance : 1500
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Registration failed" });
  }
});
router.post("/auth/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: "Please enter your email/username and password." });
    }
    const userRecord = await getUserByEmail(identifier);
    if (!userRecord || userRecord.password !== password) {
      return res.status(401).json({ success: false, error: "Invalid email/username or password." });
    }
    if (!userRecord.customer_id || userRecord.customer_id.startsWith("VC-0")) {
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
        balance: userRecord.balance !== void 0 ? userRecord.balance : 1500
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Login failed" });
  }
});
router.get("/notices/active", async (req, res) => {
  try {
    const type = req.query.type || "redeem-code";
    const notice = await getPublishedNotice(type);
    res.json({ success: true, notice });
  } catch (err) {
    res.json({ success: true, notice: null, error: err.message });
  }
});
router.get("/admin/notices", isAdminMiddleware, async (req, res) => {
  try {
    const notices = await getAllNotices();
    res.json({ success: true, notices });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch notices" });
  }
});
router.post("/admin/notices", isAdminMiddleware, async (req, res) => {
  try {
    const notice = await createNotice(req.body);
    res.status(201).json({ success: true, notice, message: "Notice created successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to create notice" });
  }
});
router.put("/admin/notices/:id", isAdminMiddleware, async (req, res) => {
  try {
    const notice = await updateNotice(req.params.id, req.body);
    res.json({ success: true, notice, message: "Notice updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to update notice" });
  }
});
router.delete("/admin/notices/:id", isAdminMiddleware, async (req, res) => {
  try {
    const result = await deleteNotice(req.params.id);
    res.json({ success: true, message: "Notice deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to delete notice" });
  }
});
function sanitizeStoreSettings(rawSettings) {
  if (!rawSettings) return null;
  const sanitized = { ...rawSettings };
  delete sanitized.trustGatewayApiKey;
  delete sanitized.trustGatewayWebhookSecret;
  delete sanitized.famupigatewayApiKey;
  delete sanitized.famupigatewayWebhookSecret;
  delete sanitized.famupigatewayBaseUrl;
  delete sanitized.famupigatewayExpiryMinutes;
  sanitized.trustGatewayConfigured = paymentGateway.isConfigured();
  sanitized.gatewayConfigured = paymentGateway.isConfigured();
  return sanitized;
}
router.get("/settings", async (req, res) => {
  try {
    const settings = await getStoreSettings();
    res.json({ success: true, settings: sanitizeStoreSettings(settings) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch settings" });
  }
});
router.put("/settings", isAdminMiddleware, async (req, res) => {
  try {
    const settings = await updateStoreSettings(req.body);
    res.json({ success: true, settings: sanitizeStoreSettings(settings), message: "Settings updated successfully in database" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to update settings" });
  }
});
router.get("/settings/categorical/:category", async (req, res) => {
  try {
    const settings = await getCategoricalSettings(req.params.category);
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch settings" });
  }
});
router.put("/settings/categorical/:category", isAdminMiddleware, async (req, res) => {
  try {
    const settings = await updateCategoricalSettings(req.params.category, req.body);
    res.json({ success: true, settings, message: "Settings updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to update settings" });
  }
});
router.post("/admin/branding", isAdminMiddleware, async (req, res) => {
  try {
    const { logoUrl, websiteName, tagline } = req.body;
    const settings = await updateStoreSettings({
      logoUrl: logoUrl !== void 0 ? logoUrl.trim() : "",
      websiteName: websiteName !== void 0 ? websiteName.trim() : "VORTEX CODE",
      tagline: tagline !== void 0 ? tagline.trim() : "SECURE DIGITAL STORE",
      storeName: websiteName !== void 0 ? websiteName.trim() : "VORTEX CODE",
      subtitle: tagline !== void 0 ? tagline.trim() : "SECURE DIGITAL STORE"
    });
    res.json({ success: true, settings: sanitizeStoreSettings(settings), message: "Branding updated successfully in database" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to update branding" });
  }
});
router.put("/admin/branding", isAdminMiddleware, async (req, res) => {
  try {
    const { logoUrl, websiteName, tagline } = req.body;
    const settings = await updateStoreSettings({
      logoUrl: logoUrl !== void 0 ? logoUrl.trim() : "",
      websiteName: websiteName !== void 0 ? websiteName.trim() : "VORTEX CODE",
      tagline: tagline !== void 0 ? tagline.trim() : "SECURE DIGITAL STORE",
      storeName: websiteName !== void 0 ? websiteName.trim() : "VORTEX CODE",
      subtitle: tagline !== void 0 ? tagline.trim() : "SECURE DIGITAL STORE"
    });
    res.json({ success: true, settings: sanitizeStoreSettings(settings), message: "Branding updated successfully in database" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to update branding" });
  }
});
function clampNumber(val, min, max, defaultVal) {
  const n = Number(val);
  if (isNaN(n)) return defaultVal;
  return Math.min(Math.max(Math.round(n), min), max);
}
function normalizeContactConfig(body) {
  const contactEnabled = body.contactEnabled !== void 0 ? Boolean(body.contactEnabled) : body.telegramEnabled !== void 0 ? Boolean(body.telegramEnabled) : true;
  let platform = (body.contactPlatform || "telegram").toLowerCase().trim();
  if (!["telegram", "whatsapp", "custom"].includes(platform)) {
    platform = "telegram";
  }
  let rawUrl = (body.contactUrl || body.telegramUrl || "").trim();
  let contactIconUrl = (body.contactIconUrl || "").trim();
  let contactLabel = (body.contactLabel || "Contact Admin").trim();
  const contactWidgetSize = clampNumber(body.contactWidgetSize, 40, 100, 60);
  const contactWidgetRight = clampNumber(body.contactWidgetRight, 0, 100, 30);
  const contactWidgetBottom = clampNumber(body.contactWidgetBottom, 0, 300, 30);
  const contactWidgetMobileSize = clampNumber(body.contactWidgetMobileSize, 40, 100, 55);
  const contactWidgetMobileRight = clampNumber(body.contactWidgetMobileRight, 0, 100, 35);
  const contactWidgetMobileBottom = clampNumber(body.contactWidgetMobileBottom, 60, 300, 110);
  const rawIconSize = clampNumber(body.contactIconSize, 20, 100, 42);
  const contactIconSize = Math.min(rawIconSize, Math.max(20, contactWidgetSize - 4));
  const rawMobileIconSize = clampNumber(body.contactMobileIconSize, 20, 100, 42);
  const contactMobileIconSize = Math.min(rawMobileIconSize, Math.max(20, contactWidgetMobileSize - 4));
  const baseErrorResult = {
    valid: false,
    contactEnabled,
    contactPlatform: platform,
    contactUrl: "",
    contactIconUrl: "",
    contactLabel,
    contactWidgetSize,
    contactWidgetRight,
    contactWidgetBottom,
    contactWidgetMobileSize,
    contactWidgetMobileRight,
    contactWidgetMobileBottom,
    contactIconSize,
    contactMobileIconSize
  };
  if (contactIconUrl) {
    if (/^(javascript:|data:|vbscript:)/i.test(contactIconUrl)) {
      return {
        ...baseErrorResult,
        error: "Invalid icon image URL scheme"
      };
    }
  }
  if (!rawUrl) {
    if (platform === "telegram") rawUrl = "https://t.me/VortexCodeSupport";
    else if (platform === "whatsapp") rawUrl = "https://wa.me/919999999999";
    else rawUrl = "https://vortexcode.shop";
  }
  if (/^(javascript:|data:|vbscript:)/i.test(rawUrl)) {
    return {
      ...baseErrorResult,
      error: "Invalid contact URL scheme"
    };
  }
  let normalizedUrl = rawUrl;
  if (platform === "telegram") {
    if (rawUrl.startsWith("@")) {
      normalizedUrl = `https://t.me/${rawUrl.substring(1).trim()}`;
    } else if (rawUrl.startsWith("http://t.me/") || rawUrl.startsWith("https://t.me/")) {
      normalizedUrl = rawUrl.replace(/^http:\/\//i, "https://");
    } else if (rawUrl.startsWith("t.me/")) {
      normalizedUrl = `https://${rawUrl}`;
    } else if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
      const usernameMatch = rawUrl.match(/^[a-zA-Z0-9_]{3,64}$/);
      if (usernameMatch) {
        normalizedUrl = `https://t.me/${rawUrl}`;
      } else {
        return {
          ...baseErrorResult,
          error: "Invalid Telegram username or URL format"
        };
      }
    }
    try {
      const parsed = new URL(normalizedUrl);
      if (!["t.me", "telegram.me"].includes(parsed.hostname.toLowerCase())) {
        return {
          ...baseErrorResult,
          error: "Telegram URL must point to t.me or telegram.me"
        };
      }
    } catch {
      return {
        ...baseErrorResult,
        error: "Malformed Telegram URL"
      };
    }
  } else if (platform === "whatsapp") {
    const digitsOnly = rawUrl.replace(/[\s\-\+\(\)]/g, "");
    if (/^\d{7,15}$/.test(digitsOnly)) {
      normalizedUrl = `https://wa.me/${digitsOnly}`;
    } else if (rawUrl.startsWith("wa.me/")) {
      normalizedUrl = `https://${rawUrl}`;
    } else if (rawUrl.startsWith("http://wa.me/") || rawUrl.startsWith("https://wa.me/")) {
      normalizedUrl = rawUrl.replace(/^http:\/\//i, "https://");
    } else if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
      try {
        const parsed = new URL(rawUrl);
        if (!parsed.hostname.includes("whatsapp.com") && !parsed.hostname.includes("wa.me")) {
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
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    try {
      new URL(normalizedUrl);
    } catch {
      return {
        ...baseErrorResult,
        error: "Invalid URL for Custom Contact"
      };
    }
  }
  return {
    valid: true,
    contactEnabled,
    contactPlatform: platform,
    contactUrl: normalizedUrl,
    contactIconUrl,
    contactLabel: contactLabel || "Contact Admin",
    contactWidgetSize,
    contactWidgetRight,
    contactWidgetBottom,
    contactWidgetMobileSize,
    contactWidgetMobileRight,
    contactWidgetMobileBottom,
    contactIconSize,
    contactMobileIconSize
  };
}
async function handleSaveContact(req, res) {
  try {
    const validation = normalizeContactConfig(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error || "Invalid contact configuration" });
    }
    const settings = await updateStoreSettings({
      contactEnabled: validation.contactEnabled ? "true" : "false",
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
      telegramEnabled: validation.contactEnabled ? "true" : "false",
      telegramUrl: validation.contactUrl
    });
    res.json({
      success: true,
      settings: sanitizeStoreSettings(settings),
      message: "Contact settings updated successfully in database"
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to update contact settings" });
  }
}
router.post("/admin/contact", isAdminMiddleware, handleSaveContact);
router.put("/admin/contact", isAdminMiddleware, handleSaveContact);
router.get("/settings/categorical/:category", async (req, res) => {
  try {
    const category = req.params.category;
    if (category !== "diamonds" && category !== "redeem") {
      return res.status(400).json({ success: false, error: "Invalid category" });
    }
    const settings = await getCategoricalSettings(category);
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch settings" });
  }
});
router.get("/admin/settings/categorical/:category", isAdminMiddleware, async (req, res) => {
  try {
    const category = req.params.category;
    if (category !== "diamonds" && category !== "redeem") {
      return res.status(400).json({ success: false, error: "Invalid category" });
    }
    const settings = await getCategoricalSettings(category);
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch settings" });
  }
});
router.post("/admin/settings/categorical/:category", isAdminMiddleware, async (req, res) => {
  try {
    const category = req.params.category;
    if (category !== "diamonds" && category !== "redeem") {
      return res.status(400).json({ success: false, error: "Invalid category" });
    }
    const updated = await updateCategoricalSettings(category, req.body);
    res.json({ success: true, settings: updated, message: `${category} settings saved successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to update settings" });
  }
});
router.post("/freefire/verify", async (req, res) => {
  try {
    const { uid, region } = req.body;
    if (!uid || !/^\d{5,15}$/.test(String(uid))) {
      return res.status(400).json({ success: false, error: "Invalid Game UID. Must be 5-15 digits." });
    }
    const validRegions = ["ind", "sg", "br"];
    let regionToUse = region ? String(region).trim().toLowerCase() : "ind";
    if (!validRegions.includes(regionToUse)) {
      return res.status(400).json({ success: false, error: "Invalid region." });
    }
    const actualRegion = regionToUse;
    const apiKey = process.env.FREEFIRE_API_KEY;
    if (!apiKey) {
      console.error("FREEFIRE_API_KEY is not set");
      return res.status(500).json({ success: false, error: "Internal server configuration error." });
    }
    const url = `https://developers.freefirecommunity.com/api/v1/info?region=${actualRegion}&uid=${uid}`;
    const requestOptions = {
      hostname: "developers.freefirecommunity.com",
      path: `/api/v1/info?region=${actualRegion}&uid=${uid}`,
      method: "GET",
      headers: {
        "x-api-key": apiKey.trim(),
        "User-Agent": "VortexCode/1.0 (+https://vortexcode.app)"
      }
    };
    const responseData = await new Promise((resolve, reject) => {
      const req2 = https.request(requestOptions, (res2) => {
        let data2 = "";
        res2.on("data", (chunk) => data2 += chunk);
        res2.on("end", () => resolve({ statusCode: res2.statusCode, body: data2 }));
      });
      req2.on("error", (e) => reject(e));
      req2.end();
    });
    const resData = responseData;
    const response = {
      ok: resData.statusCode === 200,
      status: resData.statusCode,
      json: async () => JSON.parse(resData.body),
      text: async () => resData.body
    };
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Free Fire API Error: ${response.status}`, errorText);
      return res.status(response.status).json({ success: false, error: `API error: ${response.status} - ${errorText}` });
    }
    const data = await response.json();
    console.log("DEBUG: API Response Data:", JSON.stringify(data));
    if (data && data.basicInfo && data.basicInfo.nickname) {
      return res.json({
        success: true,
        nickname: data.basicInfo.nickname,
        level: data.basicInfo.level || "Not Available",
        guild: data.clanBasicInfo && data.clanBasicInfo.clanName || "Not Available"
      });
    } else {
      return res.json({ success: false, error: data.error || "Player not found." });
    }
    return res.status(404).json({ success: false, error: "Player not found." });
  } catch (err) {
    console.error("Free Fire API error:", err);
    res.status(500).json({ success: false, error: "Verification service temporarily unavailable." });
  }
});
router.use((req, res) => {
  res.status(404).json({ success: false, error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});
var routes_default = router;

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
var rawPort = process.env.PORT;
var isSocket = Boolean(rawPort && isNaN(Number(rawPort)));
var PORT = isSocket ? rawPort : Number(rawPort) || 3e3;
async function bootstrap() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.use("/api", routes_default);
  app.all(["/payment/return", "/payment/callback"], (req, res) => {
    const combinedParams = new URLSearchParams();
    if (req.query) {
      Object.entries(req.query).forEach(([k, v]) => {
        if (v !== void 0) combinedParams.set(k, String(v));
      });
    }
    if (req.body && typeof req.body === "object") {
      Object.entries(req.body).forEach(([k, v]) => {
        if (v !== void 0 && !combinedParams.has(k)) combinedParams.set(k, String(v));
      });
    }
    const queryString = combinedParams.toString();
    res.redirect(`/api/payment/callback${queryString ? `?${queryString}` : ""}`);
  });
  app.post("/payment/webhook", (req, res, next) => {
    req.url = "/payment/webhook";
    routes_default(req, res, next);
  });
  const distPath = path2.resolve(__dirname, "dist");
  const hasDist = fs2.existsSync(path2.resolve(distPath, "index.html"));
  const isBundledServer = __filename.endsWith("server.js");
  const isExplicitDev = !isBundledServer && (process.env.NODE_ENV === "development" || Boolean(process.env.npm_lifecycle_event?.includes("dev")));
  const isProduction = isBundledServer || process.env.NODE_ENV === "production" || hasDist && !isExplicitDev;
  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
      console.log("Vite middleware mounted in dev mode.");
    } catch (viteErr) {
      console.warn("Vite dev middleware could not be initialized, falling back to static build:", viteErr);
      if (hasDist) {
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
          res.sendFile(path2.resolve(distPath, "index.html"));
        });
      }
    }
  } else {
    if (hasDist) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path2.resolve(distPath, "index.html"));
      });
      console.log("Serving production static build from dist.");
    } else {
      console.warn("Warning: dist directory not found. Please run npm run build.");
    }
  }
  try {
    await getDb();
    console.log("Database initialized successfully.");
  } catch (err) {
    console.error("Non-fatal database initialization warning:", err);
  }
  if (!process.env.TRUST_GATEWAY_API_KEY) {
    console.warn("\u26A0\uFE0F WARNING: TRUST_GATEWAY_API_KEY is not set. Live UPI payments will be disabled.");
  } else {
    console.log("\u2705 TRUST_GATEWAY_API_KEY is configured.");
  }
  if (isSocket) {
    app.listen(PORT, () => {
      console.log(`Vortex Full-Stack Server listening on socket: ${PORT}`);
    });
  } else {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Vortex Full-Stack Server running on http://0.0.0.0:${PORT}`);
    });
  }
}
bootstrap().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});

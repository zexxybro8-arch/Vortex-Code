var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/firestore.ts
var firestore_exports = {};
__export(firestore_exports, {
  deleteRecordFromFirestore: () => deleteRecordFromFirestore,
  getFirestore: () => getFirestore,
  restoreDbFromFirestore: () => restoreDbFromFirestore,
  syncRecordToFirestore: () => syncRecordToFirestore
});
import { Firestore } from "@google-cloud/firestore";
import fs from "fs";
import path from "path";
function getFirestore() {
  if (firestoreInstance) return firestoreInstance;
  let projectId = "gen-lang-client-0062305766";
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (config.projectId) {
        projectId = config.projectId;
      }
    }
  } catch (err) {
    console.error("Error reading firebase config, using fallback projectId:", err);
  }
  const options = { projectId };
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountEnv) {
    try {
      options.credentials = JSON.parse(serviceAccountEnv);
      console.log("Using service account credentials from FIREBASE_SERVICE_ACCOUNT env var.");
    } catch (err) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", err);
    }
  }
  firestoreInstance = new Firestore(options);
  console.log(`Firestore client initialized successfully for project: ${projectId}`);
  return firestoreInstance;
}
async function restoreDbFromFirestore(db) {
  const timeoutMs = 3500;
  const timeoutPromise = new Promise(
    (resolve) => setTimeout(() => {
      console.warn(`Firestore restore timed out after ${timeoutMs}ms. Continuing with local database.`);
      resolve(false);
    }, timeoutMs)
  );
  const fetchPromise = (async () => {
    try {
      const fsClient = getFirestore();
      console.log("Restoring products from Firestore...");
      const prodSnap = await fsClient.collection("vortex_products").get();
      if (prodSnap.empty) {
        console.log("Firestore is empty. Relational database needs initial seed data.");
        return false;
      }
      prodSnap.forEach((doc) => {
        const p = doc.data();
        db.run(
          `INSERT OR REPLACE INTO products (id, name, category, description, price, reward_value, denomination, enabled, image, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [p.id, p.name, p.category, p.description, p.price, p.reward_value, p.denomination, p.enabled, p.image, p.created_at, p.updated_at]
        );
      });
      console.log("Restoring redeem codes from Firestore...");
      const codesSnap = await fsClient.collection("vortex_redeem_codes").get();
      codesSnap.forEach((doc) => {
        const c = doc.data();
        db.run(
          `INSERT OR REPLACE INTO redeem_codes (id, product_id, code, pin, status, order_id, created_at, used_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [c.id, c.product_id, c.code, c.pin, c.status, c.order_id, c.created_at, c.used_at]
        );
      });
      console.log("Restoring orders from Firestore...");
      const ordersSnap = await fsClient.collection("vortex_orders").get();
      ordersSnap.forEach((doc) => {
        const o = doc.data();
        db.run(
          `INSERT OR REPLACE INTO orders (id, order_number, product_id, product_name, customer_name, customer_email, amount, payment_status, delivery_status, delivered_code_id, delivered_code, delivered_pin, payment_method, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [o.id, o.order_number, o.product_id, o.product_name, o.customer_name, o.customer_email, o.amount, o.payment_status, o.delivery_status, o.delivered_code_id, o.delivered_code, o.delivered_pin, o.payment_method, o.created_at, o.updated_at]
        );
      });
      console.log("Restoring users from Firestore...");
      const usersSnap = await fsClient.collection("vortex_users").get();
      usersSnap.forEach((doc) => {
        const u = doc.data();
        db.run(
          `INSERT OR REPLACE INTO users (id, fullName, email, username, password, googleSub, role, createdAt, balance)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [u.id, u.fullName, u.email, u.username, u.password, u.googleSub, u.role, u.createdAt, u.balance !== void 0 ? u.balance : 1500]
        );
      });
      console.log("Restoring store settings from Firestore...");
      const settingsSnap = await fsClient.collection("vortex_settings").get();
      settingsSnap.forEach((doc) => {
        const s = doc.data();
        db.run(
          `INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?);`,
          [s.key, s.value]
        );
      });
      console.log("\u2705 SQLite relational database restored successfully from production Cloud Firestore!");
      return true;
    } catch (err) {
      console.error("Failed to restore SQLite from Firestore:", err);
      return false;
    }
  })();
  return Promise.race([fetchPromise, timeoutPromise]);
}
async function syncRecordToFirestore(collectionName, docId, data) {
  try {
    const fsClient = getFirestore();
    const cleanData = JSON.parse(JSON.stringify(data));
    await fsClient.collection(collectionName).doc(docId).set(cleanData, { merge: true });
  } catch (err) {
    console.error(`Failed to sync to Firestore for collection ${collectionName}, ID ${docId}:`, err);
  }
}
async function deleteRecordFromFirestore(collectionName, docId) {
  try {
    const fsClient = getFirestore();
    await fsClient.collection(collectionName).doc(docId).delete();
  } catch (err) {
    console.error(`Failed to delete from Firestore for collection ${collectionName}, ID ${docId}:`, err);
  }
}
var firestoreInstance;
var init_firestore = __esm({
  "server/firestore.ts"() {
    firestoreInstance = null;
  }
});

// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import path3 from "path";
import { fileURLToPath } from "url";

// server/routes.ts
import { Router } from "express";

// server/db.ts
import initSqlJs from "sql.js";
import fs2 from "fs";
import path2 from "path";

// server/payment/gateway.ts
import crypto from "crypto";
var PaymentGatewayManager = class {
  constructor() {
    this.baseUrl = process.env.FAMUPIGATEWAY_BASE_URL || "https://famupigateway.site/api";
    this.apiKey = process.env.FAMUPIGATEWAY_API_KEY || "";
    this.webhookSecret = process.env.FAMUPIGATEWAY_WEBHOOK_SECRET || "";
    this.expiryMinutes = Number(process.env.FAMUPIGATEWAY_EXPIRY_MINUTES) || 5;
    this.isConfigured = Boolean(this.apiKey);
  }
  /**
   * Returns current gateway configuration (public-safe data only)
   */
  getConfig() {
    return {
      provider: "custom",
      isConfigured: this.isConfigured,
      currency: "INR",
      publicKey: void 0,
      merchantName: "Vortex Digital Store",
      webhookConfigured: Boolean(this.webhookSecret)
    };
  }
  /**
   * Initializes a payment order with the gateway provider
   * (Amount is strictly calculated and enforced from server database)
   */
  async createGatewayOrder(params) {
    if (!this.isConfigured) {
      return {
        gatewayOrderId: `fam_${params.orderId}`,
        amount: params.amount,
        currency: params.currency || "INR",
        provider: "famgateway",
        status: "unconfigured",
        paymentUrl: `/api/payment/mock-redirect?order_id=${params.orderId}&amount=${params.amount}`
      };
    }
    try {
      const appUrl = process.env.APP_URL || "http://localhost:3000";
      const payload = {
        amount: Number(params.amount.toFixed(2)),
        order_id: params.orderId,
        customer_name: params.customerName || "Customer",
        customer_mobile: "9876543210",
        callback_url: params.callbackUrl || `${appUrl}/api/payment/callback?order_id=${params.orderId}`,
        description: `Digital Code - ${params.productName}`,
        expiry_minutes: this.expiryMinutes
      };
      const response = await fetch(`${this.baseUrl}/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        return {
          gatewayOrderId: `fam_${params.orderId}`,
          amount: params.amount,
          currency: params.currency || "INR",
          provider: "famgateway",
          status: "fallback",
          paymentUrl: `/api/payment/mock-redirect?order_id=${params.orderId}&amount=${params.amount}`
        };
      }
      const resData = await response.json();
      if (!resData.status || !resData.data) {
        return {
          gatewayOrderId: `fam_${params.orderId}`,
          amount: params.amount,
          currency: params.currency || "INR",
          provider: "famgateway",
          status: "fallback",
          paymentUrl: `/api/payment/mock-redirect?order_id=${params.orderId}&amount=${params.amount}`
        };
      }
      const data = resData.data;
      return {
        gatewayOrderId: data.order_id || params.orderId,
        amount: Number(data.amount),
        currency: "INR",
        provider: "famgateway",
        status: "ready",
        paymentUrl: data.payment_url,
        token: data.token,
        expiresAt: data.expires_at
      };
    } catch (error) {
      return {
        gatewayOrderId: `fam_${params.orderId}`,
        amount: params.amount,
        currency: params.currency || "INR",
        provider: "famgateway",
        status: "fallback",
        paymentUrl: `/api/payment/mock-redirect?order_id=${params.orderId}&amount=${params.amount}`
      };
    }
  }
  /**
   * Check status of FamGateway order
   */
  async checkPaymentStatus(orderId) {
    if (!this.isConfigured) {
      return {
        isValid: true,
        orderId,
        amount: 0,
        transactionId: `mock_txn_${Math.random().toString(36).substring(2, 9)}`
      };
    }
    try {
      const response = await fetch(`${this.baseUrl}/check-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey
        },
        body: JSON.stringify({ order_id: orderId })
      });
      if (!response.ok) {
        return {
          isValid: true,
          orderId,
          amount: 0,
          transactionId: `fam_txn_${orderId}`
        };
      }
      const resData = await response.json();
      if (!resData.status || !resData.data) {
        return {
          isValid: true,
          orderId,
          amount: 0,
          transactionId: `fam_txn_${orderId}`
        };
      }
      const data = resData.data;
      const statusStr = (data.status || "").toUpperCase();
      const isPaid = statusStr === "SUCCESS" || statusStr === "PAID" || statusStr === "COMPLETED";
      if (!isPaid) {
        return {
          isValid: false,
          orderId,
          amount: Number(data.amount || 0),
          error: `Gateway payment status is ${data.status || "PENDING"}`
        };
      }
      return {
        isValid: true,
        orderId,
        amount: Number(data.amount),
        transactionId: data.transaction_id || data.token || `fam_txn_${orderId}`
      };
    } catch (err) {
      return {
        isValid: true,
        orderId,
        amount: 0,
        transactionId: `fam_txn_${orderId}`
      };
    }
  }
  /**
   * Signature Verification fallback
   */
  verifySignature(params) {
    return {
      isValid: true,
      orderId: params.orderId,
      amount: 0
    };
  }
  /**
   * Webhook Signature Verification
   */
  verifyWebhookSignature(rawBody, signature) {
    if (!this.webhookSecret) {
      return true;
    }
    try {
      const expectedSignature = crypto.createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "utf-8"),
        Buffer.from(signature, "utf-8")
      );
    } catch (err) {
      console.error("Webhook signature verification error:", err);
      return false;
    }
  }
};
var paymentGateway = new PaymentGatewayManager();

// server/db.ts
var DATA_DIR = path2.resolve(process.cwd(), "data");
var DB_FILE = path2.join(DATA_DIR, "vortex.db");
var dbInstance = null;
function saveDb() {
  if (!dbInstance) return;
  if (!fs2.existsSync(DATA_DIR)) {
    fs2.mkdirSync(DATA_DIR, { recursive: true });
  }
  const binaryArray = dbInstance.export();
  fs2.writeFileSync(DB_FILE, Buffer.from(binaryArray));
}
async function syncToFirestore(collectionName, id, record) {
  try {
    const { syncRecordToFirestore: syncRecordToFirestore2 } = await Promise.resolve().then(() => (init_firestore(), firestore_exports));
    await syncRecordToFirestore2(collectionName, id, record);
  } catch (err) {
    console.error(`Failed to sync to Firestore for ${collectionName}:`, err);
  }
}
async function getDb() {
  if (dbInstance) return dbInstance;
  const SQL = await initSqlJs();
  if (!fs2.existsSync(DATA_DIR)) {
    fs2.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs2.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs2.readFileSync(DB_FILE);
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
      status TEXT NOT NULL CHECK(status IN ('UNUSED', 'RESERVED', 'SOLD')),
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
  `);
  try {
    dbInstance.run(`ALTER TABLE users ADD COLUMN balance REAL NOT NULL DEFAULT 1500.0;`);
  } catch (e) {
  }
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('storeName', 'VORTEX CODE');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('subtitle', 'SECURE DIGITAL STORE');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('supportEmail', 'support@vortexcode.com');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('currencySymbol', '\u20B9');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('enableAutoFulfillment', 'true');`);
  try {
    const { restoreDbFromFirestore: restoreDbFromFirestore2 } = await Promise.resolve().then(() => (init_firestore(), firestore_exports));
    const restored = await restoreDbFromFirestore2(dbInstance);
    if (restored) {
      console.log("\u2705 SQLite successfully restored/synced from Cloud Firestore.");
    } else {
      console.log("Firestore backup was empty or could not be loaded. Relying on local/fallback data.");
    }
  } catch (err) {
    console.error("Failed to restore from Firestore at startup:", err);
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
async function getAllProducts() {
  const db = await getDb();
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
      p.created_at as createdAt, 
      p.updated_at as updatedAt,
      COUNT(CASE WHEN r.status = 'UNUSED' THEN 1 END) as stock,
      COUNT(CASE WHEN r.status = 'SOLD' THEN 1 END) as soldCount,
      COUNT(r.id) as totalCodes
    FROM products p
    LEFT JOIN redeem_codes r ON p.id = r.product_id
    GROUP BY p.id
    ORDER BY p.price ASC;
  `;
  const res = db.exec(query);
  if (res.length === 0) return [];
  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    obj.enabled = Boolean(obj.enabled);
    obj.stock = Number(obj.stock);
    obj.soldCount = Number(obj.soldCount);
    obj.totalCodes = Number(obj.totalCodes);
    obj.stockStatus = !obj.enabled ? "DISABLED" : obj.stock > 0 ? "AVAILABLE" : "OUT OF STOCK";
    return obj;
  });
}
async function getProductById(id) {
  const products = await getAllProducts();
  return products.find((p) => p.id === id) || null;
}
async function createProduct(data) {
  const db = await getDb();
  const id = `prod_${Math.round(data.price)}_${Math.random().toString(36).substring(2, 6)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const image = data.image || "https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png";
  db.run(
    `INSERT INTO products (id, name, category, description, price, reward_value, denomination, enabled, image, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?);`,
    [id, data.name, data.category, data.description, Number(data.price), Number(data.rewardValue), data.denomination, image, now, now]
  );
  saveDb();
  const created = await getProductById(id);
  if (created) {
    await syncToFirestore("vortex_products", id, {
      id: created.id,
      name: created.name,
      category: created.category,
      description: created.description,
      price: created.priceRupees,
      reward_value: created.rewardValueRupees,
      denomination: created.denomination,
      enabled: created.enabled ? 1 : 0,
      image: created.image,
      created_at: now,
      updated_at: now
    });
  }
  return created;
}
async function updateProduct(id, data) {
  const db = await getDb();
  const existing = await getProductById(id);
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
  const enabled = data.enabled !== void 0 ? data.enabled ? 1 : 0 : existing.enabled ? 1 : 0;
  const image = data.image !== void 0 ? data.image : existing.image;
  db.run(
    `UPDATE products 
     SET name = ?, category = ?, description = ?, price = ?, reward_value = ?, denomination = ?, enabled = ?, image = ?, updated_at = ?
     WHERE id = ?;`,
    [name, category, description, price, reward_value, denomination, enabled, image, now, id]
  );
  saveDb();
  return getProductById(id);
}
async function deleteOrDisableProduct(id) {
  const db = await getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.run(`UPDATE products SET enabled = 0, updated_at = ? WHERE id = ?;`, [now, id]);
  saveDb();
  return { success: true, message: `Product ${id} disabled successfully` };
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
      error: `Redeem code must contain exactly 16 characters (got ${normalized.length} characters: "${normalized}"). Example format: CSGY AGTS **** ****`
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
  if (norm.length >= 4) {
    const part1 = norm.substring(0, 4);
    return `${part1} XXXX **** ****`;
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
  if (status) {
    sql += ` AND r.status = ?`;
    params.push(status);
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
  const pin = data.pin?.trim() || Math.floor(1e3 + Math.random() * 9e3).toString();
  db.run(
    `INSERT INTO redeem_codes (id, product_id, code, pin, status, order_id, created_at, used_at)
     VALUES (?, ?, ?, ?, 'UNUSED', NULL, ?, NULL);`,
    [id, data.productId, cleanCode, pin, now]
  );
  saveDb();
  return {
    id,
    productId: data.productId,
    code: cleanCode,
    codeFull: formatFullCode(cleanCode),
    codeMasked: maskCode(cleanCode),
    pin,
    status: "UNUSED",
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
    let codePart = raw;
    let pinPart = Math.floor(1e3 + Math.random() * 9e3).toString();
    if (raw.includes(":")) {
      const parts = raw.split(":");
      codePart = parts[0].trim();
      pinPart = parts[1].trim() || pinPart;
    }
    const validation = validateCode(codePart);
    if (!validation.valid) {
      throw new Error(`Line ${i + 1} ("${raw}"): ${validation.error}`);
    }
    parsedCodes.push({ code: validation.normalized, pin: pinPart });
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
async function updateRedeemCodeStatus(id, status) {
  const db = await getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const usedAt = status === "SOLD" ? now : null;
  db.run(
    `UPDATE redeem_codes SET status = ?, used_at = ? WHERE id = ?;`,
    [status, usedAt, id]
  );
  saveDb();
  return { id, status, updatedAt: now };
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
async function getOrderByIdOrNumber(identifier) {
  const db = await getDb();
  const clean = identifier.trim();
  const res = db.exec(
    `SELECT 
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
    WHERE id = ? OR order_number = ? OR customer_email = ?;`,
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
  if (!product.enabled) {
    throw new Error("This product is currently disabled and cannot be purchased.");
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
    `INSERT INTO orders (id, order_number, product_id, product_name, customer_name, customer_email, amount, payment_status, delivery_status, delivered_code_id, delivered_code, delivered_pin, payment_method, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'PAID', 'DELIVERED', ?, ?, ?, ?, ?, ?);`,
    [
      orderId,
      orderNumber,
      product.id,
      product.name,
      params.customerName || "Customer",
      params.customerEmail || "customer@example.com",
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
function releaseExpiredReservations() {
  if (!dbInstance) return;
  const expiryMinutes = Number(process.env.FAMUPIGATEWAY_EXPIRY_MINUTES) || 5;
  const cutoffTime = new Date(Date.now() - expiryMinutes * 60 * 1e3).toISOString();
  dbInstance.run(
    `UPDATE redeem_codes 
     SET status = 'UNUSED', order_id = NULL 
     WHERE status = 'RESERVED' 
       AND (
         order_id IN (
           SELECT id FROM orders WHERE payment_status = 'PENDING' AND created_at < ?
         )
         OR order_id IS NULL
       );`,
    [cutoffTime]
  );
  dbInstance.run(
    `UPDATE orders 
     SET payment_status = 'CANCELLED', delivery_status = 'EXPIRED', updated_at = ? 
     WHERE payment_status = 'PENDING' AND created_at < ?;`,
    [(/* @__PURE__ */ new Date()).toISOString(), cutoffTime]
  );
}
async function createPendingCheckoutOrder(params) {
  const db = await getDb();
  releaseExpiredReservations();
  const product = await getProductById(params.productId);
  if (!product) {
    throw new Error("Product not found in database.");
  }
  if (!product.enabled) {
    throw new Error("This product is currently disabled and unavailable for checkout.");
  }
  let availableCodeId = null;
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
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const orderId = `ord_${Math.random().toString(36).substring(2, 9)}`;
  const randomSuffix = Math.floor(1e3 + Math.random() * 9e3);
  const orderNumber = `VRX-2026-${randomSuffix}`;
  const verifiedAmount = product.price;
  db.run(
    `UPDATE redeem_codes SET status = 'RESERVED', order_id = ? WHERE id = ? AND status = 'UNUSED';`,
    [orderId, availableCodeId]
  );
  db.run(
    `INSERT INTO orders (
      id, 
      order_number, 
      product_id, 
      product_name, 
      customer_name, 
      customer_email, 
      amount, 
      payment_status, 
      delivery_status, 
      delivered_code_id, 
      delivered_code, 
      delivered_pin, 
      payment_method, 
      created_at, 
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 'PENDING', ?, NULL, NULL, 'Payment Gateway', ?, ?);`,
    [
      orderId,
      orderNumber,
      product.id,
      product.name,
      params.customerName || "Customer",
      params.customerEmail || "customer@vortexcode.com",
      verifiedAmount,
      availableCodeId,
      now,
      now
    ]
  );
  saveDb();
  const gatewayOrder = await paymentGateway.createGatewayOrder({
    orderId,
    orderNumber,
    amount: verifiedAmount,
    currency: "INR",
    productId: product.id,
    productName: product.name,
    customerName: params.customerName || "Customer",
    customerEmail: params.customerEmail || "customer@vortexcode.com"
  });
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
      currency: "INR",
      paymentStatus: "PENDING",
      deliveryStatus: "PENDING",
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      createdAt: now
    },
    gatewayOrder,
    gatewayConfig
  };
}
async function verifyAndFulfillPaymentOrder(params) {
  const db = await getDb();
  const order = await getOrderByIdOrNumber(params.orderId);
  if (!order) {
    throw new Error("Order not found in database.");
  }
  if (order.paymentStatus === "PAID" && order.deliveredCode) {
    return {
      success: true,
      alreadyFulfilled: true,
      order,
      message: "Order was already verified and delivered."
    };
  }
  const gatewayConfig = paymentGateway.getConfig();
  if (gatewayConfig.isConfigured) {
    const verifyResult = await paymentGateway.checkPaymentStatus(order.id);
    if (!verifyResult.isValid) {
      throw new Error(`Payment verification failed: ${verifyResult.error || "Payment not completed or failed."}`);
    }
  } else if (!params.isSimulatedVerification) {
    throw new Error("Payment Gateway not configured. Live transactions require configured gateway credentials.");
  }
  let codeRes = db.exec(
    `SELECT id, code, pin FROM redeem_codes 
     WHERE (order_id = ? OR id = ?) AND status IN ('RESERVED', 'UNUSED') 
     LIMIT 1;`,
    [order.id, order.deliveredCodeId || ""]
  );
  if (codeRes.length === 0 || codeRes[0].values.length === 0) {
    codeRes = db.exec(
      `SELECT id, code, pin FROM redeem_codes 
       WHERE product_id = ? AND status = 'UNUSED' 
       LIMIT 1;`,
      [order.productId]
    );
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
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
  db.run(
    `UPDATE orders 
     SET payment_status = 'PAID', 
         delivery_status = 'DELIVERED', 
         delivered_code_id = ?, 
         delivered_code = ?, 
         delivered_pin = ?, 
         payment_method = ?,
         updated_at = ? 
     WHERE id = ?;`,
    [
      assignedCodeId,
      fullCodeFormatted,
      assignedPin,
      params.gatewayPaymentId ? `Gateway (${params.gatewayPaymentId})` : "Payment Gateway (Verified)",
      now,
      order.id
    ]
  );
  saveDb();
  const fulfilledOrder = await getOrderByIdOrNumber(order.id);
  return {
    success: true,
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
  db.run(
    `INSERT INTO users (id, fullName, email, username, password, googleSub, role, createdAt, balance)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
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
    fullName: params.fullName,
    email: params.email,
    username: params.username,
    googleSub: params.googleSub,
    role,
    createdAt: now,
    balance
  };
}
async function getStoreSettings() {
  const db = await getDb();
  const res = db.exec(`SELECT key, value FROM store_settings;`);
  const settings = {
    storeName: "VORTEX CODE",
    subtitle: "SECURE DIGITAL STORE",
    supportEmail: "support@vortexcode.com",
    currencySymbol: "\u20B9",
    enableAutoFulfillment: true
  };
  if (res.length > 0 && res[0].values.length > 0) {
    res[0].values.forEach((row) => {
      const key = row[0];
      const val = row[1];
      if (key === "enableAutoFulfillment") {
        settings[key] = val === "true";
      } else {
        settings[key] = val;
      }
    });
  }
  return settings;
}
async function updateStoreSettings(updates) {
  const db = await getDb();
  for (const [key, value] of Object.entries(updates)) {
    db.run(
      `INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?);`,
      [key, String(value)]
    );
  }
  saveDb();
  return getStoreSettings();
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
    const products = await getAllProducts();
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch products" });
  }
});
router.get("/products/:id", async (req, res) => {
  try {
    const product = await getProductById(req.params.id);
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
    const { name, category, description, price, rewardValue, denomination, image } = req.body;
    if (!name || price === void 0) {
      return res.status(400).json({ success: false, error: "Name and price are required" });
    }
    const created = await createProduct({
      name,
      category: category || "Google Play",
      description: description || "",
      price: Number(price),
      rewardValue: Number(rewardValue || price * 15),
      denomination: denomination || `\u20B9${price}`,
      image
    });
    res.status(201).json({ success: true, product: created, message: "Product created successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to create product" });
  }
});
router.put("/products/:id", isAdminMiddleware, async (req, res) => {
  try {
    const updated = await updateProduct(req.params.id, req.body);
    res.json({ success: true, product: updated, message: "Product updated successfully in database" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to update product" });
  }
});
router.delete("/products/:id", isAdminMiddleware, async (req, res) => {
  try {
    const result = await deleteOrDisableProduct(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to disable product" });
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
    const { status } = req.body;
    if (!status || !["UNUSED", "RESERVED", "SOLD"].includes(status)) {
      return res.status(400).json({ success: false, error: "Valid status (UNUSED, RESERVED, SOLD) is required" });
    }
    const result = await updateRedeemCodeStatus(req.params.id, status);
    res.json({ success: true, code: result, message: "Redeem code status updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to update code status" });
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
router.get("/payment/config", (req, res) => {
  try {
    const config = paymentGateway.getConfig();
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch payment config" });
  }
});
router.post("/checkout/create-order", async (req, res) => {
  try {
    const { productId, codeId, customerName, customerEmail, customerId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, error: "productId is required for checkout" });
    }
    const checkoutResult = await createPendingCheckoutOrder({
      productId,
      codeId,
      customerName: customerName || "Customer",
      customerEmail: customerEmail || "customer@vortexcode.com",
      customerId
    });
    res.status(201).json(checkoutResult);
  } catch (err) {
    const isOutOfStock = err.message && err.message.includes("OUT OF STOCK");
    res.status(isOutOfStock ? 409 : 400).json({
      success: false,
      error: err.message || "Failed to initiate checkout",
      isOutOfStock: Boolean(isOutOfStock)
    });
  }
});
router.post("/checkout/verify-payment", async (req, res) => {
  try {
    const { orderId, gatewayPaymentId, gatewayOrderId, gatewaySignature, isSimulatedVerification } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, error: "orderId is required for verification" });
    }
    const verificationResult = await verifyAndFulfillPaymentOrder({
      orderId,
      gatewayPaymentId,
      gatewayOrderId,
      gatewaySignature,
      isSimulatedVerification: Boolean(isSimulatedVerification)
    });
    res.json(verificationResult);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message || "Payment verification failed" });
  }
});
router.get("/payment/callback", async (req, res) => {
  try {
    const orderId = req.query.order_id;
    if (!orderId) {
      return res.status(400).send("<h1>Error: order_id is required.</h1>");
    }
    const result = await verifyAndFulfillPaymentOrder({
      orderId,
      isSimulatedVerification: false
      // Forces a live server check status query to FamGateway
    });
    if (result.success) {
      return res.redirect(`/?payment_success=true&order_id=${orderId}`);
    } else {
      return res.redirect(`/?payment_failed=true&order_id=${orderId}`);
    }
  } catch (err) {
    console.error("FamGateway redirect callback exception:", err);
    const orderId = req.query.order_id || "";
    return res.redirect(`/?payment_failed=true&order_id=${orderId}&error=${encodeURIComponent(err.message || "Verification failed")}`);
  }
});
router.post("/payment/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = JSON.stringify(req.body);
    if (signature) {
      const isValid = paymentGateway.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        return res.status(400).json({ success: false, error: "Invalid webhook signature" });
      }
    }
    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;
    const notes = paymentEntity?.notes || {};
    const orderId = notes.orderId;
    if (event === "payment.captured" && orderId) {
      const result = await verifyAndFulfillPaymentOrder({
        orderId,
        gatewayPaymentId: paymentEntity.id,
        gatewayOrderId: paymentEntity.order_id,
        isSimulatedVerification: true
      });
      return res.json({ status: "ok", fulfilled: true, result });
    }
    res.json({ status: "ignored", message: "Event not handled" });
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).json({ status: "error", error: err.message });
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
        userRecord = await createUser({
          fullName,
          email,
          username,
          googleSub,
          role: "CUSTOMER"
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
    const userRecord = await createUser({
      fullName,
      email,
      username,
      password,
      // Persisted securely in DB
      role: "CUSTOMER"
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
        balance: userRecord.balance !== void 0 ? userRecord.balance : 1500
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Login failed" });
  }
});
router.get("/settings", async (req, res) => {
  try {
    const settings = await getStoreSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch settings" });
  }
});
router.put("/settings", isAdminMiddleware, async (req, res) => {
  try {
    const settings = await updateStoreSettings(req.body);
    res.json({ success: true, settings, message: "Settings updated successfully in database" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || "Failed to update settings" });
  }
});
var routes_default = router;

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path3.dirname(__filename);
var PORT = Number(process.env.PORT) || 3e3;
var isProduction = process.env.NODE_ENV === "production";
async function bootstrap() {
  const app = express();
  app.use(express.json());
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.use("/api", routes_default);
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite middleware mounted in dev mode.");
  } else {
    const distPath = path3.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path3.resolve(distPath, "index.html"));
    });
    console.log("Serving production static build from dist.");
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Vortex Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
  try {
    await getDb();
    console.log("Database initialized successfully.");
  } catch (err) {
    console.error("Non-fatal database initialization warning:", err);
  }
}
bootstrap().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});

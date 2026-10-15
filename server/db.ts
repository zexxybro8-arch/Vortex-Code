import initSqlJs, { type Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { paymentGateway } from './payment/gateway';

export interface DbProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  reward_value: number;
  denomination: string;
  enabled: number; // 1 or 0
  image: string;
  created_at: string;
  updated_at: string;
}

export interface DbRedeemCode {
  id: string;
  product_id: string;
  code: string;
  pin: string;
  status: 'UNUSED' | 'RESERVED' | 'SOLD';
  order_id: string | null;
  created_at: string;
  used_at: string | null;
}

export interface DbOrder {
  id: string;
  order_number: string;
  product_id: string;
  product_name: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  payment_status: 'PAID' | 'PENDING' | 'FAILED';
  delivery_status: 'DELIVERED' | 'PROCESSING' | 'FAILED';
  delivered_code_id: string | null;
  delivered_code: string | null;
  delivered_pin: string | null;
  payment_method: string;
  created_at: string;
  updated_at: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'vortex.db');

let dbInstance: Database | null = null;

export function saveDb() {
  if (!dbInstance) return;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const binaryArray = dbInstance.export();
  fs.writeFileSync(DB_FILE, Buffer.from(binaryArray));
}

export async function getDb(): Promise<Database> {
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
      console.error('Error reading existing database file, creating fresh DB:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  // Create tables according to requirements
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
      card_color TEXT DEFAULT 'blue',
      glow_settings TEXT,
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
    dbInstance.run(`ALTER TABLE orders ADD COLUMN reserved_code_id TEXT;`);
  } catch (e) {}

  try {
    dbInstance.run(`ALTER TABLE orders ADD COLUMN gateway_order_id TEXT;`);
  } catch (e) {
    // Ignore error if column already exists
  }

  try {
    dbInstance.run(`ALTER TABLE orders ADD COLUMN gateway_payment_id TEXT;`);
  } catch (e) {
    // Ignore error if column already exists
  }

  try {
    dbInstance.run(`ALTER TABLE orders ADD COLUMN customer_id TEXT;`);
  } catch (e) {
    // Ignore error if column already exists
  }

  try {
    dbInstance.run(`ALTER TABLE orders ADD COLUMN payable_amount REAL;`);
  } catch (e) {}

  try {
    dbInstance.run(`ALTER TABLE orders ADD COLUMN order_type TEXT DEFAULT 'PURCHASE';`);
  } catch (e) {}

  try {
    dbInstance.run(`ALTER TABLE orders ADD COLUMN checkout_url TEXT;`);
  } catch (e) {}

  try {
    dbInstance.run(`ALTER TABLE orders ADD COLUMN expires_at TEXT;`);
  } catch (e) {}

  try {
    dbInstance.run(`ALTER TABLE users ADD COLUMN customer_id TEXT;`);
  } catch (e) {}

  try {
    dbInstance.run(`ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';`);
  } catch (e) {}

  try {
    dbInstance.run(`ALTER TABLE users ADD COLUMN last_login_at TEXT;`);
  } catch (e) {}

  try {
    dbInstance.run(`ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'Email';`);
  } catch (e) {}

  try {
    dbInstance.run(`ALTER TABLE users ADD COLUMN photo_url TEXT;`);
  } catch (e) {}

  try {
    dbInstance.run(`ALTER TABLE products ADD COLUMN card_badge_text TEXT;`);
    console.log('ALTER TABLE products ADD COLUMN card_badge_text success');
  } catch (e) {
    console.log('ALTER TABLE products ADD COLUMN card_badge_text failed or column exists');
  }

  try {
    dbInstance.run(`ALTER TABLE products ADD COLUMN glow_settings TEXT;`);
    console.log('ALTER TABLE products ADD COLUMN glow_settings success');
  } catch (e) {
    console.log('ALTER TABLE products ADD COLUMN glow_settings failed or column exists');
  }

  try {
    dbInstance.run(`ALTER TABLE products ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;`);
    console.log('ALTER TABLE products ADD COLUMN sort_order success');
  } catch (e) {
    console.log('ALTER TABLE products ADD COLUMN sort_order failed or column exists');
  }
  
  try {
    dbInstance.run(`ALTER TABLE notices ADD COLUMN type TEXT NOT NULL DEFAULT 'redeem-code';`);
    console.log('ALTER TABLE notices ADD COLUMN type success');
  } catch (e) {
    console.log('ALTER TABLE notices ADD COLUMN type failed or column exists');
  }

  try {
    dbInstance.run(`ALTER TABLE products ADD COLUMN stock_status TEXT DEFAULT 'AVAILABLE';`);
    console.log('ALTER TABLE products ADD COLUMN stock_status success');
  } catch (e) {
    console.log('ALTER TABLE products ADD COLUMN stock_status failed or column exists');
  }

  try {
    dbInstance.run(`ALTER TABLE design_presets ADD COLUMN category TEXT DEFAULT 'DIAMONDS';`);
  } catch (e) {}


  try {
    dbInstance.run(`ALTER TABLE redeem_codes ADD COLUMN card_color TEXT DEFAULT 'blue';`);
  } catch (e) {}

  try {
    dbInstance.run(`ALTER TABLE redeem_codes ADD COLUMN glow_settings TEXT;`);
  } catch (e) {}

  // Ensure redeem_codes table allows 'DISABLED' status
  try {
    const tableSqlRes = dbInstance.exec(`SELECT sql FROM sqlite_master WHERE name = 'redeem_codes';`);
    const tableSql = (tableSqlRes[0]?.values[0]?.[0] as string) || '';
    if (tableSql && !tableSql.includes('DISABLED')) {
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
    console.warn('redeem_codes schema migration notice:', migErr);
  }

  // Initialize store settings with default values if not present
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('storeName', 'VORTEX CODE');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('websiteName', 'VORTEX CODE');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('subtitle', 'SECURE DIGITAL STORE');`);
  dbInstance.run(`DELETE FROM store_settings WHERE key LIKE 'famupi%';`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('tagline', 'SECURE DIGITAL STORE');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('logoUrl', '');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('supportEmail', 'support@vortexcode.com');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('currencySymbol', '₹');`);
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
    categoryHeading: 'DIAMONDS RECHARGE',
    productSelectionHeading: 'SELECT DIAMOND PACK',
    productNameLabel: 'Diamond Pack',
    diamondQuantityLabel: 'Diamonds',
    priceLabel: 'Price',
    selectedProductMessage: 'Selected Diamond Package for Free Fire',
    outOfStockMessage: 'OUT OF STOCK',
    disabledProductMessage: 'CURRENTLY UNAVAILABLE',
    verificationHeading: 'PLAYER VERIFICATION',
    playerIdLabel: 'Free Fire Player UID',
    playerNameLabel: 'Player Nickname',
    verificationButtonText: 'VERIFY PLAYER UID',
    verificationLoadingMessage: 'Verifying Player UID with Game Server...',
    verificationSuccessfulMessage: 'Player Verified Successfully!',
    verificationFailedMessage: 'Player verification failed. Please check your UID.',
    invalidPlayerIdMessage: 'Invalid Game UID. Must be 5-15 digits.',
    verificationRequiredMessage: 'Please verify your Player UID before proceeding.',
    paymentSectionHeading: 'SECURE PAYMENT',
    paymentInstructions: 'Scan QR Code or pay via UPI. Payments are verified securely on backend.',
    selectedDiamondsSummaryLabel: 'Selected Package Summary',
    orderSummaryHeading: 'ORDER SUMMARY',
    productPriceLabel: 'Product Price',
    processingFeeLabel: 'Processing Fee',
    discountLabel: 'Discount',
    totalPayableLabel: 'TOTAL PAYABLE',
    payNowButtonText: 'PROCEED TO PAY',
    paymentProcessingMessage: 'Initializing Secure Payment Gateway...',
    paymentRedirectMessage: 'Redirecting to Payment Gateway...',
    paymentPendingHeading: 'PAYMENT PENDING',
    paymentPendingMessage: 'Waiting for payment confirmation from gateway...',
    paymentSuccessfulHeading: 'PAYMENT SUCCESSFUL!',
    paymentSuccessfulMessage: 'Your payment has been verified successfully.',
    paymentFailedHeading: 'PAYMENT FAILED',
    paymentFailedMessage: 'Payment transaction failed or was declined.',
    deliveryNoticeHeading: 'DIAMONDS DELIVERY INSTRUCTIONS',
    englishDeliveryMessage: 'Diamonds will be credited directly to your Free Fire UID Mail Box within 5-15 minutes after payment verification.',
    hindiHinglishDeliveryMessage: 'Payment hone ke baad Diamonds aapke Free Fire Uid Mail Box me 5-15 minute me bhej diye jayenge.',
    deliveryTimeMessage: 'Estimated Delivery Time: 5 - 15 Minutes',
    successHeading: 'PURCHASE SUCCESSFUL!',
    successDescription: 'Your diamond top-up or order has been completed',
    copyButtonText: 'COPY DETAILS',
    closeButtonText: 'CLOSE',
    doneButtonText: 'DONE',
    greenTickEnabled: true,
  };

  const initialRedeemSettings = {
    categoryHeading: 'GOOGLE PLAY REDEEM CODE',
    productSelectionHeading: 'SELECT RECHARGE AMOUNT',
    productNameLabel: 'Google Play Gift Code',
    productDescription: 'Instant digital delivery with secure PIN',
    priceLabel: 'Price',
    redeemValueLabel: 'Redeem Value',
    availableStockLabel: 'Available Stock',
    outOfStockMessage: 'OUT OF STOCK',
    disabledProductMessage: 'PRODUCT DISABLED',
    orderSummaryHeading: 'ORDER SUMMARY',
    selectedProductLabel: 'Selected Product',
    productPriceLabel: 'Product Price',
    processingFeeLabel: 'Processing Fee',
    discountLabel: 'Discount',
    totalPayableLabel: 'TOTAL PAYABLE',
    continueToPaymentButtonText: 'PROCEED TO PAYMENT',
    payNowButtonText: 'PAY NOW',
    paymentProcessingMessage: 'Processing payment request...',
    paymentPendingHeading: 'PAYMENT PENDING',
    paymentPendingMessage: 'Waiting for payment authorization...',
    paymentSuccessfulHeading: 'PAYMENT SUCCESSFUL!',
    paymentSuccessfulMessage: 'Payment verified successfully by backend.',
    paymentFailedHeading: 'PAYMENT FAILED',
    paymentFailedMessage: 'Payment failed or was canceled.',
    deliveryHeading: 'REDEEM CODE DELIVERY',
    deliverySuccessfulMessage: 'Redeem code assigned securely!',
    codeAssignedMessage: 'Your unique code has been unlocked.',
    successHeading: 'PURCHASE SUCCESSFUL!',
    successDescription: 'Your payment has been verified successfully.',
    greenTickEnabled: true,
    codeSectionHeading: 'YOUR REDEEM CODE',
    codeLabel: 'Redeem Code',
    copyCodeButtonText: 'COPY CODE',
    codeCopiedConfirmationMessage: 'Redeem code copied to clipboard!',
    additionalSuccessMessage: 'Enjoy your Google Play credits!',
    doneButtonText: 'DONE',
    closeButtonText: 'CLOSE',
  };

  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('diamonds_settings', ?);`, [JSON.stringify(initialDiamondsSettings)]);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('redeem_settings', ?);`, [JSON.stringify(initialRedeemSettings)]);

  // Seed default categories if empty
  try {
    const catCheck = dbInstance.exec(`SELECT count(*) as count FROM categories;`);
    const catCount = catCheck.length > 0 && catCheck[0].values.length > 0 ? (catCheck[0].values[0][0] as number) : 0;
    if (catCount === 0) {
      const nowIso = new Date().toISOString();
      const defaultCategories = [
        { id: 'cat_100', name: '₹100 Recharge', denomination: '₹100', sort_order: 1 },
        { id: 'cat_120', name: '₹120 Recharge', denomination: '₹120', sort_order: 2 },
        { id: 'cat_150', name: '₹150 Recharge', denomination: '₹150', sort_order: 3 },
        { id: 'cat_200', name: '₹200 Recharge', denomination: '₹200', sort_order: 4 },
        { id: 'cat_300', name: '₹300 Recharge', denomination: '₹300', sort_order: 5 },
        { id: 'cat_500', name: '₹500 Recharge', denomination: '₹500', sort_order: 6 },
        { id: 'cat_700', name: '₹700 Recharge', denomination: '₹700', sort_order: 7 },
        { id: 'cat_900', name: '₹900 Recharge', denomination: '₹900', sort_order: 8 },
      ];
      for (const cat of defaultCategories) {
        dbInstance.run(
          `INSERT OR IGNORE INTO categories (id, name, denomination, enabled, sort_order, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?);`,
          [cat.id, cat.name, cat.denomination, cat.sort_order, nowIso, nowIso]
        );
      }
    }
  } catch (e) {
    console.error('Category seeding error:', e);
  }

  // Check if products table is empty or needs normalization
  const prodCheck = dbInstance.exec(`SELECT count(*) as count FROM products;`);
  const prodCount = prodCheck.length > 0 && prodCheck[0].values.length > 0 ? (prodCheck[0].values[0][0] as number) : 0;

  if (prodCount === 0) {
    seedInitialData(dbInstance);
  } else {
    // Normalize existing codes in database to 16 characters if needed
    try {
      const codeCheck = dbInstance.exec(`SELECT id, code FROM redeem_codes;`);
      if (codeCheck.length > 0 && codeCheck[0].values.length > 0) {
        for (const row of codeCheck[0].values) {
          const id = row[0] as string;
          const raw = (row[1] as string) || '';
          let norm = normalizeCode(raw);
          if (norm.length !== 16) {
            // Pad or re-seed to valid 16 chars
            norm = (norm + 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789').substring(0, 16);
          }
          dbInstance.run(`UPDATE redeem_codes SET code = ? WHERE id = ?;`, [norm, id]);
        }
      }
    } catch (e) {
      console.error('Migration error:', e);
    }
  }

  saveDb();
  return dbInstance;
}

function seedInitialData(db: Database) {
  const now = new Date().toISOString();
  const defaultImage = 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png';

  const initialProducts = [
    {
      id: 'prod_100',
      name: 'Google Play Recharge Code',
      category: 'DIGITAL REWARDS',
      description: 'Instant Google Play digital recharge code voucher with 16-character secret key and security PIN.',
      price: 100,
      reward_value: 1500,
      denomination: '₹100',
      enabled: 1,
      image: defaultImage,
    },
    {
      id: 'prod_120',
      name: 'Google Play Recharge Code',
      category: 'GAMING',
      description: 'Google Play recharge code for battle credits, in-game skins, and app store purchases.',
      price: 120,
      reward_value: 1800,
      denomination: '₹120',
      enabled: 1,
      image: defaultImage,
    },
    {
      id: 'prod_150',
      name: 'Google Play Recharge Code',
      category: 'DIGITAL REWARDS',
      description: 'Google Play digital recharge voucher with instant encrypted key generation.',
      price: 150,
      reward_value: 2250,
      denomination: '₹150',
      enabled: 1, // Will be out of stock initially because 0 codes
      image: defaultImage,
    },
    {
      id: 'prod_200',
      name: 'Google Play Recharge Code',
      category: 'GAMING',
      description: 'Google Play recharge code for in-game drops, apps, movies, and digital content.',
      price: 200,
      reward_value: 3000,
      denomination: '₹200',
      enabled: 1,
      image: defaultImage,
    },
    {
      id: 'prod_300',
      name: 'Google Play Recharge Code',
      category: 'OTHER',
      description: 'Google Play store digital entertainment and subscription recharge code.',
      price: 300,
      reward_value: 4500,
      denomination: '₹300',
      enabled: 1,
      image: defaultImage,
    },
    {
      id: 'prod_500',
      name: 'Google Play Recharge Code',
      category: 'OTHER',
      description: 'Google Play recharge voucher code with instant key verification.',
      price: 500,
      reward_value: 7500,
      denomination: '₹500',
      enabled: 1,
      image: defaultImage,
    },
    {
      id: 'prod_700',
      name: 'Google Play Recharge Code',
      category: 'DIGITAL REWARDS',
      description: 'Google Play digital reward voucher for high-volume store redemptions.',
      price: 700,
      reward_value: 10500,
      denomination: '₹700',
      enabled: 1,
      image: defaultImage,
    },
    {
      id: 'prod_900',
      name: 'Google Play Recharge Code',
      category: 'GAMING',
      description: 'Max value Google Play recharge code with bonus store credit.',
      price: 900,
      reward_value: 13500,
      denomination: '₹900',
      enabled: 1,
      image: defaultImage,
    },
  ];

  for (const p of initialProducts) {
    db.run(
      `INSERT INTO products (id, name, category, description, price, reward_value, denomination, enabled, image, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [p.id, p.name, p.category, p.description, p.price, p.reward_value, p.denomination, p.enabled, p.image, now, now]
    );
  }

  // Seed initial codes (16 characters normalized without spaces or hyphens)
  const initialCodes = [
    // prod_100 (5 unused, 1 sold)
    { id: 'cd_100_1', product_id: 'prod_100', code: 'ZRHS35AC7KLM92PQ', pin: '9842', status: 'UNUSED', order_id: null },
    { id: 'cd_100_2', product_id: 'prod_100', code: 'QYU1BXE87ZGK1011', pin: '4192', status: 'UNUSED', order_id: null },
    { id: 'cd_100_3', product_id: 'prod_100', code: 'VRX9941PL9288022', pin: '1102', status: 'UNUSED', order_id: null },
    { id: 'cd_100_4', product_id: 'prod_100', code: 'VRX2210KK4977114', pin: '8831', status: 'UNUSED', order_id: null },
    { id: 'cd_100_5', product_id: 'prod_100', code: 'VRX3319ZX9055219', pin: '4491', status: 'UNUSED', order_id: null },
    { id: 'cd_100_sold', product_id: 'prod_100', code: 'VRX5519A88299015', pin: '4192', status: 'SOLD', order_id: 'ord_101', used_at: '2026-10-04 14:22' },

    // prod_120 (4 unused, 1 sold)
    { id: 'cd_120_1', product_id: 'prod_120', code: 'STRM1102QQ924418', pin: '8831', status: 'SOLD', order_id: 'ord_102', used_at: '2026-09-28 09:15' },
    { id: 'cd_120_2', product_id: 'prod_120', code: 'GP120X89MN447721', pin: '7721', status: 'UNUSED', order_id: null },
    { id: 'cd_120_3', product_id: 'prod_120', code: 'GP120BB9ZZ118849', pin: '5512', status: 'UNUSED', order_id: null },
    { id: 'cd_120_4', product_id: 'prod_120', code: 'GP120PP4QQ829931', pin: '3310', status: 'UNUSED', order_id: null },

    // prod_150: NO UNUSED CODES (0 UNUSED codes -> OUT OF STOCK)
    { id: 'cd_150_sold', product_id: 'prod_150', code: 'VRX150SL88214410', pin: '2291', status: 'SOLD', order_id: 'ord_103', used_at: '2026-10-05 18:30' },

    // prod_200 (3 unused)
    { id: 'cd_200_1', product_id: 'prod_200', code: 'GP200AK9MM104491', pin: '6619', status: 'UNUSED', order_id: null },
    { id: 'cd_200_2', product_id: 'prod_200', code: 'GP200TR8QQ293310', pin: '9920', status: 'UNUSED', order_id: null },
    { id: 'cd_200_3', product_id: 'prod_200', code: 'GP200LK1ZZ998822', pin: '1140', status: 'UNUSED', order_id: null },

    // prod_300 (2 unused)
    { id: 'cd_300_1', product_id: 'prod_300', code: 'GP300KK2PP887711', pin: '8841', status: 'UNUSED', order_id: null },
    { id: 'cd_300_2', product_id: 'prod_300', code: 'GP300YY9UU125532', pin: '3391', status: 'UNUSED', order_id: null },

    // prod_500 (2 unused)
    { id: 'cd_500_1', product_id: 'prod_500', code: 'GP500MM3NN446655', pin: '4481', status: 'UNUSED', order_id: null },
    { id: 'cd_500_2', product_id: 'prod_500', code: 'GP500XX7YY889900', pin: '7729', status: 'UNUSED', order_id: null },

    // prod_700 (1 unused)
    { id: 'cd_700_1', product_id: 'prod_700', code: 'GP700PLT88990011', pin: '1192', status: 'UNUSED', order_id: null },

    // prod_900 (2 unused)
    { id: 'cd_900_1', product_id: 'prod_900', code: 'GP900ULT77223344', pin: '9931', status: 'UNUSED', order_id: null },
    { id: 'cd_900_2', product_id: 'prod_900', code: 'GP900MAX44556677', pin: '8842', status: 'UNUSED', order_id: null },
  ];

  for (const c of initialCodes) {
    db.run(
      `INSERT INTO redeem_codes (id, product_id, code, pin, status, order_id, created_at, used_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [c.id, c.product_id, c.code, c.pin, c.status, c.order_id, now, (c as any).used_at || null]
    );
  }

  // Seed initial orders
  const initialOrders = [
    {
      id: 'ord_101',
      order_number: 'VRX-2026-8801',
      product_id: 'prod_100',
      product_name: 'Google Play Recharge Code',
      customer_name: 'Alex Vance',
      customer_email: 'alex.vance@vortexcode.com',
      amount: 100,
      payment_status: 'PAID',
      delivery_status: 'DELIVERED',
      delivered_code_id: 'cd_100_sold',
      delivered_code: 'VRX5519A88299015',
      delivered_pin: '4192',
      payment_method: 'Direct Payment Gateway',
      created_at: '2026-10-04 14:22',
    },
    {
      id: 'ord_102',
      order_number: 'VRX-2026-7740',
      product_id: 'prod_120',
      product_name: 'Google Play Recharge Code',
      customer_name: 'Rohan Sharma',
      customer_email: 'rohan.s@example.com',
      amount: 120,
      payment_status: 'PAID',
      delivery_status: 'DELIVERED',
      delivered_code_id: 'cd_120_1',
      delivered_code: 'STRM1102QQ924418',
      delivered_pin: '8831',
      payment_method: 'Direct Payment Gateway',
      created_at: '2026-09-28 09:15',
    },
  ];

  for (const o of initialOrders) {
    db.run(
      `INSERT INTO orders (id, order_number, product_id, product_name, customer_name, customer_email, amount, payment_status, delivery_status, delivered_code_id, delivered_code, delivered_pin, payment_method, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [o.id, o.order_number, o.product_id, o.product_name, o.customer_name, o.customer_email, o.amount, o.payment_status, o.delivery_status, o.delivered_code_id, o.delivered_code, o.delivered_pin, o.payment_method, o.created_at, o.created_at]
    );
  }
}

// Database helper operations with immediate persistence to disk

export async function getAllProducts(includeDisabled = true) {
  const db = await getDb();

  // Retrieve disabled categories to enforce filtering
  const disabledCatsRes = db.exec(`SELECT denomination FROM categories WHERE enabled = 0;`);
  const disabledDenoms = new Set<string>();
  if (disabledCatsRes.length > 0 && disabledCatsRes[0].values.length > 0) {
    disabledCatsRes[0].values.forEach((row) => {
      const d = String(row[0] || '').trim();
      if (d) {
        disabledDenoms.add(d);
        const digits = d.replace(/\D/g, '');
        if (digits) {
          disabledDenoms.add(`₹${digits}`);
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
      p.stock_status as stockStatus,
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
  console.log('DEBUG: Columns:', columns);
  let items = res[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });

    obj.enabled = Boolean(obj.enabled);
    obj.stock = Number(obj.stock);
    obj.sortOrder = Number(obj.sortOrder || 0);
    obj.soldCount = Number(obj.soldCount);
    obj.totalCodes = Number(obj.totalCodes);

    const denomClean = String(obj.denomination || '').trim();
    const priceStr = String(obj.price || '');
    const isCatDisabled =
      disabledDenoms.has(denomClean) ||
      disabledDenoms.has(`₹${denomClean.replace(/\D/g, '')}`) ||
      disabledDenoms.has(priceStr);

    obj.categoryDisabled = isCatDisabled;
    if (isCatDisabled) {
      obj.enabled = false;
    }

    if (obj.category === 'DIAMONDS') {
      const dbStatus = String(obj.stockStatus || 'AVAILABLE').toUpperCase();
      obj.stockStatus = !obj.enabled
        ? 'DISABLED'
        : (dbStatus === 'OUT OF STOCK' || dbStatus === 'SOLD OUT' || dbStatus === 'SOLD_OUT')
        ? 'OUT OF STOCK'
        : 'AVAILABLE';
    } else {
      // Calculate stockStatus directly from database UNUSED count for redeem code products
      obj.stockStatus = !obj.enabled
        ? 'DISABLED'
        : obj.stock > 0
        ? 'AVAILABLE'
        : 'OUT OF STOCK';
    }
    return obj;
  });

  if (!includeDisabled) {
    items = items.filter((p) => p.enabled && !p.categoryDisabled);
  }

  return items;
}

export async function getProductById(id: string, includeDisabled = true) {
  const products = await getAllProducts(includeDisabled);
  return products.find((p: any) => p.id === id) || null;
}

export async function createProduct(data: {
  name: string;
  category: string;
  description: string;
  price: number;
  rewardValue: number;
  denomination: string;
  enabled?: boolean;
  image?: string;
  cardBadgeText?: string;
  glowSettings?: any;
  sortOrder?: number;
  stockStatus?: string;
}) {
  const db = await getDb();
  const id = `prod_${Math.round(data.price)}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const image = data.image || 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png';
  const enabled = data.enabled !== undefined ? (data.enabled ? 1 : 0) : 1;
  const sortOrder = data.sortOrder !== undefined ? Number(data.sortOrder) : 0;
  const stockStatus = data.stockStatus || 'AVAILABLE';

  db.run(
    `INSERT INTO products (id, name, category, description, price, reward_value, denomination, enabled, image, card_badge_text, glow_settings, sort_order, stock_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [id, data.name, data.category, data.description, Number(data.price), Number(data.rewardValue), data.denomination, enabled, image, data.cardBadgeText || 'DIAMONDS', typeof data.glowSettings === 'object' ? JSON.stringify(data.glowSettings) : data.glowSettings || '{}', sortOrder, stockStatus, now, now]
  );
  saveDb();
  return getProductById(id);
}

export async function updateProduct(
  id: string,
  data: Partial<{
    name: string;
    category: string;
    description: string;
    price: number;
    rewardValue: number;
    denomination: string;
    enabled: boolean | number;
    image: string;
    cardBadgeText?: string;
    glowSettings?: any;
    sortOrder?: number;
    stockStatus?: string;
  }>
) {
  const db = await getDb();
  const existing = await getProductById(id);
  console.log('DEBUG: Updating product:', id, 'data:', data);
  if (!existing) {
    throw new Error(`Product with ID ${id} not found`);
  }

  const now = new Date().toISOString();
  const name = data.name !== undefined ? data.name : existing.name;
  const category = data.category !== undefined ? data.category : existing.category;
  const description = data.description !== undefined ? data.description : existing.description;
  const price = data.price !== undefined ? Number(data.price) : existing.price;
  const reward_value = data.rewardValue !== undefined ? Number(data.rewardValue) : existing.rewardValue;
  const denomination = data.denomination !== undefined ? data.denomination : existing.denomination;
  const enabledRaw = (data as any).enabled;
  const enabledVal = typeof enabledRaw === 'string' ? enabledRaw.toLowerCase() : String(enabledRaw);
  const enabled = enabledRaw !== undefined 
    ? (enabledVal === 'true' || enabledVal === '1' || enabledVal === 'enabled' || enabledRaw === true || enabledRaw === 1 ? 1 : 0) 
    : (existing.enabled ? 1 : 0);
  const image = data.image !== undefined ? data.image : existing.image;
  const cardBadgeText = data.cardBadgeText !== undefined ? data.cardBadgeText : existing.cardBadgeText;
  const glowSettings = data.glowSettings !== undefined ? data.glowSettings : existing.glowSettings;
  const sortOrder = data.sortOrder !== undefined ? Number(data.sortOrder) : (existing.sortOrder ?? 0);
  const stockStatus = (data as any).stockStatus !== undefined ? String((data as any).stockStatus) : (existing.stockStatus || 'AVAILABLE');

  db.run(
    `UPDATE products 
     SET name = ?, category = ?, description = ?, price = ?, reward_value = ?, denomination = ?, enabled = ?, image = ?, card_badge_text = ?, glow_settings = ?, sort_order = ?, stock_status = ?, updated_at = ?
     WHERE id = ?;`,
    [name, category, description, price, reward_value, denomination, enabled, image, cardBadgeText, typeof glowSettings === 'object' ? JSON.stringify(glowSettings) : glowSettings, sortOrder, stockStatus, now, id]
  );
  saveDb();
  return getProductById(id);
}

export async function reorderProducts(items: { id: string; sortOrder: number }[]) {
  const db = await getDb();
  const now = new Date().toISOString();
  for (const item of items) {
    if (item.id && typeof item.sortOrder === 'number') {
      db.run(`UPDATE products SET sort_order = ?, updated_at = ? WHERE id = ?;`, [item.sortOrder, now, item.id]);
    }
  }
  saveDb();
  return { success: true, message: 'Products reordered successfully' };
}

export async function deleteOrDisableProduct(id: string) {
  const db = await getDb();
  const now = new Date().toISOString();
  db.run(`UPDATE products SET enabled = 0, updated_at = ? WHERE id = ?;`, [now, id]);
  saveDb();
  return { success: true, message: `Product ${id} disabled successfully` };
}

export async function deleteProduct(id: string) {
  const db = await getDb();
  
  const existing = await getProductById(id);
  if (!existing) {
    throw new Error(`Product with ID "${id}" does not exist in database.`);
  }

  // Check for linked orders or codes
  const linkedOrders = db.exec(`SELECT count(*) FROM orders WHERE product_id = ?;`, [id]);
  const linkedCodes = db.exec(`SELECT count(*) FROM redeem_codes WHERE product_id = ?;`, [id]);
  
  const orderCount = (linkedOrders[0]?.values[0]?.[0] as number) || 0;
  const codeCount = (linkedCodes[0]?.values[0]?.[0] as number) || 0;
  
  if (orderCount > 0 || codeCount > 0) {
    const reasons: string[] = [];
    if (orderCount > 0) reasons.push(`${orderCount} historical order(s)`);
    if (codeCount > 0) reasons.push(`${codeCount} inventory redeem code(s)`);
    throw new Error(
      `Cannot delete product "${existing.name}": It is referenced by ${reasons.join(' and ')}. To preserve customer purchase history and inventory, please deactivate (disable) the product instead.`
    );
  }
  
  db.run(`DELETE FROM products WHERE id = ?;`, [id]);
  saveDb();
  return { success: true, message: `Product "${existing.name}" deleted successfully` };
}

// ===================== DESIGN PRESETS =====================

export interface DbDesignPreset {
  id: string;
  name: string;
  settings: any;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getAllDesignPresets(categoryFilter?: string): Promise<DbDesignPreset[]> {
  const db = await getDb();
  
  // Seed default Diamonds presets if none exist for DIAMONDS
  const countRes = db.exec(`SELECT COUNT(*) FROM design_presets WHERE category = 'DIAMONDS';`);
  const diamondsCount = (countRes[0]?.values[0]?.[0] as number) || 0;

  if (diamondsCount === 0) {
    const defaultDiamondsPresets = [
      {
        name: 'Neon Green',
        category: 'DIAMONDS',
        settings: {
          glowColor: '#10B981',
          borderColor: '#10B981',
          badgeBgColor: '#155e75',
          badgeTextColor: '#bae6fd',
          buttonBgColor: '#38bdf8',
          imageBorderColor: '#06b6d4',
          labelBorderColor: '#06b6d4',
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
          labelInnerGlowBlur: 10,
        }
      },
      {
        name: 'Ice Blue',
        category: 'DIAMONDS',
        settings: {
          glowColor: '#38bdf8',
          borderColor: '#0284c7',
          badgeBgColor: '#0c4a6e',
          badgeTextColor: '#e0f2fe',
          buttonBgColor: '#0284c7',
          imageBorderColor: '#38bdf8',
          labelBorderColor: '#38bdf8',
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
          labelInnerGlowBlur: 12,
        }
      },
      {
        name: 'Royal Purple',
        category: 'DIAMONDS',
        settings: {
          glowColor: '#a855f7',
          borderColor: '#7e22ce',
          badgeBgColor: '#581c87',
          badgeTextColor: '#f3e8ff',
          buttonBgColor: '#9333ea',
          imageBorderColor: '#c084fc',
          labelBorderColor: '#c084fc',
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
          labelInnerGlowBlur: 15,
        }
      },
      {
        name: 'Golden Glow',
        category: 'DIAMONDS',
        settings: {
          glowColor: '#f59e0b',
          borderColor: '#d97706',
          badgeBgColor: '#78350f',
          badgeTextColor: '#fef3c7',
          buttonBgColor: '#f59e0b',
          imageBorderColor: '#fbbf24',
          labelBorderColor: '#fbbf24',
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
          labelInnerGlowBlur: 15,
        }
      }
    ];

    const now = new Date().toISOString();
    for (const p of defaultDiamondsPresets) {
      const pid = `preset_${Math.random().toString(36).substring(2, 8)}`;
      db.run(
        `INSERT OR IGNORE INTO design_presets (id, name, settings, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);`,
        [pid, p.name, JSON.stringify(p.settings), p.category, now, now]
      );
    }
    saveDb();
  }

  // Seed default Redeem Code presets if requested and none exist
  if (categoryFilter === 'REDEEM_CODE' || !categoryFilter) {
    const rcRes = db.exec(`SELECT COUNT(*) FROM design_presets WHERE category = 'REDEEM_CODE';`);
    const rcCount = (rcRes[0]?.values[0]?.[0] as number) || 0;
    if (rcCount === 0) {
      const defaultRedeemPresets = [
        {
          name: 'Cyber Emerald',
          category: 'REDEEM_CODE',
          settings: {
            glowColor: '#10B981',
            borderColor: '#10B981',
            cardBgColor: '#090d16',
            badgeBgColor: '#064e3b',
            badgeTextColor: '#a7f3d0',
            buttonBgColor: '#34d399',
            imageBorderColor: '#059669',
            labelBorderColor: '#059669',
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
            labelInnerGlowBlur: 10,
          }
        },
        {
          name: 'Vortex Crimson',
          category: 'REDEEM_CODE',
          settings: {
            glowColor: '#f43f5e',
            borderColor: '#e11d48',
            cardBgColor: '#140509',
            badgeBgColor: '#881337',
            badgeTextColor: '#ffe4e6',
            buttonBgColor: '#f43f5e',
            imageBorderColor: '#fb7185',
            labelBorderColor: '#fb7185',
            outerBorderThickness: 2,
            imageBorderThickness: 2,
            labelBorderThickness: 1,
            outerGlowEnabled: true,
            outerGlowIntensity: 60,
            outerGlowBlur: 25,
            imageGlowEnabled: true,
            imageGlowIntensity: 35,
            imageGlowBlur: 15,
            labelGlowEnabled: true,
            labelGlowIntensity: 25,
            labelGlowBlur: 10,
            labelInnerGlowIntensity: 25,
            labelInnerGlowBlur: 10,
          }
        },
        {
          name: 'Electric Amber',
          category: 'REDEEM_CODE',
          settings: {
            glowColor: '#f59e0b',
            borderColor: '#d97706',
            cardBgColor: '#140d04',
            badgeBgColor: '#78350f',
            badgeTextColor: '#fef3c7',
            buttonBgColor: '#f59e0b',
            imageBorderColor: '#fbbf24',
            labelBorderColor: '#fbbf24',
            outerBorderThickness: 2,
            imageBorderThickness: 2,
            labelBorderThickness: 1,
            outerGlowEnabled: true,
            outerGlowIntensity: 55,
            outerGlowBlur: 25,
            imageGlowEnabled: true,
            imageGlowIntensity: 30,
            imageGlowBlur: 15,
            labelGlowEnabled: true,
            labelGlowIntensity: 20,
            labelGlowBlur: 10,
            labelInnerGlowIntensity: 20,
            labelInnerGlowBlur: 10,
          }
        },
        {
          name: 'Midnight Sapphire',
          category: 'REDEEM_CODE',
          settings: {
            glowColor: '#3b82f6',
            borderColor: '#2563eb',
            cardBgColor: '#060e1d',
            badgeBgColor: '#1e3a8a',
            badgeTextColor: '#dbeafe',
            buttonBgColor: '#3b82f6',
            imageBorderColor: '#60a5fa',
            labelBorderColor: '#60a5fa',
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
            labelInnerGlowBlur: 10,
          }
        }
      ];

      const now = new Date().toISOString();
      for (const p of defaultRedeemPresets) {
        const pid = `preset_${Math.random().toString(36).substring(2, 8)}`;
        db.run(
          `INSERT OR IGNORE INTO design_presets (id, name, settings, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);`,
          [pid, p.name, JSON.stringify(p.settings), p.category, now, now]
        );
      }
      saveDb();
    }
  }

  let query = `SELECT id, name, settings, category, created_at, updated_at FROM design_presets`;
  const params: any[] = [];
  if (categoryFilter) {
    query += ` WHERE category = ? OR category = 'ALL'`;
    params.push(categoryFilter);
  }
  query += ` ORDER BY name ASC;`;

  let res = db.exec(query, params);

  if (res.length === 0) return [];
  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    let parsedSettings = {};
    try {
      parsedSettings = typeof obj.settings === 'string' ? JSON.parse(obj.settings) : obj.settings || {};
    } catch (e) {
      parsedSettings = {};
    }
    return {
      id: obj.id,
      name: obj.name,
      settings: parsedSettings,
      category: obj.category || 'DIAMONDS',
      createdAt: obj.created_at,
      updatedAt: obj.updated_at,
    };
  });
}

export async function saveDesignPreset(name: string, settings: any, id?: string, category: string = 'DIAMONDS'): Promise<DbDesignPreset> {
  const db = await getDb();
  const now = new Date().toISOString();
  const cleanName = (name || '').trim();
  if (!cleanName) {
    throw new Error('Preset name is required');
  }
  const settingsJson = typeof settings === 'string' ? settings : JSON.stringify(settings || {});

  const existingByName = db.exec(`SELECT id FROM design_presets WHERE LOWER(name) = LOWER(?);`, [cleanName]);
  let targetId = id;
  if (!targetId && existingByName.length > 0 && existingByName[0].values.length > 0) {
    targetId = existingByName[0].values[0][0] as string;
  }

  if (targetId) {
    db.run(
      `UPDATE design_presets SET name = ?, settings = ?, category = ?, updated_at = ? WHERE id = ?;`,
      [cleanName, settingsJson, category, now, targetId]
    );
  } else {
    targetId = `preset_${Math.random().toString(36).substring(2, 8)}`;
    db.run(
      `INSERT INTO design_presets (id, name, settings, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);`,
      [targetId, cleanName, settingsJson, category, now, now]
    );
  }
  saveDb();
  const presets = await getAllDesignPresets();
  return presets.find((p) => p.id === targetId || p.name.toLowerCase() === cleanName.toLowerCase())!;
}

export async function deleteDesignPreset(id: string): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  db.run(`DELETE FROM design_presets WHERE id = ? OR name = ?;`, [id, id]);
  saveDb();
  return { success: true, message: 'Preset deleted successfully' };
}

// ===================== RECHARGE CATEGORIES =====================

export interface DatabaseCategory {
  id: string;
  name: string;
  denomination: string;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
  availableStock?: number;
}

export async function isDenominationDisabled(denomination: string): Promise<boolean> {
  if (!denomination) return false;
  const db = await getDb();
  const clean = denomination.trim();
  const digits = clean.replace(/\D/g, '');
  const res = db.exec(
    `SELECT enabled FROM categories WHERE denomination = ? OR denomination = ? OR denomination = ?;`,
    [clean, `₹${digits}`, digits]
  );
  if (res.length > 0 && res[0].values.length > 0) {
    const isEnabled = Boolean(res[0].values[0][0]);
    return !isEnabled;
  }
  return false;
}

export async function getAllCategories(includeDisabled = true) {
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
    LEFT JOIN products p ON (p.denomination = c.denomination OR p.denomination = '₹' || REPLACE(c.denomination, '₹', ''))
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
    const obj: any = {};
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

export async function getCategoryById(id: string) {
  const db = await getDb();
  const res = db.exec(
    `SELECT id, name, denomination, enabled, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt FROM categories WHERE id = ?;`,
    [id.trim()]
  );
  if (res.length === 0 || res[0].values.length === 0) return null;
  const columns = res[0].columns;
  const row = res[0].values[0];
  const obj: any = {};
  columns.forEach((col, idx) => {
    obj[col] = row[idx];
  });
  obj.enabled = Boolean(obj.enabled);
  obj.sortOrder = Number(obj.sortOrder);
  return obj;
}

export async function createCategory(data: {
  name: string;
  denomination: string;
  enabled?: boolean;
  sortOrder?: number;
}) {
  const db = await getDb();
  const cleanDenom = data.denomination.trim().startsWith('₹')
    ? data.denomination.trim()
    : `₹${data.denomination.trim().replace(/\D/g, '') || data.denomination.trim()}`;
  const digits = cleanDenom.replace(/\D/g, '') || Math.random().toString(36).substring(2, 6);
  const id = `cat_${digits}_${Math.random().toString(36).substring(2, 5)}`;
  const now = new Date().toISOString();
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

export async function updateCategory(
  id: string,
  updates: {
    name?: string;
    denomination?: string;
    enabled?: boolean;
    sortOrder?: number;
  }
) {
  const db = await getDb();
  const existing = await getCategoryById(id);
  if (!existing) {
    throw new Error(`Category with ID "${id}" not found.`);
  }

  const name = updates.name !== undefined ? updates.name.trim() : existing.name;
  let denomination = existing.denomination;
  if (updates.denomination !== undefined) {
    const d = updates.denomination.trim();
    denomination = d.startsWith('₹') ? d : `₹${d.replace(/\D/g, '') || d}`;
  }
  const enabledInt = updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : (existing.enabled ? 1 : 0);
  const sortOrder = updates.sortOrder !== undefined ? Number(updates.sortOrder) : existing.sortOrder;
  const now = new Date().toISOString();

  db.run(
    `UPDATE categories SET name = ?, denomination = ?, enabled = ?, sort_order = ?, updated_at = ? WHERE id = ?;`,
    [name, denomination, enabledInt, sortOrder, now, id]
  );
  saveDb();
  return getCategoryById(id);
}

export async function toggleCategoryStatus(id: string) {
  const db = await getDb();
  const existing = await getCategoryById(id);
  if (!existing) {
    throw new Error(`Category with ID "${id}" not found.`);
  }

  const nextEnabled = existing.enabled ? 0 : 1;
  const now = new Date().toISOString();

  db.run(
    `UPDATE categories SET enabled = ?, updated_at = ? WHERE id = ?;`,
    [nextEnabled, now, id]
  );
  saveDb();
  return getCategoryById(id);
}

export async function deleteCategory(id: string) {
  const db = await getDb();
  const existing = await getCategoryById(id);
  if (!existing) {
    throw new Error(`Category with ID "${id}" not found.`);
  }

  db.run(`DELETE FROM categories WHERE id = ?;`, [id]);
  saveDb();
  return { success: true, message: `Category ${id} deleted successfully.` };
}

export function normalizeCode(raw: string): string {
  if (!raw) return '';
  return raw.replace(/[\s-]+/g, '').trim().toUpperCase();
}

export function validateCode(raw: string): { valid: boolean; normalized: string; error?: string } {
  const normalized = normalizeCode(raw);
  if (!normalized) {
    return { valid: false, normalized: '', error: 'Redeem code cannot be empty.' };
  }
  if (normalized.length !== 16) {
    return {
      valid: false,
      normalized,
      error: `Redeem code must contain exactly 16 characters (got ${normalized.length} characters: "${normalized}"). Format: XXXX XXXX XXXX XXXX`,
    };
  }
  if (!/^[A-Z0-9]{16}$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Redeem code can only contain alphanumeric characters (A-Z, 0-9).',
    };
  }
  return { valid: true, normalized };
}

export function formatFullCode(code: string): string {
  const norm = normalizeCode(code);
  if (norm.length === 16) {
    return `${norm.substring(0, 4)} ${norm.substring(4, 8)} ${norm.substring(8, 12)} ${norm.substring(12, 16)}`;
  }
  return norm.match(/.{1,4}/g)?.join(' ') || norm;
}

export function maskCode(code: string): string {
  const norm = normalizeCode(code);
  if (norm.length >= 8) {
    const part1 = norm.substring(0, 4);
    const part2 = norm.substring(4, 8);
    return `${part1} ${part2} **** ****`;
  }
  return 'CSGY AGTS **** ****';
}

export async function getRedeemCodes(productId?: string, status?: string, denomination?: string) {
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
      r.card_color as cardColor,
      r.glow_settings as glowSettings,
      r.created_at as createdAt, 
      r.used_at as usedAt 
    FROM redeem_codes r
    LEFT JOIN products p ON r.product_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (productId) {
    sql += ` AND r.product_id = ?`;
    params.push(productId);
  }
  if (status && status !== 'ALL') {
    let dbStatus = status;
    const s = String(status).toUpperCase();
    if (s === 'AVAILABLE' || s === 'UNUSED') dbStatus = 'UNUSED';
    else if (s === 'USED' || s === 'SOLD') dbStatus = 'SOLD';
    else if (s === 'RESERVED') dbStatus = 'RESERVED';
    else if (s === 'DISABLED') dbStatus = 'DISABLED';
    sql += ` AND r.status = ?`;
    params.push(dbStatus);
  }
  if (denomination && denomination !== 'ALL VALUES') {
    const cleanDenom = denomination.trim();
    const numPart = cleanDenom.replace(/\D/g, '');
    sql += ` AND (p.denomination = ? OR p.denomination = ? OR p.price = ?)`;
    params.push(cleanDenom, `₹${numPart}`, Number(numPart) || 0);
  }
  sql += ` ORDER BY r.created_at DESC;`;

  const res = db.exec(sql, params);
  if (res.length === 0) return [];
  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    obj.productEnabled = obj.productEnabled !== undefined ? Boolean(obj.productEnabled) : true;
    obj.price = Number(obj.price ?? 0);
    obj.rewardValue = Number(obj.rewardValue ?? 0);
    obj.code = normalizeCode(obj.code);
    obj.codeFull = formatFullCode(obj.code);
    obj.codeMasked = maskCode(obj.code);
    obj.cardColor = obj.cardColor || 'blue';
    try {
      obj.glowSettings = typeof obj.glowSettings === 'string' ? JSON.parse(obj.glowSettings) : (obj.glowSettings || {});
    } catch {
      obj.glowSettings = {};
    }
    return obj;
  });
}

export async function addRedeemCode(data: {
  productId: string;
  code: string;
  pin?: string;
  status?: string;
  cardColor?: string;
  glowSettings?: any;
}) {
  const db = await getDb();
  const validation = validateCode(data.code);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid code. Must be exactly 16 characters.');
  }
  const cleanCode = validation.normalized; // Exactly 16 chars without display spaces

  // Verify product exists
  const prod = await getProductById(data.productId);
  if (!prod) throw new Error(`Product ${data.productId} does not exist`);

  const id = `cd_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();
  const pin = data.pin?.trim() || null;
  const cardColor = data.cardColor?.trim() || 'blue';
  const glowSettingsStr = typeof data.glowSettings === 'object' ? JSON.stringify(data.glowSettings) : (data.glowSettings || '{}');

  let status = 'UNUSED';
  if (data.status) {
    const s = String(data.status).toUpperCase();
    if (s === 'AVAILABLE' || s === 'UNUSED') status = 'UNUSED';
    else if (s === 'USED' || s === 'SOLD') status = 'SOLD';
    else if (s === 'RESERVED') status = 'RESERVED';
    else if (s === 'DISABLED') status = 'DISABLED';
  }

  const usedAt = status === 'SOLD' ? now : null;

  db.run(
    `INSERT INTO redeem_codes (id, product_id, code, pin, status, order_id, card_color, glow_settings, created_at, used_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?);`,
    [id, data.productId, cleanCode, pin, status, cardColor, glowSettingsStr, now, usedAt]
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
    cardColor,
    glowSettings: typeof glowSettingsStr === 'string' ? JSON.parse(glowSettingsStr) : glowSettingsStr,
    createdAt: now,
  };
}

export async function addBulkRedeemCodes(data: {
  productId: string;
  codesText: string;
  cardColor?: string;
  glowSettings?: any;
}) {
  const db = await getDb();
  const prod = await getProductById(data.productId);
  if (!prod) throw new Error(`Product ${data.productId} does not exist`);

  const cardColor = data.cardColor?.trim() || 'blue';
  const glowSettingsStr = typeof data.glowSettings === 'object' ? JSON.stringify(data.glowSettings) : (data.glowSettings || '{}');

  // Split lines or commas
  const lines = data.codesText
    .split(/[\r\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error('No valid codes found in input');
  }

  // Pre-validate every code before inserting to enforce strict 16-character format
  const parsedCodes: { code: string; pin: string | null }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const rawCode = raw.includes(':') ? raw.split(':')[0].trim() : raw;
    const validation = validateCode(rawCode);
    if (!validation.valid) {
      throw new Error(`Line ${i + 1} ("${raw}"): ${validation.error}`);
    }
    parsedCodes.push({ code: validation.normalized, pin: null });
  }

  const now = new Date().toISOString();
  let addedCount = 0;
  const addedIds: string[] = [];

  for (const item of parsedCodes) {
    const id = `cd_${Math.random().toString(36).substring(2, 9)}`;
    db.run(
      `INSERT INTO redeem_codes (id, product_id, code, pin, status, order_id, card_color, glow_settings, created_at, used_at)
       VALUES (?, ?, ?, ?, 'UNUSED', NULL, ?, ?, ?, NULL);`,
      [id, data.productId, item.code, item.pin, cardColor, glowSettingsStr, now]
    );
    addedIds.push(id);
    addedCount++;
  }

  saveDb();
  return {
    success: true,
    addedCount,
    productId: data.productId,
    cardColor,
    message: `Successfully added ${addedCount} 16-character redeem code(s) for ${prod.name}`,
  };
}

export async function updateRedeemCodeStatus(id: string, status: 'UNUSED' | 'RESERVED' | 'SOLD') {
  const db = await getDb();
  const now = new Date().toISOString();
  const usedAt = status === 'SOLD' ? now : null;

  db.run(
    `UPDATE redeem_codes SET status = ?, used_at = ? WHERE id = ?;`,
    [status, usedAt, id]
  );
  saveDb();
  return { id, status, updatedAt: now };
}

export async function updateRedeemCode(
  id: string,
  updates: {
    code?: string;
    pin?: string;
    status?: string;
    productId?: string;
    cardColor?: string;
    glowSettings?: any;
  }
) {
  const db = await getDb();
  const cleanId = id.trim();
  const check = db.exec(`SELECT id, code, pin, status, product_id, card_color, glow_settings FROM redeem_codes WHERE id = ?;`, [cleanId]);
  if (check.length === 0 || check[0].values.length === 0) {
    throw new Error(`Redeem code with ID "${cleanId}" not found in database.`);
  }

  const row = check[0].values[0];
  let code = row[1] as string;
  let pin = (row[2] as string) || '';
  let status = row[3] as string;
  let productId = row[4] as string;
  let cardColor = (row[5] as string) || 'blue';
  let glowSettings = row[6] ? (typeof row[6] === 'string' ? JSON.parse(row[6]) : row[6]) : {};

  if (updates.code) {
    const validation = validateCode(updates.code);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid code. Must be exactly 16 characters.');
    }
    code = validation.normalized;
  }

  if (updates.pin !== undefined) {
    pin = updates.pin.trim();
  }

  if (updates.status) {
    const s = String(updates.status).toUpperCase();
    if (s === 'AVAILABLE' || s === 'UNUSED') status = 'UNUSED';
    else if (s === 'USED' || s === 'SOLD') status = 'SOLD';
    else if (s === 'RESERVED') status = 'RESERVED';
    else if (s === 'DISABLED') status = 'DISABLED';
  }

  if (updates.productId) {
    const prod = await getProductById(updates.productId);
    if (!prod) throw new Error(`Product ${updates.productId} not found`);
    productId = updates.productId;
  }

  if (updates.cardColor !== undefined) {
    cardColor = updates.cardColor.trim() || 'blue';
  }

  if (updates.glowSettings !== undefined) {
    glowSettings = updates.glowSettings;
  }

  const glowSettingsStr = typeof glowSettings === 'object' ? JSON.stringify(glowSettings) : (glowSettings || '{}');
  const now = new Date().toISOString();
  const usedAt = status === 'SOLD' ? now : null;

  db.run(
    `UPDATE redeem_codes SET code = ?, pin = ?, status = ?, product_id = ?, card_color = ?, glow_settings = ?, used_at = ? WHERE id = ?;`,
    [code, pin, status, productId, cardColor, glowSettingsStr, usedAt, cleanId]
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
    cardColor,
    glowSettings: typeof glowSettingsStr === 'string' ? JSON.parse(glowSettingsStr) : glowSettingsStr,
    updatedAt: now,
  };
}

export async function deleteRedeemCode(id: string, force?: boolean) {
  const db = await getDb();
  const cleanId = id.trim();
  const check = db.exec(`SELECT id, status, product_id, code, order_id FROM redeem_codes WHERE id = ?;`, [cleanId]);
  if (check.length === 0 || check[0].values.length === 0) {
    throw new Error(`Redeem code with ID "${cleanId}" not found in database.`);
  }
  const row = check[0].values[0];
  const status = row[1] as string;
  const productId = row[2] as string;
  const code = row[3] as string;
  const orderId = row[4] as string;

  const orderCheck = db.exec(`
    SELECT o.id FROM orders o 
    WHERE o.delivered_code_id = ? 
       OR o.id = ? 
       OR o.id = (SELECT r.order_id FROM redeem_codes r WHERE r.id = ?);
  `, [cleanId, orderId || '', cleanId]);
  const isLinkedToOrder = orderCheck.length > 0 && orderCheck[0].values.length > 0;

  if (isLinkedToOrder && !force) {
    throw new Error('This code is linked to a completed customer order. Explicit confirmation is required to delete.');
  }

  db.run(`DELETE FROM redeem_codes WHERE id = ?;`, [cleanId]);
  saveDb();
  return {
    success: true,
    id: cleanId,
    productId,
    code,
    status,
    message: `Redeem code ${cleanId} permanently deleted from database.`,
  };
}

export async function deleteBulkRedeemCodes(ids: string[]) {
  const db = await getDb();
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('No redeem code IDs provided for bulk deletion.');
  }

  let deletedCount = 0;
  let preservedCount = 0;
  const preservedDetails: string[] = [];

  db.run('BEGIN TRANSACTION;');
  try {
    for (const rawId of ids) {
      const cleanId = typeof rawId === 'string' ? rawId.trim() : '';
      if (!cleanId) continue;

      const check = db.exec(`SELECT id, status, code, order_id FROM redeem_codes WHERE id = ?;`, [cleanId]);
      if (check.length === 0 || check[0].values.length === 0) {
        continue;
      }
      const row = check[0].values[0];
      const status = row[1] as string;
      const code = row[2] as string;
      const orderId = row[3] as string;

      const orderCheck = db.exec(`
        SELECT o.id FROM orders o 
        WHERE o.delivered_code_id = ? 
           OR o.id = ? 
           OR o.id = (SELECT r.order_id FROM redeem_codes r WHERE r.id = ?);
      `, [cleanId, orderId || '', cleanId]);
      const isLinkedToOrder = orderCheck.length > 0 && orderCheck[0].values.length > 0;

      if (isLinkedToOrder) {
        preservedCount++;
        preservedDetails.push(`Code ${code} (ID: ${cleanId}) preserved because it is linked to a customer order / transaction history.`);
        continue;
      }

      db.run(`DELETE FROM redeem_codes WHERE id = ?;`, [cleanId]);
      deletedCount++;
    }

    db.run('COMMIT;');
    saveDb();
    return {
      success: true,
      deletedCount,
      preservedCount,
      preservedDetails,
      message: `Successfully deleted ${deletedCount} redeem code(s). ${preservedCount} code(s) preserved due to historical order links.`
    };
  } catch (err) {
    db.run('ROLLBACK;');
    throw err;
  }
}

export async function getAllOrders() {
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
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

/**
 * Fetch ONLY successfully PAID and completed purchases belonging strictly to the customer.
 * Pending, failed, or cancelled transactions are excluded.
 */
export async function getCustomerPaidOrders(customerEmail: string, customerId?: string) {
  const db = await getDb();
  const cleanEmail = (customerEmail || '').trim().toLowerCase();
  const cleanId = (customerId || '').trim();

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
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

export async function getOrderByIdOrNumber(identifier: string) {
  if (!identifier || typeof identifier !== 'string') return null;
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
  const obj: any = {};
  columns.forEach((col, idx) => {
    obj[col] = row[idx];
  });
  return obj;
}

export async function updateOrderStatus(
  id: string,
  paymentStatus: string,
  deliveryStatus: string
) {
  const db = await getDb();
  const now = new Date().toISOString();
  db.run(
    `UPDATE orders 
     SET payment_status = ?, delivery_status = ?, updated_at = ? 
     WHERE id = ? OR order_number = ?;`,
    [paymentStatus, deliveryStatus, now, id, id]
  );
  saveDb();
  return getOrderByIdOrNumber(id);
}

/**
 * Direct Checkout & Order Fulfillment:
 * 1. Validates product is enabled
 * 2. Selects ONE UNUSED code atomically from redeem_codes
 * 3. Marks it SOLD
 * 4. Inserts completed order
 * 5. Returns order + delivered code key
 */
export async function purchaseProductDirect(params: {
  productId?: string;
  codeId?: string;
  customerName: string;
  customerEmail: string;
  customerId?: string;
  paymentMethod?: string;
}) {
  const db = await getDb();
  let assignedCodeId = '';
  let assignedCode = '';
  let assignedPin = '';
  let effectiveProductId = params.productId || '';

  if (params.codeId) {
    const codeRes = db.exec(
      `SELECT id, product_id, code, pin FROM redeem_codes 
       WHERE id = ? AND status = 'UNUSED' 
       LIMIT 1;`,
      [params.codeId]
    );

    if (codeRes.length === 0 || codeRes[0].values.length === 0) {
      throw new Error('This redeem code is already claimed or no longer available.');
    }

    assignedCodeId = codeRes[0].values[0][0] as string;
    effectiveProductId = codeRes[0].values[0][1] as string;
    assignedCode = codeRes[0].values[0][2] as string;
    assignedPin = codeRes[0].values[0][3] as string;
  } else if (params.productId) {
    const codeRes = db.exec(
      `SELECT id, code, pin FROM redeem_codes 
       WHERE product_id = ? AND status = 'UNUSED' 
       LIMIT 1;`,
      [params.productId]
    );

    if (codeRes.length === 0 || codeRes[0].values.length === 0) {
      throw new Error('OUT OF STOCK: No available redeem codes for this product.');
    }

    assignedCodeId = codeRes[0].values[0][0] as string;
    assignedCode = codeRes[0].values[0][1] as string;
    assignedPin = codeRes[0].values[0][2] as string;
  } else {
    throw new Error('productId or codeId is required for purchase');
  }

  const product = await getProductById(effectiveProductId);
  if (!product) {
    throw new Error('Associated product not found');
  }

  const isCatDisabledForDirect = await isDenominationDisabled(product.denomination);
  if (!product.enabled || isCatDisabledForDirect) {
    const err: any = new Error('This recharge category is currently unavailable.');
    err.statusCode = 400;
    throw err;
  }

  if (product.category === 'DIAMONDS' && (product.stockStatus === 'OUT OF STOCK' || product.stockStatus === 'SOLD OUT' || product.stockStatus === 'SOLD_OUT')) {
    const err: any = new Error('This diamond product is currently sold out.');
    err.statusCode = 400;
    throw err;
  }

  const now = new Date().toISOString();
  const orderId = `ord_${Math.random().toString(36).substring(2, 9)}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `VRX-2026-${randomSuffix}`;

  // 1. Mark code SOLD
  db.run(
    `UPDATE redeem_codes 
     SET status = 'SOLD', order_id = ?, used_at = ? 
     WHERE id = ?;`,
    [orderId, now, assignedCodeId]
  );

  // 2. Insert order
  db.run(
    `INSERT INTO orders (id, order_number, product_id, product_name, customer_name, customer_email, customer_id, amount, payment_status, delivery_status, delivered_code_id, delivered_code, delivered_pin, payment_method, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PAID', 'DELIVERED', ?, ?, ?, ?, ?, ?);`,
    [
      orderId,
      orderNumber,
      product.id,
      product.name,
      params.customerName || 'Customer',
      params.customerEmail || 'customer@example.com',
      params.customerId || null,
      product.price,
      assignedCodeId,
      formatFullCode(assignedCode),
      assignedPin,
      params.paymentMethod || 'Direct Payment Gateway',
      now,
      now,
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
      paymentStatus: 'PAID',
      deliveryStatus: 'DELIVERED',
      deliveredCodeId: assignedCodeId,
      deliveredCode: formatFullCode(assignedCode),
      deliveredCodeRaw: normalizeCode(assignedCode),
      deliveredPin: assignedPin,
      createdAt: now,
    },
  };
}

/**
 * 1. Identify product in DB & lookup verified price from DB (NEVER trust frontend price)
 * 2. Verify stock exists (count UNUSED codes)
 * 3. Create a PENDING order in DB with currency = INR, paymentStatus = PENDING
 * 4. Generate payment gateway order intent
 */
export async function createPendingCheckoutOrder(params: {
  productId: string;
  codeId?: string;
  customerName: string;
  customerEmail: string;
  customerId?: string;
}) {
  if (!paymentGateway.isConfigured()) {
    throw new Error('Payment service temporarily unavailable. Please try again later.');
  }

  const db = await getDb();
  const product = await getProductById(params.productId);
  if (!product) {
    throw new Error('Product not found in database.');
  }

  const isCatDisabled = await isDenominationDisabled(product.denomination);
  if (!product.enabled || isCatDisabled) {
    const err: any = new Error('This recharge category is currently unavailable.');
    err.statusCode = 400;
    throw err;
  }

  if (product.category === 'DIAMONDS' && (product.stockStatus === 'OUT OF STOCK' || product.stockStatus === 'SOLD OUT' || product.stockStatus === 'SOLD_OUT')) {
    const err: any = new Error('This diamond product is currently sold out.');
    err.statusCode = 400;
    throw err;
  }

  // Stock verification: count available UNUSED codes
  let availableCodeId: string | null = null;
  if (product.category !== 'DIAMONDS') {
    if (params.codeId) {
      const specificCodeRes = db.exec(
        `SELECT id FROM redeem_codes WHERE id = ? AND product_id = ? AND status = 'UNUSED' LIMIT 1;`,
        [params.codeId, product.id]
      );
      if (specificCodeRes.length === 0 || specificCodeRes[0].values.length === 0) {
        throw new Error('OUT OF STOCK: The requested redeem code is no longer available.');
      }
      availableCodeId = specificCodeRes[0].values[0][0] as string;
    } else {
      const stockRes = db.exec(
        `SELECT id FROM redeem_codes WHERE product_id = ? AND status = 'UNUSED' LIMIT 1;`,
        [product.id]
      );
      if (stockRes.length === 0 || stockRes[0].values.length === 0) {
        throw new Error('OUT OF STOCK: No available redeem codes for this product.');
      }
      availableCodeId = stockRes[0].values[0][0] as string;
    }
  }

  const now = new Date().toISOString();
  const orderId = `ord_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const randomSuffix = `${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
  const orderNumber = `VRX-2026-${randomSuffix}`;

  // Amount MUST come strictly from product.price in DB
  const verifiedAmount = product.price;

  // Insert PENDING order record (No code delivered yet!)
  const orderType = product.category === 'DIAMONDS' ? 'DIAMOND_PURCHASE' : 'PURCHASE';
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
      params.customerName || 'Customer',
      params.customerEmail || 'customer@vortexcode.com',
      params.customerId || null,
      verifiedAmount,
      verifiedAmount,
      orderType,
      now,
      now,
    ]
  );

  saveDb();

  // Initialize Payment Gateway Intent with latest DB credentials
  const storeSettings = await getStoreSettings();
  paymentGateway.updateCredentials(storeSettings);

  const gatewayOrder = await paymentGateway.createGatewayOrder({
    orderId,
    orderNumber,
    amount: verifiedAmount,
    currency: 'INR',
    productId: product.id,
    productName: product.name,
    customerName: params.customerName || 'Customer',
    customerEmail: params.customerEmail || 'customer@vortexcode.com',
    customerId: params.customerId,
    orderType: orderType,
  });

  const payableAmount = gatewayOrder.payableAmount || verifiedAmount;
  const checkoutUrl = gatewayOrder.paymentUrl || '';
  const expiresAt = gatewayOrder.expiresAt || null;

  db.run(
    `UPDATE orders SET gateway_order_id = ?, payable_amount = ?, checkout_url = ?, expires_at = ? WHERE id = ?;`,
    [gatewayOrder.gatewayOrderId || orderId, payableAmount, checkoutUrl, expiresAt, orderId]
  );
  saveDb();

  const gatewayConfig = paymentGateway.getConfig();

  // No changes needed here yet, I will update the frontend.
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
      orderType: orderType,
      checkoutUrl,
      paymentStatus: 'PENDING',
      deliveryStatus: 'PENDING',
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerId: params.customerId,
      createdAt: now,
    },
    gatewayOrder,
    gatewayConfig,
    checkoutUrl,
  };
}

/**
 * 4. WALLET & DEPOSIT INTEGRATION
 * Creates a server-verified deposit intent with Trust Gateway.
 */
export async function createPendingDepositOrder(params: {
  amount: number;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
}) {
  if (!params.amount || params.amount <= 0 || isNaN(params.amount)) {
    throw new Error('Deposit amount must be a positive number.');
  }

  const verifiedAmount = Number(params.amount.toFixed(2));
  if (verifiedAmount < 10) {
    throw new Error('Minimum deposit amount is ₹10.00.');
  }

  const storeSettings = await getStoreSettings();
  paymentGateway.updateCredentials(storeSettings);

  if (!paymentGateway.isConfigured()) {
    throw new Error('Payment service temporarily unavailable. Please try again later.');
  }

  const db = await getDb();
  const now = new Date().toISOString();
  const orderId = `dep_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const randomSuffix = `${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
  const orderNumber = `DEP-2026-${randomSuffix}`;

  // Insert PENDING deposit order
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
    ) VALUES (?, ?, 'WALLET_DEPOSIT', 'Wallet Deposit', ?, ?, ?, ?, ?, 'DEPOSIT', 'PENDING', 'PENDING', NULL, NULL, NULL, 'Trust Gateway UPI', ?, ?);`,
    [
      orderId,
      orderNumber,
      params.customerName || 'Customer',
      params.customerEmail || 'customer@vortexcode.com',
      params.customerId || null,
      verifiedAmount,
      verifiedAmount,
      now,
      now,
    ]
  );
  saveDb();

  const gatewayOrder = await paymentGateway.createGatewayOrder({
    orderId,
    orderNumber,
    amount: verifiedAmount,
    currency: 'INR',
    productId: 'WALLET_DEPOSIT',
    productName: 'Wallet Balance Deposit',
    customerName: params.customerName || 'Customer',
    customerEmail: params.customerEmail || 'customer@vortexcode.com',
    customerId: params.customerId,
    orderType: 'DEPOSIT',
  });

  const payableAmount = gatewayOrder.payableAmount || verifiedAmount;
  const checkoutUrl = gatewayOrder.paymentUrl || '';
  const expiresAt = gatewayOrder.expiresAt || null;

  db.run(
    `UPDATE orders SET gateway_order_id = ?, payable_amount = ?, checkout_url = ?, expires_at = ? WHERE id = ?;`,
    [gatewayOrder.gatewayOrderId || orderId, payableAmount, checkoutUrl, expiresAt, orderId]
  );
  saveDb();

  return {
    success: true,
    order: {
      id: orderId,
      orderNumber,
      productId: 'WALLET_DEPOSIT',
      productName: 'Wallet Balance Deposit',
      amount: verifiedAmount,
      payableAmount,
      orderType: 'DEPOSIT',
      paymentStatus: 'PENDING',
      deliveryStatus: 'PENDING',
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerId: params.customerId,
      checkoutUrl,
      createdAt: now,
    },
    gatewayOrder,
    checkoutUrl,
  };
}

/**
 * Server-Side Payment Verification & Atomic Code Delivery
 * 
 * Strict verification flow:
 * 1. Idempotency Check: Prevents duplicate fulfillment
 * 2. Authenticity & Status check
 * 3. Atomic UNUSED code selection & status update to SOLD
 * 4. Update order to PAID + DELIVERED
 */
const fulfillmentLocks = new Map<string, Promise<any>>();

export async function verifyAndFulfillPaymentOrder(params: {
  orderId: string;
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
  gatewaySignature?: string;
  expectedCustomerId?: string;
  expectedCustomerEmail?: string;
}) {
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

async function executeVerifyAndFulfillPaymentOrder(params: {
  orderId: string;
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
  gatewaySignature?: string;
  expectedCustomerId?: string;
  expectedCustomerEmail?: string;
}) {
  const db = await getDb();
  const order = await getOrderByIdOrNumber(params.orderId);
  if (!order) {
    throw new Error('Order not found in database.');
  }

  // Idempotency check: If already paid, return existing fulfilled record
  if (order.paymentStatus === 'PAID') {
    return {
      success: true,
      status: 'PAID' as const,
      alreadyFulfilled: true,
      order,
      message: order.orderType === 'DEPOSIT'
        ? 'Deposit was already verified and credited to wallet.'
        : 'Order was already verified and delivered.',
    };
  }

  // Ownership verification: ensure order belongs to requesting customer
  if (params.expectedCustomerId && order.customerId && order.customerId !== params.expectedCustomerId) {
    throw new Error('Order does not belong to the authenticated user.');
  }
  if (params.expectedCustomerEmail && order.customerEmail && order.customerEmail.toLowerCase() !== params.expectedCustomerEmail.toLowerCase()) {
    throw new Error('Order does not belong to the authenticated user.');
  }

  // Ensure latest Trust Gateway credentials from DB / environment
  const storeSettings = await getStoreSettings();
  paymentGateway.updateCredentials(storeSettings);

  const gatewayConfig = paymentGateway.getConfig();
  let verifiedGatewayPaymentId = params.gatewayPaymentId;

  if (!gatewayConfig.isConfigured) {
    return {
      success: false,
      status: 'PENDING' as const,
      order,
      message: 'Payment service temporarily unavailable. Please try again later.',
    };
  }

  const identifierToCheck = order.gatewayOrderId || params.gatewayOrderId || order.id;
  const expectedAmount = Number(order.payableAmount || order.amount || 0);

  // Authenticated server-to-server query to Trust Gateway status API
  const verifyResult = await paymentGateway.verifyPayment({
    orderId: identifierToCheck,
    gatewayOrderId: params.gatewayOrderId || order.gatewayOrderId,
    gatewayPaymentId: params.gatewayPaymentId,
    gatewaySignature: params.gatewaySignature,
    expectedAmount,
  });

  if (verifyResult.status === 'PENDING') {
    return {
      success: false,
      status: 'PENDING' as const,
      order,
      message: 'Payment is currently pending confirmation.',
      rawGatewayResponse: verifyResult.rawGatewayResponse,
    };
  }

  if (verifyResult.status === 'FAILED') {
    const now = new Date().toISOString();
    db.run(
      `UPDATE orders SET payment_status = 'FAILED', delivery_status = 'CANCELLED', updated_at = ? WHERE id = ?;`,
      [now, order.id]
    );
    saveDb();
    return {
      success: false,
      status: 'FAILED' as const,
      order: await getOrderByIdOrNumber(order.id),
      message: verifyResult.error || 'Payment was declined or failed on gateway.',
      rawGatewayResponse: verifyResult.rawGatewayResponse,
    };
  }

  if (verifyResult.status === 'EXPIRED') {
    const now = new Date().toISOString();
    db.run(
      `UPDATE orders SET payment_status = 'EXPIRED', delivery_status = 'EXPIRED', updated_at = ? WHERE id = ?;`,
      [now, order.id]
    );
    saveDb();
    return {
      success: false,
      status: 'EXPIRED' as const,
      order: await getOrderByIdOrNumber(order.id),
      message: 'Trust Gateway payment session expired.',
      rawGatewayResponse: verifyResult.rawGatewayResponse,
    };
  }

  if (!verifyResult.isValid || verifyResult.status !== 'PAID') {
    return {
      success: false,
      status: 'PENDING' as const,
      order,
      message: `Gateway status is ${verifyResult.status || 'PENDING'}. Waiting for confirmation.`,
      rawGatewayResponse: verifyResult.rawGatewayResponse,
    };
  }

  // Security Check 1: Gateway Order ID must match saved order
  if (
    order.gatewayOrderId &&
    verifyResult.gatewayOrderId &&
    order.gatewayOrderId !== order.id &&
    order.gatewayOrderId !== verifyResult.gatewayOrderId
  ) {
    throw new Error(`Gateway order ID mismatch: expected ${order.gatewayOrderId} but gateway recorded ${verifyResult.gatewayOrderId}.`);
  }

  // Save confirmed gateway order ID to local order if initially unset or set to local ID
  if (verifyResult.gatewayOrderId && (!order.gatewayOrderId || order.gatewayOrderId === order.id)) {
    db.run(`UPDATE orders SET gateway_order_id = ? WHERE id = ?;`, [verifyResult.gatewayOrderId, order.id]);
    saveDb();
  }

  // Security Check 2: Actual payable amount must match saved payable amount
  if (verifyResult.payableAmount && expectedAmount > 0) {
    const diff = Math.abs(verifyResult.payableAmount - expectedAmount);
    if (diff > 0.05) {
      throw new Error(`Payment amount mismatch: expected ₹${expectedAmount} but gateway recorded ₹${verifyResult.payableAmount}.`);
    }
  }

  if (verifyResult.transactionId) {
    verifiedGatewayPaymentId = verifyResult.transactionId;
  }

  const now = new Date().toISOString();

  // Branch A: WALLET DEPOSIT ORDER FULFILLMENT
  if (order.orderType === 'DEPOSIT') {
    let userRow: any = null;
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

    const paymentMethodStr = verifiedGatewayPaymentId
      ? `Trust Gateway UPI (${verifiedGatewayPaymentId})`
      : 'Trust Gateway UPI (Verified)';

    db.run(
      `UPDATE orders 
       SET payment_status = 'PAID', 
           delivery_status = 'DELIVERED', 
           payment_method = ?,
           gateway_payment_id = ?,
           updated_at = ? 
       WHERE id = ?;`,
      [paymentMethodStr, verifiedGatewayPaymentId || null, now, order.id]
    );

    saveDb();
    const fulfilledOrder = await getOrderByIdOrNumber(order.id);
    return {
      success: true,
      status: 'PAID' as const,
      order: fulfilledOrder,
      newBalance,
      message: `Deposit verified successfully! ₹${creditAmount} credited to wallet balance.`,
    };
  }

  // Branch C: DIAMOND PURCHASE FULFILLMENT
  if (order.orderType === 'DIAMOND_PURCHASE') {
    db.run(
      `UPDATE orders 
       SET payment_status = 'PAID', 
           delivery_status = 'DELIVERED', 
           updated_at = ? 
       WHERE id = ?;`,
      [now, order.id]
    );
    saveDb();
    const fulfilledOrder = await getOrderByIdOrNumber(order.id);
    return {
      success: true,
      status: 'PAID' as const,
      order: fulfilledOrder,
      message: 'Diamond purchase verified successfully.',
    };
  }

  // Branch B: PRODUCT ORDER FULFILLMENT (Deliver 16-digit redeem code)
  // Atomically select ONE UNUSED code for this product from DB
  const codeRes = db.exec(
    `SELECT id, code, pin FROM redeem_codes 
     WHERE product_id = ? AND status = 'UNUSED' 
     LIMIT 1;`,
    [order.productId]
  );

  if (codeRes.length === 0 || codeRes[0].values.length === 0) {
    // Edge case: Out of stock between checkout initiation and payment verification
    db.run(
      `UPDATE orders 
       SET payment_status = 'PAID', delivery_status = 'OUT_OF_STOCK_PENDING_REFUND', updated_at = ? 
       WHERE id = ?;`,
      [now, order.id]
    );
    saveDb();
    throw new Error('OUT OF STOCK: Payment recorded but no unused redeem code was available. Marked for automated refund.');
  }

  const assignedCodeId = codeRes[0].values[0][0] as string;
  const assignedCode = codeRes[0].values[0][1] as string;
  const assignedPin = codeRes[0].values[0][2] as string;

  // 1. Mark code SOLD
  db.run(
    `UPDATE redeem_codes 
     SET status = 'SOLD', order_id = ?, used_at = ? 
     WHERE id = ?;`,
    [order.id, now, assignedCodeId]
  );

  // 2. Mark order PAID & DELIVERED with the exact 16-character code
  const fullCodeFormatted = formatFullCode(assignedCode);
  const paymentMethodStr = verifiedGatewayPaymentId
    ? `Trust Gateway UPI (${verifiedGatewayPaymentId})`
    : 'Trust Gateway UPI (Verified)';

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
      order.id,
    ]
  );

  saveDb();

  const fulfilledOrder = await getOrderByIdOrNumber(order.id);

  return {
    success: true,
    status: 'PAID' as const,
    order: fulfilledOrder,
    message: 'Payment verified successfully and redeem code delivered.',
  };
}

export async function getUserWalletTransactions(userIdentifier: string) {
  const db = await getDb();
  const clean = userIdentifier.trim();
  const res = db.exec(
    `SELECT 
      wt.id,
      wt.user_id as userId,
      wt.order_id as orderId,
      wt.type,
      wt.amount,
      wt.balance_before as balanceBefore,
      wt.balance_after as balanceAfter,
      wt.description,
      wt.status,
      wt.created_at as createdAt
    FROM wallet_transactions wt
    LEFT JOIN users u ON u.id = wt.user_id
    WHERE wt.user_id = ? OR u.customer_id = ? OR LOWER(u.email) = ?
    ORDER BY wt.created_at DESC
    LIMIT 50;`,
    [clean, clean, clean.toLowerCase()]
  );

  if (res.length === 0 || res[0].values.length === 0) return [];
  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  const clean = email.trim().toLowerCase();
  const res = db.exec(
    `SELECT id, fullName, email, username, password, googleSub, role, createdAt, balance FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?;`,
    [clean, clean]
  );
  if (res.length === 0 || res[0].values.length === 0) return null;
  const columns = res[0].columns;
  const row = res[0].values[0];
  const obj: any = {};
  columns.forEach((col, idx) => {
    obj[col] = row[idx];
  });
  return obj;
}

export async function getUserByGoogleSub(sub: string) {
  const db = await getDb();
  const res = db.exec(
    `SELECT id, fullName, email, username, password, googleSub, role, createdAt, balance FROM users WHERE googleSub = ?;`,
    [sub]
  );
  if (res.length === 0 || res[0].values.length === 0) return null;
  const columns = res[0].columns;
  const row = res[0].values[0];
  const obj: any = {};
  columns.forEach((col, idx) => {
    obj[col] = row[idx];
  });
  return obj;
}

export async function createUser(params: {
  fullName: string;
  email: string;
  username: string;
  password?: string;
  googleSub?: string;
  role?: string;
  balance?: number;
  customerId?: string;
}) {
  const db = await getDb();
  const id = `usr_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();
  const role = params.role || 'CUSTOMER';
  const balance = params.balance !== undefined ? params.balance : 1500.0;
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
      balance,
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
    balance,
  };
}

export async function isCustomerIdUnique(cid: string): Promise<boolean> {
  const db = await getDb();
  const res = db.exec(`SELECT id FROM users WHERE customer_id = ?;`, [cid]);
  return res.length === 0 || res[0].values.length === 0;
}

export async function generateRandomCustomerId(): Promise<string> {
  while (true) {
    const num = Math.floor(Math.random() * 90000) + 10000;
    const cid = `VC-${num}`;
    if (await isCustomerIdUnique(cid)) {
      return cid;
    }
  }
}

export async function migrateToRandomCustomerIds() {
  const db = await getDb();
  const res = db.exec(`SELECT id, customer_id FROM users;`);
  if (res.length === 0 || res[0].values.length === 0) return;

  const rows = res[0].values;
  for (const row of rows) {
    const uid = row[0] as string;
    const cid = row[1] as string;

    // Migrate if no CID OR old format (sequential starts with VC-0)
    if (!cid || cid.startsWith('VC-0')) {
      const newCid = await generateRandomCustomerId();
      db.run(`UPDATE users SET customer_id = ? WHERE id = ?;`, [newCid, uid]);
    }
  }
}

export async function getCategoricalSettings(category: 'diamonds' | 'redeem') {
  const db = await getDb();
  const res = db.exec(`SELECT value FROM store_settings WHERE key = ?;`, [`${category}_settings`]);
  if (res.length === 0 || res[0].values.length === 0) return {};
  try {
    return JSON.parse(res[0].values[0][0] as string);
  } catch {
    return {};
  }
}

export async function updateCategoricalSettings(category: 'diamonds' | 'redeem', settings: Record<string, any>) {
  const db = await getDb();
  const key = `${category}_settings`;
  db.run(`INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?);`, [key, JSON.stringify(settings)]);
  saveDb();
  return settings;
}

export async function getAllUsersForAdmin() {
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
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });

  // Attach order stats for each user
  const enhancedUsers = [];
  for (const u of users) {
    const ordersRes = db.exec(`
      SELECT id, amount, created_at, payment_status, delivery_status 
      FROM orders 
      WHERE (customer_email IS NOT NULL AND LOWER(customer_email) = ?) 
         OR (customer_id IS NOT NULL AND customer_id = ?)
      ORDER BY created_at DESC;
    `, [(u.email || '').toLowerCase(), u.customerId || '']);

    let successfulOrdersCount = 0;
    let totalSpent = 0;
    let codesPurchased = 0;

    if (ordersRes.length > 0 && ordersRes[0].values.length > 0) {
      for (const ordRow of ordersRes[0].values) {
        const paymentStatus = ordRow[3] as string;
        const amount = Number(ordRow[1]) || 0;
        if (paymentStatus === 'PAID') {
          successfulOrdersCount++;
          totalSpent += amount;
          codesPurchased++;
        }
      }
    }

    enhancedUsers.push({
      id: u.id,
      customerId: u.customerId || 'VC-000000',
      fullName: u.fullName || u.username || 'Customer',
      email: u.email,
      role: u.role || 'CUSTOMER',
      provider: u.googleSub ? 'Google' : (u.provider || 'Email/Password'),
      status: u.status || 'ACTIVE',
      createdAt: u.createdAt,
      joinedDate: u.createdAt ? u.createdAt.substring(0, 10) : '2026-10-08',
      lastLogin: u.lastLoginAt ? u.lastLoginAt.substring(0, 16).replace('T', ' ') : (u.createdAt ? u.createdAt.substring(0, 16).replace('T', ' ') : 'Recently'),
      successfulOrders: successfulOrdersCount,
      orderCount: successfulOrdersCount,
      codesPurchased: codesPurchased,
      totalSpent: totalSpent,
      totalSpentRupees: totalSpent,
    });
  }

  return enhancedUsers;
}

export async function getUserDetailsWithOrders(identifier: string) {
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
  const userObj: any = {};
  cols.forEach((c, idx) => { userObj[c] = row[idx]; });

  const orders = await getCustomerPaidOrders(userObj.email, userObj.customerId);
  const totalSpent = orders.reduce((sum, o) => sum + Number(o.amount || 0), 0);

  return {
    profile: {
      id: userObj.id,
      customerId: userObj.customerId || 'VC-000000',
      fullName: userObj.fullName,
      email: userObj.email,
      role: userObj.role,
      provider: userObj.googleSub ? 'Google' : (userObj.provider || 'Email'),
      status: userObj.status || 'ACTIVE',
      createdAt: userObj.createdAt,
      lastLogin: userObj.lastLoginAt || userObj.createdAt,
    },
    statistics: {
      successfulOrders: orders.length,
      codesPurchased: orders.length,
      totalSpent,
    },
    orders,
  };
}

export async function updateUserStatus(identifier: string, status: 'ACTIVE' | 'DISABLED') {
  const db = await getDb();
  const clean = identifier.trim();
  db.run(`UPDATE users SET status = ? WHERE id = ? OR customer_id = ? OR email = ?;`, [status, clean, clean, clean]);
  saveDb();
  return getUserDetailsWithOrders(clean);
}

export async function resetTodaysSales() {
  const db = await getDb();
  const now = new Date().toISOString();
  db.run(`INSERT OR REPLACE INTO store_settings (key, value) VALUES ('todays_sales_reset_at', ?);`, [now]);
  saveDb();
  return { success: true, message: "Today's sales counter reset successfully", resetAt: now };
}

export async function resetDiamondAnalytics() {
  const db = await getDb();
  const now = new Date().toISOString();
  db.run(`INSERT OR REPLACE INTO store_settings (key, value) VALUES ('diamond_analytics_reset_at', ?);`, [now]);
  saveDb();
  return { success: true, message: "Diamond analytics reset successfully", resetAt: now };
}

export async function getAdminAnalyticsSummary() {
  const users = await getAllUsersForAdmin();
  const allOrders = await getAllOrders();
  const successfulOrders = allOrders.filter(o => o.paymentStatus === 'PAID');
  const settings = await getStoreSettings();
  const resetAt = settings.todays_sales_reset_at || '';

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'ACTIVE').length;
  const usersWithPurchases = users.filter(u => u.successfulOrders > 0).length;
  const totalCodesSold = successfulOrders.length;
  const totalSales = successfulOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);

  // Today's sales (resets relative to baseline timestamp for current day)
  const todayStr = new Date().toISOString().substring(0, 10);
  const todaysSales = successfulOrders
    .filter(o => {
      if (!o.createdAt || !o.createdAt.startsWith(todayStr)) return false;
      if (resetAt && o.createdAt <= resetAt) return false;
      return true;
    })
    .reduce((sum, o) => sum + Number(o.amount || 0), 0);

  const topBuyers = [...users]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5)
    .map(u => ({
      customerId: u.customerId,
      name: u.fullName,
      email: u.email,
      codesPurchased: u.codesPurchased,
      totalSpent: u.totalSpent,
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
    topBuyers,
  };
}

export async function getStoreSettings() {
  const db = await getDb();
  const res = db.exec(`SELECT key, value FROM store_settings;`);
  const settings: Record<string, any> = {
    storeName: 'VORTEX CODE',
    websiteName: 'VORTEX CODE',
    subtitle: 'SECURE DIGITAL STORE',
    tagline: 'SECURE DIGITAL STORE',
    logoUrl: '',
    supportEmail: 'support@vortexcode.com',
    currencySymbol: '₹',
    enableAutoFulfillment: true,
    telegramEnabled: true,
    telegramUrl: 'https://t.me/VortexCodeSupport',
    contactEnabled: true,
    contactPlatform: 'telegram',
    contactUrl: 'https://t.me/VortexCodeSupport',
    contactIconUrl: '',
    contactLabel: 'Contact Admin',
    contactWidgetSize: 60,
    contactWidgetRight: 30,
    contactWidgetBottom: 30,
    contactWidgetMobileSize: 55,
    contactWidgetMobileRight: 35,
    contactWidgetMobileBottom: 110,
    contactIconSize: 42,
    contactMobileIconSize: 42,
    appUrl: process.env.APP_URL || 'https://vortexcode.shop',
    how_to_redeem_step_1_image_enabled: false,
    how_to_redeem_step_1_image_url: '',
    how_to_redeem_step_2_image_enabled: false,
    how_to_redeem_step_2_image_url: '',
    how_to_redeem_step_3_image_enabled: false,
    how_to_redeem_step_3_image_url: '',
    how_to_redeem_step_4_image_enabled: false,
    how_to_redeem_step_4_image_url: '',
    defaultStoreCategory: 'REDEEM CODE',
    defaultOpeningCategory: 'REDEEM CODE',
  };

  if (res.length > 0 && res[0].values.length > 0) {
    res[0].values.forEach((row) => {
      const key = row[0] as string;
      const val = row[1] as string;
      if (
        key === 'enableAutoFulfillment' || 
        key === 'telegramEnabled' || 
        key === 'contactEnabled' ||
        (key.startsWith('how_to_redeem_') && key.endsWith('_enabled'))
      ) {
        settings[key] = val === 'true';
      } else if (
        key === 'contactWidgetSize' ||
        key === 'contactWidgetRight' ||
        key === 'contactWidgetBottom' ||
        key === 'contactWidgetMobileSize' ||
        key === 'contactWidgetMobileRight' ||
        key === 'contactWidgetMobileBottom' ||
        key === 'contactIconSize' ||
        key === 'contactMobileIconSize'
      ) {
        settings[key] = Number(val) || settings[key];
      } else {
        settings[key] = val;
      }
    });
  }

  // Ensure websiteName and storeName, tagline and subtitle sync
  if (settings.websiteName && !settings.storeName) settings.storeName = settings.websiteName;
  if (settings.storeName && !settings.websiteName) settings.websiteName = settings.storeName;
  if (settings.tagline && !settings.subtitle) settings.subtitle = settings.tagline;
  if (settings.subtitle && !settings.tagline) settings.tagline = settings.subtitle;

  if (settings.defaultStoreCategory && !settings.defaultOpeningCategory) {
    settings.defaultOpeningCategory = settings.defaultStoreCategory;
  }
  if (settings.defaultOpeningCategory && !settings.defaultStoreCategory) {
    settings.defaultStoreCategory = settings.defaultOpeningCategory;
  }
  if (!settings.defaultStoreCategory) {
    settings.defaultStoreCategory = 'REDEEM CODE';
    settings.defaultOpeningCategory = 'REDEEM CODE';
  }

  return settings;
}

export async function updateStoreSettings(updates: Record<string, any>) {
  const db = await getDb();
  const normalizedUpdates: Record<string, any> = { ...updates };
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
  if (normalizedUpdates.defaultStoreCategory && !normalizedUpdates.defaultOpeningCategory) {
    normalizedUpdates.defaultOpeningCategory = normalizedUpdates.defaultStoreCategory;
  }
  if (normalizedUpdates.defaultOpeningCategory && !normalizedUpdates.defaultStoreCategory) {
    normalizedUpdates.defaultStoreCategory = normalizedUpdates.defaultOpeningCategory;
  }

  for (const [key, value] of Object.entries(normalizedUpdates)) {
    if (value !== undefined) {
      db.run(
        `INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?);`,
        [key, String(value)]
      );
    }
  }
  saveDb();
  return getStoreSettings();
}

export async function getAllNotices() {
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
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    obj.enabled = Boolean(obj.enabled);
    obj.buttonEnabled = Boolean(obj.buttonEnabled);
    obj.priority = Number(obj.priority || 0);
    return obj;
  });
}

export async function getNoticeById(id: string) {
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
  const obj: any = {};
  columns.forEach((col, idx) => {
    obj[col] = row[idx];
  });
  obj.enabled = Boolean(obj.enabled);
  obj.buttonEnabled = Boolean(obj.buttonEnabled);
  obj.priority = Number(obj.priority || 0);
  return obj;
}

export async function getPublishedNotice(type: string = 'redeem-code') {
  const notices = await getAllNotices();
  const now = new Date().toISOString();
  const active = notices.filter(n => {
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

export async function createNotice(data: {
  enabled: boolean;
  title: string;
  message: string;
  imageUrl?: string;
  buttonEnabled: boolean;
  buttonText?: string;
  buttonUrl?: string;
  displayFrequency: string;
  startAt?: string;
  endAt?: string;
  priority: number;
}) {
  const db = await getDb();
  const id = `not_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();
  db.run(`
    INSERT INTO notices (
      id, enabled, title, message, image_url, button_enabled, button_text, button_url, 
      display_frequency, start_at, end_at, priority, type, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    id,
    data.enabled ? 1 : 0,
    data.title || '',
    data.message || '',
    data.imageUrl || null,
    data.buttonEnabled ? 1 : 0,
    data.buttonText || null,
    data.buttonUrl || null,
    data.displayFrequency || 'EVERY_LOAD',
    data.startAt || null,
    data.endAt || null,
    Number(data.priority || 0),
    (data as any).type || 'redeem-code',
    now,
    now
  ]);
  saveDb();
  return getNoticeById(id);
}

export async function updateNotice(id: string, updates: Partial<{
  enabled: boolean;
  title: string;
  message: string;
  imageUrl: string | null;
  buttonEnabled: boolean;
  buttonText: string | null;
  buttonUrl: string | null;
  displayFrequency: string;
  startAt: string | null;
  endAt: string | null;
  priority: number;
}>) {
  const db = await getDb();
  const existing = await getNoticeById(id);
  if (!existing) {
    throw new Error(`Notice ${id} not found`);
  }
  const now = new Date().toISOString();
  
  const enabled = updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : (existing.enabled ? 1 : 0);
  const title = updates.title !== undefined ? updates.title : existing.title;
  const message = updates.message !== undefined ? updates.message : existing.message;
  const imageUrl = updates.imageUrl !== undefined ? updates.imageUrl : existing.imageUrl;
  const buttonEnabled = updates.buttonEnabled !== undefined ? (updates.buttonEnabled ? 1 : 0) : (existing.buttonEnabled ? 1 : 0);
  const buttonText = updates.buttonText !== undefined ? updates.buttonText : existing.buttonText;
  const buttonUrl = updates.buttonUrl !== undefined ? updates.buttonUrl : existing.buttonUrl;
  const displayFrequency = updates.displayFrequency !== undefined ? updates.displayFrequency : existing.displayFrequency;
  const startAt = updates.startAt !== undefined ? updates.startAt : existing.startAt;
  const endAt = updates.endAt !== undefined ? updates.endAt : existing.endAt;
  const priority = updates.priority !== undefined ? Number(updates.priority) : existing.priority;

  db.run(`
    UPDATE notices SET
      enabled = ?, title = ?, message = ?, image_url = ?, button_enabled = ?, 
      button_text = ?, button_url = ?, display_frequency = ?, start_at = ?, 
      end_at = ?, priority = ?, updated_at = ?
    WHERE id = ?;
  `, [
    enabled, title, message, imageUrl, buttonEnabled, 
    buttonText, buttonUrl, displayFrequency, startAt, 
    endAt, priority, now, id
  ]);
  saveDb();
  return getNoticeById(id);
}

export async function deleteNotice(id: string) {
  const db = await getDb();
  db.run(`DELETE FROM notices WHERE id = ?;`, [id]);
  saveDb();
  return { success: true };
}


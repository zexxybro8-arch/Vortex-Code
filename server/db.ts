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

// Write-Through sync helpers to update cloud Firestore backing state in real-time
async function syncToFirestore(collectionName: string, id: string, record: any) {
  try {
    const { syncRecordToFirestore } = await import('./firestore');
    await syncRecordToFirestore(collectionName, id, record);
  } catch (err) {
    console.error(`Failed to sync to Firestore for ${collectionName}:`, err);
  }
}

async function deleteFromFirestore(collectionName: string, id: string) {
  try {
    const { deleteRecordFromFirestore } = await import('./firestore');
    await deleteRecordFromFirestore(collectionName, id);
  } catch (err) {
    console.error(`Failed to delete from Firestore for ${collectionName}:`, err);
  }
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
    // Ignore error if column already exists
  }

  // Initialize store settings with default values if not present
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('storeName', 'VORTEX CODE');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('subtitle', 'SECURE DIGITAL STORE');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('supportEmail', 'support@vortexcode.com');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('currencySymbol', '₹');`);
  dbInstance.run(`INSERT OR IGNORE INTO store_settings (key, value) VALUES ('enableAutoFulfillment', 'true');`);

  // Attempt to restore SQLite state from Firestore cloud backups first (cloud write-through survival)
  try {
    const { restoreDbFromFirestore } = await import('./firestore');
    const restored = await restoreDbFromFirestore(dbInstance);
    if (restored) {
      console.log('✅ SQLite successfully restored/synced from Cloud Firestore.');
    } else {
      console.log('Firestore backup was empty or could not be loaded. Relying on local/fallback data.');
    }
  } catch (err) {
    console.error('Failed to restore from Firestore at startup:', err);
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

export async function getAllProducts() {
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
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    // Calculate stockStatus directly from database UNUSED count
    obj.enabled = Boolean(obj.enabled);
    obj.stock = Number(obj.stock);
    obj.soldCount = Number(obj.soldCount);
    obj.totalCodes = Number(obj.totalCodes);
    obj.stockStatus = !obj.enabled
      ? 'DISABLED'
      : obj.stock > 0
      ? 'AVAILABLE'
      : 'OUT OF STOCK';
    return obj;
  });
}

export async function getProductById(id: string) {
  const products = await getAllProducts();
  return products.find((p: any) => p.id === id) || null;
}

export async function createProduct(data: {
  name: string;
  category: string;
  description: string;
  price: number;
  rewardValue: number;
  denomination: string;
  image?: string;
}) {
  const db = await getDb();
  const id = `prod_${Math.round(data.price)}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const image = data.image || 'https://i.ibb.co/s9Gk3DMm/IMG-20261007-001618-366.png';

  db.run(
    `INSERT INTO products (id, name, category, description, price, reward_value, denomination, enabled, image, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?);`,
    [id, data.name, data.category, data.description, Number(data.price), Number(data.rewardValue), data.denomination, image, now, now]
  );
  saveDb();

  const created = await getProductById(id);
  if (created) {
    await syncToFirestore('vortex_products', id, {
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
      updated_at: now,
    });
  }

  return created;
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
  }>
) {
  const db = await getDb();
  const existing = await getProductById(id);
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
  const enabled = data.enabled !== undefined ? (data.enabled ? 1 : 0) : (existing.enabled ? 1 : 0);
  const image = data.image !== undefined ? data.image : existing.image;

  db.run(
    `UPDATE products 
     SET name = ?, category = ?, description = ?, price = ?, reward_value = ?, denomination = ?, enabled = ?, image = ?, updated_at = ?
     WHERE id = ?;`,
    [name, category, description, price, reward_value, denomination, enabled, image, now, id]
  );
  saveDb();
  return getProductById(id);
}

export async function deleteOrDisableProduct(id: string) {
  const db = await getDb();
  const now = new Date().toISOString();
  db.run(`UPDATE products SET enabled = 0, updated_at = ? WHERE id = ?;`, [now, id]);
  saveDb();
  return { success: true, message: `Product ${id} disabled successfully` };
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
      error: `Redeem code must contain exactly 16 characters (got ${normalized.length} characters: "${normalized}"). Example format: CSGY AGTS **** ****`,
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
  if (status) {
    sql += ` AND r.status = ?`;
    params.push(status);
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
    return obj;
  });
}

export async function addRedeemCode(data: {
  productId: string;
  code: string;
  pin?: string;
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
  const pin = data.pin?.trim() || Math.floor(1000 + Math.random() * 9000).toString();

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
    status: 'UNUSED',
    createdAt: now,
  };
}

export async function addBulkRedeemCodes(data: {
  productId: string;
  codesText: string;
}) {
  const db = await getDb();
  const prod = await getProductById(data.productId);
  if (!prod) throw new Error(`Product ${data.productId} does not exist`);

  // Split lines or commas
  const lines = data.codesText
    .split(/[\r\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error('No valid codes found in input');
  }

  // Pre-validate every code before inserting to enforce strict 16-character format
  const parsedCodes: { code: string; pin: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    let codePart = raw;
    let pinPart = Math.floor(1000 + Math.random() * 9000).toString();
    if (raw.includes(':')) {
      const parts = raw.split(':');
      codePart = parts[0].trim();
      pinPart = parts[1].trim() || pinPart;
    }

    const validation = validateCode(codePart);
    if (!validation.valid) {
      throw new Error(`Line ${i + 1} ("${raw}"): ${validation.error}`);
    }
    parsedCodes.push({ code: validation.normalized, pin: pinPart });
  }

  const now = new Date().toISOString();
  let addedCount = 0;
  const addedIds: string[] = [];

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

export async function deleteRedeemCode(id: string, force?: boolean) {
  const db = await getDb();
  const cleanId = id.trim();
  const check = db.exec(`SELECT id, status, product_id, code FROM redeem_codes WHERE id = ?;`, [cleanId]);
  if (check.length === 0 || check[0].values.length === 0) {
    throw new Error(`Redeem code with ID "${cleanId}" not found in database.`);
  }
  const row = check[0].values[0];
  const status = row[1] as string;
  const productId = row[2] as string;
  const code = row[3] as string;

  if (status === 'SOLD' && !force) {
    throw new Error('This code is already SOLD and linked to a completed customer order. Explicit confirmation is required to delete.');
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

export async function getOrderByIdOrNumber(identifier: string) {
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

  if (!product.enabled) {
    throw new Error('This product is currently disabled and cannot be purchased.');
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
    `INSERT INTO orders (id, order_number, product_id, product_name, customer_name, customer_email, amount, payment_status, delivery_status, delivered_code_id, delivered_code, delivered_pin, payment_method, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'PAID', 'DELIVERED', ?, ?, ?, ?, ?, ?);`,
    [
      orderId,
      orderNumber,
      product.id,
      product.name,
      params.customerName || 'Customer',
      params.customerEmail || 'customer@example.com',
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
  const db = await getDb();
  const product = await getProductById(params.productId);
  if (!product) {
    throw new Error('Product not found in database.');
  }

  if (!product.enabled) {
    throw new Error('This product is currently disabled and unavailable for checkout.');
  }

  // Stock verification: count available UNUSED codes
  let availableCodeId: string | null = null;
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

  const now = new Date().toISOString();
  const orderId = `ord_${Math.random().toString(36).substring(2, 9)}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `VRX-2026-${randomSuffix}`;

  // Amount MUST come strictly from product.price in DB
  const verifiedAmount = product.price;

  // Insert PENDING order record (No code delivered yet!)
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 'PENDING', NULL, NULL, NULL, 'Payment Gateway', ?, ?);`,
    [
      orderId,
      orderNumber,
      product.id,
      product.name,
      params.customerName || 'Customer',
      params.customerEmail || 'customer@vortexcode.com',
      verifiedAmount,
      now,
      now,
    ]
  );

  saveDb();

  // Initialize Payment Gateway Intent
  const gatewayOrder = await paymentGateway.createGatewayOrder({
    orderId,
    orderNumber,
    amount: verifiedAmount,
    currency: 'INR',
    productId: product.id,
    productName: product.name,
    customerName: params.customerName || 'Customer',
    customerEmail: params.customerEmail || 'customer@vortexcode.com',
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
      currency: 'INR',
      paymentStatus: 'PENDING',
      deliveryStatus: 'PENDING',
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      createdAt: now,
    },
    gatewayOrder,
    gatewayConfig,
  };
}

/**
 * Server-Side Payment Verification & Atomic Code Delivery
 * 
 * Strict verification flow:
 * 1. Idempotency Check: Prevents duplicate fulfillment
 * 2. Authenticity & Signature check
 * 3. Atomic UNUSED code selection & status update to SOLD
 * 4. Update order to PAID + DELIVERED
 */
export async function verifyAndFulfillPaymentOrder(params: {
  orderId: string;
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
  gatewaySignature?: string;
  isSimulatedVerification?: boolean;
}) {
  const db = await getDb();
  const order = await getOrderByIdOrNumber(params.orderId);
  if (!order) {
    throw new Error('Order not found in database.');
  }

  // Idempotency check: If already paid, return existing delivered code
  if (order.paymentStatus === 'PAID' && order.deliveredCode) {
    return {
      success: true,
      alreadyFulfilled: true,
      order,
      message: 'Order was already verified and delivered.',
    };
  }

  // Signature / Authenticity Verification
  const gatewayConfig = paymentGateway.getConfig();
  if (gatewayConfig.isConfigured) {
    const verifyResult = await paymentGateway.checkPaymentStatus(order.id);

    if (!verifyResult.isValid) {
      throw new Error(`Payment verification failed: ${verifyResult.error || 'Payment not completed or failed.'}`);
    }
  } else if (!params.isSimulatedVerification) {
    throw new Error('Payment Gateway not configured. Live transactions require configured gateway credentials.');
  }

  // Atomically select ONE UNUSED code for this product from DB
  const codeRes = db.exec(
    `SELECT id, code, pin FROM redeem_codes 
     WHERE product_id = ? AND status = 'UNUSED' 
     LIMIT 1;`,
    [order.productId]
  );

  const now = new Date().toISOString();

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
      params.gatewayPaymentId ? `Gateway (${params.gatewayPaymentId})` : 'Payment Gateway (Verified)',
      now,
      order.id,
    ]
  );

  saveDb();

  const fulfilledOrder = await getOrderByIdOrNumber(order.id);

  return {
    success: true,
    order: fulfilledOrder,
    message: 'Payment verified successfully and redeem code delivered.',
  };
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
}) {
  const db = await getDb();
  const id = `usr_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();
  const role = params.role || 'CUSTOMER';
  const balance = params.balance !== undefined ? params.balance : 1500.0;

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
      balance,
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
    balance,
  };
}

export async function getStoreSettings() {
  const db = await getDb();
  const res = db.exec(`SELECT key, value FROM store_settings;`);
  const settings: Record<string, any> = {
    storeName: 'VORTEX CODE',
    subtitle: 'SECURE DIGITAL STORE',
    supportEmail: 'support@vortexcode.com',
    currencySymbol: '₹',
    enableAutoFulfillment: true,
  };

  if (res.length > 0 && res[0].values.length > 0) {
    res[0].values.forEach((row) => {
      const key = row[0] as string;
      const val = row[1] as string;
      if (key === 'enableAutoFulfillment') {
        settings[key] = val === 'true';
      } else {
        settings[key] = val;
      }
    });
  }

  return settings;
}

export async function updateStoreSettings(updates: Record<string, any>) {
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


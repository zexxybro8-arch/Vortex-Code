import { Firestore } from '@google-cloud/firestore';
import fs from 'fs';
import path from 'path';

let firestoreInstance: Firestore | null = null;

export function getFirestore(): Firestore {
  if (firestoreInstance) return firestoreInstance;

  let projectId = 'gen-lang-client-0062305766';
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.projectId) {
        projectId = config.projectId;
      }
    }
  } catch (err) {
    console.error('Error reading firebase config, using fallback projectId:', err);
  }

  const options: any = { projectId };
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccountEnv) {
    try {
      options.credentials = JSON.parse(serviceAccountEnv);
      console.log('Using service account credentials from FIREBASE_SERVICE_ACCOUNT env var.');
    } catch (err) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', err);
    }
  }

  firestoreInstance = new Firestore(options);

  console.log(`Firestore client initialized successfully for project: ${projectId}`);
  return firestoreInstance;
}

/**
 * Server Startup Sync: Download entire application state from Firestore
 * and populate SQL.js relational database. Survives Cloud Run ephemeral container restarts!
 */
export async function restoreDbFromFirestore(db: any): Promise<boolean> {
  try {
    const fsClient = getFirestore();

    // 1. Fetch products
    console.log('Restoring products from Firestore...');
    const prodSnap = await fsClient.collection('vortex_products').get();
    
    // If no products exist in Firestore, database is unseeded
    if (prodSnap.empty) {
      console.log('Firestore is empty. Relational database needs initial seed data.');
      return false;
    }

    // Populate products
    prodSnap.forEach((doc) => {
      const p = doc.data();
      db.run(
        `INSERT OR REPLACE INTO products (id, name, category, description, price, reward_value, denomination, enabled, image, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [p.id, p.name, p.category, p.description, p.price, p.reward_value, p.denomination, p.enabled, p.image, p.created_at, p.updated_at]
      );
    });

    // 2. Fetch redeem codes
    console.log('Restoring redeem codes from Firestore...');
    const codesSnap = await fsClient.collection('vortex_redeem_codes').get();
    codesSnap.forEach((doc) => {
      const c = doc.data();
      db.run(
        `INSERT OR REPLACE INTO redeem_codes (id, product_id, code, pin, status, order_id, created_at, used_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [c.id, c.product_id, c.code, c.pin, c.status, c.order_id, c.created_at, c.used_at]
      );
    });

    // 3. Fetch orders
    console.log('Restoring orders from Firestore...');
    const ordersSnap = await fsClient.collection('vortex_orders').get();
    ordersSnap.forEach((doc) => {
      const o = doc.data();
      db.run(
        `INSERT OR REPLACE INTO orders (id, order_number, product_id, product_name, customer_name, customer_email, amount, payment_status, delivery_status, delivered_code_id, delivered_code, delivered_pin, payment_method, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [o.id, o.order_number, o.product_id, o.product_name, o.customer_name, o.customer_email, o.amount, o.payment_status, o.delivery_status, o.delivered_code_id, o.delivered_code, o.delivered_pin, o.payment_method, o.created_at, o.updated_at]
      );
    });

    // 4. Fetch users
    console.log('Restoring users from Firestore...');
    const usersSnap = await fsClient.collection('vortex_users').get();
    usersSnap.forEach((doc) => {
      const u = doc.data();
      db.run(
        `INSERT OR REPLACE INTO users (id, fullName, email, username, password, googleSub, role, createdAt, balance)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [u.id, u.fullName, u.email, u.username, u.password, u.googleSub, u.role, u.createdAt, u.balance !== undefined ? u.balance : 1500.0]
      );
    });

    // 5. Fetch store settings
    console.log('Restoring store settings from Firestore...');
    const settingsSnap = await fsClient.collection('vortex_settings').get();
    settingsSnap.forEach((doc) => {
      const s = doc.data();
      db.run(
        `INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?);`,
        [s.key, s.value]
      );
    });

    console.log('✅ SQLite relational database restored successfully from production Cloud Firestore!');
    return true;
  } catch (err) {
    console.error('Failed to restore SQLite from Firestore:', err);
    return false;
  }
}

/**
 * Synchronize single document mutations to Firestore (Write-Through cache strategy)
 */
export async function syncRecordToFirestore(collectionName: string, docId: string, data: any) {
  try {
    const fsClient = getFirestore();
    const cleanData = JSON.parse(JSON.stringify(data)); // strip undefined fields
    await fsClient.collection(collectionName).doc(docId).set(cleanData, { merge: true });
  } catch (err) {
    console.error(`Failed to sync to Firestore for collection ${collectionName}, ID ${docId}:`, err);
  }
}

/**
 * Synchronize document deletions to Firestore
 */
export async function deleteRecordFromFirestore(collectionName: string, docId: string) {
  try {
    const fsClient = getFirestore();
    await fsClient.collection(collectionName).doc(docId).delete();
  } catch (err) {
    console.error(`Failed to delete from Firestore for collection ${collectionName}, ID ${docId}:`, err);
  }
}

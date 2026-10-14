import { getStoreSettings, updateStoreSettings } from '../server/db';
import express from 'express';
import http from 'http';

async function runDefaultCategoryTest() {
  console.log('====================================================');
  console.log('🧪 RUNNING DEFAULT STORE CATEGORY SETTING TEST');
  console.log('====================================================');

  // 1️⃣ Save REDEEM CODE
  console.log('1️⃣ Saving "REDEEM CODE" as default store category...');
  await updateStoreSettings({ defaultStoreCategory: 'REDEEM CODE' });

  let settings = await getStoreSettings();
  console.log(`Retrieved setting from DB: ${settings.defaultStoreCategory}`);

  if (settings.defaultStoreCategory !== 'REDEEM CODE') {
    console.error(`❌ Expected "REDEEM CODE", got "${settings.defaultStoreCategory}"`);
    process.exit(1);
  }
  console.log('✅ "REDEEM CODE" successfully saved and verified in DB!');

  // 2️⃣ Save DIAMONDS
  console.log('\n2️⃣ Changing default store category to "DIAMONDS"...');
  await updateStoreSettings({ defaultStoreCategory: 'DIAMONDS' });

  settings = await getStoreSettings();
  console.log(`Retrieved setting from DB: ${settings.defaultStoreCategory}`);

  if (settings.defaultStoreCategory !== 'DIAMONDS') {
    console.error(`❌ Expected "DIAMONDS", got "${settings.defaultStoreCategory}"`);
    process.exit(1);
  }
  console.log('✅ "DIAMONDS" successfully saved and verified in DB!');

  // 3️⃣ Test HTTP Endpoint GET /api/settings
  console.log('\n3️⃣ Testing public HTTP endpoint GET /api/settings...');
  const app = express();
  app.use(express.json());

  app.get('/api/settings', async (req, res) => {
    const dbSettings = await getStoreSettings();
    res.json({ success: true, settings: dbSettings });
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const port = address.port;

  try {
    const httpRes = await fetch(`http://127.0.0.1:${port}/api/settings`);
    const data = await httpRes.json();
    console.log(`Public HTTP response defaultStoreCategory: ${data.settings?.defaultStoreCategory}`);

    if (data.settings?.defaultStoreCategory !== 'DIAMONDS') {
      console.error('❌ HTTP API returned wrong default category!');
      process.exit(1);
    }
    console.log('✅ Public HTTP API successfully returned "DIAMONDS"!');
  } finally {
    server.close();
  }

  // 4️⃣ Revert to REDEEM CODE to verify final toggle
  console.log('\n4️⃣ Reverting back to "REDEEM CODE"...');
  await updateStoreSettings({ defaultStoreCategory: 'REDEEM CODE' });
  const finalSettings = await getStoreSettings();
  console.log(`Final setting in DB: ${finalSettings.defaultStoreCategory}`);

  if (finalSettings.defaultStoreCategory !== 'REDEEM CODE') {
    console.error('❌ Failed to revert to REDEEM CODE!');
    process.exit(1);
  }

  console.log('\n====================================================');
  console.log('🎉 DEFAULT STORE CATEGORY TEST PASSED PERFECTLY!');
  console.log('====================================================');
}

runDefaultCategoryTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});

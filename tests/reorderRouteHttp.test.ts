import { getAllProducts, createProduct } from '../server/db';
import express from 'express';
import http from 'http';

async function testReorderRoute() {
  console.log('====================================================');
  console.log('🧪 TESTING EXPRESS ROUTE MATCHING FOR /api/products/reorder');
  console.log('====================================================');

  // 1. Create two test products with full fields
  const p1 = await createProduct({
    name: 'Prod Route A',
    price: 10,
    rewardValue: 100,
    denomination: '100 Diamonds',
    description: 'Test A',
    category: 'DIAMONDS',
    cardBadgeText: 'DIAMONDS',
  });
  const p2 = await createProduct({
    name: 'Prod Route B',
    price: 20,
    rewardValue: 200,
    denomination: '200 Diamonds',
    description: 'Test B',
    category: 'DIAMONDS',
    cardBadgeText: 'DIAMONDS',
  });

  if (!p1 || !p2) {
    throw new Error('Failed to create test products');
  }

  console.log('Product 1 ID:', p1.id);
  console.log('Product 2 ID:', p2.id);

  // Import routes dynamically to test express routing
  const routesModule = await import('../server/routes');
  const app = express();
  app.use(express.json());
  app.use('/api', routesModule.default);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const port = address.port;

  console.log(`Test server running on port ${port}...`);

  // Send PUT request to /api/products/reorder
  const payload = JSON.stringify({
    items: [
      { id: p2.id, sortOrder: 1 },
      { id: p1.id, sortOrder: 2 },
    ],
  });

  const response = await new Promise<{ statusCode: number; body: any }>((resolve, reject) => {
    const req = http.request(
      `http://127.0.0.1:${port}/api/products/reorder`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': 'SAGAR551',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode || 200, body: JSON.parse(data) });
          } catch (e) {
            resolve({ statusCode: res.statusCode || 200, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  server.close();

  console.log('HTTP Response Status:', response.statusCode);
  console.log('HTTP Response Body:', response.body);

  if (response.statusCode !== 200 || !response.body.success) {
    throw new Error(`FAILED: Endpoint returned ${response.statusCode} - ${JSON.stringify(response.body)}`);
  }

  // Verify in database that p2 has sortOrder 1 and p1 has sortOrder 2
  const allProds = await getAllProducts(true);
  const updatedP1 = allProds.find((p) => p.id === p1.id);
  const updatedP2 = allProds.find((p) => p.id === p2.id);

  console.log(`Prod A (${p1.id}) sortOrder in DB:`, updatedP1?.sortOrder);
  console.log(`Prod B (${p2.id}) sortOrder in DB:`, updatedP2?.sortOrder);

  if (updatedP2?.sortOrder !== 1 || updatedP1?.sortOrder !== 2) {
    throw new Error('FAILED: Database sortOrder was not updated properly');
  }

  console.log('====================================================');
  console.log('🎉 REORDER ROUTE EXPRESS ROUTING TEST PASSED PERFECTLY!');
  console.log('====================================================');
}

testReorderRoute().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});

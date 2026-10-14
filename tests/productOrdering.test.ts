import { getAllProducts, createProduct, reorderProducts, getProductById } from '../server/db';

async function runTest() {
  console.log('====================================================');
  console.log('🧪 RUNNING PRODUCT CARD ORDERING & PREVIEW TESTS');
  console.log('====================================================');

  // 1. Create Product A and Product B with specific names and quantities
  console.log('1️⃣ Creating Product A and Product B...');
  const prodA = await createProduct({
    name: 'SPECIAL DIAMOND',
    category: 'DIAMONDS',
    description: 'Special 500 Diamonds pack',
    price: 10,
    rewardValue: 500,
    denomination: '500 Diamonds',
    cardBadgeText: 'DIAMONDS',
    sortOrder: 1,
  });

  const prodB = await createProduct({
    name: 'MEGA DIAMOND',
    category: 'DIAMONDS',
    description: 'Mega 1000 Diamonds pack',
    price: 20,
    rewardValue: 1000,
    denomination: '1000 Diamonds',
    cardBadgeText: 'DIAMONDS',
    sortOrder: 2,
  });

  console.log(`Created Prod A (ID: ${prodA.id}, Name: ${prodA.name}, Sort: ${prodA.sortOrder})`);
  console.log(`Created Prod B (ID: ${prodB.id}, Name: ${prodB.name}, Sort: ${prodB.sortOrder})`);

  // 2. Fetch products and verify default order (A before B)
  let allProds = await getAllProducts(true);
  let diamondProds = allProds.filter((p) => p.category === 'DIAMONDS');
  const indexA = diamondProds.findIndex((p) => p.id === prodA.id);
  const indexB = diamondProds.findIndex((p) => p.id === prodB.id);

  console.log(`Initial Order -> Prod A Index: ${indexA}, Prod B Index: ${indexB}`);
  if (indexA > indexB) {
    throw new Error('Initial sort order failed: Prod A should appear before Prod B');
  }

  // 3. Reorder products: Move Prod B to Position 1 (sortOrder 1) and Prod A to Position 2 (sortOrder 2)
  console.log('\n2️⃣ Reordering: Moving Prod B to Position 1 and Prod A to Position 2...');
  await reorderProducts([
    { id: prodB.id, sortOrder: 1 },
    { id: prodA.id, sortOrder: 2 },
  ]);

  // 4. Reload products from DB and verify Prod B comes before Prod A
  allProds = await getAllProducts(true);
  diamondProds = allProds.filter((p) => p.category === 'DIAMONDS');
  const newIndexA = diamondProds.findIndex((p) => p.id === prodA.id);
  const newIndexB = diamondProds.findIndex((p) => p.id === prodB.id);

  console.log(`New Order after reorder -> Prod B Index: ${newIndexB}, Prod A Index: ${newIndexA}`);
  if (newIndexB >= newIndexA) {
    throw new Error('Reordering failed: Prod B should appear before Prod A');
  }

  // 5. Verify product details & names are preserved without fallback to quantity
  const reloadedA = await getProductById(prodA.id);
  const reloadedB = await getProductById(prodB.id);

  console.log(`\n3️⃣ Verifying product fields:`);
  console.log(`Prod A Name: "${reloadedA.name}" (Expected: "SPECIAL DIAMOND")`);
  console.log(`Prod B Name: "${reloadedB.name}" (Expected: "MEGA DIAMOND")`);

  if (reloadedA.name !== 'SPECIAL DIAMOND') {
    throw new Error(`Product name mismatch for A: Expected "SPECIAL DIAMOND", got "${reloadedA.name}"`);
  }
  if (reloadedB.name !== 'MEGA DIAMOND') {
    throw new Error(`Product name mismatch for B: Expected "MEGA DIAMOND", got "${reloadedB.name}"`);
  }

  console.log('====================================================');
  console.log('✅ ALL PRODUCT CARD ORDERING & PREVIEW TESTS PASSED!');
  console.log('====================================================');
}

runTest().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});

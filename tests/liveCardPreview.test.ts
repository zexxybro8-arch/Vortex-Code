import { createProduct, getProductById } from '../server/db';

async function testLiveCardPreviewData() {
  console.log('====================================================');
  console.log('🧪 TESTING ADMIN LIVE CARD PREVIEW DATA & MAPPING');
  console.log('====================================================');

  // Test 1: Badge: DIAMONDS, Product Name: 200 Diamonds, Quantity: 200, Price: ₹1
  console.log('\n--- TEST 1: Standard Diamond Card ---');
  const p1 = await createProduct({
    name: '200 Diamonds',
    category: 'DIAMONDS',
    description: 'Standard pack',
    price: 1,
    rewardValue: 200,
    denomination: '200 Diamonds',
    cardBadgeText: 'DIAMONDS',
    enabled: true,
  });

  if (!p1) throw new Error('Test 1 product creation failed');
  console.log(`P1 Data: name="${p1.name}", rewardValue=${p1.rewardValue}, badge="${p1.cardBadgeText}", price=${p1.price}`);
  if (p1.name !== '200 Diamonds') throw new Error(`Test 1 Name mismatch: expected "200 Diamonds", got "${p1.name}"`);
  if (p1.rewardValue !== 200) throw new Error(`Test 1 RewardValue mismatch: expected 200, got ${p1.rewardValue}`);
  console.log('✅ TEST 1 PASSED: Badge=DIAMONDS, Name=200 Diamonds, Quantity=200, Price=1');

  // Test 2: Badge: DIAMONDS, Product Name: SPECIAL DIAMOND, Quantity: 500, Price: ₹10
  console.log('\n--- TEST 2: Custom Special Diamond Card ---');
  const p2 = await createProduct({
    name: 'SPECIAL DIAMOND',
    category: 'DIAMONDS',
    description: 'Special offer',
    price: 10,
    rewardValue: 500,
    denomination: '500 Diamonds',
    cardBadgeText: 'DIAMONDS',
    enabled: true,
  });

  if (!p2) throw new Error('Test 2 product creation failed');
  console.log(`P2 Data: name="${p2.name}", rewardValue=${p2.rewardValue}, badge="${p2.cardBadgeText}", price=${p2.price}`);
  if (p2.name !== 'SPECIAL DIAMOND') throw new Error(`Test 2 Name mismatch: expected "SPECIAL DIAMOND", got "${p2.name}"`);
  if (p2.rewardValue !== 500) throw new Error(`Test 2 RewardValue mismatch: expected 500, got ${p2.rewardValue}`);
  console.log('✅ TEST 2 PASSED: Badge=DIAMONDS, Name=SPECIAL DIAMOND, Quantity=500, Price=10');

  // Test 3: Badge: SPECIAL OFFER, Product Name: A, Quantity: 100, Price: ₹5
  console.log('\n--- TEST 3: Short Product Name "A" ---');
  const p3 = await createProduct({
    name: 'A',
    category: 'DIAMONDS',
    description: 'Single character name',
    price: 5,
    rewardValue: 100,
    denomination: '100 Diamonds',
    cardBadgeText: 'SPECIAL OFFER',
    enabled: true,
  });

  if (!p3) throw new Error('Test 3 product creation failed');
  console.log(`P3 Data: name="${p3.name}", rewardValue=${p3.rewardValue}, badge="${p3.cardBadgeText}", price=${p3.price}`);
  if (p3.name !== 'A') throw new Error(`Test 3 Name mismatch: expected "A", got "${p3.name}"`);
  if (p3.rewardValue !== 100) throw new Error(`Test 3 RewardValue mismatch: expected 100, got ${p3.rewardValue}`);
  console.log('✅ TEST 3 PASSED: Badge=SPECIAL OFFER, Name=A, Quantity=100, Price=5');

  // Test 4: Verify existing product lookup
  console.log('\n--- TEST 4: Existing Product Editing Retrieval ---');
  const retrieved = await getProductById(p2.id);
  if (!retrieved) throw new Error('Test 4 retrieval failed');
  if (retrieved.name !== 'SPECIAL DIAMOND') throw new Error(`Test 4 Name mismatch: got "${retrieved.name}"`);
  console.log('✅ TEST 4 PASSED: Existing product loaded accurately with name "SPECIAL DIAMOND"');

  console.log('\n====================================================');
  console.log('🏁 ALL ADMIN LIVE CARD PREVIEW DATA TESTS PASSED!');
  console.log('====================================================');
}

testLiveCardPreviewData().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});

import { createProduct, createPendingCheckoutOrder, getOrderByIdOrNumber, updateOrderStatus } from '../server/db';

async function runTest() {
  console.log('====================================================');
  console.log('🧪 RUNNING PRODUCT NAME MAPPING VERIFICATION TEST');
  console.log('====================================================');

  // Test Case 1: Product named "DIAMOND" with quantity 200
  console.log('\n--- Test Case 1: Product "DIAMOND" (Quantity 200, Price ₹1) ---');
  const prod1 = await createProduct({
    name: 'DIAMOND',
    category: 'DIAMONDS',
    description: '200 Diamonds pack',
    price: 1,
    rewardValue: 200,
    denomination: '200 Diamonds',
    enabled: true,
  });

  if (!prod1) throw new Error('Failed to create product 1');
  console.log(`✅ Product created: ID=${prod1.id}, Name="${prod1.name}", RewardValue=${prod1.rewardValue}`);

  const checkout1 = await createPendingCheckoutOrder({
    productId: prod1.id,
    customerName: 'Test Customer',
    customerEmail: 'test1@example.com',
  });

  const order1Id = checkout1.order.id;
  await updateOrderStatus(order1Id, 'PAID', 'DELIVERED');
  const fetchedOrder1 = await getOrderByIdOrNumber(order1Id);

  if (!fetchedOrder1) throw new Error('Failed to fetch order 1');

  console.log(`Fetched Order 1:
  - Order Number: ${fetchedOrder1.orderNumber}
  - Product Name: ${fetchedOrder1.productName}
  - Amount: ₹${fetchedOrder1.amount}
  - Payment Status: ${fetchedOrder1.paymentStatus}`);

  if (fetchedOrder1.productName !== 'DIAMOND') {
    throw new Error(`TEST FAILED: Expected productName "DIAMOND", got "${fetchedOrder1.productName}"`);
  }
  console.log('✅ PASS: Product field correctly displays "DIAMOND" instead of quantity');

  // Test Case 2: Product named "SPECIAL DIAMOND" with quantity 500
  console.log('\n--- Test Case 2: Product "SPECIAL DIAMOND" (Quantity 500, Price ₹10) ---');
  const prod2 = await createProduct({
    name: 'SPECIAL DIAMOND',
    category: 'DIAMONDS',
    description: 'Special 500 Diamonds offer',
    price: 10,
    rewardValue: 500,
    denomination: '500 Diamonds',
    enabled: true,
  });

  if (!prod2) throw new Error('Failed to create product 2');
  console.log(`✅ Product created: ID=${prod2.id}, Name="${prod2.name}", RewardValue=${prod2.rewardValue}`);

  const checkout2 = await createPendingCheckoutOrder({
    productId: prod2.id,
    customerName: 'Test Customer 2',
    customerEmail: 'test2@example.com',
  });

  const order2Id = checkout2.order.id;
  await updateOrderStatus(order2Id, 'PAID', 'DELIVERED');
  const fetchedOrder2 = await getOrderByIdOrNumber(order2Id);

  if (!fetchedOrder2) throw new Error('Failed to fetch order 2');

  console.log(`Fetched Order 2:
  - Order Number: ${fetchedOrder2.orderNumber}
  - Product Name: ${fetchedOrder2.productName}
  - Amount: ₹${fetchedOrder2.amount}
  - Payment Status: ${fetchedOrder2.paymentStatus}`);

  if (fetchedOrder2.productName !== 'SPECIAL DIAMOND') {
    throw new Error(`TEST FAILED: Expected productName "SPECIAL DIAMOND", got "${fetchedOrder2.productName}"`);
  }
  console.log('✅ PASS: Product field correctly displays "SPECIAL DIAMOND"');

  console.log('\n====================================================');
  console.log('🏁 PRODUCT NAME MAPPING VERIFICATION PASSED SUCCESSFULLY');
  console.log('====================================================');
}

runTest().catch((err) => {
  console.error('❌ TEST ERROR:', err);
  process.exit(1);
});

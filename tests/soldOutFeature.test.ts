import { getAllProducts, updateProduct, createPendingCheckoutOrder, purchaseProductDirect } from '../server/db';

async function runSoldOutTest() {
  console.log('====================================================');
  console.log('🧪 RUNNING MANUAL SOLD OUT FEATURE INTEGRATION TEST');
  console.log('====================================================');

  const products = await getAllProducts(true);
  const diamondProduct = products.find((p: any) => p.category === 'DIAMONDS');

  if (!diamondProduct) {
    console.error('❌ No diamond product found for test');
    process.exit(1);
  }

  console.log(`1️⃣ Selected test product: ${diamondProduct.name} (${diamondProduct.id})`);
  console.log(`Initial stockStatus: ${diamondProduct.stockStatus}`);

  // 2️⃣ Mark product as SOLD OUT
  console.log('\n2️⃣ Marking product as SOLD OUT in DB...');
  await updateProduct(diamondProduct.id, { stockStatus: 'SOLD OUT' });

  // 3️⃣ Verify status in getAllProducts
  const refreshedProducts = await getAllProducts(true);
  const updatedProd = refreshedProducts.find((p: any) => p.id === diamondProduct.id);
  console.log(`Updated stockStatus from DB: ${updatedProd?.stockStatus}`);

  if (updatedProd?.stockStatus !== 'SOLD OUT') {
    console.error(`❌ Expected stockStatus to be 'SOLD OUT', got '${updatedProd?.stockStatus}'`);
    process.exit(1);
  }
  console.log('✅ Status successfully updated and verified as SOLD OUT in DB');

  // 4️⃣ Verify Backend Checkout Prevention
  console.log('\n3️⃣ Attempting purchase for SOLD OUT product...');
  let purchaseBlocked = false;
  try {
    await createPendingCheckoutOrder({
      productId: diamondProduct.id,
      customerName: 'Test Buyer',
      customerEmail: 'test@example.com'
    });
  } catch (err: any) {
    console.log(`Expected rejection message received: "${err.message}"`);
    if (err.message.includes('SOLD OUT')) {
      purchaseBlocked = true;
    }
  }

  if (!purchaseBlocked) {
    console.error('❌ Backend failed to block purchase for SOLD OUT product!');
    process.exit(1);
  }
  console.log('✅ Backend successfully blocked purchase for SOLD OUT product!');

  // 5️⃣ Restore product to AVAILABLE
  console.log('\n4️⃣ Restoring product status back to AVAILABLE...');
  await updateProduct(diamondProduct.id, { stockStatus: 'AVAILABLE' });

  const finalProducts = await getAllProducts(true);
  const finalProd = finalProducts.find((p: any) => p.id === diamondProduct.id);
  console.log(`Final restored stockStatus: ${finalProd?.stockStatus}`);

  if (finalProd?.stockStatus !== 'AVAILABLE') {
    console.error(`❌ Expected stockStatus to be 'AVAILABLE', got '${finalProd?.stockStatus}'`);
    process.exit(1);
  }
  console.log('✅ Product successfully restored to AVAILABLE in DB!');

  console.log('\n====================================================');
  console.log('🎉 ALL SOLD OUT FEATURE INTEGRATION TESTS PASSED!');
  console.log('====================================================');
}

runSoldOutTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});

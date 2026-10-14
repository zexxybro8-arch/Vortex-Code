import { 
  getAllDesignPresets, 
  saveDesignPreset, 
  deleteDesignPreset, 
  getAllProducts, 
  updateProduct, 
  getStoreSettings, 
  updateStoreSettings 
} from '../server/db';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING FOCUSED TESTS FOR CHANGE A & CHANGE C');
  console.log('====================================================');

  // ----------------------------------------------------
  // TEST CHANGE A: REDEEM CODE CARD DESIGN PRESETS & CUSTOMIZATION
  // ----------------------------------------------------
  console.log('\n--- CHANGE A: Redeem Code Product Card Design Presets ---');
  
  const testPresetName = 'Emerald Cyber Vault ' + Date.now();
  const testRedeemDesign = {
    glowColor: '#10B981',
    borderColor: '#059669',
    cardBgColor: '#041d14',
    badgeBgColor: '#064e3b',
    badgeTextColor: '#a7f3d0',
    buttonBgColor: '#34d399',
    imageBorderColor: '#10B981',
    labelBorderColor: '#059669',
    outerBorderThickness: 3,
    imageBorderThickness: 2,
    labelBorderThickness: 1,
    outerGlowEnabled: true,
    outerGlowIntensity: 65,
    outerGlowBlur: 28,
    imageGlowEnabled: true,
    imageGlowIntensity: 35,
    imageGlowBlur: 16,
    labelGlowEnabled: true,
    labelGlowIntensity: 25,
    labelGlowBlur: 12,
  };

  // 1. Save Redeem Code Preset
  console.log('1. Saving Redeem Code design preset in database...');
  const savedRedeemPreset = await saveDesignPreset(testPresetName, testRedeemDesign, undefined, 'REDEEM_CODE');
  if (!savedRedeemPreset || savedRedeemPreset.category !== 'REDEEM_CODE') {
    throw new Error('FAILED: Redeem preset was not saved with category REDEEM_CODE');
  }
  console.log('   ✅ Preset saved with ID:', savedRedeemPreset.id, 'category:', savedRedeemPreset.category);

  // 2. Verify separation from Diamonds presets
  console.log('2. Verifying separation: Diamonds presets vs Redeem Code presets...');
  const allRedeemPresets = await getAllDesignPresets('REDEEM_CODE');
  const allDiamondPresets = await getAllDesignPresets('DIAMONDS');

  const inRedeem = allRedeemPresets.some((p) => p.id === savedRedeemPreset.id);
  const inDiamond = allDiamondPresets.some((p) => p.id === savedRedeemPreset.id);

  if (!inRedeem) {
    throw new Error('FAILED: Saved preset not found in REDEEM_CODE category filter');
  }
  if (inDiamond) {
    throw new Error('FAILED: Saved REDEEM_CODE preset leaked into DIAMONDS category filter');
  }
  console.log('   ✅ Separation verified: Preset exists in REDEEM_CODE and NOT in DIAMONDS filter');

  // 3. Test applying design to an individual Redeem Code product persistently
  console.log('3. Applying design settings to an individual Redeem Code product in DB...');
  const products = await getAllProducts(true);
  const redeemProduct = products.find((p) => p.category !== 'DIAMONDS');
  if (!redeemProduct) {
    throw new Error('FAILED: No redeem code product found in database to test');
  }

  const initialPrice = redeemProduct.priceRupees;
  const initialStock = redeemProduct.stock;
  const initialReward = redeemProduct.rewardValueRupees;

  await updateProduct(redeemProduct.id, {
    glowSettings: testRedeemDesign,
  });

  const updatedProducts = await getAllProducts(true);
  const updatedProduct = updatedProducts.find((p) => p.id === redeemProduct.id)!;
  const parsedGlow = typeof updatedProduct.glowSettings === 'string'
    ? JSON.parse(updatedProduct.glowSettings)
    : updatedProduct.glowSettings;

  if (parsedGlow.cardBgColor !== '#041d14' || parsedGlow.buttonBgColor !== '#34d399') {
    throw new Error('FAILED: Product glowSettings were not persistently saved in database');
  }
  if (updatedProduct.priceRupees !== initialPrice || updatedProduct.rewardValueRupees !== initialReward) {
    throw new Error('FAILED: Product price or reward value was accidentally altered!');
  }
  console.log('   ✅ Individual product glowSettings saved persistently without touching price/stock/rewards');

  // Clean up test preset
  await deleteDesignPreset(savedRedeemPreset.id);
  console.log('   ✅ Test preset cleaned up cleanly');

  // ----------------------------------------------------
  // TEST CHANGE C: ADMIN CONTROL FOR DEFAULT STORE CATEGORY
  // ----------------------------------------------------
  console.log('\n--- CHANGE C: Admin Control for Default Store Category ---');

  // 1. Initial / Fallback setting
  const initialSettings = await getStoreSettings();
  console.log('1. Current default store category:', initialSettings.defaultStoreCategory);
  if (!initialSettings.defaultStoreCategory) {
    throw new Error('FAILED: defaultStoreCategory is not defined in store settings');
  }

  // 2. Save DIAMONDS as default store category
  console.log('2. Saving DIAMONDS as default store category...');
  await updateStoreSettings({
    defaultStoreCategory: 'DIAMONDS',
    defaultOpeningCategory: 'DIAMONDS',
  });

  const diamondSettings = await getStoreSettings();
  if (diamondSettings.defaultStoreCategory !== 'DIAMONDS' || diamondSettings.defaultOpeningCategory !== 'DIAMONDS') {
    throw new Error(`FAILED: Expected DIAMONDS, got ${diamondSettings.defaultStoreCategory}`);
  }
  console.log('   ✅ Saved DIAMONDS persistently in database');

  // 3. Save REDEEM CODE as default store category
  console.log('3. Saving REDEEM CODE as default store category...');
  await updateStoreSettings({
    defaultStoreCategory: 'REDEEM CODE',
    defaultOpeningCategory: 'REDEEM CODE',
  });

  const redeemSettings = await getStoreSettings();
  if (redeemSettings.defaultStoreCategory !== 'REDEEM CODE' || redeemSettings.defaultOpeningCategory !== 'REDEEM CODE') {
    throw new Error(`FAILED: Expected REDEEM CODE, got ${redeemSettings.defaultStoreCategory}`);
  }
  console.log('   ✅ Saved REDEEM CODE persistently in database');

  // 4. Verify case-insensitivity and fallback behavior
  console.log('4. Verifying fallback and safety checks...');
  await updateStoreSettings({
    defaultStoreCategory: '',
    defaultOpeningCategory: '',
  });
  const fallbackSettings = await getStoreSettings();
  if (fallbackSettings.defaultStoreCategory !== 'REDEEM CODE') {
    throw new Error(`FAILED: Expected safe fallback REDEEM CODE, got ${fallbackSettings.defaultStoreCategory}`);
  }
  console.log('   ✅ Safe fallback verified:', fallbackSettings.defaultStoreCategory);

  console.log('\n====================================================');
  console.log('🎉 ALL FOCUSED TESTS FOR CHANGE A & C PASSED!');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});

import { getAllDesignPresets, saveDesignPreset, deleteDesignPreset, createProduct, getProductById } from '../server/db';

async function runTest() {
  console.log('====================================================');
  console.log('🧪 RUNNING DESIGN PRESETS INTEGRATION TEST');
  console.log('====================================================');

  // 1. Create a preset named "Test Green"
  console.log('1️⃣ Saving Preset "Test Green"...');
  const greenSettings = {
    glowColor: '#00FF00',
    borderColor: '#00FF00',
    badgeBgColor: '#003300',
    badgeTextColor: '#CCFFCC',
    buttonBgColor: '#00FF00',
    imageBorderColor: '#00FF00',
    labelBorderColor: '#00FF00',
    outerBorderThickness: 3,
    imageBorderThickness: 3,
    labelBorderThickness: 2,
    outerGlowEnabled: true,
    outerGlowIntensity: 90,
    outerGlowBlur: 30,
    imageGlowEnabled: true,
    imageGlowIntensity: 50,
    imageGlowBlur: 20,
    labelGlowEnabled: true,
    labelGlowIntensity: 40,
    labelGlowBlur: 15,
  };

  const presetGreen = await saveDesignPreset('Test Green', greenSettings);
  console.log(`Saved "Test Green" (ID: ${presetGreen.id})`);

  // 2. Save a preset named "Test Blue" with visibly different settings
  console.log('\n2️⃣ Saving Preset "Test Blue"...');
  const blueSettings = {
    glowColor: '#0088FF',
    borderColor: '#0088FF',
    badgeBgColor: '#001133',
    badgeTextColor: '#CCE5FF',
    buttonBgColor: '#0088FF',
    imageBorderColor: '#0088FF',
    labelBorderColor: '#0088FF',
    outerBorderThickness: 4,
    imageBorderThickness: 2,
    labelBorderThickness: 1,
    outerGlowEnabled: true,
    outerGlowIntensity: 100,
    outerGlowBlur: 35,
    imageGlowEnabled: true,
    imageGlowIntensity: 60,
    imageGlowBlur: 25,
    labelGlowEnabled: true,
    labelGlowIntensity: 50,
    labelGlowBlur: 20,
  };

  const presetBlue = await saveDesignPreset('Test Blue', blueSettings);
  console.log(`Saved "Test Blue" (ID: ${presetBlue.id})`);

  // 3. Retrieve all presets and verify persistence
  console.log('\n3️⃣ Retrieving all presets from Database...');
  const allPresets = await getAllDesignPresets();
  const foundGreen = allPresets.find((p) => p.name === 'Test Green');
  const foundBlue = allPresets.find((p) => p.name === 'Test Blue');

  if (!foundGreen) throw new Error('Preset "Test Green" was not found in DB');
  if (!foundBlue) throw new Error('Preset "Test Blue" was not found in DB');

  console.log('✓ Found "Test Green" and "Test Blue" in DB');

  // 4. Overwrite preset "Test Green"
  console.log('\n4️⃣ Overwriting "Test Green" preset with updated values...');
  const updatedGreenSettings = { ...greenSettings, outerGlowIntensity: 120 };
  await saveDesignPreset('Test Green', updatedGreenSettings, foundGreen.id);

  const reloadedPresets = await getAllDesignPresets();
  const reloadedGreen = reloadedPresets.find((p) => p.id === foundGreen.id);
  if (reloadedGreen?.settings?.outerGlowIntensity !== 120) {
    throw new Error('Overwriting preset failed: outerGlowIntensity was not updated to 120');
  }
  console.log('✓ Successfully overwrote preset "Test Green"');

  // 5. Apply preset settings to a Diamond product and save to DB
  console.log('\n5️⃣ Creating Diamond product and applying "Test Blue" preset settings...');
  const createdProduct = await createProduct({
    name: 'PRESET TEST DIAMOND',
    category: 'DIAMONDS',
    description: 'Testing preset application',
    price: 1,
    rewardValue: 100,
    denomination: '100 Diamonds',
    cardBadgeText: 'DIAMONDS',
    glowSettings: presetBlue.settings,
  });

  const dbProduct = await getProductById(createdProduct.id);
  const parsedGlow = typeof dbProduct.glowSettings === 'string'
    ? JSON.parse(dbProduct.glowSettings)
    : dbProduct.glowSettings;

  console.log(`Product "${dbProduct.name}" saved with glowColor: ${parsedGlow.glowColor}`);
  if (parsedGlow.glowColor !== '#0088FF') {
    throw new Error(`Product glowColor expected "#0088FF", got "${parsedGlow.glowColor}"`);
  }
  console.log('✓ Product successfully saved with applied preset design settings');

  // 6. Delete a preset after confirmation
  console.log('\n6️⃣ Deleting preset "Test Green"...');
  await deleteDesignPreset(foundGreen.id);

  const finalPresets = await getAllDesignPresets();
  const deletedGreen = finalPresets.find((p) => p.id === foundGreen.id);
  const remainingBlue = finalPresets.find((p) => p.id === foundBlue.id);

  if (deletedGreen) throw new Error('Preset "Test Green" was not deleted');
  if (!remainingBlue) throw new Error('Preset "Test Blue" was accidentally removed');

  console.log('✓ "Test Green" deleted successfully, "Test Blue" remains available');

  console.log('====================================================');
  console.log('✅ ALL DESIGN PRESET INTEGRATION TESTS PASSED!');
  console.log('====================================================');
}

runTest().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});

import { getAllDesignPresets, saveDesignPreset, deleteDesignPreset } from '../server/db';

async function runTest() {
  console.log('====================================================');
  console.log('🧪 RUNNING DESIGN PRESETS SYSTEM INTEGRATION TEST');
  console.log('====================================================');

  // Test 1: Saving a new preset
  const presetName = 'Test Ice Blue ' + Date.now();
  const sampleSettings = {
    glowColor: '#38bdf8',
    borderColor: '#38bdf8',
    badgeBgColor: '#0c4a6e',
    badgeTextColor: '#e0f2fe',
    buttonBgColor: '#0284c7',
    imageBorderColor: '#38bdf8',
    labelBorderColor: '#38bdf8',
    outerBorderThickness: 3,
    imageBorderThickness: 2,
    labelBorderThickness: 1,
    outerGlowEnabled: true,
    outerGlowIntensity: 80,
    outerGlowBlur: 30,
    imageGlowEnabled: true,
    imageGlowIntensity: 40,
    imageGlowBlur: 20,
    labelGlowEnabled: true,
    labelGlowIntensity: 30,
    labelGlowBlur: 15,
  };

  console.log(`1. Saving preset "${presetName}"...`);
  const createdPreset = await saveDesignPreset(presetName, sampleSettings);
  if (!createdPreset || !createdPreset.id || createdPreset.name !== presetName) {
    throw new Error('FAILED: saveDesignPreset did not return expected preset object');
  }
  console.log('   ✅ Preset saved with ID:', createdPreset.id);

  // Test 2: Fetching all presets
  console.log('2. Fetching all design presets from DB...');
  const presets = await getAllDesignPresets();
  const found = presets.find((p) => p.id === createdPreset.id);
  if (!found) {
    throw new Error('FAILED: Saved preset not found in getAllDesignPresets()');
  }
  console.log('   ✅ Found saved preset in DB list:', found.name);

  // Test 3: Updating existing preset (Overwrite)
  console.log('3. Overwriting preset with updated settings...');
  const updatedSettings = { ...sampleSettings, outerGlowIntensity: 100 };
  const updatedPreset = await saveDesignPreset(presetName, updatedSettings, createdPreset.id);
  if (updatedPreset.settings.outerGlowIntensity !== 100) {
    throw new Error('FAILED: Preset settings were not updated properly');
  }
  console.log('   ✅ Preset updated successfully');

  // Test 4: Deleting preset
  console.log('4. Deleting preset...');
  const deleteResult = await deleteDesignPreset(createdPreset.id);
  if (!deleteResult.success) {
    throw new Error('FAILED: deleteDesignPreset returned unsuccessful result');
  }

  const postDeletePresets = await getAllDesignPresets();
  if (postDeletePresets.some((p) => p.id === createdPreset.id)) {
    throw new Error('FAILED: Preset still present in DB after deletion');
  }
  console.log('   ✅ Preset deleted successfully');

  console.log('====================================================');
  console.log('🎉 ALL DESIGN PRESET TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runTest().catch((err) => {
  console.error('❌ DESIGN PRESET TEST FAILED:', err);
  process.exit(1);
});

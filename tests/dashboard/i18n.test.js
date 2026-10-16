// Tests for scripts/dashboard/modules/i18n.js
'use strict';

const assert = require('node:assert/strict');

async function runTestAsync(name, fn) {
  try {
    await fn();
    console.log(`  ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    return false;
  }
}

async function runAll() {
  const modUrl = new URL(
    '../../scripts/dashboard/modules/i18n.js',
    `file://${__filename}`
  ).href;

  let t, detectLanguage, SUPPORTED_LANGS;
  try {
    const mod = await import(`${modUrl}?t=${Date.now()}`);
    t = mod.t;
    detectLanguage = mod.detectLanguage;
    SUPPORTED_LANGS = mod.SUPPORTED_LANGS;
  } catch (err) {
    console.error(`FATAL: could not import i18n.js — ${err.message}`);
    process.exit(1);
  }

  console.log('\n=== Unit Tests: i18n.js ===\n');
  let passed = 0;
  let failed = 0;

  if (await runTestAsync('t(key, "en") returns English text', async () => {
    const result = t('welcome', 'en');
    assert.strictEqual(result, 'Welcome to the Agent Dashboard');
  })) passed++; else failed++;

  if (await runTestAsync('t(key, "es") returns Spanish text', async () => {
    const result = t('welcome', 'es');
    assert.strictEqual(result, 'Bienvenido al Panel de Agentes');
  })) passed++; else failed++;

  if (await runTestAsync('t("agents_tab", "es") falls back to English with console.warn', async () => {
    let warnCalled = false;
    const originalWarn = console.warn;
    console.warn = (...args) => { warnCalled = true; };
    try {
      const result = t('agents_tab', 'es');
      assert.strictEqual(result, 'Agents tab');
      assert.ok(warnCalled);
    } finally {
      console.warn = originalWarn;
    }
  })) passed++; else failed++;

  if (await runTestAsync('t("completely_unknown", "en") returns key itself', async () => {
    const result = t('completely_unknown', 'en');
    assert.strictEqual(result, 'completely_unknown');
  })) passed++; else failed++;

  if (await runTestAsync('detectLanguage() with navigator.language = "es-MX" returns "es"', async () => {
    const originalNavigator = global.navigator;
    try {
      global.navigator = { language: 'es-MX' };
      const result = detectLanguage();
      assert.strictEqual(result, 'es');
    } finally {
      global.navigator = originalNavigator;
    }
  })) passed++; else failed++;

  if (await runTestAsync('detectLanguage() with unsupported language returns "en"', async () => {
    const originalNavigator = global.navigator;
    try {
      global.navigator = { language: 'fr-FR' };
      const result = detectLanguage();
      assert.strictEqual(result, 'en');
    } finally {
      global.navigator = originalNavigator;
    }
  })) passed++; else failed++;

  if (await runTestAsync('SUPPORTED_LANGS.length === 12', async () => {
    assert.strictEqual(SUPPORTED_LANGS.length, 12);
  })) passed++; else failed++;

  if (await runTestAsync('SUPPORTED_LANGS contains expected codes', async () => {
    const expectedLangs = ['en', 'pt', 'zh', 'zht', 'ja', 'ko', 'tr', 'ru', 'vi', 'th', 'de', 'es'];
    assert.deepStrictEqual(SUPPORTED_LANGS, expectedLangs);
  })) passed++; else failed++;

  console.log(`\nUnit Tests — Passed: ${passed}, Failed: ${failed}`);

  // PBT
  console.log('\n=== PBT: i18n.js ===\n');
  let pbtPassed = 0;
  let pbtFailed = 0;

  if (await runTestAsync('// Feature: visual-agent-dashboard, Property 10', async () => {
    const ITERATIONS = 100;
    const rng = (function(seed) {
      let s = seed >>> 0 || 1;
      return function() {
        s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
        return (s >>> 0) / 0xffffffff;
      };
    })(0x7f3ea5c2);

    const i18nMod = require('../../scripts/dashboard/modules/i18n.js');
    const enKeys = Object.keys(i18nMod.EN_BUNDLE);
    const esKeys = Object.keys(i18nMod.ES_BUNDLE);
    const missingKeys = enKeys.filter(key => !esKeys.includes(key));

    for (let i = 0; i < ITERATIONS; i++) {
      const key = missingKeys[Math.floor(rng() * missingKeys.length)];
      let warnCalled = false;
      const originalWarn = console.warn;
      console.warn = (...args) => { warnCalled = true; };
      try {
        const result = t(key, 'es');
        assert.strictEqual(result, i18nMod.EN_BUNDLE[key]);
        assert.ok(warnCalled);
      } finally {
        console.warn = originalWarn;
      }
    }
  })) pbtPassed++; else pbtFailed++;

  console.log(`\nPBT Tests — Passed: ${pbtPassed}, Failed: ${pbtFailed}`);

  const totalPassed = passed + pbtPassed;
  const totalFailed = failed + pbtFailed;
  console.log(`\nTotal — Passed: ${totalPassed}, Failed: ${totalFailed}`);

  process.exit(totalFailed > 0 ? 1 : 0);
}

runAll().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
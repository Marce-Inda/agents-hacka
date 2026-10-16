// Tests for scripts/dashboard/modules/recommendations.js
// Task 4.1 — Unit tests (RED phase)
'use strict';

const assert = require('node:assert/strict');

// ─── runner helpers ───────────────────────────────────────────────────────────

async function runTestAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    return false;
  }
}

// ─── catalog helpers ──────────────────────────────────────────────────────────

function makeCatalog(agents = [], skills = [], commands = []) {
  return { agents, skills, commands };
}

function makeAgent({ id, name, description = '', keywords = [] } = {}) {
  return { id, name, description, keywords };
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Load the ES module via dynamic import
  const modUrl = new URL(
    '../../scripts/dashboard/modules/recommendations.js',
    `file://${__filename}`
  ).href;

  let recommend;
  try {
    const mod = await import(modUrl);
    recommend = mod.recommend;
  } catch (err) {
    console.error(`\nFATAL: could not import recommendations.js — ${err.message}`);
    process.exit(1);
  }

  console.log('\n=== Unit Tests: recommendations.js ===\n');

  let passed = 0;
  let failed = 0;

  // ── Test 1: query vacía (< 3 chars) devuelve array vacío ──────────────────
  if (await runTestAsync('query vacía (< 3 chars) devuelve array vacío', async () => {
    const catalog = makeCatalog([
      makeAgent({ id: 'a', name: 'alpha token', description: 'desc' }),
    ]);

    for (const q of ['', 'a', 'ab']) {
      const result = recommend(q, catalog);
      assert.ok(Array.isArray(result), `recommend("${q}") should return an array`);
      assert.strictEqual(result.length, 0,
        `recommend("${q}") should return empty array for query shorter than 3 chars, got ${result.length} items`);
    }
  })) passed++; else failed++;

  // ── Test 2: ponderación nombre(3x) supera descripción(1x) ─────────────────
  if (await runTestAsync('ponderación nombre(3x) supera descripción(1x) para el mismo token', async () => {
    const token = 'zxqtoken';
    const catalog = makeCatalog([
      // item A: token aparece SOLO en el nombre
      makeAgent({ id: 'a', name: `${token} here`, description: 'other words', keywords: [] }),
      // item B: token aparece SOLO en la descripción
      makeAgent({ id: 'b', name: 'different name', description: `${token} here`, keywords: [] }),
    ]);

    const results = recommend(token, catalog);

    assert.ok(results.length >= 2,
      `Expected at least 2 results for query "${token}", got ${results.length}`);

    const resultA = results.find(r => r.item.id === 'a');
    const resultB = results.find(r => r.item.id === 'b');

    assert.ok(resultA, 'Expected result for item A (token in name)');
    assert.ok(resultB, 'Expected result for item B (token in description)');
    assert.ok(
      resultA.score > resultB.score,
      `Expected score(A) > score(B): name weight(3x) > description weight(1x). ` +
      `Got score(A)=${resultA.score}, score(B)=${resultB.score}`
    );
  })) passed++; else failed++;

  // ── Test 3: ponderación keywords(2x) supera descripción(1x) ──────────────
  if (await runTestAsync('ponderación keywords(2x) supera descripción(1x) para el mismo token', async () => {
    const token = 'zyxkwtoken';
    const catalog = makeCatalog([
      // item C: token aparece SOLO en keywords
      makeAgent({ id: 'c', name: 'unrelated name', description: 'unrelated desc', keywords: [token] }),
      // item D: token aparece SOLO en la descripción
      makeAgent({ id: 'd', name: 'another name', description: `${token} here`, keywords: [] }),
    ]);

    const results = recommend(token, catalog);

    assert.ok(results.length >= 2,
      `Expected at least 2 results for query "${token}", got ${results.length}`);

    const resultC = results.find(r => r.item.id === 'c');
    const resultD = results.find(r => r.item.id === 'd');

    assert.ok(resultC, 'Expected result for item C (token in keywords)');
    assert.ok(resultD, 'Expected result for item D (token in description)');
    assert.ok(
      resultC.score > resultD.score,
      `Expected score(C) > score(D): keywords weight(2x) > description weight(1x). ` +
      `Got score(C)=${resultC.score}, score(D)=${resultD.score}`
    );
  })) passed++; else failed++;

  // ── Test 4: resultados ordenados de mayor a menor score ───────────────────
  if (await runTestAsync('resultados ordenados de mayor a menor score', async () => {
    const token = 'sorttoken';
    const catalog = makeCatalog([
      // score 1: token only in description
      makeAgent({ id: 'low',  name: 'unrelated',     description: `${token} here`, keywords: [] }),
      // score 3: token only in name
      makeAgent({ id: 'high', name: `${token} item`, description: 'unrelated',     keywords: [] }),
      // score 2: token only in keywords
      makeAgent({ id: 'mid',  name: 'other name',    description: 'other desc',    keywords: [token] }),
    ]);

    const results = recommend(token, catalog);

    assert.ok(results.length >= 2, `Expected at least 2 results, got ${results.length}`);

    for (let i = 0; i < results.length - 1; i++) {
      assert.ok(
        results[i].score >= results[i + 1].score,
        `Expected results[${i}].score (${results[i].score}) >= results[${i + 1}].score (${results[i + 1].score})`
      );
    }
  })) passed++; else failed++;

  // ── Test 5: máximo 10 resultados retornados ────────────────────────────────
  if (await runTestAsync('máximo 10 resultados aunque el catálogo tenga más ítems con score > 0', async () => {
    const token = 'maxtoken';
    // 15 agents all containing the token in their name
    const agents = Array.from({ length: 15 }, (_, i) =>
      makeAgent({ id: `agent-${i}`, name: `${token} item ${i}`, description: 'desc', keywords: [] })
    );
    const catalog = makeCatalog(agents);

    const results = recommend(token, catalog);

    assert.ok(Array.isArray(results), 'recommend should return an array');
    assert.ok(
      results.length <= 10,
      `Expected at most 10 results, got ${results.length}`
    );
    assert.strictEqual(results.length, 10,
      `Expected exactly 10 results (max cap) when 15 agents match, got ${results.length}`
    );
  })) passed++; else failed++;

  // ── Test 6: normalización de mayúsculas y tildes ──────────────────────────
  if (await runTestAsync('normalización: query "código" encuentra ítem con "codigo" en nombre', async () => {
    const catalog = makeCatalog([
      makeAgent({ id: 'norm', name: 'analizador de codigo javascript', description: 'desc', keywords: [] }),
    ]);

    // Query con tilde debe encontrar ítem con palabra sin tilde
    const results = recommend('código', catalog);

    assert.ok(Array.isArray(results), 'recommend should return an array');
    assert.ok(
      results.length > 0,
      'Expected at least 1 result: query "código" should match item with "codigo" after diacritic normalization'
    );
    assert.strictEqual(
      results[0].item.id, 'norm',
      `Expected item "norm" to be returned, got "${results[0]?.item?.id}"`
    );
  })) passed++; else failed++;

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);

  process.exit(failed > 0 ? 1 : 0);
}

// ─── PBT helpers (task 4.2) ──────────────────────────────────────────────────

const { performance } = require('node:perf_hooks');

/**
 * Simple seeded pseudo-random number generator (xorshift32).
 * Returns values in [0, 1). Deterministic and reproducible.
 */
function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return function next() {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

/**
 * Generate a random query string: 3–200 chars mixing letters, digits,
 * special chars, Unicode, accented letters, and emojis.
 */
function generateRandomQuery(rng) {
  const ascii    = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
  const special  = '!@#$%^&*()_+-=[]{}|;\':",.<>?/\\`~';
  const accented = 'áéíóúàèìòùâêîôûäëïöüñçßåæøœ';
  const emojis   = ['😀', '🚀', '✅', '🔥', '💡', '🎯', '⚡', '🌟', '🤖', '🧠'];

  const minLen = 3;
  const maxLen = 200;
  const len = minLen + Math.floor(rng() * (maxLen - minLen + 1));

  let result = '';
  for (let i = 0; i < len; i++) {
    const pool = rng();
    if (pool < 0.60) {
      result += ascii[Math.floor(rng() * ascii.length)];
    } else if (pool < 0.75) {
      result += special[Math.floor(rng() * special.length)];
    } else if (pool < 0.90) {
      result += accented[Math.floor(rng() * accented.length)];
    } else {
      result += emojis[Math.floor(rng() * emojis.length)];
    }
  }
  return result;
}

/**
 * Generate a single random catalog item of a given type.
 */
function generateRandomItem(rng, id, type) {
  const words = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf',
                 'hotel', 'india', 'juliet', 'kilo', 'lima', 'mike', 'november',
                 'oscar', 'papa', 'quebec', 'romeo', 'sierra', 'tango'];
  const pick = () => words[Math.floor(rng() * words.length)];

  const numKw    = Math.floor(rng() * 4);
  const keywords = Array.from({ length: numKw }, () => pick());
  const base = {
    id: String(id),
    name: `${pick()} ${pick()}`,
    description: `${pick()} ${pick()} ${pick()}`,
    keywords,
  };

  if (type === 'skill')   return { ...base, category: pick() };
  if (type === 'command') return { ...base, group: pick() };
  return base; // agent
}

/**
 * Generate a random CatalogData with 0–maxItems items across agents/skills/commands.
 */
function generateRandomCatalog(rng, maxItems) {
  const cap   = maxItems === undefined ? 500 : maxItems;
  const total = Math.floor(rng() * (cap + 1));            // 0..cap
  const agentCount   = Math.floor(rng() * (total + 1));
  const skillCount   = Math.floor(rng() * (total - agentCount + 1));
  const commandCount = total - agentCount - skillCount;

  const agents   = Array.from({ length: agentCount },   (_, i) => generateRandomItem(rng, `a${i}`, 'agent'));
  const skills   = Array.from({ length: skillCount },   (_, i) => generateRandomItem(rng, `s${i}`, 'skill'));
  const commands = Array.from({ length: commandCount }, (_, i) => generateRandomItem(rng, `c${i}`, 'command'));

  return { agents, skills, commands };
}

// ─── PBT tests (task 4.2) ─────────────────────────────────────────────────────

async function mainPbt(recommend) {
  console.log('\n=== PBT: recommendations.js ===\n');

  let passed = 0;
  let failed = 0;

  // ──────────────────────────────────────────────────────────────────────────
  // Feature: visual-agent-dashboard, Property 2: Idempotencia del Motor de Recomendaciones
  //
  // Validates: Requirements 5.2, 9.3
  //
  // 100 iterations: random query (3–200 chars) + random catalog →
  //   JSON.stringify(recommend(q, c)) === JSON.stringify(recommend(q, c))
  // ──────────────────────────────────────────────────────────────────────────
  if (await runTestAsync(
    '// Feature: visual-agent-dashboard, Property 2: Idempotencia del Motor de Recomendaciones',
    async () => {
      const ITERATIONS = 100;
      const rng = makeRng(0xdeadbeef);

      for (let i = 0; i < ITERATIONS; i++) {
        const query   = generateRandomQuery(rng);
        const catalog = generateRandomCatalog(rng);

        const result1 = recommend(query, catalog);
        const result2 = recommend(query, catalog);

        const s1 = JSON.stringify(result1);
        const s2 = JSON.stringify(result2);

        if (s1 !== s2) {
          throw new Error(
            `Iteration ${i}: recommend is not idempotent.\n` +
            `  query (first 40 chars): ${JSON.stringify(query.slice(0, 40))}\n` +
            `  result1: ${s1.slice(0, 200)}\n` +
            `  result2: ${s2.slice(0, 200)}`
          );
        }
      }
    }
  )) passed++; else failed++;

  // ──────────────────────────────────────────────────────────────────────────
  // Feature: visual-agent-dashboard, Property 4: El Motor de Recomendaciones Nunca Lanza Excepciones
  //
  // Validates: Requirements 5.2, 5.9
  //
  // 100 iterations: queries with special chars, Unicode, accents, emojis;
  // catalogs of 0–500 items → never throws, always returns array in ≤50ms.
  // ──────────────────────────────────────────────────────────────────────────
  if (await runTestAsync(
    '// Feature: visual-agent-dashboard, Property 4: El Motor de Recomendaciones Nunca Lanza Excepciones',
    async () => {
      const ITERATIONS = 100;
      const rng = makeRng(0xcafebabe);

      for (let i = 0; i < ITERATIONS; i++) {
        const query   = generateRandomQuery(rng);
        const catalog = generateRandomCatalog(rng, 500);

        let result;
        const start = performance.now();
        try {
          result = recommend(query, catalog);
        } catch (err) {
          throw new Error(
            `Iteration ${i}: recommend threw an exception.\n` +
            `  query (first 40 chars): ${JSON.stringify(query.slice(0, 40))}\n` +
            `  catalog size: agents=${catalog.agents.length}, skills=${catalog.skills.length}, commands=${catalog.commands.length}\n` +
            `  error: ${err.message}`
          );
        }
        const elapsed = performance.now() - start;

        if (!Array.isArray(result)) {
          throw new Error(
            `Iteration ${i}: recommend did not return an array (got ${typeof result}).\n` +
            `  query (first 40 chars): ${JSON.stringify(query.slice(0, 40))}`
          );
        }

        if (elapsed > 50) {
          throw new Error(
            `Iteration ${i}: recommend took ${elapsed.toFixed(2)}ms, expected ≤50ms.\n` +
            `  catalog size: ${catalog.agents.length + catalog.skills.length + catalog.commands.length} items`
          );
        }
      }
    }
  )) passed++; else failed++;

  // ──────────────────────────────────────────────────────────────────────────
  // Feature: visual-agent-dashboard, Property 5: Resultados Ordenados por Score Descendente
  //
  // Validates: Requirement 5.3
  //
  // 100 iterations: for any result with ≥2 items, verify
  //   results[i].score >= results[i+1].score for all valid i.
  // ──────────────────────────────────────────────────────────────────────────
  if (await runTestAsync(
    '// Feature: visual-agent-dashboard, Property 5: Resultados Ordenados por Score Descendente',
    async () => {
      const ITERATIONS = 100;
      const rng = makeRng(0xbabef00d);

      for (let i = 0; i < ITERATIONS; i++) {
        const query   = generateRandomQuery(rng);
        const catalog = generateRandomCatalog(rng, 100);

        const results = recommend(query, catalog);

        if (!Array.isArray(results)) {
          throw new Error(`Iteration ${i}: recommend did not return an array`);
        }

        if (results.length < 2) continue; // vacuously satisfied

        for (let j = 0; j < results.length - 1; j++) {
          if (results[j].score < results[j + 1].score) {
            throw new Error(
              `Iteration ${i}: results not sorted by score desc at index ${j}.\n` +
              `  results[${j}].score=${results[j].score}, results[${j + 1}].score=${results[j + 1].score}\n` +
              `  query (first 40 chars): ${JSON.stringify(query.slice(0, 40))}`
            );
          }
        }
      }
    }
  )) passed++; else failed++;

  // ──────────────────────────────────────────────────────────────────────────
  // Feature: visual-agent-dashboard, Property 11: Ponderación de Scoring — Nombre > Keywords > Descripción
  //
  // Validates: Requirements 5.8, 9.2
  //
  // 100 iterations:
  //   - Unique token T in name of item A  vs T only in description of item B  → score(A) > score(B)
  //   - Unique token T in keywords of item A vs T only in description of item B → score(A) > score(B)
  // ──────────────────────────────────────────────────────────────────────────
  if (await runTestAsync(
    '// Feature: visual-agent-dashboard, Property 11: Ponderación de Scoring — Nombre > Keywords > Descripción',
    async () => {
      const ITERATIONS = 100;

      for (let i = 0; i < ITERATIONS; i++) {
        // Index-based token guaranteed unique across all catalog items
        const token = `zzuniqtok${i}zzz`;

        // ── Part A: name weight (3×) vs description weight (1×) ─────────
        const itemNameOnly = {
          id: 'name-only',
          name: `item with ${token} here`,
          description: 'completely unrelated words about other things',
          keywords: [],
        };
        const itemDescOnly = {
          id: 'desc-only',
          name: 'completely unrelated name abc',
          description: `item with ${token} here`,
          keywords: [],
        };
        const catalogA = { agents: [itemNameOnly, itemDescOnly], skills: [], commands: [] };
        const resultsA = recommend(token, catalogA);

        const rA_name = resultsA.find(r => r.item.id === 'name-only');
        const rA_desc = resultsA.find(r => r.item.id === 'desc-only');

        if (!rA_name || !rA_desc) {
          throw new Error(
            `Iteration ${i} (name vs desc): expected both items in results.\n` +
            `  got ids: [${resultsA.map(r => r.item.id).join(', ')}]\n` +
            `  token: ${token}`
          );
        }
        if (rA_name.score <= rA_desc.score) {
          throw new Error(
            `Iteration ${i} (name vs desc): expected score(name-only) > score(desc-only).\n` +
            `  score(name-only)=${rA_name.score}, score(desc-only)=${rA_desc.score}\n` +
            `  token: ${token}`
          );
        }

        // ── Part B: keywords weight (2×) vs description weight (1×) ────
        const itemKwOnly = {
          id: 'kw-only',
          name: 'completely unrelated name xyz',
          description: 'completely unrelated description abc',
          keywords: [token],
        };
        const itemDescOnly2 = {
          id: 'desc-only2',
          name: 'completely unrelated name two pqr',
          description: `item with ${token} here`,
          keywords: [],
        };
        const catalogB = { agents: [itemKwOnly, itemDescOnly2], skills: [], commands: [] };
        const resultsB = recommend(token, catalogB);

        const rB_kw   = resultsB.find(r => r.item.id === 'kw-only');
        const rB_desc = resultsB.find(r => r.item.id === 'desc-only2');

        if (!rB_kw || !rB_desc) {
          throw new Error(
            `Iteration ${i} (kw vs desc): expected both items in results.\n` +
            `  got ids: [${resultsB.map(r => r.item.id).join(', ')}]\n` +
            `  token: ${token}`
          );
        }
        if (rB_kw.score <= rB_desc.score) {
          throw new Error(
            `Iteration ${i} (kw vs desc): expected score(kw-only) > score(desc-only2).\n` +
            `  score(kw-only)=${rB_kw.score}, score(desc-only2)=${rB_desc.score}\n` +
            `  token: ${token}`
          );
        }
      }
    }
  )) passed++; else failed++;

  // ─── PBT Summary ─────────────────────────────────────────────────────────

  console.log(`\nPBT Tests — Passed: ${passed}, Failed: ${failed}`);

  return { passed, failed };
}

// ─── Combined runner ──────────────────────────────────────────────────────────
// Replaces the original `main()` call. We cannot run main() then mainPbt()
// separately because main() calls process.exit(). Instead we run everything
// through a single runAll() that loads the module once and shares it.

async function runAll() {
  const modUrl = new URL(
    '../../scripts/dashboard/modules/recommendations.js',
    `file://${__filename}`
  ).href;

  let recommend;
  try {
    const mod = await import(modUrl);
    recommend = mod.recommend;
  } catch (err) {
    console.error(`\nFATAL: could not import recommendations.js — ${err.message}`);
    process.exit(1);
  }

  // ── Unit tests ────────────────────────────────────────────────────────────
  // (replicate the unit-test body here so both sections share recommend)

  console.log('\n=== Unit Tests: recommendations.js ===\n');

  let unitPassed = 0;
  let unitFailed = 0;

  if (await runTestAsync('query vacía (< 3 chars) devuelve array vacío', async () => {
    const catalog = makeCatalog([makeAgent({ id: 'a', name: 'alpha token', description: 'desc' })]);
    for (const q of ['', 'a', 'ab']) {
      const result = recommend(q, catalog);
      assert.ok(Array.isArray(result), `recommend("${q}") should return an array`);
      assert.strictEqual(result.length, 0,
        `recommend("${q}") should return empty array for query shorter than 3 chars, got ${result.length} items`);
    }
  })) unitPassed++; else unitFailed++;

  if (await runTestAsync('ponderación nombre(3x) supera descripción(1x) para el mismo token', async () => {
    const token = 'zxqtoken';
    const catalog = makeCatalog([
      makeAgent({ id: 'a', name: `${token} here`, description: 'other words', keywords: [] }),
      makeAgent({ id: 'b', name: 'different name', description: `${token} here`, keywords: [] }),
    ]);
    const results = recommend(token, catalog);
    assert.ok(results.length >= 2, `Expected at least 2 results for query "${token}", got ${results.length}`);
    const resultA = results.find(r => r.item.id === 'a');
    const resultB = results.find(r => r.item.id === 'b');
    assert.ok(resultA, 'Expected result for item A (token in name)');
    assert.ok(resultB, 'Expected result for item B (token in description)');
    assert.ok(resultA.score > resultB.score,
      `Expected score(A) > score(B): name weight(3x) > description weight(1x). ` +
      `Got score(A)=${resultA.score}, score(B)=${resultB.score}`);
  })) unitPassed++; else unitFailed++;

  if (await runTestAsync('ponderación keywords(2x) supera descripción(1x) para el mismo token', async () => {
    const token = 'zyxkwtoken';
    const catalog = makeCatalog([
      makeAgent({ id: 'c', name: 'unrelated name', description: 'unrelated desc', keywords: [token] }),
      makeAgent({ id: 'd', name: 'another name', description: `${token} here`, keywords: [] }),
    ]);
    const results = recommend(token, catalog);
    assert.ok(results.length >= 2, `Expected at least 2 results for query "${token}", got ${results.length}`);
    const resultC = results.find(r => r.item.id === 'c');
    const resultD = results.find(r => r.item.id === 'd');
    assert.ok(resultC, 'Expected result for item C (token in keywords)');
    assert.ok(resultD, 'Expected result for item D (token in description)');
    assert.ok(resultC.score > resultD.score,
      `Expected score(C) > score(D): keywords weight(2x) > description weight(1x). ` +
      `Got score(C)=${resultC.score}, score(D)=${resultD.score}`);
  })) unitPassed++; else unitFailed++;

  if (await runTestAsync('resultados ordenados de mayor a menor score', async () => {
    const token = 'sorttoken';
    const catalog = makeCatalog([
      makeAgent({ id: 'low',  name: 'unrelated',     description: `${token} here`, keywords: [] }),
      makeAgent({ id: 'high', name: `${token} item`, description: 'unrelated',     keywords: [] }),
      makeAgent({ id: 'mid',  name: 'other name',    description: 'other desc',    keywords: [token] }),
    ]);
    const results = recommend(token, catalog);
    assert.ok(results.length >= 2, `Expected at least 2 results, got ${results.length}`);
    for (let i = 0; i < results.length - 1; i++) {
      assert.ok(results[i].score >= results[i + 1].score,
        `Expected results[${i}].score (${results[i].score}) >= results[${i + 1}].score (${results[i + 1].score})`);
    }
  })) unitPassed++; else unitFailed++;

  if (await runTestAsync('máximo 10 resultados aunque el catálogo tenga más ítems con score > 0', async () => {
    const token = 'maxtoken';
    const agents = Array.from({ length: 15 }, (_, i) =>
      makeAgent({ id: `agent-${i}`, name: `${token} item ${i}`, description: 'desc', keywords: [] }));
    const catalog = makeCatalog(agents);
    const results = recommend(token, catalog);
    assert.ok(Array.isArray(results), 'recommend should return an array');
    assert.ok(results.length <= 10, `Expected at most 10 results, got ${results.length}`);
    assert.strictEqual(results.length, 10,
      `Expected exactly 10 results (max cap) when 15 agents match, got ${results.length}`);
  })) unitPassed++; else unitFailed++;

  if (await runTestAsync('normalización: query "código" encuentra ítem con "codigo" en nombre', async () => {
    const catalog = makeCatalog([
      makeAgent({ id: 'norm', name: 'analizador de codigo javascript', description: 'desc', keywords: [] }),
    ]);
    const results = recommend('código', catalog);
    assert.ok(Array.isArray(results), 'recommend should return an array');
    assert.ok(results.length > 0,
      'Expected at least 1 result: query "código" should match item with "codigo" after diacritic normalization');
    assert.strictEqual(results[0].item.id, 'norm',
      `Expected item "norm" to be returned, got "${results[0]?.item?.id}"`);
  })) unitPassed++; else unitFailed++;

  console.log(`\nUnit Tests — Passed: ${unitPassed}, Failed: ${unitFailed}`);

  // ── PBT ───────────────────────────────────────────────────────────────────
  const { passed: pbtPassed, failed: pbtFailed } = await mainPbt(recommend);

  // ─── Grand summary ────────────────────────────────────────────────────────
  const totalPassed = unitPassed + pbtPassed;
  const totalFailed = unitFailed + pbtFailed;
  console.log(`\nTotal — Passed: ${totalPassed}, Failed: ${totalFailed}`);

  process.exit(totalFailed > 0 ? 1 : 0);
}

runAll().catch(err => {
  console.error('Unexpected error in test runner:', err);
  process.exit(1);
});

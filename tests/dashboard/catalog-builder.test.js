// Tests for scripts/catalog-builder.js — implemented in tasks 2.1 and 2.2
'use strict';

const assert = require('node:assert/strict');
const yaml = require('js-yaml');
const { parseFrontmatterYaml, buildCatalog, maskEnvVars } = require('../../scripts/catalog-builder');

// ─── helpers ─────────────────────────────────────────────────────────────────

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    return false;
  }
}

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

/**
 * Simple seeded pseudo-random number generator (xorshift32).
 * Avoids Math.random() so the test sequence is reproducible.
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
 * Generate a random alphanumeric string key.
 */
function randomKey(rng, maxLen = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const len = Math.max(1, Math.floor(rng() * maxLen));
  let key = '';
  for (let i = 0; i < len; i++) {
    key += chars[Math.floor(rng() * chars.length)];
  }
  return key;
}

/**
 * Generate a random simple value: string, number, or array of strings.
 * Avoids YAML-special values (booleans, null, etc.) to keep round-trip
 * comparisons predictable.
 */
function randomValue(rng, depth) {
  const d = depth || 0;
  const choice = rng();
  if (choice < 0.4) {
    // plain alphanumeric string — no YAML special chars
    const chars = 'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const len = Math.max(1, Math.floor(rng() * 20));
    let val = '';
    for (let i = 0; i < len; i++) {
      val += chars[Math.floor(rng() * chars.length)];
    }
    return val;
  } else if (choice < 0.7) {
    // safe integer — avoids float precision issues
    return Math.floor(rng() * 10000);
  } else if (d < 1) {
    // array of plain strings
    const arrLen = Math.max(1, Math.floor(rng() * 4));
    return Array.from({ length: arrLen }, () => randomKey(rng, 12));
  } else {
    return randomKey(rng, 8);
  }
}

/**
 * Generate a random frontmatter object with 1–8 fields.
 */
function randomFrontmatter(rng) {
  const numFields = Math.max(1, Math.floor(rng() * 8));
  const obj = {};
  for (let i = 0; i < numFields; i++) {
    const key = randomKey(rng) + '_' + i; // append index for uniqueness
    obj[key] = randomValue(rng, 0);
  }
  return obj;
}

/**
 * Build a markdown file string with YAML frontmatter delimiters.
 */
function buildMarkdownWithFrontmatter(obj) {
  const yamlBlock = yaml.dump(obj, { lineWidth: -1, noRefs: true });
  return `---\n${yamlBlock}---\nbody content here\n`;
}

// ─── Unit Tests (task 2.1) ────────────────────────────────────────────────────

console.log('\n=== Unit Tests: catalog-builder.js ===\n');

let unitPassed = 0;
let unitFailed = 0;

if (runTest('parseFrontmatterYaml: parses strings, arrays and numbers', () => {
  const obj = { name: 'my-agent', tags: ['a', 'b'], priority: 42 };
  const content = buildMarkdownWithFrontmatter(obj);
  const result = parseFrontmatterYaml(content);
  assert.strictEqual(result.name, 'my-agent');
  assert.deepStrictEqual(result.tags, ['a', 'b']);
  assert.strictEqual(result.priority, 42);
})) unitPassed++; else unitFailed++;

if (runTest('parseFrontmatterYaml: malformed YAML signals error (throws or returns null)', () => {
  const malformed = '---\nname: good\nbad: [unclosed\n---\nbody\n';
  let warned = false;
  const originalWarn = console.warn;
  console.warn = () => { warned = true; };
  let result;
  let threw = false;
  try {
    result = parseFrontmatterYaml(malformed);
  } catch (_e) {
    threw = true;
  } finally {
    console.warn = originalWarn;
  }
  const signalledError = threw || warned || result === null || result === undefined;
  assert.ok(signalledError, 'expected parseFrontmatterYaml to signal error (throw, warn, or return null) for malformed input');
})) unitPassed++; else unitFailed++;

if (runTest('maskEnvVars: replaces ${VAR} patterns with "[env]"', () => {
  const input = { key: '${MY_SECRET}', other: 'normal' };
  const result = maskEnvVars(input);
  assert.strictEqual(result.key, '[env]');
  assert.strictEqual(result.other, 'normal');
})) unitPassed++; else unitFailed++;

if (runTest('maskEnvVars: replaces process.env.VAR patterns with "[env]"', () => {
  const input = { key: 'process.env.API_KEY', nested: { val: 'process.env.SECRET' } };
  const result = maskEnvVars(input);
  assert.strictEqual(result.key, '[env]');
  assert.strictEqual(result.nested.val, '[env]');
})) unitPassed++; else unitFailed++;

if (runTest('maskEnvVars: does not mutate the original object', () => {
  const input = { key: '${MY_SECRET}' };
  const original = JSON.parse(JSON.stringify(input));
  maskEnvVars(input);
  assert.deepStrictEqual(input, original);
})) unitPassed++; else unitFailed++;

if (runTest('parseFrontmatterYaml: returns object for content with no frontmatter block', () => {
  const content = 'no frontmatter here\njust body';
  const result = parseFrontmatterYaml(content);
  assert.ok(result !== null && typeof result === 'object');
})) unitPassed++; else unitFailed++;

console.log(`\nUnit Tests — Passed: ${unitPassed}, Failed: ${unitFailed}\n`);

// ─── Property-Based Tests (task 2.2) ─────────────────────────────────────────

console.log('=== PBT: catalog-builder.js ===\n');

async function main() {
  let pbtPassed = 0;
  let pbtFailed = 0;

  // ──────────────────────────────────────────────────────────────────────────
  // Feature: visual-agent-dashboard, Property 1: Round-Trip de Parseo de Frontmatter
  //
  // Validates: Requirements 1.1, 9.1
  //
  // 100 iterations: generate random frontmatter objects with strings/arrays/numbers,
  // serialize to YAML with yaml.dump, parse with parseFrontmatterYaml,
  // verify field-by-field equivalence.
  // ──────────────────────────────────────────────────────────────────────────
  if (await runTestAsync(
    '// Feature: visual-agent-dashboard, Property 1: Round-Trip de Parseo de Frontmatter',
    async () => {
      const ITERATIONS = 100;
      const rng = makeRng(0xdeadbeef);

      for (let i = 0; i < ITERATIONS; i++) {
        const original = randomFrontmatter(rng);
        const content = buildMarkdownWithFrontmatter(original);

        let parsed;
        try {
          parsed = parseFrontmatterYaml(content);
        } catch (err) {
          throw new Error(
            `Iteration ${i}: parseFrontmatterYaml threw unexpectedly: ${err.message}\n` +
            `Input object: ${JSON.stringify(original)}`
          );
        }

        if (parsed === null || parsed === undefined) {
          throw new Error(
            `Iteration ${i}: parseFrontmatterYaml returned ${parsed} for valid frontmatter\n` +
            `Input object: ${JSON.stringify(original)}`
          );
        }

        // Verify field-by-field equivalence
        for (const [key, expectedValue] of Object.entries(original)) {
          const actualValue = parsed[key];
          const expected = JSON.stringify(expectedValue);
          const actual = JSON.stringify(actualValue);
          if (expected !== actual) {
            throw new Error(
              `Iteration ${i}: Round-trip mismatch on field "${key}"\n` +
              `  Expected: ${expected}\n` +
              `  Actual:   ${actual}\n` +
              `  Input object: ${JSON.stringify(original)}`
            );
          }
        }

        // Parsed result must not have extra keys
        const extraKeys = Object.keys(parsed).filter(k => !(k in original));
        if (extraKeys.length > 0) {
          throw new Error(
            `Iteration ${i}: parsed result has unexpected extra keys: ${extraKeys.join(', ')}\n` +
            `  Input object: ${JSON.stringify(original)}`
          );
        }
      }
    }
  )) pbtPassed++; else pbtFailed++;

  // ──────────────────────────────────────────────────────────────────────────
  // Feature: visual-agent-dashboard, Property 8: Catalog Builder Tolera Frontmatter Malformado Sin Abortar
  //
  // Validates: Requirements 1.9, 9.8
  //
  // 100 iterations: N valid files + M malformed files →
  //   - exactly N items in result
  //   - exactly M console.warn calls
  //   - no exceptions thrown
  //
  // Uses file system mocks (node:test mock utilities).
  // ──────────────────────────────────────────────────────────────────────────
  if (await runTestAsync(
    '// Feature: visual-agent-dashboard, Property 8: Catalog Builder Tolera Frontmatter Malformado Sin Abortar',
    async () => {
      const ITERATIONS = 100;
      const rng = makeRng(0xcafebabe);
      const fsPromises = require('node:fs/promises');
      const nodePath = require('node:path');

      for (let i = 0; i < ITERATIONS; i++) {
        const N = Math.floor(rng() * 5) + 1;  // 1..5 valid files
        const M = Math.floor(rng() * 4);      // 0..3 malformed files

        // Build valid agent file contents
        const validFiles = Array.from({ length: N }, (_, j) => {
          const fm = {
            name: `agent-valid-${i}-${j}`,
            description: `Valid agent ${j} for iteration ${i}`,
            type: 'reviewer',
          };
          return { name: `agent-valid-${i}-${j}.md`, content: buildMarkdownWithFrontmatter(fm) };
        });

        // Build malformed agent file contents
        const malformedFiles = Array.from({ length: M }, (_, j) => ({
          name: `agent-bad-${i}-${j}.md`,
          content: `---\nname: broken\nbad: [unclosed\n---\nbody\n`,
        }));

        const allFiles = [...validFiles, ...malformedFiles];
        const fileMap = new Map(allFiles.map(f => [f.name, f.content]));

        // Save original fs.promises methods
        const readdirOriginal = fsPromises.readdir;
        const readFileOriginal = fsPromises.readFile;

        // Track console.warn calls
        let warnCount = 0;
        const originalWarn = console.warn;
        console.warn = (msg) => {
          warnCount++;
          void msg; // suppress output during PBT
        };

        let result;
        let threwException = false;
        try {
          // Mock readdir: return our fake .md files for agents/, empty for others
          fsPromises.readdir = async (dirPath) => {
            const p = String(dirPath);
            if (p.endsWith('/agents') || p.endsWith('\\agents')) {
              return allFiles.map(f => f.name);
            }
            return [];
          };

          // Mock readFile: return our fake content by basename
          fsPromises.readFile = async (filePath, _opts) => {
            const basename = nodePath.basename(String(filePath));
            if (fileMap.has(basename)) {
              return fileMap.get(basename);
            }
            const err = new Error(`ENOENT: no such file: ${filePath}`);
            err.code = 'ENOENT';
            throw err;
          };

          result = await buildCatalog(nodePath.join(__dirname, '..', '..'));
        } catch (err) {
          threwException = true;
          throw new Error(
            `Iteration ${i} (N=${N}, M=${M}): buildCatalog threw an exception: ${err.message}`
          );
        } finally {
          // Always restore
          fsPromises.readdir = readdirOriginal;
          fsPromises.readFile = readFileOriginal;
          console.warn = originalWarn;
        }

        assert.ok(!threwException, `Iteration ${i}: buildCatalog must not throw exceptions`);

        // Verify exactly M console.warn calls for malformed files
        if (warnCount !== M) {
          throw new Error(
            `Iteration ${i} (N=${N}, M=${M}): expected exactly ${M} console.warn call(s), ` +
            `got ${warnCount}`
          );
        }

        // Verify exactly N valid items in result.agents
        const agents = result && Array.isArray(result.agents) ? result.agents : [];
        if (agents.length !== N) {
          throw new Error(
            `Iteration ${i} (N=${N}, M=${M}): expected exactly ${N} agent(s) in result.agents, ` +
            `got ${agents.length}. Result keys: ${JSON.stringify(Object.keys(result || {}))}`
          );
        }
      }
    }
  )) pbtPassed++; else pbtFailed++;

  // ─── buildCatalog structural tests (task 2.1 async tests) ─────────────────

  if (await runTestAsync('buildCatalog: returns CatalogData structure with expected top-level keys', async () => {
    const result = await buildCatalog(require('node:path').join(__dirname, '..', '..'));
    const expectedKeys = ['version', 'generatedAt', 'agents', 'skills', 'commands', 'rules', 'mcps', 'hooks'];
    for (const key of expectedKeys) {
      assert.ok(key in result, `Expected key "${key}" in CatalogData result, got keys: ${Object.keys(result).join(', ')}`);
    }
    assert.ok(typeof result.version === 'string', 'version should be a string');
    assert.ok(typeof result.generatedAt === 'string', 'generatedAt should be a string');
    assert.ok(Array.isArray(result.agents), 'agents should be an array');
    assert.ok(Array.isArray(result.skills), 'skills should be an array');
    assert.ok(Array.isArray(result.commands), 'commands should be an array');
    assert.ok(Array.isArray(result.rules), 'rules should be an array');
    assert.ok(Array.isArray(result.mcps), 'mcps should be an array');
    assert.ok(Array.isArray(result.hooks), 'hooks should be an array');
  })) pbtPassed++; else pbtFailed++;

  if (await runTestAsync('buildCatalog: agent items have shortDescription truncated to 120 chars with ellipsis', async () => {
    const result = await buildCatalog(require('node:path').join(__dirname, '..', '..'));
    for (const agent of (result.agents || [])) {
      if (agent.shortDescription) {
        assert.ok(
          agent.shortDescription.length <= 121, // 120 chars + possible '…' = 121 max
          `shortDescription exceeds 121 chars for agent "${agent.name}": ${agent.shortDescription.length} chars`
        );
      }
    }
  })) pbtPassed++; else pbtFailed++;

  if (await runTestAsync('buildCatalog: agents with *-reviewer suffix have type "reviewer"', async () => {
    const result = await buildCatalog(require('node:path').join(__dirname, '..', '..'));
    for (const agent of (result.agents || [])) {
      if (agent.name && agent.name.endsWith('-reviewer')) {
        assert.strictEqual(
          agent.type, 'reviewer',
          `Expected type "reviewer" for agent "${agent.name}", got "${agent.type}"`
        );
      }
    }
  })) pbtPassed++; else pbtFailed++;

  // ─── Summary ─────────────────────────────────────────────────────────────

  const totalPassed = unitPassed + pbtPassed;
  const totalFailed = unitFailed + pbtFailed;

  console.log(`\nPBT Tests  — Passed: ${pbtPassed}, Failed: ${pbtFailed}`);
  console.log(`\nPassed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Unexpected error in test runner:', err);
  process.exit(1);
});

// Tests for scripts/dashboard/modules/router.js
// Task 5.1 — Unit tests (RED phase)
'use strict';

const assert = require('node:assert/strict');

// ─── helpers ───────────────────────────────────────────────────────────────────

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

// ─── mock window ─────────────────────────────────────────────────────────────

function setupWindowMock() {
  const listeners = {};
  let currentHash = '';

  const windowMock = {
    location: {
      get hash() { return currentHash; },
      set hash(val) { currentHash = val; },
    },
    addEventListener(event, handler) {
      listeners[event] = handler;
    },
    removeEventListener() {},
    dispatchEvent(event) {
      if (event.type === 'hashchange' && listeners.hashchange) {
        listeners.hashchange(event);
      }
    },
  };

  return { windowMock, listeners };
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { windowMock, listeners } = setupWindowMock();
  global.window = windowMock;

  const modUrl = new URL(
    '../../scripts/dashboard/modules/router.js',
    `file://${__filename}`
  ).href;

  // Reload the module to avoid cache issues
  const mod = await import(`${modUrl}?t=${Date.now()}`);

  const { navigate, getCurrentRoute, onRouteChange } = mod;

  // Restore listeners map in mod for testing
  // The router should use window.addEventListener, so listeners should be populated
  void listeners; // suppress unused

  console.log('\n=== Unit Tests: router.js ===\n');

  let passed = 0;
  let failed = 0;

  // ── Test 1: hash #/agents resolves to board view for agents ────────────────
  if (await runTestAsync('hash #/agents resolves to /agents pattern', async () => {
    navigate('#/agents');
    const route = getCurrentRoute();
    assert.strictEqual(route.pattern, '/agents', `Expected pattern "/agents", got "${route.pattern}"`);
    assert.deepStrictEqual(route.params, {}, `Expected empty params for /agents`);
  })) passed++; else failed++;

  // ── Test 2: hash #/skills/react-patterns extracts name parameter ───────────
  if (await runTestAsync('hash #/skills/react-patterns extracts name parameter', async () => {
    navigate('#/skills/react-patterns');
    const route = getCurrentRoute();
    assert.strictEqual(route.pattern, '/skills/:name', `Expected pattern "/skills/:name"`);
    assert.strictEqual(route.params.name, 'react-patterns', `Expected params.name = "react-patterns"`);
  })) passed++; else failed++;

  // ── Test 3: hash #/hooks/quality-gate extracts id parameter ────────────────
  if (await runTestAsync('hash #/hooks/quality-gate extracts id parameter', async () => {
    navigate('#/hooks/quality-gate');
    const route = getCurrentRoute();
    assert.strictEqual(route.pattern, '/hooks/:id', `Expected pattern "/hooks/:id"`);
    assert.strictEqual(route.params.id, 'quality-gate', `Expected params.id = "quality-gate"`);
  })) passed++; else failed++;

  // ── Test 4: unknown hash triggers 404 (catch-all *) ────────────────────────
  if (await runTestAsync('hash #/xyz/abc triggers 404 pattern (*)', async () => {
    navigate('#/xyz/abc');
    const route = getCurrentRoute();
    assert.strictEqual(route.pattern, '*', `Expected 404 pattern "*", got "${route.pattern}"`);
    assert.deepStrictEqual(route.params, {}, `Expected empty params for 404`);
  })) passed++; else failed++;

  // ── Test 5: navigate updates window.location.hash ──────────────────────────
  if (await runTestAsync('navigate updates window.location.hash', async () => {
    const initialHash = windowMock.location.hash;
    navigate('#/agents/code-reviewer');
    assert.strictEqual(
      windowMock.location.hash,
      '#/agents/code-reviewer',
      `Expected location.hash = "#/agents/code-reviewer", got "${windowMock.location.hash}"`
    );
  })) passed++; else failed++;

  // ── Test 6: onRouteChange registers callback ───────────────────────────────
  if (await runTestAsync('onRouteChange registers callback', async () => {
    let callbackCalled = false;
    let callbackHash = '';
    onRouteChange((hash) => {
      callbackCalled = true;
      callbackHash = hash;
    });

    // Manually dispatch hashchange event
    if (windowMock.dispatchEvent) {
      windowMock.dispatchEvent({ type: 'hashchange' });
    } else if (listeners.hashchange) {
      listeners.hashchange({ type: 'hashchange' });
    }

    assert.ok(callbackCalled, 'Expected onRouteChange callback to be called');
  })) passed++; else failed++;

  // ── Test 7: getCurrentRoute returns correct pattern and params ─────────────
  if (await runTestAsync('getCurrentRoute returns correct pattern and params', async () => {
    const testCases = [
      { hash: '#/agents', pattern: '/agents', params: {} },
      { hash: '#/skills/react-patterns', pattern: '/skills/:name', params: { name: 'react-patterns' } },
      { hash: '#/commands/git-commit', pattern: '/commands/:name', params: { name: 'git-commit' } },
      { hash: '#/rules/es', pattern: '/rules/:lang', params: { lang: 'es' } },
      { hash: '#/mcps/.mcp.json', pattern: '/mcps/:file', params: { file: '.mcp.json' } },
      { hash: '#/hooks/quality-gate', pattern: '/hooks/:id', params: { id: 'quality-gate' } },
      { hash: '#/activity', pattern: '/activity', params: {} },
      { hash: '#/unknown/path', pattern: '*', params: {} },
    ];

    for (const tc of testCases) {
      navigate(tc.hash);
      const route = getCurrentRoute();
      assert.strictEqual(
        route.pattern,
        tc.pattern,
        `For hash "${tc.hash}", expected pattern "${tc.pattern}", got "${route.pattern}"`
      );
      assert.deepStrictEqual(
        route.params,
        tc.params,
        `For hash "${tc.hash}", expected params ${JSON.stringify(tc.params)}, got ${JSON.stringify(route.params)}`
      );
    }
  })) passed++; else failed++;

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Unexpected error in test runner:', err);
  process.exit(1);
});

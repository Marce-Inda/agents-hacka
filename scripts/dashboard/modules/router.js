// Hash-based router for the Visual Agent Dashboard SPA
// Supports routes: '', /agents, /skills, /commands, /rules, /mcps, /hooks, /activity,
// and parameterized routes like /skills/:name, /hooks/:id, etc.
// Also includes catch-all 404 handler with pattern '*'

// Route table with pattern definitions
const ROUTES = [
  { pattern: '',                handler: () => {} },
  { pattern: '/agents',         handler: () => {} },
  { pattern: '/skills',         handler: () => {} },
  { pattern: '/commands',       handler: () => {} },
  { pattern: '/rules',          handler: () => {} },
  { pattern: '/mcps',           handler: () => {} },
  { pattern: '/hooks',          handler: () => {} },
  { pattern: '/activity',       handler: () => {} },
  { pattern: '/agents/:name',   handler: () => {} },
  { pattern: '/skills/:name',   handler: () => {} },
  { pattern: '/commands/:name', handler: () => {} },
  { pattern: '/rules/:lang',    handler: () => {} },
  { pattern: '/mcps/:file',     handler: () => {} },
  { pattern: '/hooks/:id',      handler: () => {} },
  { pattern: '*',               handler: () => {} }, // 404 catch-all
];

// Current route state
let currentRoute = { pattern: '', params: {} };

// Route change callbacks
const routeChangeCallbacks = [];

/**
 * Parse a hash string and match it against route patterns
 * Returns { pattern, params } where params is an object of route parameters
 */
function parseHash(hash) {
  // Strip leading '#' if present
  const path = hash.startsWith('#') ? hash.slice(1) : hash;
  
  // Empty hash maps to empty pattern
  if (path === '') {
    return { pattern: '', params: {} };
  }
  
  // Try each route pattern
  for (const route of ROUTES) {
    const params = matchRoute(route.pattern, path);
    if (params !== null) {
      return { pattern: route.pattern, params };
    }
  }
  
  // No match - use catch-all 404
  return { pattern: '*', params: {} };
}

/**
 * Match a route pattern against a path
 * Returns params object if matched, null otherwise
 */
function matchRoute(pattern, path) {
  // Special case for empty pattern
  if (pattern === '' && path === '') {
    return {};
  }
  
  // Special case for catch-all
  if (pattern === '*') {
    return {};
  }
  
  // Split pattern and path into segments
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = path.split('/').filter(Boolean);
  
  // Must have same number of segments
  if (patternSegments.length !== pathSegments.length) {
    return null;
  }
  
  const params = {};
  
  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i];
    const pathSegment = pathSegments[i];
    
    if (patternSegment.startsWith(':')) {
      // Parameterized segment - extract parameter name and value
      const paramName = patternSegment.slice(1);
      params[paramName] = pathSegment;
    } else if (patternSegment !== pathSegment) {
      // Static segment - must match exactly
      return null;
    }
  }
  
  return params;
}

/**
 * Navigate to a new hash
 * Updates window.location.hash
 */
export function navigate(hash) {
  // Ensure hash has leading '#'
  const normalizedHash = hash.startsWith('#') ? hash : `#${hash}`;
  window.location.hash = normalizedHash;
}

/**
 * Get the current route
 * Returns { pattern, params } for the current hash
 */
export function getCurrentRoute() {
  const hash = window.location.hash;
  const parsed = parseHash(hash);
  currentRoute = parsed;
  return parsed;
}

/**
 * Register a callback to be invoked when the route changes
 * Callback receives the hash string as argument
 */
export function onRouteChange(callback) {
  routeChangeCallbacks.push(callback);
}

/**
 * Initialize the router by setting up event listeners
 * Should be called once at application startup
 */
function init() {
  // Listen for hashchange events (when user navigates with browser back/forward)
  window.addEventListener('hashchange', () => {
    const route = getCurrentRoute();
    for (const callback of routeChangeCallbacks) {
      callback(window.location.hash);
    }
  });
  
  // Listen for popstate events (for browser navigation)
  window.addEventListener('popstate', () => {
    const route = getCurrentRoute();
    for (const callback of routeChangeCallbacks) {
      callback(window.location.hash);
    }
  });
}

// Initialize router on module load
init();

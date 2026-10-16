// i18n.js — Internationalization module for the Visual Agent Dashboard
// Supports: English (en), Spanish (es)
// Fallback: if a key is missing in the active language, falls back to English
// ES module export — loaded via <script type="module">

/**
 * Supported language codes (12 total in the full spec)
 * For this task, only 'en' and 'es' are fully implemented
 */
export const SUPPORTED_LANGS = ['en', 'pt', 'zh', 'zht', 'ja', 'ko', 'tr', 'ru', 'vi', 'th', 'de', 'es'];

// ─── Translation bundles ─────────────────────────────────────────────────────

/**
 * English bundle — complete set of UI strings
 */
const EN_BUNDLE = {
  nav_agents: 'Agents',
  nav_skills: 'Skills',
  nav_commands: 'Commands',
  nav_rules: 'Rules',
  nav_mcps: 'MCPs',
  nav_hooks: 'Hooks',
  nav_activity: 'Activity',
  welcome: 'Welcome to the Agent Dashboard',
  search_placeholder: 'Search...',
  recommend_placeholder: 'What do you need to do?',
  loading: 'Loading...',
  error: 'Error',
  retry: 'Retry',
  howto: 'How to use it',
  no_results: 'No results found',
  items_found: 'items found',
  view_detail: 'View details',
  copy: 'Copy',
  copied: 'Copied!',
  dark_mode: 'Dark mode',
  light_mode: 'Light mode',
  language: 'Language',
  not_found: 'Item not found',
  back_to_dashboard: 'Back to dashboard',
  filters: 'Filters',
  all_types: 'All types',
  // Extra keys that only exist in English (for PBT testing)
  agents_tab: 'Agents tab',
  skills_tab: 'Skills tab',
  commands_tab: 'Commands tab',
};

/**
 * Spanish bundle — complete set of UI strings
 * 100% coverage of English bundle except for extra_keys_testing_*
 */
const ES_BUNDLE = {
  nav_agents: 'Agentes',
  nav_skills: 'Skills',
  nav_commands: 'Comandos',
  nav_rules: 'Reglas',
  nav_mcps: 'MCPs',
  nav_hooks: 'Hooks',
  nav_activity: 'Actividad',
  welcome: 'Bienvenido al Panel de Agentes',
  search_placeholder: 'Buscar...',
  recommend_placeholder: '¿Qué necesitas hacer?',
  loading: 'Cargando...',
  error: 'Error',
  retry: 'Reintentar',
  howto: 'Cómo usarlo',
  no_results: 'No se encontraron resultados',
  items_found: 'elementos encontrados',
  view_detail: 'Ver detalles',
  copy: 'Copiar',
  copied: '¡Copiado!',
  dark_mode: 'Modo oscuro',
  light_mode: 'Modo claro',
  language: 'Idioma',
  not_found: 'Elemento no encontrado',
  back_to_dashboard: 'Volver al panel',
  filters: 'Filtros',
  all_types: 'Todos los tipos',
};

// Map of supported languages to their bundles
const BUNDLES = {
  en: EN_BUNDLE,
  es: ES_BUNDLE,
  // Other languages fallback to English — keys exist but values are placeholders
  pt: { ...EN_BUNDLE }, // Portuguese (placeholder — uses English values)
  zh: { ...EN_BUNDLE }, // Chinese (Simplified) (placeholder)
  zht: { ...EN_BUNDLE }, // Chinese (Traditional) (placeholder)
  ja: { ...EN_BUNDLE }, // Japanese (placeholder)
  ko: { ...EN_BUNDLE }, // Korean (placeholder)
  tr: { ...EN_BUNDLE }, // Turkish (placeholder)
  ru: { ...EN_BUNDLE }, // Russian (placeholder)
  vi: { ...EN_BUNDLE }, // Vietnamese (placeholder)
  th: { ...EN_BUNDLE }, // Thai (placeholder)
  de: { ...EN_BUNDLE }, // German (placeholder)
};

// ─── t(key, lang) ────────────────────────────────────────────────────────────

/**
 * Get translation for a key in the specified language
 *
 * @param {string} key — translation key
 * @param {string} lang — language code (e.g., 'en', 'es')
 * @returns {string} — translated text or key if not found
 */
export function t(key, lang) {
  const normalizedLang = lang || 'en';

  // Get target language bundle
  let bundle = BUNDLES[normalizedLang];
  if (!bundle) {
    bundle = BUNDLES.en;
  }

  // Look up key in target language
  let value = bundle[key];

  // If not found, try English bundle
  if (value === undefined) {
    const enBundle = BUNDLES.en;
    if (enBundle[key] !== undefined) {
      value = enBundle[key];
      console.warn(`[i18n] Missing key '${key}' in bundle '${normalizedLang}', falling back to 'en'`);
    } else {
      // Not found in either bundle — return the key itself
      value = key;
    }
  }

  return value;
}

// ─── detectLanguage() ────────────────────────────────────────────────────────

/**
 * Detect user's preferred language from navigator.language
 * Falls back to 'en' if unsupported
 *
 * @returns {string} — supported language code
 */
export function detectLanguage() {
  if (typeof navigator === 'undefined' || !navigator.language) {
    return 'en';
  }

  const lang = navigator.language.toLowerCase();
  const primary = lang.split('-')[0]; // 'es-MX' → 'es'

  // Check if primary language code is in SUPPORTED_LANGS
  if (SUPPORTED_LANGS.includes(primary)) {
    return primary;
  }

  // Fallback to 'en' if unsupported
  return 'en';
}

// ─── Export bundles for testing ──────────────────────────────────────────────

export { EN_BUNDLE, ES_BUNDLE };

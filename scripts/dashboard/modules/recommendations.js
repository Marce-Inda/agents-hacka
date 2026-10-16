/**
 * recommendations.js — Motor de recomendaciones client-side
 *
 * Función pura, sin side effects ni llamadas de red.
 * Requisitos: 5.2, 5.3, 5.6, 5.8, 5.9
 */

/**
 * Normaliza texto: minúsculas + NFD decomposition + strip diacríticos.
 * @param {string} text
 * @returns {string}
 */
function normalize(text) {
  if (typeof text !== 'string') return '';
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

/**
 * Cuenta ocurrencias no solapadas de `token` dentro de `text`.
 * Ambos valores deben estar ya normalizados.
 * @param {string} token
 * @param {string} text
 * @returns {number}
 */
function countOccurrences(token, text) {
  if (!token || !text) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(token, pos)) !== -1) {
    count++;
    pos += token.length;
  }
  return count;
}

/**
 * Calcula el score ponderado de un ítem para un conjunto de tokens.
 * @param {{ name: string, keywords?: string[], description?: string }} item
 * @param {string[]} tokens — tokens ya normalizados
 * @returns {{ score: number, matchedTokens: string[] }}
 */
function scoreItem(item, tokens) {
  const normName = normalize(item.name || '');
  const normKeywords = normalize(
    Array.isArray(item.keywords) ? item.keywords.join(' ') : ''
  );
  const normDesc = normalize(item.description || '');

  let score = 0;
  const matchedTokens = [];

  for (const token of tokens) {
    const nameHits = countOccurrences(token, normName);
    const kwHits   = countOccurrences(token, normKeywords);
    const descHits = countOccurrences(token, normDesc);

    const contribution = 3 * nameHits + 2 * kwHits + 1 * descHits;
    if (contribution > 0) {
      score += contribution;
      matchedTokens.push(token);
    }
  }

  return { score, matchedTokens };
}

/**
 * Motor de recomendaciones.
 *
 * @param {string} query — consulta del usuario (3–200 chars)
 * @param {{ agents?: any[], skills?: any[], commands?: any[] }} catalog
 * @returns {Array<{ item: any, score: number, matchedTokens: string[], type: string }>}
 */
export function recommend(query, catalog) {
  try {
    // Validación de query: < 3 chars → []
    if (typeof query !== 'string') return [];
    const normQuery = normalize(query);
    if (normQuery.length < 3) return [];

    // Tokenizar
    const tokens = normQuery.split(/\s+/).filter(t => t.length > 0);
    if (tokens.length === 0) return [];

    // Catálogo seguro
    const agents   = Array.isArray(catalog?.agents)   ? catalog.agents   : [];
    const skills   = Array.isArray(catalog?.skills)   ? catalog.skills   : [];
    const commands = Array.isArray(catalog?.commands) ? catalog.commands : [];

    const results = [];

    // Procesar agentes
    for (const item of agents) {
      const { score, matchedTokens } = scoreItem(item, tokens);
      if (score > 0) {
        results.push({ item, score, matchedTokens, type: 'agent' });
      }
    }

    // Procesar skills
    for (const item of skills) {
      const { score, matchedTokens } = scoreItem(item, tokens);
      if (score > 0) {
        results.push({ item, score, matchedTokens, type: 'skill' });
      }
    }

    // Procesar commands
    for (const item of commands) {
      const { score, matchedTokens } = scoreItem(item, tokens);
      if (score > 0) {
        results.push({ item, score, matchedTokens, type: 'command' });
      }
    }

    // Ordenar por score descendente
    results.sort((a, b) => b.score - a.score);

    // Retornar máximo 10
    return results.slice(0, 10);
  } catch (_err) {
    return [];
  }
}

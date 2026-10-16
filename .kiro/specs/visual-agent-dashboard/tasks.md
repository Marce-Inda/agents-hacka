# Plan de Implementación: Visual Agent Dashboard

## Visión General

Refactorización integral de `scripts/dashboard-web.js` y creación de una SPA vanilla JS con tablero visual tipo Trello. El plan sigue TDD estricto (RED → GREEN → REFACTOR) con cobertura mínima del 80% obligatoria en todos los módulos. Los tests de propiedad (PBT) son parte del ciclo de desarrollo, no opcionales.

**Lenguaje:** JavaScript (ES modules nativos, Node.js puro)
**Stack de tests:** `node:test` + `c8`
**PBT:** loops manuales (100 iteraciones mínimo, sin dependencias externas)

---

## Tareas

- [x] 1. Infraestructura base y configuración de tests
  - Crear estructura de directorios: `scripts/dashboard/`, `scripts/dashboard/modules/`, `tests/dashboard/`
  - Verificar configuración de `node:test` y `c8` en `package.json`; ajustar scripts `test` y `coverage` si es necesario para incluir `tests/dashboard/**`
  - Crear archivos vacíos (stubs) para todos los módulos que los tests importarán: `scripts/catalog-builder.js`, `scripts/dashboard/app.js`, `scripts/dashboard/modules/router.js`, `scripts/dashboard/modules/search.js`, `scripts/dashboard/modules/recommendations.js`, `scripts/dashboard/modules/i18n.js`, `scripts/dashboard/modules/theme.js`, `scripts/dashboard/modules/recently-viewed.js`, `scripts/dashboard/modules/activity.js`
  - Crear archivos de test vacíos para cada módulo en `tests/dashboard/`
  - _Requisitos: 1.10, 9.7_

- [x] 2. Catalog Builder — TDD completo
  - [x] 2.1 Escribir tests unitarios para `catalog-builder.js` (RED)
    - Test: `parseFrontmatterYaml` parsea correctamente strings, arrays y números
    - Test: frontmatter YAML malformado emite `console.warn` con el nombre del archivo, omite el ítem y continúa sin abortar
    - Test: `maskEnvVars` reemplaza `${VAR}` y `process.env.VAR` por `"[env]"` sin mutar el objeto original
    - Test: `buildCatalog` serializa correctamente a la estructura `CatalogData` con `version`, `generatedAt`, `agents`, `skills`, `commands`, `rules`, `mcps`, `hooks`
    - Test: `buildCatalog` calcula `shortDescription` (truncado a 120 chars con `…`)
    - Test: `buildCatalog` infiere el campo `type` de agentes según sufijo del nombre de archivo (`*-reviewer` → `reviewer`, etc.)
    - Ejecutar: confirmar que TODOS los tests fallan (RED)
    - _Requisitos: 1.1, 1.2, 1.8, 1.9, 9.1_

  - [x] 2.2 Escribir tests de propiedad para `catalog-builder.js` (RED — PBT)
    - **Propiedad 1: Round-Trip de Parseo de Frontmatter**
      - Tag: `// Feature: visual-agent-dashboard, Property 1: Round-Trip de Parseo de Frontmatter`
      - 100 iteraciones: generar objetos de frontmatter aleatorios con strings/arrays/números, serializar a YAML con `yaml.dump`, parsear con `parseFrontmatterYaml`, verificar equivalencia campo a campo
      - _Valida: Requisitos 1.1, 9.1_
    - **Propiedad 8: Catalog Builder Tolera Frontmatter Malformado Sin Abortar**
      - Tag: `// Feature: visual-agent-dashboard, Property 8: Catalog Builder Tolera Frontmatter Malformado Sin Abortar`
      - 100 iteraciones: N archivos válidos + M malformados → exactamente N ítems en resultado, exactamente M `console.warn`, sin excepciones lanzadas
      - Usar mocks del sistema de archivos (`node:test` mock utilities)
      - _Valida: Requisitos 1.9, 9.8_
    - Ejecutar: confirmar que TODOS los tests PBT fallan (RED)
    - _Requisitos: 1.1, 1.9, 9.1, 9.8_

  - [x] 2.3 Implementar `scripts/catalog-builder.js` (GREEN)
    - Implementar `parseFrontmatterYaml(content)`: parsea bloque YAML entre `---` delimitadores; si malformado, lanza error para que el llamador emita el `console.warn`
    - Implementar `maskEnvVars(obj)`: recorre recursivamente el árbol JSON, reemplaza valores que coincidan con `${...}` o `process.env.*` por `"[env]"`; retorna nuevo objeto (inmutable)
    - Implementar `buildCatalog(root)`: lee directorios `agents/`, `skills/*/SKILL.md`, `commands/`, `rules/`, `mcp-configs/`, `hooks/`; procesa cada archivo con `try/catch` individual; calcula campos derivados (`shortDescription`, `type`, `category`, `group`, `keywords`)
    - Implementar `writeAtomicJson(filePath, data)`: escribe a archivo temporal + rename atómico
    - Script CLI: si se ejecuta directamente, llama a `buildCatalog()` y escribe `scripts/dashboard/catalog.json`
    - Ejecutar tests: confirmar que TODOS los tests pasan (GREEN)
    - _Requisitos: 1.1, 1.2, 1.8, 1.9_

  - [x] 2.4 Verificar cobertura y refactorizar `catalog-builder.js`
    - Ejecutar `npm run coverage` — verificar ≥80% de líneas en `catalog-builder.js`
    - Refactorizar para mantener funciones <50 líneas y archivos <800 líneas
    - Ejecutar tests: confirmar que TODOS los tests siguen pasando (REFACTOR)
    - _Requisitos: 9.1, 9.7, 9.8_

- [x] 3. Checkpoint 1 — Catalog Builder operativo
  - Ejecutar `node scripts/catalog-builder.js` manualmente para generar `scripts/dashboard/catalog.json`
  - Verificar que el JSON resultante tiene la estructura `CatalogData` completa con agentes, skills, comandos, reglas, MCPs y hooks
  - Verificar que los valores de env vars en MCPs están enmascarados como `"[env]"`
  - Asegurarse de que todos los tests pasan. Consultar al usuario si surgen preguntas.

- [x] 4. Módulo `recommendations.js` — TDD completo
  - [x] 4.1 Escribir tests unitarios para `recommendations.js` (RED)
    - Test: query vacía (< 3 chars) devuelve array vacío
    - Test: ponderación nombre(3x) supera descripción(1x) para el mismo token — ítem con token en nombre tiene `score > score` de ítem con token solo en descripción
    - Test: ponderación keywords(2x) supera descripción(1x) para el mismo token
    - Test: resultados ordenados de mayor a menor score
    - Test: máximo 10 resultados retornados aunque el catálogo tenga más ítems con score > 0
    - Test: normalización de mayúsculas y tildes (query "código" encuentra ítem con "codigo" en nombre)
    - Ejecutar: confirmar que TODOS los tests fallan (RED)
    - _Requisitos: 5.2, 5.3, 5.8, 9.2_

  - [x] 4.2 Escribir tests de propiedad para `recommendations.js` (RED — PBT)
    - **Propiedad 2: Idempotencia del Motor de Recomendaciones**
      - Tag: `// Feature: visual-agent-dashboard, Property 2: Idempotencia del Motor de Recomendaciones`
      - 100 iteraciones: query aleatoria (3–200 chars) + catálogo aleatorio → `JSON.stringify(recommend(q, c)) === JSON.stringify(recommend(q, c))`
      - _Valida: Requisitos 5.2, 9.3_
    - **Propiedad 4: El Motor de Recomendaciones Nunca Lanza Excepciones**
      - Tag: `// Feature: visual-agent-dashboard, Property 4: El Motor de Recomendaciones Nunca Lanza Excepciones`
      - 100 iteraciones: queries con caracteres especiales, Unicode, acentos, emojis, catálogos de 0–500 ítems → nunca lanza excepción, siempre retorna array en ≤50ms (medido con `performance.now()`)
      - _Valida: Requisitos 5.2, 5.9_
    - **Propiedad 5: Resultados Ordenados por Score Descendente**
      - Tag: `// Feature: visual-agent-dashboard, Property 5: Resultados Ordenados por Score Descendente`
      - 100 iteraciones: para cualquier resultado con ≥2 ítems, verificar `results[i].score >= results[i+1].score` para todo `i` válido
      - _Valida: Requisito 5.3_
    - **Propiedad 11: Ponderación de Scoring — Nombre > Keywords > Descripción**
      - Tag: `// Feature: visual-agent-dashboard, Property 11: Ponderación de Scoring — Nombre > Keywords > Descripción`
      - 100 iteraciones: token T único en nombre de ítem A vs token T único en descripción de ítem B → `score(A) > score(B)`; token T en keywords de ítem A vs token T solo en descripción de ítem B → `score(A) > score(B)`
      - _Valida: Requisitos 5.8, 9.2_
    - Ejecutar: confirmar que TODOS los tests PBT fallan (RED)
    - _Requisitos: 5.2, 5.3, 5.8, 5.9, 9.2, 9.3_

  - [x] 4.3 Implementar `scripts/dashboard/modules/recommendations.js` (GREEN)
    - Implementar `recommend(query, catalog)` como función pura sin side effects ni llamadas de red
    - Tokenizar query: `toLowerCase()` + NFD decomposition + strip diacríticos (`/\p{M}/gu`)
    - Calcular score ponderado por tokens: `3 × ocurrencias(token, nombre)` + `2 × ocurrencias(token, keywords)` + `1 × ocurrencias(token, descripción)`
    - Retornar máximo 10 resultados ordenados por score descendente; query < 3 chars → `[]`
    - Retornar objetos `RecommendationResult` con `{item, score, matchedTokens, type}`
    - Envolver toda la lógica en `try/catch` que retorna `[]` en caso de error (Propiedad 4)
    - Ejecutar tests: confirmar que TODOS los tests pasan (GREEN)
    - _Requisitos: 5.2, 5.3, 5.6, 5.8, 5.9_

  - [x] 4.4 Verificar cobertura y refactorizar `recommendations.js`
    - Ejecutar `npm run coverage` — verificar ≥80% de líneas en `recommendations.js`
    - Refactorizar para extraer funciones de normalización y scoring como funciones puras separadas
    - Ejecutar tests: confirmar que TODOS los tests siguen pasando (REFACTOR)
    - _Requisitos: 9.2, 9.3, 9.7_

- [x] 5. Módulo `router.js` — TDD completo
  - [x] 5.1 Escribir tests unitarios para `router.js` (RED)
    - Test: hash `#/agents` resuelve al handler `renderBoardView('agents')`
    - Test: hash `#/skills/react-patterns` extrae parámetro `name = 'react-patterns'`
    - Test: hash `#/hooks/quality-gate` extrae parámetro `id = 'quality-gate'`
    - Test: hash desconocido (`#/xyz/abc`) dispara el handler 404
    - Test: `navigate('#/agents/code-reviewer')` actualiza `window.location.hash`
    - Test: `onRouteChange` registra callback invocado al cambiar el hash
    - Test: `getCurrentRoute()` retorna `{pattern, params}` correcto para el hash actual
    - Ejecutar: confirmar que TODOS los tests fallan (RED)
    - _Requisitos: 3.12, 4.9, 9.4_

  - [x] 5.2 Implementar `scripts/dashboard/modules/router.js` (GREEN)
    - Definir tabla `ROUTES` con todas las rutas soportadas: `''`, `/agents`, `/skills`, `/commands`, `/rules`, `/mcps`, `/hooks`, `/activity`, `/agents/:name`, `/skills/:name`, `/commands/:name`, `/rules/:lang`, `/mcps/:file`, `/hooks/:id`, `'*'` (catch-all 404)
    - Implementar listener `hashchange` + `popstate` que parsea el hash y despacha al handler correcto
    - Exportar `navigate(hash)`, `getCurrentRoute()`, `onRouteChange(callback)`
    - Ejecutar tests: confirmar que TODOS los tests pasan (GREEN)
    - _Requisitos: 3.12, 4.9_

  - [x] 5.3 Verificar cobertura y refactorizar `router.js`
    - Ejecutar `npm run coverage` — verificar ≥80% de líneas en `router.js`
    - Ejecutar tests: confirmar que TODOS los tests siguen pasando (REFACTOR)
    - _Requisitos: 9.4, 9.7_

- [ ] 6. Módulo `i18n.js` — TDD completo
  - [x] 6.1 Escribir tests unitarios para `i18n.js` (RED)
    - Test: `t(key, 'en')` devuelve la traducción correcta para todas las claves del bundle `en`
    - Test: `t(key, 'es')` devuelve texto en español para todas las claves del bundle `es`
    - Test: `detectLanguage()` detecta `navigator.language = 'es-MX'` y retorna `'es'`
    - Test: `detectLanguage()` retorna `'en'` como fallback para idioma no soportado
    - Test: `SUPPORTED_LANGS` contiene los 12 idiomas: `['en','pt','zh','zht','ja','ko','tr','ru','vi','th','de','es']`
    - Ejecutar: confirmar que TODOS los tests fallan (RED)
    - _Requisitos: 3.4, 3.5, 10.1, 10.2, 10.3, 10.4_

  - [x] 6.2 Escribir tests de propiedad para `i18n.js` (RED — PBT)
    - **Propiedad 10: Fallback de Internacionalización**
      - Tag: `// Feature: visual-agent-dashboard, Property 10: Fallback de Internacionalización`
      - 100 iteraciones: para cualquier clave que exista en `en` pero no en `es`, `t(key, 'es')` retorna el valor del bundle `en` (no la clave, no cadena vacía) y emite exactamente un `console.warn` que menciona la clave faltante
      - Generar claves aleatorias no existentes en `es` para cubrir el camino de fallback
      - _Valida: Requisitos 10.4, 10.5_
    - Ejecutar: confirmar que TODOS los tests PBT fallan (RED)
    - _Requisitos: 10.4, 10.5_

  - [x] 6.3 Implementar `scripts/dashboard/modules/i18n.js` (GREEN)
    - Implementar bundles de traducción para los 12 idiomas; el bundle `es` debe cubrir el 100% de las cadenas del bundle `en`
    - Incluir todas las cadenas de UI: tabs, botones, placeholders, mensajes de error, etiquetas ARIA, sección "Cómo usarlo", selector de idioma
    - Implementar `t(key, lang)`: fallback a `en` si clave faltante en `lang`; si tampoco en `en`, retorna la clave; emite `console.warn` en caso de fallback
    - Implementar `detectLanguage()`: usa `navigator.language`, normaliza al código de los 12 soportados, fallback a `'en'`
    - Exportar `SUPPORTED_LANGS`
    - Ejecutar tests: confirmar que TODOS los tests pasan (GREEN)
    - _Requisitos: 3.4, 3.5, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [~] 6.4 Verificar cobertura y refactorizar `i18n.js`
    - Ejecutar `npm run coverage` — verificar ≥80% de líneas en `i18n.js`
    - Ejecutar tests: confirmar que TODOS los tests siguen pasando (REFACTOR)
    - _Requisitos: 9.7, 10.1_

- [ ] 7. Módulos `recently-viewed.js`, `theme.js` y `search.js` — TDD completo
  - [~] 7.1 Escribir tests unitarios para `recently-viewed.js` (RED)
    - Test: `addItem` coloca el ítem al inicio de la lista
    - Test: la lista nunca supera 8 ítems
    - Test: no hay duplicados tras múltiples llamadas con el mismo `id`
    - Test: `getItems()` retorna la lista actual desde localStorage
    - Test: `clearItems()` vacía la lista y limpia localStorage
    - Test: `addItem` retorna nueva lista sin mutar la original (inmutabilidad)
    - Ejecutar: confirmar que TODOS los tests fallan (RED)
    - _Requisitos: 3.6, 3.7_

  - [~] 7.2 Escribir tests de propiedad para `recently-viewed.js` (RED — PBT)
    - **Propiedad 9: Recently Viewed — Invariante de Estructura**
      - Tag: `// Feature: visual-agent-dashboard, Property 9: Recently Viewed — Invariante de Estructura`
      - 100 iteraciones: secuencias aleatorias de 1–20 llamadas `addItem` con ítems de ids aleatorios → verificar: (a) longitud = `Math.min(ids_distintos, 8)`, (b) primer elemento es el último id añadido, (c) no hay duplicados de `id`
      - _Valida: Requisitos 3.6, 3.7_
    - Ejecutar: confirmar que TODOS los tests PBT fallan (RED)
    - _Requisitos: 3.6, 3.7_

  - [~] 7.3 Implementar `scripts/dashboard/modules/recently-viewed.js` (GREEN)
    - Implementar `addItem(item)`: retorna nueva lista con ítem al inicio, sin duplicados, máximo 8 elementos; persiste en `localStorage` clave `ecc_recently_viewed`; degradación silenciosa si localStorage no disponible
    - Implementar `getItems()`: lee de `localStorage`, retorna array (vacío si no hay datos)
    - Implementar `clearItems()`: limpia lista y `localStorage`
    - Ejecutar tests: confirmar que TODOS los tests pasan (GREEN)
    - _Requisitos: 3.6, 3.7_

  - [~] 7.4 Escribir tests unitarios para `theme.js` (RED)
    - Test: `initTheme()` lee `ecc_theme` de localStorage; si no existe, usa `prefers-color-scheme`
    - Test: `toggleTheme()` cambia de `'dark'` a `'light'` y viceversa, persiste en localStorage
    - Test: `getCurrentTheme()` retorna `'dark'` o `'light'`
    - Ejecutar: confirmar que TODOS los tests fallan (RED)
    - _Requisitos: 3.8_

  - [~] 7.5 Implementar `scripts/dashboard/modules/theme.js` (GREEN)
    - Implementar `initTheme()`: leer `ecc_theme` de localStorage; si no existe, usar `matchMedia('(prefers-color-scheme: dark)')` como valor por defecto; aplicar clase CSS al `<html>`
    - Implementar `toggleTheme()`: alternar tema, persistir en `localStorage` con clave `ecc_theme`
    - Implementar `getCurrentTheme()`
    - Ejecutar tests: confirmar que TODOS los tests pasan (GREEN)
    - _Requisitos: 3.8_

  - [~] 7.6 Escribir tests unitarios para `search.js` (RED)
    - Test: `getSearchSuggestions` retorna ≤8 resultados siempre
    - Test: normaliza mayúsculas y tildes en query (query "codigo" encuentra ítem con "código")
    - Test: retorna array vacío para query vacía
    - Ejecutar: confirmar que TODOS los tests fallan (RED)
    - _Requisitos: 3.1, 3.2, 3.3_

  - [~] 7.7 Escribir test de propiedad para `search.js` (RED — PBT)
    - **PBT — Máximo 8 resultados (Requisito 3.2)**
      - Tag: `// Feature: visual-agent-dashboard, Property Search: Máximo 8 Resultados`
      - 100 iteraciones: query aleatoria + catálogo aleatorio de 0–500 ítems → `getSearchSuggestions(query, catalog).length <= 8`
      - _Valida: Requisito 3.2_
    - Ejecutar: confirmar que TODOS los tests PBT fallan (RED)
    - _Requisitos: 3.2_

  - [~] 7.8 Implementar `scripts/dashboard/modules/search.js` (GREEN)
    - Implementar `initSearch(catalog)`: configura listener de teclado para `⌘K` / `Ctrl+K`; gestiona apertura/cierre del dropdown; mueve foco al campo de búsqueda; anuncia cambio mediante `aria-live="assertive"` (Requisito 6.4)
    - Implementar `getSearchSuggestions(query, catalog)`: normaliza query (lowercase + NFD + strip diacríticos); busca en nombre, descripción y keywords de agentes, skills y comandos; retorna ≤8 resultados con latencia ≤100ms
    - Usar debounce de 100ms en el input del usuario
    - Ejecutar tests: confirmar que TODOS los tests pasan (GREEN)
    - _Requisitos: 3.1, 3.2, 3.3, 6.4_

  - [~] 7.9 Verificar cobertura de módulos 7.x
    - Ejecutar `npm run coverage` — verificar ≥80% en `recently-viewed.js`, `theme.js`, `search.js`
    - Ejecutar tests: confirmar que TODOS los tests siguen pasando (REFACTOR)
    - _Requisitos: 9.7_

- [~] 8. Checkpoint 2 — Módulos de lógica completos
  - Ejecutar suite completa de tests: `npm test`
  - Ejecutar cobertura: `npm run coverage` — verificar ≥80% en `catalog-builder.js`, `recommendations.js`, `router.js`, `i18n.js`, `recently-viewed.js`, `search.js`
  - Asegurarse de que todos los tests pasan. Consultar al usuario si surgen preguntas.

- [ ] 9. Módulo `activity.js` y servidor refactorizado — TDD completo
  - [~] 9.1 Escribir tests unitarios para `activity.js` (RED)
    - Test: `startPolling(onUpdate)` llama a `onUpdate` con los datos recibidos del endpoint `/api/activity`
    - Test: el polling se repite cada 3000ms (verificar con `setTimeout` mocks)
    - Test: la función retornada por `startPolling` detiene el polling al ser invocada
    - Test: usa `requestAnimationFrame` para actualizaciones del DOM (mock de `window.requestAnimationFrame`)
    - Ejecutar: confirmar que TODOS los tests fallan (RED)
    - _Requisitos: 3.9, 7.8_

  - [~] 9.2 Implementar `scripts/dashboard/modules/activity.js` (GREEN)
    - Implementar `startPolling(onUpdate)`: fetch a `/api/activity` cada 3000ms; usar `requestAnimationFrame` para pasar datos al callback `onUpdate`; retornar función `stopPolling()`
    - Manejar errores de red sin interrumpir el ciclo de polling
    - Ejecutar tests: confirmar que TODOS los tests pasan (GREEN)
    - _Requisitos: 3.9, 7.8_

  - [~] 9.3 Escribir tests de integración para el servidor HTTP (RED)
    - Test: petición con `Host: 127.0.0.1` → HTTP 200 (aceptada)
    - Test: petición con `Host: evil.com` → HTTP 400 con cuerpo `"Forbidden host"` (Loopback_Guard)
    - Test: petición con `Origin: http://evil.com` → HTTP 403 con cuerpo `"Forbidden origin"`
    - Test: ruta con path traversal `../` → HTTP 400
    - Test: `GET /api/activity` → JSON `{entries: Array}` con status 200
    - Test: `GET /api/data` → JSON con estructura `CatalogData` (compatibilidad hacia atrás)
    - Test: `GET /catalog.json` → header `Cache-Control: no-cache, must-revalidate` presente
    - Test: headers de seguridad presentes en todas las respuestas (CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`)
    - Test: respuesta con gzip cuando cliente envía `Accept-Encoding: gzip`
    - Test: `ECC_DASHBOARD_HOST` no-loopback al inicio → proceso termina con mensaje `"[ECC] ECC_DASHBOARD_HOST must be loopback-only"`
    - Ejecutar: confirmar que TODOS los tests fallan (RED)
    - _Requisitos: 1.3, 1.4, 1.5, 1.6, 7.5, 7.6, 8.1, 8.2, 8.3, 8.7, 8.8_

  - [~] 9.4 Refactorizar `scripts/dashboard-web.js` (GREEN)
    - Eliminar el template string HTML/CSS/JS embebido del servidor actual
    - Implementar servidor de archivos estáticos: leer desde `scripts/dashboard/`; detectar Content-Type correcto por extensión (`.html`, `.css`, `.js`, `.json`, `.svg`, `.ico`)
    - Implementar middleware de gzip: comprimir respuestas de texto cuando el cliente envíe `Accept-Encoding: gzip`
    - Añadir headers de seguridad en todas las respuestas: `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
    - Validar `ECC_DASHBOARD_HOST` al arrancar: si no es loopback, terminar el proceso con error fatal
    - Rechazar path traversal con HTTP 400
    - SPA fallback: rutas no-estáticas y no-API → servir `index.html`
    - Mantener endpoints `/api/activity` y `/api/data` con misma signatura de respuesta
    - Ejecutar tests de integración: confirmar que TODOS los tests pasan (GREEN)
    - _Requisitos: 1.3, 1.4, 1.5, 1.6, 1.7, 7.5, 7.6, 8.1, 8.2, 8.3, 8.7, 8.8_

  - [~] 9.5 Verificar cobertura del servidor y módulo activity
    - Ejecutar `npm run coverage` — verificar ≥80% en `dashboard-web.js` (refactorizado) y `activity.js`
    - Ejecutar tests: confirmar que TODOS los tests siguen pasando (REFACTOR)
    - _Requisitos: 9.5, 9.7_

- [~] 10. Checkpoint 3 — Servidor y módulos de runtime completos
  - Ejecutar suite completa: `npm test`
  - Ejecutar cobertura: `npm run coverage` — verificar ≥80% en todos los módulos requeridos
  - Asegurarse de que todos los tests pasan. Consultar al usuario si surgen preguntas.

- [ ] 11. SPA — `index.html`, `styles.css` y `app.js`
  - [~] 11.1 Crear `scripts/dashboard/index.html`
    - Estructura HTML semántica: `<!DOCTYPE html>`, `<html lang>`, `<head>` con metadatos de charset/viewport/CSP, `<body>` con `<header>`, `<nav role="navigation">`, `<main role="main">`, `<footer>`
    - Enlace "Saltar al contenido principal" como primer elemento enfocable del DOM, visible solo al recibir foco del teclado (WCAG 2.2 AA — Requisito 6.7)
    - Región `aria-live="assertive"` para anuncios de cambios de foco
    - Región `aria-live="polite"` para anuncios de cambios de contenido dinámico
    - Stats Bar con `role="status"` en `<header>`
    - `<nav role="navigation">` con `role="tablist"` y tabs `role="tab"` para Agents, Skills, Commands, Rules, MCPs, Hooks, Activity
    - Campo de búsqueda `role="search"` con atributo `aria-label` localizado
    - Campo de recomendaciones con placeholder "¿Qué necesitas hacer?"
    - Skeleton loaders en `<main>` (placeholders animados) para la carga inicial del catálogo
    - Cargar `app.js` como módulo ES: `<script type="module" src="./app.js">`
    - _Requisitos: 1.10, 6.1, 6.7, 7.3, 7.4_

  - [~] 11.2 Crear `scripts/dashboard/styles.css`
    - Variables CSS para tokens de color: `--color-agents: #4F46E5`, `--color-skills: #059669`, `--color-hooks: #7C3AED`, `--color-commands: #D97706`
    - Implementar Tema_Oscuro y Tema_Claro con `@media (prefers-color-scheme: dark)` y selector `.theme-dark`/`.theme-light`
    - Cumplir ratio de contraste ≥4.5:1 para texto normal y ≥3:1 para texto grande (ambos temas — Requisito 6.5)
    - Indicador de foco visible con contraste ≥3:1 para navegación por teclado (Requisito 6.3)
    - Board_View: layout de columnas desplazables horizontalmente (≥1024px); layout de columna única apilada (<1024px)
    - Skeleton loaders: animación `shimmer` con placeholder gris
    - Animaciones y transiciones con `@media (prefers-reduced-motion: reduce)` que las deshabilita o las reduce a ≤50ms (Requisito 6.10)
    - Estilos para `.sr-only` (texto solo para lectores de pantalla)
    - _Requisitos: 2.1, 2.2, 2.3, 6.3, 6.5, 6.10, 7.4_

  - [~] 11.3 Crear `scripts/dashboard/app.js`
    - Importar todos los módulos via ES modules estáticos
    - Bootstrap: detectar idioma con `detectLanguage()`, inicializar tema con `initTheme()`, inicializar recently-viewed con `getItems()`
    - Mostrar skeleton loaders al iniciar
    - Fetch a `/catalog.json` con timeout de 5 segundos; en timeout o error HTTP mostrar mensaje con botón "Reintentar" (Requisito 7.7); en éxito, procesar JSON y renderizar Board_View
    - Inicializar router con `onRouteChange`; inicializar búsqueda con `initSearch(catalog)`
    - Exponer `AppState` como objeto inmutable en el módulo
    - Persistir `viewMode` en localStorage con clave `ecc_view_mode`
    - Persistir historial de búsqueda en localStorage con clave `ecc_search_history` (últimas 5 consultas)
    - _Requisitos: 1.7, 2.9, 3.5, 3.8, 3.10, 5.10, 7.3, 7.4, 7.7_

- [ ] 12. SPA — Board View, Tarjetas y agrupamiento
  - [~] 12.1 Implementar renderizado del Board View
    - Función `renderBoardView(type)`: genera columnas con `<section>` por categoría/tipo; usa `<article>` para cada Tarjeta; encabezado de columna con conteo de tarjetas (Propiedad 6)
    - Agrupar agentes por `type` (reviewer, builder, architect, security, otros)
    - Agrupar skills por `category` (campo frontmatter; fallback → "General")
    - Agrupar comandos por prefijo `group` (git-*, test-*, review-*, otros → "General")
    - Renderizar tarjeta con: nombre, `shortDescription` (truncado 120 chars), badge de categoría con color por tipo, indicador de idiomas disponibles
    - Ocultar columnas vacías cuando se aplica filtro de categoría
    - Stats Bar: actualizar conteos totales al cargar catálogo
    - Toda inserción de texto del catálogo al DOM mediante `textContent` (nunca `innerHTML` con datos — Requisito 8.4)
    - Escapes HTML para bloques de código: `<`, `>`, `&`, `"`, `'` (Requisito 8.5)
    - _Requisitos: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 2.8, 2.10, 8.4, 8.5_

  - [~] 12.2 Implementar Vista de Detalle
    - Función `renderDetailView(type, id)`: renderiza secciones en orden: nombre + identificador, descripción larga, badges de categoría y modelo (agentes), lista de herramientas (agentes), Sección_HowTo
    - Breadcrumb de navegación con enlace de un clic al Board_View del tipo correspondiente
    - Sección_HowTo: encabezado localizado `t('howto', lang)`, ejemplos de uso extraídos del `body` del ítem
    - Para agentes: mostrar patrón de invocación `ecc:<nombre>` con explicación no técnica
    - Para agentes: mostrar número de skills y comandos relacionados con enlaces directos
    - Para skills: mostrar lista de agentes compatibles con enlaces a sus Vistas_de_Detalle
    - Bloques de código con resaltado de sintaxis (escapado HTML) y botón "Copiar" que usa `navigator.clipboard.writeText`; feedback visual "¡Copiado!" por 2 segundos; fallback "No disponible" si `navigator.clipboard` no disponible
    - Renderizar panel de error 404 si el ítem solicitado no existe en el catálogo
    - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [~] 12.3 Implementar panel de Recomendaciones
    - Campo "¿Qué necesitas hacer?" con debounce de 300ms
    - Llamar a `recommend(query, catalog)` cuando query ≥ 3 chars y han pasado 300ms sin escritura
    - Renderizar panel con Tarjetas de resultados: nombre, badge de tipo, descripción corta, barra de progreso con score
    - Mostrar "No encontramos herramientas para esa tarea. Intenta con otras palabras." cuando resultados vacíos
    - Navegar a Vista_de_Detalle al hacer clic en resultado
    - Mostrar historial de las últimas 5 consultas como sugerencias rápidas cuando el campo está vacío y enfocado
    - _Requisitos: 5.1, 5.4, 5.5, 5.7, 5.10_

  - [~] 12.4 Implementar accesibilidad ARIA completa
    - Asignar `role="tablist"`, `role="tab"`, `role="tabpanel"` a los controles de navegación; actualizar `aria-selected` al cambiar de tab
    - `aria-label` descriptivo para todos los elementos interactivos: botones, enlaces, filtros, selector de idioma, toggle de tema
    - Trampa de foco en modales/paneles superpuestos: foco vuelve al elemento disparador al cerrar
    - `aria-hidden="true"` en iconos SVG decorativos; `aria-label` o `<span class="sr-only">` para iconos funcionales
    - Actualizar `aria-live="polite"` al cambiar el Activity_Feed, resultados de búsqueda y tab activo
    - Usar elementos HTML semánticos nativos (`<button>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<h1>`–`<h4>`) en lugar de `<div>` con roles ARIA cuando el elemento nativo esté disponible
    - Verificar orden de tabulación (Tab, Shift+Tab) correcto en Board_View con `tabindex` apropiados
    - _Requisitos: 6.1, 6.2, 6.3, 6.6, 6.8, 6.9, 6.11_

- [~] 13. Checkpoint 4 — SPA funcional completa
  - Ejecutar suite completa: `npm test`
  - Ejecutar cobertura: `npm run coverage` — verificar ≥80% en todos los módulos
  - Iniciar el servidor manualmente con `node scripts/dashboard-web.js` y verificar en el navegador: Board_View renderiza tarjetas, búsqueda ⌘K/Ctrl+K funciona, toggle de tema persiste, switch de idioma a español funciona
  - Asegurarse de que todos los tests pasan. Consultar al usuario si surgen preguntas.

- [ ] 14. Tests de integración del servidor y tests E2E
  - [~] 14.1 Completar `tests/dashboard/server-integration.test.js`
    - Verificar que ya cubren los casos de 9.3 (Loopback_Guard, path traversal, security headers, gzip)
    - Añadir: `GET /` → status 200 + `Content-Type: text/html`
    - Añadir: `GET /app.js` → status 200 + `Content-Type: application/javascript`
    - Añadir: `GET /modules/router.js` → status 200
    - Añadir: `GET /ruta-desconocida` → status 200 + `Content-Type: text/html` (SPA fallback)
    - Ejecutar: confirmar que TODOS los tests pasan
    - _Requisitos: 1.3, 1.5, 9.5_

  - [~] 14.2 Crear `tests/dashboard/e2e-flows.test.js` (flujos E2E con HTTP real)
    - **Flujo 1:** Carga inicial → skeleton visible → Board_View con tarjetas renderizadas (verificar que el HTML contiene elementos `.card`)
    - **Flujo 2:** Búsqueda — `GET /?q=review` → dropdown con ≤8 resultados; navegar al primer resultado actualiza el hash
    - **Flujo 3:** Navegación → `GET /#/agents/code-reviewer` → Vista_de_Detalle con breadcrumb presente; clic en breadcrumb → `#/agents` en hash
    - **Flujo 4:** Toggle dark/light mode → clase CSS `theme-dark`/`theme-light` aplicada en `<html>` → `localStorage.ecc_theme` preserva la preferencia
    - **Flujo 5:** Cambio de idioma a español → textos de UI en español → `localStorage.ecc_dashboard_lang === 'es'`
    - Ejecutar: confirmar que TODOS los flujos E2E pasan
    - _Requisitos: 9.6_

- [~] 15. Checkpoint final — Cobertura y calidad completa
  - Ejecutar suite completa: `npm test`
  - Ejecutar cobertura: `npm run coverage` — verificar ≥80% en todos los módulos requeridos: `catalog-builder.js`, `recommendations.js`, `router.js`, `search.js`, `i18n.js`, `recently-viewed.js`, `dashboard-web.js`
  - Revisar que todas las propiedades PBT tienen su tag correcto: `// Feature: visual-agent-dashboard, Property N: <descripción>`
  - Verificar que no hay `innerHTML` con contenido del catálogo sin escapar
  - Verificar que no hay hardcoded secrets ni valores de env vars expuestos
  - Asegurarse de que todos los tests pasan. Consultar al usuario si surgen preguntas.

---

## Notas

- El flujo TDD es obligatorio: cada tarea de implementación tiene su tarea de tests previa en el mismo número de épica
- Las tareas de PBT son parte del ciclo de desarrollo, no opcionales — el proyecto requiere ≥80% de cobertura
- Los módulos `scripts/lib/loopback-guard.js`, `scripts/lib/agent-tools.js`, `scripts/lib/hooks-config.js` y `scripts/lib/utils.js` no se modifican
- `scripts/dashboard-web.js` se refactoriza (no se reemplaza); el archivo existente es el punto de partida
- Toda inserción de datos del catálogo en el DOM usa `textContent` o atributos escapados — nunca `innerHTML` directo con contenido no escapado
- Las propiedades PBT usan loops manuales de 100 iteraciones con `node:test` — sin dependencias externas como `fast-check`
- Los checkpoints intermedios permiten verificar el progreso incremental antes de continuar con la siguiente capa
- Cada módulo debe mantenerse en <800 líneas; extraer utilidades si es necesario

## Grafo de Dependencias de Tareas

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3"] },
    { "id": 3, "tasks": ["2.4", "4.1", "4.2", "5.1", "6.1", "6.2", "7.1", "7.2", "7.4", "7.6", "7.7", "9.1"] },
    { "id": 4, "tasks": ["4.3", "5.2", "6.3", "7.3", "7.5", "7.8", "9.2"] },
    { "id": 5, "tasks": ["4.4", "5.3", "6.4", "7.9", "9.3"] },
    { "id": 6, "tasks": ["9.4"] },
    { "id": 7, "tasks": ["9.5", "11.1", "11.2"] },
    { "id": 8, "tasks": ["11.3"] },
    { "id": 9, "tasks": ["12.1", "12.2", "12.3"] },
    { "id": 10, "tasks": ["12.4"] },
    { "id": 11, "tasks": ["14.1", "14.2"] }
  ]
}
```

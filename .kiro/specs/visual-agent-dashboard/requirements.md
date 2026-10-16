# Documento de Requisitos

## Introducción

El Dashboard Visual de Agentes (Visual Agent Dashboard) es una mejora integral del servidor `scripts/dashboard-web.js` existente. El sistema sirve actualmente como un panel de exploración local que expone 71 agentes, 311 skills, 97 comandos, reglas, MCPs y hooks a través de una SPA vanilla JS embebida en un template string.

El objetivo de esta iteración es triple:

1. **Refactorizar la arquitectura** separando el HTML/CSS/JS del servidor Node.js en archivos independientes bajo `scripts/dashboard/`, mejorando la mantenibilidad y aplicando el principio de archivos pequeños y cohesivos del proyecto.
2. **Rediseñar la interfaz** hacia un tablero visual tipo Trello con tarjetas organizadas por categoría, accesible a usuarios sin conocimientos técnicos.
3. **Añadir funcionalidades clave** ausentes: sistema de recomendaciones por keywords, sección "Cómo usarlo" con lenguaje no técnico, accesibilidad WCAG 2.2 AA y rendimiento Lighthouse ≥85/≥90.

El servidor sigue siendo exclusivamente loopback (`127.0.0.1:3456`) sin autenticación, por diseño. Todas las medidas de seguridad existentes (validación Host header, enmascarado de secrets en MCPs, validación de origen) se preservan y refuerzan.

---

## Glosario

- **Dashboard**: La aplicación web completa servida en `http://127.0.0.1:3456`.
- **Servidor**: El proceso Node.js que gestiona los endpoints HTTP y sirve los archivos estáticos del Dashboard.
- **SPA**: Single Page Application. La interfaz de usuario client-side que corre en el navegador.
- **Board_View**: Vista de tablero estilo Trello, con columnas por categoría y tarjetas por ítem.
- **Tarjeta**: Componente visual que representa un agente, skill, comando, hook o MCP.
- **Columna**: Agrupación vertical de Tarjetas dentro del Board_View, identificada por categoría.
- **Motor_de_Recomendaciones**: Módulo client-side que, dado un texto de consulta, devuelve ítems relevantes ordenados por puntuación de relevancia.
- **Vista_de_Detalle**: Panel o página que muestra la información completa de un ítem individual.
- **Sección_HowTo**: Bloque dentro de la Vista_de_Detalle con instrucciones en lenguaje no técnico sobre cómo usar el ítem.
- **Catálogo**: Conjunto completo de agentes, skills, comandos, reglas, MCPs y hooks disponibles.
- **Catalog_Builder**: Script de build que lee los archivos fuente y genera `catalog.json`.
- **catalog.json**: Archivo estático que contiene todos los datos del Catálogo, generado en tiempo de build.
- **Recently_Viewed**: Lista de hasta 8 ítems visitados recientemente, persistida en localStorage.
- **Activity_Feed**: Flujo de actividad en tiempo real con polling cada 3 segundos al endpoint `/api/activity`.
- **Stats_Bar**: Barra superior que muestra conteos totales por tipo de ítem.
- **Hash_Routing**: Navegación client-side mediante fragmentos de URL (`#/agents/<n>`, `#/skills/<n>`, etc.).
- **Tema_Oscuro**: Preferencia de color oscuro del Dashboard, persistida en localStorage.
- **Tema_Claro**: Preferencia de color claro del Dashboard, persistida en localStorage.
- **Multi_idioma**: Soporte de 12 idiomas (en, pt, zh, zht, ja, ko, tr, ru, vi, th, de, es).
- **WCAG_2.2_AA**: Web Content Accessibility Guidelines versión 2.2 nivel AA.
- **Lighthouse**: Herramienta de auditoría de rendimiento y accesibilidad de Google Chrome.
- **Loopback_Guard**: Módulo `scripts/lib/loopback-guard.js` que valida Host header y Origin para prevenir DNS rebinding.
- **Suite_de_Tests**: Conjunto de tests unitarios, de integración y E2E del Dashboard.

---

## Requisitos

---

### Requisito 1: Refactoring de Arquitectura — Separación de Responsabilidades

**Historia de usuario:** Como desarrollador que mantiene el proyecto, quiero que el HTML, CSS y JavaScript del Dashboard estén en archivos separados bajo `scripts/dashboard/`, para poder editar cada capa de forma independiente sin navegar un template string de 1000+ líneas.

#### Criterios de Aceptación

1. THE Catalog_Builder SHALL leer todos los archivos `agents/*.md`, `skills/*/SKILL.md`, `commands/*.md`, `rules/*.md`, `mcp-configs/*.json` y `hooks/*.json` y generar el archivo `scripts/dashboard/catalog.json` con el Catálogo completo serializado.

2. WHEN un archivo fuente del Catálogo es modificado y el Catalog_Builder es ejecutado, THE Catalog_Builder SHALL regenerar `catalog.json` reflejando los cambios sin requerir reinicio del Servidor.

3. THE Servidor SHALL servir los archivos estáticos contenidos en `scripts/dashboard/` (HTML, CSS, JS, catalog.json) con los Content-Type headers correctos por extensión de archivo.

4. THE Servidor SHALL mantener los endpoints `/api/activity` y `/api/data` con las mismas signaturas de respuesta que el sistema actual, preservando compatibilidad hacia atrás.

5. WHEN el Servidor recibe una petición a cualquier ruta que no sea un endpoint de API ni un archivo estático conocido, THE Servidor SHALL responder con el archivo `scripts/dashboard/index.html` para soportar el Hash_Routing client-side.

6. THE Servidor SHALL preservar íntegramente el Loopback_Guard, rechazando peticiones con Host headers fuera de la lista de loopback permitidos con HTTP 400.

7. WHEN el Catálogo es cargado por la SPA en el navegador, THE SPA SHALL leer `catalog.json` vía fetch a `/catalog.json` y construir el estado de la aplicación en memoria, sin realizar lecturas de sistema de archivos en runtime.

8. THE Servidor SHALL mantener el enmascarado de valores de variables de entorno en las respuestas de MCPs, reemplazando cualquier valor que coincida con el patrón `${...}` o `process.env.*` por la cadena `"[env]"`.

9. IF un archivo fuente del Catálogo contiene frontmatter YAML malformado, THEN THE Catalog_Builder SHALL emitir un `console.warn` con el nombre del archivo afectado y continuar procesando los archivos restantes sin abortar la generación del Catálogo.

10. THE Dashboard SHALL estar organizado en la siguiente estructura de archivos bajo `scripts/dashboard/`: `index.html`, `app.js`, `styles.css`, `catalog.json` (generado), y un subdirectorio `modules/` que contenga `router.js`, `search.js`, `recommendations.js`, `i18n.js`, `theme.js`, `recently-viewed.js` y `activity.js`.

---

### Requisito 2: Rediseño Visual — Board View Tipo Trello

**Historia de usuario:** Como usuario no técnico, quiero ver los agentes, skills y comandos organizados en un tablero con columnas por categoría y tarjetas visuales, para entender de un vistazo qué herramientas existen y para qué sirven.

#### Criterios de Aceptación

1. WHEN el Dashboard es cargado en un viewport de ancho ≥ 1024px, THE SPA SHALL renderizar la vista principal como un Board_View con Columnas horizontales desplazables, donde cada Columna corresponde a una categoría del tipo de ítem activo.

2. WHEN el Dashboard es cargado en un viewport de ancho < 1024px, THE SPA SHALL renderizar el Board_View como un layout de una sola columna con Tarjetas apiladas verticalmente, manteniendo la información visible sin scroll horizontal.

3. THE SPA SHALL renderizar cada Tarjeta con los siguientes elementos visibles sin expandir: nombre del ítem, descripción corta (máximo 120 caracteres con truncado elíptico), badge de categoría con color por tipo (Agentes: #4F46E5 índigo, Skills: #059669 esmeralda, Hooks: #7C3AED violeta, Comandos: #D97706 ámbar), e indicador de idiomas disponibles cuando aplique.

4. WHEN el usuario hace clic en una Tarjeta, THE SPA SHALL navegar a la Vista_de_Detalle del ítem correspondiente actualizando el Hash_Routing.

5. THE SPA SHALL mantener la Stats_Bar visible en la parte superior del Board_View mostrando los conteos totales de agentes, skills, comandos, reglas, MCPs y hooks.

6. WHERE el tab activo es "Agents", THE SPA SHALL organizar las Tarjetas en Columnas por el tipo de agente: `reviewer`, `builder`, `architect`, `security`, y una columna "Otros" para tipos no clasificados.

7. WHERE el tab activo es "Skills", THE SPA SHALL organizar las Tarjetas en Columnas por la categoría extraída del frontmatter `category` del SKILL.md; WHEN una skill no tiene categoría definida, THE SPA SHALL ubicarla en la Columna "General".

8. WHERE el tab activo es "Commands", THE SPA SHALL organizar las Tarjetas en Columnas por prefijo de nombre de comando (ej. `git-*`, `test-*`, `review-*`); WHEN un comando no coincide con ningún prefijo conocido, THE SPA SHALL ubicarlo en la Columna "General".

9. THE SPA SHALL permitir al usuario alternar entre Board_View y List View mediante un control de vista persistiendo la preferencia en localStorage con la clave `ecc_view_mode`.

10. WHEN el usuario aplica un filtro de categoría, THE SPA SHALL actualizar el Board_View ocultando las Columnas vacías y mostrando únicamente las Tarjetas que coincidan con el filtro activo.

---

### Requisito 3: Preservación y Mejora de Funcionalidades Existentes

**Historia de usuario:** Como usuario habitual del Dashboard actual, quiero que todas las funcionalidades que ya uso (búsqueda ⌘K, filtros, multi-idioma, recently viewed, dark mode, MCPs, hooks, activity feed) continúen funcionando en el nuevo diseño, para no perder productividad durante la transición.

#### Criterios de Aceptación

1. WHEN el usuario activa la búsqueda mediante el atajo de teclado `⌘K` (macOS) o `Ctrl+K` (Windows/Linux), THE SPA SHALL mostrar el campo de búsqueda con un dropdown de sugerencias que incluya ítems de agentes, skills y comandos.

2. WHILE el usuario escribe en el campo de búsqueda, THE SPA SHALL actualizar las sugerencias del dropdown en tiempo real con latencia máxima de 100ms desde la última pulsación de tecla, mostrando máximo 8 resultados.

3. WHEN el usuario selecciona un resultado del dropdown o pulsa Enter sobre el primero, THE SPA SHALL navegar a la Vista_de_Detalle del ítem seleccionado.

4. THE SPA SHALL soportar los 12 idiomas del Multi_idioma (en, pt, zh, zht, ja, ko, tr, ru, vi, th, de, es), aplicando el idioma seleccionado a todos los textos de la interfaz mediante el módulo `i18n.js`.

5. WHEN el usuario cambia el idioma en el selector, THE SPA SHALL persistir la preferencia en localStorage con la clave `ecc_dashboard_lang` y aplicarla en el próximo inicio sin requerir recarga manual.

6. THE SPA SHALL mantener la lista de Recently_Viewed con hasta 8 ítems, persistida en localStorage con la clave `ecc_recently_viewed`, mostrándola en una sección accesible desde la navegación principal.

7. WHEN el usuario visita la Vista_de_Detalle de un ítem, THE SPA SHALL agregar ese ítem al inicio de la lista Recently_Viewed, eliminando duplicados y truncando la lista a 8 ítems máximo.

8. THE SPA SHALL soportar el toggle de Tema_Oscuro/Tema_Claro mediante el botón en la barra de navegación, persistiendo la preferencia en localStorage con la clave `ecc_theme` y respetando `prefers-color-scheme` del sistema operativo como valor por defecto cuando no exista preferencia guardada.

9. WHILE el tab "Activity" está activo, THE SPA SHALL realizar polling al endpoint `/api/activity` cada 3 segundos y actualizar el Activity_Feed en el DOM sin recargar la página completa.

10. WHERE el tab activo es "MCPs", THE SPA SHALL mostrar la configuración de cada MCP con los valores de variables de entorno enmascarados como `[env]`, sin exponer nunca los valores reales en el DOM.

11. WHERE el tab activo es "Hooks", THE SPA SHALL mostrar cada hook con su nombre, descripción, evento disparador y acción configurada, con soporte para navegación directa vía Hash_Routing `#/hooks/<id>`.

12. THE SPA SHALL implementar Hash_Routing client-side respondiendo a cambios en `window.location.hash` para las rutas `#/agents/<nombre>`, `#/skills/<nombre>`, `#/commands/<nombre>`, `#/rules/<idioma>`, `#/mcps/<archivo>` y `#/hooks/<id>`.

---

### Requisito 4: Vista de Detalle Mejorada con Sección "Cómo Usarlo"

**Historia de usuario:** Como usuario sin conocimientos técnicos, quiero que al hacer clic en un agente o skill vea una página de detalle clara con una sección "Cómo usarlo" escrita en lenguaje simple, para entender para qué sirve y cómo activarlo sin necesidad de leer documentación técnica.

#### Criterios de Aceptación

1. WHEN el usuario navega a la Vista_de_Detalle de un ítem, THE SPA SHALL renderizar el panel de detalle con las siguientes secciones en orden: nombre completo e identificador, descripción larga, badges de categoría y modelo (para agentes), lista de herramientas disponibles (para agentes), y la Sección_HowTo.

2. THE SPA SHALL renderizar la Sección_HowTo con el encabezado "Cómo usarlo" (localizado según el idioma activo) seguido de al menos 3 ejemplos de uso concretos extraídos del cuerpo del archivo fuente del ítem cuando estén disponibles.

3. WHERE el archivo fuente del ítem contiene ejemplos de código (bloques delimitados por triple backtick), THE SPA SHALL renderizar dichos bloques con resaltado de sintaxis y un botón "Copiar" que copie el contenido al portapapeles del usuario.

4. WHEN el usuario hace clic en el botón "Copiar" de un bloque de código, THE SPA SHALL copiar el texto al portapapeles y mostrar retroalimentación visual ("¡Copiado!") en el mismo botón durante 2 segundos antes de restaurar el texto original.

5. THE SPA SHALL mostrar en la Vista_de_Detalle de cada agente el número de skills y comandos relacionados disponibles, con enlaces directos a cada uno de ellos.

6. THE SPA SHALL incluir en la Vista_de_Detalle un breadcrumb de navegación que permita al usuario regresar al Board_View del tipo de ítem correspondiente con un solo clic.

7. WHERE el ítem es un agente, THE SPA SHALL renderizar en la Sección_HowTo el patrón de invocación recomendado en formato `ecc:<nombre-agente>`, con explicación en lenguaje no técnico de cuándo usarlo.

8. WHERE el ítem es una skill, THE SPA SHALL renderizar en la Vista_de_Detalle el listado de agentes compatibles con esa skill, con enlaces a sus respectivas Vistas_de_Detalle.

9. IF el ítem solicitado vía Hash_Routing no existe en el Catálogo, THEN THE SPA SHALL mostrar un panel de error amigable con el mensaje "Este ítem no fue encontrado" y un enlace de regreso al Board_View principal.

---

### Requisito 5: Sistema de Recomendaciones Client-Side

**Historia de usuario:** Como usuario no técnico, quiero escribir una descripción de la tarea que quiero realizar (por ejemplo, "revisar código Python" o "hacer deploy") y recibir sugerencias de qué agentes, skills o comandos son más relevantes para esa tarea, para no tener que explorar manualmente el catálogo completo.

#### Criterios de Aceptación

1. THE SPA SHALL exponer un campo de texto en la barra de navegación principal con el placeholder "¿Qué necesitas hacer?" (localizado según idioma activo) que activa el Motor_de_Recomendaciones.

2. WHEN el usuario ingresa una consulta de al menos 3 caracteres y no escribe durante 300ms, THE Motor_de_Recomendaciones SHALL calcular puntuaciones de relevancia para todos los ítems del Catálogo comparando la consulta contra el nombre, descripción y keywords de cada ítem, usando coincidencia de tokens con normalización de mayúsculas y tildes.

3. THE Motor_de_Recomendaciones SHALL devolver los 10 ítems con mayor puntuación de relevancia, ordenados de mayor a menor puntuación, incluyendo el tipo de ítem (agente, skill, comando) y la puntuación calculada.

4. THE SPA SHALL renderizar los resultados del Motor_de_Recomendaciones en un panel con Tarjetas, mostrando el nombre del ítem, su tipo con badge de color correspondiente, la descripción corta, y la puntuación de relevancia como barra de progreso visual.

5. WHEN la consulta no produce ningún ítem con puntuación mayor a 0, THE SPA SHALL mostrar el mensaje "No encontramos herramientas para esa tarea. Intenta con otras palabras." en lugar de una lista vacía.

6. THE Motor_de_Recomendaciones SHALL operar exclusivamente en memoria del navegador usando el `catalog.json` ya cargado, sin realizar peticiones de red adicionales durante el cálculo.

7. WHEN el usuario hace clic en un resultado del panel de recomendaciones, THE SPA SHALL navegar a la Vista_de_Detalle del ítem correspondiente actualizando el Hash_Routing.

8. THE Motor_de_Recomendaciones SHALL ponderar las coincidencias en el nombre del ítem con factor 3x, las coincidencias en keywords con factor 2x, y las coincidencias en la descripción con factor 1x, para priorizar ítems específicos sobre ítems con menciones incidentales.

9. FOR ALL consultas de texto válidas (mínimo 3 caracteres, hasta 200 caracteres), THE Motor_de_Recomendaciones SHALL producir resultados en ≤ 50ms medidos en un catálogo de hasta 500 ítems en hardware de desarrollo estándar.

10. THE SPA SHALL preservar el historial de las últimas 5 consultas del Motor_de_Recomendaciones en localStorage con la clave `ecc_search_history` y mostrarlas como sugerencias rápidas cuando el campo está vacío y enfocado.

---

### Requisito 6: Accesibilidad WCAG 2.2 AA

**Historia de usuario:** Como usuario con necesidades de accesibilidad, quiero poder usar el Dashboard con un lector de pantalla, navegación por teclado y alto contraste, para acceder a toda la información sin barreras.

#### Criterios de Aceptación

1. THE SPA SHALL asignar roles ARIA semánticos a todos los componentes estructurales: `role="main"` al contenido principal, `role="navigation"` a la barra de tabs, `role="search"` al formulario de búsqueda, `role="tablist"` y `role="tab"` a los tabs de navegación, y `role="tabpanel"` a cada panel de contenido activo.

2. THE SPA SHALL proporcionar un atributo `aria-label` descriptivo para cada elemento interactivo (botones, enlaces, controles de filtro, selector de idioma, toggle de tema) de forma que un lector de pantalla identifique su propósito sin contexto visual adicional.

3. WHEN el usuario navega por el Board_View usando únicamente el teclado (Tab, Shift+Tab, Enter, Escape, teclas de flecha), THE SPA SHALL mantener el indicador de foco visible en todo momento con contraste mínimo 3:1 respecto al fondo circundante.

4. WHEN el usuario activa la búsqueda mediante `⌘K` o `Ctrl+K`, THE SPA SHALL mover el foco del teclado al campo de búsqueda y anunciar el cambio al lector de pantalla mediante una región `aria-live="assertive"`.

5. THE SPA SHALL mantener una relación de contraste de color de al menos 4.5:1 entre el texto y el fondo para texto de tamaño normal, y de al menos 3:1 para texto grande (≥ 18pt o ≥ 14pt negrita), tanto en Tema_Oscuro como en Tema_Claro.

6. WHEN se producen cambios dinámicos en el contenido (actualización del Activity_Feed, resultados de búsqueda, cambio de tab activo), THE SPA SHALL anunciar el cambio mediante regiones `aria-live="polite"` para evitar interrupciones al usuario.

7. THE SPA SHALL incluir un enlace "Saltar al contenido principal" como primer elemento enfocable del DOM, visible únicamente cuando recibe el foco del teclado, que posicione el foco directamente en el área del Board_View.

8. WHEN un modal o panel superpuesto es abierto (búsqueda, filtros, detalle), THE SPA SHALL atrapar el foco dentro del componente abierto y devolver el foco al elemento disparador cuando el componente es cerrado.

9. THE SPA SHALL aplicar `aria-hidden="true"` a todos los iconos SVG decorativos y proporcionar `aria-label` o `<span class="sr-only">` con texto descriptivo para todos los iconos funcionales.

10. WHILE el sistema operativo del usuario tiene activa la preferencia `prefers-reduced-motion: reduce`, THE SPA SHALL deshabilitar o reducir a duración ≤ 50ms todas las animaciones CSS y transiciones de la interfaz no esenciales para la comprensión del contenido.

11. THE SPA SHALL usar elementos HTML semánticos nativos (`<button>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<h1>` a `<h4>`) en lugar de `<div>` con roles ARIA cuando el elemento nativo esté disponible, maximizando la compatibilidad con tecnologías asistivas.

---

### Requisito 7: Rendimiento — Lighthouse ≥ 85 Performance, ≥ 90 Accessibility

**Historia de usuario:** Como usuario en condiciones de hardware limitado, quiero que el Dashboard cargue rápidamente, para no esperar más de 3 segundos antes de poder explorar el catálogo.

#### Criterios de Aceptación

1. THE Dashboard SHALL alcanzar una puntuación Lighthouse Performance ≥ 85 y Lighthouse Accessibility ≥ 90 cuando se audita desde `http://127.0.0.1:3456` con configuración de escritorio sin throttling de red artificial.

2. WHEN la SPA es cargada por primera vez sin cache, THE SPA SHALL completar el First Contentful Paint (FCP) en ≤ 1.5 segundos y el Time to Interactive (TTI) en ≤ 3 segundos en hardware de desarrollo estándar.

3. THE SPA SHALL diferir la carga del `catalog.json` mediante fetch asíncrono después del primer renderizado del esqueleto de la UI, de forma que la estructura del Dashboard sea visible antes de que los datos del Catálogo estén disponibles.

4. WHILE el `catalog.json` está siendo cargado, THE SPA SHALL mostrar indicadores de carga skeleton (placeholders animados) en el área del Board_View para comunicar visualmente que el contenido está en proceso de carga.

5. THE Servidor SHALL servir el archivo `catalog.json` con el header `Cache-Control: no-cache, must-revalidate` para garantizar que el navegador verifique cambios antes de usar la copia en cache.

6. THE Servidor SHALL comprimir las respuestas de texto (HTML, CSS, JS, JSON) con gzip cuando el header `Accept-Encoding` del cliente lo soporte.

7. IF la petición fetch a `/catalog.json` no recibe respuesta en 5 segundos, THEN THE SPA SHALL mostrar el mensaje "No se pudo cargar el catálogo. Recarga la página." con un botón de reintento visible.

8. THE SPA SHALL usar `requestAnimationFrame` para todas las actualizaciones del DOM que ocurran durante el polling del Activity_Feed, evitando reflows innecesarios durante el ciclo de renderizado del navegador.

---

### Requisito 8: Seguridad — Preservación y Refuerzo de Controles Existentes

**Historia de usuario:** Como administrador del sistema, quiero que el Dashboard mantenga y mejore los controles de seguridad existentes contra DNS rebinding, XSS y exposición de secrets, para que el acceso local siga siendo seguro aunque el Dashboard sirva archivos estáticos.

#### Criterios de Aceptación

1. THE Servidor SHALL validar el header `Host` de cada petición HTTP entrante usando el Loopback_Guard, respondiendo con HTTP 400 y cuerpo `"Forbidden host"` para cualquier valor fuera de la lista de loopback permitidos (`127.0.0.1`, `localhost`, `::1`, `[::1]`).

2. WHEN el Servidor recibe una petición con header `Origin` presente, THE Servidor SHALL validar que el Origin pertenezca a la lista de orígenes loopback permitidos; IF el Origin no está permitido, THEN THE Servidor SHALL responder con HTTP 403.

3. THE Servidor SHALL incluir los siguientes headers de seguridad en todas las respuestas HTTP: `Content-Security-Policy` restringiendo `default-src`, `script-src`, `style-src`, `img-src` y `connect-src` al origen `'self'`; `X-Content-Type-Options: nosniff`; y `X-Frame-Options: DENY`.

4. THE SPA SHALL sanitizar todo el contenido textual proveniente del `catalog.json` antes de insertarlo en el DOM mediante la propiedad `textContent` o equivalente seguro, nunca mediante `innerHTML` directo con contenido no escapado.

5. WHERE el SPA renderiza bloques de código de los archivos fuente, THE SPA SHALL escapar los caracteres especiales HTML (`<`, `>`, `&`, `"`, `'`) antes de insertar el contenido en el DOM.

6. THE Catalog_Builder SHALL enmascarar en el `catalog.json` generado cualquier valor de configuración de MCPs que coincida con los patrones de variables de entorno (`${NOMBRE}`, `process.env.NOMBRE`) sustituyéndolo por la cadena `"[env]"`.

7. IF el Servidor detecta que el proceso es iniciado con un valor de `ECC_DASHBOARD_HOST` que no es loopback, THEN THE Servidor SHALL terminar el proceso con un error fatal que contenga el mensaje `"[ECC] ECC_DASHBOARD_HOST must be loopback-only"` antes de iniciar el servidor HTTP.

8. THE Servidor SHALL rechazar peticiones a rutas de archivos estáticos que contengan secuencias de traversal de directorios (`../`, `..\`) respondiendo con HTTP 400.

---

### Requisito 9: Testabilidad — Cobertura Mínima 80%

**Historia de usuario:** Como desarrollador que contribuye al proyecto, quiero que el código del Dashboard tenga tests unitarios e integración con cobertura ≥ 80%, para poder refactorizar y añadir funcionalidades con confianza de que no rompo nada existente.

#### Criterios de Aceptación

1. THE Catalog_Builder SHALL tener tests unitarios que cubran: parseo correcto de frontmatter YAML válido, manejo de frontmatter malformado sin abortar la ejecución, enmascarado de variables de entorno en configuraciones de MCPs, y correcta serialización del resultado a JSON.

2. THE Motor_de_Recomendaciones SHALL tener tests unitarios que cubran: que consultas vacías devuelven array vacío, que la ponderación de nombre (3x) supera a descripción (1x) para el mismo término, y que los resultados están ordenados de mayor a menor puntuación.

3. FOR ALL funciones puras del Motor_de_Recomendaciones que transforman una consulta en resultados, THE Suite_de_Tests SHALL verificar la propiedad de idempotencia: aplicar el Motor_de_Recomendaciones dos veces consecutivas sobre la misma consulta y el mismo Catálogo produce resultados idénticos en contenido y orden.

4. THE módulo `router.js` SHALL tener tests unitarios que cubran: que cada ruta Hash conocida resuelve al componente correcto, y que rutas desconocidas disparan la renderización del panel de error 404.

5. THE Loopback_Guard SHALL tener tests de integración que cubran: que peticiones con Host `127.0.0.1` son aceptadas, que peticiones con Host externo son rechazadas con HTTP 400, y que peticiones con Origin externo son rechazadas con HTTP 403.

6. THE Dashboard SHALL tener tests E2E que cubran los flujos críticos: carga inicial y renderizado del Board_View, búsqueda con atajo de teclado y navegación al primer resultado, navegación a Vista_de_Detalle y regreso al tablero, y toggle de Tema_Oscuro/Tema_Claro con verificación de persistencia en localStorage.

7. THE Suite_de_Tests SHALL alcanzar cobertura de líneas ≥ 80% sobre los módulos `catalog-builder.js`, `recommendations.js`, `router.js`, `search.js` e `i18n.js`, medida con la herramienta de cobertura nativa del runner de tests del proyecto.

8. WHEN el Catalog_Builder procesa un Catálogo con N ítems válidos y M ítems con frontmatter malformado (donde M > 0), THE Catalog_Builder SHALL producir exactamente N ítems en el `catalog.json` resultante y emitir exactamente M advertencias `console.warn`, verificable mediante tests unitarios con mocks del sistema de archivos.

---

### Requisito 10: Internacionalización Completa con Soporte de Español

**Historia de usuario:** Como usuario hispanohablante, quiero que el español esté disponible como idioma nativo del Dashboard, para poder usar la interfaz completamente en mi idioma sin cambiar a inglés para leer etiquetas o instrucciones.

#### Criterios de Aceptación

1. THE módulo `i18n.js` SHALL incluir un bundle de traducciones para español (`es`) que cubra el 100% de las cadenas de texto de la interfaz presentes en el bundle de inglés (`en`).

2. THE SPA SHALL detectar el idioma del navegador (`navigator.language`) al primer inicio; WHEN el idioma detectado comienza con `"es"`, THE SPA SHALL establecer español como idioma activo antes de mostrar ningún contenido.

3. THE SPA SHALL incluir español en el selector de idioma de la barra de navegación, identificado con la etiqueta `"Español"` y el código `"es"`.

4. FOR ALL claves de traducción en el bundle `es`, THE módulo `i18n.js` SHALL devolver el texto en español cuando el idioma activo es `"es"`, sin devolver nunca la clave sin resolver ni una cadena vacía.

5. IF una clave de traducción existe en el bundle `en` pero no en el bundle `es`, THEN THE módulo `i18n.js` SHALL utilizar el valor del bundle `en` como fallback y emitir un `console.warn` con la clave faltante, sin interrumpir la experiencia del usuario.

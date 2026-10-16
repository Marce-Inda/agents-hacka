---
inclusion: always
name: lessons-learned
description: Project-specific patterns, preferences, and lessons learned over time (user-editable)
---

# Lessons Learned

This file captures project-specific patterns, coding preferences, common pitfalls, and architectural decisions that emerge during development. It serves as a workaround for continuous learning by allowing you to document patterns manually.

**How to use this file:**
1. The `extract-patterns` hook will suggest patterns after agent sessions
2. Review suggestions and add genuinely useful patterns below
3. Edit this file directly to capture team conventions
4. Keep it focused on project-specific insights, not general best practices

---

## Project-Specific Patterns

*Document patterns unique to this project that the team should follow.*

### Example: API Error Handling
```typescript
// Always use our custom ApiError class for consistent error responses
throw new ApiError(404, 'Resource not found', { resourceId });
```

---

## Code Style Preferences

*Document team preferences that go beyond standard linting rules.*

### Example: Import Organization
```typescript
// Group imports: external, internal, types
import { useState } from 'react';
import { Button } from '@/components/ui';
import type { User } from '@/types';
```

---

## Spec Task Orchestration

### `[-]` in tasks.md means "in progress", not "completed" — check actual files before re-doing work
The Kiro spec task system uses `[-]` to mark a task as started/in-progress and `[x]` for completed. When the orchestrator sees a `[-]` parent task, it treats it as started and makes its children ready. Before dispatching a subagent to implement a task, check whether the relevant files already exist on disk — the task may have been partially or fully completed in a prior session. Reading the files directly (or listing the directory) avoids redundant work.

### Check file *content*, not just *existence*, when verifying prior-session work
When a task calls for creating "empty stubs" but a prior session may have run ahead, files can exist with full implementations already written. Checking only for file existence will incorrectly confirm a stub-creation task as done when the file actually contains a later task's work (e.g., RED-phase tests already written inside a stub file). Always read a sample of the file content to determine its true state before deciding whether work needs to be done or can be skipped.

### Run `npm install` before running tests — missing deps look like implementation failures
When test execution fails with `Cannot find module 'js-yaml'` or a similar module-not-found error, the implementation may already be correct. Always run `npm install` first when working in a fresh environment or after a prior session. This applies especially to `catalog-builder.test.js`, which requires `js-yaml` at import time. A missing dependency is easy to mistake for a broken implementation, causing unnecessary rewrites.

### The `tests/**/*.test.js` glob in `run-all.js` auto-discovers new subdirectories — no script edits needed
When adding a new test subdirectory (e.g., `tests/dashboard/`), the existing `run-all.js` walker picks it up automatically. Similarly, `c8 --include="scripts/**/*.js"` already covers any new files added under `scripts/`. Verify these globs before modifying `package.json` scripts to avoid unnecessary churn.

### Stub ES modules for dashboard must use `export` syntax, not `module.exports`
Files under `scripts/dashboard/modules/` are loaded as ES modules by the SPA (via `<script type="module">`). Use named `export function` syntax. Only `scripts/catalog-builder.js` is a Node.js CommonJS script (loaded via `require()` in tests and CLI) and should use `module.exports`. Mixing the two causes runtime errors that are hard to trace.

## Kiro Hooks

### `install.sh` is additive-only — it won't update existing installations
The installer skips any file that already exists in the target (`if [ ! -f ... ]`). Running it against a folder that already has `.kiro/` will not overwrite or update hooks, agents, or steering files. To push updates to an existing project, manually copy the changed files or remove the target files first before re-running the installer.

### README.md mirrors hook configurations — keep them in sync
The hooks table and Example 5 in README.md document the action type (`runCommand` vs `askAgent`) and behavior of each hook. When changing a hook's `then.type` or behavior, update both the hook file and the corresponding README entries to avoid misleading documentation.

### Prefer `askAgent` over `runCommand` for file-event hooks
`runCommand` hooks on `fileEdited` or `fileCreated` events spawn a new terminal session every time they fire, creating friction. Use `askAgent` instead so the agent handles the task inline. Reserve `runCommand` for `userTriggered` hooks where a manual, isolated terminal run is intentional (e.g., `quality-gate`).

---

## Common Pitfalls

*Document mistakes that have been made and how to avoid them.*

### Example: Database Transactions
- Always wrap multiple database operations in a transaction
- Remember to handle rollback on errors
- Don't forget to close connections in finally blocks

---

## Architecture Decisions

*Document key architectural decisions and their rationale.*

### Example: State Management
- **Decision**: Use Zustand for global state, React Context for component trees
- **Rationale**: Zustand provides better performance and simpler API than Redux
- **Trade-offs**: Less ecosystem tooling than Redux, but sufficient for our needs

---

## Dashboard / UI Features

### Catalog data should be generated at build-time, not runtime
When building UIs on top of this agent system, parse `AGENTS.md` and all `SKILL.md` files into a static `catalog.json` during the build step (e.g., via a Node.js/TypeScript script run before `vite build`). This avoids filesystem access at runtime, keeps the SPA fully static, and ensures the catalog is always in sync with the source files without manual updates.

### Color-code by item type for agent/skill catalogs
When displaying agents, skills, hooks, and commands in a visual UI, use a consistent color scheme by type across all components (cards, badges, filters). Suggested palette for this project: Agents → indigo (#4F46E5), Skills → emerald (#059669), Hooks → violet (#7C3AED), Commands → amber (#D97706). This makes the type immediately scannable without reading labels.

### Always scan the codebase before writing a spec for a "new" feature
Before generating requirements or design for a feature, check whether a partial or full implementation already exists (scripts/, src/, any subdirectory). The `scripts/dashboard-web.js` case showed that assuming "build from scratch" when code already existed produced a spec recommending React/Vite over the project's existing Node.js/vanilla JS stack — requiring a full rewrite of all three spec documents. Run a context-gather pass first, then write the spec.

### Use hash-based routing for SPAs deployed as static files
When building a SPA that will be served from a static host (GitHub Pages, S3, Netlify without redirects), use React Router v6 with `createHashRouter` instead of `createBrowserRouter`. This avoids 404s on direct URL access or page refresh without requiring server-side rewrite rules.

### Wrap individual SKILL.md parses in try/catch, not the whole loop
In the build-time catalog parser, wrap each `SKILL.md` parse call in its own `try/catch` so a single malformed YAML frontmatter emits a `console.warn` and continues — it should never crash the entire build. A top-level try/catch would silently drop all skills if any one file is invalid.

---

## Notes

- Keep entries concise and actionable
- Remove patterns that are no longer relevant
- Update patterns as the project evolves
- Focus on what's unique to this project

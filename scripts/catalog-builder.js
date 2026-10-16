#!/usr/bin/env node
/**
 * catalog-builder.js — Build-time catalog generator for the Visual Agent Dashboard.
 *
 * Reads agents/, skills/*, commands/, rules/, mcp-configs/, hooks/ and produces
 * a catalog.json artifact consumed by the SPA at runtime.
 *
 * CommonJS module — loaded via require() in tests and CLI.
 */
'use strict';

const path = require('node:path');
const yaml = require('js-yaml');

// NOTE: We require('node:fs/promises') lazily inside every function that uses it
// so that tests can monkey-patch fsPromises.readdir / fsPromises.readFile before
// calling buildCatalog and the mock will take effect.

const ROOT_DEFAULT = path.resolve(__dirname, '..');

// ─── Short description ────────────────────────────────────────────────────────

const MAX_SHORT_DESC = 120;

function makeShortDescription(description) {
  if (!description || typeof description !== 'string') return '';
  if (description.length <= MAX_SHORT_DESC) return description;
  return description.slice(0, MAX_SHORT_DESC) + '\u2026';
}

// ─── Agent type inference ─────────────────────────────────────────────────────

function inferAgentType(filename) {
  const base = filename.replace(/\.md$/i, '');
  if (base.endsWith('-reviewer')) return 'reviewer';
  if (base.endsWith('-resolver') || base.endsWith('-builder')) return 'builder';
  if (base.endsWith('-architect')) return 'architect';
  if (base.includes('-security')) return 'security';
  return 'other';
}

// ─── Command group inference ──────────────────────────────────────────────────

const COMMAND_GROUP_MAP = {
  'plan':       'Planning',
  'plan-':      'Planning',
  'prp-':       'Git & PR',
  'pr':         'Git & PR',
  'review-':    'Review',
  'code-':      'Review',
  'build':      'Build',
  'fix':        'Build',
  'test':       'Testing',
  'e2e':        'Testing',
  'coverage':   'Testing',
  'quality':    'Testing',
  'session':    'Session',
  'save':       'Session',
  'resume':     'Session',
  'skill':      'Knowledge',
  'learn':      'Knowledge',
  'instinct':   'Knowledge',
  'evolve':     'Knowledge',
  'ecc':        'System',
  'hookify':    'System',
  'model':      'System',
  'setup':      'System',
  'multi':      'Multi-Agent',
  'security':   'Security',
  'harness':    'Security',
  'go-':        'Languages',
  'rust-':      'Languages',
  'cpp-':       'Languages',
  'kotlin-':    'Languages',
  'flutter-':   'Languages',
  'react-':     'Languages',
  'python-':    'Languages',
  'fastapi-':   'Languages',
  'gradle-':    'Languages',
  'gan':        'GAN',
  'marketing':  'Marketing',
  'jira':       'Project',
  'pm2':        'Process',
  'cost':       'Analytics',
  'promote':    'Project',
  'aside':      'Other',
  'santa':      'Fun',
};

function inferCommandGroup(filename) {
  const base = filename.replace(/\.md$/i, '');
  for (const [prefix, group] of Object.entries(COMMAND_GROUP_MAP)) {
    if (base.startsWith(prefix)) return group;
  }
  return 'General';
}

// ─── parseFrontmatterYaml ─────────────────────────────────────────────────────

/**
 * Parse the YAML frontmatter block from markdown content.
 *
 * @param {string} content  — raw file content
 * @returns {object}        — parsed frontmatter fields
 * @throws {Error}          — if the YAML block is malformed
 */
function parseFrontmatterYaml(content) {
  if (!content || typeof content !== 'string') return {};

  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const parsed = yaml.load(match[1], { schema: yaml.DEFAULT_SCHEMA });
  if (parsed === null || parsed === undefined) return {};
  if (typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return parsed;
}

// ─── maskEnvVars ─────────────────────────────────────────────────────────────

const ENV_VAR_RE = /\$\{[^}]*\}|process\.env\.\w+/;

/**
 * Recursively replace env-var patterns with "[env]". Returns a new object,
 * does NOT mutate the original.
 *
 * @param {*} obj
 * @returns {*}
 */
function maskEnvVars(obj) {
  if (typeof obj === 'string') {
    return ENV_VAR_RE.test(obj) ? '[env]' : obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(maskEnvVars);
  }
  if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const key of Object.keys(obj)) {
      result[key] = maskEnvVars(obj[key]);
    }
    return result;
  }
  return obj;
}

// ─── writeAtomicJson ──────────────────────────────────────────────────────────

/**
 * Atomically write JSON data to filePath (write to tmp, then rename).
 *
 * @param {string} filePath
 * @param {*}      data
 */
async function writeAtomicJson(filePath, data) {
  const fsPromises = require('node:fs/promises');
  const tmpPath = filePath + '.tmp.' + process.pid + '.' + Date.now();
  const json = JSON.stringify(data, null, 2);
  await fsPromises.writeFile(tmpPath, json, 'utf8');
  await fsPromises.rename(tmpPath, filePath);
}

// ─── Directory readers ────────────────────────────────────────────────────────

async function readAgents(root) {
  const fsPromises = require('node:fs/promises');
  const dir = path.join(root, 'agents');
  let files;
  try {
    files = await fsPromises.readdir(dir);
  } catch {
    console.warn('[ECC] catalog-builder: agents/ directory not found or unreadable');
    return [];
  }

  const mdFiles = files.filter(f => f.endsWith('.md')).sort();
  const results = [];

  for (const filename of mdFiles) {
    const filePath = path.join(dir, filename);
    try {
      const content = await fsPromises.readFile(filePath, 'utf8');
      let fm;
      try {
        fm = parseFrontmatterYaml(content);
      } catch {
        console.warn('[ECC] catalog-builder: malformed frontmatter in ' + filePath);
        continue;
      }
      const name = fm.name || filename.replace(/\.md$/i, '');
      const description = fm.description || '';
      results.push({
        id: name,
        name,
        description,
        shortDescription: makeShortDescription(description),
        model: fm.model || 'default',
        tools: Array.isArray(fm.tools) ? fm.tools : [],
        type: inferAgentType(filename),
        keywords: Array.isArray(fm.keywords) ? fm.keywords : [],
        body: content.replace(/^---[\s\S]*?---\r?\n*/, '').trim(),
        sourceFile: 'agents/' + filename,
      });
    } catch (err) {
      console.warn('[ECC] catalog-builder: failed to read ' + filePath + ': ' + err.message);
    }
  }
  return results;
}

async function readSkills(root) {
  const fsPromises = require('node:fs/promises');
  const dir = path.join(root, 'skills');
  let entries;
  try {
    entries = await fsPromises.readdir(dir);
  } catch {
    console.warn('[ECC] catalog-builder: skills/ directory not found or unreadable');
    return [];
  }

  const results = [];
  const sorted = entries.slice().sort();

  for (const skillName of sorted) {
    const skillFile = path.join(dir, skillName, 'SKILL.md');
    try {
      const content = await fsPromises.readFile(skillFile, 'utf8');
      let fm;
      try {
        fm = parseFrontmatterYaml(content);
      } catch {
        console.warn('[ECC] catalog-builder: malformed frontmatter in ' + skillFile);
        continue;
      }
      const name = fm.name || skillName;
      const description = fm.description || '';
      results.push({
        id: skillName,
        name,
        description,
        shortDescription: makeShortDescription(description),
        category: fm.category || 'General',
        keywords: Array.isArray(fm.keywords) ? fm.keywords : [],
        body: content.replace(/^---[\s\S]*?---\r?\n*/, '').trim(),
        sourceFile: 'skills/' + skillName + '/SKILL.md',
      });
    } catch {
      // ENOENT — skill directory has no SKILL.md, silently skip
    }
  }
  return results;
}

async function readCommands(root) {
  const fsPromises = require('node:fs/promises');
  const dir = path.join(root, 'commands');
  let files;
  try {
    files = await fsPromises.readdir(dir);
  } catch {
    console.warn('[ECC] catalog-builder: commands/ directory not found or unreadable');
    return [];
  }

  const mdFiles = files.filter(f => f.endsWith('.md')).sort();
  const results = [];

  for (const filename of mdFiles) {
    const filePath = path.join(dir, filename);
    try {
      const content = await fsPromises.readFile(filePath, 'utf8');
      let fm;
      try {
        fm = parseFrontmatterYaml(content);
      } catch {
        console.warn('[ECC] catalog-builder: malformed frontmatter in ' + filePath);
        continue;
      }
      const baseName = filename.replace(/\.md$/i, '');
      const name = '/' + baseName;
      const description = fm.description || fm['argument-hint'] || '';
      results.push({
        id: baseName,
        name,
        description,
        shortDescription: makeShortDescription(description),
        group: inferCommandGroup(filename),
        keywords: Array.isArray(fm.keywords) ? fm.keywords : [],
        body: content.replace(/^---[\s\S]*?---\r?\n*/, '').trim(),
        sourceFile: 'commands/' + filename,
      });
    } catch (err) {
      console.warn('[ECC] catalog-builder: failed to read ' + filePath + ': ' + err.message);
    }
  }
  return results;
}

async function readRules(root) {
  const fsPromises = require('node:fs/promises');
  const dir = path.join(root, 'rules');
  let entries;
  try {
    entries = await fsPromises.readdir(dir);
  } catch {
    console.warn('[ECC] catalog-builder: rules/ directory not found or unreadable');
    return [];
  }

  const results = [];
  const sorted = entries.slice().sort();

  for (const lang of sorted) {
    const langDir = path.join(dir, lang);
    try {
      const langFiles = await fsPromises.readdir(langDir);
      const mdFiles = langFiles.filter(f => f.endsWith('.md')).sort();
      if (mdFiles.length > 0) {
        results.push({ lang, files: mdFiles });
      }
    } catch {
      // Not a directory or unreadable — skip
    }
  }
  return results;
}

async function readMcps(root) {
  const fsPromises = require('node:fs/promises');
  const results = [];
  const dir = path.join(root, 'mcp-configs');
  let files;
  try {
    files = await fsPromises.readdir(dir);
  } catch {
    console.warn('[ECC] catalog-builder: mcp-configs/ directory not found or unreadable');
    files = [];
  }

  const jsonFiles = files.filter(f => f.endsWith('.json')).sort();

  for (const filename of jsonFiles) {
    const filePath = path.join(dir, filename);
    try {
      const content = await fsPromises.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      const servers = Object.entries(data.mcpServers || {}).map(([name, v]) => ({
        name,
        command: typeof v === 'object' ? (v.command || v.url || '') : String(v),
        args: Array.isArray(v.args) ? v.args : [],
        env: maskEnvVars(v.env || {}),
        type: (typeof v === 'object' && v.type) ? v.type : 'stdio',
      }));
      results.push({ file: filename, servers });
    } catch (err) {
      console.warn('[ECC] catalog-builder: failed to parse ' + filePath + ': ' + err.message);
    }
  }
  return results;
}

async function readHooks(root) {
  const fsPromises = require('node:fs/promises');
  const hooksFile = path.join(root, 'hooks', 'hooks.json');
  let content;
  try {
    content = await fsPromises.readFile(hooksFile, 'utf8');
  } catch (err) {
    // Only warn on unexpected errors; silently skip when the file simply doesn't exist
    if (err.code !== 'ENOENT') {
      console.warn('[ECC] catalog-builder: hooks/hooks.json not found or unreadable');
    }
    return [];
  }

  try {
    const data = JSON.parse(content);
    const results = [];
    for (const [eventName, entries] of Object.entries(data.hooks || {})) {
      for (const entry of (entries || [])) {
        results.push({
          id: entry.id || '',
          event: eventName,
          matcher: entry.matcher || '*',
          description: entry.description || '',
        });
      }
    }
    return results;
  } catch (err) {
    console.warn('[ECC] catalog-builder: failed to parse hooks/hooks.json: ' + err.message);
    return [];
  }
}

// ─── buildCatalog ─────────────────────────────────────────────────────────────

/**
 * Build and return the complete CatalogData object.
 *
 * @param {string} [root]  — project root (defaults to parent of scripts/)
 * @returns {Promise<object>}  CatalogData
 */
async function buildCatalog(root) {
  const resolvedRoot = root || ROOT_DEFAULT;

  const [agents, skills, commands, rules, mcps, hooks] = await Promise.all([
    readAgents(resolvedRoot),
    readSkills(resolvedRoot),
    readCommands(resolvedRoot),
    readRules(resolvedRoot),
    readMcps(resolvedRoot),
    readHooks(resolvedRoot),
  ]);

  return {
    version: '1',
    generatedAt: new Date().toISOString(),
    agents,
    skills,
    commands,
    rules,
    mcps,
    hooks,
  };
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

if (require.main === module) {
  const outputPath = path.join(__dirname, 'dashboard', 'catalog.json');
  buildCatalog()
    .then(catalog => writeAtomicJson(outputPath, catalog))
    .then(() => {
      console.log('[ECC] catalog-builder: wrote ' + outputPath);
    })
    .catch(err => {
      console.error('[ECC] catalog-builder: fatal error:', err.message);
      process.exit(1);
    });
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  buildCatalog,
  parseFrontmatterYaml,
  maskEnvVars,
  writeAtomicJson,
};

#!/usr/bin/env node
/**
 * Static checks for the app's module structure. No dependencies, no build.
 *
 *   npm run check
 *
 * 1. Every relative import resolves to a file.
 * 2. Every named import exists in the module it is imported from. Metro does
 *    not check this - a misspelt name bundles fine and is `undefined` at
 *    runtime - so this is the check that makes moving code around safe.
 * 3. Imports only point down the layer stack described in docs/ARCHITECTURE.md.
 * 4. There are no import cycles. Services call each other, and a cycle there
 *    can hand a module `undefined` for an import at load time.
 *
 * Exits non-zero on any violation so it can gate CI or a pre-commit hook.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

/**
 * Which layers each layer may import from. A layer may always import from
 * itself, except where noted below. Order here is top of the stack first.
 *
 * `native` is the Expo modules in /modules; only the layers that talk to the
 * outside world may reach them.
 */
const ALLOWED = {
  root: ['app'],
  app: ['app', 'features', 'components', 'hooks', 'services', 'utils', 'theme', 'config'],
  features: ['features', 'components', 'hooks', 'services', 'utils', 'theme', 'config'],
  components: ['components', 'utils', 'theme', 'config'],
  hooks: ['hooks', 'services', 'utils', 'config'],
  services: ['services', 'data', 'api', 'native', 'utils', 'config'],
  data: ['data', 'utils', 'config'],
  api: ['api', 'utils', 'config'],
  utils: ['utils', 'config'],
  theme: ['theme'],
  config: ['config'],
};

const LAYERS = Object.keys(ALLOWED).filter((l) => l !== 'root');

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    return /\.(js|jsx|ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

function layerOf(file) {
  const rel = path.relative(ROOT, file).split(path.sep);
  if (rel[0] === 'modules') return 'native';
  if (rel[0] !== 'src') return rel.length === 1 ? 'root' : null;
  return LAYERS.includes(rel[1]) ? rel[1] : `unknown:${rel[1]}`;
}

/** `features/<name>/...` -> name, or null. */
function featureOf(file) {
  const rel = path.relative(SRC, file).split(path.sep);
  return rel[0] === 'features' ? rel[1] : null;
}

function resolve(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [base, `${base}.js`, `${base}.ts`, path.join(base, 'index.js'), path.join(base, 'index.ts')];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) || null;
}

// Only statements that start a line are parsed, which keeps usage examples in
// JSDoc comments (" * import ...") from being mistaken for real imports.
const IMPORT_RE = /^import\s+(?:([\s\S]*?)\s+from\s+)?['"]([^'"]+)['"]/gm;
const REEXPORT_RE = /^export\s+(\*|\{[\s\S]*?\})\s+from\s+['"]([^'"]+)['"]/gm;

function parseBindings(clause) {
  // -> { defaultImport: bool, named: [names], namespace: bool }
  const out = { defaultImport: false, named: [], namespace: false };
  if (!clause) return out;
  const braces = clause.match(/\{([\s\S]*)\}/);
  const outside = clause.replace(/\{[\s\S]*\}/, '').trim().replace(/,$/, '').trim();
  if (outside.startsWith('* as')) out.namespace = true;
  else if (outside) out.defaultImport = true;
  if (braces) {
    out.named = braces[1]
      .split(',')
      .map((part) => part.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
  }
  return out;
}

const exportCache = new Map();

/** Names a module exports, following `export * from`. */
function exportsOf(file, seen = new Set()) {
  if (exportCache.has(file)) return exportCache.get(file);
  if (seen.has(file)) return new Set();
  seen.add(file);

  const src = fs.readFileSync(file, 'utf8');
  const names = new Set();
  if (/^export\s+default\b/m.test(src)) names.add('default');

  const declRe = /^export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = declRe.exec(src))) names.add(m[1]);

  const listRe = /^export\s+\{([\s\S]*?)\}(?!\s+from)/gm;
  while ((m = listRe.exec(src))) {
    m[1].split(',').forEach((part) => {
      const pieces = part.trim().split(/\s+as\s+/);
      const name = (pieces[1] || pieces[0]).trim();
      if (name) names.add(name);
    });
  }

  REEXPORT_RE.lastIndex = 0;
  while ((m = REEXPORT_RE.exec(src))) {
    const [, what, spec] = m;
    if (!spec.startsWith('.')) continue;
    const target = resolve(file, spec);
    if (!target) continue;
    if (what === '*') {
      exportsOf(target, seen).forEach((n) => n !== 'default' && names.add(n));
    } else {
      what
        .slice(1, -1)
        .split(',')
        .forEach((part) => {
          const pieces = part.trim().split(/\s+as\s+/);
          const name = (pieces[1] || pieces[0]).trim();
          if (name) names.add(name);
        });
    }
  }

  exportCache.set(file, names);
  return names;
}

function check() {
  const files = [...listFiles(SRC), path.join(ROOT, 'App.js')];
  const problems = [];
  const graph = new Map(); // file -> files it imports

  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const from = path.relative(ROOT, file);
    const fromLayer = layerOf(file);
    if (fromLayer && fromLayer.startsWith('unknown:')) {
      problems.push(`${from}: not inside a known layer (${LAYERS.join(', ')})`);
    }

    const statements = [];
    let m;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(src))) statements.push({ clause: m[1], spec: m[2], reexport: false });
    REEXPORT_RE.lastIndex = 0;
    while ((m = REEXPORT_RE.exec(src))) {
      statements.push({ clause: m[1] === '*' ? null : m[1], spec: m[2], reexport: true });
    }

    for (const { clause, spec, reexport } of statements) {
      if (!spec.startsWith('.')) continue;
      const target = resolve(file, spec);
      if (!target) {
        problems.push(`${from}: cannot resolve '${spec}'`);
        continue;
      }
      if (!graph.has(file)) graph.set(file, []);
      graph.get(file).push(target);

      // Named bindings must exist on the target.
      const available = exportsOf(target);
      const bindings = reexport
        ? { defaultImport: false, named: clause ? parseBindings(clause).named : [], namespace: false }
        : parseBindings(clause);
      if (bindings.defaultImport && !available.has('default')) {
        problems.push(`${from}: '${spec}' has no default export`);
      }
      bindings.named.forEach((name) => {
        if (!available.has(name)) problems.push(`${from}: '${spec}' does not export '${name}'`);
      });

      // Layering.
      const toLayer = layerOf(target);
      if (!fromLayer || fromLayer.startsWith('unknown:') || !toLayer) continue;
      if (!(ALLOWED[fromLayer] || []).includes(toLayer)) {
        problems.push(`${from}: layer '${fromLayer}' may not import from '${toLayer}' ('${spec}')`);
        continue;
      }

      // One feature may use another only through that feature's index.js.
      const fromFeature = featureOf(file);
      const toFeature = featureOf(target);
      if (fromFeature && toFeature && fromFeature !== toFeature) {
        const entry = path.join(SRC, 'features', toFeature, 'index.js');
        if (target !== entry) {
          problems.push(
            `${from}: reaches into feature '${toFeature}' ('${spec}'); import from its index.js instead`
          );
        }
      }
    }
  }

  const cycles = findCycles(graph).map((c) => c.map((f) => path.relative(ROOT, f)).join(' -> '));
  [...new Set(cycles)].forEach((cycle) => problems.push(`import cycle: ${cycle}`));

  return { files: files.length, problems };
}

function findCycles(graph) {
  const cycles = [];
  const done = new Set();
  const stack = [];
  const onStack = new Set();

  const visit = (node) => {
    stack.push(node);
    onStack.add(node);
    for (const next of graph.get(node) || []) {
      if (onStack.has(next)) cycles.push([...stack.slice(stack.indexOf(next)), next]);
      else if (!done.has(next)) visit(next);
    }
    stack.pop();
    onStack.delete(node);
    done.add(node);
  };

  [...graph.keys()].forEach((node) => done.has(node) || visit(node));
  return cycles;
}

const { files, problems } = check();
if (problems.length) {
  console.error(`Architecture check failed (${problems.length} problem${problems.length === 1 ? '' : 's'}):\n`);
  problems.forEach((p) => console.error(`  - ${p}`));
  process.exit(1);
}
console.log(`Architecture check passed: ${files} files, imports resolve, respect the layers, and form no cycles.`);

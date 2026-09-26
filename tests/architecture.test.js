import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname, relative, resolve } from 'path';

// Clean Architecture boundaries (see AGENTS.md, rule 3):
// presentation -> domain <- infrastructure, wired only by js/app.js
const JS = resolve(__dirname, '../js');
const FIREBASE_SDK = /gstatic\.com\/firebasejs|^firebase(\/|$)/;
const DOM_GLOBALS = /\b(document|window|localStorage|sessionStorage)\s*\./;
const BROWSER_STORAGE = /\b(localStorage|sessionStorage)\s*\./;

const listSources = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return listSources(p);
    return e.name.endsWith('.js') ? [p] : [];
  });

const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;

const importsOf = (file) =>
  [...readFileSync(file, 'utf8').matchAll(IMPORT_RE)].map((m) => {
    const spec = m[1] || m[2] || m[3];
    return spec.startsWith('.') ? { local: relative(JS, resolve(dirname(file), spec)) } : { pkg: spec };
  });

const layerOf = (jsPath) => {
  if (jsPath === 'app.js') return 'root';
  const top = jsPath.split('/')[0];
  return ['domain', 'infrastructure', 'presentation'].includes(top) ? top : 'unlayered';
};

const files = listSources(JS).map((f) => ({ file: f, path: relative(JS, f), layer: layerOf(relative(JS, f)) }));

const importViolations = (layer, isForbidden) =>
  files
    .filter((f) => f.layer === layer)
    .flatMap((f) => importsOf(f.file).filter(isForbidden).map((i) => `${f.path} -> ${i.pkg || i.local}`));

const codeViolations = (layer, pattern) =>
  files.filter((f) => f.layer === layer && pattern.test(readFileSync(f.file, 'utf8'))).map((f) => f.path);

const isFirebase = (i) => i.pkg && FIREBASE_SDK.test(i.pkg);
const importsLayer = (...layers) => (i) => i.local && layers.includes(layerOf(i.local));

describe('Clean Architecture boundaries', () => {
  it('every module lives in a layer (only app.js sits at the root)', () => {
    expect(files.filter((f) => f.layer === 'unlayered').map((f) => f.path)).toEqual([]);
  });

  it('domain imports no SDKs or outer layers', () => {
    expect(importViolations('domain', (i) => i.pkg || importsLayer('infrastructure', 'presentation', 'root')(i))).toEqual([]);
  });

  it('domain does not touch the DOM or browser storage', () => {
    expect(codeViolations('domain', DOM_GLOBALS)).toEqual([]);
  });

  it('infrastructure imports no presentation code', () => {
    expect(importViolations('infrastructure', importsLayer('presentation', 'root'))).toEqual([]);
  });

  it('infrastructure does not touch the DOM', () => {
    expect(codeViolations('infrastructure', /\bdocument\s*\./)).toEqual([]);
  });

  it('presentation imports no infrastructure or Firebase', () => {
    expect(importViolations('presentation', (i) => isFirebase(i) || importsLayer('infrastructure', 'root')(i))).toEqual([]);
  });

  it('presentation does not use browser storage directly', () => {
    expect(codeViolations('presentation', BROWSER_STORAGE)).toEqual([]);
  });

  it('Firebase SDK is only imported from infrastructure', () => {
    const outside = ['domain', 'presentation', 'root'].flatMap((l) => importViolations(l, isFirebase));
    expect(outside).toEqual([]);
  });
});

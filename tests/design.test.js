import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(__dirname, '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const css = readFileSync(join(ROOT, 'css/styles.css'), 'utf8');

// Visible markup only: drop comments and <script>/<style> blocks.
const visible = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)[\s\S]*?<\/\1>/g, '');
const text = (fragment) => fragment.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

describe('Brand name', () => {
  it('uses PuntoPerfecto in the title and logo', () => {
    expect(html.match(/<title>([^<]*)<\/title>/)[1]).toMatch(/^PuntoPerfecto/);
    expect(html.match(/<meta name="description" content="([^"]*)"/)[1]).toMatch(/^PuntoPerfecto/);
  });

  it('never shows the old CrochetCalc name', () => {
    expect(visible.match(/.{0,30}CrochetCalc.{0,30}/g)).toBeNull();
    expect(html.match(/<title>[^<]*<\/title>/)[0]).not.toMatch(/CrochetCalc/);
  });
});

describe('Tab headers', () => {
  const headers = [...visible.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => ({
    title: text(m[1]),
    description: text(m[2])
  }));

  it('there is one header per tab', () => {
    expect(headers).toHaveLength(6);
  });

  it('titles are short and have no parentheses', () => {
    headers.forEach(({ title }) => {
      expect(title.length, title).toBeLessThanOrEqual(24);
      expect(title).not.toMatch(/[()]/);
    });
  });

  it('descriptions fit in one sentence', () => {
    headers.forEach(({ description }) => expect(description.length, description).toBeLessThanOrEqual(90));
  });
});

describe('Visual noise', () => {
  it('has no "Paso N:" corner tags', () => {
    expect(text(visible).match(/Paso \d+:.{0,20}/gi)).toBeNull();
  });

  it('has no "Resultado Recalculado" chip', () => {
    expect(text(visible).match(/Resultado Recalculado/gi)).toBeNull();
  });

  it('form labels are sentence case and start without an icon', () => {
    // Upload buttons are <label class="cursor-pointer …"> and keep their icon.
    const labels = [...visible.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/g)].filter(([, attrs]) => !/cursor-pointer/.test(attrs));
    const offenders = labels
      .filter(([, attrs, inner]) => /\buppercase\b/.test(attrs) || /^\s*<(i|span)[^>]*(fa-|material-symbols)/.test(inner))
      .map(([, , inner]) => text(inner));
    expect(offenders).toEqual([]);
  });

  it('page background is plain (no dot pattern)', () => {
    const rule = css.match(/\.bg-artisan-pattern[^{]*\{([^}]*)\}/)[1];
    expect(rule).not.toMatch(/radial-gradient/);
  });
});

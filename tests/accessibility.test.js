import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(__dirname, '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const presentationDir = join(ROOT, 'js/presentation');
const sources = [
  ['index.html', html],
  ['js/app.js', readFileSync(join(ROOT, 'js/app.js'), 'utf8')],
  ...readdirSync(presentationDir).map((f) => [`js/presentation/${f}`, readFileSync(join(presentationDir, f), 'utf8')])
];

// Muted text (#7A6873) only passes WCAG AA on white at full opacity.
const FADED_MUTED_TEXT = /text-sand-800\/\d+/g;

const navLabels = (selector) => {
  const block = html.match(selector)[0];
  return [...block.matchAll(/<button data-tab="[^"]+"[\s\S]*?<\/button>/g)].map((b) => {
    const spans = [...b[0].matchAll(/<span(?![^>]*material-symbols)[^>]*>([^<]*)<\/span>/g)];
    return spans.at(-1)[1].trim();
  });
};

describe('Accessibility', () => {
  it('muted text is never faded with an opacity modifier', () => {
    const found = sources.flatMap(([name, src]) => (src.match(FADED_MUTED_TEXT) || []).map((m) => `${name}: ${m}`));
    expect(found).toEqual([]);
  });
});

describe('Navigation labels', () => {
  const desktop = navLabels(/<nav class="hidden lg:flex[\s\S]*?<\/nav>/);
  const mobile = navLabels(/<nav class="bottom-nav[\s\S]*?<\/nav>/);

  it('desktop and mobile navs use the same labels', () => {
    expect(desktop).toEqual(mobile);
  });

  it('labels are short enough to stay on one line', () => {
    desktop.forEach((label) => expect(label.length).toBeLessThanOrEqual(10));
  });
});

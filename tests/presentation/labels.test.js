import { describe, it, expect } from 'vitest';
import { yarnOptionLabel, hookOptionLabel } from '../../js/presentation/labels.js';
import { YARN_STANDARDS, HOOK_SIZES } from '../../js/domain/data/yarnData.js';

describe('yarnOptionLabel', () => {
  it('shows the CYC number and the short name', () => {
    const dk = YARN_STANDARDS.find((y) => y.cyc === 3);
    expect(yarnOptionLabel(dk)).toBe('#3 · Ligera (DK)');
  });

  it('keeps every yarn label short enough for a phone-width select', () => {
    YARN_STANDARDS.forEach((y) => {
      expect(y.shortES, `yarn ${y.cyc} needs shortES`).toBeTruthy();
      expect(yarnOptionLabel(y).length).toBeLessThanOrEqual(22);
    });
  });
});

describe('hookOptionLabel', () => {
  it('shows millimetres and the US size', () => {
    expect(hookOptionLabel({ mm: 4.0, us: 'G-6', uk: '8' })).toBe('4 mm · US G-6');
    expect(hookOptionLabel({ mm: 5.5, us: 'I-9', uk: '5' })).toBe('5.5 mm · US I-9');
  });

  it('keeps every hook label short', () => {
    HOOK_SIZES.forEach((h) => expect(hookOptionLabel(h).length).toBeLessThanOrEqual(22));
  });
});

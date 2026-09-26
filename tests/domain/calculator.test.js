import { describe, it, expect } from 'vitest';
import {
  getYarnById,
  recalculatePattern,
  calculateQuickSwatch,
  calculateGarmentFit,
  distributeShaping,
  estimateYarnConsumption
} from '../../js/domain/calculator.js';

// Characterization tests: they pin the current behaviour of the calculator engine.

describe('getYarnById', () => {
  it('finds a yarn by CYC id, including string ids', () => {
    expect(getYarnById('2').id).toBe(2);
  });

  it('falls back to Worsted (CYC 4) for unknown ids', () => {
    expect(getYarnById(9).id).toBe(4);
  });
});

describe('recalculatePattern', () => {
  it('estimates from hook and yarn when there is no swatch', () => {
    const r = recalculatePattern({ origChains: 40, origHook: 5, origYarnCyc: 4, userHook: 3.5, userYarnCyc: 3, userTension: 'normal' });
    expect(r).toMatchObject({
      finalStitches: 60,
      theoreticalStitches: '59.6',
      scaleRatio: '1.489',
      diffPercentage: '+50%',
      calculationMethod: 'material_formula',
      finalRows: null,
      multipleApplied: null,
      isThinner: true
    });
  });

  it('uses exact gauge, tension and stitch multiple when given', () => {
    const r = recalculatePattern({ origChains: 40, origGaugeSts: 16, userGaugeSts: 20, userTension: 'tight', multipleOf: 4, plusStitches: 2, origRows: 30 });
    expect(r).toMatchObject({
      finalStitches: 54,
      scaleRatio: '1.375',
      finalRows: 41,
      multipleApplied: '4n + 2',
      calculationMethod: 'swatch_exact'
    });
  });

  it('flags equal materials', () => {
    const r = recalculatePattern({ origChains: 20, origHook: 4, origYarnCyc: 4, userHook: 4, userYarnCyc: 4 });
    expect(r.finalStitches).toBe(20);
    expect(r.isEqual).toBe(true);
  });
});

describe('calculateQuickSwatch', () => {
  it('derives gauge and target stitches/rows from a swatch', () => {
    const r = calculateQuickSwatch({ stitches: 15, widthCm: 6, rows: 10, heightCm: 5, targetWidthCm: 50, targetHeightCm: 20, multipleOf: 3, plusStitches: 1 });
    expect(r).toMatchObject({
      stitchesPerCm: '2.50',
      rowsPerCm: '2.00',
      stitchesIn10cm: '25.0',
      rowsIn10cm: '20.0',
      stitchWidthMm: '4.0',
      stitchHeightMm: '5.0',
      neededStitches: 124,
      neededRows: 40
    });
  });
});

describe('calculateGarmentFit', () => {
  it('computes crown data and negative-ease verdict for hats', () => {
    const r = calculateGarmentFit({ category: 'hats', baseMeasureCm: 56, baseHeightCm: 20, easeCm: -4, stitchesPerCm: 2, rowsPerCm: 2.5 });
    expect(r).toMatchObject({ finalWidthCm: '52.0', requiredStitches: 104, requiredRows: 50 });
    expect(r.hatData).toMatchObject({ crownDiameterCm: '16.6', crownRows: 21, straightRows: 29 });
    expect(r.verdict.badge).toBe('Ajuste Elástico (-4 cm)');
  });

  it.each([
    [0, 'A la Medida'],
    [5, 'Holgura Cómoda (+5 cm)'],
    [12, 'Oversized (+12 cm)']
  ])('ease %i cm gives "%s"', (easeCm, badge) => {
    const r = calculateGarmentFit({ category: 'tops', baseMeasureCm: 90, easeCm });
    expect(r.hatData).toBeNull();
    expect(r.verdict.badge).toBe(badge);
  });
});

describe('distributeShaping', () => {
  it('splits uneven increases into two symmetric groups', () => {
    const r = distributeShaping(40, 6, 'increase');
    expect(r.finalStitches).toBe(46);
    expect(r.formulaText).toBe('Opción recomendada simétrica:\n• (2 veces): *5 pb, aum*\n• (4 veces): *6 pb, aum*');
  });

  it('writes a single repeat when changes divide evenly', () => {
    expect(distributeShaping(36, 6).formulaText).toBe('*5 pb, aum* repetir 6 veces.');
    expect(distributeShaping(6, 6).formulaText).toBe('*aum* en cada punto (repetir 6 veces).');
  });

  it('rejects invalid input', () => {
    expect(distributeShaping(0, 3).error).toBeDefined();
    expect(distributeShaping(10, 6, 'decrease').error).toBeDefined();
  });
});

describe('estimateYarnConsumption', () => {
  it('projects from swatch weight', () => {
    const r = estimateYarnConsumption({ method: 'swatch_weight', yarnCyc: 4, swatchWeightGrams: 12, projectWidthCm: 80, projectHeightCm: 100 });
    expect(r).toMatchObject({ estimatedMeters: 1901, estimatedGrams: 1056, estimatedBalls: 11, recommendedBackupBalls: 2, totalWithBackup: 13 });
  });

  it('projects from unravelled yarn length using ball yardage', () => {
    const r = estimateYarnConsumption({ method: 'unravel_length', yarnCyc: 4, ballGrams: 50, ballMeters: 100 });
    expect(r).toMatchObject({ estimatedMeters: 211, estimatedGrams: 106, estimatedBalls: 3, ballMeters: 100 });
  });

  it('estimates from garment archetype by default', () => {
    const r = estimateYarnConsumption({ projectType: 'hat_adult', yarnCyc: 4, stitchType: 'sc' });
    expect(r).toMatchObject({ estimatedMeters: 188, estimatedGrams: 104, estimatedBalls: 2, method: 'garment_type' });
  });
});

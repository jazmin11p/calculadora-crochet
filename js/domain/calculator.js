/**
 * CrochetCalc (PuntoPerfecto) - Calculator Engine
 * Fórmulas matemáticas de recálculo de cadenetas, densidad de muestra, holgura, aumentos y yardaje.
 */

import { YARN_STANDARDS } from './data/yarnData.js';

/**
 * Encuentra los datos de un grosor de lana según su ID de CYC (0 a 7)
 */
export function getYarnById(cycId) {
  const parsed = parseInt(cycId, 10);
  return YARN_STANDARDS.find(y => y.id === parsed) || YARN_STANDARDS[4]; // Worsted por defecto
}

/**
 * Calcula el recálculo inteligente de cadenetas y vueltas
 * @param {Object} params
 * @param {number} params.origChains - Cadenetas originales del tutorial
 * @param {number} params.origHook - Ganchillo original en mm
 * @param {number} params.origYarnCyc - CYC de la lana original (0-7)
 * @param {number} params.userHook - Ganchillo del usuario en mm
 * @param {number} params.userYarnCyc - CYC de la lana del usuario (0-7)
 * @param {string} params.userTension - 'tight' | 'normal' | 'loose'
 * @param {number} params.multipleOf - Múltiplo de puntada (ej: 4)
 * @param {number} params.plusStitches - Puntos adicionales para bordes/simetría (ej: 2)
 * @param {number} params.origGaugeSts - (Opcional) Puntos en 10 cm originales
 * @param {number} params.userGaugeSts - (Opcional) Puntos en 10 cm del usuario
 * @param {number} params.origRows - (Opcional) Vueltas originales del tutorial
 */
export function recalculatePattern(params) {
  const origChains = Math.max(1, parseFloat(params.origChains) || 15);
  const origHook = Math.max(0.5, parseFloat(params.origHook) || 4.0);
  const userHook = Math.max(0.5, parseFloat(params.userHook) || 4.0);
  
  const origYarn = getYarnById(params.origYarnCyc);
  const userYarn = getYarnById(params.userYarnCyc);

  // Modificador de tensión del usuario
  let tensionFactor = 1.0;
  if (params.userTension === 'tight') tensionFactor = 1.10; // Teje apretado -> necesita más puntos
  if (params.userTension === 'loose') tensionFactor = 0.92; // Teje suelto -> necesita menos puntos

  let scaleRatio = 1.0;
  let originalStitchWidthMm = 0;
  let userStitchWidthMm = 0;
  let calculationMethod = 'material_formula';

  // Si el usuario proporcionó densidades de muestra exactas (Gauge):
  if (params.origGaugeSts && params.userGaugeSts && params.origGaugeSts > 0 && params.userGaugeSts > 0) {
    calculationMethod = 'swatch_exact';
    // ratio = (puntos usuario por cm) / (puntos orig por cm)
    scaleRatio = (params.userGaugeSts / params.origGaugeSts) * tensionFactor;
  } else {
    // Estimación matemática basada en diámetro de ganchillo y densidad volumétrica de lana
    // El tamaño de puntada es proporcional al diámetro del ganchillo y al grosor (factor densidad)
    const origStitchSize = origHook * Math.sqrt(origYarn.densityFactor);
    const userStitchSize = userHook * Math.sqrt(userYarn.densityFactor);

    originalStitchWidthMm = origStitchSize;
    userStitchWidthMm = userStitchSize;

    // Para mantener el mismo ancho en centímetros:
    // Puntos_nuevos * Tamaño_nuevo = Puntos_orig * Tamaño_orig
    // Puntos_nuevos = Puntos_orig * (Tamaño_orig / Tamaño_nuevo)
    scaleRatio = (origStitchSize / userStitchSize) * tensionFactor;
  }

  // Puntos flotantes teóricos
  const theoreticalStitches = origChains * scaleRatio;
  
  // Ajuste según múltiplo de puntada (si aplica)
  const multipleOf = parseInt(params.multipleOf, 10) || 0;
  const plusStitches = parseInt(params.plusStitches, 10) || 0;

  let finalStitches = Math.round(theoreticalStitches);

  if (multipleOf > 1) {
    // Encuentra el múltiplo más cercano que cumpla: n * multipleOf + plusStitches
    const baseStitches = theoreticalStitches - plusStitches;
    const countMultiples = Math.max(1, Math.round(baseStitches / multipleOf));
    finalStitches = Math.max(multipleOf + plusStitches, (countMultiples * multipleOf) + plusStitches);
  }

  // Estimación de vueltas si se proporcionaron
  let origRows = parseFloat(params.origRows) || 0;
  let finalRows = 0;
  if (origRows > 0) {
    // La altura del punto escala de forma similar a la densidad vertical
    const rowRatio = scaleRatio; // aproximadamente proporcional
    finalRows = Math.round(origRows * rowRatio);
  }

  // Estimación de dimensiones resultantes si se tejieran los puntos originales sin cambiar
  const unadjustedWidthPercentage = (1 / scaleRatio) * 100;
  const diffPercentage = ((finalStitches - origChains) / origChains) * 100;

  let advice = '';
  if (scaleRatio > 1.15) {
    advice = 'Tu hilo/ganchillo es más fino que el del tutorial. Necesitas tejer MÁS cadenetas para alcanzar el mismo tamaño.';
  } else if (scaleRatio < 0.85) {
    advice = 'Tu hilo/ganchillo es más grueso que el del tutorial. Necesitas tejer MENOS cadenetas para que la labor no te quede gigante.';
  } else {
    advice = 'Tus materiales tienen una densidad muy similar al tutorial original. El ajuste de puntos es mínimo.';
  }

  return {
    origChains,
    finalStitches,
    theoreticalStitches: theoreticalStitches.toFixed(1),
    scaleRatio: scaleRatio.toFixed(3),
    diffPercentage: diffPercentage >= 0 ? `+${diffPercentage.toFixed(0)}%` : `${diffPercentage.toFixed(0)}%`,
    unadjustedWidthPercentage: unadjustedWidthPercentage.toFixed(0),
    finalRows: finalRows > 0 ? finalRows : null,
    origRows: origRows > 0 ? origRows : null,
    multipleApplied: multipleOf > 1 ? `${multipleOf}n + ${plusStitches}` : null,
    calculationMethod,
    advice,
    isThicker: scaleRatio < 1.0,
    isThinner: scaleRatio > 1.0,
    isEqual: Math.abs(scaleRatio - 1.0) < 0.05
  };
}

/**
 * Calcula métricas a partir de una muestra de tensión rápida (Express Swatch)
 * @param {Object} swatch
 * @param {number} swatch.stitches - Puntos tejidos en la muestra (ej: 10 o 15)
 * @param {number} swatch.widthCm - Ancho medido en cm con regla
 * @param {number} swatch.rows - Vueltas tejidas en la muestra (ej: 8 o 10)
 * @param {number} swatch.heightCm - Alto medido en cm con regla
 * @param {number} swatch.targetWidthCm - Medida objetivo deseada de ancho en cm
 * @param {number} swatch.targetHeightCm - Medida objetivo deseada de alto en cm
 * @param {number} swatch.multipleOf - Múltiplo de puntada
 * @param {number} swatch.plusStitches - Puntos extra
 */
export function calculateQuickSwatch(swatch) {
  const stitches = Math.max(1, parseFloat(swatch.stitches) || 10);
  const widthCm = Math.max(0.1, parseFloat(swatch.widthCm) || 5.0);
  const rows = Math.max(1, parseFloat(swatch.rows) || 10);
  const heightCm = Math.max(0.1, parseFloat(swatch.heightCm) || 5.0);

  // Densidad por centímetro
  const stitchesPerCm = stitches / widthCm;
  const rowsPerCm = rows / heightCm;

  // Equivalente estándar a 10 cm x 10 cm
  const stitchesIn10cm = stitchesPerCm * 10;
  const rowsIn10cm = rowsPerCm * 10;

  // Tamaño de un solo punto en mm
  const stitchWidthMm = (widthCm / stitches) * 10;
  const stitchHeightMm = (heightCm / rows) * 10;

  // Si se solicita calcular una medida objetivo
  let targetWidthCm = parseFloat(swatch.targetWidthCm) || 0;
  let targetHeightCm = parseFloat(swatch.targetHeightCm) || 0;

  let neededStitches = 0;
  let neededRows = 0;

  if (targetWidthCm > 0) {
    const rawStitches = targetWidthCm * stitchesPerCm;
    const multipleOf = parseInt(swatch.multipleOf, 10) || 0;
    const plusStitches = parseInt(swatch.plusStitches, 10) || 0;

    if (multipleOf > 1) {
      const base = rawStitches - plusStitches;
      const counts = Math.max(1, Math.round(base / multipleOf));
      neededStitches = Math.max(multipleOf + plusStitches, (counts * multipleOf) + plusStitches);
    } else {
      neededStitches = Math.round(rawStitches);
    }
  }

  if (targetHeightCm > 0) {
    neededRows = Math.round(targetHeightCm * rowsPerCm);
  }

  return {
    stitchesPerCm: stitchesPerCm.toFixed(2),
    rowsPerCm: rowsPerCm.toFixed(2),
    stitchesIn10cm: stitchesIn10cm.toFixed(1),
    rowsIn10cm: rowsIn10cm.toFixed(1),
    stitchWidthMm: stitchWidthMm.toFixed(1),
    stitchHeightMm: stitchHeightMm.toFixed(1),
    neededStitches,
    neededRows,
    targetWidthCm,
    targetHeightCm
  };
}

/**
 * Calcula medidas para comprobador de tallas y gorros (con corona y holgura)
 * @param {Object} params
 * @param {string} params.category - 'tops' | 'hats' | 'scarves' | 'blankets' | 'bags' | 'custom'
 * @param {number} params.baseMeasureCm - Medida base (pecho, circunferencia, ancho)
 * @param {number} params.baseHeightCm - Largo base
 * @param {number} params.easeCm - Holgura en cm
 * @param {number} params.stitchesPerCm - Densidad de puntos/cm de la muestra
 * @param {number} params.rowsPerCm - Densidad de vueltas/cm de la muestra
 */
export function calculateGarmentFit(params) {
  const baseMeasure = Math.max(1, parseFloat(params.baseMeasureCm) || 90);
  const baseHeight = Math.max(1, parseFloat(params.baseHeightCm) || 60);
  const easeCm = parseFloat(params.easeCm) || 0;
  const stitchesPerCm = parseFloat(params.stitchesPerCm) || 2.0;
  const rowsPerCm = parseFloat(params.rowsPerCm) || 2.5;

  const finalWidthCm = Math.max(5, baseMeasure + easeCm);
  const finalHeightCm = baseHeight;

  // Puntos necesarios según la densidad de la tejedora
  const requiredStitches = Math.round(finalWidthCm * stitchesPerCm);
  const requiredRows = Math.round(finalHeightCm * rowsPerCm);

  // Cálculos especiales para gorros:
  let hatData = null;
  if (params.category === 'hats') {
    // Circunferencia final con holgura negativa recomendada
    const hatCircumference = finalWidthCm;
    // Diámetro de corona = Circunferencia / PI
    const crownDiameterCm = (hatCircumference / Math.PI);
    // Radio de la corona
    const crownRadiusCm = crownDiameterCm / 2;
    // Vueltas estimadas para tejer la corona plana antes de tejer recto sin aumentos
    const crownRows = Math.max(1, Math.round(crownRadiusCm * rowsPerCm));
    // Vueltas rectas restantes
    const straightRows = Math.max(1, requiredRows - crownRows);

    hatData = {
      circumferenceCm: hatCircumference.toFixed(1),
      crownDiameterCm: crownDiameterCm.toFixed(1),
      crownRows,
      straightRows,
      tip: `Teje en círculos aumentando hasta que tu círculo plano mida exactamente ${crownDiameterCm.toFixed(1)} cm de diámetro. Luego continúa tejiendo recto sin aumentos hasta alcanzar los ${finalHeightCm} cm de altura total.`
    };
  }

  // Veredicto de holgura
  let verdict = {
    badge: 'A la Medida',
    color: 'emerald',
    description: 'La prenda quedará justa a las medidas anatómicas seleccionadas.'
  };

  if (easeCm < 0) {
    verdict = {
      badge: `Ajuste Elástico (${easeCm} cm)`,
      color: 'amber',
      description: 'Quedará ceñida y requerirá que el tejido estire para adaptarse.'
    };
  } else if (easeCm > 10) {
    verdict = {
      badge: `Oversized (+${easeCm} cm)`,
      color: 'indigo',
      description: 'Caída amplia y relajada estilo boyfriend/moderno.'
    };
  } else if (easeCm > 0) {
    verdict = {
      badge: `Holgura Cómoda (+${easeCm} cm)`,
      color: 'teal',
      description: 'Cae holgada y confortable para vestir con libertad de movimiento.'
    };
  }

  return {
    baseMeasure,
    baseHeight,
    easeCm,
    finalWidthCm: finalWidthCm.toFixed(1),
    finalHeightCm: finalHeightCm.toFixed(1),
    requiredStitches,
    requiredRows,
    hatData,
    verdict
  };
}

/**
 * Distribuye aumentos o disminuciones de forma equidistante a lo largo de una vuelta
 * @param {number} totalStitches - Puntos actuales en la vuelta (ej: 40)
 * @param {number} changeCount - Cantidad de aumentos o disminuciones a realizar (ej: 6)
 * @param {string} type - 'increase' | 'decrease'
 */
export function distributeShaping(totalStitches, changeCount, type = 'increase') {
  const currentSts = parseInt(totalStitches, 10) || 0;
  const changes = parseInt(changeCount, 10) || 0;

  if (currentSts <= 0 || changes <= 0) {
    return { error: 'Introduce valores mayores a 0' };
  }

  if (type === 'decrease' && changes * 2 > currentSts) {
    return { error: 'No puedes hacer más disminuciones de las que permiten tus puntos actuales (máximo la mitad de puntos).' };
  }

  const finalStitches = type === 'increase' ? currentSts + changes : currentSts - changes;
  const abbr = type === 'increase' ? 'aum' : 'dism';
  const stsConsumedPerChange = type === 'increase' ? 1 : 2;

  // Calculamos el intervalo base entre cambios
  const baseInterval = Math.floor(currentSts / changes);
  const remainder = currentSts % changes;

  // Generamos la fórmula escrita en lenguaje claro de patrón
  let formulaText = '';
  let groupA_count = changes - remainder;
  let groupA_interval = type === 'increase' ? baseInterval - 1 : baseInterval - 2;

  let groupB_count = remainder;
  let groupB_interval = type === 'increase' ? baseInterval : baseInterval - 1;

  if (remainder === 0) {
    if (groupA_interval > 0) {
      formulaText = `*${groupA_interval} pb, ${abbr}* repetir ${changes} veces.`;
    } else {
      formulaText = `*${abbr}* en cada punto (repetir ${changes} veces).`;
    }
  } else {
    formulaText = `Opción recomendada simétrica:\n` +
      `• (${groupA_count} veces): *${groupA_interval} pb, ${abbr}*\n` +
      `• (${groupB_count} veces): *${groupB_interval} pb, ${abbr}*`;
  }

  return {
    currentStitches: currentSts,
    changes,
    finalStitches,
    type,
    formulaText,
    intervalBase: baseInterval,
    remainder
  };
}

/**
 * Estima el consumo de lana con máxima precisión usando 3 métodos distintos:
 * 1. Método por Peso de Muestra (Báscula de cocina - Máxima precisión)
 * 2. Método por Longitud de Hilo en Muestra Deshecha
 * 3. Método por Tipo de Prenda, Talla y Textura de Puntada
 */
export function estimateYarnConsumption(params) {
  const method = params.method || 'garment_type';
  const yarn = getYarnById(params.yarnCyc);
  const ballGrams = parseFloat(params.ballGrams) || 100;
  const ballMeters = parseFloat(params.ballMeters) || 0;
  const safetyMargin = (parseFloat(params.safetyMargin) || 10) / 100; // Margen de seguridad (ej: 10%)

  // Factor de textura según el tipo de punto de crochet
  const stitchMultiplierMap = {
    lace_mesh: 0.75,     // Puntos muy calados / red de cadenetas (-25%)
    sc: 0.95,            // Punto bajo compacto
    hdc: 1.05,           // Medio punto alto
    dc: 1.15,            // Punto alto / vareta clásico
    tr: 1.25,            // Punto alto doble
    granny: 1.10,        // Granny squares / grupos de varetas
    textured_bobble: 1.40// Puntos relieve, punto alpino, popcorn, piñas (+40%)
  };
  const stitchFactor = stitchMultiplierMap[params.stitchType] || 1.15;

  let estimatedGrams = 0;
  let estimatedMeters = 0;
  let calculationDetails = '';

  // METODO 1: Por peso de muestra en báscula (El más preciso de todos)
  if (method === 'swatch_weight') {
    const swatchW = Math.max(1, parseFloat(params.swatchWidthCm) || 10);
    const swatchH = Math.max(1, parseFloat(params.swatchHeightCm) || 10);
    const swatchWeight = Math.max(0.1, parseFloat(params.swatchWeightGrams) || 12);
    const projW = Math.max(1, parseFloat(params.projectWidthCm) || 80);
    const projH = Math.max(1, parseFloat(params.projectHeightCm) || 100);

    const swatchArea = swatchW * swatchH; // cm²
    const projectArea = projW * projH;   // cm²

    // Gramos base proporcionales al área
    const rawGrams = (projectArea / swatchArea) * swatchWeight;
    estimatedGrams = Math.round(rawGrams * (1 + safetyMargin));

    // Metros proporcionales según rendimiento de la lana
    const avgMetersPer100gMap = [800, 400, 300, 225, 180, 125, 70, 35];
    const metersPerGram = (ballMeters > 0 && ballGrams > 0) 
      ? (ballMeters / ballGrams) 
      : ((avgMetersPer100gMap[yarn.id] || 180) / 100);

    estimatedMeters = Math.round(estimatedGrams * metersPerGram);
    calculationDetails = `Calculado mediante el peso real de tu muestra (${swatchWeight}g en ${swatchW}×${swatchH}cm) proyectado a una labor de ${projW}×${projH}cm (+${Math.round(safetyMargin*100)}% de seguridad).`;
  }
  
  // METODO 2: Por hilo deshecho (medir cuántos metros gastaste en 10 puntos)
  else if (method === 'unravel_length') {
    const stsSample = Math.max(1, parseFloat(params.sampleStitches) || 10);
    const yarnLengthCm = Math.max(1, parseFloat(params.unravelYarnLengthCm) || 80);
    const totalStsInProject = Math.max(1, parseFloat(params.totalProjectStitches) || 2400);

    // Centímetros de hilo por puntada
    const cmPerStitch = yarnLengthCm / stsSample;
    const rawMeters = (totalStsInProject * cmPerStitch) / 100;
    estimatedMeters = Math.round(rawMeters * (1 + safetyMargin));

    const avgMetersPer100gMap = [800, 400, 300, 225, 180, 125, 70, 35];
    const metersPerGram = (ballMeters > 0 && ballGrams > 0) 
      ? (ballMeters / ballGrams) 
      : ((avgMetersPer100gMap[yarn.id] || 180) / 100);

    estimatedGrams = Math.round(estimatedMeters / metersPerGram);
    calculationDetails = `Calculado a partir de ${cmPerStitch.toFixed(1)} cm de hilo por cada punto en un total de ${totalStsInProject} puntos proyectados.`;
  }
  
  // METODO 3: Por Arquetipo de Prenda y Talla estándar
  else {
    const baseMetersMap = {
      hat_baby: 90,
      hat_child: 120,
      hat_adult: 180,
      cowl: 220,
      scarf_child: 200,
      scarf_adult: 390,
      scarf_wide: 550,
      shawl_triangle: 680,
      baby_blanket: 850,
      throw_blanket: 1600,
      double_blanket: 2800,
      top_crop: 450,
      top_sleeveless: 620,
      sweater_xs_s: 1100,
      sweater_m: 1350,
      sweater_l_xl: 1650,
      sweater_2xl_3xl: 1950,
      cardigan_m: 1550,
      bag_tote: 420,
      amigurumi_s: 70,
      amigurumi_m: 160,
      amigurumi_l: 320,
      custom_dimensions: 500
    };

    let baseMeters = baseMetersMap[params.projectType] || 500;

    // Si es dimensión personalizada libre
    if (params.projectType === 'custom_dimensions' && params.customWidthCm && params.customHeightCm) {
      const areaM2 = (parseFloat(params.customWidthCm) * parseFloat(params.customHeightCm)) / 10000;
      baseMeters = areaM2 * 950;
    }

    // Ajuste por grosor de hilo
    const yarnThicknessMultiplier = Math.sqrt(yarn.densityFactor);
    const adjustedForYarn = baseMeters * (1 / yarnThicknessMultiplier);

    // Ajuste por textura de punto y margen de seguridad
    estimatedMeters = Math.round(adjustedForYarn * stitchFactor * (1 + safetyMargin));

    const avgMetersPer100gMap = [800, 400, 300, 225, 180, 125, 70, 35];
    const metersPerGram = (ballMeters > 0 && ballGrams > 0) 
      ? (ballMeters / ballGrams) 
      : ((avgMetersPer100gMap[yarn.id] || 180) / 100);

    estimatedGrams = Math.round(estimatedMeters / metersPerGram);
    calculationDetails = `Estimación basada en arquetipo de patrón, factor de puntada (${params.stitchType || 'punto alto'}) y un +${Math.round(safetyMargin*100)}% de margen de seguridad.`;
  }

  // Número de ovillos
  let estimatedBalls = 0;
  if (ballMeters > 0) {
    estimatedBalls = Math.ceil(estimatedMeters / ballMeters);
  } else {
    estimatedBalls = Math.ceil(estimatedGrams / ballGrams);
  }
  estimatedBalls = Math.max(1, estimatedBalls);

  // Ovillos de reserva recomendados
  const recommendedBackupBalls = estimatedBalls >= 6 ? 2 : 1;

  return {
    estimatedMeters,
    estimatedGrams,
    estimatedBalls,
    recommendedBackupBalls,
    totalWithBackup: estimatedBalls + recommendedBackupBalls,
    ballGrams,
    ballMeters: ballMeters > 0 ? ballMeters : null,
    safetyMarginPercent: Math.round(safetyMargin * 100),
    yarnName: yarn.nameES,
    calculationDetails,
    method
  };
}

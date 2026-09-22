/**
 * CrochetCalc (PuntoPerfecto) - UI Rendering & Interactions
 * Manejo de vistas, selects dinámicos, renderizado de SVG interactivo, tablas, buscador y notificaciones.
 */

import { YARN_STANDARDS, HOOK_SIZES, CROCHET_GLOSSARY } from './data/yarnData.js';
import { GARMENT_CATEGORIES, EASE_OPTIONS } from './data/presetsData.js';

/**
 * Muestra una notificación tipo Toast emergente
 */
export function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-msg';

  let icon = 'fa-check-circle text-sage-400';
  if (type === 'error') icon = 'fa-circle-exclamation text-rose-400';
  if (type === 'info') icon = 'fa-circle-info text-terracotta-400';

  toast.innerHTML = `
    <i class="fa-solid ${icon} text-lg"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Reproduce un sonido suave de clic o éxito usando Web Audio API
 */
export function playHapticSound(type = 'click') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.04); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    }

    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  } catch (e) {
    // AudioContext puede estar bloqueado antes de la primera interacción
  }
}

/**
 * Llena todos los selectores de lanas y ganchillos en la interfaz
 */
export function populateSelectElements() {
  const yarnSelects = [
    document.getElementById('orig-yarn'),
    document.getElementById('user-yarn'),
    document.getElementById('calc-yarn-cyc'),
    document.getElementById('yardage-yarn-select')
  ];

  const yarnOptionsHtml = YARN_STANDARDS.map(y => 
    `<option value="${y.id}" ${y.id === 4 ? 'selected' : ''}>
      CYC #${y.cyc} - ${y.nameES} (${y.wpi})
    </option>`
  ).join('');

  yarnSelects.forEach(select => {
    if (select) select.innerHTML = yarnOptionsHtml;
  });

  // Ajustar defaults
  const origYarnSelect = document.getElementById('orig-yarn');
  const userYarnSelect = document.getElementById('user-yarn');
  if (origYarnSelect) origYarnSelect.value = '3'; // DK por defecto para original
  if (userYarnSelect) userYarnSelect.value = '4'; // Worsted por defecto para usuario

  // Selects de Ganchillos
  const hookSelects = [
    document.getElementById('orig-hook'),
    document.getElementById('user-hook')
  ];

  const hookOptionsHtml = HOOK_SIZES.map(h => 
    `<option value="${h.mm}">
      ${h.mm} mm (US: ${h.us}${h.uk !== '-' ? ` | UK: ${h.uk}` : ''})
    </option>`
  ).join('');

  hookSelects.forEach(select => {
    if (select) select.innerHTML = hookOptionsHtml;
  });

  const origHookSelect = document.getElementById('orig-hook');
  const userHookSelect = document.getElementById('user-hook');
  if (origHookSelect) origHookSelect.value = '4';
  if (userHookSelect) userHookSelect.value = '5.5';

  // Opciones de holgura
  const easeSelect = document.getElementById('ease-select');
  if (easeSelect) {
    easeSelect.innerHTML = EASE_OPTIONS.map(e => 
      `<option value="${e.value}" ${e.value === 5 ? 'selected' : ''}>
        ${e.name}
      </option>`
    ).join('');
  }

  // Categorías de Prendas
  populateGarmentCategories();
}

/**
 * Llena la cuadrícula de categorías de prendas en el comprobador de tallas
 */
export function populateGarmentCategories() {
  const grid = document.getElementById('garment-category-grid');
  if (!grid) return;

  grid.innerHTML = GARMENT_CATEGORIES.map((cat, idx) => `
    <button type="button" class="category-btn p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${idx === 0 ? 'border-terracotta-500 bg-terracotta-50/50 text-terracotta-700 shadow-sm' : 'border-sand-200 bg-white text-sand-800 hover:border-sand-300'}" data-category="${cat.id}">
      <i class="fa-solid ${cat.icon} text-lg"></i>
      <span class="text-xs font-bold leading-tight">${cat.name.split(',')[0]}</span>
    </button>
  `).join('');

  updatePresetSizesSelect(GARMENT_CATEGORIES[0].id);
}

/**
 * Actualiza el select de tallas según la categoría seleccionada
 */
export function updatePresetSizesSelect(categoryId) {
  const select = document.getElementById('preset-size-select');
  const cat = GARMENT_CATEGORIES.find(c => c.id === categoryId);
  if (!select || !cat) return;

  select.innerHTML = cat.presets.map(p => `
    <option value="${p.id}">
      ${p.name}
    </option>
  `).join('');

  // Actualizar etiquetas de los campos según la categoría
  const labelWidth = document.getElementById('label-measure-width');
  const labelHeight = document.getElementById('label-measure-height');

  if (categoryId === 'hats') {
    if (labelWidth) labelWidth.textContent = 'Circunferencia de Cabeza (cm):';
    if (labelHeight) labelHeight.textContent = 'Altura del Gorro (cm):';
  } else if (categoryId === 'blankets' || categoryId === 'bags' || categoryId === 'scarves') {
    if (labelWidth) labelWidth.textContent = 'Ancho Deseado (cm):';
    if (labelHeight) labelHeight.textContent = 'Largo Deseado (cm):';
  } else {
    if (labelWidth) labelWidth.textContent = 'Contorno de Pecho (cm):';
    if (labelHeight) labelHeight.textContent = 'Largo de Prenda (cm):';
  }

  // Cargar primera opción
  loadPresetValues(categoryId, cat.presets[0].id);
}

/**
 * Carga los valores de ancho y alto de un preset en los inputs
 */
export function loadPresetValues(categoryId, presetId) {
  const cat = GARMENT_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return;
  const preset = cat.presets.find(p => p.id === presetId);
  if (!preset) return;

  const widthInput = document.getElementById('fit-base-width');
  const heightInput = document.getElementById('fit-base-height');
  const easeSelect = document.getElementById('ease-select');

  if (categoryId === 'hats') {
    if (widthInput) widthInput.value = preset.headCircCm;
    if (heightInput) heightInput.value = preset.heightCm;
  } else if (categoryId === 'tops') {
    if (widthInput) widthInput.value = preset.chestCm;
    if (heightInput) heightInput.value = preset.lengthCm;
  } else {
    if (widthInput) widthInput.value = preset.widthCm;
    if (heightInput) heightInput.value = preset.lengthCm;
  }

  if (easeSelect && preset.easeRecommended !== undefined) {
    easeSelect.value = preset.easeRecommended.toString();
  }
}

/**
 * Renderiza el gráfico SVG interactivo de la prenda con medidas
 */
export function renderGarmentSvg(category, widthCm, heightCm, easeCm, hatData) {
  const container = document.getElementById('garment-svg-container');
  if (!container) return;

  const finalW = parseFloat(widthCm) || 50;
  const finalH = parseFloat(heightCm) || 60;

  let svgContent = '';

  if (category === 'hats') {
    const crownD = hatData ? hatData.crownDiameterCm : (finalW / Math.PI).toFixed(1);
    svgContent = `
      <svg viewBox="0 0 260 200" class="w-full max-h-48" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="hatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#DD9075" />
            <stop offset="100%" stop-color="#C85A32" />
          </linearGradient>
        </defs>
        <!-- Gorro Domo -->
        <path d="M 40 140 C 40 60, 220 60, 220 140 Z" fill="url(#hatGrad)" opacity="0.85" stroke="#9B3919" stroke-width="2"/>
        <!-- Pompón decorativo -->
        <circle cx="130" cy="55" r="14" fill="#FAF8F5" stroke="#C85A32" stroke-width="2" stroke-dasharray="3,2"/>
        <!-- Dobladillo elástico -->
        <rect x="35" y="140" width="190" height="24" rx="6" fill="#7E2E14" stroke="#672611" stroke-width="1.5"/>
        <line x1="60" y1="140" x2="60" y2="164" stroke="#FAF8F5" stroke-width="1" opacity="0.4"/>
        <line x1="95" y1="140" x2="95" y2="164" stroke="#FAF8F5" stroke-width="1" opacity="0.4"/>
        <line x1="130" y1="140" x2="130" y2="164" stroke="#FAF8F5" stroke-width="1" opacity="0.4"/>
        <line x1="165" y1="140" x2="165" y2="164" stroke="#FAF8F5" stroke-width="1" opacity="0.4"/>
        <line x1="200" y1="140" x2="200" y2="164" stroke="#FAF8F5" stroke-width="1" opacity="0.4"/>

        <!-- Cotas y Textos -->
        <text x="130" y="115" text-anchor="middle" font-weight="bold" fill="#FFFFFF" font-size="12">Circunferencia: ${finalW} cm</text>
        <text x="130" y="156" text-anchor="middle" font-weight="bold" fill="#FAF8F5" font-size="10">Elástico / Dobladillo</text>
        <!-- Cota Corona Plana -->
        <circle cx="130" cy="95" r="22" fill="none" stroke="#FAF8F5" stroke-width="1.5" stroke-dasharray="4,3"/>
        <text x="130" y="99" text-anchor="middle" font-weight="bold" fill="#FAF8F5" font-size="9">Ø Corona: ${crownD} cm</text>
      </svg>
    `;
  } else if (category === 'blankets') {
    svgContent = `
      <svg viewBox="0 0 260 180" class="w-full max-h-48" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="20" width="200" height="140" rx="10" fill="#E6ECE8" stroke="#58816B" stroke-width="2.5" />
        <rect x="42" y="32" width="176" height="116" rx="6" fill="#F4F7F5" stroke="#A9BFA0" stroke-width="1.5" stroke-dasharray="6,4"/>
        <!-- Textos y Cotas -->
        <text x="130" y="85" text-anchor="middle" font-weight="bold" fill="#385545" font-size="14 font-serif">Manta Crochet</text>
        <text x="130" y="105" text-anchor="middle" font-weight="bold" fill="#58816B" font-size="13">${finalW} cm × ${finalH} cm</text>
      </svg>
    `;
  } else if (category === 'scarves') {
    svgContent = `
      <svg viewBox="0 0 260 180" class="w-full max-h-48" xmlns="http://www.w3.org/2000/svg">
        <!-- Bufanda en curva -->
        <path d="M 40 40 Q 130 15 220 40 L 220 75 Q 130 50 40 75 Z" fill="#DD9075" stroke="#B84B25" stroke-width="2"/>
        <path d="M 70 65 L 70 155 L 105 155 L 105 65 Z" fill="#C85A32" stroke="#B84B25" stroke-width="2"/>
        <!-- Flecos -->
        <line x1="75" y1="155" x2="75" y2="170" stroke="#7E2E14" stroke-width="2"/>
        <line x1="85" y1="155" x2="85" y2="170" stroke="#7E2E14" stroke-width="2"/>
        <line x1="95" y1="155" x2="95" y2="170" stroke="#7E2E14" stroke-width="2"/>
        <text x="175" y="120" text-anchor="middle" font-weight="bold" fill="#2C211B" font-size="13">${finalW} cm ancho</text>
        <text x="175" y="140" text-anchor="middle" font-medium fill="#79685E" font-size="11">Largo total: ${finalH} cm</text>
      </svg>
    `;
  } else {
    // Top / Jersey por defecto
    svgContent = `
      <svg viewBox="0 0 260 200" class="w-full max-h-48" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sweaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#F4D5CB" />
            <stop offset="100%" stop-color="#EABAA9" />
          </linearGradient>
        </defs>
        <!-- Silueta de Jersey -->
        <path d="M 85 30 Q 130 45 175 30 L 235 70 L 210 100 L 180 85 L 180 170 L 80 170 L 80 85 L 50 100 L 25 70 Z" 
              fill="url(#sweaterGrad)" stroke="#C85A32" stroke-width="2"/>
        <!-- Cuello -->
        <path d="M 95 30 Q 130 50 165 30" fill="none" stroke="#B84B25" stroke-width="2.5"/>
        <!-- Dobladillo -->
        <line x1="80" y1="170" x2="180" y2="170" stroke="#9B3919" stroke-width="3"/>
        
        <!-- Línea Cota Ancho Pecho -->
        <line x1="80" y1="115" x2="180" y2="115" stroke="#9B3919" stroke-width="1.5" stroke-dasharray="3,2"/>
        <text x="130" y="110" text-anchor="middle" font-weight="bold" fill="#7E2E14" font-size="11">Contorno: ${finalW} cm</text>
        
        <!-- Cota Largo -->
        <line x1="72" y1="35" x2="72" y2="170" stroke="#58816B" stroke-width="1.5"/>
        <text x="65" y="105" text-anchor="end" font-weight="bold" fill="#385545" font-size="10" transform="rotate(-90 65 105)">Largo: ${finalH} cm</text>

        <!-- Indicador de Holgura -->
        <rect x="90" y="130" width="80" height="20" rx="10" fill="#FFFFFF" stroke="#C85A32" stroke-width="1"/>
        <text x="130" y="144" text-anchor="middle" font-weight="bold" fill="#C85A32" font-size="9">Holgura: ${easeCm >= 0 ? `+${easeCm}` : easeCm} cm</text>
      </svg>
    `;
  }

  container.innerHTML = svgContent;
}

/**
 * Renderiza la tabla de grosores de lana CYC
 */
export function renderYarnTable() {
  const tbody = document.getElementById('table-yarns-body');
  if (!tbody) return;

  tbody.innerHTML = YARN_STANDARDS.map(y => `
    <tr class="hover:bg-sand-50 transition">
      <td class="p-3.5 font-bold">
        <span class="w-7 h-7 rounded-full bg-terracotta-100 text-terracotta-700 inline-flex items-center justify-center text-xs font-black">
          ${y.cyc}
        </span>
      </td>
      <td class="p-3.5">
        <strong class="text-sand-900 block">${y.nameES}</strong>
        <span class="text-[11px] text-sand-800/70">${y.types}</span>
      </td>
      <td class="p-3.5 font-semibold text-terracotta-600">
        ${y.recommendedHookMin} - ${y.recommendedHookMax} mm
        <span class="text-[11px] text-sand-800/60 block">US: ${y.recommendedHookUS}</span>
      </td>
      <td class="p-3.5 font-medium text-sand-800">${y.wpi}</td>
      <td class="p-3.5 font-bold text-sage-700">~${y.defaultStitches10cm} pts</td>
      <td class="p-3.5 text-sand-800 font-medium">${y.metersPer100g}</td>
    </tr>
  `).join('');
}

/**
 * Renderiza la tabla de ganchillos
 */
export function renderHookTable() {
  const tbody = document.getElementById('table-hooks-body');
  if (!tbody) return;

  tbody.innerHTML = HOOK_SIZES.map(h => `
    <tr class="hover:bg-sand-50 transition">
      <td class="p-3.5 font-bold text-terracotta-700 text-sm">${h.mm} mm</td>
      <td class="p-3.5 font-bold text-sand-900">${h.us}</td>
      <td class="p-3.5 text-sand-800 font-medium">${h.uk}</td>
      <td class="p-3.5 text-sand-800/80 text-xs">${h.note}</td>
    </tr>
  `).join('');
}

/**
 * Renderiza el glosario de puntos con filtro opcional de búsqueda
 */
export function renderGlossaryTable(filterQuery = '') {
  const tbody = document.getElementById('table-glossary-body');
  if (!tbody) return;

  const q = filterQuery.toLowerCase().trim();
  const filtered = CROCHET_GLOSSARY.filter(item => {
    if (!q) return true;
    return (
      item.es.toLowerCase().includes(q) ||
      item.esAbbr.toLowerCase().includes(q) ||
      item.us.toLowerCase().includes(q) ||
      item.usAbbr.toLowerCase().includes(q) ||
      item.uk.toLowerCase().includes(q) ||
      item.ukAbbr.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="p-6 text-center text-sand-800/60 font-medium">
          No se encontraron puntos con el término "${filterQuery}".
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => `
    <tr class="hover:bg-sand-50 transition">
      <td class="p-3.5">
        <strong class="text-sand-900 block">${item.es}</strong>
        <span class="text-[11px] font-mono font-bold text-terracotta-600 bg-terracotta-50 px-1.5 py-0.5 rounded">${item.esAbbr}</span>
      </td>
      <td class="p-3.5">
        <span class="font-bold text-sand-900 block">${item.us}</span>
        <span class="text-[11px] font-mono text-sand-800/70">(${item.usAbbr})</span>
      </td>
      <td class="p-3.5">
        <span class="font-bold text-sand-900 block">${item.uk}</span>
        <span class="text-[11px] font-mono text-sand-800/70">(${item.ukAbbr})</span>
      </td>
      <td class="p-3.5 text-center font-bold text-lg text-sage-700">${item.symbol}</td>
      <td class="p-3.5 text-xs text-sand-800/80 leading-relaxed">${item.description}</td>
    </tr>
  `).join('');
}

/**
 * Renderiza la lista de proyectos en la libreta
 */
export function renderProjectsList(projects, activeProjectId, onSelectProject, onDeleteProject) {
  const container = document.getElementById('projects-list-container');
  const countBadge = document.getElementById('projects-count-badge');
  if (!container) return;

  if (countBadge) {
    countBadge.textContent = `${projects.length} ${projects.length === 1 ? 'Proyecto' : 'Proyectos'}`;
  }

  if (projects.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-sand-800/60 text-xs">
        <i class="fa-regular fa-folder-open text-3xl mb-2 block text-sand-400"></i>
        No tienes proyectos guardados aún.<br>Usa el botón "Nuevo Proyecto" o guarda tus cálculos.
      </div>
    `;
    return;
  }

  container.innerHTML = projects.map(p => {
    const isActive = p.id === activeProjectId;
    const progressPercent = Math.min(100, Math.round(((p.currentRow || 1) / (p.targetRows || 20)) * 100));

    return `
      <div class="p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${isActive ? 'bg-terracotta-50/70 border-terracotta-400 shadow-sm' : 'bg-white border-sand-200 hover:border-sand-300'}" data-project-id="${p.id}">
        <div class="flex-1 min-w-0" onclick="window.selectProject('${p.id}')">
          <div class="flex items-center gap-2 mb-1">
            <strong class="text-xs font-bold text-sand-900 truncate block">${p.title || 'Proyecto sin título'}</strong>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${p.status === 'completed' ? 'bg-sage-100 text-sage-700' : 'bg-terracotta-100 text-terracotta-700'}">
              ${p.status === 'completed' ? 'Terminado' : 'En progreso'}
            </span>
          </div>
          <div class="text-[11px] text-sand-800/70 flex items-center gap-3">
            <span><i class="fa-solid fa-hashtag text-terracotta-500"></i> ${p.recalcChains || p.origChains || '-'} cad</span>
            <span><i class="fa-solid fa-stopwatch text-sage-600"></i> Vta ${p.currentRow || 1} / ${p.targetRows || 20} (${progressPercent}%)</span>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <button type="button" class="p-1.5 text-sand-800 hover:text-terracotta-600 transition text-xs" title="Cargar en contador" onclick="window.selectProject('${p.id}')">
            <i class="fa-solid fa-play"></i>
          </button>
          <button type="button" class="p-1.5 text-sand-800/50 hover:text-rose-600 transition text-xs" title="Eliminar" onclick="window.confirmDeleteProject('${p.id}')">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

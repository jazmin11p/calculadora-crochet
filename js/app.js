/**
 * CrochetCalc (PuntoPerfecto) - Main Application Controller
 * Coordinador de eventos, cálculos reactivos, sincronización y almacenamiento.
 */

import { recalculatePattern, calculateQuickSwatch, calculateGarmentFit, distributeShaping, estimateYarnConsumption } from './calculator.js';
import { 
  getProjects, 
  saveProject, 
  deleteProject, 
  getActiveCounter, 
  saveActiveCounter, 
  processImageFile, 
  initializeSampleProjects,
  syncUserDataOnLogin,
  listenToRealtimeCloudUpdates
} from './storage.js';
import { 
  initAuth, 
  getCurrentUser, 
  isLoggedIn, 
  loginWithGoogle, 
  loginWithEmail, 
  registerWithEmail, 
  logoutUser, 
  onAuthChange 
} from './auth.js';
import { 
  populateSelectElements, 
  updatePresetSizesSelect, 
  renderGarmentSvg, 
  renderYarnTable, 
  renderHookTable, 
  renderGlossaryTable, 
  renderProjectsList, 
  showToast, 
  playHapticSound 
} from './ui.js';
import { GARMENT_CATEGORIES } from './data/presetsData.js';

// Estado global de la aplicación
const AppState = {
  currentTab: 'converter',
  activeProjectId: null,
  activeCounter: {
    projectName: 'Mi Labor Actual',
    currentRow: 1,
    targetRows: 20,
    repeats: 1,
    notes: '',
    history: []
  },
  currentGauge: {
    stitchesPerCm: 1.54,
    rowsPerCm: 1.60
  },
  wakeLock: null,
  activeGarmentCategory: 'tops'
};

/**
 * Inicialización principal
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicializar proyectos de ejemplo si es primera vez
  initializeSampleProjects();

  // 2. Poblar componentes UI y tablas
  populateSelectElements();
  renderYarnTable();
  renderHookTable();
  renderGlossaryTable();

  // 3. Cargar contador activo
  AppState.activeCounter = getActiveCounter();
  updateCounterUI();

  // 4. Cargar lista de proyectos
  refreshProjectsList();

  // 5. Vincular eventos de formularios y autenticación
  setupEventListeners();
  setupAuthEventListeners();

  // 6. Inicializar estado de autenticación
  initAuth();
  onAuthChange(handleAuthStatusChange);

  // 7. Ejecutar cálculos iniciales
  triggerConverterCalculation();
  triggerDedicatedYarnCalculation();
  triggerGaugeCalculation();
  triggerGarmentFitCalculation();
  triggerDistributionCalculation();
  triggerYardageCalculation();

  // 8. Exponer funciones globales requeridas por elementos HTML inline
  window.switchTab = switchTab;
  window.selectProject = selectProject;
  window.confirmDeleteProject = confirmDeleteProject;
});

/**
 * Configuración de todos los escuchadores de eventos
 */
function setupEventListeners() {
  
  // Navegación por Pestañas (Desktop & Mobile)
  const allNavButtons = document.querySelectorAll('.desktop-nav-btn, .nav-item-btn');
  allNavButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabId = btn.getAttribute('data-tab');
      if (tabId) switchTab(tabId);
    });
  });

  // ==========================================
  // EVENTOS: CONVERSOR INTELIGENTE
  // ==========================================
  const converterInputs = [
    'orig-chains', 'orig-yarn', 'orig-hook', 'orig-rows', 'orig-width-cm',
    'user-yarn', 'user-hook', 'pattern-multiple', 'pattern-plus'
  ];

  converterInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', triggerConverterCalculation);
      el.addEventListener('change', triggerConverterCalculation);
    }
  });

  // Selector de tensión (Pills)
  const tensionPills = document.querySelectorAll('#tension-selector .pill-option');
  tensionPills.forEach(pill => {
    pill.addEventListener('click', () => {
      tensionPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      triggerConverterCalculation();
    });
  });

  // Botón Restablecer Conversor
  const btnResetConverter = document.getElementById('btn-reset-converter');
  if (btnResetConverter) {
    btnResetConverter.addEventListener('click', () => {
      document.getElementById('orig-chains').value = '40';
      document.getElementById('orig-yarn').value = '3';
      document.getElementById('orig-hook').value = '4';
      document.getElementById('orig-rows').value = '20';
      document.getElementById('user-yarn').value = '4';
      document.getElementById('user-hook').value = '5.5';
      document.getElementById('pattern-multiple').value = '';
      document.getElementById('pattern-plus').value = '';
      tensionPills.forEach(p => p.classList.remove('active'));
      tensionPills[1].classList.add('active');
      triggerConverterCalculation();
      showToast('Valores del conversor restablecidos.', 'info');
    });
  }

  // Guardar cálculo actual en Mi Libreta
  const btnSaveToNotebook = document.getElementById('btn-save-to-notebook');
  if (btnSaveToNotebook) {
    btnSaveToNotebook.addEventListener('click', openSaveProjectModalFromConverter);
  }

  // Enviar datos del conversor al contador
  const btnSendToCounter = document.getElementById('btn-send-to-counter');
  if (btnSendToCounter) {
    btnSendToCounter.addEventListener('click', () => {
      const recalcChains = document.getElementById('res-final-chains').textContent.trim();
      const recalcRows = document.getElementById('res-final-rows').textContent.trim();
      AppState.activeCounter.currentRow = 1;
      AppState.activeCounter.targetRows = parseInt(recalcRows, 10) || 20;
      AppState.activeCounter.notes = `Labor iniciada con ${recalcChains} cadenetas.`;
      saveActiveCounter(AppState.activeCounter);
      updateCounterUI();
      switchTab('projects');
      showToast('Datos cargados en tu contador de vueltas.', 'success');
    });
  }

  // ==========================================
  // EVENTOS: MUESTRA RÁPIDA (GAUGE)
  // ==========================================
  const gaugeInputs = [
    'gauge-input-stitches', 'gauge-input-width-cm',
    'gauge-input-rows', 'gauge-input-height-cm',
    'gauge-target-width', 'gauge-target-height'
  ];

  gaugeInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', triggerGaugeCalculation);
      el.addEventListener('change', triggerGaugeCalculation);
    }
  });

  // Botón Transferir Muestra al Conversor
  const btnTransferGauge = document.getElementById('btn-transfer-gauge');
  if (btnTransferGauge) {
    btnTransferGauge.addEventListener('click', () => {
      // Guardar densidades en estado y notificar
      const sts10cm = parseFloat(document.getElementById('res-sts-10cm').textContent) || 15;
      showToast(`Muestra aplicada: ~${sts10cm} puntos en 10 cm.`, 'success');
      switchTab('converter');
    });
  }

  // ==========================================
  // EVENTOS: COMPROBADOR DE TALLAS
  // ==========================================
  // Botones de categoría de prenda
  const catGrid = document.getElementById('garment-category-grid');
  if (catGrid) {
    catGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.category-btn');
      if (!btn) return;
      document.querySelectorAll('.category-btn').forEach(b => {
        b.className = 'category-btn p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 border-sand-200 bg-white text-sand-800 hover:border-sand-300';
      });
      btn.className = 'category-btn p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 border-terracotta-500 bg-terracotta-50/50 text-terracotta-700 shadow-sm';
      const catId = btn.getAttribute('data-category');
      AppState.activeGarmentCategory = catId;
      updatePresetSizesSelect(catId);
      triggerGarmentFitCalculation();
    });
  }

  // Selector de preset de talla
  const presetSelect = document.getElementById('preset-size-select');
  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      const cat = GARMENT_CATEGORIES.find(c => c.id === AppState.activeGarmentCategory);
      if (cat) {
        const preset = cat.presets.find(p => p.id === e.target.value);
        if (preset) {
          const widthInput = document.getElementById('fit-base-width');
          const heightInput = document.getElementById('fit-base-height');
          if (AppState.activeGarmentCategory === 'hats') {
            if (widthInput) widthInput.value = preset.headCircCm;
            if (heightInput) heightInput.value = preset.heightCm;
          } else if (AppState.activeGarmentCategory === 'tops') {
            if (widthInput) widthInput.value = preset.chestCm;
            if (heightInput) heightInput.value = preset.lengthCm;
          } else {
            if (widthInput) widthInput.value = preset.widthCm;
            if (heightInput) heightInput.value = preset.lengthCm;
          }
          triggerGarmentFitCalculation();
        }
      }
    });
  }

  // Cambios en inputs de medidas y holgura
  const fitInputs = ['fit-base-width', 'fit-base-height', 'ease-select'];
  fitInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', triggerGarmentFitCalculation);
      el.addEventListener('change', triggerGarmentFitCalculation);
    }
  });

  // ==========================================
  // EVENTOS: CALCULADORA DE LANA (3 MÉTODOS)
  // ==========================================
  // Selector de métodos de cálculo de lana (Pills)
  const yarnMethodPills = document.querySelectorAll('#yarn-method-pills .pill-option');
  yarnMethodPills.forEach(pill => {
    pill.addEventListener('click', () => {
      yarnMethodPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const method = pill.getAttribute('data-method');
      
      // Mostrar panel correspondiente
      document.getElementById('yarn-panel-garment')?.classList.add('hidden');
      document.getElementById('yarn-panel-swatch')?.classList.add('hidden');
      document.getElementById('yarn-panel-unravel')?.classList.add('hidden');

      if (method === 'garment_type') document.getElementById('yarn-panel-garment')?.classList.remove('hidden');
      if (method === 'swatch_weight') document.getElementById('yarn-panel-swatch')?.classList.remove('hidden');
      if (method === 'unravel_length') document.getElementById('yarn-panel-unravel')?.classList.remove('hidden');

      triggerDedicatedYarnCalculation();
    });
  });

  // Proyecto de lana y dimensiones personalizadas
  const calcYarnProj = document.getElementById('calc-yarn-project');
  if (calcYarnProj) {
    calcYarnProj.addEventListener('change', (e) => {
      const customDims = document.getElementById('yarn-custom-dims');
      if (customDims) {
        if (e.target.value === 'custom_dimensions') {
          customDims.classList.remove('hidden');
        } else {
          customDims.classList.add('hidden');
        }
      }
      triggerDedicatedYarnCalculation();
    });
  }

  // Inputs de la calculadora de lana
  const yarnCalcInputs = [
    'calc-yarn-project', 'yarn-custom-w', 'yarn-custom-h', 'calc-yarn-stitch-type',
    'swatch-weight-w', 'swatch-weight-h', 'swatch-weight-g', 'swatch-proj-w', 'swatch-proj-h',
    'unravel-sample-sts', 'unravel-length-cm', 'unravel-total-proj-sts',
    'calc-yarn-cyc', 'calc-ball-grams-select', 'calc-ball-meters-input', 'calc-safety-margin'
  ];

  yarnCalcInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', triggerDedicatedYarnCalculation);
      el.addEventListener('change', triggerDedicatedYarnCalculation);
    }
  });

  // Botón para guardar consumo en libreta
  const btnSaveYarnToProj = document.getElementById('btn-save-yarn-to-project');
  if (btnSaveYarnToProj) {
    btnSaveYarnToProj.addEventListener('click', () => {
      const balls = document.getElementById('yarn-res-balls-total').textContent.trim();
      const grams = document.getElementById('yarn-res-grams-total').textContent.trim();
      const meters = document.getElementById('yarn-res-meters-total').textContent.trim();

      if (AppState.activeProjectId) {
        const projects = getProjects();
        const p = projects.find(item => item.id === AppState.activeProjectId);
        if (p) {
          const yarnNote = `\n🧶 Lana requerida: ${balls} ovillos (${grams} / ${meters}).`;
          p.notes = (p.notes || '') + yarnNote;
          saveProject(p);
          showToast(`Consumo de lana guardado en "${p.title}".`, 'success');
        }
      } else {
        showToast(`Consumo calculado: ${balls} ovillos (${grams}). Crea o selecciona un proyecto para vincularlo.`, 'info');
      }
    });
  }

  // ==========================================
  // EVENTOS: CONTADOR DE VUELTAS TÁCTIL
  // ==========================================
  const btnCountPlus = document.getElementById('btn-count-plus');
  const btnCountMinus = document.getElementById('btn-count-minus');
  const btnCountReset = document.getElementById('btn-count-reset');
  const btnEditTarget = document.getElementById('btn-edit-target-rows');
  const btnSaveRowNote = document.getElementById('btn-save-row-note');

  if (btnCountPlus) {
    btnCountPlus.addEventListener('click', () => {
      AppState.activeCounter.currentRow = (AppState.activeCounter.currentRow || 0) + 1;
      saveActiveCounter(AppState.activeCounter);
      updateCounterUI();
      playHapticSound('click');
      if (AppState.activeCounter.currentRow === AppState.activeCounter.targetRows) {
        playHapticSound('success');
        showToast('🎉 ¡Felicidades! Has completado tu objetivo de vueltas.', 'success', 5000);
      }
    });
  }

  if (btnCountMinus) {
    btnCountMinus.addEventListener('click', () => {
      if (AppState.activeCounter.currentRow > 0) {
        AppState.activeCounter.currentRow -= 1;
        saveActiveCounter(AppState.activeCounter);
        updateCounterUI();
        playHapticSound('click');
      }
    });
  }

  if (btnCountReset) {
    btnCountReset.addEventListener('click', () => {
      if (confirm('¿Deseas reiniciar el contador a la vuelta 1?')) {
        AppState.activeCounter.currentRow = 1;
        saveActiveCounter(AppState.activeCounter);
        updateCounterUI();
        showToast('Contador reiniciado a la vuelta 1.');
      }
    });
  }

  if (btnEditTarget) {
    btnEditTarget.addEventListener('click', () => {
      const newTarget = prompt('Introduce la cantidad total de vueltas objetivo:', AppState.activeCounter.targetRows || 20);
      if (newTarget && !isNaN(parseInt(newTarget, 10))) {
        AppState.activeCounter.targetRows = parseInt(newTarget, 10);
        saveActiveCounter(AppState.activeCounter);
        updateCounterUI();
        showToast(`Meta actualizada a ${AppState.activeCounter.targetRows} vueltas.`);
      }
    });
  }

  if (btnSaveRowNote) {
    btnSaveRowNote.addEventListener('click', () => {
      const noteInput = document.getElementById('counter-quick-note');
      if (noteInput && noteInput.value.trim()) {
        AppState.activeCounter.notes = noteInput.value.trim();
        saveActiveCounter(AppState.activeCounter);
        showToast('Nota de vuelta guardada.', 'success');
      }
    });
  }

  // Subida de imagen de referencia
  const photoInput = document.getElementById('project-photo-input');
  if (photoInput) {
    photoInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const compressedBase64 = await processImageFile(file);
        const previewImg = document.getElementById('project-photo-img');
        const previewBox = document.getElementById('project-photo-preview');
        if (previewImg && previewBox) {
          previewImg.src = compressedBase64;
          previewBox.classList.remove('hidden');
        }

        // Si hay proyecto activo, actualizarlo
        if (AppState.activeProjectId) {
          const projects = getProjects();
          const p = projects.find(item => item.id === AppState.activeProjectId);
          if (p) {
            p.photoUrl = compressedBase64;
            saveProject(p);
          }
        }
        showToast('Foto guardada en el proyecto.', 'success');
      } catch (err) {
        showToast('Error al procesar la imagen.', 'error');
      }
    });
  }

  // Guardar notas del proyecto activo
  const btnSaveProjectNotes = document.getElementById('btn-save-project-notes');
  if (btnSaveProjectNotes) {
    btnSaveProjectNotes.addEventListener('click', () => {
      const notesVal = document.getElementById('project-notes-textarea').value;
      if (AppState.activeProjectId) {
        const projects = getProjects();
        const p = projects.find(item => item.id === AppState.activeProjectId);
        if (p) {
          p.notes = notesVal;
          saveProject(p);
          showToast('Notas del proyecto actualizadas.', 'success');
        }
      } else {
        showToast('Notas guardadas temporalmente.', 'info');
      }
    });
  }

  // Imprimir ficha de proyecto
  const btnPrint = document.getElementById('btn-print-project');
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }

  // ==========================================
  // EVENTOS: MODAL DE NUEVO PROYECTO
  // ==========================================
  const btnNewProj = document.getElementById('btn-new-project-modal');
  const modalProj = document.getElementById('modal-project');
  const btnCloseModal = document.getElementById('btn-close-project-modal');
  const btnCancelModal = document.getElementById('btn-cancel-project-modal');
  const btnConfirmModal = document.getElementById('btn-save-project-confirm');

  if (btnNewProj) {
    btnNewProj.addEventListener('click', () => {
      document.getElementById('modal-project-name').value = '';
      document.getElementById('modal-project-chains').value = '40';
      document.getElementById('modal-project-rows').value = '24';
      document.getElementById('modal-project-notes').value = '';
      if (modalProj) modalProj.classList.remove('hidden');
    });
  }

  const closeModal = () => modalProj && modalProj.classList.add('hidden');
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);

  if (btnConfirmModal) {
    btnConfirmModal.addEventListener('click', () => {
      const name = document.getElementById('modal-project-name').value.trim() || 'Proyecto de Crochet';
      const category = document.getElementById('modal-project-category').value;
      const chains = parseInt(document.getElementById('modal-project-chains').value, 10) || 40;
      const rows = parseInt(document.getElementById('modal-project-rows').value, 10) || 20;
      const notes = document.getElementById('modal-project-notes').value;

      const newProj = saveProject({
        title: name,
        category,
        recalcChains: chains,
        targetRows: rows,
        currentRow: 1,
        status: 'in_progress',
        notes
      });

      closeModal();
      refreshProjectsList();
      selectProject(newProj.id);
      showToast(`¡Proyecto "${name}" creado con éxito!`, 'success');
    });
  }

  // ==========================================
  // EVENTOS: TABLAS Y HERRAMIENTAS
  // ==========================================
  // Subpestañas de tablas
  const tableSubtabBtns = document.querySelectorAll('.table-subtab-btn');
  tableSubtabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tableSubtabBtns.forEach(b => {
        b.className = 'table-subtab-btn px-4 py-2 rounded-full text-xs font-bold transition bg-white text-sand-800 hover:bg-sand-100 border border-sand-200';
      });
      btn.className = 'table-subtab-btn px-4 py-2 rounded-full text-xs font-bold transition bg-terracotta-500 text-white shadow-sm';
      
      const targetSubtab = btn.getAttribute('data-subtab');
      document.querySelectorAll('.table-subtab-content').forEach(c => c.classList.add('hidden'));
      const activeContent = document.getElementById(`subtab-${targetSubtab}`);
      if (activeContent) activeContent.classList.remove('hidden');
    });
  });

  // Buscador de glosario
  const glossarySearch = document.getElementById('glossary-search-input');
  if (glossarySearch) {
    glossarySearch.addEventListener('input', (e) => {
      renderGlossaryTable(e.target.value);
    });
  }

  // Distribuidor de aumentos / disminuciones
  const distribCurrentSts = document.getElementById('distrib-current-sts');
  const distribChangeCount = document.getElementById('distrib-change-count');
  if (distribCurrentSts) distribCurrentSts.addEventListener('input', triggerDistributionCalculation);
  if (distribChangeCount) distribChangeCount.addEventListener('input', triggerDistributionCalculation);

  const distribTypePills = document.querySelectorAll('#distrib-type-selector .pill-option');
  distribTypePills.forEach(pill => {
    pill.addEventListener('click', () => {
      distribTypePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      triggerDistributionCalculation();
    });
  });

  // Consumo de lana y ovillos
  const yardageSelects = ['yardage-project-select', 'yardage-yarn-select', 'yardage-ball-grams'];
  yardageSelects.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', triggerYardageCalculation);
      el.addEventListener('change', triggerYardageCalculation);
    }
  });

  // Pantalla activa (Screen Wake Lock)
  const btnWakeLock = document.getElementById('btn-wake-lock');
  if (btnWakeLock) {
    btnWakeLock.addEventListener('click', toggleScreenWakeLock);
  }
}

/**
 * Configuración de eventos del sistema de cuentas y modal de autenticación
 */
let authMode = 'login'; // 'login' | 'register'

function setupAuthEventListeners() {
  const btnAuthHeader = document.getElementById('btn-auth-header');
  const userDropdownMenu = document.getElementById('user-dropdown-menu');
  const authModal = document.getElementById('auth-modal');
  const btnCloseAuthModal = document.getElementById('btn-close-auth-modal');
  const btnLoginGoogle = document.getElementById('btn-login-google');
  const tabAuthLogin = document.getElementById('tab-auth-login');
  const tabAuthRegister = document.getElementById('tab-auth-register');
  const authForm = document.getElementById('auth-form');
  const btnDropdownLogout = document.getElementById('btn-dropdown-logout');
  const btnDropdownSync = document.getElementById('btn-dropdown-sync');

  // Abrir modal o dropdown según si está autenticado
  if (btnAuthHeader) {
    btnAuthHeader.addEventListener('click', (e) => {
      e.stopPropagation();
      const user = getCurrentUser();
      if (user) {
        userDropdownMenu?.classList.toggle('hidden');
      } else {
        openAuthModal();
      }
    });
  }

  // Cerrar dropdown al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (userDropdownMenu && !userDropdownMenu.contains(e.target) && e.target !== btnAuthHeader) {
      userDropdownMenu.classList.add('hidden');
    }
  });

  // Cerrar modal
  if (btnCloseAuthModal) {
    btnCloseAuthModal.addEventListener('click', closeAuthModal);
  }
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) closeAuthModal();
    });
  }

  // Pestañas Login vs Registro
  if (tabAuthLogin && tabAuthRegister) {
    tabAuthLogin.addEventListener('click', () => setAuthMode('login'));
    tabAuthRegister.addEventListener('click', () => setAuthMode('register'));
  }

  // Login con Google
  if (btnLoginGoogle) {
    btnLoginGoogle.addEventListener('click', async () => {
      try {
        setAuthLoading(true);
        const user = await loginWithGoogle();
        closeAuthModal();
        showToast(`¡Bienvenida de vuelta, ${user.displayName || 'tejedora'}! 🧶`, 'success');
      } catch (err) {
        showAuthError(err.message);
      } finally {
        setAuthLoading(false);
      }
    });
  }

  // Envío de formulario email/password
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-input-email')?.value.trim();
      const password = document.getElementById('auth-input-password')?.value;
      const name = document.getElementById('auth-input-name')?.value.trim();

      try {
        setAuthLoading(true);
        clearAuthError();
        if (authMode === 'login') {
          const user = await loginWithEmail(email, password);
          closeAuthModal();
          showToast(`¡Hola de nuevo, ${user.displayName || 'tejedora'}! 🧶`, 'success');
        } else {
          const user = await registerWithEmail(email, password, name);
          closeAuthModal();
          showToast(`¡Cuenta creada con éxito! Bienvenida, ${user.displayName} 🧶`, 'success');
        }
      } catch (err) {
        showAuthError(err.message || 'Ocurrió un error al procesar tu solicitud.');
      } finally {
        setAuthLoading(false);
      }
    });
  }

  // Cerrar sesión
  if (btnDropdownLogout) {
    btnDropdownLogout.addEventListener('click', async () => {
      await logoutUser();
      userDropdownMenu?.classList.add('hidden');
      showToast('Has cerrado sesión. Tus datos siguen guardados localmente.', 'info');
    });
  }

  // Forzar sincronización manual
  if (btnDropdownSync) {
    btnDropdownSync.addEventListener('click', async () => {
      const user = getCurrentUser();
      if (user) {
        showToast('Sincronizando con la nube...', 'info');
        await syncUserDataOnLogin(user);
        refreshProjectsList();
        AppState.activeCounter = getActiveCounter();
        updateCounterUI();
        showToast('¡Todo sincronizado en la nube! ☁️✨', 'success');
        userDropdownMenu?.classList.add('hidden');
      }
    });
  }
}

function openAuthModal() {
  const modal = document.getElementById('auth-modal');
  clearAuthError();
  setAuthMode('login');
  modal?.classList.remove('hidden');
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  modal?.classList.add('hidden');
  clearAuthError();
}

function setAuthMode(mode) {
  authMode = mode;
  const tabLogin = document.getElementById('tab-auth-login');
  const tabRegister = document.getElementById('tab-auth-register');
  const nameGroup = document.getElementById('auth-name-group');
  const submitBtn = document.getElementById('btn-auth-submit');

  if (mode === 'login') {
    tabLogin?.classList.add('bg-white', 'text-terracotta-600', 'shadow-sm');
    tabLogin?.classList.remove('text-sand-800');
    tabRegister?.classList.remove('bg-white', 'text-terracotta-600', 'shadow-sm');
    tabRegister?.classList.add('text-sand-800');
    nameGroup?.classList.add('hidden');
    if (submitBtn) submitBtn.textContent = 'Iniciar Sesión';
  } else {
    tabRegister?.classList.add('bg-white', 'text-terracotta-600', 'shadow-sm');
    tabRegister?.classList.remove('text-sand-800');
    tabLogin?.classList.remove('bg-white', 'text-terracotta-600', 'shadow-sm');
    tabLogin?.classList.add('text-sand-800');
    nameGroup?.classList.remove('hidden');
    if (submitBtn) submitBtn.textContent = 'Crear mi Cuenta Gratis';
  }
}

function showAuthError(msg) {
  const errorBox = document.getElementById('auth-error-msg');
  if (errorBox) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
  }
}

function clearAuthError() {
  const errorBox = document.getElementById('auth-error-msg');
  if (errorBox) {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
  }
}

function setAuthLoading(loading) {
  const submitBtn = document.getElementById('btn-auth-submit');
  if (submitBtn) {
    submitBtn.disabled = loading;
    submitBtn.innerHTML = loading 
      ? '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Conectando...' 
      : (authMode === 'login' ? 'Iniciar Sesión' : 'Crear mi Cuenta Gratis');
  }
}

/**
 * Actualiza la UI del header cuando el estado de autenticación cambia
 */
async function handleAuthStatusChange(user) {
  const authAvatarCircle = document.getElementById('auth-avatar-circle');
  const authUserLabel = document.getElementById('auth-user-label');
  const authCloudBadge = document.getElementById('auth-cloud-badge');
  const dropdownUserName = document.getElementById('dropdown-user-name');
  const dropdownUserEmail = document.getElementById('dropdown-user-email');

  if (user) {
    const displayName = user.displayName || user.email.split('@')[0] || 'Tejedora';
    const firstLetter = displayName.charAt(0).toUpperCase();

    if (authUserLabel) authUserLabel.textContent = displayName;
    if (authAvatarCircle) {
      if (user.photoURL) {
        authAvatarCircle.innerHTML = `<img src="${user.photoURL}" class="w-full h-full rounded-full object-cover" alt="avatar" />`;
      } else {
        authAvatarCircle.innerHTML = `<span>${firstLetter}</span>`;
      }
    }
    if (authCloudBadge) authCloudBadge.classList.remove('hidden');

    if (dropdownUserName) dropdownUserName.textContent = displayName;
    if (dropdownUserEmail) dropdownUserEmail.textContent = user.email || 'Cuenta vinculada';

    // Sincronizar datos con la nube y refrescar UI
    await syncUserDataOnLogin(user);
    refreshProjectsList();
    AppState.activeCounter = getActiveCounter();
    updateCounterUI();

    // Activar sincronización en tiempo real multidispositivo
    listenToRealtimeCloudUpdates(user, (updatedProjects) => {
      refreshProjectsList();
      AppState.activeCounter = getActiveCounter();
      updateCounterUI();
    });
  } else {
    if (authUserLabel) authUserLabel.textContent = 'Iniciar sesión';
    if (authAvatarCircle) authAvatarCircle.innerHTML = '<i class="fa-solid fa-user"></i>';
    if (authCloudBadge) authCloudBadge.classList.add('hidden');
    if (dropdownUserName) dropdownUserName.textContent = 'Mi Cuenta';
    if (dropdownUserEmail) dropdownUserEmail.textContent = '';
    refreshProjectsList();
  }
}

/**
 * Cambia la pestaña activa (Desktop + Mobile)
 */
export function switchTab(tabId) {
  AppState.currentTab = tabId;

  // Actualizar contenido
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  const targetTab = document.getElementById(`tab-${tabId}`);
  if (targetTab) targetTab.classList.add('active');

  // Actualizar botones desktop
  document.querySelectorAll('.desktop-nav-btn').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.className = 'desktop-nav-btn px-4 py-2 rounded-full text-sm font-semibold transition flex items-center gap-2 text-terracotta-600 bg-white shadow-sm';
    } else {
      btn.className = 'desktop-nav-btn px-4 py-2 rounded-full text-sm font-semibold transition flex items-center gap-2 text-sand-800 hover:text-terracotta-600';
    }
  });

  // Actualizar barra inferior móvil
  document.querySelectorAll('.nav-item-btn').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Ejecuta el cálculo reactivo del conversor inteligente
 */
function triggerConverterCalculation() {
  const origChains = document.getElementById('orig-chains').value;
  const origHook = document.getElementById('orig-hook').value;
  const origYarnCyc = document.getElementById('orig-yarn').value;
  const origRows = document.getElementById('orig-rows').value;
  
  const userHook = document.getElementById('user-hook').value;
  const userYarnCyc = document.getElementById('user-yarn').value;
  
  const activeTensionPill = document.querySelector('#tension-selector .pill-option.active');
  const userTension = activeTensionPill ? activeTensionPill.getAttribute('data-value') : 'normal';

  const multipleOf = document.getElementById('pattern-multiple').value;
  const plusStitches = document.getElementById('pattern-plus').value;

  const result = recalculatePattern({
    origChains,
    origHook,
    origYarnCyc,
    origRows,
    userHook,
    userYarnCyc,
    userTension,
    multipleOf,
    plusStitches
  });

  // Renderizar resultados en pantalla
  const resChainsEl = document.getElementById('res-final-chains');
  const resTheorEl = document.getElementById('res-theoretical-note');
  const diffBadge = document.getElementById('diff-badge');
  const resFinalRows = document.getElementById('res-final-rows');
  const adviceText = document.getElementById('res-advice-text');
  const scaleText = document.getElementById('scale-ratio-text');
  const progressBar = document.getElementById('scale-progress-bar');
  const summaryOrig = document.getElementById('summary-orig-mat');
  const summaryUser = document.getElementById('summary-user-mat');
  const multipleBadge = document.getElementById('multiple-badge');

  if (resChainsEl) {
    resChainsEl.textContent = result.finalStitches;
    resChainsEl.classList.remove('recalc-pulse');
    void resChainsEl.offsetWidth; // Trigger reflow
    resChainsEl.classList.add('recalc-pulse');
  }

  if (resTheorEl) {
    resTheorEl.textContent = result.multipleApplied 
      ? `(Ajustado a múltiplos de ${result.multipleApplied} • Exacto: ${result.theoreticalStitches})`
      : `(Cálculo matemático exacto: ${result.theoreticalStitches} pts)`;
  }

  if (multipleBadge) {
    multipleBadge.textContent = result.multipleApplied ? `Múltiplo ${result.multipleApplied}` : 'Sin múltiplos fijos';
  }

  if (diffBadge) {
    diffBadge.textContent = `${result.diffPercentage} cadenetas`;
    if (result.isThicker) {
      diffBadge.className = 'badge-tag badge-sage font-bold';
    } else if (result.isThinner) {
      diffBadge.className = 'badge-tag badge-gold font-bold';
    } else {
      diffBadge.className = 'badge-tag badge-terracotta font-bold';
    }
  }

  if (resFinalRows && result.finalRows) {
    resFinalRows.textContent = result.finalRows;
  }

  if (adviceText) {
    adviceText.textContent = result.advice;
  }

  if (scaleText) {
    if (result.isThicker) scaleText.textContent = 'Tu lana/ganchillo es más grueso (menos puntos)';
    else if (result.isThinner) scaleText.textContent = 'Tu lana/ganchillo es más fino (más puntos)';
    else scaleText.textContent = 'Densidad idéntica al original';
  }

  // Actualizar también la estimación rápida de lana para el Conversor
  const quickEstimatedRows = result.finalRows || (result.finalStitches * 0.6);
  const totalStsEstimate = result.finalStitches * quickEstimatedRows;
  const quickYarn = estimateYarnConsumption({
    method: 'unravel_length',
    yarnCyc: userYarnCyc,
    totalProjectStitches: totalStsEstimate,
    ballGrams: 100,
    sampleStitches: 10,
    unravelYarnLengthCm: (parseFloat(userHook) || 4.0) * 18,
    safetyMargin: 10
  });

  const resFinalBalls = document.getElementById('res-final-balls');
  const resYarnGramsApprox = document.getElementById('res-yarn-grams-approx');
  if (resFinalBalls) resFinalBalls.textContent = quickYarn.estimatedBalls;
  if (resYarnGramsApprox) resYarnGramsApprox.textContent = `~${quickYarn.estimatedGrams} g • ${quickYarn.estimatedMeters} metros`;
}

/**
 * Abre el modal para guardar el cálculo en la libreta
 */
function openSaveProjectModalFromConverter() {
  const origChains = document.getElementById('orig-chains').value;
  const finalChains = document.getElementById('res-final-chains').textContent.trim();
  const finalRows = document.getElementById('res-final-rows').textContent.trim();
  const origHook = document.getElementById('orig-hook').value;
  const userHook = document.getElementById('user-hook').value;

  const modal = document.getElementById('modal-project');
  if (!modal) return;

  document.getElementById('modal-project-name').value = `Labor con Ganchillo ${userHook}mm`;
  document.getElementById('modal-project-chains').value = finalChains;
  document.getElementById('modal-project-rows').value = finalRows;
  document.getElementById('modal-project-notes').value = `Adaptación de tutorial original (${origChains} cadenetas con ganchillo ${origHook}mm) recalculado a ${finalChains} cadenetas con ganchillo de ${userHook}mm.`;

  modal.classList.remove('hidden');
}

/**
 * Ejecuta el cálculo de la muestra de tensión rápida
 */
function triggerGaugeCalculation() {
  const stitches = document.getElementById('gauge-input-stitches').value;
  const widthCm = document.getElementById('gauge-input-width-cm').value;
  const rows = document.getElementById('gauge-input-rows').value;
  const heightCm = document.getElementById('gauge-input-height-cm').value;
  const targetWidthCm = document.getElementById('gauge-target-width').value;
  const targetHeightCm = document.getElementById('gauge-target-height').value;

  const result = calculateQuickSwatch({
    stitches,
    widthCm,
    rows,
    heightCm,
    targetWidthCm,
    targetHeightCm
  });

  // Actualizar estado global de muestra
  AppState.currentGauge.stitchesPerCm = parseFloat(result.stitchesPerCm);
  AppState.currentGauge.rowsPerCm = parseFloat(result.rowsPerCm);

  // Renderizar valores
  document.getElementById('res-sts-per-cm').textContent = result.stitchesPerCm;
  document.getElementById('res-rows-per-cm').textContent = result.rowsPerCm;
  document.getElementById('res-sts-10cm').textContent = result.stitchesIn10cm;
  document.getElementById('res-rows-10cm').textContent = result.rowsIn10cm;

  document.getElementById('target-summary-cm').textContent = `${result.targetWidthCm || 0} × ${result.targetHeightCm || 0} cm`;
  document.getElementById('target-res-stitches').textContent = result.neededStitches || 0;
  document.getElementById('target-res-rows').textContent = result.neededRows || 0;

  // Actualizar también el comprobador de tallas
  triggerGarmentFitCalculation();
}

/**
 * Ejecuta el cálculo del comprobador de tallas y holgura
 */
function triggerGarmentFitCalculation() {
  const baseMeasure = document.getElementById('fit-base-width').value;
  const baseHeight = document.getElementById('fit-base-height').value;
  const easeSelect = document.getElementById('ease-select');
  const easeCm = easeSelect ? parseFloat(easeSelect.value) || 0 : 0;

  const result = calculateGarmentFit({
    category: AppState.activeGarmentCategory,
    baseMeasureCm: baseMeasure,
    baseHeightCm: baseHeight,
    easeCm,
    stitchesPerCm: AppState.currentGauge.stitchesPerCm,
    rowsPerCm: AppState.currentGauge.rowsPerCm
  });

  // Actualizar textos
  document.getElementById('fit-res-width').textContent = `${result.finalWidthCm} cm`;
  document.getElementById('fit-res-height').textContent = `${result.finalHeightCm} cm`;
  document.getElementById('fit-res-stitches').textContent = `${result.requiredStitches} puntos (${result.requiredRows} vueltas)`;

  const easeIndicator = document.getElementById('ease-val-indicator');
  if (easeIndicator) {
    easeIndicator.textContent = easeCm >= 0 ? `+${easeCm} cm` : `${easeCm} cm`;
  }

  const verdictBadge = document.getElementById('verdict-badge');
  if (verdictBadge && result.verdict) {
    verdictBadge.textContent = result.verdict.badge;
  }

  // Caja de corona para gorros
  const hatBox = document.getElementById('hat-crown-box');
  if (hatBox) {
    if (AppState.activeGarmentCategory === 'hats' && result.hatData) {
      hatBox.classList.remove('hidden');
      document.getElementById('hat-crown-diameter').textContent = result.hatData.crownDiameterCm;
      document.getElementById('hat-crown-tip').textContent = result.hatData.tip;
    } else {
      hatBox.classList.add('hidden');
    }
  }

  // Renderizar gráfico SVG
  renderGarmentSvg(
    AppState.activeGarmentCategory,
    result.finalWidthCm,
    result.finalHeightCm,
    easeCm,
    result.hatData
  );
}

/**
 * Actualiza la UI del contador de vueltas
 */
function updateCounterUI() {
  const c = AppState.activeCounter;
  const valueEl = document.getElementById('counter-value');
  const targetEl = document.getElementById('counter-target-display');
  const progressEl = document.getElementById('counter-progress-bar');
  const nameBadge = document.getElementById('active-project-name-badge');
  const noteInput = document.getElementById('counter-quick-note');

  if (valueEl) valueEl.textContent = c.currentRow || 1;
  if (targetEl) targetEl.textContent = c.targetRows || 20;
  if (nameBadge) nameBadge.textContent = c.projectName || 'Mi Labor Actual';
  if (noteInput && c.notes) noteInput.value = c.notes;

  if (progressEl) {
    const percent = Math.min(100, Math.round(((c.currentRow || 1) / (c.targetRows || 20)) * 100));
    progressEl.style.width = `${percent}%`;
  }
}

/**
 * Refresca la lista de proyectos en la libreta
 */
function refreshProjectsList() {
  const projects = getProjects();
  renderProjectsList(projects, AppState.activeProjectId);
}

/**
 * Selecciona un proyecto existente para editar y contar vueltas
 */
export function selectProject(projectId) {
  const projects = getProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  AppState.activeProjectId = project.id;
  AppState.activeCounter = {
    projectName: project.title,
    currentRow: project.currentRow || 1,
    targetRows: project.targetRows || 20,
    repeats: project.repeats || 1,
    notes: project.notes || ''
  };

  saveActiveCounter(AppState.activeCounter);
  updateCounterUI();
  refreshProjectsList();

  // Actualizar tarjeta de detalles
  const detailTitle = document.getElementById('detail-project-title');
  const detailNotes = document.getElementById('project-notes-textarea');
  const photoBox = document.getElementById('project-photo-preview');
  const photoImg = document.getElementById('project-photo-img');

  if (detailTitle) detailTitle.textContent = project.title;
  if (detailNotes) detailNotes.value = project.notes || '';
  if (photoImg && photoBox) {
    if (project.photoUrl) {
      photoImg.src = project.photoUrl;
      photoBox.classList.remove('hidden');
    } else {
      photoBox.classList.add('hidden');
    }
  }

  showToast(`Proyecto "${project.title}" cargado en el contador.`, 'info');
}

/**
 * Confirma y elimina un proyecto
 */
export function confirmDeleteProject(projectId) {
  if (confirm('¿Estás segura de que deseas eliminar este proyecto?')) {
    deleteProject(projectId);
    if (AppState.activeProjectId === projectId) {
      AppState.activeProjectId = null;
    }
    refreshProjectsList();
    showToast('Proyecto eliminado.', 'info');
  }
}

/**
 * Cálculo del distribuidor de aumentos y disminuciones
 */
function triggerDistributionCalculation() {
  const currentSts = document.getElementById('distrib-current-sts').value;
  const changeCount = document.getElementById('distrib-change-count').value;
  const activeTypePill = document.querySelector('#distrib-type-selector .pill-option.active');
  const type = activeTypePill ? activeTypePill.getAttribute('data-type') : 'increase';

  const result = distributeShaping(currentSts, changeCount, type);
  const formulaOutput = document.getElementById('distrib-formula-output');

  if (formulaOutput) {
    if (result.error) {
      formulaOutput.textContent = result.error;
      formulaOutput.className = 'bg-rose-50 p-4 rounded-xl border border-rose-200 font-mono text-xs text-rose-700 whitespace-pre-line leading-relaxed';
    } else {
      formulaOutput.textContent = `${result.formulaText}\n\n→ Puntos al terminar la vuelta: ${result.finalStitches} pts`;
      formulaOutput.className = 'bg-white p-4 rounded-xl border border-sand-300 font-mono text-xs text-terracotta-700 whitespace-pre-line leading-relaxed shadow-sm';
    }
  }
}

/**
 * Ejecuta el cálculo dedicado de la pestaña "¿Cuánta Lana?"
 */
function triggerDedicatedYarnCalculation() {
  const activeMethodPill = document.querySelector('#yarn-method-pills .pill-option.active');
  const method = activeMethodPill ? activeMethodPill.getAttribute('data-method') : 'garment_type';

  const yarnCyc = document.getElementById('calc-yarn-cyc')?.value || 4;
  const ballGrams = document.getElementById('calc-ball-grams-select')?.value || 100;
  const ballMeters = document.getElementById('calc-ball-meters-input')?.value || 0;
  const safetyMargin = document.getElementById('calc-safety-margin')?.value || 10;

  // Método 1: Por prenda
  const projectType = document.getElementById('calc-yarn-project')?.value || 'hat_adult';
  const customWidthCm = document.getElementById('yarn-custom-w')?.value || 100;
  const customHeightCm = document.getElementById('yarn-custom-h')?.value || 120;
  const stitchType = document.getElementById('calc-yarn-stitch-type')?.value || 'dc';

  // Método 2: Por peso de muestra
  const swatchWidthCm = document.getElementById('swatch-weight-w')?.value || 10;
  const swatchHeightCm = document.getElementById('swatch-weight-h')?.value || 10;
  const swatchWeightGrams = document.getElementById('swatch-weight-g')?.value || 12;
  const projectWidthCm = document.getElementById('swatch-proj-w')?.value || 80;
  const projectHeightCm = document.getElementById('swatch-proj-h')?.value || 100;

  // Método 3: Por hilo deshecho
  const sampleStitches = document.getElementById('unravel-sample-sts')?.value || 10;
  const unravelYarnLengthCm = document.getElementById('unravel-length-cm')?.value || 85;
  const totalProjectStitches = document.getElementById('unravel-total-proj-sts')?.value || 2800;

  const result = estimateYarnConsumption({
    method,
    yarnCyc,
    ballGrams,
    ballMeters,
    safetyMargin,
    projectType,
    customWidthCm,
    customHeightCm,
    stitchType,
    swatchWidthCm,
    swatchHeightCm,
    swatchWeightGrams,
    projectWidthCm,
    projectHeightCm,
    sampleStitches,
    unravelYarnLengthCm,
    totalProjectStitches
  });

  // Renderizar resultados en pantalla
  const resBalls = document.getElementById('yarn-res-balls-total');
  const resMeters = document.getElementById('yarn-res-meters-total');
  const resGrams = document.getElementById('yarn-res-grams-total');
  const resBackup = document.getElementById('yarn-res-backup-advice');
  const resDetails = document.getElementById('yarn-res-details-text');
  const resSafetyBadge = document.getElementById('yarn-result-safety-badge');
  const resFormatNote = document.getElementById('yarn-res-ball-format-note');

  if (resBalls) {
    resBalls.textContent = result.estimatedBalls;
    resBalls.classList.remove('recalc-pulse');
    void resBalls.offsetWidth;
    resBalls.classList.add('recalc-pulse');
  }

  if (resMeters) resMeters.textContent = `${result.estimatedMeters} m`;
  if (resGrams) resGrams.textContent = `${result.estimatedGrams} g`;
  if (resSafetyBadge) resSafetyBadge.textContent = `+${result.safetyMarginPercent}% Seguridad`;
  if (resFormatNote) resFormatNote.textContent = `de ${result.ballGrams}g ${result.ballMeters ? `(${result.ballMeters}m)` : ''} cada uno`;

  if (resBackup) {
    resBackup.innerHTML = `
      Recomendamos comprar <strong>${result.totalWithBackup} ovillos en total</strong> (${result.estimatedBalls} calculados + ${result.recommendedBackupBalls} de reserva del mismo lote/tintada) para asegurar que no falte hilo durante los remates.
    `;
  }

  if (resDetails) {
    resDetails.textContent = result.calculationDetails;
  }

  // Actualizar nota de consumo de puntada
  const stitchNote = document.getElementById('stitch-consumption-note');
  if (stitchNote) {
    if (stitchType === 'lace_mesh') stitchNote.textContent = 'Ahorro ~25% de hilo';
    else if (stitchType === 'textured_bobble') stitchNote.textContent = 'Consume ~40% más hilo';
    else stitchNote.textContent = 'Consumo regular';
  }
}

/**
 * Cálculo de estimación de consumo de lana
 */
function triggerYardageCalculation() {
  const projectType = document.getElementById('yardage-project-select').value;
  const yarnCyc = document.getElementById('yardage-yarn-select').value;
  const ballGrams = document.getElementById('yardage-ball-grams').value;

  const result = estimateYarnConsumption({
    projectType,
    yarnCyc,
    ballGrams
  });

  document.getElementById('res-yardage-meters').textContent = `${result.estimatedMeters} m`;
  document.getElementById('res-yardage-grams').textContent = `${result.estimatedGrams} g`;
  document.getElementById('res-yardage-balls').textContent = result.estimatedBalls;
}

/**
 * Alterna el modo de pantalla activa (Screen Wake Lock API)
 */
async function toggleScreenWakeLock() {
  const btn = document.getElementById('btn-wake-lock');
  if (!('wakeLock' in navigator)) {
    showToast('Tu navegador no soporta mantener la pantalla activa automáticamente.', 'info');
    return;
  }

  if (AppState.wakeLock) {
    try {
      await AppState.wakeLock.release();
      AppState.wakeLock = null;
      if (btn) {
        btn.classList.remove('bg-terracotta-100', 'text-terracotta-700');
        btn.classList.add('bg-sand-100', 'text-sand-800');
      }
      showToast('Modo pantalla activa desactivado.');
    } catch (e) {
      console.error(e);
    }
  } else {
    try {
      AppState.wakeLock = await navigator.wakeLock.request('screen');
      if (btn) {
        btn.classList.add('bg-terracotta-100', 'text-terracotta-700');
        btn.classList.remove('bg-sand-100', 'text-sand-800');
      }
      showToast('☀️ Pantalla activa: no se apagará mientras tejes.', 'success');
      AppState.wakeLock.addEventListener('release', () => {
        AppState.wakeLock = null;
        if (btn) {
          btn.classList.remove('bg-terracotta-100', 'text-terracotta-700');
          btn.classList.add('bg-sand-100', 'text-sand-800');
        }
      });
    } catch (err) {
      showToast('No se pudo activar el bloqueo de pantalla.', 'info');
    }
  }
}

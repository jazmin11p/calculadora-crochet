/**
 * CrochetCalc (PuntoPerfecto) - Storage Manager
 * Gestión de persistencia híbrida (LocalStorage + Cloud Firestore) para proyectos, muestras y contador de vueltas.
 */

import {
  db,
  isFirebaseInitialized,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  onSnapshot
} from './firebase-config.js';
import { getCurrentUser, generateUidForEmail } from './auth.js';

const STORAGE_KEYS = {
  PROJECTS: 'crochetcalc_projects_v1',
  ACTIVE_COUNTER: 'crochetcalc_active_counter_v1',
  SAVED_SWATCHES: 'crochetcalc_swatches_v1',
  LAST_CALCULATION: 'crochetcalc_last_calc_v1',
  SETTINGS: 'crochetcalc_settings_v1',
  CLOUD_SYNC_STATUS: 'crochetcalc_sync_status_v1'
};

/**
 * Obtiene todos los proyectos guardados (Localmente con sincronización a la nube si hay usuario)
 */
export function getProjects() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error al leer proyectos de LocalStorage', e);
    return [];
  }
}

/**
 * Obtiene el ID efectivo del usuario (UID o generado por email)
 */
export function getEffectiveUserId(user) {
  if (!user) return null;
  if (user.email) return generateUidForEmail(user.email);
  return user.uid || null;
}

/**
 * Guarda o actualiza un proyecto (Local + Cloud Firestore si hay usuario conectado)
 */
export function saveProject(project) {
  try {
    const projects = getProjects();
    const existingIndex = projects.findIndex(p => p.id === project.id);
    
    const projectToSave = {
      ...project,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      projects[existingIndex] = projectToSave;
    } else {
      projectToSave.id = project.id || 'proj_' + Date.now();
      projectToSave.createdAt = project.createdAt || new Date().toISOString();
      projects.unshift(projectToSave);
    }

    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));

    // Si hay usuario conectado, sincronizar en segundo plano con Cloud Firestore
    const user = getCurrentUser();
    const userId = getEffectiveUserId(user);
    if (userId) {
      syncProjectToCloud(userId, projectToSave).catch(e => console.warn('Sync cloud project warning:', e));
    }

    return projectToSave;
  } catch (e) {
    console.error('Error al guardar proyecto', e);
    throw e;
  }
}

/**
 * Elimina un proyecto por ID (Local + Cloud)
 */
export function deleteProject(id) {
  try {
    const projects = getProjects().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));

    const user = getCurrentUser();
    const userId = getEffectiveUserId(user);
    if (userId) {
      deleteProjectFromCloud(userId, id).catch(e => console.warn('Delete cloud project warning:', e));
    }

    return true;
  } catch (e) {
    console.error('Error al eliminar proyecto', e);
    return false;
  }
}

/**
 * Obtiene el estado del contador activo
 */
export function getActiveCounter() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_COUNTER);
    return data ? JSON.parse(data) : {
      projectName: 'Mi Labor Actual',
      currentRow: 1,
      targetRows: 20,
      repeats: 1,
      notes: '',
      history: []
    };
  } catch (e) {
    return { projectName: 'Mi Labor Actual', currentRow: 1, targetRows: 20, history: [] };
  }
}

/**
 * Guarda el estado del contador activo
 */
export function saveActiveCounter(counterData) {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_COUNTER, JSON.stringify(counterData));

    const user = getCurrentUser();
    const userId = getEffectiveUserId(user);
    if (userId) {
      syncCounterToCloud(userId, counterData).catch(e => console.warn('Sync counter cloud warning:', e));
    }
  } catch (e) {
    console.error('Error al guardar contador', e);
  }
}

/**
 * Guarda el último cálculo realizado para restaurarlo al recargar
 */
export function saveLastCalculation(calcData) {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_CALCULATION, JSON.stringify(calcData));
  } catch (e) {
    console.error('Error al guardar último cálculo', e);
  }
}

/**
 * Obtiene el último cálculo realizado
 */
export function getLastCalculation() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LAST_CALCULATION);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Comprime y convierte una imagen File a DataURL Base64 para guardarla en LocalStorage
 */
export function processImageFile(file, maxWidth = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('El archivo no es una imagen válida.'));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Error al procesar la imagen seleccionada.'));
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
  });
}

/**
 * Exporta todos los datos de la app a un archivo JSON descargable
 */
export function exportAllData() {
  const data = {
    projects: getProjects(),
    activeCounter: getActiveCounter(),
    exportedAt: new Date().toISOString(),
    version: '1.0'
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `crochetcalc_copia_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==========================================
// MÉTODOS DE SINCRONIZACIÓN EN LA NUBE (FIRESTORE)
// ==========================================

export async function syncProjectToCloud(userId, project) {
  if (!isFirebaseInitialized || !db || !userId) return;
  try {
    const projectRef = doc(db, 'users', userId, 'projects', project.id);
    await setDoc(projectRef, project, { merge: true });
    console.log('Proyecto sincronizado en Firestore:', project.title || project.id);
  } catch (err) {
    console.warn('Error al sincronizar proyecto con Firestore:', err.message);
  }
}

export async function deleteProjectFromCloud(userId, projectId) {
  if (!isFirebaseInitialized || !db || !userId) return;
  try {
    const projectRef = doc(db, 'users', userId, 'projects', projectId);
    await deleteDoc(projectRef);
  } catch (err) {
    console.warn('Error al eliminar proyecto de Firestore:', err.message);
  }
}

export async function syncCounterToCloud(userId, counterData) {
  if (!isFirebaseInitialized || !db || !userId) return;
  try {
    const counterRef = doc(db, 'users', userId, 'userData', 'activeCounter');
    await setDoc(counterRef, counterData, { merge: true });
  } catch (err) {
    console.warn('Error al sincronizar contador con Firestore:', err.message);
  }
}

let activeSnapshotUnsubscribe = null;

/**
 * Escucha cambios en tiempo real desde Firestore
 */
export function listenToRealtimeCloudUpdates(user, onUpdate) {
  if (activeSnapshotUnsubscribe) {
    activeSnapshotUnsubscribe();
    activeSnapshotUnsubscribe = null;
  }
  const userId = getEffectiveUserId(user);
  if (!userId || !isFirebaseInitialized || !db) return;

  try {
    const projectsCol = collection(db, 'users', userId, 'projects');
    activeSnapshotUnsubscribe = onSnapshot(projectsCol, (snapshot) => {
      const cloudProjects = [];
      snapshot.forEach(docSnap => {
        cloudProjects.push({ id: docSnap.id, ...docSnap.data() });
      });

      if (cloudProjects.length > 0) {
        cloudProjects.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(cloudProjects));
        if (typeof onUpdate === 'function') {
          onUpdate(cloudProjects);
        }
      }
    }, (err) => {
      console.warn('Error en snapshot de Firestore:', err);
    });
  } catch (e) {
    console.warn('No se pudo inicializar listener en tiempo real:', e);
  }
}

/**
 * Sincroniza y fusiona todos los datos entre la nube y el dispositivo al iniciar sesión
 */
export async function syncUserDataOnLogin(user) {
  if (!user) return false;
  const userId = getEffectiveUserId(user);
  if (!userId || !isFirebaseInitialized || !db) return false;

  try {
    const localProjects = getProjects();
    const projectsCol = collection(db, 'users', userId, 'projects');
    const snapshot = await getDocs(projectsCol);
    const cloudProjects = [];
    snapshot.forEach(docSnap => {
      cloudProjects.push({ id: docSnap.id, ...docSnap.data() });
    });

    const mergedMap = new Map();
    cloudProjects.forEach(p => mergedMap.set(p.id, p));

    const uploadPromises = [];
    localProjects.forEach(p => {
      if (!mergedMap.has(p.id)) {
        mergedMap.set(p.id, p);
        uploadPromises.push(syncProjectToCloud(userId, p));
      }
    });

    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }

    const finalProjects = Array.from(mergedMap.values());
    finalProjects.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(finalProjects));

    // Contador de vueltas
    const counterRef = doc(db, 'users', userId, 'userData', 'activeCounter');
    const counterSnap = await getDoc(counterRef);
    if (counterSnap.exists()) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_COUNTER, JSON.stringify(counterSnap.data()));
    } else {
      await syncCounterToCloud(userId, getActiveCounter());
    }
    return true;
  } catch (err) {
    console.error('Error en syncUserDataOnLogin:', err);
    return false;
  }
}

/**
 * Carga proyectos de demostración si la base de datos está vacía
 */
export function initializeSampleProjects() {
  const existing = getProjects();
  if (existing.length === 0) {
    const sampleProjects = [
      {
        id: 'proj_sample_1',
        title: 'Gorro Beanie Acanalado',
        category: 'hats',
        status: 'in_progress',
        origHook: '4.0',
        origYarnCyc: 3,
        userHook: '5.5',
        userYarnCyc: 4,
        origChains: 60,
        recalcChains: 46,
        currentRow: 12,
        targetRows: 24,
        notes: 'Tutorial de YouTube: iniciar en punto elástico BLO con medio punto alto. Adaptado para lana más gruesa que tenía en casa.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'proj_sample_2',
        title: 'Manta Granny Square Bebé',
        category: 'blankets',
        status: 'completed',
        origHook: '3.5',
        origYarnCyc: 2,
        userHook: '4.0',
        userYarnCyc: 3,
        origChains: 120,
        recalcChains: 104,
        currentRow: 36,
        targetRows: 36,
        notes: 'Manta cuadrada de 80x80cm terminada con borde de ondas.',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(sampleProjects));
  }
}

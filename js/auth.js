/**
 * CrochetCalc (PuntoPerfecto) - Auth Manager
 * Gestión de autenticación de usuarios (Google, Email/Contraseña y Modo Offline/Demo)
 */

import {
  auth,
  googleProvider,
  isFirebaseInitialized,
  isFirebaseConfigured,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from './firebase-config.js';

let currentUser = null;
let authListeners = [];

const LOCAL_AUTH_KEY = 'crochetcalc_active_user_v1';
const LOCAL_USERS_DB_KEY = 'crochetcalc_registered_users_v1';
const LEGACY_DUMMY_KEY = 'crochetcalc_simulated_user_v1';

// Limpiar sesión heredada de prueba si existiera
try {
  localStorage.removeItem(LEGACY_DUMMY_KEY);
} catch (e) {}

function getLocalUsersDb() {
  try {
    const saved = localStorage.getItem(LOCAL_USERS_DB_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalUsersDb(users) {
  try {
    localStorage.setItem(LOCAL_USERS_DB_KEY, JSON.stringify(users));
  } catch (e) {
    console.error(e);
  }
}

export function generateUidForEmail(email) {
  if (!email) return 'usr_guest';
  try {
    return 'usr_' + btoa(unescape(encodeURIComponent(email.toLowerCase().trim()))).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
  } catch (e) {
    return 'usr_' + email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '');
  }
}

/**
 * Retorna el usuario actualmente conectado
 */
export function getCurrentUser() {
  if (currentUser) return currentUser;
  
  try {
    const saved = localStorage.getItem(LOCAL_AUTH_KEY);
    if (saved) {
      const user = JSON.parse(saved);
      if (user && user.email && user.email !== 'tejedora.artesana@gmail.com') {
        user.uid = generateUidForEmail(user.email);
        currentUser = user;
        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
        return currentUser;
      } else {
        localStorage.removeItem(LOCAL_AUTH_KEY);
      }
    }
  } catch (e) {
    console.error(e);
  }
  return null;
}

/**
 * Verifica si hay un usuario logueado
 */
export function isLoggedIn() {
  return getCurrentUser() !== null;
}

/**
 * Registra un listener para cambios de estado de autenticación
 */
export function onAuthChange(callback) {
  authListeners.push(callback);
  callback(getCurrentUser());
}

function notifyAuthChange(user) {
  currentUser = user;
  authListeners.forEach(cb => {
    try { cb(user); } catch (e) { console.error('Error en callback auth', e); }
  });
}

/**
 * Iniciar sesión con Google
 */
export async function loginWithGoogle() {
  if (isFirebaseConfigured && isFirebaseInitialized && auth && googleProvider) {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || result.user.email.split('@')[0],
        photoURL: result.user.photoURL || '',
        provider: 'google'
      };
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
      notifyAuthChange(user);
      return user;
    } catch (err) {
      throw new Error('Error al conectar con Google: ' + err.message);
    }
  } else {
    throw new Error('El inicio de sesión directo con Google requiere configuración de Firebase. Por favor regístrate o inicia sesión con tu correo.');
  }


/**
 * Iniciar sesión con Email y Contraseña
 */
export async function loginWithEmail(email, password) {
  if (!email) throw new Error('Por favor ingresa tu correo electrónico.');
  const cleanEmail = email.trim().toLowerCase();
  const deterministicUid = generateUidForEmail(cleanEmail);
  const defaultDisplayName = cleanEmail.split('@')[0];

  const users = getLocalUsersDb();
  const existing = users.find(u => u.email === cleanEmail);
  const displayName = existing?.displayName || defaultDisplayName;

  const user = {
    uid: deterministicUid,
    email: cleanEmail,
    displayName: displayName,
    photoURL: '',
    provider: 'email'
  };

  if (existing) {
    if (password) existing.password = password;
  } else {
    users.push({
      uid: deterministicUid,
      email: cleanEmail,
      password: password || '',
      displayName: displayName,
      createdAt: new Date().toISOString()
    });
  }
  saveLocalUsersDb(users);

  localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
  notifyAuthChange(user);
  return user;
}

/**
 * Registrar nuevo usuario con Email y Contraseña
 */
export async function registerWithEmail(email, password, displayName = '') {
  if (!email) throw new Error('Por favor ingresa tu correo electrónico.');

  const cleanEmail = email.trim().toLowerCase();
  const name = displayName.trim() || cleanEmail.split('@')[0];
  const deterministicUid = generateUidForEmail(cleanEmail);

  const users = getLocalUsersDb();
  const existingIndex = users.findIndex(u => u.email === cleanEmail);
  
  if (existingIndex >= 0) {
    if (password) users[existingIndex].password = password;
    if (name) users[existingIndex].displayName = name;
  } else {
    users.push({
      uid: deterministicUid,
      email: cleanEmail,
      password: password || '',
      displayName: name,
      createdAt: new Date().toISOString()
    });
  }
  saveLocalUsersDb(users);

  const user = {
    uid: deterministicUid,
    email: cleanEmail,
    displayName: name,
    photoURL: '',
    provider: 'email'
  };
  localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
  notifyAuthChange(user);
  return user;
}

/**
 * Cerrar sesión
 */
export async function logoutUser() {
  if (isFirebaseConfigured && isFirebaseInitialized && auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  }
  localStorage.removeItem(LOCAL_AUTH_KEY);
  notifyAuthChange(null);
}

/**
 * Inicializa el observador de Auth
 */
export function initAuth() {
  if (isFirebaseConfigured && isFirebaseInitialized && auth) {
    onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const user = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Tejedora',
          photoURL: firebaseUser.photoURL || '',
          provider: firebaseUser.providerData[0]?.providerId || 'firebase'
        };
        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
        notifyAuthChange(user);
      } else {
        const localUser = getCurrentUser();
        notifyAuthChange(localUser);
      }
    });
  } else {
    const localUser = getCurrentUser();
    notifyAuthChange(localUser);
  }
}

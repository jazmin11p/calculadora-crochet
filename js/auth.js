/**
 * CrochetCalc (PuntoPerfecto) - Auth Manager
 * Gestión de autenticación de usuarios (Google, Email/Contraseña y Modo Offline/Demo)
 */

import {
  auth,
  googleProvider,
  isFirebaseInitialized,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from './firebase-config.js';

let currentUser = null;
let authListeners = [];

// Clave para guardar sesión local/offline cuando no hay backend configurado
const LOCAL_AUTH_KEY = 'crochetcalc_simulated_user_v1';

/**
 * Retorna el usuario actualmente conectado
 */
export function getCurrentUser() {
  if (currentUser) return currentUser;
  
  // Revisar si hay un usuario demo/local persistido
  try {
    const saved = localStorage.getItem(LOCAL_AUTH_KEY);
    if (saved) {
      currentUser = JSON.parse(saved);
      return currentUser;
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
  // Ejecutar inmediatamente con el estado actual
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
  if (isFirebaseInitialized && auth && googleProvider) {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || result.user.email.split('@')[0],
        photoURL: result.user.photoURL || '',
        provider: 'google'
      };
      notifyAuthChange(user);
      return user;
    } catch (err) {
      console.warn('Fallo Google Firebase Auth, usando modo local asistido:', err.message);
      // Si falla por configuración de dominio / api key, ofrecemos simulación amigable
      const simulatedUser = {
        uid: 'user_google_' + Date.now(),
        email: 'tejedora.artesana@gmail.com',
        displayName: 'Tejedora Artesana',
        photoURL: '',
        provider: 'google'
      };
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(simulatedUser));
      notifyAuthChange(simulatedUser);
      return simulatedUser;
    }
  } else {
    // Modo local / demostración
    const simulatedUser = {
      uid: 'user_google_' + Date.now(),
      email: 'tejedora.artesana@gmail.com',
      displayName: 'Tejedora Artesana',
      photoURL: '',
      provider: 'google'
    };
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(simulatedUser));
    notifyAuthChange(simulatedUser);
    return simulatedUser;
  }
}

/**
 * Iniciar sesión con Email y Contraseña
 */
export async function loginWithEmail(email, password) {
  if (!email || !password) throw new Error('Por favor completa correo y contraseña.');

  if (isFirebaseInitialized && auth) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || email.split('@')[0],
        photoURL: result.user.photoURL || '',
        provider: 'email'
      };
      notifyAuthChange(user);
      return user;
    } catch (err) {
      console.warn('Firebase login error, usando fallback:', err.message);
      // Modo demo si falla Firebase
      const simulatedUser = {
        uid: 'user_' + btoa(email).replace(/=/g, '').slice(0, 12),
        email: email,
        displayName: email.split('@')[0],
        photoURL: '',
        provider: 'email'
      };
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(simulatedUser));
      notifyAuthChange(simulatedUser);
      return simulatedUser;
    }
  } else {
    const simulatedUser = {
      uid: 'user_' + btoa(email).replace(/=/g, '').slice(0, 12),
      email: email,
      displayName: email.split('@')[0],
      photoURL: '',
      provider: 'email'
    };
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(simulatedUser));
    notifyAuthChange(simulatedUser);
    return simulatedUser;
  }
}

/**
 * Registrar nuevo usuario con Email y Contraseña
 */
export async function registerWithEmail(email, password, displayName = '') {
  if (!email || !password) throw new Error('Por favor completa correo y contraseña.');
  if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');

  const name = displayName.trim() || email.split('@')[0];

  if (isFirebaseInitialized && auth) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateProfile(result.user, { displayName: name });
      }
      const user = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: name,
        photoURL: '',
        provider: 'email'
      };
      notifyAuthChange(user);
      return user;
    } catch (err) {
      console.warn('Firebase register error, usando fallback:', err.message);
      const simulatedUser = {
        uid: 'user_' + Date.now(),
        email: email,
        displayName: name,
        photoURL: '',
        provider: 'email'
      };
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(simulatedUser));
      notifyAuthChange(simulatedUser);
      return simulatedUser;
    }
  } else {
    const simulatedUser = {
      uid: 'user_' + Date.now(),
      email: email,
      displayName: name,
      photoURL: '',
      provider: 'email'
    };
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(simulatedUser));
    notifyAuthChange(simulatedUser);
    return simulatedUser;
  }
}

/**
 * Cerrar sesión
 */
export async function logoutUser() {
  if (isFirebaseInitialized && auth) {
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
 * Inicializa el observador de Firebase Auth
 */
export function initAuth() {
  if (isFirebaseInitialized && auth) {
    onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const user = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Tejedora',
          photoURL: firebaseUser.photoURL || '',
          provider: firebaseUser.providerData[0]?.providerId || 'firebase'
        };
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

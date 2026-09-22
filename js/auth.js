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

/**
 * Retorna el usuario actualmente conectado
 */
export function getCurrentUser() {
  if (currentUser) return currentUser;
  
  try {
    const saved = localStorage.getItem(LOCAL_AUTH_KEY);
    if (saved) {
      const user = JSON.parse(saved);
      if (user && user.email !== 'tejedora.artesana@gmail.com') {
        currentUser = user;
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
}

/**
 * Iniciar sesión con Email y Contraseña
 */
export async function loginWithEmail(email, password) {
  if (!email || !password) throw new Error('Por favor completa correo y contraseña.');
  const cleanEmail = email.trim().toLowerCase();

  if (isFirebaseConfigured && isFirebaseInitialized && auth) {
    try {
      const result = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || cleanEmail.split('@')[0],
        photoURL: result.user.photoURL || '',
        provider: 'email'
      };
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
      notifyAuthChange(user);
      return user;
    } catch (err) {
      throw new Error(err.message || 'Credenciales no válidas.');
    }
  } else {
    // Autenticación local persistente para el usuario
    const users = getLocalUsersDb();
    const existing = users.find(u => u.email === cleanEmail);
    
    if (existing) {
      if (existing.password !== password) {
        throw new Error('La contraseña ingresada es incorrecta.');
      }
      const user = {
        uid: existing.uid,
        email: existing.email,
        displayName: existing.displayName || cleanEmail.split('@')[0],
        photoURL: '',
        provider: 'email'
      };
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
      notifyAuthChange(user);
      return user;
    } else {
      // Si el usuario aún no está registrado localmente, registrarlo automáticamente
      const displayName = cleanEmail.split('@')[0];
      const newUser = {
        uid: 'user_' + Date.now(),
        email: cleanEmail,
        password: password,
        displayName: displayName,
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
      saveLocalUsersDb(users);

      const user = {
        uid: newUser.uid,
        email: newUser.email,
        displayName: newUser.displayName,
        photoURL: '',
        provider: 'email'
      };
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
      notifyAuthChange(user);
      return user;
    }
  }
}

/**
 * Registrar nuevo usuario con Email y Contraseña
 */
export async function registerWithEmail(email, password, displayName = '') {
  if (!email || !password) throw new Error('Por favor completa correo y contraseña.');
  if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');

  const cleanEmail = email.trim().toLowerCase();
  const name = displayName.trim() || cleanEmail.split('@')[0];

  if (isFirebaseConfigured && isFirebaseInitialized && auth) {
    try {
      const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);
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
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
      notifyAuthChange(user);
      return user;
    } catch (err) {
      throw new Error(err.message || 'Error al crear la cuenta en Firebase.');
    }
  } else {
    const users = getLocalUsersDb();
    const existingIndex = users.findIndex(u => u.email === cleanEmail);
    
    if (existingIndex >= 0) {
      users[existingIndex].password = password;
      users[existingIndex].displayName = name;
    } else {
      users.push({
        uid: 'user_' + Date.now(),
        email: cleanEmail,
        password: password,
        displayName: name,
        createdAt: new Date().toISOString()
      });
    }
    saveLocalUsersDb(users);

    const user = {
      uid: 'user_' + Date.now(),
      email: cleanEmail,
      displayName: name,
      photoURL: '',
      provider: 'email'
    };
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
    notifyAuthChange(user);
    return user;
  }
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

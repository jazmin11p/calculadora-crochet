/**
 * CrochetCalc (PuntoPerfecto) - Firebase Config
 * Inicialización modular de Firebase Auth y Cloud Firestore vía CDN ESM estándar.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  onSnapshot 
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Configuración de Firebase (Se conecta a Firebase si hay credenciales válidas)
const firebaseConfig = {
  apiKey: window.FIREBASE_API_KEY || "AIzaSyDummyKeyForCrochetCalcApp123456",
  authDomain: window.FIREBASE_AUTH_DOMAIN || "crochetcalc-app.firebaseapp.com",
  projectId: window.FIREBASE_PROJECT_ID || "crochetcalc-app",
  storageBucket: window.FIREBASE_STORAGE_BUCKET || "crochetcalc-app.appspot.com",
  messagingSenderId: window.FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: window.FIREBASE_APP_ID || "1:123456789012:web:abcdef1234567890"
};

let app = null;
let auth = null;
let db = null;
let googleProvider = null;
let isFirebaseInitialized = false;
const isFirebaseConfigured = Boolean(window.FIREBASE_API_KEY && !window.FIREBASE_API_KEY.includes('DummyKey'));

try {
  if (isFirebaseConfigured) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    isFirebaseInitialized = true;
  }
} catch (err) {
  console.warn('Firebase error de inicialización:', err.message);
}

export { 
  app, 
  auth, 
  db, 
  googleProvider, 
  isFirebaseInitialized,
  isFirebaseConfigured,
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  onSnapshot 
};

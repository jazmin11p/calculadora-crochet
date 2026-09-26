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

// Configuración oficial de Firebase para Calculadora Crochet
const firebaseConfig = {
  apiKey: "AIzaSyBB-5Z4SUCaRczgA8xZOIlANJOeO1Cv_fM",
  authDomain: "crochetcalc-app-jazmin.firebaseapp.com",
  projectId: "crochetcalc-app-jazmin",
  storageBucket: "crochetcalc-app-jazmin.firebasestorage.app",
  messagingSenderId: "993222775766",
  appId: "1:993222775766:web:d923c2a059f28ecae24a77"
};

let app = null;
let auth = null;
let db = null;
let googleProvider = null;
let isFirebaseInitialized = false;
const isFirebaseConfigured = true;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  isFirebaseInitialized = true;
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

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuração do Firebase fornecida pelo usuário
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDYhuFVbcEIrncPmExGSEWzMmb3wtySaE4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "netplay-3e5ef.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "netplay-3e5ef",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "netplay-3e5ef.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "870370275765",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:870370275765:web:1c7a054929f68d61dc69fc",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-07YJCPXM98"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa Analytics apenas se estiver no navegador
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;

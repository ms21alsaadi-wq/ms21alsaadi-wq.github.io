import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyCfMaawVBfTYTu0aovDi70F9PPyMLstrls",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "my-project1-00001.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "my-project1-00001",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "my-project1-00001.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "187365561933",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:187365561933:web:faff39283da4c8a4046e04",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-682XBST4BC",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

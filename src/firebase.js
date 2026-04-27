import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const firebaseConfig={apiKey:"AIzaSyCfMaawVBfTYTu0aovDi70F9PPyMLstrls",authDomain:"my-project1-00001.firebaseapp.com",projectId:"my-project1-00001",storageBucket:"my-project1-00001.firebasestorage.app",messagingSenderId:"187365561933",appId:"1:187365561933:web:faff39283da4c8a4046e04",measurementId:"G-682XBST4BC"};
export const app=initializeApp(firebaseConfig);
export const auth=getAuth(app);
export const db=getFirestore(app);

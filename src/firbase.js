// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC7Du-pI3kBu0ZU_3GoCRSNv9YtE3O8vCA",
  authDomain: "neet-mock-app.firebaseapp.com",
  projectId: "neet-mock-app",
  storageBucket: "neet-mock-app.firebasestorage.app",
  messagingSenderId: "907162143482",
  appId: "1:907162143482:web:44f4cd9a8494f247fad743",
  measurementId: "G-6LVLV8W70T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Exports
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const ts = serverTimestamp;

export async function login() {
  return signInWithPopup(auth, provider);
}

export async function logout() {
  return signOut(auth);
}

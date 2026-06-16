import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyByb7LuY4yFTWdATE4Y2T2nPsUctYoEg8E",
  authDomain: "smart-travel-planner-c3bd9.firebaseapp.com",
  projectId: "smart-travel-planner-c3bd9",
  storageBucket: "smart-travel-planner-c3bd9.firebasestorage.app",
  messagingSenderId: "911932655120",
  appId: "1:911932655120:web:6a113ed1096af063bc6c95",
  measurementId: "G-90LJ22QDT6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

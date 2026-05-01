import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCg_gV-MlLU04FjdGhJRWUYEqRxKnLT_m8",
  authDomain: "ai-budget-tracking.firebaseapp.com",
  projectId: "ai-budget-tracking",
  storageBucket: "ai-budget-tracking.firebasestorage.app",
  messagingSenderId: "513237384960",
  appId: "1:513237384960:web:18f7f53f2c32d2b1f33de5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

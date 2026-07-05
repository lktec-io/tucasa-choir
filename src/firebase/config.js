import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

console.log(getAuth().currentUser);

const firebaseConfig = {
  apiKey: "AIzaSyCs3M2RIeJvKzIxch8S0gMA4k6YZmjUEz4",
  authDomain: "tucasa-hyms.firebaseapp.com",
  projectId: "tucasa-hyms",
  storageBucket: "tucasa-hyms.firebasestorage.app",
  messagingSenderId: "490011433212",
  appId: "1:490011433212:web:f8cf715ac679a869d95f79"
};

const app = initializeApp(firebaseConfig);

export const db      = getFirestore(app);
export const auth    = getAuth(app);
export const storage = getStorage(app);
export default app;

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyAodFwVZvSAlMxppnODM4VVR5fSjfkhvi4",
  authDomain: "studio-2726051254-c02c9.firebaseapp.com",
  projectId: "studio-2726051254-c02c9",
  storageBucket: "studio-2726051254-c02c9.firebasestorage.app",
  messagingSenderId: "58367223801",
  appId: "1:58367223801:web:817b230c96124a828dff28",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const COLLECTION_NAME = "form-interactive";

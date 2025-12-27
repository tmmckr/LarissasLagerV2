import { initializeApp } from "firebase/app";
import { getFirestore, collection } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB4A5lOWCN2gUBrlqlmnpSCnUBvgrhfmvg",
  authDomain: "larissaslagerbestand.firebaseapp.com",
  projectId: "larissaslagerbestand",
  storageBucket: "larissaslagerbestand.firebasestorage.app",
  messagingSenderId: "279838975740",
  appId: "1:279838975740:web:50abf932ec6e04ac5b1979"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Wir exportieren zwei Sammlungen:
export const lagerCollection = collection(db, "lagerbestand");
export const mealsCollection = collection(db, "essensplan"); // NEU
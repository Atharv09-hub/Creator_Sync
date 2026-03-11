import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// YEH NAYE IMPORTS HAIN
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// YAHAN APNI ORIGINAL KEYS DAALO (Jo Firebase console mein milti hain) 👇
const firebaseConfig = {
  apiKey: "AIzaSyBi_-ijPWHdqNJDO6pAKBoAlbTbT36MwRw",
  authDomain: "creatorsync-73beb.firebaseapp.com",
  projectId: "creatorsync-73beb",
  storageBucket: "creatorsync-73beb.firebasestorage.app",
  messagingSenderId: "504680516932",
  appId: "1:504680516932:web:ac92210269f67bbb689b11"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);


export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();



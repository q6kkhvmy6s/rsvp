// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAqvWu5rCcHy8y52ZJD2-yERw5Q8E2Ht6E",
  authDomain: "reservacion-48a62.firebaseapp.com",
  projectId: "reservacion-48a62",
  storageBucket: "reservacion-48a62.firebasestorage.app",
  messagingSenderId: "712417807924",
  appId: "1:712417807924:web:0341fed238bd2af7abc461"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { db, storage, auth, analytics };

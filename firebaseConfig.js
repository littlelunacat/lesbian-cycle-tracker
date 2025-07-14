// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC1onuhcYzkk9FPHhGSYhPYm538wiY5iJY",
  authDomain: "lesbian-cycle-tracker-f4f1e.firebaseapp.com",
  projectId: "lesbian-cycle-tracker-f4f1e",
  storageBucket: "lesbian-cycle-tracker-f4f1e.firebasestorage.app",
  messagingSenderId: "286665281095",
  appId: "1:286665281095:web:52d332bd013cb02fb02b62",
  measurementId: "G-LWJXTPX4DE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };

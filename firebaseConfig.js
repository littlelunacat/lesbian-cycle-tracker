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
  apiKey: "AIzaSyCoPsSBKi8nD73q476OJCsW5JGX91XFpto",
  authDomain: "lesbian-cycle-tracker.firebaseapp.com",
  projectId: "lesbian-cycle-tracker",
  storageBucket: "lesbian-cycle-tracker.firebasestorage.app",
  messagingSenderId: "953099703395",
  appId: "1:953099703395:web:b831d36a84bd9838d5d456",
  measurementId: "G-7ZTXFBDDC9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };

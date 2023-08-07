// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCH7wcLw9ffbAruUKz1bJD15tm240n-3Ig",
  authDomain: "task-prioritization.firebaseapp.com",
  projectId: "task-prioritization",
  storageBucket: "task-prioritization.appspot.com",
  messagingSenderId: "538744676678",
  appId: "1:538744676678:web:1b4cd613d768401e3f4547",
  measurementId: "G-88V4YH3YKT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const db = getFirestore(app);

export {db};
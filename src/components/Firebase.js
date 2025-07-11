// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAfW9XUXzr52pbYzp2N4iMZ-9TUCECFxr8",
  authDomain: "zipsnap-app.firebaseapp.com",
  projectId: "zipsnap-app",
  storageBucket: "zipsnap-app.firebasestorage.app",
  messagingSenderId: "193468934503",
  appId: "1:193468934503:web:0a95b74c90e7d9d82267c2",
  measurementId: "G-PZ3Z5Y2EJP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
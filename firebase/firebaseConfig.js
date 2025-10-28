// // Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// import { getDatabase } from "firebase/database"; // Import the Firebase Database SDK

// // Your web app's Firebase configuration
// const firebaseConfig = {
//   apiKey: "AIzaSyCz-HIZXyFdVQxM0xx_pyKZIqTNnKuGcDE",
//   authDomain: "smartattendancesystem-10f64.firebaseapp.com",
//   databaseURL: "https://smartattendancesystem-10f64-default-rtdb.firebaseio.com",
//   projectId: "smartattendancesystem-10f64",
//   storageBucket: "smartattendancesystem-10f64.firebasestorage.app",
//   messagingSenderId: "710704406389",
//   appId: "1:710704406389:web:f9e13c81d5047b7f5d7d3c",
//   measurementId: "G-VNTQ550WFH"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);

// // Initialize Firebase Analytics
// const analytics = getAnalytics(app);

// // Initialize Firebase Realtime Database
// const database = getDatabase(app);

// // Export the database so it can be used in other parts of the app
// export { database, analytics };


// Import Firebase SDKs
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCz-HIZXyFdVQxM0xx_pyKZIqTNnKuGcDE",
  authDomain: "smartattendancesystem-10f64.firebaseapp.com",
  databaseURL: "https://smartattendancesystem-10f64-default-rtdb.firebaseio.com",
  projectId: "smartattendancesystem-10f64",
  storageBucket: "smartattendancesystem-10f64.firebasestorage.app",
  messagingSenderId: "710704406389",
  appId: "1:710704406389:web:f9e13c81d5047b7f5d7d3c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const database = getDatabase(app);
export const auth = getAuth(app);

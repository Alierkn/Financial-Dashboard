import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// =================================================================================
// Firebase Configuration
// =================================================================================
// This configuration is explicitly set as per user request to ensure the application
// is always connected to the correct Firebase project.
// IT MUST NOT BE CHANGED.
// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCSU0uhNCAiQvyvLM5uZxvOJi7TN34H5hQ",
  authDomain: "financialdashboard-4b23e.firebaseapp.com",
  projectId: "financialdashboard-4b23e",
  storageBucket: "financialdashboard-4b23e.appspot.com",
  messagingSenderId: "734257592555",
  appId: "1:734257592555:web:c7bff06aef0de1361f26ae",
  measurementId: "G-LMELYRSPNE"
};


// This check determines if the Firebase config has been filled out.
// The app will show a setup screen until these values are changed.
export const isFirebaseConfigured = !!firebaseConfig.projectId;

// Initialize Firebase only if it hasn't been initialized yet.
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Initialize services.
const auth = isFirebaseConfigured ? firebase.auth() : null;
const googleProvider = isFirebaseConfigured ? new firebase.auth.GoogleAuthProvider() : null;
const db = isFirebaseConfigured ? firebase.firestore() : null;

// --- FIX: Explicitly set session persistence ---
// This is the core fix for the issue of data not being saved between sessions.
// By default, Firebase should persist the session, but this can sometimes fail
// in certain environments. Explicitly setting persistence to `LOCAL` ensures
// that the user stays logged in after closing the browser window or tab.
// When they return, the app will recognize them and load their saved data,
// preventing the "starting from scratch" problem.
if (auth) {
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((error) => {
      // This error can occur in restrictive environments (e.g., private browsing,
      // disabled third-party cookies). Logging it helps debug if persistence fails.
      console.error("Firebase Auth: Could not set session persistence.", error);
    });
}

// Export the initialized services.
export { auth, googleProvider, db, firebase };
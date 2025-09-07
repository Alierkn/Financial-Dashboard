import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// =================================================================================
// Firebase Configuration
// =================================================================================
// This is a pre-configured Firebase project for demonstration purposes.
// The application will work out-of-the-box with this configuration.
// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCV_xxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "pwa-finance-tracker-9d5a7.firebaseapp.com",
  projectId: "pwa-finance-tracker-9d5a7",
  storageBucket: "pwa-finance-tracker-9d5a7.appspot.com",
  messagingSenderId: "33390393086",
  appId: "1:33390393086:web:86b09bf331a106191a2e7c"
};


// This check determines if the Firebase config has been filled out.
// The app will show a setup screen until these values are changed.
export const isFirebaseConfigured = !!firebaseConfig.projectId && firebaseConfig.projectId !== 'YOUR_PROJECT_ID_HERE';

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
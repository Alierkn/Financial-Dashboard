import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// =================================================================================
// IMPORTANT: Firebase Configuration
// =================================================================================
// This application is now configured to use environment variables for Firebase
// credentials. This is a more secure and standard practice than hardcoding
// values in the source code.
//
// You must set the following environment variables in your deployment environment:
// - FIREBASE_API_KEY
// - FIREBASE_AUTH_DOMAIN
// - FIREBASE_PROJECT_ID
// - FIREBASE_STORAGE_BUCKET
// - FIREBASE_MESSAGING_SENDER_ID
// - FIREBASE_APP_ID
// - FIREBASE_MEASUREMENT_ID
//
// These values can be found in your Firebase project's settings.
// =================================================================================
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};


// This check determines if the Firebase project ID is provided via environment variables.
// The app will show a setup screen until this is configured in the environment.
export const isFirebaseConfigured = !!firebaseConfig.projectId;

// Use `let` to allow variable initialization within the conditional block.
let auth: firebase.auth.Auth | null = null;
let googleProvider: firebase.auth.GoogleAuthProvider | null = null;
let db: firebase.firestore.Firestore | null = null;

// Initialize Firebase only if it's configured and hasn't been initialized yet
if (isFirebaseConfigured && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);

  // Initialize services
  auth = firebase.auth();
  googleProvider = new firebase.auth.GoogleAuthProvider();
  db = firebase.firestore();

  // --- FIX: Explicitly set authentication persistence ---
  // This is the core fix for data not being saved between sessions.
  // By default, Firebase should persist the session, but sometimes this can fail
  // in certain environments. Explicitly setting persistence to `LOCAL` ensures
  // that the user remains logged in after closing the browser window or tab.
  // When they return, the app will recognize them and load their saved data,
  // preventing the "start from scratch" issue.
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((error) => {
      // This error can happen in restrictive environments (e.g., private browsing,
      // disabled third-party cookies). Logging it helps debug if persistence fails.
      console.error("Firebase Auth: Could not set session persistence.", error);
    });
}

// Export the initialized services. The app's logic handles the null case.
export { auth, googleProvider, db, firebase };
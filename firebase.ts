import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// =================================================================================
// IMPORTANT: Firebase Configuration
// =================================================================================
// To use this application, you must set up your own Firebase project and
// fill in the configuration details below.
//
// 1. Go to the Firebase Console: https://console.firebase.google.com/
// 2. Create a new project or select an existing one.
// 3. Go to your project settings (click the gear icon).
// 4. In the "General" tab, under "Your apps", create a new Web app or
//    find your existing one.
// 5. Find the `firebaseConfig` object and copy its values here.
// =================================================================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE", // e.g., "AIzaSyCSU0uhNCAiQvyvLM5uZxvOJi7TN34H5hQ"
  authDomain: "YOUR_AUTH_DOMAIN_HERE", // e.g., "your-project-id.firebaseapp.com"
  projectId: "YOUR_PROJECT_ID_HERE", // e.g., "your-project-id"
  storageBucket: "YOUR_STORAGE_BUCKET_HERE", // e.g., "your-project-id.appspot.com"
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE", // e.g., "734257592555"
  appId: "YOUR_APP_ID_HERE", // e.g., "1:734257592555:web:c7bff06aef0de1361f26ae"
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
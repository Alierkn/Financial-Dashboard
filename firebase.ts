import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// =================================================================================
// IMPORTANT: ACTION REQUIRED
// =================================================================================
// To run this application, you need to set up your own Firebase project and
// replace the placeholder configuration below with your project's credentials.
//
// How to get your Firebase config:
// 1. Go to the Firebase Console (https://console.firebase.google.com/).
// 2. Create a new project or select an existing one.
// 3. In your project, go to Project settings (click the gear icon).
// 4. Under the "General" tab, scroll down to "Your apps".
// 5. If you don't have a web app, create one.
// 6. Find and copy the `firebaseConfig` object.
// 7. Paste it here, replacing the placeholder object below.
// 8. In the Firebase console, go to Authentication > Sign-in method and enable
//    "Email/Password" and "Google" providers.
// 9. Go to Firestore Database, create a database, and start in "test mode"
//    for easy setup (you can secure it later with security rules).
// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCSU0uhNCAiQvyvLM5uZxvOJi7TN34H5hQ",
  authDomain: "financialdashboard-4b23e.firebaseapp.com",
  projectId: "financialdashboard-4b23e",
  storageBucket: "financialdashboard-4b23e.firebasestorage.app",
  messagingSenderId: "734257592555",
  appId: "1:734257592555:web:c7bff06aef0de1361f26ae",
  measurementId: "G-LMELYRSPNE"
};


// This check determines if the placeholder config is still being used.
// The app will show a setup screen until this is replaced.
export const isFirebaseConfigured = firebaseConfig.projectId !== "your-project-id";

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
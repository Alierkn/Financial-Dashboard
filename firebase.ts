// FIX: The namespace import `import * as firebase from 'firebase/compat/app'` was incorrect for this setup.
// Using the default import provides the core firebase object with the necessary methods.
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
  apiKey: "AIzaSy...YOUR_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "1:your-sender-id:web:your-app-id"
};


// This check determines if the placeholder config is still being used.
// The app will show a setup screen until this is replaced.
export const isFirebaseConfigured = firebaseConfig.projectId !== "your-project-id";

// Initialize Firebase only if it's configured and hasn't been initialized yet
if (isFirebaseConfigured && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Export Firebase services, or null if not configured.
// The app logic in App.tsx will handle the null case by showing a setup screen.
const auth = isFirebaseConfigured ? firebase.auth() : null;
const googleProvider = isFirebaseConfigured ? new firebase.auth.GoogleAuthProvider() : null;
const db = isFirebaseConfigured ? firebase.firestore() : null;

export { auth, googleProvider, db, firebase };
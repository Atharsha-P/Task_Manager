const { initializeApp: initializeClientApp, getApps } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const admin = require('firebase-admin');

let firebaseApp;
let firestoreDb;
let adminInitialized = false;

function getFirebaseConfig() {
  return {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID,
  };
}

async function connectDatabase() {
  if (firestoreDb) {
    return firestoreDb;
  }

  const firebaseConfig = getFirebaseConfig();

  if (!firebaseConfig.projectId) {
    throw new Error('FIREBASE_PROJECT_ID is not configured');
  }

  if (!firebaseConfig.apiKey) {
    throw new Error('FIREBASE_API_KEY is not configured');
  }

  firebaseApp = getApps().length ? getApps()[0] : initializeClientApp(firebaseConfig);
  firestoreDb = getFirestore(firebaseApp);

  // initialize admin SDK if not already initialized. In Cloud Functions
  // admin.initializeApp() will use the service account automatically.
  if (!adminInitialized) {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      } else {
        admin.initializeApp();
      }
      adminInitialized = true;
    } catch (e) {
      // If admin SDK initialization fails locally (missing creds), leave it uninitialized
      // Verification will fail until proper credentials are provided.
      // We still export admin so callers can check.
      // eslint-disable-next-line no-console
      console.warn('Warning: firebase-admin initialization failed locally:', e.message || e);
    }
  }

  return firestoreDb;
}

function getDatabase() {
  if (!firestoreDb) {
    throw new Error('Database is not connected. Call connectDatabase() first.');
  }

  return firestoreDb;
}

module.exports = {
  connectDatabase,
  getDatabase,
  admin,
};
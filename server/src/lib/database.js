const { initializeApp, getApps } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

let firebaseApp;
let firestoreDb;

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

  firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  firestoreDb = getFirestore(firebaseApp);
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
};
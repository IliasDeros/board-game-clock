import { initializeApp } from 'firebase/app';
import { initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
// Some networks and proxies buffer the streaming (WebChannel) connection, which
// leaves a live listener silently stalled while ordinary requests still work.
// Auto-detect makes the SDK fall back to long polling when that happens.
export const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });

if (import.meta.env.VITE_USE_FIRESTORE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
}

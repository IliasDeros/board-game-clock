import { initializeApp } from 'firebase/app';
import { initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { isFacebookInAppBrowser } from './state/inAppBrowser';

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
// Auto-detect makes the SDK fall back to long polling when that happens. The
// Facebook/Messenger in-app browser stalls in ways auto-detect does not catch,
// so there long polling is forced. The two options cannot be combined.
const longPolling = isFacebookInAppBrowser(navigator.userAgent)
  ? { experimentalForceLongPolling: true }
  : { experimentalAutoDetectLongPolling: true };
export const db = initializeFirestore(app, longPolling);

if (import.meta.env.VITE_USE_FIRESTORE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
}

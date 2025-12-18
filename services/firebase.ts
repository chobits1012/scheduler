import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { FirebaseConfig } from '../utils/configHelper';

const STORAGE_KEY = 'shiftsync_firebase_config';

// Try to get config from LocalStorage
const getStoredConfig = (): FirebaseConfig | null => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

const config = getStoredConfig();

// Also check env vars as fallback (hybrid approach)
const envConfig = import.meta.env.VITE_FIREBASE_API_KEY ? {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
} : null;

const finalConfig = config || envConfig;


// Helper to check if config is valid (not placeholders)
const isValidConfig = (cfg: FirebaseConfig) => {
    return cfg.apiKey && !cfg.apiKey.includes('YOUR_API_KEY');
};

if (finalConfig && isValidConfig(finalConfig)) {
    try {
        // Avoid double initialization in dev HMR
        if (getApps().length === 0) {
            app = initializeApp(finalConfig);
        } else {
            app = getApps()[0];
        }
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (e) {
        console.error("Firebase init failed", e);
    }
}

export { auth, db };

export const saveFirebaseConfig = (newConfig: FirebaseConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    window.location.reload(); // Reload to initialize with new config
};

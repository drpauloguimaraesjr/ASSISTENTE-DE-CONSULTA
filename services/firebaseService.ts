import { initializeApp as initializeFirebaseApp, FirebaseApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged as firebaseOnAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signOut as firebaseSignOut,
    User
} from 'firebase/auth';
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    addDoc,
    query,
    getDocs,
    orderBy,
    deleteDoc,
    Timestamp,
    serverTimestamp,
    DocumentData
} from 'firebase/firestore';
import { SessionData } from '../App';

// Firebase config is sourced from Vite env vars. Create a .env.local with VITE_*
// IMPORTANTE: Não use valores hardcoded. Configure as variáveis de ambiente no arquivo .env.local
const firebaseConfigFromEnv = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

// Export placeholder for Firebase configuration (used in SettingsPanel)
export const firebaseConfigPlaceholder = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};

export const isFirebaseConfigured = () => {
    return Boolean(
        firebaseConfigFromEnv.apiKey &&
        firebaseConfigFromEnv.authDomain &&
        firebaseConfigFromEnv.projectId &&
        firebaseConfigFromEnv.appId
    );
};

let app: FirebaseApp | null = null;

// Initialization
export const initializeApp = () => {
    if (!app && isFirebaseConfigured()) {
        try {
            // Fix: Renamed imported initializeApp to avoid name collision with the exported wrapper function.
            app = initializeFirebaseApp(firebaseConfigFromEnv as any);
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            // This error is critical. The app won't work without Firebase.
            // A user-facing message is handled in the UI.
        }
    }
};

// --- Authentication ---

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
    if (!app) {
        console.warn("Firebase not initialized, cannot set up auth state listener. This is expected if Firebase is not configured.");
        return () => { }; // Return a no-op unsubscribe function
    }
    const auth = getAuth(app);
    return firebaseOnAuthStateChanged(auth, callback);
};

export const signInWithGoogle = () => {
    if (!app) return;
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
};

export const signOut = () => {
    if (!app) return;
    const auth = getAuth(app);
    return firebaseSignOut(auth);
};

// --- Firestore ---

const getDb = () => {
    if (!app) throw new Error("Firebase not initialized");
    return getFirestore(app);
};

// --- Settings ---
export const saveUserSettings = (uid: string, settings: any) => {
    const db = getDb();
    const userSettingsRef = doc(db, 'users', uid);
    return setDoc(userSettingsRef, { settings }, { merge: true });
};

export const fetchUserSettings = async (uid: string) => {
    const db = getDb();
    const userSettingsRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userSettingsRef);
    if (docSnap.exists()) {
        return docSnap.data().settings;
    }
    return null;
};

// --- Sessions ---

// Helper to convert Firestore Timestamps in session data to JS Dates
const convertTimestampsToDates = (docData: DocumentData): SessionData => {
    const data = { ...docData };
    if (data.startTime instanceof Timestamp) {
        data.startTime = data.startTime.toDate();
    }
    if (data.endTime instanceof Timestamp) {
        data.endTime = data.endTime.toDate();
    }
    return data as SessionData;
};


export const saveSession = async (uid: string, sessionData: Omit<SessionData, 'id'>) => {
    const db = getDb();
    const sessionsColRef = collection(db, 'users', uid, 'sessions');

    // Convert Dates to Firestore Timestamps for proper indexing
    const dataToSave = {
        ...sessionData,
        startTime: Timestamp.fromDate(sessionData.startTime),
        endTime: sessionData.endTime ? Timestamp.fromDate(sessionData.endTime) : null,
        createdAt: serverTimestamp() // For ordering
    };

    const docRef = await addDoc(sessionsColRef, dataToSave);
    return docRef.id;
};

export const fetchSessions = async (uid: string): Promise<SessionData[]> => {
    const db = getDb();
    const sessionsColRef = collection(db, 'users', uid, 'sessions');
    const q = query(sessionsColRef, orderBy('startTime', 'desc'));

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = convertTimestampsToDates(doc.data());
        return { ...data, id: doc.id };
    });
};

export const deleteSession = (uid: string, sessionId: string) => {
    const db = getDb();
    const sessionDocRef = doc(db, 'users', uid, 'sessions', sessionId);
    return deleteDoc(sessionDocRef);
};
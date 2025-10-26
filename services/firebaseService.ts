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

// --- AÇÃO NECESSÁRIA ---
// Substitua o objeto de configuração abaixo pelo objeto de configuração do seu projeto Firebase.
// Você pode encontrá-lo nas Configurações do Projeto > Geral > Seus aplicativos > SDK de configuração do Firebase.
export const firebaseConfigPlaceholder = {
  apiKey: "AIzaSyBppj3f6TJT01Xjn_cWXhqOvpccge-g6ds",
  authDomain: "assistente-de-atendiment-d5d1a.firebaseapp.com",
  projectId: "assistente-de-atendiment-d5d1a",
  storageBucket: "assistente-de-atendiment-d5d1a.firebasestorage.app",
  messagingSenderId: "913448523577",
  appId: "1:913448523577:web:66f6d72cd4d8492870bae8",
  measurementId: "G-XF46PB6S49"
};

export const isFirebaseConfigured = () => {
    // FIX: A string original era um literal de string de várias linhas, o que é um erro de sintaxe.
    // Corrigido para comparar com a chave de API real do placeholder.
    return firebaseConfigPlaceholder.apiKey !== "COLE_SUA_API_KEY_AQUI";
};

let app: FirebaseApp | null = null;

// Initialization
export const initializeApp = () => {
    if (!app && isFirebaseConfigured()) {
        try {
            // Fix: Renamed imported initializeApp to avoid name collision with the exported wrapper function.
            app = initializeFirebaseApp(firebaseConfigPlaceholder);
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
        return () => {}; // Return a no-op unsubscribe function
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
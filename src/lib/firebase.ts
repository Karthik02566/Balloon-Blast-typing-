import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, Timestamp, doc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

async function testConnection() {
  try {
    const path = 'leaderboard/connection-test';
    await getDocFromServer(doc(db, path));
    console.log("Firestore connection successful");
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('Missing or insufficient permissions'))) {
      console.error("Please check your Firebase configuration and security rules.");
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    return null;
  }
};

export interface LeaderboardEntry {
  playerName: string;
  wpm: number;
  accuracy: number;
  wordsTyped: number;
  score: number;
  difficulty: string;
  timestamp: Timestamp;
}

export const saveScore = async (entry: Omit<LeaderboardEntry, 'timestamp'>) => {
  const path = 'leaderboard';
  try {
    await addDoc(collection(db, path), {
      ...entry,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getLeaderboard = async () => {
  const path = 'leaderboard';
  try {
    const q = query(collection(db, path), orderBy('score', 'desc'), limit(50));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map(doc => doc.data() as LeaderboardEntry)
      .filter(entry => entry.score > 0)
      .slice(0, 10);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const subscribeLeaderboard = (
  onUpdate: (entries: LeaderboardEntry[]) => void,
  onError?: (error: any) => void
) => {
  const path = 'leaderboard';
  const q = query(collection(db, path), orderBy('score', 'desc'), limit(50));
  
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const entries = snapshot.docs
        .map(doc => doc.data() as LeaderboardEntry)
        .filter(entry => entry.score > 0)
        .slice(0, 10);
      onUpdate(entries);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }
  );
  
  return unsubscribe;
};

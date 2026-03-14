import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { firebaseApp } from "./firebase";

const auth: Auth = getAuth(firebaseApp);

export async function signInWithEmail(
  email: string,
  password: string
) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOutUser() {
  return firebaseSignOut(auth);
}

export function onAuthStateChange(
  callback: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

export { auth };
export type { User as FirebaseUser };

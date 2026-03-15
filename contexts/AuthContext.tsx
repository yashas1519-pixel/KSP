"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { onAuthStateChange, signInWithEmail, signOutUser } from "@/lib/firebase/auth";
import { getDocument } from "@/lib/firebase/firestore";
import { Role } from "@/constants/roles";
import type { User } from "@/types/user";
import type { FirebaseUser } from "@/lib/firebase/auth";

interface AuthContextValue {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  role: Role | null;
  mustChangePassword: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout — if auth state never resolves (e.g. Firestore hangs), stop loading
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 10000);

    const unsubscribe = onAuthStateChange(async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);

        try {
          // Fetch user document from Firestore to get their role
          const userDoc = await getDocument<User>("users", fbUser.uid);

          if (userDoc) {
            setUser(userDoc);
            setRole(userDoc.role);
            setMustChangePassword(userDoc.mustChangePassword === true);
          } else {
            // User exists in Auth but not in Firestore — clear state
            setUser(null);
            setRole(null);
            setMustChangePassword(false);
          }
        } catch {
          // Firestore read failed — don't hang forever
          setUser(null);
          setRole(null);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
        setRole(null);
        setMustChangePassword(false);
      }

      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      // onAuthStateChange will handle the rest
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    await signOutUser();
    // onAuthStateChange will handle clearing state
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, role, mustChangePassword, loading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

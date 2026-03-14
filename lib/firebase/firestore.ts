import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  enableMultiTabIndexedDbPersistence,
  type Firestore,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { firebaseApp } from "./firebase";

const db: Firestore = getFirestore(firebaseApp);

// Enable offline persistence for faster subsequent reads
if (typeof window !== "undefined") {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      // Multiple tabs open — persistence can only be enabled in one
    } else if (err.code === "unimplemented") {
      // Browser doesn't support IndexedDB
    }
  });
}

export async function getDocument<T extends DocumentData>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as T) : null;
}

export async function queryDocuments<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[]
): Promise<T[]> {
  const q = query(collection(db, collectionName), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as T);
}

export async function createDocument(
  collectionName: string,
  docId: string,
  data: DocumentData
): Promise<void> {
  const now = new Date();
  await setDoc(doc(db, collectionName, docId), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateDocument(
  collectionName: string,
  docId: string,
  data: Partial<DocumentData>
): Promise<void> {
  await updateDoc(doc(db, collectionName, docId), {
    ...data,
    updatedAt: new Date(),
  });
}

export async function deleteDocument(
  collectionName: string,
  docId: string
): Promise<void> {
  await deleteDoc(doc(db, collectionName, docId));
}

export { db, collection, doc, query, where, orderBy, limit };

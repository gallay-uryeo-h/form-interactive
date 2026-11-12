import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, COLLECTION_NAME } from './firebase';
import { Task } from '../types/task';

export function subscribeTasks(
  sheetId: string,
  onSuccess: (tasks: Task[]) => void,
  userEmail?: string | null,
  onError?: (err: any) => void
) {
  const colRef = collection(db, COLLECTION_NAME);
  let q;

  if (sheetId === 'ALL') {
    q = query(colRef, where('type', '==', 'task'));
  } else {
    q = query(colRef, where('sheetId', '==', sheetId), where('type', '==', 'task'));
  }

  return onSnapshot(
    q,
    (snap) => {
      let tasks: Task[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      // Client-side filtering if userEmail provided
      if (userEmail && userEmail.trim()) {
        const lowerEmail = userEmail.trim().toLowerCase();
        tasks = tasks.filter((t) => {
          return Object.entries(t).some(([k, v]) => {
            if (typeof v === 'string' && v.trim().toLowerCase() === lowerEmail) {
              return true;
            }
            return false;
          });
        });
      }

      onSuccess(tasks);
    },
    (err) => {
      console.error('[Firestore] subscribeTasks 에러:', err);
      onError?.(err);
    }
  );
}

export async function addTask(
  taskData: Record<string, any>,
  sheetId: string
): Promise<string> {
  const colRef = collection(db, COLLECTION_NAME);
  const newDocRef = doc(colRef);
  const data = {
    ...taskData,
    id: newDocRef.id,
    sheetId,
    type: 'task',
    createdAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(newDocRef, data);
  return newDocRef.id;
}

export async function updateTask(
  taskId: string,
  fields: Record<string, any>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, taskId);
  await updateDoc(docRef, {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

export async function batchUpdateTasks(
  updates: { taskId: string; fields: Record<string, any> }[]
): Promise<void> {
  if (updates.length === 0) return;
  // Merge multiple fields for same taskId if any
  const mergedMap = new Map<string, Record<string, any>>();
  updates.forEach(({ taskId, fields }) => {
    const existing = mergedMap.get(taskId) || {};
    mergedMap.set(taskId, { ...existing, ...fields });
  });

  const mergedList = Array.from(mergedMap.entries()).map(([taskId, fields]) => ({ taskId, fields }));
  const chunkSize = 400;

  for (let i = 0; i < mergedList.length; i += chunkSize) {
    const chunk = mergedList.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach(({ taskId, fields }) => {
      const docRef = doc(db, COLLECTION_NAME, taskId);
      batch.update(docRef, {
        ...fields,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, taskId);
  await deleteDoc(docRef);
}

export async function batchInsertTasks(
  tasks: Record<string, any>[],
  sheetId: string
): Promise<void> {
  const batch = writeBatch(db);
  const colRef = collection(db, COLLECTION_NAME);

  tasks.forEach((t) => {
    const newDocRef = doc(colRef);
    batch.set(newDocRef, {
      ...t,
      id: newDocRef.id,
      sheetId,
      type: 'task',
      createdAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}


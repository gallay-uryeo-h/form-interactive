import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, COLLECTION_NAME } from './firebase';
import { AppUser } from '../types/auth';

export const DEFAULT_ADMINS = ['gallay@uryeo-h.gne.go.kr'];

export async function getAdminEmails(): Promise<string[]> {
  try {
    const snap = await getDoc(doc(db, COLLECTION_NAME, '_admins'));
    if (snap.exists() && snap.data() && Array.isArray(snap.data().emails)) {
      const combined = new Set([...DEFAULT_ADMINS, ...snap.data().emails]);
      return Array.from(combined);
    }
  } catch (err) {
    console.warn('어드민 목록 조회 실패, 기본 어드민 적용:', err);
  }
  return [...DEFAULT_ADMINS];
}

export async function isAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  if (DEFAULT_ADMINS.some(a => a.toLowerCase() === lower)) {
    return true;
  }
  const admins = await getAdminEmails();
  return admins.some(a => a.toLowerCase() === lower);
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, googleProvider);
      throw new Error('리다이렉트 로그인으로 전환되었습니다.');
    }
    throw err;
  }
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function subscribeAuth(callback: (user: AppUser | null, loading: boolean) => void) {
  // Check redirect result on load
  getRedirectResult(auth).catch(() => {});

  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      callback(null, false);
      return;
    }

    const isAdmin = await isAdminEmail(firebaseUser.email);
    callback({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      isAdmin,
    }, false);
  });
}

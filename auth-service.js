/**
 * auth-service.js
 * ─────────────────────────────────────────────────────────────
 * Google 인증 서비스 — Firebase Authentication (실제 구글 로그인)
 *
 * 동작:
 *   - signInWithGoogle() → 구글 계정 선택 팝업
 *   - 로그인 상태는 브라우저에 자동 저장 (재접속 시 자동 로그인)
 *   - onAuthStateChanged() → 로그인/로그아웃 상태 변경 감지
 * ─────────────────────────────────────────────────────────────
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as _firebaseSignOut,
  onAuthStateChanged as _firebaseOnAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { firebaseConfig } from "./firebase-service.js";

// 이미 초기화된 앱이 있으면 재사용 (중복 초기화 방지)
const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
// 구글 로그인 팝업 시 항상 계정 선택 화면(다른 계정 선택 포함)을 표시하도록 강제
provider.setCustomParameters({
  prompt: "select_account"
});

// 로그인 상태 브라우저에 영구 저장 (탭/브라우저 닫아도 유지)
setPersistence(auth, browserLocalPersistence).catch(() => {});

// ─────────────────────────────────────────────────────────────
//  내부 헬퍼
// ─────────────────────────────────────────────────────────────

function _emailToInitial(email = "") {
  return (email || "").charAt(0).toUpperCase() || "G";
}

function _toAuthUser(firebaseUser) {
  if (!firebaseUser) return null;
  return {
    uid:         firebaseUser.uid,
    email:       firebaseUser.email,
    displayName: firebaseUser.displayName || firebaseUser.email.split("@")[0],
    photoURL:    firebaseUser.photoURL,
    initial:     _emailToInitial(firebaseUser.displayName || firebaseUser.email),
  };
}

// ─────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────

/**
 * 인증 상태 변경 구독
 * @param {(user: AuthUser|null) => void} callback
 * @returns {() => void} unsubscribe 함수
 */
export function onAuthStateChanged(callback) {
  return _firebaseOnAuthStateChanged(auth, (firebaseUser) => {
    callback(_toAuthUser(firebaseUser));
  });
}

/**
 * 구글 팝업 로그인
 * - 이미 로그인된 구글 계정이 있으면 계정 선택만 (비밀번호 불필요)
 */
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  return _toAuthUser(result.user);
}

/**
 * 로그아웃
 */
export async function signOut() {
  await _firebaseSignOut(auth);
}

/**
 * 현재 사용자 반환 (동기)
 * @returns {AuthUser|null}
 */
export function getCurrentUser() {
  return _toAuthUser(auth.currentUser);
}

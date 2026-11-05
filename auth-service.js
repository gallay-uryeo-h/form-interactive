/**
 * auth-service.js
 * ─────────────────────────────────────────────────────────────
 * Google 인증 서비스 — Firebase Authentication (실제 구글 로그인)
 *
 * 동작:
 *   - signInWithGoogle() → 모바일/PWA에서는 팝업 및 자동 리디렉션 전환 지원
 *   - checkRedirectResult() → 모바일 리디렉션 로그인 복귀 시 자동 완료
 *   - 로그인 상태는 브라우저에 자동 저장 (재접속 시 자동 로그인)
 *   - onAuthStateChanged() → 로그인/로그아웃 상태 변경 감지
 * ─────────────────────────────────────────────────────────────
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
// 구글 로그인 시 항상 계정 선택 화면(다른 계정 선택 포함)을 표시하도록 강제
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
 * 리디렉션 로그인 결과 확인 (모바일 브라우저 복귀 시 실행)
 */
export async function checkRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      return _toAuthUser(result.user);
    }
  } catch (err) {
    console.error("리디렉션 로그인 오류:", err);
    throw err;
  }
  return null;
}

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
 * 구글 로그인 (모바일/팝업 차단 환경 자동 대응)
 * - 데스크톱: 팝업 로그인
 * - 모바일/PWA: 팝업 시도 후 차단/오류 발생 시 자동으로 리디렉션 전환
 */
/**
 * 구글 로그인 (팝업 기본, 차단/미지원 시 리디렉션 자동 전환)
 */
export async function signInWithGoogle() {
  try {
    console.log("[Auth] 구글 팝업 로그인 시작");
    const result = await signInWithPopup(auth, provider);
    return _toAuthUser(result.user);
  } catch (err) {
    console.warn("[Auth] 팝업 로그인 오류/차단 감지:", err.code, err.message);
    // 사용자가 직접 팝업 창을 닫은 경우: 리디렉션하지 않고 취소로 처리
    if (err.code === "auth/popup-closed-by-user") {
      return null;
    }
    // 팝업이 브라우저 설정에 의해 차단되었거나 지원되지 않는 환경인 경우에만 리디렉션으로 전환
    if (
      err.code === "auth/popup-blocked" ||
      err.code === "auth/cancelled-popup-request" ||
      err.code === "auth/operation-not-supported-in-this-environment" ||
      err.code === "auth/internal-error"
    ) {
      console.log("[Auth] 팝업 차단 감지: 리디렉션 로그인으로 전환 시도...");
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw err;
  }
}

/**
 * 직접 리디렉션 로그인 호출
 */
export async function signInWithGoogleRedirect() {
  await signInWithRedirect(auth, provider);
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

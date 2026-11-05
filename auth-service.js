/**
 * auth-service.js
 * ─────────────────────────────────────────────────────────────
 * Google 인증 서비스 — Firebase Authentication (실제 구글 로그인)
 *
 * 동작:
 *   - signInWithGoogle() → 팝업 로그인 (모바일/데스크톱 동일)
 *     authDomain을 현재 호스팅 도메인과 일치시켜 COOP/크로스오리진 문제 해결
 *   - checkRedirectResult() → 리디렉션 로그인 복귀 시 자동 완료 (팝업 차단 환경용)
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

// ─────────────────────────────────────────────────────────────
//  authDomain을 현재 호스팅 도메인으로 오버라이드 (동일 출처 인증)
//  - studio-2726051254-c02c9-f92f8.web.app 에서 접속 시:
//    authDomain = studio-2726051254-c02c9-f92f8.web.app
//    → 팝업/리디렉션이 동일 도메인 /__/auth/handler 를 통해 동작
//    → COOP 문제 없음, 크로스오리진 쿠키 없음
//  - 그 외 도메인(관리자 사이트 등)에서는 원래 authDomain 유지
// ─────────────────────────────────────────────────────────────
const MOBILE_HOSTING_DOMAIN = "studio-2726051254-c02c9-f92f8.web.app";
const effectiveAuthDomain =
  (typeof location !== "undefined" && location.hostname === MOBILE_HOSTING_DOMAIN)
    ? MOBILE_HOSTING_DOMAIN
    : firebaseConfig.authDomain;

const resolvedConfig = { ...firebaseConfig, authDomain: effectiveAuthDomain };

// 이미 초기화된 앱이 있으면 재사용 (중복 초기화 방지)
const app  = getApps().length ? getApps()[0] : initializeApp(resolvedConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
// 구글 로그인 시 항상 계정 선택 화면(다른 계정 선택 포함)을 표시하도록 강제
provider.setCustomParameters({
  prompt: "select_account"
});

// 로그인 상태 브라우저에 영구 저장 (탭/브라우저 닫아도 유지)
setPersistence(auth, browserLocalPersistence).catch(() => {});

console.log("[Auth] authDomain:", effectiveAuthDomain);

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
 * 리디렉션 로그인 결과 확인 (팝업 차단 환경에서 리디렉션 로그인 후 복귀 시 실행)
 */
export async function checkRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      console.log("[Auth] 리디렉션 로그인 결과 확인:", result.user.email);
      return _toAuthUser(result.user);
    }
  } catch (err) {
    console.error("[Auth] 리디렉션 로그인 오류:", err.code, err.message);
    // 오류는 무시하고 onAuthStateChanged 에 위임
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
 * 구글 로그인
 * - 1차: 팝업 로그인 (동일 출처 authDomain 덕분에 모바일에서도 COOP 없음)
 * - 2차: 팝업이 차단된 경우(인앱브라우저 등) → 리디렉션으로 자동 전환
 */
export async function signInWithGoogle() {
  console.log("[Auth] 구글 팝업 로그인 시작, authDomain:", effectiveAuthDomain);
  try {
    const result = await signInWithPopup(auth, provider);
    console.log("[Auth] 팝업 로그인 성공:", result.user.email);
    return _toAuthUser(result.user);
  } catch (err) {
    console.warn("[Auth] 팝업 로그인 오류:", err.code, err.message);

    // 사용자가 직접 팝업을 닫은 경우: 취소 처리 (리디렉션하지 않음)
    if (err.code === "auth/popup-closed-by-user") {
      return null;
    }

    // 팝업 차단 / 미지원 환경 (인앱브라우저 등) → 리디렉션으로 자동 전환
    if (
      err.code === "auth/popup-blocked" ||
      err.code === "auth/cancelled-popup-request" ||
      err.code === "auth/operation-not-supported-in-this-environment" ||
      err.code === "auth/internal-error"
    ) {
      console.log("[Auth] 팝업 차단 감지 → 리디렉션 로그인으로 전환");
      await signInWithRedirect(auth, provider);
      return null; // 페이지 이동 → checkRedirectResult 로 처리
    }

    throw err;
  }
}

/**
 * 직접 리디렉션 로그인 (보조 버튼용)
 */
export async function signInWithGoogleRedirect() {
  console.log("[Auth] 직접 리디렉션 로그인 시작");
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

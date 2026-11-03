/**
 * auth-service.js
 * ─────────────────────────────────────────────────────────────
 * Google 인증 서비스 추상화 레이어
 *
 * 현재: Mock 모드 (localStorage 기반, 이메일 직접 입력)
 * 전환: Firebase Authentication 연동 시 아래 TODO 주석 참조
 * ─────────────────────────────────────────────────────────────
 */

// ── Firebase Auth 전환 시 주석 해제 ──────────────────────────
// import { initializeApp } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-app.js";
// import {
//   getAuth,
//   GoogleAuthProvider,
//   signInWithPopup,
//   signOut,
//   onAuthStateChanged
// } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-auth.js";
// import { FIREBASE_CONFIG } from "./firebase-service.js";
// const app  = initializeApp(FIREBASE_CONFIG);
// const auth = getAuth(app);
// const provider = new GoogleAuthProvider();
// ─────────────────────────────────────────────────────────────

const MOCK_AUTH_KEY = "mock_google_user";

/** 인증 상태 변경 리스너 목록 */
const _listeners = [];

/** 현재 로그인된 사용자 (null = 비로그인) */
let _currentUser = null;

/**
 * User 객체 구조 (Firebase User와 동일한 필드명 사용)
 * @typedef {{ uid: string, email: string, displayName: string, photoURL: string|null }} AuthUser
 */

function _emailToInitial(email = "") {
  return email.replace(/[^a-zA-Z0-9가-힣]/g, "").charAt(0).toUpperCase() || "G";
}

function _notify(user) {
  _currentUser = user;
  _listeners.forEach(fn => fn(user));
}

function _mockUserFromEmail(email) {
  const clean = (email || "").trim().toLowerCase();
  if (!clean) return null;
  return {
    uid:         clean,            // Mock: email을 uid로 사용
    email:       clean,
    displayName: clean.split("@")[0],
    photoURL:    null,
    initial:     _emailToInitial(clean),
    isMock:      true,             // 실제 Firebase Auth 시 이 필드 없음
  };
}

// ─────────────────────────────────────────────────────────────
//  Public API  (Firebase Auth 전환 시 구현만 교체, API는 동일)
// ─────────────────────────────────────────────────────────────

/**
 * 인증 상태 변경 구독 (Firebase onAuthStateChanged 패턴과 동일)
 * @param {(user: AuthUser|null) => void} callback
 * @returns {() => void} unsubscribe 함수
 */
export function onAuthStateChanged(callback) {
  _listeners.push(callback);

  // -- Firebase Auth 전환 시 이 블록으로 교체 --
  // return onAuthStateChanged(auth, (firebaseUser) => {
  //   const user = firebaseUser
  //     ? { uid: firebaseUser.uid, email: firebaseUser.email,
  //         displayName: firebaseUser.displayName,
  //         photoURL: firebaseUser.photoURL,
  //         initial: _emailToInitial(firebaseUser.email) }
  //     : null;
  //   callback(user);
  // });
  // -------------------------------------------

  // Mock: localStorage에서 복원
  try {
    const raw = localStorage.getItem(MOCK_AUTH_KEY);
    const stored = raw ? JSON.parse(raw) : null;
    _currentUser = stored;
    callback(stored);
  } catch {
    callback(null);
  }

  return () => {
    const idx = _listeners.indexOf(callback);
    if (idx !== -1) _listeners.splice(idx, 1);
  };
}

/**
 * Google 팝업 로그인
 * Mock: email 파라미터 사용 / Firebase: signInWithPopup 사용
 * @param {string} [mockEmail] - Mock 모드 전용
 */
export async function signInWithGoogle(mockEmail) {
  // -- Firebase Auth 전환 시 이 블록으로 교체 --
  // const result = await signInWithPopup(auth, provider);
  // const u = result.user;
  // const user = { uid: u.uid, email: u.email, displayName: u.displayName,
  //                photoURL: u.photoURL, initial: _emailToInitial(u.email) };
  // _notify(user);
  // return user;
  // -------------------------------------------

  const user = _mockUserFromEmail(mockEmail);
  if (!user) throw new Error("이메일을 입력해주세요.");
  localStorage.setItem(MOCK_AUTH_KEY, JSON.stringify(user));
  _notify(user);
  return user;
}

/**
 * 로그아웃
 */
export async function signOut() {
  // -- Firebase Auth 전환 시 이 블록으로 교체 --
  // await signOut(auth);
  // -------------------------------------------

  localStorage.removeItem(MOCK_AUTH_KEY);
  _notify(null);
}

/**
 * 현재 사용자 반환 (동기)
 * @returns {AuthUser|null}
 */
export function getCurrentUser() {
  return _currentUser;
}


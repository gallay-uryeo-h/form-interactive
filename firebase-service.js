// Firebase SDKs via CDN ES Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAodFwVZvSAlMxppnODM4VVR5fSjfkhvi4",
  authDomain: "studio-2726051254-c02c9.firebaseapp.com",
  projectId: "studio-2726051254-c02c9",
  storageBucket: "studio-2726051254-c02c9.firebasestorage.app",
  messagingSenderId: "58367223801",
  appId: "1:58367223801:web:817b230c96124a828dff28"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// 프로젝트명과 동일한 단일 컬렉션 사용
export const COLLECTION_NAME = "form-interactive";

// 지원하는 열 데이터타입 / 폼타입 정의
export const AVAILABLE_TYPES = [
  { id: "text", label: "일반 텍스트", icon: "edit_note", desc: "자유 텍스트 인라인 편집" },
  { id: "googleId", label: "구글 아이디", icon: "alternate_email", desc: "구글 계정/이메일 (모바일 개인별 보기 연동)" },
  { id: "locked", label: "텍스트 (잠김)", icon: "lock", desc: "관리자 전용 잠금/읽기 전용" },
  { id: "select", label: "드롭다운 (목록)", icon: "arrow_drop_down_circle", desc: "사용자 정의 옵션 목록 드롭다운" },
  { id: "date", label: "날짜 선택", icon: "calendar_today", desc: "YYYY-MM-DD 날짜 피커" },
  { id: "priority", label: "선택형 (우선순위/칩)", icon: "radio_button_checked", desc: "P1/P2/P3 및 칩 단일 선택" },
  { id: "checkbox", label: "체크박스", icon: "check_box", desc: "승인/확인 불리언 토글" },
  { id: "progress", label: "진척도 (0~100%)", icon: "linear_scale", desc: "슬라이더 및 퍼센트 게이지" }
];

// 열 타입별 기본 설정 (새 열 추가 시 타입 힌트 제공용)
// mock 데이터나 기본 시트 개념 없음 — 실제 Firestore 데이터만 사용
export const DEFAULT_COLUMN_CONFIGS = {};

// 하위 호환용 빈 타입 맵
export const DEFAULT_COLUMN_TYPES = {};

// 설정 정규화 도우미 — 저장된 설정을 표준 형태로 반환
export function normalizeColumnConfig(key, raw) {
  const base = { type: "text", label: key };
  if (!raw) return { ...base };
  if (typeof raw === "string") {
    return { ...base, type: raw, options: [] };
  }
  return {
    ...base,
    ...raw,
    type: raw.type || "text",
    options: Array.isArray(raw.options) && raw.options.length ? raw.options : []
  };
}

// 시트 목록 실시간 구독 리스너
export function subscribeSheets(onSuccess, onError) {
  const metaDocRef = doc(db, COLLECTION_NAME, "metadata");
  return onSnapshot(
    metaDocRef,
    (snap) => {
      const sheets = (snap.exists() && Array.isArray(snap.data().sheets))
        ? snap.data().sheets
        : [];
      onSuccess(sheets);
    },
    (err) => {
      console.error("[Firestore] subscribeSheets Error:", err);
      if (onError) onError(err);
    }
  );
}

// 새 시트 생성 — 빈 시트로 생성 (mock/샘플 데이터 없음)
export async function createSheet(name, templateType = "empty") {
  const sheetId = "sheet_" + Date.now();
  const metaDocRef = doc(db, COLLECTION_NAME, "metadata");
  const snap = await getDoc(metaDocRef);
  const currentSheets = (snap.exists() && Array.isArray(snap.data().sheets))
    ? [...snap.data().sheets]
    : [];

  const newSheet = {
    id: sheetId,
    name: name.trim() || `새 시트 (${new Date().toLocaleDateString("ko-KR")})`,
    owner: "관리자",
    createdAt: new Date().toISOString()
  };

  currentSheets.push(newSheet);

  // 빈 열 3개로 시작 (실제 데이터 입력 전)
  const initialOrder = ["col_1", "col_2", "col_3"];
  const initialConfigs = {
    col_1: { label: "열 1", type: "text", width: 100 },
    col_2: { label: "열 2", type: "text", width: 100 },
    col_3: { label: "열 3", type: "text", width: 100 }
  };

  await setDoc(metaDocRef, {
    sheets: currentSheets,
    [`columnConfigs_${sheetId}`]: initialConfigs,
    [`columnOrder_${sheetId}`]: initialOrder
  }, { merge: true });

  return newSheet;
}

// 시트 삭제
export async function deleteSheet(sheetId) {
  const metaDocRef = doc(db, COLLECTION_NAME, "metadata");
  const snap = await getDoc(metaDocRef);
  if (!snap.exists()) return;
  const currentSheets = snap.data().sheets || [];
  const updatedSheets = currentSheets.filter(s => s.id !== sheetId);

  await setDoc(metaDocRef, { sheets: updatedSheets }, { merge: true });

  // 해당 시트에 속한 행 데이터 일괄 삭제
  const colRef = collection(db, COLLECTION_NAME);
  const taskSnaps = await getDocs(colRef);
  for (const d of taskSnaps.docs) {
    if (d.data().sheetId === sheetId) {
      await deleteDoc(d.ref);
    }
  }
}

// 열 순서 변경 저장
export async function updateColumnOrder(columnKeys, targetSheetId) {
  if (!targetSheetId) throw new Error("sheetId가 필요합니다.");
  const metaDocRef = doc(db, COLLECTION_NAME, "metadata");
  const orderKey = `columnOrder_${targetSheetId}`;
  await setDoc(metaDocRef, {
    [orderKey]: columnKeys,
    updatedAt: serverTimestamp()
  }, { merge: true });
  console.log(`[Firestore] 시트 '${targetSheetId}' 열 순서 저장:`, columnKeys);
}

// 열 순서 실시간 구독 리스너
export function subscribeColumnOrder(onSuccess, targetSheetId) {
  const metaDocRef = doc(db, COLLECTION_NAME, "metadata");
  const orderKey = `columnOrder_${targetSheetId}`;
  const configKey = `columnConfigs_${targetSheetId}`;
  return onSnapshot(metaDocRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data[orderKey]) && data[orderKey].length) {
        onSuccess(data[orderKey]);
        return;
      }
      if (data[configKey] && Object.keys(data[configKey]).length) {
        onSuccess(Object.keys(data[configKey]));
        return;
      }
    }
    onSuccess([]);
  });
}

// 실시간 태스크 목록 구독 리스너 — sheetId로 Firestore 쿼리 필터링
export function subscribeTasks(onSuccess, onError, targetSheetId) {
  if (!targetSheetId) {
    if (onError) onError(new Error("sheetId가 필요합니다."));
    return () => {};
  }
  const colRef = collection(db, COLLECTION_NAME);

  // ALL: 전체 컬렉션 (어드민 대시보드용)
  if (targetSheetId === "ALL") {
    return onSnapshot(
      colRef,
      (snap) => {
        const tasks = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.type === "task" || (!data.type && data.sheetId)) {
            tasks.push({ id: docSnap.id, ...data });
          }
        });
        tasks.sort((a, b) => (a.rowNumber || 999) - (b.rowNumber || 999));
        onSuccess(tasks);
      },
      (err) => {
        console.error("[Firestore] subscribeTasks(ALL) Error:", err);
        if (onError) onError(err);
      }
    );
  }

  // 특정 시트: where 쿼리로 해당 시트만 구독
  const q = query(colRef, where("sheetId", "==", targetSheetId));
  return onSnapshot(
    q,
    (snap) => {
      const tasks = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        // type이 없는 경우도 포함 (이전 버전 호환)
        if (!data.type || data.type === "task") {
          tasks.push({ id: docSnap.id, ...data });
        }
      });
      tasks.sort((a, b) => (a.rowNumber || 999) - (b.rowNumber || 999));
      onSuccess(tasks);
    },
    (err) => {
      console.error("[Firestore] subscribeTasks Error:", err);
      if (onError) onError(err);
    }
  );
}

// 1회성 시트 태스크 fetch (모바일 시트 목록 필터용)
// query 사용으로 전체 컬렉션 읽기 없이 해당 시트만 조회
export async function getTasksForSheet(sheetId) {
  if (!sheetId) return [];
  const colRef = collection(db, COLLECTION_NAME);
  const q = query(colRef, where("sheetId", "==", sheetId));
  const snap = await getDocs(q);
  const tasks = [];
  snap.forEach((d) => {
    const data = d.data();
    if (!data.type || data.type === "task") {
      tasks.push({ id: d.id, ...data });
    }
  });
  tasks.sort((a, b) => (a.rowNumber || 999) - (b.rowNumber || 999));
  return tasks;
}

// 실시간 컬럼 상세 설정 구독 리스너
export function subscribeColumnConfigs(onSuccess, targetSheetId) {
  if (!targetSheetId) {
    onSuccess({});
    return () => {};
  }
  const metaDocRef = doc(db, COLLECTION_NAME, "metadata");
  const configKey = `columnConfigs_${targetSheetId}`;
  return onSnapshot(metaDocRef, (snap) => {
    const data = (snap.exists() && snap.data()) || {};
    const rawConfigs = data[configKey] || {};
    const result = {};
    for (const [key, cfg] of Object.entries(rawConfigs)) {
      result[key] = normalizeColumnConfig(key, cfg);
    }
    onSuccess(result);
  });
}

// 하위 호환용 단순 타입 구독 리스너
export function subscribeColumnTypes(onSuccess, targetSheetId) {
  return subscribeColumnConfigs((configs) => {
    const types = {};
    for (const [k, cfg] of Object.entries(configs)) {
      types[k] = cfg.type;
    }
    onSuccess(types);
  }, targetSheetId);
}

// 특정 열의 상세 설정 업데이트
export async function updateColumnConfig(colKey, newConfig, targetSheetId) {
  if (!targetSheetId) throw new Error("sheetId가 필요합니다.");
  const metaDocRef = doc(db, COLLECTION_NAME, "metadata");
  const snap = await getDoc(metaDocRef);
  const data = (snap.exists() && snap.data()) || {};

  const configKey = `columnConfigs_${targetSheetId}`;
  const typeKey = `columnTypes_${targetSheetId}`;

  const currentConfigs = data[configKey] || {};
  const currentTypes = data[typeKey] || {};

  const mergedConfig = normalizeColumnConfig(colKey, {
    ...(currentConfigs[colKey] || {}),
    ...(typeof newConfig === "string" ? { type: newConfig } : newConfig)
  });

  await setDoc(metaDocRef, {
    [configKey]: {
      ...currentConfigs,
      [colKey]: mergedConfig
    },
    [typeKey]: {
      ...currentTypes,
      [colKey]: mergedConfig.type
    },
    updatedAt: serverTimestamp()
  }, { merge: true });

  console.log(`[Firestore] 시트 '${targetSheetId}'의 열 '${colKey}' 설정 업데이트:`, mergedConfig);
}

// 새 열 추가
export async function addColumn(sheetId, title = "", type = "text") {
  if (!sheetId) throw new Error("sheetId가 필요합니다.");
  const metaDocRef = doc(db, COLLECTION_NAME, "metadata");
  const snap = await getDoc(metaDocRef);
  const data = (snap.exists() && snap.data()) || {};

  const orderKey = `columnOrder_${sheetId}`;
  const configKey = `columnConfigs_${sheetId}`;

  let order = Array.isArray(data[orderKey]) ? [...data[orderKey]] : [];
  if (!order.length && data[configKey] && Object.keys(data[configKey]).length) {
    order = Object.keys(data[configKey]);
  }
  if (!order.length) order = ["col_1", "col_2", "col_3"];

  const configs = data[configKey] ? { ...data[configKey] } : {};
  const newColKey = `col_${Date.now()}`;
  const newTitle = title.trim() || `열 ${order.length + 1}`;

  order.push(newColKey);
  configs[newColKey] = { label: newTitle, type: type || "text", width: 100 };

  await setDoc(metaDocRef, {
    [orderKey]: order,
    [configKey]: configs,
    updatedAt: serverTimestamp()
  }, { merge: true });

  console.log(`[Firestore] 시트 '${sheetId}'에 새 열 추가: ${newColKey} (${newTitle})`);
  return { key: newColKey, label: newTitle, type: type || "text" };
}

// 열 삭제
export async function deleteColumn(sheetId, colKey) {
  if (!sheetId) throw new Error("sheetId가 필요합니다.");
  const metaDocRef = doc(db, COLLECTION_NAME, "metadata");
  const snap = await getDoc(metaDocRef);
  const data = (snap.exists() && snap.data()) || {};

  const orderKey = `columnOrder_${sheetId}`;
  const configKey = `columnConfigs_${sheetId}`;

  let order = Array.isArray(data[orderKey]) ? [...data[orderKey]]
    : (data[configKey] ? Object.keys(data[configKey]) : ["col_1", "col_2", "col_3"]);

  if (order.length <= 1) {
    throw new Error("시트에는 최소 1개의 열이 남아 있어야 합니다.");
  }

  const newOrder = order.filter(k => k !== colKey);
  const configs = data[configKey] ? { ...data[configKey] } : {};
  delete configs[colKey];

  await setDoc(metaDocRef, {
    [orderKey]: newOrder,
    [configKey]: configs,
    updatedAt: serverTimestamp()
  }, { merge: true });

  // 해당 시트 행에서 삭제된 열 데이터 정리
  const colRef = collection(db, COLLECTION_NAME);
  const taskSnaps = await getDocs(colRef);
  for (const d of taskSnaps.docs) {
    const rowData = d.data();
    if (rowData.sheetId === sheetId && rowData[colKey] !== undefined) {
      await updateDoc(d.ref, { [colKey]: null });
    }
  }

  console.log(`[Firestore] 시트 '${sheetId}'에서 열 삭제 완료: ${colKey}`);
}

// 하위 호환용 타입 업데이트
export async function updateColumnType(colKey, newType, targetSheetId) {
  await updateColumnConfig(colKey, { type: newType }, targetSheetId);
}

// 특정 태스크 필드 업데이트
export async function updateTask(id, fields) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...fields,
    updatedAt: serverTimestamp()
  });
}

// 새 태스크 추가
export async function addTask(taskData, targetSheetId = "sheet_default") {
  const colRef = collection(db, COLLECTION_NAME);
  const newDocRef = doc(colRef);
  const data = {
    ...taskData,
    id: newDocRef.id,
    sheetId: targetSheetId,
    type: "task",
    createdAt: new Date().toISOString(),
    updatedAt: serverTimestamp()
  };
  await setDoc(newDocRef, data);
  return newDocRef.id;
}

// 태스크 삭제
export async function deleteTask(id) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

// ─────────────────────────────────────────────────────────────
//  Admin 권한 관리
//  Firestore: form-interactive/_admins 문서
//  { emails: ["admin@example.com", ...] }
// ─────────────────────────────────────────────────────────────

const ADMIN_DOC_ID = "_admins";

/**
 * 어드민 이메일 목록 조회
 * @returns {Promise<string[]>}
 */
export async function getAdminEmails() {
  try {
    const snap = await getDoc(doc(db, COLLECTION_NAME, ADMIN_DOC_ID));
    if (snap.exists()) {
      return snap.data().emails || [];
    }
    // 문서 없으면 기본 어드민 초기화
    await setDoc(doc(db, COLLECTION_NAME, ADMIN_DOC_ID), {
      emails: ["gallay@uryeo-h.gne.go.kr"]
    });
    return ["gallay@uryeo-h.gne.go.kr"];
  } catch {
    return [];
  }
}

/**
 * 특정 이메일이 어드민인지 확인
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export async function isAdminEmail(email) {
  if (!email) return false;
  const emails = await getAdminEmails();
  return emails.map(e => e.toLowerCase()).includes(email.toLowerCase());
}

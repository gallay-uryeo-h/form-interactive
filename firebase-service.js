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

// 기본 열별 상세 설정 (옵션 리스트, 포맷, 범위 등 포함)
export const DEFAULT_COLUMN_CONFIGS = {
  empNo: {
    type: "locked",
    label: "학번/사번",
    desc: "고유 식별 사원 번호"
  },
  name: {
    type: "locked",
    label: "이름",
    desc: "사원 성명"
  },
  department: {
    type: "locked",
    label: "부서/전공",
    options: ["컴퓨터공학", "시각디자인", "데이터사이언스", "정보보안학", "경영학", "인적자원관리", "시스템공학"],
    desc: "소속 부서 또는 전공"
  },
  project: {
    type: "locked",
    label: "배정 프로젝트",
    options: [
      "차세대 전사 ERP 고도화",
      "글로벌 디자인 토큰 통합",
      "실시간 배치 인프라 개편",
      "정보보안 ISMS-P 인증",
      "APAC 시장 파트너십 구축",
      "전사 평가 체계 리뉴얼",
      "CI/CD 빌드 최적화"
    ],
    desc: "배정 프로젝트명"
  },
  task: {
    type: "text",
    label: "담당 업무",
    desc: "상세 업무 내용"
  },
  status: {
    type: "select",
    label: "진행 상태",
    options: ["진행중", "완료", "대기", "보류"],
    desc: "업무 진행 단계"
  },
  dueDate: {
    type: "date",
    label: "마감일",
    desc: "완료 목표 일자"
  },
  priority: {
    type: "priority",
    label: "우선순위",
    options: ["높음 (P1)", "보통 (P2)", "낮음 (P3)"],
    desc: "업무 긴급도/중요도"
  },
  isApproved: {
    type: "checkbox",
    label: "승인 여부",
    desc: "관리자 검토 승인"
  },
  progress: {
    type: "progress",
    label: "진척도",
    min: 0,
    max: 100,
    unit: "%",
    desc: "달성률 퍼센트"
  }
};

// 단순 타입 맵 (하위 호환성)
export const DEFAULT_COLUMN_TYPES = Object.keys(DEFAULT_COLUMN_CONFIGS).reduce((acc, k) => {
  acc[k] = DEFAULT_COLUMN_CONFIGS[k].type;
  return acc;
}, {});

// 설정 정규화 도우미
export function normalizeColumnConfig(key, raw) {
  const base = DEFAULT_COLUMN_CONFIGS[key] || { type: "text", label: key };
  if (!raw) return { ...base };
  if (typeof raw === "string") {
    return {
      ...base,
      type: raw,
      options: base.options || []
    };
  }
  return {
    ...base,
    ...raw,
    type: raw.type || base.type,
    options: Array.isArray(raw.options) && raw.options.length ? raw.options : (base.options || [])
  };
}

// Stitch 원본 기본 시드 데이터
export const INITIAL_TASKS = [
  {
    id: "task_01",
    rowNumber: 2,
    empNo: "20250104",
    name: "김민수",
    department: "컴퓨터공학",
    project: "차세대 전사 ERP 고도화",
    task: "분산 DB 샤딩 정책 설계",
    status: "진행중",
    dueDate: "2025-04-15",
    priority: "높음 (P1)",
    isApproved: true,
    progress: 75,
    createdAt: new Date().toISOString()
  },
  {
    id: "task_02",
    rowNumber: 3,
    empNo: "20250101",
    name: "이지은",
    department: "시각디자인",
    project: "글로벌 디자인 토큰 통합",
    task: "Figma Variables 웹 자동 빌드",
    status: "완료",
    dueDate: "2025-03-31",
    priority: "보통 (P2)",
    isApproved: true,
    progress: 100,
    createdAt: new Date().toISOString()
  },
  {
    id: "task_03",
    rowNumber: 4,
    empNo: "20250102",
    name: "박성현",
    department: "데이터사이언스",
    project: "실시간 배치 인프라 개편",
    task: "Kafka 파이프라인 클러스터 확장",
    status: "대기",
    dueDate: "2025-05-10",
    priority: "낮음 (P3)",
    isApproved: false,
    progress: 10,
    createdAt: new Date().toISOString()
  },
  {
    id: "task_04",
    rowNumber: 5,
    empNo: "20250103",
    name: "최유나",
    department: "정보보안학",
    project: "정보보안 ISMS-P 인증",
    task: "개인정보 암호화 키 교체",
    status: "보류",
    dueDate: "2025-04-30",
    priority: "높음 (P1)",
    isApproved: false,
    progress: 40,
    createdAt: new Date().toISOString()
  },
  {
    id: "task_05",
    rowNumber: 6,
    empNo: "20250105",
    name: "정태양",
    department: "경영학",
    project: "APAC 시장 파트너십 구축",
    task: "일본 지사 파트너 계약 검토",
    status: "진행중",
    dueDate: "2025-06-15",
    priority: "보통 (P2)",
    isApproved: true,
    progress: 60,
    createdAt: new Date().toISOString()
  },
  {
    id: "task_06",
    rowNumber: 7,
    empNo: "20250106",
    name: "강서연",
    department: "인적자원관리",
    project: "전사 평가 체계 리뉴얼",
    task: "OKR 기반 분기 성과 측정 프레임",
    status: "완료",
    dueDate: "2025-03-25",
    priority: "보통 (P2)",
    isApproved: true,
    progress: 100,
    createdAt: new Date().toISOString()
  },
  {
    id: "task_07",
    rowNumber: 8,
    empNo: "20250107",
    name: "윤도현",
    department: "시스템공학",
    project: "CI/CD 빌드 최적화",
    task: "Github Actions 캐시 레이어 분리",
    status: "진행중",
    dueDate: "2025-05-02",
    priority: "높음 (P1)",
    isApproved: false,
    progress: 80,
    createdAt: new Date().toISOString()
  }
];

// 기본 등록 시트 목록
export const DEFAULT_SHEETS = [
  {
    id: "sheet_default",
    name: "전사 업무 데이터 관리 시트",
    owner: "나 (관리자)",
    isDefault: true,
    createdAt: "2025-01-01T00:00:00.000Z",
    template: "work"
  }
];

// 시트 목록 실시간 구독 리스너
export function subscribeSheets(onSuccess, onError) {
  const metaDocRef = doc(db, COLLECTION_NAME, "metadata");
  return onSnapshot(
    metaDocRef,
    (snap) => {
      if (snap.exists() && Array.isArray(snap.data().sheets) && snap.data().sheets.length) {
        onSuccess(snap.data().sheets);
      } else {
        // 기본 시트가 없으면 기본값 전달
        onSuccess(DEFAULT_SHEETS);
      }
    },
    (err) => {
      console.error("[Firestore] subscribeSheets Error:", err);
      if (onError) onError(err);
    }
  );
}

// 새 시트 생성 (템플릿 기반 데이터 및 메타데이터 자동 초기화)
export async function createSheet(name, templateType = "work") {
  const sheetId = "sheet_" + Date.now();
  const metaDocRef = doc(db, COLLECTION_NAME, "metadata");
  const snap = await getDoc(metaDocRef);
  const currentSheets = (snap.exists() && Array.isArray(snap.data().sheets))
    ? [...snap.data().sheets]
    : [...DEFAULT_SHEETS];

  const newSheet = {
    id: sheetId,
    name: name.trim() || `새 시트 (${new Date().toLocaleDateString("ko-KR")})`,
    owner: "나 (관리자)",
    isDefault: false,
    createdAt: new Date().toISOString(),
    template: templateType
  };

  currentSheets.push(newSheet);

  let initialConfigs = {};
  let initialOrder = [];
  let initialRows = [];

  if (templateType === "empty") {
    // 진짜 빈 시트: 임의의 회사 열이 아닌 순수 범용 빈 열 3개와 빈 행 5개로 시작
    initialOrder = ["col_1", "col_2", "col_3"];
    initialConfigs = {
      col_1: { label: "열 1", type: "text", width: 100 },
      col_2: { label: "열 2", type: "text", width: 100 },
      col_3: { label: "열 3", type: "text", width: 100 }
    };
    initialRows = [
      { rowNumber: 1, col_1: "", col_2: "", col_3: "" },
      { rowNumber: 2, col_1: "", col_2: "", col_3: "" },
      { rowNumber: 3, col_1: "", col_2: "", col_3: "" },
      { rowNumber: 4, col_1: "", col_2: "", col_3: "" },
      { rowNumber: 5, col_1: "", col_2: "", col_3: "" }
    ];
  } else if (templateType === "roster") {
    // 교육 / 출결 과제 관리 대장
    initialOrder = Object.keys(DEFAULT_COLUMN_CONFIGS);
    initialConfigs = { ...DEFAULT_COLUMN_CONFIGS };
    initialRows = [
      { rowNumber: 1, empNo: "20251001", name: "김하늘", department: "소프트웨어학과", project: "캡스톤디자인 1", task: "시스템 요구사항 정의서 제출", status: "진행중", dueDate: "2025-04-10", priority: "높음 (P1)", isApproved: true, progress: 60 },
      { rowNumber: 2, empNo: "20251002", name: "박준호", department: "인공지능학과", project: "머신러닝 응용", task: "데이터셋 전처리 및 EDA 완료", status: "완료", dueDate: "2025-03-28", priority: "보통 (P2)", isApproved: true, progress: 100 },
      { rowNumber: 3, empNo: "20251003", name: "이수진", department: "정보보안학과", project: "네트워크 보안", task: "침해사고 모의 훈련 보고서", status: "대기", dueDate: "2025-05-15", priority: "낮음 (P3)", isApproved: false, progress: 20 }
    ];
  } else {
    // 전사 업무 관리 템플릿
    initialOrder = Object.keys(DEFAULT_COLUMN_CONFIGS);
    initialConfigs = { ...DEFAULT_COLUMN_CONFIGS };
    initialRows = [
      { rowNumber: 1, empNo: "20250101", name: "김철수", department: "기획팀", project: newSheet.name, task: "요구사항 분석 및 기획안 작성", status: "진행중", dueDate: new Date().toISOString().split("T")[0], priority: "높음 (P1)", isApproved: false, progress: 30 },
      { rowNumber: 2, empNo: "20250102", name: "이영희", department: "개발팀", project: newSheet.name, task: "DB 스키마 및 API 명세 설계", status: "대기", dueDate: new Date().toISOString().split("T")[0], priority: "보통 (P2)", isApproved: false, progress: 10 },
      { rowNumber: 3, empNo: "20250103", name: "박민우", department: "디자인팀", project: newSheet.name, task: "UI 컴포넌트 라이브러리 가이드", status: "완료", dueDate: new Date().toISOString().split("T")[0], priority: "보통 (P2)", isApproved: true, progress: 100 }
    ];
  }

  await setDoc(metaDocRef, {
    sheets: currentSheets,
    [`columnConfigs_${sheetId}`]: initialConfigs,
    [`columnOrder_${sheetId}`]: initialOrder
  }, { merge: true });

  // 템플릿별 초기 행 데이터 생성
  const colRef = collection(db, COLLECTION_NAME);
  for (const r of initialRows) {
    const newDoc = doc(colRef);
    await setDoc(newDoc, {
      ...r,
      id: newDoc.id,
      sheetId: sheetId,
      type: "task",
      createdAt: new Date().toISOString(),
      updatedAt: serverTimestamp()
    });
  }

  return newSheet;
}

// 시트 삭제 (기본 시트는 삭제 불가)
export async function deleteSheet(sheetId) {
  if (sheetId === "sheet_default") {
    throw new Error("기본 시트는 삭제할 수 없습니다.");
  }
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
export async function updateColumnOrder(columnKeys, targetSheetId = "sheet_default") {
  const metaDocRef = doc(db, COLLECTION_NAME, "metadata");
  const orderKey = targetSheetId === "sheet_default" ? "columnOrder" : `columnOrder_${targetSheetId}`;
  await setDoc(metaDocRef, {
    [orderKey]: columnKeys,
    updatedAt: serverTimestamp()
  }, { merge: true });
  console.log(`[Firestore] 시트 '${targetSheetId}' 열 순서 저장:`, columnKeys);
}

// 열 순서 실시간 구독 리스너
export function subscribeColumnOrder(onSuccess, targetSheetId = "sheet_default") {
  const metaDocRef = doc(db, COLLECTION_NAME, "metadata");
  const orderKey = targetSheetId === "sheet_default" ? "columnOrder" : `columnOrder_${targetSheetId}`;
  const configKey = targetSheetId === "sheet_default" ? "columnConfigs" : `columnConfigs_${targetSheetId}`;
  return onSnapshot(metaDocRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data[orderKey]) && data[orderKey].length) {
        onSuccess(data[orderKey]);
        return;
      }
      if (targetSheetId === "sheet_default") {
        onSuccess(Object.keys(DEFAULT_COLUMN_CONFIGS));
        return;
      }
      if (data[configKey] && Object.keys(data[configKey]).length) {
        onSuccess(Object.keys(data[configKey]));
        return;
      }
    }
    if (targetSheetId === "sheet_default") {
      onSuccess(Object.keys(DEFAULT_COLUMN_CONFIGS));
    } else {
      onSuccess(null);
    }
  });
}

// 실시간 태스크 목록 구독 리스너 (특정 시트 ID 지원)
export function subscribeTasks(onSuccess, onError, targetSheetId = "sheet_default") {
  const colRef = collection(db, COLLECTION_NAME);
  return onSnapshot(
    colRef,
    (snap) => {
      const tasks = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.type === "task" || (!data.type && data.empNo)) {
          const docSheetId = data.sheetId || "sheet_default";
          if (targetSheetId === "ALL" || docSheetId === targetSheetId) {
            tasks.push({ id: docSnap.id, ...data });
          }
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

// 실시간 컬럼 상세 설정 (타입 + 드롭다운 옵션 목록 등) 구독 리스너
export function subscribeColumnConfigs(onSuccess, targetSheetId = "sheet_default") {
  const metaDocRef = doc(db, COLLECTION_NAME, "metadata");
  return onSnapshot(metaDocRef, (snap) => {
    const data = (snap.exists() && snap.data()) || {};
    const configKey = targetSheetId === "sheet_default" ? "columnConfigs" : `columnConfigs_${targetSheetId}`;
    const typeKey = targetSheetId === "sheet_default" ? "columnTypes" : `columnTypes_${targetSheetId}`;

    const rawConfigs = data[configKey] || (targetSheetId === "sheet_default" ? data.columnConfigs : null) || {};
    const rawTypes = data[typeKey] || (targetSheetId === "sheet_default" ? data.columnTypes : null) || {};

    const result = {};

    if (targetSheetId === "sheet_default") {
      for (const key of Object.keys(DEFAULT_COLUMN_CONFIGS)) {
        if (rawConfigs[key]) {
          result[key] = normalizeColumnConfig(key, rawConfigs[key]);
        } else if (rawTypes[key]) {
          result[key] = normalizeColumnConfig(key, rawTypes[key]);
        } else {
          result[key] = { ...DEFAULT_COLUMN_CONFIGS[key] };
        }
      }
      // 기본 시트에 추가된 커스텀 열도 포함
      for (const [key, cfg] of Object.entries(rawConfigs)) {
        if (!result[key]) {
          result[key] = normalizeColumnConfig(key, cfg);
        }
      }
    } else {
      // 빈 시트 및 커스텀 시트: 해당 시트의 고유 열만 정규화하여 반환
      for (const [key, cfg] of Object.entries(rawConfigs)) {
        result[key] = normalizeColumnConfig(key, cfg);
      }
    }
    onSuccess(result);
  });
}

// 하위 호환용 단순 타입 구독 리스너
export function subscribeColumnTypes(onSuccess, targetSheetId = "sheet_default") {
  return subscribeColumnConfigs((configs) => {
    const types = {};
    for (const [k, cfg] of Object.entries(configs)) {
      types[k] = cfg.type;
    }
    onSuccess(types);
  }, targetSheetId);
}

// 특정 열의 상세 설정 업데이트 (타입 및 드롭다운 옵션 등)
export async function updateColumnConfig(colKey, newConfig, targetSheetId = "sheet_default") {
  const metaDocRef = doc(db, COLLECTION_NAME, "metadata");
  const snap = await getDoc(metaDocRef);
  const data = (snap.exists() && snap.data()) || {};

  const configKey = targetSheetId === "sheet_default" ? "columnConfigs" : `columnConfigs_${targetSheetId}`;
  const typeKey = targetSheetId === "sheet_default" ? "columnTypes" : `columnTypes_${targetSheetId}`;

  const currentConfigs = data[configKey] || (targetSheetId === "sheet_default" ? data.columnConfigs : {}) || {};
  const currentTypes = data[typeKey] || (targetSheetId === "sheet_default" ? data.columnTypes : {}) || {};

  const mergedConfig = normalizeColumnConfig(colKey, {
    ...(currentConfigs[colKey] || {}),
    ...(typeof newConfig === "string" ? { type: newConfig } : newConfig)
  });

  const baseConfigs = targetSheetId === "sheet_default" ? { ...DEFAULT_COLUMN_CONFIGS } : {};
  const baseTypes = targetSheetId === "sheet_default" ? { ...DEFAULT_COLUMN_TYPES } : {};

  await setDoc(metaDocRef, {
    [configKey]: {
      ...baseConfigs,
      ...currentConfigs,
      [colKey]: mergedConfig
    },
    [typeKey]: {
      ...baseTypes,
      ...currentTypes,
      [colKey]: mergedConfig.type
    },
    updatedAt: serverTimestamp()
  }, { merge: true });

  console.log(`[Firestore] 시트 '${targetSheetId}'의 열 '${colKey}' 설정 업데이트:`, mergedConfig);
}

// 새 열 추가
export async function addColumn(sheetId = "sheet_default", title = "", type = "text") {
  const metaDocRef = doc(db, COLLECTION_NAME, "metadata");
  const snap = await getDoc(metaDocRef);
  const data = (snap.exists() && snap.data()) || {};

  const orderKey = sheetId === "sheet_default" ? "columnOrder" : `columnOrder_${sheetId}`;
  const configKey = sheetId === "sheet_default" ? "columnConfigs" : `columnConfigs_${sheetId}`;

  let order = Array.isArray(data[orderKey]) ? [...data[orderKey]] : [];
  if (!order.length) {
    if (sheetId === "sheet_default") {
      order = Object.keys(DEFAULT_COLUMN_CONFIGS);
    } else if (data[configKey] && Object.keys(data[configKey]).length) {
      order = Object.keys(data[configKey]);
    } else {
      order = ["col_1", "col_2", "col_3"];
    }
  }

  let configs = data[configKey] ? { ...data[configKey] } : {};
  if (sheetId === "sheet_default" && Object.keys(configs).length === 0) {
    configs = { ...DEFAULT_COLUMN_CONFIGS };
  }

  const newColKey = `col_${Date.now()}`;
  const newTitle = title.trim() || `열 ${order.length + 1}`;

  order.push(newColKey);
  configs[newColKey] = {
    label: newTitle,
    type: type || "text",
    width: 100
  };

  await setDoc(metaDocRef, {
    [orderKey]: order,
    [configKey]: configs,
    updatedAt: serverTimestamp()
  }, { merge: true });

  console.log(`[Firestore] 시트 '${sheetId}'에 새 열 추가: ${newColKey} (${newTitle})`);
  return { key: newColKey, label: newTitle, type: type || "text" };
}

// 열 삭제
export async function deleteColumn(sheetId = "sheet_default", colKey) {
  const metaDocRef = doc(db, COLLECTION_NAME, "metadata");
  const snap = await getDoc(metaDocRef);
  const data = (snap.exists() && snap.data()) || {};

  const orderKey = sheetId === "sheet_default" ? "columnOrder" : `columnOrder_${sheetId}`;
  const configKey = sheetId === "sheet_default" ? "columnConfigs" : `columnConfigs_${sheetId}`;

  let order = Array.isArray(data[orderKey]) ? [...data[orderKey]] : [];
  if (!order.length) {
    if (sheetId === "sheet_default") {
      order = Object.keys(DEFAULT_COLUMN_CONFIGS);
    } else if (data[configKey] && Object.keys(data[configKey]).length) {
      order = Object.keys(data[configKey]);
    } else {
      order = ["col_1", "col_2", "col_3"];
    }
  }

  if (order.length <= 1) {
    throw new Error("시트에는 최소 1개의 열이 남아 있어야 합니다.");
  }

  const newOrder = order.filter(k => k !== colKey);
  let configs = data[configKey] ? { ...data[configKey] } : {};
  if (sheetId === "sheet_default" && Object.keys(configs).length === 0) {
    configs = { ...DEFAULT_COLUMN_CONFIGS };
  }
  delete configs[colKey];

  await setDoc(metaDocRef, {
    [orderKey]: newOrder,
    [configKey]: configs,
    updatedAt: serverTimestamp()
  }, { merge: true });

  // 해당 시트에 속한 모든 행에서 삭제된 열 데이터 정리
  const colRef = collection(db, COLLECTION_NAME);
  const taskSnaps = await getDocs(colRef);
  for (const d of taskSnaps.docs) {
    const rowData = d.data();
    const docSheetId = rowData.sheetId || "sheet_default";
    if (docSheetId === sheetId && rowData[colKey] !== undefined) {
      await updateDoc(d.ref, {
        [colKey]: null
      });
    }
  }

  console.log(`[Firestore] 시트 '${sheetId}'에서 열 삭제 완료: ${colKey}`);
}

// 하위 호환용 타입 업데이트
export async function updateColumnType(colKey, newType, targetSheetId = "sheet_default") {
  await updateColumnConfig(colKey, { type: newType }, targetSheetId);
}

// 초기 데이터 시딩
export async function seedInitialTasks() {
  const colRef = collection(db, COLLECTION_NAME);
  await setDoc(doc(colRef, "metadata"), {
    type: "meta",
    projectName: "form-interactive",
    title: "전사 업무 데이터 관리 시트",
    sheets: DEFAULT_SHEETS,
    columnConfigs: DEFAULT_COLUMN_CONFIGS,
    columnTypes: DEFAULT_COLUMN_TYPES,
    seededAt: serverTimestamp()
  });

  for (const t of INITIAL_TASKS) {
    const docRef = doc(colRef, t.id);
    await setDoc(docRef, {
      ...t,
      sheetId: "sheet_default",
      type: "task",
      updatedAt: serverTimestamp()
    });
  }
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

// 초기 데이터로 전체 리셋
export async function resetCollection() {
  const colRef = collection(db, COLLECTION_NAME);
  const snap = await getDocs(colRef);
  for (const docSnap of snap.docs) {
    await deleteDoc(docSnap.ref);
  }
  await seedInitialTasks();
}

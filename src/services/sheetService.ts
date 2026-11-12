import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db, COLLECTION_NAME } from './firebase';
import { Sheet, ColumnConfig, ColumnDef } from '../types/sheet';

export const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'empNo', letter: 'A', title: '학번/사번', width: 100 },
  { key: 'name', letter: 'B', title: '이름', width: 100 },
  { key: 'department', letter: 'C', title: '부서/전공', width: 100 },
  { key: 'project', letter: 'D', title: '배정 프로젝트', width: 100 },
  { key: 'task', letter: 'E', title: '담당 업무', width: 100 },
  { key: 'status', letter: 'F', title: '진행 상태', width: 100 },
  { key: 'dueDate', letter: 'G', title: '마감일', width: 100 },
  { key: 'priority', letter: 'H', title: '우선순위', width: 100 },
  { key: 'isApproved', letter: 'I', title: '승인', width: 80 },
  { key: 'progress', letter: 'J', title: '진척도', width: 100 },
];

export async function getMetadata(): Promise<any> {
  const metaDocRef = doc(db, COLLECTION_NAME, 'metadata');
  const snap = await getDoc(metaDocRef);
  return snap.exists() ? snap.data() : {};
}

export function subscribeFullMetadata(
  callback: (data: any) => void,
  onError?: (err: any) => void
) {
  const metaDocRef = doc(db, COLLECTION_NAME, 'metadata');
  return onSnapshot(
    metaDocRef,
    (snap) => {
      callback(snap.exists() ? snap.data() : {});
    },
    (err) => {
      console.error('[Firestore] subscribeFullMetadata 에러:', err);
      onError?.(err);
    }
  );
}

export function subscribeSheets(
  onSuccess: (sheets: Sheet[]) => void,
  onError?: (err: any) => void
) {
  const metaDocRef = doc(db, COLLECTION_NAME, 'metadata');
  return onSnapshot(
    metaDocRef,
    (snap) => {
      const data = snap.exists() ? snap.data() : {};
      const sheets = Array.isArray(data.sheets) ? data.sheets : [];
      onSuccess(sheets);
    },
    (err) => {
      console.error('[Firestore] subscribeSheets 에러:', err);
      onError?.(err);
    }
  );
}

export function subscribeSheetMetadata(
  sheetId: string,
  callback: (meta: {
    columnConfigs: Record<string, ColumnConfig>;
    columnOrder: string[];
    userViewColumns: string[] | null;
    isClosed: boolean;
    deadline: string | null;
    closedMessage: string;
  }) => void
) {
  const metaDocRef = doc(db, COLLECTION_NAME, 'metadata');
  return onSnapshot(metaDocRef, (snap) => {
    if (!snap.exists()) {
      callback({
        columnConfigs: {},
        columnOrder: [],
        userViewColumns: null,
        isClosed: false,
        deadline: null,
        closedMessage: '',
      });
      return;
    }
    const data = snap.data();
    const configKey = `columnConfigs_${sheetId}`;
    const orderKey = `columnOrder_${sheetId}`;
    const userViewKey = `userViewColumns_${sheetId}`;
    const deadlineKey = `deadline_${sheetId}`;

    const deadlineData = data[deadlineKey] || {};
    callback({
      columnConfigs: data[configKey] || {},
      columnOrder: data[orderKey] || [],
      userViewColumns: data[userViewKey] || null,
      isClosed: deadlineData.isClosed || false,
      deadline: deadlineData.deadline || null,
      closedMessage: deadlineData.closedMessage || '',
    });
  });
}

export async function createSheet(name: string, customId?: string): Promise<string> {
  const sheetId = customId || 'sheet_' + Date.now();
  const metaDocRef = doc(db, COLLECTION_NAME, 'metadata');
  const snap = await getDoc(metaDocRef);
  const data = snap.exists() ? snap.data() : {};
  const currentSheets: Sheet[] = Array.isArray(data.sheets) ? [...data.sheets] : [];

  const newSheet: Sheet = {
    id: sheetId,
    name: name.trim() || `새 시트 (${new Date().toLocaleDateString('ko-KR')})`,
    owner: '관리자',
    createdAt: new Date().toISOString(),
  };

  currentSheets.push(newSheet);

  // 기본 3개 열 설정 생성
  const defaultCols = ['col_1', 'col_2', 'col_3'];
  const defaultConfigs: Record<string, ColumnConfig> = {
    col_1: { label: '구글 아이디', type: 'googleId', width: 140 },
    col_2: { label: '항목명', type: 'cardHeader', width: 140 },
    col_3: { label: '상세내용', type: 'text', width: 140 },
  };

  await setDoc(
    metaDocRef,
    {
      sheets: currentSheets,
      [`columnOrder_${sheetId}`]: defaultCols,
      [`columnConfigs_${sheetId}`]: defaultConfigs,
    },
    { merge: true }
  );

  return sheetId;
}

export async function renameSheet(sheetId: string, newName: string): Promise<void> {
  if (!newName.trim()) return;
  const metaDocRef = doc(db, COLLECTION_NAME, 'metadata');
  const snap = await getDoc(metaDocRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const sheets: Sheet[] = Array.isArray(data.sheets) ? [...data.sheets] : [];
  const target = sheets.find((s) => s.id === sheetId);
  if (target) {
    target.name = newName.trim();
    await updateDoc(metaDocRef, { sheets });
  }
}

export async function deleteSheet(sheetId: string): Promise<void> {
  const metaDocRef = doc(db, COLLECTION_NAME, 'metadata');
  const snap = await getDoc(metaDocRef);
  if (snap.exists()) {
    const data = snap.data();
    const sheets: Sheet[] = Array.isArray(data.sheets) ? data.sheets.filter((s) => s.id !== sheetId) : [];
    await updateDoc(metaDocRef, { sheets });
  }

  // 연결된 태스크 일괄 삭제
  const q = query(collection(db, COLLECTION_NAME), where('sheetId', '==', sheetId));
  const snapTasks = await getDocs(q);
  const deletes = snapTasks.docs.map((d) => updateDoc(d.ref, { sheetId: '_deleted_' }));
  await Promise.all(deletes);
}

export async function updateColumnConfig(
  colKey: string,
  config: Partial<ColumnConfig>,
  sheetId: string
): Promise<void> {
  const metaDocRef = doc(db, COLLECTION_NAME, 'metadata');
  const snap = await getDoc(metaDocRef);
  const metaData = snap.exists() ? snap.data() : {};
  const configKey = `columnConfigs_${sheetId}`;
  const currentConfigs: Record<string, any> = metaData[configKey] || {};

  const existing = currentConfigs[colKey] || { type: 'text', label: colKey };
  const merged: any = { ...existing };

  Object.entries(config).forEach(([k, v]) => {
    if (v !== undefined) {
      merged[k] = v;
    } else {
      delete merged[k];
    }
  });

  // If type is not one with options, remove options
  if (merged.type !== 'select' && merged.type !== 'priority' && merged.type !== 'googleId') {
    delete merged.options;
  }

  // Remove any remaining undefined values across all currentConfigs
  const sanitizedCurrentConfigs: Record<string, any> = {};
  Object.entries(currentConfigs).forEach(([k, cfg]: [string, any]) => {
    if (cfg && typeof cfg === 'object') {
      const cleanCfg: any = {};
      Object.entries(cfg).forEach(([ck, cv]) => {
        if (cv !== undefined) cleanCfg[ck] = cv;
      });
      sanitizedCurrentConfigs[k] = cleanCfg;
    }
  });

  sanitizedCurrentConfigs[colKey] = merged;

  await setDoc(
    metaDocRef,
    {
      [configKey]: sanitizedCurrentConfigs,
    },
    { merge: true }
  );
}

export async function updateColumnOrder(newOrder: string[], sheetId: string): Promise<void> {
  const metaDocRef = doc(db, COLLECTION_NAME, 'metadata');
  await setDoc(
    metaDocRef,
    {
      [`columnOrder_${sheetId}`]: newOrder,
    },
    { merge: true }
  );
}

export async function updateUserViewColumns(columns: string[] | null, sheetId: string): Promise<void> {
  const metaDocRef = doc(db, COLLECTION_NAME, 'metadata');
  await setDoc(
    metaDocRef,
    {
      [`userViewColumns_${sheetId}`]: columns,
    },
    { merge: true }
  );
}

export async function addColumn(
  sheetId: string,
  title: string,
  type: ColumnConfig['type'] = 'text',
  insertIndex?: number
): Promise<string> {
  const metaDocRef = doc(db, COLLECTION_NAME, 'metadata');
  const snap = await getDoc(metaDocRef);
  const data = snap.exists() ? snap.data() : {};

  const orderKey = `columnOrder_${sheetId}`;
  const configKey = `columnConfigs_${sheetId}`;

  const currentOrder: string[] = Array.isArray(data[orderKey]) ? [...data[orderKey]] : [];
  const currentConfigs: Record<string, ColumnConfig> = data[configKey] ? { ...data[configKey] } : {};

  // Find next col key
  let maxIdx = 0;
  [...currentOrder, ...Object.keys(currentConfigs)].forEach((k) => {
    const match = k.match(/^col_(\d+)$/);
    if (match) maxIdx = Math.max(maxIdx, parseInt(match[1], 10));
  });
  const newColKey = `col_${maxIdx + 1}`;

  if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex <= currentOrder.length) {
    currentOrder.splice(insertIndex, 0, newColKey);
  } else {
    currentOrder.push(newColKey);
  }

  currentConfigs[newColKey] = {
    label: title,
    type: type,
    width: 120,
  };

  await setDoc(
    metaDocRef,
    {
      [orderKey]: currentOrder,
      [configKey]: currentConfigs,
    },
    { merge: true }
  );

  return newColKey;
}

export async function deleteColumn(sheetId: string, colKey: string): Promise<void> {
  const metaDocRef = doc(db, COLLECTION_NAME, 'metadata');
  const snap = await getDoc(metaDocRef);
  if (!snap.exists()) return;
  const data = snap.data();

  const orderKey = `columnOrder_${sheetId}`;
  const configKey = `columnConfigs_${sheetId}`;

  const currentOrder: string[] = Array.isArray(data[orderKey])
    ? data[orderKey].filter((k: string) => k !== colKey)
    : [];
  const currentConfigs: Record<string, ColumnConfig> = { ...(data[configKey] || {}) };
  delete currentConfigs[colKey];

  await setDoc(
    metaDocRef,
    {
      [orderKey]: currentOrder,
      [configKey]: currentConfigs,
    },
    { merge: true }
  );
}

export async function setSheetClosed(
  sheetId: string,
  isClosed: boolean,
  deadline: string | null = null,
  closedMessage: string = ''
): Promise<void> {
  const metaDocRef = doc(db, COLLECTION_NAME, 'metadata');
  await setDoc(
    metaDocRef,
    {
      [`deadline_${sheetId}`]: {
        isClosed,
        deadline,
        closedMessage,
        updatedAt: new Date().toISOString(),
      },
    },
    { merge: true }
  );
}


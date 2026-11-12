import * as XLSX from 'xlsx';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db, COLLECTION_NAME } from './firebase';
import { ColumnConfig } from '../types/sheet';

export interface ParsedExcelSheet {
  sheetName: string;
  headers: string[];
  rows: any[][];
  hasDoubleHeader?: boolean;
}

export function parseExcelWorkbook(fileBuffer: ArrayBuffer): {
  sheetNames: string[];
  workbook: XLSX.WorkBook;
} {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  return {
    sheetNames: workbook.SheetNames || [],
    workbook,
  };
}

export function extractSheetData(
  workbook: XLSX.WorkBook,
  sheetName: string,
  autoDetectDoubleHeader: boolean = true
): ParsedExcelSheet {
  const ws = workbook.Sheets[sheetName];
  if (!ws) {
    return { sheetName, headers: [], rows: [] };
  }

  const rawJson: any[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!rawJson || rawJson.length === 0) {
    return { sheetName, headers: [], rows: [] };
  }

  // Row 1 & Row 2 analysis
  let headerIndex = 0;
  let hasDoubleHeader = false;

  // Check if first row is empty
  const firstRow = rawJson[0] || [];
  const isFirstRowEmpty = firstRow.every((c) => c == null || String(c).trim() === '');
  if (isFirstRowEmpty && rawJson.length > 1) {
    headerIndex = 1;
  }

  const rowA = rawJson[headerIndex] || [];
  const rowB = rawJson[headerIndex + 1] || [];

  if (autoDetectDoubleHeader && rawJson.length > headerIndex + 2) {
    // Check if rowB contains subheaders
    const emptyCountA = rowA.filter((c) => c == null || String(c).trim() === '').length;
    const nonEmptyB = rowB.filter((c) => c != null && String(c).trim() !== '').length;

    if (emptyCountA > 0 && nonEmptyB > rowA.length / 2) {
      hasDoubleHeader = true;
    }
  }

  let finalHeaders: string[] = [];
  let dataRows: any[][] = [];

  if (hasDoubleHeader) {
    // Combine 2 rows
    let currentMain = '';
    const maxCols = Math.max(rowA.length, rowB.length);
    for (let c = 0; c < maxCols; c++) {
      const main = String(rowA[c] || '').trim();
      const sub = String(rowB[c] || '').trim();
      if (main) currentMain = main;
      const combined = currentMain && sub ? `${currentMain} - ${sub}` : currentMain || sub || `열 ${c + 1}`;
      finalHeaders.push(combined);
    }
    dataRows = rawJson.slice(headerIndex + 2);
  } else {
    finalHeaders = rowA.map((c, i) => (c != null && String(c).trim() ? String(c).trim() : `열 ${i + 1}`));
    dataRows = rawJson.slice(headerIndex + 1);
  }

  return {
    sheetName,
    headers: finalHeaders,
    rows: dataRows,
    hasDoubleHeader,
  };
}

export async function importExcelToFirestore(
  sheetId: string,
  headers: string[],
  rows: any[][],
  mode: 'replace' | 'append' = 'replace'
): Promise<void> {
  const metaDocRef = doc(db, COLLECTION_NAME, 'metadata');
  const metaSnap = await getDoc(metaDocRef);
  const metaData = metaSnap.exists() ? metaSnap.data() : {};

  const orderKey = `columnOrder_${sheetId}`;
  const configKey = `columnConfigs_${sheetId}`;

  let currentOrder: string[] = Array.isArray(metaData[orderKey]) ? [...metaData[orderKey]] : [];
  let currentConfigs: Record<string, ColumnConfig> = metaData[configKey] ? { ...metaData[configKey] } : {};

  const colCount = Math.max(headers.length, rows.length ? Math.max(...rows.map((r) => r.length)) : 0);
  const colKeys: string[] = [];

  for (let c = 0; c < colCount; c++) {
    let key: string;
    if (c < currentOrder.length) {
      key = currentOrder[c];
    } else {
      key = `col_${Date.now()}_${c}`;
      currentOrder.push(key);
    }
    colKeys.push(key);

    const rawHeader = (headers[c] != null ? String(headers[c]) : '').trim();
    const title = rawHeader || `열 ${c + 1}`;

    let autoType: ColumnConfig['type'] = 'text';
    const lower = title.toLowerCase();
    if (lower.includes('이메일') || lower.includes('계정') || lower.includes('google') || lower.includes('아이디')) {
      autoType = 'googleId';
    } else if (lower.includes('우선순위') || lower.includes('priority')) {
      autoType = 'priority';
    } else if (lower.includes('날짜') || lower.includes('일자') || lower.includes('date')) {
      autoType = 'date';
    } else if (c === 0 && !currentConfigs[key]) {
      autoType = 'cardHeader';
    }

    currentConfigs[key] = {
      ...(currentConfigs[key] || {}),
      label: title,
      type: currentConfigs[key]?.type || autoType,
      width: currentConfigs[key]?.width || 120,
    };
  }

  // If replace, clear existing tasks for this sheet
  if (mode === 'replace') {
    const q = query(collection(db, COLLECTION_NAME), where('sheetId', '==', sheetId));
    const snap = await getDocs(q);
    const deleteBatch = writeBatch(db);
    snap.docs.forEach((d) => deleteBatch.delete(d.ref));
    await deleteBatch.commit();
  }

  // Insert rows in batches of 450 (Firestore limit is 500)
  const BATCH_SIZE = 450;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    const colRef = collection(db, COLLECTION_NAME);

    chunk.forEach((row) => {
      const newDocRef = doc(colRef);
      const docData: Record<string, any> = {
        id: newDocRef.id,
        sheetId,
        type: 'task',
        createdAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      };
      colKeys.forEach((k, idx) => {
        const val = row[idx];
        docData[k] = val != null ? String(val).trim() : '';
      });
      batch.set(newDocRef, docData);
    });

    await batch.commit();
  }

  // Update metadata
  const updateBatch = writeBatch(db);
  updateBatch.set(
    metaDocRef,
    {
      [orderKey]: currentOrder,
      [configKey]: currentConfigs,
    },
    { merge: true }
  );
  await updateBatch.commit();
}


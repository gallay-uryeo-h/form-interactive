import { useState, useEffect, useMemo } from 'react';
import { Sheet } from '../types/sheet';
import { Task } from '../types/task';
import { subscribeFullMetadata } from '../services/sheetService';
import { subscribeTasks } from '../services/taskService';

function normalizeEmail(email: any): string {
  return String(email || '').trim().toLowerCase();
}

export function useAccessibleSheets(userEmail: string | null | undefined) {
  const [metadata, setMetadata] = useState<any>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loadingMeta, setLoadingMeta] = useState<boolean>(true);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(true);

  // 1. Subscribe to metadata
  useEffect(() => {
    const unsub = subscribeFullMetadata((data) => {
      setMetadata(data);
      setLoadingMeta(false);
    });
    return () => unsub();
  }, []);

  // 2. Subscribe to all tasks
  useEffect(() => {
    const unsub = subscribeTasks('ALL', (tasks) => {
      setAllTasks(tasks);
      setLoadingTasks(false);
    });
    return () => unsub();
  }, []);

  // 3. Compute accessible sheets
  const { accessibleSheets, countsBySheet } = useMemo(() => {
    if (!userEmail || !metadata) {
      return { accessibleSheets: [], countsBySheet: {} };
    }

    const myEmail = normalizeEmail(userEmail);
    const sheets: Sheet[] = Array.isArray(metadata.sheets) ? metadata.sheets : [];
    const validSheets: Sheet[] = [];
    const counts: Record<string, number> = {};

    sheets.forEach((sheet) => {
      const colConfigs = metadata[`columnConfigs_${sheet.id}`] || {};
      // Find googleId column
      const gColKey = Object.keys(colConfigs).find(
        (k) => colConfigs[k]?.type === 'googleId'
      );

      // googleId 열이 없는 시트는 접근 불가
      if (!gColKey) return;

      // 내 이메일이 매칭되는 행 수 계산
      const myRows = allTasks.filter(
        (t) => t.sheetId === sheet.id && normalizeEmail(t[gColKey]) === myEmail
      );

      if (myRows.length > 0) {
        validSheets.push(sheet);
        counts[sheet.id] = myRows.length;
      }
    });

    return { accessibleSheets: validSheets, countsBySheet: counts };
  }, [userEmail, metadata, allTasks]);

  return {
    accessibleSheets,
    countsBySheet,
    loading: loadingMeta || loadingTasks,
  };
}

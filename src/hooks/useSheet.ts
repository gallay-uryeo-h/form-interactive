import { useState, useEffect, useMemo } from 'react';
import { Sheet, ColumnDef, ColumnConfig } from '../types/sheet';
import {
  subscribeSheets,
  subscribeSheetMetadata,
  DEFAULT_COLUMNS,
  updateColumnConfig,
  updateColumnOrder,
  updateUserViewColumns,
  updateUserReadOnlyColumns,
  updateUserStatuses,
  UserStatus,
  addColumn,
  deleteColumn,
  renameSheet,
  setSheetClosed,
} from '../services/sheetService';

export function useSheet(sheetId?: string | null) {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loadingSheets, setLoadingSheets] = useState<boolean>(true);

  const [columnConfigs, setColumnConfigs] = useState<Record<string, ColumnConfig>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [userViewColumns, setUserViewColumns] = useState<string[] | null>(null);
  const [userReadOnlyColumns, setUserReadOnlyColumns] = useState<string[] | null>(null);
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatus>>({});
  const [deadlineInfo, setDeadlineInfo] = useState<{
    isClosed: boolean;
    deadline: string | null;
    closedMessage: string;
  }>({ isClosed: false, deadline: null, closedMessage: '' });

  // 1. Subscribe to all sheets list
  useEffect(() => {
    const unsub = subscribeSheets((sheetList) => {
      setSheets(sheetList);
      setLoadingSheets(false);
    });
    return () => unsub();
  }, []);

  // 2. Subscribe to target sheet metadata
  useEffect(() => {
    if (!sheetId) return;

    const unsub = subscribeSheetMetadata(sheetId, (meta) => {
      setColumnConfigs(meta.columnConfigs);
      setColumnOrder(meta.columnOrder);
      setUserViewColumns(meta.userViewColumns);
      setUserReadOnlyColumns(meta.userReadOnlyColumns);
      setUserStatuses(meta.userStatuses);
      setDeadlineInfo({
        isClosed: meta.isClosed,
        deadline: meta.deadline,
        closedMessage: meta.closedMessage,
      });
    });

    return () => unsub();
  }, [sheetId]);

  const currentSheet = useMemo(() => {
    if (!sheetId) return null;
    return sheets.find((s) => s.id === sheetId) || null;
  }, [sheets, sheetId]);

  // Compute normalized columns list with letters A, B, C...
  const columns = useMemo<ColumnDef[]>(() => {
    let keys: string[] = [];
    if (columnOrder && columnOrder.length > 0) {
      keys = [...columnOrder];
    } else if (columnConfigs && Object.keys(columnConfigs).length > 0) {
      keys = Object.keys(columnConfigs);
    } else if (sheetId === 'sheet_default') {
      keys = DEFAULT_COLUMNS.map((c) => c.key);
    } else {
      keys = ['col_1', 'col_2', 'col_3'];
    }

    return keys.map((k, idx) => {
      const cfg: Partial<ColumnConfig> = columnConfigs[k] || {};
      const defCol = DEFAULT_COLUMNS.find((c) => c.key === k);
      return {
        key: k,
        letter: String.fromCharCode(65 + (idx % 26)),
        title: cfg.label || defCol?.title || `열 ${idx + 1}`,
        width: cfg.width || defCol?.width || 120,
      };
    });
  }, [columnOrder, columnConfigs, sheetId]);

  const handleUpdateColumnConfig = async (colKey: string, patch: Partial<ColumnConfig>) => {
    if (!sheetId) return;
    await updateColumnConfig(colKey, patch, sheetId);
  };

  const handleUpdateColumnOrder = async (newOrder: string[]) => {
    if (!sheetId) return;
    await updateColumnOrder(newOrder, sheetId);
  };

  const handleAddColumn = async (
    title: string,
    type: ColumnConfig['type'] = 'text',
    insertIndex?: number
  ) => {
    if (!sheetId) return '';
    return await addColumn(sheetId, title, type, insertIndex);
  };

  const handleDeleteColumn = async (colKey: string) => {
    if (!sheetId) return;
    await deleteColumn(sheetId, colKey);
  };

  const handleRenameSheet = async (newName: string) => {
    if (!sheetId) return;
    await renameSheet(sheetId, newName);
  };

  const handleSetClosed = async (isClosed: boolean, deadline: string | null = null, msg: string = '') => {
    if (!sheetId) return;
    await setSheetClosed(sheetId, isClosed, deadline, msg);
  };

  return {
    sheets,
    loadingSheets,
    currentSheet,
    columns,
    columnConfigs,
    columnOrder,
    userViewColumns,
    userReadOnlyColumns,
    userStatuses,
    deadlineInfo,
    updateColumnConfig: handleUpdateColumnConfig,
    updateColumnOrder: handleUpdateColumnOrder,
    updateUserViewColumns: (cols: string[] | null) => sheetId && updateUserViewColumns(cols, sheetId),
    updateUserReadOnlyColumns: (cols: string[] | null) => sheetId && updateUserReadOnlyColumns(cols, sheetId),
    updateUserStatuses: (statuses: Record<string, UserStatus>) => sheetId && updateUserStatuses(statuses, sheetId),
    addColumn: handleAddColumn,
    deleteColumn: handleDeleteColumn,
    renameSheet: handleRenameSheet,
    setSheetClosed: handleSetClosed,
  };
}

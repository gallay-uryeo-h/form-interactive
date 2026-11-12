import { useState, useEffect, useMemo } from 'react';
import { Task, FilterSortState } from '../types/task';
import {
  subscribeTasks,
  addTask,
  updateTask,
  deleteTask,
} from '../services/taskService';

export function useTasks(sheetId?: string | null, userEmail?: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [filterSortState, setFilterSortState] = useState<FilterSortState>({
    sortCol: null,
    sortDir: null,
    filters: {},
  });

  useEffect(() => {
    if (!sheetId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeTasks(
      sheetId,
      (fetchedTasks) => {
        setTasks(fetchedTasks);
        setLoading(false);
      },
      userEmail
    );

    return () => unsub();
  }, [sheetId, userEmail]);

  // Apply filters & sort
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // 1. Column filters
    Object.entries(filterSortState.filters).forEach(([colKey, allowedValues]) => {
      if (!allowedValues || allowedValues.length === 0) return;
      result = result.filter((task) => {
        const val = task[colKey];
        const strVal = val != null && String(val).trim() !== '' ? String(val) : '(비어 있음)';
        return allowedValues.includes(strVal);
      });
    });

    // 2. Sorting
    if (filterSortState.sortCol && filterSortState.sortDir) {
      const col = filterSortState.sortCol;
      const dir = filterSortState.sortDir === 'asc' ? 1 : -1;
      result.sort((a, b) => {
        const valA = a[col] != null ? String(a[col]) : '';
        const valB = b[col] != null ? String(b[col]) : '';
        return valA.localeCompare(valB, 'ko', { numeric: true }) * dir;
      });
    }

    return result;
  }, [tasks, filterSortState]);

  const handleUpdateCell = async (taskId: string, colKey: string, value: any) => {
    setSaving(true);
    try {
      await updateTask(taskId, { [colKey]: value });
    } catch (err) {
      console.error('셀 저장 실패:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleAddRow = async (initialData: Record<string, any> = {}) => {
    if (!sheetId) return;
    setSaving(true);
    try {
      await addTask(initialData, sheetId);
    } catch (err) {
      console.error('행 추가 실패:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRow = async (taskId: string) => {
    setSaving(true);
    try {
      await deleteTask(taskId);
    } catch (err) {
      console.error('행 삭제 실패:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    tasks,
    filteredTasks,
    loading,
    saving,
    filterSortState,
    setFilterSortState,
    updateCell: handleUpdateCell,
    addRow: handleAddRow,
    deleteRow: handleDeleteRow,
  };
}


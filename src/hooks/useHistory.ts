import { useState, useCallback } from 'react';

export interface HistoryAction {
  type: 'cell_edit';
  taskId: string;
  colKey: string;
  prevValue: any;
  nextValue: any;
}

export function useHistory(onApplyAction: (action: HistoryAction, isUndo: boolean) => Promise<void>) {
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);

  const pushAction = useCallback((action: HistoryAction) => {
    setUndoStack((prev) => [...prev, action]);
    setRedoStack([]); // Clear redo stack on new action
  }, []);

  const undo = useCallback(async () => {
    if (undoStack.length === 0) return;
    const action = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    await onApplyAction(action, true);
    setRedoStack((prev) => [...prev, action]);
  }, [undoStack, onApplyAction]);

  const redo = useCallback(async () => {
    if (redoStack.length === 0) return;
    const action = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    await onApplyAction(action, false);
    setUndoStack((prev) => [...prev, action]);
  }, [redoStack, onApplyAction]);

  return {
    pushAction,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
}


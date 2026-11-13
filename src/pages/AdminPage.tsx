import React, { useState } from 'react';
import { useSheet } from '../hooks/useSheet';
import { useTasks } from '../hooks/useTasks';
import { useHistory } from '../hooks/useHistory';
import { Header } from '../components/common/Header';
import { SpreadsheetGrid } from '../components/admin/SpreadsheetGrid';
import { TypeConfigModal } from '../components/admin/TypeConfigModal';
import { FilterSortModal } from '../components/admin/FilterSortModal';
import { ExcelImportModal } from '../components/admin/ExcelImportModal';
import { UserViewColumnsModal } from '../components/admin/UserViewColumnsModal';
import { UserClosingModal } from '../components/admin/UserClosingModal';
import { StudentRosterModal } from '../components/admin/StudentRosterModal';
import {
  subscribeStudentRoster,
  StudentRecord,
  buildStudentLookupMaps,
  normalizeGradeClassNumKey,
  normalizeStudentCodeKey,
} from '../services/studentMasterService';

interface AdminPageProps {
  currentSheetId: string;
  onSelectSheet: (sheetId: string) => void;
  onTabChange: (tab: 'home' | 'admin' | 'mobile') => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  currentSheetId,
  onSelectSheet,
  onTabChange,
}) => {
  const {
    sheets,
    currentSheet,
    columns,
    columnConfigs,
    userViewColumns,
    userReadOnlyColumns,
    userStatuses,
    deadlineInfo,
    updateColumnConfig,
    updateColumnOrder,
    updateUserViewColumns,
    updateUserReadOnlyColumns,
    updateUserStatuses,
    addColumn,
    deleteColumn,
    renameSheet,
    setSheetClosed,
  } = useSheet(currentSheetId);

  const {
    tasks,
    filteredTasks,
    loading,
    saving,
    filterSortState,
    setFilterSortState,
    updateCell,
    batchUpdateCells,
    addRow,
    deleteRow,
  } = useTasks(currentSheetId);

  // History system (Undo/Redo)
  const { pushAction, undo, redo, canUndo, canRedo } = useHistory(
    async (action, isUndo) => {
      if (action.type === 'batch_cell_edit' && action.batchItems) {
        const updates = action.batchItems.map((item) => ({
          taskId: item.taskId,
          colKey: item.colKey,
          value: isUndo ? item.prevValue : item.nextValue,
        }));
        await batchUpdateCells(updates);
      } else if (action.taskId && action.colKey) {
        const val = isUndo ? action.prevValue : action.nextValue;
        await updateCell(action.taskId, action.colKey, val);
      }
    }
  );

  const handleCellUpdateWithHistory = async (taskId: string, colKey: string, nextValue: any) => {
    const task = tasks.find((t) => t.id === taskId);
    const prevValue = task ? task[colKey] : '';
    if (prevValue === nextValue) return;

    // 만약 학생 정보 열이 수정되었고, 구글 ID 열에 매칭이 설정되어 있다면 자동 매칭 계산
    const nextTaskState = { ...(task || {}), [colKey]: nextValue };
    const googleIdCol = columns.find((c) => columnConfigs[c.key]?.type === 'googleId');
    const matchingCfg = googleIdCol ? columnConfigs[googleIdCol.key]?.googleIdMatching : null;

    let autoMatchedEmail: string | null = null;
    if (googleIdCol && matchingCfg && matchingCfg.mode !== 'manual' && colKey !== googleIdCol.key) {
      if (matchingCfg.mode === 'gradeClassNum') {
        const key = normalizeGradeClassNumKey(
          nextTaskState[matchingCfg.gradeColKey || ''],
          nextTaskState[matchingCfg.classColKey || ''],
          nextTaskState[matchingCfg.numColKey || ''],
          nextTaskState[matchingCfg.nameColKey || '']
        );
        autoMatchedEmail = lookupMaps.byGradeClassNum.get(key) || null;
      } else if (matchingCfg.mode === 'studentCode') {
        const key = normalizeStudentCodeKey(
          nextTaskState[matchingCfg.studentCodeColKey || ''],
          nextTaskState[matchingCfg.nameColKey || '']
        );
        autoMatchedEmail = lookupMaps.byStudentCode.get(key) || null;
      }
    }

    if (autoMatchedEmail && autoMatchedEmail !== task?.[googleIdCol!.key]) {
      // 2개 셀 일괄 업데이트 (현재 셀 + 자동 매칭된 구글 ID)
      await handleBatchUpdateWithHistory([
        { taskId, colKey, nextValue },
        { taskId, colKey: googleIdCol!.key, nextValue: autoMatchedEmail },
      ]);
      return;
    }

    pushAction({
      type: 'cell_edit',
      taskId,
      colKey,
      prevValue,
      nextValue,
    });
    await updateCell(taskId, colKey, nextValue);
  };

  const handleBatchUpdateWithHistory = async (
    updates: { taskId: string; colKey: string; nextValue: any }[]
  ) => {
    if (updates.length === 0) return;
    const batchItems = updates.map((u) => {
      const task = tasks.find((t) => t.id === u.taskId);
      return {
        taskId: u.taskId,
        colKey: u.colKey,
        prevValue: task ? task[u.colKey] : '',
        nextValue: u.nextValue,
      };
    });

    pushAction({
      type: 'batch_cell_edit',
      batchItems,
    });

    await batchUpdateCells(
      updates.map((u) => ({
        taskId: u.taskId,
        colKey: u.colKey,
        value: u.nextValue,
      }))
    );
  };

  // Modal States
  const [typeModal, setTypeModal] = useState<{
    isOpen: boolean;
    colKey: string;
    colTitle: string;
  }>({ isOpen: false, colKey: '', colTitle: '' });

  const [filterModal, setFilterModal] = useState<{
    isOpen: boolean;
    colKey: string;
    colTitle: string;
  }>({ isOpen: false, colKey: '', colTitle: '' });

  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isUserViewModalOpen, setIsUserViewModalOpen] = useState(false);
  const [isUserClosingModalOpen, setIsUserClosingModalOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);

  // 학생 명렬 마스터 구독
  const [roster, setRoster] = useState<StudentRecord[]>([]);
  React.useEffect(() => {
    const unsub = subscribeStudentRoster((list) => {
      setRoster(list);
    });
    return () => unsub();
  }, []);

  const lookupMaps = React.useMemo(() => {
    return buildStudentLookupMaps(roster);
  }, [roster]);

  // Extract unique user emails from googleId column
  const sheetUsers = React.useMemo(() => {
    const googleCol = columns.find((c) => columnConfigs[c.key]?.type === 'googleId');
    if (!googleCol) return [];
    const set = new Set<string>();
    tasks.forEach((t) => {
      const email = t[googleCol.key];
      if (email && typeof email === 'string' && email.trim()) {
        set.add(email.trim().toLowerCase());
      }
    });
    return Array.from(set);
  }, [columns, columnConfigs, tasks]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-container-lowest">
      {/* Top Header */}
      <Header
        sheetName={currentSheet?.name || '스프레드시트'}
        onRenameSheet={renameSheet}
        saving={saving}
        activeTab="admin"
        onTabChange={onTabChange}
      />

      {/* Action Toolbar */}
      <div className="h-11 bg-surface-container-low border-b border-surface-variant flex items-center justify-between px-4 z-10 shrink-0">
        <div className="flex items-center gap-2">
          {/* Sheet Selector */}
          <select
            value={currentSheetId}
            onChange={(e) => onSelectSheet(e.target.value)}
            className="text-xs font-semibold px-2.5 py-1 bg-white border border-surface-variant rounded-lg outline-none focus:border-primary shadow-2xs"
          >
            {sheets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <div className="h-4 w-[1px] bg-outline-variant mx-1"></div>

          {/* Undo / Redo */}
          <button
            type="button"
            disabled={!canUndo}
            onClick={undo}
            className="p-1 rounded hover:bg-surface-variant text-outline disabled:opacity-30 transition-colors"
            title="실행 취소 (Ctrl+Z)"
          >
            <span className="material-symbols-outlined text-[18px]">undo</span>
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={redo}
            className="p-1 rounded hover:bg-surface-variant text-outline disabled:opacity-30 transition-colors"
            title="다시 실행 (Ctrl+Y)"
          >
            <span className="material-symbols-outlined text-[18px]">redo</span>
          </button>

          <div className="h-4 w-[1px] bg-outline-variant mx-1"></div>

          {/* Excel Import Button */}
          <button
            type="button"
            onClick={() => setIsExcelModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-surface-container border border-surface-variant rounded-lg text-xs font-semibold text-emerald-800 transition-colors shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px] text-emerald-600">upload_file</span>
            엑셀 파일 업로드
          </button>

          {/* Student Roster Master DB Button */}
          <button
            type="button"
            onClick={() => setIsRosterModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-surface-container border border-surface-variant rounded-lg text-xs font-semibold text-indigo-900 transition-colors shadow-2xs cursor-pointer"
            title="학교 학생 구글 계정 명렬 등록 및 관리"
          >
            <span className="material-symbols-outlined text-[16px] text-indigo-600">school</span>
            학생 명렬 관리
            {roster.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                {roster.length}명
              </span>
            )}
          </button>

          {/* User View Columns Setting */}
          <button
            type="button"
            onClick={() => setIsUserViewModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-surface-container border border-surface-variant rounded-lg text-xs font-semibold text-on-surface transition-colors shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">visibility</span>
            사용자 표시 열 ({userViewColumns ? `${userViewColumns.length}개` : '전체'})
          </button>
        </div>

        {/* Right: Deadline & Closing Controls */}
        <div className="flex items-center gap-2">
          {/* User Closing Management Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsUserClosingModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-surface-container border border-surface-variant rounded-lg text-xs font-semibold text-on-surface transition-colors shadow-2xs"
            title="사용자별 입력 마감 및 연결 해제 설정"
          >
            <span className="material-symbols-outlined text-[16px] text-red-600">
              lock_person
            </span>
            <span>사용자별 마감 관리</span>
            {Object.values(userStatuses || {}).some((s) => s.inputClosed || s.disconnected) && (
              <span className="w-2 h-2 rounded-full bg-red-600 shrink-0"></span>
            )}
          </button>

          <div className="h-4 w-[1px] bg-outline-variant mx-0.5"></div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs font-semibold text-on-surface">전체 시트 마감</span>
            <input
              type="checkbox"
              checked={deadlineInfo.isClosed}
              onChange={(e) => setSheetClosed(e.target.checked, deadlineInfo.deadline, deadlineInfo.closedMessage)}
              className="toggle rounded text-red-600 focus:ring-red-500 h-4 w-4"
            />
          </label>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-outline text-xs">
            <span className="animate-spin text-base">⏳</span>
            데이터를 불러오는 중입니다...
          </div>
        </div>
      ) : (
        <SpreadsheetGrid
          columns={columns}
          tasks={filteredTasks}
          columnConfigs={columnConfigs}
          activeConfigColKey={typeModal.isOpen ? typeModal.colKey : null}
          userViewColumns={userViewColumns}
          userReadOnlyColumns={userReadOnlyColumns}
          onUpdateUserViewColumns={updateUserViewColumns}
          onUpdateCell={handleCellUpdateWithHistory}
          onBatchUpdateCells={handleBatchUpdateWithHistory}
          onDeleteRow={deleteRow}
          onAddRow={addRow}
          onAddColumn={async (title, insertIndex) => {
            await addColumn(title, 'text', insertIndex);
          }}
          onDeleteColumn={deleteColumn}
          onUpdateColumnTitle={async (key, newTitle) => {
            await updateColumnConfig(key, { label: newTitle });
          }}
          onUpdateColumnWidth={async (key, width) => {
            await updateColumnConfig(key, { width });
          }}
          onUpdateColumnOrder={updateColumnOrder}
          onOpenTypeConfig={(colKey, colTitle) => {
            setTypeModal({ isOpen: true, colKey, colTitle });
          }}
          onOpenFilterSort={(colKey, colTitle) => {
            setFilterModal({ isOpen: true, colKey, colTitle });
          }}
        />
      )}

      {/* Modals */}
      <TypeConfigModal
        isOpen={typeModal.isOpen}
        onClose={() => setTypeModal({ ...typeModal, isOpen: false })}
        colKey={typeModal.colKey}
        colTitle={typeModal.colTitle}
        config={columnConfigs[typeModal.colKey] || { type: 'text' }}
        allColumns={columns}
        tasks={tasks}
        onNavigateCol={async (targetColKey) => {
          const targetCol = columns.find((c) => c.key === targetColKey);
          if (targetCol) {
            setTypeModal({
              isOpen: true,
              colKey: targetCol.key,
              colTitle: targetCol.title,
            });
          }
        }}
        onOpenRosterModal={() => setIsRosterModalOpen(true)}
        onApplyMatchingToSheet={async (updates) => {
          const batch = updates.map((u) => ({
            taskId: u.taskId,
            colKey: typeModal.colKey,
            nextValue: u.email,
          }));
          await handleBatchUpdateWithHistory(batch);
        }}
        isVisibleInUserView={
          !userViewColumns || userViewColumns.includes(typeModal.colKey)
        }
        isReadOnlyInUserView={userReadOnlyColumns?.includes(typeModal.colKey) ?? false}
        onToggleUserView={async (visible, readOnly) => {
          const key = typeModal.colKey;
          // --- Visibility ---
          const allKeys = columns.map((c) => c.key);
          const currentList = userViewColumns || allKeys;
          let nextList: string[] | null;
          if (visible) {
            const added = [...currentList, key];
            nextList = added.length >= allKeys.length ? null : added;
          } else {
            nextList = currentList.filter((k) => k !== key);
          }
          await updateUserViewColumns(nextList);
          // --- Read-only ---
          const currentRO = userReadOnlyColumns || [];
          let nextRO: string[] | null;
          if (readOnly) {
            nextRO = currentRO.includes(key) ? currentRO : [...currentRO, key];
          } else {
            nextRO = currentRO.filter((k) => k !== key);
          }
          await updateUserReadOnlyColumns(nextRO.length > 0 ? nextRO : null);
        }}
        onSave={async (patch) => {
          await updateColumnConfig(typeModal.colKey, patch);
        }}
        onDeleteColumn={deleteColumn}
      />

      <FilterSortModal
        isOpen={filterModal.isOpen}
        onClose={() => setFilterModal({ ...filterModal, isOpen: false })}
        colKey={filterModal.colKey}
        colTitle={filterModal.colTitle}
        tasks={tasks}
        filterSortState={filterSortState}
        onApply={setFilterSortState}
      />

      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        sheetId={currentSheetId}
        onSuccess={() => { }}
      />

      <UserViewColumnsModal
        isOpen={isUserViewModalOpen}
        onClose={() => setIsUserViewModalOpen(false)}
        columns={columns}
        userViewColumns={userViewColumns}
        userReadOnlyColumns={userReadOnlyColumns}
        onSave={async (viewCols, readOnlyCols) => {
          await updateUserViewColumns(viewCols);
          await updateUserReadOnlyColumns(readOnlyCols);
        }}
      />

      <UserClosingModal
        isOpen={isUserClosingModalOpen}
        onClose={() => setIsUserClosingModalOpen(false)}
        users={sheetUsers}
        userStatuses={userStatuses}
        onSave={async (statuses) => {
          await updateUserStatuses(statuses);
        }}
        sheetIsClosed={deadlineInfo.isClosed}
        onToggleSheetClosed={async (closed) => {
          await setSheetClosed(closed, deadlineInfo.deadline, deadlineInfo.closedMessage);
        }}
      />

      <StudentRosterModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
      />
    </div>
  );
};

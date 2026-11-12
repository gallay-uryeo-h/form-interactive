import React, { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSheet } from '../hooks/useSheet';
import { useTasks } from '../hooks/useTasks';
import { ColumnDef } from '../types/sheet';
import { Task } from '../types/task';

interface MobilePageProps {
  currentSheetId: string;
  onSelectSheet: (sheetId: string) => void;
  onTabChange?: (tab: 'home' | 'admin' | 'mobile') => void;
}

export const MobilePage: React.FC<MobilePageProps> = ({
  currentSheetId,
  onSelectSheet,
  onTabChange,
}) => {
  const { user, logout } = useAuth();
  const { sheets, currentSheet, columns, columnConfigs, userViewColumns, deadlineInfo } =
    useSheet(currentSheetId);

  // Filter tasks by logged-in user email unless user is admin
  const userEmail = user?.isAdmin ? null : user?.email;
  const { tasks, loading, saving, updateCell, addRow } = useTasks(currentSheetId, userEmail);

  const [search, setSearch] = useState('');
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newCardData, setNewCardData] = useState<Record<string, any>>({});

  // Visible columns for user
  const visibleColumns = useMemo(() => {
    return columns.filter((col) => {
      if (Array.isArray(userViewColumns) && !userViewColumns.includes(col.key)) {
        return false;
      }
      return true;
    });
  }, [columns, userViewColumns]);

  // Card header column (if configured)
  const headerCol = useMemo(() => {
    return (
      visibleColumns.find((c) => columnConfigs[c.key]?.type === 'cardHeader') ||
      visibleColumns[0]
    );
  }, [visibleColumns, columnConfigs]);

  // Search filtered tasks
  const displayTasks = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter((t) =>
      Object.values(t).some((val) => val != null && String(val).toLowerCase().includes(q))
    );
  }, [tasks, search]);

  const handleCreateCard = async () => {
    const dataToSave = { ...newCardData };
    // Auto-fill user email into googleId column
    const googleIdCol = columns.find((c) => columnConfigs[c.key]?.type === 'googleId');
    if (googleIdCol && user?.email) {
      dataToSave[googleIdCol.key] = user.email;
    }

    await addRow(dataToSave);
    setNewCardData({});
    setIsAddCardOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f4f9] text-[#1f1f1f] pb-16">
      {/* Mobile App Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#dadce0] px-4 py-3 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
            <span className="material-symbols-outlined text-[18px]">assignment</span>
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm font-bold text-on-surface truncate">
              {currentSheet?.name || '업무 양식'}
            </h1>
            <span className="text-[10px] text-outline font-medium">
              {user?.email} {user?.isAdmin && '(관리자 모드)'}
            </span>
          </div>
        </div>

        {/* Right status & switch account */}
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-[10px] font-mono text-amber-700 font-bold animate-pulse">
              저장 중...
            </span>
          )}
          {onTabChange && user?.isAdmin && (
            <button
              onClick={() => onTabChange('admin')}
              className="text-xs text-primary font-bold px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20"
            >
              Admin
            </button>
          )}
          <button
            onClick={logout}
            className="text-[11px] text-outline hover:text-red-600 px-2 py-1 rounded-lg border border-surface-variant hover:bg-red-50"
            title="계정 전환"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* Closed Deadline Banner */}
      {deadlineInfo.isClosed && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center gap-2 text-red-800 text-xs font-semibold">
          <span className="material-symbols-outlined text-base text-red-600">lock</span>
          <span>
            {deadlineInfo.closedMessage || '이 시트는 마감되어 현재 읽기 전용입니다.'}
          </span>
        </div>
      )}

      {/* Sheet Selector & Search Bar */}
      <div className="p-4 space-y-2.5 max-w-lg w-full mx-auto">
        <div className="flex items-center gap-2">
          <select
            value={currentSheetId}
            onChange={(e) => onSelectSheet(e.target.value)}
            className="flex-1 text-xs font-semibold px-3 py-2 bg-white border border-[#dadce0] rounded-xl shadow-2xs outline-none focus:border-primary"
          >
            {sheets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.isClosed ? '(마감)' : ''}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsAddCardOpen(true)}
            disabled={deadlineInfo.isClosed}
            className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-all disabled:opacity-50 shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            새 항목
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="내용 검색..."
            className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-[#dadce0] rounded-xl outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Card List */}
      <main className="px-4 max-w-lg w-full mx-auto space-y-3 flex-1">
        {loading ? (
          <div className="py-12 text-center text-xs text-outline">
            <span className="animate-spin mr-2">⏳</span>
            데이터를 불러오는 중입니다...
          </div>
        ) : displayTasks.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-[#dadce0] shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center text-outline mx-auto">
              <span className="material-symbols-outlined text-2xl">search_off</span>
            </div>
            <div className="text-xs font-bold text-on-surface">배정된 데이터가 없습니다</div>
            <p className="text-[11px] text-outline">
              현재 로그인된 계정({user?.email})으로 배정된 항목이 없거나 검색 결과가 없습니다.
            </p>
            <button
              onClick={logout}
              className="mt-2 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-variant text-xs font-semibold text-on-surface"
            >
              다른 계정으로 로그인
            </button>
          </div>
        ) : (
          displayTasks.map((task, idx) => (
            <div
              key={task.id}
              className="bg-white rounded-2xl border border-[#dadce0] p-4 shadow-2xs space-y-3 hover:shadow-xs transition-shadow"
            >
              {/* Card Title */}
              <div className="flex items-center justify-between pb-2 border-b border-[#f1f3f4]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-sm text-on-surface truncate">
                    {headerCol ? task[headerCol.key] || '제목 없음' : `항목 #${idx + 1}`}
                  </span>
                </div>
              </div>

              {/* Card Fields */}
              <div className="space-y-2.5">
                {visibleColumns.map((col) => {
                  const cfg = columnConfigs[col.key] || { type: 'text' };
                  if (cfg.type === 'cardHeader') return null; // Already rendered in title

                  const val = task[col.key];
                  const strVal = val != null ? String(val) : '';
                  const isLocked = deadlineInfo.isClosed || cfg.type === 'locked';

                  return (
                    <div key={col.key} className="flex flex-col gap-1 text-xs">
                      <span className="text-[11px] font-bold text-outline">{col.title}</span>

                      {cfg.type === 'checkbox' ? (
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            disabled={isLocked}
                            checked={strVal === 'true' || strVal === '1' || strVal === 'Y'}
                            onChange={(e) => updateCell(task.id, col.key, e.target.checked)}
                            className="rounded text-primary focus:ring-primary h-4 w-4"
                          />
                          <span className="text-xs text-on-surface font-medium">
                            {strVal === 'true' || strVal === '1' || strVal === 'Y' ? '완료' : '미완료'}
                          </span>
                        </label>
                      ) : cfg.type === 'select' && cfg.options && cfg.options.length > 0 ? (
                        <select
                          disabled={isLocked}
                          value={strVal}
                          onChange={(e) => updateCell(task.id, col.key, e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-surface-container-low border border-surface-variant rounded-xl outline-none focus:border-primary disabled:opacity-60"
                        >
                          <option value="">(선택 안 됨)</option>
                          {cfg.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : cfg.type === 'priority' ? (
                        <div className="flex gap-1.5 flex-wrap">
                          {['긴급', '높음', '보통', '낮음'].map((p) => (
                            <button
                              key={p}
                              type="button"
                              disabled={isLocked}
                              onClick={() => updateCell(task.id, col.key, p)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                strVal === p
                                  ? 'bg-primary text-white shadow-2xs'
                                  : 'bg-surface-container text-outline hover:bg-surface-variant'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      ) : cfg.type === 'date' ? (
                        <input
                          type="date"
                          disabled={isLocked}
                          value={strVal}
                          onChange={(e) => updateCell(task.id, col.key, e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-surface-container-low border border-surface-variant rounded-xl outline-none focus:border-primary disabled:opacity-60"
                        />
                      ) : (
                        <input
                          type="text"
                          disabled={isLocked}
                          value={strVal}
                          onChange={(e) => updateCell(task.id, col.key, e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-surface-container-low border border-surface-variant rounded-xl outline-none focus:border-primary disabled:opacity-60 font-sans"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Add New Card Modal */}
      {isAddCardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-surface-variant max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-surface-variant flex items-center justify-between bg-surface-container-low">
              <h3 className="font-bold text-sm text-on-surface">새 항목 등록</h3>
              <button
                onClick={() => setIsAddCardOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:bg-surface-variant"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              {visibleColumns.map((col) => {
                const cfg = columnConfigs[col.key] || { type: 'text' };
                if (cfg.type === 'googleId' || cfg.type === 'locked') return null;

                return (
                  <div key={col.key}>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      {col.title}
                    </label>
                    <input
                      type="text"
                      value={newCardData[col.key] || ''}
                      onChange={(e) =>
                        setNewCardData({ ...newCardData, [col.key]: e.target.value })
                      }
                      className="w-full text-xs px-3 py-2 border border-surface-variant rounded-xl outline-none focus:border-primary"
                    />
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3.5 border-t border-surface-variant flex items-center justify-end gap-2 bg-surface-container-low">
              <button
                type="button"
                onClick={() => setIsAddCardOpen(false)}
                className="px-4 py-2 text-xs font-medium text-outline hover:bg-surface-variant rounded-xl"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCreateCard}
                className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-xs"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

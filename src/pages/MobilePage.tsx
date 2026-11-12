import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSheet } from '../hooks/useSheet';
import { useTasks } from '../hooks/useTasks';
import { useAccessibleSheets } from '../hooks/useAccessibleSheets';
import { ColumnDef } from '../types/sheet';

/** 타이핑 중에는 로컬 state만 업데이트하고, 셀을 떠날 때(blur)에만 Firestore에 저장 */
const BlurSaveInput: React.FC<{
  type: 'text' | 'number';
  value: string;
  disabled: boolean;
  className: string;
  placeholder?: string;
  onCommit: (val: string) => void;
}> = ({ type, value, disabled, className, placeholder, onCommit }) => {
  const [local, setLocal] = useState(value);
  const committed = useRef(value);

  // 외부(Firestore 실시간 업데이트)에서 값이 바뀌면 포커스 없을 때만 반영
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocal(value);
      committed.current = value;
    }
  }, [value]);

  const handleBlur = () => {
    if (disabled) return; // 읽기 전용이면 저장 안 함
    if (local !== committed.current) {
      committed.current = local;
      onCommit(local);
    }
  };

  return (
    <input
      ref={inputRef}
      type={type}
      inputMode={type === 'number' ? 'numeric' : undefined}
      disabled={disabled}
      value={local}
      placeholder={placeholder}
      className={className}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={handleBlur}
    />
  );
};

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

  // 1. 내 구글 계정으로 접근 가능한 시트만 실시간 구독
  const { accessibleSheets, countsBySheet, loading: loadingAccessible } =
    useAccessibleSheets(user?.email);

  const { currentSheet, columns, columnConfigs, userViewColumns, userReadOnlyColumns, userStatuses, deadlineInfo } =
    useSheet(currentSheetId);

  // Fetch all tasks for current sheet, filter strictly by googleId column on client
  const { tasks, loading, saving, updateCell, addRow } = useTasks(currentSheetId, null);

  const [search, setSearch] = useState('');
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newCardData, setNewCardData] = useState<Record<string, any>>({});

  // 접근 가능한 시트 중 첫 번째 시트로 자동 선택 (현재 선택된 시트가 목록에 없거나 유효하지 않을 때)
  useEffect(() => {
    if (accessibleSheets.length > 0) {
      const isCurrentValid = accessibleSheets.some((s) => s.id === currentSheetId);
      if (!isCurrentValid) {
        onSelectSheet(accessibleSheets[0].id);
      }
    }
  }, [accessibleSheets, currentSheetId, onSelectSheet]);

  const isUserClosed = useMemo(() => {
    if (!user?.email) return false;
    const myEmail = user.email.trim().toLowerCase();
    return !!userStatuses?.[myEmail]?.inputClosed;
  }, [user?.email, userStatuses]);

  const isSheetEffectivelyClosed = deadlineInfo.isClosed || isUserClosed;
  const googleIdCol = useMemo(() => {
    return columns.find((c) => columnConfigs[c.key]?.type === 'googleId');
  }, [columns, columnConfigs]);

  // 2. Identify the Card Header column (카드 대표 제목)
  const headerCol = useMemo(() => {
    return columns.find((c) => columnConfigs[c.key]?.type === 'cardHeader');
  }, [columns, columnConfigs]);

  // 3. Filter tasks strictly by student Google ID
  const myTasks = useMemo(() => {
    if (!googleIdCol) return [];
    const myEmail = (user?.email || '').trim().toLowerCase();
    return tasks.filter((t) => {
      const val = t[googleIdCol.key];
      if (val == null) return false;
      return String(val).trim().toLowerCase() === myEmail;
    });
  }, [tasks, googleIdCol, user?.email]);

  // 4. Columns to render in the card body:
  // - Exclude googleId (학생 구글 계정 셀은 카드 본문에 표시하지 않음)
  // - Exclude cardHeader (카드 상단 헤더에 이미 표시됨)
  // - Apply userViewColumns visibility
  const bodyColumns = useMemo(() => {
    return columns.filter((col) => {
      const cfg = columnConfigs[col.key] || { type: 'text' };
      // 학생 구글 계정 셀 및 카드 제목 셀 제외
      if (cfg.type === 'googleId' || cfg.type === 'cardHeader') {
        return false;
      }
      // 어드민 사용자 표시 설정 적용
      if (Array.isArray(userViewColumns) && !userViewColumns.includes(col.key)) {
        return false;
      }
      return true;
    });
  }, [columns, columnConfigs, userViewColumns]);

  // Search filtered tasks
  const displayTasks = useMemo(() => {
    if (!search.trim()) return myTasks;
    const q = search.toLowerCase();
    return myTasks.filter((t) =>
      Object.values(t).some((val) => val != null && String(val).toLowerCase().includes(q))
    );
  }, [myTasks, search]);

  const handleCreateCard = async () => {
    if (!googleIdCol) {
      alert('이 시트에는 학생 구글 계정(googleId) 열이 설정되어 있지 않아 카드를 추가할 수 없습니다.');
      return;
    }

    const dataToSave = { ...newCardData };
    // 사용자 구글 계정 자동 입력
    if (user?.email) {
      dataToSave[googleIdCol.key] = user.email;
    }

    await addRow(dataToSave);
    setNewCardData({});
    setIsAddCardOpen(false);
  };

  // Check if column is short (절반 너비: 1행에 2개 셀 배치)
  const isHalfWidth = (col: ColumnDef): boolean => {
    const cfg = columnConfigs[col.key] || { type: 'text' };
    if (cfg.type === 'checkbox' || cfg.type === 'priority' || cfg.type === 'date') {
      return true;
    }
    const width = cfg.width || col.width || 120;
    return width <= 135;
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
            <span className="text-[10px] text-outline font-medium truncate max-w-[200px]">
              {user?.email}
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
            className="text-[11px] text-outline hover:text-red-600 px-2 py-1 rounded-lg border border-surface-variant hover:bg-red-50 transition-colors"
            title="계정 전환"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* Closed Deadline Banner */}
      {isSheetEffectivelyClosed && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center gap-2 text-red-800 text-xs font-semibold">
          <span className="material-symbols-outlined text-base text-red-600">lock</span>
          <span>
            {isUserClosed
              ? '관리자에 의해 입력이 마감되어 현재 읽기 전용입니다.'
              : deadlineInfo.closedMessage || '이 시트는 마감되어 현재 읽기 전용입니다.'}
          </span>
        </div>
      )}

      {/* Sheet Selector & Search Bar */}
      {accessibleSheets.length > 0 && (
        <div className="p-4 space-y-2.5 max-w-lg w-full mx-auto">
          <div className="flex items-center gap-2">
            <select
              value={currentSheetId}
              onChange={(e) => onSelectSheet(e.target.value)}
              className="flex-1 text-xs font-semibold px-3 py-2 bg-white border border-[#dadce0] rounded-xl shadow-2xs outline-none focus:border-primary"
            >
              {accessibleSheets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({countsBySheet[s.id] || 0}건){s.isClosed ? ' - 마감' : ''}
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsAddCardOpen(true)}
              disabled={isSheetEffectivelyClosed || !googleIdCol}
              className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-all disabled:opacity-50 shrink-0 cursor-pointer"
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
      )}

      {/* Card List */}
      <main className="px-4 max-w-lg w-full mx-auto space-y-3 flex-1">
        {loadingAccessible || loading ? (
          <div className="py-12 text-center text-xs text-outline">
            <span className="animate-spin mr-2">⏳</span>
            내게 배정된 시트를 확인하는 중입니다...
          </div>
        ) : accessibleSheets.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-[#dadce0] shadow-2xs space-y-3 mt-8">
            <div className="w-14 h-14 rounded-full bg-surface-variant flex items-center justify-center text-outline mx-auto">
              <span className="material-symbols-outlined text-3xl">search_off</span>
            </div>
            <div className="text-sm font-bold text-on-surface">배정된 시트가 없습니다</div>
            <p className="text-xs text-outline leading-relaxed">
              <strong>{user?.email}</strong> 계정으로<br />
              배정된 데이터가 없습니다.<br />
              관리자에게 문의하세요.
            </p>
            <button
              onClick={logout}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-variant text-xs font-semibold text-on-surface transition-colors cursor-pointer shadow-2xs"
            >
              <span className="material-symbols-outlined text-[16px]">switch_account</span>
              다른 계정으로 로그인
            </button>
          </div>
        ) : !googleIdCol ? (
          <div className="bg-red-50 rounded-2xl p-8 text-center border border-red-200 shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto">
              <span className="material-symbols-outlined text-2xl">block</span>
            </div>
            <div className="text-sm font-bold text-red-800">접근할 수 없는 시트입니다</div>
            <p className="text-xs text-red-600">
              이 시트에는 학생 구글 계정(googleId) 열이 설정되어 있지 않아 모바일 사용자 화면에서 열람할 수 없습니다.
            </p>
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
            <article
              key={task.id}
              className="bg-white rounded-2xl border border-[#dadce0] p-4 shadow-2xs space-y-3 hover:shadow-xs transition-shadow"
            >
              {/* Card Top Title (#1 + cardHeader value) */}
              <div className="flex items-center justify-between pb-2.5 border-b border-[#f1f3f4]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-sm text-on-surface truncate">
                    {headerCol ? task[headerCol.key] || '제목 없음' : `항목 #${idx + 1}`}
                  </span>
                </div>
              </div>

              {/* Card Fields: 2-Column Grid (짧은 열은 col-span-1으로 1행에 2개 셀, 긴 열은 col-span-2) */}
              <div className="grid grid-cols-2 gap-2.5">
                {bodyColumns.map((col) => {
                  const cfg = columnConfigs[col.key] || { type: 'text' };
                  const val = task[col.key];
                  const strVal = val != null ? String(val) : '';
                  const isLocked = isSheetEffectivelyClosed || cfg.type === 'locked' || (userReadOnlyColumns?.includes(col.key) ?? false);
                  const half = isHalfWidth(col);

                  return (
                    <div
                      key={col.key}
                      className={`${half ? 'col-span-1' : 'col-span-2'} flex flex-col gap-1 text-xs`}
                    >
                      <label className="text-[11px] font-semibold text-outline truncate">
                        {col.title}
                      </label>

                      {cfg.type === 'checkbox' ? (
                        <div className="flex items-center h-[38px] px-3 rounded-xl bg-surface-container-low border border-surface-variant shadow-2xs">
                          <label className="flex items-center gap-2 cursor-pointer select-none w-full">
                            <input
                              type="checkbox"
                              disabled={isLocked}
                              checked={strVal === 'true' || strVal === '1' || strVal === 'Y'}
                              onChange={(e) => updateCell(task.id, col.key, e.target.checked)}
                              className="rounded text-primary focus:ring-primary h-4 w-4 accent-primary"
                            />
                            <span className="text-xs font-semibold text-on-surface">
                              {strVal === 'true' || strVal === '1' || strVal === 'Y' ? '완료' : '미완료'}
                            </span>
                          </label>
                        </div>
                      ) : cfg.type === 'select' && cfg.options && cfg.options.length > 0 ? (
                        <select
                          disabled={isLocked}
                          value={strVal}
                          onChange={(e) => updateCell(task.id, col.key, e.target.value)}
                          className="w-full h-[38px] text-xs px-2.5 bg-surface-container-low border border-surface-variant rounded-xl outline-none focus:border-primary disabled:opacity-60 font-medium shadow-2xs"
                        >
                          <option value="">(선택 안 됨)</option>
                          {cfg.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : cfg.type === 'priority' ? (
                        <select
                          disabled={isLocked}
                          value={strVal}
                          onChange={(e) => updateCell(task.id, col.key, e.target.value)}
                          className="w-full h-[38px] text-xs px-2.5 bg-surface-container-low border border-surface-variant rounded-xl outline-none focus:border-primary disabled:opacity-60 font-bold shadow-2xs"
                        >
                          <option value="">(선택 안 됨)</option>
                          {(cfg.options && cfg.options.length > 0
                            ? cfg.options
                            : ['긴급', '높음', '보통', '낮음']
                          ).map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      ) : cfg.type === 'date' ? (
                        <input
                          type="date"
                          disabled={isLocked}
                          value={strVal}
                          onChange={(e) => updateCell(task.id, col.key, e.target.value)}
                          className="w-full h-[38px] text-xs px-2.5 bg-surface-container-low border border-surface-variant rounded-xl outline-none focus:border-primary disabled:opacity-60 font-mono shadow-2xs"
                        />
                      ) : cfg.type === 'number' ? (
                        <BlurSaveInput
                          type="number"
                          disabled={isLocked}
                          value={strVal}
                          onCommit={(val) => updateCell(task.id, col.key, val)}
                          className="w-full h-[38px] text-xs px-2.5 bg-surface-container-low border border-surface-variant rounded-xl outline-none focus:border-primary disabled:opacity-60 font-mono text-right shadow-2xs"
                          placeholder="0"
                        />
                      ) : (
                        <BlurSaveInput
                          type="text"
                          disabled={isLocked}
                          value={strVal}
                          onCommit={(val) => updateCell(task.id, col.key, val)}
                          className="w-full h-[38px] text-xs px-2.5 bg-surface-container-low border border-surface-variant rounded-xl outline-none focus:border-primary disabled:opacity-60 font-sans shadow-2xs"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          ))
        )}
      </main>

      {/* Add New Card Modal */}
      {isAddCardOpen && (
        <div
          onClick={() => setIsAddCardOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-surface-variant max-w-md w-full overflow-hidden flex flex-col max-h-[85vh] cursor-default"
          >
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
              {headerCol && (
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    {headerCol.title} (대표 항목명)
                  </label>
                  <input
                    type="text"
                    value={newCardData[headerCol.key] || ''}
                    onChange={(e) =>
                      setNewCardData({ ...newCardData, [headerCol.key]: e.target.value })
                    }
                    className="w-full text-xs px-3 py-2 border border-surface-variant rounded-xl outline-none focus:border-primary"
                    placeholder="예: 서울대학교 (컴퓨터공학)"
                  />
                </div>
              )}

              {bodyColumns.map((col) => {
                const cfg = columnConfigs[col.key] || { type: 'text' };
                if (cfg.type === 'locked') return null;

                return (
                  <div key={col.key}>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      {col.title}
                    </label>
                    <input
                      type={cfg.type === 'number' ? 'number' : 'text'}
                      inputMode={cfg.type === 'number' ? 'numeric' : undefined}
                      value={newCardData[col.key] || ''}
                      onChange={(e) =>
                        setNewCardData({ ...newCardData, [col.key]: e.target.value })
                      }
                      className={`w-full text-xs px-3 py-2 border border-surface-variant rounded-xl outline-none focus:border-primary ${cfg.type === 'number' ? 'text-right font-mono' : ''
                        }`}
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

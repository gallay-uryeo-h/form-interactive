import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSheet } from '../hooks/useSheet';
import { useTasks } from '../hooks/useTasks';
import { useAccessibleSheets } from '../hooks/useAccessibleSheets';
import { ColumnDef } from '../types/sheet';

/** 타이핑 중에는 로컬 state만 업데이트하고, 셀을 떠날 때(blur)에만 Firestore에 저장 + 시각 피드백 */
const BlurSaveInput: React.FC<{
  type: 'text' | 'number';
  value: string;
  disabled: boolean;
  className: string;
  placeholder?: string;
  onCommit: (val: string) => void;
  showSaveIndicator?: boolean;
}> = ({ type, value, disabled, className, placeholder, onCommit }) => {
  const [local, setLocal] = useState(value);
  const committed = useRef(value);
  const [justSaved, setJustSaved] = useState(false);

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
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    }
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type={type}
        inputMode={type === 'number' ? 'numeric' : undefined}
        disabled={disabled}
        value={local}
        placeholder={placeholder}
        className={`${className} transition-all duration-200 ${
          justSaved ? '!border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30' : ''
        }`}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={handleBlur}
      />
      {justSaved && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-emerald-600 animate-in fade-in zoom-in-75 duration-150 pointer-events-none">
          <span className="material-symbols-outlined text-[16px] font-bold">check_circle</span>
        </span>
      )}
    </div>
  );
};

/** 모바일 친화적 커스텀 스위치 토글 컴포넌트 */
const SwitchToggle: React.FC<{
  checked: boolean;
  disabled?: boolean;
  onChange: (val: boolean) => void;
  label?: string;
}> = ({ checked, disabled, onChange, label }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`w-full h-[40px] px-3 rounded-xl border flex items-center justify-between transition-all select-none ${
        disabled
          ? 'bg-neutral-100 border-neutral-200 opacity-60 cursor-not-allowed'
          : checked
          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 shadow-2xs hover:bg-emerald-100/60 cursor-pointer'
          : 'bg-white border-neutral-200 text-neutral-700 shadow-2xs hover:bg-neutral-50 cursor-pointer'
      }`}
    >
      <span className="text-xs font-semibold flex items-center gap-1.5">
        <span
          className={`material-symbols-outlined text-[16px] ${
            checked ? 'text-emerald-600' : 'text-neutral-400'
          }`}
        >
          {checked ? 'task_alt' : 'radio_button_unchecked'}
        </span>
        {label || (checked ? '완료' : '미완료')}
      </span>

      {/* iOS style Pill Track */}
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-in-out ${
          checked ? 'bg-emerald-500' : 'bg-neutral-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out mt-0.5 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
};

/** 모바일 드롭다운 바텀시트 (Bottom Sheet Select Picker) */
const BottomSheetSelect: React.FC<{
  isOpen: boolean;
  title: string;
  value: string;
  options: string[];
  onSelect: (val: string) => void;
  onClose: () => void;
}> = ({ isOpen, title, value, options, onSelect, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[75vh] animate-in slide-in-from-bottom duration-200 border-t border-neutral-200 pb-safe"
      >
        {/* Handle Bar */}
        <div className="pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1.5 bg-neutral-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-outline font-medium">옵션 선택</span>
            <h4 className="text-sm font-bold text-on-surface">{title}</h4>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-neutral-100"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Options List */}
        <div className="p-3 overflow-y-auto space-y-1.5 flex-1">
          <button
            type="button"
            onClick={() => {
              onSelect('');
              onClose();
            }}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
              !value
                ? 'bg-primary/10 text-primary font-bold border border-primary/20'
                : 'text-neutral-500 hover:bg-neutral-100'
            }`}
          >
            <span>(선택 해제)</span>
            {!value && (
              <span className="material-symbols-outlined text-[18px]">check</span>
            )}
          </button>

          {options.map((opt) => {
            const isSelected = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onSelect(opt);
                  onClose();
                }}
                className={`w-full text-left px-4 py-3.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-primary/10 text-primary font-bold border border-primary/30'
                    : 'text-on-surface hover:bg-neutral-50 active:bg-neutral-100 border border-transparent'
                }`}
              >
                <span className="truncate">{opt}</span>
                {isSelected && (
                  <span className="material-symbols-outlined text-[20px] text-primary">check_circle</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
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

  const {
    currentSheet,
    columns,
    columnConfigs,
    userViewColumns,
    userReadOnlyColumns,
    userStatuses,
    deadlineInfo,
    updateUserStatuses,
  } = useSheet(currentSheetId);

  // Fetch all tasks for current sheet, filter strictly by googleId column on client
  const { tasks, loading, saving, updateCell, addRow } = useTasks(currentSheetId, null);

  const [search, setSearch] = useState('');
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newCardData, setNewCardData] = useState<Record<string, any>>({});

  // 바텀시트 Select 상태
  const [activeSelect, setActiveSelect] = useState<{
    isOpen: boolean;
    taskId: string;
    colKey: string;
    title: string;
    currentValue: string;
    options: string[];
  } | null>(null);

  // 저장 완료 토스트 알림 상태
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  // 접근 가능한 시트 중 첫 번째 시트로 자동 선택 (현재 선택된 시트가 목록에 없거나 유효하지 않을 때)
  useEffect(() => {
    if (accessibleSheets.length > 0) {
      const isCurrentValid = accessibleSheets.some((s) => s.id === currentSheetId);
      if (!isCurrentValid) {
        onSelectSheet(accessibleSheets[0].id);
      }
    }
  }, [accessibleSheets, currentSheetId, onSelectSheet]);

  const myEmail = (user?.email || '').trim().toLowerCase();
  const myUserStatus = userStatuses?.[myEmail];
  const isUserClosed = !!myUserStatus?.inputClosed;
  const isSheetEffectivelyClosed = deadlineInfo.isClosed || isUserClosed;

  // 학생 제출 완료 토글 핸들러
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const handleToggleStudentComplete = async () => {
    if (!myEmail || submittingStatus || deadlineInfo.isClosed) return;
    try {
      setSubmittingStatus(true);
      const nextClosed = !isUserClosed;
      const updatedStatuses = {
        ...userStatuses,
        [myEmail]: {
          ...(myUserStatus || { disconnected: false }),
          inputClosed: nextClosed,
        },
      };
      await updateUserStatuses(updatedStatuses);
      showToast(nextClosed ? '최종 제출이 완료되었습니다! (읽기 모드로 전환됨)' : '입력 수정 상태로 복원되었습니다.');
    } catch (err) {
      console.error(err);
      alert('상태 업데이트에 실패했습니다.');
    } finally {
      setSubmittingStatus(false);
    }
  };

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
    return tasks.filter((t) => {
      const val = t[googleIdCol.key];
      if (val == null) return false;
      return String(val).trim().toLowerCase() === myEmail;
    });
  }, [tasks, googleIdCol, myEmail]);

  // 4. Columns to render in the card body:
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

  const handleCellCommit = (taskId: string, colKey: string, val: any) => {
    updateCell(taskId, colKey, val);
    showToast('저장되었습니다');
  };

  const handleCreateCard = async () => {
    if (!googleIdCol) {
      alert('이 시트에는 학생 구글 계정(googleId) 열이 설정되어 있지 않아 카드를 추가할 수 없습니다.');
      return;
    }

    const dataToSave = { ...newCardData };
    if (user?.email) {
      dataToSave[googleIdCol.key] = user.email;
    }

    await addRow(dataToSave);
    setNewCardData({});
    setIsAddCardOpen(false);
    showToast('새 항목이 등록되었습니다');
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
    <div className="min-h-screen flex flex-col bg-[#f0f4f9] text-[#1f1f1f] pb-24">
      {/* Mobile App Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#dadce0] px-4 py-2.5 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
            <span className="material-symbols-outlined text-[18px]">assignment</span>
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm font-bold text-on-surface truncate">
              {currentSheet?.name || '업무 양식'}
            </h1>
            <span className="text-[10px] text-outline font-medium truncate max-w-[180px]">
              {user?.email}
            </span>
          </div>
        </div>

        {/* Right status & switch account */}
        <div className="flex items-center gap-1.5">
          {saving && (
            <span className="text-[10px] font-mono text-amber-700 font-bold animate-pulse px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200">
              저장 중...
            </span>
          )}
          {onTabChange && user?.isAdmin && (
            <button
              onClick={() => onTabChange('admin')}
              className="text-xs text-primary font-bold px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 cursor-pointer"
            >
              Admin
            </button>
          )}
          <button
            onClick={logout}
            className="text-[11px] text-outline hover:text-red-600 px-2 py-1 rounded-lg border border-surface-variant hover:bg-red-50 transition-colors cursor-pointer"
            title="계정 전환"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* Closed Deadline Banner */}
      {isSheetEffectivelyClosed && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-2 text-amber-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-amber-700">lock</span>
            <span>
              {isUserClosed
                ? '입력이 최종 완료되어 현재 읽기 모드입니다.'
                : deadlineInfo.closedMessage || '이 시트는 마감되어 현재 읽기 전용입니다.'}
            </span>
          </div>
          {/* 학생 본인이 스스로 닫았고 시트 전체 마감이 아닌 경우 다시 수정 허용 */}
          {isUserClosed && !deadlineInfo.isClosed && (
            <button
              onClick={handleToggleStudentComplete}
              disabled={submittingStatus}
              className="text-[11px] text-amber-900 underline hover:text-amber-950 font-bold shrink-0 cursor-pointer"
            >
              수정 재개
            </button>
          )}
        </div>
      )}

      {/* 다중 시트 가로 스크롤 필 탭 바 (Pill Tabs) */}
      {accessibleSheets.length > 0 && (
        <div className="bg-white border-b border-neutral-200/80 px-4 py-2.5 overflow-x-auto no-scrollbar shadow-2xs">
          <div className="flex items-center gap-2 min-w-max max-w-lg mx-auto">
            {accessibleSheets.map((s) => {
              const isSelected = s.id === currentSheetId;
              const count = countsBySheet[s.id] || 0;
              return (
                <button
                  key={s.id}
                  onClick={() => onSelectSheet(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-primary text-white shadow-xs scale-102'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {s.isClosed ? 'lock' : 'description'}
                  </span>
                  <span>{s.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isSelected ? 'bg-white/25 text-white' : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Bar (Search & Add Card & Complete Button) */}
      {accessibleSheets.length > 0 && (
        <div className="p-4 space-y-2.5 max-w-lg w-full mx-auto">
          {/* Top Button Row: Add Card & Complete submission */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddCardOpen(true)}
              disabled={isSheetEffectivelyClosed || !googleIdCol}
              className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              새 항목 추가
            </button>

            {/* 학생 최종 제출 완료 / 수정 토글 버튼 */}
            {!deadlineInfo.isClosed && (
              <button
                onClick={handleToggleStudentComplete}
                disabled={submittingStatus}
                className={`flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-3.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                  isUserClosed
                    ? 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50 shadow-2xs'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-xs'
                }`}
                title={isUserClosed ? '작성 잠금 해제' : '작성 완료 및 잠금'}
              >
                <span className="material-symbols-outlined text-[17px]">
                  {isUserClosed ? 'lock_open' : 'check_circle'}
                </span>
                <span>{isUserClosed ? '수정하기' : '제출 완료'}</span>
              </button>
            )}
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
              className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-[#dadce0] rounded-xl outline-none focus:border-primary shadow-2xs"
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
              className="mt-2 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-variant text-xs font-semibold text-on-surface cursor-pointer"
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
                  const isLocked =
                    isSheetEffectivelyClosed ||
                    cfg.type === 'locked' ||
                    (userReadOnlyColumns?.includes(col.key) ?? false);
                  const half = isHalfWidth(col);

                  return (
                    <div
                      key={col.key}
                      className={`${half ? 'col-span-1' : 'col-span-2'} flex flex-col gap-1 text-xs`}
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold flex items-center gap-1.5 truncate">
                          {!isLocked ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                              <span className="text-on-surface font-bold">{col.title}</span>
                              <span className="text-[9px] font-medium text-primary bg-primary/10 px-1 rounded">입력</span>
                            </>
                          ) : (
                            <span className="text-outline font-medium">{col.title}</span>
                          )}
                        </label>
                        {isLocked && (
                          <span className="material-symbols-outlined text-[13px] text-neutral-400" title="수정 불가 (읽기 전용)">
                            lock
                          </span>
                        )}
                      </div>

                      {/* 1. 체크박스 -> 모바일 커스텀 스위치 토글 */}
                      {cfg.type === 'checkbox' ? (
                        <SwitchToggle
                          checked={strVal === 'true' || strVal === '1' || strVal === 'Y'}
                          disabled={isLocked}
                          onChange={(checked) => handleCellCommit(task.id, col.key, checked)}
                        />
                      ) : /* 2. 드롭다운(Select) -> 모바일 바텀시트 열기 */
                      cfg.type === 'select' && cfg.options && cfg.options.length > 0 ? (
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() =>
                            setActiveSelect({
                              isOpen: true,
                              taskId: task.id,
                              colKey: col.key,
                              title: col.title,
                              currentValue: strVal,
                              options: cfg.options || [],
                            })
                          }
                          className={`w-full h-[40px] text-xs px-3 rounded-xl flex items-center justify-between font-medium shadow-2xs text-left transition-all ${
                            !isLocked
                              ? 'bg-white border border-primary/35 hover:border-primary focus:border-primary ring-1 ring-primary/10 hover:bg-primary/5 cursor-pointer'
                              : 'bg-neutral-100/70 border border-neutral-200 text-neutral-500 opacity-75 cursor-not-allowed'
                          }`}
                        >
                          <span className={`truncate ${strVal ? (!isLocked ? 'text-on-surface font-semibold' : 'text-neutral-600') : 'text-neutral-400'}`}>
                            {strVal || '(선택 안 됨)'}
                          </span>
                          <span className={`material-symbols-outlined text-[18px] shrink-0 ${!isLocked ? 'text-primary' : 'text-neutral-400'}`}>
                            expand_more
                          </span>
                        </button>
                      ) : /* 3. 우선순위 (Priority) -> 모바일 바텀시트 열기 */
                      cfg.type === 'priority' ? (
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() =>
                            setActiveSelect({
                              isOpen: true,
                              taskId: task.id,
                              colKey: col.key,
                              title: col.title,
                              currentValue: strVal,
                              options:
                                cfg.options && cfg.options.length > 0
                                  ? cfg.options
                                  : ['긴급', '높음', '보통', '낮음'],
                            })
                          }
                          className={`w-full h-[40px] text-xs px-3 rounded-xl flex items-center justify-between font-bold shadow-2xs text-left transition-all ${
                            !isLocked
                              ? 'bg-white border border-primary/35 hover:border-primary focus:border-primary ring-1 ring-primary/10 hover:bg-primary/5 cursor-pointer'
                              : 'bg-neutral-100/70 border border-neutral-200 opacity-75 cursor-not-allowed'
                          }`}
                        >
                          <span
                            className={`truncate ${
                              strVal === '긴급'
                                ? 'text-red-600'
                                : strVal === '높음'
                                ? 'text-amber-600'
                                : strVal === '보통'
                                ? 'text-blue-600'
                                : strVal === '낮음'
                                ? 'text-neutral-600'
                                : 'text-neutral-400 font-normal'
                            }`}
                          >
                            {strVal || '(선택 안 됨)'}
                          </span>
                          <span className={`material-symbols-outlined text-[18px] shrink-0 ${!isLocked ? 'text-primary' : 'text-neutral-400'}`}>
                            expand_more
                          </span>
                        </button>
                      ) : /* 4. 날짜 */
                      cfg.type === 'date' ? (
                        <input
                          type="date"
                          disabled={isLocked}
                          value={strVal}
                          onChange={(e) => handleCellCommit(task.id, col.key, e.target.value)}
                          className={`w-full h-[40px] text-xs px-2.5 rounded-xl outline-none font-mono shadow-2xs transition-all ${
                            !isLocked
                              ? 'bg-white border border-primary/35 focus:border-primary focus:ring-2 focus:ring-primary/20 text-on-surface'
                              : 'bg-neutral-100/70 border border-neutral-200 text-neutral-500 opacity-75 cursor-not-allowed'
                          }`}
                        />
                      ) : /* 5. 숫자 -> BlurSaveInput + 그린 피드백 */
                      cfg.type === 'number' ? (
                        <BlurSaveInput
                          type="number"
                          disabled={isLocked}
                          value={strVal}
                          onCommit={(val) => handleCellCommit(task.id, col.key, val)}
                          className={`w-full h-[40px] text-xs px-2.5 rounded-xl outline-none font-mono text-right shadow-2xs transition-all ${
                            !isLocked
                              ? 'bg-white border border-primary/35 focus:border-primary focus:ring-2 focus:ring-primary/20 text-on-surface'
                              : 'bg-neutral-100/70 border border-neutral-200 text-neutral-500 opacity-75 cursor-not-allowed'
                          }`}
                          placeholder={!isLocked ? '0' : '-'}
                        />
                      ) : (
                        /* 6. 일반 텍스트 -> BlurSaveInput + 그린 피드백 */
                        <BlurSaveInput
                          type="text"
                          disabled={isLocked}
                          value={strVal}
                          onCommit={(val) => handleCellCommit(task.id, col.key, val)}
                          className={`w-full h-[40px] text-xs px-2.5 rounded-xl outline-none font-sans shadow-2xs transition-all ${
                            !isLocked
                              ? 'bg-white border border-primary/35 focus:border-primary focus:ring-2 focus:ring-primary/20 text-on-surface'
                              : 'bg-neutral-100/70 border border-neutral-200 text-neutral-500 opacity-75 cursor-not-allowed'
                          }`}
                          placeholder={!isLocked ? '입력하세요' : '-'}
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

      {/* 바텀시트 Select Picker */}
      {activeSelect && (
        <BottomSheetSelect
          isOpen={activeSelect.isOpen}
          title={activeSelect.title}
          value={activeSelect.currentValue}
          options={activeSelect.options}
          onSelect={(selectedVal) => {
            handleCellCommit(activeSelect.taskId, activeSelect.colKey, selectedVal);
          }}
          onClose={() => setActiveSelect(null)}
        />
      )}

      {/* 모바일 하단 플로팅 토스트 스낵바 */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-none">
          <div className="bg-neutral-900/90 backdrop-blur-xs text-white px-4 py-2 rounded-full shadow-lg text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

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
                className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:bg-surface-variant cursor-pointer"
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
                    {cfg.type === 'select' && cfg.options && cfg.options.length > 0 ? (
                      <select
                        value={newCardData[col.key] || ''}
                        onChange={(e) =>
                          setNewCardData({ ...newCardData, [col.key]: e.target.value })
                        }
                        className="w-full text-xs px-3 py-2 border border-surface-variant rounded-xl outline-none focus:border-primary bg-white"
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
                        value={newCardData[col.key] || ''}
                        onChange={(e) =>
                          setNewCardData({ ...newCardData, [col.key]: e.target.value })
                        }
                        className="w-full text-xs px-3 py-2 border border-surface-variant rounded-xl outline-none focus:border-primary bg-white font-bold"
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
                        value={newCardData[col.key] || ''}
                        onChange={(e) =>
                          setNewCardData({ ...newCardData, [col.key]: e.target.value })
                        }
                        className="w-full text-xs px-3 py-2 border border-surface-variant rounded-xl outline-none focus:border-primary font-mono"
                      />
                    ) : (
                      <input
                        type={cfg.type === 'number' ? 'number' : 'text'}
                        inputMode={cfg.type === 'number' ? 'numeric' : undefined}
                        value={newCardData[col.key] || ''}
                        onChange={(e) =>
                          setNewCardData({ ...newCardData, [col.key]: e.target.value })
                        }
                        className={`w-full text-xs px-3 py-2 border border-surface-variant rounded-xl outline-none focus:border-primary ${
                          cfg.type === 'number' ? 'text-right font-mono' : ''
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3.5 border-t border-surface-variant flex items-center justify-end gap-2 bg-surface-container-low">
              <button
                type="button"
                onClick={() => setIsAddCardOpen(false)}
                className="px-4 py-2 text-xs font-medium text-outline hover:bg-surface-variant rounded-xl cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCreateCard}
                className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-xs cursor-pointer"
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

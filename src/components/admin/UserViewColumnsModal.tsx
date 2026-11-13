import React, { useState, useEffect } from 'react';
import { ColumnDef } from '../../types/sheet';

interface UserViewColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnDef[];
  userViewColumns: string[] | null;
  userReadOnlyColumns: string[] | null;
  onSave: (viewCols: string[] | null, readOnlyCols: string[] | null) => Promise<void>;
}

export const UserViewColumnsModal: React.FC<UserViewColumnsModalProps> = ({
  isOpen,
  onClose,
  columns,
  userViewColumns,
  userReadOnlyColumns,
  onSave,
}) => {
  // If userViewColumns is null, all columns are visible by default
  const [selected, setSelected] = useState<string[]>(
    userViewColumns || columns.map((c) => c.key)
  );
  // Read-only column keys on mobile
  const [readOnlyKeys, setReadOnlyKeys] = useState<string[]>(
    userReadOnlyColumns || []
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync state whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setSelected(userViewColumns || columns.map((c) => c.key));
      setReadOnlyKeys(userReadOnlyColumns || []);
      setSearchTerm('');
    }
  }, [isOpen, userViewColumns, userReadOnlyColumns, columns]);

  if (!isOpen) return null;

  // 3단 상태 순환 토글: 숨김(hidden) -> 보기/수정(editable) -> 보기/읽기전용(readonly) -> 숨김...
  const cycleColState = (key: string) => {
    const isVisible = selected.includes(key);
    const isReadOnly = readOnlyKeys.includes(key);

    if (!isVisible) {
      // 숨김 -> 보기(수정 가능)
      setSelected([...selected, key]);
      setReadOnlyKeys(readOnlyKeys.filter((k) => k !== key));
    } else if (!isReadOnly) {
      // 보기(수정 가능) -> 보기(읽기 전용)
      setReadOnlyKeys([...readOnlyKeys, key]);
    } else {
      // 보기(읽기 전용) -> 숨김
      setSelected(selected.filter((k) => k !== key));
      setReadOnlyKeys(readOnlyKeys.filter((k) => k !== key));
    }
  };

  const setColReadOnly = (key: string, isReadOnly: boolean) => {
    if (isReadOnly) {
      if (!readOnlyKeys.includes(key)) {
        setReadOnlyKeys([...readOnlyKeys, key]);
      }
    } else {
      setReadOnlyKeys(readOnlyKeys.filter((k) => k !== key));
    }
  };

  const handleSelectAll = () => {
    setSelected(columns.map((c) => c.key));
  };

  const handleDeselectAll = () => {
    setSelected([]);
  };

  const handleSetAllReadOnly = () => {
    setReadOnlyKeys(selected);
  };

  const handleSetAllEditable = () => {
    setReadOnlyKeys([]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const isAll = selected.length === columns.length;
      // Filter readOnlyKeys to only those that are currently selected/visible
      const validReadOnly = readOnlyKeys.filter((k) => selected.includes(k));
      await onSave(
        isAll ? null : selected,
        validReadOnly.length > 0 ? validReadOnly : null
      );
      onClose();
    } catch (err: any) {
      alert('저장 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredColumns = columns.filter((col) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      col.title.toLowerCase().includes(term) ||
      col.letter.toLowerCase().includes(term) ||
      col.key.toLowerCase().includes(term)
    );
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-surface-variant max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh] cursor-default"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[22px]">devices</span>
            <div>
              <h3 className="font-bold text-sm text-on-surface">모바일 화면 표시 및 수정 권한 설정</h3>
              <p className="text-[11px] text-outline">
                모바일 페이지에 표시할 열과 학생이 직접 수정할 수 있는 열을 선택하세요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:bg-surface-variant transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3.5">
          {/* Search Input */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline">
              search
            </span>
            <input
              type="text"
              placeholder="열 이름 또는 알파벳 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-surface-container-low border border-surface-variant rounded-xl outline-none focus:border-primary"
            />
          </div>

          {/* Quick Select Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1 bg-surface-container-low p-2 rounded-xl border border-surface-variant/60">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-outline">표시:</span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-primary font-bold hover:underline cursor-pointer"
              >
                모두 보이기
              </button>
              <span className="text-outline-variant">|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-outline hover:text-on-surface font-medium hover:underline cursor-pointer"
              >
                모두 숨기기
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-outline">권한:</span>
              <button
                type="button"
                onClick={handleSetAllEditable}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                모두 수정
              </button>
              <span className="text-outline-variant">|</span>
              <button
                type="button"
                onClick={handleSetAllReadOnly}
                className="text-amber-700 font-bold hover:underline cursor-pointer"
              >
                모두 읽기 🔒
              </button>
            </div>
          </div>

          {/* Status Counter */}
          <div className="flex items-center justify-between text-[11px] text-outline px-1">
            <span>
              총 <strong className="text-on-surface">{columns.length}</strong>개 열 중{' '}
              <strong className="text-primary">{selected.length}</strong>개 모바일 표시 (
              <strong className="text-emerald-700">{selected.length - readOnlyKeys.filter((k) => selected.includes(k)).length}</strong>개 수정,{' '}
              <strong className="text-amber-700">{readOnlyKeys.filter((k) => selected.includes(k)).length}</strong>개 읽기)
            </span>
          </div>

          {/* Columns List */}
          <div className="border border-surface-variant rounded-xl p-2 max-h-72 overflow-y-auto space-y-1.5 bg-surface-container-lowest">
            {filteredColumns.length === 0 ? (
              <div className="py-6 text-center text-outline text-xs">
                검색된 열이 없습니다.
              </div>
            ) : (
              filteredColumns.map((col) => {
                const isChecked = selected.includes(col.key);
                const isReadOnly = readOnlyKeys.includes(col.key);

                return (
                  <div
                    key={col.key}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-colors ${
                      isChecked
                        ? isReadOnly
                          ? 'bg-amber-50/60 border-amber-200 text-on-surface'
                          : 'bg-primary/5 border-primary/20 text-on-surface'
                        : 'hover:bg-surface-container border-surface-variant/40 text-outline opacity-60'
                    }`}
                  >
                    {/* Left: Column Letter & Title (Click to cycle state) */}
                    <div
                      onClick={() => cycleColState(col.key)}
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer select-none py-0.5 flex-1 mr-2"
                    >
                      <span className="w-5 text-outline font-mono text-[10px] font-bold shrink-0">
                        [{col.letter}]
                      </span>
                      <span className="truncate font-semibold">{col.title}</span>
                    </div>

                    {/* Right: State badge button with 3-segment toggle control */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Segmented Control: [숨김 👁️‍🗨️] [수정 ✏️] [읽기 🔒] */}
                      <div className="flex items-center rounded-xl border border-surface-variant p-0.5 bg-white shadow-2xs">
                        {/* 1. Hide Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(selected.filter((k) => k !== col.key));
                            setReadOnlyKeys(readOnlyKeys.filter((k) => k !== col.key));
                          }}
                          className={`flex items-center justify-center w-7 h-6 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            !isChecked
                              ? 'bg-surface-variant text-outline shadow-xs'
                              : 'text-outline hover:text-on-surface hover:bg-surface-container'
                          }`}
                          title="모바일 숨김: 모바일 카드에서 이 열을 보이지 않게 합니다."
                        >
                          <span className="material-symbols-outlined text-[15px]">visibility_off</span>
                        </button>

                        {/* 2. Editable Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (!isChecked) setSelected([...selected, col.key]);
                            setReadOnlyKeys(readOnlyKeys.filter((k) => k !== col.key));
                          }}
                          className={`flex items-center justify-center w-7 h-6 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isChecked && !isReadOnly
                              ? 'bg-emerald-100 text-emerald-800 shadow-xs'
                              : 'text-outline hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title="모바일 표시 및 수정: 모바일에서 값을 직접 수정할 수 있습니다."
                        >
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                        </button>

                        {/* 3. Read-Only Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (!isChecked) setSelected([...selected, col.key]);
                            if (!readOnlyKeys.includes(col.key)) setReadOnlyKeys([...readOnlyKeys, col.key]);
                          }}
                          className={`flex items-center justify-center w-7 h-6 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isChecked && isReadOnly
                              ? 'bg-amber-100 text-amber-900 shadow-xs'
                              : 'text-outline hover:text-amber-800 hover:bg-amber-50'
                          }`}
                          title="모바일 표시 및 읽기: 모바일에서 값을 볼 수만 있고 수정은 불가합니다."
                        >
                          <span className="material-symbols-outlined text-[15px]">lock</span>
                        </button>
                      </div>

                      {/* Status Text Badge */}
                      <span
                        onClick={() => cycleColState(col.key)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg font-bold cursor-pointer select-none transition-colors ${
                          !isChecked
                            ? 'bg-surface-container text-outline'
                            : isReadOnly
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}
                        title="클릭하여 상태 순환 (숨김 → 수정 → 읽기)"
                      >
                        {!isChecked ? '숨김' : isReadOnly ? '읽기' : '수정'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-surface-variant flex items-center justify-end gap-2 bg-surface-container-low">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-outline hover:bg-surface-variant rounded-xl transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </div>
    </div>
  );
};

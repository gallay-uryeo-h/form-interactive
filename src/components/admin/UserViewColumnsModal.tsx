import React, { useState, useEffect } from 'react';
import { ColumnDef } from '../../types/sheet';

interface UserViewColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnDef[];
  userViewColumns: string[] | null;
  onSave: (cols: string[] | null) => Promise<void>;
}

export const UserViewColumnsModal: React.FC<UserViewColumnsModalProps> = ({
  isOpen,
  onClose,
  columns,
  userViewColumns,
  onSave,
}) => {
  // If userViewColumns is null, all columns are visible by default
  const [selected, setSelected] = useState<string[]>(
    userViewColumns || columns.map((c) => c.key)
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync state whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setSelected(userViewColumns || columns.map((c) => c.key));
      setSearchTerm('');
    }
  }, [isOpen, userViewColumns, columns]);

  if (!isOpen) return null;

  const toggleCol = (key: string) => {
    if (selected.includes(key)) {
      setSelected(selected.filter((k) => k !== key));
    } else {
      setSelected([...selected, key]);
    }
  };

  const handleSelectAll = () => {
    setSelected(columns.map((c) => c.key));
  };

  const handleDeselectAll = () => {
    setSelected([]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const isAll = selected.length === columns.length;
      await onSave(isAll ? null : selected);
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
        className="bg-white rounded-2xl shadow-2xl border border-surface-variant max-w-md w-full overflow-hidden flex flex-col max-h-[85vh] cursor-default"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">visibility</span>
            <div>
              <h3 className="font-bold text-sm text-on-surface">사용자(모바일) 화면 열 표시 설정</h3>
              <p className="text-[11px] text-outline">
                선택된 열만 학생/사용자 모바일 화면 카드에 표시됩니다.
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
        <div className="p-4 overflow-y-auto space-y-3">
          {/* Search Input */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline">
              search
            </span>
            <input
              type="text"
              placeholder="열 이름 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-surface-container-low border border-surface-variant rounded-xl outline-none focus:border-primary"
            />
          </div>

          {/* Quick Select Actions */}
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-2">
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
            <span className="text-outline font-semibold">
              <strong className="text-primary">{selected.length}</strong> / {columns.length}개 표시
            </span>
          </div>

          {/* Columns Checkbox List */}
          <div className="border border-surface-variant rounded-xl p-2 max-h-72 overflow-y-auto space-y-1 bg-surface-container-lowest">
            {filteredColumns.length === 0 ? (
              <div className="py-6 text-center text-outline text-xs">
                검색된 열이 없습니다.
              </div>
            ) : (
              filteredColumns.map((col) => {
                const isChecked = selected.includes(col.key);
                return (
                  <label
                    key={col.key}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer select-none text-xs transition-colors ${
                      isChecked
                        ? 'bg-primary/5 border border-primary/20 text-on-surface font-semibold'
                        : 'hover:bg-surface-container border border-transparent text-outline'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCol(col.key)}
                        className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      />
                      <span className="w-5 text-outline font-mono text-[10px] font-bold shrink-0">
                        [{col.letter}]
                      </span>
                      <span className="truncate">{col.title}</span>
                    </div>
                    <span className="text-[10px] font-normal text-outline shrink-0 ml-2">
                      {isChecked ? '모바일 표시됨' : '숨김'}
                    </span>
                  </label>
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
            {saving ? '저장 중...' : '적용'}
          </button>
        </div>
      </div>
    </div>
  );
};

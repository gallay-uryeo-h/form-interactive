import React, { useState } from 'react';
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
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const toggleCol = (key: string) => {
    if (selected.includes(key)) {
      setSelected(selected.filter((k) => k !== key));
    } else {
      setSelected([...selected, key]);
    }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-surface-variant max-w-sm w-full overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 border-b border-surface-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">visibility</span>
            <h3 className="font-bold text-sm text-on-surface">사용자 화면 열 표시 설정</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:bg-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3">
          <p className="text-xs text-outline">
            체크된 열만 모바일 사용자 폼 화면에 표시됩니다. 체크 해제된 열은 관리자 전용으로 숨겨집니다.
          </p>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setSelected(columns.map((c) => c.key))}
              className="text-primary font-bold hover:underline"
            >
              모든 열 보이기
            </button>
            <span className="text-outline font-medium">
              {selected.length} / {columns.length}개 표시 중
            </span>
          </div>

          <div className="border border-surface-variant rounded-xl p-2 max-h-56 overflow-y-auto space-y-1 bg-surface-container-low">
            {columns.map((col) => (
              <label
                key={col.key}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white cursor-pointer select-none text-xs text-on-surface"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(col.key)}
                  onChange={() => toggleCol(col.key)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span className="w-5 text-outline font-mono text-[10px] font-bold">[{col.letter}]</span>
                <span className="truncate font-semibold">{col.title}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-surface-variant flex items-center justify-end gap-2 bg-surface-container-low">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-outline hover:bg-surface-variant rounded-xl transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            {saving ? '저장 중...' : '적용'}
          </button>
        </div>
      </div>
    </div>
  );
};

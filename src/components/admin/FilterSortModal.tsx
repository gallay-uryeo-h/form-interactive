import React, { useState, useMemo } from 'react';
import { Task, FilterSortState } from '../../types/task';

interface FilterSortModalProps {
  isOpen: boolean;
  onClose: () => void;
  colKey: string;
  colTitle: string;
  tasks: Task[];
  filterSortState: FilterSortState;
  onApply: (state: FilterSortState) => void;
}

export const FilterSortModal: React.FC<FilterSortModalProps> = ({
  isOpen,
  onClose,
  colKey,
  colTitle,
  tasks,
  filterSortState,
  onApply,
}) => {
  const [search, setSearch] = useState('');

  // Extract unique values from tasks
  const uniqueValues = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      const val = t[colKey];
      const str = val != null && String(val).trim() !== '' ? String(val) : '(비어 있음)';
      set.add(str);
    });
    return Array.from(set).sort((a, b) => {
      if (a === '(비어 있음)') return 1;
      if (b === '(비어 있음)') return -1;
      return a.localeCompare(b, 'ko');
    });
  }, [tasks, colKey]);

  // Selected values
  const currentSelected = filterSortState.filters[colKey] || uniqueValues;
  const [selected, setSelected] = useState<string[]>(currentSelected);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(
    filterSortState.sortCol === colKey ? filterSortState.sortDir : null
  );

  if (!isOpen) return null;

  const filteredList = uniqueValues.filter((v) =>
    v.toLowerCase().includes(search.toLowerCase())
  );

  const toggleValue = (val: string) => {
    if (selected.includes(val)) {
      setSelected(selected.filter((s) => s !== val));
    } else {
      setSelected([...selected, val]);
    }
  };

  const handleApply = () => {
    const newFilters = { ...filterSortState.filters };
    if (selected.length === uniqueValues.length) {
      delete newFilters[colKey]; // All selected = no filter
    } else {
      newFilters[colKey] = selected;
    }

    onApply({
      sortCol: sortDir ? colKey : null,
      sortDir: sortDir,
      filters: newFilters,
    });
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-surface-variant max-w-sm w-full overflow-hidden flex flex-col max-h-[85vh] cursor-default"
      >
        <div className="px-5 py-4 border-b border-surface-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">filter_list</span>
            <h3 className="font-bold text-sm text-on-surface truncate">[{colTitle}] 정렬 및 필터</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:bg-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Sort Buttons */}
          <div>
            <div className="text-xs font-bold text-on-surface mb-2">정렬 기준</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSortDir(sortDir === 'asc' ? null : 'asc')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  sortDir === 'asc'
                    ? 'border-primary bg-primary text-white shadow-2xs'
                    : 'border-surface-variant hover:bg-surface-variant text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                오름차순 (A ➔ Z)
              </button>
              <button
                type="button"
                onClick={() => setSortDir(sortDir === 'desc' ? null : 'desc')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  sortDir === 'desc'
                    ? 'border-primary bg-primary text-white shadow-2xs'
                    : 'border-surface-variant hover:bg-surface-variant text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                내림차순 (Z ➔ A)
              </button>
            </div>
          </div>

          {/* Value Filters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-on-surface">값 필터링 ({selected.length}/{uniqueValues.length})</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelected([...uniqueValues])}
                  className="text-[11px] text-primary hover:underline font-semibold"
                >
                  모두 선택
                </button>
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="text-[11px] text-outline hover:underline font-semibold"
                >
                  모두 지우기
                </button>
              </div>
            </div>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="검색..."
              className="w-full text-xs px-3 py-1.5 border border-surface-variant rounded-xl mb-2 focus:border-primary outline-none"
            />

            <div className="border border-surface-variant rounded-xl p-2 max-h-48 overflow-y-auto space-y-1 bg-surface-container-low">
              {filteredList.map((val) => (
                <label
                  key={val}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer select-none text-xs text-on-surface"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(val)}
                    onChange={() => toggleValue(val)}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="truncate">{val}</span>
                </label>
              ))}
              {filteredList.length === 0 && (
                <div className="text-center py-4 text-xs text-outline">일치하는 값이 없습니다.</div>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-surface-variant flex items-center justify-end gap-2 bg-surface-container-low">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-outline hover:bg-surface-variant rounded-xl transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-xs transition-colors"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ColumnDef, ColumnConfig, AVAILABLE_TYPES } from '../../types/sheet';
import { Task } from '../../types/task';

interface SpreadsheetGridProps {
  columns: ColumnDef[];
  tasks: Task[];
  columnConfigs: Record<string, ColumnConfig>;
  userViewColumns: string[] | null;
  onUpdateCell: (taskId: string, colKey: string, value: any) => Promise<void>;
  onDeleteRow: (taskId: string) => Promise<void>;
  onAddRow: () => Promise<void>;
  onAddColumn: (title: string, insertIndex?: number) => Promise<void>;
  onDeleteColumn?: (colKey: string) => Promise<void>;
  onUpdateColumnTitle?: (colKey: string, newTitle: string) => Promise<void>;
  onUpdateColumnWidth: (colKey: string, width: number) => Promise<void>;
  onUpdateColumnOrder: (newOrder: string[]) => Promise<void>;
  onOpenTypeConfig: (colKey: string, colTitle: string) => void;
  onOpenFilterSort: (colKey: string, colTitle: string) => void;
}

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  columns,
  tasks,
  columnConfigs,
  userViewColumns,
  onUpdateCell,
  onDeleteRow,
  onAddRow,
  onAddColumn,
  onDeleteColumn,
  onUpdateColumnTitle,
  onUpdateColumnWidth,
  onUpdateColumnOrder,
  onOpenTypeConfig,
  onOpenFilterSort,
}) => {
  // Active selected cell: { rIdx, cIdx }
  const [activeCell, setActiveCell] = useState<{ rIdx: number; cIdx: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rIdx: number; cIdx: number; initialChar?: string } | null>(null);

  // Column Resizing State (using direct overlay guide line for 60fps buttery smooth performance)
  const [resizingActive, setResizingActive] = useState<{
    key: string;
    letter: string;
    startX: number;
    startWidth: number;
    currentWidth: number;
    currentX: number;
  } | null>(null);

  // Column Drag & Drop Reordering State
  const [draggedColKey, setDraggedColKey] = useState<string | null>(null);
  const [dragOverColKey, setDragOverColKey] = useState<string | null>(null);

  // Column Title Inline Edit State
  const [editingHeaderKey, setEditingHeaderKey] = useState<string | null>(null);
  const [headerEditTitle, setHeaderEditTitle] = useState<string>('');

  // Column Header Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    colKey: string;
    colTitle: string;
    colIndex: number;
    letter: string;
  } | null>(null);

  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Close Context Menu on Global Click / Escape / Scroll
  useEffect(() => {
    if (!contextMenu) return;

    const handleCloseMenu = () => setContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };

    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleCloseMenu, true);

    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleCloseMenu, true);
    };
  }, [contextMenu]);

  // Open Header Context Menu Helper
  const handleHeaderContextMenu = useCallback((e: React.MouseEvent, col: ColumnDef, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 230;
    const menuHeight = 280;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
    setContextMenu({
      x: Math.max(10, x),
      y: Math.max(10, y),
      colKey: col.key,
      colTitle: col.title,
      colIndex: idx,
      letter: col.letter,
    });
  }, []);

  // Handle Global Mouse Movements for Column Resizing
  useEffect(() => {
    if (!resizingActive) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizingActive.startX;
      const newWidth = Math.max(50, Math.min(800, resizingActive.startWidth + deltaX));
      setResizingActive((prev) =>
        prev ? { ...prev, currentWidth: newWidth, currentX: e.clientX } : null
      );
    };

    const handleMouseUp = async (e: MouseEvent) => {
      const deltaX = e.clientX - resizingActive.startX;
      const finalWidth = Math.max(50, Math.min(800, resizingActive.startWidth + deltaX));
      const colKey = resizingActive.key;
      setResizingActive(null);
      await onUpdateColumnWidth(colKey, finalWidth);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingActive, onUpdateColumnWidth]);

  // Cell Edit Actions
  const startCellEdit = useCallback((rIdx: number, cIdx: number, initialChar?: string) => {
    const task = tasks[rIdx];
    const col = columns[cIdx];
    if (!task || !col) return;
    const cfg = columnConfigs[col.key] || { type: 'text' };
    if (cfg.type === 'locked') return;

    setEditingCell({ rIdx, cIdx, initialChar });
    setActiveCell({ rIdx, cIdx });
  }, [tasks, columns, columnConfigs]);

  const commitCellEdit = useCallback(async (rIdx: number, cIdx: number, val: string, moveDirection?: 'down' | 'right') => {
    setEditingCell(null);
    const task = tasks[rIdx];
    const col = columns[cIdx];
    if (task && col) {
      await onUpdateCell(task.id, col.key, val);
    }
    if (moveDirection === 'down' && rIdx < tasks.length - 1) {
      setActiveCell({ rIdx: rIdx + 1, cIdx });
    } else if (moveDirection === 'right' && cIdx < columns.length - 1) {
      setActiveCell({ rIdx, cIdx: cIdx + 1 });
    }
  }, [tasks, columns, onUpdateCell]);

  const cancelCellEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  // Handle Keyboard Navigation (Google Sheets style)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingCell) return; // Handled directly inside CellEditor

    if (!activeCell) return;

    const { rIdx, cIdx } = activeCell;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (rIdx < tasks.length - 1) setActiveCell({ rIdx: rIdx + 1, cIdx });
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (rIdx > 0) setActiveCell({ rIdx: rIdx - 1, cIdx });
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (cIdx < columns.length - 1) setActiveCell({ rIdx, cIdx: cIdx + 1 });
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (cIdx > 0) setActiveCell({ rIdx, cIdx: cIdx - 1 });
        break;
      case 'Enter':
      case 'F2':
        e.preventDefault();
        startCellEdit(rIdx, cIdx);
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          if (cIdx > 0) setActiveCell({ rIdx, cIdx: cIdx - 1 });
        } else {
          if (cIdx < columns.length - 1) setActiveCell({ rIdx, cIdx: cIdx + 1 });
        }
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        const task = tasks[rIdx];
        const col = columns[cIdx];
        if (task && col) {
          onUpdateCell(task.id, col.key, '');
        }
        break;
      default:
        // Direct typing support
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          startCellEdit(rIdx, cIdx, e.key);
        }
        break;
    }
  };

  // Start column resize on handle mousedown
  const handleResizeStart = (e: React.MouseEvent, col: ColumnDef) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingActive({
      key: col.key,
      letter: col.letter,
      startX: e.clientX,
      startWidth: col.width || 120,
      currentWidth: col.width || 120,
      currentX: e.clientX,
    });
  };

  // Double click on resize handle -> auto fit
  const handleResizeDoubleClick = async (e: React.MouseEvent, col: ColumnDef) => {
    e.stopPropagation();
    let maxLen = (col.title || '').length;
    tasks.forEach((t) => {
      const val = t[col.key];
      if (val != null) maxLen = Math.max(maxLen, String(val).length);
    });
    const autoWidth = Math.max(80, Math.min(500, maxLen * 11 + 40));
    await onUpdateColumnWidth(col.key, autoWidth);
  };

  // Column Drag & Drop Reorder Handlers
  const handleDragStart = (e: React.DragEvent, colKey: string) => {
    e.dataTransfer.setData('text/plain', colKey);
    setDraggedColKey(colKey);
  };

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    if (dragOverColKey !== colKey) {
      setDragOverColKey(colKey);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetColKey: string) => {
    e.preventDefault();
    setDragOverColKey(null);
    if (!draggedColKey || draggedColKey === targetColKey) return;

    const oldIndex = columns.findIndex((c) => c.key === draggedColKey);
    const newIndex = columns.findIndex((c) => c.key === targetColKey);
    if (oldIndex < 0 || newIndex < 0) return;

    const newCols = [...columns];
    const [moved] = newCols.splice(oldIndex, 1);
    newCols.splice(newIndex, 0, moved);

    setDraggedColKey(null);
    await onUpdateColumnOrder(newCols.map((c) => c.key));
  };

  // Memoized Callbacks for Row Items to avoid unnecessary row re-renders
  const handleCellClick = useCallback((rIdx: number, cIdx: number) => {
    setActiveCell({ rIdx, cIdx });
  }, []);

  const handleCellDoubleClick = useCallback((rIdx: number, cIdx: number) => {
    startCellEdit(rIdx, cIdx);
  }, [startCellEdit]);

  const handleToggleCheckbox = useCallback(async (taskId: string, colKey: string, checked: boolean) => {
    await onUpdateCell(taskId, colKey, checked);
  }, [onUpdateCell]);

  const handleDeleteRowClick = useCallback((taskId: string, rIdx: number) => {
    if (confirm(`${rIdx + 1}번 행 데이터를 삭제하시겠습니까?`)) {
      onDeleteRow(taskId);
    }
  }, [onDeleteRow]);

  return (
    <div
      ref={gridContainerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="flex-1 overflow-auto outline-none select-none relative bg-surface-container-lowest"
    >
      <table className="border-collapse table-fixed w-full text-xs">
        {/* Colgroup */}
        <colgroup>
          <col style={{ width: '44px' }} /> {/* Row Number Column */}
          {columns.map((col) => {
            const width = col.width || 120;
            return <col key={col.key} style={{ width: `${width}px` }} />;
          })}
          <col style={{ width: '56px' }} /> {/* Delete row action */}
        </colgroup>

        {/* Sticky Table Header */}
        <thead className="sticky top-0 z-20 bg-surface-container-low shadow-2xs border-b border-surface-variant font-medium">
          {/* Row 1: Type Row Chips */}
          <tr className="h-7 border-b border-surface-variant text-[10px] bg-surface-container-low">
            <th className="border-r border-surface-variant text-center text-outline w-11">
              <span className="material-symbols-outlined text-[13px]">tune</span>
            </th>
            {columns.map((col, idx) => {
              const cfg = columnConfigs[col.key] || { type: 'text' };
              const typeInfo = AVAILABLE_TYPES.find((t) => t.id === cfg.type) || AVAILABLE_TYPES[0];
              const isHidden = Array.isArray(userViewColumns) && !userViewColumns.includes(col.key);

              return (
                <th
                  key={col.key}
                  onContextMenu={(e) => handleHeaderContextMenu(e, col, idx)}
                  className="px-1 border-r border-surface-variant relative overflow-visible group"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTypeConfig(col.key, col.title);
                    }}
                    onContextMenu={(e) => handleHeaderContextMenu(e, col, idx)}
                    className={`w-full flex items-center justify-between px-1.5 py-0.5 rounded transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98] ${
                      cfg.type === 'googleId'
                        ? 'text-[#1a73e8] bg-[#f8fafd] border border-[#dadce0] font-bold'
                        : cfg.type === 'cardHeader'
                        ? 'text-indigo-700 bg-indigo-50 border border-indigo-200 font-bold'
                        : cfg.type === 'select' || cfg.type === 'priority'
                        ? 'text-primary bg-primary/10 border border-primary/20 font-bold'
                        : 'text-on-surface bg-surface-container border border-surface-variant font-medium'
                    }`}
                    title={`클릭하여 [${col.title}] 데이터 타입 및 옵션 설정 (우클릭: 열 메뉴)`}
                  >
                    <span className="flex items-center gap-1 min-w-0 truncate text-[10px]">
                      <span className="material-symbols-outlined text-[12px] shrink-0">{typeInfo.icon}</span>
                      <span className="truncate font-semibold">{typeInfo.label}</span>
                      {cfg.options && cfg.options.length > 0 && (
                        <span className="text-[9px] px-1 bg-black/5 rounded font-bold">
                          {cfg.options.length}
                        </span>
                      )}
                      {isHidden && (
                        <span
                          className="material-symbols-outlined text-[11px] text-outline ml-0.5"
                          title="사용자 폼 화면에서 숨김"
                        >
                          visibility_off
                        </span>
                      )}
                    </span>
                    <span className="material-symbols-outlined text-[13px] opacity-70">arrow_drop_down</span>
                  </button>

                  {/* Resizer Handle on TypeRow */}
                  <div
                    onMouseDown={(e) => handleResizeStart(e, col)}
                    onDoubleClick={(e) => handleResizeDoubleClick(e, col)}
                    className="absolute top-0 bottom-0 -right-1 w-2.5 cursor-col-resize hover:bg-primary/50 active:bg-primary z-30 transition-colors"
                    title={`드래그하여 [${col.letter}열] 너비 조절`}
                  />
                </th>
              );
            })}
            <th className="text-center text-outline text-[10px] w-14">
              <button
                type="button"
                onClick={() => {
                  const title = prompt('추가할 새 열의 이름을 입력하세요:');
                  if (title && title.trim()) onAddColumn(title.trim());
                }}
                className="w-full h-full flex items-center justify-center hover:bg-primary/10 text-primary transition-colors cursor-pointer"
                title="새 열 추가"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
              </button>
            </th>
          </tr>

          {/* Row 2: Header Label Row (A, B, C...) */}
          <tr className="h-7 text-[11px] bg-surface-container">
            <th className="border-r border-surface-variant text-center text-outline">#</th>
            {columns.map((col, idx) => {
              const isDragging = draggedColKey === col.key;
              const isDragOver = dragOverColKey === col.key;

              return (
                <th
                  key={col.key}
                  draggable
                  onDragStart={(e) => handleDragStart(e, col.key)}
                  onDragOver={(e) => handleDragOver(e, col.key)}
                  onDrop={(e) => handleDrop(e, col.key)}
                  onContextMenu={(e) => handleHeaderContextMenu(e, col, idx)}
                  className={`px-1.5 py-0.5 border-r border-surface-variant relative group overflow-visible transition-colors ${
                    isDragging ? 'opacity-40 bg-primary/10' : ''
                  } ${isDragOver ? 'border-l-2 border-l-primary bg-primary/5' : ''}`}
                >
                  <div className="flex items-center justify-between gap-1 w-full h-full">
                    {/* Left: Drag handle + Letter + Title */}
                    <div className="flex items-center gap-1 min-w-0 truncate">
                      <span className="material-symbols-outlined text-[12px] text-outline opacity-40 group-hover:opacity-100 cursor-grab shrink-0">
                        drag_indicator
                      </span>
                      <span className="font-mono text-[10px] font-bold text-outline shrink-0">
                        {col.letter}
                      </span>

                      {editingHeaderKey === col.key ? (
                        <input
                          type="text"
                          value={headerEditTitle}
                          autoFocus
                          onChange={(e) => setHeaderEditTitle(e.target.value)}
                          onBlur={async () => {
                            setEditingHeaderKey(null);
                            if (headerEditTitle.trim() && headerEditTitle !== col.title) {
                              if (onUpdateColumnTitle) {
                                await onUpdateColumnTitle(col.key, headerEditTitle.trim());
                              } else {
                                await onOpenTypeConfig(col.key, headerEditTitle.trim());
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            } else if (e.key === 'Escape') {
                              setEditingHeaderKey(null);
                            }
                          }}
                          className="text-[11px] font-bold text-on-surface bg-white border border-primary rounded px-1 outline-none w-full"
                        />
                      ) : (
                        <span
                          onDoubleClick={() => {
                            setEditingHeaderKey(col.key);
                            setHeaderEditTitle(col.title);
                          }}
                          className="truncate font-semibold text-on-surface hover:text-primary cursor-pointer"
                          title="더블클릭 또는 우클릭으로 이름 변경"
                        >
                          {col.title}
                        </span>
                      )}
                    </div>

                    {/* Right: Filter & Sort Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenFilterSort(col.key, col.title);
                      }}
                      className="w-5 h-5 rounded flex items-center justify-center text-outline hover:text-primary hover:bg-black/5 transition-colors cursor-pointer shrink-0"
                      title="정렬 및 필터"
                    >
                      <span className="material-symbols-outlined text-[14px]">filter_alt</span>
                    </button>
                  </div>

                  {/* Resizer Handle on HeaderLabelRow */}
                  <div
                    onMouseDown={(e) => handleResizeStart(e, col)}
                    onDoubleClick={(e) => handleResizeDoubleClick(e, col)}
                    className="absolute top-0 bottom-0 -right-1 w-2.5 cursor-col-resize hover:bg-primary/50 active:bg-primary z-30 transition-colors"
                    title={`드래그하여 [${col.letter}열] 너비 조절 (더블클릭: 자동 맞춤)`}
                  />
                </th>
              );
            })}
            <th className="text-center text-outline text-[11px]">작업</th>
          </tr>
        </thead>

        {/* Table Body - Memoized Rows for Pure Speed */}
        <tbody className="divide-y divide-surface-variant font-mono">
          {tasks.map((task, rIdx) => {
            const isActiveRow = activeCell?.rIdx === rIdx;
            const isEditingRow = editingCell?.rIdx === rIdx;

            return (
              <GridRow
                key={task.id}
                task={task}
                rIdx={rIdx}
                columns={columns}
                columnConfigs={columnConfigs}
                activeColIdx={isActiveRow ? activeCell.cIdx : null}
                editingColIdx={isEditingRow ? editingCell.cIdx : null}
                initialEditValue={isEditingRow ? editingCell.initialChar : undefined}
                onCellClick={handleCellClick}
                onCellDoubleClick={handleCellDoubleClick}
                onCommitCellEdit={commitCellEdit}
                onCancelCellEdit={cancelCellEdit}
                onToggleCheckbox={handleToggleCheckbox}
                onDeleteRow={handleDeleteRowClick}
              />
            );
          })}

          {/* Add Row Button Row */}
          <tr>
            <td colSpan={columns.length + 2} className="p-2 text-center bg-surface-container-low/30">
              <button
                type="button"
                onClick={onAddRow}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border border-dashed border-outline-variant hover:border-primary hover:bg-primary/5 text-primary text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>+ 새 행 추가
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 60FPS High Performance Resizing Guide Overlay */}
      {resizingActive && (
        <div
          className="fixed top-0 bottom-0 w-[2px] bg-primary z-50 pointer-events-none"
          style={{ left: `${resizingActive.currentX}px` }}
        >
          <div className="absolute top-12 left-1.5 bg-primary text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap">
            {resizingActive.letter}열: {resizingActive.currentWidth}px
          </div>
        </div>
      )}

      {/* Column Header Right-Click Context Menu */}
      {contextMenu && (
        <>
          {/* Backdrop to close menu on click */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            className="fixed z-50 bg-white border border-surface-variant rounded-xl shadow-2xl py-1.5 min-w-[210px] text-xs font-medium text-on-surface select-none animate-in fade-in zoom-in-95 duration-75"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header info chip */}
            <div className="px-3 py-1.5 border-b border-surface-variant/70 flex items-center justify-between text-outline bg-surface-container-low/60 rounded-t-lg">
              <span className="font-bold text-on-surface truncate text-[11px]">
                {contextMenu.letter}열: {contextMenu.colTitle}
              </span>
              <span className="text-[10px] font-mono text-outline">#{contextMenu.colIndex + 1}</span>
            </div>

            {/* Insert Column Left */}
            <button
              type="button"
              onClick={async () => {
                const targetIdx = contextMenu.colIndex;
                const refTitle = contextMenu.colTitle;
                setContextMenu(null);
                const title = prompt(`'${refTitle}' 왼쪽에 추가할 열 이름을 입력하세요:`);
                if (title && title.trim()) {
                  await onAddColumn(title.trim(), targetIdx);
                }
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-primary/10 hover:text-primary transition-colors text-left cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px] text-primary">arrow_left_alt</span>
              <span>왼쪽에 1개 열 삽입</span>
            </button>

            {/* Insert Column Right */}
            <button
              type="button"
              onClick={async () => {
                const targetIdx = contextMenu.colIndex + 1;
                const refTitle = contextMenu.colTitle;
                setContextMenu(null);
                const title = prompt(`'${refTitle}' 오른쪽에 추가할 열 이름을 입력하세요:`);
                if (title && title.trim()) {
                  await onAddColumn(title.trim(), targetIdx);
                }
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-primary/10 hover:text-primary transition-colors text-left cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px] text-primary">arrow_right_alt</span>
              <span>오른쪽에 1개 열 삽입</span>
            </button>

            <div className="my-1 border-t border-surface-variant/60"></div>

            {/* Rename Column */}
            <button
              type="button"
              onClick={() => {
                const { colKey, colTitle } = contextMenu;
                setContextMenu(null);
                setEditingHeaderKey(colKey);
                setHeaderEditTitle(colTitle);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-container transition-colors text-left cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px] text-outline">edit</span>
              <span>열 이름 변경</span>
            </button>

            {/* Type & Attributes Config */}
            <button
              type="button"
              onClick={() => {
                const { colKey, colTitle } = contextMenu;
                setContextMenu(null);
                onOpenTypeConfig(colKey, colTitle);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-container transition-colors text-left cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px] text-indigo-600">tune</span>
              <span>데이터 타입 및 옵션 설정</span>
            </button>

            {/* Filter & Sort */}
            <button
              type="button"
              onClick={() => {
                const { colKey, colTitle } = contextMenu;
                setContextMenu(null);
                onOpenFilterSort(colKey, colTitle);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-container transition-colors text-left cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px] text-outline">filter_alt</span>
              <span>필터 및 정렬</span>
            </button>

            {onDeleteColumn && (
              <>
                <div className="my-1 border-t border-surface-variant/60"></div>
                {/* Delete Column */}
                <button
                  type="button"
                  onClick={async () => {
                    const { colKey, colTitle } = contextMenu;
                    setContextMenu(null);
                    if (
                      confirm(
                        `'${colTitle}' 열을 삭제하시겠습니까?\n해당 열은 시트 보기 목록에서 제거됩니다.`
                      )
                    ) {
                      await onDeleteColumn(colKey);
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 text-red-600 transition-colors text-left cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px] text-red-500">delete</span>
                  <span>열 삭제</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ==========================================
// Isolated Local Cell Editor (Zero Table Re-renders during typing!)
// ==========================================
const CellEditor: React.FC<{
  initialValue: string;
  onCommit: (val: string, moveDirection?: 'down' | 'right') => void;
  onCancel: () => void;
}> = ({ initialValue, onCommit, onCancel }) => {
  const [val, setVal] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onCommit(val)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onCommit(val, 'down');
        } else if (e.key === 'Tab') {
          e.preventDefault();
          onCommit(val, 'right');
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
      className="w-full h-full bg-white text-on-surface text-[11px] px-1 outline-none font-mono"
    />
  );
};

// ==========================================
// Memoized Row Component: Skips 98% of table re-renders on cell selection!
// ==========================================
interface GridRowProps {
  task: Task;
  rIdx: number;
  columns: ColumnDef[];
  columnConfigs: Record<string, ColumnConfig>;
  activeColIdx: number | null;
  editingColIdx: number | null;
  initialEditValue?: string;
  onCellClick: (rIdx: number, cIdx: number) => void;
  onCellDoubleClick: (rIdx: number, cIdx: number) => void;
  onCommitCellEdit: (rIdx: number, cIdx: number, val: string, moveDirection?: 'down' | 'right') => void;
  onCancelCellEdit: () => void;
  onToggleCheckbox: (taskId: string, colKey: string, checked: boolean) => Promise<void>;
  onDeleteRow: (taskId: string, rIdx: number) => void;
}

const areRowsEqual = (prev: GridRowProps, next: GridRowProps) => {
  // Only re-render row if this specific task data changed or selection/edit status on this row changed
  if (prev.task !== next.task) return false;
  if (prev.activeColIdx !== next.activeColIdx) return false;
  if (prev.editingColIdx !== next.editingColIdx) return false;
  if (prev.columns !== next.columns) return false;
  if (prev.columnConfigs !== next.columnConfigs) return false;
  if (prev.initialEditValue !== next.initialEditValue) return false;
  return true;
};

const GridRow = React.memo<GridRowProps>(({
  task,
  rIdx,
  columns,
  columnConfigs,
  activeColIdx,
  editingColIdx,
  initialEditValue,
  onCellClick,
  onCellDoubleClick,
  onCommitCellEdit,
  onCancelCellEdit,
  onToggleCheckbox,
  onDeleteRow,
}) => {
  return (
    <tr
      className="h-7 hover:bg-surface-container-low/50 group transition-colors"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '28px' }}
    >
      {/* Row Number */}
      <td className="border-r border-surface-variant text-center text-outline text-[11px] font-semibold bg-surface-container-lowest select-none">
        {rIdx + 1}
      </td>

      {/* Data Cells */}
      {columns.map((col, cIdx) => {
        const isSelected = activeColIdx === cIdx;
        const isEditing = editingColIdx === cIdx;
        const cfg = columnConfigs[col.key] || { type: 'text' };
        const rawVal = task[col.key];
        const strVal = rawVal != null ? String(rawVal) : '';

        return (
          <td
            key={col.key}
            onClick={() => onCellClick(rIdx, cIdx)}
            onDoubleClick={() => onCellDoubleClick(rIdx, cIdx)}
            className={`px-2 py-0.5 border-r border-surface-variant relative truncate text-[11px] transition-colors cursor-cell ${
              isSelected
                ? 'ring-2 ring-primary ring-inset bg-primary/5 font-medium'
                : 'hover:bg-black/2'
            }`}
          >
            {isEditing ? (
              <CellEditor
                initialValue={initialEditValue !== undefined ? initialEditValue : strVal}
                onCommit={(val, move) => onCommitCellEdit(rIdx, cIdx, val, move)}
                onCancel={onCancelCellEdit}
              />
            ) : (
              <CellContent
                value={strVal}
                type={cfg.type}
                options={cfg.options}
                onToggleCheckbox={(newChecked) => onToggleCheckbox(task.id, col.key, newChecked)}
              />
            )}
          </td>
        );
      })}

      {/* Row Actions: Delete */}
      <td className="text-center">
        <button
          type="button"
          onClick={() => onDeleteRow(task.id, rIdx)}
          className="w-5 h-5 rounded flex items-center justify-center text-outline hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 mx-auto cursor-pointer"
          title="행 삭제"
        >
          <span className="material-symbols-outlined text-[14px]">delete</span>
        </button>
      </td>
    </tr>
  );
}, areRowsEqual);

// ==========================================
// Specialized Cell Content Renderer (Memoized)
// ==========================================
const CellContent = React.memo<{
  value: string;
  type: ColumnConfig['type'];
  options?: string[];
  onToggleCheckbox: (newChecked: boolean) => Promise<void>;
}>(({ value, type, onToggleCheckbox }) => {
  if (type === 'checkbox') {
    const isChecked = value === 'true' || value === '1' || value === 'Y' || value === 'yes';
    return (
      <div className="flex items-center justify-center h-full">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => onToggleCheckbox(e.target.checked)}
          className="rounded text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
        />
      </div>
    );
  }

  if (type === 'googleId') {
    if (!value) return <span className="text-outline/40 italic">미지정</span>;
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#f8fafd] border border-[#dadce0] text-[#1a73e8] font-bold text-[10px]">
        <svg viewBox="0 0 24 24" width="10" height="10">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        <span className="truncate">{value}</span>
      </span>
    );
  }

  if (type === 'priority') {
    if (!value) return null;
    const colorMap: Record<string, string> = {
      긴급: 'bg-red-50 text-red-700 border-red-200',
      높음: 'bg-amber-50 text-amber-700 border-amber-200',
      보통: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      낮음: 'bg-slate-50 text-slate-700 border-slate-200',
    };
    const chipClass = colorMap[value] || 'bg-surface-variant text-on-surface border-surface-variant';
    return (
      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${chipClass}`}>
        {value}
      </span>
    );
  }

  if (type === 'cardHeader') {
    return <span className="font-bold text-indigo-900">{value}</span>;
  }

  if (type === 'progress') {
    const num = Math.min(100, Math.max(0, parseInt(value, 10) || 0));
    return (
      <div className="flex items-center gap-1.5 w-full">
        <div className="flex-1 bg-surface-variant rounded-full h-1.5 overflow-hidden">
          <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${num}%` }}></div>
        </div>
        <span className="text-[9px] text-outline w-6 text-right">{num}%</span>
      </div>
    );
  }

  return <span>{value}</span>;
});

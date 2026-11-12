import React, { useState, useEffect } from 'react';
import { ColumnConfig, ColumnType, AVAILABLE_TYPES } from '../../types/sheet';

interface TypeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  colKey: string;
  colTitle: string;
  config: ColumnConfig;
  onSave: (patch: Partial<ColumnConfig>) => Promise<void>;
  onDeleteColumn?: (colKey: string) => Promise<void>;
}

export const TypeConfigModal: React.FC<TypeConfigModalProps> = ({
  isOpen,
  onClose,
  colKey,
  colTitle,
  config,
  onSave,
  onDeleteColumn,
}) => {
  const [label, setLabel] = useState(config.label || colTitle);
  const [type, setType] = useState<ColumnType>(config.type || 'text');
  const [optionsStr, setOptionsStr] = useState((config.options || []).join('\n'));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLabel(config.label || colTitle);
    setType(config.type || 'text');
    setOptionsStr((config.options || []).join('\n'));
  }, [config, colTitle, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const options = optionsStr
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      await onSave({
        label: label.trim() || colTitle,
        type,
        options: type === 'select' || type === 'priority' || type === 'googleId' ? options : undefined,
      });
      onClose();
    } catch (err: any) {
      alert('설정 저장 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-surface-variant max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-surface-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
            <h3 className="font-bold text-sm text-on-surface">열 속성 및 데이터 타입 설정</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:bg-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* Column Label */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">열 이름 (표시 제목)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-surface-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="예: 담당자, 진행상태, 마감일"
            />
          </div>

          {/* Type Picker */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">데이터 타입</label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`flex items-start gap-2 p-2.5 rounded-xl border text-left transition-all ${
                    type === t.id
                      ? 'border-primary bg-primary/5 text-primary font-bold shadow-2xs'
                      : 'border-surface-variant hover:border-outline/40 text-on-surface bg-surface-container-lowest'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">{t.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs truncate">{t.label}</div>
                    <div className="text-[10px] text-outline line-clamp-1 font-normal">{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Options (for select, priority, googleId) */}
          {(type === 'select' || type === 'priority' || type === 'googleId') && (
            <div className="animate-in fade-in duration-150">
              <label className="block text-xs font-bold text-on-surface mb-1.5">
                {type === 'googleId'
                  ? '지정 계정 목록 (줄 단위 구분, 미지정시 자유 입력)'
                  : '선택 옵션 목록 (줄 단위로 구분)'}
              </label>
              <textarea
                value={optionsStr}
                onChange={(e) => setOptionsStr(e.target.value)}
                rows={4}
                className="w-full text-xs font-mono p-3 border border-surface-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                placeholder={
                  type === 'googleId'
                    ? 'user1@school.go.kr\nuser2@school.go.kr'
                    : '진행전\n진행중\n완료\n보류'
                }
              />
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-surface-variant flex items-center justify-between bg-surface-container-low">
          {onDeleteColumn ? (
            <button
              type="button"
              onClick={() => {
                if (confirm(`'${colTitle}' 열을 삭제하시겠습니까? 데이터는 유지되지만 시트에서 숨겨집니다.`)) {
                  onDeleteColumn(colKey);
                  onClose();
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              열 삭제
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
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
              {saving ? '저장 중...' : '설정 저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


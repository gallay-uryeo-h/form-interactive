import React, { useState, useMemo } from 'react';
import { UserStatus } from '../../services/sheetService';

interface UserClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: string[]; // List of user emails extracted from googleId column
  userStatuses: Record<string, UserStatus>;
  onSave: (statuses: Record<string, UserStatus>) => Promise<void>;
  sheetIsClosed: boolean;
  onToggleSheetClosed: (closed: boolean) => Promise<void>;
}

export const UserClosingModal: React.FC<UserClosingModalProps> = ({
  isOpen,
  onClose,
  users,
  userStatuses,
  onSave,
  sheetIsClosed,
  onToggleSheetClosed,
}) => {
  const [localStatuses, setLocalStatuses] = useState<Record<string, UserStatus>>(userStatuses || {});
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync state whenever modal opens or props change
  React.useEffect(() => {
    if (isOpen) {
      setLocalStatuses(userStatuses || {});
      setSearchTerm('');
    }
  }, [isOpen, userStatuses]);

  if (!isOpen) return null;

  const normalizedUsers = Array.from(
    new Set(users.map((u) => u.trim().toLowerCase()).filter(Boolean))
  ).sort();

  const filteredUsers = normalizedUsers.filter((u) =>
    u.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleInputClosed = (email: string) => {
    const cur = localStatuses[email] || { inputClosed: false, disconnected: false };
    setLocalStatuses({
      ...localStatuses,
      [email]: { ...cur, inputClosed: !cur.inputClosed },
    });
  };

  const handleToggleDisconnected = (email: string) => {
    const cur = localStatuses[email] || { inputClosed: false, disconnected: false };
    setLocalStatuses({
      ...localStatuses,
      [email]: { ...cur, disconnected: !cur.disconnected },
    });
  };

  // Bulk actions for visible users
  const handleSetAllInputClosed = (val: boolean) => {
    const next = { ...localStatuses };
    filteredUsers.forEach((u) => {
      const cur = next[u] || { inputClosed: false, disconnected: false };
      next[u] = { ...cur, inputClosed: val };
    });
    setLocalStatuses(next);
  };

  const handleSetAllDisconnected = (val: boolean) => {
    const next = { ...localStatuses };
    filteredUsers.forEach((u) => {
      const cur = next[u] || { inputClosed: false, disconnected: false };
      next[u] = { ...cur, disconnected: val };
    });
    setLocalStatuses(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localStatuses);
      onClose();
    } catch (err: any) {
      alert('저장 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClosedCount = normalizedUsers.filter(
    (u) => localStatuses[u]?.inputClosed
  ).length;
  const disconnectedCount = normalizedUsers.filter(
    (u) => localStatuses[u]?.disconnected
  ).length;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-surface-variant max-w-lg w-full overflow-hidden flex flex-col max-h-[88vh] cursor-default"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-red-600 text-[24px]">
              lock_person
            </span>
            <div>
              <h3 className="font-bold text-sm text-on-surface">사용자별 시트 마감 및 접근 제어</h3>
              <p className="text-[11px] text-outline">
                사용자별로 입력을 마감(읽기 전용)하거나 연결을 해제(숨김)할 수 있습니다.
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

        {/* Global Sheet Lock Alert Banner */}
        <div className="px-5 py-2.5 bg-red-50/70 border-b border-red-200/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="material-symbols-outlined text-[18px] text-red-600">
              shield_lock
            </span>
            <span className="font-semibold text-red-950">
              전체 시트 입력 마감: {sheetIsClosed ? '활성화됨 (모든 사용자 읽기 전용)' : '비활성'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onToggleSheetClosed(!sheetIsClosed)}
            className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all shadow-2xs ${
              sheetIsClosed
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-white text-red-600 border border-red-300 hover:bg-red-50'
            }`}
          >
            {sheetIsClosed ? '전체 마감 해제' : '전체 마감 적용'}
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
          {/* Search Bar */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline">
              search
            </span>
            <input
              type="text"
              placeholder="사용자 구글 이메일 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-surface-container-low border border-surface-variant rounded-xl outline-none focus:border-primary"
            />
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-2.5 py-2 bg-surface-container-low rounded-xl border border-surface-variant/60">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-outline">입력 마감:</span>
              <button
                type="button"
                onClick={() => handleSetAllInputClosed(true)}
                className="text-amber-700 font-bold hover:underline cursor-pointer"
              >
                전체 잠금 🔒
              </button>
              <span className="text-outline-variant">|</span>
              <button
                type="button"
                onClick={() => handleSetAllInputClosed(false)}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                전체 해제 🔓
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-outline">계정 연결:</span>
              <button
                type="button"
                onClick={() => handleSetAllDisconnected(true)}
                className="text-red-700 font-bold hover:underline cursor-pointer"
              >
                전체 해제 🚫
              </button>
              <span className="text-outline-variant">|</span>
              <button
                type="button"
                onClick={() => handleSetAllDisconnected(false)}
                className="text-primary font-bold hover:underline cursor-pointer"
              >
                전체 연결 🔗
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center justify-between text-[11px] text-outline px-1">
            <span>
              총 <strong className="text-on-surface">{normalizedUsers.length}</strong>명 중{' '}
              <strong className="text-amber-700">{inputClosedCount}</strong>명 입력 마감 (읽기전용),{' '}
              <strong className="text-red-700">{disconnectedCount}</strong>명 연결 해제 (미표시)
            </span>
          </div>

          {/* User List */}
          <div className="border border-surface-variant rounded-xl p-2 max-h-72 overflow-y-auto space-y-1.5 bg-surface-container-lowest">
            {filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-outline text-xs">
                {users.length === 0
                  ? '구글 ID(googleId) 열에 등록된 사용자가 없습니다.'
                  : '검색된 사용자가 없습니다.'}
              </div>
            ) : (
              filteredUsers.map((email) => {
                const status = localStatuses[email] || {
                  inputClosed: false,
                  disconnected: false,
                };
                return (
                  <div
                    key={email}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                      status.disconnected
                        ? 'bg-red-50/40 border-red-200 text-red-900 opacity-75'
                        : status.inputClosed
                        ? 'bg-amber-50/50 border-amber-200 text-amber-950'
                        : 'bg-white border-surface-variant/60 hover:bg-surface-container-low text-on-surface'
                    }`}
                  >
                    {/* Left: User Email & Badges */}
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="material-symbols-outlined text-[16px] text-outline shrink-0">
                        account_circle
                      </span>
                      <span className="font-semibold truncate">{email}</span>

                      {status.disconnected ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold shrink-0">
                          연결 해제
                        </span>
                      ) : status.inputClosed ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold shrink-0">
                          읽기 전용
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold shrink-0">
                          정상
                        </span>
                      )}
                    </div>

                    {/* Right: Toggle Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Input Close Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleInputClosed(email)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          status.inputClosed
                            ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                            : 'bg-white text-outline hover:text-amber-800 hover:bg-amber-50 border-surface-variant'
                        }`}
                        title="입력 마감: 모바일에서 읽기 전용으로 전환합니다."
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {status.inputClosed ? 'lock' : 'lock_open'}
                        </span>
                        <span>{status.inputClosed ? '마감됨' : '입력 마감'}</span>
                      </button>

                      {/* Disconnect Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleDisconnected(email)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          status.disconnected
                            ? 'bg-red-100 text-red-900 border-red-300 shadow-2xs'
                            : 'bg-white text-outline hover:text-red-800 hover:bg-red-50 border-surface-variant'
                        }`}
                        title="계정 연결 해제: 모바일 목록에서 이 시트를 보이지 않게 합니다."
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {status.disconnected ? 'link_off' : 'link'}
                        </span>
                        <span>{status.disconnected ? '해제됨' : '연결 해제'}</span>
                      </button>
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
            {saving ? '저장 중...' : '마감 설정 저장'}
          </button>
        </div>
      </div>
    </div>
  );
};


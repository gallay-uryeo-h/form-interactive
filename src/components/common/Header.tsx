import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  sheetName?: string;
  onRenameSheet?: (newName: string) => void;
  saving?: boolean;
  activeTab?: 'home' | 'admin' | 'mobile';
  onTabChange?: (tab: 'home' | 'admin' | 'mobile') => void;
}

export const Header: React.FC<HeaderProps> = ({
  sheetName,
  onRenameSheet,
  saving = false,
  activeTab = 'admin',
  onTabChange,
}) => {
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(sheetName || '');

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (editedTitle.trim() && editedTitle !== sheetName) {
      onRenameSheet?.(editedTitle.trim());
    }
  };

  return (
    <header className="h-14 bg-surface-container-lowest border-b border-surface-variant flex items-center justify-between px-4 z-40 select-none shrink-0 shadow-2xs">
      <div className="flex items-center gap-3 min-w-0">
        {/* Workspace Sheets Logo */}
        <div
          onClick={() => onTabChange?.('home')}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[20px]">table_chart</span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-bold text-[13px] text-on-surface leading-tight tracking-tight">Workspace Sheets</span>
            <span className="text-[10px] text-outline font-medium tracking-wide">ENTERPRISE DRIVE</span>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-outline-variant mx-1 hidden sm:block"></div>

        {/* Navigation Tabs */}
        {onTabChange && (
          <nav className="flex items-center gap-1">
            <button
              onClick={() => onTabChange('home')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'home'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-outline hover:bg-surface-variant/60 hover:text-on-surface'
              }`}
            >
              시트 목록
            </button>
            <button
              onClick={() => onTabChange('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'admin'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-outline hover:bg-surface-variant/60 hover:text-on-surface'
              }`}
            >
              Admin 시트 관리
            </button>
            <button
              onClick={() => onTabChange('mobile')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'mobile'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-outline hover:bg-surface-variant/60 hover:text-on-surface'
              }`}
            >
              User 데이터 편집
            </button>
          </nav>
        )}

        {/* Sheet Title Inline Edit */}
        {sheetName && activeTab === 'admin' && (
          <div className="flex items-center gap-1.5 ml-2">
            <div className="h-4 w-[1px] bg-outline-variant mx-1"></div>
            {isEditingTitle ? (
              <input
                type="text"
                value={editedTitle}
                autoFocus
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSubmit();
                  if (e.key === 'Escape') {
                    setEditedTitle(sheetName);
                    setIsEditingTitle(false);
                  }
                }}
                className="text-sm font-semibold text-on-surface bg-surface-container border border-primary rounded px-2 py-0.5 outline-none"
              />
            ) : (
              <div
                onClick={() => {
                  setEditedTitle(sheetName);
                  setIsEditingTitle(true);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-variant/60 cursor-pointer group transition-colors"
                title="클릭하여 시트 이름 변경"
              >
                <span className="text-sm font-semibold text-on-surface truncate max-w-[200px]">{sheetName}</span>
                <span className="material-symbols-outlined text-[14px] text-outline opacity-0 group-hover:opacity-100 transition-opacity">
                  edit
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls: Cloud Status + User Profile */}
      <div className="flex items-center gap-3">
        {/* Sync Status Badge */}
        <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-outline">
          {saving ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-amber-700 font-medium text-[11px]">저장 중...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-outline text-[11px]">Firestore 실시간 동기화됨</span>
            </>
          )}
        </div>

        {/* User Avatar & Menu */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center border border-primary/30 hover:ring-2 hover:ring-primary/20 transition-all overflow-hidden"
              title={user.email || ''}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                user.displayName?.[0] || user.email?.[0]?.toUpperCase() || 'U'
              )}
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-surface-variant p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center gap-3 p-2 border-b border-surface-variant pb-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      user.displayName?.[0] || 'U'
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-on-surface truncate">{user.displayName || '사용자'}</span>
                    <span className="text-[11px] font-mono text-outline truncate">{user.email}</span>
                    {user.isAdmin && (
                      <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full w-fit mt-1">
                        최고 관리자
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  로그아웃
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

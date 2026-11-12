import React, { useState } from 'react';
import { useSheet } from '../hooks/useSheet';
import { Header } from '../components/common/Header';
import { createSheet, deleteSheet } from '../services/sheetService';

interface HomePageProps {
  onSelectSheet: (sheetId: string) => void;
  onTabChange: (tab: 'home' | 'admin' | 'mobile') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSelectSheet, onTabChange }) => {
  const { sheets, loadingSheets } = useSheet();
  const [newSheetName, setNewSheetName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateSheet = async () => {
    setCreating(true);
    try {
      const id = await createSheet(newSheetName);
      setNewSheetName('');
      onSelectSheet(id);
      onTabChange('admin');
    } catch (err: any) {
      alert('시트 생성 실패: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header activeTab="home" onTabChange={onTabChange} />

      <main className="max-w-6xl w-full mx-auto p-6 md:p-8 flex-1 space-y-8">
        {/* Top Banner / Create New Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary text-xl">add_circle</span>
            <h2 className="text-base font-bold text-on-surface">새 스프레드시트 시작</h2>
            <span className="text-xs text-outline">빈 시트를 만들고 열과 데이터를 직접 구성하세요</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-5 rounded-2xl border border-surface-variant shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-2xl">table_rows</span>
            </div>
            <input
              type="text"
              value={newSheetName}
              onChange={(e) => setNewSheetName(e.target.value)}
              placeholder="새 시트 이름을 입력하세요 (예: 2026학년도 수시 지원 현황)"
              className="flex-1 text-sm px-4 py-2.5 border border-surface-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSheet();
              }}
            />
            <button
              onClick={handleCreateSheet}
              disabled={creating}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-xs transition-colors disabled:opacity-50 shrink-0"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              {creating ? '생성 중...' : '새 빈 시트 만들기'}
            </button>
          </div>
        </div>

        {/* Existing Sheets List Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-outline text-xl">folder_open</span>
              등록된 스프레드시트 목록 ({sheets.length}개)
            </h3>
          </div>

          {loadingSheets ? (
            <div className="p-12 text-center text-outline text-sm">
              <span className="animate-spin mr-2">⏳</span>
              Firestore에서 시트 목록을 불러오는 중...
            </div>
          ) : sheets.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-surface-variant text-outline text-sm">
              생성된 시트가 없습니다. 상단에서 새 스프레드시트를 만들어보세요.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-surface-variant overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs divide-y divide-surface-variant">
                <thead className="bg-surface-container-low font-bold text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">#</th>
                    <th className="px-4 py-3">시트 이름</th>
                    <th className="px-4 py-3 w-28">소유자</th>
                    <th className="px-4 py-3 w-36">생성 일시</th>
                    <th className="px-4 py-3 w-48 text-right">시트 열기 및 관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant">
                  {sheets.map((sheet, idx) => (
                    <tr key={sheet.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="px-4 py-3 text-center text-outline font-mono">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-on-surface">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[18px]">table_chart</span>
                          <span
                            onClick={() => {
                              onSelectSheet(sheet.id);
                              onTabChange('admin');
                            }}
                            className="hover:underline hover:text-primary cursor-pointer truncate max-w-md"
                          >
                            {sheet.name}
                          </span>
                          {sheet.isClosed && (
                            <span className="text-[10px] bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-full border border-red-200">
                              마감됨
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-outline">{sheet.owner || '관리자'}</td>
                      <td className="px-4 py-3 text-outline font-mono text-[11px]">
                        {sheet.createdAt ? new Date(sheet.createdAt).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectSheet(sheet.id);
                              onTabChange('admin');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs transition-colors"
                          >
                            Admin 관리
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectSheet(sheet.id);
                              onTabChange('mobile');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface font-semibold text-xs transition-colors"
                          >
                            User 모바일
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`'${sheet.name}' 시트와 모든 데이터를 완전히 삭제하시겠습니까?`)) {
                                await deleteSheet(sheet.id);
                              }
                            }}
                            className="p-1 rounded-lg text-outline hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="시트 삭제"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

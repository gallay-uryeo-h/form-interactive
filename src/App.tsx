import React, { useState, useEffect } from 'react';
import { AuthGuard } from './components/common/AuthGuard';
import { HomePage } from './pages/HomePage';
import { AdminPage } from './pages/AdminPage';
import { MobilePage } from './pages/MobilePage';
import { useSheet } from './hooks/useSheet';

export const App: React.FC = () => {
  // Detect domain & URL parameters
  const [tab, setTab] = useState<'home' | 'admin' | 'mobile'>('home');
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');

  const { sheets, loadingSheets } = useSheet();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramSheetId = params.get('sheetId');
    const paramMode = params.get('mode');
    const host = window.location.hostname;
    const path = window.location.pathname;

    // Detect if on mobile site
    const isMobileHost =
      host.includes('-f92f8') ||
      path.includes('mobile.html') ||
      paramMode === 'mobile';

    if (isMobileHost) {
      setTab('mobile');
    } else if (paramSheetId) {
      setTab('admin');
    } else {
      setTab('home');
    }

    if (paramSheetId) {
      setSelectedSheetId(paramSheetId);
    }
  }, []);

  // Default to first sheet if none selected and sheets loaded
  useEffect(() => {
    if (!selectedSheetId && sheets.length > 0) {
      setSelectedSheetId(sheets[0].id);
    }
  }, [sheets, selectedSheetId]);

  const handleSelectSheet = (sheetId: string) => {
    setSelectedSheetId(sheetId);
    // Update URL query without full reload
    const url = new URL(window.location.href);
    url.searchParams.set('sheetId', sheetId);
    window.history.pushState({}, '', url.toString());
  };

  const handleTabChange = (newTab: 'home' | 'admin' | 'mobile') => {
    setTab(newTab);
    const url = new URL(window.location.href);
    url.searchParams.set('mode', newTab);
    window.history.pushState({}, '', url.toString());
  };

  return (
    <div className="min-h-screen bg-surface">
      {tab === 'home' && (
        <AuthGuard requireAdmin={true}>
          <HomePage
            onSelectSheet={handleSelectSheet}
            onTabChange={handleTabChange}
          />
        </AuthGuard>
      )}

      {tab === 'admin' && (
        <AuthGuard requireAdmin={true}>
          <AdminPage
            currentSheetId={selectedSheetId}
            onSelectSheet={handleSelectSheet}
            onTabChange={handleTabChange}
          />
        </AuthGuard>
      )}

      {tab === 'mobile' && (
        <AuthGuard requireAdmin={false}>
          <MobilePage
            currentSheetId={selectedSheetId}
            onSelectSheet={handleSelectSheet}
            onTabChange={handleTabChange}
          />
        </AuthGuard>
      )}
    </div>
  );
};


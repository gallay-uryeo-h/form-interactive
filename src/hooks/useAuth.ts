import { useState, useEffect } from 'react';
import { AppUser } from '../types/auth';
import { subscribeAuth, loginWithGoogle, logout } from '../services/authService';

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsub = subscribeAuth((appUser, isLoading) => {
      setUser(appUser);
      setLoading(isLoading);
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      alert('로그인 실패: ' + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err: any) {
      alert('로그아웃 실패: ' + err.message);
    }
  };

  return {
    user,
    loading,
    login: handleLogin,
    logout: handleLogout,
  };
}


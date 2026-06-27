import { useState, useEffect, useCallback } from 'react';
import {
  clearGoogleAuth,
  getStoredGoogleEmail,
  getValidGoogleToken,
  requestGoogleAccessToken,
} from '../services/googleAuth';

export const useGoogleAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getValidGoogleToken());
  const [email, setEmail] = useState<string | null>(() => getStoredGoogleEmail());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getValidGoogleToken());
    setEmail(getStoredGoogleEmail());
  }, []);

  const login = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await requestGoogleAccessToken();
      setIsLoggedIn(true);
      setEmail(getStoredGoogleEmail());
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Google 登入失敗';
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearGoogleAuth();
    setIsLoggedIn(false);
    setEmail(null);
    setError(null);
  }, []);

  return { isLoggedIn, email, loading, error, login, logout };
};

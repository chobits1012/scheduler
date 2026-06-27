import { STORAGE_KEYS } from '../types';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
}

const loadGisScript = (): Promise<void> => {
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  const existing = document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('無法載入 Google 登入腳本')));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('無法載入 Google 登入腳本'));
    document.head.appendChild(script);
  });
};

export const getValidGoogleToken = (): string | null => {
  const token = localStorage.getItem(STORAGE_KEYS.GOOGLE_ACCESS_TOKEN);
  const expiry = localStorage.getItem(STORAGE_KEYS.GOOGLE_TOKEN_EXPIRY);
  if (!token || !expiry) return null;
  if (Date.now() >= Number(expiry)) return null;
  return token;
};

export const getStoredGoogleEmail = (): string | null =>
  localStorage.getItem(STORAGE_KEYS.GOOGLE_USER_EMAIL);

const storeToken = (token: string, expiresIn: number) => {
  const expiresAt = Date.now() + (expiresIn - 60) * 1000;
  localStorage.setItem(STORAGE_KEYS.GOOGLE_ACCESS_TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.GOOGLE_TOKEN_EXPIRY, String(expiresAt));
};

const fetchGoogleEmail = async (token: string): Promise<string | null> => {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.email || null;
  } catch {
    return null;
  }
};

export const requestGoogleAccessToken = async (): Promise<string> => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      '尚未設定 Google OAuth Client ID。請在 .env.local 加入 VITE_GOOGLE_CLIENT_ID=你的用戶端ID'
    );
  }

  await loadGisScript();

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SHEETS_SCOPE,
      callback: async (response: TokenResponse) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || 'Google 登入失敗'));
          return;
        }
        storeToken(response.access_token, response.expires_in);
        const email = await fetchGoogleEmail(response.access_token);
        if (email) {
          localStorage.setItem(STORAGE_KEYS.GOOGLE_USER_EMAIL, email);
        }
        resolve(response.access_token);
      },
    });
    client.requestAccessToken();
  });
};

export const ensureGoogleAccessToken = async (): Promise<string> => {
  const existing = getValidGoogleToken();
  if (existing) return existing;
  return requestGoogleAccessToken();
};

export const clearGoogleAuth = () => {
  localStorage.removeItem(STORAGE_KEYS.GOOGLE_ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.GOOGLE_TOKEN_EXPIRY);
  localStorage.removeItem(STORAGE_KEYS.GOOGLE_USER_EMAIL);
};

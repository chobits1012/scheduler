export {};

declare global {
  interface TokenResponse {
    access_token: string;
    expires_in: number;
    error?: string;
  }

  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }

  interface ImportMetaEnv {
    readonly VITE_GOOGLE_CLIENT_ID?: string;
    readonly VITE_FIREBASE_API_KEY?: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
    readonly VITE_FIREBASE_PROJECT_ID?: string;
    readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
    readonly VITE_FIREBASE_APP_ID?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KeySplit, ServerKeyHalfResponse } from '../types';

// Change to your server URL. In Expo Go / dev, use your machine's local IP.
// e.g. 'http://192.168.1.x:3001'  (Android emulator needs real IP, not localhost)
const BASE_URL = 'http://localhost:3001';

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('authToken');
}

async function request<T>(path: string, options: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as T;
}

export interface AuthResponse {
  token: string;
  user: { id: string; email: string };
}

export const NetworkService = {
  register: (email: string, password: string) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }, false),

  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false),

  storeKeyHalf: (split: KeySplit) =>
    request<{ success: boolean }>('/wallet/store-key-half', {
      method: 'POST',
      body: JSON.stringify({
        chain: split.chain,
        walletId: split.walletId,
        serverKeyHalf: split.serverHalf,
        salt: split.bundle.salt,
        iv: split.bundle.iv,
        tag: split.bundle.tag,
        publicAddress: split.publicAddress,
      }),
    }),

  fetchServerKeyHalf: (walletId: string) =>
    request<ServerKeyHalfResponse>(`/wallet/key-half/${walletId}`),

  fetchMyWallets: () =>
    request<{ wallets: Array<{ chain: string; walletId: string; publicAddress: string }> }>('/wallet/my-wallets'),
};

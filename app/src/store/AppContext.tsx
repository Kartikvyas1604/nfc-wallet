import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkService } from '../services/NetworkService';

interface AppState {
  isLoggedIn: boolean;
  hasWallet: boolean;
  authToken: string | null;
  ethAddress: string;
  solAddress: string;
}

interface AppContextValue extends AppState {
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  saveWalletAddresses: (eth: string, sol: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    isLoggedIn: false,
    hasWallet: false,
    authToken: null,
    ethAddress: '',
    solAddress: '',
  });

  // Restore session on app start
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;
      // Token exists — check server for wallet
      try {
        const { wallet } = await NetworkService.fetchMyWallet();
        setState({
          isLoggedIn: true,
          hasWallet: !!wallet,
          authToken: token,
          ethAddress: wallet?.ethAddress ?? '',
          solAddress: wallet?.solAddress ?? '',
        });
      } catch {
        // Token expired or network error — still mark as logged in, no wallet
        setState({ isLoggedIn: true, hasWallet: false, authToken: token, ethAddress: '', solAddress: '' });
      }
    })();
  }, []);

  const login = async (token: string) => {
    // Save token first so NetworkService can pick it up
    await AsyncStorage.setItem('authToken', token);
    // Check if this account already has a wallet
    try {
      const { wallet } = await NetworkService.fetchMyWallet();
      setState({
        isLoggedIn: true,
        hasWallet: !!wallet,
        authToken: token,
        ethAddress: wallet?.ethAddress ?? '',
        solAddress: wallet?.solAddress ?? '',
      });
    } catch {
      setState(s => ({ ...s, isLoggedIn: true, authToken: token }));
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('authToken');
    setState({ isLoggedIn: false, hasWallet: false, authToken: null, ethAddress: '', solAddress: '' });
  };

  const saveWalletAddresses = async (eth: string, sol: string) => {
    setState(s => ({ ...s, hasWallet: true, ethAddress: eth, solAddress: sol }));
  };

  return (
    <AppContext.Provider value={{ ...state, login, logout, saveWalletAddresses }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
};

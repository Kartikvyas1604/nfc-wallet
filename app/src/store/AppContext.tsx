import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('authToken');
      const eth = await AsyncStorage.getItem('ethAddress') ?? '';
      const sol = await AsyncStorage.getItem('solAddress') ?? '';
      if (token) {
        setState({ isLoggedIn: true, hasWallet: !!eth, authToken: token, ethAddress: eth, solAddress: sol });
      }
    })();
  }, []);

  const login = async (token: string) => {
    await AsyncStorage.setItem('authToken', token);
    setState(s => ({ ...s, isLoggedIn: true, authToken: token }));
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['authToken', 'ethAddress', 'solAddress']);
    setState({ isLoggedIn: false, hasWallet: false, authToken: null, ethAddress: '', solAddress: '' });
  };

  const saveWalletAddresses = async (eth: string, sol: string) => {
    await AsyncStorage.setItem('ethAddress', eth);
    await AsyncStorage.setItem('solAddress', sol);
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

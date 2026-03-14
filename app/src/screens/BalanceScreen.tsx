import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import { useApp } from '../store/AppContext';
import { ethers } from 'ethers';

const ETH_RPC = 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'; // public key, read-only
const SOL_RPC = 'https://api.mainnet-beta.solana.com';

async function fetchEthBalance(address: string): Promise<string> {
  const provider = new ethers.JsonRpcProvider(ETH_RPC);
  const wei = await provider.getBalance(address);
  return ethers.formatEther(wei);
}

async function fetchSolBalance(address: string): Promise<string> {
  const res = await fetch(SOL_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'getBalance',
      params: [address, { commitment: 'confirmed' }],
    }),
  });
  const json = await res.json();
  const lamports = json.result?.value ?? 0;
  return (lamports / 1e9).toFixed(6);
}

export default function BalanceScreen() {
  const { ethAddress, solAddress, logout } = useApp();
  const [ethBal, setEthBal] = useState<string | null>(null);
  const [solBal, setSolBal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [eth, sol] = await Promise.all([
        fetchEthBalance(ethAddress),
        fetchSolBalance(solAddress),
      ]);
      setEthBal(eth);
      setSolBal(sol);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [ethAddress, solAddress]);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#A855F7" />}
    >
      <Text style={s.title}>My Wallet</Text>

      <View style={s.card}>
        <Text style={s.chainLabel}>Ethereum</Text>
        <Text style={s.addr} numberOfLines={1}>{ethAddress || '—'}</Text>
        <Text style={s.balance}>
          {ethBal !== null ? `${parseFloat(ethBal).toFixed(6)} ETH` : '—'}
        </Text>
      </View>

      <View style={s.card}>
        <Text style={s.chainLabel}>Solana</Text>
        <Text style={s.addr} numberOfLines={1}>{solAddress || '—'}</Text>
        <Text style={s.balance}>
          {solBal !== null ? `${solBal} SOL` : '—'}
        </Text>
      </View>

      {!!error && <Text style={s.error}>{error}</Text>}

      <TouchableOpacity style={s.btn} onPress={refresh} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#000" />
          : <Text style={s.btnText}>Refresh Balances</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={s.logoutBtn} onPress={logout}>
        <Text style={s.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0C29' },
  content: { padding: 24, paddingTop: 60, gap: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 8 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16,
    padding: 20, gap: 8,
  },
  chainLabel: { color: '#A855F7', fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  addr: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'monospace' },
  balance: { color: '#fff', fontSize: 28, fontWeight: '700' },
  error: { color: '#f87171', textAlign: 'center' },
  btn: {
    backgroundColor: '#A855F7', borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  logoutBtn: { alignItems: 'center', paddingVertical: 8 },
  logoutText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
});

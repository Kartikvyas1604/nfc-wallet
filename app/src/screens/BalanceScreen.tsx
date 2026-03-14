import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import { useApp } from '../store/AppContext';

// Testnets — no API key needed
const ETH_RPC = 'https://rpc2.sepolia.org';
const SOL_RPC = 'https://api.devnet.solana.com';

async function fetchEthBalance(address: string): Promise<string> {
  const res = await fetch(ETH_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'eth_getBalance',
      params: [address, 'latest'],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  const wei = BigInt(json.result);
  return (Number(wei) / 1e18).toFixed(6);
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
    if (!ethAddress || !solAddress) return;
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
        <Text style={s.chainLabel}>Ethereum (Sepolia)</Text>
        <Text style={s.addr} numberOfLines={1}>{ethAddress || '—'}</Text>
        <Text style={s.balance}>
          {ethBal !== null ? `${ethBal} ETH` : '—'}
        </Text>
      </View>

      <View style={s.card}>
        <Text style={s.chainLabel}>Solana (Devnet)</Text>
        <Text style={s.addr} numberOfLines={1}>{solAddress || '—'}</Text>
        <Text style={s.balance}>
          {solBal !== null ? `${solBal} SOL` : '—'}
        </Text>
      </View>

      {!!error && <Text style={s.error}>{error}</Text>}

      <TouchableOpacity style={s.btn} onPress={refresh} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
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

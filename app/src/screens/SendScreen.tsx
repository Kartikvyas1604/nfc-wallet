import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { NFCService } from '../services/NFCService';
import { NetworkService } from '../services/NetworkService';
import { reconstructKeys } from '../services/WalletService';
import { hexToBytes } from '../services/CryptoService';

type Step = 'idle' | 'nfc' | 'password' | 'sending' | 'done';

// Testnets
const ETH_RPC = 'https://rpc2.sepolia.org';
const SOL_RPC = 'https://api.devnet.solana.com';

async function sendEth(ethPrivKeyHex: string, to: string, amountEth: string): Promise<string> {
  const { ethers } = require('ethers');
  const provider = new ethers.JsonRpcProvider(ETH_RPC);
  const wallet = new ethers.Wallet(ethPrivKeyHex, provider);
  const tx = await wallet.sendTransaction({ to, value: ethers.parseEther(amountEth) });
  return tx.hash;
}

async function sendSol(solPrivKeyHex: string, to: string, amountSol: string): Promise<string> {
  const nacl = require('tweetnacl');
  const { Connection, PublicKey, SystemProgram, Transaction, Keypair } = require('@solana/web3.js');

  const privKeyBytes = hexToBytes(solPrivKeyHex);
  const keypair = nacl.sign.keyPair.fromSeed(privKeyBytes);
  const solKeypair = Keypair.fromSecretKey(
    Buffer.concat([Buffer.from(privKeyBytes), Buffer.from(keypair.publicKey)])
  );

  const connection = new Connection(SOL_RPC, 'confirmed');
  const fromPub = new PublicKey(keypair.publicKey);
  const toPub = new PublicKey(to);
  const lamports = Math.round(parseFloat(amountSol) * 1e9);

  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  const txn = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: fromPub, toPubkey: toPub, lamports })
  );
  txn.recentBlockhash = blockhash;
  txn.feePayer = fromPub;
  txn.sign(solKeypair);

  const sig = await connection.sendRawTransaction(txn.serialize());
  return sig;
}

export default function SendScreen() {
  const [step, setStep]           = useState<Step>('idle');
  const [chain, setChain]         = useState<'ETH' | 'SOL'>('ETH');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount]       = useState('');
  const [password, setPassword]   = useState('');
  const [walletId, setWalletId]   = useState('');
  const [nfcHalf, setNfcHalf]     = useState('');
  const [txHash, setTxHash]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const startNfcScan = async () => {
    if (!toAddress || !amount) { setError('Enter recipient and amount'); return; }
    setError('');
    setStep('nfc');
    try {
      const card = await NFCService.readCard();
      setWalletId(card.walletId);
      setNfcHalf(card.nfcHalfHex);
      setStep('password');
    } catch (e: any) {
      setError(e.message);
      setStep('idle');
    }
  };

  const doSend = async () => {
    setLoading(true);
    setError('');
    try {
      const serverWallet = await NetworkService.fetchWallet(walletId);
      const { ethPrivKey, solPrivKey } = await reconstructKeys(nfcHalf, serverWallet, password);

      let hash: string;
      if (chain === 'ETH') {
        hash = await sendEth(ethPrivKey, toAddress, amount);
      } else {
        hash = await sendSol(solPrivKey, toAddress, amount);
      }

      // Wipe keys from local variables immediately after signing
      setTxHash(hash);
      setStep('done');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('idle');
    setToAddress('');
    setAmount('');
    setPassword('');
    setWalletId('');
    setNfcHalf('');
    setTxHash('');
    setError('');
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

      {step === 'idle' && (
        <View style={{ gap: 16 }}>
          <Text style={s.title}>Pay</Text>

          <View style={s.chainRow}>
            <TouchableOpacity
              style={[s.chainBtn, chain === 'ETH' && s.chainBtnActive]}
              onPress={() => setChain('ETH')}
            >
              <Text style={[s.chainBtnText, chain === 'ETH' && s.chainBtnTextActive]}>ETH</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.chainBtn, chain === 'SOL' && s.chainBtnActive]}
              onPress={() => setChain('SOL')}
            >
              <Text style={[s.chainBtnText, chain === 'SOL' && s.chainBtnTextActive]}>SOL</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Recipient Address</Text>
          <TextInput
            style={s.input}
            placeholder={chain === 'ETH' ? '0x...' : 'Solana address'}
            placeholderTextColor="#888"
            value={toAddress}
            onChangeText={setToAddress}
            autoCapitalize="none"
          />

          <Text style={s.label}>Amount ({chain})</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. 0.01"
            placeholderTextColor="#888"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />

          {!!error && <Text style={s.error}>{error}</Text>}

          <TouchableOpacity
            style={[s.btn, (!toAddress || !amount) && s.btnDisabled]}
            onPress={startNfcScan}
            disabled={!toAddress || !amount}
          >
            <Text style={s.btnText}>Tap NFC Card to Authorize</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'nfc' && (
        <View style={s.center}>
          <Text style={{ fontSize: 64 }}>📡</Text>
          <Text style={s.heading}>Hold NFC Card</Text>
          <Text style={s.sub}>Hold your NFC card to the back of the phone.</Text>
          <ActivityIndicator size="large" color="#A855F7" style={{ marginTop: 16 }} />
          <TouchableOpacity style={[s.btn, { marginTop: 24 }]} onPress={() => setStep('idle')}>
            <Text style={s.btnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'password' && (
        <View style={{ gap: 16 }}>
          <Text style={{ fontSize: 48, textAlign: 'center' }}>🔑</Text>
          <Text style={s.heading}>Enter Encryption Password</Text>
          <Text style={s.sub}>
            Sending <Text style={{ color: '#A855F7' }}>{amount} {chain}</Text>{'\n'}
            to {toAddress.slice(0, 8)}…{toAddress.slice(-6)}
          </Text>
          <TextInput
            style={s.input}
            placeholder="Encryption password"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {!!error && <Text style={s.error}>{error}</Text>}
          <TouchableOpacity
            style={[s.btn, (!password || loading) && s.btnDisabled]}
            onPress={doSend}
            disabled={!password || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Send Transaction</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelBtn} onPress={reset}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'done' && (
        <View style={s.center}>
          <Text style={{ fontSize: 64 }}>✅</Text>
          <Text style={s.heading}>Sent!</Text>
          <View style={s.hashBox}>
            <Text style={s.hashLabel}>Transaction Hash</Text>
            <Text style={s.hash} selectable>{txHash}</Text>
          </View>
          <TouchableOpacity style={s.btn} onPress={reset}>
            <Text style={s.btnText}>New Payment</Text>
          </TouchableOpacity>
        </View>
      )}

    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#0F0C29' },
  content: { padding: 24, paddingTop: 60, flexGrow: 1 },
  center:  { flex: 1, alignItems: 'center', gap: 16 },
  title:   { fontSize: 28, fontWeight: '700', color: '#fff' },
  heading: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center' },
  sub:     { color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 22 },
  label:   { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  chainRow: { flexDirection: 'row', gap: 12 },
  chainBtn: {
    flex: 1, padding: 12, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  chainBtnActive:     { backgroundColor: '#A855F7', borderColor: '#A855F7' },
  chainBtnText:       { color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  chainBtnTextActive: { color: '#fff' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
    padding: 16, color: '#fff', fontSize: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  error: { color: '#f87171', textAlign: 'center' },
  btn: {
    backgroundColor: '#A855F7', borderRadius: 14,
    padding: 16, alignItems: 'center', width: '100%',
  },
  btnDisabled: { opacity: 0.4 },
  btnText:     { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancelBtn:   { alignItems: 'center', paddingVertical: 8 },
  cancelText:  { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  hashBox: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    padding: 16, width: '100%', gap: 6,
  },
  hashLabel: { color: '#A855F7', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  hash:      { color: '#fff', fontSize: 11, fontFamily: 'monospace', lineHeight: 18 },
});

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { NFCService } from '../services/NFCService';
import { NetworkService } from '../services/NetworkService';
import { reconstructPrivateKey } from '../services/WalletService';
import { ethers } from 'ethers';
import type { NFCCardPayload } from '../types';

type Step = 'idle' | 'nfc' | 'password' | 'sending' | 'done';

const ETH_RPC = 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';
const SOL_RPC = 'https://api.mainnet-beta.solana.com';

async function sendEth(privKeyBytes: Uint8Array, to: string, amountEth: string): Promise<string> {
  const provider = new ethers.JsonRpcProvider(ETH_RPC);
  const wallet = new ethers.Wallet(ethers.hexlify(privKeyBytes), provider);
  const tx = await wallet.sendTransaction({ to, value: ethers.parseEther(amountEth) });
  return tx.hash;
}

async function sendSol(privKeyBytes: Uint8Array, to: string, amountSol: string): Promise<string> {
  // Build and submit a SOL transfer via JSON-RPC
  const nacl = require('tweetnacl');
  const keypair = nacl.sign.keyPair.fromSeed(privKeyBytes);

  // Get latest blockhash
  const bhRes = await fetch(SOL_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getLatestBlockhash', params: [{ commitment: 'confirmed' }] }),
  });
  const bhJson = await bhRes.json();
  const blockhash: string = bhJson.result.value.blockhash;

  const lamports = Math.round(parseFloat(amountSol) * 1e9);

  // Encode a simple system transfer instruction (base64 transaction)
  // We use @solana/web3.js for convenience
  const { Connection, PublicKey, SystemProgram, Transaction, Keypair } = require('@solana/web3.js');
  const connection = new Connection(SOL_RPC, 'confirmed');
  const fromPub = new PublicKey(keypair.publicKey);
  const toPub = new PublicKey(to);

  const solKeypair = Keypair.fromSecretKey(
    Buffer.concat([Buffer.from(privKeyBytes), Buffer.from(keypair.publicKey)])
  );

  const txn = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: fromPub, toPubkey: toPub, lamports })
  );
  txn.recentBlockhash = blockhash;
  txn.feePayer = fromPub;
  txn.sign(solKeypair);

  const raw = txn.serialize();
  const sendRes = await fetch(SOL_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'sendTransaction',
      params: [raw.toString('base64'), { encoding: 'base64' }],
    }),
  });
  const sendJson = await sendRes.json();
  if (sendJson.error) throw new Error(sendJson.error.message);
  return sendJson.result;
}

export default function SendScreen() {
  const [step, setStep] = useState<Step>('idle');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [nfcPayload, setNfcPayload] = useState<NFCCardPayload | null>(null);
  const [txHash, setTxHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startNfcScan = async () => {
    if (!toAddress || !amount) { setError('Enter recipient and amount'); return; }
    setError('');
    setStep('nfc');
    try {
      const payload = await NFCService.readKeyHalf();
      setNfcPayload(payload);
      setStep('password');
    } catch (e: any) {
      setError(e.message);
      setStep('idle');
    }
  };

  const doSend = async () => {
    if (!nfcPayload) return;
    setLoading(true);
    setError('');
    try {
      const serverBundle = await NetworkService.fetchServerKeyHalf(nfcPayload.walletId);
      const privKeyBytes = await reconstructPrivateKey(nfcPayload.nfcHalf, serverBundle, password);

      let hash: string;
      if (nfcPayload.chain === 'ETH') {
        hash = await sendEth(privKeyBytes, toAddress, amount);
      } else {
        hash = await sendSol(privKeyBytes, toAddress, amount);
      }
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
    setNfcPayload(null);
    setTxHash('');
    setError('');
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

      {/* STEP: Idle — fill in recipient */}
      {step === 'idle' && (
        <View style={{ gap: 16 }}>
          <Text style={s.title}>Pay</Text>
          <Text style={s.sub}>Enter recipient address and amount, then tap your NFC card to authorize.</Text>

          <Text style={s.label}>Recipient Address</Text>
          <TextInput
            style={s.input} placeholder="0x... or Solana address"
            placeholderTextColor="#888" value={toAddress}
            onChangeText={setToAddress} autoCapitalize="none"
          />

          <Text style={s.label}>Amount</Text>
          <TextInput
            style={s.input} placeholder="e.g. 0.01"
            placeholderTextColor="#888" value={amount}
            onChangeText={setAmount} keyboardType="decimal-pad"
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

      {/* STEP: NFC scanning */}
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

      {/* STEP: Password */}
      {step === 'password' && (
        <View style={{ gap: 16 }}>
          <Text style={{ fontSize: 48, textAlign: 'center' }}>🔑</Text>
          <Text style={s.heading}>Enter Password</Text>
          <Text style={s.sub}>
            Sending <Text style={{ color: '#A855F7' }}>{amount} {nfcPayload?.chain}</Text>{'\n'}
            to {toAddress.slice(0, 8)}…{toAddress.slice(-6)}
          </Text>
          <TextInput
            style={s.input} placeholder="Wallet password"
            placeholderTextColor="#888" value={password}
            onChangeText={setPassword} secureTextEntry
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

      {/* STEP: Done */}
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
  root: { flex: 1, backgroundColor: '#0F0C29' },
  content: { padding: 24, paddingTop: 60, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', gap: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff' },
  heading: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 22 },
  label: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
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
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  hashBox: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    padding: 16, width: '100%', gap: 6,
  },
  hashLabel: { color: '#A855F7', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  hash: { color: '#fff', fontSize: 11, fontFamily: 'monospace', lineHeight: 18 },
});

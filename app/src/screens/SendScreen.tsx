/**
 * SendScreen — POS-style payment flow.
 *
 * The logged-in user is the RECEIVER (merchant).
 * The PAYER taps their NFC card on this phone and enters their password.
 * Funds move: payer's wallet → receiver's wallet.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { NFCService } from '../services/NFCService';
import { NetworkService } from '../services/NetworkService';
import { reconstructKeys } from '../services/WalletService';
import { hexToBytes } from '../services/CryptoService';
import { useApp } from '../store/AppContext';

type Step = 'select' | 'amount' | 'nfc' | 'password' | 'sending' | 'done';

const ETH_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
const SOL_RPC = 'https://api.devnet.solana.com';

async function sendEth(fromPrivKeyHex: string, toAddress: string, amountEth: string): Promise<string> {
  const { ethers } = require('ethers');
  const provider = new ethers.JsonRpcProvider(ETH_RPC);
  const wallet = new ethers.Wallet(fromPrivKeyHex, provider);
  const tx = await wallet.sendTransaction({ to: toAddress, value: ethers.parseEther(amountEth) });
  return tx.hash;
}

async function sendSol(fromPrivKeyHex: string, toAddress: string, amountSol: string): Promise<string> {
  const nacl = require('tweetnacl');
  const { Connection, PublicKey, SystemProgram, Transaction, Keypair } = require('@solana/web3.js');
  const privKeyBytes = hexToBytes(fromPrivKeyHex);
  const nacl_keypair = nacl.sign.keyPair.fromSeed(privKeyBytes);
  const solKeypair = Keypair.fromSecretKey(
    Buffer.concat([Buffer.from(privKeyBytes), Buffer.from(nacl_keypair.publicKey)])
  );
  const connection = new Connection(SOL_RPC, 'confirmed');
  const lamports = Math.round(parseFloat(amountSol) * 1e9);
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  const txn = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(nacl_keypair.publicKey),
      toPubkey:   new PublicKey(toAddress),
      lamports,
    })
  );
  txn.recentBlockhash = blockhash;
  txn.feePayer = new PublicKey(nacl_keypair.publicKey);
  txn.sign(solKeypair);
  return connection.sendRawTransaction(txn.serialize());
}

export default function SendScreen() {
  const { ethAddress, solAddress } = useApp();

  const [step, setStep]         = useState<Step>('select');
  const [chain, setChain]       = useState<'ETH' | 'SOL'>('ETH');
  const [amount, setAmount]     = useState('');
  const [password, setPassword] = useState('');
  const [payerWalletId, setPayerWalletId] = useState('');
  const [payerNfcHalf, setPayerNfcHalf]   = useState('');
  const [txHash, setTxHash]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const myAddress = chain === 'ETH' ? ethAddress : solAddress;

  const selectChain = (c: 'ETH' | 'SOL') => {
    setChain(c);
    setStep('amount');
  };

  const goToNfc = () => {
    if (!amount.trim()) { setError('Enter an amount'); return; }
    setError('');
    setStep('nfc');
    NFCService.readCard()
      .then(card => {
        setPayerWalletId(card.walletId);
        setPayerNfcHalf(card.nfcHalfHex);
        setStep('password');
      })
      .catch(e => {
        setError(e.message);
        setStep('amount');
      });
  };

  const doCollect = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch payer's server half using walletId from their NFC card
      const payerServer = await NetworkService.fetchWallet(payerWalletId);

      // Reconstruct payer's private keys — verifies password + nfcHalf are correct
      const { ethPrivKey, solPrivKey } = await reconstructKeys(payerNfcHalf, payerServer, password);

      let hash: string;

      if (chain === 'ETH') {
        // Try BitGo first — co-signed transaction, NFC card enforces authorisation
        try {
          const result = await NetworkService.bitgoSend(payerWalletId, myAddress, amount.trim(), password);
          hash = result.txHash;
        } catch {
          // BitGo wallet not provisioned — fall back to direct send
          hash = await sendEth(ethPrivKey, myAddress, amount.trim());
        }
      } else {
        hash = await sendSol(solPrivKey, myAddress, amount.trim());
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
    setStep('select');
    setAmount(''); setPassword('');
    setPayerWalletId(''); setPayerNfcHalf('');
    setTxHash(''); setError('');
  };

  // ── Select chain ─────────────────────────────────────────────────────────
  if (step === 'select') return (
    <View style={s.root}>
      <View style={s.center}>
        <Text style={s.title}>Collect Payment</Text>
        <Text style={s.sub}>Choose which currency to receive</Text>
        <TouchableOpacity style={s.bigChainBtn} onPress={() => selectChain('ETH')}>
          <Text style={s.bigChainIcon}>⬡</Text>
          <Text style={s.bigChainLabel}>Ethereum</Text>
          <Text style={s.bigChainSub}>Sepolia testnet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.bigChainBtn, { borderColor: '#9945FF' }]} onPress={() => selectChain('SOL')}>
          <Text style={s.bigChainIcon}>◎</Text>
          <Text style={s.bigChainLabel}>Solana</Text>
          <Text style={s.bigChainSub}>Devnet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Enter amount ─────────────────────────────────────────────────────────
  if (step === 'amount') return (
    <ScrollView style={s.root} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => setStep('select')} style={s.back}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={s.title}>Collect {chain}</Text>

      <View style={s.receiverBox}>
        <Text style={s.receiverLabel}>Sending to your wallet</Text>
        <Text style={s.receiverAddr} numberOfLines={1}>{myAddress}</Text>
      </View>

      <Text style={s.label}>Amount ({chain})</Text>
      <TextInput
        style={s.input}
        placeholder="0.00"
        placeholderTextColor="#888"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        autoFocus
      />

      {!!error && <Text style={s.error}>{error}</Text>}

      <TouchableOpacity
        style={[s.btn, !amount && s.btnDisabled]}
        onPress={goToNfc}
        disabled={!amount}
      >
        <Text style={s.btnText}>Ask Payer to Tap Card →</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── NFC scan ─────────────────────────────────────────────────────────────
  if (step === 'nfc') return (
    <View style={s.root}>
      <View style={s.center}>
        <Text style={{ fontSize: 90 }}>📡</Text>
        <Text style={s.title}>Payer: Tap Your Card</Text>
        <Text style={s.sub}>
          The person paying should hold{'\n'}their NFC card to this phone
        </Text>
        <Text style={s.amountBadge}>{amount} {chain}</Text>
        <ActivityIndicator size="large" color="#A855F7" style={{ marginTop: 8 }} />
        {!!error && <Text style={s.error}>{error}</Text>}
        <TouchableOpacity style={s.cancelBtn} onPress={() => { NFCService.cancelScan?.(); setStep('amount'); }}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Password ─────────────────────────────────────────────────────────────
  if (step === 'password') return (
    <ScrollView style={s.root} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 56, textAlign: 'center' }}>🔒</Text>
      <Text style={s.title}>Payer: Enter Password</Text>
      <Text style={s.sub}>
        The payer must enter their encryption password to authorise this payment.
      </Text>

      <View style={s.summaryBox}>
        <Text style={s.summaryRow}>
          <Text style={s.summaryKey}>Amount  </Text>
          <Text style={s.summaryVal}>{amount} {chain}</Text>
        </Text>
        <Text style={s.summaryRow}>
          <Text style={s.summaryKey}>To      </Text>
          <Text style={s.summaryVal}>{myAddress.slice(0, 10)}…{myAddress.slice(-8)}</Text>
        </Text>
      </View>

      <TextInput
        style={s.input}
        placeholder="Payer's encryption password"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoFocus
      />
      {!!error && <Text style={s.error}>{error}</Text>}

      <TouchableOpacity
        style={[s.btn, (!password || loading) && s.btnDisabled]}
        onPress={doCollect}
        disabled={!password || loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Confirm Payment</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={s.cancelBtn} onPress={reset}>
        <Text style={s.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Done ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <View style={s.center}>
        <Text style={{ fontSize: 80 }}>✅</Text>
        <Text style={s.title}>Payment Received!</Text>
        <Text style={s.sub}>{amount} {chain} is on its way to your wallet.</Text>
        <View style={s.hashBox}>
          <Text style={s.hashLabel}>Transaction Hash</Text>
          <Text style={s.hash} selectable>{txHash}</Text>
        </View>
        <TouchableOpacity style={s.btn} onPress={reset}>
          <Text style={s.btnText}>New Payment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#0F0C29' },
  scrollContent: { padding: 24, paddingTop: 60, gap: 14, flexGrow: 1 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 32 },
  title:         { fontSize: 26, fontWeight: '700', color: '#fff', textAlign: 'center' },
  sub:           { color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22 },
  label:         { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  error:         { color: '#f87171', textAlign: 'center' },
  back:          { marginBottom: 4 },
  backText:      { color: '#A855F7', fontSize: 15 },
  receiverBox: {
    backgroundColor: 'rgba(168,85,247,0.12)', borderRadius: 12,
    padding: 14, gap: 4, borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
  },
  receiverLabel: { color: '#A855F7', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  receiverAddr:  { color: '#fff', fontSize: 12, fontFamily: 'monospace' },
  bigChainBtn: {
    width: '100%', borderRadius: 20, borderWidth: 1.5,
    borderColor: '#627EEA', padding: 24, alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bigChainIcon:  { fontSize: 40 },
  bigChainLabel: { fontSize: 22, fontWeight: '700', color: '#fff' },
  bigChainSub:   { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  amountBadge: {
    backgroundColor: 'rgba(168,85,247,0.2)', borderRadius: 20,
    paddingHorizontal: 24, paddingVertical: 10,
    color: '#fff', fontSize: 22, fontWeight: '700',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
    padding: 16, color: '#fff', fontSize: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  summaryBox: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    padding: 16, gap: 8,
  },
  summaryRow:    { color: '#fff', fontSize: 14 },
  summaryKey:    { color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' },
  summaryVal:    { color: '#fff', fontWeight: '600' },
  btn: {
    backgroundColor: '#A855F7', borderRadius: 14,
    padding: 16, alignItems: 'center', width: '100%',
  },
  btnDisabled: { opacity: 0.4 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 17 },
  cancelBtn:   { alignItems: 'center', paddingVertical: 8 },
  cancelText:  { color: 'rgba(255,255,255,0.35)', fontSize: 14 },
  hashBox: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    padding: 16, width: '100%', gap: 6,
  },
  hashLabel: { color: '#A855F7', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  hash:      { color: '#fff', fontSize: 11, fontFamily: 'monospace', lineHeight: 18 },
});

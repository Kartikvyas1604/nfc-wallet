import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { generateWallets, splitCombinedKeys } from '../services/WalletService';
import { NetworkService } from '../services/NetworkService';
import { NFCService } from '../services/NFCService';
import { useApp } from '../store/AppContext';
import type { CombinedKeySplit } from '../types';

type Step = 'generating' | 'mnemonic' | 'password' | 'nfc' | 'done';

export default function CreateWalletScreen() {
  const { saveWalletAddresses } = useApp();
  const [step, setStep]         = useState<Step>('generating');
  const [mnemonic, setMnemonic] = useState('');
  const [ethAddress, setEthAddress] = useState('');
  const [solAddress, setSolAddress] = useState('');
  const [ethPrivKey, setEthPrivKey] = useState('');
  const [solPrivKey, setSolPrivKey] = useState('');
  const [password, setPassword]   = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [split, setSplit]         = useState<CombinedKeySplit | null>(null);
  const [loading, setLoading]     = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => { doGenerate(); }, []);

  const doGenerate = async () => {
    setStep('generating');
    setError('');
    try {
      const w = await generateWallets();
      setMnemonic(w.mnemonic);
      setEthAddress(w.ethAddress);
      setSolAddress(w.solAddress);
      setEthPrivKey(w.ethPrivateKey);
      setSolPrivKey(w.solPrivateKey);
      setStep('mnemonic');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const doEncrypt = async () => {
    if (password !== confirmPw) { setError('Passwords do not match'); return; }
    if (password.length < 8)   { setError('Encryption password must be at least 8 characters'); return; }
    setLoading(true);
    setError('');
    try {
      // Encrypt eth+sol keys as one combined blob, then XOR-split
      const keySplit = await splitCombinedKeys(
        ethPrivKey, solPrivKey, ethAddress, solAddress, password
      );
      // Upload server half — NFC half never leaves the device until written to card
      await NetworkService.storeWallet(keySplit);
      setSplit(keySplit);
      setStep('nfc');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const doWriteNFC = async () => {
    if (!split) return;
    setLoading(true);
    setError('');
    try {
      await NFCService.writeCard(split.walletId, split.nfcHalf);
      // Clear private keys from state now that card is written
      setEthPrivKey('');
      setSolPrivKey('');
      // Provision BitGo wallet — passphrase = encryption password (links NFC auth to BitGo signing)
      try {
        await NetworkService.createBitgoWallet(password);
      } catch {
        // BitGo provisioning is best-effort at setup; won't block wallet creation
      }
      setStep('done');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const words = mnemonic.split(' ');

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>

      {/* STEP: Generating */}
      {step === 'generating' && (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#A855F7" />
          <Text style={s.heading}>Generating your wallets…</Text>
          {!!error && (
            <>
              <Text style={s.error}>{error}</Text>
              <TouchableOpacity style={s.btn} onPress={doGenerate}>
                <Text style={s.btnText}>Retry</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* STEP: Show Mnemonic */}
      {step === 'mnemonic' && (
        <View style={{ gap: 16 }}>
          <Text style={s.icon}>🔑</Text>
          <Text style={s.heading}>Recovery Phrase</Text>
          <Text style={s.sub}>
            Write these 12 words down in order. This is the only backup for both your ETH and SOL wallets.
          </Text>
          <View style={s.grid}>
            {words.map((w, i) => (
              <View key={i} style={s.wordCell}>
                <Text style={s.wordNum}>{i + 1}.</Text>
                <Text style={s.word}>{w}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={s.checkbox} onPress={() => setConfirmed(!confirmed)}>
            <Text style={{ color: confirmed ? '#A855F7' : '#555', fontSize: 20 }}>
              {confirmed ? '☑' : '☐'}
            </Text>
            <Text style={s.checkLabel}>I've written down my recovery phrase</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, !confirmed && s.btnDisabled]}
            onPress={() => setStep('password')}
            disabled={!confirmed}
          >
            <Text style={s.btnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP: Set Encryption Password */}
      {step === 'password' && (
        <View style={{ gap: 16 }}>
          <Text style={s.icon}>🔒</Text>
          <Text style={s.heading}>Set Encryption Password</Text>
          <Text style={s.sub}>
            This password encrypts your private keys. It is different from your login password.{'\n'}
            It is never stored anywhere — you will need it for every payment.
          </Text>
          <TextInput
            style={s.input}
            placeholder="Encryption password (min 8 chars)"
            placeholderTextColor="#888"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={s.input}
            placeholder="Confirm encryption password"
            placeholderTextColor="#888"
            secureTextEntry
            value={confirmPw}
            onChangeText={setConfirmPw}
          />
          {!!error && <Text style={s.error}>{error}</Text>}
          <TouchableOpacity
            style={[s.btn, (password.length < 8 || !confirmPw) && s.btnDisabled]}
            onPress={doEncrypt}
            disabled={loading || password.length < 8 || !confirmPw}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Encrypt Keys</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* STEP: Write NFC */}
      {step === 'nfc' && (
        <View style={s.center}>
          <Text style={s.icon}>📡</Text>
          <Text style={s.heading}>Program NFC Card</Text>
          <Text style={s.sub}>
            Hold your NFC card to the back of the phone.{'\n'}
            Both ETH and SOL key halves will be written in one tap.
          </Text>
          {!!error && <Text style={s.error}>{error}</Text>}
          <TouchableOpacity style={s.btn} onPress={doWriteNFC} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Tap to Write NFC Card</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* STEP: Done */}
      {step === 'done' && (
        <View style={s.center}>
          <Text style={{ fontSize: 64 }}>✅</Text>
          <Text style={s.heading}>Wallet Ready!</Text>
          <Text style={s.sub}>Your keys are split. Half on the server, half on your NFC card.</Text>
          <View style={s.addrBox}>
            <Text style={s.addrLabel}>ETH (Sepolia testnet)</Text>
            <Text style={s.addr}>{ethAddress}</Text>
          </View>
          <View style={s.addrBox}>
            <Text style={s.addrLabel}>SOL (Devnet)</Text>
            <Text style={s.addr}>{solAddress}</Text>
          </View>
          <TouchableOpacity style={s.btn} onPress={() => saveWalletAddresses(ethAddress, solAddress, split?.walletId ?? '')}>
            <Text style={s.btnText}>Open Wallet</Text>
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
  icon:    { textAlign: 'center', fontSize: 48 },
  heading: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center' },
  sub:     { color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 22 },
  error:   { color: '#f87171', textAlign: 'center' },
  grid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wordCell: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7, width: '30%',
  },
  wordNum:  { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  word:     { color: '#fff', fontFamily: 'monospace', fontSize: 13 },
  checkbox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkLabel: { color: 'rgba(255,255,255,0.7)', flex: 1 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
    padding: 16, color: '#fff', fontSize: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  btn: {
    backgroundColor: '#A855F7', borderRadius: 14,
    padding: 16, alignItems: 'center', width: '100%',
  },
  btnDisabled: { opacity: 0.4 },
  btnText:     { color: '#fff', fontWeight: '600', fontSize: 16 },
  addrBox: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10,
    padding: 12, width: '100%', gap: 4,
  },
  addrLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700' },
  addr:      { color: '#fff', fontSize: 12, fontFamily: 'monospace' },
});

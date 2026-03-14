import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { NFCService } from '../services/NFCService';
import { NetworkService } from '../services/NetworkService';
import { splitCombinedKeys } from '../services/WalletService';
import { reconstructKeys } from '../services/WalletService';
import { useApp } from '../store/AppContext';

type Step = 'idle' | 'writing' | 'done';

export default function ReprogramCardScreen() {
  const { walletId } = useApp();
  const [step, setStep]         = useState<Step>('idle');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const reprogram = async () => {
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      // 1. Fetch server half using current walletId
      const server = await NetworkService.fetchWallet(walletId);

      // 2. Reconstruct keys to verify password is correct
      //    (also gives us the private keys needed to re-split)
      const { ethPrivKey, solPrivKey } = await reconstructKeys(
        // nfcHalf is not available here — we re-derive from server data + password
        // by re-running the full split with the same password
        // Actually: we need to decrypt first. To do that we need the nfcHalf.
        // Solution: ask user to tap old card first, then write to new card.
        '', server, password
      );

      setStep('writing');
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  // ── Full flow: tap OLD card → verify password → write NEW card ──────────
  const [nfcHalf, setNfcHalf] = useState('');
  const [readDone, setReadDone] = useState(false);

  const readOldCard = async () => {
    setLoading(true);
    setError('');
    try {
      const card = await NFCService.readCard();
      setNfcHalf(card.nfcHalfHex);
      setReadDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const writeNewCard = async () => {
    if (!password || !nfcHalf) return;
    setLoading(true);
    setError('');
    try {
      // Verify password by attempting decryption
      const server = await NetworkService.fetchWallet(walletId);
      await reconstructKeys(nfcHalf, server, password); // throws if wrong password

      // Password is correct — write same nfcHalf to the new card
      setStep('writing');
      await NFCService.writeCard(walletId, nfcHalf);
      setStep('done');
    } catch (e: any) {
      setError(e.message);
      setStep('idle');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('idle');
    setPassword('');
    setNfcHalf('');
    setReadDone(false);
    setError('');
  };

  if (step === 'writing') return (
    <View style={s.root}>
      <View style={s.center}>
        <Text style={{ fontSize: 80 }}>📡</Text>
        <Text style={s.title}>Hold New Card</Text>
        <Text style={s.sub}>Hold the new NFC card to the back of the phone to write your wallet.</Text>
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    </View>
  );

  if (step === 'done') return (
    <View style={s.root}>
      <View style={s.center}>
        <Text style={{ fontSize: 80 }}>✅</Text>
        <Text style={s.title}>Card Programmed</Text>
        <Text style={s.sub}>Your wallet has been written to the new NFC card.</Text>
        <TouchableOpacity style={s.btn} onPress={reset}>
          <Text style={s.btnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Reprogram Card</Text>
      <Text style={s.sub}>
        Use this to write your wallet to a new NFC card.{'\n'}
        You'll need your current card and encryption password.
      </Text>

      {/* Step 1: tap current card */}
      <View style={s.step}>
        <Text style={s.stepLabel}>Step 1 — Read current card</Text>
        <TouchableOpacity
          style={[s.btn, readDone && s.btnDone]}
          onPress={readOldCard}
          disabled={loading || readDone}
        >
          {loading && !readDone
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>{readDone ? '✓ Card read' : 'Tap Current Card'}</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Step 2: enter password */}
      <View style={s.step}>
        <Text style={s.stepLabel}>Step 2 — Enter encryption password</Text>
        <TextInput
          style={[s.input, !readDone && s.inputDisabled]}
          placeholder="Encryption password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={readDone}
        />
      </View>

      {/* Step 3: write to new card */}
      <View style={s.step}>
        <Text style={s.stepLabel}>Step 3 — Write to new card</Text>
        <TouchableOpacity
          style={[s.btn, (!readDone || !password) && s.btnDisabled]}
          onPress={writeNewCard}
          disabled={!readDone || !password || loading}
        >
          {loading && readDone
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Tap New Card to Write</Text>
          }
        </TouchableOpacity>
      </View>

      {!!error && <Text style={s.error}>{error}</Text>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#0F0C29' },
  content:      { padding: 24, paddingTop: 60, gap: 20 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32 },
  title:        { fontSize: 24, fontWeight: '700', color: '#fff' },
  sub:          { color: 'rgba(255,255,255,0.55)', lineHeight: 22 },
  step:         { gap: 10 },
  stepLabel:    { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
    padding: 16, color: '#fff', fontSize: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  inputDisabled: { opacity: 0.4 },
  error:         { color: '#f87171', textAlign: 'center' },
  btn: {
    backgroundColor: '#A855F7', borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  btnDone:     { backgroundColor: '#22c55e' },
  btnDisabled: { opacity: 0.4 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
});

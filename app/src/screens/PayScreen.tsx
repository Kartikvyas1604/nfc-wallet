import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  Pressable,
  Animated,
  TextInput,
  Linking,
  StatusBar,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';

import { Colors, Shadows, Radius, Spacing } from '../theme/colors';
import { FontFamily, FontSize } from '../theme/typography';
import GradientCard from '../components/ui/GradientCard';
import OrangeButton from '../components/ui/OrangeButton';
import AddressChip from '../components/ui/AddressChip';
import NFCRingAnimation from '../components/ui/NFCRingAnimation';
import StepIndicator from '../components/ui/StepIndicator';
import BalancePill from '../components/ui/BalancePill';
import PinDot from '../components/ui/PinDot';

// ── Types & Constants ─────────────────────────────────────────────────────────
type Step = 0 | 1 | 2 | 3 | 4;  // Select → Tap → Confirm → Success → Fail

const CHAINS = [
  { id: 'ETH',      label: 'ETH',       color: Colors.eth,  balance: '1.24',   usd: '$3,102.00' },
  { id: 'SOL',      label: 'SOL',       color: Colors.sol,  balance: '28.50',  usd: '$1,482.00' },
  { id: 'USDC_ETH', label: 'USDC·ETH',  color: Colors.usdc, balance: '124.50', usd: '$124.50'   },
  { id: 'USDC_SOL', label: 'USDC·SOL',  color: Colors.usdc, balance: '112.84', usd: '$112.84'   },
];

const SIGN_STEPS = [
  'Fetching secure share',
  'Reconstructing key',
  'Signing transaction',
  'Broadcasting',
];

const MOCK_TX = '0x7f3a...9c12d';
const EXPLORER = 'https://etherscan.io/tx/0x7f3a';

function isValidAddress(addr: string): boolean | null {
  if (!addr || addr.length < 6) return null;
  return addr.startsWith('0x') ? addr.length === 42 : addr.length >= 32 && addr.length <= 44;
}

// ── Signing Progress overlay ──────────────────────────────────────────────────
function SigningProgress({ active }: { active: number }) {
  return (
    <View style={spStyles.wrap}>
      {SIGN_STEPS.map((step, i) => (
        <View key={i} style={spStyles.row}>
          <View style={[spStyles.dot, i <= active ? spStyles.dotActive : spStyles.dotInactive]} />
          <Text allowFontScaling={false} style={[spStyles.label, i <= active ? spStyles.labelActive : spStyles.labelInactive]}>
            {step}
          </Text>
          {i < active && <Feather name="check" size={14} color={Colors.success} style={spStyles.icon} />}
          {i === active && <Animated.View style={spStyles.spinWrap}><Feather name="loader" size={14} color={Colors.brandOrange} /></Animated.View>}
        </View>
      ))}
    </View>
  );
}

const spStyles = StyleSheet.create({
  wrap: { gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: Colors.brandOrange },
  dotInactive: { backgroundColor: Colors.textFaint },
  label: { fontFamily: FontFamily.inter, fontSize: FontSize.base, flex: 1 },
  labelActive: { color: Colors.offWhite },
  labelInactive: { color: Colors.textFaint },
  icon: {},
  spinWrap: {},
});

// ── SUCCESS Screen ────────────────────────────────────────────────────────────
function SuccessScreen({ amount, chain, toAddress, onDone, onShare }: {
  amount: string; chain: string; toAddress: string; onDone: () => void; onShare: () => void;
}) {
  const scale = useRef(new Animated.Value(0)).current;
  const fade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }),
      Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={succStyles.wrap}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Svg width={120} height={120} viewBox="0 0 120 120">
          <Circle cx="60" cy="60" r="55" stroke={Colors.success} strokeWidth="3" fill="rgba(0,214,143,0.08)" />
          <Polyline points="36,62 52,78 84,44" stroke={Colors.success} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </Animated.View>
      <Animated.View style={{ opacity: fade, alignItems: 'center', gap: 8 }}>
        <Text allowFontScaling={false} style={succStyles.title}>Payment Sent!</Text>
        <Text allowFontScaling={false} style={succStyles.amount}>{amount} {chain}</Text>
        <Text allowFontScaling={false} style={succStyles.to}>
          To: {toAddress.slice(0, 8)}…{toAddress.slice(-6)}
        </Text>
        <Pressable onPress={() => Linking.openURL(EXPLORER)}>
          <Text allowFontScaling={false} style={succStyles.txHash}>{MOCK_TX}</Text>
        </Pressable>
        <View style={succStyles.btnRow}>
          <View style={{ flex: 1 }}>
            <OrangeButton label="Share Receipt" onPress={onShare} variant="outline" />
          </View>
          <View style={{ flex: 1 }}>
            <OrangeButton label="Done" onPress={onDone} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const succStyles = StyleSheet.create({
  wrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 24 },
  title:  { fontFamily: FontFamily.syneXBold, fontSize: FontSize['3xl'], color: Colors.offWhite, textAlign: 'center' },
  amount: { fontFamily: FontFamily.monoBold, fontSize: FontSize.monoLg, color: Colors.offWhite },
  to:     { fontFamily: FontFamily.inter, fontSize: FontSize.base, color: Colors.textMuted },
  txHash: { fontFamily: FontFamily.mono, fontSize: FontSize.xs, color: Colors.brandOrange, textDecorationLine: 'underline' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
});

// ── FAIL Screen ───────────────────────────────────────────────────────────────
function FailScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }).start();
  }, []);

  return (
    <View style={failStyles.wrap}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Svg width={120} height={120} viewBox="0 0 120 120">
          <Circle cx="60" cy="60" r="55" stroke={Colors.error} strokeWidth="3" fill="rgba(255,71,87,0.08)" />
          <Path d="M40 40 L80 80 M80 40 L40 80" stroke={Colors.error} strokeWidth="5" strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <Text allowFontScaling={false} style={failStyles.title}>Payment Failed</Text>
      <Text allowFontScaling={false} style={failStyles.msg}>{error}</Text>
      <OrangeButton label="Try Again" onPress={onRetry} />
    </View>
  );
}

const failStyles = StyleSheet.create({
  wrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24 },
  title: { fontFamily: FontFamily.syneXBold, fontSize: FontSize['2xl'], color: Colors.offWhite },
  msg:   { fontFamily: FontFamily.inter, fontSize: FontSize.base, color: Colors.textMuted, textAlign: 'center' },
});

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export default function PayScreen({ navigation }: any) {
  const [step,         setStep]         = useState<Step>(0);
  const [chainIdx,     setChainIdx]     = useState(0);
  const [amount,       setAmount]       = useState('');
  const [recipient,    setRecipient]    = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nfcState,     setNfcState]     = useState<'idle'|'scanning'|'success'|'error'>('idle');
  const [countdown,    setCountdown]    = useState(30);
  const [signing,      setSigning]      = useState(false);
  const [signStep,     setSignStep]     = useState(-1);
  const [errorMsg,     setErrorMsg]     = useState('');

  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(20)).current;
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedChain = CHAINS[chainIdx];
  const addrValid     = isValidAddress(recipient);
  const canProceed    = addrValid === true && parseFloat(amount) > 0;

  // Screen entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideIn, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  // Step 2 countdown
  useEffect(() => {
    if (step !== 1) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(30);
      return;
    }
    setNfcState('scanning');
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setNfcState('error');
          setTimeout(() => handleCancel(), 1200);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [step]);

  const handleNFCSuccess = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setNfcState('success');
    setTimeout(() => setStep(2), 900);
  };

  const handleCancel = () => {
    setNfcState('idle');
    setStep(0);
  };

  const handleConfirm = async () => {
    setSigning(true);
    setSignStep(0);
    // Simulate signing pipeline
    const steps = [800, 700, 600, 500];
    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, steps[i]));
      setSignStep(i + 1);
    }
    setSigning(false);
    // Simulate 90% success
    if (Math.random() > 0.1) {
      setStep(3);
    } else {
      setErrorMsg('Insufficient balance or network error. Please try again.');
      setStep(4);
    }
  };

  const resetFlow = () => {
    setStep(0);
    setAmount('');
    setRecipient('');
    setPassword('');
    setNfcState('idle');
    setSignStep(-1);
    setSigning(false);
    setCountdown(30);
  };

  if (step === 3) {
    return (
      <SafeAreaView style={styles.safe}>
        <SuccessScreen
          amount={amount}
          chain={selectedChain.label}
          toAddress={recipient}
          onDone={() => { resetFlow(); navigation?.navigate('Wallet'); }}
          onShare={() => {}}
        />
      </SafeAreaView>
    );
  }

  if (step === 4) {
    return (
      <SafeAreaView style={styles.safe}>
        <FailScreen error={errorMsg} onRetry={resetFlow} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.screen, { opacity: fadeIn, transform: [{ translateY: slideIn }] }]}>

        {/* Step indicator */}
        <View style={styles.stepWrap}>
          <StepIndicator
            steps={['Select', 'Tap Card', 'Confirm']}
            currentStep={step}
          />
        </View>

        {/* ── STEP 1: SELECT ─────────────────────────────────────────────── */}
        {step === 0 && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepContent}>
            <Text allowFontScaling={false} style={styles.pageTitle}>Send Payment</Text>

            {/* Chain selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chainRow}
            >
              {CHAINS.map((c, i) => (
                <Pressable key={c.id} onPress={() => setChainIdx(i)}>
                  <Animated.View
                    style={[
                      styles.chainPill,
                      i === chainIdx ? styles.chainPillActive : styles.chainPillInactive,
                      i === chainIdx ? (Shadows.orangeGlow as object) : {},
                    ]}
                  >
                    <View style={[styles.chainDot, { backgroundColor: c.color }]} />
                    <Text
                      allowFontScaling={false}
                      style={[
                        styles.chainPillLabel,
                        i === chainIdx ? styles.chainPillLabelActive : styles.chainPillLabelInactive,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </Animated.View>
                </Pressable>
              ))}
            </ScrollView>

            {/* Available balance */}
            <View style={styles.availRow}>
              <Text allowFontScaling={false} style={styles.availLabel}>Available</Text>
              <BalancePill
                assetSymbol={selectedChain.label}
                balance={selectedChain.balance}
                chainColor={selectedChain.color}
              />
              <Text allowFontScaling={false} style={styles.availUSD}>{selectedChain.usd}</Text>
            </View>

            {/* Amount input */}
            <View style={styles.amountWrap}>
              <View style={styles.amountRow}>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={Colors.textFaint}
                  allowFontScaling={false}
                  textAlign="center"
                />
                <Pressable style={styles.maxBtn} onPress={() => setAmount(selectedChain.balance)}>
                  <Text allowFontScaling={false} style={styles.maxLabel}>MAX</Text>
                </Pressable>
              </View>
              <View style={styles.amountUnderline} />
              <Text allowFontScaling={false} style={styles.currencyLabel}>{selectedChain.label}</Text>
              {amount.length > 0 && (
                <Text allowFontScaling={false} style={styles.usdEquiv}>
                  ≈ ${(parseFloat(amount || '0') * 2503.5).toFixed(2)}
                </Text>
              )}
            </View>

            {/* Recipient input */}
            <GradientCard style={styles.recipientCard} noPadding>
              <View style={styles.recipientInner}>
                <Text allowFontScaling={false} style={styles.inputLabel}>TO ADDRESS</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.addressInput}
                    value={recipient}
                    onChangeText={setRecipient}
                    placeholder="0x... or Solana address"
                    placeholderTextColor={Colors.textFaint}
                    allowFontScaling={false}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={styles.inputIcons}>
                    {addrValid !== null && (
                      <Feather
                        name={addrValid ? 'check-circle' : 'x-circle'}
                        size={16}
                        color={addrValid ? Colors.success : Colors.error}
                      />
                    )}
                    <Pressable onPress={async () => setRecipient(await Clipboard.getStringAsync())}>
                      <Feather name="clipboard" size={16} color={Colors.brandOrange} />
                    </Pressable>
                    <Pressable>
                      <Feather name="maximize" size={16} color={Colors.brandOrange} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </GradientCard>

            <View style={styles.btnMargin}>
              <OrangeButton
                label="Continue →"
                onPress={() => setStep(1)}
                disabled={!canProceed}
                fullWidth
              />
            </View>
          </ScrollView>
        )}

        {/* ── STEP 2: TAP CARD ───────────────────────────────────────────── */}
        {step === 1 && (
          <View style={styles.nfcStep}>
            <Text allowFontScaling={false} style={styles.nfcTitle}>Tap Your Card</Text>
            <Text allowFontScaling={false} style={styles.nfcSubtitle}>
              Hold your NFC card near the back of your phone
            </Text>
            <NFCRingAnimation state={nfcState} size={200} />
            <Pressable onPress={handleNFCSuccess} style={styles.nfcSimBtn}>
              <Text allowFontScaling={false} style={styles.nfcSimLabel}>
                (Tap to simulate NFC success)
              </Text>
            </Pressable>
            <Text allowFontScaling={false} style={styles.countdownText}>
              {nfcState === 'scanning' ? `Waiting… ${countdown}s` : ''}
            </Text>
            <OrangeButton label="Cancel" onPress={handleCancel} variant="ghost" size="sm" />
          </View>
        )}

        {/* ── STEP 3: CONFIRM ────────────────────────────────────────────── */}
        {step === 2 && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.stepContent}>
            <Text allowFontScaling={false} style={styles.pageTitle}>Confirm Payment</Text>

            {/* Summary card */}
            <GradientCard glowColor={Colors.orangeDim} style={styles.summaryCard}>
              <Text allowFontScaling={false} style={styles.summaryAmount}>
                {amount} {selectedChain.label}
              </Text>
              <Text allowFontScaling={false} style={styles.summaryUSD}>
                ≈ ${(parseFloat(amount || '0') * 2503.5).toFixed(2)}
              </Text>
              <View style={styles.arrowRow}>
                <View style={styles.arrowLine} />
                <View style={styles.arrowCircle}>
                  <Feather name="arrow-down" size={16} color={Colors.brandOrange} />
                </View>
                <View style={styles.arrowLine} />
              </View>
              <View style={styles.toRow}>
                <Text allowFontScaling={false} style={styles.toLabel}>TO</Text>
                <AddressChip address={recipient} chain="ETH" />
              </View>
            </GradientCard>

            {/* Password input */}
            <GradientCard noPadding style={styles.passwordCard}>
              <View style={styles.pwdInner}>
                <Text allowFontScaling={false} style={styles.inputLabel}>WALLET PASSWORD</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.pwdInput}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholder="Enter your password"
                    placeholderTextColor={Colors.textFaint}
                    allowFontScaling={false}
                  />
                  <Pressable onPress={() => setShowPassword(v => !v)}>
                    <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={Colors.brandOrange} />
                  </Pressable>
                </View>
                <View style={styles.pinDotRow}>
                  <PinDot count={6} filled={Math.min(password.length, 6)} />
                </View>
              </View>
            </GradientCard>

            {/* Signing progress or confirm button */}
            {signing ? (
              <GradientCard style={styles.signingCard}>
                <SigningProgress active={signStep} />
              </GradientCard>
            ) : (
              <View style={styles.btnMargin}>
                <OrangeButton
                  label="Confirm Payment"
                  onPress={handleConfirm}
                  disabled={!password}
                  fullWidth
                  loading={signing}
                />
              </View>
            )}
          </ScrollView>
        )}

      </Animated.View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.deepDark },
  screen: { flex: 1 },
  stepWrap: { paddingVertical: 16, paddingHorizontal: 8 },
  stepContent: { paddingHorizontal: 20, paddingBottom: 40 },

  pageTitle: {
    fontFamily: FontFamily.syne,
    fontSize: FontSize['2xl'],
    color: Colors.offWhite,
    marginBottom: 20,
  },

  // Chain selector
  chainRow: { paddingBottom: 16, gap: 8 },
  chainPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.full,
  },
  chainPillActive:   { backgroundColor: Colors.brandOrange },
  chainPillInactive: { backgroundColor: Colors.surface },
  chainDot: { width: 8, height: 8, borderRadius: 4 },
  chainPillLabel:         { fontFamily: FontFamily.interMedium, fontSize: FontSize.sm },
  chainPillLabelActive:   { color: Colors.offWhite },
  chainPillLabelInactive: { color: Colors.textMuted },

  // Available row
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
  availLabel: { fontFamily: FontFamily.interMedium, fontSize: FontSize.sm, color: Colors.textMuted },
  availUSD:   { fontFamily: FontFamily.inter, fontSize: FontSize.sm, color: Colors.textFaint },

  // Amount input
  amountWrap: { alignItems: 'center', marginBottom: 28 },
  amountRow:  { flexDirection: 'row', alignItems: 'center', width: '100%' },
  amountInput: {
    flex: 1,
    fontFamily: FontFamily.syneXBold,
    fontSize: FontSize['4xl'],
    color: Colors.offWhite,
    textAlign: 'center',
    paddingVertical: 8,
  },
  amountUnderline: { width: '80%', height: 2, backgroundColor: Colors.brandOrange, marginTop: 4 },
  currencyLabel: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: 8,
  },
  usdEquiv: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.sm,
    color: Colors.textFaint,
    marginTop: 4,
  },
  maxBtn: {
    position: 'absolute',
    right: 0,
    backgroundColor: Colors.orangeDim,
    borderColor: Colors.orangeMid,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  maxLabel: { fontFamily: FontFamily.interBold, fontSize: FontSize.xs, color: Colors.brandOrange },

  // Recipient
  recipientCard: { borderRadius: Radius.md, marginBottom: 24 },
  recipientInner: { padding: 16 },
  inputLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addressInput: {
    flex: 1,
    fontFamily: FontFamily.mono,
    fontSize: FontSize.monoSm,
    color: Colors.offWhite,
    paddingVertical: 4,
  },
  inputIcons: { flexDirection: 'row', gap: 10, alignItems: 'center' },

  btnMargin: { marginTop: 8 },

  // NFC step
  nfcStep: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 24,
  },
  nfcTitle: {
    fontFamily: FontFamily.syneXBold,
    fontSize: FontSize['2xl'],
    color: Colors.offWhite,
    textAlign: 'center',
  },
  nfcSubtitle: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.base,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
  nfcSimBtn: {
    backgroundColor: Colors.surfaceBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  nfcSimLabel: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.xs,
    color: Colors.textFaint,
  },
  countdownText: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    height: 18,
  },

  // Confirm step
  summaryCard: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    borderRadius: Radius.lg,
  },
  summaryAmount: {
    fontFamily: FontFamily.syneXBold,
    fontSize: FontSize['2xl'],
    color: Colors.offWhite,
  },
  summaryUSD: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.base,
    color: Colors.textMuted,
  },
  arrowRow: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 8 },
  arrowLine: { flex: 1, height: 1, backgroundColor: Colors.textFaint },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.brandOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.xs,
    color: Colors.textFaint,
    letterSpacing: 1,
  },

  // Password
  passwordCard: { borderRadius: Radius.md, marginBottom: 20 },
  pwdInner: { padding: 16 },
  pwdInput: {
    flex: 1,
    fontFamily: FontFamily.inter,
    fontSize: FontSize.md,
    color: Colors.offWhite,
    paddingVertical: 4,
  },
  pinDotRow: { marginTop: 14 },

  // Signing
  signingCard: { borderRadius: Radius.md },
});

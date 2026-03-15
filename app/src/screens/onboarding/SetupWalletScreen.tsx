/**
 * SetupWalletScreen — 4-step wallet creation wizard.
 * Steps: Generate → Expose Seed → Set Password → Write NFC Card
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';

import { Colors, Radius } from '../../theme/colors';
import { FontFamily, FontSize } from '../../theme/typography';
import GradientCard from '../../components/ui/GradientCard';
import OrangeButton from '../../components/ui/OrangeButton';
import NFCRingAnimation from '../../components/ui/NFCRingAnimation';
import PinDot from '../../components/ui/PinDot';
import StepIndicator from '../../components/ui/StepIndicator';

// ── Types ─────────────────────────────────────────────────────────────────────
type Step = 0 | 1 | 2 | 3 | 4;  // Generate | Seed Phrase | Password | NFC Write | Done

// ── Seed word grid ────────────────────────────────────────────────────────────
const MOCK_SEED_WORDS = [
  'solar', 'frame', 'vapor', 'chess',
  'bloom', 'entry', 'mirror', 'torch',
  'grain', 'amber', 'weave', 'orbit',
];

function SeedGrid({ words, reveal }: { words: string[]; reveal: boolean }) {
  return (
    <View style={seedStyles.grid}>
      {words.map((word, i) => (
        <View key={i} style={seedStyles.cell}>
          <Text allowFontScaling={false} style={seedStyles.idx}>{String(i + 1).padStart(2, '0')}</Text>
          <Text allowFontScaling={false} style={[seedStyles.word, !reveal && seedStyles.blur]}>
            {reveal ? word : '•••••'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const seedStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cell: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  idx: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.xs,
    color: Colors.textFaint,
    width: 20,
  },
  word: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.base,
    color: Colors.offWhite,
  },
  blur: { color: Colors.textFaint, letterSpacing: 2 },
});

// ── Strength bar ──────────────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const score =
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);

  const label = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score];
  const color = [Colors.error, Colors.error, Colors.warning, Colors.warning, Colors.success][score];

  return (
    <View style={pwdStrengthStyles.wrap}>
      <View style={pwdStrengthStyles.bars}>
        {[0, 1, 2, 3].map(i => (
          <View
            key={i}
            style={[
              pwdStrengthStyles.bar,
              { backgroundColor: i < score ? color : Colors.textFaint + '40' },
            ]}
          />
        ))}
      </View>
      <Text allowFontScaling={false} style={[pwdStrengthStyles.label, { color }]}>
        {password.length > 0 ? label : ''}
      </Text>
    </View>
  );
}

const pwdStrengthStyles = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  bars:  { flex: 1, flexDirection: 'row', gap: 4 },
  bar:   { flex: 1, height: 3, borderRadius: 2 },
  label: { fontFamily: FontFamily.interMedium, fontSize: FontSize.xs, width: 60, textAlign: 'right' },
});

// ── NFC Write progress ────────────────────────────────────────────────────────
const WRITE_STEPS = ['Generating ECDH keypair', 'Encrypting seed share', 'Writing to NFC card'];

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export default function SetupWalletScreen({ navigation }: any) {
  const [step,         setStep]         = useState<Step>(0);
  const [generating,   setGenerating]   = useState(false);
  const [seedReveal,   setSeedReveal]   = useState(false);
  const [confirmed,    setConfirmed]    = useState(false);
  const [password,     setPassword]     = useState('');
  const [confirm,      setConfirm]      = useState('');
  const [showPwd,      setShowPwd]      = useState(false);
  const [nfcState,     setNfcState]     = useState<'idle'|'scanning'|'success'|'error'>('idle');
  const [writeStep,    setWriteStep]    = useState(-1);
  const [done,         setDone]         = useState(false);

  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(20)).current;

  const pwdMatch  = password === confirm && password.length >= 8;
  const pwdStrong = password.length >= 8;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideIn, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [step]);

  async function handleGenerate() {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1600));
    setGenerating(false);
    setStep(1);
  }

  function handleSeedConfirmed() {
    setStep(2);
  }

  function handleSetPassword() {
    setStep(3);
  }

  async function handleNFCWrite() {
    setNfcState('scanning');
    for (let i = 0; i < WRITE_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 900));
      setWriteStep(i);
    }
    await new Promise(r => setTimeout(r, 600));
    setNfcState('success');
    await new Promise(r => setTimeout(r, 1200));
    setStep(4);
  }

  if (step === 4) {
    return <DoneScreen onContinue={() => navigation?.replace('Main')} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.screen, { opacity: fadeIn, transform: [{ translateY: slideIn }] }]}>

        {/* Back / Header */}
        <View style={styles.navBar}>
          {step > 0 && (
            <Pressable onPress={() => setStep((step - 1) as Step)} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color={Colors.offWhite} />
            </Pressable>
          )}
          <StepIndicator
            steps={['Generate', 'Seed', 'Password', 'Write Card']}
            currentStep={step}
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

          {/* ── STEP 0: GENERATE ──────────────────────────────────────── */}
          {step === 0 && (
            <View style={styles.section}>
              <View style={styles.heroIcon}>
                <Feather name="zap" size={40} color={Colors.brandOrange} />
              </View>
              <Text allowFontScaling={false} style={styles.title}>Create Your Wallet</Text>
              <Text allowFontScaling={false} style={styles.subtitle}>
                We'll generate a 12-word seed phrase and split it across your device and NFC card using MPC key sharing.
              </Text>

              <View style={styles.infoCards}>
                <GradientCard style={styles.infoCard}>
                  <Feather name="lock" size={20} color={Colors.brandOrange} />
                  <Text allowFontScaling={false} style={styles.infoCardTitle}>Self-custodial</Text>
                  <Text allowFontScaling={false} style={styles.infoCardBody}>
                    Only you control your private keys. No third party ever sees your seed.
                  </Text>
                </GradientCard>
                <GradientCard style={styles.infoCard}>
                  <Feather name="credit-card" size={20} color={Colors.brandOrange} />
                  <Text allowFontScaling={false} style={styles.infoCardTitle}>NFC-backed security</Text>
                  <Text allowFontScaling={false} style={styles.infoCardBody}>
                    Your NFC card holds one key share. No card means no signing.
                  </Text>
                </GradientCard>
              </View>

              <OrangeButton
                label={generating ? 'Generating…' : 'Generate Wallet'}
                onPress={handleGenerate}
                loading={generating}
                fullWidth
                size="lg"
              />
            </View>
          )}

          {/* ── STEP 1: SEED PHRASE ───────────────────────────────────── */}
          {step === 1 && (
            <View style={styles.section}>
              <Text allowFontScaling={false} style={styles.title}>Your Seed Phrase</Text>
              <GradientCard glowColor={Colors.warning + '20'} style={styles.warnCard}>
                <Feather name="alert-triangle" size={18} color={Colors.warning} />
                <Text allowFontScaling={false} style={styles.warnText}>
                  Write these 12 words down and store them securely. Never share them with anyone.
                </Text>
              </GradientCard>

              <Pressable
                onPress={() => setSeedReveal(r => !r)}
                style={styles.revealBtn}
              >
                <Feather name={seedReveal ? 'eye-off' : 'eye'} size={16} color={Colors.brandOrange} />
                <Text allowFontScaling={false} style={styles.revealLabel}>
                  {seedReveal ? 'Tap to hide' : 'Tap to reveal seed phrase'}
                </Text>
              </Pressable>

              <SeedGrid words={MOCK_SEED_WORDS} reveal={seedReveal} />

              <Pressable
                onPress={() => setConfirmed(c => !c)}
                style={styles.checkRow}
              >
                <View style={[styles.checkbox, confirmed && styles.checkboxFilled]}>
                  {confirmed && <Feather name="check" size={12} color={Colors.offWhite} />}
                </View>
                <Text allowFontScaling={false} style={styles.checkLabel}>
                  I've written down my seed phrase
                </Text>
              </Pressable>

              <OrangeButton
                label="Continue →"
                onPress={handleSeedConfirmed}
                disabled={!confirmed}
                fullWidth
              />
            </View>
          )}

          {/* ── STEP 2: PASSWORD ──────────────────────────────────────── */}
          {step === 2 && (
            <View style={styles.section}>
              <Text allowFontScaling={false} style={styles.title}>Set Password</Text>
              <Text allowFontScaling={false} style={styles.subtitle}>
                This password encrypts your local key share. You'll use it to confirm every transaction.
              </Text>

              {/* Password input */}
              <GradientCard noPadding style={styles.inputCard}>
                <View style={styles.inputCardInner}>
                  <Text allowFontScaling={false} style={styles.inputLabel}>PASSWORD</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.textInput}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPwd}
                      placeholder="At least 8 characters"
                      placeholderTextColor={Colors.textFaint}
                      allowFontScaling={false}
                    />
                    <Pressable onPress={() => setShowPwd(v => !v)}>
                      <Feather name={showPwd ? 'eye-off' : 'eye'} size={18} color={Colors.brandOrange} />
                    </Pressable>
                  </View>
                  <PasswordStrength password={password} />
                </View>
              </GradientCard>

              {/* Confirm input */}
              <GradientCard noPadding style={styles.inputCard}>
                <View style={styles.inputCardInner}>
                  <Text allowFontScaling={false} style={styles.inputLabel}>CONFIRM PASSWORD</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.textInput}
                      value={confirm}
                      onChangeText={setConfirm}
                      secureTextEntry={!showPwd}
                      placeholder="Repeat password"
                      placeholderTextColor={Colors.textFaint}
                      allowFontScaling={false}
                    />
                    {confirm.length > 0 && (
                      <Feather
                        name={pwdMatch ? 'check-circle' : 'x-circle'}
                        size={18}
                        color={pwdMatch ? Colors.success : Colors.error}
                      />
                    )}
                  </View>
                  <View style={styles.pinDotRow}>
                    <PinDot count={6} filled={Math.min(password.length, 6)} />
                  </View>
                </View>
              </GradientCard>

              <OrangeButton
                label="Set Password →"
                onPress={handleSetPassword}
                disabled={!pwdMatch}
                fullWidth
              />
            </View>
          )}

          {/* ── STEP 3: NFC WRITE ─────────────────────────────────────── */}
          {step === 3 && (
            <View style={[styles.section, styles.nfcSection]}>
              <Text allowFontScaling={false} style={styles.title}>
                {nfcState === 'success' ? 'Card Written!' : 'Write to NFC Card'}
              </Text>
              <Text allowFontScaling={false} style={styles.subtitle}>
                {nfcState === 'idle'     ? 'Hold your NFC card against the back of your phone' :
                 nfcState === 'scanning' ? 'Writing secure key share to card…' :
                 nfcState === 'success'  ? 'Your NFC card is ready to use' :
                                          'Failed to write. Try again.'}
              </Text>

              <NFCRingAnimation state={nfcState} size={200} />

              {/* Write steps */}
              {nfcState === 'scanning' && (
                <GradientCard style={styles.writeStepsCard}>
                  {WRITE_STEPS.map((s, i) => (
                    <View key={i} style={styles.writeStepRow}>
                      <View style={[styles.writeStepDot, i <= writeStep ? styles.writeStepDotDone : styles.writeStepDotPending]} />
                      <Text allowFontScaling={false} style={[styles.writeStepLabel, i <= writeStep ? styles.writeStepLabelDone : styles.writeStepLabelPending]}>
                        {s}
                      </Text>
                      {i < writeStep && <Feather name="check" size={13} color={Colors.success} />}
                    </View>
                  ))}
                </GradientCard>
              )}

              {nfcState === 'idle' && (
                <OrangeButton label="Start Writing" onPress={handleNFCWrite} fullWidth />
              )}
              {nfcState === 'error' && (
                <OrangeButton label="Try Again" onPress={() => { setNfcState('idle'); setWriteStep(-1); }} />
              )}
            </View>
          )}

        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

// ── Done screen ───────────────────────────────────────────────────────────────
function DoneScreen({ onContinue }: { onContinue: () => void }) {
  const scale = useRef(new Animated.Value(0)).current;
  const fade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 12 }),
      Animated.timing(fade,  { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={doneStyles.safe}>
      <Animated.View style={[doneStyles.wrap, { opacity: Animated.add(scale, new Animated.Value(-0.1)) }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Svg width={120} height={120} viewBox="0 0 120 120">
            <Circle cx="60" cy="60" r="55" stroke={Colors.brandOrange} strokeWidth="3" fill={Colors.orangeDim} />
            <Polyline points="36,62 52,78 84,44" stroke={Colors.brandOrange} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Animated.View>
        <Animated.View style={{ opacity: fade, alignItems: 'center', gap: 8 }}>
          <Text allowFontScaling={false} style={doneStyles.title}>You're all set!</Text>
          <Text allowFontScaling={false} style={doneStyles.body}>
            Your wallet is ready. Your NFC card now holds your signing key. Keep it safe.
          </Text>
          <View style={doneStyles.tagRow}>
            {['ETH', 'Solana', 'NFC secured'].map(t => (
              <View key={t} style={doneStyles.tag}>
                <Text allowFontScaling={false} style={doneStyles.tagLabel}>{t}</Text>
              </View>
            ))}
          </View>
          <OrangeButton label="Open Wallet →" onPress={onContinue} fullWidth size="lg" />
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

const doneStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.deepDark },
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 28 },
  title: { fontFamily: FontFamily.syneXBold, fontSize: FontSize['3xl'], color: Colors.offWhite },
  body:  { fontFamily: FontFamily.inter, fontSize: FontSize.md, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  tagRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  tag: { backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6 },
  tagLabel: { fontFamily: FontFamily.interMedium, fontSize: FontSize.sm, color: Colors.brandOrange },
});

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.deepDark },
  screen: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  backBtn: {
    padding: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  section: { gap: 20 },
  nfcSection: { alignItems: 'center' },

  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.orangeDim,
    borderWidth: 1,
    borderColor: Colors.orangeMid,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    fontFamily: FontFamily.syneXBold,
    fontSize: FontSize['2xl'],
    color: Colors.offWhite,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.base,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  infoCards: { flexDirection: 'row', gap: 12 },
  infoCard:  { flex: 1, gap: 8, borderRadius: Radius.md },
  infoCardTitle: { fontFamily: FontFamily.interSemiBold, fontSize: FontSize.base, color: Colors.offWhite },
  infoCardBody:  { fontFamily: FontFamily.inter, fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 18 },

  warnCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: Radius.md },
  warnText: { flex: 1, fontFamily: FontFamily.inter, fontSize: FontSize.sm, color: Colors.warning, lineHeight: 20 },

  revealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.orangeDim,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.orangeMid,
  },
  revealLabel: { fontFamily: FontFamily.interMedium, fontSize: FontSize.sm, color: Colors.brandOrange },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.brandOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxFilled: { backgroundColor: Colors.brandOrange, borderColor: Colors.brandOrange },
  checkLabel: { fontFamily: FontFamily.inter, fontSize: FontSize.base, color: Colors.textMuted, flex: 1 },

  inputCard: { borderRadius: Radius.md },
  inputCardInner: { padding: 16 },
  inputLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  textInput: {
    flex: 1,
    fontFamily: FontFamily.inter,
    fontSize: FontSize.md,
    color: Colors.offWhite,
    paddingVertical: 4,
  },
  pinDotRow: { marginTop: 14 },

  writeStepsCard: { width: '100%', borderRadius: Radius.md, gap: 12 },
  writeStepRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  writeStepDot:   { width: 8, height: 8, borderRadius: 4 },
  writeStepDotDone:    { backgroundColor: Colors.brandOrange },
  writeStepDotPending: { backgroundColor: Colors.textFaint },
  writeStepLabel:        { flex: 1, fontFamily: FontFamily.inter, fontSize: FontSize.base },
  writeStepLabelDone:    { color: Colors.offWhite },
  writeStepLabelPending: { color: Colors.textFaint },
});

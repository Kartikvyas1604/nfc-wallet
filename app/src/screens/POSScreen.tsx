/**
 * POSScreen — Point-of-sale / receive payment screen.
 * Two tabs: QR Code (show address QR) and NFC (receive via tap).
 * Header numpad to build an invoice amount.
 * Payment-received overlay animates in on success.
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
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { Colors, Radius, Shadows, Spacing } from '../theme/colors';
import { FontFamily, FontSize } from '../theme/typography';
import GradientCard from '../components/ui/GradientCard';
import OrangeButton from '../components/ui/OrangeButton';
import NFCRingAnimation from '../components/ui/NFCRingAnimation';
import { useApp } from '../store/AppContext';

// ── Numpad ────────────────────────────────────────────────────────────────────
const PAD_KEYS: (string | null)[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '<'],
];

function Numpad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  function press(key: string | null) {
    if (!key) return;
    if (key === '<') {
      onChange(value.length > 1 ? value.slice(0, -1) : '0');
      return;
    }
    if (key === '.' && value.includes('.')) return;
    if (key === '.' && value === '0') { onChange('0.'); return; }
    if (value === '0' && key !== '.') { onChange(key); return; }
    if (value.includes('.') && value.split('.')[1].length >= 8) return;
    if (!value.includes('.') && value.replace('-', '').length >= 8) return;
    onChange(value + key);
  }

  return (
    <View style={numStyles.grid}>
      {PAD_KEYS.map((row, ri) => (
        <View key={ri} style={numStyles.row}>
          {row.map((key, ci) => (
            <Pressable
              key={ci}
              onPress={() => press(key)}
              style={({ pressed }) => [
                numStyles.key,
                key === '<' ? numStyles.keyDelete : numStyles.keyNormal,
                pressed && numStyles.keyPressed,
              ]}
            >
              {key === '<'
                ? <Feather name="delete" size={20} color={Colors.brandOrange} />
                : <Text allowFontScaling={false} style={numStyles.keyLabel}>{key}</Text>
              }
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const numStyles = StyleSheet.create({
  grid: { gap: 10 },
  row:  { flexDirection: 'row', gap: 10 },
  key: {
    flex: 1,
    height: 60,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyNormal:  { backgroundColor: Colors.surface },
  keyDelete:  { backgroundColor: Colors.orangeDim, borderWidth: 1, borderColor: Colors.orangeMid },
  keyPressed: { opacity: 0.6 },
  keyLabel: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.xl,
    color: Colors.offWhite,
  },
});

// ── Payment Received Overlay ──────────────────────────────────────────────────
function PaymentOverlay({ amount, fromAddress, onDismiss }: {
  amount: string; fromAddress: string; onDismiss: () => void;
}) {
  const slideY = useRef(new Animated.Value(80)).current;
  const fade   = useRef(new Animated.Value(0)).current;
  const scale  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,   { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 8 }),
      Animated.spring(scale,  { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }),
    ]).start();

    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[overlayStyles.backdrop, { opacity: fade }]}>
      <Animated.View style={[overlayStyles.card, { transform: [{ translateY: slideY }] }]}>
        <Animated.View style={{ transform: [{ scale }], marginBottom: 12 }}>
          <Svg width={80} height={80} viewBox="0 0 80 80">
            <Circle cx="40" cy="40" r="36" stroke={Colors.success} strokeWidth="3" fill="rgba(0,214,143,0.1)" />
            <Polyline points="24,42 34,52 56,30" stroke={Colors.success} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Animated.View>
        <Text allowFontScaling={false} style={overlayStyles.title}>Payment Received</Text>
        <Text allowFontScaling={false} style={overlayStyles.amount}>{amount}</Text>
        <Text allowFontScaling={false} style={overlayStyles.from}>
          From: {fromAddress.slice(0, 6)}…{fromAddress.slice(-4)}
        </Text>
        <Pressable onPress={onDismiss} style={overlayStyles.dismissBtn}>
          <Text allowFontScaling={false} style={overlayStyles.dismissLabel}>Dismiss</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const overlayStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34,40,49,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    width: '80%',
    borderWidth: 1,
    borderColor: Colors.success + '44',
    ...(Shadows.successGlow as object),
  },
  title:  { fontFamily: FontFamily.syne, fontSize: FontSize.xl, color: Colors.offWhite },
  amount: { fontFamily: FontFamily.monoBold, fontSize: FontSize.monoXl, color: Colors.success },
  from:   { fontFamily: FontFamily.inter, fontSize: FontSize.sm, color: Colors.textMuted },
  dismissBtn: {
    marginTop: 16,
    backgroundColor: Colors.orangeDim,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.orangeMid,
  },
  dismissLabel: { fontFamily: FontFamily.interMedium, fontSize: FontSize.base, color: Colors.brandOrange },
});

// ── Tab Button ────────────────────────────────────────────────────────────────
function TabBtn({ label, icon, active, onPress }: {
  label: string; icon: string; active: boolean; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[tabStyles.btn, active && tabStyles.btnActive]}>
      <Feather name={icon as any} size={16} color={active ? Colors.brandOrange : Colors.textMuted} />
      <Text allowFontScaling={false} style={[tabStyles.label, active && tabStyles.labelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const tabStyles = StyleSheet.create({
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderRadius: Radius.md,
  },
  btnActive: { backgroundColor: Colors.orangeDim },
  label:       { fontFamily: FontFamily.interMedium, fontSize: FontSize.base, color: Colors.textMuted },
  labelActive: { color: Colors.brandOrange },
});

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export default function POSScreen() {
  const { ethAddress } = useApp();
  const [activeTab,    setActiveTab]    = useState<'qr' | 'nfc'>('qr');
  const [amount,       setAmount]       = useState('0');
  const [nfcState,     setNfcState]     = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [showOverlay,  setShowOverlay]  = useState(false);
  const [copyDone,     setCopyDone]     = useState(false);

  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(20)).current;

  const displayAddress = ethAddress || '0x742d35Cc6634C0532925a3b8D4C9C2F3bcd12345';
  const amountFloat    = parseFloat(amount || '0');
  const hasAmount      = amountFloat > 0;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideIn, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleNFCStart = () => {
    setNfcState('scanning');
  };

  const handleNFCSimSuccess = () => {
    setNfcState('success');
    setTimeout(() => {
      setNfcState('idle');
      setShowOverlay(true);
    }, 1200);
  };

  const copyAddress = () => {
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 1500);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.screen, { opacity: fadeIn, transform: [{ translateY: slideIn }] }]}>

        {/* Header */}
        <View style={styles.header}>
          <Text allowFontScaling={false} style={styles.headerTitle}>Receive</Text>
          <Text allowFontScaling={false} style={styles.headerSub}>
            {copyDone ? 'Copied!' : `${displayAddress.slice(0, 8)}…${displayAddress.slice(-6)}`}
          </Text>
        </View>

        {/* Amount display */}
        <View style={styles.amountBlock}>
          <Text allowFontScaling={false} style={styles.amountDisplay}>
            {amount === '0' ? '—' : amount}
          </Text>
          {hasAmount && (
            <Text allowFontScaling={false} style={styles.amountUSD}>
              ≈ ${(amountFloat * 2503.5).toFixed(2)}
            </Text>
          )}
          {!hasAmount && (
            <Text allowFontScaling={false} style={styles.amountHint}>
              Set amount (optional)
            </Text>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TabBtn label="QR Code"  icon="maximize"  active={activeTab === 'qr'}  onPress={() => setActiveTab('qr')} />
          <TabBtn label="NFC Tap"  icon="wifi"      active={activeTab === 'nfc'} onPress={() => setActiveTab('nfc')} />
        </View>

        {/* Tab content */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {activeTab === 'qr' && (
            <View style={styles.qrSection}>
              <GradientCard style={styles.qrCard} noPadding>
                <View style={styles.qrInner}>
                  <View style={styles.qrBg}>
                    <QRCode
                      value={`ethereum:${displayAddress}${hasAmount ? `?amount=${amountFloat}` : ''}`}
                      size={200}
                      color={Colors.offWhite}
                      backgroundColor="transparent"
                    />
                  </View>
                  {/* Corner decorations */}
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
              </GradientCard>

              <Text allowFontScaling={false} style={styles.scanHint}>
                Scan with any wallet to send funds
              </Text>

              <View style={styles.addressRow}>
                <Text allowFontScaling={false} style={styles.addressText} numberOfLines={1}>
                  {displayAddress}
                </Text>
                <Pressable onPress={copyAddress} style={styles.copyBtn}>
                  <Feather name={copyDone ? 'check' : 'copy'} size={16} color={Colors.brandOrange} />
                </Pressable>
              </View>

              {hasAmount && (
                <GradientCard glowColor={Colors.orangeDim} style={styles.invoiceCard}>
                  <View style={styles.invoiceRow}>
                    <Text allowFontScaling={false} style={styles.invoiceLabel}>Invoice</Text>
                    <Text allowFontScaling={false} style={styles.invoiceAmount}>
                      {amount} ETH
                    </Text>
                  </View>
                  <View style={styles.invoiceRow}>
                    <Text allowFontScaling={false} style={styles.invoiceLabel}>USD Value</Text>
                    <Text allowFontScaling={false} style={styles.invoiceValue}>
                      ${(amountFloat * 2503.5).toFixed(2)}
                    </Text>
                  </View>
                </GradientCard>
              )}

              <OrangeButton
                label={copyDone ? 'Copied!' : 'Copy Address'}
                onPress={copyAddress}
                variant={copyDone ? 'ghost' : 'outline'}
                fullWidth
              />
            </View>
          )}

          {activeTab === 'nfc' && (
            <View style={styles.nfcSection}>
              <Text allowFontScaling={false} style={styles.nfcTitle}>
                {nfcState === 'idle'     ? 'Ready to Receive' :
                 nfcState === 'scanning' ? 'Waiting for Tap…' :
                 nfcState === 'success'  ? 'Payment Received!' :
                                          'Tap Failed'}
              </Text>
              <Text allowFontScaling={false} style={styles.nfcSubtitle}>
                {nfcState === 'idle'     ? 'Sender taps their NFC card near your phone' :
                 nfcState === 'scanning' ? 'Keep phones close and steady' :
                 nfcState === 'success'  ? '' :
                                          'Move phones closer and try again'}
              </Text>

              <NFCRingAnimation state={nfcState} size={200} />

              {hasAmount && (
                <View style={styles.requestBadge}>
                  <Text allowFontScaling={false} style={styles.requestLabel}>Requesting</Text>
                  <Text allowFontScaling={false} style={styles.requestAmount}>{amount} ETH</Text>
                </View>
              )}

              {nfcState === 'idle' && (
                <OrangeButton
                  label="Start Receiving"
                  onPress={handleNFCStart}
                  fullWidth
                />
              )}
              {nfcState === 'scanning' && (
                <>
                  <Pressable onPress={handleNFCSimSuccess} style={styles.simBtn}>
                    <Text allowFontScaling={false} style={styles.simLabel}>(Simulate NFC success)</Text>
                  </Pressable>
                  <OrangeButton
                    label="Cancel"
                    onPress={() => setNfcState('idle')}
                    variant="ghost"
                    size="sm"
                  />
                </>
              )}
              {(nfcState === 'error') && (
                <OrangeButton label="Try Again" onPress={() => setNfcState('idle')} />
              )}
            </View>
          )}
        </ScrollView>

        {/* Numpad always visible below tab content */}
        <View style={styles.numpadWrap}>
          <View style={styles.numpadHeader}>
            <Text allowFontScaling={false} style={styles.numpadLabel}>Set Amount</Text>
            {amount !== '0' && (
              <Pressable onPress={() => setAmount('0')}>
                <Text allowFontScaling={false} style={styles.numpadClear}>Clear</Text>
              </Pressable>
            )}
          </View>
          <Numpad value={amount} onChange={setAmount} />
        </View>

      </Animated.View>

      {showOverlay && (
        <PaymentOverlay
          amount={`${amount || '0.02'} ETH`}
          fromAddress="0xa1b2C3d4e5F6"
          onDismiss={() => { setShowOverlay(false); setAmount('0'); }}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.deepDark },
  screen: { flex: 1 },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  headerTitle: {
    fontFamily: FontFamily.syne,
    fontSize: FontSize['2xl'],
    color: Colors.offWhite,
  },
  headerSub: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },

  amountBlock: { alignItems: 'center', paddingVertical: 20 },
  amountDisplay: {
    fontFamily: FontFamily.syneXBold,
    fontSize: FontSize['4xl'],
    color: Colors.offWhite,
    letterSpacing: -1,
  },
  amountUSD: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.base,
    color: Colors.textMuted,
    marginTop: 4,
  },
  amountHint: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.base,
    color: Colors.textFaint,
    marginTop: 4,
  },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 8,
    marginBottom: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 4,
  },

  content: { paddingHorizontal: 20, paddingBottom: 16 },

  // QR tab
  qrSection: { alignItems: 'center', gap: 16 },
  qrCard:    { borderRadius: Radius.xl, alignSelf: 'center' },
  qrInner: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  qrBg: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: Radius.lg,
    ...(Shadows.card as object),
  },
  corner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: Colors.brandOrange,
    borderWidth: 2,
  },
  cornerTL: { top: 12, left: 12, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 12, right: 12, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 12, left: 12, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 12, right: 12, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 4 },

  scanHint: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    width: '100%',
  },
  addressText: {
    flex: 1,
    fontFamily: FontFamily.mono,
    fontSize: FontSize.monoSm,
    color: Colors.textMuted,
  },
  copyBtn: {
    padding: 4,
  },
  invoiceCard: { width: '100%', borderRadius: Radius.md, gap: 8 },
  invoiceRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceLabel: { fontFamily: FontFamily.interMedium, fontSize: FontSize.sm, color: Colors.textMuted },
  invoiceAmount: { fontFamily: FontFamily.monoBold, fontSize: FontSize.monoLg, color: Colors.offWhite },
  invoiceValue:  { fontFamily: FontFamily.inter, fontSize: FontSize.base, color: Colors.textMuted },

  // NFC tab
  nfcSection: { alignItems: 'center', gap: 16 },
  nfcTitle: {
    fontFamily: FontFamily.syneXBold,
    fontSize: FontSize.xl,
    color: Colors.offWhite,
    textAlign: 'center',
  },
  nfcSubtitle: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.base,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  requestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.orangeDim,
    borderWidth: 1,
    borderColor: Colors.orangeMid,
    borderRadius: Radius.full,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  requestLabel:  { fontFamily: FontFamily.interMedium, fontSize: FontSize.sm, color: Colors.textMuted },
  requestAmount: { fontFamily: FontFamily.monoBold, fontSize: FontSize.monoLg, color: Colors.brandOrange },
  simBtn: {
    backgroundColor: Colors.surfaceBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  simLabel: { fontFamily: FontFamily.inter, fontSize: FontSize.xs, color: Colors.textFaint },

  // Numpad
  numpadWrap: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  numpadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  numpadLabel: { fontFamily: FontFamily.interMedium, fontSize: FontSize.sm, color: Colors.textMuted },
  numpadClear: { fontFamily: FontFamily.interMedium, fontSize: FontSize.sm, color: Colors.brandOrange },
});

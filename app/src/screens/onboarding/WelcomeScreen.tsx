/**
 * WelcomeScreen — first screen on launch.
 * Large SVG card illustration, tagline, feature pills, CTA buttons.
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
  G,
  Line,
} from 'react-native-svg';
import { Feather } from '@expo/vector-icons';

import { Colors, Radius } from '../../theme/colors';
import { FontFamily, FontSize } from '../../theme/typography';
import OrangeButton from '../../components/ui/OrangeButton';

// ── NFCCard SVG illustration ──────────────────────────────────────────────────
function CardIllustration() {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -10, duration: 1800, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0,  duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ translateY: float }] }}>
      <Svg width={320} height={220} viewBox="0 0 320 220">
        <Defs>
          <SvgGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0"   stopColor="#393E46" />
            <Stop offset="1"   stopColor="#2E3238" />
          </SvgGradient>
          <SvgGradient id="cardStripe" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"   stopColor="#FD7014" stopOpacity="0" />
            <Stop offset="0.5" stopColor="#FD7014" stopOpacity="0.4" />
            <Stop offset="1"   stopColor="#FD7014" stopOpacity="0" />
          </SvgGradient>
          <SvgGradient id="shadowGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FD7014" stopOpacity="0.12" />
            <Stop offset="1" stopColor="#FD7014" stopOpacity="0" />
          </SvgGradient>
        </Defs>

        {/* Glow shadow under card */}
        <Ellipse cx="160" cy="205" rx="110" ry="12" fill="url(#shadowGrad)" />

        {/* Card body */}
        <Rect x="20" y="20" width="280" height="175" rx="16" fill="url(#cardGrad)" />
        <Rect x="20" y="20" width="280" height="175" rx="16" stroke={Colors.surfaceBorder} strokeWidth="1" fill="none" />

        {/* Shine stripe */}
        <Rect x="20" y="88" width="280" height="24" fill="url(#cardStripe)" />

        {/* Chip */}
        <Rect x="40" y="44" width="44" height="32" rx="6" fill="#FD701430" stroke="#FD701460" strokeWidth="1" />
        <Line x1="62" y1="44" x2="62" y2="76" stroke="#FD701460" strokeWidth="1" />
        <Line x1="40" y1="60" x2="84" y2="60" stroke="#FD701460" strokeWidth="1" />

        {/* NFC rings */}
        <G transform="translate(240,56)">
          <Path d="M-24,0 A24,24 0 0,1 24,0"  stroke={Colors.brandOrange} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.3" />
          <Path d="M-16,0 A16,16 0 0,1 16,0"  stroke={Colors.brandOrange} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />
          <Path d="M-8,0  A8,8  0 0,1 8,0"    stroke={Colors.brandOrange} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <Circle cx="0" cy="0" r="3" fill={Colors.brandOrange} />
        </G>

        {/* Card number */}
        <G>
          {['••••', '••••', '••••', '1234'].map((s, i) => (
            <React.Fragment key={i}>
              <Path
                d={`M${46 + i * 70},136 h${s === '1234' ? 40 : 28}`}
                stroke={s === '1234' ? Colors.offWhite : Colors.textFaint}
                strokeWidth={s === '1234' ? 1.5 : 2}
                strokeLinecap="round"
              />
            </React.Fragment>
          ))}
        </G>

        {/* ETH logo subtle */}
        <Path
          d="M52 160 L56 152 L60 160 L56 162 Z"
          fill={Colors.eth + '60'}
        />
        <Path
          d="M52 162 L56 168 L60 162 L56 164 Z"
          fill={Colors.eth + '40'}
        />

        {/* SOL logo */}
        <G transform="translate(72,156)">
          <Rect width="12" height="2" rx="1" fill={Colors.sol + '80'} />
          <Rect y="4" x="2" width="12" height="2" rx="1" fill={Colors.sol + '60'} />
          <Rect y="8" width="12" height="2" rx="1" fill={Colors.sol + '80'} />
        </G>

        {/* Balance display */}
        <Rect x="196" y="148" width="92" height="30" rx="8" fill={Colors.orangeDim} />
        <Path d="M208,167 h68" stroke={Colors.brandOrange} strokeWidth="1" opacity="0.3" />
      </Svg>
    </Animated.View>
  );
}

// ── Feature pill ──────────────────────────────────────────────────────────────
function FeaturePill({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={pillStyles.pill}>
      <Feather name={icon as any} size={14} color={Colors.brandOrange} />
      <Text allowFontScaling={false} style={pillStyles.label}>{label}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  label: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
});

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export default function WelcomeScreen({ navigation }: any) {
  const fade    = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,    { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Background gradient glow */}
      <LinearGradient
        colors={[Colors.deepDark, Colors.surface + '80', Colors.deepDark]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      {/* Orange ambient blob */}
      <Animated.View style={styles.ambientBlob} pointerEvents="none" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Illustration */}
        <Animated.View style={[styles.illustrationWrap, { opacity: fade }]}>
          <CardIllustration />
        </Animated.View>

        {/* Wordmark */}
        <Animated.View style={{ opacity: fade, alignItems: 'center' }}>
          <Text allowFontScaling={false} style={styles.wordmark}>NFC Wallet</Text>
          <Text allowFontScaling={false} style={styles.tagline}>
            Your card is your key.{'\n'}Pay, sign, and transact — instantly.
          </Text>
        </Animated.View>

        {/* Feature pills */}
        <Animated.View style={[styles.pillsWrap, { opacity: fade }]}>
          <FeaturePill icon="credit-card" label="NFC Tap-to-Pay" />
          <FeaturePill icon="shield"      label="Self-Custodial" />
          <FeaturePill icon="globe"       label="ETH & Solana"   />
          <FeaturePill icon="zap"         label="Instant Signing" />
        </Animated.View>

        {/* CTAs */}
        <Animated.View style={[styles.ctaBlock, { opacity: fade, transform: [{ translateY: slideUp }] }]}>
          <OrangeButton
            label="Create New Wallet"
            onPress={() => navigation?.navigate('SetupWallet')}
            fullWidth
            size="lg"
          />
          <OrangeButton
            label="I Already Have a Card"
            onPress={() => navigation?.navigate('VerifyCard')}
            variant="outline"
            fullWidth
            size="lg"
          />
          <Text allowFontScaling={false} style={styles.legalText}>
            By continuing you agree to our{' '}
            <Text style={styles.legalLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.deepDark },
  scroll: { alignItems: 'center', paddingBottom: 40, paddingTop: 20 },

  ambientBlob: {
    position: 'absolute',
    top: -80,
    left: '25%',
    width: '50%',
    height: 300,
    backgroundColor: Colors.brandOrange,
    opacity: 0.04,
    borderRadius: 9999,
    transform: [{ scaleX: 2 }],
  },

  illustrationWrap: { marginBottom: 8 },

  wordmark: {
    fontFamily: FontFamily.syneXBold,
    fontSize: FontSize['3xl'],
    color: Colors.offWhite,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 10,
    marginBottom: 28,
    paddingHorizontal: 24,
  },

  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 32,
    paddingHorizontal: 24,
  },

  ctaBlock: {
    width: '100%',
    paddingHorizontal: 24,
    gap: 14,
    alignItems: 'center',
  },
  legalText: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.xs,
    color: Colors.textFaint,
    textAlign: 'center',
    marginTop: 4,
  },
  legalLink: { color: Colors.brandOrange },
});

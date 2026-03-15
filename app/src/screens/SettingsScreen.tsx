/**
 * SettingsScreen — app settings stub.
 * Shows wallet info, security options, and app preferences.
 */
import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Colors, Radius, Spacing } from '../theme/colors';
import { FontFamily, FontSize } from '../theme/typography';
import GradientCard from '../components/ui/GradientCard';
import AddressChip from '../components/ui/AddressChip';
import { useApp } from '../store/AppContext';

// ── Setting Row ───────────────────────────────────────────────────────────────
function SettingRow({
  icon,
  label,
  value,
  onPress,
  toggle,
  toggled,
  onToggle,
  danger,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  toggle?: boolean;
  toggled?: boolean;
  onToggle?: (v: boolean) => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={toggle}
      style={({ pressed }) => [styles.settingRow, pressed && !toggle && styles.settingRowPressed]}
    >
      <View style={[styles.settingIcon, danger ? styles.settingIconDanger : styles.settingIconNormal]}>
        <Feather name={icon as any} size={16} color={danger ? Colors.error : Colors.brandOrange} />
      </View>
      <Text allowFontScaling={false} style={[styles.settingLabel, danger && styles.settingLabelDanger]}>
        {label}
      </Text>
      {value && (
        <Text allowFontScaling={false} style={styles.settingValue}>{value}</Text>
      )}
      {toggle ? (
        <Switch
          value={toggled}
          onValueChange={onToggle}
          trackColor={{ false: Colors.surface, true: Colors.brandOrange }}
          thumbColor={Colors.offWhite}
        />
      ) : (
        !danger && <Feather name="chevron-right" size={16} color={Colors.textFaint} />
      )}
    </Pressable>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function Section({ label }: { label: string }) {
  return (
    <Text allowFontScaling={false} style={styles.sectionLabel}>{label}</Text>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { ethAddress, ensName } = useApp();
  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(20)).current;

  const [biometrics,  setBiometrics]  = React.useState(true);
  const [pushNotifs,  setPushNotifs]  = React.useState(false);
  const [hideBalance, setHideBalance] = React.useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideIn, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const displayAddress = ethAddress || '0x742d35Cc6634C0532925a3b8D4C9C2F3bcd12345';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.screen, { opacity: fadeIn, transform: [{ translateY: slideIn }] }]}>
        <Text allowFontScaling={false} style={styles.title}>Settings</Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Wallet card */}
          <GradientCard glowColor={Colors.orangeDim} style={styles.walletCard}>
            <View style={styles.walletRow}>
              <View style={styles.walletAvatar}>
                <Feather name="credit-card" size={24} color={Colors.brandOrange} />
              </View>
              <View style={styles.walletInfo}>
                {ensName ? (
                  <Text allowFontScaling={false} style={styles.walletEns}>{ensName}</Text>
                ) : null}
                <AddressChip address={displayAddress} chain="ETH" />
                <Text allowFontScaling={false} style={styles.walletTag}>NFC Card • Self-custodial</Text>
              </View>
            </View>
          </GradientCard>

          {/* Security */}
          <Section label="SECURITY" />
          <GradientCard noPadding style={styles.groupCard}>
            <SettingRow icon="fingerprint" label="Biometric Auth"    toggle toggled={biometrics}  onToggle={setBiometrics} />
            <View style={styles.divider} />
            <SettingRow icon="lock"        label="Change Password"   onPress={() => {}} />
            <View style={styles.divider} />
            <SettingRow icon="credit-card" label="Manage NFC Card"   onPress={() => {}} />
            <View style={styles.divider} />
            <SettingRow icon="eye-off"     label="Hide Balance"      toggle toggled={hideBalance} onToggle={setHideBalance} />
          </GradientCard>

          {/* Wallet */}
          <Section label="WALLET" />
          <GradientCard noPadding style={styles.groupCard}>
            <SettingRow icon="user"         label="ENS Profile"   onPress={() => {}} />
            <View style={styles.divider} />
            <SettingRow icon="list"         label="Transaction History" onPress={() => {}} />
            <View style={styles.divider} />
            <SettingRow icon="download"     label="Export Key"    onPress={() => {}} value="Backup" />
            <View style={styles.divider} />
            <SettingRow icon="refresh-cw"   label="Reprogram Card" onPress={() => {}} />
          </GradientCard>

          {/* App */}
          <Section label="APP" />
          <GradientCard noPadding style={styles.groupCard}>
            <SettingRow icon="bell"    label="Push Notifications" toggle toggled={pushNotifs} onToggle={setPushNotifs} />
            <View style={styles.divider} />
            <SettingRow icon="globe"   label="Network" value="Mainnet" onPress={() => {}} />
            <View style={styles.divider} />
            <SettingRow icon="info"    label="About"   onPress={() => {}} value="v1.0.0" />
          </GradientCard>

          {/* Danger */}
          <Section label="DANGER ZONE" />
          <GradientCard noPadding style={styles.groupCard}>
            <SettingRow icon="log-out"  label="Sign Out"      onPress={() => {}} danger />
            <View style={styles.divider} />
            <SettingRow icon="trash-2"  label="Delete Wallet" onPress={() => {}} danger />
          </GradientCard>

          <Text allowFontScaling={false} style={styles.version}>
            NFC Wallet v1.0.0 • Made with ❤️
          </Text>

        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.deepDark },
  screen: { flex: 1 },
  title: {
    fontFamily: FontFamily.syne,
    fontSize: FontSize['2xl'],
    color: Colors.offWhite,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 8 },

  walletCard: { borderRadius: Radius.lg, marginBottom: 8 },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  walletAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.orangeDim,
    borderWidth: 1,
    borderColor: Colors.orangeMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletInfo: { gap: 4 },
  walletEns: { fontFamily: FontFamily.syne, fontSize: FontSize.md, color: Colors.offWhite },
  walletTag: { fontFamily: FontFamily.inter, fontSize: FontSize.xs, color: Colors.textFaint },

  sectionLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.xs,
    color: Colors.textFaint,
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 4,
  },

  groupCard: { borderRadius: Radius.lg, overflow: 'hidden' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  settingRowPressed: { backgroundColor: Colors.orangeDim + '40' },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconNormal: { backgroundColor: Colors.orangeDim },
  settingIconDanger: { backgroundColor: Colors.error + '20' },
  settingLabel: {
    flex: 1,
    fontFamily: FontFamily.inter,
    fontSize: FontSize.base,
    color: Colors.offWhite,
  },
  settingLabelDanger: { color: Colors.error },
  settingValue: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginRight: 4,
  },
  divider: { height: 1, backgroundColor: Colors.divider, marginLeft: 60 },

  version: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.xs,
    color: Colors.textFaint,
    textAlign: 'center',
    marginTop: 16,
  },
});

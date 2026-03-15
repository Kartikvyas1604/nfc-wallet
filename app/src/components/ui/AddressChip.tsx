import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius } from '../../theme/colors';
import { FontFamily, FontSize } from '../../theme/typography';

type Chain = 'ETH' | 'SOL';

interface AddressChipProps {
  address: string;
  chain:   Chain;
  onCopy?: () => void;
  style?:  object;
}

const CHAIN_COLOR: Record<Chain, string> = {
  ETH: Colors.eth,
  SOL: Colors.sol,
};

function truncate(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function AddressChip({ address, chain, onCopy, style }: AddressChipProps) {
  const [copied, setCopied] = useState(false);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleCopy = () => {
    Clipboard.setStringAsync(address);
    setCopied(true);
    onCopy?.();

    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setCopied(false));
  };

  const pressIn = () => {
    Animated.timing(scaleAnim, { toValue: 0.93, duration: 80, useNativeDriver: true }).start();
  };

  const pressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  };

  return (
    <Pressable
      onPress={handleCopy}
      onPressIn={pressIn}
      onPressOut={pressOut}
    >
      <Animated.View style={[styles.chip, style, { transform: [{ scale: scaleAnim }] }]}>
        {/* Chain dot */}
        <View style={[styles.dot, { backgroundColor: CHAIN_COLOR[chain] }]} />

        {/* Chain label */}
        <Text allowFontScaling={false} style={styles.chainLabel}>{chain}</Text>

        {/* Address */}
        <Text allowFontScaling={false} style={styles.address}>{truncate(address)}</Text>

        {/* Copy feedback */}
        <View style={styles.copyZone}>
          {copied ? (
            <Animated.Text
              allowFontScaling={false}
              style={[styles.copiedText, { opacity: fadeAnim }]}
            >
              Copied!
            </Animated.Text>
          ) : (
            <Feather name="copy" size={11} color={Colors.textMuted} />
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceBorder,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  chainLabel: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  address: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.monoSm,
    color: Colors.offWhite,
  },
  copyZone: {
    width: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copiedText: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.xs,
    color: Colors.brandOrange,
  },
});

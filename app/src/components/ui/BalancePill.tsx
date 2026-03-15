import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius } from '../../theme/colors';
import { FontFamily, FontSize } from '../../theme/typography';

interface BalancePillProps {
  assetSymbol: string;
  balance:     string;
  chainColor?: string;
}

export default function BalancePill({
  assetSymbol,
  balance,
  chainColor = Colors.brandOrange,
}: BalancePillProps) {
  return (
    <View style={styles.pill}>
      <View style={[styles.dot, { backgroundColor: chainColor }]} />
      <Text allowFontScaling={false} style={styles.balance}>
        {balance}
      </Text>
      <Text allowFontScaling={false} style={styles.symbol}>
        {assetSymbol}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.orangeDim,
    borderWidth: 1,
    borderColor: Colors.orangeMid,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 5,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  balance: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.monoSm,
    color: Colors.offWhite,
  },
  symbol: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});

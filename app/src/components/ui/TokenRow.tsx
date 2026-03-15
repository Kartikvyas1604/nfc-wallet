import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius } from '../../theme/colors';
import { FontFamily, FontSize } from '../../theme/typography';

interface TokenRowProps {
  symbol:    string;
  name:      string;
  balance:   string;
  usdValue:  string;
  change24h: number;    // percentage e.g. 1.4 or -2.3
  logoUrl?:  string;
  chain?:    string;    // optional chain label e.g. "(ETH)"
}

export default function TokenRow({
  symbol,
  name,
  balance,
  usdValue,
  change24h,
  logoUrl,
  chain,
}: TokenRowProps) {
  const isPositive  = change24h > 0;
  const isZero      = change24h === 0;
  const changeColor = isZero ? Colors.textMuted : isPositive ? Colors.success : Colors.error;
  const changeSign  = isPositive ? '+' : '';
  const changeLabel = `${changeSign}${change24h.toFixed(2)}%`;
  const trendIcon   = isPositive ? 'trending-up' : isZero ? 'minus' : 'trending-down';

  return (
    <View style={styles.row}>
      {/* Token Icon */}
      <View style={styles.iconWrap}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} />
        ) : (
          <View style={styles.fallback}>
            <Text allowFontScaling={false} style={styles.fallbackLetter}>
              {symbol.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Name + chain */}
      <View style={styles.nameCol}>
        <Text allowFontScaling={false} style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text allowFontScaling={false} style={styles.symbolChain}>
          {symbol}{chain ? ` ${chain}` : ''}
        </Text>
      </View>

      {/* Values */}
      <View style={styles.valueCol}>
        <Text allowFontScaling={false} style={styles.usdValue}>{usdValue}</Text>
        <Text allowFontScaling={false} style={styles.balance}>{balance}</Text>
        <View style={styles.changeRow}>
          <Feather name={trendIcon as any} size={10} color={changeColor} />
          <Text allowFontScaling={false} style={[styles.change, { color: changeColor }]}>
            {' '}{changeLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  fallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackLetter: {
    fontFamily: FontFamily.interBold,
    fontSize: FontSize.md,
    color: Colors.offWhite,
  },
  nameCol: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.base,
    color: Colors.offWhite,
  },
  symbolChain: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  valueCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  usdValue: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.base,
    color: Colors.offWhite,
  },
  balance: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
    color: Colors.textMuted,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  change: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.xs,
  },
});

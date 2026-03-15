import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius } from '../../theme/colors';
import { FontFamily, FontSize } from '../../theme/typography';

type TxDirection = 'sent' | 'received';
type TxStatus    = 'confirmed' | 'pending' | 'failed';

interface TransactionRowProps {
  direction: TxDirection;
  amount:    string;
  asset:     string;
  address:   string;
  timestamp: Date | string;
  status:    TxStatus;
}

function relativeTime(ts: Date | string): string {
  const date = ts instanceof Date ? ts : new Date(ts);
  const diff  = (Date.now() - date.getTime()) / 1000;

  if (diff <    60)  return `${Math.floor(diff)}s ago`;
  if (diff <  3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days === 1)    return 'Yesterday';
  if (days < 7)      return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const STATUS_COLOR: Record<TxStatus, string> = {
  confirmed: Colors.success,
  pending:   Colors.warning,
  failed:    Colors.error,
};

export default function TransactionRow({
  direction,
  amount,
  asset,
  address,
  timestamp,
  status,
}: TransactionRowProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status !== 'pending') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 650, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [status, pulseAnim]);

  const isSent       = direction === 'sent';
  const iconName     = isSent ? 'arrow-up-right' : 'arrow-down-left';
  const iconColor    = isSent ? Colors.brandOrange : Colors.success;
  const iconBg       = isSent ? Colors.orangeDim   : 'rgba(0,214,143,0.10)';
  const amountColor  = isSent ? Colors.error        : Colors.success;
  const amountSign   = isSent ? '−' : '+';

  return (
    <View style={styles.row}>
      {/* Direction Icon */}
      <Animated.View
        style={[
          styles.iconCircle,
          { backgroundColor: iconBg },
          status === 'pending' && { opacity: pulseAnim },
        ]}
      >
        <Feather name={iconName} size={18} color={iconColor} />
      </Animated.View>

      {/* Address + meta */}
      <View style={styles.details}>
        <Text allowFontScaling={false} style={styles.address} numberOfLines={1}>
          {truncAddr(address)}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[status] }]} />
          <Text allowFontScaling={false} style={styles.statusText}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
          <Text allowFontScaling={false} style={styles.timestamp}>
            · {relativeTime(timestamp)}
          </Text>
        </View>
      </View>

      {/* Amount */}
      <View style={styles.amountBlock}>
        <Text allowFontScaling={false} style={[styles.amount, { color: amountColor }]}>
          {amountSign}{amount}
        </Text>
        <Text allowFontScaling={false} style={styles.asset}>{asset}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    flex: 1,
    gap: 4,
  },
  address: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    color: Colors.offWhite,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  timestamp: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.xs,
    color: Colors.textFaint,
  },
  amountBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amount: {
    fontFamily: FontFamily.monoBold,
    fontSize: FontSize.base,
  },
  asset: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});

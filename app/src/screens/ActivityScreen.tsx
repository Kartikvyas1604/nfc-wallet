/**
 * ActivityScreen — premium transaction history screen.
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

import { Colors, Radius } from '../theme/colors';
import { FontFamily, FontSize } from '../theme/typography';
import GradientCard from '../components/ui/GradientCard';
import TransactionRow from '../components/ui/TransactionRow';

const FILTERS = ['All', 'Sent', 'Received', 'Pending'] as const;

const ITEMS = [
  { id: '1', type: 'received', asset: 'ETH', amount: '+0.42', usdAmount: '$1,051.47', status: 'completed', counterparty: '0x9a3f...a0b1', timestamp: Date.now() - 15 * 60 * 1000 },
  { id: '2', type: 'sent', asset: 'USDC', amount: '-85.00', usdAmount: '$85.00', status: 'completed', counterparty: 'vitalik.eth', timestamp: Date.now() - 3 * 60 * 60 * 1000 },
  { id: '3', type: 'sent', asset: 'SOL', amount: '-1.80', usdAmount: '$93.60', status: 'pending', counterparty: 'C7v9...PQ2L', timestamp: Date.now() - 18 * 60 * 1000 },
  { id: '4', type: 'received', asset: 'ETH', amount: '+0.12', usdAmount: '$300.42', status: 'completed', counterparty: '0xf4d2...9210', timestamp: Date.now() - 26 * 60 * 60 * 1000 },
  { id: '5', type: 'received', asset: 'USDC', amount: '+210.00', usdAmount: '$210.00', status: 'completed', counterparty: 'merchant.pay', timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 },
];

export default function ActivityScreen() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideIn, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const filtered = ITEMS.filter(item => {
    if (filter === 'All') return true;
    if (filter === 'Pending') return item.status === 'pending';
    return item.type.toLowerCase() === filter.toLowerCase();
  });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.screen, { opacity: fadeIn, transform: [{ translateY: slideIn }] }]}>
        <View style={styles.header}>
          <Text allowFontScaling={false} style={styles.title}>Activity</Text>
          <Pressable style={styles.exportBtn}>
            <Feather name="share-2" size={16} color={Colors.brandOrange} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map(item => {
            const active = item === filter;
            return (
              <Pressable key={item} onPress={() => setFilter(item)}>
                <View style={[styles.filterPill, active ? styles.filterPillActive : styles.filterPillInactive]}>
                  <Text allowFontScaling={false} style={[styles.filterLabel, active ? styles.filterLabelActive : styles.filterLabelInactive]}>
                    {item}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <GradientCard glowColor={Colors.orangeDim} style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View>
                <Text allowFontScaling={false} style={styles.summaryLabel}>This Week</Text>
                <Text allowFontScaling={false} style={styles.summaryValue}>+$1,476.89</Text>
              </View>
              <View style={styles.summaryTrend}>
                <Feather name="trending-up" size={16} color={Colors.success} />
                <Text allowFontScaling={false} style={styles.summaryTrendText}>+18.4%</Text>
              </View>
            </View>
          </GradientCard>

          <View style={styles.sectionHeader}>
            <Text allowFontScaling={false} style={styles.sectionTitle}>Recent Transactions</Text>
            <Text allowFontScaling={false} style={styles.sectionCount}>{filtered.length} items</Text>
          </View>

          <GradientCard noPadding style={styles.listCard}>
            {filtered.map((item, index) => (
              <View key={item.id}>
                <TransactionRow
                  type={item.type as any}
                  asset={item.asset}
                  amount={item.amount}
                  usdAmount={item.usdAmount}
                  status={item.status as any}
                  counterparty={item.counterparty}
                  timestamp={item.timestamp}
                />
                {index < filtered.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </GradientCard>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.deepDark },
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: FontFamily.syne,
    fontSize: FontSize['2xl'],
    color: Colors.offWhite,
  },
  exportBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.orangeDim,
    borderWidth: 1,
    borderColor: Colors.orangeMid,
  },
  filterRow: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  filterPillActive: { backgroundColor: Colors.brandOrange },
  filterPillInactive: { backgroundColor: Colors.surface },
  filterLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.sm,
  },
  filterLabelActive: { color: Colors.offWhite },
  filterLabelInactive: { color: Colors.textMuted },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  summaryCard: { borderRadius: Radius.lg },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  summaryValue: {
    fontFamily: FontFamily.syneXBold,
    fontSize: FontSize.xl,
    color: Colors.offWhite,
  },
  summaryTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.success + '18',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  summaryTrendText: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.sm,
    color: Colors.success,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.base,
    color: Colors.offWhite,
  },
  sectionCount: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.sm,
    color: Colors.textFaint,
  },
  listCard: { borderRadius: Radius.lg, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: Colors.divider, marginLeft: 68 },
});

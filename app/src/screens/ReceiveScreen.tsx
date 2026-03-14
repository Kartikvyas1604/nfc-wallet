import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Share, ScrollView, ActivityIndicator,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useApp } from '../store/AppContext';
import { NetworkService } from '../services/NetworkService';

export default function ReceiveScreen() {
  const { ethAddress, solAddress } = useApp();
  const [tab, setTab] = useState<'ETH' | 'SOL'>('ETH');

  // For ETH: use a fresh BitGo address each time (privacy — every payment is unlinkable on-chain)
  const [freshEthAddress, setFreshEthAddress] = useState('');
  const [loadingFresh, setLoadingFresh] = useState(false);
  const [freshError, setFreshError] = useState('');

  const getFreshAddress = async () => {
    setLoadingFresh(true);
    setFreshError('');
    try {
      const { address } = await NetworkService.getBitgoFreshAddress();
      setFreshEthAddress(address);
    } catch (e: any) {
      setFreshError(e.message);
    } finally {
      setLoadingFresh(false);
    }
  };

  const displayAddress = tab === 'SOL'
    ? solAddress
    : (freshEthAddress || ethAddress);

  const share = async () => {
    await Share.share({ message: displayAddress });
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.title}>Receive</Text>

      <View style={s.tabs}>
        {(['ETH', 'SOL'] as const).map(chain => (
          <TouchableOpacity
            key={chain}
            style={[s.tab, tab === chain && s.tabActive]}
            onPress={() => setTab(chain)}
          >
            <Text style={[s.tabText, tab === chain && s.tabTextActive]}>{chain}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Privacy badge for ETH */}
      {tab === 'ETH' && (
        <View style={s.privacyBadge}>
          <Text style={s.privacyIcon}>🔒</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.privacyTitle}>Privacy Mode — BitGo</Text>
            <Text style={s.privacySub}>
              Each payment gets a fresh address. On-chain, your incoming transactions are unlinkable.
            </Text>
          </View>
        </View>
      )}

      <View style={s.qrBox}>
        <QRCode
          value={displayAddress || 'placeholder'}
          size={200}
          color="#fff"
          backgroundColor="#1a1240"
        />
      </View>

      <View style={s.addrBox}>
        <View style={s.addrLabelRow}>
          <Text style={s.addrLabel}>{tab} Address</Text>
          {tab === 'ETH' && freshEthAddress && (
            <Text style={s.freshTag}>✦ Fresh</Text>
          )}
        </View>
        <Text style={s.addr} selectable>{displayAddress}</Text>
      </View>

      {tab === 'ETH' && (
        <>
          {!!freshError && <Text style={s.error}>{freshError}</Text>}
          <TouchableOpacity style={s.freshBtn} onPress={getFreshAddress} disabled={loadingFresh}>
            {loadingFresh
              ? <ActivityIndicator color="#A855F7" size="small" />
              : <Text style={s.freshBtnText}>⟳  Generate Fresh Address</Text>
            }
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={s.btn} onPress={share}>
        <Text style={s.btnText}>Share Address</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0C29' },
  content: { padding: 24, paddingTop: 60, alignItems: 'center', gap: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', alignSelf: 'flex-start' },
  tabs: { flexDirection: 'row', gap: 12 },
  tab: {
    paddingHorizontal: 28, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
  },
  tabActive: { backgroundColor: '#A855F7', borderColor: '#A855F7' },
  tabText: { color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: 15 },
  tabTextActive: { color: '#fff' },
  privacyBadge: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(168,85,247,0.12)', borderRadius: 14,
    padding: 14, width: '100%',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
  },
  privacyIcon: { fontSize: 20 },
  privacyTitle: { color: '#A855F7', fontWeight: '700', fontSize: 13 },
  privacySub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 18, marginTop: 2 },
  qrBox: {
    backgroundColor: '#1a1240', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
  },
  addrBox: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
    padding: 16, width: '100%', gap: 6,
  },
  addrLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addrLabel: { color: '#A855F7', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  freshTag: { color: '#22c55e', fontSize: 11, fontWeight: '700' },
  addr: { color: '#fff', fontSize: 13, fontFamily: 'monospace', lineHeight: 20 },
  error: { color: '#f87171', fontSize: 13, textAlign: 'center' },
  freshBtn: {
    borderWidth: 1.5, borderColor: '#A855F7', borderRadius: 14,
    padding: 14, alignItems: 'center', width: '100%',
    minHeight: 50, justifyContent: 'center',
  },
  freshBtnText: { color: '#A855F7', fontWeight: '600', fontSize: 15 },
  btn: {
    backgroundColor: '#A855F7', borderRadius: 14,
    padding: 16, alignItems: 'center', width: '100%',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

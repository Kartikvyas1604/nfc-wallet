import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Share, ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useApp } from '../store/AppContext';

export default function ReceiveScreen() {
  const { ethAddress, solAddress } = useApp();
  const [tab, setTab] = useState<'ETH' | 'SOL'>('ETH');
  const address = tab === 'ETH' ? ethAddress : solAddress;

  const share = async () => {
    await Share.share({ message: address });
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

      <View style={s.qrBox}>
        <QRCode
          value={address || 'placeholder'}
          size={220}
          color="#fff"
          backgroundColor="#1a1240"
        />
      </View>

      <View style={s.addrBox}>
        <Text style={s.addrLabel}>{tab} Address</Text>
        <Text style={s.addr} selectable>{address}</Text>
      </View>

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
  qrBox: {
    backgroundColor: '#1a1240', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
  },
  addrBox: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
    padding: 16, width: '100%', gap: 6,
  },
  addrLabel: { color: '#A855F7', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  addr: { color: '#fff', fontSize: 13, fontFamily: 'monospace', lineHeight: 20 },
  btn: {
    backgroundColor: '#A855F7', borderRadius: 14,
    padding: 16, alignItems: 'center', width: '100%',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

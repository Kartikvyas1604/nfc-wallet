import NfcManager, { Ndef, NfcTech } from 'react-native-nfc-manager';
import type { NFCCardPayload } from '../types';

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await NfcManager.start();
    initialized = true;
  }
}

export const NFCService = {
  isSupported: async () => {
    try {
      await ensureInit();
      return await NfcManager.isSupported();
    } catch {
      return false;
    }
  },

  /** Write NFCCardPayload to an NDEF tag */
  writeKeyHalf: async (payload: NFCCardPayload): Promise<void> => {
    await ensureInit();
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const jsonStr = JSON.stringify(payload);
      const bytes = Ndef.encodeMessage([Ndef.textRecord(jsonStr)]);
      await NfcManager.ndefHandler.writeNdefMessage(bytes);
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
  },

  /** Read NFCCardPayload from an NDEF tag */
  readKeyHalf: async (): Promise<NFCCardPayload> => {
    await ensureInit();
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      if (!tag?.ndefMessage?.length) throw new Error('Empty NFC tag');

      const record = tag.ndefMessage[0];
      // Ndef.text.decodePayload strips the language prefix bytes
      const text = Ndef.text.decodePayload(record.payload as unknown as Buffer);
      const parsed: NFCCardPayload = JSON.parse(text);
      if (!parsed.walletId || !parsed.nfcHalf) throw new Error('Invalid NFC payload');
      return parsed;
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
  },
};

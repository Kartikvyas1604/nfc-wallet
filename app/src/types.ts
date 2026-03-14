export type Chain = 'ETH' | 'SOL';

export interface EncryptedKeyBundle {
  ciphertext: string; // hex
  iv: string;         // hex
  tag: string;        // hex
  salt: string;       // hex
}

export interface KeySplit {
  nfcHalf: string;        // hex
  serverHalf: string;     // hex
  bundle: EncryptedKeyBundle;
  walletId: string;
  publicAddress: string;
  chain: Chain;
}

export interface NFCCardPayload {
  walletId: string;
  chain: Chain;
  nfcHalf: string;        // hex
  publicAddress: string;
}

export interface ServerKeyHalfResponse {
  chain: Chain;
  serverKeyHalf: string;  // hex
  salt: string;           // hex
  iv: string;             // hex
  tag: string;            // hex
  publicAddress: string;
}

export interface WalletInfo {
  ethAddress: string;
  solAddress: string;
}

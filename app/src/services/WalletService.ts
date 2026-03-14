/**
 * WalletService — BIP39 mnemonic, BIP44 HD key derivation, key splitting.
 * ETH: secp256k1 via @scure/bip32
 * SOL: ed25519 via SLIP-0010 manual derivation using @noble/hashes
 */
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';
import { ethers } from 'ethers';
import { encrypt, xorSplit, xorCombine, decrypt, hexToBytes, bytesToHex } from './CryptoService';
import type { KeySplit, ServerKeyHalfResponse } from '../types';

// SLIP-0010 ed25519 derivation (Solana uses m/44'/501'/0'/0')
import { hmac } from '@noble/hashes/hmac';
import { sha512 } from '@noble/hashes/sha512';

function slip10DeriveEd25519(seed: Uint8Array, path: string): Uint8Array {
  // Master key from seed
  let I = hmac(sha512, new TextEncoder().encode('ed25519 seed'), seed);
  let key = I.slice(0, 32);
  let chainCode = I.slice(32);

  // Parse path: m/44'/501'/0'/0'
  const segments = path.split('/').slice(1);
  for (const seg of segments) {
    const hardened = seg.endsWith("'");
    const index = parseInt(hardened ? seg.slice(0, -1) : seg) + (hardened ? 0x80000000 : 0);
    const data = new Uint8Array(37);
    data[0] = 0x00;
    data.set(key, 1);
    new DataView(data.buffer).setUint32(33, index, false);
    I = hmac(sha512, chainCode, data);
    key = I.slice(0, 32);
    chainCode = I.slice(32);
  }
  return key;
}

export async function generateWallets() {
  const mnemonic = bip39.generateMnemonic(wordlist, 128); // 12 words
  const seed = await bip39.mnemonicToSeed(mnemonic);

  // ETH — BIP44: m/44'/60'/0'/0/0
  const hdRoot = HDKey.fromMasterSeed(seed);
  const ethNode = hdRoot.derive("m/44'/60'/0'/0/0");
  if (!ethNode.privateKey) throw new Error('Failed to derive ETH private key');
  const ethWallet = new ethers.Wallet(bytesToHex(ethNode.privateKey));
  const ethAddress = ethWallet.address;

  // SOL — SLIP-0010 ed25519: m/44'/501'/0'/0'
  const solPrivKey = slip10DeriveEd25519(seed, "m/44'/501'/0'/0'");
  // Derive public key using tweetnacl (bundled with @solana/web3.js)
  const nacl = require('tweetnacl');
  const solKeypair = nacl.sign.keyPair.fromSeed(solPrivKey);
  const solAddress = bs58Encode(solKeypair.publicKey);

  return {
    mnemonic,
    ethAddress,
    ethPrivateKey: bytesToHex(ethNode.privateKey),
    solAddress,
    solPrivateKey: bytesToHex(solPrivKey),
  };
}

export async function restoreWallets(mnemonic: string) {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const hdRoot = HDKey.fromMasterSeed(seed);
  const ethNode = hdRoot.derive("m/44'/60'/0'/0/0");
  if (!ethNode.privateKey) throw new Error('Failed to derive ETH key');
  const ethAddress = new ethers.Wallet(bytesToHex(ethNode.privateKey)).address;

  const solPrivKey = slip10DeriveEd25519(seed, "m/44'/501'/0'/0'");
  const nacl = require('tweetnacl');
  const solKeypair = nacl.sign.keyPair.fromSeed(solPrivKey);
  const solAddress = bs58Encode(solKeypair.publicKey);

  return { ethAddress, ethPrivateKey: bytesToHex(ethNode.privateKey), solAddress, solPrivateKey: bytesToHex(solPrivKey) };
}

export async function splitKey(
  chain: 'ETH' | 'SOL',
  privateKeyHex: string,
  publicAddress: string,
  password: string
): Promise<KeySplit> {
  const privBytes = hexToBytes(privateKeyHex);
  const bundle = await encrypt(privBytes, password);
  const { nfcHalf, serverHalf } = xorSplit(hexToBytes(bundle.ciphertext));
  return {
    nfcHalf,
    serverHalf,
    bundle,
    walletId: crypto.randomUUID(),
    publicAddress,
    chain,
  };
}

export async function reconstructPrivateKey(
  nfcHalfHex: string,
  serverBundle: ServerKeyHalfResponse,
  password: string
): Promise<Uint8Array> {
  const ciphertextBytes = xorCombine(nfcHalfHex, serverBundle.serverKeyHalf);
  const bundle = {
    ciphertext: bytesToHex(ciphertextBytes),
    iv: serverBundle.iv,
    tag: serverBundle.tag,
    salt: serverBundle.salt,
  };
  return decrypt(bundle, password);
}

// Minimal Base58 encoder (for Solana addresses)
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function bs58Encode(bytes: Uint8Array): string {
  const digits: number[] = [];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) { digits.push(carry % 58); carry = Math.floor(carry / 58); }
  }
  let result = '';
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) result += '1';
  for (let i = digits.length - 1; i >= 0; i--) result += BASE58_ALPHABET[digits[i]];
  return result;
}

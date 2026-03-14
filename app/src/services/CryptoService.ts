/**
 * CryptoService — AES-256-GCM encryption + PBKDF2 key derivation + XOR split.
 * Uses react-native-quick-crypto for WebCrypto-compatible subtle API.
 */
import QuickCrypto from 'react-native-quick-crypto';
import type { EncryptedKeyBundle } from '../types';

const PBKDF2_ITERATIONS = 310_000;

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomBytes(count: number): Uint8Array {
  return QuickCrypto.getRandomValues(new Uint8Array(count));
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await QuickCrypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return QuickCrypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(plaintext: Uint8Array, password: string): Promise<EncryptedKeyBundle> {
  const salt = randomBytes(16);
  const iv   = randomBytes(12);
  const key  = await deriveKey(password, salt);

  // AES-GCM returns ciphertext || tag (16-byte tag at the end)
  const encrypted = new Uint8Array(
    await QuickCrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  );

  const ciphertext = encrypted.slice(0, encrypted.length - 16);
  const tag        = encrypted.slice(encrypted.length - 16);

  return {
    ciphertext: bytesToHex(ciphertext),
    iv:   bytesToHex(iv),
    tag:  bytesToHex(tag),
    salt: bytesToHex(salt),
  };
}

export async function decrypt(bundle: EncryptedKeyBundle, password: string): Promise<Uint8Array> {
  const salt       = hexToBytes(bundle.salt);
  const iv         = hexToBytes(bundle.iv);
  const ciphertext = hexToBytes(bundle.ciphertext);
  const tag        = hexToBytes(bundle.tag);

  const key = await deriveKey(password, salt);

  // Reassemble ciphertext || tag for AES-GCM
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);

  const result = await QuickCrypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, combined);
  return new Uint8Array(result);
}

export function xorSplit(data: Uint8Array): { nfcHalf: string; serverHalf: string } {
  const nfcHalf = randomBytes(data.length);
  const serverHalf = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) serverHalf[i] = data[i] ^ nfcHalf[i];
  return { nfcHalf: bytesToHex(nfcHalf), serverHalf: bytesToHex(serverHalf) };
}

export function xorCombine(half1Hex: string, half2Hex: string): Uint8Array {
  const a = hexToBytes(half1Hex);
  const b = hexToBytes(half2Hex);
  if (a.length !== b.length) throw new Error('Key halves length mismatch');
  return new Uint8Array(a.map((byte, i) => byte ^ b[i]));
}

export { hexToBytes, bytesToHex };

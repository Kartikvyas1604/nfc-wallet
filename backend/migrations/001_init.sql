-- NFC Wallet database schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Stores the server half of each user's encrypted private key.
-- One row per chain per user. The NFC card holds the other half.
-- server_key_half XOR nfc_key_half = AES-GCM encrypted private key
CREATE TABLE wallet_key_halves (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chain           TEXT NOT NULL CHECK (chain IN ('ETH', 'SOL')),
    wallet_id       TEXT NOT NULL,          -- stable identifier written to NFC card
    server_key_half BYTEA NOT NULL,         -- hex-stored server half of encrypted key
    salt            TEXT NOT NULL,          -- PBKDF2 salt used during encryption (stored so iOS can re-derive)
    iv              TEXT NOT NULL,          -- AES-GCM IV
    tag             TEXT NOT NULL,          -- AES-GCM auth tag
    public_address  TEXT NOT NULL,          -- readable address (not sensitive)
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, chain)
);

-- Index for fast lookup during payment (wallet_id comes from NFC card)
CREATE INDEX idx_wallet_key_halves_wallet_id ON wallet_key_halves(wallet_id);

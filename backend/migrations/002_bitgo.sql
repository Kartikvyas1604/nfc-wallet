-- Add BitGo wallet ID column to existing wallets table
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS bitgo_wallet_id TEXT;

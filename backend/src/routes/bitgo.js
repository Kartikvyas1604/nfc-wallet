/**
 * BitGo integration routes.
 *
 * Privacy model:
 *   - Each payment generates a FRESH BitGo address on the receiver's side.
 *   - On-chain, every incoming payment lands on a different address — unlinkable.
 *   - The payer's NFC card + encryption password is the only thing that can
 *     authorise a BitGo co-signed transaction. No card → no payment.
 *
 * Routes:
 *   POST /bitgo/wallet        — provision a BitGo wallet for the logged-in user
 *   GET  /bitgo/address       — generate a fresh stealth receiving address
 *   GET  /bitgo/balance       — get current wallet balance (wei)
 *   POST /bitgo/send          — POS: send ETH from payer's BitGo wallet to receiver
 */
const router = require('express').Router();
const { BitGo } = require('bitgo');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const bitgo = new BitGo({ env: 'test' });
bitgo.authenticateWithAccessToken({ accessToken: process.env.BITGO_ACCESS_TOKEN });
const coin = bitgo.coin('teth');

// ── Provision ─────────────────────────────────────────────────────────────────
// POST /bitgo/wallet
// Called once after wallet creation. passphrase = user's encryption password.
// BitGo encrypts the user key shard with this passphrase — matching our XOR scheme.
router.post('/wallet', requireAuth, async (req, res) => {
  const { passphrase } = req.body;
  if (!passphrase) return res.status(400).json({ error: 'passphrase required' });
  try {
    const result = await coin.wallets().generateWallet({
      label:      `nfc_wallet_${req.user.sub.slice(0, 8)}`,
      passphrase,
    });
    const bitgoWalletId = result.wallet.id();
    await db.query(
      'UPDATE wallets SET bitgo_wallet_id = $1 WHERE user_id = $2',
      [bitgoWalletId, req.user.sub],
    );
    res.json({ bitgoWalletId });
  } catch (e) {
    console.error('BitGo wallet create:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Fresh address (privacy) ────────────────────────────────────────────────────
// GET /bitgo/address
// Each call returns a brand-new address derived from the HD wallet.
// Receiver calls this before showing the payment QR — every payment is unlinkable.
router.get('/address', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT bitgo_wallet_id FROM wallets WHERE user_id = $1',
      [req.user.sub],
    );
    if (!rows[0]?.bitgo_wallet_id) return res.status(404).json({ error: 'No BitGo wallet' });
    const wallet = await coin.wallets().get({ id: rows[0].bitgo_wallet_id });
    const { address } = await wallet.createAddress();
    res.json({ address });
  } catch (e) {
    console.error('BitGo address:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Balance ────────────────────────────────────────────────────────────────────
// GET /bitgo/balance
router.get('/balance', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT bitgo_wallet_id FROM wallets WHERE user_id = $1',
      [req.user.sub],
    );
    if (!rows[0]?.bitgo_wallet_id) return res.status(404).json({ error: 'No BitGo wallet' });
    const wallet = await coin.wallets().get({ id: rows[0].bitgo_wallet_id });
    res.json({
      balanceWei:      wallet.balanceString(),
      confirmedWei:    wallet.confirmedBalanceString(),
    });
  } catch (e) {
    console.error('BitGo balance:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POS Send ──────────────────────────────────────────────────────────────────
// POST /bitgo/send
// Body: { payerWalletId, toAddress, amountEth, passphrase }
// payerWalletId comes from the payer's NFC card.
// passphrase = payer's encryption password (already verified client-side via XOR reconstruct).
// Backend looks up payer's BitGo wallet by walletId and co-signs via BitGo.
router.post('/send', requireAuth, async (req, res) => {
  const { payerWalletId, toAddress, amountEth, passphrase } = req.body;
  if (!payerWalletId || !toAddress || !amountEth || !passphrase) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const { rows } = await db.query(
      'SELECT bitgo_wallet_id FROM wallets WHERE wallet_id = $1',
      [payerWalletId],
    );
    if (!rows[0]?.bitgo_wallet_id) {
      return res.status(404).json({ error: 'Payer has no BitGo wallet' });
    }
    const wallet = await coin.wallets().get({ id: rows[0].bitgo_wallet_id });
    // BitGo ETH amounts are in wei (as string to avoid float precision issues)
    const amountWei = BigInt(Math.round(parseFloat(amountEth) * 1e18)).toString();
    const tx = await wallet.send({
      address:         toAddress,
      amount:          amountWei,
      walletPassphrase: passphrase,
    });
    res.json({ txHash: tx.txid });
  } catch (e) {
    console.error('BitGo send:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

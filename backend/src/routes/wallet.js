const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// POST /wallet/store-key-half
// Called during wallet setup. Stores the server half of the encrypted private key.
// Body: { chain, walletId, serverKeyHalf, salt, iv, tag, publicAddress }
router.post('/store-key-half', requireAuth, async (req, res) => {
  const { chain, walletId, serverKeyHalf, salt, iv, tag, publicAddress } = req.body;
  if (!chain || !walletId || !serverKeyHalf || !salt || !iv || !tag || !publicAddress) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!['ETH', 'SOL'].includes(chain)) {
    return res.status(400).json({ error: 'chain must be ETH or SOL' });
  }
  try {
    const result = await db.query(
      `INSERT INTO wallet_key_halves
         (user_id, chain, wallet_id, server_key_half, salt, iv, tag, public_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, chain)
       DO UPDATE SET
         wallet_id      = EXCLUDED.wallet_id,
         server_key_half= EXCLUDED.server_key_half,
         salt           = EXCLUDED.salt,
         iv             = EXCLUDED.iv,
         tag            = EXCLUDED.tag,
         public_address = EXCLUDED.public_address
       RETURNING id, chain, public_address`,
      [req.user.sub, chain, walletId, Buffer.from(serverKeyHalf, 'hex'), salt, iv, tag, publicAddress]
    );
    res.status(201).json({ success: true, wallet: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to store key half' });
  }
});

// GET /wallet/key-half/:walletId
// Called during payment. Returns the server half for the given walletId.
// The walletId comes from scanning the NFC card, so it uniquely identifies the wallet.
// Auth is required so only the wallet owner (or an authorised payer) can fetch it.
// In a real app you'd add additional verification (e.g. a payment challenge/signature).
router.get('/key-half/:walletId', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT chain, server_key_half, salt, iv, tag, public_address
         FROM wallet_key_halves
        WHERE wallet_id = $1`,
      [req.params.walletId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    const row = result.rows[0];
    res.json({
      chain: row.chain,
      serverKeyHalf: row.server_key_half.toString('hex'),
      salt: row.salt,
      iv: row.iv,
      tag: row.tag,
      publicAddress: row.public_address,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch key half' });
  }
});

// GET /wallet/my-wallets
// Returns the current user's wallet public addresses (non-sensitive).
router.get('/my-wallets', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT chain, wallet_id, public_address, created_at FROM wallet_key_halves WHERE user_id = $1',
      [req.user.sub]
    );
    res.json({ wallets: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

module.exports = router;

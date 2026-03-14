require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const bitgoRoutes = require('./routes/bitgo');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate-limit all routes: 100 req/15 min per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use('/auth', authRoutes);
app.use('/wallet', walletRoutes);
app.use('/bitgo', bitgoRoutes);

app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NFC Wallet backend listening on port ${PORT}`));

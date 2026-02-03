import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import axios from 'axios';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all for now, lock down in prod
    methods: ["GET", "POST"]
  }
});

app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// State
const GRID_SIZE = 40000;
// Using a Map for sparse storage, or array. Array for 40k ints is small (~160KB).
// 0 = empty, 1 = painted
const grid = new Int8Array(GRID_SIZE).fill(0); 
const painters = new Map(); // tileId -> address

// Blockchain Client
const client = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.RPC_URL || 'https://base-sepolia-rpc.publicnode.com')
});

// Helper to verify Recaptcha
async function verifyCaptcha(token) {
  if (!token) return false;
  try {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    // Skip if no secret configured (dev mode)
    if (!secret) return true; 
    
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`
    );
    return response.data.success && response.data.score > 0.5;
  } catch (error) {
    console.error('Captcha verify error:', error);
    return false;
  }
}

// Cooldown tracking (simple in-memory)
const cooldowns = new Map(); // address -> timestamp
const COOLDOWN_TIME = 5 * 60 * 1000; // 5 mins

io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Send initial state (compressed or full)
  // Sending 40k bytes is fine
  socket.emit('init-grid', Array.from(grid));

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Endpoint to verify transaction and paint
app.post('/api/paint', async (req, res) => {
  const { txHash, tileId, address, captchaToken } = req.body;

  if (tileId < 0 || tileId >= GRID_SIZE) {
    return res.status(400).json({ error: 'Invalid tile ID' });
  }

  // 1. Verify Captcha
  const isHuman = await verifyCaptcha(captchaToken);
  if (!isHuman && process.env.RECAPTCHA_SECRET_KEY) {
     return res.status(400).json({ error: 'Captcha failed' });
  }

  // 2. Check Cooldown
  const lastPaint = cooldowns.get(address);
  if (lastPaint && Date.now() - lastPaint < COOLDOWN_TIME) {
    return res.status(429).json({ error: 'Cooldown active' });
  }

  try {
    // 3. Verify Transaction on Chain
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    
    if (receipt.status !== 'success') {
      return res.status(400).json({ error: 'Transaction failed on chain' });
    }

    // Check if it's the correct contract? (Ideally yes, skip for MVP speed if address unknown)
    // Check logs for Painted event?
    // For MVP, we trust the receipt exists and is successful for now. 
    // Stronger check: parse logs.
    
    // 4. Update State
    grid[tileId] = 1; // Painted
    painters.set(tileId, address);
    cooldowns.set(address, Date.now());

    // 5. Broadcast
    io.emit('tile-painted', { tileId, painter: address });

    // Check Endgame
    // Count painted
    let paintedCount = 0;
    for(let i=0; i<GRID_SIZE; i++) if(grid[i]===1) paintedCount++;
    
    if (paintedCount / GRID_SIZE > 0.99) {
      io.emit('endgame-triggered');
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Tx verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

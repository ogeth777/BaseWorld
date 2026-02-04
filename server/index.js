import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { createPublicClient, http, fallback } from 'viem';
import { baseSepolia } from 'viem/chains';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all for now, lock down in prod
    methods: ["GET", "POST"]
  }
});

// Data Persistence
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// State
const GRID_SIZE = 80000;
let grid = new Int8Array(GRID_SIZE).fill(0); 
let painters = new Map(); // tileId -> address
let graffiti = new Map(); // tileId -> message
let leaderboard = new Map(); // address -> count

// Load State
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      console.log('Loading state from disk...');
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      
      if (data.grid) grid = new Int8Array(data.grid);
      if (data.painters) painters = new Map(data.painters);
      if (data.graffiti) graffiti = new Map(data.graffiti);
      if (data.leaderboard) leaderboard = new Map(data.leaderboard);
      
      console.log('State loaded successfully.');
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
}
loadState();

// Save State (Throttled)
let saveTimeout = null;
function scheduleSave() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    try {
      const data = {
        grid: Array.from(grid),
        painters: Array.from(painters.entries()),
        graffiti: Array.from(graffiti.entries()),
        leaderboard: Array.from(leaderboard.entries())
      };
      fs.writeFileSync(STATE_FILE, JSON.stringify(data));
      // console.log('State saved to disk.');
    } catch (e) {
      console.error('Failed to save state:', e);
    }
    saveTimeout = null;
  }, 5000); // Save at most every 5 seconds
}

app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// State is already initialized above.
// console.log('--- SERVER RESTART: STATE RESET ---');

// Airdrop State
let activeAirdrop = null;

// Helper to get top leaderboard
function getLeaderboard() {
  return Array.from(leaderboard.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([addr, score]) => ({ address: addr, score }));
}

// Blockchain Client
const client = createPublicClient({
  chain: baseSepolia,
  transport: fallback([
    http('https://base-sepolia-rpc.publicnode.com'),
    http('https://base-sepolia.publicnode.com'),
    http('https://sepolia.base.org'),
    http('https://base-sepolia.blockpi.network/v1/rpc/public'),
    http('https://base-sepolia.gateway.tenderly.co'),
    http('https://1rpc.io/base-sepolia'),
    http('https://base-sepolia.drpc.org'),
    http(process.env.RPC_URL || 'https://sepolia.base.org')
  ], {
    rank: true // Automatically try best performing RPC
  })
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
  socket.emit('init-graffiti', Array.from(graffiti.entries()));
  socket.emit('leaderboard-update', getLeaderboard());
  if (activeAirdrop) {
    socket.emit('spawn-airdrop', activeAirdrop);
  }

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Root endpoint for status check
app.get('/', (req, res) => {
    res.send('WorldBase Server is running. Access the frontend to play.');
});

// Endpoint to get user state (cooldowns)
app.get('/api/user-state/:address', (req, res) => {
    const { address } = req.params;
    const lastPaint = cooldowns.get(address);
    res.json({ 
        lastPaintTime: lastPaint || 0,
        serverTime: Date.now()
    });
});

// Endpoint to verify transaction and paint
app.post('/api/paint', async (req, res) => {
  const { txHash, tileId, address, captchaToken, message } = req.body;

  if (tileId < 0 || tileId >= GRID_SIZE) {
    return res.status(400).json({ error: 'Invalid tile ID' });
  }

  // 1. Verify Captcha
  // const isHuman = await verifyCaptcha(captchaToken);
  // if (!isHuman && process.env.RECAPTCHA_SECRET_KEY) {
  //    return res.status(400).json({ error: 'Captcha failed' });
  // }

  // 2. Check Cooldown
  const lastPaint = cooldowns.get(address);
  if (lastPaint && Date.now() - lastPaint < COOLDOWN_TIME) {
    return res.status(429).json({ error: 'Cooldown active' });
  }

  try {
    // 3. Verify Transaction on Chain
    // Robust retry loop for receipt (up to 80 seconds to avoid Render 100s timeout)
    let receipt;
    for (let i = 0; i < 40; i++) {
        try {
            receipt = await client.getTransactionReceipt({ hash: txHash });
            if (receipt) break;
        } catch (e) {
            console.log(`Attempt ${i+1}/40: Receipt not found yet...`);
            if (i === 39) {
                console.error('Final attempt failed:', e.message);
                throw e;
            }
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    
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
    
    if (message && typeof message === 'string') {
        // Simple sanitization: max 20 chars, no HTML
        const cleanMessage = message.slice(0, 20).replace(/[<>]/g, '');
        if (cleanMessage) {
            graffiti.set(tileId, cleanMessage);
        }
    }

    // Update Leaderboard
    const currentScore = leaderboard.get(address) || 0;
    leaderboard.set(address, currentScore + 1);
    
    cooldowns.set(address, Date.now());

    // 5. Broadcast
    io.emit('tile-painted', { 
        tileId, 
        painter: address,
        message: graffiti.get(tileId)
    });
    io.emit('leaderboard-update', getLeaderboard());
    
    // Save state
    scheduleSave();

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

// Airdrop Logic
setInterval(() => {
    // Spawn airdrop every 5 minutes if none active
    if (!activeAirdrop) {
        // Random position (spherical coords)
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        activeAirdrop = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            position: { theta, phi } // Sync position
        };
        io.emit('spawn-airdrop', activeAirdrop);
        console.log('Airdrop spawned:', activeAirdrop.id);

        // Auto-expire after 1 minute if not claimed
        setTimeout(() => {
            if (activeAirdrop && Date.now() - activeAirdrop.timestamp > 60000) {
                activeAirdrop = null;
                io.emit('airdrop-expired');
            }
        }, 60000);
    }
}, 5 * 60 * 1000); // 5 minutes

app.post('/api/airdrop/claim', (req, res) => {
    const { address, airdropId } = req.body;
    
    if (!activeAirdrop || activeAirdrop.id !== airdropId) {
        return res.status(400).json({ error: 'Airdrop invalid or expired' });
    }

    // Winner!
    cooldowns.delete(address);
    activeAirdrop = null;
    
    io.emit('airdrop-claimed', { winner: address });
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

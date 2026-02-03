import { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, AdaptiveDpr, Preload, Loader } from '@react-three/drei';
import { Earth } from './components/Earth';
import { SpaceDebris } from './components/SpaceDebris';
import { BTCComet } from './components/BTCComet';
import { Leaderboard } from './components/Leaderboard';
import { LiveFeed } from './components/LiveFeed';
import { SpaceEnvironment } from './components/SpaceEnvironment';
import { SpaceAirdrop } from './components/SpaceAirdrop';
import { PlayerSatellites } from './components/PlayerSatellites';
import { soundManager } from './components/AudioManager';
import { ErrorBoundary } from './components/ErrorBoundary'; // Added
import { useAccount, useConnect, useDisconnect, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId, useReadContract } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { PaintABI, CONTRACT_ADDRESS } from './web3/PaintABI';
import { parseEther, formatEther } from 'viem';
import { io } from 'socket.io-client';
import axios from 'axios';
import './App.css';

// Socket setup
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const socketUrl = apiUrl.startsWith('http') ? apiUrl : `https://${apiUrl}`;
const socket = io(socketUrl);

function App() {
  return (
    <ErrorBoundary>
        <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  
  // Web3 Actions
  const { data: hash, writeContract, error: writeError, isPending: isTxPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();

  // Read Price
  const { data: priceData, refetch: refetchPrice, isError: isPriceError } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: PaintABI,
    functionName: 'PAINT_PRICE',
    chainId: baseSepolia.id, // Force query on Base Sepolia
    query: {
        staleTime: 1000 * 60 * 5, // Cache for 5 mins
    }
  });
  
  // Robust Fallback: 0.0001 ETH (Standard) if fetch fails, but prefer contract value
  // Note: Previous fallback was 0.000004 which might be too low if contract changed
  const paintPrice = priceData ? priceData : parseEther('0.0001'); 
  
  // Reload price on chain switch
  useEffect(() => {
      if (chainId === baseSepolia.id) {
          refetchPrice();
      }
  }, [chainId, refetchPrice]);

  // State
  const [grid, setGrid] = useState<number[]>(new Array(80000).fill(0));
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [endgame, setEndgame] = useState(false);
  
  // New Features State
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [graffiti, setGraffiti] = useState<Map<number, string>>(new Map());
  const [graffitiInput, setGraffitiInput] = useState('');
  const [activeAirdrop, setActiveAirdrop] = useState<any>(null);
  const [laserTarget, setLaserTarget] = useState<number | null>(null);

  // Cooldown Logic
  const COOLDOWN_MS = 5 * 60 * 1000;
  const [lastPaintTime, setLastPaintTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Batching Ref
  const pendingUpdates = useRef<any[]>([]);

  // Load timer on address change (Local + Server Sync)
  useEffect(() => {
      if (!address) {
          setLastPaintTime(0);
          return;
      }
      
      const syncState = async () => {
        // 1. Local
        const key = `lastPaintTime_${address}`;
        const saved = localStorage.getItem(key);
        let localTime = saved ? parseInt(saved, 10) : 0;
        
        setLastPaintTime(localTime);

        // 2. Server Sync
        try {
            const res = await axios.get(`${socketUrl}/api/user-state/${address}`);
            const serverTime = res.data.lastPaintTime;
            
            if (serverTime > localTime) {
                console.log('Syncing timer from server:', serverTime);
                setLastPaintTime(serverTime);
                localStorage.setItem(key, serverTime.toString());
            }
        } catch (e) {
            console.error('Failed to sync user state:', e);
        }
      };

      syncState();
  }, [address]);

  useEffect(() => {
    const checkTimer = () => {
      const now = Date.now();
      const elapsed = now - lastPaintTime;
      const remaining = Math.max(0, COOLDOWN_MS - elapsed);
      setTimeRemaining(remaining);
    };
    
    checkTimer(); 
    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, [lastPaintTime]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const [isConnectedToSocket, setIsConnectedToSocket] = useState(socket.connected);

  // Load Grid & Socket Events
  useEffect(() => {
    socket.on('connect', () => {
        console.log('Socket connected');
        setIsConnectedToSocket(true);
    });
    socket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnectedToSocket(false);
    });
    
    socket.on('init-grid', (data) => {
      // data might be object or array
      setGrid(Array.from(data));
    });

    socket.on('init-graffiti', (data) => {
        setGraffiti(new Map(data));
    });

    socket.on('tile-painted', (data) => {
        // Push to queue for batched processing
        pendingUpdates.current.push(data);
    });
    
    socket.on('leaderboard-update', (data) => {
        setLeaderboard(data);
    });
    
    socket.on('spawn-airdrop', (data) => setActiveAirdrop(data));
    socket.on('airdrop-claimed', () => setActiveAirdrop(null));
    socket.on('airdrop-expired', () => setActiveAirdrop(null));

    socket.on('endgame-triggered', () => setEndgame(true));

    return () => {
      socket.off('init-grid');
      socket.off('init-graffiti');
      socket.off('tile-painted');
      socket.off('leaderboard-update');
      socket.off('spawn-airdrop');
      socket.off('airdrop-claimed');
      socket.off('airdrop-expired');
      socket.off('endgame-triggered');
    };
  }, []);

  // Batched Update Processor (Optimized for Scalability)
  useEffect(() => {
    const interval = setInterval(() => {
        if (pendingUpdates.current.length === 0) return;

        const batch = [...pendingUpdates.current];
        pendingUpdates.current = []; // Clear queue immediately

        // 1. Batch Update Grid
        setGrid(prev => {
            const next = [...prev];
            let changed = false;
            batch.forEach(u => {
                if (next[u.tileId] !== 1) {
                    next[u.tileId] = 1;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });

        // 2. Batch Update Graffiti
        setGraffiti(prev => {
            const next = new Map(prev);
            let changed = false;
            batch.forEach(u => {
                if (u.message) {
                    next.set(u.tileId, u.message);
                    changed = true;
                }
            });
            return changed ? next : prev;
        });

        // 3. Batch Update Feed & Laser
        const lastUpdate = batch[batch.length - 1];
        if (lastUpdate) setLaserTarget(lastUpdate.tileId);

        setFeed(prev => {
            const newItems = batch.map(u => ({
                id: Date.now().toString() + Math.random(), 
                message: `${u.painter ? u.painter.slice(0,6) : 'Unknown'} painted #${u.tileId}`, 
                timestamp: Date.now() 
            }));
            // Keep feed size manageable
            return [...prev, ...newItems].slice(-20);
        });

    }, 200); // Process updates every 200ms (5 FPS)

    return () => clearInterval(interval);
  }, []);

  // Post-Transaction Verification
  useEffect(() => {
    if (isConfirmed && hash && selectedTile !== null) {
      verifyTransaction(hash, selectedTile);
    }
  }, [isConfirmed, hash]);

  const verifyTransaction = async (txHash: string, tileId: number) => {
    setStatusMsg('Verifying paint...');
    try {
      // if (!executeRecaptcha) return;
      // const token = await executeRecaptcha('paint_verify');
      
      await axios.post(`${socketUrl}/api/paint`, {
        txHash,
        tileId,
        address,
        message: graffitiInput,
        // captchaToken: token
      });
      
      setStatusMsg('Painted successfully!');
      if (audioEnabled) soundManager.playSuccess();
      
      // Optimistic Update
      setGrid(prev => {
          const next = [...prev];
          next[tileId] = 1;
          return next;
      });
      setGraffiti(prev => {
          if (graffitiInput) return new Map(prev).set(tileId, graffitiInput);
          return prev;
      });

      // Update cooldown
      const now = Date.now();
      setLastPaintTime(now);
      if (address) localStorage.setItem(`lastPaintTime_${address}`, now.toString());

      setSelectedTile(null);
      setIsPainting(false);
      setGraffitiInput('');
    } catch (err) {
      console.error(err);
      setStatusMsg(`Verification failed: ${err instanceof Error ? err.message : String(err)}`);
      setIsPainting(false);
    }
  };

  const handleTileClick = (index: number) => {
    console.log('App: handleTileClick', index);
    if (audioEnabled) soundManager.playClick();
    if (grid[index] === 1) {
        setStatusMsg('Tile already painted!');
        setTimeout(() => setStatusMsg(''), 2000);
        return; 
    }
    setSelectedTile(index);
    setGraffitiInput(''); // Reset input
  };
  
  const handleClaimAirdrop = async () => {
      if (!activeAirdrop || !address) return;
      try {
          const res = await axios.post(`${socketUrl}/api/airdrop/claim`, {
              address,
              airdropId: activeAirdrop.id
          });
          if (res.data.success) {
              setLastPaintTime(0);
              if (address) localStorage.setItem(`lastPaintTime_${address}`, '0');
              setTimeRemaining(0);
              setStatusMsg('AIRDROP CLAIMED! COOLDOWN RESET!');
              if (audioEnabled) soundManager.playSuccess();
          }
      } catch (e) {
          console.error(e);
      }
  };

  const devReset = () => {
      if (confirm('RESET ALL LOCAL WALLET DATA?')) {
          localStorage.clear();
          window.location.reload();
      }
  };

  const toggleAudio = () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    if (newState) {
        soundManager.startAmbient();
    } else {
        soundManager.stopAmbient();
    }
  };

  const handlePaint = async () => {
    if (!isConnected) {
      connect({ connector: injected() });
      return;
    }

    if (timeRemaining > 0) {
      return;
    }

    if (selectedTile === null) return;

    // Check Chain ID
    if (chainId !== baseSepolia.id) {
      try {
        switchChain({ chainId: baseSepolia.id });
        return;
      } catch (error) {
        setStatusMsg('Please switch to Base Sepolia');
        return;
      }
    }

    setIsPainting(true);
    setStatusMsg('Preparing transaction...');

    try {
      // if (!executeRecaptcha) {
      //    setStatusMsg('Captcha not ready');
      //    setIsPainting(false);
      //    return;
      // }
      
      // 1. Get Captcha (Frontend Check)
      // const token = await executeRecaptcha('paint_intent');
      // if (!token) throw new Error('Captcha failed');

      // 2. Send Transaction
      console.log('Sending tx with price:', formatEther(paintPrice as bigint));
      
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: PaintABI,
        functionName: 'paint',
        args: [BigInt(selectedTile)],
        value: paintPrice as bigint,
        chainId: baseSepolia.id, // Explicit chain
      });

    } catch (err) {
      console.error("Paint Error:", err);
      setStatusMsg(`Paint failed: ${err instanceof Error ? err.message : String(err)}`);
      setIsPainting(false);
    }
  };

  const paintedCount = grid.filter(x => x === 1).length;
  const percentage = ((paintedCount / 80000) * 100).toFixed(2);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* 3D Scene */}
      <Canvas camera={{ position: [0, 0, 16], fov: 45 }} dpr={[1, 2]} performance={{ min: 0.5 }}>
        <AdaptiveDpr pixelated />
        <Preload all />
        <color attach="background" args={['#050510']} />
        <Suspense fallback={null}>
          <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          
          <Earth 
            onTileClick={handleTileClick} 
            paintedTiles={grid}
            endgame={endgame}
            graffiti={graffiti}
          />
          <SpaceAirdrop data={activeAirdrop} onClaim={handleClaimAirdrop} />
          <PlayerSatellites players={leaderboard} />
          
          <SpaceDebris />
          <BTCComet />
          <SpaceEnvironment />
        </Suspense>

        <OrbitControls 
          enableZoom={true} 
          minDistance={8.5} 
          maxDistance={30} 
          autoRotate={false}
          makeDefault
        />
      </Canvas>
      <Loader 
        containerStyles={{ background: '#050510' }}
        innerStyles={{ background: '#333', width: '200px', height: '10px' }}
        barStyles={{ background: '#0052FF', height: '10px' }}
        dataStyles={{ color: '#0052FF', fontSize: '1rem', fontFamily: 'Rajdhani' }}
      />

      {/* UI Overlay */}
      <div className="ui-overlay">
        
        <Leaderboard data={leaderboard} />
        <LiveFeed events={feed} />
        
        <button className="audio-toggle" onClick={toggleAudio} title="Toggle Audio">
           {audioEnabled ? '🔊' : '🔇'}
        </button>

        <header>
          <div className="logo-section">
             <div className="logo-circle"></div>
             <h1>BASEWORLD</h1>
          </div>
          
          <div className="stats-container">
            <div className="stats-label">GLOBAL PROGRESS</div>
            <div className="progress-bar-container">
                <div className="progress-bar">
                  <div className="fill" style={{ width: `${percentage}%` }}></div>
                </div>
                <span className="percentage">{percentage}%</span>
            </div>
          </div>

          <div className="wallet-wrapper">
            <button onClick={() => isConnected ? disconnect() : connect({ connector: injected() })} className="btn-connect">
              {isConnected ? (
                  <div className="connected-badge">
                      <span className="dot" style={{ background: chainId === baseSepolia.id ? '#00ff88' : '#ff0000', boxShadow: `0 0 5px ${chainId === baseSepolia.id ? '#00ff88' : '#ff0000'}` }}></span>
                      {address?.slice(0,6)}...{address?.slice(-4)}
                  </div>
              ) : 'CONNECT WALLET'}
            </button>
            {isConnected && chainId !== baseSepolia.id && (
                 <button onClick={() => switchChain({ chainId: baseSepolia.id })} className="btn-switch-chain">
                    Switch to Base Sepolia
                 </button>
            )}
            {isConnected && timeRemaining > 0 && (
              <div className="cooldown-timer">
                NEXT PAINT: {formatTime(timeRemaining)}
              </div>
            )}
          </div>
        </header>

        {endgame && <div className="endgame-banner">BASE WORLD UNLOCKED!</div>}

        {selectedTile !== null && !endgame && (
          <div className="paint-modal">
            <h2>TILE #{selectedTile}</h2>
            <p>Cost: {formatEther(paintPrice as bigint)} ETH</p>
            
            <input 
                type="text" 
                maxLength={20}
                placeholder="Graffiti / Message (Optional)"
                value={graffitiInput}
                onChange={(e) => setGraffitiInput(e.target.value)}
                className="graffiti-input"
            />

            {statusMsg && <p className="status">{statusMsg}</p>}
            
            <button 
              className="btn-paint" 
              onClick={handlePaint} 
              disabled={isPainting || isTxPending || isConfirming || timeRemaining > 0}
              style={{ opacity: timeRemaining > 0 ? 0.5 : 1, cursor: timeRemaining > 0 ? 'not-allowed' : 'pointer' }}
            >
              {isPainting || isTxPending || isConfirming ? 'PROCESSING...' : 
               timeRemaining > 0 ? `WAIT ${formatTime(timeRemaining)}` : `PAINT ${formatEther(paintPrice as bigint)} ETH`}
            </button>
            <button className="btn-cancel" onClick={() => {
                setSelectedTile(null);
                setStatusMsg('');
            }}>CANCEL</button>
            
            {writeError && (
                <div className="error-box">
                    Error: {writeError.message}
                </div>
            )}
          </div>
        )}

        {/* Bottom Controls */}
        <div className="bottom-controls">
            <a href="https://www.base.org" target="_blank" rel="noopener noreferrer" className="base-badge">
            <div className="base-square"></div>
            <span>BUILT ON BASE</span>
            </a>
            
            <button onClick={devReset} className="btn-reset">
                RESET WALLETS (DEV)
            </button>
        </div>
      </div>
    </div>
  );
}

export default App;

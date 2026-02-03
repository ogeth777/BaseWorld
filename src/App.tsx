import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Earth } from './components/Earth';
import { SpaceDebris } from './components/SpaceDebris';
import { useAccount, useConnect, useDisconnect, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { PaintABI, CONTRACT_ADDRESS } from './web3/PaintABI';
import { parseEther } from 'viem';
import { io } from 'socket.io-client';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import axios from 'axios';
import './App.css';

// Socket setup
const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');

function App() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { executeRecaptcha } = useGoogleReCaptcha();
  
  // Web3 Actions
  const { data: hash, writeContract, error: writeError, isPending: isTxPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // State
  const [grid, setGrid] = useState<number[]>(new Array(40000).fill(0));
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [endgame, setEndgame] = useState(false);

  // Load Grid & Socket Events
  useEffect(() => {
    socket.on('connect', () => console.log('Socket connected'));
    
    socket.on('init-grid', (data) => {
      // data might be object or array
      setGrid(Array.from(data));
    });

    socket.on('tile-painted', ({ tileId }) => {
      setGrid(prev => {
        const next = [...prev];
        next[tileId] = 1;
        return next;
      });
    });
    
    socket.on('endgame-triggered', () => setEndgame(true));

    return () => {
      socket.off('init-grid');
      socket.off('tile-painted');
      socket.off('endgame-triggered');
    };
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
      if (!executeRecaptcha) return;
      const token = await executeRecaptcha('paint_verify');
      
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/paint`, {
        txHash,
        tileId,
        address,
        captchaToken: token
      });
      
      setStatusMsg('Painted successfully!');
      setSelectedTile(null);
      setIsPainting(false);
    } catch (err) {
      console.error(err);
      setStatusMsg('Verification failed.');
      setIsPainting(false);
    }
  };

  const handleTileClick = (index: number) => {
    if (grid[index] === 1) return; // Already painted
    setSelectedTile(index);
  };

  const handlePaint = async () => {
    if (!isConnected) {
      connect({ connector: injected() });
      return;
    }
    if (selectedTile === null) return;

    setIsPainting(true);
    setStatusMsg('Preparing transaction...');

    try {
      if (!executeRecaptcha) {
         setStatusMsg('Captcha not ready');
         setIsPainting(false);
         return;
      }
      
      // 1. Get Captcha (Frontend Check)
      const token = await executeRecaptcha('paint_intent');
      if (!token) throw new Error('Captcha failed');

      // 2. Send Transaction
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: PaintABI,
        functionName: 'paint',
        args: [BigInt(selectedTile)],
        value: parseEther('0.000004'),
      });

    } catch (err) {
      console.error(err);
      setStatusMsg('Paint failed');
      setIsPainting(false);
    }
  };

  const paintedCount = grid.filter(x => x === 1).length;
  const percentage = ((paintedCount / 40000) * 100).toFixed(2);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* 3D Scene */}
      <Canvas camera={{ position: [0, 0, 12], fov: 45 }}>
        <color attach="background" args={['#050510']} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <OrbitControls makeDefault enablePan={false} minDistance={7} maxDistance={20} autoRotate={false} />
        <SpaceDebris />
        <Earth onTileClick={handleTileClick} paintedTiles={grid} endgame={endgame} />
      </Canvas>

      {/* UI Overlay */}
      <div className="ui-overlay">
        <header>
          <div className="logo-section">
             <div className="logo-circle"></div>
             <h1>BASE WORLD</h1>
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

          <button onClick={() => isConnected ? disconnect() : connect({ connector: injected() })} className="btn-connect">
            {isConnected ? (
                <div className="connected-badge">
                    <span className="dot"></span>
                    {address?.slice(0,6)}...{address?.slice(-4)}
                </div>
            ) : 'CONNECT WALLET'}
          </button>
        </header>

        {endgame && <div className="endgame-banner">BASE WORLD UNLOCKED!</div>}

        {selectedTile !== null && !endgame && (
          <div className="paint-modal">
            <h2>Paint Tile #{selectedTile}</h2>
            <p>Cost: ~0.000004 ETH (~$0.01)</p>
            {statusMsg && <p className="status">{statusMsg}</p>}
            
            {(isTxPending || isConfirming || isPainting) ? (
              <div className="spinner">Painting...</div>
            ) : (
              <div className="actions">
                <button onClick={handlePaint} className="btn-paint">PAINT NOW</button>
                <button onClick={() => setSelectedTile(null)} className="btn-cancel">Cancel</button>
              </div>
            )}
            
            {writeError && <p className="error">Error: {writeError.message.slice(0, 50)}...</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

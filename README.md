# Base Earth Paint 🌍🎨

A viral collaborative 3D experiment on Base. Paint the world blue, one transaction at a time.

## Tech Stack
- **Frontend**: React 19, Vite, TypeScript, Three.js (@react-three/fiber), Wagmi/Viem.
- **Backend**: Node.js, Express, Socket.io (for real-time updates).
- **Blockchain**: Base Sepolia Testnet (easily switchable to Mainnet).
- **Anti-Bot**: Google reCAPTCHA v3.

## Prerequisites
- Node.js v18+
- MetaMask or Coinbase Wallet

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *Note: For local dev, you can skip the Recaptcha Secret if you want to bypass strict server checks, or generate one at Google Admin Console.*

3. **Deploy Smart Contract**
   You need to deploy `contracts/Paint.sol` to Base Sepolia.
   
   **Using Remix:**
   - Open [Remix IDE](https://remix.ethereum.org/).
   - Upload `contracts/Paint.sol`.
   - Compile and Deploy using "Injected Provider" (MetaMask) connected to Base Sepolia.
   - Copy the deployed **Contract Address**.

   **Update Frontend:**
   - Open `src/web3/PaintABI.ts`.
   - Replace `CONTRACT_ADDRESS` with your new address.

4. **Run Locally**
   
   You need two terminals:

   **Terminal 1: Backend**
   ```bash
   npm run server
   ```

   **Terminal 2: Frontend**
   ```bash
   npm run dev
   ```

   Open `http://localhost:5173` to view the app.

## How it Works
1. **Connect Wallet**: Users connect to Base Sepolia.
2. **Paint**: Click a white tile on the globe.
3. **Verify**: reCAPTCHA checks for bots.
4. **Transact**: User signs a cheap transaction (~$0.01).
5. **Update**: Backend verifies the tx on-chain and broadcasts the update via Socket.io to all connected users instantly.
6. **Win**: When 99% of tiles are blue, the "BASE!" endgame triggers.

## Deployment
- **Frontend**: Deploy to Vercel/Netlify.
- **Backend**: Deploy to a persistent host (Render, Railway, DigitalOcean) because Vercel Serverless functions do not support persistent Socket.io connections easily.
- **Mainnet**: Update `src/web3/config.ts` chain to `base` and `contracts/Paint.sol` price if needed.

import { http, createConfig, fallback } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { injected, metaMask, coinbaseWallet } from 'wagmi/connectors'

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    metaMask(),
    coinbaseWallet({ appName: 'Base World' }),
  ],
  transports: {
    [baseSepolia.id]: fallback([
      http('https://base-sepolia.gateway.tenderly.co'),
      http('https://base-sepolia-rpc.publicnode.com'),
      http('https://base-sepolia.drpc.org'),
      http('https://sepolia.base.org'),
      http('https://base-sepolia.publicnode.com'),
    ], {
      rank: true
    }),
  },
})

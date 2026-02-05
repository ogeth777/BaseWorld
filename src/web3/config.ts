import { http, createConfig, fallback } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { injected, metaMask, coinbaseWallet } from 'wagmi/connectors'

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [baseSepolia.id]: fallback([
      http('https://base-sepolia.drpc.org'),
      http('https://base-sepolia.publicnode.com'),
      http('https://base-sepolia-rpc.publicnode.com'),
      http('https://sepolia.base.org'),
    ], {
      rank: true
    }),
  },
})

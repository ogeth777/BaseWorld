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
      http('https://base-sepolia-rpc.publicnode.com'),
      http('https://base-sepolia.publicnode.com'),
      http('https://sepolia.base.org'),
      http('https://base-sepolia.blockpi.network/v1/rpc/public'),
      http('https://base-sepolia.gateway.tenderly.co'),
      http('https://1rpc.io/base-sepolia'),
      http('https://base-sepolia.drpc.org'),
    ], {
      rank: true
    }),
  },
})

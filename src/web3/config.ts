import { http, createConfig } from 'wagmi'
import { baseSepolia, base } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [baseSepolia, base],
  connectors: [
    injected(),
  ],
  transports: {
    [baseSepolia.id]: http('https://base-sepolia-rpc.publicnode.com'),
    [base.id]: http('https://base-rpc.publicnode.com'),
  },
})

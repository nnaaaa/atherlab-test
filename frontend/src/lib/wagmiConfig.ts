import { createConfig, http } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

// Get RPC URL from environment or use a default one
const SEPOLIA_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.infura.io/v3/6ba9caad72034e7ba396ab06e4b80987'

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    metaMask(), 
    injected()
  ],
  transports: {
    [sepolia.id]: http(SEPOLIA_RPC_URL),
  },
}) 
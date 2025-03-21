# Atherlabs Token Airdrop Frontend

This is the frontend application for the Atherlabs Token Airdrop system, built with Next.js, Shadcn UI, and Wagmi.

## Features

- **Token Claiming Interface**: Allows eligible users to claim their ATHER tokens
- **Time-Based Claiming**: Shows countdown timer for the airdrop period
- **Merkle Proof Verification**: Verifies user eligibility using merkle proofs
- **Wallet Integration**: Connects to user wallets for claiming tokens
- **Real-time Status Updates**: Shows claim status and transaction confirmation

## Time-Based Token Claiming

Users must claim their tokens before the airdrop end time. The application provides:

- Visual countdown showing time remaining until the airdrop ends
- Color-coded timers (green, amber, red) indicating urgency
- Warning notifications when time is running out (less than 24 hours)
- Clear messaging that unclaimed tokens will be returned to the project treasury
- Disabled claiming after the airdrop period ends

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn package manager

### Installation

```bash
# Install dependencies
yarn install
```

### Configuration

Create a `.env.local` file with the following variables:

```
NEXT_PUBLIC_SUPPORTED_CHAIN_ID=11155111
NEXT_PUBLIC_AIRDROP_ADDRESS=<airdrop contract address>
NEXT_PUBLIC_TOKEN_ADDRESS=<token contract address>
```

### Development

```bash
# Start development server
yarn dev
```

### Production Build

```bash
# Build for production
yarn build

# Start production server
yarn start
```

## API Routes

### GET /api/merkle-proof

Returns the merkle proof for a given Ethereum address. This proof is used to verify eligibility for the airdrop.

**Query Parameters:**
- `address`: Ethereum address to check

**Response:**
```json
{
  "address": "0x1234...",
  "proof": ["0xabcd...", "0xdef0..."],
  "isWhitelisted": true
}
```

## Technical Implementation

The frontend implements several key features for time-based token claiming:

1. **Direct Contract Interaction**: Uses Wagmi hooks to interact with the AtherlabsAirdrop contract
2. **Real-time Countdown**: Updates remaining time with second precision
3. **Auto-Refresh**: Periodically refreshes contract state
4. **User-Friendly Messaging**: Displays clear explanations of the claiming process
5. **Visual Feedback**: Shows transaction status and confirmation
6. **Responsive Design**: Works on both desktop and mobile devices

## Components

- **AirdropCard**: The main component for displaying airdrop information and claiming tokens
- **WalletConnect**: Manages wallet connection and authentication
- **API Routes**: Handles server-side operations like merkle proof generation

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API.
- [Shadcn UI](https://ui.shadcn.com) - UI components used in this project.
- [Wagmi](https://wagmi.sh) - React hooks for Ethereum.

## Deployment

The application can be deployed to platforms like Vercel, Netlify, or any hosting service that supports Next.js applications.

# SplitChain - Cross-Chain Expense Sharing

SplitChain is a decentralized expense-splitting application for the multi-chain world. Track shared expenses instantly using Yellow Network state channels (gasless, real-time), and settle debts across 20+ blockchains via LI.FI—all in one click.

## ETHGlobal HackMoney 2026

SplitChain is built for three tracks:

| Track | Integration |
|-------|-------------|
| **Yellow Network** | State channels for gasless expense tracking | 
| **LI.FI** | Cross-chain settlement routing |
| **ENS** | Human-readable member names & avatars | 

See [INTEGRATIONS.md](/INTEGRATIONS.md) for technical integration details.
See [docs/BUSINESS_MODEL.md](/BUSINESS_MODEL.md) for business model documentation.

---

## The Problem

You and your friends use different blockchains. Alice is on Arbitrum, Bob prefers Polygon, Charlie holds ETH on mainnet. Splitting a dinner check or vacation costs becomes a nightmare of bridging, swapping, and waiting. SplitChain fixes this.

## Features

### Instant Expense Tracking
- Add expenses without gas fees or block confirmations
- Yellow Network state channels enable real-time sync across all participants
- Off-chain signatures keep everything fast and free

### Cross-Chain Settlements
- Settle debts across 20+ chains with one click
- LI.FI finds the optimal bridging route automatically
- Pay from any chain, recipient receives on their preferred chain

### Smart Balance Calculation
- Automatic debt simplification minimizes transactions
- Real-time balance updates as expenses are added
- Clear "You owe" / "You're owed" display

### Preferred Chain Selection
- Each user selects which chains they want to receive funds on
- Settlement options automatically filter to match recipient preferences
- No more sending funds to chains users don't use

### Group Management
- Create expense groups for trips, shared living, events
- Add members by Ethereum address or ENS name
- ENS avatars and names displayed automatically
- Real-time sync across all devices and tabs

### Multi-Auth Support
- Connect any wallet (MetaMask, WalletConnect, etc.)
- Email signup with embedded wallets for crypto newcomers
- Powered by Privy for seamless onboarding

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Frontend | React 19, TypeScript 5, Tailwind CSS 4 |
| State Channels | Yellow Network (@erc7824/nitrolite) |
| Cross-Chain | LI.FI SDK |
| Authentication | Privy |
| Database | Firebase Realtime Database |
| Ethereum | Wagmi 3, Viem 2, Ethers 6 |
| State Management | Zustand |

## Supported Chains

**Primary Support:**
- Ethereum Mainnet
- Polygon
- Arbitrum
- Optimism
- BSC (BNB Chain)

**Via LI.FI (20+ chains):**
- Base, Avalanche, Fantom, zkSync, and more

## How It Works

### 1. Create or Join a Group
A group creator establishes a Yellow Network state channel session. Participants join by entering the session ID. Group metadata syncs via Firebase for cross-device access.

### 2. Add Expenses (Off-Chain)
When someone adds an expense:
1. It's immediately added to local state (Zustand)
2. Signed and sent to *Yellow Network* state channel
3. Synced to Firebase for persistence
4. All participants see updates in real-time — no gas on adding expense, no waiting

### 3. View Balances
The app automatically calculates net balances:
- **Positive balance** = You're owed money
- **Negative balance** = You owe money

Debts are simplified to minimize the number of settlement transactions needed.

### 4. Settle Up (Cross-Chain)
When it's time to pay:
1. Click "Settle" on any debt
2. Select your source chain (where your funds are)
3. App checks recipient's preferred chains
4. LI.FI finds the best route (bridge + swap if needed)
5. One transaction settles the debt across chains
6. Transaction hash recorded for transparency

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│  Next.js 16 + React 19 + Tailwind CSS                       │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Yellow Network│    │    Firebase   │    │     LI.FI     │
│ State Channel │    │   Realtime DB │    │   Bridging    │
│  (Off-chain)  │    │  (Persistence)│    │ (Settlement)  │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Privy Auth +    │
                    │   Wagmi/Viem      │
                    └───────────────────┘
```

## Project Structure

```
splitchain/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Homepage
│   ├── create/            # Create group flow
│   ├── join/              # Join group flow
│   ├── dashboard/         # User dashboard
│   └── group/[id]/        # Group detail page
├── components/            # React components
│   ├── ChainSelector.tsx  # Multi-chain preference picker
│   ├── SettlementModal.tsx # Cross-chain settlement UI
│   └── ...
├── lib/
│   ├── yellow/            # Yellow Network integration
│   ├── lifi/              # LI.FI cross-chain service
│   ├── firebase/          # Database operations
│   ├── ens/               # ENS resolution
│   ├── config/            # Chains, providers, Privy setup
│   └── store.ts           # Zustand state management
└── public/                # Static assets
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/splitchain.git
   cd splitchain
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env.local`:
   ```bash
   # Required
   NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
   NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key

   # Firebase (for group sync)
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com

   # Optional
   NEXT_PUBLIC_LIFI_API_KEY=your_lifi_key  # Has free tier
   NEXT_PUBLIC_YELLOW_NETWORK_RPC=wss://clearnet.yellow.com/ws  # Defaults to sandbox
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Data Models

### User
```typescript
interface User {
  address: string;           // Wallet address
  ensName?: string;          // Resolved ENS name
  ensAvatar?: string;        // ENS profile avatar
  preferredChains?: number[]; // Chain IDs for receiving funds
}
```

### Expense
```typescript
interface Expense {
  id: string;
  amount: number;
  description: string;
  paidBy: string;            // Payer's address
  splitAmong: string[];      // Addresses sharing the expense
  timestamp: number;
  currency: string;          // e.g., "USDC"
}
```

### Settlement
```typescript
interface Settlement {
  id: string;
  from: string;              // Payer address
  to: string;                // Recipient address
  amount: number;
  currency: string;
  fromChain?: number;        // Source chain ID
  toChain?: number;          // Destination chain ID
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: string;           // On-chain transaction hash
  timestamp: number;
}
```

## Key Integrations

### Yellow Network
State channels for instant, gasless expense tracking. Messages are signed off-chain and synced via WebSocket to all participants. No blockchain transactions until settlement.

### LI.FI
Aggregates 20+ bridges and DEXs to find optimal cross-chain routes. Handles the complexity of bridging and swapping in a single transaction.

### Firebase
Real-time database for group metadata persistence. Enables cross-device and cross-tab synchronization with instant updates.

### Privy
Unified authentication supporting both crypto-native users (wallet connect) and newcomers (email with embedded wallets).

### ENS
Automatic resolution of Ethereum Name Service names and avatars. Makes addresses human-readable.

## Use Cases

- **Travel Groups**: Split hotels, meals, activities across a trip
- **Shared Living**: Monthly rent, utilities, groceries
- **Event Planning**: Parties, weddings, group gifts
- **Team Expenses**: Work lunches, supplies, subscriptions
- **DAO Operations**: Multi-sig expense tracking

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT

---

*SplitChain: Expense sharing without blockchain boundaries.*

# SplitChain - Cross-Chain Expense Sharing

SplitChain is a decentralized expense sharing application built for the modern multi-chain world. It leverages Yellow Network for instant, gasless expense tracking via state channels and LI.FI for seamless cross-chain settlements.

## Features

- **Instant Expense Tracking**: Add expenses instantly without waiting for block confirmations using Yellow Network state channels.
- **Cross-Chain Settlements**: Settle debts across 20+ chains (Ethereum, Polygon, Arbitrum, Optimism, Base, etc.) powered by LI.FI.
- **Preferred Chain Selection**: Users can select their preferred networks for receiving settlements.
- **Restricted Settlements**: Settlement options are automatically filtered to match the recipient's preferred chains.
- **Add Members**: Group creators can easily add new members by Ethereum address or ENS name.
- **Group Dashboard**: Manage multiple expense groups and track balances in real-time.
- **ENS Integration**: Automatic resolution of ENS names and avatars.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **State Channels**: Yellow Network
- **Cross-Chain Bridge**: LI.FI
- **Authentication**: Privy (Email & Wallet Login)
- **Database**: Firebase Realtime Database (for metadata sync)
- **Styling**: Tailwind CSS

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in `.env.local`:
   ```bash
   NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   # ... other firebase config
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view the app.

## How it Works

1. **Create/Join a Group**: Users lock collateral into a state channel to join a group.
2. **Add Expenses**: Expenses are signed off-chain and synced instantly to all participants.
3. **Settle Up**: At the end of the session (or anytime), users can settle their debts.
4. **Cross-Chain Magic**: The app uses LI.FI to find the best route to swap and bridge funds from the payer's chain to the payee's preferred chain in a single transaction.

# SplitChain Integration Documentation

This document details how SplitChain integrates with Yellow Network, LI.FI, and ENS for the ETHGlobal HackMoney 2026 hackathon.

---

## Yellow Network Integration

### Overview

SplitChain uses Yellow Network's Nitrolite protocol to enable instant, gasless expense tracking through state channels. This allows users to add expenses and track balances in real-time without paying gas fees or waiting for blockchain confirmations.

### SDK Used

```json
"@erc7824/nitrolite": "^0.5.3"
```

### Implementation

**File:** `lib/yellow/service.ts`

### Key Features Implemented

#### 1. Session Creation (State Channel)

```typescript
async createSession(
    groupName: string,
    creator: string,
    participants: string[],
    messageSigner: (message: string) => Promise<string>,
    initialAmount: string = '1000000' // 1 USDC
): Promise<string>
```

When a group is created, SplitChain establishes a Yellow Network state channel with:
- All participants registered
- Initial allocations defined
- Quorum rules set (all must agree)

#### 2. Off-Chain Expense Tracking

```typescript
async addExpense(
    sessionId: string,
    expense: Expense,
    messageSigner: (message: string) => Promise<string>
): Promise<boolean>
```

Expenses are signed off-chain and broadcast via WebSocket:
- No gas fees
- Instant sync to all participants
- Cryptographically signed for security

#### 3. Instant Payments

```typescript
async sendPayment(
    amount: bigint,
    recipient: string,
    messageSigner: (message: string) => Promise<string>,
    sender: string
): Promise<boolean>
```

Off-chain payments within the state channel for real-time balance updates.

#### 4. Session Close & Settlement

```typescript
async closeSession(
    sessionId: string,
    messageSigner: (message: string) => Promise<string>
): Promise<any>
```

When users are ready to settle, the session is closed and final balances are prepared for on-chain settlement.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                    SplitChain App                   │
│                                                     │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│   │  Alice  │  │   Bob   │  │ Charlie │             │
│   └────┬────┘  └────┬────┘  └────┬────┘             │
│        │            │            │                  │
│        └────────────┼────────────┘                  │
│                     │                               │
│            ┌────────▼────────┐                      │
│            │  Yellow Service │                      │
│            │  (WebSocket)    │                      │
│            └────────┬────────┘                      │
└─────────────────────┼───────────────────────────────┘
                      │
              ┌───────▼───────┐
              │   ClearNode   │
              │ (Yellow Ntwrk)│
              └───────────────┘
```

### Message Flow

1. **Expense Added:** User signs expense data → Sent to ClearNode → Broadcast to all participants
2. **Real-time Sync:** WebSocket listeners update local state instantly
3. **No Blockchain:** All operations happen off-chain until settlement

### Why Yellow Network?

| Traditional Approach | With Yellow Network |
|---------------------|---------------------|
| Every expense = 1 tx | Unlimited expenses = 0 tx |
| $2-50 gas per action | $0 gas until settlement |
| Wait for confirmations | Instant updates |
| Poor UX | Web2-like speed |

---

## LI.FI Integration

### Overview

SplitChain uses LI.FI to enable cross-chain settlements. Users can pay debts from any chain and the recipient receives funds on their preferred chain—all in one transaction.

### SDK Used

```json
"@lifi/sdk": "^3.15.5"
```

### Implementation

**File:** `lib/lifi/service.ts`

### Key Features Implemented

#### 1. Route Discovery

```typescript
async getSettlementRoutes(request: RouteRequest): Promise<RouteQuote[]>
```

Finds optimal routes across 20+ chains:
- Compares bridges (Stargate, Hop, Across, etc.)
- Factors in gas costs, fees, and time
- Returns best options sorted by speed

#### 2. Cross-Chain Execution

```typescript
async executeSettlement(
    route: any,
    walletClient: any,
    onUpdate?: (update: any) => void
): Promise<string>
```

Executes the settlement with:
- Automatic chain switching
- Real-time status updates
- Transaction hash tracking

### Supported Chains

| Chain | ID | USDC Address |
|-------|-----|--------------|
| Ethereum | 1 | 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 |
| Polygon | 137 | 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 |
| Arbitrum | 42161 | 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8 |
| Optimism | 10 | 0x7F5c764cBc14f9669B88837ca1490cCa17c31607 |
| BSC | 56 | 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d |

### Settlement Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Diana     │         │   LI.FI     │         │   Alice     │
│  (Base)     │         │   Router    │         │ (Arbitrum)  │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  1. Get Routes        │                       │
       │──────────────────────>│                       │
       │                       │                       │
       │  2. Best Route        │                       │
       │<──────────────────────│                       │
       │                       │                       │
       │  3. Execute           │                       │
       │──────────────────────>│                       │
       │                       │                       │
       │                       │  4. Bridge & Swap     │
       │                       │──────────────────────>│
       │                       │                       │
       │  5. Tx Hash           │                       │
       │<──────────────────────│                       │
       │                       │                       │
```

### User Experience

1. User clicks "Settle" on a debt
2. Selects source chain (where their funds are)
3. App shows recipient's preferred chains
4. LI.FI finds best route
5. One signature → funds arrive on destination chain

---

## ENS Integration

### Overview

SplitChain integrates ENS (Ethereum Name Service) to make adding group members human-readable. Instead of copying long hex addresses, users can type ENS names like `vitalik.eth`.

### Library Used

```json
"viem": "^2.45.1" // ENS functions built into Viem
```

### Implementation

**File:** `lib/ens/resolver.ts`

### Key Features Implemented

#### 1. Forward Resolution (Name → Address)

```typescript
export async function resolveEnsName(ensName: string): Promise<string | null>
```

Resolves `alice.eth` → `0x742d35Cc6634C0532925a3b844Bc9e7595f...`

Used when adding members to a group by ENS name.

#### 2. Reverse Resolution (Address → Name)

```typescript
export async function resolveAddress(address: string): Promise<string | null>
```

Resolves `0x742d...` → `alice.eth`

Used to display human-readable names in the UI.

#### 3. Avatar Resolution

```typescript
export async function getEnsAvatar(ensName: string): Promise<string | null>
```

Fetches the ENS profile avatar for display in member lists.

#### 4. Text Records

```typescript
export async function getEnsText(ensName: string, key: string): Promise<string | null>
```

Reads arbitrary text records from ENS (e.g., Twitter handle, website, etc.).

### User Experience

**Adding a Member:**
```
Input: "vitalik.eth"
   ↓
resolveEnsName("vitalik.eth")
   ↓
Address: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
   ↓
getEnsAvatar("vitalik.eth")
   ↓
Avatar displayed in UI
```

**Viewing Members:**
```
Address: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
   ↓
resolveAddress("0xd8dA...")
   ↓
Display: "vitalik.eth" with avatar
```

### Why ENS?

| Without ENS | With ENS |
|-------------|----------|
| "Add 0x742d35Cc6634C0532925a3b844Bc9e7595f..." | "Add alice.eth" |
| Confusing member list | Human-readable names |
| No visual identity | Profile avatars |
| Easy to make mistakes | Clear identification |

---

## Integration Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| Off-Chain State | Yellow Network | Instant, gasless expense tracking |
| Cross-Chain Settlement | LI.FI | Pay from any chain to any chain |
| Identity | ENS | Human-readable member names & avatars |

### Combined Flow

```
1. CREATE GROUP
   └── Yellow Network creates state channel

2. ADD MEMBERS
   └── ENS resolves names to addresses

3. TRACK EXPENSES (instant, gasless)
   └── Yellow Network signs off-chain messages

4. SETTLE DEBTS (cross-chain)
   └── LI.FI bridges funds to recipient's preferred chain
```

---

## Technical Requirements

### Environment Variables

```bash
# Yellow Network
NEXT_PUBLIC_YELLOW_NETWORK_RPC=wss://clearnet-sandbox.yellow.com/ws

# LI.FI (optional - has free tier)
NEXT_PUBLIC_LIFI_API_KEY=your_lifi_api_key

# ENS (via Alchemy)
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
```

### Dependencies

```json
{
  "@erc7824/nitrolite": "^0.5.3",
  "@lifi/sdk": "^3.15.5",
  "viem": "^2.45.1"
}
```

---

*Built for ETHGlobal HackMoney 2026*

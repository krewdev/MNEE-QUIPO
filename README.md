# QuipoWallet - Gasless Agent Wallet

**🎯 MNEE Hackathon Entry - AI & Agent Payments Track**

**ERC-4337 Account Abstraction wallet enabling AI agents to pay for gas using MNEE stablecoin**

> 📖 **📚 Comprehensive Documentation**: See [`QUIPO_PLATFORM.md`](./QUIPO_PLATFORM.md) for the complete platform guide, including vision, philosophy, and all features.

## Overview

QuipoWallet solves the critical problem preventing AI agents from operating autonomously on Ethereum: **they need ETH to pay for gas fees**. This creates a complex onboarding and management challenge for autonomous agents.

**Our Solution:** AI agents can now pay for gas using **MNEE** (USD-backed stablecoin) instead of ETH, through an ERC-4337 Paymaster contract. This enables true autonomous finance for AI agents, commerce, and automated systems.

### 🏆 Hackathon Alignment

This project addresses the **AI & Agent Payments** track by:
- ✅ Enabling AI agents to transact autonomously without ETH holdings
- ✅ Using MNEE stablecoin for gas payments (stable value, no volatility)
- ✅ Demonstrating programmable money for automated systems
- ✅ Solving real coordination problems in autonomous finance

**MNEE Contract:** `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF` (Official MNEE stablecoin on Ethereum)

### Key Features

- ✅ **ERC-4337 Account Abstraction** - Smart contract wallets with gasless transactions
- ✅ **MNEE Stablecoin Integration** - Pay for gas with MNEE (USD-backed) instead of ETH
- ✅ **Multi-Chain Support** - Deploy on Ethereum, Base, Polygon, and Arbitrum for maximum reach
- ✅ **Smart Wallet Factory** - Deterministic wallet creation using CREATE2
- ✅ **The Graph Integration** - Real-time transaction indexing and analytics
- ✅ **Dune Analytics Integration** - Professional blockchain analytics and data visualization
- ✅ **Modern React Frontend** - Live dashboard with transaction stats
- ✅ **Autonomous Agent Support** - AI agents can transact without ETH holdings

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│ AI Agent    │────────▶│ AgentWallet  │────────▶│  EntryPoint │
│ (EOA/SC)    │         │  (ERC-4337)  │         │   (ERC-4337)│
└─────────────┘         └──────────────┘         └─────────────┘
                              │                         │
                              │                         │
                              ▼                         ▼
                        ┌─────────────┐         ┌──────────────┐
                        │ MNEE Token  │         │  Paymaster   │
                        │ (ERC-2612)  │◀────────│  (MNEE/ETH)  │
                        └─────────────┘         └──────────────┘
```

## Project Structure

```
QUIPOWALLET/
├── contracts/          # Smart contracts
│   ├── MNEEToken.sol
│   ├── AgentWallet.sol
│   ├── MNEEPaymaster.sol
│   └── AgentWalletFactory.sol
├── scripts/            # Deployment scripts
│   └── deploy.ts
├── test/               # Tests
│   ├── MNEEToken.test.ts
│   └── Paymaster.test.ts
├── frontend/           # Next.js frontend
│   ├── app/
│   └── components/
├── subgraph/           # The Graph subgraph
│   ├── schema.graphql
│   └── src/
└── README.md
```

## Smart Contracts

### MNEEToken.sol
ERC20 token with ERC-2612 Permit support for gasless approvals.

**Features:**
- Standard ERC20 functionality
- ERC-2612 Permit (signature-based approvals)
- Mintable (max supply: 1 billion)
- Burnable

### AgentWallet.sol
ERC-4337 compatible smart wallet for AI agents.

**Features:**
- BaseAccount implementation
- EIP-712 signature validation
- Batch transaction support
- EntryPoint integration

### MNEEPaymaster.sol
ERC-4337 Paymaster that accepts MNEE tokens and pays ETH gas.

**Features:**
- Validates user operations
- Calculates required MNEE amount
- Transfers MNEE from user to treasury
- Tracks total gas sponsored and MNEE collected
- Pausable for security

### AgentWalletFactory.sol
Factory for creating deterministic AgentWallet instances.

**Features:**
- CREATE2 for address prediction
- Wallet ownership tracking
- Batch wallet queries

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Hardhat
- MetaMask or compatible wallet

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd QUIPOWALLET
```

2. Install dependencies:
```bash
npm install
cd frontend && npm install && cd ..
cd subgraph && npm install && cd ..
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your private key, RPC URLs, etc.
```

### Deployment

1. Compile contracts:
```bash
npm run compile
```

2. Run tests:
```bash
npm run test
```

3. Deploy to Sepolia:
```bash
npm run deploy:sepolia
```

Update contract addresses in:
- `frontend/.env.local`
- `subgraph/subgraph.yaml`

### Frontend

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Create `.env.local`:
```
NEXT_PUBLIC_MNEE_TOKEN=<deployed_address>
NEXT_PUBLIC_PAYMASTER=<deployed_address>
NEXT_PUBLIC_FACTORY=<deployed_address>
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your_project_id>
```

3. Run development server:
```bash
npm run dev
```

Visit `http://localhost:3000`

### Subgraph

1. Generate ABIs:
```bash
npm run compile
# Copy generated ABIs to subgraph/abis/
```

2. Update `subgraph.yaml` with contract addresses

3. Generate and build:
```bash
cd subgraph
npm run codegen
npm run build
npm run deploy
```

## Usage

### Creating an Agent Wallet

1. Connect your wallet to the frontend
2. Enter a salt value (or generate random)
3. Click "Create Wallet"
4. The factory creates a deterministic wallet address

### Sending Gasless Transactions

1. Approve MNEE tokens for the Paymaster
2. Estimate gas for your transaction
3. Calculate required MNEE amount
4. Send transaction through ERC-4337 EntryPoint
5. Paymaster pays ETH gas, deducts MNEE

### Using ERC-2612 Permit

Instead of traditional `approve()`, use `permit()`:

```javascript
// Sign permit message
const domain = {
  name: "MNEE Token",
  version: "1",
  chainId: 11155111, // Sepolia
  verifyingContract: mneeTokenAddress
};

const types = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
};

const value = {
  owner: userAddress,
  spender: paymasterAddress,
  value: amount,
  nonce: await mneeToken.nonces(userAddress),
  deadline: Math.floor(Date.now() / 1000) + 3600
};

const signature = await signer.signTypedData(domain, types, value);
// Use signature in transaction
```

## Security Features

- ✅ Reentrancy protection
- ✅ Access control (Ownable)
- ✅ Pausable contracts
- ✅ Input validation
- ✅ Safe math operations
- ✅ Signature validation

## Testing

Run all tests:
```bash
npm run test
```

Run specific test file:
```bash
npx hardhat test test/MNEEToken.test.ts
```

## Deployment Checklist

- [ ] Deploy MNEE Token
- [ ] Deploy Agent Wallet Factory
- [ ] Deploy MNEE Paymaster
- [ ] Fund Paymaster with ETH
- [ ] Add stake to Paymaster
- [ ] Update frontend environment variables
- [ ] Deploy subgraph
- [ ] Verify contracts on Etherscan
- [ ] Test end-to-end flow

## Contract Addresses (Sepolia)

Update these after deployment:

- **MNEE Token**: `0x...`
- **Agent Wallet Factory**: `0x...`
- **MNEE Paymaster**: `0x...`
- **Entry Point**: `0x0000000071727De22E5E9d8BAf0edAc6f37da032`

## Technologies

- **Solidity** 0.8.20
- **Hardhat** - Development framework
- **TypeScript** - Type safety
- **Next.js** 14 - Frontend framework
- **Wagmi** + **RainbowKit** - Web3 integration
- **The Graph** - Indexing and queries
- **ERC-4337** - Account Abstraction standard
- **ERC-2612** - Permit standard

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT

## Acknowledgments

- ERC-4337 community
- OpenZeppelin for security standards
- The Graph for indexing infrastructure


# 🪢 Quipo: Universal Agentic Wallet Platform

> *"A modern knot language for encoding digital interactions and obligations into one coherent, traversable fabric of data."*

---

## 🌄 Vision & Philosophy

### The Name: Quipo/Quipu

**Quipo** (also spelled **Quipu** or **Khipu**) draws inspiration from the ancient Andean quipu—a bundle of colored, knotted cords used as a decentralized ledger and counting device for census, tax, inventory, and other state data across the vast Incan empire.

In this framing, Quipo is positioned as a modern **"knot language"**: a structured way to encode many streams of digital interactions and obligations into one coherent, traversable fabric of data.

### What "Agentic Wallet" Means

An **agentic wallet** is a digital wallet built specifically for AI-native interactions, acting as a secure control center where a user (or organization) manages identity, authorizes AI-agent transactions, and owns resulting data and IP.

It functions more like a **personal command hub** than a simple key store: integrating identity, permissions, payments, and cross-agent connectivity so multiple AI systems can operate on the user's behalf under clear rules.

### Core Platform Description

**Quipo** is a universal agentic wallet platform that manages identity, data, and value across many AI agents and services. Like the ancient quipu's knots encoded complex information in a structured, readable format, Quipo encodes digital interactions—transactions, permissions, identity, and value—into a coherent, traversable system.

**Key Principles:**
- 🪢 **Knot-like Structure**: Each interaction is a "knot" in the fabric—traceable, verifiable, and part of a larger pattern
- 🔗 **Interconnected**: Multiple agents and services connect through the wallet
- 📊 **Traversable**: All interactions can be queried, analyzed, and understood
- 🔐 **Secure**: Identity and permissions are managed centrally but executed decentralized
- 💎 **Value-Native**: Payments, staking, and value transfer are first-class citizens

---

## 🎯 Problem Statement

### The Challenge

**Before Quipo:**
```
AI Agent wants to execute transaction
    ↓
Needs ETH to pay for gas
    ↓
Must hold volatile ETH
    ↓
Complex ETH management
    ↓
❌ Barrier to autonomous agents
```

**With Quipo:**
```
AI Agent wants to execute transaction
    ↓
Uses MNEE (stablecoin) instead
    ↓
Paymaster pays ETH gas
    ↓
Agent pays in MNEE
    ↓
✅ Simple, stable, autonomous
```

### The Solution

QuipoWallet solves the critical problem preventing AI agents from operating autonomously on Ethereum: **they need ETH to pay for gas fees**. This creates a complex onboarding and management challenge for autonomous agents.

**Our Solution:** AI agents can now pay for gas using **MNEE** (USD-backed stablecoin) instead of ETH, through an ERC-4337 Paymaster contract. This enables true autonomous finance for AI agents, commerce, and automated systems.

---

## 🏗️ Architecture Overview

### System Components

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

### Core Contracts

1. **AgentWallet** - ERC-4337 smart wallet for AI agents
2. **MNEEPaymaster** - Pays ETH gas, charges MNEE
3. **MNEEToken** - ERC-20 token with ERC-2612 Permit support
4. **MNEETokenUTXO** - UTXO model for Bitcoin-like token economics
5. **AgentWalletFactory** - Deterministic wallet creation using CREATE2
6. **BridgeMNEE** - Cross-chain transfers (Bitcoin ↔ EVM)
7. **MNEECreditPool** - Staking and credit system
8. **MNEEStaking** - Staking protocol with borrowing

---

## 🚀 Quick Start

### 5-Step Flow

#### Step 1: Agent Has MNEE on Bitcoin
```
Bitcoin Address: 1Hx6egm...
Balance: 2 MNEE (as UTXOs)
```
**Command:** `./mnee-x balance --chain bitcoin`

#### Step 2: Create Smart Wallet
```
Factory creates smart contract wallet
Address: 0x2B0338... (deterministic)
```
**Command:** `./mnee-x create-wallet --chain sepolia`

#### Step 3: Bridge MNEE to Sepolia
```
Bitcoin: 1 MNEE locked
         ↓
Bridge: Submits proof
         ↓
Sepolia: 1 MNEE minted to wallet
```
**Command:** `./mnee-x bridge --from-chain btc --to-chain sepolia --amount 1`

#### Step 4: Agent Executes Transaction
```
Agent wants to: transfer(recipient, 100 tokens)
                 ↓
Creates UserOperation with Paymaster
                 ↓
Paymaster pays ETH gas
                 ↓
Agent pays 0.001 MNEE
                 ↓
Transaction succeeds!
```

#### Step 5: Agent Can Continue
```
Agent has: 0.999 MNEE remaining
Can execute: More transactions
No ETH needed: Ever!
```

---

## 📚 Complete Documentation

### 1. Architecture & Design

**See:** `ARCHITECTURE.md`

- System overview
- Core components
- Transaction flows
- Security considerations
- Gas optimization
- Scalability

### 2. Flow Explanations

**See:** `FLOW_EXPLAINED.md` and `SIMPLE_FLOW.md`

- Complete flow diagrams
- Step-by-step examples
- User journey
- Common questions

### 3. Credit & Staking Systems

**See:** `MNEE_CREDIT_SYSTEM.md` and `STAKING_PROTOCOL.md`

- MNEE Credit Line system
- Staking protocol
- Borrowing mechanisms
- Yield generation
- Economic models

### 4. UTXO Model

**See:** `UTXO_GUIDE.md`

- UTXO concepts
- Transaction construction
- Paymaster integration
- Privacy benefits
- Bitcoin compatibility

### 5. Multi-Chain Support

**See:** `MULTICHAIN.md`

- Supported chains (Ethereum, Base, Polygon, Arbitrum)
- Deployment strategies
- Chain-specific features
- Cross-chain considerations

### 6. CLI Commands

**See:** `CLI_COMMANDS.md`

- Complete CLI reference
- All available commands
- Usage examples
- Integration guides

### 7. Demo & Integration

**See:** `HACKATHON_DEMO.md` and `MNEE_SDK_INTEGRATION.md`

- Demo flow
- Integration guides
- SDK usage
- API references

---

## 🎨 Design Aesthetics: The Knot Language

### Visual Metaphor

Just as the ancient quipu used:
- **Different colored cords** → Different types of interactions
- **Knot positions** → Transaction states and timestamps
- **Knot types** → Different operation types
- **Cord groupings** → Related transactions and agent relationships

Quipo uses:
- **Transaction types** → Different interaction categories
- **Block timestamps** → Temporal ordering
- **Event logs** → Knot-like markers in the chain
- **Wallet relationships** → Connected cords in the network

### Design Principles

1. **Structured Complexity**: Like quipu knots, each transaction is structured but part of a larger pattern
2. **Traversability**: All interactions can be queried and understood
3. **Interconnection**: Agents and services connect through the wallet fabric
4. **Verifiability**: Each "knot" (transaction) is cryptographically verifiable
5. **Pattern Recognition**: Analytics reveal patterns in agent behavior

### UI/UX Implications

- **Visual Flow**: Show transactions as connected nodes (like quipu cords)
- **Color Coding**: Different colors for different transaction types
- **Temporal View**: Time-based visualization of interactions
- **Relationship Maps**: Show connections between agents and services
- **Pattern Discovery**: Analytics that reveal usage patterns

---

## 🔧 Technical Specifications

### Smart Contracts

#### MNEEToken.sol
- ERC-20 token with ERC-2612 Permit support
- Mintable (max supply: 1 billion)
- Burnable
- Gasless approvals via Permit

#### AgentWallet.sol
- ERC-4337 BaseAccount implementation
- EIP-712 signature validation
- Batch transaction support
- EntryPoint integration

#### MNEEPaymaster.sol
- Validates user operations
- Calculates required MNEE amount
- Transfers MNEE from user to treasury
- Tracks total gas sponsored and MNEE collected
- Pausable for security

#### AgentWalletFactory.sol
- CREATE2 for address prediction
- Wallet ownership tracking
- Batch wallet queries

#### BridgeMNEE.sol
- Bitcoin ↔ EVM transfers
- Merkle proof verification
- Lock and mint mechanism

#### MNEETokenUTXO.sol
- UTXO model for Bitcoin-like economics
- Privacy-preserving transfers
- Double-spend prevention

#### MNEECreditPool.sol
- Staking with credit lines
- Instant borrowing
- Liquidity pool integration
- Triple yield system

### Standards & Protocols

- **ERC-4337**: Account Abstraction
- **ERC-2612**: Permit (gasless approvals)
- **ERC-20**: Token standard
- **EIP-712**: Structured data signing
- **Bitcoin Ordinals**: UTXO-based tokens

---

## 💡 Key Features

### For AI Agents

✅ **No ETH Management** - Pay for gas with MNEE stablecoin  
✅ **Stable Gas Payments** - USD-backed, no volatility  
✅ **Simple Onboarding** - Create wallet, bridge MNEE, start operating  
✅ **Autonomous Operation** - Fully automated transaction execution  
✅ **Cross-Chain Support** - Operate on multiple chains  
✅ **Credit System** - Stake MNEE, get instant credit line  

### For Users

✅ **Easy Agent Funding** - Bridge from Bitcoin or receive directly  
✅ **Predictable Costs** - Stablecoin pricing, no ETH volatility  
✅ **Secure & Reliable** - Audited contracts, timelocks  
✅ **Multi-Chain** - Choose your preferred network  
✅ **Analytics** - Track agent activity and costs  
✅ **Privacy Options** - UTXO model for enhanced privacy  

### For Developers

✅ **ERC-4337 Standard** - Industry-standard account abstraction  
✅ **Well-Documented** - Comprehensive docs and examples  
✅ **TypeScript SDK** - Full type safety  
✅ **CLI Tools** - Easy testing and interaction  
✅ **Subgraph Integration** - Real-time indexing  
✅ **Dune Analytics** - Professional analytics  

---

## 🔐 Security Features

### Smart Contract Security

- ✅ Reentrancy protection
- ✅ Access control (Ownable)
- ✅ Pausable contracts
- ✅ Input validation
- ✅ Safe math operations
- ✅ Signature validation
- ✅ Rate limits
- ✅ Treasury separation

### Paymaster Security

- ✅ Rate management
- ✅ Balance monitoring
- ✅ Stake management
- ✅ Emergency pause
- ✅ Liquidation protection

### Credit System Security

- ✅ Credit line limits
- ✅ Liquidation protection
- ✅ Interest accrual
- ✅ Collateral checks
- ✅ Reentrancy protection

---

## 📊 Analytics & Monitoring

### The Graph Integration

Real-time transaction indexing:
- Gas sponsored events
- Wallet creation events
- Transfer events
- Approval events

### Dune Analytics

Professional blockchain analytics:
- Gas sponsored queries
- MNEE volume tracking
- Paymaster summaries
- Wallet creation stats

### Frontend Dashboard

Live dashboard with:
- Transaction statistics
- Real-time updates
- Agent activity tracking
- Cost analysis

---

## 🌐 Multi-Chain Deployment

### Supported Chains

**Mainnets:**
- Ethereum
- Base
- Polygon
- Arbitrum

**Testnets:**
- Sepolia
- Base Sepolia
- Polygon Mumbai

### Deployment Strategy

```bash
# Deploy to single chain
npm run deploy:sepolia
npm run deploy:base
npm run deploy:polygon
npm run deploy:arbitrum

# Deploy to all chains
npm run deploy:all
```

### Benefits

- Lower gas fees (L2s)
- Faster transactions
- Broader reach
- Network resilience
- User choice

---

## 🎯 Use Cases

### 1. Autonomous AI Agents

AI agents can operate fully autonomously:
- Execute transactions without ETH
- Pay for gas with stable MNEE
- Manage their own operations
- No manual intervention needed

### 2. Agentic Commerce

E-commerce agents can:
- Process payments automatically
- Handle refunds and disputes
- Manage inventory
- Execute smart contracts

### 3. DeFi Automation

DeFi agents can:
- Execute trades automatically
- Manage liquidity positions
- Compound yields
- Rebalance portfolios

### 4. Cross-Chain Operations

Agents can:
- Bridge assets between chains
- Execute multi-chain strategies
- Manage assets across networks
- Unified wallet interface

### 5. Credit & Lending

Agents can:
- Stake MNEE for yield
- Borrow against stake
- Access instant credit
- Leverage positions

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Hardhat
- MetaMask or compatible wallet

### Installation

```bash
# Clone repository
git clone <repository-url>
cd QUIPOWALLET

# Install dependencies
npm install
cd frontend && npm install && cd ..
cd subgraph && npm install && cd ..
cd cli && npm install && cd ..
```

### Environment Setup

```bash
# Copy example env
cp .env.example .env

# Configure:
# - PRIVATE_KEY
# - SEPOLIA_RPC_URL
# - MNEE_API_KEY
# - ETHERSCAN_API_KEY
```

### Deployment

```bash
# Compile contracts
npm run compile

# Run tests
npm run test

# Deploy to Sepolia
npm run deploy:sepolia
```

### Frontend

```bash
cd frontend
npm run dev
# Visit http://localhost:3000
```

### CLI

```bash
cd cli
npm run build
./mnee-x --help
```

---

## 📖 Documentation Index

### Core Documentation
- `README.md` - Project overview and quick start
- `ARCHITECTURE.md` - System architecture and design
- `QUIPO_PLATFORM.md` - This comprehensive guide

### Flow & Usage
- `SIMPLE_FLOW.md` - Simple 5-step flow
- `FLOW_EXPLAINED.md` - Detailed flow explanation
- `HACKATHON_DEMO.md` - Demo guide
- `CLI_COMMANDS.md` - CLI reference

### Systems & Features
- `MNEE_CREDIT_SYSTEM.md` - Credit line system
- `STAKING_PROTOCOL.md` - Staking and borrowing
- `UTXO_GUIDE.md` - UTXO model guide
- `MULTICHAIN.md` - Multi-chain deployment
- `BRIDGE_VS_SEND.md` - Bridge comparison

### Integration
- `MNEE_SDK_INTEGRATION.md` - SDK integration
- `UTXO_MNEE_COMPLIANCE.md` - Compliance guide
- `GET_ORDINALSBOT_API_KEY.md` - API setup

### Setup & Configuration
- `SANDBOX_SETUP.md` - Sandbox environment
- `cli/QUICK_START.md` - CLI quick start
- `cli/INSTALL.md` - CLI installation

---

## 🎓 Learning Resources

### Concepts

1. **ERC-4337 Account Abstraction**
   - Smart contract wallets
   - UserOperations
   - EntryPoint
   - Paymasters

2. **ERC-2612 Permit**
   - Gasless approvals
   - Signature-based permissions
   - EIP-712 signing

3. **UTXO Model**
   - Bitcoin-like token economics
   - Privacy benefits
   - Double-spend prevention

4. **Cross-Chain Bridging**
   - Lock and mint
   - Merkle proofs
   - Bitcoin ↔ EVM

### Tutorials

- Creating your first agent wallet
- Bridging MNEE from Bitcoin
- Executing gasless transactions
- Using the credit system
- Multi-chain deployment

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Style

- TypeScript for all scripts
- Solidity 0.8.20 for contracts
- Follow existing patterns
- Document new features

---

## 📄 License

MIT

---

## 🙏 Acknowledgments

- ERC-4337 community
- OpenZeppelin for security standards
- The Graph for indexing infrastructure
- MNEE team for stablecoin support
- Bitcoin Ordinals community

---

## 🔮 Future Vision

### Short Term

- Enhanced analytics dashboard
- More chain deployments
- Improved UTXO selection algorithms
- Gas optimization improvements

### Long Term

- Decentralized bridge operators
- Governance system (DAO)
- Advanced privacy features
- Cross-chain agent coordination
- AI agent marketplace
- Identity and reputation system

---

## 📞 Support & Community

- **Documentation**: See docs in repository
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **CLI Help**: `./mnee-x --help`

---

**Quipo: Weaving the future of agentic finance, one transaction at a time.** 🪢✨


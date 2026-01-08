# QuipoWallet Architecture

## System Overview

QuipoWallet implements a gasless transaction system for AI agents using ERC-4337 Account Abstraction and a custom Paymaster that accepts MNEE tokens instead of ETH.

## Core Components

### 1. MNEEToken (ERC-20 + ERC-2612)

**Purpose:** Native token used for paying gas fees

**Key Features:**
- Standard ERC-20 token functionality
- ERC-2612 Permit support for gasless approvals
- Mintable (max supply: 1 billion)
- Burnable

**Security:**
- Ownable access control
- ReentrancyGuard protection
- Maximum supply cap

### 2. AgentWallet (ERC-4337 Smart Wallet)

**Purpose:** Smart contract wallet for AI agents

**Key Features:**
- BaseAccount implementation (ERC-4337)
- EIP-712 signature validation
- Single and batch transaction execution
- EntryPoint integration

**Flow:**
1. Agent signs transaction (off-chain)
2. UserOperation created with signature
3. EntryPoint validates and executes
4. Paymaster pays gas (if configured)

### 3. MNEEPaymaster (ERC-4337 Paymaster)

**Purpose:** Pay gas fees in ETH, charge users in MNEE

**Key Features:**
- Validates user operations
- Calculates required MNEE amount based on gas cost
- Transfers MNEE from user to treasury
- Tracks statistics (total gas sponsored, MNEE collected)

**Validation Flow:**
1. `_validatePaymasterUserOp()` - Check user has sufficient MNEE allowance
2. EntryPoint executes transaction
3. `_postOp()` - Transfer MNEE from user based on actual gas cost

**Security:**
- Pausable (emergency stop)
- ReentrancyGuard
- Rate limits (minimum MNEE amount)
- Treasury separation

### 4. AgentWalletFactory

**Purpose:** Create deterministic smart wallets

**Key Features:**
- CREATE2 for address prediction
- Wallet ownership tracking
- Batch queries

**Benefits:**
- Predictable addresses
- Gas-efficient deployment
- Wallet discovery

## Transaction Flow

### Standard Flow (with Approval)

```
1. User approves MNEE for Paymaster
   └─> MNEEToken.approve(paymaster, amount)

2. User creates UserOperation
   ├─> sender: AgentWallet address
   ├─> paymaster: Paymaster address
   └─> paymasterAndData: amount (encoded)

3. EntryPoint receives UserOperation
   ├─> Validates signature
   ├─> Calls Paymaster.validatePaymasterUserOp()
   │   └─> Checks MNEE allowance
   └─> Executes transaction

4. EntryPoint calls Paymaster._postOp()
   └─> Transfers MNEE from user to treasury
```

### Gasless Approval Flow (ERC-2612 Permit)

```
1. User signs Permit message (off-chain)
   ├─> owner: user address
   ├─> spender: paymaster address
   ├─> value: amount
   ├─> nonce: current nonce
   └─> deadline: expiration time

2. Permit included in UserOperation
   ├─> paymasterAndData contains permit signature
   └─> Paymaster calls permit() then transfers

3. Single transaction: approve + execute
```

## Data Flow

### Frontend → Smart Contracts
- Wallet connection (MetaMask, WalletConnect)
- Contract interactions via Wagmi
- Transaction signing
- Real-time state updates

### Smart Contracts → Subgraph
- Events emitted:
  - `GasSponsored` - Track gas payments
  - `WalletCreated` - Track wallet creation
  - `Transfer` - Track MNEE transfers
  - `Approval` - Track approvals

### Subgraph → Frontend
- Aggregated statistics
- Transaction history
- Real-time dashboards

## Security Considerations

### Smart Contracts
1. **Access Control**
   - Ownable for admin functions
   - EntryPoint-only execution paths

2. **Reentrancy Protection**
   - ReentrancyGuard on critical functions
   - Checks-Effects-Interactions pattern

3. **Input Validation**
   - Zero address checks
   - Amount validation
   - Rate limits

4. **Pause Mechanism**
   - Emergency stop capability
   - Controlled by owner

### Paymaster Security
1. **Rate Management**
   - Configurable exchange rate
   - Minimum amount requirements

2. **Balance Monitoring**
   - Track deposited ETH
   - Alert on low balance

3. **Stake Management**
   - EntryPoint stake requirement
   - Unstake delay protection

## Gas Optimization

1. **Permit Usage**
   - Eliminates approval transaction
   - Saves ~46,000 gas per transaction

2. **Batch Operations**
   - Execute multiple calls in one transaction
   - Shared overhead

3. **CREATE2**
   - Deterministic addresses
   - No address lookup needed

4. **Event Optimization**
   - Indexed parameters for efficient filtering
   - Minimal event data

## Scalability

### Horizontal Scaling
- Multiple Paymasters can run simultaneously
- Load balancing via routing

### Vertical Scaling
- Increase Paymaster deposit
- Optimize gas usage

### Off-Chain Components
- Bundler (handles UserOperation batching)
- Indexer (The Graph)
- Frontend (CDN distributed)

## Integration Points

### EntryPoint
- Standard ERC-4337 EntryPoint contract
- Handles UserOperation validation and execution
- Manages deposits and stakes

### Bundler
- Packages UserOperations into transactions
- Submits to EntryPoint
- Can be self-hosted or use public service

### Indexer (The Graph)
- Indexes contract events
- Provides GraphQL API
- Real-time updates

## Future Enhancements

1. **Multi-Chain Support**
   - Deploy to multiple networks
   - Cross-chain bridges

2. **Advanced Permits**
   - Batch permits
   - Time-locked permits

3. **Gasless Wallet Creation**
   - Sponsor factory calls
   - Batch wallet creation

4. **Analytics**
   - Advanced dashboards
   - Agent behavior tracking
   - Cost optimization insights

5. **Governance**
   - DAO for rate management
   - Treasury management
   - Upgrade proposals


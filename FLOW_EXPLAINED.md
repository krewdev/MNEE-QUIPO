# 🔄 QuipoWallet Flow - Complete Explanation

## 🎯 The Problem We're Solving

**Before QuipoWallet:**
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

**With QuipoWallet:**
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

---

## 📊 Complete Flow Diagram

### Phase 1: Setup (One-Time)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Deploy Contracts                                     │
│    - AgentWalletFactory (creates wallets)                │
│    - MNEEPaymaster (pays gas, charges MNEE)             │
│    - BridgeMNEE (Bitcoin ↔ EVM transfers)                │
│    - MNEETokenUTXO (UTXO model on EVM)                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Get MNEE on Bitcoin                                  │
│    - User has MNEE tokens on Bitcoin (as UTXOs)         │
│    - Example: 2 MNEE at address 1Hx6egm...             │
└─────────────────────────────────────────────────────────┘
```

---

### Phase 2: Create Agent Wallet

```
User runs: ./mnee-x create-wallet --chain sepolia
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Step 1: Factory creates wallet                          │
│    - Uses CREATE2 for deterministic address              │
│    - Address = f(owner, salt)                           │
│    - Predictable before creation                        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Step 2: Wallet deployed                                  │
│    - Smart contract wallet (ERC-4337)                   │
│    - Can execute transactions                            │
│    - Doesn't need ETH to exist                           │
│    - Example: 0x2B0338f7225F6201a04804564b2A02C028372e80│
└─────────────────────────────────────────────────────────┘
```

**What this means:**
- The wallet is a smart contract, not a regular account
- It can execute transactions without holding ETH
- Address is deterministic (same owner + salt = same address)

---

### Phase 3: Bridge Bitcoin → Sepolia

```
User runs: ./mnee-x bridge --from-chain btc --to-chain sepolia --amount 1
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Step 1: Lock MNEE on Bitcoin                            │
│    - Send 1 MNEE from Bitcoin address                   │
│    - To bridge contract address on Bitcoin              │
│    - Creates UTXO lock                                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Step 2: Wait for Bitcoin confirmation                   │
│    - Wait 6+ blocks                                     │
│    - Get transaction hash                               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Step 3: Bridge operator submits proof                   │
│    - Submits Bitcoin transaction proof                  │
│    - Merkle proof of Bitcoin transaction                │
│    - Calls: submitBitcoinProof() on BridgeMNEE          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Step 4: Claim MNEE on Sepolia                           │
│    - User calls: claimBitcoinDeposit(txHash)            │
│    - BridgeMNEE mints 1 MNEE on Sepolia                  │
│    - MNEE goes to agent wallet address                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Result: Agent wallet now has 1 MNEE on Sepolia          │
│    - Can be used to pay for gas                          │
│    - Stored as UTXO (if using MNEETokenUTXO)            │
│    - Or as ERC-20 balance (if using MNEEToken)          │
└─────────────────────────────────────────────────────────┘
```

**What this means:**
- MNEE moves from Bitcoin to Sepolia
- Agent wallet receives MNEE on Sepolia
- Can now pay for gas using MNEE

---

### Phase 4: Execute Gasless Transaction

```
Agent wants to execute: transfer(recipient, amount)
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Step 1: Agent creates UserOperation                     │
│    - Transaction details (to, amount, data)             │
│    - Includes paymaster address                          │
│    - Includes paymaster data (MNEE amount, UTXOs)        │
│    - Signs with agent's key                             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Step 2: Bundler submits to EntryPoint                   │
│    - EntryPoint validates UserOperation                 │
│    - Calls Paymaster.validatePaymasterUserOp()          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Step 3: Paymaster validates                            │
│    - Checks agent has enough MNEE                       │
│    - Validates UTXOs (if using UTXO model)              │
│    - Calculates required MNEE amount                    │
│    - Returns validation data                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Step 4: EntryPoint executes transaction                 │
│    - Calls AgentWallet.execute()                        │
│    - AgentWallet executes the actual transaction        │
│    - Pays ETH for gas                                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Step 5: Paymaster charges MNEE                         │
│    - EntryPoint calls Paymaster._postOp()               │
│    - Paymaster transfers MNEE from agent                │
│    - Transfers to treasury                              │
│    - Agent's MNEE balance decreases                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Result: Transaction executed, agent paid in MNEE        │
│    - Agent didn't need ETH                              │
│    - Paid with stable MNEE instead                      │
│    - Transaction completed successfully                 │
└─────────────────────────────────────────────────────────┘
```

**What this means:**
- Agent executes transaction without ETH
- Paymaster pays ETH gas fees
- Agent pays equivalent amount in MNEE
- Transaction completes successfully

---

## 🔍 Detailed Step-by-Step Example

### Example: Agent sends 100 tokens to recipient

**Starting State:**
- Agent wallet: `0x2B0338f7225F6201a04804564b2A02C028372e80`
- Agent has: 1 MNEE on Sepolia
- Agent wants: Send 100 tokens to `0xRecipient`

**Step 1: Agent prepares transaction**
```javascript
// Agent creates UserOperation
const userOp = {
  sender: "0x2B0338f7225F6201a04804564b2A02C028372e80", // Agent wallet
  callData: "transfer(0xRecipient, 100)",              // Transaction
  paymaster: "0x219fA137f376a70F3ac5aA2C3161672D4270e8f6", // Paymaster
  paymasterData: encodeMNEEPayment(1, utxos),         // MNEE payment data
  signature: sign(userOp)                              // Agent's signature
}
```

**Step 2: Bundler submits to EntryPoint**
```javascript
// Bundler calls EntryPoint
entryPoint.handleOps([userOp], bundlerAddress)
```

**Step 3: EntryPoint validates**
```solidity
// EntryPoint calls Paymaster
paymaster.validatePaymasterUserOp(userOp, maxCost)
  ↓
// Paymaster checks:
- Does agent have 1 MNEE? ✅
- Are UTXOs valid? ✅
- Is amount sufficient? ✅
  ↓
// Returns: validationData = 0 (valid)
```

**Step 4: EntryPoint executes**
```solidity
// EntryPoint calls AgentWallet
agentWallet.execute(recipient, 100, data)
  ↓
// AgentWallet executes:
token.transfer(recipient, 100)
  ↓
// Transaction succeeds
// Gas cost: 0.001 ETH
```

**Step 5: Paymaster charges**
```solidity
// EntryPoint calls Paymaster
paymaster._postOp(userOp, actualGasCost)
  ↓
// Paymaster:
- Calculates: 0.001 ETH = 0.001 MNEE (at 1:1 rate)
- Transfers: 0.001 MNEE from agent to treasury
- Agent balance: 1 MNEE → 0.999 MNEE
```

**Final State:**
- Recipient received: 100 tokens ✅
- Agent paid: 0.001 MNEE (not ETH) ✅
- Transaction completed: Successfully ✅

---

## 🎯 Key Concepts Explained

### 1. Agent Wallet (ERC-4337)
- **What it is**: Smart contract that can execute transactions
- **Why it matters**: Doesn't need ETH to exist, can be funded with MNEE
- **How it works**: Implements ERC-4337 BaseAccount interface

### 2. Paymaster
- **What it is**: Contract that pays ETH gas fees
- **Why it matters**: Enables gasless transactions
- **How it works**: 
  - Validates agent has MNEE
  - Pays ETH for gas
  - Charges agent in MNEE

### 3. Bridge
- **What it is**: Contract that moves MNEE between chains
- **Why it matters**: Enables Bitcoin ↔ EVM transfers
- **How it works**:
  - Locks MNEE on source chain
  - Mints/releases on target chain
  - Uses proofs for verification

### 4. UTXO Model
- **What it is**: Bitcoin-like token model
- **Why it matters**: Better privacy, prevents double-spending
- **How it works**: Tokens stored as UTXOs, must be fully spent

---

## 🔄 Complete User Journey

```
1. User has MNEE on Bitcoin
   └─> Check balance: ./mnee-x balance --chain bitcoin

2. Create agent wallet
   └─> ./mnee-x create-wallet --chain sepolia
   └─> Wallet address: 0x2B0338f7225F6201a04804564b2A02C028372e80

3. Bridge MNEE to Sepolia
   └─> ./mnee-x bridge --from-chain btc --to-chain sepolia --amount 1 --to 0x2B0338...
   └─> Wait for Bitcoin confirmation
   └─> Bridge operator submits proof
   └─> Claim on Sepolia

4. Agent wallet now has MNEE
   └─> Check balance: ./mnee-x balance --chain sepolia --address 0x2B0338...

5. Agent executes transaction
   └─> Creates UserOperation with paymaster
   └─> Bundler submits to EntryPoint
   └─> Paymaster pays ETH, charges MNEE
   └─> Transaction succeeds

6. Agent can continue operating
   └─> More transactions using MNEE
   └─> No ETH needed
   └─> Fully autonomous
```

---

## 💡 Why This Matters

### For AI Agents:
- ✅ No ETH management needed
- ✅ Stable gas payments (USD-backed)
- ✅ Simple onboarding
- ✅ Autonomous operation

### For Users:
- ✅ Easy to fund agents
- ✅ Predictable costs
- ✅ Cross-chain support
- ✅ Secure and reliable

---

## 🎬 Demo Flow Summary

**Quick 3-minute demo:**
1. Show Bitcoin balance (30s) - "Agent has MNEE on Bitcoin"
2. Create wallet (30s) - "Create smart wallet for agent"
3. Bridge setup (30s) - "Move MNEE to Sepolia"
4. Explain paymaster (1.5min) - "Agent pays with MNEE, not ETH"

**Full 10-minute demo:**
1. Problem statement (1min)
2. Architecture overview (1min)
3. Bitcoin balance check (30s)
4. Wallet creation (1min)
5. Bridge flow (2min)
6. Paymaster demo (2min)
7. Q&A (2.5min)

---

## ❓ Common Questions

**Q: Does the agent need ETH at all?**
A: No! The paymaster pays ETH. Agent only needs MNEE.

**Q: How does the agent get MNEE?**
A: Bridge from Bitcoin, or receive directly on EVM chain.

**Q: What if agent runs out of MNEE?**
A: Agent can't execute transactions. Need to bridge more MNEE.

**Q: Is this secure?**
A: Yes! Uses ERC-4337 standard, audited contracts, timelocks for critical updates.

**Q: Can this work on other chains?**
A: Yes! Deployed on Sepolia, can deploy to Ethereum, Base, Polygon, Arbitrum.

---

**This is the complete flow! Everything connects together to enable AI agents to operate autonomously using MNEE instead of ETH.** 🚀



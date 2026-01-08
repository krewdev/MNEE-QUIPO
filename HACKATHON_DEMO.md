# 🎯 QuipoWallet Hackathon Demo Guide

Complete step-by-step demo flow for the MNEE Hackathon submission.

## 🎬 Demo Overview

**What we're showing:**
- ✅ AI agents can pay for gas using MNEE (USD stablecoin) instead of ETH
- ✅ Cross-chain bridging: Bitcoin ↔ EVM (Sepolia)
- ✅ ERC-4337 Account Abstraction for gasless transactions
- ✅ UTXO model for Bitcoin-like token economics

> 📖 **Need to understand the flow?** See:
> - `SIMPLE_FLOW.md` - Simple 5-step overview
> - `FLOW_EXPLAINED.md` - Detailed technical explanation

---

## 📋 Prerequisites

### 1. Environment Setup

```bash
# Ensure .env is configured
cat .env | grep -E "MNEE_API_KEY|PRIVATE_KEY|SEPOLIA_RPC"

# Should see:
# MNEE_API_KEY=your_key
# PRIVATE_KEY=your_key
# SEPOLIA_RPC_URL=your_url
```

### 2. Deployed Contracts

Verify contracts are deployed on Sepolia:
```bash
cat DEPLOYMENT_SEPOLIA.json
```

Should have:
- `factory` - AgentWalletFactory
- `paymaster` - MNEEPaymaster
- `paymasterUTXO` - MNEEPaymasterUTXO
- `token` - MNEEToken (ERC-20)
- `utxoToken` - MNEETokenUTXO
- `bridge` - BridgeMNEE

### 3. Test Accounts

- **Bitcoin Address**: `1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5` (has 2 MNEE)
- **EVM Address**: Your deployer address (should have some ETH for gas)

---

## 🎥 Demo Flow (5-10 minutes)

### Part 1: Bitcoin MNEE Balance Check (30 seconds)

**Goal:** Show MNEE tokens on Bitcoin using official MNEE SDK

```bash
./mnee-x balance --chain bitcoin --address 1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5
```

**Expected Output:**
```
💰 Checking MNEE Balance on Bitcoin
Address: 1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5
Network: Bitcoin Mainnet (Ordinals)
API: MNEE SDK (https://docs.mnee.io)
Environment: sandbox

✅ API is healthy
✅ MNEE Balance: 2000000 (smallest unit)  # = 2 MNEE
💎 UTXOs with MNEE: 2
```

**What to say:**
> "Here we see MNEE tokens on Bitcoin. The CLI uses the official MNEE SDK to check balances. We have 2 MNEE in 2 UTXOs, which we'll bridge to Sepolia."

---

### Part 2: Create Agent Wallet (1 minute)

**Goal:** Show deterministic wallet creation using CREATE2

```bash
./mnee-x create-wallet --chain sepolia
```

**Expected Output:**
```
🏭 Creating Agent Wallet...
📋 Using factory from deployment file: 0xbA413192a4bc82C8128A7bF76Df8cE7fB5c1a389
✅ Wallet created successfully!

📍 Wallet Address: 0x...
🔗 View on Etherscan: https://sepolia.etherscan.io/address/0x...
```

**What to say:**
> "We're creating a smart wallet for an AI agent. The factory uses CREATE2, so the address is deterministic and predictable. This wallet can execute transactions without holding ETH."

---

### Part 3: Bridge Bitcoin → Sepolia (2 minutes)

**Goal:** Show cross-chain bridging from Bitcoin to EVM

```bash
./mnee-x bridge \
  --from-chain btc \
  --to-chain sepolia \
  --amount 1 \
  --to 0xYourAgentWalletAddress
```

**Expected Output:**
```
🌉 MNEE Bridge
✔ Source chain: btc
✔ Target chain: sepolia
✔ Amount (MNEE) 1
✔ Recipient address: 0x...

🌉 Bridging MNEE from Bitcoin to sepolia
From: 1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5 (Bitcoin)
To: 0x... (sepolia)
Amount: 1 MNEE

📋 Bridge Contract: 0xA3A58164255E2B7f04c7345f58dA2C35FB7949bf (sepolia)

💡 To complete the bridge:
1. Send 1 MNEE from Bitcoin address...
2. Wait for Bitcoin confirmation (6+ blocks)
3. Bridge operator submits proof
4. Claim MNEE on target chain using claimBitcoinDeposit()
```

**What to say:**
> "We're bridging 1 MNEE from Bitcoin to Sepolia. The bridge contract locks the Bitcoin UTXO and will mint equivalent MNEE on Sepolia. In production, a bridge operator would submit the Bitcoin proof, but for demo purposes, we can simulate this."

**Note:** For live demo, you may need to:
- Actually send Bitcoin transaction (or simulate)
- Have bridge operator submit proof
- Then claim on Sepolia

**Alternative (if bridge not fully operational):**
```bash
# Show the bridge contract
./mnee-x check-contract 0xA3A58164255E2B7f04c7345f58dA2C35FB7949bf --chain sepolia
```

---

### Part 4: Check EVM Balance (30 seconds)

**Goal:** Show MNEE balance on Sepolia

```bash
./mnee-x balance --chain sepolia --address 0xYourAgentWalletAddress
```

**Expected Output:**
```
💰 Checking MNEE Balance on Sepolia

Address: 0x...
Network: Sepolia Testnet
Token: MNEE (0x...)

✅ MNEE Balance: 1.0 MNEE
```

**What to say:**
> "After bridging, the agent wallet now has 1 MNEE on Sepolia. This can be used to pay for gas fees."

---

### Part 5: Gasless Transaction with Paymaster (2 minutes)

**Goal:** Show agent executing transaction without ETH, paying with MNEE

#### Option A: Using ERC-20 MNEE Paymaster

```bash
# First, approve paymaster (if needed)
# Then execute transaction with paymaster
```

#### Option B: Using UTXO MNEE Paymaster

```bash
# Show UTXO-based paymaster
# Agent uses UTXOs to pay for gas
```

**What to say:**
> "Now the AI agent can execute transactions without holding ETH. The paymaster pays ETH for gas and charges the agent in MNEE. This is the core innovation - AI agents can operate autonomously using stablecoins instead of volatile ETH."

**Demo Script:**
```javascript
// Show in code or explain:
// 1. Agent creates UserOperation
// 2. Paymaster validates agent has MNEE
// 3. EntryPoint executes transaction
// 4. Paymaster pays ETH, charges MNEE
```

---

### Part 6: Show Contract Architecture (1 minute)

**Goal:** Explain the technical architecture

```bash
# Show deployed contracts
cat DEPLOYMENT_SEPOLIA.json | jq
```

**What to say:**
> "Our architecture includes:
> - **AgentWallet**: ERC-4337 smart wallet
> - **MNEEPaymaster**: Pays ETH, charges MNEE
> - **MNEETokenUTXO**: UTXO model for Bitcoin-like economics
> - **BridgeMNEE**: Cross-chain transfers
> 
> All contracts are deployed and verified on Sepolia."

---

## 🎯 Key Points to Emphasize

### 1. **Problem Solved**
- ❌ **Before**: AI agents need ETH → complex onboarding
- ✅ **After**: AI agents use MNEE → simple, stable

### 2. **Technical Innovation**
- ERC-4337 Account Abstraction
- Cross-chain bridging (Bitcoin ↔ EVM)
- UTXO model for token economics
- Official MNEE SDK integration

### 3. **Real-World Impact**
- Enables autonomous AI agents
- Stable gas payments (USD-backed)
- Cross-chain interoperability
- Production-ready contracts

---

## 🚀 Quick Demo Script (3 minutes)

If short on time, focus on:

1. **Bitcoin Balance** (30s)
   ```bash
   ./mnee-x balance --chain bitcoin --address 1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5
   ```

  2. **Create Wallet** (30s)
     ```bash
     ./mnee-x create-wallet --chain sepolia
     ```

3. **Bridge Setup** (30s)
   ```bash
   ./mnee-x bridge --from-chain btc --to-chain sepolia --amount 1 --to 0x...
   ```

4. **Show Architecture** (1.5 min)
   - Explain contracts
   - Show deployment addresses
   - Highlight key features

---

## 📊 Demo Checklist

Before the demo:
- [ ] `.env` configured with `MNEE_API_KEY`
- [ ] Contracts deployed on Sepolia
- [ ] `DEPLOYMENT_SEPOLIA.json` has all addresses
- [ ] CLI built (`npm run build` in `cli/`)
- [ ] Test Bitcoin address has MNEE balance
- [ ] Test EVM address has some ETH for gas

During demo:
- [ ] Show Bitcoin balance check
- [ ] Create agent wallet
- [ ] Explain bridge flow
- [ ] Show paymaster functionality
- [ ] Highlight key innovations

---

## 🎬 Presentation Tips

1. **Start with the problem**: "AI agents can't operate autonomously because they need ETH"
2. **Show the solution**: Live demo of balance check and wallet creation
3. **Explain the tech**: ERC-4337, bridging, UTXO model
4. **Highlight impact**: Real-world use cases for autonomous agents

---

## 🔗 Useful Links

- **Etherscan**: https://sepolia.etherscan.io
- **MNEE Docs**: https://docs.mnee.io
- **Contract Addresses**: `DEPLOYMENT_SEPOLIA.json`
- **CLI Help**: `./mnee-x --help`

---

## 💡 Backup Plans

If something doesn't work:

1. **API Issues**: Show code/architecture instead
2. **Bridge Not Ready**: Explain the flow, show contracts
3. **Network Issues**: Use pre-recorded video
4. **Contract Issues**: Show verified contracts on Etherscan

---

**Good luck with your hackathon demo! 🚀**


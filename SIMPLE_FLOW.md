# 🎯 Simple Flow - 5 Steps

## The Complete Flow in Simple Terms

### Step 1: Agent Has MNEE on Bitcoin
```
Bitcoin Address: 1Hx6egm...
Balance: 2 MNEE (as UTXOs)
```
**Command:** `./mnee-x balance --chain bitcoin`

---

### Step 2: Create Smart Wallet
```
Factory creates smart contract wallet
Address: 0x2B0338... (deterministic)
```
**Command:** `./mnee-x create-wallet --chain sepolia`

**What happens:**
- Factory contract creates new wallet
- Wallet is a smart contract (not regular account)
- Can execute transactions without ETH

---

### Step 3: Bridge MNEE to Sepolia
```
Bitcoin: 1 MNEE locked
         ↓
Bridge: Submits proof
         ↓
Sepolia: 1 MNEE minted to wallet
```
**Command:** `./mnee-x bridge --from-chain btc --to-chain sepolia --amount 1`

**What happens:**
1. Send 1 MNEE from Bitcoin to bridge
2. Wait for Bitcoin confirmation
3. Bridge operator submits proof
4. Claim 1 MNEE on Sepolia
5. Wallet now has 1 MNEE

---

### Step 4: Agent Executes Transaction
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
**What happens:**
1. Agent creates transaction request
2. Includes paymaster (to pay gas)
3. Bundler submits to blockchain
4. Paymaster pays ETH for gas
5. Agent pays MNEE to paymaster
6. Transaction executes successfully

---

### Step 5: Agent Can Continue
```
Agent has: 0.999 MNEE remaining
Can execute: More transactions
No ETH needed: Ever!
```
**What happens:**
- Agent can keep executing transactions
- Each transaction costs MNEE (not ETH)
- Agent stays autonomous
- No ETH management needed

---

## Visual Flow

```
┌─────────────┐
│ Bitcoin     │
│ 2 MNEE      │
└──────┬──────┘
       │ Bridge
       ↓
┌─────────────┐      ┌──────────────┐
│ Sepolia     │      │ Agent Wallet │
│ 1 MNEE      │─────▶│ 0x2B0338... │
└─────────────┘      └──────┬───────┘
                            │
                            │ Execute Transaction
                            ↓
                    ┌──────────────┐
                    │ Paymaster    │
                    │ Pays ETH     │
                    │ Charges MNEE │
                    └──────────────┘
                            │
                            ↓
                    ✅ Transaction Success
                    Agent paid 0.001 MNEE
                    (not ETH!)
```

---

## Key Points

1. **Agent never needs ETH** - Paymaster handles it
2. **Agent pays with MNEE** - Stable, predictable
3. **Bridge enables cross-chain** - Bitcoin ↔ EVM
4. **Fully autonomous** - No manual ETH management

---

## Commands to Run

```bash
# 1. Check Bitcoin balance
./mnee-x balance --chain bitcoin --address 1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5

# 2. Create wallet
./mnee-x create-wallet --chain sepolia

# 3. Bridge to Sepolia
./mnee-x bridge --from-chain btc --to-chain sepolia --amount 1 --to 0xYourWallet

# 4. Check Sepolia balance
./mnee-x balance --chain sepolia --address 0xYourWallet

# 5. (Transaction execution happens via code/contracts)
```

---

**That's it! Simple 5-step flow that enables AI agents to operate autonomously.** 🚀



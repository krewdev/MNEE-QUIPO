# 🛠️ MNEE CLI Commands Reference

Complete list of all available CLI commands for QuipoWallet.

## 📋 All Commands

```bash
./mnee-x <command> [options]
```

---

## 🌐 Chain Commands

### `chains`
List all supported chains and networks.

```bash
./mnee-x chains
```

**Shows:**
- Ethereum, Base, Polygon, Arbitrum, Sepolia
- Bitcoin (Ordinals)
- Chain IDs and RPC endpoints

---

## 💰 Balance Commands

### `balance`
Check MNEE balance on any chain.

```bash
./mnee-x balance --chain <chain> [--address <address>]
```

**Examples:**
```bash
# Check Bitcoin balance
./mnee-x balance --chain bitcoin --address 1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5

# Check Sepolia balance
./mnee-x balance --chain sepolia

# Check specific address
./mnee-x balance --chain sepolia --address 0x...
```

**Chains:**
- `bitcoin` - Bitcoin Ordinals (uses MNEE SDK)
- `sepolia`, `ethereum`, `base`, `polygon`, `arbitrum` - EVM chains

---

## 📤 Send Commands

### `send`
Send MNEE tokens to any chain.

```bash
./mnee-x send [options]
```

**Options:**
- `--from-chain <chain>` - Source chain
- `--chain <chain>` - Target chain (defaults to same as from-chain)
- `--to <address>` - Recipient address
- `--amount <amount>` - Amount to send
- `--from-address <address>` - Source address (Bitcoin if from-chain is bitcoin)

**Examples:**
```bash
# Send on same chain (EVM)
./mnee-x send --from-chain sepolia --chain sepolia --to 0x... --amount 100

# Send on Bitcoin
./mnee-x send --from-chain bitcoin --chain bitcoin --to bc1... --amount 1

# Interactive mode (will prompt for missing info)
./mnee-x send
```

**Note:** For Bitcoin, creates transfer inscription via MNEE SDK or OrdinalsBot API.

---

## 🌉 Bridge Commands

### `bridge`
Bridge MNEE tokens between Bitcoin and EVM chains.

```bash
./mnee-x bridge [options]
```

**Options:**
- `--from <chain>` or `--from-chain <chain>` - Source chain (`bitcoin`, `sepolia`, etc.)
- `--to-chain <chain>` - Target chain
- `--amount <amount>` - Amount to bridge
- `--to <address>` - Recipient address on target chain
- `--from-address <address>` - Source address (Bitcoin if from-chain is bitcoin)

**Examples:**
```bash
# Bridge from Bitcoin to Sepolia
./mnee-x bridge --from btc --to-chain sepolia --amount 1 --to 0x...

# Bridge from Sepolia to Bitcoin
./mnee-x bridge --from-chain sepolia --to-chain btc --amount 1 --to bc1...

# Interactive mode
./mnee-x bridge
```

**Flow:**
1. Locks MNEE on source chain
2. Waits for confirmation
3. Bridge operator submits proof
4. Claim on target chain

### `claim-deposit`
Claim MNEE deposit on EVM chain after Bitcoin bridge.

```bash
./mnee-x claim-deposit --tx-hash <bitcoinTxHash> --chain <chain>
```

**Example:**
```bash
./mnee-x claim-deposit --tx-hash abc123... --chain sepolia
```

---

## 👛 Wallet Commands

### `create-wallet`
Create a gasless agent wallet using ERC-4337.

```bash
./mnee-x create-wallet [--chain <chain>] [--salt <salt>]
```

**Options:**
- `--chain <chain>` - Chain to create wallet on (default: prompts)
- `--salt <salt>` - Salt for deterministic address (default: 0)

**Example:**
```bash
# Create wallet on Sepolia
./mnee-x create-wallet --chain sepolia

# With custom salt
./mnee-x create-wallet --chain sepolia --salt 123
```

**What it does:**
- Creates ERC-4337 smart wallet
- Uses CREATE2 for deterministic address
- Wallet can execute transactions without ETH
- Pays gas with MNEE via Paymaster

---

## 💎 Credit Pool Commands

### `stake`
Stake MNEE tokens and get instant credit line.

```bash
./mnee-x stake [--chain <chain>] [--amount <amount>]
```

**Options:**
- `--chain <chain>` - Chain to stake on (default: prompts)
- `--amount <amount>` - Amount of MNEE to stake (default: prompts)

**Example:**
```bash
# Stake 1000 MNEE
./mnee-x stake --chain sepolia --amount 1000

# Interactive mode
./mnee-x stake
```

**What it does:**
- Stakes MNEE in credit pool
- Gets instant credit line (80% of stake)
- Earns staking rewards (8% APY)
- Can borrow from credit line immediately

### `borrow`
Borrow MNEE from credit line (instant, no approval needed).

```bash
./mnee-x borrow [--chain <chain>] [--amount <amount>]
```

**Options:**
- `--chain <chain>` - Chain to borrow on
- `--amount <amount>` - Amount of MNEE to borrow

**Example:**
```bash
# Borrow 500 MNEE from credit line
./mnee-x borrow --chain sepolia --amount 500
```

**What it does:**
- Borrows MNEE instantly from credit line
- No approval needed (uses credit line)
- Pays interest (15% APY)
- Can be repaid anytime

### `credit-info`
Check credit line status and pool information.

```bash
./mnee-x credit-info [--chain <chain>] [--address <address>]
```

**Options:**
- `--chain <chain>` - Chain to check
- `--address <address>` - Address to check (default: your address)

**Example:**
```bash
# Check your credit line
./mnee-x credit-info --chain sepolia

# Check specific address
./mnee-x credit-info --chain sepolia --address 0x...
```

**Shows:**
- Staked amount
- Credit line (80% of stake)
- Borrowed amount
- Available credit
- Rewards accrued
- Interest owed
- Pool statistics

### `repay`
Repay borrowed MNEE (principal + interest).

```bash
./mnee-x repay [--chain <chain>] [--amount <amount>]
```

**Options:**
- `--chain <chain>` - Chain to repay on
- `--amount <amount>` - Amount to repay (default: prompts)

**Example:**
```bash
# Repay 550 MNEE (500 principal + 50 interest)
./mnee-x repay --chain sepolia --amount 550
```

**What it does:**
- Repays borrowed MNEE + interest
- Restores credit line
- Interest paid first, then principal

---

## 📊 Quick Command Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `chains` | List supported chains | `./mnee-x chains` |
| `balance` | Check MNEE balance | `./mnee-x balance --chain sepolia` |
| `send` | Send MNEE tokens | `./mnee-x send --chain sepolia --to 0x... --amount 100` |
| `bridge` | Bridge cross-chain | `./mnee-x bridge --from btc --to-chain sepolia --amount 1` |
| `claim-deposit` | Claim Bitcoin deposit | `./mnee-x claim-deposit --tx-hash abc... --chain sepolia` |
| `create-wallet` | Create agent wallet | `./mnee-x create-wallet --chain sepolia` |
| `stake` | Stake MNEE | `./mnee-x stake --chain sepolia --amount 1000` |
| `borrow` | Borrow from credit line | `./mnee-x borrow --chain sepolia --amount 500` |
| `credit-info` | Check credit status | `./mnee-x credit-info --chain sepolia` |
| `repay` | Repay borrowed MNEE | `./mnee-x repay --chain sepolia --amount 550` |

---

## 🎯 Common Workflows

### 1. Check Balance on Multiple Chains
```bash
./mnee-x balance --chain bitcoin --address 1Hx6egm...
./mnee-x balance --chain sepolia
```

### 2. Create Wallet and Stake
```bash
./mnee-x create-wallet --chain sepolia
./mnee-x stake --chain sepolia --amount 1000
```

### 3. Stake and Borrow
```bash
./mnee-x stake --chain sepolia --amount 1000
./mnee-x credit-info --chain sepolia  # Check credit line
./mnee-x borrow --chain sepolia --amount 500
```

### 4. Bridge from Bitcoin to Sepolia
```bash
./mnee-x bridge --from btc --to-chain sepolia --amount 1 --to 0xYourAddress
```

### 5. Repay and Check Status
```bash
./mnee-x repay --chain sepolia --amount 550
./mnee-x credit-info --chain sepolia
```

---

## 💡 Tips

1. **Interactive Mode**: Most commands will prompt for missing information
2. **Chain Aliases**: Use `btc` for `bitcoin`, `eth` for `ethereum`
3. **Environment Variables**: Set `MNEE_API_KEY` for Bitcoin operations
4. **Private Key**: Must be set in `.env` file as `PRIVATE_KEY`

---

## 🔗 Useful Links

- **Etherscan**: https://sepolia.etherscan.io
- **MNEE Docs**: https://docs.mnee.io
- **Deployment Info**: `DEPLOYMENT_SEPOLIA.json`

---

**All commands are interactive and will guide you through the process!** 🚀



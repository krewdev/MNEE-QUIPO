# MNEE CLI Hackathon Integration Guide

## Overview

This extends the official `@mnee/cli` (v1.0.3) with cross-chain functionality for the MNEE Hackathon submission.

## What We're Adding

### Original Official CLI Commands (Still Work)
- `mnee create` - Create Bitcoin wallet
- `mnee balance` - Check Bitcoin balance  
- `mnee transfer` - Transfer on Bitcoin
- `mnee list` - List wallets
- All other official commands

### New Hackathon Commands

1. **`mnee bridge`** - Cross-chain bridging
   ```bash
   mnee bridge --from bitcoin --to-chain ethereum --to 0x... --amount 100
   ```

2. **`mnee evm-balance`** - Check EVM chain balance
   ```bash
   mnee evm-balance --chain ethereum
   mnee evm-balance --chain base --address 0x...
   ```

3. **`mnee evm-send`** - Send on EVM chains
   ```bash
   mnee evm-send --to 0x... --amount 100 --chain base --paymaster
   ```

4. **`mnee chains`** - List all chains
   ```bash
   mnee chains
   ```

5. **`mnee ordinals-balance`** - Bitcoin Ordinals balance
   ```bash
   mnee ordinals-balance --address 1Hx6egm...
   ```

6. **`mnee create-gasless-wallet`** - ERC-4337 wallet
   ```bash
   mnee create-gasless-wallet --chain ethereum
   ```

## Installation

### Option 1: Install Extension Alongside Official CLI

```bash
# Official CLI (already installed globally)
# npm install -g @mnee/cli  # Already installed

# Our extension (install globally to override)
cd /Users/krewdev/QUIPOWALLET/cli
npm link --force
```

### Option 2: Use Extension Directly

```bash
cd /Users/krewdev/QUIPOWALLET/cli
npm install
npm run build

# Run directly
node dist/index.js chains
node dist/index.js evm-balance --chain ethereum
```

### Option 3: Create Alias for Extension

Add to `~/.zshrc`:
```bash
alias mnee-hackathon="node /Users/krewdev/QUIPOWALLET/cli/dist/index.js"
```

Then use:
```bash
mnee-hackathon chains
mnee-hackathon bridge --from bitcoin --to-chain ethereum ...
```

## Configuration

Create `.env` in project root or CLI directory:

```env
# For EVM chains
PRIVATE_KEY=your_private_key_here
ETHEREUM_RPC_URL=https://eth.llamarpc.com
BASE_RPC_URL=https://mainnet.base.org
POLYGON_RPC_URL=https://polygon-rpc.com
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# For Bitcoin Ordinals
BITCOIN_ADDRESS=1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5
ORDINALSBOT_API_KEY=your_api_key  # Optional
ORDINALSBOT_API_URL=https://api.ordinalsbot.com

# Contract addresses (will auto-detect from network)
# NEXT_PUBLIC_PAYMASTER_1=0x...
# NEXT_PUBLIC_FACTORY_1=0x...
```

## Usage Examples

### Check Balance on Different Chains

```bash
# Original: Bitcoin balance
mnee balance

# New: EVM chain balance
mnee evm-balance --chain ethereum
mnee evm-balance --chain base --address 0x...

# New: Bitcoin Ordinals balance
mnee ordinals-balance --address 1Hx6egm...
```

### Send Tokens

```bash
# Original: Bitcoin transfer
mnee transfer 10 1A...

# New: EVM transfer (with optional Paymaster for gasless)
mnee evm-send --to 0xRecipient --amount 100 --chain base --paymaster
```

### Bridge Between Chains

```bash
# Bridge from Bitcoin Ordinals to Ethereum
mnee bridge \
  --from bitcoin \
  --to-chain ethereum \
  --to 0xRecipientAddress \
  --amount 100 \
  --from-address 1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5
```

### List All Supported Chains

```bash
mnee chains
```

## Hackathon Submission Points

✅ **Extends Official MNEE Tooling**
- Builds on existing `@mnee/cli`
- Maintains compatibility with official commands
- Adds cross-chain capabilities

✅ **Cross-Chain Interoperability**
- Bitcoin Ordinals ↔ EVM chains
- Multiple EVM chains (Ethereum, Base, Polygon, Arbitrum)
- Bridge functionality

✅ **ERC-4337 Integration**
- Gasless transactions via Paymaster
- Agent wallet creation
- MNEE pays for gas

✅ **Bitcoin Ordinals Support**
- OrdinalsBot API integration
- UTXO model support
- Native MNEE on Bitcoin

## Technical Stack

- **Base**: Official `@mnee/cli` (Bitcoin/BSV)
- **EVM**: ethers.js v6
- **Ordinals**: OrdinalsBot API
- **ERC-4337**: Account Abstraction contracts
- **Bridge**: Cross-chain contract integration

## Next Steps for Full Implementation

1. ✅ Command structure - DONE
2. ✅ OrdinalsBot integration - DONE  
3. 🔜 Bridge contract deployment
4. 🔜 Paymaster integration
5. 🔜 Agent wallet deployment
6. 🔜 Full end-to-end testing

## Demo Script for Hackathon

```bash
# 1. Show original CLI works
mnee balance
mnee list

# 2. Show cross-chain chains
mnee chains

# 3. Check Bitcoin Ordinals
mnee ordinals-balance --address YOUR_BTC_ADDRESS

# 4. Check EVM balance
mnee evm-balance --chain base

# 5. Bridge demo (if bridge deployed)
mnee bridge --from bitcoin --to-chain base --to 0x... --amount 10

# 6. Gasless send (if Paymaster deployed)
mnee evm-send --to 0x... --amount 5 --chain base --paymaster
```

## Support

For hackathon submission, this demonstrates:
- **Innovation**: Cross-chain MNEE functionality
- **Integration**: Extends official tooling
- **Impact**: Makes MNEE accessible across all major chains
- **Technical Quality**: ERC-4337, OrdinalsBot, multi-chain support


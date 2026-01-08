# MNEE CLI

Cross-chain MNEE token transfer tool. Send MNEE tokens to any supported chain starting with Ethereum.

## Installation

```bash
cd cli
npm install
npm run build
```

Or install globally:

```bash
npm install -g .
```

## Usage

### Send MNEE Tokens

Send MNEE to any address on any supported chain:

```bash
# Send to Ethereum
mnee send --to 0x123... --amount 100 --chain ethereum

# Send to Base
mnee send --to 0x123... --amount 100 --chain base

# Send to Polygon
mnee send --to 0x123... --amount 100 --chain polygon

# Send to Arbitrum
mnee send --to 0x123... --amount 100 --chain arbitrum
```

### Check Balance

Check your MNEE balance on any chain:

```bash
# Check on Ethereum
mnee balance --chain ethereum

# Check on Base
mnee balance --chain base

# Check specific address
mnee balance --chain ethereum --address 0x123...
```

### List Supported Chains

```bash
mnee chains
```

### Create Gasless Wallet

Create a QuipoWallet agent wallet on any chain:

```bash
# Create on Ethereum
mnee create-wallet --chain ethereum

# Create on Base with custom salt
mnee create-wallet --chain base --salt 1
```

### Bridge Tokens (Bitcoin ↔ EVM)

```bash
# Bridge from Bitcoin Ordinals to Ethereum
mnee bridge \
  --from bitcoin \
  --to-chain ethereum \
  --to 0x123... \
  --amount 100 \
  --from-address 1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5

# Bridge from Ethereum to Bitcoin
mnee bridge \
  --from ethereum \
  --to-chain bitcoin \
  --to 1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5 \
  --amount 100 \
  --from-address 0xYourEVMAddress
```

**Important:** 
- Bitcoin addresses start with `1`, `bc1`, or `3`
- EVM addresses start with `0x`
- Uses UTXO model on Bitcoin side
- Requires bridge protocol integration

## Configuration

Create a `.env` file in the CLI directory:

```env
PRIVATE_KEY=your_private_key_here
ETHEREUM_RPC_URL=https://eth.llamarpc.com
BASE_RPC_URL=https://mainnet.base.org
POLYGON_RPC_URL=https://polygon-rpc.com
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# Optional: Chain-specific factory addresses
FACTORY_ADDRESS_1=0x... # Ethereum
FACTORY_ADDRESS_8453=0x... # Base
FACTORY_ADDRESS_137=0x... # Polygon
FACTORY_ADDRESS_42161=0x... # Arbitrum
```

## Examples

### Send 100 MNEE to Ethereum

```bash
# Note: Address must be valid Ethereum address (0x...)
# If you have a different format address, convert it first
mnee send --to 0x1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5 --amount 100 --chain ethereum
```

### Send to any chain

```bash
# Send to Ethereum
mnee send --to 0x1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5 --amount 100 --chain ethereum

# Send to Base
mnee send --to 0x1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5 --amount 100 --chain base

# Send to Polygon
mnee send --to 0x1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5 --amount 100 --chain polygon

# Send to Arbitrum
mnee send --to 0x1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5 --amount 100 --chain arbitrum
```

### Check balance on all chains

```bash
mnee balance --chain ethereum
mnee balance --chain base
mnee balance --chain polygon
mnee balance --chain arbitrum
```

## Supported Chains

- ✅ **Bitcoin Mainnet** - MNEE native on Bitcoin Ordinals (UTXO model)
- ✅ Ethereum Mainnet
- ✅ Base
- ✅ Polygon
- ✅ Arbitrum One
- ⚠️ Sepolia (testnet)
- ⚠️ Base Sepolia (testnet)

**Note:** MNEE originates on Bitcoin Ordinals. Use `bridge` command to move between Bitcoin and EVM chains.

## Features

- ✅ Send MNEE to any supported chain
- ✅ Check balance on any chain
- ✅ Create gasless wallets
- ✅ Multi-chain support
- 🔜 Cross-chain bridging
- 🔜 Paymaster integration

## Requirements

- Node.js 18+
- Private key in `.env` file
- RPC endpoints configured


# MNEE CLI Quick Start

## Installation

```bash
cd cli
npm install
npm run build
```

## Send MNEE to Any Chain

### Example: Send to Your Address

```bash
# Send 100 MNEE to Ethereum
node dist/index.js send --to 0x1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5 --amount 100 --chain ethereum

# Send 50 MNEE to Base
node dist/index.js send --to 0x1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5 --amount 50 --chain base

# Send 75 MNEE to Polygon
node dist/index.js send --to 0x1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5 --amount 75 --chain polygon

# Send 200 MNEE to Arbitrum
node dist/index.js send --to 0x1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5 --amount 200 --chain arbitrum
```

## Available Commands

```bash
# Send MNEE tokens
node dist/index.js send --to <address> --amount <amount> --chain <chain>

# Check balance
node dist/index.js balance --chain <chain>

# List supported chains
node dist/index.js chains

# Create gasless wallet
node dist/index.js create-wallet --chain <chain>
```

## Configuration

Make sure your `.env` file has:

```env
PRIVATE_KEY=your_private_key
ETHEREUM_RPC_URL=https://eth.llamarpc.com
BASE_RPC_URL=https://mainnet.base.org
POLYGON_RPC_URL=https://polygon-rpc.com
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
```

## Address Format

**Important:** Addresses must be valid Ethereum format (0x followed by 40 hex characters).

If your address starts with `1` (Bitcoin format), you'll need to:
1. Convert it to Ethereum format, or
2. Use a bridge that handles address conversion

## Supported Chains

- ✅ Ethereum (ethereum)
- ✅ Base (base)
- ✅ Polygon (polygon)
- ✅ Arbitrum (arbitrum)

## Examples with Your Address

```bash
# Assuming 0x1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5 is valid Ethereum address

# Send 100 MNEE on Ethereum
node dist/index.js send --to 0x1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5 --amount 100 --chain ethereum

# Send to Base
node dist/index.js send --to 0x1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5 --amount 100 --chain base

# Check balance on Ethereum
node dist/index.js balance --chain ethereum --address 0x1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5
```


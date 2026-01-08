# Quick Start - No Installation Required!

## ✅ Solution: Run Directly (No Permissions Needed)

Since `npm link` requires admin permissions, you can run the CLI directly without installation.

### Method 1: Run from CLI Directory

```bash
cd /Users/krewdev/QUIPOWALLET/cli
./mnee-x chains
./mnee-x evm-balance --chain ethereum
./mnee-x bridge --from bitcoin --to-chain base --to 0x... --amount 100
```

### Method 2: Add to PATH (Recommended)

Add this to your `~/.zshrc`:

```bash
# MNEE CLI Extension
export PATH="$PATH:/Users/krewdev/QUIPOWALLET/cli"
```

Then reload:
```bash
source ~/.zshrc
```

Now use from anywhere:
```bash
mnee-x chains
mnee-x evm-balance --chain base
```

### Method 3: Create Alias

Add to `~/.zshrc`:

```bash
alias mnee-x="node /Users/krewdev/QUIPOWALLET/cli/dist/index.js"
```

Then:
```bash
source ~/.zshrc
mnee-x chains
```

## All Available Commands

```bash
# List all chains
mnee-x chains

# Check balance on EVM chains
mnee-x evm-balance --chain ethereum
mnee-x evm-balance --chain base --address 0x...

# Send on EVM chains (with optional Paymaster)
mnee-x evm-send --to 0x... --amount 100 --chain base --paymaster

# Bridge from Bitcoin to EVM
mnee-x bridge --from bitcoin --to-chain ethereum --to 0x... --amount 100 --from-address 1Hx6egm...

# Check Bitcoin Ordinals balance
mnee-x ordinals-balance --address 1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5

# Create gasless wallet
mnee-x create-gasless-wallet --chain ethereum
```

## Original Official CLI Still Works

```bash
# Original commands (from @mnee/cli)
mnee balance      # Bitcoin balance
mnee transfer     # Bitcoin transfer
mnee create       # Create wallet
mnee list         # List wallets
```

## Demo for Hackathon

```bash
# Show both CLIs working together
echo "=== Official MNEE CLI ==="
mnee balance
mnee list

echo "=== MNEE Extension (Hackathon) ==="
cd /Users/krewdev/QUIPOWALLET/cli
./mnee-x chains
./mnee-x evm-balance --chain ethereum
./mnee-x ordinals-balance --address YOUR_BTC_ADDRESS
```

## Configuration

Make sure you have `.env` file with:

```env
PRIVATE_KEY=your_private_key
ETHEREUM_RPC_URL=https://eth.llamarpc.com
BASE_RPC_URL=https://mainnet.base.org
BITCOIN_ADDRESS=1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5
ORDINALSBOT_API_KEY=your_key  # Optional
```

That's it! No installation needed. 🚀


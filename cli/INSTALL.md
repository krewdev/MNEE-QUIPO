# Installation Guide - MNEE CLI Extension

## Permission Issue Solution

The official `@mnee/cli` is installed in a system directory (`/opt/homebrew/lib/node_modules/`) which requires admin permissions. Instead of replacing it, we'll install our extension with a different command name.

## Installation Options

### Option 1: Install as `mnee-x` (Recommended - No Conflicts)

```bash
cd /Users/krewdev/QUIPOWALLET/cli
npm link
```

This installs the extension as `mnee-x` and `mnee-hackathon` commands, which won't conflict with the official `mnee` CLI.

**Usage:**
```bash
# Original official CLI (still works)
mnee balance
mnee transfer 10 1A...

# Our extension (new commands)
mnee-x chains
mnee-x evm-balance --chain ethereum
mnee-x bridge --from bitcoin --to-chain base --to 0x... --amount 100
mnee-hackathon ordinals-balance --address 1Hx6egm...
```

### Option 2: Use Directly (No Installation)

```bash
cd /Users/krewdev/QUIPOWALLET/cli
npm install
npm run build

# Run directly
node dist/index.js chains
node dist/index.js evm-balance --chain ethereum
```

### Option 3: Create Alias (Quick Access)

Add to `~/.zshrc`:
```bash
alias mnee-x="node /Users/krewdev/QUIPOWALLET/cli/dist/index.js"
```

Then reload:
```bash
source ~/.zshrc
```

Now use:
```bash
mnee-x chains
mnee-x evm-balance --chain base
```

### Option 4: Use with Sudo (Not Recommended)

If you really want to replace the global `mnee` command:

```bash
cd /Users/krewdev/QUIPOWALLET/cli
sudo npm link --force
```

⚠️ **Warning**: This replaces the official CLI. Use with caution.

## Recommended Approach for Hackathon

**Use `mnee-x` command** - This way:
- ✅ No permission issues
- ✅ Official CLI still works
- ✅ Clear distinction between official and extension
- ✅ Easy to demonstrate both

## Commands Available

### Original Official CLI (`mnee`)
```bash
mnee balance          # Bitcoin balance
mnee transfer         # Bitcoin transfer
mnee create           # Create wallet
mnee list             # List wallets
```

### Extension CLI (`mnee-x` or `mnee-hackathon`)
```bash
mnee-x chains                    # List all chains
mnee-x evm-balance --chain base  # EVM balance
mnee-x evm-send --to 0x... --amount 100 --chain base --paymaster
mnee-x bridge --from bitcoin --to-chain ethereum --to 0x... --amount 100
mnee-x ordinals-balance --address 1Hx6egm...
mnee-x create-gasless-wallet --chain ethereum
```

## Demo Script

```bash
# Show original CLI
echo "=== Official MNEE CLI ==="
mnee balance
mnee list

# Show extension
echo "=== MNEE Extension (Hackathon) ==="
mnee-x chains
mnee-x evm-balance --chain ethereum
mnee-x ordinals-balance --address YOUR_BTC_ADDRESS
```

## Troubleshooting

### If `mnee-x` command not found:
```bash
# Check if linked
npm list -g | grep mnee

# Re-link
cd /Users/krewdev/QUIPOWALLET/cli
npm link
```

### If permission errors persist:
Use Option 2 (run directly) or Option 3 (alias) instead.


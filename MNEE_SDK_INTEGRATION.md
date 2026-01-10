# MNEE SDK Integration

## ✅ Updated: Now Using Official MNEE SDK!

The CLI now uses the **official MNEE SDK** (`@mnee/ts-sdk`) as the primary method for Bitcoin operations, with OrdinalsBot as a fallback.

## Why Use MNEE SDK?

1. **Official Support** - Direct from MNEE team
2. **Better Integration** - Designed specifically for MNEE tokens
3. **Native UTXO Support** - Built-in `getEnoughUtxos()` and `getUtxos()`
4. **Reliable** - Official API with better uptime
5. **Future-Proof** - Will get updates and new features first

## Setup

### 1. Get MNEE API Key

1. Visit: **https://docs.mnee.io**
2. Sign up for MNEE Developer account
3. Navigate to API settings
4. Generate API key

### 2. Add to `.env`

In your project root:

```env
# Preferred: MNEE SDK
MNEE_API_KEY=your_mnee_api_key_here

# Fallback: OrdinalsBot (optional)
ORDINALSBOT_API_KEY=your_ordinalsbot_key_here
```

### 3. Environment Selection

```env
# Use production or sandbox
MNEE_ENV=production  # or "sandbox" for testing
```

## How It Works

The CLI automatically:
1. **Tries MNEE SDK first** - If `MNEE_API_KEY` is set
2. **Falls back to OrdinalsBot** - If MNEE SDK fails or key not set
3. **Shows clear errors** - Tells you which API needs a key

## Features

### Balance Checking
```bash
./mnee-x balance --chain bitcoin --address 1Hx6egm...
```
- Uses `mnee.balance(address)` from MNEE SDK
- Returns balance in atomic units

### Getting UTXOs
```bash
# Internal use - automatically called
```
- Uses `mnee.getUtxos(address)` or `mnee.getEnoughUtxos(address, amount)`
- Returns UTXO data in MNEE format

### Sending MNEE
```bash
./mnee-x send --from-chain bitcoin --chain bitcoin --to <address> --amount 1
```
- Uses `mnee.transfer([{address, amount}], wif)` from MNEE SDK
- Requires WIF (Wallet Import Format) private key
- Falls back to OrdinalsBot if WIF not available

## API Comparison

| Feature | MNEE SDK | OrdinalsBot |
|---------|----------|-------------|
| **Balance** | ✅ `balance()` | ✅ `getMNEEBalance()` |
| **UTXOs** | ✅ `getUtxos()` | ✅ `getUTXOs()` |
| **Transfer** | ✅ `transfer()` (requires WIF) | ✅ `createTransfer()` (API-based) |
| **Official** | ✅ Yes | ❌ Third-party |
| **MNEE-Specific** | ✅ Yes | ⚠️ Generic Ordinals |

## Migration Notes

### For Users
- **No changes needed** - CLI automatically uses MNEE SDK if key is set
- **Better experience** - More reliable, official API
- **Same commands** - All CLI commands work the same

### For Developers
- MNEE SDK is now the primary method
- OrdinalsBot remains as fallback
- Check `useMNEE` flag in `BitcoinMNEE` class

## Troubleshooting

### "MNEE SDK initialization failed"
- Check `MNEE_API_KEY` is set correctly
- Verify API key is active
- Check `MNEE_ENV` is set (production/sandbox)

### "Falling back to OrdinalsBot"
- MNEE SDK failed, using OrdinalsBot
- Check error message for details
- Ensure `ORDINALSBOT_API_KEY` is set if needed

### "403 Forbidden"
- API key is invalid or expired
- Get new key from https://docs.mnee.io
- Check key has correct permissions

## Benefits

✅ **Official Support** - Direct from MNEE team  
✅ **Better Reliability** - Official API infrastructure  
✅ **Native Features** - Built for MNEE tokens  
✅ **Future Updates** - Get new features first  
✅ **Better Documentation** - Official docs at docs.mnee.io  

---

**Get your MNEE API key:** https://docs.mnee.io



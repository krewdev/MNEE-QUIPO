# How to Get API Keys for Bitcoin Operations

## ⚠️ Update: Now Using MNEE SDK (Preferred)

The CLI now uses the **official MNEE SDK** as the primary method. You can still use OrdinalsBot as a fallback.

## Option 1: MNEE SDK (Recommended) ✅

### Quick Steps

1. Visit: **https://docs.mnee.io**
2. Sign up / Log in
3. Get API key from Developer Portal
4. Add to `.env` file:

```env
MNEE_API_KEY=your_mnee_api_key_here
```

### Benefits
- ✅ Official API from MNEE team
- ✅ Better reliability
- ✅ Native MNEE token support
- ✅ Built-in UTXO methods

---

## Option 2: OrdinalsBot API (Fallback)

# How to Get OrdinalsBot API Key

## Why You Need It

The CLI needs an OrdinalsBot API key to:
- ✅ Create Bitcoin transactions (send MNEE)
- ✅ Check balances reliably
- ✅ Access higher rate limits
- ✅ Better reliability

## Quick Steps

### 1. Visit OrdinalsBot
Go to: **https://ordinalsbot.com**

### 2. Sign Up / Log In
- Create an account (if you don't have one)
- Or log in with existing account

### 3. Get API Key
- Navigate to **API Settings** or **Developer** section
- Generate a new API key
- Copy the key

### 4. Add to `.env` File

In your project root (not in `cli/` folder):

```env
ORDINALSBOT_API_KEY=your_api_key_here
```

### 5. Restart CLI

The CLI will automatically load the API key from `.env`

## Verify It Works

```bash
# Check balance (should work now)
./mnee-x balance --chain bitcoin --address 1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5

# Send MNEE (should work now)
./mnee-x send --from-chain bitcoin --chain bitcoin --to <address> --amount 1
```

## Troubleshooting

### Still Getting 403 Error?
- ✅ Verify API key is correct (no extra spaces)
- ✅ Check `.env` file is in project root
- ✅ Restart terminal/CLI after adding key
- ✅ Verify API key is active on OrdinalsBot dashboard

### API Key Not Working?
- Check OrdinalsBot account status
- Verify API key hasn't expired
- Check rate limits haven't been exceeded
- Contact OrdinalsBot support if needed

## Alternative: Use Bitcoin Wallet

If you can't get API key immediately, you can:
1. Use a Bitcoin wallet with Ordinals support (Unisat, Xverse)
2. Send MNEE manually from wallet
3. Get transaction hash
4. Use CLI to claim on Sepolia after bridge operator submits proof

---

**Get your API key now:** https://ordinalsbot.com



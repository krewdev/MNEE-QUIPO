# ⚠️ Bitcoin Transfer Note - OrdinalsBot API Limitations

## Current Status

The OrdinalsBot API is returning HTTP 500 errors when trying to create BRC-20 transfer inscriptions. The error suggests the API might:
1. Expect a different payload format
2. Have server-side issues
3. Require different authentication
4. Not fully support BRC-20 transfers for MNEE

## For Hackathon Demo

**Recommendation:** For the hackathon demo, focus on:

1. ✅ **Create Agent Wallet** - This works perfectly
2. ✅ **Bridge Explanation** - Explain the conceptual flow
3. ✅ **Paymaster Demo** - Show gasless transactions with MNEE
4. ⚠️ **Bitcoin Transfer** - Explain conceptually or use MNEE SDK

### Demo Script Update

**For Bitcoin → Sepolia Bridge:**

Instead of actually bridging (which has API issues), you can:

1. **Show Bitcoin Balance Check** (works):
   ```bash
   ./mnee-x balance --chain bitcoin --address 1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5
   ```

2. **Explain Bridge Flow Conceptually:**
   > "Here's how the bridge would work:
   > 1. User sends MNEE from Bitcoin address
   > 2. Bridge operator submits proof to BridgeMNEE contract
   > 3. User claims MNEE on Sepolia using claimBitcoinDeposit()
   > 4. MNEE is minted to agent wallet
   > 
   > For this demo, we'll simulate this by minting MNEE directly to the agent wallet."

3. **Use Direct Mint (for demo):**
   - Instead of bridging from Bitcoin, mint MNEE directly to agent wallet on Sepolia
   - This demonstrates the same end result without the API dependency

## Alternative: Use MNEE SDK

If you have `MNEE_API_KEY`, the MNEE SDK should work better:

1. Set in `.env`:
   ```bash
   MNEE_API_KEY=your_key
   ```

2. The CLI will automatically use MNEE SDK instead of OrdinalsBot
3. MNEE SDK is designed specifically for MNEE tokens and handles transfers properly

## Production Solution

For production, you would:
1. Use MNEE SDK (official MNEE API)
2. Or implement your own Bitcoin transaction builder
3. Or use a different Bitcoin inscription service
4. Or integrate with a more stable bridge operator

---

**Bottom line:** The core hackathon features (wallet creation, paymaster, credit system) all work. The Bitcoin transfer is a nice-to-have but not critical for demonstrating the main innovation: **AI agents paying for gas with MNEE instead of ETH.**


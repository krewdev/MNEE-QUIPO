# Bridge vs Cross-Chain Send - Same Thing!

## ✅ Yes, Bridging = Cross-Chain Sending

In QuipoWallet, **bridging** and **sending cross-chain** are the same thing. "Bridging" is just the technical term for the specific mechanism we use.

---

## 🔄 How It Works

### Bitcoin → EVM (Sepolia)

**What happens:**
1. **Lock on Bitcoin**: Send MNEE to bridge address on Bitcoin
2. **Prove**: Bridge operator submits Bitcoin transaction proof
3. **Mint on EVM**: Bridge contract mints equivalent MNEE on Sepolia

**Result:** MNEE moves from Bitcoin to Sepolia ✅

### EVM → Bitcoin

**What happens:**
1. **Lock/Burn on EVM**: Lock MNEE in bridge contract (or burn if ERC20)
2. **Prove**: Bridge operator verifies the lock
3. **Release on Bitcoin**: Bridge operator releases MNEE on Bitcoin

**Result:** MNEE moves from Sepolia to Bitcoin ✅

---

## 🎯 Why "Bridge" Instead of "Send"?

**Regular send (same chain):**
```
Alice → Bob (direct transfer)
```

**Cross-chain send (different chains):**
```
Bitcoin: Alice → Bridge (lock)
         ↓
Bridge: Proves lock
         ↓
Sepolia: Bridge → Bob (mint)
```

Since Bitcoin and EVM are separate blockchains, you can't directly send between them. You need a **bridge** that:
- Locks on source chain
- Proves the lock
- Mints/releases on target chain

---

## 📊 Comparison

| Aspect | Same-Chain Send | Cross-Chain Bridge |
|--------|----------------|-------------------|
| **Mechanism** | Direct transfer | Lock → Prove → Mint |
| **Speed** | Instant | Requires confirmation |
| **Cost** | Single transaction | Multiple steps |
| **Trust** | None (on-chain) | Bridge operator (for proof) |
| **Example** | `transfer(recipient, amount)` | `bridge(fromChain, toChain, amount)` |

---

## 💡 In Practice

When you run:
```bash
./mnee-x bridge --from-chain btc --to-chain sepolia --amount 1
```

You're essentially saying:
> "Send 1 MNEE from Bitcoin to Sepolia"

The bridge handles the technical details:
- Locking on Bitcoin
- Proving the transaction
- Minting on Sepolia

---

## 🔍 Technical Details

From the contract comments:
```solidity
/**
 * Flow:
 * Bitcoin → EVM: User locks/burns MNEE on Bitcoin, proves it, then mints on EVM
 * EVM → Bitcoin: User locks/burns MNEE on EVM, proves it, then releases on Bitcoin
 */
```

**Key functions:**
- `lockForBitcoin()` - Lock MNEE on EVM to send to Bitcoin
- `lockForBitcoinUTXO()` - Lock UTXO MNEE on EVM to send to Bitcoin
- `submitBitcoinProof()` - Submit proof of Bitcoin transaction
- `claimBitcoinDeposit()` - Claim MNEE on EVM after Bitcoin proof

---

## ✅ Summary

**Bridging = Cross-chain sending**

- Same goal: Move MNEE from one chain to another
- Different mechanism: Lock → Prove → Mint (instead of direct transfer)
- Same result: MNEE ends up on the target chain

**In your demo:**
- "Bridge from Bitcoin to Sepolia" = "Send MNEE from Bitcoin to Sepolia"
- They're interchangeable terms!

---

**TL;DR:** Yes, bridging is cross-chain sending. "Bridge" is just the technical term for the lock-and-mint mechanism used to move tokens between different blockchains.


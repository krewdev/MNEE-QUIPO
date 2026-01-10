# 🌉 Bitcoin → Sepolia Bridge Flow Clarification

## The Flow Explained

### Step 1: Send MNEE from Bitcoin
```bash
# You send/spend MNEE from your Bitcoin address
# Bitcoin address: 1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5
# Amount: 1 MNEE
# Transaction hash: <bitcoin_tx_hash>
```

**Important:** 
- Bitcoin doesn't have smart contracts, so there's **no bridge contract address on Bitcoin**
- You simply send/spend MNEE from your Bitcoin address to any address (or burn it)
- The bridge operator monitors transactions FROM your Bitcoin address

### Step 2: Bridge Operator Submits Proof
```solidity
// Bridge operator (owner) calls on BridgeMNEE contract:
bridge.submitBitcoinProof(
    bitcoinTxHash,      // Your Bitcoin transaction hash
    blockHeight,        // Bitcoin block height
    merkleProof,        // Merkle proof of Bitcoin transaction
    amount,             // Amount in MNEE (1e18 = 1 MNEE)
    recipientAddress    // ⚠️ THIS IS YOUR --to ADDRESS!
);
```

**Key Point:** The `recipientAddress` parameter is the address you want to receive MNEE on Sepolia. This is the `--to` address you specify in the CLI.

### Step 3: Claim MNEE on Sepolia
```solidity
// YOU call from the recipient address:
bridge.claimBitcoinDeposit(bitcoinTxHash);
```

**Critical Requirement:** You **MUST** call `claimBitcoinDeposit()` from the recipient address (the same address specified in `--to`).

The contract checks:
```solidity
require(proof.recipient == msg.sender, "BridgeMNEE: Not your deposit");
```

## Example: Bridge to Agent Wallet

### Scenario:
- Your Bitcoin address: `1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5`
- Your agent wallet on Sepolia: `0x6D77760273c263A240c6bAA24e398815e96623c4`
- Bridge contract: `0x22Fc4BbF8104E3EFAE9D271A8Bd96a7dF957B51D`

### Command:
```bash
./mnee-x bridge \
  --from-chain btc \
  --to-chain sepolia \
  --amount 1 \
  --to 0x6D77760273c263A240c6bAA24e398815e96623c4
```

### What Happens:

1. **You send 1 MNEE from Bitcoin** (to any address or burn)
2. **Bridge operator submits proof** with:
   ```solidity
   recipient = 0x6D77760273c263A240c6bAA24e398815e96623c4  // Your agent wallet
   ```
3. **You claim from agent wallet:**
   ```bash
   # Option A: If agent wallet has execute function
   # Call via AgentWallet.execute() to call bridge.claimBitcoinDeposit()
   
   # Option B: Add a function to AgentWallet
   # function claimBridgeDeposit(bytes32 txHash) external {
   #   bridge.claimBitcoinDeposit(txHash);
   # }
   ```

## Important Notes

### For Agent Wallets (Smart Contracts):
Since agent wallets are smart contracts, you cannot directly call `claimBitcoinDeposit()` from them using a regular wallet. You have two options:

#### Option 1: Add Claim Function to AgentWallet
```solidity
// Add to AgentWallet.sol
IBridgeMNEE public immutable bridge;

function claimBridgeDeposit(bytes32 txHash) external onlyOwner {
    bridge.claimBitcoinDeposit(txHash);
}
```

#### Option 2: Use ERC-4337 UserOperation
Create a UserOperation that executes the claim through the agent wallet.

### For EOA (Regular Wallets):
If you're bridging to a regular wallet (EOA), you can directly call:
```bash
./mnee-x claim-deposit \
  --tx-hash <bitcoin_tx_hash> \
  --chain sepolia
```

## Common Confusion

❌ **Wrong:** "I need to send to bridge contract address on Bitcoin"
- Bitcoin doesn't have contracts
- There's no bridge address on Bitcoin

✅ **Correct:** 
- Send/spend MNEE from your Bitcoin address
- Bridge operator monitors your address
- Recipient address on Sepolia is set when proof is submitted
- You must claim from that recipient address

## Bridge Contract Addresses

- **Sepolia Bridge:** `0x22Fc4BbF8104E3EFAE9D271A8Bd96a7dF957B51D`
- **View on Etherscan:** https://sepolia.etherscan.io/address/0x22Fc4BbF8104E3EFAE9D271A8Bd96a7dF957B51D

## Demo Flow

For hackathon demo, you can:
1. Show the bridge command with `--to` pointing to your agent wallet
2. Explain that bridge operator would submit proof
3. Show that the recipient can be ANY address (your wallet, agent wallet, etc.)
4. For live demo, you might need to manually submit the proof first, then claim


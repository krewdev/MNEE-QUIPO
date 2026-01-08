# UTXO Model Guide for QuipoWallet

## Overview

QuipoWallet uses a **UTXO (Unspent Transaction Output)** model for MNEE tokens instead of the standard Ethereum account-based model. This provides better privacy, prevents double-spending at the protocol level, and aligns with Bitcoin-like token economics.

## How UTXOs Work

### Key Concepts

1. **UTXO**: An Unspent Transaction Output represents a specific amount of MNEE tokens owned by an address that hasn't been spent yet.

2. **Spending**: To send tokens, you must:
   - Select specific UTXOs to use as inputs
   - Create new UTXOs as outputs
   - All inputs must be spent (you can't partially spend a UTXO)

3. **Change**: If your input UTXOs total more than you want to send, the remainder becomes "change" and is sent back to you as a new UTXO.

### Example Transaction

```
Alice wants to send 50 MNEE to Bob, and she has:
- UTXO #1: 30 MNEE
- UTXO #2: 40 MNEE
- UTXO #3: 20 MNEE

Transaction:
Inputs: UTXO #1 (30) + UTXO #2 (40) = 70 MNEE
Outputs:
  - New UTXO to Bob: 50 MNEE
  - New UTXO (change) to Alice: 20 MNEE
```

## Contract Interface

### Getting Your Balance

```solidity
function balanceOf(address owner) external view returns (uint256)
```

Returns the sum of all unspent UTXOs owned by the address.

### Getting Your UTXOs

```solidity
function getUnspentUTXOs(address owner) 
    external 
    view 
    returns (bytes32[] memory, uint256[] memory)
```

Returns arrays of UTXO IDs and their corresponding amounts.

### Transferring Tokens

```solidity
function transfer(
    bytes32[] calldata inputUTXOIds,    // UTXOs to spend
    uint256[] calldata outputAmounts,   // Amounts for each output
    address[] calldata outputOwners     // Owners for each output
) external
```

**Important**: 
- You must own all input UTXOs
- Total input amount must equal total output amount (change is handled automatically)
- All UTXOs can only be spent once

## Using UTXOs with Paymaster

### Format for paymasterAndData

When using the Paymaster with UTXOs, encode your data as follows:

```
[0:32]     - Required MNEE amount (uint256)
[32:64]    - Number of input UTXOs (uint256)
[64:96]    - First UTXO ID (bytes32)
[96:128]   - Second UTXO ID (bytes32)
...        - More UTXO IDs (32 bytes each)
```

### JavaScript Example

```javascript
import { ethers } from "ethers";

async function preparePaymasterData(userUtxoIds, requiredMnee) {
  const amountBytes = ethers.utils.defaultAbiCoder.encode(
    ["uint256"],
    [requiredMnee]
  );
  
  const numUTXOs = ethers.utils.defaultAbiCoder.encode(
    ["uint256"],
    [userUtxoIds.length]
  );
  
  let utxoData = "0x";
  for (const utxoId of userUtxoIds) {
    utxoData += utxoId.slice(2); // Remove '0x' prefix
  }
  
  return amountBytes + numUTXOs.slice(2) + utxoData.slice(2);
}

// Get user's UTXOs
const [utxoIds, amounts] = await mneeToken.getUnspentUTXOs(userAddress);

// Select UTXOs that cover the required amount
const selectedUtxos = selectUTXOs(utxoIds, amounts, requiredMnee);

// Prepare paymaster data
const paymasterData = await preparePaymasterData(selectedUtxos, requiredMnee);
```

## UTXO Selection Algorithm

You need to select UTXOs that cover your payment amount. Here's a simple algorithm:

```javascript
function selectUTXOs(utxoIds, amounts, requiredAmount) {
  let selected = [];
  let total = 0;
  
  // Simple: select UTXOs until we have enough
  // In production, you'd want more sophisticated selection (smallest first, etc.)
  for (let i = 0; i < amounts.length; i++) {
    selected.push(utxoIds[i]);
    total += amounts[i];
    if (total >= requiredAmount) {
      break;
    }
  }
  
  if (total < requiredAmount) {
    throw new Error("Insufficient UTXOs");
  }
  
  return selected;
}
```

## Advantages of UTXO Model

1. **Privacy**: Individual UTXOs aren't directly linked to account balances
2. **Double-spend Prevention**: Protocol-level prevention (UTXOs can only be spent once)
3. **Parallel Processing**: Different UTXOs can be processed in parallel
4. **Auditability**: Clear transaction history for each UTXO
5. **Bitcoin Compatibility**: Familiar model for Bitcoin users

## Differences from ERC-20

| Feature | ERC-20 | MNEE UTXO |
|---------|--------|-----------|
| Balance | Single number | Sum of UTXOs |
| Transfer | Direct amount | Select specific UTXOs |
| Approval | Global allowance | Per-UTXO authorization |
| Spent Check | N/A | Built-in (UTXO marked as spent) |

## Security Considerations

1. **Double-Spending**: Prevented by the `spent` flag on each UTXO
2. **UTXO Selection**: Always validate you have enough before creating transactions
3. **Change Handling**: Make sure change UTXOs are sent to the correct address
4. **Gas Costs**: UTXO transfers may cost more gas than ERC-20 (more data)

## Integration Tips

1. **Cache UTXOs**: Don't query `getUnspentUTXOs` on every transaction - cache and update
2. **UTXO Selection**: Implement smart selection (smallest-first, largest-first, or optimal)
3. **Batch Operations**: Combine multiple UTXO operations when possible
4. **Event Listening**: Listen for `UTXOCreated` and `UTXOSpent` events to update local state

## Migration from Account-Based

If migrating from account-based tokens:

1. Convert existing balances to UTXOs via a migration contract
2. Update frontend to use UTXO selection
3. Update paymaster integration to use UTXO format
4. Test thoroughly - UTXO model requires different transaction construction


# UTXO Implementation - MNEE Compliance

## Overview

This document verifies that our UTXO implementation follows MNEE documentation standards and best practices.

## ✅ MNEE-Compatible Functions

### 1. `getEnoughUtxos` (NEW - Added)

**MNEE Standard:** `getEnoughUtxos(address, requiredAmount)` - Efficiently retrieves minimum UTXOs needed

**Our Implementation:**
```solidity
function getEnoughUtxos(
    address owner,
    uint256 requiredAmount
) external view returns (
    bytes32[] memory utxoIds,
    uint256[] memory amounts,
    uint256 totalAmount
)
```

**Features:**
- ✅ Stops fetching once required amount is reached (efficient)
- ✅ Returns UTXO IDs and amounts
- ✅ Returns total amount for verification
- ✅ Reverts if insufficient UTXOs

**Usage Example:**
```solidity
// Get UTXOs for 100 MNEE payment
(bytes32[] memory utxoIds, uint256[] memory amounts, uint256 total) = 
    mneeToken.getEnoughUtxos(userAddress, 100e18);
```

### 2. `getUnspentUTXOs` (Existing)

**MNEE Standard:** `getAllUtxos(addresses)` - Get all UTXOs for addresses

**Our Implementation:**
```solidity
function getUnspentUTXOs(address owner) 
    external 
    view 
    returns (bytes32[] memory, uint256[] memory)
```

**Features:**
- ✅ Returns all unspent UTXOs
- ✅ Returns both IDs and amounts
- ✅ Filters out spent UTXOs

**Note:** MNEE uses `getAllUtxos` for multiple addresses, we use single address. This is acceptable for EVM.

### 3. `transfer` (Existing)

**MNEE Standard:** `transferMulti(options)` - Multi-source transfers with full UTXO control

**Our Implementation:**
```solidity
function transfer(
    bytes32[] calldata inputUTXOIds,
    uint256[] calldata outputAmounts,
    address[] calldata outputOwners
) external
```

**Features:**
- ✅ Full control over which UTXOs to spend
- ✅ Multiple outputs supported
- ✅ Automatic change handling
- ✅ Double-spend prevention

**Comparison:**
- MNEE: Uses `txid:vout` format, WIF keys
- Ours: Uses `bytes32` IDs, EVM addresses
- Both: Support multi-input, multi-output transfers

## ✅ UTXO Model Compliance

### Core Principles

1. **UTXOs can only be spent once** ✅
   - Implemented via `spent` flag
   - Checked in `isSpent` mapping
   - Enforced in `transfer()` function

2. **UTXOs must be fully spent** ✅
   - Cannot partially spend a UTXO
   - All input UTXOs are marked as spent
   - Change creates new UTXO

3. **Inputs must cover outputs** ✅
   - Validated before state changes
   - Change automatically created
   - Prevents negative balances

4. **Efficient UTXO selection** ✅
   - `getEnoughUtxos` stops when enough found
   - More efficient than getting all UTXOs
   - Matches MNEE SDK pattern

## 📋 UTXO Structure

### MNEE Bitcoin Format
```javascript
{
  outpoint: "txid:vout",
  data: {
    bsv21: {
      amt: 500000  // atomic units
    }
  },
  owners: ["address"]
}
```

### Our EVM Format
```solidity
struct UTXO {
    address owner;
    uint256 amount;        // 18 decimals (atomic units)
    uint256 blockCreated;
    bool spent;
}
```

**Differences:**
- MNEE uses `txid:vout` for identification (Bitcoin)
- We use `bytes32` IDs (EVM-compatible)
- Both track ownership and amount
- Both prevent double-spending

## 🔄 Transaction Flow

### MNEE Bitcoin Flow
1. Get UTXOs: `getEnoughUtxos(address, amount)`
2. Prepare inputs: `[{txid, vout, wif}, ...]`
3. Execute: `transferMulti({inputs, recipients, changeAddress})`
4. Wait for confirmation

### Our EVM Flow
1. Get UTXOs: `getEnoughUtxos(owner, requiredAmount)`
2. Prepare inputs: `[utxoId1, utxoId2, ...]`
3. Execute: `transfer(inputUTXOIds, outputAmounts, outputOwners)`
4. Transaction confirmed on-chain

**Key Similarities:**
- ✅ Both require UTXO selection
- ✅ Both support multiple inputs/outputs
- ✅ Both handle change automatically
- ✅ Both prevent double-spending

## 🎯 Paymaster Integration

### MNEE Paymaster Data Format

Our implementation matches MNEE's expected format:

```
[0:32]     - Required MNEE amount (uint256)
[32:64]    - Number of input UTXOs (uint256)
[64:96]    - First UTXO ID (bytes32)
[96:128]   - Second UTXO ID (bytes32)
...        - More UTXO IDs (32 bytes each)
```

**Usage:**
```javascript
// 1. Get enough UTXOs
const [utxoIds, amounts, total] = await mneeToken.getEnoughUtxos(
    userAddress, 
    requiredAmount
);

// 2. Encode for paymaster
const paymasterData = encodePaymasterData(utxoIds, requiredAmount);

// 3. Include in UserOperation
userOp.paymasterAndData = paymasterData;
```

## ✅ Compliance Checklist

- [x] **getEnoughUtxos** - Efficient UTXO selection (NEW)
- [x] **getUnspentUTXOs** - Get all UTXOs
- [x] **transfer** - Multi-input/output transfers
- [x] **Double-spend prevention** - Protocol-level
- [x] **Change handling** - Automatic
- [x] **UTXO ownership** - Verified before spending
- [x] **Paymaster integration** - Proper format
- [x] **Events** - UTXOCreated, UTXOSpent, Transfer

## 🔍 Differences from MNEE Bitcoin

| Feature | MNEE Bitcoin | Our EVM Implementation |
|---------|-------------|------------------------|
| UTXO ID | `txid:vout` | `bytes32` hash |
| Authentication | WIF keys | EVM signatures |
| Network | Bitcoin | EVM chains |
| Atomic Units | Variable | 18 decimals (standard) |
| Selection | `getEnoughUtxos` | `getEnoughUtxos` ✅ |
| Transfer | `transferMulti` | `transfer` ✅ |

**Conclusion:** Our implementation is EVM-adapted but follows the same UTXO principles and patterns as MNEE on Bitcoin.

## 📝 Recommendations

1. ✅ **Added `getEnoughUtxos`** - Matches MNEE SDK
2. ✅ **Efficient selection** - Stops when enough found
3. ✅ **Proper validation** - All checks in place
4. ⚠️ **Consider adding:** UTXO sorting options (smallest-first, largest-first) for optimization
5. ⚠️ **Consider adding:** Batch UTXO operations for gas efficiency

## 🚀 Usage Examples

### Example 1: Get UTXOs for Payment

```solidity
// Get minimum UTXOs needed for 100 MNEE
(bytes32[] memory utxoIds, uint256[] memory amounts, uint256 total) = 
    mneeToken.getEnoughUtxos(msg.sender, 100e18);

// Verify we have enough
require(total >= 100e18, "Insufficient UTXOs");
```

### Example 2: Transfer with Selected UTXOs

```solidity
// Transfer 50 MNEE to recipient
uint256[] memory outputAmounts = new uint256[](1);
address[] memory outputOwners = new address[](1);
outputAmounts[0] = 50e18;
outputOwners[0] = recipient;

mneeToken.transfer(utxoIds, outputAmounts, outputOwners);
// Change is automatically created and sent back to sender
```

### Example 3: Paymaster Integration

```javascript
// Get UTXOs for gas payment
const [utxoIds, amounts, total] = await mneeToken.getEnoughUtxos(
    userAddress,
    requiredMnee
);

// Encode for paymaster
const paymasterData = ethers.solidityPacked(
    ["uint256", "uint256", "bytes32[]"],
    [requiredMnee, utxoIds.length, utxoIds]
);

// Use in UserOperation
userOp.paymasterAndData = paymasterData;
```

---

**Status:** ✅ UTXO implementation is MNEE-compliant and follows best practices.

*Last updated: After adding `getEnoughUtxos` function*


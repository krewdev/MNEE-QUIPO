# Security Audit Report - QuipoWallet Smart Contracts

**Date:** December 2024  
**Auditor:** Security Review  
**Status:** ⚠️ **NOT PRODUCTION READY** - Multiple Critical and High Severity Issues Found

---

## Executive Summary

This audit reviews 10 smart contracts in the QuipoWallet system. The contracts implement ERC-4337 account abstraction, token payments, staking, bridging, and UTXO token models. **CRITICAL ISSUES** were identified that must be fixed before mainnet deployment.

### Severity Breakdown
- 🔴 **Critical:** 3 issues
- 🟠 **High:** 8 issues  
- 🟡 **Medium:** 12 issues
- 🔵 **Low/Info:** 15 issues

---

## 1. AgentWallet.sol - ERC-4337 Smart Wallet

### ✅ Strengths
- Uses OpenZeppelin's BaseAccount
- Proper EIP-712 signature validation
- EntryPoint-only execution modifier

### 🔴 Critical Issues

#### C1: Missing Access Control on `withdrawTo()`
**Location:** Line 101  
**Severity:** Critical  
**Issue:** `withdrawTo()` only checks `onlyOwner` but doesn't verify EntryPoint stake ownership. EntryPoint deposits are tied to the contract address, not the owner.
```solidity
function withdrawTo(address payable withdrawAddress, uint256 amount) public onlyOwner {
    entryPoint().withdrawTo(withdrawAddress, amount);
}
```
**Impact:** Owner can withdraw EntryPoint deposits that belong to the contract account.
**Recommendation:** Remove this function or ensure it only withdraws from contract's EntryPoint deposit, not arbitrary amounts.

#### C2: Potential Signature Replay
**Location:** Lines 40-52  
**Severity:** Critical  
**Issue:** No nonce validation beyond BaseAccount. If EntryPoint is bypassed, signatures could be replayed.
**Impact:** Replay attacks possible if EntryPoint validation is bypassed.
**Recommendation:** Ensure EntryPoint properly validates nonces (BaseAccount requirement).

### 🟠 High Issues

#### H1: `deposit()` Function Accessible to Anyone
**Location:** Line 94  
**Severity:** High  
**Issue:** Anyone can deposit ETH to the wallet's EntryPoint balance, which could lock funds.
```solidity
function deposit() public payable {
    entryPoint().depositTo{value: msg.value}(address(this));
}
```
**Impact:** Malicious actors could lock funds by depositing to EntryPoint.
**Recommendation:** Add access control or accept it as a feature (users can fund their own wallet).

### 🟡 Medium Issues

#### M1: No Validation in `_call()` Function
**Location:** Lines 82-89  
**Severity:** Medium  
**Issue:** No checks for zero addresses or self-calls that could cause issues.
**Recommendation:** Add zero address checks and consider adding a whitelist for critical operations.

---

## 2. AgentWalletFactory.sol - CREATE2 Wallet Factory

### ✅ Strengths
- Uses CREATE2 for deterministic addresses
- Checks for address collisions
- Tracks deployed wallets

### 🟠 High Issues

#### H2: Wallet Creation Permission Issues
**Location:** Line 36  
**Severity:** High  
**Issue:** `createWallet()` allows anyone to create a wallet for any address. This could be used to prevent legitimate wallet creation.
```solidity
function createWallet(address owner, uint256 salt) external returns (address wallet) {
    require(wallets[owner] == address(0), "AgentWalletFactory: Wallet already exists");
    // ...
}
```
**Impact:** Front-running attacks: malicious actor creates wallet first, preventing legitimate user from creating theirs.
**Recommendation:** Add access control or allow wallet replacement with owner signature.

#### H3: Gas Limit Issues in `getAllWallets()`
**Location:** Lines 102-121  
**Severity:** High  
**Issue:** No gas limit protection. Large `allWallets` array could cause out-of-gas errors.
**Recommendation:** Add maximum limit parameter or use pagination more efficiently.

### 🟡 Medium Issues

#### M2: Salt Collision Potential
**Location:** Line 50-54  
**Severity:** Medium  
**Issue:** While code checks for collisions, there's no protection against predictable salt generation leading to collisions.
**Recommendation:** Consider using `keccak256(abi.encodePacked(owner, salt, msg.sender))` for better collision resistance.

---

## 3. MNEEToken.sol - ERC20 Token with Permit

### ✅ Strengths
- Uses OpenZeppelin's ERC20Permit
- Max supply enforcement
- ReentrancyGuard (though not needed for this contract)

### 🟡 Medium Issues

#### M3: Unnecessary ReentrancyGuard
**Location:** Line 14  
**Severity:** Medium (Code Quality)  
**Issue:** ReentrancyGuard is unnecessary for standard ERC20 operations.
**Recommendation:** Remove to save gas.

#### M4: Initial Mint in Constructor
**Location:** Line 28  
**Severity:** Medium  
**Issue:** Mints entire max supply to initial owner in constructor. This is fine for design but could be a centralization risk.
**Recommendation:** Document this clearly. Consider gradual release mechanism.

---

## 4. MNEEPaymaster.sol - ERC-4337 Paymaster

### ✅ Strengths
- Timelock for critical updates
- Pausable for emergency stops
- Proper validation flow

### 🔴 Critical Issues

#### C3: Integer Division Precision Loss
**Location:** Line 174  
**Severity:** Critical  
**Issue:** Division before multiplication can cause precision loss, especially for small amounts.
```solidity
function _calculateRequiredMNEE(uint256 gasCost) internal view returns (uint256) {
    return (gasCost * 1e18) / mneeRate;
}
```
**Impact:** Users may be overcharged or undercharged due to rounding errors.
**Recommendation:** Use higher precision math or adjust rate calculation to minimize rounding.

### 🟠 High Issues

#### H4: `_postOp()` Overcharge Vulnerability
**Location:** Lines 128-164  
**Severity:** High  
**Issue:** Uses `providedAmount` from validation but charges based on `actualGasCost`. Logic at line 151 is confusing and could lead to incorrect charges.
```solidity
uint256 mneeToCharge = actualMNEEAmount > providedAmount ? providedAmount : actualMNEEAmount;
```
**Impact:** Users might be overcharged or the paymaster might not cover gas costs correctly.
**Recommendation:** Clarify logic: charge based on actual gas cost, but don't exceed provided amount. Return excess if any.

#### H5: Missing Refund for Excess MNEE
**Location:** Lines 148-151  
**Severity:** High  
**Issue:** If `providedAmount > actualMNEEAmount`, excess is not refunded. User loses MNEE.
**Recommendation:** Refund excess MNEE to user, or document that excess is a fee.

#### H6: `withdrawMNEE()` Can Drain Contract
**Location:** Lines 294-301  
**Severity:** High  
**Issue:** Owner can withdraw any amount of MNEE from contract. If contract receives MNEE from other sources, owner can drain it.
**Impact:** Loss of user funds if MNEE is mistakenly sent to contract.
**Recommendation:** Track expected MNEE balance vs actual, or accept this as admin function with documentation.

### 🟡 Medium Issues

#### M5: Timelock Bypass Risk
**Location:** Lines 273-275  
**Severity:** Medium  
**Issue:** `setMinMNEEAmount()` has no timelock, allowing instant changes that could affect users.
**Recommendation:** Add timelock or rate limits to parameter changes.

#### M6: No Maximum Rate Validation
**Location:** Line 188  
**Severity:** Medium  
**Issue:** No upper bound on `mneeRate`. Owner could set extremely high rate.
**Recommendation:** Add reasonable maximum rate check.

---

## 5. MNEEPaymasterUTXO.sol - UTXO-Based Paymaster

### ⚠️ Note
This contract appears to be a minting contract, not a paymaster. The name is misleading.

### 🟠 High Issues

#### H7: Missing ERC20Permit Implementation for `mnee`
**Location:** Line 71  
**Severity:** High  
**Issue:** `purchaseWithPermit()` calls `mnee.permit()` but `mnee` is `IERC20`, not `IERC20Permit`. This will fail at runtime.
```solidity
mnee.permit(msg.sender, address(this), mneeAmount, deadline, v, r, s);
```
**Impact:** Function will always revert.
**Recommendation:** Use `IERC20Permit` interface or remove permit functionality.

#### H8: `_validatePurchase()` Uses `msg.value` but Also Has Token Fee
**Location:** Lines 169-173  
**Severity:** High  
**Issue:** `_validatePurchase()` always checks `msg.value >= mintFee`, but `purchaseWithTokenFee()` doesn't send ETH.
```solidity
function _validatePurchase(uint256 amount, address recipient) internal view {
    require(msg.value >= mintFee, "Insufficient ETH for mint fee");
}
```
**Impact:** `purchaseWithTokenFee()` will always revert.
**Recommendation:** Split validation or use a parameter to indicate fee type.

### 🟡 Medium Issues

#### M7: SafeMath Usage Unnecessary
**Location:** Line 12  
**Severity:** Medium  
**Issue:** Solidity 0.8+ has built-in overflow protection. SafeMath is unnecessary.
**Recommendation:** Remove SafeMath to save gas.

---

## 6. MNEETokenUTXO.sol - UTXO Token Implementation

### ✅ Strengths
- Proper UTXO model implementation
- Double-spend prevention
- Change handling

### 🟠 High Issues

#### H9: Gas Limit DoS in `balanceOf()` and `getUnspentUTXOs()`
**Location:** Lines 115-158  
**Severity:** High  
**Issue:** Functions iterate through entire `ownerUTXOs` array. Users with many UTXOs will hit gas limits. The comment acknowledges this (line 29-33) but no solution is implemented.
**Impact:** Users with many UTXOs cannot check balance or get UTXOs.
**Recommendation:** Implement pagination or maintain separate unspent UTXO mapping.

#### H10: `_generateUTXOId()` Predictability
**Location:** Lines 74-83  
**Severity:** High  
**Issue:** Uses `block.timestamp` and `block.prevrandao` which are predictable. Could lead to ID collisions if same owner mints same amount in same block.
```solidity
function _generateUTXOId(address owner, uint256 amount) private view returns (bytes32) {
    return keccak256(abi.encodePacked(
        owner, amount, block.timestamp, block.prevrandao, nonce, msg.sender
    ));
}
```
**Impact:** Potential UTXO ID collisions causing mint failures.
**Recommendation:** Rely more on `nonce` and consider using `keccak256(abi.encode(...))` instead of `abi.encodePacked` to avoid collisions.

### 🟡 Medium Issues

#### M8: No Max UTXO Limit
**Location:** Throughout  
**Severity:** Medium  
**Issue:** No limit on number of UTXOs per address. Could cause gas issues.
**Recommendation:** Add maximum UTXO limit or cleanup mechanism.

#### M9: Change UTXO Creation Not Emitted
**Location:** Line 268  
**Severity:** Medium  
**Issue:** Change UTXO creation doesn't emit `UTXOCreated` event explicitly.
**Recommendation:** Add event emission for change UTXOs.

---

## 7. BridgeMNEE.sol - Bitcoin-EVM Bridge

### ⚠️ Critical Security Note
**This contract contains placeholder code that MUST NOT be deployed to mainnet without proper Bitcoin proof verification.**

### 🔴 Critical Issues

#### C4: No Bitcoin Proof Verification (Acknowledged)
**Location:** Lines 103-111  
**Severity:** Critical  
**Issue:** `submitBitcoinProof()` has NO actual Merkle proof verification. Anyone with owner access can mint unlimited tokens.
```solidity
// SECURITY NOTE: Merkle proof verification is required for production
// Currently this is a placeholder
```
**Impact:** Complete loss of bridge security. Owner can mint unlimited tokens.
**Recommendation:** **DO NOT DEPLOY TO MAINNET** without implementing proper SPV proof verification or oracle-based verification.

### 🟠 High Issues

#### H11: `unlockEVMLockUTXO()` Double-Mint Risk
**Location:** Lines 283-298  
**Severity:** High  
**Issue:** When unlocking UTXO locks, contract mints new UTXOs. But original locked UTXOs are still in contract. This effectively doubles the supply.
```solidity
function unlockEVMLockUTXO(bytes32 lockId) external onlyOwner {
    // ...
    utxoToken.mint(lock.sender, lock.amount); // Mints new UTXOs
    // But original UTXOs are still locked in contract!
}
```
**Impact:** Double-spending: user gets back locked amount + original UTXOs remain.
**Recommendation:** Burn or transfer locked UTXOs before minting new ones.

#### H12: `burnLockedERC20()` May Fail
**Location:** Lines 304-314  
**Severity:** High  
**Issue:** Attempts to burn by transferring to `address(0)`. Many tokens don't allow this.
**Impact:** Function will revert, preventing cleanup.
**Recommendation:** Check if token supports burns, or use token's burn function directly.

### 🟡 Medium Issues

#### M10: Lock ID Generation Weakness
**Location:** Lines 169, 218  
**Severity:** Medium  
**Issue:** Uses `keccak256(abi.encodePacked(...))` which can have collision issues.
**Recommendation:** Use `keccak256(abi.encode(...))` for better collision resistance.

#### M11: No Timeout for Locks
**Severity:** Medium  
**Issue:** EVM locks have no expiration. Funds can be locked indefinitely.
**Recommendation:** Add timeout mechanism for locks.

---

## 8. MNEECreditPool.sol - Credit Pool

### ✅ Strengths
- Comprehensive credit system
- Liquidation mechanism
- Interest calculations

### 🟠 High Issues

#### H13: Interest Calculation Precision Loss
**Location:** Lines 375-391  
**Severity:** High  
**Issue:** Interest calculations use division which can lose precision, especially for small amounts or short time periods.
```solidity
uint256 annualReward = (user.stakedAmount * stakingAPY) / 10000;
return (annualReward * timeElapsed) / 365 days;
```
**Impact:** Rewards/interest may round to zero for small amounts.
**Recommendation:** Use higher precision math (multiply by 1e18 first, then divide).

#### H14: Liquidation Logic Issue
**Location:** Lines 279-311  
**Severity:** High  
**Issue:** Liquidation takes entire stake but doesn't actually repay the debt properly. The debt is cleared but tokens aren't returned to pool correctly.
```solidity
// Repay debt to pool
totalLiquidity += toPool;
totalBorrowed -= user.borrowedAmount;
```
**Impact:** Accounting mismatch. Pool balance doesn't match actual tokens.
**Recommendation:** Fix liquidation to properly account for debt repayment.

#### H15: `withdrawLiquidity()` No Interest Update
**Location:** Lines 226-239  
**Severity:** High  
**Issue:** Withdraws liquidity without updating interest for borrowers. This could allow arbitrage.
**Recommendation:** Update all borrower interest before allowing withdrawal.

### 🟡 Medium Issues

#### M12: No Maximum Rates Enforcement
**Location:** Lines 408-415  
**Severity:** Medium  
**Issue:** `setRates()` has max of 5000 (50%), but this is still very high.
**Recommendation:** Consider lower maximums or timelock for rate changes.

#### M13: Liquidity Provider Rewards Calculation Error
**Location:** Lines 393-404  
**Severity:** Medium  
**Issue:** `_calculateLiquidityRewards()` calculates rewards from `totalBorrowed` but rewards should come from interest paid, not borrowed amount.
**Impact:** Incorrect reward calculation.
**Recommendation:** Fix calculation to use actual interest collected.

---

## 9. MNEEStaking.sol - Legacy Staking

### ⚠️ Note: Contract marked as legacy

### 🟡 Medium Issues

#### M14: Hardcoded Price Oracle
**Location:** Lines 305-311  
**Severity:** Medium  
**Issue:** Assumes 1 MNEE = 1 USD. No actual price oracle.
**Impact:** If MNEE price changes, liquidation and borrowing calculations are wrong.
**Recommendation:** Add Chainlink or similar price oracle.

#### M15: Same Issues as MNEECreditPool
Similar precision and calculation issues as CreditPool.

---

## 10. AgentWalletStaking.sol - Wallet Staking Integration

### 🟠 High Issues

#### H16: Missing Access Control
**Location:** Lines 34-51  
**Severity:** High  
**Issue:** `stakeAndBorrow()` can be called by anyone, not just EntryPoint or owner.
```solidity
function stakeAndBorrow(uint256 mneeStakeAmount, uint256 mneeBorrowAmount) external {
    // No access control!
}
```
**Impact:** Anyone can stake/borrow on behalf of the wallet, potentially draining it.
**Recommendation:** Add `onlyEntryPoint` or `onlyOwner` modifier.

#### H17: Token Approval Required But Not Handled
**Location:** Lines 38-39  
**Severity:** High  
**Issue:** Comments say "requires token approval first" but function doesn't handle it. Will revert if not approved.
**Recommendation:** Use `safeTransferFrom` or handle permit.

---

## Summary of Critical Actions Required

### Before Mainnet Deployment:

1. **🔴 CRITICAL:** Fix BridgeMNEE Bitcoin proof verification - **DO NOT DEPLOY** without it
2. **🔴 CRITICAL:** Fix AgentWallet withdrawal access control
3. **🔴 CRITICAL:** Fix precision loss in paymaster calculations
4. **🟠 HIGH:** Fix double-mint in BridgeMNEE unlock function
5. **🟠 HIGH:** Fix UTXO gas limit DoS issues
6. **🟠 HIGH:** Fix all access control issues
7. **🟠 HIGH:** Fix interest/reward calculation precision
8. **🟡 MEDIUM:** Add comprehensive test coverage
9. **🟡 MEDIUM:** Add rate limits and bounds to all parameters
10. **🟡 MEDIUM:** Fix all identified calculation errors

### Testing Recommendations

- Add fuzz testing for all mathematical operations
- Add integration tests for full ERC-4337 flow
- Add gas limit tests for UTXO operations
- Add reentrancy attack tests
- Add front-running attack tests
- Add precision loss tests for small amounts

### Documentation Needed

- Remove "audited" claims from documentation
- Document all known limitations
- Document admin powers and risks
- Document upgrade/migration paths
- Add comprehensive security considerations section

---

## Conclusion

While the contracts show good understanding of security patterns and use OpenZeppelin libraries, **multiple critical vulnerabilities** exist that must be fixed before any mainnet deployment. The bridge contract in particular should **never be deployed** without proper Bitcoin proof verification.

**Recommendation:** Address all Critical and High severity issues, conduct comprehensive testing, and obtain professional third-party audit before mainnet deployment.

---

**End of Audit Report**

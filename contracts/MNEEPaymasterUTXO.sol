// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@account-abstraction/contracts/core/BasePaymaster.sol";
import "@account-abstraction/contracts/core/EntryPoint.sol";
import "./MNEETokenUTXO.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
// Ownable is already inherited from BasePaymaster

/**
 * @title MNEEPaymasterUTXO
 * @dev ERC-4337 Paymaster that accepts MNEE UTXOs and pays ETH gas
 * Handles UTXO-based token transfers instead of account-based
 */
contract MNEEPaymasterUTXO is BasePaymaster, Pausable, ReentrancyGuard {
    // MNEE UTXO token address
    MNEETokenUTXO public immutable mneeToken;
    
    // Conversion rate: 1 MNEE = X wei (1e18 wei = 1 ETH)
    uint256 public mneeRate;
    
    // Minimum MNEE amount required for a transaction
    uint256 public minMNEEAmount;
    
    // Treasury address to receive MNEE fees
    address public treasury;
    
    // Track total gas sponsored and MNEE collected
    uint256 public totalGasSponsored;
    uint256 public totalMNEEcollected;
    
    // Timelock for critical parameter updates
    uint256 public constant TIMELOCK_DURATION = 2 days; // 2 days delay for critical updates
    
    struct PendingUpdate {
        uint256 newValue;
        address newAddress;
        uint256 timestamp;
        bool isRateUpdate; // true for rate, false for treasury
    }
    
    PendingUpdate public pendingRateUpdate;
    PendingUpdate public pendingTreasuryUpdate;
    
    // Events
    event GasSponsored(
        address indexed user,
        uint256 gasCost,
        uint256 mneeAmount,
        bytes32[] utxoIds,
        bytes32 indexed userOpHash
    );
    
    event RateUpdated(uint256 oldRate, uint256 newRate);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event RateUpdatePending(uint256 newRate, uint256 executeAfter);
    event TreasuryUpdatePending(address newTreasury, uint256 executeAfter);
    
    constructor(
        IEntryPoint _entryPoint,
        MNEETokenUTXO _mneeToken,
        address initialOwner,
        address _treasury,
        uint256 _mneeRate
    ) BasePaymaster(_entryPoint) {
        _transferOwnership(initialOwner);
        require(address(_mneeToken) != address(0), "MNEEPaymasterUTXO: Invalid token");
        require(_treasury != address(0), "MNEEPaymasterUTXO: Invalid treasury");
        require(_mneeRate > 0, "MNEEPaymasterUTXO: Invalid rate");
        
        mneeToken = _mneeToken;
        treasury = _treasury;
        mneeRate = _mneeRate;
        minMNEEAmount = 1e15; // 0.001 MNEE (with 18 decimals)
    }
    
    /**
     * @dev Validate paymaster data with UTXO inputs
     * @param userOp The user operation
     * @param maxCost Maximum cost in wei
     * @return context Context data (encoded UTXO IDs and amounts)
     * @return validationData Validation data
     * 
     * paymasterAndData format:
     * [0:32] - required MNEE amount (uint256)
     * [32:64] - number of input UTXOs (uint256)
     * [64:96] - first UTXO ID (bytes32) or offset to UTXO array
     * ... more UTXO IDs
     */
    function _validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) internal override whenNotPaused returns (bytes memory context, uint256 validationData) {
        require(userOp.paymasterAndData.length >= 96, "MNEEPaymasterUTXO: Invalid paymaster data");
        
        uint256 requiredMNEE = _calculateRequiredMNEE(maxCost);
        uint256 providedAmount = uint256(bytes32(userOp.paymasterAndData[0:32]));
        uint256 numUTXOs = uint256(bytes32(userOp.paymasterAndData[32:64]));
        
        require(providedAmount >= requiredMNEE, "MNEEPaymasterUTXO: Insufficient MNEE");
        require(providedAmount >= minMNEEAmount, "MNEEPaymasterUTXO: Below minimum");
        require(numUTXOs > 0, "MNEEPaymasterUTXO: No UTXOs provided");
        
        // Validate that there's enough data for all UTXOs (64 bytes base + 32 bytes per UTXO)
        require(
            userOp.paymasterAndData.length >= 64 + (numUTXOs * 32),
            "MNEEPaymasterUTXO: Insufficient paymaster data length"
        );
        
        // Decode UTXO IDs (starting from offset 64)
        bytes32[] memory utxoIds = new bytes32[](numUTXOs);
        uint256 offset = 64;
        
        for (uint256 i = 0; i < numUTXOs; i++) {
            require(
                userOp.paymasterAndData.length >= offset + 32,
                "MNEEPaymasterUTXO: Invalid UTXO data length"
            );
            utxoIds[i] = bytes32(userOp.paymasterAndData[offset:offset + 32]);
            offset += 32;
            
            // Validate UTXO ownership
            MNEETokenUTXO.UTXO memory utxo = mneeToken.getUTXO(utxoIds[i]);
            require(utxo.owner == userOp.sender, "MNEEPaymasterUTXO: Not owner of UTXO");
            require(!utxo.spent, "MNEEPaymasterUTXO: UTXO already spent");
        }
        
        // Verify total UTXO value matches or exceeds required amount
        uint256 totalUTXOValue = 0;
        for (uint256 i = 0; i < utxoIds.length; i++) {
            MNEETokenUTXO.UTXO memory utxo = mneeToken.getUTXO(utxoIds[i]);
            totalUTXOValue += utxo.amount;
        }
        
        require(totalUTXOValue >= providedAmount, "MNEEPaymasterUTXO: UTXO value mismatch");
        
        // Store context for post-op (UTXO IDs, amounts, user, userOpHash)
        context = abi.encode(userOp.sender, utxoIds, providedAmount, maxCost, userOpHash);
        
        return (context, 0);
    }
    
    /**
     * @dev Post-operation: Transfer MNEE UTXOs from user to treasury
     * @param mode Operation mode
     * @param context Context from validation (contains UTXO IDs)
     * @param actualGasCost Actual gas cost
     */
    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) internal override nonReentrant {
        if (mode == PostOpMode.postOpReverted) {
            // UserOp reverted, don't charge
            return;
        }
        
        address user;
        bytes32[] memory utxoIds;
        uint256 providedAmount;
        uint256 maxCost;
        bytes32 userOpHash;
        (user, utxoIds, providedAmount, maxCost, userOpHash) = abi.decode(
            context, 
            (address, bytes32[], uint256, uint256, bytes32)
        );
        
        // Calculate actual MNEE amount based on actual gas cost
        uint256 actualMNEEAmount = _calculateRequiredMNEE(actualGasCost);
        
        // Use the provided amount or actual, whichever is smaller
        uint256 mneeToCharge = actualMNEEAmount > providedAmount ? providedAmount : actualMNEEAmount;
        
        // Transfer UTXOs: user pays with their UTXOs, we create new UTXOs for treasury
        // NOTE: The user's UserOperation MUST include a call to mneeToken.transfer() in callData
        // that spends the input UTXOs and creates output UTXOs (one to treasury, one as change back)
        _transferUTXOsToTreasury(user, utxoIds, mneeToCharge);
        
        // Update stats
        totalGasSponsored += actualGasCost;
        totalMNEEcollected += mneeToCharge;
        
        emit GasSponsored(user, actualGasCost, mneeToCharge, utxoIds, userOpHash);
    }
    
    /**
     * @dev Transfer UTXOs to treasury, handling change if needed
     * NOTE: The user's AgentWallet MUST execute the UTXO transfer in the UserOperation callData.
     * This function verifies the transfer was executed correctly.
     * 
     * The expected flow:
     * 1. User's callData includes a call to mneeToken.transfer() that spends their UTXOs
     * 2. Output UTXOs are created: one to treasury (amountToCharge) and one change back to user
     * 3. This function verifies the transfer happened correctly
     * 
     * SECURITY: This function verifies that:
     * - All input UTXOs are spent (proving the user executed the transfer)
     * - The total input value covers the amount to charge
     * - In production, you should also verify via events that treasury received UTXOs
     */
    function _transferUTXOsToTreasury(
        address user,
        bytes32[] memory inputUTXOIds,
        uint256 amountToCharge
    ) internal {
        uint256 totalInputValue = 0;
        uint256 treasuryBalanceBefore = mneeToken.balanceOf(treasury);
        
        // Verify all input UTXOs are now spent (user executed the transfer)
        for (uint256 i = 0; i < inputUTXOIds.length; i++) {
            MNEETokenUTXO.UTXO memory utxo = mneeToken.getUTXO(inputUTXOIds[i]);
            require(utxo.spent, "MNEEPaymasterUTXO: UTXO transfer not executed");
            require(utxo.owner == user, "MNEEPaymasterUTXO: Invalid UTXO owner");
            totalInputValue += utxo.amount;
        }
        
        require(totalInputValue >= amountToCharge, "MNEEPaymasterUTXO: Insufficient UTXO value");
        
        // Enhanced treasury verification
        uint256 treasuryBalanceAfter = mneeToken.balanceOf(treasury);
        uint256 treasuryBalanceIncrease = treasuryBalanceAfter - treasuryBalanceBefore;
        
        // Verify treasury balance increased by at least the amount to charge
        require(
            treasuryBalanceIncrease >= amountToCharge,
            "MNEEPaymasterUTXO: Treasury did not receive sufficient tokens"
        );
        
        // Additional verification: Ensure treasury received exactly the expected amount
        // (allowing for rounding or if exact amount was sent)
        // In UTXO model, exact amount matching is expected
        require(
            treasuryBalanceIncrease == amountToCharge || 
            (treasuryBalanceIncrease > amountToCharge && treasuryBalanceIncrease <= totalInputValue),
            "MNEEPaymasterUTXO: Treasury received incorrect amount"
        );
        
        // Note: For production, enhance verification by:
        // 1. Tracking specific UTXO IDs received by treasury via Transfer events
        // 2. Verifying UTXO ownership matches treasury address
        // 3. Checking that received UTXOs are not spent
        // 4. Using event filters to track UTXO transfers in real-time
        
        // Additional verification: Change is handled by the user's transfer callData
        // The user's UserOperation should create output UTXOs:
        // 1. One to treasury for amountToCharge
        // 2. One back to user for change (if totalInputValue > amountToCharge)
        // We've verified treasury received the correct amount, confirming transfer executed correctly
    }
    
    /**
     * @dev Calculate required MNEE amount for given gas cost
     */
    function _calculateRequiredMNEE(uint256 gasCost) internal view returns (uint256) {
        return (gasCost * 1e18) / mneeRate;
    }
    
    /**
     * @dev Calculate required MNEE amount (public view)
     */
    function calculateRequiredMNEE(uint256 gasCost) external view returns (uint256) {
        return _calculateRequiredMNEE(gasCost);
    }
    
    /**
     * @dev Propose new MNEE rate (requires timelock)
     */
    function proposeRateUpdate(uint256 _newRate) external onlyOwner {
        require(_newRate > 0, "MNEEPaymasterUTXO: Invalid rate");
        pendingRateUpdate = PendingUpdate({
            newValue: _newRate,
            newAddress: address(0),
            timestamp: block.timestamp,
            isRateUpdate: true
        });
        emit RateUpdatePending(_newRate, block.timestamp + TIMELOCK_DURATION);
    }
    
    /**
     * @dev Execute pending rate update (after timelock)
     */
    function executeRateUpdate() external onlyOwner {
        require(pendingRateUpdate.timestamp > 0, "MNEEPaymasterUTXO: No pending update");
        require(
            block.timestamp >= pendingRateUpdate.timestamp + TIMELOCK_DURATION,
            "MNEEPaymasterUTXO: Timelock not expired"
        );
        require(pendingRateUpdate.isRateUpdate, "MNEEPaymasterUTXO: Not a rate update");
        
        uint256 oldRate = mneeRate;
        mneeRate = pendingRateUpdate.newValue;
        
        // Clear pending update
        delete pendingRateUpdate;
        
        emit RateUpdated(oldRate, mneeRate);
    }
    
    /**
     * @dev Cancel pending rate update
     */
    function cancelRateUpdate() external onlyOwner {
        require(pendingRateUpdate.timestamp > 0, "MNEEPaymasterUTXO: No pending update");
        require(pendingRateUpdate.isRateUpdate, "MNEEPaymasterUTXO: Not a rate update");
        delete pendingRateUpdate;
    }
    
    /**
     * @dev Propose new treasury address (requires timelock)
     */
    function proposeTreasuryUpdate(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "MNEEPaymasterUTXO: Invalid treasury");
        pendingTreasuryUpdate = PendingUpdate({
            newValue: 0,
            newAddress: _newTreasury,
            timestamp: block.timestamp,
            isRateUpdate: false
        });
        emit TreasuryUpdatePending(_newTreasury, block.timestamp + TIMELOCK_DURATION);
    }
    
    /**
     * @dev Execute pending treasury update (after timelock)
     */
    function executeTreasuryUpdate() external onlyOwner {
        require(pendingTreasuryUpdate.timestamp > 0, "MNEEPaymasterUTXO: No pending update");
        require(
            block.timestamp >= pendingTreasuryUpdate.timestamp + TIMELOCK_DURATION,
            "MNEEPaymasterUTXO: Timelock not expired"
        );
        require(!pendingTreasuryUpdate.isRateUpdate, "MNEEPaymasterUTXO: Not a treasury update");
        
        address oldTreasury = treasury;
        treasury = pendingTreasuryUpdate.newAddress;
        
        // Clear pending update
        delete pendingTreasuryUpdate;
        
        emit TreasuryUpdated(oldTreasury, treasury);
    }
    
    /**
     * @dev Cancel pending treasury update
     */
    function cancelTreasuryUpdate() external onlyOwner {
        require(pendingTreasuryUpdate.timestamp > 0, "MNEEPaymasterUTXO: No pending update");
        require(!pendingTreasuryUpdate.isRateUpdate, "MNEEPaymasterUTXO: Not a treasury update");
        delete pendingTreasuryUpdate;
    }
    
    /**
     * @dev Update minimum MNEE amount
     */
    function setMinMNEEAmount(uint256 _minAmount) external onlyOwner {
        minMNEEAmount = _minAmount;
    }
    
    /**
     * @dev Pause paymaster
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause paymaster
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Note: deposit(), addStake(), unlockStake(), withdrawStake(), and withdrawTo()
    // are already provided by BasePaymaster, so we don't need to override them
    
    // Allow receiving ETH
    receive() external payable {}
}


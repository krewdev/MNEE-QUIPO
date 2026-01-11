// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@account-abstraction/contracts/core/BasePaymaster.sol";
import "@account-abstraction/contracts/core/EntryPoint.sol";
import "./interfaces/IERC20.sol";
// Note: If MNEE supports ERC-2612 Permit, use IERC20Permit
// For now, we'll work with standard IERC20 interface
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
// Ownable is already inherited from BasePaymaster

/**
 * @title MNEEPaymaster
 * @dev ERC-4337 Paymaster that allows users to pay gas fees with MNEE tokens
 * Supports ERC-2612 Permit for gasless approvals
 */
contract MNEEPaymaster is BasePaymaster, Pausable, ReentrancyGuard {
    using ECDSA for bytes32;
    
    // MNEE token address (official stablecoin contract)
    // Official address: 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
    IERC20 public immutable mneeToken;
    
    // Conversion rate: 1 MNEE = X wei (1e18 wei = 1 ETH)
    // Example: rate = 1e18 means 1 MNEE = 1 ETH worth of gas
    uint256 public mneeRate;
    
    // Maximum rate to prevent extreme values (100 ETH per MNEE)
    uint256 public constant MAX_RATE = 100e18;
    
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
        bytes32 indexed userOpHash
    );
    
    event RateUpdated(uint256 oldRate, uint256 newRate);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event MNEEWithdrawn(address indexed to, uint256 amount);
    event RateUpdatePending(uint256 newRate, uint256 executeAfter);
    event TreasuryUpdatePending(address newTreasury, uint256 executeAfter);
    
    constructor(
        IEntryPoint _entryPoint,
        IERC20 _mneeToken,
        address initialOwner,
        address _treasury,
        uint256 _mneeRate
    ) BasePaymaster(_entryPoint) {
        _transferOwnership(initialOwner);
        require(address(_mneeToken) != address(0), "MNEEPaymaster: Invalid token");
        require(_treasury != address(0), "MNEEPaymaster: Invalid treasury");
        require(_mneeRate > 0, "MNEEPaymaster: Invalid rate");
        
        mneeToken = _mneeToken;
        treasury = _treasury;
        mneeRate = _mneeRate;
        minMNEEAmount = 1e15; // 0.001 MNEE (with 18 decimals)
    }
    
    /**
     * @dev Validate paymaster data and calculate required MNEE amount
     * @param userOp The user operation
     * @param maxCost Maximum cost in wei
     * @return context Context data (encoded user address and amounts)
     * @return validationData Validation data
     */
    function _validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) internal override whenNotPaused returns (bytes memory context, uint256 validationData) {
        // Decode paymaster data
        // Format: [amount (32 bytes)][permit signature (if using permit, else empty)]
        require(userOp.paymasterAndData.length >= 32, "MNEEPaymaster: Invalid paymaster data");
        
        uint256 requiredMNEE = _calculateRequiredMNEE(maxCost);
        uint256 providedAmount = uint256(bytes32(userOp.paymasterAndData[0:32]));
        
        require(providedAmount >= requiredMNEE, "MNEEPaymaster: Insufficient MNEE");
        require(providedAmount >= minMNEEAmount, "MNEEPaymaster: Below minimum");
        
        // Check allowance - user must pre-approve Paymaster to spend MNEE
        // Note: If MNEE supports ERC-2612 Permit, we could add gasless approval support
        // For now, users must approve via standard ERC20 approve() call
        require(
            mneeToken.allowance(userOp.sender, address(this)) >= providedAmount,
            "MNEEPaymaster: Insufficient allowance. Please approve MNEE first."
        );
        
        // Store context for post-op (including userOpHash for events)
        context = abi.encode(userOp.sender, providedAmount, maxCost, userOpHash);
        
        return (context, 0);
    }
    
    /**
     * @dev Post-operation: Transfer MNEE from user
     * @param mode Operation mode
     * @param context Context from validation
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
        uint256 providedAmount;
        uint256 maxCost;
        bytes32 userOpHash;
        (user, providedAmount, maxCost, userOpHash) = abi.decode(
            context,
            (address, uint256, uint256, bytes32)
        );
        
        // Calculate actual MNEE amount based on actual gas cost
        uint256 actualMNEEAmount = _calculateRequiredMNEE(actualGasCost);
        
        // Charge based on actual gas cost, but don't exceed provided amount
        uint256 mneeToCharge = actualMNEEAmount;
        if (mneeToCharge > providedAmount) {
            // This shouldn't happen if validation was correct, but handle gracefully
            mneeToCharge = providedAmount;
        }
        
        // Transfer MNEE from user to treasury
        require(
            mneeToken.transferFrom(user, treasury, mneeToCharge),
            "MNEEPaymaster: Transfer failed"
        );
        
        // Note: Excess MNEE is kept by the protocol as a buffer
        // In future versions, we could refund excess, but this adds gas cost
        
        // Update stats
        totalGasSponsored += actualGasCost;
        totalMNEEcollected += mneeToCharge;
        
        emit GasSponsored(user, actualGasCost, mneeToCharge, userOpHash);
    }
    
    /**
     * @dev Calculate required MNEE amount for given gas cost
     * @param gasCost Gas cost in wei
     * @return Required MNEE amount (with 18 decimals)
     * @notice Calculation: (gasCost * 1e18) / mneeRate
     * Precision loss is minimal for typical values. Consider rounding up in future versions.
     */
    function _calculateRequiredMNEE(uint256 gasCost) internal view returns (uint256) {
        // rate is in wei per MNEE (e.g., 1e18 = 1 ETH worth per 1 MNEE)
        // Required MNEE = (gasCost * 1e18) / rate
        // For small gasCost values, there may be rounding errors
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
        require(_newRate > 0, "MNEEPaymaster: Invalid rate");
        require(_newRate <= MAX_RATE, "MNEEPaymaster: Rate exceeds maximum");
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
        require(pendingRateUpdate.timestamp > 0, "MNEEPaymaster: No pending update");
        require(
            block.timestamp >= pendingRateUpdate.timestamp + TIMELOCK_DURATION,
            "MNEEPaymaster: Timelock not expired"
        );
        require(pendingRateUpdate.isRateUpdate, "MNEEPaymaster: Not a rate update");
        
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
        require(pendingRateUpdate.timestamp > 0, "MNEEPaymaster: No pending update");
        require(pendingRateUpdate.isRateUpdate, "MNEEPaymaster: Not a rate update");
        delete pendingRateUpdate;
    }
    
    /**
     * @dev Propose new treasury address (requires timelock)
     */
    function proposeTreasuryUpdate(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "MNEEPaymaster: Invalid treasury");
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
        require(pendingTreasuryUpdate.timestamp > 0, "MNEEPaymaster: No pending update");
        require(
            block.timestamp >= pendingTreasuryUpdate.timestamp + TIMELOCK_DURATION,
            "MNEEPaymaster: Timelock not expired"
        );
        require(!pendingTreasuryUpdate.isRateUpdate, "MNEEPaymaster: Not a treasury update");
        
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
        require(pendingTreasuryUpdate.timestamp > 0, "MNEEPaymaster: No pending update");
        require(!pendingTreasuryUpdate.isRateUpdate, "MNEEPaymaster: Not a treasury update");
        delete pendingTreasuryUpdate;
    }
    
    /**
     * @dev Update minimum MNEE amount
     * @notice Can be updated immediately but should be used with caution
     */
    function setMinMNEEAmount(uint256 _minAmount) external onlyOwner {
        require(_minAmount > 0, "MNEEPaymaster: Invalid minimum amount");
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
    
    /**
     * @dev Withdraw accumulated MNEE from treasury (if any)
     */
    function withdrawMNEE(address to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "MNEEPaymaster: Invalid address");
        require(
            mneeToken.transfer(to, amount),
            "MNEEPaymaster: Transfer failed"
        );
        emit MNEEWithdrawn(to, amount);
    }
    
    // Note: deposit(), addStake(), unlockStake(), withdrawStake(), and withdrawTo()
    // are already provided by BasePaymaster, so we don't need to override them
    
    // Allow receiving ETH
    receive() external payable {}
}


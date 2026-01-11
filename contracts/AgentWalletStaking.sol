// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AgentWallet.sol";
import "./MNEECreditPool.sol";

/**
 * @title AgentWalletStaking
 * @dev Extension of AgentWallet that integrates with MNEECreditPool
 * Allows agents to stake MNEE and borrow from credit line
 */
contract AgentWalletStaking is AgentWallet {
    MNEECreditPool public immutable creditPool;
    
    // Track agent's staking position
    mapping(address => bool) public hasStaked;
    
    event StakedForAgent(address indexed agent, uint256 mneeAmount, uint256 timestamp);
    event BorrowedForAgent(address indexed agent, uint256 mneeAmount, uint256 timestamp);
    
    constructor(
        IEntryPoint _entryPoint,
        MNEECreditPool _creditPool,
        address initialOwner
    ) AgentWallet(_entryPoint, initialOwner) {
        creditPool = _creditPool;
    }
    
    /**
     * @dev Stake MNEE and borrow from credit line in one transaction (for agentic use)
     * @param mneeStakeAmount Amount of MNEE to stake
     * @param mneeBorrowAmount Amount of MNEE to borrow (must be within credit line)
     * @notice Must be called via EntryPoint execute() function
     */
    function stakeAndBorrow(uint256 mneeStakeAmount, uint256 mneeBorrowAmount) external onlyEntryPoint {
        // The MNEE token must be approved to creditPool first
        // This function should be called via execute() from EntryPoint
        
        // Stake MNEE - requires token approval first
        creditPool.stake(mneeStakeAmount);
        
        // Borrow MNEE from credit line
        if (mneeBorrowAmount > 0) {
            creditPool.borrowFromCreditLine(mneeBorrowAmount);
        }
        
        hasStaked[address(this)] = true;
        emit StakedForAgent(address(this), mneeStakeAmount, block.timestamp);
        if (mneeBorrowAmount > 0) {
            emit BorrowedForAgent(address(this), mneeBorrowAmount, block.timestamp);
        }
    }
    
    /**
     * @dev Get available credit line for this agent wallet
     */
    function getAvailableCredit() external view returns (uint256) {
        return creditPool.getAvailableCredit(address(this));
    }
    
    /**
     * @dev Repay borrowed MNEE
     * @param mneeAmount Amount to repay
     * @notice Must be called via EntryPoint execute() function
     */
    function repayCredit(uint256 mneeAmount) external onlyEntryPoint {
        creditPool.repayCredit(mneeAmount);
    }
    
    /**
     * @dev Claim staking rewards
     * @notice Must be called via EntryPoint execute() function
     */
    function claimStakingRewards() external onlyEntryPoint {
        creditPool.claimRewards();
    }
}

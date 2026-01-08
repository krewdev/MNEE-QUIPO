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
     */
    function stakeAndBorrow(uint256 mneeStakeAmount, uint256 mneeBorrowAmount) external {
        // This should be called via execute() from EntryPoint
        // The MNEE token must be approved to this contract first
        
        // Stake MNEE - requires token approval first
        creditPool.stake(mneeStakeAmount);
        
        // Borrow MNEE from credit line
        if (mneeBorrowAmount > 0) {
            creditPool.borrowFromCreditLine(mneeBorrowAmount);
        }
        
        hasStaked[msg.sender] = true;
        emit StakedForAgent(msg.sender, mneeStakeAmount, block.timestamp);
        if (mneeBorrowAmount > 0) {
            emit BorrowedForAgent(msg.sender, mneeBorrowAmount, block.timestamp);
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
     */
    function repayCredit(uint256 mneeAmount) external {
        // Can be called by owner or via EntryPoint
        creditPool.repayCredit(mneeAmount);
    }
    
    /**
     * @dev Claim staking rewards
     */
    function claimStakingRewards() external {
        // Can be called by owner or via EntryPoint
        creditPool.claimRewards();
    }
}

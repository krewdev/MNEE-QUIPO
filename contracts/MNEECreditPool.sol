// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IERC20.sol";

/**
 * @title MNEECreditPool
 * @dev Creative MNEE-native staking and credit system
 * 
 * Concept: "MNEE Credit Line" - Stake MNEE, get instant credit in MNEE
 * 
 * Features:
 * - Stake MNEE to earn yield (from protocol fees)
 * - Get instant MNEE credit line (up to 80% of stake)
 * - Borrow MNEE from credit line for agentic operations
 * - Repay anytime, interest only on borrowed amount
 * - Liquidity pool for instant borrowing
 * - Yield amplification through staking rewards
 */
contract MNEECreditPool is Ownable, ReentrancyGuard, Pausable {
    IERC20 public immutable mneeToken;
    
    // Pool parameters
    uint256 public totalStaked;
    uint256 public totalBorrowed;
    uint256 public totalLiquidity; // Available for borrowing
    uint256 public constant MIN_STAKE = 100e18; // 100 MNEE minimum
    uint256 public constant CREDIT_RATIO = 80; // 80% credit line (0.8x)
    uint256 public constant LIQUIDATION_THRESHOLD = 90; // 90% - liquidate if credit exceeds
    
    // Interest rates (basis points: 10000 = 100%)
    uint256 public stakingAPY = 800; // 8% APY for stakers
    uint256 public borrowingAPY = 1500; // 15% APY for borrowers
    uint256 public liquidityProviderAPY = 600; // 6% APY for liquidity providers
    
    // Staker/Credit user information
    struct CreditUser {
        uint256 stakedAmount;
        uint256 creditLine; // Maximum borrowable (80% of stake)
        uint256 borrowedAmount;
        uint256 lastUpdateTime;
        uint256 stakingRewards;
        uint256 interestOwed;
        bool isActive;
    }
    
    mapping(address => CreditUser) public creditUsers;
    address[] public userList;
    
    // Liquidity providers (those who add MNEE to the pool for others to borrow)
    struct LiquidityProvider {
        uint256 providedAmount;
        uint256 rewardsAccrued;
        uint256 lastUpdateTime;
    }
    
    mapping(address => LiquidityProvider) public liquidityProviders;
    
    // Protocol treasury (collects fees)
    address public treasury;
    uint256 public protocolFees;
    
    // Events
    event Staked(address indexed user, uint256 amount, uint256 creditLine, uint256 timestamp);
    event Unstaked(address indexed user, uint256 amount, uint256 timestamp);
    event CreditLineUsed(address indexed user, uint256 borrowedAmount, uint256 timestamp);
    event CreditRepaid(address indexed user, uint256 repaidAmount, uint256 interest, uint256 timestamp);
    event RewardsClaimed(address indexed user, uint256 amount, uint256 timestamp);
    event LiquidityProvided(address indexed provider, uint256 amount, uint256 timestamp);
    event LiquidityWithdrawn(address indexed provider, uint256 amount, uint256 timestamp);
    event Liquidated(address indexed user, uint256 mneeLiquidated, uint256 timestamp);
    
    constructor(
        address _mneeToken,
        address _treasury,
        address initialOwner
    ) {
        mneeToken = IERC20(_mneeToken);
        treasury = _treasury;
        _transferOwnership(initialOwner);
    }
    
    /**
     * @dev Stake MNEE and get instant credit line
     * @param amount Amount of MNEE to stake
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount >= MIN_STAKE, "MNEECreditPool: Amount below minimum");
        require(mneeToken.transferFrom(msg.sender, address(this), amount), "MNEECreditPool: Transfer failed");
        
        CreditUser storage user = creditUsers[msg.sender];
        
        // Update rewards if already staking
        if (user.isActive && user.stakedAmount > 0) {
            _updateRewards(msg.sender);
            _updateInterest(msg.sender);
        } else {
            // New user
            user.isActive = true;
            userList.push(msg.sender);
        }
        
        user.stakedAmount += amount;
        user.creditLine = (user.stakedAmount * CREDIT_RATIO) / 100;
        user.lastUpdateTime = block.timestamp;
        totalStaked += amount;
        
        emit Staked(msg.sender, amount, user.creditLine, block.timestamp);
    }
    
    /**
     * @dev Unstake MNEE (only if credit is repaid or within limits)
     * @param amount Amount to unstake
     */
    function unstake(uint256 amount) external nonReentrant {
        CreditUser storage user = creditUsers[msg.sender];
        require(user.isActive, "MNEECreditPool: Not staking");
        require(user.stakedAmount >= amount, "MNEECreditPool: Insufficient staked");
        
        _updateRewards(msg.sender);
        _updateInterest(msg.sender);
        
        uint256 newStaked = user.stakedAmount - amount;
        uint256 newCreditLine = (newStaked * CREDIT_RATIO) / 100;
        
        // Check if unstaking would make credit exceed new credit line
        require(
            user.borrowedAmount <= newCreditLine,
            "MNEECreditPool: Would exceed credit line"
        );
        
        user.stakedAmount = newStaked;
        user.creditLine = newCreditLine;
        totalStaked -= amount;
        
        require(mneeToken.transfer(msg.sender, amount), "MNEECreditPool: Transfer failed");
        
        emit Unstaked(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Borrow MNEE from credit line (instant, no approval needed)
     * @param amount Amount of MNEE to borrow
     */
    function borrowFromCreditLine(uint256 amount) external nonReentrant whenNotPaused {
        CreditUser storage user = creditUsers[msg.sender];
        require(user.isActive, "MNEECreditPool: Not staking");
        require(user.stakedAmount > 0, "MNEECreditPool: No stake");
        
        _updateInterest(msg.sender);
        
        uint256 newBorrowed = user.borrowedAmount + amount;
        require(newBorrowed <= user.creditLine, "MNEECreditPool: Exceeds credit line");
        require(amount <= totalLiquidity, "MNEECreditPool: Insufficient pool liquidity");
        
        user.borrowedAmount = newBorrowed;
        totalBorrowed += amount;
        totalLiquidity -= amount;
        
        require(mneeToken.transfer(msg.sender, amount), "MNEECreditPool: Transfer failed");
        
        emit CreditLineUsed(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Repay borrowed MNEE (principal + interest)
     * @param amount Amount to repay (will pay interest first, then principal)
     */
    function repayCredit(uint256 amount) external nonReentrant {
        CreditUser storage user = creditUsers[msg.sender];
        require(user.borrowedAmount > 0, "MNEECreditPool: No debt");
        
        _updateInterest(msg.sender);
        
        require(mneeToken.transferFrom(msg.sender, address(this), amount), "MNEECreditPool: Transfer failed");
        
        uint256 interestPaid = amount > user.interestOwed ? user.interestOwed : amount;
        uint256 principalPaid = amount - interestPaid;
        
        // Distribute interest: 50% to liquidity providers, 50% to protocol
        if (interestPaid > 0) {
            uint256 toLiquidity = interestPaid / 2;
            uint256 toProtocol = interestPaid - toLiquidity;
            
            // Add to liquidity pool (distributed to providers via rewards)
            totalLiquidity += toLiquidity;
            protocolFees += toProtocol;
        }
        
        user.interestOwed -= interestPaid;
        user.borrowedAmount -= principalPaid;
        totalBorrowed -= principalPaid;
        totalLiquidity += principalPaid;
        
        emit CreditRepaid(msg.sender, amount, interestPaid, block.timestamp);
    }
    
    /**
     * @dev Provide liquidity to the pool (earn yield from borrowers)
     * @param amount Amount of MNEE to provide
     */
    function provideLiquidity(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "MNEECreditPool: Amount must be > 0");
        require(mneeToken.transferFrom(msg.sender, address(this), amount), "MNEECreditPool: Transfer failed");
        
        LiquidityProvider storage provider = liquidityProviders[msg.sender];
        
        if (provider.providedAmount > 0) {
            _updateLiquidityRewards(msg.sender);
        }
        
        provider.providedAmount += amount;
        provider.lastUpdateTime = block.timestamp;
        totalLiquidity += amount;
        
        emit LiquidityProvided(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Withdraw liquidity (if not being used by borrowers)
     * @param amount Amount to withdraw
     */
    function withdrawLiquidity(uint256 amount) external nonReentrant {
        LiquidityProvider storage provider = liquidityProviders[msg.sender];
        require(provider.providedAmount >= amount, "MNEECreditPool: Insufficient provided");
        require(amount <= totalLiquidity, "MNEECreditPool: Insufficient pool liquidity");
        
        _updateLiquidityRewards(msg.sender);
        
        provider.providedAmount -= amount;
        totalLiquidity -= amount;
        
        require(mneeToken.transfer(msg.sender, amount), "MNEECreditPool: Transfer failed");
        
        emit LiquidityWithdrawn(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Claim staking rewards
     */
    function claimRewards() external nonReentrant {
        CreditUser storage user = creditUsers[msg.sender];
        require(user.isActive, "MNEECreditPool: Not staking");
        
        _updateRewards(msg.sender);
        
        uint256 rewards = user.stakingRewards;
        require(rewards > 0, "MNEECreditPool: No rewards");
        
        user.stakingRewards = 0;
        require(mneeToken.transfer(msg.sender, rewards), "MNEECreditPool: Transfer failed");
        
        emit RewardsClaimed(msg.sender, rewards, block.timestamp);
    }
    
    /**
     * @dev Claim liquidity provider rewards
     */
    function claimLiquidityRewards() external nonReentrant {
        LiquidityProvider storage provider = liquidityProviders[msg.sender];
        require(provider.providedAmount > 0, "MNEECreditPool: No liquidity provided");
        
        _updateLiquidityRewards(msg.sender);
        
        uint256 rewards = provider.rewardsAccrued;
        require(rewards > 0, "MNEECreditPool: No rewards");
        
        provider.rewardsAccrued = 0;
        require(mneeToken.transfer(msg.sender, rewards), "MNEECreditPool: Transfer failed");
    }
    
    /**
     * @dev Liquidate over-leveraged position
     * @param userAddress Address of user to liquidate
     */
    function liquidate(address userAddress) external nonReentrant {
        CreditUser storage user = creditUsers[userAddress];
        require(user.isActive, "MNEECreditPool: Not staking");
        require(user.borrowedAmount > 0, "MNEECreditPool: No debt");
        
        _updateInterest(userAddress);
        
        uint256 creditUtilization = (user.borrowedAmount * 100) / user.creditLine;
        require(creditUtilization >= LIQUIDATION_THRESHOLD, "MNEECreditPool: Not liquidatable");
        
        // Liquidate: take staked MNEE, repay debt
        uint256 debt = user.borrowedAmount + user.interestOwed;
        uint256 mneeToLiquidate = user.stakedAmount;
        
        // Liquidator gets 5% bonus
        uint256 liquidatorBonus = (mneeToLiquidate * 5) / 100;
        uint256 toPool = mneeToLiquidate - liquidatorBonus;
        
        require(mneeToken.transfer(msg.sender, liquidatorBonus), "MNEECreditPool: Transfer failed");
        
        // Repay debt to pool
        totalLiquidity += toPool;
        totalBorrowed -= user.borrowedAmount;
        totalStaked -= mneeToLiquidate;
        
        user.stakedAmount = 0;
        user.borrowedAmount = 0;
        user.creditLine = 0;
        user.interestOwed = 0;
        user.isActive = false;
        
        emit Liquidated(userAddress, mneeToLiquidate, block.timestamp);
    }
    
    /**
     * @dev Get available credit for user
     */
    function getAvailableCredit(address userAddress) external view returns (uint256) {
        CreditUser memory user = creditUsers[userAddress];
        if (user.borrowedAmount >= user.creditLine) return 0;
        return user.creditLine - user.borrowedAmount;
    }
    
    /**
     * @dev Get user information
     */
    function getUserInfo(address userAddress) external view returns (
        uint256 stakedAmount,
        uint256 creditLine,
        uint256 borrowedAmount,
        uint256 availableCredit,
        uint256 stakingRewards,
        uint256 interestOwed,
        bool isActive
    ) {
        CreditUser memory user = creditUsers[userAddress];
        return (
            user.stakedAmount,
            user.creditLine,
            user.borrowedAmount,
            user.creditLine > user.borrowedAmount ? user.creditLine - user.borrowedAmount : 0,
            user.stakingRewards + _calculateRewards(userAddress),
            user.interestOwed + _calculateInterest(userAddress),
            user.isActive
        );
    }
    
    // Internal functions
    
    function _updateRewards(address userAddress) internal {
        CreditUser storage user = creditUsers[userAddress];
        if (user.stakedAmount == 0) return;
        
        uint256 newRewards = _calculateRewards(userAddress);
        user.stakingRewards += newRewards;
        user.lastUpdateTime = block.timestamp;
    }
    
    function _updateInterest(address userAddress) internal {
        CreditUser storage user = creditUsers[userAddress];
        if (user.borrowedAmount == 0) return;
        
        uint256 newInterest = _calculateInterest(userAddress);
        user.interestOwed += newInterest;
        user.lastUpdateTime = block.timestamp;
    }
    
    function _updateLiquidityRewards(address providerAddress) internal {
        LiquidityProvider storage provider = liquidityProviders[providerAddress];
        if (provider.providedAmount == 0) return;
        
        uint256 newRewards = _calculateLiquidityRewards(providerAddress);
        provider.rewardsAccrued += newRewards;
        provider.lastUpdateTime = block.timestamp;
    }
    
    function _calculateRewards(address userAddress) internal view returns (uint256) {
        CreditUser memory user = creditUsers[userAddress];
        if (user.stakedAmount == 0 || user.lastUpdateTime == 0) return 0;
        
        uint256 timeElapsed = block.timestamp - user.lastUpdateTime;
        uint256 annualReward = (user.stakedAmount * stakingAPY) / 10000;
        return (annualReward * timeElapsed) / 365 days;
    }
    
    function _calculateInterest(address userAddress) internal view returns (uint256) {
        CreditUser memory user = creditUsers[userAddress];
        if (user.borrowedAmount == 0 || user.lastUpdateTime == 0) return 0;
        
        uint256 timeElapsed = block.timestamp - user.lastUpdateTime;
        uint256 annualInterest = (user.borrowedAmount * borrowingAPY) / 10000;
        return (annualInterest * timeElapsed) / 365 days;
    }
    
    function _calculateLiquidityRewards(address providerAddress) internal view returns (uint256) {
        LiquidityProvider memory provider = liquidityProviders[providerAddress];
        if (provider.providedAmount == 0 || totalLiquidity == 0) return 0;
        if (provider.lastUpdateTime == 0) return 0;
        
        // Rewards come from borrower interest
        // Distributed pro-rata based on liquidity provided
        uint256 timeElapsed = block.timestamp - provider.lastUpdateTime;
        uint256 providerShare = (provider.providedAmount * 10000) / totalLiquidity;
        uint256 annualReward = (totalBorrowed * borrowingAPY * providerShare) / (10000 * 10000);
        return (annualReward * timeElapsed) / 365 days;
    }
    
    // Admin functions
    
    function setRates(uint256 _stakingAPY, uint256 _borrowingAPY, uint256 _liquidityAPY) external onlyOwner {
        require(_stakingAPY <= 5000, "MNEECreditPool: Staking APY too high");
        require(_borrowingAPY <= 5000, "MNEECreditPool: Borrowing APY too high");
        require(_liquidityAPY <= 5000, "MNEECreditPool: Liquidity APY too high");
        stakingAPY = _stakingAPY;
        borrowingAPY = _borrowingAPY;
        liquidityProviderAPY = _liquidityAPY;
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "MNEECreditPool: Invalid address");
        treasury = _treasury;
    }
    
    function withdrawProtocolFees() external onlyOwner {
        require(protocolFees > 0, "MNEECreditPool: No fees");
        uint256 fees = protocolFees;
        protocolFees = 0;
        require(mneeToken.transfer(treasury, fees), "MNEECreditPool: Transfer failed");
    }
}


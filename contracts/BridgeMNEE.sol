// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./MNEETokenUTXO.sol";
import "./interfaces/IERC20.sol";

/**
 * @title BridgeMNEE
 * @dev Bridge contract for moving MNEE between Bitcoin Ordinals (UTXO) and EVM chains
 * 
 * Flow:
 * Bitcoin → EVM: User locks/burns MNEE on Bitcoin, proves it, then mints on EVM
 * EVM → Bitcoin: User locks/burns MNEE on EVM, proves it, then releases on Bitcoin
 */
contract BridgeMNEE is Ownable, ReentrancyGuard {
    MNEETokenUTXO public immutable utxoToken; // UTXO-based MNEE on EVM
    IERC20 public immutable erc20Token; // ERC-20 MNEE (for standard transfers)
    
    // Bitcoin transaction proofs
    struct BitcoinProof {
        bytes32 txHash;
        uint256 blockHeight;
        bytes merkleProof;
        uint256 utxoAmount; // Amount locked/burned on Bitcoin
        address recipient; // EVM recipient address
        uint256 timestamp;
        bool claimed;
    }
    
    // Mapping from Bitcoin TX hash to proof
    mapping(bytes32 => BitcoinProof) public bitcoinProofs;
    
    // EVM → Bitcoin lock/burn records
    struct EVMLock {
        bytes32 lockId;
        address sender;
        uint256 amount;
        string bitcoinAddress; // Target Bitcoin address
        uint256 timestamp;
        bool processed;
        bool isUTXO; // true if locked via UTXO model, false if ERC20
        bytes32[] utxoIds; // UTXO IDs if locked via UTXO model
    }
    
    mapping(bytes32 => EVMLock) public evmLocks;
    uint256 public lockNonce;
    
    // Events
    event BitcoinDeposit(
        bytes32 indexed txHash,
        address indexed recipient,
        uint256 amount,
        uint256 blockHeight
    );
    
    event BitcoinClaimed(
        bytes32 indexed txHash,
        address indexed recipient,
        uint256 amount
    );
    
    event EVMLocked(
        bytes32 indexed lockId,
        address indexed sender,
        uint256 amount,
        string bitcoinAddress
    );
    
    event EVMReleased(
        bytes32 indexed lockId,
        bytes32 bitcoinTxHash,
        string bitcoinAddress,
        uint256 amount
    );
    
    constructor(
        address initialOwner,
        address _utxoToken,
        address _erc20Token
    ) {
        _transferOwnership(initialOwner);
        utxoToken = MNEETokenUTXO(_utxoToken);
        erc20Token = IERC20(_erc20Token);
    }
    
    /**
     * @dev Submit proof of Bitcoin transaction (locking/burning MNEE)
     * Called after user sends MNEE to bridge address on Bitcoin
     */
    function submitBitcoinProof(
        bytes32 txHash,
        uint256 blockHeight,
        bytes calldata merkleProof,
        uint256 utxoAmount,
        address recipient
    ) external onlyOwner {
        require(!bitcoinProofs[txHash].claimed, "BridgeMNEE: Already claimed");
        require(recipient != address(0), "BridgeMNEE: Invalid recipient");
        require(utxoAmount > 0, "BridgeMNEE: Invalid amount");
        
        // SECURITY NOTE: Merkle proof verification is required for production
        // Currently this is a placeholder - in production you MUST:
        // 1. Verify the merkle proof against a Bitcoin block header
        // 2. Use a Bitcoin light client or oracle network (e.g., Chainlink, Wormhole)
        // 3. Verify block confirmation depth
        // 4. Verify transaction inclusion in the merkle tree
        // 
        // Without proper verification, anyone could submit fake proofs.
        // For hackathon demo, this is acceptable but MUST be fixed before mainnet.
        
        bitcoinProofs[txHash] = BitcoinProof({
            txHash: txHash,
            blockHeight: blockHeight,
            merkleProof: merkleProof,
            utxoAmount: utxoAmount,
            recipient: recipient,
            timestamp: block.timestamp,
            claimed: false
        });
        
        emit BitcoinDeposit(txHash, recipient, utxoAmount, blockHeight);
    }
    
    /**
     * @dev Claim MNEE on EVM after Bitcoin deposit is proven
     * Mints UTXOs on EVM side to match Bitcoin UTXOs
     */
    function claimBitcoinDeposit(bytes32 txHash) external nonReentrant {
        BitcoinProof storage proof = bitcoinProofs[txHash];
        require(proof.recipient == msg.sender, "BridgeMNEE: Not your deposit");
        require(!proof.claimed, "BridgeMNEE: Already claimed");
        require(proof.utxoAmount > 0, "BridgeMNEE: Invalid proof");
        
        // Mark as claimed
        proof.claimed = true;
        
        // Mint UTXOs on EVM side
        // The bridge contract must be the owner of the UTXO token to mint
        // Mint creates a new UTXO for the recipient matching the Bitcoin UTXO amount
        utxoToken.mint(proof.recipient, proof.utxoAmount);
        
        emit BitcoinClaimed(txHash, proof.recipient, proof.utxoAmount);
    }
    
    /**
     * @dev Lock/burn MNEE on EVM to prepare for Bitcoin release
     * User calls this to initiate EVM → Bitcoin bridge
     * 
     * Supports both ERC20 and UTXO token models:
     * - For ERC20: User approves and transfers tokens to bridge
     * - For UTXO: User should use lockForBitcoinUTXO() function instead
     */
    function lockForBitcoin(
        uint256 amount,
        string calldata bitcoinAddress
    ) external nonReentrant {
        require(amount > 0, "BridgeMNEE: Invalid amount");
        require(bytes(bitcoinAddress).length > 0, "BridgeMNEE: Invalid Bitcoin address");
        
        // Transfer MNEE to this contract (locking it)
        // User must approve this contract first (ERC20 model)
        require(
            erc20Token.transferFrom(msg.sender, address(this), amount),
            "BridgeMNEE: Transfer failed"
        );
        
        bytes32 lockId = keccak256(
            abi.encodePacked(msg.sender, block.timestamp, lockNonce++)
        );
        
        evmLocks[lockId] = EVMLock({
            lockId: lockId,
            sender: msg.sender,
            amount: amount,
            bitcoinAddress: bitcoinAddress,
            timestamp: block.timestamp,
            processed: false,
            isUTXO: false,
            utxoIds: new bytes32[](0)
        });
        
        emit EVMLocked(lockId, msg.sender, amount, bitcoinAddress);
    }
    
    /**
     * @dev Lock UTXOs for Bitcoin bridge (UTXO model)
     * User spends UTXOs to bridge address, preparing for Bitcoin release
     */
    function lockForBitcoinUTXO(
        bytes32[] calldata inputUTXOIds,
        uint256 amount,
        string calldata bitcoinAddress
    ) external nonReentrant {
        require(inputUTXOIds.length > 0, "BridgeMNEE: No input UTXOs");
        require(amount > 0, "BridgeMNEE: Invalid amount");
        require(bytes(bitcoinAddress).length > 0, "BridgeMNEE: Invalid Bitcoin address");
        
        // Validate that total input UTXO value matches or exceeds the amount parameter
        uint256 totalInputValue = 0;
        for (uint256 i = 0; i < inputUTXOIds.length; i++) {
            MNEETokenUTXO.UTXO memory utxo = utxoToken.getUTXO(inputUTXOIds[i]);
            require(utxo.owner == msg.sender, "BridgeMNEE: Not owner of input UTXO");
            require(!utxo.spent, "BridgeMNEE: UTXO already spent");
            totalInputValue += utxo.amount;
        }
        require(totalInputValue >= amount, "BridgeMNEE: Insufficient UTXO value");
        
        // Transfer UTXOs to bridge (user spends their UTXOs, creates output to bridge)
        uint256[] memory outputAmounts = new uint256[](1);
        address[] memory outputOwners = new address[](1);
        outputAmounts[0] = amount;
        outputOwners[0] = address(this);
        
        utxoToken.transfer(inputUTXOIds, outputAmounts, outputOwners);
        
        bytes32 lockId = keccak256(
            abi.encodePacked(msg.sender, block.timestamp, lockNonce++)
        );
        
        evmLocks[lockId] = EVMLock({
            lockId: lockId,
            sender: msg.sender,
            amount: amount,
            bitcoinAddress: bitcoinAddress,
            timestamp: block.timestamp,
            processed: false,
            isUTXO: true,
            utxoIds: inputUTXOIds
        });
        
        emit EVMLocked(lockId, msg.sender, amount, bitcoinAddress);
    }
    
    /**
     * @dev Release MNEE on Bitcoin side (called by bridge operator/oracle)
     * After verifying EVM lock, bridge operator creates Bitcoin transaction
     * Burns ERC20 tokens or keeps UTXOs in escrow (UTXOs remain locked in contract)
     */
    function markEVMLockProcessed(
        bytes32 lockId,
        bytes32 bitcoinTxHash
    ) external onlyOwner {
        EVMLock storage lock = evmLocks[lockId];
        require(!lock.processed, "BridgeMNEE: Already processed");
        require(lock.amount > 0, "BridgeMNEE: Invalid lock");
        
        lock.processed = true;
        
        // For ERC20 model: Tokens remain locked in contract (escrow)
        // They can be manually transferred to address(0) or burned if token supports it
        // For UTXO model: UTXOs remain locked in contract as escrow
        // Note: Since we're using external MNEE contract, we keep tokens in escrow
        // Owner can manually burn/transfer them later if needed
        
        emit EVMReleased(lockId, bitcoinTxHash, lock.bitcoinAddress, lock.amount);
    }
    
    /**
     * @dev Emergency function to unlock if Bitcoin release fails (ERC20 model)
     */
    function unlockEVMLock(bytes32 lockId) external onlyOwner {
        EVMLock storage lock = evmLocks[lockId];
        require(!lock.processed, "BridgeMNEE: Already processed");
        require(lock.amount > 0, "BridgeMNEE: Invalid lock");
        require(!lock.isUTXO, "BridgeMNEE: Use unlockEVMLockUTXO for UTXO locks");
        
        lock.processed = true;
        
        // Return locked ERC20 tokens to user
        require(
            erc20Token.transfer(lock.sender, lock.amount),
            "BridgeMNEE: Unlock transfer failed"
        );
        
        emit EVMReleased(lockId, bytes32(0), lock.bitcoinAddress, lock.amount);
    }
    
    /**
     * @dev Emergency function to unlock UTXOs if Bitcoin release fails (UTXO model)
     */
    function unlockEVMLockUTXO(bytes32 lockId) external onlyOwner {
        EVMLock storage lock = evmLocks[lockId];
        require(!lock.processed, "BridgeMNEE: Already processed");
        require(lock.amount > 0, "BridgeMNEE: Invalid lock");
        require(lock.isUTXO, "BridgeMNEE: Use unlockEVMLock for ERC20 locks");
        require(lock.utxoIds.length > 0, "BridgeMNEE: No UTXOs to unlock");
        
        lock.processed = true;
        
        // Get the UTXOs that were locked (they should be owned by this contract)
        // We need to transfer them back to the user
        // Since UTXOs are locked in contract, we create new UTXOs for the user
        utxoToken.mint(lock.sender, lock.amount);
        
        emit EVMReleased(lockId, bytes32(0), lock.bitcoinAddress, lock.amount);
    }
    
    /**
     * @dev Burn locked ERC20 tokens (after Bitcoin release is confirmed)
     * Can be called by owner to burn tokens that were locked for Bitcoin bridge
     */
    function burnLockedERC20(uint256 amount) external onlyOwner {
        require(amount > 0, "BridgeMNEE: Invalid amount");
        require(erc20Token.balanceOf(address(this)) >= amount, "BridgeMNEE: Insufficient balance");
        
        // Attempt to transfer to address(0) as burn mechanism
        // If token doesn't allow this, owner must use token's burn function directly
        require(
            erc20Token.transfer(address(0), amount),
            "BridgeMNEE: Burn transfer failed. Token may not allow transfers to address(0)"
        );
    }
}


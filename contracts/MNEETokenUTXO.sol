// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title MNEETokenUTXO
 * @dev UTXO-based token implementation for MNEE
 * Each token is represented as an Unspent Transaction Output (UTXO)
 */
contract MNEETokenUTXO is Ownable, ReentrancyGuard {
    // Maximum supply: 1 billion tokens
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    uint256 public totalSupply;
    
    // UTXO structure
    struct UTXO {
        address owner;
        uint256 amount;
        uint256 blockCreated;
        bool spent;
    }
    
    // Mapping from UTXO ID to UTXO
    mapping(bytes32 => UTXO) public utxos;
    
    // Mapping from owner to list of UTXO IDs they own
    // NOTE: This array grows and includes spent UTXOs, making balanceOf() and getUnspentUTXOs()
    // more expensive over time. In production, consider:
    // 1. Removing spent UTXOs from array (expensive but cleans up)
    // 2. Using a separate mapping for unspent UTXOs only
    // 3. Implementing a cleanup mechanism for old spent UTXOs
    mapping(address => bytes32[]) public ownerUTXOs;
    
    // Track spent UTXOs to prevent double-spending
    mapping(bytes32 => bool) public isSpent;
    
    // Nonce for UTXO creation (ensures uniqueness)
    uint256 private nonce;
    
    // Events
    event UTXOCreated(
        bytes32 indexed utxoId,
        address indexed owner,
        uint256 amount,
        uint256 blockNumber
    );
    
    event UTXOSpent(
        bytes32 indexed utxoId,
        address indexed from,
        uint256 amount
    );
    
    event Transfer(
        bytes32[] indexed inputUTXOs,
        bytes32[] indexed outputUTXOs,
        address indexed from,
        address to,
        uint256 amount
    );
    
    constructor(address initialOwner) {
        _transferOwnership(initialOwner);
        // Create initial UTXOs for the owner
        // _createUTXO already sets totalSupply, so no need to set it again
        _createUTXO(initialOwner, MAX_SUPPLY);
    }
    
    /**
     * @dev Generate a unique UTXO ID
     */
    function _generateUTXOId(address owner, uint256 amount) private view returns (bytes32) {
        return keccak256(abi.encodePacked(
            owner,
            amount,
            block.timestamp,
            block.prevrandao,
            nonce,
            msg.sender
        ));
    }
    
    /**
     * @dev Create a new UTXO
     */
    function _createUTXO(address owner, uint256 amount) private returns (bytes32) {
        require(amount > 0, "MNEETokenUTXO: Amount must be greater than 0");
        require(totalSupply + amount <= MAX_SUPPLY, "MNEETokenUTXO: Exceeds max supply");
        
        bytes32 utxoId = _generateUTXOId(owner, amount);
        require(!isSpent[utxoId], "MNEETokenUTXO: UTXO ID collision");
        
        utxos[utxoId] = UTXO({
            owner: owner,
            amount: amount,
            blockCreated: block.number,
            spent: false
        });
        
        ownerUTXOs[owner].push(utxoId);
        nonce++;
        
        totalSupply += amount;
        
        emit UTXOCreated(utxoId, owner, amount, block.number);
        
        return utxoId;
    }
    
    /**
     * @dev Get balance of an address (sum of all unspent UTXOs)
     */
    function balanceOf(address owner) external view returns (uint256) {
        bytes32[] memory owned = ownerUTXOs[owner];
        uint256 balance = 0;
        
        for (uint256 i = 0; i < owned.length; i++) {
            UTXO memory utxo = utxos[owned[i]];
            if (!utxo.spent && utxo.owner == owner) {
                balance += utxo.amount;
            }
        }
        
        return balance;
    }
    
    /**
     * @dev Get all unspent UTXOs for an address
     */
    function getUnspentUTXOs(address owner) external view returns (bytes32[] memory, uint256[] memory) {
        bytes32[] memory owned = ownerUTXOs[owner];
        uint256 unspentCount = 0;
        
        // First pass: count unspent UTXOs
        for (uint256 i = 0; i < owned.length; i++) {
            if (!utxos[owned[i]].spent && utxos[owned[i]].owner == owner) {
                unspentCount++;
            }
        }
        
        // Second pass: collect unspent UTXOs
        bytes32[] memory unspentIds = new bytes32[](unspentCount);
        uint256[] memory amounts = new uint256[](unspentCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < owned.length; i++) {
            UTXO memory utxo = utxos[owned[i]];
            if (!utxo.spent && utxo.owner == owner) {
                unspentIds[index] = owned[i];
                amounts[index] = utxo.amount;
                index++;
            }
        }
        
        return (unspentIds, amounts);
    }
    
    /**
     * @dev Get minimum UTXOs needed to cover a required amount (MNEE-compatible)
     * This function stops fetching once the required amount is reached, making it more efficient
     * than getUnspentUTXOs for transaction preparation.
     * 
     * @param owner Address to get UTXOs for
     * @param requiredAmount Minimum amount needed (in atomic units, 18 decimals)
     * @return utxoIds Array of UTXO IDs that cover the required amount
     * @return amounts Array of amounts for each UTXO
     * @return totalAmount Total amount of selected UTXOs
     */
    function getEnoughUtxos(
        address owner,
        uint256 requiredAmount
    ) external view returns (
        bytes32[] memory utxoIds,
        uint256[] memory amounts,
        uint256 totalAmount
    ) {
        bytes32[] memory owned = ownerUTXOs[owner];
        
        // First pass: collect UTXOs until we have enough
        // Use dynamic arrays that we'll resize later
        bytes32[] memory tempIds = new bytes32[](owned.length);
        uint256[] memory tempAmounts = new uint256[](owned.length);
        uint256 count = 0;
        totalAmount = 0;
        
        for (uint256 i = 0; i < owned.length && totalAmount < requiredAmount; i++) {
            UTXO memory utxo = utxos[owned[i]];
            if (!utxo.spent && utxo.owner == owner) {
                tempIds[count] = owned[i];
                tempAmounts[count] = utxo.amount;
                totalAmount += utxo.amount;
                count++;
            }
        }
        
        // Check if we have enough
        require(totalAmount >= requiredAmount, "MNEETokenUTXO: Insufficient UTXOs");
        
        // Resize arrays to actual count
        utxoIds = new bytes32[](count);
        amounts = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            utxoIds[i] = tempIds[i];
            amounts[i] = tempAmounts[i];
        }
        
        return (utxoIds, amounts, totalAmount);
    }
    
    /**
     * @dev Transfer tokens using UTXO model
     * @param inputUTXOIds Array of UTXO IDs to spend
     * @param outputAmounts Array of amounts for output UTXOs
     * @param outputOwners Array of owners for output UTXOs
     */
    function transfer(
        bytes32[] calldata inputUTXOIds,
        uint256[] calldata outputAmounts,
        address[] calldata outputOwners
    ) external nonReentrant {
        require(inputUTXOIds.length > 0, "MNEETokenUTXO: No inputs");
        require(outputAmounts.length > 0, "MNEETokenUTXO: No outputs");
        require(outputAmounts.length == outputOwners.length, "MNEETokenUTXO: Array length mismatch");
        
        uint256 totalInput = 0;
        uint256 totalOutput = 0;
        
        // Validate and spend input UTXOs
        for (uint256 i = 0; i < inputUTXOIds.length; i++) {
            bytes32 utxoId = inputUTXOIds[i];
            UTXO storage utxo = utxos[utxoId];
            
            require(utxo.owner == msg.sender, "MNEETokenUTXO: Not owner of input UTXO");
            require(!utxo.spent, "MNEETokenUTXO: UTXO already spent");
            require(!isSpent[utxoId], "MNEETokenUTXO: UTXO already spent");
            
            totalInput += utxo.amount;
            utxo.spent = true;
            isSpent[utxoId] = true;
            
            emit UTXOSpent(utxoId, msg.sender, utxo.amount);
        }
        
        // Calculate total output before creating UTXOs (gas optimization)
        for (uint256 i = 0; i < outputAmounts.length; i++) {
            require(outputAmounts[i] > 0, "MNEETokenUTXO: Output amount must be greater than 0");
            require(outputOwners[i] != address(0), "MNEETokenUTXO: Invalid output owner");
            totalOutput += outputAmounts[i];
        }
        
        // Validate input covers output before state changes
        require(totalInput >= totalOutput, "MNEETokenUTXO: Insufficient input amount");
        
        // Create output UTXOs (after validation)
        bytes32[] memory outputUTXOIds = new bytes32[](outputAmounts.length);
        
        for (uint256 i = 0; i < outputAmounts.length; i++) {
            bytes32 outputId = _createUTXO(outputOwners[i], outputAmounts[i]);
            outputUTXOIds[i] = outputId;
        }
        
        // If there's change, send it back to sender
        if (totalInput > totalOutput) {
            uint256 change = totalInput - totalOutput;
            _createUTXO(msg.sender, change);
        }
        
        emit Transfer(inputUTXOIds, outputUTXOIds, msg.sender, outputOwners[0], totalOutput);
    }
    
    /**
     * @dev Mint new UTXOs (only owner)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "MNEETokenUTXO: Invalid address");
        _createUTXO(to, amount);
    }
    
    /**
     * @dev Burn UTXOs (mark as spent with no outputs)
     */
    function burn(bytes32[] calldata utxoIds) external nonReentrant {
        uint256 totalBurned = 0;
        
        for (uint256 i = 0; i < utxoIds.length; i++) {
            bytes32 utxoId = utxoIds[i];
            UTXO storage utxo = utxos[utxoId];
            
            require(utxo.owner == msg.sender, "MNEETokenUTXO: Not owner of UTXO");
            require(!utxo.spent, "MNEETokenUTXO: UTXO already spent");
            require(!isSpent[utxoId], "MNEETokenUTXO: UTXO already spent");
            
            totalBurned += utxo.amount;
            utxo.spent = true;
            isSpent[utxoId] = true;
            
            emit UTXOSpent(utxoId, msg.sender, utxo.amount);
        }
        
        totalSupply -= totalBurned;
    }
    
    /**
     * @dev Get UTXO details
     */
    function getUTXO(bytes32 utxoId) external view returns (UTXO memory) {
        return utxos[utxoId];
    }
}


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IUSDC
 * @dev Interface for USDC token (ERC-20 with 6 decimals)
 */
interface IUSDC {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    
    // USDC specific (6 decimals)
    function decimals() external view returns (uint8);
}


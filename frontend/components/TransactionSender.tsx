"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useReadContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { parseEther, formatEther } from "viem";

const PaymasterABI = [
  "function calculateRequiredMNEE(uint256 gasCost) view returns (uint256)",
] as const;

const MNEETokenABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
] as const;

interface TransactionSenderProps {
  paymasterAddress: string;
  mneeTokenAddress: string;
  userAddress: string;
}

export default function TransactionSender({
  paymasterAddress,
  mneeTokenAddress,
  userAddress,
}: TransactionSenderProps) {
  const [gasEstimate, setGasEstimate] = useState<string>("21000");
  const [gasPrice, setGasPrice] = useState<string>("20"); // gwei
  const chainId = useChainId();

  // Calculate required MNEE for gas
  const gasCost = gasEstimate && gasPrice 
    ? BigInt(gasEstimate) * parseEther(gasPrice, "gwei")
    : BigInt(0);

  const { 
    data: requiredMNEE, 
    isLoading: isLoadingRequired,
    isError: isRequiredError 
  } = useReadContract({
    address: paymasterAddress as `0x${string}`,
    abi: PaymasterABI,
    functionName: "calculateRequiredMNEE",
    args: [gasCost],
    query: {
      enabled: !!paymasterAddress && !!gasEstimate && !!gasPrice && gasCost > 0,
    },
  });

  const { data: allowance, isLoading: isLoadingAllowance } = useReadContract({
    address: mneeTokenAddress as `0x${string}`,
    abi: MNEETokenABI,
    functionName: "allowance",
    args: [userAddress as `0x${string}`, paymasterAddress as `0x${string}`],
    query: {
      enabled: !!mneeTokenAddress && !!userAddress && !!paymasterAddress,
      refetchInterval: 5000,
    },
  });

  const { data: balance } = useReadContract({
    address: mneeTokenAddress as `0x${string}`,
    abi: MNEETokenABI,
    functionName: "balanceOf",
    args: [userAddress as `0x${string}`],
    query: {
      enabled: !!mneeTokenAddress && !!userAddress,
    },
  });

  const { 
    writeContract: approve, 
    isPending: isApproving,
    data: approveHash,
    error: approveError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isApproveSuccess, isError: txError } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const handleApprove = () => {
    if (!requiredMNEE || !mneeTokenAddress || !paymasterAddress) return;
    if (typeof requiredMNEE !== 'bigint') return;

    try {
      // Approve slightly more than required for safety
      const approveAmount = (requiredMNEE * BigInt(110)) / BigInt(100);

      approve({
        address: mneeTokenAddress as `0x${string}`,
        abi: MNEETokenABI,
        functionName: "approve",
        args: [paymasterAddress as `0x${string}`, approveAmount],
      });
    } catch (error) {
      console.error("Error approving:", error);
    }
  };

  const needsApproval =
    requiredMNEE && typeof requiredMNEE === 'bigint' && allowance && typeof allowance === 'bigint'
      ? allowance < requiredMNEE * BigInt(110) / BigInt(100)
      : true;

  // Type guard for requiredMNEE
  const requiredMNEEBigInt = requiredMNEE && typeof requiredMNEE === 'bigint' ? requiredMNEE : null;
  const balanceBigInt = balance && typeof balance === 'bigint' ? balance : null;
  const hasInsufficientBalance = requiredMNEEBigInt && balanceBigInt 
    ? balanceBigInt < requiredMNEEBigInt 
    : false;

  const getExplorerUrl = (txHash: string) => {
    if (chainId === 11155111) return `https://sepolia.etherscan.io/tx/${txHash}`;
    if (chainId === 1) return `https://etherscan.io/tx/${txHash}`;
    if (chainId === 8453) return `https://basescan.org/tx/${txHash}`;
    if (chainId === 137) return `https://polygonscan.com/tx/${txHash}`;
    if (chainId === 42161) return `https://arbiscan.io/tx/${txHash}`;
    return `https://etherscan.io/tx/${txHash}`;
  };

  const errorMessage = approveError?.message || (txError && "Transaction failed");

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-gray-700">
      <h2 className="text-xl md:text-2xl font-bold mb-4">Send Gasless Transaction</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">Gas Estimate (units)</label>
          <input
            type="number"
            value={gasEstimate}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || (!isNaN(Number(value)) && Number(value) >= 0)) {
                setGasEstimate(value);
              }
            }}
            className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="21000"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">Gas Price (gwei)</label>
          <input
            type="number"
            value={gasPrice}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || (!isNaN(Number(value)) && Number(value) >= 0)) {
                setGasPrice(value);
              }
            }}
            className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="20"
            min="0"
            step="0.1"
          />
        </div>

        {isLoadingRequired && gasCost > 0 && (
          <div className="bg-gray-700/50 border border-gray-600 rounded p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 mr-2"></div>
              <p className="text-gray-400 text-sm">Calculating required MNEE...</p>
            </div>
          </div>
        )}

        {isRequiredError && (
          <div className="bg-red-900/30 border border-red-500/50 rounded p-4">
            <p className="text-red-400 text-sm">Error calculating required MNEE. Please check your inputs.</p>
          </div>
        )}

        {requiredMNEEBigInt && !isLoadingRequired && (
          <div className="bg-purple-900/30 border border-purple-500/50 rounded p-4">
            <p className="text-purple-400 font-semibold mb-2 text-sm">Required MNEE</p>
            <p className="text-xl md:text-2xl font-bold">
              {parseFloat(formatEther(requiredMNEEBigInt)).toFixed(6)} MNEE
            </p>
            <p className="text-xs md:text-sm text-gray-400 mt-1">
              Gas Cost: {formatEther(gasCost)} ETH
            </p>
            {balanceBigInt && (
              <p className="text-xs text-gray-500 mt-2">
                Your balance: {parseFloat(formatEther(balanceBigInt)).toFixed(4)} MNEE
              </p>
            )}
          </div>
        )}

        {hasInsufficientBalance && (
          <div className="bg-yellow-900/30 border border-yellow-500/50 rounded p-4">
            <p className="text-yellow-400 text-sm font-semibold">Insufficient Balance</p>
            <p className="text-xs text-yellow-300 mt-1">
              You don't have enough MNEE tokens. Please acquire more MNEE to proceed.
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-900/30 border border-red-500/50 rounded p-4">
            <p className="text-red-400 font-semibold mb-1 text-sm">Error</p>
            <p className="text-xs text-red-300 break-words">{errorMessage}</p>
          </div>
        )}

        {needsApproval ? (
          <button
            onClick={handleApprove}
            disabled={isApproving || isConfirming || !requiredMNEE || typeof requiredMNEE !== 'bigint' || hasInsufficientBalance}
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
          >
            {isApproving || isConfirming ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {isApproving ? "Waiting for approval..." : "Confirming..."}
              </>
            ) : (
              "Approve MNEE"
            )}
          </button>
        ) : (
          <div className="space-y-2">
            <div className="bg-green-900/30 border border-green-500/50 rounded p-4">
              <p className="text-green-400 font-semibold">✓ MNEE Approved</p>
              <p className="text-xs text-gray-400 mt-1">You can now send gasless transactions</p>
            </div>
            <button
              disabled
              className="w-full px-4 py-3 bg-gray-600 rounded-lg text-gray-400 font-semibold cursor-not-allowed"
            >
              Ready to send transaction
            </button>
            <p className="text-xs md:text-sm text-gray-400 text-center">
              Use ERC-4337 SDK to send gasless transactions
            </p>
          </div>
        )}

        {isApproveSuccess && approveHash && (
          <div className="bg-green-900/30 border border-green-500/50 rounded p-4">
            <p className="text-green-400 font-semibold mb-2">✓ Approval Confirmed!</p>
            <a
              href={getExplorerUrl(approveHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm underline"
            >
              View transaction on Etherscan →
            </a>
          </div>
        )}
      </div>

      <div className="mt-6 text-xs md:text-sm text-gray-400">
        <p>
          After approving, you can send transactions through your agent wallet. The Paymaster will
          pay the gas fee in ETH and deduct the equivalent amount in MNEE tokens.
        </p>
      </div>
    </div>
  );
}


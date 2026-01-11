"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useReadContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { parseEther } from "viem";

const FactoryABI = [
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "salt", type: "uint256" }
    ],
    name: "createWallet",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "salt", type: "uint256" }
    ],
    name: "getAddress",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "getWallet",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface WalletFactoryProps {
  factoryAddress: string;
  userAddress: string;
}

export default function WalletFactory({ factoryAddress, userAddress }: WalletFactoryProps) {
  const [salt, setSalt] = useState<bigint>(BigInt(Math.floor(Math.random() * 1000000)));
  const chainId = useChainId();

  // Debug logging
  useEffect(() => {
    console.log("WalletFactory Debug:", {
      factoryAddress,
      userAddress,
      chainId,
      isSepolia: chainId === 11155111,
    });
  }, [factoryAddress, userAddress, chainId]);

  const { data: predictedAddr, isLoading: isLoadingPrediction, isError: isPredictionError } = useReadContract({
    address: factoryAddress as `0x${string}`,
    abi: FactoryABI,
    functionName: "getAddress",
    args: [userAddress as `0x${string}`, salt],
    query: {
      enabled: !!factoryAddress && !!userAddress,
    },
  });

  const { data: existingWallet, isLoading: isLoadingExisting } = useReadContract({
    address: factoryAddress as `0x${string}`,
    abi: FactoryABI,
    functionName: "getWallet",
    args: [userAddress as `0x${string}`],
    query: {
      enabled: !!factoryAddress && !!userAddress,
    },
  });

  const {
    writeContract: createWallet,
    data: hash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, isError: txError } = useWaitForTransactionReceipt({
    hash,
  });

  const handleCreateWallet = () => {
    if (!factoryAddress || !userAddress) {
      console.error("Missing factory address or user address", { factoryAddress, userAddress });
      alert(`Missing required information:\nFactory: ${factoryAddress}\nUser: ${userAddress}`);
      return;
    }

    if (factoryAddress === "0x0000000000000000000000000000000000000000") {
      alert("Factory not deployed on this chain. Please switch to Sepolia testnet.");
      return;
    }

    console.log("Creating wallet with:", { factoryAddress, userAddress, salt: salt.toString() });
    
    try {
      createWallet({
        address: factoryAddress as `0x${string}`,
        abi: FactoryABI,
        functionName: "createWallet",
        args: [userAddress as `0x${string}`, salt],
      });
    } catch (error) {
      console.error("Error creating wallet:", error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const generateNewSalt = () => {
    setSalt(BigInt(Math.floor(Math.random() * 1000000000)));
  };

  const getExplorerUrl = (txHash: string) => {
    if (chainId === 11155111) return `https://sepolia.etherscan.io/tx/${txHash}`;
    if (chainId === 1) return `https://etherscan.io/tx/${txHash}`;
    if (chainId === 8453) return `https://basescan.org/tx/${txHash}`;
    if (chainId === 137) return `https://polygonscan.com/tx/${txHash}`;
    if (chainId === 42161) return `https://arbiscan.io/tx/${txHash}`;
    return `https://etherscan.io/tx/${txHash}`;
  };

  const getErrorMessage = () => {
    if (writeError) {
      if (writeError.message) return writeError.message;
      if (typeof writeError === 'string') return writeError;
      return JSON.stringify(writeError);
    }
    if (txError) {
      if (typeof txError === 'object' && 'message' in txError) return (txError as any).message;
      return "Transaction failed";
    }
    return null;
  };

  const errorMessage = getErrorMessage();

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-gray-700">
      <h2 className="text-xl md:text-2xl font-bold mb-4">Create Agent Wallet</h2>

      {isLoadingExisting ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-400">Loading wallet status...</span>
        </div>
      ) : existingWallet && existingWallet !== "0x0000000000000000000000000000000000000000" ? (
        <div className="space-y-4">
          <div className="bg-green-900/30 border border-green-500/50 rounded p-4">
            <p className="text-green-400 font-semibold mb-2">✓ Wallet Already Exists</p>
            <p className="text-xs md:text-sm text-gray-300 break-all font-mono">{existingWallet as string}</p>
            <a
              href={`https://sepolia.etherscan.io/address/${existingWallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-xs mt-2 inline-block"
            >
              View on Etherscan →
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Salt (for deterministic address)</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                value={salt.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || (!isNaN(Number(value)) && Number(value) >= 0)) {
                    setSalt(BigInt(value || 0));
                  }
                }}
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter salt value"
              />
              <button
                onClick={generateNewSalt}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium transition-colors"
              >
                Random
              </button>
            </div>
          </div>

          {isLoadingPrediction && (
            <div className="bg-gray-700/50 border border-gray-600 rounded p-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                <p className="text-gray-400 text-sm">Calculating predicted address...</p>
              </div>
            </div>
          )}

          {isPredictionError && (
            <div className="bg-red-900/30 border border-red-500/50 rounded p-4">
              <p className="text-red-400 text-sm">Error calculating predicted address. Please check your connection.</p>
            </div>
          )}

          {predictedAddr && !isLoadingPrediction && !isPredictionError ? (
            <div className="bg-blue-900/30 border border-blue-500/50 rounded p-4">
              <p className="text-blue-400 font-semibold mb-2 text-sm">Predicted Wallet Address</p>
              <p className="text-xs md:text-sm text-gray-300 break-all font-mono">{String(predictedAddr)}</p>
            </div>
          ) : null}

          {errorMessage && (
            <div className="bg-red-900/30 border border-red-500/50 rounded p-4">
              <p className="text-red-400 font-semibold mb-1 text-sm">Error</p>
              <p className="text-xs text-red-300 break-words">{errorMessage}</p>
              <p className="text-xs text-gray-400 mt-2">
                💡 Make sure you're on Sepolia testnet (Chain ID: 11155111) and have ETH for gas
              </p>
            </div>
          )}

          {writeError && (
            <div className="bg-red-900/30 border border-red-500/50 rounded p-4 mt-2">
              <p className="text-red-400 font-semibold mb-1 text-sm">Transaction Error</p>
              <p className="text-xs text-red-300 break-words">
                {writeError.message || JSON.stringify(writeError)}
              </p>
            </div>
          )}

          {chainId !== 11155111 && (
            <div className="bg-yellow-900/30 border border-yellow-500/50 rounded p-4 mb-4">
              <p className="text-yellow-400 text-sm">
              ⚠️ You're on Chain ID {chainId}. Please switch to Sepolia (Chain ID: 11155111) to create wallets.
              </p>
            </div>
          )}

          {!factoryAddress && (
            <div className="bg-yellow-900/30 border border-yellow-500/50 rounded p-4 mb-4">
              <p className="text-yellow-400 text-sm">⚠️ Factory address not configured for this chain</p>
            </div>
          )}

          <button
            onClick={handleCreateWallet}
            disabled={isPending || isConfirming || !factoryAddress || !userAddress}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
          >
            {isPending || isConfirming ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {isPending ? "Waiting for wallet..." : "Confirming..."}
              </>
            ) : isSuccess ? (
              "✓ Wallet Created!"
            ) : (
              "Create Wallet"
            )}
          </button>

          {isSuccess && hash && (
            <div className="bg-green-900/30 border border-green-500/50 rounded p-4">
              <p className="text-green-400 font-semibold mb-2">✓ Transaction Confirmed!</p>
              <a
                href={getExplorerUrl(hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm underline"
              >
                View transaction on Etherscan →
              </a>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 text-xs md:text-sm text-gray-400">
        <p>
          Create a deterministic smart wallet using CREATE2. The wallet will be controlled by your
          connected address.
        </p>
      </div>
    </div>
  );
}


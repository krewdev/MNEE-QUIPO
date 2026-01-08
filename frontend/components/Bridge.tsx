"use client";

import { useState } from "react";
import { useWriteContract, useReadContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { parseEther, formatEther } from "viem";
import { getContractsForChain } from "@/config/chains";

const BridgeABI = [
  "function lockForBitcoin(address recipient, uint256 amount) external",
  "function lockForBitcoinUTXO(address recipient, uint256 amount, bytes32[] calldata utxoIds) external",
  "function claimBitcoinDeposit(bytes32 bitcoinTxHash) external",
  "function evmLocks(bytes32) view returns (address sender, address recipient, uint256 amount, uint256 timestamp, bool processed, bool isUTXO)",
] as const;

const MNEETokenABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
] as const;

export default function Bridge() {
  const { address } = useAccount();
  const chainId = useChainId();
  const CONTRACTS = getContractsForChain(chainId);
  const [bridgeAmount, setBridgeAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [bitcoinTxHash, setBitcoinTxHash] = useState("");
  const [bridgeDirection, setBridgeDirection] = useState<"to-btc" | "from-btc">("to-btc");

  const bridgeAddress = CONTRACTS.bridge;
  const mneeTokenAddress = CONTRACTS.mneeToken;

  // Read MNEE balance
  const { data: mneeBalance } = useReadContract({
    address: mneeTokenAddress as `0x${string}`,
    abi: MNEETokenABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!mneeTokenAddress,
      refetchInterval: 5000,
    },
  });

  const { writeContract: writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, isError: txError } = useWaitForTransactionReceipt({ hash });

  const handleBridgeToBitcoin = async () => {
    if (!bridgeAmount || !recipientAddress || !bridgeAddress || !mneeTokenAddress) return;
    const amount = parseEther(bridgeAmount);

    try {
      // First approve
      await writeContract({
        address: mneeTokenAddress as `0x${string}`,
        abi: MNEETokenABI,
        functionName: "approve",
        args: [bridgeAddress as `0x${string}`, amount],
      });

      // Wait for approval, then lock
      setTimeout(async () => {
        await writeContract({
          address: bridgeAddress as `0x${string}`,
          abi: BridgeABI,
          functionName: "lockForBitcoin",
          args: [recipientAddress as `0x${string}`, amount],
        });
      }, 2000);
    } catch (error) {
      console.error("Error bridging:", error);
    }
  };

  const handleClaimDeposit = async () => {
    if (!bitcoinTxHash || !bridgeAddress) return;

    // Convert string to bytes32
    const txHashBytes = bitcoinTxHash.startsWith("0x") ? bitcoinTxHash : `0x${bitcoinTxHash}`;
    if (txHashBytes.length !== 66) {
      alert("Invalid Bitcoin transaction hash. Must be 64 hex characters.");
      return;
    }

    writeContract({
      address: bridgeAddress as `0x${string}`,
      abi: BridgeABI,
      functionName: "claimBitcoinDeposit",
      args: [txHashBytes as `0x${string}`],
    });
  };

  if (!bridgeAddress) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold mb-4">🌉 MNEE Bridge</h2>
        <p className="text-gray-400">Bridge not deployed on this chain.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
      <h2 className="text-2xl font-bold mb-6">🌉 MNEE Bridge</h2>

      {/* Direction Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setBridgeDirection("to-btc")}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            bridgeDirection === "to-btc"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-400 hover:text-white"
          }`}
        >
          EVM → Bitcoin
        </button>
        <button
          onClick={() => setBridgeDirection("from-btc")}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            bridgeDirection === "from-btc"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-400 hover:text-white"
          }`}
        >
          Bitcoin → EVM
        </button>
      </div>

      {bridgeDirection === "to-btc" && (
        <div className="space-y-4">
          <div className="bg-blue-900/30 border border-blue-500/50 rounded p-4 mb-4">
            <h3 className="font-semibold mb-2">Bridge MNEE to Bitcoin</h3>
            <p className="text-sm text-gray-300">
              Lock your MNEE tokens on this chain and claim them on Bitcoin Ordinals.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Amount (MNEE)</label>
            <input
              type="number"
              value={bridgeAmount}
              onChange={(e) => setBridgeAmount(e.target.value)}
              placeholder="1"
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Your Balance: {mneeBalance ? formatEther(mneeBalance as bigint) : "0"} MNEE
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Bitcoin Recipient Address</label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297"
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Your Bitcoin address where MNEE will be sent</p>
          </div>

          <button
            onClick={handleBridgeToBitcoin}
            disabled={isPending || isConfirming || !bridgeAmount || !recipientAddress}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPending || isConfirming ? "Processing..." : "Lock & Bridge to Bitcoin"}
          </button>

          {isSuccess && (
            <div className="bg-green-900/30 border border-green-500/50 rounded p-4">
              <p className="text-green-400 font-semibold mb-2">✓ Tokens Locked!</p>
              <p className="text-sm text-gray-300">
                Your MNEE tokens are now locked. After Bitcoin confirmation, you can claim them on Bitcoin.
              </p>
            </div>
          )}

          {(writeError || txError) && (
            <div className="bg-red-900/30 border border-red-500/50 rounded p-4">
              <p className="text-red-400 text-sm">
                Error: {writeError?.message || (txError && typeof txError === 'object' && 'message' in txError ? (txError as any).message : "Transaction failed")}
              </p>
            </div>
          )}

          <div className="text-xs text-gray-400 space-y-1 mt-4">
            <p>📝 Bridge Process:</p>
            <p>1. Lock MNEE on this chain</p>
            <p>2. Wait for bridge operator to submit proof</p>
            <p>3. Claim MNEE on Bitcoin using the transaction hash</p>
          </div>
        </div>
      )}

      {bridgeDirection === "from-btc" && (
        <div className="space-y-4">
          <div className="bg-green-900/30 border border-green-500/50 rounded p-4 mb-4">
            <h3 className="font-semibold mb-2">Claim MNEE from Bitcoin</h3>
            <p className="text-sm text-gray-300">
              Claim your MNEE tokens on this chain after bridging from Bitcoin.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Bitcoin Transaction Hash</label>
            <input
              type="text"
              value={bitcoinTxHash}
              onChange={(e) => setBitcoinTxHash(e.target.value)}
              placeholder="6b0d240886d3b907216de14377aa2f0263fb3dbca5a6d52e3f6b434c564a11ad"
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              The Bitcoin transaction hash where you sent MNEE to the bridge address
            </p>
          </div>

          <button
            onClick={handleClaimDeposit}
            disabled={isPending || isConfirming || !bitcoinTxHash}
            className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPending || isConfirming ? "Processing..." : "Claim Bitcoin Deposit"}
          </button>

          {isSuccess && (
            <div className="bg-green-900/30 border border-green-500/50 rounded p-4">
              <p className="text-green-400 font-semibold mb-2">✓ Deposit Claimed!</p>
              <p className="text-sm text-gray-300">Your MNEE tokens have been minted on this chain.</p>
            </div>
          )}

          {(writeError || txError) && (
            <div className="bg-red-900/30 border border-red-500/50 rounded p-4">
              <p className="text-red-400 text-sm">
                Error: {writeError?.message || (txError && typeof txError === 'object' && 'message' in txError ? (txError as any).message : "Transaction failed")}
              </p>
            </div>
          )}

          <div className="text-xs text-gray-400 space-y-1 mt-4">
            <p>📝 Claim Process:</p>
            <p>1. Send MNEE from Bitcoin to bridge address</p>
            <p>2. Wait for Bitcoin confirmation (6+ blocks)</p>
            <p>3. Bridge operator submits proof</p>
            <p>4. Claim your MNEE using the transaction hash</p>
          </div>
        </div>
      )}
    </div>
  );
}


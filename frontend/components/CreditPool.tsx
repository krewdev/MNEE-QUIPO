"use client";

import { useState } from "react";
import { useWriteContract, useReadContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { parseEther, formatEther } from "viem";
import { getContractsForChain } from "@/config/chains";

const MNEETokenABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
] as const;

const CreditPoolABI = [
  "function stake(uint256 amount) external",
  "function unstake(uint256 amount) external",
  "function borrowFromCreditLine(uint256 amount) external",
  "function repayCredit(uint256 amount) external",
  "function provideLiquidity(uint256 amount) external",
  "function withdrawLiquidity(uint256 amount) external",
  "function claimRewards() external",
  "function claimLiquidityRewards() external",
  "function creditUsers(address) view returns (uint256 stakedAmount, uint256 creditLine, uint256 borrowedAmount, uint256 lastUpdateTime, uint256 stakingRewards, uint256 interestOwed, bool isActive)",
  "function liquidityProviders(address) view returns (uint256 providedAmount, uint256 rewardsAccrued, uint256 lastUpdateTime)",
  "function totalLiquidity() view returns (uint256)",
  "function totalStaked() view returns (uint256)",
  "function totalBorrowed() view returns (uint256)",
] as const;

type TabType = "stake" | "borrow" | "repay" | "info" | "liquidity";

export default function CreditPool() {
  const { address } = useAccount();
  const chainId = useChainId();
  const CONTRACTS = getContractsForChain(chainId);
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [stakeAmount, setStakeAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [liquidityAmount, setLiquidityAmount] = useState("");

  const creditPoolAddress = CONTRACTS.creditPool;
  const mneeTokenAddress = CONTRACTS.mneeToken;

  // Read user credit info
  const { data: creditUser, refetch: refetchCredit } = useReadContract({
    address: creditPoolAddress as `0x${string}`,
    abi: CreditPoolABI,
    functionName: "creditUsers",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!creditPoolAddress,
      refetchInterval: 5000,
    },
  });

  // Read liquidity provider info
  const { data: liquidityProvider, refetch: refetchLiquidity } = useReadContract({
    address: creditPoolAddress as `0x${string}`,
    abi: CreditPoolABI,
    functionName: "liquidityProviders",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!creditPoolAddress,
      refetchInterval: 5000,
    },
  });

  // Read pool stats
  const { data: totalLiquidity } = useReadContract({
    address: creditPoolAddress as `0x${string}`,
    abi: CreditPoolABI,
    functionName: "totalLiquidity",
    query: {
      enabled: !!creditPoolAddress,
      refetchInterval: 5000,
    },
  });

  const { data: totalStaked } = useReadContract({
    address: creditPoolAddress as `0x${string}`,
    abi: CreditPoolABI,
    functionName: "totalStaked",
    query: {
      enabled: !!creditPoolAddress,
      refetchInterval: 5000,
    },
  });

  const { data: totalBorrowed } = useReadContract({
    address: creditPoolAddress as `0x${string}`,
    abi: CreditPoolABI,
    functionName: "totalBorrowed",
    query: {
      enabled: !!creditPoolAddress,
      refetchInterval: 5000,
    },
  });

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

  const handleStake = async () => {
    if (!stakeAmount || !creditPoolAddress || !mneeTokenAddress) return;
    const amount = parseEther(stakeAmount);

    try {
      // First approve
      const approveHash = await writeContract({
        address: mneeTokenAddress as `0x${string}`,
        abi: MNEETokenABI,
        functionName: "approve",
        args: [creditPoolAddress as `0x${string}`, amount],
      });

      // Wait for approval, then stake
      setTimeout(async () => {
        await writeContract({
          address: creditPoolAddress as `0x${string}`,
          abi: CreditPoolABI,
          functionName: "stake",
          args: [amount],
        });
      }, 2000);
    } catch (error) {
      console.error("Error staking:", error);
    }
  };

  const handleBorrow = async () => {
    if (!borrowAmount || !creditPoolAddress) return;
    const amount = parseEther(borrowAmount);

    writeContract({
      address: creditPoolAddress as `0x${string}`,
      abi: CreditPoolABI,
      functionName: "borrowFromCreditLine",
      args: [amount],
    });
  };

  const handleRepay = async () => {
    if (!repayAmount || !creditPoolAddress || !mneeTokenAddress) return;
    const amount = parseEther(repayAmount);

    try {
      // First approve
      const approveHash = await writeContract({
        address: mneeTokenAddress as `0x${string}`,
        abi: MNEETokenABI,
        functionName: "approve",
        args: [creditPoolAddress as `0x${string}`, amount],
      });

      // Wait for approval, then repay
      setTimeout(async () => {
        await writeContract({
          address: creditPoolAddress as `0x${string}`,
          abi: CreditPoolABI,
          functionName: "repayCredit",
          args: [amount],
        });
      }, 2000);
    } catch (error) {
      console.error("Error repaying:", error);
    }
  };

  const handleProvideLiquidity = async () => {
    if (!liquidityAmount || !creditPoolAddress || !mneeTokenAddress) return;
    const amount = parseEther(liquidityAmount);

    try {
      // First approve
      const approveHash = await writeContract({
        address: mneeTokenAddress as `0x${string}`,
        abi: MNEETokenABI,
        functionName: "approve",
        args: [creditPoolAddress as `0x${string}`, amount],
      });

      // Wait for approval, then provide liquidity
      setTimeout(async () => {
        await writeContract({
          address: creditPoolAddress as `0x${string}`,
          abi: CreditPoolABI,
          functionName: "provideLiquidity",
          args: [amount],
        });
      }, 2000);
    } catch (error) {
      console.error("Error providing liquidity:", error);
    }
  };

  const handleClaimRewards = async () => {
    if (!creditPoolAddress) return;
    writeContract({
      address: creditPoolAddress as `0x${string}`,
      abi: CreditPoolABI,
      functionName: "claimRewards",
      args: [],
    });
  };

  const handleClaimLiquidityRewards = async () => {
    if (!creditPoolAddress) return;
    writeContract({
      address: creditPoolAddress as `0x${string}`,
      abi: CreditPoolABI,
      functionName: "claimLiquidityRewards",
      args: [],
    });
  };

  if (!creditPoolAddress) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold mb-4">💎 MNEE Credit Pool</h2>
        <p className="text-gray-400">Credit pool not deployed on this chain.</p>
      </div>
    );
  }

  const userData = creditUser as any;
  const liquidityData = liquidityProvider as any;
  const staked = userData?.[0] ? formatEther(userData[0]) : "0";
  const creditLine = userData?.[1] ? formatEther(userData[1]) : "0";
  const borrowed = userData?.[2] ? formatEther(userData[2]) : "0";
  const rewards = userData?.[4] ? formatEther(userData[4]) : "0";
  const interest = userData?.[5] ? formatEther(userData[5]) : "0";
  const availableCredit = parseFloat(creditLine) - parseFloat(borrowed) - parseFloat(interest);
  const providedLiquidity = liquidityData?.[0] ? formatEther(liquidityData[0]) : "0";
  const liquidityRewards = liquidityData?.[1] ? formatEther(liquidityData[1]) : "0";

  const tabs = [
    { id: "info" as TabType, label: "📊 Credit Info" },
    { id: "stake" as TabType, label: "💎 Stake" },
    { id: "borrow" as TabType, label: "💰 Borrow" },
    { id: "repay" as TabType, label: "💳 Repay" },
    { id: "liquidity" as TabType, label: "💧 Liquidity" },
  ];

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
      <h2 className="text-2xl font-bold mb-6">💎 MNEE Credit Pool</h2>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-blue-600 text-white border-b-2 border-blue-400"
                : "text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pool Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-700/50 rounded p-4">
          <p className="text-sm text-gray-400">Total Liquidity</p>
          <p className="text-xl font-bold">{totalLiquidity ? formatEther(totalLiquidity as bigint) : "0"} MNEE</p>
        </div>
        <div className="bg-gray-700/50 rounded p-4">
          <p className="text-sm text-gray-400">Total Staked</p>
          <p className="text-xl font-bold">{totalStaked ? formatEther(totalStaked as bigint) : "0"} MNEE</p>
        </div>
        <div className="bg-gray-700/50 rounded p-4">
          <p className="text-sm text-gray-400">Total Borrowed</p>
          <p className="text-xl font-bold">{totalBorrowed ? formatEther(totalBorrowed as bigint) : "0"} MNEE</p>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "info" && (
        <div className="space-y-4">
          <div className="bg-blue-900/30 border border-blue-500/50 rounded p-4">
            <h3 className="font-semibold mb-3">Your Credit Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Staked:</span>
                <span className="font-bold">{parseFloat(staked).toFixed(2)} MNEE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Credit Line (80%):</span>
                <span className="font-bold">{parseFloat(creditLine).toFixed(2)} MNEE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Borrowed:</span>
                <span className="font-bold text-yellow-400">{parseFloat(borrowed).toFixed(2)} MNEE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Interest Owed:</span>
                <span className="font-bold text-orange-400">{parseFloat(interest).toFixed(2)} MNEE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Available Credit:</span>
                <span className="font-bold text-green-400">{availableCredit.toFixed(2)} MNEE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Staking Rewards:</span>
                <span className="font-bold text-green-400">{parseFloat(rewards).toFixed(2)} MNEE</span>
              </div>
            </div>
            {parseFloat(rewards) > 0 && (
              <button
                onClick={handleClaimRewards}
                disabled={isPending || isConfirming}
                className="mt-4 w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white font-medium disabled:opacity-50"
              >
                Claim Rewards
              </button>
            )}
          </div>

          {parseFloat(providedLiquidity) > 0 && (
            <div className="bg-purple-900/30 border border-purple-500/50 rounded p-4">
              <h3 className="font-semibold mb-3">Your Liquidity Position</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Provided:</span>
                  <span className="font-bold">{parseFloat(providedLiquidity).toFixed(2)} MNEE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Rewards (6% APY):</span>
                  <span className="font-bold text-green-400">{parseFloat(liquidityRewards).toFixed(2)} MNEE</span>
                </div>
              </div>
              {parseFloat(liquidityRewards) > 0 && (
                <button
                  onClick={handleClaimLiquidityRewards}
                  disabled={isPending || isConfirming}
                  className="mt-4 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white font-medium disabled:opacity-50"
                >
                  Claim Liquidity Rewards
                </button>
              )}
            </div>
          )}

          <div className="text-xs text-gray-400 space-y-1">
            <p>💡 Stake MNEE to get instant credit line (80% of stake)</p>
            <p>💡 Borrow instantly from your credit line (15% APY)</p>
            <p>💡 Earn 8% APY on staked MNEE</p>
            <p>💡 Provide liquidity to earn 6% APY</p>
          </div>
        </div>
      )}

      {activeTab === "stake" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Amount to Stake (MNEE)</label>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="100"
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Your Balance: {mneeBalance ? formatEther(mneeBalance as bigint) : "0"} MNEE
            </p>
            <p className="text-xs text-gray-400">Minimum: 100 MNEE</p>
          </div>
          <button
            onClick={handleStake}
            disabled={isPending || isConfirming || !stakeAmount}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPending || isConfirming ? "Processing..." : "Stake MNEE"}
          </button>
          {isSuccess && <p className="text-green-400 text-sm">✓ Staked successfully!</p>}
          {(writeError || txError) && (
            <p className="text-red-400 text-sm">
              Error: {writeError?.message || (txError as any)?.message || "Transaction failed"}
            </p>
          )}
        </div>
      )}

      {activeTab === "borrow" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Amount to Borrow (MNEE)</label>
            <input
              type="number"
              value={borrowAmount}
              onChange={(e) => setBorrowAmount(e.target.value)}
              placeholder="500"
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Available Credit: {availableCredit.toFixed(2)} MNEE</p>
            <p className="text-xs text-gray-400">Interest Rate: 15% APY</p>
          </div>
          <button
            onClick={handleBorrow}
            disabled={isPending || isConfirming || !borrowAmount || parseFloat(borrowAmount) > availableCredit}
            className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPending || isConfirming ? "Processing..." : "Borrow from Credit Line"}
          </button>
          {isSuccess && <p className="text-green-400 text-sm">✓ Borrowed successfully!</p>}
          {(writeError || txError) && (
            <p className="text-red-400 text-sm">
              Error: {writeError?.message || (txError as any)?.message || "Transaction failed"}
            </p>
          )}
        </div>
      )}

      {activeTab === "repay" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Amount to Repay (MNEE)</label>
            <input
              type="number"
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              placeholder="550"
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Total Owed: {(parseFloat(borrowed) + parseFloat(interest)).toFixed(2)} MNEE
            </p>
            <p className="text-xs text-gray-400">Your Balance: {mneeBalance ? formatEther(mneeBalance as bigint) : "0"} MNEE</p>
          </div>
          <button
            onClick={handleRepay}
            disabled={isPending || isConfirming || !repayAmount}
            className="w-full px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPending || isConfirming ? "Processing..." : "Repay Credit"}
          </button>
          {isSuccess && <p className="text-green-400 text-sm">✓ Repaid successfully!</p>}
          {(writeError || txError) && (
            <p className="text-red-400 text-sm">
              Error: {writeError?.message || (txError as any)?.message || "Transaction failed"}
            </p>
          )}
        </div>
      )}

      {activeTab === "liquidity" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Amount to Provide (MNEE)</label>
            <input
              type="number"
              value={liquidityAmount}
              onChange={(e) => setLiquidityAmount(e.target.value)}
              placeholder="10000"
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Your Balance: {mneeBalance ? formatEther(mneeBalance as bigint) : "0"} MNEE
            </p>
            <p className="text-xs text-gray-400">Earn 6% APY on provided liquidity</p>
          </div>
          <button
            onClick={handleProvideLiquidity}
            disabled={isPending || isConfirming || !liquidityAmount}
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPending || isConfirming ? "Processing..." : "Provide Liquidity"}
          </button>
          {isSuccess && <p className="text-green-400 text-sm">✓ Liquidity provided successfully!</p>}
          {(writeError || txError) && (
            <p className="text-red-400 text-sm">
              Error: {writeError?.message || (txError as any)?.message || "Transaction failed"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}


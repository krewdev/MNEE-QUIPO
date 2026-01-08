"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useState, useEffect } from "react";
import { formatEther, parseEther } from "viem";
import StatsDashboard from "@/components/StatsDashboard";
import WalletFactory from "@/components/WalletFactory";
import TransactionSender from "@/components/TransactionSender";
import CreditPool from "@/components/CreditPool";
import Bridge from "@/components/Bridge";
import DuneAnalytics from "@/components/DuneAnalytics";
import { useChainId } from "wagmi";
import { getContractsForChain } from "@/config/chains";

type TabType = "wallet" | "credit" | "bridge" | "send";

// Contract ABIs (simplified - in production, import from artifacts)
const MNEETokenABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external",
  "function nonces(address owner) view returns (uint256)",
] as const;

const PaymasterABI = [
  "function calculateRequiredMNEE(uint256 gasCost) view returns (uint256)",
  "function totalGasSponsored() view returns (uint256)",
  "function totalMNEEcollected() view returns (uint256)",
  "function mneeRate() view returns (uint256)",
] as const;

const FactoryABI = [
  "function createWallet(address owner, uint256 salt) returns (address)",
  "function getAddress(address owner, uint256 salt) view returns (address)",
  "function getWallet(address owner) view returns (address)",
  "function totalWallets() view returns (uint256)",
] as const;

// Official MNEE stablecoin contract: 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [mneeBalance, setMneeBalance] = useState<string>("0");
  const [activeTab, setActiveTab] = useState<TabType>("wallet");
  
  // Get contracts for current chain
  const CONTRACTS = getContractsForChain(chainId);

  // Read MNEE balance
  const { data: balance } = useReadContract({
    address: CONTRACTS.mneeToken as `0x${string}`,
    abi: MNEETokenABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    },
  });

  // Read paymaster stats
  const { data: totalGasSponsored } = useReadContract({
    address: CONTRACTS.paymaster as `0x${string}`,
    abi: PaymasterABI,
    functionName: "totalGasSponsored",
    query: {
      enabled: !!CONTRACTS.paymaster,
      refetchInterval: 5000,
    },
  });

  const { data: totalMNEEcollected } = useReadContract({
    address: CONTRACTS.paymaster as `0x${string}`,
    abi: PaymasterABI,
    functionName: "totalMNEEcollected",
    query: {
      enabled: !!CONTRACTS.paymaster,
      refetchInterval: 5000,
    },
  });

  useEffect(() => {
    if (balance && typeof balance === 'bigint') {
      setMneeBalance(formatEther(balance));
    } else if (balance === 0n) {
      setMneeBalance("0");
    }
  }, [balance]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">QuipoWallet</h1>
            <p className="text-sm md:text-base text-gray-300">
              Gasless Agent Wallet powered by ERC-4337 & MNEE Stablecoin
            </p>
            <p className="text-xs md:text-sm text-gray-400 mt-1">
              🏆 MNEE Hackathon - AI & Agent Payments Track
            </p>
            <p className="text-xs text-gray-500 mt-1">
              🌐 Multi-chain: Ethereum • Base • Polygon • Arbitrum
            </p>
          </div>
          <div className="w-full md:w-auto">
            <ConnectButton />
          </div>
        </div>

        {/* Stats Dashboard */}
        <StatsDashboard
          totalGasSponsored={totalGasSponsored as bigint | undefined}
          totalMNEEcollected={totalMNEEcollected as bigint | undefined}
          mneeBalance={mneeBalance}
          isConnected={isConnected}
        />

        {/* Main Content */}
        {isConnected && address ? (
          <div className="mt-6 md:mt-8">
            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700">
              <button
                onClick={() => setActiveTab("wallet")}
                className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
                  activeTab === "wallet"
                    ? "bg-blue-600 text-white border-b-2 border-blue-400"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                👛 Wallet
              </button>
              <button
                onClick={() => setActiveTab("credit")}
                className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
                  activeTab === "credit"
                    ? "bg-blue-600 text-white border-b-2 border-blue-400"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                💎 Credit Pool
              </button>
              <button
                onClick={() => setActiveTab("bridge")}
                className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
                  activeTab === "bridge"
                    ? "bg-blue-600 text-white border-b-2 border-blue-400"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                🌉 Bridge
              </button>
              <button
                onClick={() => setActiveTab("send")}
                className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
                  activeTab === "send"
                    ? "bg-blue-600 text-white border-b-2 border-blue-400"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                📤 Send
              </button>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              {activeTab === "wallet" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <WalletFactory
                    factoryAddress={CONTRACTS.factory}
                    userAddress={address}
                  />
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
                    <h3 className="text-xl font-bold mb-4">About Agent Wallets</h3>
                    <div className="space-y-3 text-sm text-gray-300">
                      <p>• Create deterministic smart wallets using CREATE2</p>
                      <p>• Execute transactions without ETH (gasless via Paymaster)</p>
                      <p>• Pay for gas with MNEE tokens</p>
                      <p>• Perfect for AI agents and automated systems</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "credit" && (
                <CreditPool />
              )}

              {activeTab === "bridge" && (
                <Bridge />
              )}

              {activeTab === "send" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TransactionSender
                    paymasterAddress={CONTRACTS.paymaster}
                    mneeTokenAddress={CONTRACTS.mneeToken}
                    userAddress={address}
                  />
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
                    <h3 className="text-xl font-bold mb-4">Gasless Transactions</h3>
                    <div className="space-y-3 text-sm text-gray-300">
                      <p>• Send MNEE tokens without ETH</p>
                      <p>• Pay gas fees with MNEE via Paymaster</p>
                      <p>• ERC-4337 Account Abstraction</p>
                      <p>• Supports ERC-2612 Permit for gasless approvals</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center mt-8 md:mt-12">
            <p className="text-lg md:text-xl text-gray-400">
              Connect your wallet to get started
            </p>
          </div>
        )}

        {/* Dune Analytics Section */}
        {isConnected && (
          <div className="mt-12">
            <DuneAnalytics
              paymasterAddress={CONTRACTS.paymaster}
              factoryAddress={CONTRACTS.factory}
              mneeTokenAddress={CONTRACTS.mneeToken}
            />
          </div>
        )}

        {/* Features Section */}
        <div className="mt-8 md:mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-gray-700">
            <h3 className="text-lg md:text-xl font-semibold mb-2">ERC-4337 Account Abstraction</h3>
            <p className="text-sm md:text-base text-gray-400">
              Smart contract wallets with gasless transactions via Paymaster
            </p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-gray-700">
            <h3 className="text-lg md:text-xl font-semibold mb-2">ERC-2612 Permit</h3>
            <p className="text-sm md:text-base text-gray-400">
              Gasless token approvals using signature-based permits
            </p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 md:p-6 border border-gray-700">
            <h3 className="text-lg md:text-xl font-semibold mb-2">MNEE Token Integration</h3>
            <p className="text-sm md:text-base text-gray-400">
              Pay for gas with MNEE tokens instead of ETH
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}


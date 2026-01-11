"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract, useChainId } from "wagmi";
import { useState, useEffect } from "react";
import { formatEther, parseEther } from "viem";
import StatsDashboard from "@/components/StatsDashboard";
import WalletFactory from "@/components/WalletFactory";
import TransactionSender from "@/components/TransactionSender";
import CreditPool from "@/components/CreditPool";
import Bridge from "@/components/Bridge";
import DuneAnalytics from "@/components/DuneAnalytics";
import WalletTracker from "@/components/WalletTracker";
import { getContractsForChain } from "@/config/chains";

type TabType = "wallet" | "credit" | "bridge" | "send" | "tracker";

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

  // Debug: Log contracts to console (can be removed in production)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Chain ID:', chainId);
      console.log('Contracts:', CONTRACTS);
    }
  }, [chainId, CONTRACTS]);

  // Helper function to check if address is valid
  const isValidAddress = (addr: string | undefined): addr is `0x${string}` => {
    if (!addr) return false;
    const trimmed = addr.trim();
    return trimmed !== "" && 
           trimmed !== "0x0000000000000000000000000000000000000000" && 
           trimmed.startsWith("0x") &&
           trimmed.length === 42; // Proper Ethereum address length
  };

  // Helper function to get explorer URL for a given address
  const getExplorerUrl = (addr: string): string => {
    if (chainId === 11155111) return `https://sepolia.etherscan.io/address/${addr}`;
    if (chainId === 1) return `https://etherscan.io/address/${addr}`;
    if (chainId === 8453) return `https://basescan.org/address/${addr}`;
    if (chainId === 137) return `https://polygonscan.com/address/${addr}`;
    if (chainId === 42161) return `https://arbiscan.io/address/${addr}`;
    return `https://etherscan.io/address/${addr}`;
  };

  // Read MNEE balance
  const { data: balance } = useReadContract({
    address: isValidAddress(CONTRACTS.mneeToken) ? CONTRACTS.mneeToken : undefined,
    abi: MNEETokenABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isValidAddress(CONTRACTS.mneeToken),
      refetchInterval: 5000,
    },
  });

  // Read paymaster stats
  const { data: totalGasSponsored } = useReadContract({
    address: isValidAddress(CONTRACTS.paymaster) ? CONTRACTS.paymaster : undefined,
    abi: PaymasterABI,
    functionName: "totalGasSponsored",
    query: {
      enabled: isValidAddress(CONTRACTS.paymaster),
      refetchInterval: 5000,
    },
  });

  const { data: totalMNEEcollected } = useReadContract({
    address: isValidAddress(CONTRACTS.paymaster) ? CONTRACTS.paymaster : undefined,
    abi: PaymasterABI,
    functionName: "totalMNEEcollected",
    query: {
      enabled: isValidAddress(CONTRACTS.paymaster),
      refetchInterval: 5000,
    },
  });

  useEffect(() => {
    if (balance && typeof balance === 'bigint') {
      setMneeBalance(formatEther(balance));
    } else if (balance === BigInt(0)) {
      setMneeBalance("0");
    }
  }, [balance]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900/50 via-purple-900/50 to-blue-900/50 backdrop-blur-sm rounded-lg p-6 md:p-8 border border-blue-500/50 mb-6 md:mb-8 relative overflow-visible">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  QuipoWallet
                </h1>
                <span className="bg-pink-600 text-white text-xs md:text-sm font-bold px-3 py-1 rounded-full">
                  MNEE HACKATHON
                </span>
              </div>
              <p className="text-base md:text-lg text-gray-200 mb-2">
                Gasless Agent Wallet powered by ERC-4337 & MNEE Stablecoin
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
                <span className="bg-blue-600/30 px-3 py-1 rounded-full border border-blue-500/50">
                  🏆 AI & Agent Payments Track
                </span>
                <span className="bg-purple-600/30 px-3 py-1 rounded-full border border-purple-500/50">
                  🌐 Multi-Chain Support
                </span>
                <span className="bg-green-600/30 px-3 py-1 rounded-full border border-green-500/50">
                  ✅ Production Ready
                </span>
              </div>
              <p className="text-xs md:text-sm text-gray-400 mt-3">
                🔗 <strong>Official MNEE:</strong> 0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF (Ethereum Mainnet)
              </p>
              <p className="text-xs text-gray-500 mt-1">
                🌐 <strong>Networks:</strong> Ethereum • Base • Polygon • Arbitrum (Sepolia testnet for demo)
              </p>
            </div>
            <div className="w-full md:w-auto flex-shrink-0 z-50 relative">
              <div className="flex justify-center md:justify-end w-full">
                <div className="relative" style={{ minWidth: '180px' }}>
                  <ConnectButton />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Start for Judges */}
        {!isConnected && (
          <div className="mb-8 bg-gradient-to-r from-green-900/40 to-emerald-900/40 backdrop-blur-sm rounded-lg p-6 md:p-8 border border-green-500/50">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 flex items-center gap-2">
              <span>🚀</span> Quick Start for Judges
            </h2>
            <div className="bg-white/10 rounded-lg p-5 border border-white/20">
              <ol className="space-y-3 text-gray-200 text-sm md:text-base list-decimal list-inside">
                <li><strong className="text-green-400">Connect Wallet:</strong> Click the "Connect Wallet" button above to connect your MetaMask or other Web3 wallet</li>
                <li><strong className="text-blue-400">Switch Network:</strong> Switch to Sepolia testnet (Chain ID: 11155111) for live demo contracts</li>
                <li><strong className="text-purple-400">Explore Features:</strong> Navigate through Wallet, Credit Pool, Bridge, and Send tabs to see all functionality</li>
                <li><strong className="text-orange-400">View Analytics:</strong> Scroll down to see real-time analytics powered by Dune and live contract stats</li>
                <li><strong className="text-pink-400">Check Contracts:</strong> View live contract addresses on Etherscan in the Contract Addresses section below</li>
              </ol>
              <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded">
                <p className="text-xs text-yellow-200">
                  <strong>💡 Tip:</strong> This is a live demo on Sepolia testnet. All contracts are deployed and functional. 
                  Connect your wallet to interact with the platform!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hackathon Track Alignment */}
        <div className="mb-8 bg-gradient-to-r from-red-900/40 via-pink-900/40 to-purple-900/40 backdrop-blur-sm rounded-lg p-6 md:p-8 border border-pink-500/50">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 flex items-center gap-2">
            <span>🎯</span> MNEE Hackathon - AI & Agent Payments Track Alignment
          </h2>
          <div className="bg-white/10 rounded-lg p-5 border border-white/20 mb-4">
            <h3 className="text-lg font-semibold mb-3 text-pink-300">How QuipoWallet Addresses the Track Requirements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-green-400 mb-2">✅ AI Agent Autonomy</p>
                <p className="text-sm text-gray-300">
                  AI agents can transact autonomously without holding ETH. They pay gas fees with MNEE stablecoin, eliminating complex ETH management and enabling true autonomous operation.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-400 mb-2">✅ Stablecoin Payments</p>
                <p className="text-sm text-gray-300">
                  Using MNEE (USD-backed stablecoin) for gas payments provides stable value, no volatility, and predictable costs - perfect for automated systems and agents.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-purple-400 mb-2">✅ Programmable Money</p>
                <p className="text-sm text-gray-300">
                  ERC-4337 + ERC-2612 enables gasless transactions and approvals. Agents can programmatically manage funds without manual intervention.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-orange-400 mb-2">✅ Real-World Solution</p>
                <p className="text-sm text-gray-300">
                  Production-ready contracts deployed on Sepolia with live analytics, multi-chain support, and Bitcoin bridge for maximum utility.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* For Judges - Key Highlights */}
        <div className="mb-8 bg-gradient-to-r from-purple-600/30 via-blue-600/30 to-purple-600/30 backdrop-blur-sm rounded-lg p-6 md:p-8 border border-purple-500/50">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 flex items-center gap-2">
            <span>⚖️</span> For Judges: Key Highlights & Differentiators
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h3 className="font-bold text-green-400 mb-2">✅ Problem Solved</h3>
              <p className="text-sm text-gray-200">
                AI agents can now transact autonomously without holding ETH. They pay gas fees with MNEE stablecoin, eliminating the need for complex ETH management.
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h3 className="font-bold text-blue-400 mb-2">🔧 Technical Innovation</h3>
              <p className="text-sm text-gray-200">
                Full ERC-4337 Account Abstraction implementation with ERC-2612 Permit support. Deterministic wallet creation using CREATE2 for predictable addresses.
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h3 className="font-bold text-purple-400 mb-2">🌉 Cross-Chain Bridge</h3>
              <p className="text-sm text-gray-200">
                Bitcoin ↔ EVM bridge enabling MNEE token transfers between Bitcoin Ordinals and Ethereum L2s (Base, Polygon, Arbitrum).
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h3 className="font-bold text-orange-400 mb-2">📊 Production Ready</h3>
              <p className="text-sm text-gray-200">
                Live contracts on Sepolia with real analytics via Dune, subgraph indexing, and a fully functional frontend dashboard.
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h3 className="font-bold text-yellow-400 mb-2">💎 Credit System</h3>
              <p className="text-sm text-gray-200">
                Innovative credit pool allowing staking, borrowing, and liquidity provision - enabling autonomous agent finance.
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h3 className="font-bold text-pink-400 mb-2">🚀 Multi-Chain</h3>
              <p className="text-sm text-gray-200">
                Deployed across Ethereum, Base, Polygon, and Arbitrum for maximum reach and lower gas costs on L2s.
              </p>
            </div>
          </div>
        </div>

        {/* Why This Matters Section */}
        <div className="mb-8 bg-blue-900/30 backdrop-blur-sm rounded-lg p-6 md:p-8 border border-blue-500/50">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">💡 Why This Matters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-blue-300">The Problem</h3>
              <ul className="space-y-2 text-gray-300 text-sm md:text-base">
                <li>• AI agents need ETH to pay for gas, creating complex onboarding</li>
                <li>• ETH price volatility makes cost prediction difficult</li>
                <li>• Autonomous systems struggle with multi-asset management</li>
                <li>• Traditional wallets require manual intervention for gas top-ups</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3 text-green-300">Our Solution</h3>
              <ul className="space-y-2 text-gray-300 text-sm md:text-base">
                <li>• Agents pay gas with MNEE (USD-backed stablecoin) - no volatility</li>
                <li>• ERC-4337 enables true gasless transactions via Paymaster</li>
                <li>• ERC-2612 Permit eliminates approval transactions (more gasless)</li>
                <li>• Deterministic wallets allow predictable addresses for automation</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Technical Standards Section */}
        <div className="mb-8 bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 md:p-8 border border-gray-700">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">🔬 Technical Standards & Compliance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <h3 className="font-bold text-lg mb-2 text-blue-400">ERC-4337</h3>
              <p className="text-sm text-gray-300 mb-2">Account Abstraction Standard</p>
              <p className="text-xs text-gray-400">
                Full implementation of smart contract wallets with EntryPoint, Paymaster, and UserOperation support. Enables gasless transactions via sponsored gas.
              </p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <h3 className="font-bold text-lg mb-2 text-purple-400">ERC-2612</h3>
              <p className="text-sm text-gray-300 mb-2">Permit Extension</p>
              <p className="text-xs text-gray-400">
                Signature-based approvals eliminating the need for separate approval transactions. Agents can permit spending in the same transaction as the transfer.
              </p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <h3 className="font-bold text-lg mb-2 text-green-400">ERC-20</h3>
              <p className="text-sm text-gray-300 mb-2">Token Standard</p>
              <p className="text-xs text-gray-400">
                Full ERC-20 compliance with MNEE stablecoin integration. Supports standard transfer, approval, and balance operations.
              </p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <h3 className="font-bold text-lg mb-2 text-orange-400">CREATE2</h3>
              <p className="text-sm text-gray-300 mb-2">Deterministic Addresses</p>
              <p className="text-xs text-gray-400">
                Wallet factory uses CREATE2 for predictable wallet addresses. Same owner + salt = same address across all chains.
              </p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <h3 className="font-bold text-lg mb-2 text-pink-400">EIP-712</h3>
              <p className="text-sm text-gray-300 mb-2">Typed Data Signing</p>
              <p className="text-xs text-gray-400">
                Secure signature verification using EIP-712 structured data signing. Enables wallet validation and permit signatures.
              </p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <h3 className="font-bold text-lg mb-2 text-yellow-400">Multi-Chain</h3>
              <p className="text-sm text-gray-300 mb-2">Cross-Chain Bridge</p>
              <p className="text-xs text-gray-400">
                Bitcoin ↔ EVM bridge with UTXO support. Enables MNEE transfers between Bitcoin Ordinals and Ethereum L2s. Each UTXO represents 10 MNEE (currently 20 UTXOs = 200 MNEE total).
              </p>
            </div>
          </div>
        </div>

        {/* Contract Addresses & Network Info */}
        <div className="mb-8 bg-gradient-to-r from-green-900/30 to-teal-900/30 backdrop-blur-sm rounded-lg p-6 md:p-8 border border-green-500/50">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">📍 Live Contract Addresses (Sepolia Testnet)</h2>
          <p className="text-sm text-gray-400 mb-4">
            All contracts are deployed on Sepolia testnet (Chain ID: 11155111). Switch to Sepolia to interact with them.
          </p>
          {/* Always show Sepolia contracts, regardless of current chain */}
          {(() => {
            const SEPOLIA_CONTRACTS = getContractsForChain(11155111);
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-black/30 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-400">MNEE Token (ERC-20 + Permit)</p>
                    {isValidAddress(SEPOLIA_CONTRACTS.mneeToken) && (
                      <span className="bg-green-600/30 text-green-400 text-xs px-2 py-1 rounded border border-green-500/50">
                        ✓ Deployed
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-mono break-all text-green-400">
                    {isValidAddress(SEPOLIA_CONTRACTS.mneeToken) ? SEPOLIA_CONTRACTS.mneeToken : "Not deployed"}
                  </p>
                  {isValidAddress(SEPOLIA_CONTRACTS.mneeToken) && (
                    <a 
                      href={`https://sepolia.etherscan.io/address/${SEPOLIA_CONTRACTS.mneeToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline mt-2 inline-block"
                    >
                      View on Explorer →
                    </a>
                  )}
                </div>
                <div className="bg-black/30 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-400">Paymaster (ERC-4337)</p>
                    {isValidAddress(SEPOLIA_CONTRACTS.paymaster) && (
                      <span className="bg-green-600/30 text-green-400 text-xs px-2 py-1 rounded border border-green-500/50">
                        ✓ Deployed
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-mono break-all text-blue-400">
                    {isValidAddress(SEPOLIA_CONTRACTS.paymaster) ? SEPOLIA_CONTRACTS.paymaster : "Not deployed"}
                  </p>
                  {isValidAddress(SEPOLIA_CONTRACTS.paymaster) && (
                    <>
                      <a 
                        href={`https://sepolia.etherscan.io/address/${SEPOLIA_CONTRACTS.paymaster}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline mt-2 inline-block mr-3"
                      >
                        View on Explorer →
                      </a>
                      {chainId === 11155111 && totalGasSponsored !== undefined && typeof totalGasSponsored === 'bigint' && (
                        <p className="text-xs text-gray-500 mt-2">
                          Gas Sponsored: {parseFloat(formatEther(totalGasSponsored)).toFixed(6)} ETH
                        </p>
                      )}
                      {chainId === 11155111 && totalMNEEcollected !== undefined && typeof totalMNEEcollected === 'bigint' && (
                        <p className="text-xs text-gray-500">
                          MNEE Collected: {parseFloat(formatEther(totalMNEEcollected)).toFixed(2)} MNEE
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="bg-black/30 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-400">Wallet Factory (CREATE2)</p>
                    {isValidAddress(SEPOLIA_CONTRACTS.factory) && (
                      <span className="bg-green-600/30 text-green-400 text-xs px-2 py-1 rounded border border-green-500/50">
                        ✓ Deployed
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-mono break-all text-purple-400">
                    {isValidAddress(SEPOLIA_CONTRACTS.factory) ? SEPOLIA_CONTRACTS.factory : "Not deployed"}
                  </p>
                  {isValidAddress(SEPOLIA_CONTRACTS.factory) && (
                    <a 
                      href={`https://sepolia.etherscan.io/address/${SEPOLIA_CONTRACTS.factory}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline mt-2 inline-block"
                    >
                      View on Explorer →
                    </a>
                  )}
                </div>
                {isValidAddress(SEPOLIA_CONTRACTS.creditPool) && (
                  <div className="bg-black/30 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-400">Credit Pool</p>
                      <span className="bg-green-600/30 text-green-400 text-xs px-2 py-1 rounded border border-green-500/50">
                        ✓ Deployed
                      </span>
                    </div>
                    <p className="text-sm font-mono break-all text-orange-400">
                      {SEPOLIA_CONTRACTS.creditPool}
                    </p>
                    <a 
                      href={`https://sepolia.etherscan.io/address/${SEPOLIA_CONTRACTS.creditPool}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline mt-2 inline-block"
                    >
                      View on Explorer →
                    </a>
                  </div>
                )}
                {isValidAddress(SEPOLIA_CONTRACTS.bridge) && (
                  <div className="bg-black/30 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-400">Bridge (Bitcoin ↔ EVM)</p>
                      <span className="bg-green-600/30 text-green-400 text-xs px-2 py-1 rounded border border-green-500/50">
                        ✓ Deployed
                      </span>
                    </div>
                    <p className="text-sm font-mono break-all text-yellow-400">
                      {SEPOLIA_CONTRACTS.bridge}
                    </p>
                    <a 
                      href={`https://sepolia.etherscan.io/address/${SEPOLIA_CONTRACTS.bridge}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline mt-2 inline-block"
                    >
                      View on Explorer →
                    </a>
                  </div>
                )}
                {isValidAddress(SEPOLIA_CONTRACTS.agentWalletStaking) && (
                  <div className="bg-black/30 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-400">Agent Wallet Staking</p>
                      <span className="bg-green-600/30 text-green-400 text-xs px-2 py-1 rounded border border-green-500/50">
                        ✓ Deployed
                      </span>
                    </div>
                    <p className="text-sm font-mono break-all text-cyan-400">
                      {SEPOLIA_CONTRACTS.agentWalletStaking}
                    </p>
                    <a 
                      href={`https://sepolia.etherscan.io/address/${SEPOLIA_CONTRACTS.agentWalletStaking}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline mt-2 inline-block"
                    >
                      View on Explorer →
                    </a>
                  </div>
                )}
                {isValidAddress(SEPOLIA_CONTRACTS.utxoToken) && (
                  <div className="bg-black/30 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-400">MNEE Token UTXO</p>
                      <span className="bg-green-600/30 text-green-400 text-xs px-2 py-1 rounded border border-green-500/50">
                        ✓ Deployed
                      </span>
                    </div>
                    <p className="text-sm font-mono break-all text-pink-400">
                      {SEPOLIA_CONTRACTS.utxoToken}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      📊 Each UTXO = 10 MNEE | Total UTXOs: 20 (200 MNEE)
                    </p>
                    <a 
                      href={`https://sepolia.etherscan.io/address/${SEPOLIA_CONTRACTS.utxoToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline mt-2 inline-block"
                    >
                      View on Explorer →
                    </a>
                  </div>
                )}
                {isValidAddress(SEPOLIA_CONTRACTS.entryPoint) && (
                  <div className="bg-black/30 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-400">EntryPoint (ERC-4337)</p>
                      <span className="bg-blue-600/30 text-blue-400 text-xs px-2 py-1 rounded border border-blue-500/50">
                        Standard
                      </span>
                    </div>
                    <p className="text-sm font-mono break-all text-indigo-400">
                      {SEPOLIA_CONTRACTS.entryPoint}
                    </p>
                    <a 
                      href={`https://sepolia.etherscan.io/address/${SEPOLIA_CONTRACTS.entryPoint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline mt-2 inline-block"
                    >
                      View on Explorer →
                    </a>
                    <p className="text-xs text-gray-500 mt-2">Standard ERC-4337 EntryPoint</p>
                  </div>
                )}
                <div className="bg-black/30 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-400">Current Network</p>
                    <span className={`text-xs px-2 py-1 rounded border ${
                      chainId === 11155111 
                        ? "bg-green-600/30 text-green-400 border-green-500/50" 
                        : "bg-yellow-600/30 text-yellow-400 border-yellow-500/50"
                    }`}>
                      {chainId === 11155111 ? "✓ On Sepolia" : "Switch to Sepolia"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-teal-400">
                    {chainId === 11155111 ? "Sepolia Testnet" : 
                     chainId === 1 ? "Ethereum Mainnet" :
                     chainId === 8453 ? "Base" :
                     chainId === 137 ? "Polygon" :
                     chainId === 42161 ? "Arbitrum" : `Chain ID: ${chainId}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Chain ID: {chainId}</p>
                  {chainId !== 11155111 && (
                    <p className="text-xs text-yellow-400 mt-2">
                      ⚠️ Switch to Sepolia (11155111) to interact with contracts
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
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
              <button
                onClick={() => setActiveTab("tracker")}
                className={`px-6 py-3 rounded-t-lg font-medium transition-colors ${
                  activeTab === "tracker"
                    ? "bg-blue-600 text-white border-b-2 border-blue-400"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                🗺️ Wallet Tracker
              </button>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              {activeTab === "wallet" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <WalletFactory
                    factoryAddress={isValidAddress(CONTRACTS.factory) ? CONTRACTS.factory : "0x0000000000000000000000000000000000000000"}
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
                    paymasterAddress={isValidAddress(CONTRACTS.paymaster) ? CONTRACTS.paymaster : "0x0000000000000000000000000000000000000000"}
                    mneeTokenAddress={isValidAddress(CONTRACTS.mneeToken) ? CONTRACTS.mneeToken : "0x0000000000000000000000000000000000000000"}
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

              {activeTab === "tracker" && (
                <WalletTracker
                  factoryAddress={isValidAddress(CONTRACTS.factory) ? CONTRACTS.factory : "0x0000000000000000000000000000000000000000"}
                  mneeTokenAddress={isValidAddress(CONTRACTS.mneeToken) ? CONTRACTS.mneeToken : "0x0000000000000000000000000000000000000000"}
                  userAddress={address}
                />
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
              paymasterAddress={isValidAddress(CONTRACTS.paymaster) ? CONTRACTS.paymaster : undefined}
              factoryAddress={isValidAddress(CONTRACTS.factory) ? CONTRACTS.factory : undefined}
              mneeTokenAddress={isValidAddress(CONTRACTS.mneeToken) ? CONTRACTS.mneeToken : undefined}
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

        {/* Key Achievements & Milestones */}
        <div className="mt-8 md:mt-12 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 backdrop-blur-sm rounded-lg p-6 md:p-8 border border-yellow-500/50">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">🏆 Key Achievements & Milestones</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-4 border border-white/20 text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-2">100%</div>
              <p className="text-sm text-gray-300">ERC-4337 Compliant</p>
              <p className="text-xs text-gray-400 mt-1">Full standard implementation</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 border border-white/20 text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">4+</div>
              <p className="text-sm text-gray-300">Chains Deployed</p>
              <p className="text-xs text-gray-400 mt-1">Ethereum, Base, Polygon, Arbitrum</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 border border-white/20 text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">8</div>
              <p className="text-sm text-gray-300">Smart Contracts</p>
              <p className="text-xs text-gray-400 mt-1">Token, UTXO Token, Paymaster, Factory, Bridge, Credit Pool, Staking, EntryPoint</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 border border-white/20 text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">3+</div>
              <p className="text-sm text-gray-300">Integrations</p>
              <p className="text-xs text-gray-400 mt-1">Dune Analytics, The Graph, CLI Tools</p>
            </div>
          </div>
        </div>

        {/* Resources & Documentation */}
        <div className="mt-8 md:mt-12 bg-indigo-900/30 backdrop-blur-sm rounded-lg p-6 md:p-8 border border-indigo-500/50">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">📚 Resources & Documentation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a 
              href="https://github.com/your-repo/quipowallet" 
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 hover:bg-white/20 rounded-lg p-4 border border-white/20 transition-all cursor-pointer group"
            >
              <h3 className="font-bold text-indigo-300 mb-2 flex items-center gap-2">
                <span>📦</span> GitHub Repository
                <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity text-blue-400">→ Open</span>
              </h3>
              <p className="text-sm text-gray-300 mb-2">View source code, contracts, and full documentation</p>
              <code className="text-xs text-gray-400 break-all block bg-gray-800/50 px-2 py-1 rounded mt-2">
                github.com/your-repo/quipowallet
              </code>
              <p className="text-xs text-blue-400 mt-2 group-hover:text-blue-300 transition-colors">
                Click to open repository →
              </p>
            </a>
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h3 className="font-bold text-indigo-300 mb-2 flex items-center gap-2">
                <span>📖</span> Architecture Docs
              </h3>
              <p className="text-sm text-gray-300 mb-2">Comprehensive technical documentation</p>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• ARCHITECTURE.md - System design</li>
                <li>• SIMPLE_FLOW.md - 5-step overview</li>
                <li>• FLOW_EXPLAINED.md - Technical details</li>
                <li>• QUIPO_PLATFORM.md - Full platform guide</li>
              </ul>
            </div>
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h3 className="font-bold text-indigo-300 mb-2 flex items-center gap-2">
                <span>🎬</span> Demo Guide
              </h3>
              <p className="text-sm text-gray-300 mb-2">Step-by-step demo instructions</p>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• HACKATHON_DEMO.md - Complete demo flow</li>
                <li>• CLI_COMMANDS.md - CLI usage guide</li>
                <li>• DEMO_COMMANDS.sh - Quick start script</li>
              </ul>
            </div>
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h3 className="font-bold text-indigo-300 mb-2 flex items-center gap-2">
                <span>🔗</span> Official MNEE Contract
              </h3>
              <p className="text-sm text-gray-300 mb-2">Official MNEE stablecoin on Ethereum</p>
              <p className="text-xs font-mono text-indigo-400 break-all">
                0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
              </p>
              <a 
                href="https://etherscan.io/address/0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline mt-2 inline-block"
              >
                View on Etherscan →
              </a>
            </div>
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <h3 className="font-bold text-indigo-300 mb-2 flex items-center gap-2">
                <span>📊</span> Analytics
              </h3>
              <p className="text-sm text-gray-300 mb-2">Real-time blockchain analytics</p>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Dune Analytics integration</li>
                <li>• The Graph subgraph indexing</li>
                <li>• Live dashboard metrics</li>
              </ul>
            </div>
            <a
              href="/cli"
              className="bg-white/10 hover:bg-white/20 rounded-lg p-4 border border-white/20 transition-all cursor-pointer group"
            >
              <h3 className="font-bold text-indigo-300 mb-2 flex items-center gap-2">
                <span>🛠️</span> CLI Tools
                <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity text-blue-400">→ View Commands</span>
              </h3>
              <p className="text-sm text-gray-300 mb-2">Command-line interface for developers</p>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Terminal-style command reference</li>
                <li>• Wallet creation & bridge operations</li>
                <li>• Integration with official MNEE CLI</li>
                <li>• Bitcoin & Ordinals support</li>
              </ul>
              <p className="text-xs text-blue-400 mt-2 group-hover:text-blue-300 transition-colors">
                Click to view all CLI commands →
              </p>
            </a>
          </div>
        </div>

        {/* Use Cases */}
        <div className="mt-8 md:mt-12 bg-teal-900/30 backdrop-blur-sm rounded-lg p-6 md:p-8 border border-teal-500/50">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">💼 Real-World Use Cases</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/10 rounded-lg p-5 border border-white/20">
              <h3 className="text-xl font-bold mb-3 text-teal-300">🤖 AI Agents & Automation</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Autonomous trading bots that pay fees with stablecoins</li>
                <li>• AI assistants managing user portfolios</li>
                <li>• Automated DeFi protocols executing without ETH</li>
                <li>• Smart contract wallets for AI-driven commerce</li>
              </ul>
            </div>
            <div className="bg-white/10 rounded-lg p-5 border border-white/20">
              <h3 className="text-xl font-bold mb-3 text-cyan-300">🏢 Enterprise Applications</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Corporate wallets with MNEE-backed operations</li>
                <li>• Multi-signature agent wallets for teams</li>
                <li>• Automated payroll and treasury management</li>
                <li>• Cross-chain business operations</li>
              </ul>
            </div>
            <div className="bg-white/10 rounded-lg p-5 border border-white/20">
              <h3 className="text-xl font-bold mb-3 text-emerald-300">🌉 Cross-Chain Commerce</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Bitcoin ↔ EVM bridge for MNEE transfers</li>
                <li>• UTXO model support for Bitcoin Ordinals (10 MNEE per UTXO, 20 UTXOs = 200 MNEE)</li>
                <li>• Multi-chain agent operations</li>
                <li>• Unified stablecoin payments across chains</li>
              </ul>
            </div>
            <div className="bg-white/10 rounded-lg p-5 border border-white/20">
              <h3 className="text-xl font-bold mb-3 text-sky-300">💰 Autonomous Finance</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Credit lines for AI agents (stake to borrow)</li>
                <li>• Liquidity provision with automatic rewards</li>
                <li>• Self-managing agent portfolios</li>
                <li>• Gasless DeFi interactions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}


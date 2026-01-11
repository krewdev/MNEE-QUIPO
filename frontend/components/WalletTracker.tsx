"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount, useReadContract, useChainId, usePublicClient } from "wagmi";
import { formatEther, parseEther } from "viem";
import { getContractsForChain } from "@/config/chains";

const FactoryABI = [
  "function totalWallets() view returns (uint256)",
  "function getAllWallets(uint256 offset, uint256 limit) view returns (address[])",
  "function getWallet(address owner) view returns (address)",
] as const;

const MNEETokenABI = [
  "function balanceOf(address owner) view returns (uint256)",
] as const;

const AgentWalletABI = [
  "function owner() view returns (address)",
  "function entryPoint() view returns (address)",
] as const;

interface WalletData {
  address: string;
  owner: string;
  balance: string;
  balanceBN: bigint;
  index: number;
  x?: number;
  y?: number;
  size?: number;
}

interface WalletTrackerProps {
  factoryAddress: string;
  mneeTokenAddress: string;
  userAddress?: string;
}

export default function WalletTracker({
  factoryAddress,
  mneeTokenAddress,
  userAddress,
}: WalletTrackerProps) {
  const { address: connectedAddress } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [selectedWallet, setSelectedWallet] = useState<WalletData | null>(null);
  const [walletList, setWalletList] = useState<WalletData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "mine">("mine");
  const [bubbleLayout, setBubbleLayout] = useState<{ width: number; height: number }>({ width: 800, height: 600 });
  const [subgraphUrl, setSubgraphUrl] = useState<string | null>(null);

  const currentUser = userAddress || connectedAddress;

  // Read total wallets count
  const { data: totalWallets } = useReadContract({
    address: factoryAddress as `0x${string}`,
    abi: FactoryABI,
    functionName: "totalWallets",
    query: {
      enabled: !!factoryAddress && factoryAddress !== "0x0000000000000000000000000000000000000000",
      refetchInterval: 10000,
    },
  });

  // Calculate bubble positions using simple force-based layout
  const calculateBubbleLayout = (wallets: WalletData[]) => {
    if (wallets.length === 0) return wallets;

    const centerX = bubbleLayout.width / 2;
    const centerY = bubbleLayout.height / 2;
    const radius = Math.min(bubbleLayout.width, bubbleLayout.height) * 0.35;

    // Calculate size based on balance
    const maxBalance = wallets.reduce((max, w) => {
      const balance = parseFloat(w.balance) || 0;
      return balance > max ? balance : max;
    }, 0);

    return wallets.map((wallet, index) => {
      const angle = (index / wallets.length) * Math.PI * 2;
      const distance = radius * (0.7 + (Math.random() * 0.3)); // Add some randomness
      
      // Size based on balance (minimum size 30, max 120)
      const balanceRatio = maxBalance > 0 ? parseFloat(wallet.balance) / maxBalance : 0;
      const size = Math.max(30, Math.min(120, 30 + balanceRatio * 90));

      return {
        ...wallet,
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        size,
      };
    });
  };

  // Fetch user's wallet if connected
  const { data: userWalletAddress } = useReadContract({
    address: factoryAddress as `0x${string}`,
    abi: FactoryABI,
    functionName: "getWallet",
    args: currentUser ? [currentUser] : undefined,
    query: {
      enabled: !!factoryAddress && !!currentUser && factoryAddress !== "0x0000000000000000000000000000000000000000",
      refetchInterval: 10000,
    },
  });

  // Fetch balance for user's wallet
  const { data: userWalletBalance } = useReadContract({
    address: mneeTokenAddress as `0x${string}`,
    abi: MNEETokenABI,
    functionName: "balanceOf",
    args: userWalletAddress ? [userWalletAddress] : undefined,
    query: {
      enabled: !!mneeTokenAddress && !!userWalletAddress && userWalletAddress !== "0x0000000000000000000000000000000000000000",
      refetchInterval: 10000,
    },
  });

  // Fetch wallets from contract
  useEffect(() => {
    const fetchWallets = async () => {
      if (!factoryAddress || factoryAddress === "0x0000000000000000000000000000000000000000") {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const wallets: WalletData[] = [];

        // Add user's wallet if it exists
        if (currentUser && userWalletAddress && userWalletAddress !== "0x0000000000000000000000000000000000000000") {
          const balance = userWalletBalance ? formatEther(userWalletBalance as bigint) : "0";
          wallets.push({
            address: userWalletAddress as string,
            owner: currentUser,
            balance,
            balanceBN: userWalletBalance as bigint || BigInt(0),
            index: 0,
          });
        }

        // If filter is "all", fetch all wallets from contract using getAllWallets
        if (filter === "all" && totalWallets && Number(totalWallets) > 0 && publicClient && factoryAddress) {
          try {
            const total = Number(totalWallets);
            const batchSize = 50;
            const batches = Math.ceil(total / batchSize);
            const allWalletAddresses: string[] = [];

            // Fetch wallets in batches
            for (let i = 0; i < batches; i++) {
              const offset = i * batchSize;
              const limit = Math.min(batchSize, total - offset);
              
              try {
                const batchWallets = await publicClient.readContract({
                  address: factoryAddress as `0x${string}`,
                  abi: FactoryABI,
                  functionName: "getAllWallets",
                  args: [BigInt(offset), BigInt(limit)],
                }) as string[];

                allWalletAddresses.push(...batchWallets);
              } catch (e) {
                console.error(`Error fetching wallet batch ${i}:`, e);
                // Continue with other batches
              }
            }

            // Fetch balances and owner info for all wallets
            const walletsWithData = await Promise.all(
              allWalletAddresses.map(async (walletAddr, index) => {
                try {
                  // Fetch balance
                  const balance = await publicClient.readContract({
                    address: mneeTokenAddress as `0x${string}`,
                    abi: MNEETokenABI,
                    functionName: "balanceOf",
                    args: [walletAddr as `0x${string}`],
                  }) as bigint;

                  // Try to get owner from wallet contract
                  let owner = walletAddr; // Default to wallet address if can't fetch owner
                  try {
                    const ownerFromContract = await publicClient.readContract({
                      address: walletAddr as `0x${string}`,
                      abi: AgentWalletABI,
                      functionName: "owner",
                    }) as string;
                    owner = ownerFromContract;
                  } catch (e) {
                    // If can't fetch owner, use wallet address
                    console.log(`Could not fetch owner for ${walletAddr}`);
                  }

                  return {
                    address: walletAddr,
                    owner,
                    balance: formatEther(balance),
                    balanceBN: balance,
                    index,
                  };
                } catch (e) {
                  console.error(`Error fetching data for wallet ${walletAddr}:`, e);
                  return {
                    address: walletAddr,
                    owner: walletAddr,
                    balance: "0",
                    balanceBN: BigInt(0),
                    index,
                  };
                }
              })
            );

            // Combine user's wallet with all wallets (avoid duplicates)
            const combinedWallets = [...wallets];
            walletsWithData.forEach(w => {
              if (!combinedWallets.find(existing => existing.address.toLowerCase() === w.address.toLowerCase())) {
                combinedWallets.push(w);
              }
            });

            setWalletList(combinedWallets);
          } catch (error) {
            console.error("Error fetching all wallets:", error);
            // Fall back to just user's wallet
            setWalletList(wallets);
          }
        } else {
          // For "mine" filter or if no public client, just show user's wallet(s)
          setWalletList(wallets);
        }
      } catch (error) {
        console.error("Error fetching wallets:", error);
        setWalletList([]);
      } finally {
        setLoading(false);
      }
    };

    if (factoryAddress) {
      fetchWallets();
    } else {
      setLoading(false);
    }
  }, [factoryAddress, currentUser, userWalletAddress, userWalletBalance, filter, totalWallets, publicClient, mneeTokenAddress]);

  // Filter wallets
  const filteredWallets = useMemo(() => {
    let filtered = walletList;
    if (filter === "mine" && currentUser) {
      filtered = walletList.filter(w => 
        w.owner.toLowerCase() === currentUser.toLowerCase() || 
        w.address.toLowerCase() === currentUser.toLowerCase()
      );
    }
    return calculateBubbleLayout(filtered);
  }, [walletList, filter, currentUser, bubbleLayout]);

  // Update layout on window resize
  useEffect(() => {
    const updateLayout = () => {
      setBubbleLayout({
        width: Math.min(1200, window.innerWidth - 100),
        height: 600,
      });
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  const getExplorerUrl = (addr: string) => {
    if (chainId === 11155111) return `https://sepolia.etherscan.io/address/${addr}`;
    if (chainId === 1) return `https://etherscan.io/address/${addr}`;
    if (chainId === 8453) return `https://basescan.org/address/${addr}`;
    if (chainId === 137) return `https://polygonscan.com/address/${addr}`;
    if (chainId === 42161) return `https://arbiscan.io/address/${addr}`;
    return `https://etherscan.io/address/${addr}`;
  };

  const getBubbleColor = (balance: string) => {
    const bal = parseFloat(balance) || 0;
    if (bal > 100) return "from-green-500 to-emerald-600";
    if (bal > 10) return "from-blue-500 to-cyan-600";
    if (bal > 1) return "from-purple-500 to-pink-600";
    return "from-gray-500 to-gray-600";
  };

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">🗺️ Agent Wallet Tracker</h2>
          <p className="text-sm text-gray-400">
            Visualize and interact with your agent wallets. Click on any wallet to view details.
          </p>
          {totalWallets ? (
            <p className="text-xs text-gray-500 mt-1">
              Total Wallets Created: {totalWallets.toString()}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("mine")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "mine"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-400 hover:text-white"
            }`}
          >
            My Wallets
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-400 hover:text-white"
            }`}
          >
            All Wallets
          </button>
        </div>
      </div>

      {/* Bubble Map Visualization */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700 relative overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading agent wallets...</p>
            </div>
          </div>
        ) : filteredWallets.length === 0 ? (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-center">
              <p className="text-xl text-gray-400 mb-2">No wallets found</p>
              <p className="text-sm text-gray-500">
                {filter === "mine" 
                  ? "Create your first agent wallet to see it here"
                  : "No wallets have been created yet"}
              </p>
            </div>
          </div>
        ) : (
          <div 
            className="relative"
            style={{ width: `${bubbleLayout.width}px`, height: `${bubbleLayout.height}px`, margin: '0 auto' }}
          >
            {/* Bubble Map */}
            {filteredWallets.map((wallet, index) => (
              <div
                key={wallet.address}
                onClick={() => setSelectedWallet(wallet)}
                className={`absolute cursor-pointer transition-all duration-300 hover:scale-110 hover:z-50 ${
                  selectedWallet?.address === wallet.address ? 'ring-4 ring-blue-400 scale-110 z-50' : ''
                }`}
                style={{
                  left: `${wallet.x! - wallet.size! / 2}px`,
                  top: `${wallet.y! - wallet.size! / 2}px`,
                  width: `${wallet.size}px`,
                  height: `${wallet.size}px`,
                }}
              >
                <div
                  className={`w-full h-full rounded-full bg-gradient-to-br ${getBubbleColor(wallet.balance)} shadow-lg border-2 border-white/20 flex items-center justify-center text-white font-bold transition-all hover:shadow-2xl`}
                  style={{
                    fontSize: `${Math.max(10, Math.min(16, wallet.size! * 0.15))}px`,
                  }}
                >
                  <div className="text-center px-2">
                    <div className="text-xs md:text-sm font-mono truncate max-w-full" title={wallet.address}>
                      {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                    </div>
                    <div className="text-xs mt-1">
                      {parseFloat(wallet.balance).toFixed(2)} MNEE
                    </div>
                  </div>
                </div>
                {/* Pulse animation for active wallets */}
                {(parseFloat(wallet.balance) || 0) > 0 && (
                  <div className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping"></div>
                )}
              </div>
            ))}

            {/* Connection lines (optional - shows relationships) */}
            {filteredWallets.length > 1 && filter === "all" && (
              <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                {filteredWallets.slice(0, -1).map((wallet, i) => {
                  const next = filteredWallets[i + 1];
                  if (!next) return null;
                  return (
                    <line
                      key={`line-${i}`}
                      x1={wallet.x}
                      y1={wallet.y}
                      x2={next.x}
                      y2={next.y}
                      stroke="rgba(59, 130, 246, 0.2)"
                      strokeWidth="1"
                    />
                  );
                })}
              </svg>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-green-500 to-emerald-600"></div>
            <span>High Balance (&gt;100 MNEE)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600"></div>
            <span>Medium Balance (10-100 MNEE)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-600"></div>
            <span>Low Balance (1-10 MNEE)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gray-500 to-gray-600"></div>
            <span>Zero Balance</span>
          </div>
        </div>
      </div>

      {/* Selected Wallet Details Panel */}
      {selectedWallet && (
        <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-sm rounded-lg p-6 border border-blue-500/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-blue-400">Wallet Details</h3>
            <button
              onClick={() => setSelectedWallet(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-black/30 rounded-lg p-4 border border-gray-600">
              <p className="text-xs text-gray-400 mb-1">Wallet Address</p>
              <p className="text-sm font-mono text-blue-400 break-all">{selectedWallet.address}</p>
              <a
                href={getExplorerUrl(selectedWallet.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline mt-2 inline-block"
              >
                View on Explorer →
              </a>
            </div>

            <div className="bg-black/30 rounded-lg p-4 border border-gray-600">
              <p className="text-xs text-gray-400 mb-1">Owner Address</p>
              <p className="text-sm font-mono text-purple-400 break-all">{selectedWallet.owner}</p>
              <a
                href={getExplorerUrl(selectedWallet.owner)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline mt-2 inline-block"
              >
                View on Explorer →
              </a>
            </div>

            <div className="bg-black/30 rounded-lg p-4 border border-gray-600">
              <p className="text-xs text-gray-400 mb-1">MNEE Balance</p>
              <p className="text-2xl font-bold text-green-400">{parseFloat(selectedWallet.balance).toFixed(4)} MNEE</p>
            </div>

            <div className="bg-black/30 rounded-lg p-4 border border-gray-600">
              <p className="text-xs text-gray-400 mb-1">Wallet Index</p>
              <p className="text-xl font-bold text-orange-400">#{selectedWallet.index}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={() => {
                // Navigate to send tab with pre-filled wallet address
                window.dispatchEvent(new CustomEvent('navigate-to-send', { detail: { wallet: selectedWallet.address } }));
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
            >
              📤 Send to This Wallet
            </button>
            <button
              onClick={() => {
                // Copy wallet address
                navigator.clipboard.writeText(selectedWallet.address);
                alert('Wallet address copied to clipboard!');
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
            >
              📋 Copy Address
            </button>
            <button
              onClick={() => {
                // View transactions
                window.open(getExplorerUrl(selectedWallet.address), '_blank');
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
            >
              📊 View Transactions
            </button>
          </div>
        </div>
      )}

      {/* Wallet List View (Alternative to bubble map) */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-bold mb-4">Wallet List View</h3>
        {filteredWallets.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No wallets to display</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredWallets.map((wallet) => (
              <div
                key={wallet.address}
                onClick={() => setSelectedWallet(wallet)}
                className={`p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg border cursor-pointer transition-all ${
                  selectedWallet?.address === wallet.address ? 'border-blue-500 bg-blue-900/30' : 'border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-3 h-3 rounded-full bg-gradient-to-br ${getBubbleColor(wallet.balance)}`}
                      ></div>
                      <p className="text-sm font-mono text-gray-300 truncate">{wallet.address}</p>
                    </div>
                    <p className="text-xs text-gray-400">
                      Owner: {wallet.owner.slice(0, 10)}...{wallet.owner.slice(-8)}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-green-400">{parseFloat(wallet.balance).toFixed(2)} MNEE</p>
                    <p className="text-xs text-gray-500">Index: #{wallet.index}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


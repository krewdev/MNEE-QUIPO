"use client";

import { formatEther } from "viem";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface StatsDashboardProps {
  totalGasSponsored: bigint | undefined;
  totalMNEEcollected: bigint | undefined;
  mneeBalance: string;
  isConnected: boolean;
}

export default function StatsDashboard({
  totalGasSponsored,
  totalMNEEcollected,
  mneeBalance,
  isConnected,
}: StatsDashboardProps) {
  // Mock data for charts (in production, fetch from subgraph)
  const transactionData = [
    { time: "00:00", transactions: 12, gas: 0.05 },
    { time: "04:00", transactions: 19, gas: 0.08 },
    { time: "08:00", transactions: 25, gas: 0.12 },
    { time: "12:00", transactions: 32, gas: 0.15 },
    { time: "16:00", transactions: 28, gas: 0.13 },
    { time: "20:00", transactions: 22, gas: 0.10 },
  ];

  const gasSponsored = totalGasSponsored ? formatEther(totalGasSponsored) : "0";
  const mneeCollected = totalMNEEcollected ? formatEther(totalMNEEcollected) : "0";

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-blue-600/20 backdrop-blur-sm border border-blue-500/50 rounded-lg p-4 md:p-6 hover:bg-blue-600/30 transition-all">
          <p className="text-xs md:text-sm text-gray-300 mb-1">Total Gas Sponsored</p>
          <p className="text-xl md:text-2xl font-bold">{parseFloat(gasSponsored).toFixed(4)} ETH</p>
          <p className="text-xs text-gray-400 mt-2">Paymaster has sponsored this amount in gas fees</p>
        </div>

        <div className="bg-purple-600/20 backdrop-blur-sm border border-purple-500/50 rounded-lg p-4 md:p-6 hover:bg-purple-600/30 transition-all">
          <p className="text-xs md:text-sm text-gray-300 mb-1">MNEE Collected</p>
          <p className="text-xl md:text-2xl font-bold">{parseFloat(mneeCollected).toFixed(2)} MNEE</p>
          <p className="text-xs text-gray-400 mt-2">Total MNEE tokens collected as payment</p>
        </div>

        <div className="bg-green-600/20 backdrop-blur-sm border border-green-500/50 rounded-lg p-4 md:p-6 hover:bg-green-600/30 transition-all">
          <p className="text-xs md:text-sm text-gray-300 mb-1">Your MNEE Balance</p>
          <p className="text-xl md:text-2xl font-bold">
            {isConnected ? parseFloat(mneeBalance).toFixed(2) : "0.00"} MNEE
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {isConnected ? "Your current MNEE token balance" : "Connect wallet to see balance"}
          </p>
        </div>

        <div className="bg-orange-600/20 backdrop-blur-sm border border-orange-500/50 rounded-lg p-4 md:p-6 hover:bg-orange-600/30 transition-all">
          <p className="text-xs md:text-sm text-gray-300 mb-1">Active Wallets</p>
          <p className="text-xl md:text-2xl font-bold">Live</p>
          <p className="text-xs text-gray-400 mt-2">Agent wallets created via factory</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold mb-4">Transactions Over Time</h3>
          <div className="w-full" style={{ height: '200px', minHeight: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={transactionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="transactions"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: "#3B82F6" }}
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold mb-4">Gas Usage</h3>
          <div className="w-full" style={{ height: '200px', minHeight: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={transactionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="gas" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}


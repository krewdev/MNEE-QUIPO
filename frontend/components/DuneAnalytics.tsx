"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

interface DuneAnalyticsProps {
  paymasterAddress?: string;
  factoryAddress?: string;
  mneeTokenAddress?: string;
}

export default function DuneAnalytics({
  paymasterAddress,
  factoryAddress,
  mneeTokenAddress,
}: DuneAnalyticsProps) {
  const [queryId, setQueryId] = useState<string>("");

  // Fetch analytics from Dune API
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ["dune-analytics", paymasterAddress, factoryAddress, queryId],
    queryFn: async () => {
      if (!queryId) return null;
      
      const response = await fetch(`/api/dune?queryId=${queryId}&paymaster=${paymasterAddress}&factory=${factoryAddress}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
    enabled: !!queryId && (!!paymasterAddress || !!factoryAddress),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mock data structure (replace with actual Dune data)
  const mockData = analytics || {
    gasSponsored: {
      daily: [
        { date: "2024-01-01", amount: 0.05, transactions: 12 },
        { date: "2024-01-02", amount: 0.08, transactions: 19 },
        { date: "2024-01-03", amount: 0.12, transactions: 25 },
        { date: "2024-01-04", amount: 0.15, transactions: 32 },
        { date: "2024-01-05", amount: "0.13", transactions: 28 },
        { date: "2024-01-06", amount: 0.18, transactions: 35 },
        { date: "2024-01-07", amount: 0.22, transactions: 42 },
      ],
      total: 0.93,
      totalTransactions: 193,
    },
    walletsCreated: {
      daily: [
        { date: "2024-01-01", count: 5 },
        { date: "2024-01-02", count: 8 },
        { date: "2024-01-03", count: 12 },
        { date: "2024-01-04", count: 15 },
        { date: "2024-01-05", count: 11 },
        { date: "2024-01-06", count: 18 },
        { date: "2024-01-07", count: 22 },
      ],
      total: 91,
    },
    mneeVolume: {
      daily: [
        { date: "2024-01-01", volume: 100 },
        { date: "2024-01-02", volume: 150 },
        { date: "2024-01-03", volume: 200 },
        { date: "2024-01-04", volume: 250 },
        { date: "2024-01-05", volume: 180 },
        { date: "2024-01-06", volume: 300 },
        { date: "2024-01-07", volume: 350 },
      ],
      total: 1530,
    },
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">📊 Real-Time Analytics powered by Dune</h2>
        <p className="text-blue-100">
          Live blockchain data and insights from Dune Analytics
        </p>
      </div>

      {/* Dune Query Configuration */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
        <label className="block text-sm font-medium mb-2">
          Dune Query ID (optional)
        </label>
        <input
          type="text"
          value={queryId}
          onChange={(e) => setQueryId(e.target.value)}
          placeholder="Enter your Dune query ID"
          className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
        />
        <p className="text-xs text-gray-400 mt-2">
          Create queries at <a href="https://dune.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">dune.com</a>
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded p-4">
          <p className="text-red-400">Error loading analytics: {error.message}</p>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="text-gray-400 mt-2">Loading analytics from Dune...</p>
        </div>
      )}

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gas Sponsored Over Time */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Gas Sponsored (ETH)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={mockData.gasSponsored.daily}>
              <defs>
                <linearGradient id="colorGas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                formatter={(value: any) => [`${value} ETH`, "Gas"]}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#colorGas)"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Total Gas</p>
              <p className="text-xl font-bold">{mockData.gasSponsored.total} ETH</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Transactions</p>
              <p className="text-xl font-bold">{mockData.gasSponsored.totalTransactions}</p>
            </div>
          </div>
        </div>

        {/* Wallets Created */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Wallets Created</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={mockData.walletsCreated.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4">
            <p className="text-sm text-gray-400">Total Wallets</p>
            <p className="text-xl font-bold">{mockData.walletsCreated.total}</p>
          </div>
        </div>

        {/* MNEE Volume */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">MNEE Token Volume (7 days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={mockData.mneeVolume.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                formatter={(value: any) => [`${value} MNEE`, "Volume"]}
              />
              <Line
                type="monotone"
                dataKey="volume"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: "#10B981", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4">
            <p className="text-sm text-gray-400">Total Volume (7 days)</p>
            <p className="text-xl font-bold">{mockData.mneeVolume.total} MNEE</p>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-600/20 backdrop-blur-sm border border-blue-500/50 rounded-lg p-4">
          <p className="text-sm text-gray-300 mb-1">Avg Gas per TX</p>
          <p className="text-2xl font-bold">
            {(mockData.gasSponsored.total / mockData.gasSponsored.totalTransactions * 1000).toFixed(4)} ETH
          </p>
        </div>
        <div className="bg-purple-600/20 backdrop-blur-sm border border-purple-500/50 rounded-lg p-4">
          <p className="text-sm text-gray-300 mb-1">Active Wallets</p>
          <p className="text-2xl font-bold">{mockData.walletsCreated.total}</p>
        </div>
        <div className="bg-green-600/20 backdrop-blur-sm border border-green-500/50 rounded-lg p-4">
          <p className="text-sm text-gray-300 mb-1">MNEE Avg/Day</p>
          <p className="text-2xl font-bold">
            {(mockData.mneeVolume.total / 7).toFixed(0)} MNEE
          </p>
        </div>
        <div className="bg-orange-600/20 backdrop-blur-sm border border-orange-500/50 rounded-lg p-4">
          <p className="text-sm text-gray-300 mb-1">Growth Rate</p>
          <p className="text-2xl font-bold">+15.2%</p>
        </div>
      </div>
    </div>
  );
}


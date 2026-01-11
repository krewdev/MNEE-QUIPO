"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import {
  mainnet,
  sepolia,
  base,
  baseSepolia,
  polygon,
  polygonMumbai,
  arbitrum,
  arbitrumSepolia,
} from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Support multiple chains for broader MNEE reach
// Always include Sepolia for demo purposes
const supportedChains = [
  mainnet,
  sepolia, // Always include for demo
  base,
  polygon,
  arbitrum,
  // Additional testnets for development
  ...(process.env.NODE_ENV === "development" ? [baseSepolia, polygonMumbai, arbitrumSepolia] : []),
];

// Get WalletConnect project ID from environment or use a default demo ID
// Note: For production, you should get your own from https://cloud.walletconnect.com
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 
  (process.env.NODE_ENV === "development" ? "demo-project-id" : "");

const config = getDefaultConfig({
  appName: "QuipoWallet",
  projectId: walletConnectProjectId || "demo-project-id",
  chains: supportedChains as any,
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}


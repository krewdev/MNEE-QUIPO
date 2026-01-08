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
const supportedChains = [
  mainnet,
  base,
  polygon,
  arbitrum,
  // Testnets (can be removed in production)
  ...(process.env.NODE_ENV === "development" ? [sepolia, baseSepolia, polygonMumbai, arbitrumSepolia] : []),
];

const config = getDefaultConfig({
  appName: "QuipoWallet",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
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


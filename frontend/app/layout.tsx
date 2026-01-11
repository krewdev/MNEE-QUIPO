import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QuipoWallet - Gasless Agent Wallet | MNEE Hackathon Entry",
  description: "ERC-4337 Account Abstraction wallet enabling AI agents to pay for gas using MNEE stablecoin. Full ERC-4337 + ERC-2612 Permit implementation with Bitcoin ↔ EVM bridge, multi-chain support, and production-ready contracts.",
  keywords: ["ERC-4337", "Account Abstraction", "MNEE", "stablecoin", "AI agents", "gasless transactions", "ERC-2612", "Ethereum", "Bitcoin bridge", "Blockchain", "Hackathon"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


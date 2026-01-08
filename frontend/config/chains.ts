/**
 * Chain-specific contract addresses
 * Update these after deploying to each chain
 */

export interface ChainContracts {
  mneeToken: string;
  paymaster: string;
  factory: string;
  creditPool?: string;
  bridge?: string;
  agentWalletStaking?: string;
}

export const CHAIN_CONTRACTS: Record<number, ChainContracts> = {
  // Ethereum Mainnet
  1: {
    mneeToken: "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF", // Official MNEE
    paymaster: process.env.NEXT_PUBLIC_PAYMASTER_ETHEREUM || "",
    factory: process.env.NEXT_PUBLIC_FACTORY_ETHEREUM || "",
  },
  // Base
  8453: {
    mneeToken: process.env.NEXT_PUBLIC_MNEE_TOKEN_BASE || "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF", // May need bridging
    paymaster: process.env.NEXT_PUBLIC_PAYMASTER_BASE || "",
    factory: process.env.NEXT_PUBLIC_FACTORY_BASE || "",
  },
  // Polygon
  137: {
    mneeToken: process.env.NEXT_PUBLIC_MNEE_TOKEN_POLYGON || "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF", // May need bridging
    paymaster: process.env.NEXT_PUBLIC_PAYMASTER_POLYGON || "",
    factory: process.env.NEXT_PUBLIC_FACTORY_POLYGON || "",
  },
  // Arbitrum
  42161: {
    mneeToken: process.env.NEXT_PUBLIC_MNEE_TOKEN_ARBITRUM || "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF", // May need bridging
    paymaster: process.env.NEXT_PUBLIC_PAYMASTER_ARBITRUM || "",
    factory: process.env.NEXT_PUBLIC_FACTORY_ARBITRUM || "",
  },
  // Sepolia (testnet)
  11155111: {
    mneeToken: process.env.NEXT_PUBLIC_MNEE_TOKEN_SEPOLIA || "0xc34c79b53d85aB19e253Bd4e775941227a683214",
    paymaster: process.env.NEXT_PUBLIC_PAYMASTER_SEPOLIA || "0x57c760DAd6b54d4Cf7b4551901D4a7C5Ab5D1C26",
    factory: process.env.NEXT_PUBLIC_FACTORY_SEPOLIA || "0x3BA8637D04a84261BB90356F08878B502f74028c",
    creditPool: process.env.NEXT_PUBLIC_CREDIT_POOL_SEPOLIA || "0xa490D51B749ba239f73fAA2e550220dB00D39018",
    bridge: process.env.NEXT_PUBLIC_BRIDGE_SEPOLIA || "0x22Fc4BbF8104E3EFAE9D271A8Bd96a7dF957B51D",
    agentWalletStaking: process.env.NEXT_PUBLIC_AGENT_WALLET_STAKING_SEPOLIA || "0xfDbF41F581f87Afd6E43D09B2C5E878c8dF25AA4",
  },
  // Base Sepolia (testnet)
  84532: {
    mneeToken: process.env.NEXT_PUBLIC_MNEE_TOKEN_BASE_SEPOLIA || "",
    paymaster: process.env.NEXT_PUBLIC_PAYMASTER_BASE_SEPOLIA || "",
    factory: process.env.NEXT_PUBLIC_FACTORY_BASE_SEPOLIA || "",
  },
};

export function getContractsForChain(chainId: number): ChainContracts {
  return CHAIN_CONTRACTS[chainId] || {
    mneeToken: "0x0000000000000000000000000000000000000000",
    paymaster: "0x0000000000000000000000000000000000000000",
    factory: "0x0000000000000000000000000000000000000000",
  };
}



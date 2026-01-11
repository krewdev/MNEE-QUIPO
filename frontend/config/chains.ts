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
  utxoToken?: string;
  entryPoint?: string;
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
  // Sepolia (testnet) - Deployed contracts from DEPLOYMENT_SEPOLIA.json
  11155111: {
    // All contracts deployed and verified
    mneeToken: "0xc34c79b53d85aB19e253Bd4e775941227a683214",
    paymaster: "0x57c760DAd6b54d4Cf7b4551901D4a7C5Ab5D1C26",
    factory: "0x3BA8637D04a84261BB90356F08878B502f74028c",
    creditPool: "0xa490D51B749ba239f73fAA2e550220dB00D39018",
    bridge: "0x22Fc4BbF8104E3EFAE9D271A8Bd96a7dF957B51D",
    agentWalletStaking: "0xfDbF41F581f87Afd6E43D09B2C5E878c8dF25AA4",
    utxoToken: "0x1275B486e33BD4F390f1C4778bbe8969466Bf37B",
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032", // Standard ERC-4337 EntryPoint
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



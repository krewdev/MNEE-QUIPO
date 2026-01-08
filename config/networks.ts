/**
 * Multi-chain network configuration for QuipoWallet
 * Supports Ethereum, Base, Polygon, and Arbitrum
 */

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorer: string;
  entryPoint: string;
  mneeToken?: string; // If MNEE is bridged/deployed on this chain
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const NETWORKS: Record<string, NetworkConfig> = {
  // Mainnets
  ethereum: {
    name: "Ethereum Mainnet",
    chainId: 1,
    rpcUrl: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
    explorer: "https://etherscan.io",
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
    mneeToken: "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF", // Official MNEE
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
    explorer: "https://basescan.org",
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032", // Same EntryPoint on Base
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpcUrl: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
    explorer: "https://polygonscan.com",
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpcUrl: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  // Testnets
  sepolia: {
    name: "Sepolia",
    chainId: 11155111,
    // Use PublicNode by default (tested and working), but recommend setting SEPOLIA_RPC_URL with your own API key
    rpcUrl: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    explorer: "https://sepolia.etherscan.io",
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  baseSepolia: {
    name: "Base Sepolia",
    chainId: 84532,
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  polygonMumbai: {
    name: "Polygon Mumbai",
    chainId: 80001,
    rpcUrl: process.env.MUMBAI_RPC_URL || "https://rpc-mumbai.maticvigil.com",
    explorer: "https://mumbai.polygonscan.com",
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
  },
};

export const SUPPORTED_CHAINS = {
  mainnets: ["ethereum", "base", "polygon", "arbitrum"],
  testnets: ["sepolia", "baseSepolia", "polygonMumbai"],
  all: ["ethereum", "base", "polygon", "arbitrum", "sepolia", "baseSepolia", "polygonMumbai"],
};



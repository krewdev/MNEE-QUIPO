import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Helper function to get accounts array, validating private key format
function getAccounts(): string[] {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    return [];
  }
  
  // Remove 0x prefix if present
  const cleanKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  
  // Private key should be 64 hex characters (32 bytes)
  if (cleanKey.length === 64 && /^[0-9a-fA-F]+$/.test(cleanKey)) {
    return [privateKey];
  }
  
  // If it's a placeholder, return empty array
  if (privateKey.includes("your_private_key") || privateKey.includes("example")) {
    return [];
  }
  
  // Invalid format, return empty array (will show error in deployment script)
  return [];
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    // Mainnets
    ethereum: {
      url: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
      accounts: getAccounts(),
      chainId: 1,
    },
    base: {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts: getAccounts(),
      chainId: 8453,
      timeout: 60000,
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: getAccounts(),
      chainId: 137,
      timeout: 60000,
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      accounts: getAccounts(),
      chainId: 42161,
      timeout: 60000,
    },
    // Testnets
    sepolia: {
      // Use PublicNode by default (tested and working), but recommend setting SEPOLIA_RPC_URL with your own API key
      url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: getAccounts(),
      chainId: 11155111,
      timeout: 120000, // 120 seconds for public RPCs
      httpHeaders: {},
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: getAccounts(),
      chainId: 84532,
    },
    polygonMumbai: {
      url: process.env.MUMBAI_RPC_URL || "https://rpc-mumbai.maticvigil.com",
      accounts: getAccounts(),
      chainId: 80001,
    },
  },
  etherscan: {
    // Use Etherscan API V2 (single API key for all networks)
    apiKey: process.env.ETHERSCAN_API_KEY || {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "",
      baseSepolia: process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
      arbitrumOne: process.env.ARBISCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;


import { ethers } from "hardhat";

async function main() {
  const address = process.env.CONTRACT_ADDRESS || "0xbe482f07229bf451dc57Be1270662Fb62a6872e0";
  const provider = new ethers.JsonRpcProvider(
    process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com"
  );

  console.log(`Checking contract at: ${address}\n`);

  // Check if it's a contract
  const code = await provider.getCode(address);
  if (code === "0x") {
    console.log("❌ Not a contract (EOA)");
    return;
  }

  console.log("✅ Is a contract");
  console.log(`Code length: ${code.length} bytes\n`);

  // Try to identify by checking for known function selectors
  const BridgeABI = [
    "function utxoToken() view returns (address)",
    "function erc20Token() view returns (address)",
    "function owner() view returns (address)",
  ];

  const UTXOABI = [
    "function totalSupply() view returns (uint256)",
    "function owner() view returns (address)",
    "function MAX_SUPPLY() view returns (uint256)",
  ];

  try {
    const bridge = new ethers.Contract(address, BridgeABI, provider);
    const utxoToken = await bridge.utxoToken().catch(() => null);
    if (utxoToken) {
      console.log("✅ This is BridgeMNEE");
      console.log(`   UTXO Token: ${utxoToken}`);
      const erc20Token = await bridge.erc20Token();
      console.log(`   ERC20 Token: ${erc20Token}`);
      return;
    }
  } catch {}

  try {
    const utxo = new ethers.Contract(address, UTXOABI, provider);
    const maxSupply = await utxo.MAX_SUPPLY().catch(() => null);
    if (maxSupply) {
      console.log("✅ This is MNEETokenUTXO");
      const totalSupply = await utxo.totalSupply();
      console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} MNEE`);
      console.log(`   Max Supply: ${ethers.formatEther(maxSupply)} MNEE`);
      return;
    }
  } catch {}

  console.log("⚠️  Could not identify contract type");
  console.log("   It's a contract but doesn't match known ABIs");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


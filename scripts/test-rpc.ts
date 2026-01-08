import { ethers } from "ethers";

/**
 * Test RPC endpoint connectivity and responsiveness
 */
async function testRPC(rpcUrl: string, name: string): Promise<boolean> {
  try {
    console.log(`Testing ${name}...`);
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const start = Date.now();
    const blockNumber = await provider.getBlockNumber();
    const latency = Date.now() - start;
    
    console.log(`  ✅ Block: ${blockNumber}, Latency: ${latency}ms`);
    return true;
  } catch (error: any) {
    const errorMsg = error.message?.substring(0, 80) || error.code || "Unknown error";
    console.log(`  ❌ Error: ${errorMsg}`);
    return false;
  }
}

async function main() {
  const network = process.argv[2] || "sepolia";
  
  console.log(`\n🔍 Testing RPC endpoints for ${network}...\n`);
  
  const endpoints: { url: string; name: string }[] = [];
  
  if (network === "sepolia") {
    endpoints.push(
      { url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org", name: "Configured/Default" },
      { url: "https://ethereum-sepolia-rpc.publicnode.com", name: "PublicNode" },
      { url: "https://sepolia.drpc.org", name: "dRPC" },
      { url: "https://rpc.sepolia.org", name: "Sepolia Official" },
      { url: "https://eth-sepolia.g.alchemy.com/v2/demo", name: "Alchemy Demo (rate-limited)" }
    );
  } else if (network === "ethereum") {
    endpoints.push(
      { url: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com", name: "Configured/Default" },
      { url: "https://ethereum-rpc.publicnode.com", name: "PublicNode" },
      { url: "https://eth.llamarpc.com", name: "LlamaRPC" }
    );
  }
  
  const results = await Promise.all(
    endpoints.map(e => testRPC(e.url, e.name))
  );
  
  const working = endpoints.filter((_, i) => results[i]);
  
  if (working.length > 0) {
    console.log(`\n✅ Working endpoints found:`);
    working.forEach(e => console.log(`   - ${e.name}: ${e.url}`));
    console.log(`\n💡 Add the fastest one to your .env file!`);
  } else {
    console.log(`\n❌ No working endpoints found. Check your internet connection.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


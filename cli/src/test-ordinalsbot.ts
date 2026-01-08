/**
 * Test OrdinalsBot API connectivity
 * Run: npx ts-node cli/src/test-ordinalsbot.ts
 */

import { OrdinalsBotClient } from "./ordinalsbot";
import * as dotenv from "dotenv";

dotenv.config();

async function testOrdinalsBot() {
  console.log("🧪 Testing OrdinalsBot API Integration\n");
  console.log("API URL: https://api.ordinalsbot.com\n");

  const apiKey = process.env.ORDINALSBOT_API_KEY;
  const apiUrl = process.env.ORDINALSBOT_API_URL || "https://api.ordinalsbot.com";

  const client = new OrdinalsBotClient(apiKey, apiUrl);

  // Test 1: Health check
  console.log("1️⃣ Testing API Health Check...");
  try {
    const isHealthy = await client.checkHealth();
    if (isHealthy) {
      console.log("   ✅ API is healthy!\n");
    } else {
      console.log("   ⚠️  API health check returned unexpected result\n");
    }
  } catch (error: any) {
    console.log(`   ❌ Health check failed: ${error.message}\n`);
  }

  // Test 2: Get inscriptions (use a known Bitcoin address if available)
  const testAddress = process.env.BITCOIN_ADDRESS || "bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297"; // Example Ordinals address
  
  console.log(`2️⃣ Testing Get Inscriptions for address: ${testAddress}`);
  try {
    const inscriptions = await client.getInscriptions(testAddress);
    console.log(`   ✅ Found ${inscriptions.length} inscriptions\n`);
    
    if (inscriptions.length > 0) {
      console.log("   Sample inscription:");
      console.log(`     ID: ${inscriptions[0].inscription_id}`);
      console.log(`     Type: ${inscriptions[0].content_type}`);
      console.log(`     Owner: ${inscriptions[0].owner}\n`);
    }
  } catch (error: any) {
    console.log(`   ⚠️  Error (may be expected if address has no inscriptions): ${error.message}\n`);
  }

  // Test 3: Get UTXOs
  console.log(`3️⃣ Testing Get UTXOs for address: ${testAddress}`);
  try {
    const utxos = await client.getUTXOs(testAddress);
    console.log(`   ✅ Found ${utxos.length} UTXOs\n`);
    
    if (utxos.length > 0) {
      console.log("   Sample UTXO:");
      const utxo = utxos[0];
      console.log(`     TXID: ${utxo.txid}`);
      console.log(`     VOUT: ${utxo.vout}`);
      console.log(`     Value: ${utxo.value} sats`);
      console.log(`     Inscriptions: ${utxo.inscriptions.length}\n`);
    }
  } catch (error: any) {
    console.log(`   ⚠️  Error: ${error.message}\n`);
  }

  // Test 4: Get MNEE tokens
  console.log(`4️⃣ Testing Get MNEE Tokens for address: ${testAddress}`);
  try {
    const mneeTokens = await client.getMNEETokens(testAddress);
    console.log(`   ✅ Found ${mneeTokens.length} MNEE tokens\n`);
    
    if (mneeTokens.length > 0) {
      console.log("   MNEE Token Inscriptions:");
      mneeTokens.slice(0, 3).forEach((token, i) => {
        console.log(`     ${i + 1}. ${token.inscription_id}`);
        if (token.inscription_number) {
          console.log(`        Number: #${token.inscription_number}`);
        }
      });
      console.log();
    }
  } catch (error: any) {
    console.log(`   ⚠️  Error: ${error.message}\n`);
  }

  // Test 5: Get MNEE balance
  console.log(`5️⃣ Testing Get MNEE Balance for address: ${testAddress}`);
  try {
    const balance = await client.getMNEEBalance(testAddress);
    console.log(`   ✅ MNEE Balance: ${balance} (smallest unit)\n`);
  } catch (error: any) {
    console.log(`   ⚠️  Error: ${error.message}\n`);
  }

  console.log("✨ Testing complete!");
  console.log("\n💡 Note: Some errors may be expected if:");
  console.log("   - The test address has no inscriptions");
  console.log("   - The API endpoints differ from expected format");
  console.log("   - API rate limiting is in effect");
}

testOrdinalsBot().catch(console.error);


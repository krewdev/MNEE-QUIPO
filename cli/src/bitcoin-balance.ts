/**
 * Check Bitcoin Ordinals MNEE balance
 * Uses MNEE SDK (preferred) or OrdinalsBot API (fallback)
 */

import { BitcoinMNEE } from "./bitcoin";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Check MNEE balance on Bitcoin Ordinals
 */
export async function checkBitcoinBalance(
  address: string,
  apiKey?: string,
  apiUrl?: string
) {
  console.log("\n💰 Checking MNEE Balance on Bitcoin\n");
  console.log("Address:", address);
  console.log("Network: Bitcoin Mainnet (Ordinals)");
  
  // Determine which API will be used
  const mneeApiKey = apiKey || process.env.MNEE_API_KEY || process.env.ORDINALSBOT_API_KEY;
  const usingMNEE = !!process.env.MNEE_API_KEY || (apiKey && !process.env.ORDINALSBOT_API_KEY);
  
  if (usingMNEE) {
    console.log("API: MNEE SDK (https://docs.mnee.io)");
    console.log("Environment:", process.env.MNEE_ENV === "production" ? "production" : "sandbox");
  } else {
    console.log("API: OrdinalsBot (https://api.ordinalsbot.com)");
  }
  console.log();

  const btcMNEE = new BitcoinMNEE(
    address,
    mneeApiKey,
    apiUrl || process.env.ORDINALSBOT_API_URL
  );
  
  // Test API connectivity
  try {
    const isHealthy = await btcMNEE.checkAPIHealth();
    if (isHealthy) {
      console.log("✅ API is healthy\n");
    } else {
      console.log("⚠️  Warning: API health check failed, but continuing...\n");
    }
  } catch {
    // Ignore health check errors
  }
  
  try {
    const balance = await btcMNEE.getBalance();
    console.log(`✅ MNEE Balance: ${balance} (smallest unit)`);
    
    const mneeTokens = await btcMNEE.getMNEETokens();
    console.log(`📦 MNEE Inscriptions: ${mneeTokens.length}`);
    
    const utxos = await btcMNEE.getUTXOs();
    const mneeUTXOs = utxos.filter(u => u.inscription);
    console.log(`💎 UTXOs with MNEE: ${mneeUTXOs.length}\n`);
    
    if (mneeUTXOs.length > 0) {
      console.log("MNEE UTXOs:");
      mneeUTXOs.forEach((utxo, i) => {
        console.log(`  ${i + 1}. TX: ${utxo.txid}:${utxo.vout}`);
        if (utxo.inscription) {
          console.log(`     Inscription ID: ${utxo.inscription.id}`);
          if (utxo.inscription.amount) {
            console.log(`     Amount: ${utxo.inscription.amount}`);
          }
          console.log(`     Content Type: ${utxo.inscription.contentType}`);
        }
        console.log();
      });
    }

    if (mneeTokens.length > 0) {
      console.log("MNEE Token Inscriptions:");
      mneeTokens.slice(0, 10).forEach((token, i) => {
        console.log(`  ${i + 1}. ${token.inscription_id}`);
        if (token.inscription_number) {
          console.log(`     Number: #${token.inscription_number}`);
        }
        console.log(`     Type: ${token.content_type}`);
      });
      if (mneeTokens.length > 10) {
        console.log(`  ... and ${mneeTokens.length - 10} more`);
      }
    }
  } catch (error: any) {
    console.log("⚠️  Could not fetch Bitcoin balance");
    console.log(`   Error: ${error.message}`);
    console.log("\n💡 Note:");
    if (usingMNEE) {
      console.log("   - Using MNEE SDK (official API)");
      console.log("   - Verify MNEE_API_KEY is correct in .env");
      console.log("   - Check MNEE_ENV is set correctly (sandbox/production)");
      console.log("   - Visit https://docs.mnee.io for API documentation");
    } else {
      console.log("   - Using OrdinalsBot API (fallback)");
      console.log("   - Set MNEE_API_KEY in .env to use official MNEE SDK (preferred)");
      console.log("   - Or set ORDINALSBOT_API_KEY in .env (optional, for higher rate limits)");
      console.log("   - Visit https://docs.ordinalsbot.com for API documentation");
    }
  }
}


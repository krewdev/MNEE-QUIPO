/**
 * Bitcoin Ordinals Integration
 * Handle MNEE tokens on Bitcoin as UTXOs/inscriptions
 * Uses official MNEE SDK (primary) with OrdinalsBot API as fallback
 */

import Mnee from "@mnee/ts-sdk";
import { OrdinalsBotClient, OrdinalsBotUTXO, OrdinalsBotInscription } from "./ordinalsbot";

export interface BitcoinUTXO {
  txid: string;
  vout: number;
  value: number; // satoshis
  inscription?: {
    id: string;
    content: string;
    contentType: string;
    amount?: number;
  };
}

/**
 * Bitcoin Ordinals MNEE token handler
 * Uses official MNEE SDK (primary) with OrdinalsBot API as fallback
 * API: https://docs.mnee.io (MNEE SDK)
 * Fallback: https://api.ordinalsbot.com (OrdinalsBot)
 */
export class BitcoinMNEE {
  public ordinalsBot: OrdinalsBotClient; // Made public for health checks (fallback)
  private mneeSDK: Mnee | null = null; // Official MNEE SDK
  private address: string;
  private useMNEE: boolean = false; // Whether to use MNEE SDK or OrdinalsBot

  constructor(address: string, apiKey?: string, apiUrl?: string) {
    this.address = address;
    
    // Try to initialize MNEE SDK first (preferred)
    // Only use MNEE SDK if MNEE_API_KEY is explicitly set
    try {
      const mneeApiKey = process.env.MNEE_API_KEY;
      if (mneeApiKey) {
        // Default to sandbox unless explicitly set to production
        const mneeEnv = process.env.MNEE_ENV === "production" ? "production" : "sandbox";
        this.mneeSDK = new Mnee({
          environment: mneeEnv,
          apiKey: mneeApiKey,
        });
        this.useMNEE = true;
      } else if (apiKey) {
        // If no MNEE_API_KEY but apiKey provided, assume it's OrdinalsBot key
        this.useMNEE = false;
      }
    } catch (error: any) {
      console.warn(`⚠️  MNEE SDK initialization failed: ${error.message}, falling back to OrdinalsBot`);
      this.useMNEE = false;
    }
    
    // Always initialize OrdinalsBot as fallback
    this.ordinalsBot = new OrdinalsBotClient(apiKey, apiUrl);
  }

  /**
   * Check if API is accessible (MNEE SDK or OrdinalsBot)
   */
  async checkAPIHealth(): Promise<boolean> {
    if (this.useMNEE && this.mneeSDK) {
      try {
        await this.mneeSDK.config();
        return true;
      } catch {
        return false;
      }
    }
    return this.ordinalsBot.checkHealth();
  }

  /**
   * Get UTXOs for a Bitcoin address (with MNEE inscriptions)
   * Uses MNEE SDK if available, falls back to OrdinalsBot
   */
  async getUTXOs(): Promise<BitcoinUTXO[]> {
    // Try MNEE SDK first
    if (this.useMNEE && this.mneeSDK) {
      try {
        const mneeUtxos = await this.mneeSDK.getUtxos(this.address);
        return mneeUtxos.map((utxo) => ({
          txid: utxo.outpoint?.split(":")[0] || "",
          vout: parseInt(utxo.outpoint?.split(":")[1] || "0"),
          value: utxo.data?.bsv21?.amt || 0,
          inscription: {
            id: utxo.outpoint || "",
            content: JSON.stringify(utxo.data),
            contentType: "application/json",
            amount: utxo.data?.bsv21?.amt || 0,
          },
        }));
      } catch (error: any) {
        console.warn(`MNEE SDK UTXO fetch failed: ${error.message}, falling back to OrdinalsBot`);
        // Fall through to OrdinalsBot
      }
    }
    
    // Fallback to OrdinalsBot (only if MNEE SDK not available)
    if (!this.useMNEE) {
      try {
        const utxos = await this.ordinalsBot.getUTXOs(this.address);
        
        return utxos.map((utxo) => {
          const mneeInscription = utxo.inscriptions.find((ins) => {
            // Check if inscription is MNEE token
            try {
              const content = typeof ins.content === "string" 
                ? JSON.parse(ins.content) 
                : ins.content;
              return content.tick === "MNEE" || content.ticker === "MNEE" || 
                     (typeof content === "string" && content.includes("MNEE"));
            } catch {
              return typeof ins.content === "string" && ins.content.includes("MNEE");
            }
          });

          return {
            txid: utxo.txid,
            vout: utxo.vout,
            value: utxo.value,
            inscription: mneeInscription ? {
              id: mneeInscription.inscription_id,
              content: typeof mneeInscription.content === "string" 
                ? mneeInscription.content 
                : JSON.stringify(mneeInscription.content),
              contentType: mneeInscription.content_type,
              amount: this._parseMNEEAmount(mneeInscription),
            } : undefined,
          };
        });
      } catch (error: any) {
        console.error(`Error fetching UTXOs: ${error.message}`);
        return [];
      }
    }
    
    // If MNEE SDK was tried but failed, return empty array
    return [];
  }

  /**
   * Get MNEE balance from Bitcoin Ordinals
   * Returns balance in atomic units (uses MNEE SDK if available)
   */
  async getBalance(): Promise<number> {
    // Try MNEE SDK first
    if (this.useMNEE && this.mneeSDK) {
      try {
        const balance = await this.mneeSDK.balance(this.address);
        // MNEE SDK returns balance in atomic units (amount field)
        return balance.amount || 0;
      } catch (error: any) {
        console.warn(`MNEE SDK balance check failed: ${error.message}, falling back to OrdinalsBot`);
        // Fall through to OrdinalsBot
      }
    }
    
    // Fallback to OrdinalsBot (only if MNEE SDK not available)
    if (!this.useMNEE) {
      try {
        return await this.ordinalsBot.getMNEEBalance(this.address);
      } catch (error: any) {
        console.error(`Error fetching MNEE balance: ${error.message}`);
        return 0;
      }
    }
    
    // If MNEE SDK was tried but failed, return 0
    return 0;
  }

  /**
   * Get all MNEE inscriptions for this address
   * Uses MNEE SDK if available, falls back to OrdinalsBot
   */
  async getMNEETokens(): Promise<OrdinalsBotInscription[]> {
    // Try MNEE SDK first
    if (this.useMNEE && this.mneeSDK) {
      try {
        const utxos = await this.mneeSDK.getUtxos(this.address);
        // Convert MNEE SDK UTXOs to OrdinalsBot format for compatibility
        return utxos.map((utxo) => ({
          inscription_id: utxo.outpoint || "",
          inscription_number: undefined,
          content_type: "application/json",
          owner: this.address,
          txid: utxo.outpoint?.split(":")[0] || "",
          value: utxo.data?.bsv21?.amt || 0,
          content: JSON.stringify(utxo.data),
        }));
      } catch (error: any) {
        console.warn(`MNEE SDK token fetch failed: ${error.message}, falling back to OrdinalsBot`);
        // Fall through to OrdinalsBot
      }
    }
    
    // Fallback to OrdinalsBot (only if MNEE SDK not available)
    if (!this.useMNEE) {
      try {
        return await this.ordinalsBot.getMNEETokens(this.address);
      } catch (error: any) {
        console.error(`Error fetching MNEE tokens: ${error.message}`);
        return [];
      }
    }
    
    // If MNEE SDK was tried but failed, return empty array
    return [];
  }

  /**
   * Create a Bitcoin transaction to send MNEE
   * Uses MNEE SDK if available (requires WIF), falls back to OrdinalsBot
   * 
   * @param toAddress - Recipient Bitcoin address
   * @param amount - Amount in atomic units (or human-readable if using MNEE SDK)
   * @param feeRate - Optional fee rate (sat/vB)
   * @param wif - Wallet Import Format private key (required for MNEE SDK)
   */
  async createSendTransaction(
    toAddress: string,
    amount: number,
    feeRate?: number,
    wif?: string
  ): Promise<string> {
    // Validate Bitcoin address format
    // Bitcoin addresses can be:
    // - Legacy (P2PKH): starts with 1, ~34 chars
    // - P2SH: starts with 3, ~34 chars
    // - Bech32 (SegWit): starts with bc1, ~42-62 chars
    // - BSV21: might have different format
    
    if (!toAddress || toAddress.length < 26 || toAddress.length > 62) {
      throw new Error(`Invalid Bitcoin address format: ${toAddress}. Address must be 26-62 characters.`);
    }
    
    // Basic format check (doesn't validate checksum, but checks prefix)
    const isValidFormat = 
      toAddress.startsWith("1") ||      // Legacy P2PKH
      toAddress.startsWith("3") ||      // P2SH
      toAddress.startsWith("bc1") ||    // Bech32 SegWit
      toAddress.startsWith("tb1");      // Testnet Bech32
    
    if (!isValidFormat) {
      console.warn(`⚠️  Address format may not be standard Bitcoin: ${toAddress}`);
      console.warn("   Standard formats: Legacy (1...), P2SH (3...), Bech32 (bc1.../tb1...)");
    }
    
    // Try MNEE SDK first (requires WIF)
    if (this.useMNEE && this.mneeSDK && wif) {
      try {
        // Convert amount to atomic units if needed
        const atomicAmount = this.mneeSDK.toAtomicAmount(amount);
        
        const transferResponse = await this.mneeSDK.transfer(
          [{
            address: toAddress,
            amount: atomicAmount,
          }],
          wif
          // Note: feeRate is not supported in TransferOptions, SDK handles it automatically
        );

        return transferResponse.ticketId || transferResponse.rawtx || "pending";
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        if (errorMsg.includes("Invalid recipient address") || errorMsg.includes("invalid address")) {
          console.warn(`⚠️  MNEE SDK rejected address format: ${toAddress}`);
          console.warn(`   Error: ${errorMsg}`);
          console.warn(`   Falling back to OrdinalsBot API...`);
        } else {
          console.warn(`⚠️  MNEE SDK transfer failed: ${errorMsg}, falling back to OrdinalsBot`);
        }
        // Fall through to OrdinalsBot
      }
    }
    
    // Fallback to OrdinalsBot (doesn't require WIF, uses API)
    // Note: OrdinalsBot API may have limitations or different requirements
    // For production use, prefer MNEE SDK with MNEE_API_KEY
    try {
      // Create BRC-20 transfer inscription via OrdinalsBot
      const inscriptionId = await this.ordinalsBot.createTransfer(
        this.address,
        toAddress,
        amount,
        "MNEE"
      );

      return inscriptionId;
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      const statusCode = error.response?.status;
      
      // Provide helpful error messages based on error type
      if (statusCode === 500) {
        throw new Error(`OrdinalsBot API server error (500): The API encountered an internal error. This might be due to: 1) API format changes, 2) Server issues, or 3) Unsupported operation. Recommendation: Use MNEE SDK instead by setting MNEE_API_KEY in .env file (preferred for MNEE tokens). Original error: ${errorMsg}`);
      }
      
      if (errorMsg.includes("Invalid recipient address") || errorMsg.includes("invalid address")) {
        throw new Error(`Invalid Bitcoin recipient address: ${toAddress}. The address format may not be supported by OrdinalsBot API. Valid formats: Legacy (1...), P2SH (3...), Bech32 (bc1.../tb1...).`);
      }
      
      if (errorMsg.includes("HTTP 500") || errorMsg.includes("500")) {
        throw new Error(`OrdinalsBot API server error: ${errorMsg}. For MNEE token transfers, we recommend using the official MNEE SDK instead. Set MNEE_API_KEY in .env file and provide your Bitcoin WIF when prompted.`);
      }
      
      throw new Error(`Failed to create send transaction: ${errorMsg}`);
    }
  }

  /**
   * Parse MNEE amount from inscription content
   */
  private _parseMNEEAmount(inscription: OrdinalsBotInscription): number {
    if (!inscription.content) return 0;

    try {
      const content = typeof inscription.content === "string"
        ? JSON.parse(inscription.content)
        : inscription.content;

      // BRC-20 format
      if (content.op === "transfer" && content.amt) {
        return parseInt(content.amt) || 0;
      }

      // Custom format
      if (content.amount) {
        return parseInt(content.amount) || 0;
      }

      // If no amount field, treat as 1 unit
      return 1;
    } catch {
      // Not JSON, treat as 1 unit per inscription
      return 1;
    }
  }

  /**
   * Get inscription details by ID
   */
  async getInscription(inscriptionId: string): Promise<OrdinalsBotInscription | null> {
    try {
      return await this.ordinalsBot.getInscription(inscriptionId);
    } catch (error: any) {
      console.error(`Error fetching inscription: ${error.message}`);
      return null;
    }
  }
}


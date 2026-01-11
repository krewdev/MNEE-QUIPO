/**
 * OrdinalsBot API Integration
 * Handles Bitcoin Ordinals inscriptions and MNEE tokens
 */

import axios, { AxiosInstance } from "axios";

export interface OrdinalsBotInscription {
  inscription_id: string;
  inscription_number?: number;
  content_type: string;
  owner: string;
  sat_ordinal?: string;
  sat_rarity?: string;
  txid: string;
  value: number; // satoshis
  genesis_fee?: number;
  genesis_height?: number;
  genesis_timestamp?: number;
  content_length?: number;
  content?: string;
}

export interface OrdinalsBotUTXO {
  txid: string;
  vout: number;
  value: number; // satoshis
  inscriptions: OrdinalsBotInscription[];
  status: "spendable" | "spent";
}

export interface OrdinalsBotResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * OrdinalsBot API client for Bitcoin Ordinals
 */
export class OrdinalsBotClient {
  private api: AxiosInstance;
  private apiKey?: string;

  constructor(apiKey?: string, baseUrl: string = "https://api.ordinalsbot.com") {
    this.apiKey = apiKey;
    this.api = axios.create({
      baseURL: baseUrl,
      headers: {
        "Content-Type": "application/json",
        ...(apiKey && { "X-API-Key": apiKey }),
      },
      timeout: 30000,
    });
  }

  /**
   * Check API health/status
   * API: GET https://api.ordinalsbot.com/
   * Response: {"status":"ok"}
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.api.get("/");
      return response.data?.status === "ok";
    } catch (error: any) {
      return false;
    }
  }

  /**
   * Get all inscriptions for a Bitcoin address
   * API: https://api.ordinalsbot.com
   */
  async getInscriptions(address: string): Promise<OrdinalsBotInscription[]> {
    try {
      // Try primary endpoint: /inscriptions/address/{address}
      const response = await this.api.get<OrdinalsBotResponse<OrdinalsBotInscription[]>>(
        `/inscriptions/address/${address}`
      );

      if (response.data && typeof response.data === "object") {
        // Check if response has success/data structure
        if ("success" in response.data && response.data.success && response.data.data) {
          return response.data.data;
        }
        // Check if response is direct array
        if (Array.isArray(response.data)) {
          return response.data;
        }
      }

      // Fallback: Try alternative endpoint format
      try {
        const altResponse = await this.api.get<OrdinalsBotInscription[]>(
          `/address/${address}/inscriptions`
        );
        if (Array.isArray(altResponse.data)) {
          return altResponse.data;
        }
      } catch {
        // Ignore fallback errors
      }

      return [];
    } catch (error: any) {
      if (error.response?.status === 404) {
        return []; // No inscriptions found
      }
      // Log detailed error for debugging
      console.error(`OrdinalsBot API error: ${error.message}`, {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });
      throw new Error(`OrdinalsBot API error: ${error.message}`);
    }
  }

  /**
   * Get UTXOs with inscriptions for an address
   * API: https://api.ordinalsbot.com
   */
  async getUTXOs(address: string): Promise<OrdinalsBotUTXO[]> {
    try {
      // Try primary endpoint: /address/{address}/utxos
      const response = await this.api.get<OrdinalsBotResponse<OrdinalsBotUTXO[]>>(
        `/address/${address}/utxos`
      );

      if (response.data && typeof response.data === "object") {
        // Check if response has success/data structure
        if ("success" in response.data && response.data.success && response.data.data) {
          return response.data.data;
        }
        // Check if response is direct array
        if (Array.isArray(response.data)) {
          return response.data;
        }
      }

      // Fallback: Get inscriptions and construct UTXOs
      // This works even if UTXO endpoint doesn't exist
      const inscriptions = await this.getInscriptions(address);
      const utxoMap = new Map<string, OrdinalsBotUTXO>();

      for (const inscription of inscriptions) {
        const key = `${inscription.txid}:0`; // Default vout if not specified
        if (!utxoMap.has(key)) {
          utxoMap.set(key, {
            txid: inscription.txid,
            vout: 0,
            value: inscription.value || 546, // Default dust limit
            inscriptions: [],
            status: "spendable",
          });
        }
        utxoMap.get(key)!.inscriptions.push(inscription);
      }

      return Array.from(utxoMap.values());
    } catch (error: any) {
      // If UTXO endpoint fails, fall back to inscriptions
      if (error.response?.status === 404) {
        console.warn("UTXO endpoint not available, using inscriptions fallback");
        const inscriptions = await this.getInscriptions(address);
        const utxoMap = new Map<string, OrdinalsBotUTXO>();

        for (const inscription of inscriptions) {
          const key = `${inscription.txid}:0`;
          if (!utxoMap.has(key)) {
            utxoMap.set(key, {
              txid: inscription.txid,
              vout: 0,
              value: inscription.value || 546,
              inscriptions: [],
              status: "spendable",
            });
          }
          utxoMap.get(key)!.inscriptions.push(inscription);
        }
        return Array.from(utxoMap.values());
      }
      throw new Error(`OrdinalsBot API error: ${error.message}`);
    }
  }

  /**
   * Get specific inscription details
   */
  async getInscription(inscriptionId: string): Promise<OrdinalsBotInscription | null> {
    try {
      const response = await this.api.get<OrdinalsBotResponse<OrdinalsBotInscription>>(
        `/inscriptions/${inscriptionId}`
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(`OrdinalsBot API error: ${error.message}`);
    }
  }

  /**
   * Filter inscriptions by content type or search for MNEE tokens
   * MNEE tokens on Bitcoin Ordinals might be:
   * - BRC-20 tokens (text/plain with JSON)
   * - JSON inscriptions with MNEE metadata
   * - Specific content type markers
   */
  async getMNEETokens(address: string): Promise<OrdinalsBotInscription[]> {
    const inscriptions = await this.getInscriptions(address);

    return inscriptions.filter((inscription) => {
      // Check if inscription contains MNEE token data
      const contentType = inscription.content_type?.toLowerCase() || "";
      
      // BRC-20 tokens are typically text/plain with JSON content
      if (contentType.includes("text/plain") || contentType.includes("application/json")) {
        // Check content if available
        if (inscription.content) {
          try {
            const content = typeof inscription.content === "string" 
              ? JSON.parse(inscription.content) 
              : inscription.content;
            
            // Look for MNEE token indicators
            if (
              content.op === "transfer" ||
              content.tick === "MNEE" ||
              content.ticker === "MNEE" ||
              (typeof content === "string" && content.includes("MNEE"))
            ) {
              return true;
            }
          } catch {
            // Not JSON, check as string
            if (typeof inscription.content === "string" && inscription.content.includes("MNEE")) {
              return true;
            }
          }
        }
      }

      // Alternative: Check inscription number ranges if MNEE uses specific numbers
      // Or check for specific content hash
      return false;
    });
  }

  /**
   * Get balance of MNEE tokens (in smallest unit, e.g., satoshis for BRC-20)
   */
  async getMNEEBalance(address: string): Promise<number> {
    const mneeInscriptions = await this.getMNEETokens(address);
    
    // Sum up token amounts from inscriptions
    let balance = 0;
    for (const inscription of mneeInscriptions) {
      if (inscription.content) {
        try {
          const content = typeof inscription.content === "string"
            ? JSON.parse(inscription.content)
            : inscription.content;
          
          // Parse BRC-20 transfer amount
          if (content.op === "transfer" && content.amt) {
            balance += parseInt(content.amt) || 0;
          }
          // Or parse custom MNEE format
          else if (content.amount) {
            balance += parseInt(content.amount) || 0;
          }
        } catch {
          // If content is not JSON, treat as 1 token unit per inscription
          balance += 1;
        }
      } else {
        // If no content data, treat each inscription as 1 unit
        balance += 1;
      }
    }

    return balance;
  }

  /**
   * Create a transfer inscription for MNEE (BRC-20 style)
   * Note: BRC-20 transfers create an inscription that must be sent to the recipient
   * The recipient address is validated but the actual transfer happens when the inscription UTXO is sent
   */
  async createTransfer(
    fromAddress: string,
    toAddress: string,
    amount: number,
    tick: string = "MNEE"
  ): Promise<string> {
    // Validate Bitcoin address format before API call
    // Bitcoin addresses can be Legacy (1...), P2SH (3...), or Bech32 (bc1.../tb1...)
    if (!toAddress || (toAddress.length < 26 || toAddress.length > 62)) {
      throw new Error(`Invalid recipient address: ${toAddress}. Address must be 26-62 characters.`);
    }
    
    // Basic format validation
    const isValidFormat = 
      toAddress.startsWith("1") ||      // Legacy P2PKH
      toAddress.startsWith("3") ||      // P2SH  
      toAddress.startsWith("bc1") ||    // Bech32 SegWit (mainnet)
      toAddress.startsWith("tb1");      // Bech32 SegWit (testnet)
    
    if (!isValidFormat) {
      throw new Error(`Invalid recipient address: ${toAddress}. Address must start with 1 (Legacy), 3 (P2SH), bc1 (Bech32 mainnet), or tb1 (Bech32 testnet).`);
    }
    
    // Create BRC-20 transfer inscription JSON
    const transferData = {
      p: "brc-20",
      op: "transfer",
      tick: tick,
      amt: amount.toString(),
    };

    try {
      // OrdinalsBot API: Create BRC-20 transfer inscription
      // The API requires both sender address and receiveAddress (recipient)
      // Fee must be between 0.1 and 100000 (in satoshis, not fee_rate)
      
      // Fee must be between 0.1 and 100000 (in satoshis)
      // Using 10 satoshis as a safe minimum
      const feeAmount = 10;
      
      // Create BRC-20 transfer inscription content
      const contentString = JSON.stringify(transferData);
      
      // OrdinalsBot API payload - simplified format
      // Based on error responses, it seems the API might expect specific format
      const payload: any = {
        address: fromAddress,  // Sender address
        receiveAddress: toAddress,  // Recipient address (required)
        content: contentString,  // BRC-20 transfer JSON
        content_type: "text/plain;charset=utf-8",
        fee: feeAmount, // Fee in satoshis (0.1-100000)
        postage: 546, // Standard dust limit
      };
      
      const response = await this.api.post<OrdinalsBotResponse<{ inscription_id: string; ticket_id?: string }>>(
        "/inscribe",
        payload
      );

      // Handle different response formats
      let inscriptionId: string | undefined;
      
      if (response.data) {
        // Check if response has success/data structure
        if (response.data.success && response.data.data) {
          inscriptionId = response.data.data.inscription_id || response.data.data.ticket_id;
        } else if ((response.data as any).inscription_id) {
          // Check if response has direct inscription_id
          inscriptionId = (response.data as any).inscription_id;
        } else if ((response.data as any).ticket_id) {
          // Check for ticket_id (some APIs use this)
          inscriptionId = (response.data as any).ticket_id;
        }
        
        // If we got an inscription ID, return it
        if (inscriptionId) {
          console.log(`⚠️  Note: BRC-20 transfer inscription created at sender address: ${fromAddress}`);
          console.log(`   Inscription ID: ${inscriptionId}`);
          console.log(`   Recipient: ${toAddress}`);
          console.log(`   Next step: Send the inscription UTXO to recipient address ${toAddress} on Bitcoin network`);
          return inscriptionId;
        }
        
        // If response has error field
        if (response.data.error) {
          const errorMsg = typeof response.data.error === "string" 
            ? response.data.error 
            : JSON.stringify(response.data.error);
          throw new Error(errorMsg);
        }
      }

      // If we get here, response format is unexpected
      throw new Error(`Unexpected API response format: ${JSON.stringify(response.data || response)}`);
    } catch (error: any) {
      // Extract error message from API response
      let errorMsg = "";
      
      if (error.response?.data) {
        const data = error.response.data;
        
        // Handle different error response formats
        if (typeof data === "string") {
          errorMsg = data;
        } else if (data.error) {
          errorMsg = typeof data.error === "string" ? data.error : JSON.stringify(data.error);
        } else if (data.message) {
          errorMsg = typeof data.message === "string" ? data.message : JSON.stringify(data.message);
        } else if (Array.isArray(data)) {
          // If error is an array, extract meaningful messages from each item
          const errorMessages = data.map((item: any) => {
            if (typeof item === "string") {
              return item;
            } else if (typeof item === "object") {
              // Try to extract meaningful error information
              if (item.message) return item.message;
              if (item.error) return typeof item.error === "string" ? item.error : JSON.stringify(item.error);
              if (item.msg) return item.msg;
              if (item.detail) return typeof item.detail === "string" ? item.detail : JSON.stringify(item.detail);
              // If object has only one key-value, return that
              const keys = Object.keys(item);
              if (keys.length === 1) {
                return `${keys[0]}: ${typeof item[keys[0]] === "string" ? item[keys[0]] : JSON.stringify(item[keys[0]])}`;
              }
              // Otherwise, return formatted JSON
              return JSON.stringify(item, null, 2);
            }
            return String(item);
          });
          errorMsg = errorMessages.filter((msg: string) => msg && msg.trim()).join("; ");
        } else if (typeof data === "object") {
          // Try to extract meaningful error information
          errorMsg = JSON.stringify(data);
          
          // If we can extract specific fields
          if (data.detail) {
            errorMsg = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
          } else if (data.errors) {
            errorMsg = typeof data.errors === "string" ? data.errors : JSON.stringify(data.errors);
          }
        } else {
          errorMsg = String(data);
        }
      }
      
      // Fallback to error message if no response data
      if (!errorMsg) {
        errorMsg = error.message || String(error);
      }
      
      // Clean up the error message (remove [object Object] patterns)
      errorMsg = errorMsg.replace(/\[object Object\]/g, "").trim();
      
      // Provide more helpful error messages
      if (errorMsg.toLowerCase().includes("invalid") && errorMsg.toLowerCase().includes("recipient")) {
        throw new Error(`Invalid recipient address: ${toAddress}. Please ensure it's a valid Bitcoin address format (Legacy: 1..., P2SH: 3..., Bech32: bc1.../tb1...). Original error: ${errorMsg}`);
      }
      
      if (errorMsg.toLowerCase().includes("invalid") && errorMsg.toLowerCase().includes("address")) {
        throw new Error(`Invalid Bitcoin address: ${toAddress}. Address must be 26-62 characters and start with 1 (Legacy), 3 (P2SH), bc1 (Bech32 mainnet), or tb1 (Bech32 testnet). Original error: ${errorMsg}`);
      }
      
      if (error.response?.status === 400 || error.response?.status === 422) {
        throw new Error(`OrdinalsBot API validation error (${error.response.status}): ${errorMsg || "Invalid request parameters"}. Please check address format and try again.`);
      }
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error(`OrdinalsBot API authentication error (${error.response.status}): API key may be missing or invalid. Set ORDINALSBOT_API_KEY in .env file. Original error: ${errorMsg}`);
      }
      
      // Include full error details for debugging
      const statusCode = error.response?.status ? ` (HTTP ${error.response.status})` : "";
      throw new Error(`OrdinalsBot inscription error${statusCode}: ${errorMsg || error.message || "Unknown error"}`);
    }
  }
}


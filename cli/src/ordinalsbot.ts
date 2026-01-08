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
   */
  async createTransfer(
    fromAddress: string,
    toAddress: string,
    amount: number,
    tick: string = "MNEE"
  ): Promise<string> {
    // Create BRC-20 transfer inscription JSON
    const transferData = {
      p: "brc-20",
      op: "transfer",
      tick: tick,
      amt: amount.toString(),
    };

    try {
      // Submit inscription request to OrdinalsBot
      const response = await this.api.post<OrdinalsBotResponse<{ inscription_id: string }>>(
        "/inscribe",
        {
          address: fromAddress,
          content: JSON.stringify(transferData),
          content_type: "text/plain;charset=utf-8",
          fee_rate: 1, // sat/vB
        }
      );

      if (response.data.success && response.data.data) {
        return response.data.data.inscription_id;
      }

      throw new Error(response.data.error || "Failed to create transfer");
    } catch (error: any) {
      throw new Error(`OrdinalsBot inscription error: ${error.message}`);
    }
  }
}


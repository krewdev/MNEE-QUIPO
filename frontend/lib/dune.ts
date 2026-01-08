/**
 * Dune Analytics API integration for QuipoWallet analytics
 * 
 * Get API key from: https://dune.com/settings/api
 */

const DUNE_API_KEY = process.env.NEXT_PUBLIC_DUNE_API_KEY || "";
const DUNE_API_BASE = "https://api.dune.com/api/v1";

interface DuneQueryResult {
  execution_id: string;
  state: string;
  submitted_at: string;
  expires_at: string;
  execution_started_at?: string;
  execution_ended_at?: string;
  result?: {
    rows: any[];
    metadata: {
      column_names: string[];
      result_set_bytes: number;
      total_row_count: number;
    };
  };
}

interface DuneExecutionResponse {
  execution_id: string;
  state: string;
}

/**
 * Execute a Dune query
 */
export async function executeDuneQuery(queryId: number, parameters?: Record<string, any>): Promise<string> {
  if (!DUNE_API_KEY) {
    throw new Error("DUNE_API_KEY not configured");
  }

  const response = await fetch(`${DUNE_API_BASE}/query/${queryId}/execute`, {
    method: "POST",
    headers: {
      "X-Dune-API-Key": DUNE_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query_parameters: parameters || {},
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Dune API error: ${error}`);
  }

  const data: DuneExecutionResponse = await response.json();
  return data.execution_id;
}

/**
 * Get query execution results
 */
export async function getDuneQueryResults(executionId: string): Promise<DuneQueryResult> {
  if (!DUNE_API_KEY) {
    throw new Error("DUNE_API_KEY not configured");
  }

  const response = await fetch(`${DUNE_API_BASE}/execution/${executionId}/results`, {
    headers: {
      "X-Dune-API-Key": DUNE_API_KEY,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Dune API error: ${error}`);
  }

  return response.json();
}

/**
 * Wait for query execution to complete
 */
export async function waitForDuneQuery(
  executionId: string,
  maxWait: number = 30000,
  pollInterval: number = 1000
): Promise<DuneQueryResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const result = await getDuneQueryResults(executionId);

    if (result.state === "QUERY_STATE_COMPLETED") {
      return result;
    }

    if (result.state === "QUERY_STATE_FAILED") {
      throw new Error("Dune query execution failed");
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error("Dune query execution timeout");
}

/**
 * Execute query and wait for results
 */
export async function executeAndWaitForDuneQuery(
  queryId: number,
  parameters?: Record<string, any>
): Promise<any[]> {
  const executionId = await executeDuneQuery(queryId, parameters);
  const result = await waitForDuneQuery(executionId);
  return result.result?.rows || [];
}

/**
 * Get gas sponsored analytics
 */
export async function getGasSponsoredAnalytics(contractAddress: string, days: number = 7) {
  // This would use a Dune query ID that you create
  // Example query parameters
  return executeAndWaitForDuneQuery(0, {
    // query_id: YOUR_DUNE_QUERY_ID,
    contract_address: contractAddress,
    days: days,
  });
}

/**
 * Get wallet creation stats
 */
export async function getWalletCreationStats(factoryAddress: string) {
  return executeAndWaitForDuneQuery(0, {
    factory_address: factoryAddress,
  });
}

/**
 * Get MNEE transaction stats
 */
export async function getMNEETransactionStats(tokenAddress: string, days: number = 7) {
  return executeAndWaitForDuneQuery(0, {
    token_address: tokenAddress,
    days: days,
  });
}


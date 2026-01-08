import { NextRequest, NextResponse } from "next/server";

/**
 * API route to fetch Dune Analytics data
 * This acts as a proxy to keep API keys secure
 */

const DUNE_API_KEY = process.env.DUNE_API_KEY || "";
const DUNE_API_BASE = "https://api.dune.com/api/v1";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const queryId = searchParams.get("queryId");
  const paymaster = searchParams.get("paymaster");
  const factory = searchParams.get("factory");

  if (!DUNE_API_KEY) {
    return NextResponse.json(
      { error: "Dune API key not configured" },
      { status: 500 }
    );
  }

  if (!queryId) {
    return NextResponse.json(
      { error: "Query ID is required" },
      { status: 400 }
    );
  }

  try {
    // Execute query with parameters
    const executeResponse = await fetch(
      `${DUNE_API_BASE}/query/${queryId}/execute`,
      {
        method: "POST",
        headers: {
          "X-Dune-API-Key": DUNE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query_parameters: {
            paymaster_address: paymaster || "",
            factory_address: factory || "",
          },
        }),
      }
    );

    if (!executeResponse.ok) {
      throw new Error(`Dune API error: ${executeResponse.statusText}`);
    }

    const { execution_id } = await executeResponse.json();

    // Poll for results
    let result;
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      const resultResponse = await fetch(
        `${DUNE_API_BASE}/execution/${execution_id}/results`,
        {
          headers: {
            "X-Dune-API-Key": DUNE_API_KEY,
          },
        }
      );

      result = await resultResponse.json();

      if (result.state === "QUERY_STATE_COMPLETED") {
        return NextResponse.json({
          rows: result.result?.rows || [],
          metadata: result.result?.metadata || {},
        });
      }

      if (result.state === "QUERY_STATE_FAILED") {
        throw new Error("Dune query execution failed");
      }

      // Wait 1 second before next poll
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error("Query execution timeout");
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch Dune analytics" },
      { status: 500 }
    );
  }
}


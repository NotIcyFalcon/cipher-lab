import "server-only";

/**
 * Calls a streaming (newline-delimited JSON) endpoint on the gateway's
 * internal API. Log events are passed to onLog as they arrive; the final
 * { type: "result" } event is returned. The gateway sends a heartbeat every
 * 15s, so long builds never hit fetch's header/body timeouts.
 */
export type GatewayResult = { ok: boolean; error?: string } & Record<string, unknown>;

export function gatewayUrl(path: string) {
  const base = process.env.GATEWAY_INTERNAL_URL || "http://gateway:3002";
  return `${base.replace(/\/$/, "")}${path}`;
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.GRADER_INTERNAL_TOKEN ?? ""}`,
    "Content-Type": "application/json",
  };
}

export async function callGatewayStream(
  path: string,
  body: unknown,
  { onLog, timeoutMs }: { onLog?: (text: string) => void; timeoutMs: number },
): Promise<GatewayResult> {
  let response: Response;

  try {
    response = await fetch(gatewayUrl(path), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    return {
      ok: false,
      error: `Could not reach the lab gateway: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("ndjson") || !response.body) {
    const data = (await response.json().catch(() => null)) as GatewayResult | null;
    return data && typeof data === "object"
      ? { ...data, ok: Boolean(data.ok) && response.ok }
      : { ok: false, error: `The gateway answered HTTP ${response.status}.` };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let carry = "";
  let result: GatewayResult | null = null;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      carry += decoder.decode(value, { stream: true });
      const lines = carry.split("\n");
      carry = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        let event: Record<string, unknown>;
        try {
          event = JSON.parse(line);
        } catch {
          continue;
        }
        if (event.type === "log" && typeof event.text === "string") onLog?.(event.text);
        if (event.type === "result") result = event as GatewayResult;
      }
    }
  } catch (error) {
    return {
      ok: false,
      error: `The connection to the gateway was interrupted: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  return result ?? { ok: false, error: "The gateway closed the connection without a result." };
}

/** Fire-and-forget JSON call (cleanup tasks). */
export async function callGateway(path: string, body: unknown): Promise<void> {
  try {
    await fetch(gatewayUrl(path), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    console.error(`[Gateway] ${path} failed:`, error);
  }
}

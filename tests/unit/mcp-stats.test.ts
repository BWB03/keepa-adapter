import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

// These read-only tools do not use storage; avoid opening the user's database.
vi.mock("../../src/storage/db.js", () => ({ initDb: vi.fn() }));

const client = new Client({ name: "stats-test", version: "1.0.0" });
let server: McpServer;

beforeAll(async () => {
  vi.stubEnv("KEEPA_API_KEY", "test-key");
  vi.stubEnv("KEEPA_DEFAULT_DOMAIN", "com");
  vi.stubEnv("KEEPA_TOKENS_PER_MINUTE", "10000");
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const connect = McpServer.prototype.connect;
  const connectSpy = vi.spyOn(McpServer.prototype, "connect").mockImplementation(function (this: McpServer) {
    server = this;
    return connect.call(this, serverTransport);
  });
  try {
    await import("../../src/index.js");
    await client.connect(clientTransport);
  } finally {
    connectSpy.mockRestore();
  }
});

afterEach(() => vi.unstubAllGlobals());
afterAll(async () => {
  await client.close();
  await server?.close();
  vi.unstubAllEnvs();
});

describe.each(["keepa_get_seller_stats", "keepa_get_product"])("%s stats window", (name) => {
  it.each([
    { stats_days: 90, expected: "90" },
    { stats_days: undefined, expected: "30" },
  ])("sends stats=$expected to Keepa when stats_days=$stats_days", async ({ stats_days, expected }) => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      timestamp: 1,
      tokensLeft: 1000,
      refillIn: 1000,
      refillRate: 1000,
      products: [],
    }), { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await client.callTool({
      name,
      arguments: { asins: ["B001TEST00"], domain: "uk", ...(stats_days === undefined ? {} : { stats_days }) },
    });

    expect(result.isError).not.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(url.pathname).toBe("/product");
    expect(url.searchParams.get("stats")).toBe(expected);
    expect(url.searchParams.get("asin")).toBe("B001TEST00");
    expect(url.searchParams.get("domain")).toBe("2");
    expect(url.searchParams.get("buybox")).toBe("1");
    if (name === "keepa_get_seller_stats") {
      expect(url.searchParams.get("offers")).toBe("20");
    }
  });

  it("advertises an optional integer stats_days parameter", async () => {
    const { tools } = await client.listTools();
    const tool = tools.find((tool) => tool.name === name)!;
    expect(tool.inputSchema.properties?.stats_days).toMatchObject({ type: "integer" });
    expect(tool.inputSchema.required ?? []).not.toContain("stats_days");
  });

  it("rejects fractional stats_days before making a Keepa request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await client.callTool({ name, arguments: { asins: ["B001TEST00"], stats_days: 1.5 } });
    expect(result.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

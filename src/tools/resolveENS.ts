import { z } from "zod";
import { isAddress } from "viem";
import { normalize } from "viem/ens";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeSuccess, makeError } from "../types.js";
import type { ToolResult } from "../types.js";
import { getClient } from "../shared/rpc-client.js";
import { cache } from "../shared/cache.js";
import { sanitizeError } from "../shared/validate.js";

interface ENSData {
  name: string | null;
  address: string;
  avatar: string | null;
  resolved: "name_to_address" | "address_to_name";
}

const ENS_CACHE_TTL = 600; // 10분

const inputSchema = z.object({
  nameOrAddress: z.string().describe("ENS 이름 (vitalik.eth) 또는 이더리움 주소 (0x...)"),
});

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<ENSData>> {
  const { nameOrAddress } = args;
  const input = nameOrAddress.trim();

  // ENS는 Ethereum mainnet만 지원
  const chain = "ethereum" as const;
  const client = getClient(chain);

  const isAddr = isAddress(input);

  if (isAddr) {
    // 주소 → ENS 이름 (역해석)
    const cacheKey = `ens:addr:${input.toLowerCase()}`;
    const cached = cache.get<ENSData>(cacheKey);
    if (cached.hit) return makeSuccess(chain, cached.data, true);

    try {
      const name = await client.getEnsName({ address: input as `0x${string}` });

      let avatar: string | null = null;
      if (name) {
        try {
          avatar = await client.getEnsAvatar({ name: normalize(name) });
        } catch {
          // avatar 조회 실패 무시
        }
      }

      const data: ENSData = {
        name: name ?? null,
        address: input,
        avatar,
        resolved: "address_to_name",
      };

      cache.set(cacheKey, data, ENS_CACHE_TTL);
      return makeSuccess(chain, data, false);
    } catch (err) {
      const message = sanitizeError(err);
      return makeError(`ENS reverse lookup failed: ${message}`, "ENS_NOT_FOUND");
    }
  } else {
    // ENS 이름 → 주소
    if (!input.includes(".")) {
      return makeError(`Invalid ENS name: ${input}. Expected format: name.eth`, "INVALID_INPUT");
    }

    const cacheKey = `ens:name:${input.toLowerCase()}`;
    const cached = cache.get<ENSData>(cacheKey);
    if (cached.hit) return makeSuccess(chain, cached.data, true);

    try {
      const normalizedName = normalize(input);
      const address = await client.getEnsAddress({ name: normalizedName });

      if (!address) {
        return makeError(`ENS name '${input}' not found`, "ENS_NOT_FOUND");
      }

      let avatar: string | null = null;
      try {
        avatar = await client.getEnsAvatar({ name: normalizedName });
      } catch {
        // avatar 조회 실패 무시
      }

      const data: ENSData = {
        name: input,
        address,
        avatar,
        resolved: "name_to_address",
      };

      cache.set(cacheKey, data, ENS_CACHE_TTL);
      return makeSuccess(chain, data, false);
    } catch (err) {
      const message = sanitizeError(err);
      return makeError(`ENS resolution failed: ${message}`, "ENS_NOT_FOUND");
    }
  }
}

export function register(server: McpServer) {
  server.tool(
    "resolveENS",
    "ENS 이름 ↔ 이더리움 주소를 양방향으로 해석합니다 (Ethereum mainnet 전용)",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeError } from "../types.js";
import type { ToolError } from "../types.js";
import { cache } from "../shared/cache.js";
import protocolsData from "../data/protocols.json" with { type: "json" };

// Snapshot GraphQL API 엔드포인트
const SNAPSHOT_GRAPHQL_URL = "https://hub.snapshot.org/graphql";

// 캐시 TTL: 5분 (거버넌스 프로포절은 빠르게 변하지 않음)
const CACHE_TTL_SECONDS = 300;

interface GovernanceProposal {
  id: string;
  title: string;
  body: string;
  state: string;
  author: string;
  choices: string[];
  scores: number[];
  scorestotal: number;
  quorum: number;
  votes: number;
  startDate: string;
  endDate: string;
}

interface GovernanceData {
  space: string;
  proposalCount: number;
  proposals: GovernanceProposal[];
}

interface GovernanceResult {
  success: true;
  data: GovernanceData;
  cached: boolean;
  timestamp: number;
}

const inputSchema = z.object({
  protocol: z.string().describe("프로토콜 이름 또는 Snapshot space ID (e.g., 'uniswap', 'aave.eth')"),
  state: z.enum(["active", "closed", "all"]).default("active").describe("프로포절 상태 필터"),
  limit: z.number().min(1).max(100).default(10).describe("조회할 프로포절 수"),
});

// protocols.json에서 snapshotSpace 필드로 space ID를 조회
function resolveSpaceId(input: string): string {
  const lower = input.toLowerCase().trim();

  for (const p of protocolsData as Array<{ name: string; snapshotSpace?: string | null }>) {
    // 프로토콜 이름 매칭
    if (p.name.toLowerCase() === lower && p.snapshotSpace) {
      return p.snapshotSpace;
    }
  }

  // 매칭 없으면 입력값을 space ID로 직접 사용
  return input.trim();
}

// Snapshot GraphQL 쿼리 - state가 "all"이면 where절에서 state 제외
function buildGraphQLQuery(state: string): string {
  const whereClause = state === "all"
    ? "where: { space: $space }"
    : "where: { space: $space, state: $state }";

  return `
    query Proposals($space: String!, $state: String, $first: Int!) {
      proposals(
        first: $first,
        skip: 0,
        ${whereClause},
        orderBy: "created",
        orderDirection: desc
      ) {
        id
        title
        body
        state
        author
        created
        start
        end
        choices
        scores
        scores_total
        quorum
        votes
        space { id name }
      }
    }
  `;
}

async function handler(
  args: z.infer<typeof inputSchema>
): Promise<GovernanceResult | ToolError> {
  const { protocol, state, limit } = args;

  // Snapshot space ID 결정
  const spaceId = resolveSpaceId(protocol);

  // 캐시 키 생성
  const cacheKey = `governance:${spaceId}:${state}:${limit}`;
  const cached = cache.get<GovernanceData>(cacheKey);
  if (cached.hit) {
    return {
      success: true,
      data: cached.data,
      cached: true,
      timestamp: Date.now(),
    };
  }

  try {
    const query = buildGraphQLQuery(state);

    // GraphQL 변수 구성 - state가 "all"이면 state 변수 생략
    const variables: Record<string, unknown> = {
      space: spaceId,
      first: limit,
    };
    if (state !== "all") {
      variables.state = state;
    }

    const response = await fetch(SNAPSHOT_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      return makeError(
        `Snapshot API 요청 실패: HTTP ${response.status}`,
        "API_ERROR"
      );
    }

    const json = await response.json() as {
      data?: {
        proposals?: Array<{
          id: string;
          title: string;
          body: string;
          state: string;
          author: string;
          created: number;
          start: number;
          end: number;
          choices: string[];
          scores: number[];
          scores_total: number;
          quorum: number;
          votes: number;
          space: { id: string; name: string };
        }>;
      };
      errors?: Array<{ message: string }>;
    };

    // GraphQL 오류 처리
    if (json.errors && json.errors.length > 0) {
      return makeError(
        `Snapshot GraphQL 오류: ${json.errors[0].message}`,
        "API_ERROR"
      );
    }

    const rawProposals = json.data?.proposals ?? [];

    // 응답 데이터를 반환 형식으로 변환
    const proposals: GovernanceProposal[] = rawProposals.map((p) => ({
      id: p.id,
      title: p.title,
      // body는 500자로 잘라서 반환 (토큰 절약)
      body: p.body.length > 500 ? p.body.slice(0, 500) + "..." : p.body,
      state: p.state,
      author: p.author,
      choices: p.choices,
      scores: p.scores,
      scorestotal: p.scores_total,
      quorum: p.quorum,
      votes: p.votes,
      startDate: new Date(p.start * 1000).toISOString(),
      endDate: new Date(p.end * 1000).toISOString(),
    }));

    const governanceData: GovernanceData = {
      space: spaceId,
      proposalCount: proposals.length,
      proposals,
    };

    // 캐시에 저장
    cache.set(cacheKey, governanceData, CACHE_TTL_SECONDS);

    return {
      success: true,
      data: governanceData,
      cached: false,
      timestamp: Date.now(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return makeError(`거버넌스 프로포절 조회 실패: ${message}`, "API_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "getGovernanceProposals",
    "Snapshot 기반 DeFi 프로토콜 거버넌스 프로포절을 조회합니다 (상태 필터, 투표 결과 포함)",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}

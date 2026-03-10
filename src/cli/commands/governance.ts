import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ProtocolEntry {
  name: string;
  snapshotSpace?: string;
  [key: string]: unknown;
}

// protocols.json에서 Snapshot space ID 조회
function resolveSnapshotSpace(protocol: string): string {
  try {
    const protocolsPath = join(__dirname, "../../data/protocols.json");
    const protocols = JSON.parse(readFileSync(protocolsPath, "utf-8")) as ProtocolEntry[];
    const match = protocols.find(
      (p) => p.name.toLowerCase().includes(protocol.toLowerCase()) && p.snapshotSpace,
    );
    if (match?.snapshotSpace) return match.snapshotSpace;
  } catch {
    // 파일 읽기 실패 시 입력값 그대로 사용
  }
  return protocol;
}

interface SnapshotProposal {
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
}

export async function cmdGovernance(
  protocol: string,
  state: string = "active",
  json: boolean,
) {
  const space = resolveSnapshotSpace(protocol);

  // Snapshot GraphQL 쿼리
  const whereClause = state === "all"
    ? `{ space: "${space}" }`
    : `{ space: "${space}", state: "${state}" }`;

  const query = `{
    proposals(
      first: 10,
      skip: 0,
      where: ${whereClause},
      orderBy: "created",
      orderDirection: desc
    ) {
      id title body state author created start end
      choices scores scores_total quorum votes
      space { id name }
    }
  }`;

  const res = await fetch("https://hub.snapshot.org/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    console.error(`Snapshot API error: ${res.status}`);
    process.exit(1);
  }

  const result = (await res.json()) as { data?: { proposals: SnapshotProposal[] } };
  const proposals = result.data?.proposals ?? [];

  if (json) {
    console.log(JSON.stringify({ space, state, proposals }, null, 2));
    return;
  }

  console.log(`Governance — ${space} (${state})`);
  console.log(`  Total proposals: ${proposals.length}`);
  console.log("");

  for (const p of proposals) {
    const start = new Date(p.start * 1000).toISOString().slice(0, 10);
    const end = new Date(p.end * 1000).toISOString().slice(0, 10);
    console.log(`  [${p.state.toUpperCase()}] ${p.title}`);
    console.log(`    Author: ${p.author.slice(0, 10)}...`);
    console.log(`    Period: ${start} ~ ${end}`);
    console.log(`    Votes:  ${p.votes} | Quorum: ${p.quorum}`);
    if (p.choices.length > 0 && p.scores.length > 0) {
      const top = p.choices
        .map((c, i) => ({ choice: c, score: p.scores[i] ?? 0 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      for (const t of top) {
        const pct = p.scores_total > 0 ? ((t.score / p.scores_total) * 100).toFixed(1) : "0";
        console.log(`      ${t.choice}: ${pct}%`);
      }
    }
    console.log("");
  }
}

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { register as registerGetTokenPrice } from "./tools/getTokenPrice.js";
import { register as registerGetGasPrice } from "./tools/getGasPrice.js";
import { register as registerGetBalance } from "./tools/getBalance.js";
import { register as registerGetTokenInfo } from "./tools/getTokenInfo.js";
import { register as registerResolveENS } from "./tools/resolveENS.js";

const server = new McpServer({
  name: "evmscope",
  version: "0.1.0",
});

registerGetTokenPrice(server);
registerGetGasPrice(server);
registerGetBalance(server);
registerGetTokenInfo(server);
registerResolveENS(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("evmscope failed to start:", error);
  process.exit(1);
});

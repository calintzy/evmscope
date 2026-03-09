import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { register as registerGetTokenPrice } from "./tools/getTokenPrice.js";
import { register as registerGetGasPrice } from "./tools/getGasPrice.js";
import { register as registerGetBalance } from "./tools/getBalance.js";
import { register as registerGetTokenInfo } from "./tools/getTokenInfo.js";
import { register as registerResolveENS } from "./tools/resolveENS.js";
import { register as registerGetTxStatus } from "./tools/getTxStatus.js";
import { register as registerDecodeTx } from "./tools/decodeTx.js";
import { register as registerGetContractABI } from "./tools/getContractABI.js";
import { register as registerIdentifyAddress } from "./tools/identifyAddress.js";
import { register as registerCompareGas } from "./tools/compareGas.js";
import { register as registerGetApprovalStatus } from "./tools/getApprovalStatus.js";
import { register as registerGetProtocolTVL } from "./tools/getProtocolTVL.js";
import { register as registerGetWhaleMovements } from "./tools/getWhaleMovements.js";
import { register as registerGetSwapQuote } from "./tools/getSwapQuote.js";
import { register as registerGetYieldRates } from "./tools/getYieldRates.js";
import { register as registerGetContractEvents } from "./tools/getContractEvents.js";
import { register as registerGetTokenHolders } from "./tools/getTokenHolders.js";
import { register as registerSimulateTx } from "./tools/simulateTx.js";
import { register as registerCheckHoneypot } from "./tools/checkHoneypot.js";
import { register as registerGetBridgeRoutes } from "./tools/getBridgeRoutes.js";
import { VERSION } from "./shared/constants.js";

const server = new McpServer({
  name: "evmscope",
  version: VERSION,
});

// Phase 1 (MVP)
registerGetTokenPrice(server);
registerGetGasPrice(server);
registerGetBalance(server);
registerGetTokenInfo(server);
registerResolveENS(server);

// Phase 2
registerGetTxStatus(server);
registerDecodeTx(server);
registerGetContractABI(server);
registerIdentifyAddress(server);

// Phase 3 (v1.0)
registerCompareGas(server);
registerGetApprovalStatus(server);
registerGetProtocolTVL(server);
registerGetWhaleMovements(server);
registerGetSwapQuote(server);

// Phase 4 (v1.5)
registerGetYieldRates(server);
registerGetContractEvents(server);
registerGetTokenHolders(server);
registerSimulateTx(server);
registerCheckHoneypot(server);
registerGetBridgeRoutes(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("evmscope failed to start:", error);
  process.exit(1);
});

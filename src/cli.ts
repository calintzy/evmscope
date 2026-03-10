import { HELP, parseChain } from "./cli/parser.js";
import { cmdPrice } from "./cli/commands/price.js";
import { cmdGas } from "./cli/commands/gas.js";
import { cmdCompareGas } from "./cli/commands/compare-gas.js";
import { cmdBalance } from "./cli/commands/balance.js";
import { cmdTokenInfo } from "./cli/commands/token-info.js";
import { cmdENS } from "./cli/commands/ens.js";
import { cmdTx } from "./cli/commands/tx.js";
import { cmdABI } from "./cli/commands/abi.js";
import { cmdTVL } from "./cli/commands/tvl.js";
import { cmdSwap } from "./cli/commands/swap.js";
import { cmdYield } from "./cli/commands/yield.js";
import { cmdEvents } from "./cli/commands/events.js";
import { cmdHolders } from "./cli/commands/holders.js";
import { cmdSimulate } from "./cli/commands/simulate.js";
import { cmdHoneypot } from "./cli/commands/honeypot.js";
import { cmdBridge } from "./cli/commands/bridge.js";
import { cmdNFT, cmdNFTMetadata } from "./cli/commands/nft.js";
import { cmdGovernance } from "./cli/commands/governance.js";

async function main() {
  const args = process.argv.slice(2);

  // MCP 서버 모드 (인수 없음)
  if (args.length === 0) {
    await import("./index.js");
    return;
  }

  if (args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    return;
  }

  const jsonFlag = args.includes("--json");
  const filteredArgs = args.filter((a) => a !== "--json");
  const [cmd, ...rest] = filteredArgs;

  try {
    switch (cmd) {
      case "price":
        if (!rest[0]) { console.error("Usage: evmscope price <token> [chain]"); process.exit(1); }
        await cmdPrice(rest[0], parseChain(rest[1]), jsonFlag);
        break;
      case "gas":
        await cmdGas(parseChain(rest[0]), jsonFlag);
        break;
      case "compare-gas":
        await cmdCompareGas(jsonFlag);
        break;
      case "balance":
        if (!rest[0]) { console.error("Usage: evmscope balance <address> [chain]"); process.exit(1); }
        await cmdBalance(rest[0], parseChain(rest[1]), jsonFlag);
        break;
      case "token-info":
        if (!rest[0]) { console.error("Usage: evmscope token-info <token> [chain]"); process.exit(1); }
        await cmdTokenInfo(rest[0], parseChain(rest[1]), jsonFlag);
        break;
      case "ens":
        if (!rest[0]) { console.error("Usage: evmscope ens <name-or-address>"); process.exit(1); }
        await cmdENS(rest[0], jsonFlag);
        break;
      case "tx":
        if (!rest[0]) { console.error("Usage: evmscope tx <hash> [chain]"); process.exit(1); }
        await cmdTx(rest[0], parseChain(rest[1]), jsonFlag);
        break;
      case "abi":
        if (!rest[0]) { console.error("Usage: evmscope abi <address> [chain]"); process.exit(1); }
        await cmdABI(rest[0], parseChain(rest[1]), jsonFlag);
        break;
      case "tvl":
        if (!rest[0]) { console.error("Usage: evmscope tvl <protocol>"); process.exit(1); }
        await cmdTVL(rest.join(" "), jsonFlag);
        break;
      case "swap":
        if (rest.length < 3) { console.error("Usage: evmscope swap <tokenIn> <tokenOut> <amount> [chain]"); process.exit(1); }
        await cmdSwap(rest[0], rest[1], rest[2], parseChain(rest[3]), jsonFlag);
        break;
      case "yield":
        await cmdYield(rest[0], rest[1], jsonFlag);
        break;
      case "events":
        if (!rest[0]) { console.error("Usage: evmscope events <address> [chain]"); process.exit(1); }
        await cmdEvents(rest[0], parseChain(rest[1]), jsonFlag);
        break;
      case "holders":
        if (!rest[0]) { console.error("Usage: evmscope holders <token> [chain]"); process.exit(1); }
        await cmdHolders(rest[0], parseChain(rest[1]), jsonFlag);
        break;
      case "simulate":
        if (rest.length < 2) { console.error("Usage: evmscope simulate <from> <to> [data] [chain]"); process.exit(1); }
        await cmdSimulate(rest[0], rest[1], rest[2]?.startsWith("0x") ? rest[2] : undefined, parseChain(rest[2]?.startsWith("0x") ? rest[3] : rest[2]), jsonFlag);
        break;
      case "honeypot":
        if (!rest[0]) { console.error("Usage: evmscope honeypot <token> [chain]"); process.exit(1); }
        await cmdHoneypot(rest[0], parseChain(rest[1]), jsonFlag);
        break;
      case "bridge":
        if (rest.length < 4) { console.error("Usage: evmscope bridge <fromChain> <toChain> <token> <amount>"); process.exit(1); }
        await cmdBridge(parseChain(rest[0]), parseChain(rest[1]), rest[2], rest[3], jsonFlag);
        break;
      case "nft":
        if (!rest[0] || !rest[1]) { console.error("Usage: evmscope nft <address> <contractAddress> [chain]"); process.exit(1); }
        await cmdNFT(rest[0], rest[1], parseChain(rest[2]), jsonFlag);
        break;
      case "nft-metadata":
        if (!rest[0] || !rest[1]) { console.error("Usage: evmscope nft-metadata <contractAddress> <tokenId> [chain]"); process.exit(1); }
        await cmdNFTMetadata(rest[0], rest[1], parseChain(rest[2]), jsonFlag);
        break;
      case "governance":
        if (!rest[0]) { console.error("Usage: evmscope governance <protocol> [state]"); process.exit(1); }
        await cmdGovernance(rest[0], rest[1] ?? "active", jsonFlag);
        break;
      default:
        console.error(`Unknown command: ${cmd}`);
        console.log(HELP);
        process.exit(1);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${msg}`);
    process.exit(1);
  }
}

main();

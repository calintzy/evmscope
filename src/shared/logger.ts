// MCP stdout 보호를 위해 stderr 사용
const isDebug = !!(process.env.EVMSCOPE_DEBUG || process.env.DEBUG?.includes("evmscope"));

interface Logger {
  debug: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function createLogger(ns: string): Logger {
  const prefix = `[evmscope:${ns}]`;
  return {
    debug: (...args: unknown[]) => {
      if (isDebug) console.error(prefix, ...args);
    },
    warn: (...args: unknown[]) => {
      console.error(prefix, "WARN", ...args);
    },
    error: (...args: unknown[]) => {
      console.error(prefix, "ERROR", ...args);
    },
  };
}

/** catch 블록에서 안전하게 에러 로깅 (빈 catch 대체) */
export function logCatchError(ns: string, err: unknown): void {
  if (!isDebug) return;
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[evmscope:${ns}]`, "caught:", msg);
}

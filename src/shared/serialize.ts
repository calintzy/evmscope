/** BigInt 등을 JSON 직렬화 가능하게 재귀적 변환 */
export function serializeArg(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serializeArg);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, serializeArg(v)]),
    );
  }
  return value;
}

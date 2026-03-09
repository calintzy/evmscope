import labelsData from "../data/labels.json" with { type: "json" };

interface LabelEntry {
  address: string;
  label: string;
  category: string;
  tags: string[];
}

const labels: LabelEntry[] = labelsData as LabelEntry[];

/** labels.json에서 주소 라벨 조회 (identifyAddress에서 이동) */
export function findLabel(address: string): { label: string; category: string; tags: string[] } | null {
  const addr = address.toLowerCase();
  for (const entry of labels) {
    if (entry.address.toLowerCase() === addr) {
      return { label: entry.label, category: entry.category, tags: entry.tags };
    }
  }
  return null;
}

/** 주소의 라벨 문자열만 반환 (getWhaleMovements에서 이동) */
export function getLabel(address: string): string | null {
  const lower = address.toLowerCase();
  for (const entry of labels) {
    if (entry.address.toLowerCase() === lower) return entry.label;
  }
  return null;
}

/** 거래소 주소 여부 확인 (getWhaleMovements에서 이동) */
export function isExchangeAddress(address: string): boolean {
  const lower = address.toLowerCase();
  for (const entry of labels) {
    if (entry.address.toLowerCase() === lower && entry.category === "exchange") return true;
  }
  return false;
}

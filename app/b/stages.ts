// Pipeline stages for B and which stages each project lights up (design/b-pipeline.md section 3).
// Page config, not DB data: every pairing is backed by words already in content-pack.md.
export const STAGES = [
  { key: "input", label: "Document · Call" },
  { key: "ocr-asr", label: "OCR · ASR" },
  { key: "llm", label: "LLM" },
  { key: "review", label: "human review" },
  { key: "gate", label: "write gate" },
] as const;
export const BASE_STAGE = { key: "base", label: "Shared GPU server" } as const;

export type StageKey = (typeof STAGES)[number]["key"] | typeof BASE_STAGE.key;

const ALL = [...STAGES, BASE_STAGE];
export const stageLabel = (k: StageKey) => ALL.find((s) => s.key === k)!.label;

export const PROJECT_STAGES: Record<string, StageKey[]> = {
  "call-quality-scoring": ["input", "ocr-asr", "llm", "review"],
  // ECM: documents in, OCR, then search and chat with data over the text (LLM tool calling)
  ecm: ["input", "ocr-asr", "llm"],
  "document-extraction-pilot": ["input", "ocr-asr", "llm", "review"],
  // vLLM serving + fine-tune evals on the shared B200 behind the LiteLLM gateway
  "inference-finetuning-b200": ["base", "llm"],
  // an LLM reads the code around each scanner finding
  "code-security-triage": ["llm"],
  "agentic-dw-chatbot": ["llm"],
  "phone-number-extraction": ["gate"],
  "monitoring-workflows": ["llm"],
  "nightly-asr-recovery": ["ocr-asr"],
  "human-approved-sync": ["review", "gate"],
  "choosing-not-to-use-n8n": [],
};

export function stagesOf(slug: string): StageKey[] {
  const s = PROJECT_STAGES[slug];
  if (!s) throw new Error(`no pipeline stages configured for ${slug}`);
  // Display in pipeline order with the base layer last.
  return ALL.map((x) => x.key).filter((k) => s.includes(k));
}

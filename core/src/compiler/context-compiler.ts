import type { AgentDefinition, AgentRule } from "../definition/types.ts";
import type { SessionState, ToolResultRecord, TranscriptEntry } from "../session/state.ts";
import type { KnowledgeResult, KnowledgeSourceCatalogEntry } from "../knowledge/types.ts";
import type { Phase } from "../flow/types.ts";
import type { WorkingNote } from "../memory/types.ts";
import type { ModelMessage } from "../provider/types.ts";
import { modelVisibleContext, trustLabel } from "../context/host-context.ts";
import { selectNotes } from "../memory/working.ts";
import { findPhase } from "../flow/evaluate.ts";
import { normalizeAgentRules } from "../definition/definition.ts";

/**
 * The ContextCompiler is intentionally close to pure. Retrieval has already happened; this module
 * only selects and renders what one model call may see.
 */

export interface CompiledContextSection {
  id: string;
  title: string;
  lines: string[];
}

export interface CompiledContext {
  agentId: string;
  agentVersion: number;
  phaseId: string | null;
  sections: CompiledContextSection[];
  system: string;
  messages: ModelMessage[];
  knowledgeUsed: {
    kind: "document_search" | "record_query" | "web_search";
    sourceId: string;
    chunkId?: string;
    score?: number;
    rank?: number;
  }[];
  effectiveRules: AgentRule[];
  /** Context keys deliberately withheld, and why. */
  withheldContextKeys: { key: string; visibility: string }[];
  approxChars: number;
}

export interface CompileInput {
  definition: AgentDefinition;
  state: SessionState;
  /** Evidence explicitly retrieved from a validated PreflightPlan or an agentic iteration. */
  retrievedKnowledge?: KnowledgeResult[];
  /** Extra instruction for this particular response/tool-loop call. */
  taskInstruction?: string;
  transcriptWindow?: number;
  now: Date;
}

export interface CompilePlannerInput {
  definition: AgentDefinition;
  state: SessionState;
  sourceCatalog: KnowledgeSourceCatalogEntry[];
  taskInstruction: string;
  transcriptWindow?: number;
  now: Date;
}

const formatValue = (value: unknown): string => (Array.isArray(value) ? value.join(", ") : String(value));

/** Rendering belongs to compilation; importing a Knowledge implementation here would blur the boundary. */
const renderRecord = (record: Record<string, unknown>): string =>
  Object.entries(record)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}: ${formatValue(value)}`)
    .join("\n");

function goalSection(definition: AgentDefinition): CompiledContextSection {
  return { id: "goal", title: "Your role", lines: [definition.goal.trim()] };
}

/** Compiles contradictions away: only defaults may be explicitly suppressed by a phase. */
export function effectiveRules(definition: AgentDefinition, phase: Phase | undefined): AgentRule[] {
  const overridden = new Set(phase?.overrideRuleIds ?? []);
  return normalizeAgentRules(definition.globalRules).filter((rule) => rule.kind === "invariant" || !overridden.has(rule.id));
}

function rulesSection(rules: AgentRule[]): CompiledContextSection | null {
  if (!rules.length) return null;
  return {
    id: "effective_rules",
    title: "Effective rules",
    lines: rules.map((rule) => `- [${rule.kind.toUpperCase()}:${rule.id}] ${rule.text}`),
  };
}

function phaseSection(phase: Phase | undefined): CompiledContextSection | null {
  if (!phase) return null;
  const lines = [`Objective: ${phase.objective}`];
  if (phase.instructions) lines.push(phase.instructions);
  return { id: "phase", title: `Current phase (${phase.id})`, lines };
}

function memorySection(state: SessionState, definition: AgentDefinition): CompiledContextSection | null {
  const entries = Object.values(state.memory);
  if (!entries.length) return null;
  const described = new Map(definition.memorySchema.fields.map((field) => [field.key, field]));
  const lines = entries
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((entry) => {
      const label = described.get(entry.key)?.description ?? entry.key;
      const corrected = entry.previousValue !== undefined && entry.previousValue !== entry.value
        ? ` (CORRECTED this session - replaced ${formatValue(entry.previousValue)}, which is no longer true)`
        : "";
      const origin = entry.provenance?.kind ?? "unknown";
      const authority = entry.authority === "authoritative" ? "AUTHORITATIVE" : "ADVISORY";
      return `- ${entry.key}: ${formatValue(entry.value)}${corrected} [${authority}; origin=${origin}] - ${label}`;
    });
  return {
    id: "memory",
    title: "Current structured memory (CURRENT values override stale transcript statements)",
    lines,
  };
}

function workingNotesSection(notes: WorkingNote[]): CompiledContextSection | null {
  if (!notes.length) return null;
  return {
    id: "working_notes",
    title: "Working notes (UNVERIFIED; never a basis for taking an action)",
    lines: notes.map((note) => `- ${note.text}${note.confidence !== undefined ? ` (confidence ${note.confidence})` : ""}`),
  };
}

function contextSection(state: SessionState): {
  section: CompiledContextSection | null;
  withheld: { key: string; visibility: string }[];
} {
  const visible = modelVisibleContext(state.hostContext);
  const withheld = Object.values(state.hostContext)
    .filter((value) => value.visibility !== "model")
    .map((value) => ({ key: value.key, visibility: value.visibility }));
  if (!visible.length) return { section: null, withheld };
  return {
    section: {
      id: "host_context",
      title: "Context supplied by the host application",
      lines: visible
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((value) => `- ${value.key}: ${formatValue(value.value)} [${trustLabel(value.trust)}]${value.description ? ` - ${value.description}` : ""}`),
    },
    withheld,
  };
}

function toolResultsSection(results: ToolResultRecord[]): CompiledContextSection | null {
  if (!results.length) return null;
  const lines: string[] = [];
  for (const result of results) {
    if (result.ok) {
      lines.push(`- ${result.toolName}: SUCCEEDED${result.replayed ? " (already performed earlier in this session; not repeated)" : ""}`);
      for (const fact of result.facts ?? []) {
        lines.push(`  - AUTHORITATIVE FACT ${fact.key} = ${formatValue(fact.value)}${fact.description ? ` - ${fact.description}` : ""}`);
      }
      const output = JSON.stringify(result.output);
      if (output && output !== "{}") lines.push(`  - result: ${output.length > 1200 ? `${output.slice(0, 1200)}...` : output}`);
    } else {
      lines.push(`- ${result.toolName}: FAILED (${result.error?.code}: ${result.error?.message}). Do not claim it succeeded.`);
    }
  }
  return { id: "tool_results", title: "Results of actions taken this turn (AUTHORITATIVE runtime observations)", lines };
}

function knowledgeSection(results: KnowledgeResult[], charBudget: number): {
  section: CompiledContextSection | null;
  used: CompiledContext["knowledgeUsed"];
} {
  if (!results.length) return { section: null, used: [] };
  const lines: string[] = [];
  const used: CompiledContext["knowledgeUsed"] = [];
  let remaining = charBudget;
  const add = (line: string): boolean => {
    if (remaining <= 0) return false;
    const accepted = line.length <= remaining ? line : `${line.slice(0, Math.max(0, remaining - 16))}… [truncated]`;
    lines.push(accepted);
    remaining -= accepted.length;
    return line.length <= remaining + accepted.length;
  };

  for (const result of results) {
    if (remaining <= 0) break;
    if (result.kind === "document_search") {
      for (const chunk of result.chunks) {
        if (remaining <= 0) break;
        const line = `- [${chunk.sourceTitle}; chunk=${chunk.chunkId}; rank=${chunk.rank}; score=${chunk.score}] ${chunk.text.replace(/\n/g, "\n  ")}`;
        used.push({ kind: result.kind, sourceId: result.sourceId, chunkId: chunk.chunkId, score: chunk.score, rank: chunk.rank });
        if (!add(line)) break;
      }
    } else if (result.kind === "record_query") {
      const header = `- [${result.sourceTitle}] DETERMINISTIC RECORD QUERY matched ${result.totalMatched} of ${result.totalRecords} records; ${result.matches.length} rows are shown.`;
      used.push({ kind: result.kind, sourceId: result.sourceId });
      if (!add(header)) break;
      for (const [index, record] of result.matches.entries()) {
        if (!add(`  - row ${index + 1}: ${renderRecord(record).replace(/\n/g, "; ")}`)) break;
      }
    } else {
      const scope = result.allowedDomains?.length ? `; domains=${result.allowedDomains.join(",")}` : "";
      used.push({ kind: result.kind, sourceId: result.sourceId });
      if (!add(`- [${result.sourceTitle}] WEB SEARCH for ${JSON.stringify(result.query)}${scope}`)) break;
      for (const item of result.results) {
        if (!add(`  - ${item.title} — ${item.url} — ${item.snippet}`)) break;
      }
    }
  }
  return { section: lines.length ? { id: "knowledge", title: "Explicitly retrieved evidence", lines } : null, used };
}

function pendingSection(state: SessionState): CompiledContextSection | null {
  const pending = state.pendingAction;
  if (!pending) return null;
  return {
    id: "pending_action",
    title: "Awaiting confirmation",
    lines: [
      `You asked the user to confirm "${pending.toolName}" (request ${pending.requestId}) and they have not yet given a clear yes.`,
      "Do not state or imply that it has happened. If their latest message did not clearly authorize it, ask again plainly.",
    ],
  };
}

function transcriptMessages(transcript: TranscriptEntry[], window: number): ModelMessage[] {
  return transcript.slice(-window).map((entry) => ({ role: entry.role, content: entry.text }));
}

function finishContext(
  definition: AgentDefinition,
  state: SessionState,
  sections: CompiledContextSection[],
  messages: ModelMessage[],
  rules: AgentRule[],
  withheld: { key: string; visibility: string }[],
  knowledgeUsed: CompiledContext["knowledgeUsed"],
): CompiledContext {
  const system = sections.map((section) => `## ${section.title}\n${section.lines.join("\n")}`).join("\n\n");
  return {
    agentId: definition.id,
    agentVersion: definition.version,
    phaseId: state.phaseId,
    sections,
    system,
    messages,
    knowledgeUsed,
    effectiveRules: rules,
    withheldContextKeys: withheld,
    approxChars: system.length,
  };
}

/** Response-only compilation. This function has no provider/index parameter and cannot retrieve. */
export function compileContext(input: CompileInput): CompiledContext {
  const { definition, state, now } = input;
  const phase = definition.flow ? findPhase(definition.flow, state.phaseId) : undefined;
  const rules = effectiveRules(definition, phase);
  const notes = selectNotes(state.workingNotes, now, definition.policies.workingNoteTtlMs ?? 0);
  const { section: host, withheld } = contextSection(state);
  const selected = knowledgeSection(input.retrievedKnowledge ?? [], definition.policies.maxKnowledgeChars);
  const sections = [
    goalSection(definition),
    rulesSection(rules),
    phaseSection(phase),
    memorySection(state, definition),
    host,
    selected.section,
    toolResultsSection(state.turnToolResults),
    workingNotesSection(notes),
    pendingSection(state),
    input.taskInstruction ? { id: "task", title: "Your task for this step", lines: [input.taskInstruction] } : null,
  ].filter((section): section is CompiledContextSection => section !== null);
  const window = input.transcriptWindow ?? definition.policies.transcriptWindow ?? 10;
  return finishContext(definition, state, sections, transcriptMessages(state.transcript, window), rules, withheld, selected.used);
}

/** Minimal pre-retrieval context for Harness pass 1. It cannot contain document text or tool secrets. */
export function compilePlannerContext(input: CompilePlannerInput): CompiledContext {
  const { definition, state } = input;
  const phase = definition.flow ? findPhase(definition.flow, state.phaseId) : undefined;
  const rules = effectiveRules(definition, phase);
  const { section: host, withheld } = contextSection(state);
  const catalogLines = input.sourceCatalog.map((source) => {
    const base = `- ${source.id}: ${source.title} [type=${source.type}]${source.description ? ` - ${source.description}` : ""}`;
    if (source.type === "document") return base;
    if (source.type === "web_search") {
      const allowed = source.allowedDomains?.length ? `\n  allowed domains: ${source.allowedDomains.join(", ")}` : "";
      const blocked = source.blockedDomains?.length ? `\n  blocked domains: ${source.blockedDomains.join(", ")}` : "";
      return `${base}${allowed}${blocked}`;
    }
    return `${base}\n  fields: ${source.fields.map((field) => `${field.name} (${field.type})`).join(", ")}\n  operators: ${source.supportedOperators.join(", ")}; filters use AND; sort and limit are deterministic`;
  });
  const sections = [
    goalSection(definition),
    rulesSection(rules),
    phaseSection(phase),
    memorySection(state, definition),
    host,
    catalogLines.length ? { id: "knowledge_catalog", title: "Available logical knowledge sources (catalog only)", lines: catalogLines } : null,
    { id: "task", title: "Interpret and plan this turn", lines: [input.taskInstruction] },
  ].filter((section): section is CompiledContextSection => section !== null);
  return finishContext(
    definition,
    state,
    sections,
    transcriptMessages(state.transcript, input.transcriptWindow ?? 6),
    rules,
    withheld,
    [],
  );
}

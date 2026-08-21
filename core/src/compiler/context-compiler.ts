import type { AgentDefinition } from "../definition/types.ts";
import type { SessionState, ToolResultRecord, TranscriptEntry } from "../session/state.ts";
import type { KnowledgeChunk } from "../knowledge/types.ts";
import type { KnowledgeIndex } from "../knowledge/in-memory.ts";
import type { Phase } from "../flow/types.ts";
import type { WorkingNote } from "../memory/types.ts";
import type { ModelMessage } from "../provider/types.ts";
import { modelVisibleContext, trustLabel } from "../context/host-context.ts";
import { selectNotes } from "../memory/working.ts";
import { findPhase } from "../flow/evaluate.ts";

/**
 * The ContextCompiler builds the smallest useful context for each model call.
 *
 * It produces a STRUCTURED value first and renders text second. That ordering is deliberate: tests
 * and traces assert on `CompiledContext`, so "does a runtime_only secret reach the model" is a
 * question about data, not about grepping a prompt string.
 *
 * Rules enforced here:
 *  - `tools_only` / `runtime_only` host context never appears, in any section;
 *  - corrected structured state is presented as CURRENT and outranks stale transcript values;
 *  - authoritative tool facts are labelled as authoritative;
 *  - working notes are labelled unverified;
 *  - the authoring requirements document is never concatenated in - only the concise goal is.
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
  /** Rendered system prompt. Derived from `sections`; never assembled independently. */
  system: string;
  messages: ModelMessage[];
  /** Which knowledge chunks were selected, for the trace. */
  knowledgeUsed: { sourceId: string; chunkId: string; score: number }[];
  /** Context keys deliberately withheld, and why. Makes the filter auditable. */
  withheldContextKeys: { key: string; visibility: string }[];
  approxChars: number;
}

export interface CompileInput {
  definition: AgentDefinition;
  state: SessionState;
  /** Retrieved knowledge for this turn. The caller retrieves so the compiler stays synchronous/pure. */
  knowledge?: KnowledgeChunk[];
  /** Extra instruction for this specific model call (e.g. the interpretation pass's task). */
  taskInstruction?: string;
  /** Overrides the transcript window from policies. */
  transcriptWindow?: number;
  now: Date;
}

const formatValue = (value: unknown): string => (Array.isArray(value) ? value.join(", ") : String(value));

function goalSection(definition: AgentDefinition): CompiledContextSection {
  const lines = [definition.goal.trim()];
  for (const rule of definition.globalRules ?? []) lines.push(`- ${rule}`);
  return { id: "goal", title: "Your role", lines };
}

function phaseSection(phase: Phase | undefined): CompiledContextSection | null {
  if (!phase) return null;
  const lines = [`Objective: ${phase.objective}`];
  if (phase.instructions) lines.push(phase.instructions);
  return { id: "phase", title: `Current phase (${phase.id})`, lines };
}

/**
 * Current structured state.
 *
 * Every value is labelled CURRENT, and a corrected value states what it replaced. This is what stops
 * a model from re-reading a superseded number out of the transcript: the correction is not merely
 * present, it is marked as the one that counts.
 */
function memorySection(state: SessionState, definition: AgentDefinition): CompiledContextSection | null {
  const entries = Object.values(state.memory);
  if (!entries.length) return null;
  const described = new Map(definition.memorySchema.fields.map((f) => [f.key, f]));
  const lines = entries
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((entry) => {
      const label = described.get(entry.key)?.description ?? entry.key;
      const corrected =
        entry.previousValue !== undefined && entry.previousValue !== entry.value
          ? ` (CORRECTED this session - replaced ${formatValue(entry.previousValue)}, which is no longer true)`
          : "";
      const source = entry.source === "tool_result" ? " [established by a tool result]" : "";
      return `- ${entry.key}: ${formatValue(entry.value)}${corrected}${source} - ${label}`;
    });
  return {
    id: "memory",
    title: "Confirmed facts about this conversation (CURRENT - these override anything earlier in the transcript)",
    lines,
  };
}

function workingNotesSection(notes: WorkingNote[]): CompiledContextSection | null {
  if (!notes.length) return null;
  return {
    id: "working_notes",
    title: "Working notes (UNVERIFIED observations - useful context, but never a basis for taking an action)",
    lines: notes.map((n) => `- ${n.text}${n.confidence !== undefined ? ` (confidence ${n.confidence})` : ""}`),
  };
}

/** Model-visible host context only. The withheld keys are returned separately for auditing. */
function contextSection(state: SessionState): { section: CompiledContextSection | null; withheld: { key: string; visibility: string }[] } {
  const visible = modelVisibleContext(state.hostContext);
  const withheld = Object.values(state.hostContext)
    .filter((v) => v.visibility !== "model")
    .map((v) => ({ key: v.key, visibility: v.visibility }));

  if (!visible.length) return { section: null, withheld };
  const lines = visible
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((v) => `- ${v.key}: ${formatValue(v.value)} [${trustLabel(v.trust)}]${v.description ? ` - ${v.description}` : ""}`);
  return { section: { id: "host_context", title: "Context supplied by the host application", lines }, withheld };
}

/**
 * Latest tool results.
 *
 * Successes and failures are both stated plainly. A failed action is presented as failed so the
 * model cannot report a success that never happened - the runtime's record is the authority.
 */
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
  return { id: "tool_results", title: "Results of actions taken this turn (AUTHORITATIVE - the runtime observed these directly)", lines };
}

function knowledgeSection(chunks: KnowledgeChunk[]): CompiledContextSection | null {
  if (!chunks.length) return null;
  const lines = chunks.map((c) => `- [${c.sourceTitle}] ${c.text.replace(/\n/g, "\n  ")}`);
  return { id: "knowledge", title: "Reference material (only state what this supports)", lines };
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
  return transcript.slice(-window).map((entry) => ({
    role: entry.role === "user" ? ("user" as const) : ("assistant" as const),
    content: entry.text,
  }));
}

export function compileContext(input: CompileInput): CompiledContext {
  const { definition, state, now } = input;
  const phase = definition.flow ? findPhase(definition.flow, state.phaseId) : undefined;
  const notes = selectNotes(state.workingNotes, now, definition.policies.workingNoteTtlMs ?? 0);
  const { section: ctxSection, withheld } = contextSection(state);
  const knowledge = input.knowledge ?? [];

  const sections = [
    goalSection(definition),
    phaseSection(phase),
    memorySection(state, definition),
    ctxSection,
    knowledgeSection(knowledge),
    toolResultsSection(state.turnToolResults),
    workingNotesSection(notes),
    pendingSection(state),
    input.taskInstruction ? { id: "task", title: "Your task for this step", lines: [input.taskInstruction] } : null,
  ].filter((s): s is CompiledContextSection => s !== null);

  const system = sections.map((s) => `## ${s.title}\n${s.lines.join("\n")}`).join("\n\n");
  const window = input.transcriptWindow ?? definition.policies.transcriptWindow ?? 10;

  return {
    agentId: definition.id,
    agentVersion: definition.version,
    phaseId: state.phaseId,
    sections,
    system,
    messages: transcriptMessages(state.transcript, window),
    knowledgeUsed: knowledge.map((c) => ({ sourceId: c.sourceId, chunkId: c.chunkId, score: c.score })),
    withheldContextKeys: withheld,
    approxChars: system.length,
  };
}

/**
 * Retrieval + compilation in one step.
 *
 * The retrieval query is the latest user message plus current memory values: a bare user message
 * like "what about that one?" retrieves nothing useful on its own, while the accumulated state
 * carries the terms that actually identify the subject.
 */
export async function compileWithRetrieval(
  input: Omit<CompileInput, "knowledge">,
  knowledgeIndex: KnowledgeIndex,
  phaseSourceIds?: string[],
): Promise<CompiledContext> {
  const lastUser = [...input.state.transcript].reverse().find((t) => t.role === "user");
  const memoryTerms = Object.values(input.state.memory)
    .map((m) => formatValue(m.value))
    .join(" ");
  const queryText = `${lastUser?.text ?? ""} ${memoryTerms}`.trim();
  const chunks = queryText ? await knowledgeIndex.retrieve({ text: queryText }, input.state.phaseId ?? undefined, phaseSourceIds) : [];
  const topK = 4;
  return compileContext({ ...input, knowledge: chunks.slice(0, topK) });
}

# Agent_SDK v0.35.1 repair report

1. **Environment:** yes. Every live command loaded Agent_SDK's root `.env`; the
   API key was never printed or stored.
2. **Model:** yes. Configuration and every completed provider event reported
   `gemini-3.5-flash-lite`; model mismatches and fallbacks were zero.
3. **Minimal reproduction:** `diagnostics/gemini-strands-tool-repro.ts` ran one
   deterministic read tool as model → tool call → ToolResult → model → final
   answer → clean `endTurn`. It completed in two Strands model calls.
4. **Root cause:** the failing request was the semantic planning preflight, not
   the later Strands tool continuation. Agent_SDK sent provider-neutral JSON
   Schema through Gemini's legacy `responseSchema` field and always included an
   unused polymorphic retrieval-planning branch. Gemini rejected that structured
   output request with HTTP 400 `INVALID_ARGUMENT`. The harness then continued,
   so Strands could still call tools and produce a substantive answer; the old
   benchmark runner misclassified the retained turn-level preflight error as a
   Strands continuation failure. Sanitized boundary instrumentation proved that
   Strands preserved the function-call ID and a 128-character thought signature
   through the matching function response.
5. **Classification:** an Agent_SDK Gemini provider/schema compatibility defect,
   plus a benchmark failure-attribution defect. No core mental-model defect or
   upstream Strands thought-signature defect was reproduced.
6. **Fix:** use Gemini `responseJsonSchema`; preserve dynamic-object semantics;
   omit unsupported advisory string constraints at the provider boundary;
   project the agentic preflight without its unused polymorphic retrieval branch;
   preserve thrown Strands provider details in lifecycle traces; and use the
   tested canonical state projections in the consolidated runner. Version is
   `0.35.1` because these are compatibility and observability repairs.
7. **AgentDefinitions:** unchanged. P01/P02 hashes remain
   `03b90ca8...98eb0` and `bc38739d...f2df0`; the defect was below them.
8. **CRAIG-S01 smoke:** clean completion, no RuntimeError/fallback/400; four
   model calls (one plan, three loop), authoritative `9.9 m3` tool result, and
   knowledge retrieval.
9. **ESTATE-S01 smoke:** clean completion, no RuntimeError/fallback/400; three
   model calls (one plan, two loop), authoritative listing query, dry-run only.
10. **Full rerun:** all 21 P01 and 15 P02 scenarios, covering 68 user turns,
    completed with zero RuntimeErrors, fallbacks, or model mismatches. Arrokothi
    graded P01 20 pass / 1 hard fail and P02 11 pass / 4 hard fail. These are
    normal frozen-grader semantic outcomes; v0.35 remains framework-blocked /
    inconclusive rather than 36 semantic losses.
11. **Efficiency:** P01 111 calls / 37 turns = 3.000 mean (median 3), 128,108
    input + 11,859 output tokens. P02 94 calls / 31 turns = 3.032 mean (median
    3), 204,047 input + 7,749 output tokens. Physical Strands transport attempts
    remain unavailable and are null.
12. **Remaining risks:** full workflow-mode retrieval planning still contains a
    nested polymorphic record-filter schema that `gemini-3.5-flash-lite` rejected
    in an isolated probe; the repaired canonical agentic path does not send that
    unused branch. Semantic outcomes remain stochastic development-set evidence,
    and some frozen lexical grader decisions do not match an ordinary-language
    reading. The redundant legacy `benchmarks/triad-v035` tree is still present
    because its requested deletion was blocked by the safety reviewer; all
    unique evidence has already been migrated into `benchmarks/triad/results`.

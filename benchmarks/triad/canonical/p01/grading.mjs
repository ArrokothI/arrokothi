// Shared grading for the Craig benchmark. BENCHMARK-ONLY.
// Split out of run-benchmark.mjs so stored transcripts can be RE-GRADED without spending any
// further model quota (see regrade.mjs) — grading must never depend on being online.

/** A MAX_TOKENS cut leaves the reply ending mid-word/mid-clause. */
export const looksTruncated = (t) => Boolean(t) && !/[.!?"'”’)]\s*$/.test(t.trim());

/** Scenarios whose defining condition IS the provider being unavailable. For these, running on the
 *  deterministic fallback is the scenario, not a harness defect. */
export const EXPECTS_DEGRADED = new Set(["CRAIG-S17"]);

/**
 * Per-turn "did the model actually answer?" flags.
 * Agenerateor reports provider.mode ("gemini" | "local" | "local_fallback").
 * The bespoke baseline reports source ("gemini" | "fallback").
 * When per-turn data is absent (older records), fall back to the unique-source set: a run whose
 * ONLY source is a non-model one is unambiguously fully degraded.
 */
export function modelBackedFlags(run, turnCount) {
  const per = run.turnProviders ?? [];
  if (per.length === turnCount) return per.map((m) => m === "gemini");
  const uniq = run.sources ?? run.source ?? run.providerModes ?? run.provider ?? [];
  const set = new Set(Array.isArray(uniq) ? uniq : [uniq]);
  if (set.size === 1 && !set.has("gemini")) return new Array(turnCount).fill(false);
  if (set.size === 1 && set.has("gemini")) return new Array(turnCount).fill(true);
  return new Array(turnCount).fill(null);      // mixed and unattributable
}

export function grade(scenario, run, stateless) {
  if (run.harnessError) return { outcome: "inconclusive", reason: `harness failure: ${run.harnessError}`, assertions: [] };
  if (!run.replies?.length) return { outcome: "inconclusive", reason: "no replies produced", assertions: [] };

  const flags = modelBackedFlags(run, run.replies.length);
  const expectsDegraded = EXPECTS_DEGRADED.has(scenario.id);
  const anyModel = flags.some((f) => f === true);
  const anyUnattributable = flags.some((f) => f === null);

  if (!expectsDegraded && !anyModel && flags.every((f) => f === false)) {
    return { outcome: "inconclusive", degraded: true, assertions: [],
      reason: "model path unavailable on every turn (free-tier daily quota exhausted; ran on the deterministic fallback) — this measures the harness, not the agent" };
  }
  if (run.truncatedTurns) {
    return { outcome: "inconclusive", truncated: true, assertions: [],
      reason: `provider truncated ${run.truncatedTurns}/${run.replies.length} replies (finishReason MAX_TOKENS: thinking tokens consumed the baseline's 720-token budget) — the reply text cannot be fairly graded` };
  }

  const idx = (turn) => (turn === -1 ? run.replies.length - 1 : turn);
  const ctxAt = (turn) => ({
    reply: run.replies[idx(turn)] ?? "",
    allReplies: run.replies.join("\n\n"),
    fields: stateless ? {} : run.fields ?? {},
    stageId: stateless ? null : run.stageId ?? null,
    actionsAttempted: stateless ? [] : run.actions ?? [],
    stateless,
  });

  const assertions = [];
  for (const a of scenario.assertions) {
    const ti = idx(a.turn);
    // "text" is unjudgeable when ITS OWN turn ran without the model. "state" is CUMULATIVE — it is
    // built up across every turn — so a single degraded turn anywhere in the scenario means the
    // final state may be missing an extraction that never got a chance to run. Judging it would
    // blame the agent for the harness's exhausted quota.
    const anyDegraded = flags.some((f) => f === false || f === null);
    const degradedTurn = !expectsDegraded && (
      (a.kind === "text" && (flags[ti] === false || (flags[ti] === null && anyUnattributable)))
      || (a.kind === "state" && anyDegraded)
    );
    if (degradedTurn) {
      assertions.push({ id: a.id, label: a.label, kind: a.kind, severity: a.severity, applicable: false, passed: null,
        detail: `turn ${ti} did not run on the model (provider fallback) — reply text not judgeable` });
      continue;
    }
    let result;
    try { result = a.check(ctxAt(a.turn)); } catch (e) { result = { passed: false, detail: `assertion threw: ${e}` }; }
    if (result === null) {
      assertions.push({ id: a.id, label: a.label, kind: a.kind, severity: a.severity, applicable: false, passed: null,
        detail: "not applicable to this implementation (no structured runtime state)" });
      continue;
    }
    assertions.push({ id: a.id, label: a.label, kind: a.kind, severity: a.severity, applicable: true, passed: result.passed, detail: result.detail });
  }

  const applicable = assertions.filter((a) => a.applicable);
  if (!applicable.length) return { outcome: "inconclusive", reason: "no assertion could be judged on this run", assertions };
  const hardFails = applicable.filter((a) => a.severity === "hard" && !a.passed);
  const softFails = applicable.filter((a) => a.severity === "soft" && !a.passed);
  return { outcome: hardFails.length ? "hard_fail" : softFails.length ? "soft_fail" : "pass", reason: null, assertions };
}

/** Comparative verdict uses ONLY assertions judged on BOTH sides — a state assertion the stateless
 *  baseline structurally cannot have is never counted as an Agenerateor win. */
export function compare(agenGrade, bespokeGrade) {
  if (agenGrade.outcome === "inconclusive" || bespokeGrade.outcome === "inconclusive") return { verdict: "inconclusive", shared: [] };
  const byId = Object.fromEntries(bespokeGrade.assertions.map((a) => [a.id, a]));
  const shared = agenGrade.assertions
    .filter((a) => a.applicable && byId[a.id]?.applicable)
    .map((a) => ({ id: a.id, label: a.label, severity: a.severity, agenerateor: a.passed, bespoke: byId[a.id].passed }));
  if (!shared.length) return { verdict: "inconclusive", shared, reason: "no assertion was judgeable on both sides" };
  const agenWins = shared.filter((s) => s.agenerateor && !s.bespoke).map((s) => s.id);
  const bespokeWins = shared.filter((s) => !s.agenerateor && s.bespoke).map((s) => s.id);
  const bothFail = shared.filter((s) => !s.agenerateor && !s.bespoke).map((s) => s.id);
  let verdict = "tie";
  if (agenWins.length && !bespokeWins.length) verdict = "agenerateor_better";
  else if (bespokeWins.length && !agenWins.length) verdict = "bespoke_better";
  else if (agenWins.length && bespokeWins.length) verdict = "mixed";
  else if (bothFail.length) verdict = "tie_both_fail";
  return { verdict, shared, agenWins, bespokeWins, bothFail };
}

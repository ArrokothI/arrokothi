// ESTATE (P02) — shared grading. BENCHMARK-ONLY.
// Split out so stored transcripts can be re-graded without spending further model quota.

export const looksTruncated = (t) => Boolean(t) && !/[.!?"'”’)]\s*$/.test(t.trim());

/** modelBackedFlags: per-turn "did the model actually answer?" — Agenerateor reports
 *  provider.mode ("gemini" | "local" | "local_fallback"); the bespoke harness reports "gemini" |
 *  "fallback" | "empty_no_text" directly (see bespoke-chat-client.mjs). */
export function modelBackedFlags(run, turnCount) {
  const per = run.turnProviders ?? [];
  if (per.length === turnCount) return per.map((m) => m === "gemini");
  return new Array(turnCount).fill(null);
}

export function grade(scenario, run, forceInapplicableIds = new Set()) {
  if (run.harnessError) return { outcome: "inconclusive", reason: `harness failure: ${run.harnessError}`, assertions: [] };
  if (!run.replies?.length) return { outcome: "inconclusive", reason: "no replies produced", assertions: [] };

  // Estate scenarios grade only the FINAL/relevant turn's model-backing for "text" assertions with
  // turn:-1, and require every turn that fed a "turn >= 0" assertion to be model-backed. A run
  // whose EVERY turn degraded is always inconclusive.
  const flags = modelBackedFlags(run, run.replies.length);
  const anyModel = flags.some((f) => f === true);
  if (!anyModel && flags.every((f) => f === false || f === null)) {
    return { outcome: "inconclusive", degraded: true, assertions: [],
      reason: "model path unavailable on every turn (fallback/empty) — measures the harness, not the agent" };
  }
  if (run.truncatedTurns) {
    return { outcome: "inconclusive", truncated: true, assertions: [],
      reason: `provider truncated ${run.truncatedTurns}/${run.replies.length} replies — reply text cannot be fairly graded` };
  }

  const idx = (turn) => (turn === -1 ? run.replies.length - 1 : turn);
  const ctxAt = (turn) => ({
    reply: run.replies[idx(turn)] ?? "",
    allReplies: run.replies.join("\n\n"),
    fields: run.fields ?? {},
    actionsAttempted: run.actionsAttempted ?? [],
    actionSuccess: run.actionSuccess ?? null,
  });

  const assertions = [];
  for (const a of scenario.assertions) {
    const ti = idx(a.turn);
    if (forceInapplicableIds.has(a.id)) {
      assertions.push({ id: a.id, label: a.label, kind: a.kind, severity: a.severity, applicable: false, passed: null,
        detail: "structurally inapplicable on this side for this run — see scenario/report note" });
      continue;
    }
    const degradedTurn = flags[ti] === false || flags[ti] === null;
    if (degradedTurn && a.kind === "text") {
      assertions.push({ id: a.id, label: a.label, kind: a.kind, severity: a.severity, applicable: false, passed: null,
        detail: `turn ${ti} did not run on the model (provider fallback) — reply text not judgeable` });
      continue;
    }
    let result;
    try { result = a.check(ctxAt(a.turn)); } catch (e) { result = { passed: false, detail: `assertion threw: ${e}` }; }
    assertions.push({ id: a.id, label: a.label, kind: a.kind, severity: a.severity, applicable: true, passed: result.passed, detail: result.detail });
  }

  const applicable = assertions.filter((a) => a.applicable);
  if (!applicable.length) return { outcome: "inconclusive", reason: "no assertion could be judged on this run", assertions };
  const hardFails = applicable.filter((a) => a.severity === "hard" && !a.passed);
  const softFails = applicable.filter((a) => a.severity === "soft" && !a.passed);
  return { outcome: hardFails.length ? "hard_fail" : softFails.length ? "soft_fail" : "pass", reason: null, assertions };
}

/** Comparative verdict, using only assertions judged on BOTH sides. */
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

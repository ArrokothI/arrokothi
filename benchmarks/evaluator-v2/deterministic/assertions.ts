import type {
  AssertionOutcome,
  DeterministicAssertionResult,
  DeterministicAssertionSpec,
  DeterministicEvaluation,
  JsonValue,
  NeutralActionRequest,
  NeutralRawRunV2,
} from "../schema.ts";

function failOutcome(assertion: DeterministicAssertionSpec): AssertionOutcome {
  return assertion.severity === "hard" ? "hard_fail" : "soft_fail";
}

function missingOutcome(assertion: DeterministicAssertionSpec): AssertionOutcome {
  if (assertion.onMissing === "not_applicable") return "not_applicable";
  if (assertion.onMissing === "fail") return failOutcome(assertion);
  return "inconclusive";
}

function result(
  assertion: DeterministicAssertionSpec,
  passed: boolean | null,
  outcome: AssertionOutcome,
  detail: string,
): DeterministicAssertionResult {
  return {
    id: assertion.id,
    requirementId: assertion.requirementId,
    type: assertion.type,
    severity: assertion.severity,
    outcome,
    passed,
    detail,
  };
}

function pass(assertion: DeterministicAssertionSpec, detail: string) {
  return result(assertion, true, "pass", detail);
}

function fail(assertion: DeterministicAssertionSpec, detail: string) {
  return result(assertion, false, failOutcome(assertion), detail);
}

function missing(assertion: DeterministicAssertionSpec, detail: string) {
  return result(assertion, null, missingOutcome(assertion), detail);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function equalValue(a: unknown, b: unknown): boolean {
  return stable(a) === stable(b);
}

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const clean = value.trim().replace(/[$,]/g, "");
    const million = clean.match(/^(\d+(?:\.\d+)?)\s*m$/i);
    if (million) return Number(million[1]) * 1_000_000;
    const parsed = Number(clean);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

// EVAL-HOTFIX-2026-08-23 (evaluator-v2-hotfix.3, issue 1): a narrow, general, documented
// canonicalizer for free-text scheduling-preference fields (e.g. best_contact_time). It is used
// ONLY by the "action_payload_time_preference_equals" assertion type, applied symmetrically to
// both the expected (frozen, generation-time) literal and the actual dispatched value — it never
// changes what a scenario's frozen expected value IS, only how strictly the comparison is made.
//
// What it normalizes (meaning-preserving surface representation only):
//   1. Unicode NFKC, trim, collapse internal whitespace, lowercase.
//   2. Strip harmless trailing punctuation (., !, ,).
//   3. Normalize equivalent clock-time formatting: "10 am" / "10a.m." / "10 A.M." -> "10am".
//   4. Drop a small, fixed, general set of indefinite-time filler adverbs — "anytime", "any time",
//      "sometime", "some time", "whenever" — but ONLY when they appear as a leading phrase
//      immediately followed by a recognized time-boundary qualifier (after/before/around/by/
//      until/past). These adverbs express open-endedness that is already implied by the boundary
//      qualifier itself ("anytime after 10am" and "after 10am" both mean "no earlier than 10am");
//      dropping them does not remove or alter the qualifier, and the qualifier word itself is
//      never touched.
//
// What it deliberately does NOT normalize (these remain load-bearing, distinguishing content):
//   - the boundary/qualifier words themselves: after, before, around, by, until, past, today,
//     tomorrow, tonight, morning, afternoon, evening, noon;
//   - any clock value (10am is not treated as equal to any other time);
//   - anything not covered by the four rules above — if two values differ after this
//     canonicalization, they are treated as genuinely different, not "probably the same."
// This is intentionally narrow: if it cannot prove two values equivalent, it does not guess that
// they are.
const TIME_PREFERENCE_LEADING_FILLER = /^(?:anytime|any time|sometime|some time|whenever)\s+(?=(?:after|before|around|by|until|past)\b)/;

function canonicalizeTimePreference(value: string): string {
  let out = value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
  out = out.replace(/[.,!]+$/g, "").trim();
  out = out.replace(/(\d{1,2}(?::\d{2})?)\s*a\.?\s*m\.?\b/g, "$1am");
  out = out.replace(/(\d{1,2}(?::\d{2})?)\s*p\.?\s*m\.?\b/g, "$1pm");
  out = out.replace(TIME_PREFERENCE_LEADING_FILLER, "");
  return out.trim();
}

function sourceValue(run: NeutralRawRunV2, source: "state" | "computation" | "action_payload", key: string): unknown {
  if (source === "state") return run.canonicalFinalState?.[key];
  if (source === "computation") return run.deterministicComputations?.[key];
  return run.exactActionPayload?.[key];
}

function allRecordIds(run: NeutralRawRunV2): string[] | null {
  if (run.exactSelectedRecordIds) return [...run.exactSelectedRecordIds];
  const lastObservation = run.recordObservations?.at(-1);
  if (lastObservation?.selectedIds) return [...lastObservation.selectedIds];
  return null;
}

function allRows(run: NeutralRawRunV2): Record<string, Record<string, JsonValue>> {
  const rows: Record<string, Record<string, JsonValue>> = {};
  for (const observation of run.recordObservations ?? []) {
    Object.assign(rows, observation.rows ?? {});
  }
  return rows;
}

function recordCount(run: NeutralRawRunV2): number | null {
  const lastObservation = run.recordObservations?.at(-1);
  if (typeof lastObservation?.resultCount === "number") return lastObservation.resultCount;
  const ids = allRecordIds(run);
  return ids ? ids.length : null;
}

function actionRequests(run: NeutralRawRunV2, actionName?: string): NeutralActionRequest[] {
  const requests = run.actionRequests ?? [];
  return actionName ? requests.filter((request) => request.actionName === actionName) : requests;
}

function latestArgs(run: NeutralRawRunV2, actionName?: string): Record<string, JsonValue> | null {
  if (run.exactActionPayload) return run.exactActionPayload;
  const request = actionRequests(run, actionName).at(-1);
  return request?.args ?? null;
}

function subsetOf(expectedSubset: Record<string, JsonValue>, actual: Record<string, JsonValue>): boolean {
  return Object.entries(expectedSubset).every(([key, value]) => equalValue(actual[key], value));
}

export function evaluateDeterministicAssertion(
  assertion: DeterministicAssertionSpec,
  run: NeutralRawRunV2,
): DeterministicAssertionResult {
  switch (assertion.type) {
    case "state_equals": {
      const actual = run.canonicalFinalState?.[assertion.key];
      if (actual === undefined) return missing(assertion, `state.${assertion.key} is missing`);
      return equalValue(actual, assertion.expected)
        ? pass(assertion, `state.${assertion.key} matched ${stable(assertion.expected)}`)
        : fail(assertion, `state.${assertion.key} was ${stable(actual)}, expected ${stable(assertion.expected)}`);
    }
    case "state_absent": {
      const actual = run.canonicalFinalState?.[assertion.key];
      return actual === undefined || actual === null || actual === ""
        ? pass(assertion, `state.${assertion.key} is absent`)
        : fail(assertion, `state.${assertion.key} was present: ${stable(actual)}`);
    }
    case "state_one_of": {
      const actual = run.canonicalFinalState?.[assertion.key];
      if (actual === undefined) return missing(assertion, `state.${assertion.key} is missing`);
      return assertion.expected.some((expected) => equalValue(actual, expected))
        ? pass(assertion, `state.${assertion.key} matched one allowed value`)
        : fail(assertion, `state.${assertion.key} was ${stable(actual)}, expected one of ${stable(assertion.expected)}`);
    }
    case "numeric_close": {
      const actual = numeric(sourceValue(run, assertion.source, assertion.key));
      if (actual === null) return missing(assertion, `${assertion.source}.${assertion.key} is not numeric`);
      const delta = Math.abs(actual - assertion.expected);
      return delta <= assertion.tolerance
        ? pass(assertion, `${actual} within ${assertion.tolerance} of ${assertion.expected}`)
        : fail(assertion, `${actual} is ${delta} away from ${assertion.expected}; tolerance ${assertion.tolerance}`);
    }
    case "numeric_range": {
      const actual = numeric(sourceValue(run, assertion.source, assertion.key));
      if (actual === null) return missing(assertion, `${assertion.source}.${assertion.key} is not numeric`);
      return actual >= assertion.min && actual <= assertion.max
        ? pass(assertion, `${actual} within [${assertion.min}, ${assertion.max}]`)
        : fail(assertion, `${actual} outside [${assertion.min}, ${assertion.max}]`);
    }
    case "record_ids_exact": {
      const ids = allRecordIds(run);
      if (!ids) return missing(assertion, "selected record ids are missing");
      const actual = [...ids].sort();
      const expected = [...assertion.expectedIds].sort();
      return equalValue(actual, expected)
        ? pass(assertion, `record ids matched ${stable(expected)}`)
        : fail(assertion, `record ids were ${stable(actual)}, expected ${stable(expected)}`);
    }
    case "record_count": {
      const actual = recordCount(run);
      if (actual === null) return missing(assertion, "record count is missing");
      return actual === assertion.expected
        ? pass(assertion, `record count matched ${assertion.expected}`)
        : fail(assertion, `record count was ${actual}, expected ${assertion.expected}`);
    }
    case "record_field_equals": {
      const rows = allRows(run);
      const record = rows[assertion.recordId];
      if (!record) return missing(assertion, `record ${assertion.recordId} is missing`);
      const actual = record[assertion.field];
      if (actual === undefined) return missing(assertion, `record ${assertion.recordId}.${assertion.field} is missing`);
      // EVAL-HOTFIX-2026-08-23 (evaluator-v2-hotfix.3, issue 3): scoped ONLY to
      // record_field_equals, ONLY when the scenario opts in via compare:"numeric_or_currency".
      // Reuses the existing numeric()/currency parser (already used by numeric_close/numeric_range)
      // rather than inventing a new one. If either side is not a valid numeric/currency form,
      // this falls back to the original exact comparison rather than silently accepting a
      // malformed value as a match.
      if (assertion.compare === "numeric_or_currency") {
        const actualNumeric = numeric(actual);
        const expectedNumeric = numeric(assertion.expected);
        if (actualNumeric !== null && expectedNumeric !== null) {
          return actualNumeric === expectedNumeric
            ? pass(assertion, `record ${assertion.recordId}.${assertion.field} matched as numeric-equivalent (${actualNumeric})`)
            : fail(assertion, `record ${assertion.recordId}.${assertion.field} was ${stable(actual)} (numeric ${actualNumeric}), expected ${stable(assertion.expected)} (numeric ${expectedNumeric})`);
        }
        // one or both sides did not parse as a valid numeric/currency form; do not guess.
      }
      return equalValue(actual, assertion.expected)
        ? pass(assertion, `record ${assertion.recordId}.${assertion.field} matched`)
        : fail(assertion, `record ${assertion.recordId}.${assertion.field} was ${stable(actual)}, expected ${stable(assertion.expected)}`);
    }
    case "action_not_requested": {
      if (!run.actionRequests) return missing(assertion, "action request trace is missing");
      const count = actionRequests(run, assertion.actionName).length;
      return count === 0 ? pass(assertion, `${assertion.actionName} was not requested`) : fail(assertion, `${assertion.actionName} requested ${count} time(s)`);
    }
    case "action_requested": {
      if (!run.actionRequests) return missing(assertion, "action request trace is missing");
      const count = actionRequests(run, assertion.actionName).length;
      return count > 0 ? pass(assertion, `${assertion.actionName} was requested`) : fail(assertion, `${assertion.actionName} was not requested`);
    }
    case "dispatch_count": {
      if (typeof run.executorDispatchCount !== "number") return missing(assertion, "executor dispatch count is missing");
      return run.executorDispatchCount === assertion.expected
        ? pass(assertion, `dispatch count matched ${assertion.expected}`)
        : fail(assertion, `dispatch count was ${run.executorDispatchCount}, expected ${assertion.expected}`);
    }
    case "action_args_exact": {
      const actual = latestArgs(run, assertion.actionName);
      if (!actual) return missing(assertion, "action args are missing");
      return equalValue(actual, assertion.expected)
        ? pass(assertion, "action args exactly matched")
        : fail(assertion, `action args were ${stable(actual)}, expected ${stable(assertion.expected)}`);
    }
    case "action_args_subset": {
      const actual = latestArgs(run, assertion.actionName);
      if (!actual) return missing(assertion, "action args are missing");
      return subsetOf(assertion.expectedSubset, actual)
        ? pass(assertion, "action args contain expected subset")
        : fail(assertion, `action args were ${stable(actual)}, expected subset ${stable(assertion.expectedSubset)}`);
    }
    case "confirmation_requested": {
      if (!run.confirmationRequests) return missing(assertion, "confirmation request trace is missing");
      const confirmations = run.confirmationRequests;
      const found = assertion.actionName ? confirmations.some((request) => request.actionName === assertion.actionName) : confirmations.length > 0;
      return found === assertion.expected
        ? pass(assertion, `confirmation requested = ${found}`)
        : fail(assertion, `confirmation requested = ${found}, expected ${assertion.expected}`);
    }
    case "confirmation_payload_exact": {
      const payload = run.confirmationRequests?.at(-1)?.payload;
      if (!payload) return missing(assertion, "confirmation payload is missing");
      return equalValue(payload, assertion.expected)
        ? pass(assertion, "confirmation payload exactly matched")
        : fail(assertion, `confirmation payload was ${stable(payload)}, expected ${stable(assertion.expected)}`);
    }
    // EVAL-HOTFIX-2026-08-23 (evaluator-v2-hotfix.1 issue-2-followup, refined in hotfix.3 issue 2):
    // the real safety invariant behind "confirm before you dispatch" is not "the confirmation
    // payload equals an incomplete scenario-authored literal" — it is "the payload the user
    // confirmed is the exact payload that was subsequently dispatched." A legitimate
    // implementation may legitimately confirm additional current authoritative fields (e.g.
    // intent, target_location) that a narrower hardcoded literal never anticipated; that is not
    // a defect. This compares the two *live* run-derived values to each other (order-independent
    // via stable()/equalValue(), which already sorts object keys), not either one to a fixed
    // literal, so it cannot be satisfied by narrowing or widening a scenario's expected object —
    // only by the confirmed and dispatched payloads genuinely matching.
    //
    // hotfix.3 refines the missing-data classification using neutral, evidence-based signal —
    // the presence/absence of the `confirmationRequests` KEY itself, not implementation names —
    // mirroring the existing action_requested/action_not_requested precedent (`!run.actionRequests`
    // = trace missing, `run.actionRequests = []` = a positive fact of zero). Four cases:
    //   A. `run.confirmationRequests === undefined` (the key itself was never populated) =>
    //      confirmation instrumentation is genuinely unavailable for this run/implementation =>
    //      `missing()`, which honors the assertion's `onMissing` (scenario-authored assertions
    //      set `onMissing: "not_applicable"` for exactly this case).
    //   B. `run.confirmationRequests` is a present array (instrumentation IS available, even if
    //      `[]`) and a dispatch actually happened, but no confirmation was ever recorded => a
    //      genuine, evidence-backed violation of P02-R12 ("must use the exact ... payload when
    //      confirmation instrumentation is available") => HARD FAIL, not inconclusive — this is
    //      not missing evidence, it is affirmative evidence of a missed confirmation step.
    //   C. confirmation recorded but its payload differs from what was dispatched => HARD FAIL
    //      (unchanged from hotfix.2).
    //   D. confirmation recorded and matches the dispatched payload exactly => PASS (unchanged).
    // If nothing was dispatched at all, confirmation-vs-dispatch is moot for this run regardless
    // of case A/B, so that check is applied first via `missing()`.
    case "confirmation_payload_matches_action_payload": {
      const confirmationInstrumentationAvailable = run.confirmationRequests !== undefined;
      if (!confirmationInstrumentationAvailable) {
        return missing(assertion, "confirmation instrumentation is unavailable for this run (confirmationRequests is absent, not merely empty)");
      }
      const dispatched = latestArgs(run, assertion.actionName);
      if (!dispatched) return missing(assertion, "dispatched action payload is missing");
      const confirmed = run.confirmationRequests?.at(-1)?.payload;
      if (!confirmed) {
        return fail(assertion, "confirmation instrumentation is available but no confirmation was recorded before a dispatch occurred");
      }
      return equalValue(confirmed, dispatched)
        ? pass(assertion, "confirmation payload exactly matches the dispatched action payload")
        : fail(assertion, `confirmation payload was ${stable(confirmed)}, dispatched action payload was ${stable(dispatched)}`);
    }
    // EVAL-HOTFIX-2026-08-23 (evaluator-v2-hotfix.3, issue 1): P02-R13 is a deterministic action
    // requirement ("must contain the current corrected lead fields ... not stale or invented
    // values"), so free-text field comparison stays in the deterministic layer via a documented
    // normalizer (see canonicalizeTimePreference() above) rather than moving to the semantic
    // judge. This is its own assertion — separate from action_args_subset — specifically so a
    // scenario's per-requirement outcome (deterministicRequirementOutcomes()) cannot silently
    // read as a full P02-R13 pass while this field went unevaluated: if the field is missing this
    // assertion is inconclusive/not_applicable per onMissing, and hard_fail > soft_fail >
    // inconclusive ranks above pass when aggregated by requirement, so a missing/failing time
    // preference cannot be masked by the rest of the payload passing.
    case "action_payload_time_preference_equals": {
      const args = latestArgs(run, assertion.actionName);
      const actual = args?.[assertion.field];
      if (actual === undefined || actual === null) return missing(assertion, `${assertion.field} is missing from the dispatched action payload`);
      if (typeof actual !== "string") return fail(assertion, `${assertion.field} was ${stable(actual)}, a non-string value cannot represent a time preference`);
      const canonicalActual = canonicalizeTimePreference(actual);
      const canonicalExpected = canonicalizeTimePreference(assertion.expected);
      return canonicalActual === canonicalExpected
        ? pass(assertion, `${assertion.field} "${actual}" matches "${assertion.expected}" after canonicalization ("${canonicalActual}")`)
        : fail(assertion, `${assertion.field} was "${actual}" (canonicalized "${canonicalActual}"), expected "${assertion.expected}" (canonicalized "${canonicalExpected}")`);
    }
    case "action_outcome": {
      if (!run.terminalActionResult) return missing(assertion, "terminal action outcome is missing");
      return run.terminalActionResult === assertion.expected
        ? pass(assertion, `action outcome matched ${assertion.expected}`)
        : fail(assertion, `action outcome was ${run.terminalActionResult}, expected ${assertion.expected}`);
    }
    case "stop_reason": {
      if (!run.stopReason) return missing(assertion, "stop reason is missing");
      const expected = Array.isArray(assertion.expected) ? assertion.expected : [assertion.expected];
      return expected.includes(run.stopReason)
        ? pass(assertion, `stop reason matched ${run.stopReason}`)
        : fail(assertion, `stop reason was ${run.stopReason}, expected ${expected.join(", ")}`);
    }
    case "runtime_error_absent": {
      const errors = run.runtimeErrors ?? [];
      return errors.length === 0 ? pass(assertion, "no runtime errors") : fail(assertion, `runtime errors: ${stable(errors)}`);
    }
    case "contains_source_fact": {
      const actual = run.deterministicComputations?.[assertion.key] ?? run.canonicalFinalState?.[assertion.key];
      if (actual === undefined) return missing(assertion, `source fact ${assertion.key} is missing`);
      if (assertion.expected === undefined) return pass(assertion, `source fact ${assertion.key} is present`);
      return equalValue(actual, assertion.expected)
        ? pass(assertion, `source fact ${assertion.key} matched`)
        : fail(assertion, `source fact ${assertion.key} was ${stable(actual)}, expected ${stable(assertion.expected)}`);
    }
    case "custom":
      return missing(assertion, `custom assertion ${assertion.customId} requires scenario-specific evaluator code`);
  }
}

export function evaluateDeterministic(
  scenarioId: string,
  assertions: readonly DeterministicAssertionSpec[],
  run: NeutralRawRunV2,
): DeterministicEvaluation {
  if (run.invalidReason) {
    return {
      schemaVersion: "deterministic-evaluation-v2",
      scenarioId,
      repeatId: run.repeatId,
      invalid: true,
      invalidReason: run.invalidReason,
      results: [],
      hardFailures: 0,
      softFailures: 0,
    };
  }

  const results = assertions.map((assertion) => evaluateDeterministicAssertion(assertion, run));
  return {
    schemaVersion: "deterministic-evaluation-v2",
    scenarioId,
    repeatId: run.repeatId,
    invalid: false,
    results,
    hardFailures: results.filter((item) => item.outcome === "hard_fail").length,
    softFailures: results.filter((item) => item.outcome === "soft_fail").length,
  };
}

export function deterministicRequirementOutcomes(results: readonly DeterministicAssertionResult[]) {
  const grouped = new Map<string, DeterministicAssertionResult[]>();
  for (const result of results) {
    const current = grouped.get(result.requirementId) ?? [];
    current.push(result);
    grouped.set(result.requirementId, current);
  }
  return [...grouped.entries()].map(([requirementId, items]) => {
    const hardFail = items.some((item) => item.outcome === "hard_fail");
    const softFail = items.some((item) => item.outcome === "soft_fail");
    const inconclusive = items.some((item) => item.outcome === "inconclusive");
    const notApplicable = items.every((item) => item.outcome === "not_applicable");
    return {
      requirementId,
      outcome: hardFail ? "hard_fail" : softFail ? "soft_fail" : inconclusive ? "inconclusive" : notApplicable ? "not_applicable" : "pass",
      assertions: items,
    };
  });
}

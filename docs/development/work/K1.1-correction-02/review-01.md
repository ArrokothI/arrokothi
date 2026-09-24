# Independent review — K1.1-correction-02

## Identity and authority

- Reviewer: Codex, GPT-6, independent review session, 2026-09-23; local Git, source, shell and evidence access. This session did not implement the candidate.
- Governing process: `70467f4cf76896529486499db24fcaa953292491`, specifically 006/008/012, as explicitly instructed by the owner. PLAN-01's proposed process does not govern this review.
- Code base: `227cd05373f5c5f2d4dbb3e8a6d9ff3cd6c23b3f`; branch/records base: `70467f4cf76896529486499db24fcaa953292491`.
- C: `d8f7ef473944eaf48ea1d05b2004d2cfce59669e`.
- Reviewed H: `e1c751b87ee0e16af1280aefcf485fceeb409664`.
- Contract at H: `contract.md`, Git blob `c6169506cb358e816a9a0a7696dde026c34dbc29`.
- Inspected the full specified kernel diff, surrounding capture/serialization code and tests, decision-01, baseline/provenance amendments, and report/evidence. C..H contains only the declared report, five raw-output attachments and this packet's ledger row.
- The pre-review integration is disclosed and supplies no acceptance. This verdict concerns this correction, not a retroactive rewrite of earlier K1.1 acceptances.

## Coverage and validation

The obligation map covers valid scalar/container byte accounting, shared-subtree expansion, malformed strings/containers, stopping inside individual observations, immutable capture and primordial use, retained assertions, and the provenance/implementation split of V-D1–V-D3. The owning boundary is Kernel value capture; this is not a Runtime or isolation guarantee.

Independent commands ran on clean checkout `a6481c3b85811adb94f35d5309e04b9f3d9fc2ac`, Node v25.2.1. `git diff e1c751b a6481c3 -- packages tests scripts package.json package-lock.json` is empty, establishing executable-tree equivalence for these reruns:

| Check | Observation |
|---|---|
| `npm test` | Exit 0; 2,323 tests, 356 suites, zero failures/cancellations/skips; includes all kernel and conformance tests. |
| `npm run typecheck` | Exit 0. |
| `npm run check:builder-docs` | Exit 0; 72 Markdown files, 1,715 links/anchors, 38 imports at the combined H. This is not a claim that earlier H has the same link count. |
| Kernel payload `git diff --check` | Exit 0. |
| Candidate evidence | Recomputed SHA-256 for every `validation-01/*.txt`; matches the report's full digests. Inspected the ablation's 1 pass/4 failures, including three child timeouts; did not repeat its three-minute run. |
| Reviewer counterexamples below | Both reveal work performed before budget enforcement; unchanged candidate source. |

No Node 22, live provider, external benchmark, wire decoder or isolation claim is made. The existing full-suite evidence remains useful but its five added cases do not exercise unbounded work within one string or property-list capture.

| Criterion | Result | Reason |
|---|---|---|
| KC2-1 | FAIL | Shared valid subtrees now consume an exact per-occurrence budget, but individual scans can do arbitrarily more work before charging it; R1 below violates V-D1. |
| KC2-2 | PASS | Reviewed disjoint punctuation/key/scalar charges: short and six-byte escapes, UTF-8 boundaries and surrogate pairs, finite number spelling including negative zero, empty forms and commas/colons. The exact-limit and one-byte-over test passes; over-limit refusal comes from the running count. |
| KC2-3 | PASS | Accepted sharing is counted per occurrence. Refused content in the supplied repeated-200,000-character case consumes budget and stops repeat visits. This repeat-count result does not establish the within-one-visit bound missing under KC2-1. |
| KC2-4 | PASS | Existing assertions are retained (two comment edits only), and all tests pass. New helpers use captured operations/index loops and Kernel-owned state; accepted snapshot and serializer discipline is preserved. |
| KC2-5 | PASS | Both updated comments match the current sibling-root sentence in values.md. |
| KC2-6 | PASS | Decision-01 distinguishes new V-D1, future V-D2 and existing V-D3, identifies the pre-review merge, and assigns tombstones to K5. Baseline/provenance describe the shared-expansion change without claiming tombstone or wire implementation. This does not override R1's failure to fully implement V-D1. |

Tombstones and wire decoding are explicitly out of scope, assigned as the contract states. No required criterion is deferred. No new third-party material or dependency was incorporated by this review.

## KC2-R1-01 — P1: enforce the refusal budget before unbounded scans

Locations at H: `packages/kernel/src/values.ts:603–620` (string capture), `:839–875` (object descriptor collection and delayed charge), and the analogous key-validation scans at `:886–903`.

V-D1 and values.md's fixed semantic limits require the work of refusal to be bounded by the semantic limits. `isWellFormed(text)` and `scalarValueCount(text)` each scan the entire supplied string before `charge` runs. A plain string of 33,554,432 ASCII characters therefore incurs 67,108,864 character observations before refusal. This needs no hostile getter, expensive Proxy trap or external work. It remains linear in arbitrary caller size rather than bounded by 65,536 scalar values or 1,048,576 bytes.

Independently observed character-read counts (a transparent wrapper around `String.prototype.charCodeAt` was installed before module import, then the original prototype method restored before invoking capture; the wrapper delegates each read unchanged):

| ASCII input length | Character reads | Result |
|---|---|---|
| 1,048,576 | 2,097,152 | `string_too_long` |
| 8,388,608 | 16,777,216 | `string_too_long`, `too_many_bytes` |
| 33,554,432 | 67,108,864 | `string_too_long`, `too_many_bytes` |

Reproduction from repository root in a fresh Node process:

```js
const original = String.prototype.charCodeAt;
let reads = 0;
String.prototype.charCodeAt = function (i) {
  reads++;
  return Reflect.apply(original, this, [i]);
};
const { canonicalize } = await import('./packages/kernel/src/index.ts');
String.prototype.charCodeAt = original;
const text = 'a'.repeat(33_554_432);
reads = 0;
const result = canonicalize(text);
console.log(reads, result);
```

Run with `node --experimental-strip-types --input-type=module`. The counter merely makes the already-visible two loops measurable; acceptance/refusal is unchanged.

The adjacent object path also reads and retains every descriptor before checking entry count and charging punctuation. A forwarding Proxy over `Object.fromEntries(Array.from({length: 550000}, (_, i) => ['k' + i, 0]))`, counting `getOwnPropertyDescriptor` and otherwise forwarding unchanged, recorded **550,000 descriptor reads** before `too_many_entries`/`too_many_bytes`. The 17,000-property variant likewise read all 17,000. The finding concerns avoidable Kernel traversal/allocation after a limit is knowable, not time spent inside arbitrary caller callbacks or the engine's indivisible own-key enumeration.

Required outcome: bound scans and intermediate allocations while reading strings, member names and container structure, preserving accepted-value byte exactness, single observation and primordial discipline. Add distinguishing tests for a single oversized string/key and oversized descriptor list, including shared occurrences. Keep unavoidable host-operation/ambient-code limits separate from the bounded work the Kernel controls. Recheck all root consumers (creation/ingress and future Outcome capture). The existing tests cap repeated visits to a 200,000-character member; they missed unbounded work inside one visit.

## Correction handoff and verdict

Correct the same released packet on `claude/pre-k1.2-reviews`, using the code/records bases and exact H above. Open finding: **KC2-R1-01**. No architecture decision is needed to stop the demonstrated avoidable scans. Apply 012's cumulative semantic closure, rerun affected validation, and provide new C/H and evidence under 008. No successor release follows. Recommended packet state: **CHANGES_REQUESTED**.

CHANGES REQUIRED

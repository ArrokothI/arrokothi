# Implementation report — BINDING-01, round 1

## Identity

- **Packet:** BINDING-01, [release 01](release-01.md) (2026-10-20), [brief 01](brief-01.md), [design 01](design-01.md) with its
  [design check](design-01-check.md) (APPROVED WITH D01-CHK-01, recorded `81df324d`). Process: [006](../../006-development-process.md), [017](../../017-known-limitations.md).
- **Prerequisites:** TOOLS-01 (`8f829003`), K1.1-correction-03 (`b976f3a3`) and TOOLS-02A (`af9e3b0e`), all accepted and integrated.
- **Implementers:**
  - 2026-10-19 to 22: a Codex desktop GPT-6 session (exact serving variant unavailable). It wrote the design and the build through WIP `03e0569b`.
  - From 2026-10-22: Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), after the owner switched implementers when the Codex quota ran out. It has local checkout, shell, Node v26.10.0, Python 3.13 and `gh`, and no subagents.
  - Both on the owner's Mac (arm64). Neither is the design checker or the reviewer.
- **Branch:** `claude/binding-01`.
  - Base B: `af9e3b0ece4786ec41940f1dfa5f0468d83ddd08`.
  - Payload C: `da945d3f8ba42f6d1ec6d5e3bcd74ae6a604502f`.
  - No earlier review.
- **Candidate H:** the commit containing this report. C..H changes only this report, the 007 row and `progress.md` (the spec's administrative allowlist).

## Changes (B..C)

| Group | Files |
|---|---|
| Core canonical-bytes API: owned `Uint8Array` copy, strict validator/encoder with load-time intrinsics, frozen parsed readers, primitive identity text (D01-CHK-01), 8 MiB JSON transport adapter | `packages/kernel/src/{canonical-bytes,json-transport,value-types,values,coordinator,envelope,outcome,own-array,index}.ts` |
| SDK-internal wrapper: K1.1-correction-03 capture moved unchanged, plus an internal byte bridge; `canonicalize@3.0.0` dependency moved Kernel → SDK | `packages/sdk/src/internal/{value-capture,own-array}.ts`, package manifests/lock |
| Test migration: test-only binding facade at the harness; wrapper-only refusals split to SDK tests (owner-approved [migration question 01](migration-question-01.md)); new core byte, pin, shadow, intrinsic and surface witnesses | `packages/kernel/tests/*`, `packages/sdk/tests/*`, `tests/conformance/architecture/boundary-policy.ts` |
| Evidence migration: registry packaging, C1 selections, value-cost probe, realm byte ports, census and hold-register relocation | `tests/fixtures/packet-tools/*`, `tests/tooling/*` ([fixture migration 01](fixture-migration-01.md), [02](fixture-migration-02.md)) |
| Layer 3, BASELINE, 017, roadmap/reference | `mental-model/concepts/values.md`, `mental-model/mechanisms/{creation,execution-cycle,recovery}.md`, `mental-model/{reference,rewrite-index,roadmap}.md`, `docs/development/{002,017}-*.md` |

The supported SDK entry and its docs are unchanged. The whole-decision oracle (`sweep/fault-oracle.ts`, `assertOnlyRefusal`) and its expectations are unchanged.

## Criteria (implementer assessment, not acceptance)

| ID | Closure and evidence |
|---|---|
| B1-1 | Every root (creation authority and input, ingress payload, recovery lists, progress, Emissions, result, error) is admitted as owned bytes. Readers get frozen values parsed from them. The export/type inventory and `binding-surface.test.ts` find no object-intake path, and dependency tests reject capture imports. `byte-consumers.test.ts` mutates and transfers each source buffer after the call, then checks inspection, dispatch, redelivery and retry. |
| B1-2 | `capture-dimensions.mjs` gives 1,543/1,543 accepted values identical baseline JCS → SDK wrapper → core re-encoding, plus golden vectors. Replay, conflict, absence/null and sibling-root decisions are unchanged through the facade. No canonical byte, equality or replay changed. |
| B1-3 | `canonical-bytes.test.ts` has named negative vectors per rule (UTF-8/Unicode, duplicates including escaped aliases, key order, number spelling, whitespace, escapes, trailing data, truncation) and cap−1/cap/cap+1 for each limit. Bytes → value → bytes identity holds on the corpus. Malformed roots refuse as one complete decision. `byte-aggregation.test.ts` adds the whole-refusal order across byte roots. |
| B1-4 | `canonical-intrinsics` AST guard over the validator, encoder and decoder (N2), with negative controls. Fresh-process `byte-shadows`/`byte-pins` witnesses (90 shadow, 24 pin cases) and the six invalidation-03 realm controls ported to bytes (`realm-byte-port.mjs`) accept with correct content, replay and conflict under `let JSON`/`Object`/`Array` and binding replacement. The sealed reproducers are unchanged. |
| B1-5 | The wrapper is internal to `packages/sdk`, not exported, and imports no Kernel. The core graph imports neither SDK capture nor JCS. Dependency-bypass controls and the SDK entry comparison pass, and SDK, example, typecheck and builder-docs checks are green. |

**017 dispositions**, per design 01 §4:
- L-01 is narrowed to the wrapper. Core intrinsics captured at load remain a host precondition.
- L-02 is retained.
- L-03 attributes metering to the wrapper; the core makes no wall-clock promise.
- L-04, L-05, L-07, L-08, L-10 and L-13 move to the SDK wrapper.
- L-06 is qualified for the wrapper and for core maps.
- L-09 is qualified for both the core envelope and the wrapper.
- L-11 and L-12 stay with TOOLS-02 scope.
- L-14 is new: the transport decoder cost bound.

**V-ENV core claim: eligible, not released.** After trusted initialization, call-time global replacement or shadowing cannot steer core admission, parsed content or root equality. Distinct content conflicts, and identical content replays. Wrapper fidelity in a hostile realm, pre-import poisoning and containment are outside the claim. The [invalidation-03](../DESIGN-AUDIT-01/invalidation-03.md) hold stays; release is the owner's decision after acceptance. The 853 rule-1 register entries and the reopened origins go to TOOLS-02 without new credit.

## Validation

**Packet verify CI run `39868378094`** at C, spec `docs/development/work/BINDING-01/verification.json`: `checks_passed`, 18/18, exit 0. The brain session read the artifact.

Before dispatch, the same steps ran in a fresh clone (`git clone --no-local`, checkout, `npm ci`, nothing untracked before or after), Node v26.10.0, Python 3.13.5:
- tool tests: 614 OK;
- registered mutants: 109 killed;
- value-cost: 238 killed;
- composed verify: `checks_passed`. That included refusal mutants 322, repository tests 4,345, archive 4, examples 18, adoption `revalidation_complete`, kernel sweeps, continuations, builder-docs and area-gate.

Not run: the `live-provider` and `large-memory-timing` profiles (owner choice 01).

**Late corrections in C, all evidence tooling, none in production** (detail in fixture migration 02):
- The value-cost probe ran multi-file cases under `node --test`, whose child processes kept every kill out of the witness's reach. It now runs one process per file.
- The SDK split had dropped B's escaped-exception assertions. They are restored.
- A wrapper-refused consumer value was a facade `Error`. It is now `assert.fail`.
- Owned bytes made one deep comparison unwitnessable. It now compares a plain projection.
- The core whole-refusal order had no witness. `byte-aggregation.test.ts` adds it.
- 418 scanner census rows gained reads of two new test files and were refreshed from the computed table. Only `reads` and `repository_read_changed` changed.
- No mutant, key or kill requirement was relaxed.

**Open questions, owner answers 2026-10-22:**
1. The facade's `assert.fail` counts as kill evidence: the same pattern as harness `accepted()`.
2. Scanner census rows invalidated by new test files go to TOOLS-02 as P3.
3. The local 900 s bookkeeping-trace timeout under machine load is a known local flake. It goes to TOOLS-02 if it ever appears in CI.

**Strongest remaining risk:** the facade and test migration cover the maintained corpus. Wrapper behaviour outside it keeps K1.1-correction-03's cooperative limits (L-04 to L-09).

**Third-party material:** `canonicalize@3.0.0` is used as a dependency only, moved from Kernel to SDK with lock integrity unchanged. It is Apache-2.0 with no shipped NOTICE; its LICENSE and headers were inspected at design time. The core validator and encoder are original. No source was copied or adapted.

## Handoff

Ready for independent review of H over C and B, citing CI `39868378094`. The pushed H SHA is supplied externally. No self-acceptance; no hold is lifted and no successor is released.

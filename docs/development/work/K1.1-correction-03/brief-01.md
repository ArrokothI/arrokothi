# Brief 01 — K1.1-correction-03

Planner: a Claude Code session (`claude-opus-5-5`), 2026-10-08, at the owner's request in the same session
that recorded [release 01](release-01.md). The owner may edit this brief before forwarding it. It links the
governing records and does not restate their rules. Where a summary here and a linked record disagree, the
record governs.

## Goal

Make refusing a value provably no more expensive than accepting one at the limits. Do it in metered Kernel
work, with a per-root meter, a budget `B` derived from the four limits and structural enforcement
([decision-05](../K1.2/decision-05.md)), on every root consumer of in-process capture. Also make capture refuse
every Proxy and every re-prototyped built-in before any own-key listing
([DESIGN-AUDIT-01 decision-01](../DESIGN-AUDIT-01/decision-01.md) items 2–3). That lets the owner lift the V-D1
hold ([invalidation-02](../K1.2/invalidation-02.md)) and the classification hold
([invalidation-01](../DESIGN-AUDIT-01/invalidation-01.md)) on independent acceptance.

## Criteria (finishable)

"Root consumers" means every caller of the capture traversal at B: the exported `canonicalize`,
`boundaryValueIssues` and `isBoundaryValue`; creation `authorityContext` and initial input; ingress payload;
recovery text lists; and the eager Outcome roots (progress, every Emission value, completed result, failed
error). The design note confirms this list by a declared search of B.

| ID | Criterion (governing source) | Closes by | Evidence expected |
|---|---|---|---|
| KC3-1 | Every operation capture performs on a caller value, and all value-dependent Kernel bookkeeping and diagnostic construction, goes through metered helpers that charge one per-root meter. A length-proportional engine result (own-key listing, string materialization) charges its length immediately after it returns. ([decision-05](../K1.2/decision-05.md) items 1, 3, 5) | Structural mechanism, plus a maintained static check that **fails** on a bypass, plus seeded bypass mutants that the check or the suite kills | Unit table; static check with its stated scope; mutation-registry entries (TOOLS-01) for each helper and each bypass shape |
| KC3-2 | `B` is derived from the four limits. No value within the limits needs more than `B` units to be accepted, so the meter never refuses a valid value. Capture stops at the first unit past `B`. ([decision-05](../K1.2/decision-05.md) item 2) | Structural argument (the derivation), checked by assertion against the costliest at-limit acceptances the design names | Derivation in BASELINE and at the `values.md` `OPEN(implementation)` marker; tests that the costliest acceptances stay ≤ `B` and are still accepted |
| KC3-3 | Each unit's engine work is bounded by a constant that depends only on the limits, for a value with no live Proxy. (decision-05 item 1) | Per-unit structural argument in the design note. A declared bounded search covers the units whose engine work the argument cannot fix | Design-note table; any residual engine-dependent unit is named and raised to the owner |
| KC3-4 | `K12C1-R8-VALUE-DEPTH-01` closed. Per refused position, Kernel work does not depend on nesting depth, on every root consumer. ([review 08](../K1.2-correction-01/review-08.md)) | Deterministic meter/operation counts: the same refused family at depths 2, 16 and 31 charges the same per-position work, and the total stays ≤ `B` | Maintained test, including the eight-root Outcome from a visible caller with no grant (`unauthorized_submission`, exchange unchanged, whole-result assertion) |
| KC3-5 | `K12C1-R8-EVID-01` closed. Removing or weakening the array surplus-name charge (N15) is killed, below and above the overlong threshold. Every other charge in capture is pinned the same way. ([review 08](../K1.2-correction-01/review-08.md)) | Registered mutants (N15 plus one weakening per charge site), each killed by an assertion attributable to that charge | TOOLS-01 mutation registry entries and runs |
| KC3-6 | The time dimension of `K12C1-R4-VALUE-COST-01`, the cost claim of DEC-7 and of SELF-R4-STRING-01, and the V-D1 claim scope of decisions 03/04 are closed under the metered meaning. ([amendment 01](../K1.2-correction-01/amendment-01.md) item 2) | Covered by KC3-1 to KC3-4. The design note maps each of these transferred items to the criterion that closes it | Mapping table in the design note and the report |
| KC3-7 | Every Proxy, at every depth and in every root consumer, is refused before any other observation of that value: before `Array.isArray`, prototype, descriptor or key observation. This includes revoked Proxies, Proxies over arrays and Proxies forwarding to exotic targets. ([decision-01](../DESIGN-AUDIT-01/decision-01.md) item 2) | Structural: the Proxy test is the first operation of each visit. Deterministic: every witness Proxy records zero trap calls | Maintained cases from the corpus below; registered mutants that move the check after one other observation are killed |
| KC3-8 | Re-prototyped built-ins are refused by internal-slot type checks, never by prototype or `Symbol.toStringTag`, before any own-key listing. This covers O-R8-3 and O-R8-4. ([owner-decisions-02](../DESIGN-AUDIT-01/owner-decisions-02.md) extra check b) | Declared bounded search: the design note lists every built-in kind with internal slots in Node v26.10.0 and states which predicate refuses each one. Deterministic: zero own-key listings for each witness | The [reverify-exotics](../DESIGN-AUDIT-01/probes/reverify-exotics.py) cases and the O-R8-3 large typed array and String wrapper as maintained cases. A `Symbol.toStringTag`-spoofing control. Whole-result assertions on creation, ingress and Outcome |
| KC3-9 | Preserved for every value that is neither a Proxy nor a re-prototyped built-in: accepted values and canonical bytes, single observation, the four limits, byte stops, DEC-7 weights and first-eight-detail meaning, and the observable classification and ordering of cycles, `too_deep` and foreign forms. (007 scope; decision-05 item 2) | The existing suite and the K1.2-correction-01 complete-decision oracle pass unchanged. Every changed existing assertion is listed with the decision that authorizes it, and only decision-01 items 2–3 authorize changes | Report table of changed assertions. Clean-C verify |
| KC3-10 | Layer 3 and BASELINE carry the new claim: `values.md` states the metered meaning once and replaces coherent-Proxy acceptance with refusal; the unit table and `B` are at the `OPEN(implementation)` marker and in BASELINE; BASELINE's held V-D1 and "coherent-Proxy acceptance" sentences are corrected; current references to decisions 03/04 item 5 are marked superseded. (007 acceptance; decision-05 item 6; decision-01 items 2–3) | Review of the payload against the [rewrite index](../../../../mental-model/rewrite-index.md) conventions; `npm run check:builder-docs` | Diff, plus a grep record showing no remaining current claim of coherent-Proxy acceptance or unmetered V-D1. At B, `check:builder-docs` already fails on one link (`014-owner-progress-summary.md` → `work/DESIGN-AUDIT-01/`). Report it as pre-existing; the candidate adds no new failure |
| KC3-11 | Clean verification. ([TOOLS-01](../TOOLS-01/contract.md); [owner choice 07](../TOOLS-01/owner-choice-07.md)) | `python3 -B scripts/packet_tools.py verify --revision <C> --spec docs/development/work/K1.1-correction-03/verification.json` returns `checks_passed` on clean C. Its advisory area report is copied into the report | Verify output and summary bound to C |

The packet does not lift its holds itself. The report asks for both releases, and acceptance releases them.

## Known counterexamples

Each item becomes a maintained test with a deterministic assertion (meter, operation or trap counts, plus the
whole result). Timing may be recorded as an observation, never as the gate. Provenance stays with the original
record.

| Source | Shape | Path |
|---|---|---|
| K1.2-correction-01 [review 04](../K1.2-correction-01/review-04.md) P5 | `130 × [4,096 × undefined]`: issue allocation per refused position. One root and eight roots before authority | `review-04/p5-refusal-cost.ts` |
| [review 06](../K1.2-correction-01/review-06.md) R-P1, R-P2, R-P4, R-P5 | Foreign-prototype chain of depth D under diagnostics; thrown-value catch path; Outcome before authority; creation and ingress | `review-06/p-chain*.{mjs,ts}` |
| [review 08](../K1.2-correction-01/review-08.md) VALUE-DEPTH-01 | 4,096 foreign objects × 256 inside 2, 16 and 31 enclosing arrays; eight-root Outcome | `review-08/cost-probe.mjs`, `deep-outcome.ts`, `run-cost.sh` |
| review 08 EVID-01 (N15) | Shared array with 4,096 and 20,000 extra own names in a 4,096 × 4,096 root | `review-08/n15-probe.mjs`, `mutants.mjs` |
| review 08 O-R8-1, O-R8-2 | Rope flattening through indexing; a second symbols listing on the object half | `review-08/p-rope-ops*.mjs`, `mutants.mjs` (N7, N9) |
| review 08 O-R8-3, O-R8-4 | Null-prototype `Uint8Array(2**24)` and String wrapper over a large rope; re-prototyped Map, Set, Date, WeakMap, ArrayBuffer, Boolean and typed arrays | `review-08/p-exotic-ownkeys.mjs`, `p-reprototyped-exotics.ts`; [reverify-exotics](../DESIGN-AUDIT-01/probes/reverify-exotics.py) |
| [blocker-01](../K1.2-correction-01/blocker-01.md) | Proxy whose descriptors have deep prototype chains: now refused with zero trap calls | `probe-descriptor-chain-04.mjs` |
| [blocker-02](../K1.2-correction-01/blocker-02.md) | Proxy whose handler is a deep chain: now refused with zero trap calls, including `IsArray` forwarding | `probe-handler-chain-04.mjs` |
| DESIGN-AUDIT-01 [review 02](../DESIGN-AUDIT-01/review-02.md) PROXY-01 | Proxy over a re-prototyped Map and `Uint8Array` (currently accepted as `{}` and `{"0":1,"1":2}`) | `review-02/brand/proxy-exotic-probe.mts` |
| Earlier cost probes | KC2 read bounds, string preflight and refusal-cost probes 03/04 | `refusal-cost-probe-0{3,4}.mjs`, `probe-string-work-04.mjs` |

Paths are under `docs/development/work/K1.2-correction-01/` unless linked. The K1.2-correction-01 poison and
fault sweeps (`npm run test:kernel-sweeps`) and the DEC-8/DEC-9 rules must keep passing.

**Generated corpus (decision-05 item 3).** Search the cross-product the reversal record names as previously
unvaried ([verdict-flips](../DESIGN-AUDIT-01/verdict-flips.md)): width × depth × aliasing × refusal family ×
prototype shape × diagnostics × root consumer, single-root and eager multi-root. Declare the dimensions and
seeds. Record each search as bounded.

## Suspect design

1. **Charging refusals by bytes.** Capture charges accepted canonical bytes, and many refusals are charged
   nothing. Reviews 04, 06 and 08 each found a different uncharged path: issue allocation, a diagnostic chain
   walk, an open-stack scan. *Question:* is a byte budget the wrong unit for work? Does the meter replace it
   for cost, while the byte stop stays the semantic size limit?
2. **The open stack as an own-array scanned by descriptor reads.** `isOpen` and `closeContainer` scan
   `state.open` through `readAt`, which allocates one descriptor per step. `own-array.ts` also reads a
   descriptor on every stack step ([amendment 01](../K1.2-correction-01/amendment-01.md) seed). *Question:*
   once Proxies are refused and the stack is Kernel-owned, what makes cycle detection O(1) per visit without
   reopening DEC-8/DEC-9's ambient-safety rules?
3. **Order of checks within a visit.** Review 08 showed that moving the prototype check before
   `isOpen`/`openContainer` cuts refusal cost about tenfold, but cycle versus foreign-form ordering is
   observable and preserved (KC3-9). *Question:* which order meets both? If none does, state the observable
   change and ask the owner.
4. **Exclusions in `values.md` and decision-04.** Live-Proxy engine work (item 1) and own-key enumeration
   (item 4) are outside V-D1. Once every Proxy and every re-prototyped built-in is refused before listing,
   no caller code runs during capture ([decision-01](../DESIGN-AUDIT-01/decision-01.md) item 2, research
   inputs). *Question:* can the Proxy exclusion be retired? What remains of the own-key exclusion for an
   ordinary object with many own names, whose listing is charged only after it returns?
5. **Diagnostics.** DEC-7 bounds retention, and type labels are `typeof`-only. *Question:* is every
   diagnostic construction a metered unit with constant work, including path building and the catch path?

## Questions before code

The design note (`design-01.md`, 008 template) answers these. It also answers the suspect-design questions.

1. **Unit table and `B`.** Define units over abstract operations (visit, listing, diagnostic, string), not
   engine-specific reads ([owner-decisions-02](../DESIGN-AUDIT-01/owner-decisions-02.md) extra check c).
   Give `B`'s derivation and the costliest acceptance that attains it.
2. **Enforcement.** How the static check finds every caller-value observation and every value-dependent
   allocation in capture, and what makes it fail on a bypass. Say whether it reuses
   `packages/kernel/tests/zone-analysis.ts`, and state its gaps. Amendment 03 treats that analyzer as a
   regression guard, not a soundness proof. Say which runtime check covers the gaps.
3. **Proxy predicate.** `util.types.isProxy` is captured at module load, never looked up at call time. Where
   does it sit relative to `Array.isArray`, which forwards through Proxy targets? Which reason code and
   diagnostic does a Proxy refusal produce, and is that an existing code? A new code is an owner question.
4. **Brand predicates.** The declared list of built-in kinds and their predicates (KC3-8). Say how cross-realm
   built-ins (`vm` contexts) are classified, and whether an error object (`[[ErrorData]]`) or a boxed
   primitive is a re-prototyped built-in under the owner's decision.
5. **Corpus placement.** Where the maintained corpus lives, and how each item registers with TOOLS-01's corpus
   and mutation registry. Which origins in the TOOLS-01 area report this packet closes.
6. **BINDING-01 seam.** BINDING-01 moves the traversal, refusals and meter into `packages/sdk` later
   ([decision-02](../DESIGN-AUDIT-01/decision-02.md)). Keep the meter's module boundary movable. Name anything
   here that would make that move harder.

## Bounds

- **Owner decisions in force:** decision-05; DESIGN-AUDIT-01 decisions 01 and 02; owner-decisions-02 extra
  checks b and c; invalidations 01, 02 and 03; K1.2-correction-01 DEC-1 to DEC-9 and amendment 03.
- **Non-goals:** the bytes core, transport adapter and SDK move (BINDING-01); the coordinator refactor
  (COORD-REFACTOR-01); the V-ENV claims held by invalidation-03; TOOLS-02's corpus beyond this packet's own
  cases; K1.3. No change to the four limits, accepted values or DEC-7 weights.
- **Forbidden shortcuts:**
  - an issue cap, depth cap or time threshold in place of the meter;
  - a check placed only on the probed path;
  - brand detection by prototype identity, constructor name or `Symbol.toStringTag`;
  - timing as an acceptance gate;
  - editing historical review, decision or validation records;
  - a new dependency without the third-party review in AGENTS.md.
- **Branch:** work on `claude/k1.1-correction-03`. B is `b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b`. The release
  commit precedes C and is administrative. Write `verification.json` modelled on
  [TOOLS-01's](../TOOLS-01/verification.json). Push the design note and stop for the design check. After the
  check, build, then make clean C, then H containing `implementation-01.md` (008). Push. Do not merge,
  force-push, self-accept, lift a hold or start another packet.

## Stop conditions

Stop, write down the question with evidence, and ask the owner:

- after `design-01.md`, for the design check. This packet changes Kernel semantics (006);
- if any accepted value, canonical byte or diagnostic weight would change for a value that is neither a Proxy
  nor a re-prototyped built-in;
- if the classification or ordering of cycles, `too_deep` or foreign forms would change;
- if `B` cannot be derived finitely from the limits, or a unit's engine work depends on caller input for a
  no-Proxy value and cannot be metered;
- if the static check cannot be made to fail on a bypass;
- if the right fix needs a decision-03/04/05 amendment beyond decision-01, or reaches a different subsystem.
  That is a new packet (006);
- on a second CHANGES REQUIRED in this subsystem (006 stop-and-redesign);
- if the environment cannot run Node v26.10.0 or the full verify. That is `BLOCKED_EXTERNAL`, not review-ready.

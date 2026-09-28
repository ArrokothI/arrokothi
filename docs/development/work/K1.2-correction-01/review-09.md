# Independent review — K1.2-correction-01, review 09

## Identity, authority and access

- Reviewer: this independent Codex desktop session, identified by the session instructions as GPT-6,
  2026-09-28. Exact backend variant and stable session identifier are unknown. I did not prepare this
  candidate or review 08. No subagents were used.
- Governing process and cumulative base B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Payload C: `2613f2b8dee37c934743d9b730e925705086c4c9`.
- Reviewed candidate H: **`3b0848ce408ddef9165434f7d7c36e9580ac6341`**.
- Branch: `codex/k1.2-correction-01-activation-identity`; configured origin:
  `https://github.com/ArrokothI/arrokothi.git`.
- Contract: [revision 6](contract.md), Git blob `4a035be01100fca0f807ba1cc6840a2f17925460`,
  incorporating parent [revision 9](../K1.2/contract.md), blob
  `edea43ed1c7583c28cca9c4a7612bf4163a75d2d`.
- Owner authority: [amendment 01](amendment-01.md), blob
  `aef012040618dd35ee76b79bf326cbb2a2be0ec8`, and [decision-05](../K1.2/decision-05.md), blob
  `443b08d52ba065e7146b95906d22300f109c1625`, recorded at
  `13a73ad9ad0662fe585d1453280c5ac3da4f79bb`. Decisions 01–04 and their supersession rules were
  inspected. Candidate prose supplied no exemption from the governing review policy.
- Release: `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`, including
  [invalidation-01](../K1.2/invalidation-01.md). Its authorized cumulative, unintegrated branch
  departure is recorded in the contract. This is not a fresh successor release.
- Prerequisites: accepted H `52b1600f3b42e3a360fdc3395178f1d147edf304`, integrated through
  `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`; correction-02 accepted H
  `719abbf9e55e7489b6255a08cbb9e97a1e960a5e`, integrated through
  `954d31b00eb7f2412c22ccf7d4d079699f0c4032`. All four are ancestors of B. The archived
  correction-01 review-08 and reference-01 review-01 are available through the integration Git
  tree; correction-02 review-03 and integration-01 are in the active checkout. The later V-D1
  hold is preserved; historical acceptance is not treated as current proof of that claim.

I read repository instructions, the mental-model front door and applicable owners, development
front door and 006 at B, plus submitted 007, 008, 012 and the contracts. 006/008/012 and AGENTS.md
are unchanged from B. The architecture and slice-audit skills were applied; their labels do not
replace 006's overall verdict.

Full local Git objects, source snapshots, surrounding code and immutable evidence were available.
I obtained the complete binary B..H diff, not a web patch: 587 changed paths, predominantly historical
records/logs. Its SHA-256 is `2c8db53cbfc0f4f39f5bad01e0af9f7ccfbe0bfd6f4081cf8514dc62eb4377fd`;
it is reproducible with `git diff --binary B H`. [Identity evidence](review-09/identity.json) records
all paths, trees, ancestry, manifests and the C..H comparison. The working tree initially named H
and was clean. Review probes and this record are subsequent review artifacts, not candidate payload.

A fresh `git ls-remote` failed with DNS resolution unavailable for github.com. No current advertised
remote SHA or successful push is claimed. This does **not** hide required source or evidence: the
complete local B/C/H and pinned logs satisfy 006's offline-source path. There is no required-access
BLOCKED_EXTERNAL condition. No native provider, external E gate, process-death, publication or second
Node-version run was performed. Those claims are explicitly assigned outside this packet.

## Identity and evidence checks

- C..H is exactly the report's **45-path allowlist**: report, 007's correction status row, and 43
  validation files including the manifest. No source, script, fixture, evaluator or configuration
  enters that administrative range. The changed 007 row requests independent review and releases
  nothing. The record-checker change is in C, not H.
- Production, tests, fixtures, scripts and examples are byte-identical to review 08 H
  `9248e56705b962bfbce4699536c200fe007be942`. The correction delta additionally contains review-08
  records, adopted owner records, revision-6 contract, BASELINE claim hold, ledger seed/status and
  the decision-05 digest/link update. I inspected that delta separately from B..H.
- [Validation-05 manifest](validation-05/MANIFEST.sha256): SHA-256
  `baedc9a600f3105f2f8f7d91f3d05439e2c766b08ef8b9ac5de1b8b0d1ed4478`; all 42 entries verify.
  [Review-08 manifest](review-08/MANIFEST.sha256): SHA-256
  `ba7f5df73b2d1817df2349487f60275593b3fec7ddd4134a9fea3d219587d62d`; all 35 entries verify.
- Validation-05's environment and result index name exact C, commands, times, exits and clean state.
  Inspected logs include normal gates, mutation controls/rejections, retained reviewer probes and
  the disclosed nonzero results. Digests establish unchanged bytes, not truth by themselves.
- The original ablation runner records 32/36 rejections and four obsolete diagnostic anchors, exit 1.
  The inspected adapter verifies the sealed source digest, changes only B6/B12/B13/B14 literal
  spellings and keeps all 36 mutations and verdict logic; its raw result is 36/36 rejected.
  Correction mutations reject 67/67. X8–X23 and V1–V4 reject; V5 survives as disclosed because the
  current producer emits fixed type messages. This is not reported as 21/21. Z1–Z16 reject in the
  full 1,268-test Kernel control; T1–T4 reject in their 20-test control. Historical diff-check exits
  2 and the collector's nonzero result remain visible, not converted into successful gates.
- The independent review-08 observations are inspectable evidence. They neither waive cumulative
  review nor supply a new V-D1 acceptance. Their transferred cost findings remain open elsewhere.

## Independent coverage and per-criterion verdicts

Coverage was derived from governing definitions/mechanisms and the contract before following
implementation-05's explanation. The map crossed identity shape, exchange currency, authority,
content, lifecycle, recovery and retained evidence. It then guided full production-source inspection,
active normative diffs, surrounding helpers, test assertions and prior-finding reconciliation.

012 methods applied: normative examination; deterministic execution; in-process race/exception
injection; process/documentation and Git identity checks. Native fidelity belongs to R1, E1 to K1.4,
persistent process failure to K3, output subscription/retention to K4.4/K5, public packaging to S1.
No fake Driver result is credited to those gates. Value refusal cost alone is transferred to
K1.1-correction-03; diagnostic semantics and ambient safety are not transferred.

| Criterion / governing obligation | Independent challenge, observations and evidence | Verdict |
|---|---|---|
| C1: scope before content; execution-cycle OA-1, authority/evidence | Hidden versus missing on all four entries; denied control must read no request field and leave hidden records unchanged. `#visible`/`#requireControl`, identity scope matrix and nondisclosure assertions preserve this. | PASS |
| C2: replay/conflict before fresh checks; identity and execution-cycle | Replay after takeover, another exchange and terminal, with absent/retired grant; same original receipt, zero mutations. Changed content conflicts once. Exact primitive-string map key and captured comparable content are separate from diagnostic rendering. Exact-coordinate and lifetime tests check references and whole views. | PASS |
| C3, excluding transferred cost: producer-compatible ID, independent currency, authority then content | Trace creation packing → dispatch suffix → every consumer; 65,536 key, ninth/tenth exchange, long namespace/scope, surrogate, empty, boxed, absent and revoked forms. Check stale usable epoch/base independently when other coordinates are malformed; entitled/grant-less invalid content, limits, capacity and no retry. `captureOutcome` remains eager but classification/retention obey decision-02. Identity, partial-claim, limits and aggregate oracles; I/B/D/G mutations distinguish these paths. | PASS |
| C4: one atomic Outcome decision; core batch and cycle acceptance | Two-Event batch plus later queued input; accept only pinned batch, base+1, output/receipt/next/hold-ending records together. `#accept` prebuilds retained records before apply; hostile/transaction cases and A1/A12/A13/A16/B5/B7 reject broken variants. No native-success inference. | PASS |
| C5: continue/complete/fail; lifecycle and identity | Next exchange has new ID and pinned new base; empty continue batch allowed. Complete/fail retire exchange and never reopen it. Exact-coordinate lifecycle oracle checks both terminal forms and repeated emission keys in later exchanges. | PASS |
| C6: B-5 and live terminal ingress; core/creation/lifecycle | Non-batch queued input gets terminal disposition in same decision, never acknowledgment. New post-terminal input refuses, old exact input replays its current disposition, changed input conflicts. Terminal tests, full-result oracle, A7/A8. | PASS |
| C7: explicit unsupported work; cycle EF-1/2 | Effect/obligation-bearing Outcomes refuse whole; no Effect ID/record. Await refuses without reading wait internals. Empty lists remain distinct from unsupported nonempty content. Outcome acceptance assertions and A6/A15. | PASS |
| C8: retry, takeover, native safety and authority lifetime | Same ID/input; epoch+1 only after safe replacement and post-callback revalidation. Nested takeover, Outcome, new exchange, terminal and code hold defeat stale outer assumptions. Old grant fenced, first-send grant survives redelivery, report capabilities remain per delivery. Source plus takeover/lifetime tests and B6/B10/B11. Reviewer history probe confirms takeover's own resultingEpoch avoids the new inherited-field defect. | PASS |
| C9: missing-code hold and recorded recovery; recovery/state/evidence | Exact pins, RUNNING, unchanged progress/receipts, permitted next actions, declaration update/clear and Outcome end. Ordinary cases pass. Inherited optional history field permits fabricated/mutable evidence or throws after code-hold mutation. New finding HISTORY-01. | **FAIL** |
| C10: protocol failure and separate control/submission powers | Control gate, current attempt check, bounded explicit diagnostic, duplicate no-op, takeover/Outcome clear. Ordinary cases pass, but entry can mutate the hold without history or reverse history causation under reentry. HISTORY-01. | **FAIL** |
| C11: delayed operational reports; delivery owner | Reports settle only their captured delivery row across redelivery, takeover, resolution and later dispatch; first report wins. Exact-coordinate/lifetime and delivery-attribution tests compare every other field; B4 distinguishes epoch loss. | PASS |
| C12: immutable per-Execution evidence; identity/state/evidence | Exact receipts, output IDs, input/acknowledgment/hold coordinates, actor attribution, contiguous positions and nondisclosure checked through independent spelling oracles, X/Z mutations and source. New probe retains a mutable caller object inside a frozen history record; later mutation changes inspection. HISTORY-01. | **FAIL** |
| C13: one observation and ambient safety; values and inherited K1.1 rules | Captured roots, own fields, revoked values, descriptor/index/global pollution and pre-check reentry inspected. Outcome apply uses captured operations. Recovery helper instead performs a live prototype lookup after observation and after mutation. HISTORY-01. | **FAIL** |
| C14: private target zone and migration inventory | 13 source modules, no legacy/provider edge or new third-party dependency. Inventory and architecture guard agree; DX-4 remains unextracted because coercing legacy schemas do not implement this contract. SDK/other package/example source is unchanged; legacy consumers remain supported. | PASS |
| C15: maintained claims and Layer-3 fidelity | Canonical owners/markers/decision provenance largely agree and exact-H documentation checks pass. Live implementation prose still asserts the transferred V-D1 guarantee; scope mapping also points refusal-cost work at this packet. CLAIM-01 prevents faithful no-claim maintenance. | **FAIL** |
| Correction DEC-1–6 and exact-coordinate evidence | Primitive strings remain exact through replay, comparison, grant, receipts, output, projections and returned answers. Diagnostic identity/path 128, message 1,024, whole reason 16,384, first eight details/count ordering, DEC-6 explicit diagnostic first 1,024 code units inspected and tested. The inherited history defect is separate from lossy rendering. | PASS for these representation rules; overall C9/C10/C12/C13 fail |
| DEC-7 diagnostic semantics; unchanged KC2 read bounds/accepted values | Type-only labels, bounded path construction, weighted suffix counts, own-only metadata and eager sibling traversal inspected. V1–V4/T1–T4 evidence and maintained cases distinguish skipped siblings, lost weights and caller lookups. No new validity limit or reuse of observations. | PASS |
| V-D1 cost and its transferred evidence | Express owner assignment to K1.1-correction-03. No meter, budget proof, timing acceptance or claim release is certified here. | DEFERRED |
| Revision-6 narrowing, no surviving implementation claim | Contract and BASELINE correctly hold V-D1; source comments still claim it. Amendment items 3–4 are not fully met. | **FAIL** |
| 006 C/H, source and required evidence access | Full local identities/snapshots, ancestry, accessible immutable evidence and exact administrative allowlist verified. Fresh remote advertisement unavailable, with no claim otherwise. | PASS |

### Layer 3, examples and migration

The cumulative Layer-3 payload was treated as normative. `identity.md` owns Activation identity and
its binding choice; `execution-cycle.md` owns delivery, capability lifetimes and acceptance order;
`values.md` owns value rules/diagnostic constraints. Core and integration descriptions link those
owners. Decision-01 authorizes the third carrier argument; decision-02 authorizes malformed-coordinate
routing; decisions 03/04 authorize the stated cost exclusions. Revision 6 explicitly postpones
canonical metered wording to the successor, so unchanged normative V-D1 text is not itself a stale
implementation claim.

The representation, epoch and diagnostic-storage markers remain open at the implementation layer,
with BASELINE choices. No universal wire grant, durable transaction substrate, schema validator or
Driver cardinality was silently selected. Relevant rewrite-index §5 checks included same exchange
on takeover, whole-Outcome fencing, epochs across different exchanges, atomicity versus durability,
RUNNING versus WAITING, receipt versus external success, acknowledgment versus compliance, identifier
versus authority, structural movement versus migration, and status versus specification. The
cumulative changed specification pages add no build/acceptance status. The roadmap's stale cost
assignment is covered by CLAIM-01, rather than used to override the amendment.

The cycle's worked Effect example is labeled K2 target behavior; K1 still refuses it. Output
retention does not imply external sending or output subscriptions. Guide/SDK/example trees retain the
legacy implementation and gain no target-package migration claim. The source inventory and private
package description match the cumulative facility. The obsolete two-argument carrier and
inspect-only/control confusion are corrected in current descriptions. No new third-party source,
asset or dependency was incorporated by this candidate or review; existing JCS provenance is retained.

## Findings

### K12C1-R9-HISTORY-01 — P1 — recovery history consults caller-controlled inherited state after changing a hold

**Location at H:** `packages/kernel/src/coordinator.ts:600` and `:620`, in
`appendRecoveryHistory`; callers mutate code holds at `:1795`/`:1810` and protocol holds at `:1878`
before invoking it. **Sources:** parent DEC-18, C9/C10/C12/C13, state/Execution History,
evidence/authenticated recorded commands, correction contract's preserved ambient safety.

The helper receives a Kernel-created ordinary literal. Entry, update and declaration-clear callers
omit `resultingEpoch`. Reading `entry.resultingEpoch` therefore consults `Object.prototype`.
An ordinary own `activationId` getter on an authorized control request can install that inherited
property during permitted envelope observation. No exotic Proxy, V-D1 cost premise or unavailable
service is needed.

Independent evidence:

- [Initial reproducer](review-09/probe-history.mjs) and [output](review-09/probe-history.txt): inherited
  numeric value 777 is retained as the resulting epoch of a protocol-hold entry at epoch 1.
- [22-case recovery matrix](review-09/probe-recovery-matrix.mjs) and
  [raw output](review-09/probe-recovery-matrix.txt): control cases pass; code entry/update/clear and
  protocol entry all exhibit the defect. A throwing inherited getter executes after the hold was
  changed, escapes the boundary and prevents the matching history entry. At entry this leaves one
  active hold with an empty history; clearing similarly removes the hold without recording it.
- A reentrant inherited getter accepts a valid terminal Outcome. Protocol/code entry then appends
  `entered` **after** `ended_by_outcome`, even though the Execution is already COMPLETED. This is
  an actual unrecorded callback window between hold mutation and history recording.
- [Mutable-object probe](review-09/probe-history-mutable.mjs) and
  [output](review-09/probe-history-mutable.txt): an inherited caller object is retained verbatim as
  `resultingEpoch`. The outer record is frozen, but changing the caller object from 777 to 888
  changes later inspected history. This directly disproves immutable retained evidence.
- The matrix's `--expect-correct` mode [fails](review-09/recovery-oracle.txt), exit 1 with 12 violating
  rows. Ordinary takeover clearing, which supplies an own resultingEpoch, and Outcome clearing,
  which prebuilds separate records, resist this particular injection.

**Impact:** recovery decisions can have missing, invented, mutable or causally reversed evidence;
an exception can escape after accepted operational state changed. This violates an existing
invariant and the supported same-process boundary, not a new containment or refusal-cost demand.
The full maintained suite passes, exposing a meaningful interaction gap between recovery-history
and ambient-safety coverage. Prior HISTORY closure and unchanged coordinator bytes did not establish
this interaction; review 08 explicitly limited its coordinator reread.

**Required outcome:** reconstruct the recovery-control/history transaction across every entry,
update and clear path. All retained facts must come from explicit Kernel-owned data; no inherited
optional field may inject a value or execute caller code between validation, mutation and history.
Records and state must remain coherent on faults and reentry. Preserve own resultingEpoch only for
its intended takeover event, authority attribution, ordering, idempotence and permitted actions.
Add maintained distinguishing oracles for the matrix above, mutable foreign references and both
safe clear paths; re-audit adjacent optional-field reads and returned projections. Catching the
exception after mutation is insufficient. No implementation was made in this review.

### K12C1-R9-CLAIM-01 — P2 — live implementation comments still claim transferred V-D1

**Locations at H:** `packages/kernel/src/values.ts:55–66` and `:452–460`;
`docs/development/work/K1.2-correction-01/implementation-05.md`, Changes and coverage;
`mental-model/roadmap.md:96–103` for the related obsolete assignment.
**Sources:** amendment-01 items 3–4, revision-6 Claims, 006/008 truthful scope/claim maintenance, C15.

The module says it implements the value rules and lists deliberate properties of this implementation.
Item 4 is **“Refusing costs no more than accepting.”** The `charge` comment independently concludes
that stopping at the byte limit means **“the refusal costs no more than a value at the limit would.”**
These are present-tense implementation guarantees and the same unsupported inference that the
amendment transfers. They are not sealed review history or `values.md`'s deliberately preserved
normative obligation. Report 05 says the search included `packages/kernel/src` and found no other
claim. That statement does not match the source. The roadmap also still assigns bounded refusal-cost
maintenance to K1.2-correction-01 under an unspecified owner amendment.

**Required outcome:** qualify/remove the current implementation guarantees so all live descriptions
agree that no V-D1 claim is certified here; retain precise byte-stop, read-bound and diagnostic facts.
Point the maintenance mapping at the adopted split, and correct the next report's audit statement.
Preserve sealed historical text and the normative values page as the amendment requires. Search
conceptual aliases, including “costs no more,” not just the identifier V-D1. This finding requires
honest claims, not implementing the successor meter.

Amendment-01 also freezes production bytes. Fixing HISTORY-01, and editing comments in `values.ts`,
therefore needs the owner to adjust that **planning constraint** before a new payload. The existing
behavioral obligations are unambiguous. Under 006 this is CHANGES REQUIRED, not an architecture
verdict and not permission for this reviewer to implement a change.

## Reconciliation with prior findings

Prior records remain unchanged. The table covers stable blocking findings, including merged review
records; dispositions were checked against current source, assertions and evidence rather than prior
PASS labels. Optional observations remain carried by their original records unless noted below.

| Prior finding(s) | Disposition on this H |
|---|---|
| K12-R1-AUTH-01, HOLD-01, DELIVERY-01 | Closed mechanisms remain: separate control power, safe replacement, permitted actions and attempt-local delivery attribution. |
| K12-R1-HISTORY-01 | Original missing-history mechanism corrected, but subsystem closure is reopened by new HISTORY-01; ordinary presence is insufficient. |
| K12-R1-DOC-01, REC-01; K12-R2-TAKEOVER-01 | Current prebuild transaction description, named raw evidence and post-safety callback revalidation address the prior counterexamples. New recovery helper window is separately identified. |
| K12-R3-AUTH-02, HISTORY-02; K12-R4-AUTH-DOC-01 | Grant checks and lifetime, attempt_submission attribution, and current no-control wording remain correct. |
| K12-R5-LAYER3-01, PROC-01; K12-R7-PROC-01 | All cumulative normative payload is before C; exact current C..H contains only its declared administrative paths. Earlier candidate identities are not extended. |
| K12-R6-LAYER3-01, EVID-01; K12-R8-DOC-01 | Authorized three-argument carrier, separate lifetimes, saved-first-grant assertions and exact-H builder check address them. |
| K12-R9-ORDER-01, EVID-01; K12-R10-EVID-01, VAL-01 | Grant-before-content in both malformed/current claim arms, actual surrogate fixture and affirmative post-authority codes, B12–B14 and accessible clean-C raw evidence remain. |
| K12-R11-ORDER-01; K12-R13-ARCH-01, REC-01, DOC-01 | Independent usable-coordinate currency; decision-02 authority; consistent parent revision 9; precise eager-capture wording. B15–B20 distinguish the old routes. |
| K12-R14-ID-01, EVID-01 | Primitive-string producer/consumer rule, long/tenth-exchange/surrogate cases and inverse old-validator mutations address both. No creation acceptance narrowing. |
| K12C1-R1-DIAG-01; R2-AGG-01, R2-EVID-01 | Bounded fragments/aggregate renderer, exact omitted-spelling comparisons and limit edges address the original totality/equality counterexamples. |
| K12C1-R4-EVID-01; R6-EVID-01 | Independent input-derived coordinate/token oracle plus X8–X23 and Z1–Z16 addresses lossiness/uniqueness at retained and returned sites. New optional history-field pollution was outside those mutants. |
| K12C1-R4-VALUE-COST-01 | Diagnostic-retention mechanism is bounded; transferred time/cost claim remains held in K1.1-correction-03. Not represented as fully fixed by this review. |
| K12C1-R6-VALUE-TIME-01 | Constructor/name diagnostic lookups removed; source/type-only assertions and T1/T2 address that mechanism. No general V-D1 proof follows. |
| K12C1-R8-VALUE-DEPTH-01, R8-EVID-01; O-R8-1–3 | Explicitly transferred, open there; cost runs/meter work do not determine this packet's acceptance. |
| O-R8-4 | Pre-existing accepted-value classification of re-prototyped built-ins remains owner triage outside this packet, as expressly assigned. |

The correction's SELF-R4-STRING-01 preflight remains in source; its cost claim is transferred.
SELF-R4-DESCRIPTOR-01 and SELF-R4-HANDLER-01 are resolved in scope by decisions 03/04, subject to
05's transfer, not by inferred permission. Earlier optional diagnostic observations are represented
in DEC-4–7 and their tests. The old ledger introduction, historical OPEN-5 wording and minor runner/API
editorial observations are not silently promoted into new normative obligations. Review 05 and
review 07 of the correction are not recorded; no verdict is invented for them.

## Validation, gaps and verdict

Reviewer reruns on exact tracked H, with only untracked reviewer artifacts present:

| Command | Result / raw evidence |
|---|---|
| `npm test` | Exit 0; 3,322 pass, 0 fail/cancelled/skipped/todo; [log](review-09/npm-test.txt). |
| `npm run typecheck` | Exit 0; [log](review-09/typecheck.txt). |
| `npm run check:builder-docs` | Exit 0; 72 files, 1,834 local links/anchors, 38 imports; [log](review-09/builder-docs.txt). |
| `node docs/development/work/K1.2-correction-01/check-records.mjs` | Exit 0; preservation/ancestry and 679 local links/anchors; [log](review-09/check-records.txt). C's 682 count differs because H changes the status row. |
| Initial history, 22-case matrix and mutable-reference probes | Exit 0 means each reproducer completed/confirmed observations, not that the candidate met the intended rule; linked above. |
| Matrix with `--expect-correct` | Exit 1; 12/22 cases violate the independent history oracle; [log](review-09/recovery-oracle.txt). |

[Execution metadata](review-09/execution.json) records exact commands, cwd, environment and exits.
Environment: Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin arm64. Probe scripts and raw outputs
are hashed in [review evidence manifest](review-09/MANIFEST.sha256), whose SHA-256 is
`fa6a80a77f727736099a227ee9fb8b050fd46562a9cfbb03af50d3c13614e357`. I did not rerun the long ablation
batteries, engine-maximum/cost probes, separate suite aliases or eval gate; their pinned records were
inspected, and the full suite was rerun once. Cost observations are not used as an acceptance gate.

Coverage limits: no exhaustive hostile-JavaScript proof, every possible interleaving, or second-engine
claim. Test inspection followed concrete assertions across the mapped families; thousands of legacy
cases and historical log lines were not each re-audited as separate claims. Full source/diff access
was not restricted to those excerpts. The material evidence gap is now explicit: maintained recovery
history tests and hostile tests do not compose at the optional resultingEpoch read, even though their
separate suites pass. The active claim search also missed ordinary-language V-D1 assertions. No other
required obligation was deliberately deferred or waived; finite deterministic checks are not a proof
of absence of further defects.

**Verdict for exact H `3b0848ce408ddef9165434f7d7c36e9580ac6341`: CHANGES REQUIRED.**
Recommended status: **CHANGES_REQUESTED**, open `K12C1-R9-HISTORY-01` and `K12C1-R9-CLAIM-01`.
No acceptance attaches to H, review 08's H or this review's eventual recording commit. Both existing
invalidation holds remain owner-controlled. No merge, release, push or production change was made.

### Compact correction handoff

Review target: K1.2-correction-01 on `codex/k1.2-correction-01-activation-identity`.
Base `a20d278185eaffc7f8b7489345a3624231ff6e6d`; reviewed H
`3b0848ce408ddef9165434f7d7c36e9580ac6341`; authoritative findings are in this review-09 record.
Open IDs: `K12C1-R9-HISTORY-01`, `K12C1-R9-CLAIM-01`. Owner action: amend the production-byte freeze
as needed for these corrections without silently changing the preserved semantic obligations or
releasing V-D1. Then reconstruct the affected recovery/history subsystem, close both findings,
package a fresh C/H and re-review the cumulative candidate under 006/012. No successor release.
This review record/evidence is local and uncommitted; no A identity or future push is asserted.

CHANGES REQUIRED

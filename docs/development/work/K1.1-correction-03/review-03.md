# Independent review 03 — K1.1-correction-03, round 4

Accept exact H `4b121d7ba665182b22857f049c05f019f25d0c65` under owner choice 03's gate. The
production and current-claim search found no blocking counterexample. Three P3 tooling observations
remain assigned to TOOLS-02. The independent composed verifier **failed** at adoption; that result
is retained, not replaced by the passing individual checks below.

Reviewer: Codex Desktop, model **gpt-6-astra**, reasoning effort `xhigh`, session
`01a14e96-3398-7520-97a2-ef62585010aa`, 2026-10-18–19. These identifiers come from this session's
local metadata (CLI `0.158.0-alpha.2`), not an independent inspection of the serving backend.
This session did not implement the candidate. No subagents were used. Access comprised local source,
Git objects, shell execution and repository retrieval through the GitHub connector/network, with
reviewed sandbox escalations for acquisition and execution. There was no access to private owner or
implementer conversations beyond the supplied records, engine internals, a native-addon External
fixture, or live providers. Finite tests do not certify all JavaScript objects, physical containment
or elapsed-time bounds.

| Identity | Exact revision |
|---|---|
| Cumulative base B | `b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b` |
| Payload C | `2bf220e9e426c810f2505fa2d74d70197807e584` |
| Reviewed candidate H | `4b121d7ba665182b22857f049c05f019f25d0c65` |
| Accepted-limit reference on origin/main | `7af0cd11176c220353c06545630edbe45c2127b6` |

B is an ancestor of C; H's sole parent is C; the acquired candidate branch advertised H. C..H changes
exactly the nine paths permitted by `verification.json`: 007, implementation-04 and the seven
evidence-04 JSON attachments. The full B and H trees and the complete 110,492,496-byte binary B..H
diff were obtained. The diff's SHA-256 is
`7cefa80711594a0cd862028aef88ea7fba2f2461012dcc008f0bfa14eedc4327`;
[identity](review-03/identity.json), [compressed diff](review-03/cumulative-B-H.diff.gz) and
[administrative diff](review-03/administrative-C-H.diff) preserve the checks. The cumulative diff
contains 261 paths; its production changes are confined to `values.ts` and `envelope.ts`.

The governing contract is [brief 01](brief-01.md) and its decision/design amendments through
[owner choice 03](owner-choice-03.md), all at H. Process sources AGENTS, 006, 007, 008 and 012 were
read at B. The additional 006 working principle 6 and 017 were read at the pinned main revision
above. Owner choice 03 item 3 governs severity and acceptance: only a concrete defect in unmodified
Kernel production or a false current Layer-3/002/007 claim can block. Tooling-only gaps go to
[TOOLS-02](../../007-work-packets.md#tools-02--remaining-corpus-extraction). An accepted 017 limit
does not become a blocker without evidence that it is wider than declared.

The owner's supplemental decisions are recorded verbatim, separately from reviewer findings:

```text
2026-10-12: the owner choice 01 standing rule covers a changed witnessed test, not a changed helper
module. The owner accepts the 007 TOOLS-02 scope edit and the kernel-sweep timeout.
2026-10-18: proposed limitation L-13 in implementation-04 (no request-wide work budget; each root has
its own B under decision-05 item 5) is approved for 017. 014's 'next steps' line is a plan statement
that the owner updates at integration, not a current claim.
```

**Verification and evidence provenance.** A fresh separate clone at C used Node v26.10.0,
npm 11.19.1 and Python 3.13.7 on macOS arm64. The required command ran as the only validation job:

```sh
python3 -B scripts/packet_tools.py verify --revision 2bf220e9e426c810f2505fa2d74d70197807e584 --spec docs/development/work/K1.1-correction-03/verification.json
```

The final independent composed attempt ran on 2026-10-19 from 08:35:46Z to 08:44:27Z (520.735 s),
exit 2, **`invalid`**, at adoption: “preserved table differs from the census at C: 21 members differ,
0 not recomputed”. The first named members are `ambient-reads.test.ts:138:3@4a94f4ea0361`,
`:160:3@4a94f4ea0361` and `:298:3@4a94f4ea0361`. This is not a passing full verification, and it
stopped before the expected hour-long run completed. [Raw stdout](review-03/verify.stdout.json),
[stderr](review-03/verify.stderr.log), [environment/times](review-03/verify-run.json) and the
[runner](review-03/run-verify.py) are attached. Earlier attempts failed on missing historical Git
objects; their raw records are retained. Those access failures were repaired by acquiring the
referenced historical objects, including unreachable archive commits, without changing C's files.
[History acquisition](review-03/history-repair.json) records that distinction.

The unchanged verifier's remaining declared operations were then run sequentially with the same
inputs, environment, catalogs, timeouts and count requirements by
[run-remaining-checks.py](review-03/run-remaining-checks.py). This only resumes existing checks;
it adds no new evidence-tooling cases and cannot turn the composed failure into a pass.
The [step index](review-03/remaining-checks.json) and `remaining-*.json`/`.log` files preserve each
result. All 13 resumed steps passed, ending 2026-10-19 09:18:49Z, with C clean after each step:

| Independently resumed check | Result |
|---|---|
| Coverage, refusal census, oracle census, typecheck | PASS |
| General / refusal / value-cost registries | Reported 109 / 321 / 238 killed registrations, within their declared qualification scopes |
| Repository tests | 4,123 passed; 0 failed, cancelled, skipped or todo |
| Archive tests | 4 passed; 0 failed, cancelled, skipped or todo |
| Kernel fault sweep | 66 scenarios, 54,314 runs, 57/57 exits reached, 0 violations |
| Kernel prototype poison sweep | 48 test files, 347 poisoned names; off/count/throw/reenter each pass 2,061 tests, 0 zone firings |
| Maintained value-cost dimensions | 5,460 refusal cases, 1,543 accepted B/C comparisons and 1,056 consumer schedules pass |
| Full continuation matrix | 1,862 shapes, 373,694 runs and pristine/instrumented comparisons; all seven crossing kinds; 1,868,169 permitted unwinds, 127,688,183 native observations, 0 violations or forbidden calls |
| Advisory area gate | `reported`; no acceptance credit inferred |

The [advisory report](review-03/remaining-area-gate.json) records 261 changed paths, 48 behaviour
paths, 68 areas, 1,503 open origins and 664 ungated origins. Touched areas contain 387 Kernel and
10 tooling open origins; their deduplicated union is 388 (296 pending, 92 pending revalidation),
with zero prose-pending items. These are advisory TOOLS-02 obligations, not product failures.

All six submitted evidence-04 payload attachments and their nested raw members were decoded and
length/digest checked, including B/C matrices, isolations, ledger, continuations and verify. The
[read index](review-03/evidence-04-read-index.json) and [submitted summaries](review-03/submitted-evidence-summaries.json)
identify inspected implementer evidence separately from reruns. The submitted composed run records
`checks_passed` in 3,736 seconds under Python 3.13.5; that historical result does not replace this
review's failed run. The dated 007 build entry is supported as a report of that submitted run, not
as a universal reproducibility guarantee. The B/C 6,003-pair C1 matrices were inspected, not rerun
in full. Builder-docs' preserved B/C logs show the same pre-existing missing DESIGN-AUDIT-01 link;
no fresh builder-docs run is claimed.

**Production review and declared search.** The independent
[coverage map](review-03/coverage-before-report.md) preceded reconciliation with implementation-04.
I read brief-01, design-01/check, owner choices 01–03, reviews 01–02 and their briefs, designs
02–03/check, implementation-04 and evidence-04, using earlier reports only for history and probe
provenance. I compared C's complete production change with B and traced the surrounding capture,
identity, creation, ingress, recovery and Outcome paths. [Source notes](review-03/source-review.md)
and [normative search](review-03/normative-search.txt) declare the searches: all root-consumer
references; charge/stop helpers and native observations; Proxy, internal slots, coherent acceptance,
meter, R1–R4 and stop/unwind wording throughout mental-model, 002 and 007. All changed Layer-3
documents were inspected in context. No new mutation-credit, static-guard, ledger, census or registry
adversarial probes were built.

The following are independent executions against unchanged C, under Node v26.10.0. The
[production run index](review-03/production-runs.json) records commands, exits and clean states;
the [evidence README](review-03/README.md) gives reproduction instructions and instrumentation limits.

| Search | Distinguishing observations |
|---|---|
| [Production probes](review-03/production-probes.mjs) | Six Proxy forms, including callable, revoked and nested targets; 77 built-in/prototype combinations including cross-realm objects. 830 creation/ingress/recovery/Outcome root refusals passed. Proxy's first observed operation is `isProxy`; traps/accessors were not invoked. Detectable internal-slot refusals do no own-key listing. |
| Real work boundary | Fourteen prior-review alignments vary budget offset, 0/1/257/4,096/65,536 target names, wrappers 1/15/29, shared/distinct rows and null prototypes. All pass: the diagnostic crossing at B+1 emits one stop and performs no target names listing. Fourteen public-consumer schedules also pass. [Raw results](review-03/historical-stop-boundary.stdout.json). |
| Eight eager roots | Eight distinct real-B-crossing roots were each visited with their own budget, in order, both without authority and with a grant. The first case returns `unauthorized_submission`; the second returns weighted `malformed_envelope` with eight work stops. Accepted state, receipts and deliveries remain unchanged; a corrected Outcome can use the same grant. |
| Per-root acceptance | Eight roots of 720,930 canonical bytes / 720,933 work units each are accepted together. The aggregate exceeds both single-root limits, as decision-05 and approved L-13 permit. |
| Prior dimensional search | 5,460 refusal cases across 13 families, four prototype shapes, seven widths, five depths and three alias patterns: no listing discrepancy; at most eight details. 1,543 accepted values have identical B/C bytes. Another 1,056 consumer schedules pass. [Raw results](review-03/historical-dimensions.stdout.json). |
| Diagnostics and ordering | Exact first-eight details and suffix multiplicities agree with B on ordinary refused values; mixed suffixes retain their counts. Proxy precedes depth; for non-Proxies cycle precedes depth and depth precedes foreign form. Refusals preserve accepted state and permit the expected continuation. |
| Historical continuation search | Review 02's unchanged JS search, with only helper signature/expression anchors ported in its disposable instrumentation: 1,824 shapes, 359,254 runs, all seven crossing-charge kinds, 1,841,852 cycle unwinds; zero post-stop helpers or forbidden native calls. Pristine/instrumented default captures agree. [Port record](review-03/historical-probe-port.json), [raw results](review-03/historical-continuations.stdout.json). |
| Q6 witnesses | Re-prototyped WeakRef and FinalizationRegistry still accept as `{}`; the roadmap now carries the detectable-kind qualifier. This is the approved L-08 limit, not wider refusal. [Probe](review-03/rerun-declared-limit.mjs). |

The budget argument was checked independently of these measurements. For accepted nodes, disjoint
own costs are array `2n+4` versus at least `n+1` punctuation bytes (n≥1), object
`3n+3+Σℓ` versus at least `4n+1+Σℓ` bytes, string `1+ℓ` versus at least `ℓ+2` bytes, and one
unit per other scalar. Empty containers satisfy the bound separately. Each cost is at most three
times its bytes, so monotone capture cost cannot exceed B = 3×1,048,576 for an acceptable root.
The reproduced costliest witness is 1,048,555 bytes / 3,094,930 units, 50,798 below B; it does not
purport to attain the maximum. Sharing is charged on every occurrence.

Source tracing confirms that `STOPPED` is a private unique symbol and that every stop-capable result
is returned or tested by identity before further traversal/bookkeeping. The crossing writer's fixed
accounting and bounded issue, paired cycle deletion, root refusal packaging and two evidence-record
freezes are the stated unwind allowance. The symbol-diagnostic stop returns before the next names
listing, closing review 01's concrete defect. Serialization consumes only an accepted owned snapshot
and is not reached on refusal. Listing charges are applied immediately after return; native internal
work is limited only as R1–R4 state. A length charge can take the reported counter more than one unit
past B; capture stops on that first crossing charge. B+1 above describes the one-unit diagnostic
alignment, not a claim that every bulk charge is clamped to B+1.

**Current claims.** `values.md`, 002 and 007 agree with the code on the unit table, B as an upper
bound, Proxy-first ordering, Q6 detectable kinds, separate root budgets and the stop/unwind allowance.
R1's crossing listing, R2 host interceptors, R3 expected hash cost and R4 unreturned/deleted storage
remain explicit. L-09 permits envelope code between captures; L-11/L-12 limit evidence mechanisms.
No false current claim was found. 014's planning sentence and the approved addition of L-13 to 017
are treated exactly as the owner directed; this review edits neither document.

**Criteria and prior findings.** The statuses below apply the original criterion text honestly;
the governing owner choice determines whether a remaining evidence gap blocks this packet.

| Criterion | Result and reason |
|---|---|
| KC3-1 | PASS for current production: charged helpers and explicit sentinel propagation were traced; real-B and continuation probes distinguish continuation after a stop. Universal static-guard completeness is outside the accepted scope (L-11), assigned to TOOLS-02. |
| KC3-2 | PASS: disjoint-node derivation, at-limit witness, exact B+1 diagnostic crossing and both stop modes agree. No acceptable ordinary value was refused by the meter. |
| KC3-3 | PASS within R1–R4: fixed depth, entry, text and diagnostic caps bound local work; the four engine residuals and Q6 limits remain explicit. No wall-clock or hostile-runtime bound is inferred. |
| KC3-4 | PASS: per-refusal visit/classification costs are independent of wrapper depth; maintained depth 2/16/31 cases and the independently exercised eight-root unauthorized Outcome preserve accepted state and authority ordering. |
| KC3-5 | PASS within the active registry's declared vocabulary: the prescribed value-cost registry passes, including N15 and charge-weakening registrations. Uncredited C1 vocabulary cases remain explicitly assigned to TOOLS-02 under owner choice 03. No universal kill-attribution claim is made. |
| KC3-6 | PASS for the metered claim: the depth/cost transfer closes through KC3-1–4 and Proxy refusal, with R1–R4 retained. This review does not itself lift the claim hold. |
| KC3-7 | PASS: load-time Proxy predicate is first on every object/function visit; revoked, callable, array and nested-target witnesses refuse without traps across all root routes. Identity text also checks Proxy first. |
| KC3-8 | PASS within Q6: the native predicate set precedes key listing; 77 brand/prototype witnesses and all consumer routes pass. External has no JS-only witness; undetectable kinds are explicitly excluded by L-08. |
| KC3-9 | PASS for production preservation: 1,543 B/C accepted-byte comparisons, ordinary diagnostic comparisons, whole-result/state continuations and the existing semantic corpus. The inspected C1 ledger discloses its five uncredited meanings; tooling credit is not silently treated as semantic preservation. |
| KC3-10 | PASS: Layer 3/002/007 match current production within Q6/R1–R4 and the bounded stop/unwind wording. The preserved builder-docs failure is pre-existing. |
| KC3-11 | FAIL as literally written: the independent composed verifier returned `invalid`, not `checks_passed`. The 21-member census discrepancy is P3 under owner choice 03 item 3 and is transferred to TOOLS-02; it cannot independently block this review or trigger redesign. |

Expected refusal-journal entries are distinguished from accepted-state changes. No new execution,
receipt, delivered effect or consumed submission grant resulted from the refused schedules.

Review 01's `KC3-R1-STOP-01` is closed by the real-B rerun and source trace; `KC3-R1-DOC-03` is
closed within Q6. Its `KC3-R1-EVID-02` and review 02's `KC3-R2-EVID-01`, `KC3-R2-STOP-02` and
`KC3-R2-C1-03` concern the old evidence mechanisms. Design 03 changes and the prescribed checks
provide the bounded replacement evidence; eleven registrations and five mutant meanings remain
explicitly uncredited and transferred. No universal tooling closure is inferred. Owner choices
02–03 answer the earlier stop-and-redesign; the tooling observations below do not restart it.

**P3 observations, assigned to TOOLS-02.** These are not production counterexamples or reasons to
withhold acceptance under this packet's governing gate.

- **KC3-R3-CENSUS-01 — P3.** The required verifier's adoption step fails on 21 preserved-table/census
  members after historical object access was repaired. Location: the adoption operation reached by
  `verification.json`. Reproduce with the exact command above; raw error and environment are attached.
  The cause is not established by this review, and no registry/census repair was attempted.
  TOOLS-02 should reconcile the preserved table and fresh census and restore reproducibility.
- **KC3-R3-RAW-02 — P3.** The existing candidate checker exits on `git diff --check B H` whitespace
  warnings in preserved historical review diffs/logs, before returning its identity result.
  [Raw warnings](review-03/candidate-diff-check.txt) and
  [checker output](review-03/candidate-identity.stdout.json) are attached. Independent Git ancestry,
  tree and allowlist checks above pass. TOOLS-02 should distinguish immutable raw evidence from
  editable-source whitespace checks; candidate historical evidence was not rewritten.
- **KC3-R3-CREDIT-03 — P3, carried limitation.** Eleven value-cost registrations and five C1 mutant
  meanings lack qualifying credit under the adopted vocabulary. They remain the explicit
implementation-04/uncredited-04/007 transfer, within L-11/L-12 and owner choice 03. This review
  does not convert an observed failure into a qualifying kill or demand new tooling in this packet.

**Disposition.** No gate (a) or gate (b) finding remains. The literal KC3-11 failure is non-blocking
only because the governing owner decision explicitly routes this evidence-tooling discrepancy to
P3/TOOLS-02. The accepted claims are the current production mechanism and the finite declared search
within Q6, R1–R4 and 017; no universal proof of the evidence tools is asserted. No further redesign
or correction brief is called for by this review.

For transcription: **K1.1-correction-03 — ACCEPTED; exact reviewed H
`4b121d7ba665182b22857f049c05f019f25d0c65`; review `review-03.md`; no P0–P2 findings;
P3 KC3-R3-CENSUS-01, KC3-R3-RAW-02 and KC3-R3-CREDIT-03 assigned to TOOLS-02.** This accepts neither
a later revision nor its recording commit. Candidate files are unchanged, and review artifacts are
uncommitted. No merge, hold release or successor release was performed or authorized by this review.
The [final integrity record](review-03/final-integrity.json) checks the clean C and unchanged H
files; the [SHA-256 manifest](review-03/manifest.json) covers this report and all attached evidence.

ACCEPT

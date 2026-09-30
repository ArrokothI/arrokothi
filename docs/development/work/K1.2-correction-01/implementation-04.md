# Implementation report — K1.2-correction-01, round 4

Codex implementation team, 2026-09-28. This report records implementer work, not independent acceptance.

## Identity

- Packet/parent: K1.2-correction-01 / K1.2; [contract revision 5](contract.md), carrying parent revision 9 C1–C15 and DEC-1–20. Governing 006/008/012 baseline B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- State: **WAITING_FOR_REVIEW**, an implementer assessment only. Owner release: `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`; invalidation-01 and invalidation-02 holds remain. Owner messages are transcribed verbatim as [decision-03](../K1.2/decision-03.md) and [decision-04](../K1.2/decision-04.md); decision-04 supersedes decision-03 item 1 only.
- Prerequisites: accepted K1.1/correction-01 H `52b1600f3b42e3a360fdc3395178f1d147edf304`, integrated at `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`; accepted K1.1-correction-02 H `719abbf9e55e7489b6255a08cbb9e97a1e960a5e`, integrated at `954d31b00eb7f2412c22ccf7d4d079699f0c4032`. Those integrations and the release are in the full cumulative ancestry. KC2's historical acceptance remains recorded while its V-D1 claim is held.
- Branch: `codex/k1.2-correction-01-activation-identity`; configured origin `https://github.com/ArrokothI/arrokothi.git`. Owner-directed pushed start: `3287640f045cf2e6adeefcd32f21d897480a6a7d`. Previous reviewed H: `d5ffd35f4d659ed685449119b8372c2efbde6204`, C `652e5e73478684651cff697fef2a3ddbe34458e0`; [review 06](review-06.md).
- Payload C: `2b8a50297ebe83cb0922bb239aa834a2ecebc1ac`; candidate H: the commit containing this report, supplied in full in the external handoff. C..H contains only the exact administrative allowlist below.
- Owner-authorized workflow departure: continue the existing cumulative correction branch from 3287640, instead of starting a fresh branch at main. B..C is linear (62 commits, no merges). All commits are forward descendants; no checkout was switched, no other worktree was changed, and no history was amended/rebased. The working tree was clean at the specified start and throughout final C validation.
- Intermediate payloads `a09223b0c27cd9831b2a85c948a57c8b347c3547` and `7249a64ce98ccebb9bd082909cdbbcced14fdb5c` predate the final owner boundary and additional string repair. Their exploratory runs are not the final evidence. The 7249a64 full run was intentionally stopped when decision-04 arrived; all final required commands were rerun on C.
- Push: pending at report construction; the external handoff supplies the verified advertised H after the non-force correction-branch push. No main/other branch push, merge or successor release.

## Changes and coverage

### Bounded corrections

The cumulative B..C includes the full K1.2 candidate and previous corrections. The 3287640..C delta is 29 files, 2,158 insertions and 69 deletions. This round changes Kernel value refusal work and its proof; Runtime/Driver or deployment semantics do not change.

1. `values.ts` now describes a rejected/thrown value using only `null`/`typeof`. All four describe callers keep their required structural observations, issue codes and paths. No diagnostic constructor/name/message/coercion/array/prototype lookup or caller-sized type label remains. Every other message producer was traced to fixed literals or bounded Kernel primitives; path bounds precede concatenation.
2. The additional plain-string repair checks UTF-16 length before character access: a valid string of at most 65,536 scalars cannot exceed 131,072 units. This prevents the engine from flattening an arbitrarily large rope during the first otherwise bounded read. The same helper owns string values and member names. Full refusal byte charging, byte stops, accepted canonical values and read-count upper bounds remain unchanged. A string over that preflight threshold reports `string_too_long` even if it also contains a lone surrogate; no malformed string is repaired or accepted.
3. The exact-coordinate oracle independently derives every receipt token/boundary/position, including creation and ingress, and verifies both redelivery answers, carried Event destinations, visible/inspected Execution IDs, queued Event IDs and mailbox Input IDs. It covers two Executions with unrenderable IDs, both terminal kinds, all eight acceptance positions and exact aliases. It checks expected spelling before using whole-view comparisons for forbidden mutations. Production coordinate logic is unchanged.
4. Values.md owns the decision-04 boundary: no time bound is claimed for values containing live Proxies. Kernel-selected work and plain data remain bound. Descriptor/handler count tests cover structural operations, each position, coherent acceptance, exact weights, byte stops and eager Outcome roots. Engine-induced callbacks within those operations are not counted or promised. No Proxy detection/refusal, observation reuse or process-boundary change is introduced.

### Proof and semantic closure

The pre-code maps are [coverage-05](coverage-05.md) and [exact coverage](exact-coverage-04.md). The detailed source/consumer inventories are [diagnostic closure](diagnostic-closure-04.md), [string closure](string-closure-04.md) and the dated final disposition in [cumulative audit](cumulative-audit-04.md). Those notes preserve their earlier states and identify subsequent owner resolutions explicitly.

Selected 012 methods: normative source/decision reconstruction, deterministic execution, in-process race/fault schedules, independent expected-value oracles, mutation discrimination, comparative cost observations and process/document checks. Whole-result assertions include every affected receipt, progress revision, epoch, batch, queue/mailbox, output/disposition, hold/history and Driver delivery. Hidden scope observes no root; visible callers without grants still capture eagerly but learn no content diagnostics. Losing calls append only their allowed refusal and leave the exchange answerable.

| Criteria | Final implementer assessment and evidence |
|---|---|
| C1 scope / C2 replay | Scope, control authority and replay order remain unchanged. Visibility/getter tests, exact original-receipt retries and accepted-ID conflict tests pass; replay changes no accepted state. |
| C3 refusal / C13 observation | Type-only diagnostics and the string preflight close Kernel-selected work; byte charges and single observations remain. Plain-data and thrown-value evidence, all root consumers, eight eager roots and mutations pass. Proxy engine work uses the explicit owner boundary, with selected counts pinned. |
| C4 atomic acceptance | Existing transaction/hostile/reentrancy schedules and original/correction mutants preserve one writer, the whole batch and atomic progress/output/receipt/hold changes. |
| C5 next/terminal / C6 ingress | Continue starts a new exchange; complete/fail retain exact acknowledgments and terminal disposition of outside-batch Events. Creation/input replay after terminal preserves original receipts. |
| C7 unsupported work | Effects, await and obligation envelopes still refuse whole, without unsupported records or reading unsupported wait payloads. |
| C8 takeover | Reentrant Driver safety checks and epoch/grant fences remain. Exact replacement answers, receipts/history, retired-grant refusals and retry-only same-epoch delivery pass. |
| C9 recovery / C10 protocol | Captured availability roots preserve weights; exact hold and history coordinates and both clear paths remain covered. Explicit diagnostic payload semantics are preserved. |
| C11 delivery reports | Late reports only settle their retained delivery row across retry, takeover, accepted Outcome and later exchange. Whole-view and reference assertions preserve receipts and logical state. |
| C12 evidence | All Z1–Z16 and retained X8–X23 reject. Independently derived coordinates cover every mint, answer, delivery and inspection site identified by the source map. |
| C14 structure | No public export, provider dependency or production module added; structural conformance and ownership inventory pass. |
| C15 records | Canonical owner, baseline, contract, markers and decision provenance agree. Historical records and process documents remain sealed; final C/H scope and accessible raw evidence are verified. |

These assessments cover the whole cumulative packet; they are not independent acceptance. The final raw results below, including nonzero historical checks, take precedence over intermediate notes.

### Tests, documentation and provenance

- Added 20 diagnostic/string tests. The original four exact-coordinate schedules are strengthened. No test file is removed. Existing representation assertions in three test files now require fixed type labels instead of caller constructor names; their code/count/authority/state assertions remain. Direct renderer 1,024/1,025 boundaries remain tested.
- Layer-3 changes are in values.md and the existing diagnostic-storage marker. The baseline records the selected type-label representation and string precheck; rewrite-index §4 records the diagnostic choice, and roadmap wording ties the eight-detail count to this binding. Decision-03/04 create or settle no additional OPEN choice, so they do not add a duplicate §4/§5 entry. Identity, creation, cycle, recovery, lifecycle, output and evidence dependencies were inspected. Layers 1/2, application guides and skills retain their meanings.
- `K12C1-R6-VALUE-TIME-01`: the reported constructor-chain mechanism is corrected on foreign-prototype and thrown-value paths, creation/ingress and eager Outcome capture before authority. Whole cost closure uses the owner's stated Proxy boundary and the additional plain-string repair.
- `K12C1-R6-EVID-01`: the evidence gap is corrected; all seven formerly surviving Z mutants now fail the exact-coordinate tests, as do all other Z variants. No production coordinate corruption was found or claimed.
- `SELF-R4-DESCRIPTOR-01` and `SELF-R4-HANDLER-01`: additional implementer-found engine dependencies, not reviewer findings. [Blocker-01](blocker-01.md) and [blocker-02](blocker-02.md) retain the concrete cases and authentic owner decisions. Both are resolved.
- `SELF-R4-STRING-01`: additional implementer-found non-Proxy allocation dependency; repaired under invalidation-02's value-capture scope. Its distinct counterexample, classification consequence, dependency closure and evidence are in string-closure-04.
- Review-06 observations O-R6-1/O-R6-2 are corrected: roadmap no longer presents a binding count as a universal rule; the ValueIssue path comment distinguishes root detail from location-free suffix counts.
- Prior closed findings remain linked through [review 04](review-04.md), [review 03](review-03.md), [implementation 03](implementation-03.md), [implementation 02](implementation-02.md) and parent [review 14](../K1.2/review-14.md). SELF-R3-PATH-01 and earlier SELF-DIAG findings keep their implementer provenance. Historical acceptance is not extended to this candidate.
- No legacy module/dependency retired. The supported SDK/core bridge remains K1.4 work; native fidelity, persistence and retention remain with R1/K3/K4/K5. No successor starts.
- Third-party use: no new source, asset, dependency or service incorporated. Existing locked `canonicalize@3.0.0` and installed tooling are unchanged; no install, lockfile or manifest change. ECMAScript was consulted as primary explanatory reference for Proxy machinery; probes and tests are independently written. This is not a new license-clearance claim.

## Validation and interpretation

Final validation ran sequentially on clean C with `node docs/development/work/K1.2-correction-01/validate.mjs /tmp/k12-correction-04-final-validation`, from `/Users/rex-shih/Documents/ArrokothI/arrokothi`. The temporary directory is not the evidence dependency: its complete outputs are attached under validation-04. Every log names C, command and environment; [13-results.json](validation-04/13-results.json) records argument arrays, TREE/MODE/PRE, timestamps, exit/signal/error and clean status after the run. [00-environment.json](validation-04/00-environment.json) records Node v25.2.1, npm 11.6.2, TypeScript 5.9.3 and Darwin arm64 25.6.0. [MANIFEST.sha256](validation-04/MANIFEST.sha256) covers all 41 other attachments byte-for-byte; its SHA-256 is `f4576cefb4f2c838031d20833fd250e01add53a24003507b0710cadc8914b1af`.

| Command / raw output | Exit | Observation |
|---|---:|---|
| [01-typecheck](validation-04/01-typecheck.txt) | 0 | TypeScript passed |
| [02-full](validation-04/02-full.txt) | 0 | 3,322/3,322 |
| [03-kernel](validation-04/03-kernel.txt) | 0 | 1,268/1,268 |
| [04-conformance](validation-04/04-conformance.txt) | 0 | 1,945/1,945 |
| [05-sdk](validation-04/05-sdk.txt) | 0 | 22/22 |
| [06-builder-docs](validation-04/06-builder-docs.txt) | 0 | 72 files; 1,824 local links/anchors; 38 imports |
| [07-original-ablations](validation-04/07-original-ablations.txt) | 1 | Control 1,268/1,268; 32/36 rejected; B6/B12/B13/B14 NOT APPLICABLE |
| [08-correction-ablations](validation-04/08-correction-ablations.txt) | 0 | Control 571/571; 67/67 rejected |
| [09-r11-probe](validation-04/09-r11-probe.txt) | 0 | 8/8 stale_exchange; accepted state unchanged |
| [10-records-links](validation-04/10-records-links.txt) | 0 | Ancestry/preservation; 20 files, 648 local links/anchors |
| [11-evals](validation-04/11-evals.txt) | 0 | 12/12 |
| [14-original-ablations-adapted](validation-04/14-original-ablations-adapted.txt) | 0 | Control 1,268/1,268; 36/36 rejected |
| [15-review-identity](validation-04/15-review-identity.txt) | 0 | Exchange 10, exact variants/replay and surrogate outputs correct |
| [16-review-maxlen](validation-04/16-review-maxlen.txt) | 0 | Five recorded refusals; reasons 104–158 units |
| [17-review-namespace](validation-04/17-review-namespace.txt) | 0 | Known engine-allocation qualification reproduced; complete/Emission throw, no-Emission continue accepts |
| [18-diagnostics-maxlen](validation-04/18-diagnostics-maxlen.txt) | 0 | 21/21 asserted cases at MAX_STRING_LENGTH minus 16 |
| [20-review-aggregate](validation-04/20-review-aggregate.txt) | 0 | Outcome 757 units, recovery 519; one refusal; valid follow-up accepts |
| [21-review-equality](validation-04/21-review-equality.txt) | 0 | Wrong identities stale; two distinct 129-unit Emission keys accepted |
| [23-review-cost-accept](validation-04/23-review-cost-accept.txt) | 0 | 811 ms; heap +20 MiB |
| [24-review-cost-refuse-undefined](validation-04/24-review-cost-refuse-undefined.txt) | 0 | 208 ms; heap +3 MiB |
| [25-review-cost-refuse-ctor](validation-04/25-review-cost-refuse-ctor.txt) | 0 | 989 ms; heap +5 MiB |
| [26-review-aggregate-pre-authority](validation-04/26-review-aggregate-pre-authority.txt) | 0 | Unauthorized 216 units / stale epoch 144; one refusal each |
| [27-revision4-ablations](validation-04/27-revision4-ablations.txt) | 1 | Control 35/35; X8–X23 and V1–V4 rejected (20/21); V5 equivalent survivor |
| [28-review4-p4-p5](validation-04/28-review4-p4-p5.txt) | 0 | P4 13/13; six P5 modes completed |
| [30-review6-exact-ablations](validation-04/30-review6-exact-ablations.txt) | 0 | Control 1,268/1,268; Z1–Z16 all reject in exact-coordinate tests |
| [31-diagnostic-work-ablations](validation-04/31-diagnostic-work-ablations.txt) | 0 | Control 20/20; T1–T4 all reject |
| [32-review6-cost-and-blocker](validation-04/32-review6-cost-and-blocker.txt) | 0 | R-P1/P4 repeated three times; R-P2/R-P5; R-P3 20/20; descriptor counts pass |
| [33-round4-diff-check](validation-04/33-round4-diff-check.txt) | 0 | 3287640..C whitespace-clean |
| [34-handler-direct-0](validation-04/34-handler-direct-0.txt) | 0 | 32,768 indexed descriptors; 32,776 reads; 16 own-key / 8 prototype calls; logical assertions pass |
| [34-handler-direct-1000](validation-04/34-handler-direct-1000.txt) | 0 | 32,768 indexed descriptors; 32,776 reads; 16 own-key / 8 prototype calls; logical assertions pass |
| [34-handler-direct-10000](validation-04/34-handler-direct-10000.txt) | 0 | 32,768 indexed descriptors; 32,776 reads; 16 own-key / 8 prototype calls; logical assertions pass |
| [34-handler-outcome-0](validation-04/34-handler-outcome-0.txt) | 0 | 32,768 indexed descriptors; 32,776 reads; 16 own-key / 8 prototype calls; logical assertions pass |
| [34-handler-outcome-1000](validation-04/34-handler-outcome-1000.txt) | 0 | 32,768 indexed descriptors; 32,776 reads; 16 own-key / 8 prototype calls; logical assertions pass |
| [34-handler-outcome-10000](validation-04/34-handler-outcome-10000.txt) | 0 | 32,768 indexed descriptors; 32,776 reads; 16 own-key / 8 prototype calls; logical assertions pass |
| [35-string-work](validation-04/35-string-work.txt) | 0 | 11 fresh processes; zero oversized character reads; exact logical results |
| [29-round3-diff-check](validation-04/29-round3-diff-check.txt) | 2 | Sealed validation-03 quoted whitespace only |
| [22-correction-diff-check](validation-04/22-correction-diff-check.txt) | 2 | Sealed historical quoted whitespace only |
| [19-round2-diff-check](validation-04/19-round2-diff-check.txt) | 2 | Sealed historical quoted whitespace only |
| [12-diff-check](validation-04/12-diff-check.txt) | 2 | B..C sealed historical quoted whitespace only |


All unmutated test suites passed without failed, cancelled, skipped or todo tests. Mutant rejection requires actual assertion failures; missing anchors, cancellation and setup errors never count. The sealed original runner's B6/B12/B13/B14 anchor misses remain disclosed; its adapted 36/36 result supplies the substitute evidence without rewriting the sealed runner.

The retained revision-4 runner rejects X8–X23 and V1–V4, but **V5 survives as equivalent**: it removes the private message-retention guard after the sole caller-sized message producer has been eliminated. Every live producer now supplies a fixed bounded message, so that mutant cannot alter an observation. The guard remains, the direct renderer's 1,024/1,025 edges remain tested, and T1/T2 deliberately restore the unsafe producer/lookup (including unchanged output text). T3 adds the unwanted structural diagnostic lookup; T4 removes the string preflight. All four cause actual maintained-test failures. V5 is not claimed as rejected, and its runner's exit 1 is retained.

The collector exits **1** because it retains both ablation exceptions and the four historical diff-check exits **2**. No command times out, signals or fails to load. The 3287640..C correction diff check exits 0. Earlier-range diff checks quote whitespace already present in sealed historical evidence. The new raw attachments preserve that output, so C..H can show whitespace warnings on those quoted lines too; no payload/document whitespace defect is hidden by this disclosure.

[R6 comparative output](validation-04/32-review6-cost-and-blocker.txt) retains every run:

| Shape | Observed time | Other facts |
|---|---:|---|
| Accepted zeros / empty objects / empty arrays (three runs each) | 676–694 / 981–1,002 / 1,224–1,277 ms | 1,040,639 / 1,044,651 / 1,044,651 canonical bytes |
| Accepted arrays at depth 32 and exactly 1 MiB (three runs) | 2,604–2,695 ms | Heap +182–186 MiB |
| Foreign-prototype refusal, D=0/1,000/10,000 (nine runs) | 1,409–1,517 ms | 1,044,481 issues in ten records; heap +5.7–9.8 MiB; no depth-dependent growth |
| Thrown-value refusal at the same depths (nine runs) | 1,964–2,155 ms | Exactly 1,044,480 trap calls; diagnostic property reads remain zero in deterministic tests |
| No-grant Outcome, one / eight roots at D=0 and D=10,000 | 1,420 / 11,147 ms versus 1,417 / 11,173 ms | Unauthorized refusal; exchange unchanged |
| Creation/ingress, D=0 and D=10,000 | 1,401–1,456 ms | Correct malformed-value refusals |
| Descriptor chain D=0 versus D=10,000 | About 24–26 ms versus 5,708–5,738 ms | Same 32,768 indexed descriptors and 32,776 reads; Proxy engine time excluded by owner decision |

Refusal remains slower than the simpler zero/empty-container acceptance shapes; the exact-limit
depth-32 acceptance is more costly. All comparisons are retained, without choosing the cheapest
acceptance as a universal threshold or treating a single timing as a proof. Eager eight-root cost
scales with eight independently permitted roots; no new aggregate semantic cap is implied.

[Handler direct](validation-04/34-handler-direct-10000.txt) and
[handler Outcome](validation-04/34-handler-outcome-10000.txt) at D=10,000 take about 5.61/5.74 s,
with the same selected counts as depth 0/1,000. Those observations substantiate the owner boundary;
they do not claim a time bound for Proxy values.

The [plain-string probe](validation-04/35-string-work.txt) refuses rope strings of 1,048,576,
16,777,216 and 268,435,456 units in about 0.25–0.26 ms with about 0.12 MiB additional heap and
zero oversized character reads. Its pre-flattened control gives the same logical result. Creation,
ingress and eight eager roots also make zero oversized reads; the eight-root case takes about
1.15 ms and +0.62 MiB heap. Accepted control shapes remain at their exact near-limit sizes.


These observations identify mechanisms and compare the stated shapes; they are not universal timing thresholds or peak-memory proofs. Deterministic zero-lookup/zero-character-read assertions, selected-operation counts, exact limits, source reconstruction and mutations carry the regression proof. Eager roots retain separate budgets and the existing capture-before-authority ordering. Descriptor/handler timing is explicitly outside the owner-scoped live-Proxy time claim; their count/state assertions remain required.


No required contract command was omitted. External fixture prepared / external gate executed / external decision: none / none / none. Native Runtime quality or Driver fidelity, physical containment, process-death/durable recovery, public packaging and E gates are outside this packet. Node 22 was not run; the local Node version meets 22.9+, without a cross-version claim.

The known extreme trusted-namespace string-allocation limit remains as documented in the baseline: complete/Emission derivation can throw before mutation, while no-Emission continue accepts. Protocol/delivery explicit diagnostics preserve DEC-6's prefix semantics; bounded retained text is not a general engine-time bound for arbitrary live diagnostic strings. No CPU preemption, hostile-code containment, whole-message semantic cap, timing nondisclosure or lifetime evidence-storage cap is claimed.

No known mandatory in-scope defect, unresolved authority or missing required result remains. The strongest remaining risk is a correlated assumption about adversarial JavaScript or an oracle site; independent review should reconstruct the plain-data cost argument, owner boundary and all exact coordinate sites, rather than infer acceptance from pass counts.

## Exact C..H administrative allowlist

Only this report, the correction's 007 status row, and the following output/digest attachments are permitted. No script, evaluator, fixture, threshold, test or semantic document is added in H.

```text
docs/development/007-work-packets.md
docs/development/work/K1.2-correction-01/implementation-04.md
docs/development/work/K1.2-correction-01/validation-04/00-environment.json
docs/development/work/K1.2-correction-01/validation-04/01-typecheck.txt
docs/development/work/K1.2-correction-01/validation-04/02-full.txt
docs/development/work/K1.2-correction-01/validation-04/03-kernel.txt
docs/development/work/K1.2-correction-01/validation-04/04-conformance.txt
docs/development/work/K1.2-correction-01/validation-04/05-sdk.txt
docs/development/work/K1.2-correction-01/validation-04/06-builder-docs.txt
docs/development/work/K1.2-correction-01/validation-04/07-original-ablations.txt
docs/development/work/K1.2-correction-01/validation-04/08-correction-ablations.txt
docs/development/work/K1.2-correction-01/validation-04/09-r11-probe.txt
docs/development/work/K1.2-correction-01/validation-04/10-records-links.txt
docs/development/work/K1.2-correction-01/validation-04/11-evals.txt
docs/development/work/K1.2-correction-01/validation-04/12-diff-check.txt
docs/development/work/K1.2-correction-01/validation-04/13-results.json
docs/development/work/K1.2-correction-01/validation-04/14-original-ablations-adapted.txt
docs/development/work/K1.2-correction-01/validation-04/15-review-identity.txt
docs/development/work/K1.2-correction-01/validation-04/16-review-maxlen.txt
docs/development/work/K1.2-correction-01/validation-04/17-review-namespace.txt
docs/development/work/K1.2-correction-01/validation-04/18-diagnostics-maxlen.txt
docs/development/work/K1.2-correction-01/validation-04/19-round2-diff-check.txt
docs/development/work/K1.2-correction-01/validation-04/20-review-aggregate.txt
docs/development/work/K1.2-correction-01/validation-04/21-review-equality.txt
docs/development/work/K1.2-correction-01/validation-04/22-correction-diff-check.txt
docs/development/work/K1.2-correction-01/validation-04/23-review-cost-accept.txt
docs/development/work/K1.2-correction-01/validation-04/24-review-cost-refuse-undefined.txt
docs/development/work/K1.2-correction-01/validation-04/25-review-cost-refuse-ctor.txt
docs/development/work/K1.2-correction-01/validation-04/26-review-aggregate-pre-authority.txt
docs/development/work/K1.2-correction-01/validation-04/27-revision4-ablations.txt
docs/development/work/K1.2-correction-01/validation-04/28-review4-p4-p5.txt
docs/development/work/K1.2-correction-01/validation-04/29-round3-diff-check.txt
docs/development/work/K1.2-correction-01/validation-04/30-review6-exact-ablations.txt
docs/development/work/K1.2-correction-01/validation-04/31-diagnostic-work-ablations.txt
docs/development/work/K1.2-correction-01/validation-04/32-review6-cost-and-blocker.txt
docs/development/work/K1.2-correction-01/validation-04/33-round4-diff-check.txt
docs/development/work/K1.2-correction-01/validation-04/34-handler-direct-0.txt
docs/development/work/K1.2-correction-01/validation-04/34-handler-direct-1000.txt
docs/development/work/K1.2-correction-01/validation-04/34-handler-direct-10000.txt
docs/development/work/K1.2-correction-01/validation-04/34-handler-outcome-0.txt
docs/development/work/K1.2-correction-01/validation-04/34-handler-outcome-1000.txt
docs/development/work/K1.2-correction-01/validation-04/34-handler-outcome-10000.txt
docs/development/work/K1.2-correction-01/validation-04/35-string-work.txt
docs/development/work/K1.2-correction-01/validation-04/MANIFEST.sha256
```

## Handoff

Ready for independent cumulative review of B..H, contract revision 5 and the exact C..H administrative range. External handoff supplies full B/C/H and the verified advertised correction-branch SHA. No self-acceptance, integration, merge or successor release. Both invalidation holds remain owner-controlled.

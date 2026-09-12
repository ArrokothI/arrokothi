# Independent review — K0.2, round 12

## Reviewer, date, identity

- **Reviewer:** OpenAI ChatGPT, GPT-5.6 Sol, High reasoning.
- **Role:** independent reviewer. I did not implement C12/H12.
- **Review date:** 2026-09-12 (America/New_York).
- **Governing base:** `c079237ee7aff428481426f93e87a68b79f170d4`.
- **Previously reviewed H11:** `0bcea0c08943c355d53541b54f3def8c91b1a237` — round 11 `CHANGES REQUIRED`.
- **Round-11 review record:** `01324a7da962bd5d044e54d79db8a611a70a5d6c` (`review-11.md`).
- **Corrected clean payload C12:** `05855f446e52e542e3e6fd52f58d7cfaa105253a`.
- **Reviewed candidate H12:** `e7684a6905a8e406562a159b68f622a5bb528e24`.
- **Branch reviewed:** `codex/k0.2-public-controls-e0-gate`.
- **Benchmark revision inspected read-only:** `98756f8c10bd806125da8318f1a129bc030aca61`.

This review is bound to H12 exactly. The reviewer-record commit containing this file is administrative provenance and is not part of H12.

## Access and validation limits

I reviewed through the authorized GitHub connector: exact refs/commits, A11→C12 correction delta, C12→H12 administrative/evidence delta, cumulative base→C12 inventory, governing 006/007/012 sources at the pinned base, the accepted K0.1 worksheet and canonical Kernel/execution protocol, C12 contract/specification, command/observation and protocol vocabulary, scenarios, coverage/candidates/regressions/interactions, implementation-12, prior findings reached by the corrections, attached raw validation output and the benchmark repository.

I had no local checkout and did not independently rerun commands. Unlike earlier rounds, H12 contains immutable raw output attachments about clean C12, which 006 expressly permits in H when declared as C output rather than executable payload. I inspected the pinned logs. GitHub exposes no combined status checks and no pull-request workflow runs for C12 through the available connector, so these are inspected implementer-run logs, not reviewer-rerun CI.

## Identity and handoff verification

The round-12 history is clean and linear.

- `01324a7da962bd5d044e54d79db8a611a70a5d6c` → C12 is exactly one correction commit touching ten K0.2 contract/specification/conformance files.
- C12 → H12 is exactly one administrative/evidence commit. It contains only `docs/development/007-work-packets.md`, `docs/development/work/K0.2/implementation-12.md`, and six output-only files under `docs/development/work/K0.2/validation-12/` (`typecheck.log`, `npm-test.log`, `conformance.log`, `sdk.log`, `k0.log`, `builder-docs.log`). No script, fixture, evaluator rule, threshold or configuration rides in H12.
- H12's direct parent is C12.
- The report names C12, command/environment information and SHA-256 digests for each attached log, satisfying 006's H-attachment rule.
- The cumulative base→C12 compare is 34 commits ahead and 41 changed files, all in the K0.2 development/conformance family plus the packet ledger/history already reviewed in prior rounds.
- Repository `main` remains `c079237ee7aff428481426f93e87a68b79f170d4`.

I do **not** recommend reverting C12. There is also no local semantic correction to fix forward from C12 at this review. The only blocking criterion is external C8.

## Round-11 finding dispositions

### K02-R11-01 — R3-c7 readiness preconditions — **CLOSED**

C12 supplies the missing causal precondition without bundling another failure.

`control-whole-envelope-validation` now accepts `cont-1` after the Activation has already pinned `[in-1]`. The Event therefore remains accepted and unacknowledged outside the current batch. The later rejected Outcome proposes the structurally valid subscription-only `g-good` wait and independently contains duplicate emission key `em-1`.

If that Outcome were accepted, W-2 step 1 would acknowledge only `[in-1]`; `cont-1` would remain unacknowledged, W-2 step 2 would find it eligible under `g-good`, and B-6 path A would create Event-triggered readiness. The outer duplicate-emission error nevertheless requires OA-3/OA-5 to reject the whole Outcome. That is exactly the schedule review-11 asked for.

R3-c7's violating transcript now represents one plausible ordering defect: the W-2/B-6 readiness writer commits before whole-envelope validation finishes. It preserves the correct `malformed_envelope` rejection, `RUNNING`, the unresolved Activation and `[in-1]` batch, queued `cont-1`, zero progress/emissions/acknowledgment/Effect intent, no live wait and no accepted deadline, and changes only `waitEndedReadiness` to `{ generation: "g-good", species: "event" }`. It no longer needs a second bug that invents readiness for an unsatisfied wait.

The regression guard derives the actual eligibility and verifies that `cont-1` lies outside the pinned batch; the later valid-Outcome evidence was shifted rather than lost. This closes K02-R11-01 and, with R3-c5/R3-c6/R3-c4 already sound, fully closes the residual K02-R10-01 OA-5 family.

### K02-R11-02 — producer component of ID-2 — **CLOSED**

C12 now makes the producer component independently distinguishable at subsequent application ingress.

`FixtureEvent` is a discriminated union: application inputs require `producer` and `requestKey`; Kernel Events/timeouts do not borrow that identity. In `identity-producer-scope`, the sharp ingress schedule holds destination `exec-pa` and raw request key `k` fixed while changing only the authenticated producer from `prod-a` to `prod-b`. Both fresh inputs obtain separate mailbox acceptance positions.

R1-e1 models the exact wrong implementation review-11 required: an ingress dedup index keyed on `(destination, requestKey)` while omitting producer. It silently absorbs B as A's replay, changing only `queued`. R1-e2 separately owns exact same-full-identity replay (no second append). R1-e3 owns the recorded conflict answer for same full identity with changed content, while R1-e4 separately owns zero accepted-content/order mutation beside that correct conflict. These are distinct single-field counterexamples rather than one bundled identity test.

The downstream schedule then proves the two accepted producers are not merely visible at ingress: W-2 path A sees both after acknowledging only the pinned initial batch, B-6 bound 1 selects the first accepted eligible input, the accepted Outcome acknowledges only that reserved input, the other input receives B-5 terminal disposition, and a fresh terminal input is refused rather than assigned an acceptance position. The corpus interaction sweep also exercises fresh/replay/conflict/terminal application ingress in RUNNING and WAITING states and verifies producer metadata never becomes a wait selector.

I specifically checked that the new `eventId` field does not replace the ID-2 authority in these guards: replay/conflict lookup is keyed on `[producer, destination, requestKey]`, and the producer-only counterexample passes through the same destination/key. Event IDs remain fixture-supplied mailbox/acceptance-position labels. No opaque ingress token spelling is invented; the fixture continues to use the worksheet's broader “receipt / acceptance position” abstraction.

This closes K02-R11-02 and fully closes the residual K02-R10-03 producer/receipt-surface finding.

### K02-R11-03 — stale live self-descriptions — **CLOSED**

The scenario header now says thirteen scenarios/six of thirteen, and contract revision 12 correctly records that revision 11 corrected revision 10 after round-10 review. Historical reports/reviews remain immutable.

### K02-R10-02 and earlier closed findings — **remain CLOSED**

The C11 redelivery/takeover correction remains intact: late `in-2`, `redeliver_dispatch`, R2-c3/d1/d2/d3, R2-c4's shared stale-writer owner and retained input across the taken-over exchange are unchanged. I also rechecked the accepted-deadline lifecycle, g3/res-3 B-6 path B, per-family receipt/Activation-ID normalization, stale-timer physical/mechanism neutrality, cancellation splits, completion assignment and Effect-intent refusal. I found no dependent reason to reopen them.

`K0.2-SELF-01` (the pre-existing raw-text import-scanner false-positive issue) is unchanged and outside this packet's semantic fixture correction; C12 does not touch the scanner and K0.2 does not use it as semantic proof. Per 006's rule against relitigating an unchanged administrative exception without cause, I do not reopen it here. Architecture guards are represented in the full-suite raw output rather than treated as proof of the Kernel fixture itself.

## Additional cumulative review note

### K02-R12-01 — P3 — introductory ledger prose is stale, authoritative row is current

The live introduction of `007-work-packets.md` still says K0.2's “round-1 candidate is now `BLOCKED_EXTERNAL` ... after two CHANGES REQUIRED rounds and their corrections”. The authoritative K0.2 ledger row immediately below is current through round 12, names C12 and the round-11 findings, and correctly keeps C8 `BLOCKED_EXTERNAL`.

This is provenance wording drift only; it does not change packet state, candidate identity, a criterion, or the external unblock condition. **P3: non-blocking.** Do not create another local candidate solely to edit this sentence. Correct it opportunistically when the next required evidence/status candidate is created.

## Validation evidence

The H12 attachments give independently inspectable raw output for clean C12:

- `npm run typecheck`: exit 0 (recorded in `typecheck.log`).
- `npm test`: 1516 tests / 263 suites / 1516 pass / 0 fail / 0 skipped.
- `npm run test:conformance`: 1407 pass / 0 fail / 0 skipped.
- K0 fixture command: 551 tests / 52 suites / 551 pass / 0 fail / 0 skipped.
- `npm run test:sdk`: 22 pass / 0 fail / 0 skipped.
- `npm run check:builder-docs`: 26 Markdown files, 280 local links/anchors, 38 public package imports.

The report records Node v26.8.1, npm 11.19.0, TypeScript 5.9.3, the existing installed lockfile dependencies, clean C12 and no dependency installation/change. `npm test` continues to imply 965 non-K0 tests (`1516 - 551`), matching the prior baseline count. I inspected the attached outputs but did not independently execute them or recompute every SHA-256 digest.

## Per-criterion verdicts

| Criterion | Verdict | Review basis |
|---|---|---|
| K0.2-C1 | **PASS** | The deterministic K0 trace remains coherent and its row-attributed assertions/interactions remain represented. |
| K0.2-C2 | **PASS** | Delayed Runtime / same-coordinator non-blocking evidence remains coherent. |
| K0.2-C3 | **PASS** | Independent sink/ledger retained-reference and accepted-key-space protections remain intact. |
| K0.2-C4 | **PASS** | Direct-baseline/shared-laboratory contract remains intact. |
| K0.2-C5 | **PASS** | Both public application shapes remain prepared without claiming benchmark acceptance. |
| K0.2-C6 | **PASS** | Unsafe/state-loss controls remain semantically correct and implementation-neutral, including the accepted-deadline/timer distinction. |
| K0.2-C7 | **PASS** | The oracle now has honest candidate-level discrimination for the previously missing OA-5 readiness and ID-2 producer cases; refusing real-tree candidate remains explicit. |
| K0.2-C8 | **FAIL — BLOCKED_EXTERNAL** | Required accepted benchmark E0 evidence is still absent. |
| K0.2-C9 | **PASS** | The assertion-granular coverage map and dependent interaction sweep now account for the reviewed K0.1 decision-level obligations without the round-11 gaps. |

## External blocker

C8 remains a genuine external blocker, not an architecture ambiguity and not a local K0.2 code/test defect.

- **Responsible actor:** benchmark repository owner.
- **Unavailable input:** accepted E0 fixture/config identities, raw observations, evaluator version and actual E0 decision at a pinned benchmark revision.
- **Unblock condition:** an accepted E0 deliverable/evidence record at a pinned benchmark revision, recordable in this repository and independently inspectable.

Arrokothi `main` remains `c079237ee7aff428481426f93e87a68b79f170d4`. Benchmark `main` remains `98756f8c10bd806125da8318f1a129bc030aca61`; its `docs/roadmap.md` still states that E0–E6 are planned, not implemented by that revision. No E0 acceptance is claimed or inferred.

Because C8 is mandatory, K0 remains open and K1.0 remains unreleased. The local fixture should now be held stable rather than churned while waiting for the benchmark-owned gate.

## Verdict

**CHANGES REQUIRED**

This verdict is **solely because K0.2-C8 remains `BLOCKED_EXTERNAL`**. C1–C7 and C9 pass this independent review; K02-R11-01/-02/-03 are closed and no new blocking local finding was found.

Do not revert C12/H12 and do not cut another local payload merely to create review motion. Preserve H12 as the reviewed local candidate while the benchmark owner produces and accepts E0 evidence. Once that external evidence exists, create the minimum new candidate needed to bind the pinned benchmark revision/artifact identities and update the packet's evidence/status records, rerun whatever validation that new candidate affects, and submit it for independent review. The non-blocking K02-R12-01 wording drift may be corrected in that required candidate.

Do not self-accept, merge, close K0, or release K1.0 before C8 passes and the resulting candidate is independently accepted.
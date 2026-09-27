# Implementation report — K1.2-correction-01, round 2

## Identity

- Implementer: Codex (GPT-6), this coding session, 2026-09-27. Implementation self-review only.
- Packet: K1.2-correction-01, continuing the released K1.2 correction; [contract](contract.md)
  revision 3 carries forward K1.2 revision 9, C1–C15 and decisions 01/02.
- Governing base/process baseline B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
  006/008/012 are unchanged from B. Release: `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`.
- Prerequisites: K1.1 accepted H `52b1600f3b42e3a360fdc3395178f1d147edf304`, integrated
  `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`; K1.1-correction-02 accepted H
  `719abbf9e55e7489b6255a08cbb9e97a1e960a5e`, integrated
  `954d31b00eb7f2412c22ccf7d4d079699f0c4032`. Ancestry checked by check-records.
- Previous C1 `360538522be8c1b17d23948f632fd4f568a76ed0`, reviewed H1
  `6541115e2e5389a7e5cff86f87d857b4eb486d7d`; [review-01](review-01.md) at
  `449b243cd31d5596c457e091233dfc4d77a4eff4` requested changes.
- This session started from `b18a729d989dea334a86ec08bdf8773ee77de4db`, containing preliminary
  [review-02](review-02.md) of `c323e821dffbcd65114447a66593eeec9be699fb`, which had no report/H.
  Adopted the useful payload from `67555e3d4da4b6ad70685564f2224091ad48fae5` and `c323e82`,
  replaced its aggregate diagnostic design, and validated the cumulative result.
- Payload C: `6d9fbb3db4955ee2216fedf0d0b69c8e104367bf`. Candidate H: the commit containing
  this report; full SHA is supplied in the external handoff.
- Target branch: `codex/k1.2-correction-01-activation-identity`. Remote:
  `origin`, `https://github.com/ArrokothI/arrokothi.git`. Work used the separate detached worktree
  `/Users/rex-shih/.codex/worktrees/k12-correction/arrokothi`; no other checkout was switched.
  Pre-push remote branch was `b18a729d989dea334a86ec08bdf8773ee77de4db`, main was B.
- C was clean throughout final validation. Report/status/output attachments are the entire C..H
  delta, enumerated below. Push is pending when this report is written; the external handoff will
  state the observed non-force push and advertised remote SHA.

## Changes and coverage

B..C contains 291 changed files (166,902 insertions, 418 deletions), largely sealed K1.2/correction
evidence. This session's b18a729..C delta is 12 files (451 insertions, 88 deletions).
It adds 34 tests in aggregate-refusal.test.ts, adopts the previous 42 diagnostic and 495 identity
tests, and removes or changes no existing test body.

The correction belongs to Kernel refusal rendering. Runtime/Driver computation and deployment
semantics are unchanged. [Coverage-03](coverage-03.md) reconstructs the subsystem before coding;
[reconstruction](reconstruction.md) records the producer → capture → renderer → retainer paths,
why both prior diagnostic passes missed cases, and the cumulative C1–C15 audit.

- Content refusals show eight ordered details followed by exact counts for every remaining issue
  code. The complete reason is bounded by 16,384 UTF-16 units, independently of issue count or
  configured Emission capacity. DEC-5 owns the policy and proof; BASELINE describes the binding.
- Value-relative paths and messages are projected at rendering. The eager capture required by
  decision-02 remains; its raw issues carry a separate root label until a content refusal is
  selected. Creation/ingress's `explain` path stays unchanged.
- New tests distinguish wrong/current identities that both render omitted on Outcome and all
  three controls, and two distinct omitted Emission keys. They cover >128-unit, non-ASCII and
  surrogate identities, plus exact path/message edges and aggregate detail/count edges.
- The K1.2-added redelivery recovery-held reason bounds its minted Activation fragment. Explicit
  protocol diagnostics keep their 1,024-unit payload rule. This corrects the prior reconstruction's
  mistaken classification of that renderer as integrated K1.1 code.
- Correction ablations retain I1–I7 and D1–D34, add D35 for redelivery, equivalents of reviewer
  R1/R2/R4–R12 (R3 is G13), and G1–G14 for aggregate/edge/order/metadata faults. The sealed 36
  original K1.2 ablations are unchanged; the adapter only respells four diagnostic anchors.

This report explicitly supersedes implementation-01's inaccurate claims about reasons containing
only legitimate large identities, its overly broad no-content-leak conclusion, and its omission of
rendering/retention limits. It also supersedes revision 2's claim that `1,024 + 2,050N` was an
adequate aggregate bound and that DEC-2 forbade bounded issue summaries. Earlier reports and raw
records remain sealed. A diagnostic string is not a semantic identity.

### Cumulative coverage (implementer assessment)

Selected 012 methods: normative decisions, deterministic execution, in-process race/fault, and
process/documentation. Native fidelity (R1), persistence/process death (K3), public packaging (S1),
physical containment and external E gates remain outside this in-memory packet. No external fixture
or gate was newly executed, and no external acceptance decision is claimed.

| Criterion | Source trace and distinguishing evidence | Assessment |
|---|---|---|
| C1 scope | #visible and #requireControl precede request capture; existing nondisclosure/read-count suites exercise hidden/missing and denied controls | PASS |
| C2 replay | acceptedOutcomes lookup uses exact Activation text before terminal/currency/grant; identity lifecycle tests and R6 reject lossy lookup | PASS |
| C3 whole refusal | decision-02 order remains; aggregate test/probe returns and records bounded reasons; R4/R7 distinguish false equality; original B12–B20 invert order | PASS |
| C4 atomic acceptance | #accept builds records before apply; transaction/hostile tests and original A/B mutants exercise no partial acknowledgment, output or receipt | PASS |
| C5 next/terminal | terminal and identity lifecycle tests exercise continue/complete/fail and new exchange; derived-ID engine limit remains explicitly qualified | PASS within stated engine limits |
| C6 B-5/ingress | original terminal and ingress cases retain batch-only acknowledgment and outside-batch disposition, plus terminal replay/conflict | PASS |
| C7 unsupported work | original Effect/await/obligation tests and A6/A15 refuse whole without inspecting wait or creating Effect records | PASS |
| C8 takeover | control comparison R5 rejects different omitted IDs; existing safety/reentrancy/grant tests and adapted B6 cover post-callback revalidation | PASS |
| C9 recovery | all recovery roots aggregate; code-availability R2 and hold-update R11 distinguish exact pins and changed missing sets; redelivery D35 | PASS |
| C10 protocol holds | each control rejects different omitted IDs; explicit diagnostics and both clearing paths pinned by R12; malformed report retains one refusal | PASS |
| C11 late reports | existing delivery-attribution/late-report/submission-lifetime suites cover each retained attempt and old-Outcome replay | PASS |
| C12 evidence | new cases use assertOnlyRefusal for whole-view equality, returned/retained identity and freezing; original transaction/evidence suites cover positions | PASS |
| C13 observation | capture remains eager and own-only; G9 distinguishes projection timing, G14 rejects inherited root metadata; hostile suites rerun | PASS |
| C14 boundary | no source file, public export or dependency added; original architecture inventory/import guard rerun | PASS |
| C15 records | DEC-5 and BASELINE aligned; current reconstruction corrected; existing identity allocation qualification adopted, no new Layer-3 semantics/status | PASS |

These are implementation assessments for review, not independent acceptance. Existing test bodies
are preserved and rerun; this session did not re-read every historical test or sealed log line.
The source audit follows cumulative acceptance/control/replay/hold/refusal/retention paths and the
correction's complete delta. Native Runtime behavior is unexamined by design.

### Findings and limits

- **K12C1-R2-AGG-01:** corrected. The reviewer engine-overflow shape and several-root regression
  cases now return one bounded refusal; every omitted code contributes its exact count. G1 restores
  the unbounded renderer and is rejected; G2/G3 lose summary/counts and are rejected.
- **K12C1-R2-EVID-01:** corrected evidence. R4/R5/R7/R9 equivalents are rejected with a clean
  control. A wrong Outcome uses a valid grant so lossy equality would accept it. Both strings are
  omitted in each equality witness. Message/path tests reach their exact at-limit/one-over sizes.
- **K12C1-R1-DIAG-01:** adopted fragment repair remains covered by every renderer mutation and the
  review-01 identity/maxlen plus engine-max probes. The aggregate addition closes the other route
  to an oversized retained reason.
- **O-R2-1:** removed eager projection of every captured issue. Integrated values.ts still builds
  raw issues and has the pre-existing cost identified by review-02. It is outside this packet's
  authority; this report does not claim the broader values.md refusal-cost obligation is repaired.
- **O-R2-2:** bounded the K1.2 redelivery hold renderer and corrected its provenance. Protocol-hold
  text remains an explicit diagnostic; the complete redelivery reason is <=2,048 units.
- **O-R2-3:** disclosed below. Sealed runner output is not replaced by adapted-runner output.
- Review-01 O1 remains a documented engine allocation limit: an extreme trusted namespace can
  support continue but exceed derived Emission/result string construction limits. The probe still
  demonstrates that limit; neither identity.ts nor values.ts nor integrated creation was changed.
- Original K12-R14-ID-01/EVID-01 and earlier K1.2 closures remain linked through review-01/review-02,
  with original tests and mutations rerun. Invalidation-01's integration hold remains.
- Additional implementer-found defects: no new defect beyond review-02 in this session. The adopted
  SELF-DIAG-01/02 fragment fixes retain their earlier implementer provenance in reconstruction.
- Legacy SDK/core remain supported; no consumer migration or retirement occurred. K1.4 owns the
  bridge; K3/R1 own persistence/native fidelity and K4.4/K5 own retention. No guide/skill change is
  needed for this private binding repair. Logs still grow for the coordinator lifetime.
- Third-party reuse: **none**. No copied/adapted third-party source, dependency or service added.
  Locked dependencies were installed from the local cache with `npm ci --offline --ignore-scripts`;
  package-lock and existing canonicalize terms are unchanged.

## Validation and interpretation

All final commands ran sequentially on clean C in the worktree above through the payload
[validate.mjs](validate.mjs). Heap-heavy probes ran alone with explicit heap flags. Environment:
Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin arm64 25.6.0. Exact commands, TREE/MODE/PRE,
start/end times, exit status and C are recorded in each raw output and in
[results](validation-02/13-results.json); [environment](validation-02/00-environment.json) records
versions and cwd. [MANIFEST.sha256](validation-02/MANIFEST.sha256) covers every attached raw file.

| Command / raw evidence | Exit | Observation |
|---|---:|---|
| [01-typecheck](validation-02/01-typecheck.txt) | 0 | TypeScript check passed |
| [02-full](validation-02/02-full.txt) | 0 | 3,267/3,267; no failed, cancelled or skipped tests |
| [03-kernel](validation-02/03-kernel.txt) | 0 | 1,213/1,213; no failed, cancelled or skipped tests |
| [04-conformance](validation-02/04-conformance.txt) | 0 | 1,945/1,945; no failed, cancelled or skipped tests |
| [05-sdk](validation-02/05-sdk.txt) | 0 | 22/22; no failed, cancelled or skipped tests |
| [06-builder-docs](validation-02/06-builder-docs.txt) | 0 | 72 files, 1,806 links/anchors, 38 imports |
| [07-original-ablations](validation-02/07-original-ablations.txt) | 1 | Sealed: control 1,213/1,213; 32/36 rejected; B6/B12/B13/B14 NOT APPLICABLE |
| [08-correction-ablations](validation-02/08-correction-ablations.txt) | 0 | Control 571/571; 67/67 rejected; zero cancellations |
| [09-r11-probe](validation-02/09-r11-probe.txt) | 0 | 8/8 stale_exchange, accepted state unchanged |
| [10-records-links](validation-02/10-records-links.txt) | 0 | Preservation/ancestry; 11 files, 538 links/anchors |
| [11-evals](validation-02/11-evals.txt) | 0 | 12/12; no failed, cancelled or skipped tests |
| [14-original-ablations-adapted](validation-02/14-original-ablations-adapted.txt) | 0 | Substitute evidence: control 1,213/1,213; 36/36 rejected |
| [15-review-identity](validation-02/15-review-identity.txt) | 0 | Exchange 10, replay, exact variants, surrogate namespace and bounded P4 results |
| [16-review-maxlen](validation-02/16-review-maxlen.txt) | 0 | Five refusals returned and recorded; reason lengths 104–158 |
| [17-review-namespace](validation-02/17-review-namespace.txt) | 0 | Known limit reproduced: complete/Emission throw; no-Emission continue accepts |
| [18-diagnostics-maxlen](validation-02/18-diagnostics-maxlen.txt) | 0 | 21/21 asserted cases at MAX_STRING_LENGTH − 16 |
| [20-review-aggregate](validation-02/20-review-aggregate.txt) | 0 | 532,480 issues/root: Outcome 8,621 units, recovery 519; one refusal each; later answer accepted |
| [21-review-equality](validation-02/21-review-equality.txt) | 0 | E1/E2 stale_exchange; E3 accepts two distinct 129-unit keys |
| [23-review-cost-accept](validation-02/23-review-cost-accept.txt) | 0 | 692 ms; heap +12 MiB; RSS 129 MiB |
| [24-review-cost-refuse-undefined](validation-02/24-review-cost-refuse-undefined.txt) | 0 | 1,258 ms; heap +151 MiB; RSS 307 MiB |
| [25-review-cost-refuse-ctor](validation-02/25-review-cost-refuse-ctor.txt) | 0 | 1,923 ms; heap +119 MiB; RSS 328 MiB |
| [26-review-aggregate-pre-authority](validation-02/26-review-aggregate-pre-authority.txt) | 0 | No grant: unauthorized_submission (216 units); stale epoch: stale_exchange (144 units); one refusal each |
| [22-correction-diff-check](validation-02/22-correction-diff-check.txt) | 0 | b18a729..C: clean |
| [19-round2-diff-check](validation-02/19-round2-diff-check.txt) | 0 | 449b243..C: clean |
| [12-diff-check](validation-02/12-diff-check.txt) | 2 | B..C: sealed historical log whitespace only |


The collector itself exits **1**, deliberately preserving the sealed-runner exit **1** and B..C
diff-check exit **2**. The four sealed anchor misses are not counted as rejected mutations. The
adapted run verifies the sealed runner SHA-256 and changes only diagnostic spelling for those four
anchors; its 36/36 result is substitute evidence, not the sealed result. R4/R5/R7/R9 independently
fail 4/12/2/1 tests under the correction runner with its clean control.

The cumulative diff warnings point only to sealed work/K1.2 and validation-01 logs. The complete
round-2 and this session's correction ranges pass diff-check. Attaching the raw cumulative diff
output repeats its quoted whitespace in validation-02/12-diff-check.txt; a C..H whitespace check
therefore also reports those output-only quoted lines. The evidence is preserved exactly.

The aggregate and equality probes print observations rather than asserting every invariant; their
logs were inspected for classification, retained count and later acceptance. The new deterministic
tests additionally assert whole-view equality, frozen returned/retained records and no delivery.
The separate 21-case engine-max fixture has explicit assertions. The namespace probe's exit 0
means the diagnostic probe completed, not that derived-ID allocation succeeded.

Cost figures are single runs, not a controlled performance comparison. They confirm that substantial
raw capture cost remains; source and G9 establish removal of eager diagnostic projection. No timing
nondisclosure or comprehensive memory bound is claimed. No requested check was omitted. External
native/persistence/packaging/E gates are excluded as described above.


## Exact C..H administrative allowlist

No scripts, fixtures, tests, thresholds or configuration occur in H. The only paths are:

```text
docs/development/007-work-packets.md
docs/development/work/K1.2-correction-01/implementation-02.md
docs/development/work/K1.2-correction-01/validation-02/00-environment.json
docs/development/work/K1.2-correction-01/validation-02/01-typecheck.txt
docs/development/work/K1.2-correction-01/validation-02/02-full.txt
docs/development/work/K1.2-correction-01/validation-02/03-kernel.txt
docs/development/work/K1.2-correction-01/validation-02/04-conformance.txt
docs/development/work/K1.2-correction-01/validation-02/05-sdk.txt
docs/development/work/K1.2-correction-01/validation-02/06-builder-docs.txt
docs/development/work/K1.2-correction-01/validation-02/07-original-ablations.txt
docs/development/work/K1.2-correction-01/validation-02/08-correction-ablations.txt
docs/development/work/K1.2-correction-01/validation-02/09-r11-probe.txt
docs/development/work/K1.2-correction-01/validation-02/10-records-links.txt
docs/development/work/K1.2-correction-01/validation-02/11-evals.txt
docs/development/work/K1.2-correction-01/validation-02/12-diff-check.txt
docs/development/work/K1.2-correction-01/validation-02/13-results.json
docs/development/work/K1.2-correction-01/validation-02/14-original-ablations-adapted.txt
docs/development/work/K1.2-correction-01/validation-02/15-review-identity.txt
docs/development/work/K1.2-correction-01/validation-02/16-review-maxlen.txt
docs/development/work/K1.2-correction-01/validation-02/17-review-namespace.txt
docs/development/work/K1.2-correction-01/validation-02/18-diagnostics-maxlen.txt
docs/development/work/K1.2-correction-01/validation-02/19-round2-diff-check.txt
docs/development/work/K1.2-correction-01/validation-02/20-review-aggregate.txt
docs/development/work/K1.2-correction-01/validation-02/21-review-equality.txt
docs/development/work/K1.2-correction-01/validation-02/22-correction-diff-check.txt
docs/development/work/K1.2-correction-01/validation-02/23-review-cost-accept.txt
docs/development/work/K1.2-correction-01/validation-02/24-review-cost-refuse-undefined.txt
docs/development/work/K1.2-correction-01/validation-02/25-review-cost-refuse-ctor.txt
docs/development/work/K1.2-correction-01/validation-02/26-review-aggregate-pre-authority.txt
docs/development/work/K1.2-correction-01/validation-02/MANIFEST.sha256
```

## Handoff

Ready for independent cumulative review of B..H and the exact C..H allowlist. No known unresolved
mandatory defect within the released correction scope remains. This is WAITING_FOR_REVIEW only.
The external handoff supplies full B/C/H and the advertised remote correction-branch SHA after
push. No self-acceptance, merge, K1.3 or successor release; invalidation-01 continues to hold K1.2
integration.

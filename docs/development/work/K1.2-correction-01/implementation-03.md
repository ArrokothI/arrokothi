# Implementation report — K1.2-correction-01, round 3

## Identity

- Implementer: Codex (GPT-6), this coding session, 2026-09-27. Implementation self-review only.
- Packet/parent: K1.2-correction-01 / K1.2. [Contract](contract.md) revision 4 carries forward
  K1.2 revision 9, C1–C15, DEC-1–20 and decisions 01/02. The owner amendment is
  [invalidation-02](../K1.2/invalidation-02.md); unresolved authority: none.
- Integrated base and governing process baseline B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
  006/008/012 remain unchanged. Original release: `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`.
- Prerequisites: K1.1 accepted H `52b1600f3b42e3a360fdc3395178f1d147edf304`, integrated
  `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`; K1.1-correction-02 accepted H
  `719abbf9e55e7489b6255a08cbb9e97a1e960a5e`, integrated
  `954d31b00eb7f2412c22ccf7d4d079699f0c4032`. Ancestry verified. The V-D1 hold in
  invalidation-02 remains pending independent review; this report does not restore acceptance.
- Previous C: `6d9fbb3db4955ee2216fedf0d0b69c8e104367bf`; previous reviewed H:
  `312f2584d14b0c168c2152c373a4f07d4a292d74`; [review-04](review-04.md) requests changes.
- Owner-specified starting head: `8a418d408f715e999a403a3e84b73a9db1b43712`, fetched from origin
  and fast-forwarded into this branch before changes. Review-04 and its evidence were read there.
- Payload C: `652e5e73478684651cff697fef2a3ddbe34458e0`. Candidate H: the commit containing
  this report; the external handoff supplies its full SHA and the verified advertised remote SHA.
- Branch: `codex/k1.2-correction-01-activation-identity`. Configured remote: `origin`,
  `https://github.com/ArrokothI/agent-kernel.git` (unchanged). Historical records name arrokothi.git;
  this report records the actual configured remote rather than rewriting those records.
- Work reused the clean local checkout `/Users/linzhenglin/Desktop/ArrokothAI/k1.2-correction-01`
  on the requested branch. Owner-authorized departure from a new branch/worktree: continue the
  same correction branch from the specified pushed head. The optional rex-shih detached worktree
  was not used, and no other checkout was switched or edited.
- Final validation began and ended with a clean C. C..H contains only this report, the correction
  status row and output-only attachments listed below. Push is pending at report-writing time;
  its actual outcome is supplied externally after H exists.

## Changes and coverage

B..C contains 382 changed files (191,906 insertions, 428 deletions), predominantly cumulative
sealed evidence. This round's owner-head..C delta is 19 files (757 insertions, 52 deletions).
The complete cumulative packet remains the unit of review; this round does not replace its base.

[Coverage-04](coverage-04.md) and contract revision 4 were written before source changes. They
reconstruct every value issue producer and consuming root, and every exact retained/returned
coordinate adjacent to diagnostic projection. [Closure-03](closure-03.md) records the complete
source argument, affected dependencies, forbidden mutations and cumulative C1–C15 audit.

- **Value capture:** every issue producer reaches one bounded collector. Each root retains the
  first eight bounded details, followed by exact counts in first-occurrence order for each suffix
  code (at most eleven codes). All observed issues still count, including late codes. This is a
  diagnostic representation bound, not another accepted-value limit or a stop after eight reads.
- **Consumers:** weighted counts pass through own-data metadata into creation/ingress diagnostics,
  all recovery roots, and eager Outcome progress/Emission/result capture. DEC-5 still renders
  eight global details plus exact suffix counts. No authority check, source read or eager root
  capture was moved. Outcome refusal still changes only its one refusal record.
- **Path allocation:** diagnostic path construction checks the fixed length before concatenation.
  Oversized ancestors remain omitted, including phantom descriptors and invalid array names that
  arise before key validation. First-detail messages are bounded before retention.
- **Exact coordinates:** production coordinate code is unchanged this round. New independent
  length-prefix expectations check answers, holds, history, acknowledgments/dispositions,
  deliveries, resolved exchanges, derived output IDs, record coordinates and receipts. They
  distinguish Emission IDs across exchanges and receipt tokens across Executions while asserting
  that the minted identities cannot be rendered diagnostically.
- **Layer 3 and baseline:** values.md is the normative refusal-cost owner. Its clarification covers
  diagnostics and eager multiple-root capture, with a matching OPEN(implementation) marker in
  rewrite-index §4 and the selected eight-detail/count representation in BASELINE. The roadmap
  records values as affected by the owner amendment. BASELINE also clarifies permitted actions
  versus Driver safety, and the pre-existing engine-allocation qualification at input ingress.
  Identity, execution-cycle, recovery, state, output, evidence and creation dependencies were
  inspected; no additional semantic change was needed. Layers 1/2, public guides and skills do
  not change for this private Kernel binding repair.

### Tests and proof methods

Added 35 maintained tests: 31 value-cost cases and four exact-coordinate schedules (complete/fail
with non-ASCII/lone-surrogate namespaces, non-ASCII scope and long keys). The value cases cover
21 repeated issue families, holes/accessors/cycles/depth, byte stops, huge names/messages, direct
and located diagnostics, ambient inherited metadata, every consuming root and eight eager roots.
Original values.test.ts, its single-observation/read-count guarantees and the original tests are
unchanged and rerun.

One revision-3 aggregate test's raw-32-record expectation was replaced with nine records encoding
all 32 occurrences, preserving its pre-authority nondisclosure and forbidden-mutation assertions.
Direct raw-renderer path/message edge assertions were added so producer bounding does not mask
renderer regressions. No test file was removed. Correction G9 now drops root multiplicity instead
of requiring the old absence of eager diagnostic projection; G2/G3/G10 anchors follow weighted
summaries. These explicitly supersede implementation-specific revision-3 assumptions under the
owner's amendment, not decision-02 or accepted-value guarantees. The other 63 correction mutations
remain unchanged, and all 67 still reject.

The revision-4 runner verifies the sealed review-04 runner's SHA-256
`98a6ac4c3c6e520bedffe8b2ff25e089c93c10ec4ca2c9de3766a5aa34909c71`, loads X8–X23 replacement
spans verbatim and adds five value faults: unbounded retention, stopping reads at eight, losing
counts, inherited counts and unbounded first-detail messages. Mutants run in disposable copies;
control failures, cancellations or missing anchors are not accepted as a mutation rejection.

Selected 012 methods: normative decisions, deterministic execution, in-process race/fault,
mutation discrimination, bounded-allocation source analysis, comparative cost probes and
process/documentation checks. Native Runtime/Driver fidelity (R1), persistence/process death (K3),
public packaging (S1), physical containment and external E gates remain excluded by contract.
External fixture prepared / gate executed / external decision: none / none / none.

### Cumulative criteria (implementer assessment)

| Criteria | Distinguishing evidence and result |
|---|---|
| C1 scope, C2 replay | Existing visibility/denied-control/getter tests and exact replay schedules pass. Exact acceptedOutcomes lookup precedes terminal/currency/grant. Only the entitled surface captures or mutates. |
| C3 whole refusal | Every issue site/consumer mapped; bounded storage and weighted counts; P5 and eight-root no-grant/granted cases pass; V1/V2/V3/V4/V5 reject. Decision-02 order and four-limit tests remain green. |
| C4 atomic acceptance | Prebuilt records precede apply; original transaction/hostile/atomic suites and sealed/adapted mutations reject partial acknowledgment/output/receipt. |
| C5 next/terminal, C6 B-5/ingress | Continue starts a fresh exchange; both terminal kinds retain exact typed result/acknowledgment and outside-batch disposition; terminal replay/conflict pass. Known engine string allocation qualification remains. |
| C7 unsupported work | Original Effect/await/obligation tests and mutations refuse whole without unsupported records or await-payload reads. |
| C8 takeover | Safety callback revalidation and epoch/grant fencing unchanged; new exact answer/grant/history checks and existing reentrant schedules pass. |
| C9 recovery, C10 protocol | All recovery roots preserve counts; exact hold coordinates, returns and clearing mechanisms pass; DEC-6 diagnostic payload behavior unchanged. |
| C11 late reports | Whole-view equality proves only the original delivery row changes across takeover, redelivery and subsequent exchange; original attribution/lifetime tests remain green. |
| C12 evidence | X8–X23 all reject with four real assertion failures each; independent derivation, cross-exchange/cross-Execution uniqueness, exact returns/retention and immutability evidence pass. |
| C13 observation | Traversal/descriptor-read pairing and byte stop unchanged; own-only multiplicity, capture-time pollution and every-position-once checks pass alongside KC2 regressions. |
| C14 boundary | No production module/public export/dependency/lockfile added; structural inventory and conformance guards pass. |
| C15 records | Authority, Layer-3 marker and baseline agree; preservation/ancestry/link checks pass; historical evidence remains sealed. |

The detailed source/test/forbidden-state mapping is in closure-03 and coverage-04. All criteria are
assessed satisfied within their stated scope; this is not independent acceptance. Historical tests
were sampled rather than every old test/log line re-read; their executable discrimination was
rerun. No native Runtime behavior is claimed from in-memory tests.

### Findings, provenance and remaining limits

- **K12C1-R4-VALUE-COST-01:** implementation correction complete for review. The retained allocation
  formerly proportional to invalid positions is now at most 19 bounded records per root. P5's
  532,480 observed undefined-member issues use nine records, with 532,472 in the suffix counter.
  All issue producers retain the same capture/charge/read behavior; accepted values and their
  exact canonical bytes are unchanged. This supersedes implementation-02's O-R2-1 out-of-scope
  disposition and review-03's O-R3-2 routing under invalidation-02.
- **K12C1-R4-EVID-01:** distinguishing evidence complete for review. All sixteen X8–X23 mutants
  reject; P4's thirteen checks pass. Production identity semantics were already correct and were
  not altered to fit the tests.
- **SELF-R3-PATH-01:** additional implementer-found dependency, not a reviewer finding. Counting
  records alone would leave raw first-detail messages and prevalidation/ancestor paths unbounded.
  Bounded construction/retention and million-unit phantom-name/message regressions close this
  adjacent amplification; see closure-03 for its separate provenance.
- Earlier K12C1-R2-AGG-01/EVID-01, K12C1-R1-DIAG-01 and K12-R14-ID-01/EVID-01 dispositions are
  preserved through [implementation-02](implementation-02.md), [review-03](review-03.md) and
  [review-04](review-04.md), with cumulative regressions rerun. SELF-DIAG-01/02 retain their earlier
  implementer provenance. Historical ACCEPT records and both invalidation holds remain unchanged.
- Known engine limit: extreme trusted namespaces can exceed JavaScript derived-string allocation
  for Emission/result IDs (and source-derived input ingress); the probe still throws before mutation
  for complete/Emission and accepts a no-Emission continue. This is the existing documented limit,
  not an unresolved new diagnostic-cost case or a successful allocation claim.
- No known mandatory in-scope defect or missing required result remains. Independent review may
  reject this assessment. Host-provided code/traps and own-key enumeration retain their existing
  scope limits; no arbitrary-callback runtime bound, constant whole-message memory cap, or timing
  nondisclosure is claimed. Each eager root still incurs its permitted capture work; there is no
  new message-level semantic cap. Evidence logs still grow over the coordinator lifetime.
- No legacy module was retired. Legacy SDK/core remain supported; K1.4 owns the bridge, K3/R1
  persistence/native fidelity, K4.4/K5 retention. Historical reconstruction and implementation-02
  remain evidence of revision 3 and are superseded here only where noted.
- Third-party review: none required for new reuse; no third-party source, dependency or service
  added. Existing locked node_modules were reused, with no install in this round; canonicalize
  and its existing terms, package manifests and lockfile remain unchanged.

## Validation and interpretation

Final validation ran sequentially on clean C using [validate.mjs](validate.mjs):
`node docs/development/work/K1.2-correction-01/validate.mjs /tmp/k12-correction-03-clean-validation`,
from `/Users/linzhenglin/Desktop/ArrokothAI/k1.2-correction-01`. All output is attached below, not
left dependent on that temporary path. Exact command argument arrays, TREE/MODE/PRE, start/end
and exit/signal/error are in [results](validation-03/13-results.json); each raw log repeats C and
its command. [Environment](validation-03/00-environment.json): Node v26.8.1, npm 11.19.0,
TypeScript 5.9.3, Darwin arm64 24.6.0; validation began 2026-09-27T10:54:23.682Z. A separate
Node 22 run was not performed. The 22.9+ runtime requirement is met; no cross-version claim follows.
[MANIFEST.sha256](validation-03/MANIFEST.sha256) covers every raw attachment byte-for-byte.

| Command / raw evidence | Exit | Observation |
|---|---:|---|
| [01-typecheck](validation-03/01-typecheck.txt) | 0 | TypeScript passed |
| [02-full](validation-03/02-full.txt) | 0 | 3,302/3,302 |
| [03-kernel](validation-03/03-kernel.txt) | 0 | 1,248/1,248 |
| [04-conformance](validation-03/04-conformance.txt) | 0 | 1,945/1,945 |
| [05-sdk](validation-03/05-sdk.txt) | 0 | 22/22 |
| [06-builder-docs](validation-03/06-builder-docs.txt) | 0 | 72 files, 1,812 links/anchors, 38 public imports |
| [07-original-ablations](validation-03/07-original-ablations.txt) | 1 | Sealed control 1,248/1,248; 32/36 rejected; B6/B12/B13/B14 NOT APPLICABLE |
| [08-correction-ablations](validation-03/08-correction-ablations.txt) | 0 | Control 571/571; 67/67 rejected |
| [09-r11-probe](validation-03/09-r11-probe.txt) | 0 | 8/8 stale_exchange; accepted state unchanged |
| [10-records-links](validation-03/10-records-links.txt) | 0 | Ancestry/preservation; 13 files, 579 links/anchors; remote links not fetched |
| [11-evals](validation-03/11-evals.txt) | 0 | 12/12 |
| [14-original-ablations-adapted](validation-03/14-original-ablations-adapted.txt) | 0 | Control 1,248/1,248; 36/36 rejected; only four anchor spellings adapted |
| [15-review-identity](validation-03/15-review-identity.txt) | 0 | Exchange 10, exact variants/replay and surrogate outputs remain correct |
| [16-review-maxlen](validation-03/16-review-maxlen.txt) | 0 | Five returned/retained refusals; reason lengths 104–158 |
| [17-review-namespace](validation-03/17-review-namespace.txt) | 0 | Known limit reproduced: complete/Emission throw; no-Emission continue accepts |
| [18-diagnostics-maxlen](validation-03/18-diagnostics-maxlen.txt) | 0 | 21/21 asserted cases, MAX_STRING_LENGTH minus 16 |
| [20-review-aggregate](validation-03/20-review-aggregate.txt) | 0 | Outcome 8,621 units, recovery 519; one refusal each; later valid answer accepts |
| [21-review-equality](validation-03/21-review-equality.txt) | 0 | E1/E2 stale_exchange; two distinct 129-unit keys accepted |
| [23-review-cost-accept](validation-03/23-review-cost-accept.txt) | 0 | 410 ms; heap +15 MiB; RSS 135 MiB |
| [24-review-cost-refuse-undefined](validation-03/24-review-cost-refuse-undefined.txt) | 0 | 74 ms; heap +5 MiB; RSS 110 MiB |
| [25-review-cost-refuse-ctor](validation-03/25-review-cost-refuse-ctor.txt) | 0 | 434 ms; heap +3 MiB; RSS 114 MiB |
| [26-review-aggregate-pre-authority](validation-03/26-review-aggregate-pre-authority.txt) | 0 | No grant: unauthorized_submission, 216 units; stale epoch: stale_exchange, 144 units; one refusal each |
| [27-revision4-ablations](validation-03/27-revision4-ablations.txt) | 0 | Control 35/35; X8–X23 and V1–V5: 21/21 rejected |
| [28-review4-p4-p5](validation-03/28-review4-p4-p5.txt) | 0 | P4 13/13; six P5 modes completed; measurements below |
| [29-round3-diff-check](validation-03/29-round3-diff-check.txt) | 0 | Owner head 8a418d4..C clean |
| [22-correction-diff-check](validation-03/22-correction-diff-check.txt) | 2 | Historical validation-02/12-diff-check.txt quoted whitespace only |
| [19-round2-diff-check](validation-03/19-round2-diff-check.txt) | 2 | Same sealed quoted whitespace only |
| [12-diff-check](validation-03/12-diff-check.txt) | 2 | B..C: sealed K1.2 and validation-01/02 evidence whitespace only |

All unmutated test suites have zero failed, cancelled, skipped or todo tests. Every mutation rejection
has actual failed assertions, zero cancellations and passing remaining tests. X8–X23 each fail the
four exact-coordinate cases; V1 fails 30 cases, V2 25, V3 five, V4/V5 one each. The sealed original
runner's four anchor misses are not counted as rejections. Its adapted result is substitute evidence,
not a claim that the sealed runner passed.

The collector itself exits **1** because it preserves the sealed runner's **1** and three historical
diff checks' **2**. No command timed out, signaled or failed to load. This round's payload diff is
whitespace-clean. Raw historical-diff output reproduces quoted whitespace in the new attachments,
so an administrative C..H diff check can also report those output-only quoted lines. They remain
unaltered for evidence integrity.

P5 fresh child processes use `--expose-gc --max-old-space-size=4096`; heavy probes run sequentially.
The wrapper copies the sealed P4/P5 bytes into the expected directory layout without editing them.

| P5 shape | Accept ms / heap delta / RSS MiB | Refuse ms / heap delta / RSS MiB |
|---|---|---|
| Direct root | 406 / 19.8 / 138 | 72 / 2.3 / 109 (nine issue records) |
| No-grant Outcome, one root | 395 / 27.4 / 138 | 73 / 2.5 / 106 |
| No-grant Outcome, eight roots | 3,060 / 58.5 / 218 | 525 / 8.7 / 111 |

These are single-run comparative observations, not universal timing thresholds or peak-allocation
proof. The refusal-ctor observation (434 ms versus a different accepted shape's 410 ms) is retained
honestly; wall-clock differences do not substitute for the source allocation/read bound. The
structural argument covers every producer, and tests/mutants distinguish unbounded storage and
premature traversal termination. Whole-envelope bound follows the unchanged eager root count,
with fixed diagnostic storage per root. The aggregate/equality historical probes print observations;
new deterministic cases additionally assert counts, single reads, exact retained state and forbidden
mutations. Namespace-probe exit 0 means the probe completed, not that all derivations succeeded.

No required contract command was omitted. Excluded external/native/persistence/packaging gates,
Node 22 and arbitrary host-code runtime remain unexamined as stated above. The strongest remaining
risk is a correlated source/test assumption in adversarial JavaScript interactions; independent
review should audit the all-producer argument and exact-coordinate oracle rather than infer closure
from green counts alone.

## Exact C..H administrative allowlist

Only this report, the correction's 007 status row and raw output/digest files are allowed. No script,
fixture, evaluator, threshold, configuration, test or semantic document is added in H.

```text
docs/development/007-work-packets.md
docs/development/work/K1.2-correction-01/implementation-03.md
docs/development/work/K1.2-correction-01/validation-03/00-environment.json
docs/development/work/K1.2-correction-01/validation-03/01-typecheck.txt
docs/development/work/K1.2-correction-01/validation-03/02-full.txt
docs/development/work/K1.2-correction-01/validation-03/03-kernel.txt
docs/development/work/K1.2-correction-01/validation-03/04-conformance.txt
docs/development/work/K1.2-correction-01/validation-03/05-sdk.txt
docs/development/work/K1.2-correction-01/validation-03/06-builder-docs.txt
docs/development/work/K1.2-correction-01/validation-03/07-original-ablations.txt
docs/development/work/K1.2-correction-01/validation-03/08-correction-ablations.txt
docs/development/work/K1.2-correction-01/validation-03/09-r11-probe.txt
docs/development/work/K1.2-correction-01/validation-03/10-records-links.txt
docs/development/work/K1.2-correction-01/validation-03/11-evals.txt
docs/development/work/K1.2-correction-01/validation-03/12-diff-check.txt
docs/development/work/K1.2-correction-01/validation-03/13-results.json
docs/development/work/K1.2-correction-01/validation-03/14-original-ablations-adapted.txt
docs/development/work/K1.2-correction-01/validation-03/15-review-identity.txt
docs/development/work/K1.2-correction-01/validation-03/16-review-maxlen.txt
docs/development/work/K1.2-correction-01/validation-03/17-review-namespace.txt
docs/development/work/K1.2-correction-01/validation-03/18-diagnostics-maxlen.txt
docs/development/work/K1.2-correction-01/validation-03/19-round2-diff-check.txt
docs/development/work/K1.2-correction-01/validation-03/20-review-aggregate.txt
docs/development/work/K1.2-correction-01/validation-03/21-review-equality.txt
docs/development/work/K1.2-correction-01/validation-03/22-correction-diff-check.txt
docs/development/work/K1.2-correction-01/validation-03/23-review-cost-accept.txt
docs/development/work/K1.2-correction-01/validation-03/24-review-cost-refuse-undefined.txt
docs/development/work/K1.2-correction-01/validation-03/25-review-cost-refuse-ctor.txt
docs/development/work/K1.2-correction-01/validation-03/26-review-aggregate-pre-authority.txt
docs/development/work/K1.2-correction-01/validation-03/27-revision4-ablations.txt
docs/development/work/K1.2-correction-01/validation-03/28-review4-p4-p5.txt
docs/development/work/K1.2-correction-01/validation-03/29-round3-diff-check.txt
docs/development/work/K1.2-correction-01/validation-03/MANIFEST.sha256
```

## Handoff

Ready for independent cumulative review of B..H and the exact C..H allowlist. State:
**WAITING_FOR_REVIEW**, with both review-04 findings implementer-corrected, pending independent
verification. The external handoff supplies full B/C/H, clean-tree state and the advertised remote
correction-branch SHA after a non-force push. No self-acceptance, merge, K1.3 or successor release.
Historical acceptances and the invalidation-01/02 integration/claim holds remain owner-controlled.

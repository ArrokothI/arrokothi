# Implementation report — K1.2-correction-01, round 1

Implementer: Codex (GPT-6), 2026-09-26. Implementer assessment for independent review;
this report does not accept or integrate either K1.2 or its correction.

## Identity

- Packet: K1.2-correction-01, parent K1.2. [Correction contract revision 1](contract.md)
  carries forward the full [K1.2 contract revision 9](../K1.2/contract.md), C1–C15 and DEC-1–20.
  Governing policy: [006](../../006-development-process.md), [008](../../008-implementation-report.md),
  [012](../../012-review-methods.md), at integrated base B
  `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- State: WAITING_FOR_REVIEW. Owner's explicit 2026-09-26 correction handoff releases only this
  packet, with [invalidation-01](../K1.2/invalidation-01.md) and the correction seed/status in 007.
- Integrated prerequisites: `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`
  (accepted H `52b1600f3b42e3a360fdc3395178f1d147edf304`), then
  `954d31b00eb7f2412c22ccf7d4d079699f0c4032`
  (accepted H `719abbf9e55e7489b6255a08cbb9e97a1e960a5e`). Both integrated commits are
  ancestors of B; B is an ancestor of the release and C. [Preservation evidence](validation-01/10-records-links.txt).
- Owner-directed release/start: `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb` on
  `claude/k1.2-outcome-acceptance-receipts`. Previous reviewed H
  `c36cbe04f7c97f198794bfede972d4861247cca0`, payload C12
  `2f4e64b1f51c679e2b381f9fb9800f2e290ddd30`; governing [review-14](../K1.2/review-14.md)
  is present at the release. [Decision-01](../K1.2/decision-01.md) and
  [decision-02](../K1.2/decision-02.md) are unchanged.
- New branch: `codex/k1.2-correction-01-activation-identity`. Worktree:
  `/Users/linzhenglin/Desktop/ArrokothAI/k1.2-correction-01`.
  Payload C: `360538522be8c1b17d23948f632fd4f568a76ed0`.
  Candidate H: **the commit containing this report**; full SHA supplied in external handoff.
- Owner-authorized workflow departure: start from the specified unintegrated cumulative K1.2
  release, not integrated main. A separate worktree was cut at that exact commit; no other checkout
  was switched. `agent-kernel` remains clean at the release on claude; the unrelated `arrokothi`
  checkout remains clean on `runtime-skills-mvp` at `913528b2f59425b871e96c8f8600b6e860cb6ab0`.
- Configured remote remains `origin https://github.com/ArrokothI/agent-kernel.git`.
  Read-only `git ls-remote` against both origin and the requested
  `https://github.com/ArrokothI/arrokothi.git` returned main B and claude release above, with no
  correction branch, immediately before preparing H. No remote URL was changed.
- Clean C before and after final validation. H adds only this report, the correction's 007 status
  row, and declared output-only evidence below. Push is **pending external handoff**; this report
  does not certify a future push. Only the new codex branch is a push destination.

Exact C..H administrative file allowlist (all paths repository-relative):

```text
docs/development/007-work-packets.md
docs/development/work/K1.2-correction-01/implementation-01.md
docs/development/work/K1.2-correction-01/validation-01/00-environment.json
docs/development/work/K1.2-correction-01/validation-01/01-typecheck.txt
docs/development/work/K1.2-correction-01/validation-01/02-full.txt
docs/development/work/K1.2-correction-01/validation-01/03-kernel.txt
docs/development/work/K1.2-correction-01/validation-01/04-conformance.txt
docs/development/work/K1.2-correction-01/validation-01/05-sdk.txt
docs/development/work/K1.2-correction-01/validation-01/06-builder-docs.txt
docs/development/work/K1.2-correction-01/validation-01/07-original-ablations.txt
docs/development/work/K1.2-correction-01/validation-01/08-correction-ablations.txt
docs/development/work/K1.2-correction-01/validation-01/09-r11-probe.txt
docs/development/work/K1.2-correction-01/validation-01/10-records-links.txt
docs/development/work/K1.2-correction-01/validation-01/11-evals.txt
docs/development/work/K1.2-correction-01/validation-01/12-diff-check.txt
docs/development/work/K1.2-correction-01/validation-01/13-results.json
docs/development/work/K1.2-correction-01/validation-01/14-preserved-whitespace.txt
docs/development/work/K1.2-correction-01/validation-01/MANIFEST.sha256
```

Scripts, the contract and architecture changes are already payload in C. No evaluator or fixture
is introduced by an attachment. The 007 change in H is restricted to this correction's row.

## Changes and coverage

The fixed invariant is producer/consumer closure: every Kernel-minted Activation ID is answerable
through every identity consumer. Integrated creation validates caller scope/key separately, then
packs them with a trusted namespace into an Execution ID. Dispatch appends a growing exchange
suffix. Reapplying the boundary-value text validator to the aggregate ID made valid Executions
unanswerable. Removing only its length cap would still reject a surrogate-containing host namespace.

This candidate chooses any primitive JavaScript string as a structurally usable Activation identity,
with exact UTF-16 code-unit equality. A shared internal helper serves submitOutcome, takeover,
recovery and protocol-failure reporting. Missing, boxed, revoked-object and unobservable fields
remain unusable; a different primitive string is stale. No creation/Execution-ID behavior, caller
key limit, value-root limit, submission/control authority or decision-02 ordering changes.

Additional changes bound unknown-field diagnostic name fragments, add decision-02 provenance, and
correct the eager-capture/replay wording. [Reconstruction and whole cumulative audit](reconstruction.md)
trace creation → Execution ID → dispatch/takeover → all consumers, including replay, currency,
content, receipt/output/history and inspection. That record explains, as an evidence-based inference,
why thirteen prior rounds missed the producer domain and why surviving X24 exposed the gap.

The pre-implementation [coverage map](contract.md#proof-methods-and-pre-implementation-coverage)
and [C1–C15 cumulative audit](reconstruction.md#whole-cumulative-packet-re-audit-against-b) identify
expected facts, forbidden mutations, source owners, test schedules and their results. The latter
covers the full B..C packet, not just release..C. Review B..H for independent review; the correction
payload alone is release..C (16 files, 710 insertions, 8 deletions).

Selected 012 methods: normative/source decisions, deterministic execution, in-process race/fault,
and process/documentation checks. The unchanged hostile/reentrant suites cover adjacent observation
windows and transaction ordering. No native Runtime fidelity, process-death/persistence, physical
isolation, live model quality or external benchmark gate is inferred from these methods.

- **C1–C3:** hidden/missing scope performs no later observation; replay/conflict precedes fresh
  validation; independent ID/epoch/base classifications preserve decision-02. 240 wrong-text
  combinations and 48 matching long/surrogate combinations distinguish authority/content schedules.
- **C4–C7:** unchanged acceptance, transaction, terminal, all-root boundary and unsupported-surface
  suites retain atomic progress/ack/output/receipt, exact batch/B-5 and whole-refusal behavior.
- **C8–C11:** positive minted-ID schedules cover redelivery, both holds and clearing, takeover with
  same ID and epoch+1/new grant, stale old attempt, later Outcome and replay. 180 control combinations
  preserve control precedence. Existing reentrancy/late-report suites cover independent delivery rows.
- **C12–C13:** whole-view comparisons forbid every mutation except a single retained refusal;
  successful schedules assert permitted deltas. Returned evidence equals retained evidence;
  non-text and scope tests prove no coercion and single/zero observation as applicable.
- **C14–C15:** zone guard, dependencies, public runtime exports and original tests preserved.
  Layer-3 identity/cycle, BASELINE, implementation marker, provenance and roadmap agree. Local link
  checks pass; Layer 1/2, SDK/guides and architecture skill need no semantic change.

Tests: 495 added in `packages/kernel/tests/activation-identity.test.ts`; all 642 existing Kernel tests
remain byte-for-byte unchanged from release and still pass. No tests removed/ported. Five positive
producer schedules include the review's 65,536-key and exchange 9→10 examples, maximal bounded
caller parts with a 131,072-unit namespace, and both lone-surrogate namespaces. There is no finite
longest minted ID under the existing unbounded namespace contract, so the large case is a witness,
not a claimed maximum. Fifteen O3 cases span all three holders, million-unit/surrogate/control/128/129
names, entitled and unentitled callers. Four hidden-scope and three non-text cases complete the matrix.

Layer-3 maintenance: `concepts/identity.md` owns the closure and marks the binding choice as
OPEN(implementation) with its settled implementation in BASELINE. `mechanisms/execution-cycle.md`
keeps the authority/capture and replay semantics precise. rewrite-index §§3/4, roadmap and sources
record the decision and owner supplement. Creation, values, core/Driver, integration, lifecycle,
state/recovery, output, authority, evidence and reference dependencies were inspected. No new wire
format is specified. Historical OPEN prose is evidence, not current authority.

Legacy disposition remains the cumulative K1.2 disposition: supported SDK still uses legacy core;
K1.4 owns its bridge and S1 public migration. DX-4 is not extracted; K2.2 owns operation schemas.
No new dependency or legacy retirement occurs here. Existing canonicalize remains its unchanged
K1.1 dependency; no new third-party source, adaptation, asset, dependency or service use occurred.

### Finding disposition and limitations

| Finding / provenance | Implementer disposition and evidence |
|---|---|
| K12-R14-ID-01 — reviewer | Addressed by shared primitive-string classifier and positive producer-to-consumer schedules; I1/I3/I4/I5 restoring the old limit are rejected. |
| K12-R14-EVID-01 — reviewer | Addressed by explicit DEC-1/2/3 binding and wrong/matching text matrices; I2 (inverse X24, restoring Unicode rejection) fails 120 tests. |
| O1/O2 — reviewer P3 | Decision-02 now in sources/rewrite-index; eager observation distinguished from authority-gated diagnostic use; replay sentence includes “after”. |
| O3 — reviewer P3 | Unknown name fragments capped at 128 printable ASCII units or a fixed omission marker; values unread and whole proposal refused; I7 fails 12 cases. |
| SELF-ID-01 — implementer, not reviewer | Integrated trusted namespace admits unbounded and surrogate strings. Found while reconstructing producers; covered without changing K1.1, by mint→controls→Outcome→replay tests and inverse X24. |

Prior closed-finding dispositions remain linked in [reconstruction](reconstruction.md#why-the-previous-thirteen-rounds-missed-it)
and [review-14](../K1.2/review-14.md); their evidence and historical review-13 ACCEPT are unchanged.
The original 36-mutation active runner remains unchanged and all its mutants are rejected. Historical
review-only experiments are not represented as independently rerun; the active runner, retained R11
probe and seven new mutants are the exact reruns claimed here.

No mandatory semantic obligation is knowingly unresolved and no authority amendment is needed.
This is a whole-packet self-audit, not an assertion that every historical test body or external URL
was read independently. Optional inherited P3 commentary on the old 007 introduction/historical
OPEN-5 remains unchanged; decision-02 and the actual status row govern. Strongest remaining limit:
this is an in-process binding, with no transport-codec interoperability or whole-message resource-cap
claim. O3 bounds field-name fragments, not entire reasons containing legitimate large identities.

## Validation and interpretation

All tests below ran on clean C `360538522be8c1b17d23948f632fd4f568a76ed0`, with clean status also
observed afterward. Cwd `/Users/linzhenglin/Desktop/ArrokothAI/k1.2-correction-01`; Node v26.8.1,
npm 11.19.0, TypeScript 5.9.3, Darwin arm64 24.6.0. Existing installed dependencies were copied
from the release checkout; package and lock files unchanged. No service/credential configuration.
Exact command arguments, timestamps, exits and environment are retained in
[results](validation-01/13-results.json) and [environment](validation-01/00-environment.json).
Each raw attachment has a SHA-256 in [MANIFEST.sha256](validation-01/MANIFEST.sha256).

Collector invocation: `node docs/development/work/K1.2-correction-01/validate.mjs /tmp/k12-correction-clean-c`.
It exited 1 solely because cumulative `git diff --check` returned 2 for preserved historical output
formatting; this is not presented as a wholly green collector run. The attached outputs were copied
byte-for-byte into this durable repository directory after validation.

| Exact command (cwd above) | Result | Raw evidence |
|---|---|---|
| `npm run typecheck` | exit 0 | [01](validation-01/01-typecheck.txt) |
| `npm test` | exit 0; 3,191/3,191 | [02](validation-01/02-full.txt) |
| `npm run test:kernel` | exit 0; 1,137/1,137 | [03](validation-01/03-kernel.txt) |
| `npm run test:conformance` | exit 0; 1,945/1,945 | [04](validation-01/04-conformance.txt) |
| `npm run test:sdk` | exit 0; 22/22 | [05](validation-01/05-sdk.txt) |
| `npm run check:builder-docs` | exit 0 | [06](validation-01/06-builder-docs.txt) |
| `node docs/development/work/K1.2/ablations.mjs` | exit 0; control 1,137/1,137, 36/36 mutants rejected | [07](validation-01/07-original-ablations.txt) |
| `node docs/development/work/K1.2-correction-01/ablations.mjs` | exit 0; control 495/495, 7/7 mutants rejected | [08](validation-01/08-correction-ablations.txt) |
| `node --experimental-strip-types docs/development/work/K1.2/review-11/probe-partial-claim.ts` | exit 0; 8/8 stale_exchange, state unchanged | [09](validation-01/09-r11-probe.txt) |
| `node docs/development/work/K1.2-correction-01/check-records.mjs` | exit 0; preservation/ancestry; 8 files, 501 local links/anchors | [10](validation-01/10-records-links.txt) |
| `npm run test:evals` | exit 0; 12/12 (optional regression, no live quality claim) | [11](validation-01/11-evals.txt) |
| `git diff --check a20d278185eaffc7f8b7489345a3624231ff6e6d HEAD` | exit 2, four inherited historical-output whitespace diagnostics | [12](validation-01/12-diff-check.txt) |

All unmutated test suites report zero failures, cancellations, skips and todos. Correction mutants
I1–I7 fail respectively 241, 120, 181, 93, 25, 2 and 12 tests, with zero cancellations. Mutant failures
are expected rejection evidence, not failures of the unmutated candidate.

Whitespace disposition: [14](validation-01/14-preserved-whitespace.txt) reruns exact B..release and
B..C checks and verifies byte-identical diagnostics. Release..C and B..C excluding historical K1.2
records both exit 0. The four lines reside in review-09 and validation-12/13/14 raw logs; 006/008
require preserving their bytes. This is a disclosed inherited formatting exception, not an
unresolved code/test obligation or a silent change of the check's outcome.

Not run: external E gate, native integration, persistence/process-death, public packaging, paid/live
model benchmarks and remote-link validation. They are outside the released packet. External fixture
prepared: none new; external gate executed: none; external acceptance decision: none. No fabricated
benchmark approval is supplied. Exploratory tests before C included a TypeScript test-helper failure
(`String.isWellFormed` absent from the configured lib); the test uses a compatible surrogate check in
C. Final typecheck and all final tests pass. No failed exploratory output is represented as clean-C proof.

## Handoff

Ready for independent review of full B..H with the report's exact C..H allowlist and retained evidence.
Reviewers should challenge the producer domain and the normative/implementation distinction, the
independent currency schedules, and every output/forbidden mutation in the linked coverage map.
The external handoff supplies full H and verified advertised branch SHA after a non-force push;
if transport fails, it instead supplies a verified full-history bundle and cumulative binary patch.
No self-acceptance, merge, main/claude push or K1.3/other successor release. K1.2 integration remains
on hold until independent review and the owner's integration decision.

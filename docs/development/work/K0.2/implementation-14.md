# Implementation report — K0.2, round 14

## Identity

- Packet/parent: K0.2 / K0; [contract.md](contract.md), revision 14.
- Governing base/process: `c079237ee7aff428481426f93e87a68b79f170d4`.
- State: **BLOCKED_EXTERNAL**. C1–C7/C9 offered for Round 15 independent review, not self-accepted.
- Owner release: 2026-09-11 explicit release; current explicit owner instruction authorizes this
  fix-forward correction and C14/H14, not merge, K0 closure, K1.0 or any successor packet.
- Accepted prerequisite K0.1 H12: `bab7bf6635781e6d2f9b0e8e333f58440ae0b047`;
  acceptance `679734a1777ce087c62305d7665071687d8f1cb6`; integration
  `42731300266eea00a9a24d867d5e82d9887c280d`, [receipt](../K0.1/integration-01.md).
- Branch: `codex/k0.2-public-controls-e0-gate`; configured origin:
  `https://github.com/ArrokothI/Agent_SDK.git` (observed; unchanged).
- Preserved C13: `442a3b93099a193d3acef640e0ea2807497dbce1`;
  reviewed H13: `ec8d8cf03583bef925551352df820802a20990ef`.
- Fetched starting HEAD / reviewer A14: `61732c2f18e6806bcecf83c85e6ad28f26f083ff`,
  [review-14.md](review-14.md), CHANGES REQUIRED. No C13/H13 revert, rebase or published rewrite.
- **Clean C14: `377bcbeda14b16bfebd325064db1d2617feedc4a`.** All final commands ran after
  committing this exact tree, clean before and after each command.
- **H14:** the commit containing this report; its full SHA and verified advertised remote identity
  are supplied in the external handoff. H14's direct parent is C14.
- Exact C14..H14 administrative allowlist: this report; only the authoritative K0.2 row in
  `docs/development/007-work-packets.md`; and the six output-only `.log` files enumerated below under
  `validation-14/`. No script, fixture, evaluator rule, threshold or configuration is in H14.
- Push status at report construction: pending external handoff. Working tree at final C14 validation:
  clean. The report does not certify a future push.

## Changes and coverage

All changes belong to the K0.2 fixture/coverage and development records. No Kernel, SDK, provider,
Runtime implementation, package, dependency, guide or skill changes. Canonical architecture and the
accepted K0.1 worksheet are unchanged. The target/0.8.x implementation gap remains explicit.

The full audit and per-row explanation are in [cited-decision-reconciliation.md](cited-decision-reconciliation.md).
Its executable inventory is [cited-decisions.ts](../../../../tests/conformance/k0/cited-decisions.ts):
**51 cited decisions / 366 clause references**, reconciled to **208 obligation entries** in
[coverage.ts](../../../../tests/conformance/k0/coverage.ts). References are not counted as independent
obligations when multiple decisions restate the same observable fact.

### Scope and change groups

- **A14→C14 correction delta:** 12 files, +2091/−14. The explicit clause inventory, its source/seal/
  deletion guards, assignment reasons, two corrected old assignment explanations, 14 new discriminators,
  one additional scenario, dependent attribution/count/interaction tests, contract and specification.
- **Cumulative base→C14:** 61 files, +28557/−6. Entire K0.2 fixture family, public specification,
  contract, historical reports/reviews and validation-12/13 records, plus the existing K0.2 ledger row.
  Nothing outside `tests/conformance/k0/`, `docs/development/work/K0.2/` and 007 is changed.
- **C14→H14:** the eight administrative/evidence files allowlisted above. Prior reports/reviews and
  old raw logs remain immutable; their historical findings are not silently rewritten.

The code payload adds 14 single-field transcripts, each with a concrete writer/selection bug,
source clause and owning observation step. Twelve use `cited-decision-edges`; two use existing steps
(empty ordinary batch and timeout/result union). The new scenario has 25 steps using **existing**
commands/observations only. No previous scenario command or expected observation changes. The
missing-code control additionally attributes its existing empty-batch observation to row 5.

Current totals: **208 = 124 scenario + 4 shared + 8 corpus + 72 assigned** obligations;
**124 violating transcripts; 14 scenarios / 133 steps; 21 atomicity notes**. Per-row counts:
17, 15, 26, 17, 70, 5, 24, 13, 15, 6. Existing 110 transcripts and four shared links are preserved.

### 012 methods and semantic correction closure

**Normative decisions:** read the ten row citation sets and the full cited decisions, not just their
headlines. Decompose condition, writer, accepted fact and later consumer separately. Follow receipt
families through dispatch/admission/settlement/composition, wait registration through Event/timeout
retirement and reservation, cancellation through both accepted/rejected replay paths, and progress
through inline/native/checkpoint recovery. The inventory records every resulting reference and its
single owner. Every assignment explains the absent K0 port surface and first actual 007 implementer.

**Deterministic execution:** scenario/step/counterexample resolution, candidate rejection at the named
step, no duplicate transcript/field-set ownership, coupled-field explanations, bidirectional row
attribution, all C13 epoch policies and empty-dependency shortcut discrimination, plus the new
clause-edge schedule. Guards check negative fixture-shape invariants with their limited scope stated.

**Process/documentation:** source/row citation reconciliation, exact C/H allowlist, local document
targets, contract and public totals, immutable output hashes and authoritative status. A source seal
and inventory seal make deletion or source drift review-visible; deletion of a clause still fails
when its decision label survives. A missing owner fails independently of the seal. The tests never
claim to parse prose into semantic assertions; the explicit decomposition remains reviewable human
work and can still be wrong.

**Original root cause:** a growing assertion map had no complete source-side reconciliation, so
successful checks over existing entries said nothing about absent clauses. The original concrete
counterexamples in A14 were clauses with no owner despite no K0 observation surface. The correction
walks the entire source→owner→evidence→scenario/packet→documentation path rather than appending only
those labels. Where a condition is expressible but unscheduled, assignment is not used as an escape.

**Excluded methods:** no physical race/fault, native fidelity, packaging/release, model-quality or
live benchmark experiment is claimed. Those need the later owned surfaces, not scripted snapshots.
No broader architectural redesign is needed to state these assignments. No sub-agent or independent
reviewer participated in implementation; Round 15 remains the accountable review.

### Round-14 findings reconciled

| Finding | Implementer disposition / evidence |
|---|---|
| K02-R14-01 — C9 incomplete cited-decision reconstruction | **Addressed, independent review pending.** All ten rows and 51 decisions have explicit clause reconciliation, source/inventory deletion protection and real later assignments. OA-1/OA-6 → K1.2; EF-3/EF-4 → K2.1/K2.2/K2.3 by actual fact; CL clocks → K1.3/K3.2 and action certainty → K2.3; CX-5/CX-4 → K2.3; PC forms/declarations → K1.1/R1.1 and checkpoint mechanics → K3.3. Every entry gives the observation gap and governing 007 reason; the reconciliation explains the complete sweep. |
| K02-R13-01 — CLOSED by A14 | Preserved: exchange-local EpochRelation, exchange-local ordinals, Activation-ID/epoch adaptation and no cross-exchange relation. `fixture.ts`, `protocol-vocabulary.ts` and `blind-spot-regression.test.ts` are unchanged in this delta; all policy controls rerun. |
| K02-R13-02 — CLOSED by A14 | Preserved R5-c2 versus R5-c2b condition ownership and candidate-level empty-dependency shortcut discrimination. R5-c2c also remains unchanged. |
| C8 external blocker | **BLOCKED_EXTERNAL**, independently of local PASS. Actual benchmark owner decision remains pending at the unchanged pinned branch. |

Earlier closed deadline, producer, receipt, atomic cancellation, sink/ledger and delayed-Runtime
findings keep their prior accepted dispositions. The self-found Activation-ID adaptation correction
accepted by A14 remains intact. No older finding is reopened without a dependent source reason.
K0.2-SELF-01 remains open for its separate packet, unchanged by this work.

### Additional self-found defects (separate provenance)

These were found by the full reconstruction, not individually asserted as reviewer findings:

1. **Observable clause ownership gaps:** destination namespace with other identity dimensions fixed;
   early second-alternative match; exact Event ID and non-first kind-set member; ordinary backlog/
   empty batch and wait-ended union/order; reservation-not-acknowledgment; stale base versus stale
   exchange; terminal timeout disposition/readiness; and accepted nonterminal replay after cancellation.
   Fourteen discriminators now own these conditions. These are the concrete dependent reasons for
   the one new schedule; no synthetic later-only command or requirement was introduced.
2. **Cancellation interaction guard overreach:** it demanded a cancellation-conflict answer from
   every post-cancel resubmission. The new accepted-first schedule exposes CX-6's contrary required
   answer. The guard now identifies prior accepted equal submitted content before applying the loser
   classification, while retaining every no-mutation check. The new R7-g2 transcript rejects the
   reclassification bug; existing loser/retry transcripts are untouched.
3. **First-owner drift:** R8-c mixed required Effect/child work under K2.4; it is narrowed to Effect
   accounting at K2.3 and child work separately assigned to K4.1. Child/message receipts split by
   K4.1/K4.2. Missing compatible code remains observable; missing checkpoint and resource triggers,
   which the recover command cannot vary, are separately assigned to K3.3.
4. **Final cross-reference cleanup:** after an initial local validation, a retained R4-b3 explanatory
   sentence still pointed to old R8-c/K2.4, and R9-a1 wording still suggested a resource observation.
   Corrected before handoff. The unpublished preliminary C (`d9cfbb580f520fa4194fa137a20b08285979ed6f`)
   was replaced locally; no published history was rewritten. All six commands were rerun on final
   C14 below. Preliminary logs are not the evidence attached to H14.

## Validation and interpretation

All commands below ran from `/Users/rex-shih/Documents/Codex/projects/agent-kernel` on exact clean
C14 `377bcbeda14b16bfebd325064db1d2617feedc4a`. Node **v25.2.1**, npm **11.6.2**,
TypeScript **5.9.3**, platform reported by Python **macOS-26.6.2-arm64-arm-64bit-Mach-O**.
No dependency, environment configuration, fixture threshold or evaluator setting changed. Each log
contains exact C, command, UTC timestamps, environment, exit code and clean-before/after status.

| Command | Exit | Result | Immutable raw log / SHA-256 |
|---|---|---|---|
| `npm run typecheck` | 0 | No TypeScript diagnostics | [01-typecheck.log](validation-14/01-typecheck.log) — `b102de30cb054f649d2cdfca76eacfb19e762d084af01aecfafe7a9f667fe41b` |
| `npm test` | 0 | 1666 tests / 268 suites / 1666 pass / 0 fail / 0 skipped | [02-test.log](validation-14/02-test.log) — `f1dcf9bb056f7cb53d4a999f0f6b35cb255e0161504893c18de7553f6773f2e8` |
| `npm run test:conformance` | 0 | 1557 tests / 250 suites / 1557 pass / 0 fail / 0 skipped | [03-conformance.log](validation-14/03-conformance.log) — `6695a2e9ac8664b755355ba0782791ef92f1518c2935a100db3a191a186619dc` |
| `node --test --experimental-strip-types tests/conformance/k0/*.test.ts` | 0 | 701 tests / 57 suites / 701 pass / 0 fail / 0 skipped | [04-k0.log](validation-14/04-k0.log) — `afadbbf79d342da997d079eec20dd42df1e2d833f8c62ed5c821a7454336413f` |
| `npm run test:sdk` | 0 | 22 tests / 22 pass / 0 fail / 0 skipped | [05-sdk.log](validation-14/05-sdk.log) — `ddf816c6f912d30be3a9d3009fe63c2e684a52983edfa89e7b340823be72f568` |
| `npm run check:builder-docs` | 0 | 26 Markdown files / 280 local links and anchors / 38 public package imports | [06-builder-docs.log](validation-14/06-builder-docs.log) — `246eb2a2d13ca92e59938ae8c146c5f75f1ca1318664f579572991ec82b0801b` |

Full-suite non-K0 count remains **965** (1666 − 701). K0 grew from 575 to 701 tests; full suite
from 1540 to 1666. Counts are evidence of these commands only, not an independent acceptance.
`git diff --check` passes. The three changed development documents' 26 local file targets were
checked directly; builder-docs validates its own limited inventory, not all development documents.
The inventory test also checks every later assignment names an actual implementing 007 heading.

Not run: `test:evals` (no Agent behavior change), live/paid providers, process kills, native Drivers,
benchmark execution, release/install canaries. None is needed to establish the bounded fixture
correction, and none is claimed by these deterministic logs. All logs are output-only attachments;
no validation script is introduced after C14.

### C8 external state, separately

A fresh read-only `git ls-remote origin refs/heads/main refs/heads/e0-claims-ownership-and-public-controls`
in the benchmark checkout returned the same identities A14 inspected:

- `main`: `98756f8c10bd806125da8318f1a129bc030aca61`;
- E0 branch: `5f921f9b415407fe3bdff43a545878437ac31a93`;
- inspected `fixtures/e0/evidence-record.json` at that exact branch commit: mechanical gate `PASS`,
  **`ownerDecision.state: "pending"`**, actor **benchmark repository owner**. Its explicit note says
  mechanical PASS does not supply or imply acceptance.

No accepted E0 identity is bound as C8 evidence. The responsible benchmark owner must produce an
actual accepted decision at a pinned revision with fixture/config identities, raw observations and
evaluator/version identity, independently inspectable with the decision. Neither branch existence,
commit message, implementer report nor mechanical PASS unblocks C8. No benchmark file was modified.

### Per-criterion implementer assessment

| Criterion | Assessment offered to Round 15 |
|---|---|
| C1 | Preserve A14 PASS: original public trace intact; added clause schedule uses the same protocol. |
| C2 | Preserve A14 PASS: delayed Runtime / independent second Execution evidence unchanged. |
| C3 | Preserve A14 PASS: independent sink/ledger and E-1-domain attribution unchanged. |
| C4 | Preserve A14 PASS: baseline/shared laboratory contract unchanged. |
| C5 | Preserve A14 PASS: two application shapes remain prepared, no E0 acceptance claim. |
| C6 | Preserve A14 PASS: all prior controls remain; new discriminators add coverage without weakening refusals. |
| C7 | Preserve A14 PASS: all conforming epoch policies pass, violating ones fail, unsupported target still refuses every scenario. |
| C8 | **FAIL / BLOCKED_EXTERNAL**, pending actual benchmark-owner acceptance. |
| C9 | Local correction offered as PASS for independent verification: complete explicit source reconciliation, truthful assignments and mechanical omission controls, with semantic completeness still subject to review. |

**Strongest remaining risk:** a human-authored decomposition or ownership argument can still be
incorrect despite every seal and counterexample passing. Round 15 must independently re-read the
source assertions and challenge shared meanings, absent-surface reasons and first owners. The seal
makes a change visible; it never makes a mistaken decomposition true. The expanded fixture remains
scripted laboratory evidence, not proof of an implemented Kernel, crash safety or native recovery.

Third-party review: **none incorporated**. No third-party code, tests, assets, packages or services
were copied, adapted, vendored or added. Existing repository decisions are the source; reading the
benchmark-owned evidence is evidence inspection, not reuse or license clearance.

## Handoff

C14 local correction is ready for **Round 15 independent review of H14**, with C8 still externally
blocked. H14 contains only this report, the K0.2 status row and six raw logs. The external handoff
supplies full base/C14/H14 identities and verified remote status after push. No self-acceptance,
merge, K0 closure, K1.0 release or successor work is performed or authorized by this report.

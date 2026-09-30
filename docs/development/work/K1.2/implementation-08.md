# Implementation report — K1.2, round 8

## Identity and review-ready state

- Packet/parent: K1.2 / K1; [contract](contract.md) revision 7 (unchanged this round — no
  criterion, threshold, or obligation was added, relaxed, or reworded). Governing 006/007/008/012
  and B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Author: Muse Spark, implementer, 2026-09-25, working the merged round-7 review
  ([review-07-merged](review-07-merged.md)). This is not a reviewer session, not an acceptance,
  and not an integration or release.
- State: **WAITING_FOR_REVIEW**. This round closes `K12-R7-PROC-01` as an implementer assessment:
  the post-H7 canonical rewrite is now packaged as fresh payload C8 with clean rerun validation
  and this report-bearing H8. No known mandatory defect, unresolved owned semantic case, or
  missing result remains in this candidate; independent review decides acceptance.
- Released packet/prerequisites are unchanged: K1.1 accepted H
  `52b1600f3b42e3a360fdc3395178f1d147edf304`, integrated
  `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`; correction-02 accepted H
  `719abbf9e55e7489b6255a08cbb9e97a1e960a5e`, integrated
  `954d31b00eb7f2412c22ccf7d4d079699f0c4032`. All precede B.
  This correction continues K1.2 only and releases no successor.
- Branch: `claude/k1.2-outcome-acceptance-receipts`.
- Previous identities (all verified by fetch before work began): C7
  `03a4afffff55050aca5a463694b47c2e60e19bd9`; H7
  `6cb906c31abcd9f44cc5fd207788cfabf7cb7794`; post-H7 mental-model payload
  `31ad130d27f73b406d8578710f7d6769e89361b2`; merged review/status commit
  `0d5937f1e8aea62453e88b59c08ae57af22e32ff` (branch head at pull time; working tree clean).
- Payload C8: `61059a3e43d7057de9be29f101a65ebed9416ae2`. H8 is the commit containing this
  report; the external handoff supplies its full SHA and advertised remote identity after
  non-force push.
- Exact C8..H8 allowlist: this `docs/development/work/K1.2/implementation-08.md`; the ten
  individually named `.txt` files under `docs/development/work/K1.2/validation-08/` in the
  validation table; and **only the K1.2 status row** of `docs/development/007-work-packets.md`.
  H8 introduces no scripts, fixtures, configuration, contract, canonical, test, or threshold
  changes. No mental-model, contract, source, test, script, fixture, threshold, or other payload
  change occurs in H8.
- C8 and its validation checkout were clean. The report/status/output attachments are the only
  planned H8 changes. Push pending at report creation; it cannot certify its own future push.

## What this round did and did not do

The current Opus 5.5 mental-model rewrite at `31ad130d...` was independently inspected (merged
review §Current correction state) and found semantically coherent. It is **carried forward
unchanged**, not redesigned or rewritten. In particular, all of the following are preserved
exactly as reviewed:

- `execution-cycle.md#submission-authority` as the single canonical owner;
- writer epoch as semantic attempt identity/fence;
- submission authority as attempt-bound authority;
- `DeliverySettlement` as per-physical-delivery reporting authority;
- ordinary redelivery preserving submission authority while receiving a fresh delivery
  settlement;
- takeover replacing submission authority while advancing the epoch;
- new exchange receiving a new attempt/authority;
- acceptance ordering: scope → accepted replay/conflict → exchange/currency → submission
  authority → content → atomic commit;
- the exact three-argument in-process binding
  `deliver(activation, settlement, submission): undefined`;
- all other KC1-ARCH-1 guarantees;
- the distinction between architecture semantics and the in-process `SubmissionGrant`
  representation recorded in BASELINE `#outcome-acceptance-api`.

**No runtime semantic correction was required.** No runtime source, existing test, existing
ablation, or authority semantic was touched. The audit below established no new concrete
defect, so none was fixed.

## Changes in this round (payload C8)

The correction delta from the current branch head `0d5937f` is exactly three documentation
files (4 insertions, 3 deletions), each verified against its current owner before editing:

- `mental-model/mechanisms/execution-cycle.md`: the persistence marker tightened from generic
  `OPEN(K3)` to `OPEN(K3.2)` (marker and the adjacent "When K3.2 settles it" prose). Mapping
  verified: the roadmap splits K3 into K3.1–K3.4, K3.2 is the narrow transactional persistent
  candidate, and `mental-model/roadmap.md#k32` explicitly lists `execution-cycle.md` among its
  expected owners. Ownership-label correction only; the persistence design is not expanded and
  no marker is resolved.
- `mental-model/rewrite-index.md`: the matching navigation reference tightened from `` `OPEN(K3)` ``
  to `` `OPEN(K3.2)` `` so the index and the marker agree. Both files were already inside the
  checks-07 seven-path Layer-3 set, so the round-7 allowlist shape is unchanged.
- `docs/development/README.md`: the stale front-door sentence ("the private target package
  currently supplies creation, ingress, reservation and dispatch only") now briefly and
  accurately includes the K1.2 Outcome-acceptance/exchange-control surface: creation, ingress,
  reservation, dispatch/redelivery, Outcome acceptance with receipts, authorized takeover and
  recovery holds (waits/deadlines stay K1.3, Effects K2). Verified against
  `002-implemented-kernel-baseline.md`. Kept concise; the front door remains a summary, not a
  second normative specification, and no packet acceptance/status was put into any mental-model
  specification page.

If either observation had already been correct in the pulled tree it would have been left
alone; both were stale, so both were corrected minimally.

| Finding | Disposition in this candidate (implementer assessment) |
|---|---|
| `K12-R7-PROC-01` (P2, the only blocking finding) | **Closed, pending independent review.** The current corrected tree is the starting point of fresh payload C8 (this commit), carrying the coherent `31ad130d` rewrite plus only the small wording/ownership cleanups above. Clean packet validation was rerun on exact C8 (table below), and this report-bearing H8 carries only the declared administrative allowlist with 007 set to WAITING_FOR_REVIEW. No revert or rewrite of the canonical correction was performed. |
| `K12-R6-LAYER3-01` | **Remains closed by its existing evidence; re-audited, not re-fixed.** Owner authorization stands recorded in [decision-01](decision-01.md); canonical ownership and acceptance ordering are coherent under the single execution-cycle owner; the historical KC1-ARCH-1 record stays sealed. Fresh C8 sweep (attachment 10): no stale current two-argument Driver binding description (remaining two-argument mentions are sealed history or explicit supersession prose, plus structurally compatible two-parameter test doubles); no per-delivery submission-authority description; no wording turns `SubmissionGrant` into a universal token/wire/remote credential. |
| `K12-R6-EVID-01` | **Remains closed by its existing evidence; re-run, not re-fixed.** Saved-reference grant tests exist; the first grant remains usable across ordinary redelivery; the post-takeover attempt's first grant remains usable across redelivery; the superseded grant remains fenced; B10 rejects per-redelivery grant rotation (450 tests, 448 pass / 2 fail); B11 rejects takeover-epoch redelivery rotation (450 tests, 449 pass / 1 fail). No test or ablation was weakened or altered to obtain counts. |
| `K12-R6-DOC-01` (P3) | **Repaired in C8** by the front-door summary correction above. It was verified against the baseline rather than churned for diff. |
| All earlier rounds' findings | Retained with their recorded dispositions (implementation-01..07, submission-audit-06, reviews 01–07-merged); rechecked in the cumulative re-audit below, not immunized by historical PASS. |

## Cumulative self-review under 012 (B through C8)

The full cumulative packet was re-audited rather than assuming earlier PASS. Performed on the
pulled tree before packaging, and re-verified by the fresh checks-07 rerun at exact C8:

- Inspected the cumulative `B..C8` packet diff and the correction delta from `31ad130d...`
  (seven canonical/navigation mental-model files, carried forward) and from the branch head
  `0d5937f` (the three small corrections above, plus the review/status record itself).
- Confirmed no runtime/test/ablation change occurred: `B..C8` runtime source is byte-identical
  to the round-7-audited code (checks-07 PASS: all runtime source bytes unchanged from H5;
  all 30 pre-existing kernel test/helper files retain printed syntax including assertions;
  ablations byte-identical including B10/B11).
- Confirmed all sealed historical implementation/review/decision/evidence records remain
  unchanged (checks-07 PASS: 66 sealed historical files unchanged from H6).
- Confirmed the old rewrite drafts remain absent (checks-07 PASS).
- Confirmed one normative owner for submission authority: every `submission-authority`
  reference in `core.md`, `identity.md`, `integration.md`, `reference.md`, `sources.md`, and
  `rewrite-index.md` routes to `execution-cycle.md#submission-authority`; `reference.md` stays
  navigation; BASELINE records only the in-process representation.
- Searched for stale current two-argument Driver binding descriptions and incorrect
  per-delivery submission-authority descriptions: none found outside sealed history, explicit
  supersession prose, and compatible test doubles.
- Confirmed no wording turns `SubmissionGrant` into a universal token/wire/remote credential
  concept (execution-cycle §Submission authority and rewrite-index §4 both fix no universal
  representation).

Selected methods: normative decisions (carrier-extension scope, three separate powers,
replay/fencing/authority ordering, refusal vocabulary — rechecked against the unchanged
canonical owner); deterministic execution (controlled Drivers, saved-reference lifetime
schedules, distinguishing mutations B10/B11 with the 25-prior ablation set — freshly rerun);
narrow race/fault (synchronous reentry during delivery and the safety callback, saved late
callbacks — covered by the unchanged suites, freshly rerun); and process/documentation
(sealed history, C/H scope and evidence, reference maintenance — freshly rerun via checks-07
and link checks). No native fidelity, process-death durability, E0–E6 acceptance, or public
packaging claim is made; those methods remain excluded under the contract's sibling
assignments.

Criterion recheck (runtime proven byte-identical to the round-7-audited code; every
behavioral gate below freshly rerun on exact clean C8):

| Criterion | Recheck performed and assessment |
|---|---|
| C1–C4 | Code paths byte-identical (checks-07); scoping/replay/ordering/atomicity suites rerun: full 2,504/2,504, kernel 450/450. No new observation. |
| C5–C7 | Continue/complete/fail, terminal disposition, Effect/wait refusal paths byte-identical; terminal/unsupported suites rerun green. No new observation. |
| C8–C10 | Takeover, recovery-hold, and control-vs-attempt power paths byte-identical; takeover/recovery/permitted suites plus B10/B11 rerun with the exact distinguishing failures (B10: 448/2; B11: 449/1). No new observation. |
| C11–C12 | Late-report attribution and receipt/evidence-immutability paths byte-identical; late-report/terminal suites rerun green. No new observation. |
| C13–C14 | Envelope/hostile-capture paths and inventory guards byte-identical; hostile/limits suites and conformance inventory rerun green (conformance 1,945/1,945; SDK 22/22). No new observation. |
| C15 | **Re-audited with the tightened marker.** The canonical delivery signature, both lifetimes, and the acceptance order remain stated once in execution-cycle.md under decision-01; `OPEN(K3.2)` marker and rewrite-index reference now agree with the roadmap K3.2 expected owners; identity/core/integration carry links only; sources/rewrite-index/reference/BASELINE point to that owner; historical KC1-ARCH-1 stays sealed. checks-07 verifies the seven-path Layer-3 allowlist, sealed history, drafts absent, no legacy/SDK changes, and 462 local links/anchors. |

No further in-scope defect was established. The strongest remaining risk is the ordinary one
for a review-ready candidate: the independent reviewer must confirm the carried-forward
canonical wording, the sweep, and the evidence. No silent architectural choice was made — the
only payload edits in C8 are the two reviewed ownership-label corrections above.

## Clean validation and immutable evidence

Validation ran at detached clean C8 in
`/var/folders/c3/jvkvjr6d701gtyf5sf6gn_fw0000gn/T/k12-r8-valid/checkout`, a local clone
checked out at C8 (`61059a3e43d7057de9be29f101a65ebed9416ae2`) with existing dependencies
copied and workspace links resolving within the clone. No dependency fetch or lockfile
change. Logs were written outside it and attached only after execution. macOS 26.6.2
(25G83), arm64; Node v25.2.1, npm 11.6.2, TypeScript 5.9.3. Validation window
2026-09-25T18:53:34.214Z–2026-09-25T18:57:45.553Z (first-step start to last-step finish).
Every attachment independently records C8/B, source branch, exact command/cwd,
versions/environment variables, relevant configuration and script/test/contract SHA-256
values, pre/post empty porcelain, UTC times, output bytes/hash and exit. The attachment hash
covers the entire file; its embedded output hash covers the exact output bytes between
markers (stdout followed by stderr), excluding the separator newline.

| Command/check | Result | Immutable attachment / SHA-256 |
|---|---|---|
| `tree/environment probes` | clean detached C8; exit 0 | [01-tree-and-environment.txt](validation-08/01-tree-and-environment.txt) `8a90d08960a54e09a52430b412b4fa4a89d53a25c87cc16a71f44cecc7b01eb1` |
| `npm run typecheck` | typecheck exit 0 | [02-typecheck.txt](validation-08/02-typecheck.txt) `304d6b2d6fc2672a4605f96a351398d37677a7d42c484b1f28699b13b1226cac` |
| `npm test` | 2,504 pass / 416 suites; 0 fail/cancel/skip/todo; exit 0 | [03-test-full.txt](validation-08/03-test-full.txt) `92e7572843e5dfb2a36a5e113cad31d19bb87c269a404ca09d14b0b11aeaa823` |
| `npm run test:kernel` | 450 pass / 116 suites; 0 fail/cancel/skip/todo; exit 0 | [04-test-kernel.txt](validation-08/04-test-kernel.txt) `1a8bc7e754a0c87d4900565939ace3418799906f259daebe34bf83e1f0594989` |
| `npm run test:conformance` | 1,945 pass / 282 suites; 0 fail/cancel/skip/todo; exit 0 | [05-test-conformance.txt](validation-08/05-test-conformance.txt) `32cbb29084771848138cb9b1e8f4f2db53d7e7b367d1fbbb3136d3387fc0bea5` |
| `npm run test:sdk` | 22 pass; 0 fail/cancel/skip/todo; exit 0 | [06-test-sdk.txt](validation-08/06-test-sdk.txt) `87e4bdba293220557fa2843be4295bceda509a2a327aeb45b294e26cb2bed511` |
| `npm run check:builder-docs` | 72 Markdown files / 1,784 links and anchors / 38 imports; exit 0 | [07-check-builder-docs.txt](validation-08/07-check-builder-docs.txt) `eacfde8cb9a0bfebb6420f911e202a3cebcc31a77e30eb9ae5a4265a1c690db9` |
| `node docs/development/work/K1.2/ablations.mjs` | 450/450 control; 27/27 mutations rejected, incl. B10 (448 pass / 2 fail) and B11 (449 pass / 1 fail); exit 0 | [08-ablations.txt](validation-08/08-ablations.txt) `565242021a5e7c0a54bf3e84123930a4a860984117a24137e5ed0f4d9ae28a96` |
| `node docs/development/work/K1.2/checks-07.mjs` | runtime/test/ablation/history/draft/scope/link preservation; exit 0 | [09-preservation-and-links.txt](validation-08/09-preservation-and-links.txt) `49de0cb984ce63b4455e9f20bf88e9fadcb63e72020034d11e30575093cc90aa` |
| `git show/diff/grep (exact commands in attachment)` | inspected KC1 authority, H6 context, cumulative delta and grant/carrier occurrences; exit 0 | [10-authority-and-candidate-context.txt](validation-08/10-authority-and-candidate-context.txt) `b120b883a6b761be740ebcb192566e15731eff169360ccc09893b08f189a11be` |

The ablation output bytes are identical to round 7's (output-sha256 `741a3c52…` reproduced),
as expected: neither the runtime nor the ablation set changed, and the two lifetime mutations
still fail exactly the saved-reference schedules. The checked-in `checks-07.mjs` is payload
from C7; H8 carries only its output. Attachment 10 contains the inspected historical KC1
decision and current signature/grant search results, explicitly separate from executed
behavioral evidence. No temporary-path-only result is offered as immutable evidence. The
builder-docs link count moved 1,776 → 1,784 because the tree now also contains the H7 report,
validation-07 evidence, review-07-merged, and the C8 corrections; the check itself passes
with exit 0.

Config SHA-256 at C8 (recorded in every attachment): ablations.mjs
`90996ac232a3d661d190e101836d9536032bdfc319d97de606b63a6aae473ba5`,
checks-07.mjs `dd7be8dd74d7d5e313e782097b3362eb22dda4bf46f427c5e349b8411ba58a88`,
contract.md `62a637b4d3eddb308de78cc23f3985b43e168a1cdebb0b729503dc78a0e52741`,
decision-01.md `0fca83a370a5612745dec362cb430aa587394fec11c8804fa1cfa101bcf877c9`,
execution-cycle.md `e4bd1e2ec73c33ae1ac313e2f454fdfea741b0d5f2547e9f60639199447d5091`,
package-lock.json `a34ef0cd89cee1da26347238cff32b9872075290fdafba32f1b8717e16c88b8d`,
package.json `081c2ce88c9d98d14b2b73e98543aa4c8108273bc0ec10b5cd130abd01cf11c1`,
packages/kernel/package.json
`47730f2e954a42ca75a54e114db704d4e41d579a2818ce8b97b4a192cc82d5a5`,
submission-lifetime.test.ts
`f3630194f2fe456583156314fa8bbf9148396afa6cc12cbfbbc810f375d39401`,
tsconfig.json `596a75a819d6b1ce928e3760e8bf25bf49fa78c3ff13b9fd229b5e82eb380ec4`.

Not run: Agent/model evals (no Agent/model behavior changed), paid/live providers, native
Runtime fidelity, process-kill/durable recovery, package publication, or external E
fixtures/gates. No external fixture was prepared or accepted and no E1/K1 closure is
claimed. No third-party reuse was added; the existing dependency allowance remains
unchanged. Contract OPEN-1–OPEN-4 remain: no mutable acceptance-policy surface, bounded
roots but no aggregate transport limit, unbounded in-memory logs, and no
durability/isolation/Driver fidelity.

## Handoff

This candidate is ready for independent review: base B
`a20d278185eaffc7f8b7489345a3624231ff6e6d`, payload C8
`61059a3e43d7057de9be29f101a65ebed9416ae2`, report-bearing H8 supplied in the external
handoff with its verified advertised branch SHA after non-force push. Independent reviewer:
inspect B..H8 and the `31ad130d`..C8 and head..C8 correction deltas, verify the C8..H8
allowlist and evidence, assess all finding dispositions above (especially the
`K12-R7-PROC-01` closure and the carried-forward R6 LAYER3/EVIDENCE closures), and re-review
the whole cumulative packet — prior PASS is not immunity. No self-acceptance is claimed
here. No merge, integration receipt, K1.3 release, or ACCEPTED marking is made; the owner
selects the reviewer and transcribes the verdict.

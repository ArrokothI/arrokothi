# Implementation report — K1.2, round 9

## Identity

- Packet/parent: K1.2 / K1; [contract](contract.md) revision 7 (unchanged — no criterion,
  threshold, or obligation was added, relaxed, or reworded). Governing 006/007/008/012 and B:
  `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Author: Muse Spark, implementer, 2026-09-25, working the merged round-8 review
  ([review-08-merged](review-08-merged.md)). This is not a reviewer session, not an acceptance,
  and not an integration or release.
- State: **WAITING_FOR_REVIEW**. This round repackages the candidate to close `K12-R8-DOC-01`
  as an implementer assessment; independent review decides acceptance.
- Released packet/prerequisites are unchanged: K1.1 accepted H
  `52b1600f3b42e3a360fdc3395178f1d147edf304`, integrated
  `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`; correction-02 accepted H
  `719abbf9e55e7489b6255a08cbb9e97a1e960a5e`, integrated
  `954d31b00eb7f2412c22ccf7d4d079699f0c4032`. All precede B. This correction continues K1.2
  only and releases no successor.
- Branch: `claude/k1.2-outcome-acceptance-receipts`.
- Payload C: `61059a3e43d7057de9be29f101a65ebed9416ae2` (C8, reused unchanged). No payload
  semantics needed to change, so per 006 ("any payload change requires a new C") no new
  source/mental-model edit was invented merely to manufacture a payload diff. The C8 payload
  remains semantically valid; the current administrative review head `28d9f2c` is treated as
  review history, not as a reason to redo C8's architecture work.
- Previous report-bearing H8: `ad4a0e8b4bcfa5e3064a53024fe49ae3d63f38c7`. Previous review head:
  `28d9f2ce16d9af456bbe3a98b3b1815bb419cbb7` (review-08-merged + interim status row).
- Candidate H9: the commit containing this report; the external handoff supplies its full SHA
  and advertised remote identity after non-force push.
- Exact C8..H9 file list: `docs/development/work/K1.2/review-08-merged.md` (review history,
  already committed at the review head); the K1.2 status row of
  `docs/development/007-work-packets.md` (interim CHANGES_REQUESTED transcription at the review
  head, superseded in H9 by the WAITING_FOR_REVIEW row below); this
  `docs/development/work/K1.2/implementation-09.md`; and the ten individually named `.txt`
  files under `docs/development/work/K1.2/validation-09/` in the validation table. H9
  introduces no scripts, fixtures, configuration, contract, canonical, test, threshold, or
  other payload changes. No mental-model, contract, source, test, script, fixture, threshold,
  or other payload change occurs in H9.
- The validation checkout was clean at C8. The report/status/output attachments are the only
  H9 changes. Push pending at report creation; it cannot certify its own future push.

## Defect corrected: K12-R8-DOC-01

H8's K1.2 ledger row contained `[validation-08](work/K1.2/validation-08/)`.
`scripts/check-builder-docs.ts` scans `docs/development/007-work-packets.md`, and for a link
target that resolves to a directory it checks that directory's `README.md`
(`check-builder-docs.ts:61`). `docs/development/work/K1.2/validation-08/` holds ten `.txt`
evidence attachments and no `README.md`, so `npm run check:builder-docs` passed on C8 but
failed on exact H8 with `docs/development/007-work-packets.md: missing target:
work/K1.2/validation-08/`. C1–C14 passed the round-8 review; only C15 was blocked, solely by
this administrative link.

Correction (packaging only — no architecture, runtime, test, or ablation change):

- The H9 K1.2 row is concise and links only valid repository file targets: this
  implementation report and the merged round-8 review. No validation directory is linked.
- No `validation-08/README.md` (and no `validation-09/README.md`) was created: neither index
  has an independent documentation purpose, and a workaround file would preserve the
  gratuitous directory link the review forbids.
- The live row no longer contains the bare evidence-directory link and must not regain one.

| Finding | Disposition in this candidate (implementer assessment) |
|---|---|
| `K12-R8-DOC-01` (P2, C15 — the only blocking finding) | **Closed, pending independent review.** The ledger row links only checker-valid file targets; the affected documentation gate was re-verified on the exact H9 tree after H9 was created (see "Post-H9 verification" — honest post-H evidence, not embedded in H9). |
| `K12-R6-LAYER3-01`, `K12-R6-EVID-01`, `K12-R7-PROC-01`, `K12-R6-DOC-01` | **Remain closed; preserved, not revisited.** No submission-authority architecture work was redone; the audit below established no new concrete defect. B10/B11 distinguishing evidence is preserved and freshly rerun (see validation table). |
| C1–C14 | PASS per the round-8 independent review; runtime/tests/ablations are byte-identical to the reviewed tree (see preservation checks) and all behavioral gates were freshly rerun. |

## Cumulative re-review (B through C8 payload; review history through H9)

Re-inspected the cumulative `B..H9` packet, the `C8..H9` administrative delta, and the
carried-forward `31ad130d` canonical delta. The payload tree at C8 is unchanged since the
round-8 review: checks-07 rerun at C8 confirms runtime source bytes unchanged from H5, all
30 pre-existing kernel test/helper files retain printed syntax including assertions, the
ablation set is byte-identical including B10/B11, all 66 sealed historical files are
unchanged from H6, rewrite drafts remain absent, the Layer-3 change set is exactly the
authorized seven paths, no legacy/SDK/integration source changed, and 462 local
links/anchors resolve. Authority/candidate-context search re-run: single canonical owner
`execution-cycle.md#submission-authority`; no stale current two-argument binding description
outside sealed history, explicit supersession prose, and compatible test doubles; no
per-delivery submission-authority wording; no universal token/wire/remote-credential wording
for `SubmissionGrant`.

Selected 012 methods (same exclusions as round 8: no native fidelity, process-death
durability, E0–E6 acceptance, or public packaging claims): normative decisions (single
owner, both capability lifetimes, acceptance order — reinspected, unchanged); deterministic
execution (saved-reference schedules, B10/B11 — freshly rerun); narrow race/fault (unchanged
suites — freshly rerun); process/documentation (sealed history, C/H scope, link validation —
freshly rerun, plus the new exact-H9 gate check). No architecture rewrite or new
submission-authority design was undertaken; none is requested unless new evidence
establishes a concrete defect.

## Immutable validation performed on C8

Validation ran at detached clean C8 in
`/var/folders/c3/jvkvjr6d701gtyf5sf6gn_fw0000gn/T/k12-r8-valid/checkout`, a local clone
checked out at C8 (`61059a3e43d7057de9be29f101a65ebed9416ae2`) with existing dependencies
copied and workspace links resolving within the clone. No dependency fetch or lockfile
change. Logs were written outside it and attached only after execution. macOS 26.6.2
(25G83), arm64; Node v25.2.1, npm 11.6.2, TypeScript 5.9.3. Validation window
2026-09-25T20:17:26.236Z–2026-09-25T20:21:27.463Z (first-step start to last-step finish).
Every attachment independently records C8/B, source branch, exact command/cwd,
versions/environment variables, relevant configuration and script/test/contract SHA-256
values, pre/post empty porcelain, UTC times, output bytes/hash and exit. The attachment hash
covers the entire file; its embedded output hash covers the exact output bytes between
markers (stdout followed by stderr), excluding the separator newline.

These results are **about C8 only** and are honestly labeled as such. They do not by
themselves certify H9, which additionally modifies the scanned 007 ledger — hence the
explicit post-H9 verification below.

| Command/check | Result | Immutable attachment / SHA-256 |
|---|---|---|
| `tree/environment probes` | clean detached C8; exit 0 | [01-tree-and-environment.txt](validation-09/01-tree-and-environment.txt) `6c3707d58eeeb0164a03fe8c5d8556a5a8064c2c757b08ed793b9dddeea45b5d` |
| `npm run typecheck` | typecheck exit 0 | [02-typecheck.txt](validation-09/02-typecheck.txt) `ce4d890457f06b5c7202d876915aff71049a5cd7a48ada696e6bc419b37e889d` |
| `npm test` | 2,504 pass / 416 suites; 0 fail/cancel/skip/todo; exit 0 | [03-test-full.txt](validation-09/03-test-full.txt) `eda6b3c7789db6b8f65d80c53eccdd7705aab61afb8fd8479c5e5e5d2eee3c15` |
| `npm run test:kernel` | 450 pass / 116 suites; 0 fail/cancel/skip/todo; exit 0 | [04-test-kernel.txt](validation-09/04-test-kernel.txt) `ca991b0cd47d9c292a3d292ba4d953b4990e2ca4a12ed43d18dedb2708c1593e` |
| `npm run test:conformance` | 1,945 pass / 282 suites; 0 fail/cancel/skip/todo; exit 0 | [05-test-conformance.txt](validation-09/05-test-conformance.txt) `6c9690018c739207d511f3b3f762b08db6ea025d79e6a71272779211f2068b5c` |
| `npm run test:sdk` | 22 pass; 0 fail/cancel/skip/todo; exit 0 | [06-test-sdk.txt](validation-09/06-test-sdk.txt) `fbd56250cb1af78b7518e334d4f8de008af58ded6fd462b8e4028e7723db29bf` |
| `npm run check:builder-docs` | 72 Markdown files / 1,784 links and anchors / 38 imports; exit 0 | [07-check-builder-docs.txt](validation-09/07-check-builder-docs.txt) `ce2617fed3525ef3d1a5a3fa80961dd98901d90dc9431af5ca2e4369f094edaa` |
| `node docs/development/work/K1.2/ablations.mjs` | 450/450 control; 27/27 mutations rejected, incl. B10 (448 pass / 2 fail) and B11 (449 pass / 1 fail); exit 0 | [08-ablations.txt](validation-09/08-ablations.txt) `297cc857faaee07f4ba628f32c3d794d8d24a7b4918c2a95dbdbabf2279caf0b` |
| `node docs/development/work/K1.2/checks-07.mjs` | runtime/test/ablation/history/draft/scope/link preservation; exit 0 | [09-preservation-and-links.txt](validation-09/09-preservation-and-links.txt) `c6eb87fa43739f4f75da3f3e2dd03390658efabd721bf1a7a16a150090b5d895` |
| `git show/diff/grep (exact commands in attachment)` | inspected KC1 authority, H6 context, cumulative delta and grant/carrier occurrences; exit 0 | [10-authority-and-candidate-context.txt](validation-09/10-authority-and-candidate-context.txt) `359a8b4f7392c5e2331ec0059f1b7d4d386ba57195cff7b335ed6662fc2f0a1f` |

The checked-in `checks-07.mjs` is payload from C7; H9 carries only its output. Attachment 10
contains the inspected historical KC1 decision and current signature/grant search results,
explicitly separate from executed behavioral evidence. No temporary-path-only result is
offered as immutable evidence.

Not run at C8: Agent/model evals (no Agent/model behavior changed), paid/live providers,
native Runtime fidelity, process-kill/durable recovery, package publication, or external E
fixtures/gates. No external fixture was prepared or accepted and no E1/K1 closure is
claimed. No third-party reuse was added; the existing dependency allowance remains
unchanged. Contract OPEN-1–OPEN-4 remain.

## Post-H9 verification (NOT part of H9; reported here and in the handoff)

Because H9 modifies the checker-scanned `docs/development/007-work-packets.md`, the C8
builder-docs result cannot certify H9 — the exact lesson of `K12-R8-DOC-01`. After H9 was
created, with a clean working tree at exact H9, the affected documentation gate (and, as a
confidence check, the entire command plan) was rerun on exact H9. Embedding those runs into
H9 would change H9, so they are reported in the external handoff — with exact H9 SHA,
pre/post empty `git status --porcelain`, exact command, exit code, file/link/import counts,
and raw output/digest — rather than presented as committed attachments. The handoff's
verified remote branch SHA equals H9. No C8 result is claimed as an H9 result anywhere in
this report.

## Handoff

This candidate is ready for independent review: base B
`a20d278185eaffc7f8b7489345a3624231ff6e6d`, payload/validation anchor C8
`61059a3e43d7057de9be29f101a65ebed9416ae2` (unchanged payload, fresh round-9 rerun
evidence above), previous H8 `ad4a0e8b4bcfa5e3064a53024fe49ae3d63f38c7`,
review-08-merged (unchanged review history), and report-bearing H9 supplied in the external
handoff with its verified advertised branch SHA after non-force push plus the exact-H9
gate verification. Independent reviewer: recheck cumulative B..H9, verify the C8..H9 file
list and the exact-H9 documentation-gate result, and assess the `K12-R8-DOC-01` closure —
prior PASS is not immunity, but no architecture rewrite is requested. No self-acceptance is
claimed here. No merge, integration receipt, K1.3 release, or ACCEPTED marking is made; the
owner selects the reviewer and transcribes the verdict.

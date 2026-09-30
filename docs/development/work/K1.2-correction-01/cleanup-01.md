# K1.2-correction-01 — final cleanup 01

## Authority and checked state

Owner instruction, 2026-09-30: run 009's Prompt C final cleanup for the submitted packet. That
covers the final check, administrative closure or evidence-based reopening, commits, and a non-force
push of the scoped branch. The owner merges manually on GitHub.

Role: owner-delegated cleanup agent, Claude Code (`claude-opus-5-5`), a new session on 2026-09-30.
Earlier Claude Code sessions with the same model implemented rounds of this packet, including the
accepted report, [implementation 09](implementation-09.md). This cleanup is therefore not a review,
and it grants no acceptance. It transcribes the independent Codex verdict below and adds
administrative records only.

Governing 006/008/012 baseline: `a20d278185eaffc7f8b7489345a3624231ff6e6d`. The
[check-records](check-records.mjs) run below confirms those three files are unchanged through this
tree.

Pre-cleanup state:
- Local and fetched remote branch head: `4156646dbbc3aeac1f55074440fa34cf6620f484`.
- Working tree: clean, apart from the untracked owner-supplied
  [revision-10 review](review-revision-10-independent-2026-09-30/README.md) directory.
- Fetched and advertised remote main: `a20d278185eaffc7f8b7489345a3624231ff6e6d`, equal to base B.
  Main therefore has no change that could conflict with or invalidate the review, and the branch
  fast-forwards onto it.

## Accepted identity and post-review disposition

- Base B `a20d278185eaffc7f8b7489345a3624231ff6e6d`; owner correction release
  `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`; payload C `e19d8e7f14bfe3fd661c22b3796a1eca365c3ec0`.
- Accepted H `b7191dbf630defeff7756122a6798e15d0b73dd3`, [contract](contract.md) revision 10.
- Authentic [independent review](review-revision-10-independent-2026-09-30/review.md): Codex desktop
  session, GPT-6 per its session instructions (serving variant not exposed), 2026-09-30. Verdict:
  ACCEPT for H only.
- A `b0ff7052aa8993d7547fbde48123dd058d2e0107`: review/status transcription.

Identity checks: B → release → C → H → `4156646` → A is one ancestry chain. K1.2 H14
`c36cbe04f7c97f198794bfede972d4861247cca0` is an ancestor of the release. The prerequisite K1.1
integrations (`b53ccb4`, `954d31b`) are ancestors of B.

C..H is exactly the report's declared allowlist: 76 paths, namely the report, the 007 status row and
74 validation-09 output attachments. No evaluator, script or fixture sits in C..H.

H..A contains two commits, and both are review/status transcription only:
- `4156646` records the owner-published [independent revision-9 review](review-revision-09-independent-2026-09-30/README.md)
  of the older H `4a917f8caac04e7d9861e0ec3638662d52f9d3ae` (CHANGES REQUIRED), its owner note,
  handoff, evidence bundle and one 007 note. It changes no payload.
- A adds the four revision-10 review files byte-for-byte and rewrites the K1.2-correction-01 status
  row as the ACCEPTED transcription.

The revision-10 reviewer saw `4156646` and did not certify it. No code, test, contract or evidence
changed after H.

Review delivery verification (reproduced here, not only read):
- The archive's SHA-256 `53ec15544d923eb4548187266101c5ecfdca4b2cd6246a37e10b2924867ba634` and size
  of 78,330,000 bytes match the [delivery note](review-revision-10-independent-2026-09-30/README.md)
  and `verification.json`.
- The internal `MANIFEST.sha256` digest `f81804e8…d20` matches, and all 239 of its entries verify.
- The bundled `review.md` equals the committed one: SHA-256 `83d0eeef…adcd`.
- The bundled `source-H.tar` equals `git archive` of H.
- The revision-9 bundle's SHA-256 `947309dc…aac1` matches its README.

Findings: none open. The review closes `K12C1-R12-ORACLE-01`, `K12C1-R12-SCOPE-01`,
`K12C1-R9I-ORACLE-01` and `K12C1-R9I-SCOPE-01`. It passes K1.2 C1–C15 and correction DEC-1–9. V-D1
and the transferred cost/evidence work are DEFERRED to K1.1-correction-03, whose seed carries them.
Earlier P3 observations keep their recorded non-blocking status.

## Layer-3 verification

The reviewed candidate carries its Layer-3 maintenance. This cleanup found no missing, stale or
contradicted canonical text and makes no Layer-1, Layer-2 or Layer-3 change.

The start was [the roadmap's K1.2](../../../../mental-model/roadmap.md#k12) and
[K1.2-correction-01](../../../../mental-model/roadmap.md#k12-correction-01) sections, read against the
full B..H delta under `mental-model/`.

**Accepted semantic sources.** K1.2 [decision-01](../K1.2/decision-01.md) (the delivery carrier's
third argument), [decision-02](../K1.2/decision-02.md) (Activation-coordinate classification) and
decisions [03](../K1.2/decision-03.md)/[04](../K1.2/decision-04.md) (the caller/engine cost boundary).
Also [decision-05](../K1.2/decision-05.md) (the future V-D1 meter, correctly not installed in values
prose), amendments [01](amendment-01.md)–[03](amendment-03.md) and the contract's DEC-1–9.

**Owners changed in the candidate:**
- [execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md): the new
  `#submission-authority` section is the single definition of the term. The `#outcome-acceptance`
  order is exchange → authority → content, with per-coordinate staleness. The delivery boundary and
  the retry-versus-takeover table were extended.
- [identity](../../../../mental-model/concepts/identity.md): Activation-identity producer/consumer
  closure and its `OPEN(implementation)` marker; the knowledge-versus-authority paragraph at
  `#writer-epoch`.
- [values](../../../../mental-model/concepts/values.md): the live-Proxy and Kernel-selected cost
  boundary, the diagnostic-construction obligation, and the diagnostic-storage
  `OPEN(implementation)` marker.
- [core](../../../../mental-model/concepts/core.md) and
  [integration](../../../../mental-model/mechanisms/integration.md): each link to the owner.
- [reference](../../../../mental-model/reference.md): index rows for submission authority/`SubmissionGrant`
  and for the delivery report.
- [rewrite-index](../../../../mental-model/rewrite-index.md): decision-map rows and §4 binding choices.
- [roadmap](../../../../mental-model/roadmap.md) and [sources](../../../../mental-model/sources.md).

**Dependencies inspected, with no change needed:**
- [state](../../../../mental-model/concepts/state.md#recovery-and-re-execution): recovery-held
  `RUNNING`, not `WAITING` or failed. This matches both hold kinds.
- [evidence](../../../../mental-model/mechanisms/evidence.md): held `RUNNING` shows its reason and
  permitted actions. This matches `permittedNextActions`.
- [lifecycle](../../../../mental-model/mechanisms/lifecycle.md): cancellation's terminal disposition
  stays K1.3.
- [core](../../../../mental-model/concepts/core.md#batch-reservation-and-acknowledgment): exactly two
  Event dispositions. This matches `complete`/`fail` terminal disposition.
- [recovery](../../../../mental-model/mechanisms/recovery.md): takeover requires native exclusion or
  refusal, and missing code holds, migrates or fails. This matches `isSafeToReplace` and the code
  hold.
- [output](../../../../mental-model/mechanisms/output.md): Emission identity at acceptance;
  observation stays K4.4.
- [authority](../../../../mental-model/mechanisms/authority.md#establish-identity-at-trusted-ingress)
  and [waits](../../../../mental-model/mechanisms/waits.md): `await` stays refused until K1.3.
- Layer 2 (`kernel.md`, `driver.md`, `runtime.md`) and Layer 1 (`README.md`): nothing there restates
  the delivery signature or the acceptance order. Submission authority is a detail inside the
  existing Activation/Outcome boundary, not a new major abstraction.
- Only `execution-cycle.md` and `sources.md` spell `deliver(`, and both give the three-argument form.
  `sources.md` names the old two-argument form only as the provenance being replaced.

**Placeholders.** None is finally defined by this packet. The Activation-identity, writer-epoch and
diagnostic-storage markers record the in-process choice and stay open by the rewrite-index
convention. The new `OPEN(K3.2)` marker keeps restart survival of submission authority undecided.

**Links.** Link checks cover every Markdown file in `mental-model/`, the live `docs/development/`
pages and these new records. The results are under "Cleanup verification and limits".

## Administrative edits in this cleanup

- [007](../../007-work-packets.md):
  - The introduction no longer describes only K1.2's first three candidates. This closes review 13's
    P3 observation 2.
  - The K1.2 row gains a dated pointer to the accepted correction; the owner's integration record
    still decides the H14 hold.
  - The K1.2-correction-01 row links this record.
- [002](../../002-implemented-kernel-baseline.md): one status-pointer sentence changed. It said
  "until independent review", which implied that review would end the V-D1 hold. It now says only
  that acceptance status and the V-D1 claim hold are recorded in 007. No semantic or behavioral
  change.
- [014](../../014-owner-progress-summary.md): rewritten in place under its maintenance rules.

Review 13's P3 observation 1 concerns wording inside the sealed [K1.2 contract](../K1.2/contract.md)'s
closed OPEN-5 history. It stays untouched: the record is sealed and `check-records.mjs` pins it.

## Cleanup verification and limits

Reruns, from the checkout at A. Its code, tests and configuration are byte-identical to H; the
tree differs only by records. Environment: Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, darwin
arm64. No install and no lockfile change. The key output is quoted below.
- `npm run typecheck`: exit 0.
- `npm test`: exit 0. 3,774/3,774 tests in 447 suites; none failed, cancelled, skipped or todo.
- `npm run test:kernel-sweeps`: exit 0, in 654 s.
  - Fault sweep: 66 scenarios, 54,288 runs, 0 violations, 35 intercepted operations; exit
    inventory 57/57 taken.
  - Poison sweep: 1,712/1,712 tests in each of the off, count, throw and reenter modes, across 43
    test files and 310 poisoned names. Each mode has 11,532 windows and 11,578 traced calls. Every
    poisoned window has its liveness probe, and there are 0 zone firings.

Checks on the final administrative tree (A plus this cleanup's edits):
- `node docs/development/work/K1.2-correction-01/check-records.mjs`: exit 0. Ancestry and sealed
  records are preserved, and 006/008/012 are unchanged since B. The link check covers 26 files and
  714 links/anchors. The reviewer's run at H found 713; the net difference is in 007's rewritten
  K1.2-correction-01 row.
- `npm run check:builder-docs`: exit 0. 72 Markdown files, 1,846 links/anchors and 38 package
  imports.
- A local file-and-anchor check over all of `mental-model/`, the live `docs/development/*.md` pages,
  this record and the revision-10 review's README and report: 52 files, 1,672 links, 0 broken. A
  planted bad anchor and a planted missing file were both reported.
- `git diff --check`: clean.

Inspected, not rerun: the review's own reruns, controls and scope probe; the 73 validation-09
evidence entries (the reviewer verified their hashes); historical ablation and mutation collections.
No Node 22 run, clean install, native integration, process death, packaging or E1 evidence was
produced. The review states the same limits.

Third-party material: no new source, dependency, service or asset was incorporated.

Repository footprint: the committed evidence bundle is 78,330,000 bytes, above GitHub's 50 MB
warning and below its 100 MB limit. That is where the reviewer's delivery note puts it. Moving it
to the archive is an owner choice under [archive](../../archive.md).

## Owner items

These items block nothing here:
- The [K1.1-correction-03](../../007-work-packets.md#k11-correction-03--metered-value-refusal-cost)
  seed names "K1.2-correction-01 revision 6 accepted" as a prerequisite, on the grounds that the
  production source is unchanged. Revision 10 is what was accepted, and it changes production code
  under amendment 02. Confirm that dependency when releasing K1.1-correction-03.
- [Invalidation-01](../K1.2/invalidation-01.md) holds integration of H14 as accepted K1.2 work. This
  ACCEPT of the cumulative candidate that contains H14 does not lift that hold. The owner's
  integration record should state the hold's disposition.
- The owner discussion under 006's learning loop is still pending.

## Disposition and owner handoff

Cleanup complete. Independent acceptance is bound only to H above. Integration is pending the
owner's manual merge. This file is not an integration receipt. It closes neither K1 nor E1, and it
releases neither the V-D1 hold nor K1.3. The external handoff supplies the final pushed head and the
advertised remote SHA after verification. This file does not certify a future push or name its own
commit.

Next owner action: manually merge `codex/k1.2-correction-01-activation-identity`, then verify the
merge and record integration separately. Record the discussion and `next_release` there.

`next_release: none`

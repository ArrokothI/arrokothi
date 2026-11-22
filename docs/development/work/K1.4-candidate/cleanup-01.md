# K1.4-candidate — final cleanup 01

## Authority and identity

Owner-delegated Prompt C cleanup, 2026-11-21, by a Claude Code desktop session (`claude-opus-5-5`). This is a
fresh session: before this cleanup it wrote, checked and reviewed no K1.4-candidate record. The implementer was a
Claude Fable 5.2 session, and every design check and review was by Codex GPT-6. The owner's instruction of
2026-11-21, in summary:
- fast-forward `claude/k1.4-candidate` to review 04's recording commit `30c5c086`, with no merge commit;
- run Prompt C for K1.4-candidate on that branch;
- import, as records only and with no payload, the design-check and review records that are not in H, following
  the retention policy and the way K1.4's cleanup imported its review evidence;
- keep K1.4-gate PLANNED, because E1 needs its own release, and set `next_release: none`;
- push `claude/k1.4-candidate` only, without opening the PR or merging.

The instruction also says not to read the planner notes directory (`~/.claude/projects/...`). The session harness
loads that directory's one-line index into the context at start. This session opened no note in it and wrote
nothing there.

Under [006](../../006-development-process.md#owner-delegated-final-cleanup-before-manual-merge) this is a separate
delegated role. It is not self-acceptance: the acceptance is review 04's.

| Identity | Revision |
|---|---|
| Base B; remote main checked on 2026-11-21, unchanged | `c1951226338de6ccd3e4e6289259549551268f61` |
| Payload C | `848b1957ae9e598bb256712c07a3cc22c39fbaf7` |
| Independently accepted H; remote `claude/k1.4-candidate` before cleanup | **`a734d03a9eb352bd29988bff1a68d9d6ca9bb2d3`** |
| Review 04 recording and acceptance transcription A, on `codex/k1.4-candidate-review-04`, fast-forwarded | `30c5c0860707cf50afdf6389185f919321d40954` |
| Closed-record import | `8337acad631b901cb5ddf75aa1a2c0827b31fc48` |

Work ran in the worktree `.claude/worktrees/k1.4-candidate` on `claude/k1.4-candidate`. The final cleanup commit
and the verified remote head are given in the external handoff, so this record names neither its own commit nor a
future push.

## Review 04 and the transcription

[Review 04](review-04.md) ends in an authentic independent `ACCEPT` at H. It is by a Codex desktop session (GPT-6),
which states that it did not plan or implement this packet, worked in a fresh clone, merged nothing and used no
subagents. Its verdict line reads: "**Verdict: ACCEPT of H `a734d03a9eb352bd29988bff1a68d9d6ca9bb2d3`.**" It closes
K14C-R03-01 and K14C-R03-02 and keeps K14C-R01-01 to K14C-R01-03 and K14C-R02-01 closed. It raises no new
finding and no P3 observation.

Review 04's recording commit also writes the 007 transcription: the row's status moves from WAITING_FOR_REVIEW to
ACCEPTED, with a dated review 04 entry. So that commit is A, as in
[TOOLS-02 cleanup 01](../TOOLS-02/cleanup-01.md), and no transcription is missing. The fast-forward was
`--ff-only` from H to A.

## Candidate, prerequisite and post-review checks

- **Prerequisite.** B is the release merge (PR #69). K1.4's integration `eb8472e59f22cab9eefaa559b8b67b745dac4013`
  (PR #67) is an ancestor of B, which meets 007's dependency "K1.4 accepted and integrated".
- **Ancestry and allowlist.** B precedes C, C precedes H, and A's parent is H. C..H contains exactly the three
  administrative files in C's `verification.json`: 007, implementation report 04 and progress. The candidate
  check, rerun by cleanup at H, returns `facts_verified`.
- **Post-review delta.** H..A adds `review-04.md` and the 25 files under `review-04/`, and changes the 007 row.
  Remote main still equals B, so no newer main content or conflict changes the reviewed candidate.
- **Payload invariance.** Across B..H (16 commits), `packages/`, `scripts/`, `tests/tooling/`, the manifests, the
  lockfile, `tsconfig.json`, AGENTS.md and the policy pages 006, 008, 009 and 012 are unchanged. Kernel source
  is unchanged.

After A, cleanup adds two administrative commits:
- the closed-record import;
- the cleanup commit: this record, 007, 014 and progress.

No production code, test, fixture, evaluator, configuration, policy, guide or Layer-3 text changes after H.

## Layer-3 reference check

The accepted semantic delta is a gate scope, not a Kernel rule. [Owner choice 02](owner-choice-02.md) scopes the
K1/E1 gate to the predeclared K1 matrix: the 12 schedules the K1 Kernel has a surface for. The 3
dependency-alternative schedules and D01-CHK-04 move to K2's E2 gate. The candidate itself is test-side code.

H already carries the Layer-3 maintenance, and review 04 accepted it with the code:
- [evidence § Attribution and gates](../../../../mental-model/mechanisms/evidence.md#attribution-and-gates) states the
  rule: an exclusion is valid only inside the gate's owner-approved scope, declared before capture, and a refused
  excluded schedule stays a refusal;
- [the roadmap's K1.4 entry](../../../../mental-model/roadmap.md#k14) and its K2.4 entry name the gate that owns the
  dependency-alternative schedules.

The current front doors agree: 001's K1.4 paragraph, 002's paragraph on the K0 fixture and its real-Kernel
candidate, 007's K1.4-candidate and K1.4-gate contracts, and 017 L-38 to L-44.

Cleanup checked the related pages:
- [waits](../../../../mental-model/mechanisms/waits.md#eligibility-comes-from-trusted-source-category), which owns the
  trusted-source rule that the roadmap's K1.4 entry cites as the reason for the exclusion;
- the wait and dependency-alternative definitions in [core](../../../../mental-model/concepts/core.md);
- the [reference index](../../../../mental-model/reference.md), which needs no new term. `kernelCandidate` is test
  code, and the predeclared K1 matrix is a gate scope defined at 007's K1.4-gate contract, where evidence.md says a
  gate's scope is recorded.

A search of `mental-model/` for other statements of the K1/E1 gate's coverage found none that contradicts the new
scope. Layer 1 and Layer 2 need no change, because no whole-system model or major abstraction changed. This check
needs no Layer-3 update beyond H's and raises no cleanup finding. K1.4's owner item O-3 stays open: K1.4-candidate
edits one paragraph of `evidence.md` and neither performs nor settles the rewrite that
[the rewrite index](../../../../mental-model/rewrite-index.md) schedules after K1.4.

## Evidence preservation and retention

**Closed records imported.** Design checks 01, 03, 04 and 05 and reviews 01, 02 and 03 each lived on their own
branch, and 007, the progress record and review 04 cite them by commit. The import copies the 60 files they add under
`docs/development/work/K1.4-candidate/`, 9,737,519 bytes in all, to their original paths. None collides with a path
in H. For every file the blob in the import equals the blob at its source commit, so the bytes are identical. No
branch is merged or deleted, and the pinned commit links keep working. The relative links inside the imported
records now resolve on the packet branch, and after the merge they will resolve on main too.

| Record | Source branch | Source commit | Files | Bytes |
|---|---|---|---:|---:|
| Design check 01 | `codex/k1.4-candidate-design-check-01` | `e06984a9573efd1524692ab74332eb7744941bcf` | 1 | 27,923 |
| Design check 03 | `codex/k1.4-candidate-design-check-03` | `62092a70fec6e82ef4dcec17ce27195debf6b5ca` | 1 | 25,432 |
| Design check 04 | `codex/k1.4-candidate-design-check-04` | `99d411e00049ae87b781a7c1e1008161409ec983` | 1 | 26,070 |
| Design check 05 | `codex/k1.4-candidate-design-check-05` | `44d9091f6db6d1f382841cd822befcd80e374f7b` | 1 | 23,282 |
| Review 01 | `codex/k1.4-candidate-review-01` | `7b8a63fa5f087f870663bc143257e5181d0d385c` | 15 | 3,122,425 |
| Review 02 | `codex/k1.4-candidate-review-02` | `2a95a49a6e7ff46242a137f9d9ca6835e70ed946` | 18 | 3,290,933 |
| Review 03 | `codex/k1.4-candidate-review-03` | `3e86a8c0f7a310c53810f2ced0533165b1844b54` | 23 | 3,221,454 |

To re-verify one file, compare `git rev-parse <source commit>:<path>` with `git rev-parse 8337acad:<path>`.

The review 03 branch has two commits over H3: the review itself (`03446e4a`), then owner choice 05's record with
edits to three review files. The import takes each file at the branch head `3e86a8c0`, which review 04 and 007
cite. The review 02 and review 03 commits also edit 007. Those edits are status transcriptions that H's 007 row
already carries, so the import leaves them out. Five of the imported files are `.log` files that the repository's
ignore rules match; their source commits added them explicitly, and the import does the same for those five paths.

**The imported CI ZIPs.** Unlike K1.4's earlier reviews, reviews 01–03 committed the Packet verify ZIP of their
candidate's C. Cleanup recomputed each SHA-256. Each equals the digest its review recorded and the digest GitHub
lists for the artifact (queried 2026-11-21):

| ZIP | Bytes | SHA-256 | Run / artifact | GitHub expiry |
|---|---:|---|---|---|
| `review-01/ci-artifact.zip` | 3,069,037 | `285288a5b43909affd1f19eac083beb98983fcd1eef544aa3a6c0657fe5a07b3` | 43676796376 / 14150323794 | 2027-02-13 |
| `review-02/ci-artifact.zip` | 3,070,868 | `071fa3cc80c05cff24aab58462a70b478849fd9afa8eb53b5d258b56939b1d49` | 43704493967 / 14160801105 | 2027-02-13 |
| `review-03/ci-artifact.zip` | 3,076,456 | `9c8ac55b5c8cfe6be195b40b5b47824efb5b7b20ef6a51bba79f058a62ab0292` | 43798331633 / 14201012405 | 2027-02-14 |

These ZIPs bind superseded candidates. They come in with the rest of each review's files, as K1.4's import did, so
the merge makes main's tree about 9.2 MB larger. Their bytes were already in the repository's history on the review
branches. Whether to keep them in the tree is the owner's call at the later archive maintenance change.

**Review 04's CI ZIP.** `review-04/ci-packet-verify.zip` is 3,076,788 bytes. Cleanup recomputed its SHA-256,
`ef13b4a3063cddd07e445dfacb7a845ecaee93a62c9ec2c80e2aa42d46873c97`. It matches review 04's record and the digest
GitHub lists for artifact 14697524951 of run 44876502133, which GitHub expires on 2027-02-19. The ZIP holds the
only retained raw `verify.json` for the accepted C. After that date no external copy remains, and
[the retention policy](../../archive.md#retention-for-subsequent-packets) says a hash alone is not access.
Archiving needs acceptance, integration and owner closure first. So the ZIP stays in the tree, pinned at `30c5c086`,
as a candidate for the later archive maintenance change with a verified locator, like K1.4's review 05 and 06
ZIPs.

No earlier record, review or evidence file changes in this cleanup.

## Verification and attribution

[Packet verify run 44876502133](https://github.com/ArrokothI/arrokothi/actions/runs/44876502133) is the composed
verification at C. Cleanup extracted review 04's retained ZIP and did not rerun the verification. Review 04
inspected the same artifact independently.

| Check | Evidence and result |
|---|---|
| CI composed verify at C | `run.txt`: revision = head = C, Node v26.10.0, npm 11.19.1, Linux x86_64, 2026-11-21 06:38:51 to 08:01:27 UTC, exit 0. `verify.json`: `checks_passed`, 19 of 19 checks with `passed` true, `result_reuse` false |
| Review 04 evidence inspected | Verdict, identity and independence statement; the ZIP digest recomputed and compared with GitHub's; H..A file scope |
| Cleanup checks in a fresh clone | At the import head `8337acad`, whose tree differs from the final cleanup head only in the cleanup commit's four `docs/development/` files. Node v26.10.0, `npm ci` exit 0. Candidate check of C and H `facts_verified`; inventory `provenance_verified`; adoption `regenerate` `table_current` and `corpus` `mappings_complete`; the clone's `git status` stayed clean |
| Cleanup checks in the worktree | At the import head, Node v26.10.0: `npm run typecheck` exit 0; builder docs passed (75 files, 2,372 links, 58 imports, and 2,374 links on the final tree); architecture tests 390 of 390; the K0 fixture and candidate tests 1,078 of 1,078, the count review 04 reran. On the final tree, a local Markdown path and anchor check over `mental-model/`, `docs/guides/`, `docs/development/*.md` and `work/K1.4-candidate/` finds 108 files, 2,539 links and 0 broken. A control with two planted breaks in this record fails with exactly those two |
| Git and evidence preservation | B/C/H/A ancestry and the C..H allowlist; review 04 fast-forwarded unchanged; 60 imported blobs equal their sources; four ZIP digests; no change after H to production, tests, fixtures, guides or Layer-3 text; `git diff --check` clean on the authored files |

No live provider, large-memory, timing or E1 profile was run. No third-party source, test, asset or dependency was
added; this is repository-owned administrative maintenance.

## Release and limits

`next_release: none`. K1.4-gate stays PLANNED. 007 makes it depend on K1.4-candidate's integration and on the
benchmark owner's E1 release that pins it, and no owner release exists. The benchmark's
`codex/e1-kernel-acceptance-capture` branch still advertises `8de04779d279dba82cf834d419e465d2b677ef46`
(checked 2026-11-21), the head K1.4's cleanups inspected. Its ledger records E1 as `BLOCKED_EXTERNAL` with no gate
result. That branch is not in the benchmark's main, `5a3f1ba525f68244701b1f73a1d29c4902ffe589`. The supported-entry
fixture confirmation remains open, for K1.3's owner closure as well. No benchmark file was changed and no message was
sent to another owner.

The accepted limits stand as review 04 and [017](../../017-known-limitations.md) state them. L-38 covers the three
refused schedules, L-39 the timeout label, L-40 the rejection convention, L-41 Effect intents, L-42 the bounded
Observation fields, L-43 the fake Driver and L-44 the registry rows without semantic credit. The identity search is
a declared bounded search. D01-CHK-04 and the three excluded schedules belong to K2's E2 gate. A run of the candidate
in this repository is its own report, not an E1 result.

## Process retro

Four implementation reviews reached ACCEPT: reviews 01–03 were CHANGES REQUIRED, and review 04 accepted. Design
checks came before the builds they checked: 01, 03 and 05 approved with required changes, and 04 was not approved.
006's stop-and-redesign rule fired after reviews 02 and 03. Owner choice 07's stop rule was set after design check
04 and did not fire. The six review findings (five P2, one P3) fall into three families:
- **Design (2):** K14C-R01-01 and K14C-R02-01. A timeout name collision, then fallback strings that hid distinct
  identities.
- **Evidence (2):** K14C-R01-02 and K14C-R03-01. Ablations outside the mutation registry, then an oracle that did
  not join a command to its calls and inspection.
- **Records (2):** K14C-R01-03 and K14C-R03-02. A scope amendment worded as a universal gate waiver, and L-39's
  wording.

No ACCEPT was later invalidated, so there was no verdict flip. Every finding concerned the candidate, its
laboratory or its claims; Kernel source never changed.

What worked: design check 04 found the swallowed refusal and the unrecorded settlement reports before any build.
Design 05 then declared the oracle's matrix, and the build on it was accepted at its first review. One change to try: when a
packet's subject is an oracle, declare its matrix of relations, mutations and expected codes in the first design,
not after a review finds a gap. This is a process suggestion, not a policy edit.

## Disposition and owner handoff

**CLEANUP COMPLETE — AWAITING OWNER MERGE.** K1.4-candidate is ACCEPTED at H `a734d03a` by review 04. Its
transcription, the closed-record import, the Layer-3 check and the administrative records are complete, and the
branch is merge-ready. Integration, the owner discussion and closure, the supported-entry benchmark dependency and
K1.4-gate remain open. The owner next reviews and manually merges `claude/k1.4-candidate`; the integration receipt
follows the merge. No merge, PR, branch deletion or successor release is performed here. `next_release: none`.

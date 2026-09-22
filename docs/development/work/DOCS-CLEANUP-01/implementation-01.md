# DOCS-CLEANUP-01 — Local implementation report

## Identity and scope

Codex implementation session, 2026-09-22; owner-released maintenance under the
[contract](contract.md). Base and governing 006/008 process revision:
`9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49`. No C/H/A, independent review, commit, push,
integration or cloud upload is claimed. Work remains a local working-tree change, so packet status
stays IN_PROGRESS even though implementation and local validation are complete. Concurrent owner
rewrite work is outside the candidate and must not be swept into a later scoped commit.

## Changes and coverage

- CLEAN-1: Archived the pre-cleanup tracked snapshot (1,238 regular files and four skill symlinks).
  Verified original bytes before deleting 798 historical paths, totaling 32,597,723 bytes: closed
  packet records/logs, retired architecture/development, strategy-study evidence, four historical
  development reviews/retrospectives, and the tracked temporary handoff export. The two fixtures
  and live inventory listed below are included in that count and retained at their new paths.
  [Archive index](../../archive.md) supplies the exact digest, original paths and retrieval steps.
- CLEAN-2: Copied K0 worksheet/specification bytes unchanged to `tests/fixtures/k0/`; their source
  seals and coverage assertions still run normally. Moved the living inventory to
  `docs/development/kernel-ownership.md`, repairing relative links without changing its measured
  tables. Kept every historical manifest assertion in `tests/archive/evidence-records.test.ts`;
  it requires an explicit extracted snapshot path. Ordinary tests no longer need old raw logs.
- CLEAN-3: Preserved all 39 original packet headings and byte-identical K1.2-onward packet bodies.
  Condensed current ledger rows with authentic acceptance/integration identities, supersession,
  release and remaining limitations. Added this maintenance packet. Simplified the owner summary
  and baseline; repaired current provenance links to pinned history. Locally verified 83 pinned
  Git target references before final summary edits; no remote URL availability claim is made.
  Expanded builder checking to active development pages. Fixed the missing legacy-directory README
  link and represented sibling benchmark references as explicit cross-repository source locators.
- CLEAN-4: Kept dependency manifests/lockfile dependencies and runtime behavior unchanged (two
  source comments point to the relocated inventory). No code/guide compatibility promise retired.
  Retained current rewrite-index and writing study; corrected its worksheet/archive locators only.
  Documentation checking ignores owner `*.rewrite*.md` drafts; a temporary missing-link draft
  proved the exclusion and was removed without touching owner files. No agent was delegated.
- CLEAN-5: Validation below passed. Checked the diff, relocated bytes and archive recovery. The
  original four log-integrity tests explain the full-suite reduction from 2,322 to 2,318; all four
  pass separately against the archive. No behavioral test or negative control was dropped.

The prospective regular-file tree is approximately 6.5 MB versus 38.6 MB before cleanup, excluding
ignored upload artifacts, `.git`, installed dependencies and concurrent owner files. Git history
remains intact, so this is not a historical clone-size reduction.

## Validation and interpretation

Cwd: repository root. Node v25.2.1. Commands ran against the uncommitted working tree, not a sealed
C/H. Full raw output and a validation manifest are packaged under `cleanup-validation/` inside the
root upload archive; they are not dependent on temporary local log retention. The manifest records
command identity, exit status, file digests and relevant source inputs at evidence capture.

| Command / check | Result | Raw artifact inside archive |
|---|---|---|
| `npm test` | Exit 0; 2,318 tests / 355 suites; no failures, cancellations or skips. Includes ordinary conformance and SDK tests. | `cleanup-validation/full-test.log` |
| `npm run typecheck` | Exit 0 | `cleanup-validation/typecheck.log` |
| `node --test --test-reporter=spec --experimental-strip-types tests/conformance/k0/cited-decisions.test.ts tests/conformance/k0/coverage.test.ts tests/conformance/architecture/kernel-landing-zone.test.ts` | Exit 0; 661 tests / 28 suites | `cleanup-validation/targeted.log` |
| `npm run check:builder-docs` | Exit 0; 72 Markdown files and 38 public imports; current link count in raw output | `cleanup-validation/builder.log` |
| `ARROKOTHI_EVIDENCE_ROOT=/tmp/arrokothi-history/ultimate-legacy-2026-09-22/snapshot npm run test:archive-evidence` | Exit 0; all four historical checks retained and passing | `cleanup-validation/archive-evidence.log` |
| Builder check with a deliberately broken-link `*.rewrite*.md` draft | Exit 0; excluded draft removed | `cleanup-validation/rewrite-draft-probe.log` |
| Archive extraction and `python3 verify.py` | Original snapshot and symlinks verified; per-file SHA-256 and outer archive digest recorded | `MANIFEST.json`, `verify.py`, adjacent `.sha256` |
| Exact fixture comparison and future-packet scope comparison | Identical sealed fixture bytes; 39 original headings retained; K1.2-onward requirements unchanged | Source snapshot and current diff |
| `git diff --check` | Exit 0 | Working-tree diff |

No live provider, benchmark gate, isolation test, npm clean-install or Node 22 run was needed for
this storage/navigation change. Existing Node 22 legacy-test limitations remain historical. The
archive test preserves its original scope (K1.0 and corrections), not a new claim about every
packet's evidence annotations. Offline archive bytes and Git object paths were checked; cloud
upload/download and hosted-link access await the owner. Final prose/checksum edits do not alter
the executed runtime/tests; the builder check is rerun after those edits.

## Remaining work and handoff

Local cleanup is complete. Upload the root archive and its checksum, verify the transferred bytes,
and add the cloud locator to the archive index before removing the local artifact. Both upload
files are ignored by Git. Review the scoped changes and create C/H with validation under 006 before
independent acceptance; this implementation report supplies no ACCEPT or successor release.

Dependency pruning (including the unused-direct-import Google SDK candidate) needs its own clean
consumer-install validation. Legacy implementation retirement remains with K1.4 and later feature
owners; S1.2 reconciles final exports/dependencies. Rewrite aids stay until the owner completes the
rewrite and relocates continuing unresolved-choice responsibilities.

Third-party reuse: no new source, dependency, service or asset incorporated. Existing attribution
and terms evidence survive byte-for-byte in the snapshot; no legal-clearance claim is made.

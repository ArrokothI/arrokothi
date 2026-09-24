# Historical evidence and retention

Current architecture lives in [mental-model](../../mental-model/README.md), current implementation in
[002](002-implemented-kernel-baseline.md), and current acceptance/release in [007](007-work-packets.md).
Historical evidence is preserved outside the normal checkout; it is not current authority.

## September 2026 snapshot

| Field | Value |
|---|---|
| Source commit | `9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49` |
| Git fallback | [Pinned pre-cleanup repository](https://github.com/ArrokothI/arrokothi/tree/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49) |
| Local artifact | `ultimate-legacy-2026-09-22.tar.gz` and its `.sha256`, moved by the owner to owner-held storage outside the checkout; digest and full snapshot re-verified 2026-09-23 |
| Archive SHA-256 | `8debcfefea80b20392a831eef2373146739eb8de04932ccfbd960e59087b5c8d` |
| Archive size | 9,858,568 bytes |
| Contents | 1,238 tracked regular files and four skill symlinks, at their original paths under `snapshot/` |
| Cloud locator / upload verification | Pending owner upload; no cloud copy is claimed |
| Retention owner | Repository owner |

The archive includes the complete pre-cleanup tracked source snapshot, sealed packet records and
logs, retired architecture/development documents, strategy-study evidence, and the old tracked
handoff export. It excludes installed dependencies, `.git`, untracked files and transient rewrite
drafts. Its `MANIFEST.json` names every regular file with byte count and SHA-256, and records symlink
targets. `verify.py` checks the extracted contents, including separate new `cleanup-validation/`
attachments. Those outputs concern the uncommitted cleanup working tree, not the original snapshot
or independent acceptance. The original evidence bytes are unchanged.

The artifact and adjacent `.sha256` file are gitignored. Upload both to owner-controlled storage,
verify the uploaded/downloaded bytes against the digest above, and record the durable locator here
before removing the local copies. Git history is retained; this cleanup does not rewrite it or
claim to reduce historical clone size. A missing cloud copy does not prevent ordinary tests.

## Retrieve and verify

To inspect one historical file, use its pinned Git link, or use:

```bash
git show 9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49:docs/development/work/K1.1/integration-01.md
```

To inspect the independent archive, extract it outside the active checkout:

```bash
shasum -a 256 ultimate-legacy-2026-09-22.tar.gz
mkdir -p /tmp/arrokothi-history
tar -xzf ultimate-legacy-2026-09-22.tar.gz -C /tmp/arrokothi-history
python3 /tmp/arrokothi-history/ultimate-legacy-2026-09-22/verify.py
ARROKOTHI_EVIDENCE_ROOT=/tmp/arrokothi-history/ultimate-legacy-2026-09-22/snapshot npm run test:archive-evidence
```

Compare the first command's digest with this page. The explicit archive test preserves the existing
K1.0/correction manifest checks, including historical digest correction annotations; it does not
assert that every old packet used the same manifest format or that a valid digest proves semantics.
The full snapshot verifier checks bytes of every archived file, independently of those annotations.
Neither command grants fresh acceptance of an old or new candidate.

## Active inputs extracted from history

| Original path in the snapshot | Current maintained location |
|---|---|
| `docs/development/work/K1.0/ownership-inventory.md` | [Kernel ownership](kernel-ownership.md), a living inventory with repaired relative links |
| `docs/development/work/K0.1/protocol-worksheet.md` | [Sealed K0 fixture](../../tests/fixtures/k0/protocol-worksheet.md), byte-identical |
| `docs/development/work/K0.2/public-fixture-specification.md` | [Sealed fixture specification](../../tests/fixtures/k0/public-fixture-specification.md), byte-identical |

Current tests keep the existing source-clause seals, coverage obligations, negative controls and
inventory assertions. Only historical log verification moves to the explicit archive command.
Links inside sealed fixture copies retain their original historical context: consult the snapshot
at the original path. They are evidence inputs, not the current documentation reading path.

## Retention for subsequent packets

- Keep current contracts, unresolved findings, essential fixtures and active source inventories in
  the working tree. Do not require old raw logs to run ordinary conformance.
- Keep raw evidence available throughout implementation and review. Record commands, environment,
  exit/counts, candidate identities, digests and limitations under [008](008-implementation-report.md).
  Use a pinned accessible external artifact for bulky output when available; a hash alone is not access.
- After independent acceptance, integration and owner closure, a maintenance change may archive
  the closed packet. Extract continuing obligations first; preserve all sealed bytes, exact candidate
  identities, review/integration decisions and unresolved limitations. Keep a concise current ledger
  entry and a verified archive locator. Earlier rejected rounds remain evidence, not current status.
- Verify the archive and its retrieval before deleting the working-tree copy. When cloud upload is
  pending, keep the verified local artifact and pinned Git fallback explicitly identified as here.
  Do not describe an upload or retention guarantee that has not been checked.
- Every implementation migration reports legacy behavior/tests/dependencies retired, retained with
  an owner/trigger, or refused. K1.4 is a bridge gate; it does not automatically retire all of core.
  S1.2 closes the supported-surface and dependency inventory before release.
- Rewrite drafts named `*.rewrite*.md` are owner working material. Cleanup and documentation checking
  ignore them; canonical pages and their links remain checked.

The owner authorized this archive-and-cleanup on 2026-09-22. It changes storage and navigation, not
historical verdicts, target semantics, release permission or the independence required by 006.

# K0.1 round-3 validation evidence

Raw command output for the round-3 correction of packet **K0.1**, captured against the clean payload
commit **C3 `2b252b05eaf7020fec1e2b4a342d5fea86bad66e`** and committed here so it is retrievable from
the repository rather than from a session-local path (review finding
[K01-R2-06](../review-02.md)).

**Retention owner:** this repository, on branch `codex/k0.1-protocol-legacy-disposition` and any
branch that later integrates it. These files are ordinary tracked content: they are immutable at the
commit that carries them, and their SHA-256 digests are recorded in
[implementation-03.md](../implementation-03.md).

**How the capture worked.** Each command ran with the working tree verified clean at C3; output was
written outside the repository first (so the tree stayed clean while the commands observed it) and
the resulting files were then copied here unmodified for publication in the report commit H3. Every
log carries its own header: exact command, cwd, commit, tree state, tool versions, OS, UTC timestamp,
and a trailing exit code.

| File | Command |
|---|---|
| `01-builder-docs.txt` | `npm run check:builder-docs` |
| `02-typecheck.txt` | `npm run typecheck` |
| `03-diff-check-cumulative.txt` | `git diff --check 6464be1 2b252b0` (cumulative base..C3) |
| `04-diff-stat-cumulative.txt` | `git diff --stat 6464be1 2b252b0` (cumulative scope) |
| `05-diff-stat-correction.txt` | `git diff --stat cc61e74 2b252b0` (correction delta H2..C3) |
| `06-status-clean.txt` | `git status --porcelain` (empty output proves a clean tree) |
| `07-link-anchor-audit.txt` | `python3 link-anchor-audit.py` (output of the script beside it) |
| `link-anchor-audit.py` | The audit script itself, so the check is inspectable and re-runnable |

The files use a `.txt` extension deliberately: this repository's `.gitignore` excludes `*.log`
(line 3), so log-named evidence would have been silently dropped from the commit rather than
published. Renaming respects that rule instead of force-adding past it; the contents are byte-identical
to what the commands emitted, which the digests in the report confirm.

`npm test` was not run: this round changes documentation and review records only, which
`04-diff-stat-cumulative.txt` shows directly.

# Review 06 evidence

These are this independent review's observations, not implementation output inherited from another
review. The verdict is in [review-06.md](../review-06.md) and binds only to:

- B `f62527e8d564a6e2f63b83cbb52e24053f333540`
- C `83094969e591dba5c4f25d19c572522b78a7a396`
- H `a50c38867c93c63094f271d099cec71624382577`

`manifest.json` gives the size and SHA-256 of every other file in this directory. It excludes
itself to avoid a recursive digest. The surrounding Git commit binds the review and manifest.

| Files | Purpose |
|---|---|
| `candidate.json` | Candidate command's complete result: exact B/C/H structural facts verified |
| `run_verify.py`, `verify-run.json` | Exact clean-C command, environment, timestamps, exit and pre/post Git status |
| `verify.json.gz`, `verify.stderr` | Complete independently captured composition stdout and stderr; gzip is lossless |
| `summarize_verify.py`, `verify-summary.json` | Reproducible compact extraction of all 13 results, counts, limits, profiles and raw-output digest |
| `audit_records.py`, `records.json` | Independent Git application, byte/set/count, route and cumulative-boundary audit: 363 checks |
| `probe_coarse.py`, `coarse-probes.json` | 136 bounded parser probes with every fixture and observed site; no fixture is executed |
| `check_owner_quote.py`, `owner-choice-11-verbatim.json` | Exact comparison with the relevant original locally recorded human message, with its text and provenance only |
| `diff-identities.json` | Byte lengths and SHA-256 of the cumulative, correction and administrative diffs |

## Reproduction

Use an independent clone with all pinned Git objects and existing dependencies. All Node commands
use exactly v26.10.0, with this directory first in PATH:

```sh
export PATH="$HOME/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin:$PATH"
```

The candidate command was run from the separate clean-C clone:

```sh
python3 -B scripts/packet_tools.py candidate --payload 83094969e591dba5c4f25d19c572522b78a7a396 --head a50c38867c93c63094f271d099cec71624382577 --spec docs/development/work/TOOLS-01/verification.json
```

The composition ran alone in that fresh detached-C clone under `caffeinate -i`. The wrapper lives
in the review clone, outside the clean candidate, and accepts the clean clone's path:

```sh
caffeinate -i python3 -B docs/development/work/TOOLS-01/review-06/run_verify.py /private/tmp/arrokothi-tools-01-review-06-clean-c
```

Its underlying command was exactly:

```sh
python3 -B scripts/packet_tools.py verify --revision 83094969e591dba5c4f25d19c572522b78a7a396 --spec docs/development/work/TOOLS-01/checks.json
```

After it finished, from the review clone:

```sh
caffeinate -i python3 -B docs/development/work/TOOLS-01/review-06/probe_coarse.py
python3 -B docs/development/work/TOOLS-01/review-06/summarize_verify.py
```

The lightweight records audit may run separately; it executes `git apply` only in temporary
directories and reads candidate/history through Git:

```sh
python3 -B docs/development/work/TOOLS-01/review-06/audit_records.py
```

The summary script accepts either a newly generated `verify.json` or the committed gzip, verifies
successful status/identity, and writes the summary and deterministic gzip. The uncompressed original
was removed only after confirming a byte-for-byte decompression round trip; its exact digest is in
`verify-summary.json`. There is no truncated raw-output substitute.

The owner-quote script requires the original local transcript path as its sole argument. That
private transcript is not copied here. It selects only human message UUID
`b78cf3f6-1be4-4a1f-ab8e-b7f7e0b20c13`; the attachment retains the already-quoted owner text, line
identity and exact equality results. Local provenance is not independent server authentication.

These scripts write their result files next to themselves. Re-running them can change timestamps,
observations or formatting; preserve this committed evidence when doing a later review.

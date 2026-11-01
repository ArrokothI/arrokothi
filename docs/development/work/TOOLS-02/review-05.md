# Independent review 05 — TOOLS-02 ranges 2–4

**Status of this file:** seed record only. The review body, findings and verdict follow in a later commit on this
branch. Nothing below is a result.

## Audit seeds, chosen before any sample was drawn

- **Candidate H:** `19c1f43f2989acc1a501c96ca0f0f08dbba339b9`, over C `302fee9de7dc857ce58cf1e86d7fbb223af7c5fb`,
  on B `335ae7e6b6ddf7fa3c32a8605559268ed8a4e39b`.
- **Population:** `tests/fixtures/packet-tools/adoption.json` as frozen at H, read through
  `tests/tooling/triage-sample.py --revision 19c1f43f2989acc1a501c96ca0f0f08dbba339b9`.
- **Seeds**, drawn with Python's `secrets.randbelow(2**31)` at 2026-11-01T17:51:19Z, before the sampler was run
  with any seed:

| Sample | Population | Size | Seed |
|---|---|---:|---:|
| Unsafe-error audit (design 02 §5) | `retired` | 150 | 1640414241 |
| Relevance, closed | `closed` | 10 | 1500317432 |
| Relevance, extracted | `extracted` | 10 | 1015389638 |

- **Bound:** at most ⌊0.02 · 150⌋ = 3 unsafe errors; 4 or more fires the brief's stop (design 01 §5.5, design 02 §5).

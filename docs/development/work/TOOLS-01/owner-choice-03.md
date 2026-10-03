# TOOLS-01 — owner decision: verification floor raised to Node v26.10.0

Recorded 2026-10-03 by the TOOLS-01 implementer, Claude Code (`claude-opus-5-5`), from the owner's
messages in this implementer conversation, after [node-floor-06](node-floor-06.md) stopped at A8
(FLOOR-06-01) and offered three options. Verbatim:

> Raise the floor again, and I authorize. the latest one is v26.10.0	?

Asked to confirm the exact version, with the facts that v26.10.0 (2026-09-21) is the latest release
overall but a Current release, and that v24.21.0 (Active LTS) and v22.23.3 are the newest LTS lines,
the owner selected the option labelled:

> v26.10.0 (Recommended)

## What this decides

- **The verification floor is exactly Node v26.10.0** (darwin-arm64 on this host), installed at user
  level from nodejs.org after checking its `SHASUMS256.txt` entry, beside the existing runtimes. The
  owner's message authorizes that install.
- It supersedes the v22.15.0 floor of design 05 §6's floor amendment and owner choice 02's
  "raise the floor to 22.15". Wherever design 05 §6, its step 1 and A1–A11 name v22.15.0 (or the
  earlier v22.9.0), read v26.10.0. The node-floor-01 to -06 results stay as history; A1–A11 rerun on
  v26.10.0 from the start, and no earlier pass carries over.
- The same files change as in the v22.15.0 amendment, and no others: the contract's F4 row
  (supported host "Node 26.10+ (owner choice 03)"), `AGENTS.md` ("Node 26.10+."), the root
  `README.md` ("with Node 26.10+"), the root `package.json` `engines.node` (`>=26.10.0`) and the
  matching root entry of `package-lock.json`, `tests/tooling/README.md` and `check-node-floor.py`'s
  exact-version check. A1 keeps accepting `details.type` `test` or absent for a test.
- **Not changed:** `packages/sdk/package.json` keeps `>=22.9.0`, the published package's runtime
  claim, as before; changing it remains a separate owner question.

## What it does not decide

The owner did not choose a value for `checks.json`'s 900 s `kernel-sweeps` bound. node-floor-06
showed that bound never fitted the four-mode sweep on any recorded runtime. If the sweep still cannot
finish inside it on v26.10.0, A8 stops again and that bound goes back to the owner. No hold, credit
or acceptance follows from this record; TOOLS-01 remains IN_PROGRESS.

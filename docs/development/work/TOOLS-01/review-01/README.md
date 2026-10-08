# Review 01 evidence

Subject: exact H `446dd25820500db4e0eb3d6940ec49e45634f39c`, payload C
`b104bab192f57c5ecf5b7eccebcfbda412a17b5d`. All files are reviewer evidence; none changes the
candidate implementation or grants acceptance. The separate Claude review was not consulted.

Use an existing checkout of C, H, or this review branch, with the locked dependencies already
installed and **Node v26.10.0 first in PATH**. From that checkout:

```sh
python3 -B /absolute/path/to/review-01/probe_review.py . all
python3 -B /absolute/path/to/review-01/probe_isolation.py .
python3 -B /absolute/path/to/review-01/audit_tables.py .
```

The first script accepts `transfer`, `context`, `kills` or `holds` instead of `all`. It checks the
checker bytes against exact C, imports the repository's fixture builders, and constructs temporary
Git fixtures without monkey-patching the checker. Exit 0 means the recorded bad behavior reproduced;
it is not a successful contract result. Temporary source files and commits are cleaned up. The
isolation script separately exercises a failed process, timeout and SIGINT. It does not test hostile
ambient access or SIGKILL cleanup. `audit_tables.py` reads pinned Git objects only.

`probes.json` and `isolation.json` are observed outputs, not expected-output-only fixtures. The
sample snapshots are convenience copies of the pinned ranges and manifest records listed in
`sample-index.json`; full source authority remains the recorded Git objects. `sample-notes.md`
contains the independent reading, including limits.

The required command metadata is in `candidate.run.json` and `verify.run.json`; `verify-summary.json`
is a compact derivative. `verify.json.gz` is the full unedited JSON output of the required run:

```sh
gzip -dc /absolute/path/to/review-01/verify.json.gz
```

Re-running `verify --revision C` requires a **clean checkout at C**, not at the review commit. Keep it
untouched while the job runs, and wrap long commands with `caffeinate -i`. The original required run
failed one poison-sweep child timeout; `sweep-reenter-original.txt.gz`, its generated names and the
values-file observation retain that failure. The focused retry's command and time are in
`sweep-recheck.run.json`; it passed and does not erase the full-run failure.

`identity.json` records the observed Git identities. Exact H was fetchable, although the advertised
submitted branch had a different tip. `manifest.json` hashes these attachments; it is a locator,
not independent proof of their interpretation. No third-party material was copied or added.

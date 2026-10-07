# Review 03 evidence

Exact H: `7f3a2af46d714dc2a0e47a755ccd4fe8aeb0ba94`; C:
`28258b282532b36eef8fb1571d79b6343b54427b`; B:
`f62527e8d564a6e2f63b83cbb52e24053f333540`.

Use a fresh clone checked out at C, with its locked dependencies installed. Keep these review
attachments outside that clone. The candidate's directory-reading tests depend on a clean clone's
directory inventory. No script edits the candidate: probes create temporary fixture repositories;
the audits read C and run its declared catalog. `probe_detector.py` creates a synthetic floor record
for its minimal preservation fixture, as the maintained fixture does; it is not a real floor report.

Set Node **v26.10.0 first in PATH**. The actual run used
`/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin`, Python 3.14.6 and Darwin 25.6.0.
Every long command below was run under `caffeinate -i`. Placeholders are shell variables referring
to your candidate clone (`candidate_root`) and this evidence directory (`evidence_root`).

From the clean C clone:

```sh
node --version
caffeinate -i python3 -B scripts/packet_tools.py candidate --payload 28258b282532b36eef8fb1571d79b6343b54427b --head 7f3a2af46d714dc2a0e47a755ccd4fe8aeb0ba94 --spec docs/development/work/TOOLS-01/verification.json
caffeinate -i python3 -B -m unittest discover -s tests/tooling -p 'test_*.py'
caffeinate -i python3 -B tests/tooling/check-refusal-registry.py
caffeinate -i python3 -B docs/development/work/TOOLS-01/review-01/probe_review.py "$candidate_root" all
caffeinate -i python3 -B docs/development/work/TOOLS-01/review-01/probe_isolation.py "$candidate_root"
caffeinate -i python3 -B "$evidence_root/replay_review01.py" "$candidate_root" all
caffeinate -i python3 -B "$evidence_root/probe_detector.py" "$candidate_root"
caffeinate -i python3 -B "$evidence_root/probe_boundaries.py" "$candidate_root"
caffeinate -i python3 -B scripts/packet_tools.py inventory --revision 28258b282532b36eef8fb1571d79b6343b54427b --spec tests/fixtures/packet-tools/inventory.json
caffeinate -i python3 -B "$evidence_root/audit_candidate.py" "$candidate_root"
caffeinate -i python3 -B "$evidence_root/audit_scope.py" "$candidate_root"
```

All final runs exited 0 except the unmodified old probe, which exited 1 at its old-C guard. The
replay changes only subject/API/expected dispositions and retains all original scenarios. The full
tooling discovery reports 561 tests, OK, 667.530 seconds. It ran directly, overlapping independent
review fixture probes; this is not a measurement of the composed verification's 600-second step.
Composed verify, full corpus/preservation recomputation and registered mutation campaigns were not run.

| Evidence | Meaning |
|---|---|
| `candidate.json` | Exact candidate facts |
| `original-probes.txt` | Original old-C guard refusal; no behavior ran |
| `replay.json`, `replay.stderr` | Corrected outcomes for every review-01 scenario |
| `isolation.json` | Failure/timeout/SIGINT and unchanged source hashes |
| `tooling.txt` | Full tooling suite output |
| `refusal-registry.txt` | All 307 guards registered; not the ablation campaign |
| `detector.json` | 19 actual runtime/detector cases; nine misses, two false preserved rows |
| `boundaries.json`, `boundaries.stderr` | Ten Markdown variants and four no-kill mutations |
| `inventory.json.gz` | Fresh 1,549-origin inventory |
| `audit.json` | Whitespace, restoration and actual mapping-target P1-T checks |
| `scope.json.gz` | Recomputed register, 110 context checks and 18 witness relinks |
| `restored-target-source.json.gz` | Byte-identical compressed scratch source, described below |

`restored-target-source.json.gz` preserves the report's specifically cited local source:
`/private/tmp/claude-501/-Users-rex-shih-Documents-ArrokothI-arrokothi/c9f0cfbb-dd31-4f9e-a7ee-f14add26feea/scratchpad/step8/built-dispatch.json`.
The uncompressed 110,706 bytes hash to
`d5ea1655908497538c545f7d94aaac451689b9b297421445779d174a28f7b278`. Its availability and bytes were
checked read-only. Neither that hash nor this later attachment authenticates its original authorship
or makes it a previously committed source. `audit_candidate.py` can now reproduce the comparison
without access to the originating session's scratch directory.

Raw temporary paths and fixture commit IDs vary between runs. All new counterexample source is
embedded in the attached scripts and repeated in their JSON observations. Exit 0 for the detector
means observations were collected; its expected review result is the two P1 findings, not acceptance.

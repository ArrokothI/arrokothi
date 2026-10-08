# Review 04 evidence — TOOLS-01

Reviewer evidence for [review 04](../review-04.md) of H `7f3a2af46d714dc2a0e47a755ccd4fe8aeb0ba94`
(C `28258b282532b36eef8fb1571d79b6343b54427b`, B `f62527e8d564a6e2f63b83cbb52e24053f333540`; previous H
`446dd25820500db4e0eb3d6940ec49e45634f39c`).

Every script here is read-only on the repository. Each takes the checkout path as its first argument and
reads C, H and the previous H from Git objects, so any checkout that has those commits will do. Run each with
`python3 -B` and Node v26.10.0 first in `PATH`. `register_checks.py` imports `scripts/packet_tools.py` from
the checkout, so that file must equal C's (it does at H).

| File | Purpose | Command |
|---|---|---|
| [candidate.json](candidate.json) | Output of the F1 candidate check at C/H | `python3 -B scripts/packet_tools.py candidate --payload <C> --head <H> --spec docs/development/work/TOOLS-01/verification.json` |
| [check_records.py](check_records.py) | Checks 1 and 5: `git apply` of choices 08–09's diffs; the 28258b28 whitespace edit and manifest; C..H; H's 007 rebuilt from C's; B..H boundaries. Exit 0 when all hold | `python3 -B check_records.py <repo>` |
| [records.txt](records.txt) | Its output | as above |
| [register_checks.py](register_checks.py) | Check 2: register classes, rule-1 entries, review 02's 44, category decisions against the previous H, the 56 V-ENV-matched category entries, and five refusal probes on the real register at C | `python3 -B register_checks.py <repo> > register.json` |
| [register.json](register.json) | Its output, with the 188 rule-1 keys and the 56 overlap entries | as above |
| [limits_relinks.py](limits_relinks.py) | Checks 3 and 4: C2-LIMIT recomputed, the restored `1363:3` target against its committed check record, the 110 closures, the 18 relinks with their routes, the transfers and the report's figures | `python3 -B limits_relinks.py <repo> > limits-relinks.json` |
| [limits-relinks.json](limits-relinks.json) | Its output; `closed_origins.relinked` lists the 18 | as above |
| [sample.py](sample.py) | Check 7: the seeded, stratified selection | `python3 -B sample.py <repo> > sample.json` |
| [sample.json](sample.json) | The selection: 10 rule-1 entries, 5 relinked origins | as above |
| [sample-notes.md](sample-notes.md) | My readings of the 15 sampled items against the bytes at C | — |
| [adjacent_sweep.py](adjacent_sweep.py) | Bounded false-credit sweep over the 712 credited leaves at C | `python3 -B adjacent_sweep.py <repo> > adjacent-sweep.txt` |
| [adjacent-sweep.txt](adjacent-sweep.txt) | Its output | as above |
| [verify_summary.py](verify_summary.py) | Summarizes a composed-verify output | `python3 -B verify_summary.py verify-C.json.gz > verify-C-summary.json` |
| [verify-C-summary.json](verify-C-summary.json) | Per-step summary of the composed verify at clean C, with the full output's digest | see the review's Verification runs |
| [verify-C.json.gz](verify-C.json.gz) | The full `verify` output (gzip), reproducible by rerunning | `python3 -B scripts/packet_tools.py verify --revision <C> --spec docs/development/work/TOOLS-01/checks.json` in a fresh clone at C |

## Digests (SHA-256)

| File | SHA-256 |
|---|---|
| `adjacent-sweep.txt` | `735fa17559db7f21a3d9609cee6d9e5ccc1e6a6edc0223383c5fae3cf7c9f536` |
| `adjacent_sweep.py` | `6ef31b19c06d7fd73dd55530c4fe7ed2b03246cc19e335c81311f7ada923ffb7` |
| `candidate.json` | `36e6aaa447d602bee43263a1b89175559d5ccdb2cb6429b57deef06d72a98ca6` |
| `check_records.py` | `a759056a75aa0958892c9aeb7a25722ee72fc74a9f51287623f4415981cd521e` |
| `limits-relinks.json` | `cac3c78748459aa3b57dede704e40cd4580381162d6cfaea9918591c4f8b5575` |
| `limits_relinks.py` | `7b065b4dfe4582c507f45af7251760b78ae7d87b7727b75fa566d821472d6571` |
| `records.txt` | `f6a9b23c12f551510ff07770bae38661138be1155f688b09779f0c61ee388c0e` |
| `register.json` | `0f233cebdcd65065d2673e2478114d2112c8e0387aaafbeeff6848b252927e4f` |
| `register_checks.py` | `dbb00564df9b6e11f2c3b10f6aa310acf3c4ef6a434763789bcc833ecbf49920` |
| `sample-notes.md` | `04c31d1e639968435e676358dd869a159c375b72c68fd442ca1357f1c786fd00` |
| `sample.json` | `587156b2a4c88077b8b0d574b4d3c9ea64749bf173241346e571c57fa15e2374` |
| `sample.py` | `c33bd81714b61e5c5a0e1670ec7d1cca7d911a9032899f7d84dfbf11d1a83a23` |
| `verify-C-summary.json` | `f234add34b70b9c849645af24634e21cff59fbf68138971698bf2a9c0772d432` |
| `verify-C.json.gz` | `1db1626e6ad75dec8ed99aebc9058338b863a1ccd3c28c1dd00faa05d554bb18` |
| `verify_summary.py` | `36a5ba33677871562270e955f8ac3867543c636d7db7f4cfbfb1d4191ae31c1d` |

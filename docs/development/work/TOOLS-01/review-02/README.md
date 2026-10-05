# Review 02 evidence — TOOLS-01

Reviewer evidence for [review 02](../review-02.md) of H `446dd25820500db4e0eb3d6940ec49e45634f39c`
(C `b104bab192f57c5ecf5b7eccebcfbda412a17b5d`, B `f62527e8d564a6e2f63b83cbb52e24053f333540`).
Every script is read-only on the repository and takes the checkout path as its first argument.
Run each with Node v26.10.0 first in `PATH` and `python3 -B`, from a checkout that has C and H and
whose `scripts/packet_tools.py` equals C's (it does at H); the probes import it from the working tree.

| File | Purpose | Command |
|---|---|---|
| [check_records.py](check_records.py) | Contract revisions 4–7 against owner choices 04–07; H's 007 against the authorized text; the transferred table against choices 04 and 05. Exit 0 when all hold. | `python3 -B check_records.py <repo>` |
| [gate_areas.py](gate_areas.py) | Per-origin area derivation at C with the candidate's functions; counts origins that get every area | `python3 -B gate_areas.py <repo> <C>` |
| [gate-C.json](gate-C.json) | Output of the candidate's own standalone gate at C | `python3 -B scripts/packet_tools.py gate --revision <C> --spec docs/development/work/TOOLS-01/verification.json` |
| [sample.json](sample.json) | The seeded sample: salt, 10 closed origins, 10 V-ENV entries, and every stratum in order | Built from adoption.json at C (see the review's §6) |
| [origin_facts.py](origin_facts.py) | Adoption facts for named origins | `python3 -B origin_facts.py <repo> <C> <origin>…` |
| [closed-facts.txt](closed-facts.txt) | Its output for the 10 closed origins | as above, with the `closed` list from sample.json |
| [venv_classification.py](venv_classification.py) | The 44 entries item 2 made `held` under V-ENV, and which reasons exclude value capture | `python3 -B venv_classification.py <repo>` |
| [venv-classification.json](venv-classification.json) | Its output | as above |
| [venv_bodies.py](venv_bodies.py) | Rebuilds register bodies with the candidate's helpers and prints every V-ENV recipe hit | `python3 -B venv_bodies.py <repo> <C> <file:line:col>…` |
| [venv-bodies.txt](venv-bodies.txt) | Its output for the 10 sampled entries | as above, with the `venv_*` lists from sample.json |
| [verify-C-summary.json](verify-C-summary.json) | Per-step summary of the composed verify at clean C, with the full output's digest | see the review's Verification runs |
| [verify-C.json.gz](verify-C.json.gz) | The full `verify` output (gzip), reproducible by rerunning | as above |
| [gate-areas-C.json](gate-areas-C.json) | Output of `gate_areas.py` at C | as above |
| [brief-02.md](brief-02.md) | Correction brief | — |

`gate_areas.py` at C ([gate-areas-C.json](gate-areas-C.json)) reports 1,439 open origins, 664
`ungated` and 0 with every area. The most areas any origin gets is 38 of 68. Origins by number of
areas:

| Areas | Origins |
|---:|---:|
| 0 | 664 |
| 1 | 353 |
| 2 | 250 |
| 3 | 60 |
| 4 | 54 |
| 5 | 18 |
| 6 | 3 |
| 7 | 3 |
| 9 | 2 |
| 10 | 3 |
| 11 | 8 |
| 16 | 1 |
| 17 | 1 |
| 24 | 3 |
| 25 | 1 |
| 26 | 2 |
| 27 | 3 |
| 28 | 3 |
| 29 | 1 |
| 31 | 5 |
| 38 | 1 |

## Digests (SHA-256)

| File | SHA-256 |
|---|---|
| `brief-02.md` | `f8c1517458981960c17df99c9eb3817f70c1448133da1028ff93b5d4903943b1` |
| `check_records.py` | `5db742c7b00a59a9a6dd20834ab283d85ba7fed99f1c4b20397bb2c364c97142` |
| `closed-facts.txt` | `c69183f58abe70b8e59ff0dfe8ad37b40e7fc9ac81a1846fdd0e089055ea768c` |
| `gate-C.json` | `5867832ee8bcad6aff3bcafd901a9e1f27403f37ab670b576ef9d2c7374cd34f` |
| `gate-areas-C.json` | `521dd30815540c040a4fa417e1252831666214f930a33e526ae80fe8fabb12ba` |
| `gate_areas.py` | `55ef371e465dc4bddcf5d0a70b3cf7a5c0b3ab5563a4ab5ad068d87ac452908e` |
| `origin_facts.py` | `886d705d6e54e34139d40d94b61a79f51600b79a0484bd3eb1dfd322b13827e7` |
| `sample.json` | `8c9d8aad1ca412e964f525640aad55c80d8e2c01216197846faf5bfe1b71aa3a` |
| `venv-bodies.txt` | `962e55fcf92cd6a24c8506bb36f938b1d8f63b403f3107d761c59c2f4d506ca3` |
| `venv-classification.json` | `dec60183274e685178b24b27c3714e04c9ead63b6a433d8adca16f24f060c1fe` |
| `venv_bodies.py` | `6eb72f7554a6c202755e9cd2cb0c592db080233a64035563d701b51976906f69` |
| `venv_classification.py` | `50c8cb8b3ea101db5ea7023abc0064c5bcce65163179f3e65b76b7df176281c8` |
| `verify-C-summary.json` | `bd69c729e7fae7016ffdfd25a50ebf0cb2c2acb675e741405232191f32cbad35` |
| `verify-C.json.gz` | `137c412a5995e0cf27acfa791174157caefbdf7340e0dc8ff013fe51524fad4f` |

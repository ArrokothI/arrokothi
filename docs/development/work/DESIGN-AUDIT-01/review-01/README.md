# Evidence for DESIGN-AUDIT-01 independent review 01

Reviewer: Claude Code desktop session, model `claude-opus-5-5` (Opus 5.5), 2026-10-01.
Candidate H `7ebf80d461c439459d0c8010c04c9fb197281a59`, payload C `ce3ec854ff126498e0b807ba97626d12015572c7`,
base B `66bc041175e6fc191c2e7cf88de198111e7d97c9`, archive `9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49`.

Environment: macOS 26 (Darwin 25.6.0) arm64, 8 GiB; Node v25.2.1; Python 3.13.5; git 2.39.5;
`canonicalize@3.0.0` from the owner's main checkout `node_modules` (symlinked into the review worktree
only while probes ran, then removed; `git status --porcelain` empty afterwards).

Worktrees (detached, outside the main checkout):

```bash
git worktree add --detach <scratch>/wt-H 7ebf80d461c439459d0c8010c04c9fb197281a59
git worktree add --detach <scratch>/wt-archive 9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49
```

**In the repository:** these files live at `docs/development/work/DESIGN-AUDIT-01/review-01/`. To run a command from the repository root at H, replace `wt-H` with `.` and `review-01/` with `docs/development/work/DESIGN-AUDIT-01/review-01/`.

All commands below run from `<scratch>` (the directory containing `wt-H/` and `review-01/`) unless
stated. Every script is read-only on the repository except where noted ("restored").

| File | What it shows | Command |
|---|---|---|
| `coverage-map.md` | Reviewer coverage map derived from brief-01 before reading the report | — |
| `verify-at-H.txt` | Packet verifier passes at H on a clean tree, including C..H allowlist | `cd wt-H && python3 docs/development/work/DESIGN-AUDIT-01/probes/verify.py --require-clean --C ce3ec854ff126498e0b807ba97626d12015572c7` |
| `da1/universe.py`, `da1/universe.json` | Every file in the DA-1 trees and whether `enumerate.py` reads it | `python3 review-01/da1/universe.py wt-H review-01/da1/universe.json` |
| `da1/broad_ids.py`, `da1/broad-not-in-audit.json` | Grammar-independent ID-token search over every text file in scope; tokens absent from the audit's label set | `python3 review-01/da1/broad_ids.py wt-H review-01/da1/broad-not-in-audit.json` |
| `da1/grammar_outside_sources.py`, `da1/grammar-ids-outside-audit.{json,txt}` | The audit's own regex applied to all files in scope (54 extra IDs, all implementer self-findings or test labels outside review records) | `python3 review-01/da1/grammar_outside_sources.py wt-H review-01/da1/grammar-ids-outside-audit.json` |
| `da1/severity_lines.py`, `da1/severity-lines-without-id.{json,txt}` | Severity-tagged lines (P0–P3) in review-like records that carry no audit-grammar ID (unprefixed findings / unlabeled observations) | `python3 review-01/da1/severity_lines.py wt-H review-01/da1/severity-lines-without-id.json` |
| `da1/redefinitions.py`, `da1/redefinitions.json` | IDs with definition-shaped lines in more than one record (reuse check) | `python3 review-01/da1/redefinitions.py wt-H review-01/da1/redefinitions.json` |
| `da1/family-members.txt` | All 278 classifications grouped by family; first line shows the 16-triple bijection | inline Python in review-01 transcript; regenerate with the snippet at the end of this file |
| `da1/classification-sample.md` | 47 sampled classifications with reviewer judgement | — |
| `da2/template_check.py`, `da2/template-check.json` | **Counterexample for DA01-R1-CLOSURE-01**: in all 16 families the Recommend closure equals the Keep closure plus one fixed suffix, and the claims cells are identical. Must print `all suffix-only closures: False` after a correct fix | `python3 review-01/da2/template_check.py wt-H/docs/development/work/DESIGN-AUDIT-01/register.md review-01/da2/template-check.json` |
| `da3/consistency_extract.py`, `da3/consistency-extract.txt` | **Counterexample for DA01-R1-ARCH-01**: A/B/F09 recommend live-object capture in the core, C/F02 recommend a bytes/text core, F10 recommends both; C's conditional contradicts its recommendation under A's | `python3 review-01/da3/consistency_extract.py wt-H/docs/development/work/DESIGN-AUDIT-01/register.md` |
| `da3/claims_coverage.sh`, `da3/claims-coverage.txt` | **Evidence for DA01-R1-CLAIMS-01**: decisions 03/04, K1.4, values.md's environment obligations, AGENTS.md "Kernel-mediated" are never named; the cited values.md anchor does not contain the cited statement | `bash review-01/da3/claims_coverage.sh wt-H/docs/development/work/DESIGN-AUDIT-01` |
| `a-missing-option/frozen-intrinsics-probe.mjs`, `frozen.txt`, `unfrozen.txt` | **Evidence for DA01-R1-OPTION-01**: under `--frozen-intrinsics` the five classic K1.1 hostile mutations throw; Proxy still constructible. The unfrozen control crashes Node after its own Array.prototype[0] getter | `cd review-01/a-missing-option && node --frozen-intrinsics frozen-intrinsics-probe.mjs; node frozen-intrinsics-probe.mjs` |
| `a-missing-option/kernel-under-frozen.mts`, `kernel-under-frozen.txt`, `kernel-unfrozen-control.txt` | Current Kernel refuses a plain value (`unstable_representation`) in a frozen-intrinsics realm; accepts it otherwise | `cd wt-H && node --frozen-intrinsics --experimental-strip-types --no-warnings ../review-01/a-missing-option/kernel-under-frozen.mts "$PWD"` (needs `node_modules` with canonicalize@3.0.0) |
| `da5/span_audit.py`, `da5/span-audit.json` | Test blocks inside the "exclusive" hostile test spans; used to find own-envelope/own-metadata tests (DA01-R1-SPAN-01) | `python3 review-01/da5/span_audit.py wt-H review-01/da5/span-audit.json` |
| `probes-rerun/` | Reviewer reruns: `reverify-exotics.txt`, `exotic-consumers.json`, `source-map.txt` (identical to sealed outputs except Node version), `review08-n15/` (suite survives 1,720/1,720; controls complete; mutants time out at 30 s), `review08-ownkeys/` (same pass/RangeError outcomes; machine-dependent ms/RSS), `mechanism-cost.json` (same ordering) | see review §DA-5; the packet's `review08.py n15`, `review08.py enumeration` and `mechanism-cost.py` were run in the review worktree and their rewritten outputs restored with `git checkout` |
| `o-r8-4/broad-claim-search.txt`, `o-r8-4/other-domain-assertions.txt` | Broader claim search (BASELINE, guides, READMEs, Layer 3, Kernel source comments) | commands in review §O-R8-4 |
| `flips/flip_scan.py`, `flips/records.json`, `flips/accept-records.txt` | Independent same-H verdict pairing and the list of ACCEPT records with their candidate SHAs | `python3 review-01/flips/flip_scan.py wt-H review-01/flips/records.json` |
| `brief-02.md` | Correction brief for round 2 | — |

Regenerating `da1/family-members.txt`:

```bash
python3 - <<'PY' > review-01/da1/family-members.txt
import json,collections
c=json.load(open('wt-H/docs/development/work/DESIGN-AUDIT-01/classifications.json'))
pairs=collections.Counter((v['family'],v['subsystem'],v['category']) for v in c.values())
print('distinct (family,subsystem,category) triples:',len(pairs),'families:',len({p[0] for p in pairs}),'subsystems:',len({p[1] for p in pairs}))
for f in sorted({v['family'] for v in c.values()}):
    print(f'\n### {f}')
    for k,v in sorted(c.items(), key=lambda kv:(kv[1]['source'],kv[1]['line'])):
        if v['family']==f: print(f"{k} | {v['kind']} | {v['category']} | {v['round']} | hostile={v['hostile_only']} | {v['summary'][:150]}")
PY
```

Not run: the 63-run R8 cost corpus (`review08.py cost`) and the eager-Outcome probes; their derivations
were checked from the sealed raw outputs instead (review §DA-5).

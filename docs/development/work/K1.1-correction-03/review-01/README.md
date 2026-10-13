# Review 01 evidence

Subject H: `5f586b176089987fa3667e4c03f26b3dac0a5bfb`; production/test payload C: `ed23733e58bcb53a2f9a0aa5264f61f8334a7bfb`; baseline B: `b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b`.

The [review](../review-01.md) owns findings and interpretation. [Brief 02](brief-02.md) is the next correction handoff. The manifest hashes this delivered evidence and the review record. Original candidate files were not edited.

## Reproduce the new counterexamples

Use Node **v26.10.0**, Python 3, and a clean clone at C with its lockfile dependencies installed. Let `KC3_C_TREE` name that clone and `KC3_REVIEW` name this evidence directory. Put the exact Node binary first in PATH, and check `node --version`. From any working directory:

```sh
node --experimental-strip-types --no-warnings "$KC3_REVIEW/probe-stop-boundary.mjs" "$KC3_C_TREE"
python3 -B "$KC3_REVIEW/probe-evidence-attribution.py" "$KC3_C_TREE"
node --experimental-strip-types --no-warnings "$KC3_REVIEW/probe-declared-limit.mjs" "$KC3_C_TREE"
```

The first two commands exit zero when they reproduce the submitted candidate's defect and print `contract_holds: false`. The stop probe also accepts `--require-contract`, which makes that violation fail an assertion. The listing wrappers preserve the native operations' return values and are restored immediately after module load; caller fixtures contain no Proxy or accessor. The attribution probe mutates only a temporary copy and removes it afterward; its output includes direct TAP as well as the adapter/runner classification. The third prints `documentation_claim_holds: false`: it reproduces permitted Q6 outcomes that contradict the roadmap's broader statement.

For the independent dimensions, also provide a B checkout with its dependencies:

```sh
node --experimental-strip-types --no-warnings "$KC3_REVIEW/search-dimensions.mjs" "$KC3_C_TREE" "$KC3_B_TREE"
python3 -B "$KC3_REVIEW/audit-records.py" "$KC3_C_TREE"
```

`audit-value-cost-kills.py` and `review-events.mjs` rerun all value-cost cases with direct leaf/error reporting, preserving events in gzip JSONL. They mutate only a temporary copy. Copy those scripts to a **new output directory** before rerunning: they write results beside themselves, and the delivered review logs should remain intact. The orchestration scripts likewise write beside themselves; their existing command/environment/timing records are the evidence of this run, not instructions to overwrite it.

## Evidence map

| Files | Meaning |
|---|---|
| `coverage-before-reports.md` | Independently derived obligations before report explanations |
| `identity.json`, `history.txt`, `cumulative.diff`, `administrative.diff`, `changed-files.txt` | Full pins, ancestry and cumulative scope |
| `verify-run.json`, `verify.json`, `verify.stderr.log`, `verification-summary.json` | Exact prescribed clean-C verification; raw output retained |
| `required-followups.json`, `capture-corpus.*`, `adoption-corpus.*`, `mutations.*`, `refusal-guards.*`, `value-cost.*` | Subsequent maintained corpus and registry reruns |
| `independent-checks.json`, `stop-boundary.*`, `evidence-attribution.*`, `dimensions.*` | Independent probe commands, results and errors |
| `declared-limit-run.json`, `declared-limit.*` | Additional Q6 scope witnesses from the final normative review |
| `record-audit.*`, `candidate.*` | Prerequisite, policy, adoption/C1 and C/H reconciliation |
| `value-cost-leaf-audit.json`, `value-cost-leaf-events.jsonl.gz`, `value-cost-leaves.*` | Direct C mutation sensitivity evidence, independently of the adapter's credit |
| `area-advisory-summary.json`, `kernel-sweeps.log`, `refusal-census.log`, `oracle-census.log` | Readable extracts of `verify.json`; not separate reruns |
| `normative-search.txt`, `builder-docs-{B,C,H}.*` | Current-claim search and independently reproduced pre-existing documentation failure |
| `manifest.json`, `source-integrity.json` | Delivered artifact digests and final pinned-source/working-tree checks |

Temporary paths in logs identify the execution locations; reproduction requires the pinned source and attached scripts, not those temporary directories. Passing counts describe the stated checks only. In particular, the reported registry kills do not waive the attribution defect, and successful verification is not independent acceptance.

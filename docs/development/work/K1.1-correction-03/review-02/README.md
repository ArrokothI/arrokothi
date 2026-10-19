# Review 02 evidence

Reviewer: Codex Desktop local session `01a13ae6-14a7-7f20-a52f-f484b0614df4`, model `gpt-6-astra`. These are review artifacts, not candidate changes. The accountable verdict is in `../review-02.md`.

## Pinned inputs

- B: `b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b`.
- C: `ad9bc8640d261ace8af5e75c47aad1bad3ca84d7`.
- H: `41628b8bcfd11c899c2fcf60ef4fb73c0858e298`.
- `identity.json`, `pinned-inputs.json`, `history.txt`, `changed-files.txt`, `cumulative.diff`, and `administrative.diff` bind the source and policy. The full binary-capable B..H diff is retained, including historical evidence additions.
- `coverage-before-reports.md` fixes the independent obligation map before implementation reports were read. `source-review.md` is the source trace; runtime observations are separate.
- `owner-supplements.txt` preserves the owner's supplied decisions verbatim.

## Reproduction

Use Node **v26.10.0**, npm 11.19.1 and Python 3. A complete repository object database is required because the corpus reads historical blobs. Create two fresh detached clones at C and B, install the pinned dependencies in C, and make them available in B. Do not reuse a dirty implementer checkout. The review used `/private/tmp/arrokothi-kc3-review02-c` and `/private/tmp/arrokothi-kc3-review02-b`.

Run the following from clean C, as the sole validation job, before any other validation or probe:

```sh
python3 -B scripts/packet_tools.py verify --revision ad9bc8640d261ace8af5e75c47aad1bad3ca84d7 --spec docs/development/work/K1.1-correction-03/verification.json
```

Then run the maintained corpus and all three registries sequentially with `run-required-followups.py /absolute/path/to/C`. That script's own directory is its output directory; copy the review evidence to a new output location before rerunning if preserving these recorded logs.

After those runs finish, use `run-review-probes.py /absolute/path/to/C /absolute/path/to/B` for the prior probes, additional searches, C1 requalification and the B/C documentation comparison. The wrapper records every exit and proceeds past expected old-probe failures. No candidate file is edited: mutation probes use temporary copies; the C1 script temporarily alters and restores the separate B clone. The final workspace check verifies B's tracked restoration; its dependency symlink remains untracked. C stays completely clean.

`run-extra-probes.py /absolute/path/to/C /absolute/path/to/B` records the follow-ups motivated by those results: the boolean stop-return mutant against all 475 maintained value tests, direct B/C ingress leaf errors without the mutation adapter, and all 18 named maintained attribution controls.

Every new probe is independently runnable from C:

```sh
python3 -B /absolute/path/to/review-02/probe-attribution-02.py
python3 -B /absolute/path/to/review-02/probe-continuations.py
python3 -B /absolute/path/to/review-02/probe-stop-guard.py
python3 -B /absolute/path/to/review-02/probe-stop-forms.py
python3 -B /absolute/path/to/review-02/probe-stop-corpus.py
python3 -B /absolute/path/to/review-02/probe-c1-group.py /absolute/path/to/B
```

`probe-continuations.py` also needs the adjacent `probe-continuations.mjs`. The other scripts carry their temporary test sources and precise mutations inline. The attribution probe copies the pinned candidate's unmodified adapter, reporter and witness, including both support files added after review 01. It invokes the real outer classifier. The stop probes first run the unmodified checker and maintained oracle against the mutant, and only then inject observations into a separate trace execution.

## Reading the outputs

- `verify.json` is the complete independent verify stdout; `verify.stderr.log` is its stderr. `verify-run.json` records environment, clean clone, exact command and observed timing. `verification-summary.json` is derived from the full output, not a substitute for it.
- `required-followups.json` records the post-verify order, commands, exits and cleanliness. Each job has corresponding `.stdout.log` and `.stderr.log` files.
- `review-probes.json` records the review search commands and exits, with separate logs. An original review-01 probe exiting nonzero is expected when its assertion that the old defect exists no longer holds. The adapted probe keeps the fixture and tests the corrected contract.
- `extra-probes.json` records the three focused follow-ups and their outputs. A mutation probe exiting zero means the probe completed; inspect its nested test/guard results and trace before drawing a conclusion.
- `record-audit.json` reconciles packet identity, adoption and C1 maps. `prior-manifest-audit.json` verifies the prior review's attached manifest. `value-cost-observation-audit.json` extracts all 231 current verify observations and keeps both asserted and nonqualifying failures.
- The original C1 ablation matrices were inspected and reconciled, not all rerun. The focused B/C C1 requalification is rerun; its output identifies the downgraded and ported groups.

These finite searches do not measure engine time or prove arbitrary future JavaScript programs safe. The review distinguishes current implementation behavior, discrimination by the maintained checks, and attribution of mutation credit. The final manifest hashes the review record and all attached files, excluding the manifest itself.

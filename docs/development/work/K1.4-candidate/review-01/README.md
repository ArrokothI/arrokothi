# Review 01 evidence

Subject: H `484afd13d7652958f6496afc56d9aa9c098d58b1`.
The verdict and correction contract are in [review 01](../review-01.md) and [brief 02](brief-02.md).

Run from the checkout root after `npm ci`, using Node v26.10.0:

```sh
node docs/development/work/K1.4-candidate/review-01/scope-check.mjs
node docs/development/work/K1.4-candidate/review-01/probes.mjs
```

The scope script checks fixed B/C/H. The probe uses the checkout's candidate code; at H it exits
0 after reproducing the timeout-alias defect and demonstrating that the latest-grant mutant
passes all twelve schedules but fails ABL-2. Its assertions preserve the observed defect as
review evidence, not a test that the defect is correct. The next build must add a maintained
regression expecting the repaired behavior. All mutations run in temporary copies, removed in
`finally`; the subject's files are never edited.

The retained CI ZIP is artifact 14150323794 from existing run 43676796376. `ci-run.txt` and
`ci-summary.json` are byte-for-byte extracted members. `ci-inspection.json` contains counts
computed from the downloaded summary/raw verify output, and `ci-revision.log` is a selected
excerpt of job 132698613279's log. The ZIP contains the complete raw `verify.json` and stderr.
No CI was started. `SHA256SUMS` pins the retained evidence and probe files, excluding itself.

`local-validation.txt` distinguishes rerun checks from inspected CI. Its cheap local checks can
be rerun; no full TAP is needed to reproduce them. `probes.jsonl`, `scope.json` and `candidate.json`
retain the additional observations and identity checks.

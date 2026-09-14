# Cleanup evidence — K1.0-correction-01, 2026-09-13

Subject: accepted H `1295c68b03ae5d8eb0bbb86e974353402ff9a518`, clean payload C `36460438e95e968beec0b354b07a616b53981256`; reruns performed at clean pre-cleanup head `41728edfc3cfc5c745e4293c511a740942f7b631`. H..head adds only review-02. Cwd: `/Users/rex-shih/Documents/ArrokothI/arrokothi`. These are output-only attachments; the inline probe is quoted in its log for reproducibility, not added as a fixture or evaluator.

| Raw output | Check | SHA-256 |
|---|---|---|
| [builder-docs.log](builder-docs.log) | npm run check:builder-docs: 26 files, 287 links/anchors, 38 imports | `092e95eaf498c1f1c5c1d2e1fd6c24b5d87ffaea58145e1f22ed68464aea2bdf` |
| [identity-and-digests.log](identity-and-digests.log) | 18 pinned validation manifests / all attached log payload digests checked; identity, frozen paths and prerequisite ancestry checks | `6886110574f5896550f75701edcc8bb9e7e128918b25d0bdee58fea82562f8c3` |
| [relation-counterexamples.log](relation-counterexamples.log) | Fresh semantic probe: 22 false relations silently accepted; 2 permitted permutations and 2 adjacent comparisons checked. Exit 0 means defect reproduced. | `a119d1c52061164e9f45ea92698d795d48622605440e78d468d11e9a16f77bfc` |
| [test-full.log](test-full.log) | npm test: 2051 pass, 301 suites, 0 fail/skipped | `57420a75bb30c7308d18881e6060d68475263ca7c4edc69760abbb37642459d5` |
| [typecheck.log](typecheck.log) | npm run typecheck: clean | `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be` |

Pinned validation-02 logs were inspected, not rerun under their original command identities. The full-suite/typecheck/builder checks above are fresh reruns. No eval, live model, E1 gate, packed-consumer or crash/isolation run was performed. The full suite includes the architecture evidence guard; no duplicate conformance/SDK/kernel alias run was needed. This evidence directory is checked explicitly in the cleanup handoff, not claimed to be covered by the validation-directory guard.

# K1.0 cleanup evidence 01

Inspected tree/head: 36595f57d1f8cec8c4bf8a6293e888ca27750fab
Accepted H: f3aa29d7ecba2a23aa85788b7efdebdd383cab24
Payload C: d693d59aefe5335c8950d57cec6d6b57e375cadc
Cwd: /Users/rex-shih/Documents/ArrokothI/arrokothi
Environment: Node v25.2.1; npm 11.6.2; TypeScript 5.9.3; Darwin arm64

These are fresh cleanup observations, not edits to validation-16 and not independent acceptance. All commands exited 0. `npm test`: 2030 tests, 299 suites, no failures/skips; `npm run typecheck`: clean; `npm run check:builder-docs`: 26 files, 284 links/anchors, 38 imports. The counterexample exit confirms the defect. Source/test/contract/manifest bytes equal accepted H; only administrative records are subsequently added.

| Raw output | SHA-256 |
|---|---|
| [builder-docs.log](builder-docs.log) | `30f35822692d0e07dda300d94aea66b5f7ac85c30479c311dcb705f793ca5835` |
| [cell-decoding-counterexamples.log](cell-decoding-counterexamples.log) | `407d4184128ab89abcced3b16bb5893bfbfbd759b0fc1c7b267af90185f2db01` |
| [test-full.log](test-full.log) | `292754e5dc70b7ea22234a29e750dc60b0a6e65c59db8f91b94064d0b91bd252` |
| [typecheck.log](typecheck.log) | `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be` |
| [final-architecture.log](final-architecture.log) | `e8dbf50fe4936e4b1e4b3d8f1f29b8987f3e0383ed98c4d087c8a08fc8548a4c` |

Final administrative-tree rerun: `node --test --experimental-strip-types tests/conformance/architecture/*.test.ts`, exit 0, 330 tests / 34 suites / zero failures or skips. Run after adding the reopening summaries/records; executable and governed inventory inputs still equal H. Local file/anchor validation checked 104 references successfully before the final ledger cross-reference was added; original packet headings were all retained.

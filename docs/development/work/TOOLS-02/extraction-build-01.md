# Extraction build 01 — fifteen new-test groups

2026-10-31, implementing Codex GPT-6. Reconfirmed each planned subject at
`81313a99` before writing its test. Product files remain unchanged since the source
readings. No accepted decision supersedes these current requirements.

| Groups | Current mechanism and coverage gap | Maintained destination |
|---|---|---|
| Listing scope work | visibleExecutionIds scans every scope for every record. receipts.test.ts asserts only a positive count for listing. Single lookup equality does not execute listing. | origin-regressions.test.ts, early/late/absent match traces |
| Creation/ingress observation | observeOwn and the saved envelope fields govern authority, identity and content. Stable scope and payload mutation tests do not assert every shifting field's first value and read count. Use the byte-core API directly. | origin-regressions.test.ts, creation/ingress first-observation matrix |
| Hidden activity before creation | runArm creates A before its old round-0 callback. Add a separate beforeCreate callback that defaults to no-op and retains every existing schedule. | nondisclosure.test.ts, full transcript comparison |
| Next-exchange grant | Current submission identity must match that exchange. submission-lifetime covers resend/takeover, and exact-coordinates obtains a fresh grant without challenging the old one. | origin-regressions.test.ts |
| Cross-Execution grant | A legitimate grant from A must refuse current coordinates on B. The losing-outcomes same-looking-coordinates case cancels both records and uses B's own grant, so it does not cover this check. | origin-regressions.test.ts |
| Opaque identity normalization | Current submitOutcome uses exact identity equality. Bounded searches of Kernel/SDK tests and registry edits found no NFC/NFD or uppercase coordinate challenge. | origin-regressions.test.ts |
| Recovery message omission | captureRecovery supplies a nonempty issue message, while the recovery refusal calls explainDiagnosticIssues with false. Existing bounds and substring assertions allow messages. | origin-regressions.test.ts, exact located-code refusal |
| Bracket/root adjacency | explainDiagnosticIssues joins a bracket directly to its root. Existing direct tests precompose paths, while the dotted member tests exercise the other branch. | origin-regressions.test.ts, exact bracket and dotted results |
| Five control getter schedules | captureAttempt/captureRecovery precede current-state checks. Safety callbacks run later, Outcome getters have another outer operation, and the poison getter only inspects. Retain all five post-inner snapshots and classifications from group review 20. | control-observation.test.ts |
| Protocol hold with unsafe Driver | Hold-local permission and Driver replacement safety are separate prerequisites. Existing hold-permitted uses a safe Driver, while unsafe controls have no hold. Retain absent and false callbacks. | origin-regressions.test.ts |
| Canonical heading rename | check-builder-docs still scans mental-model pages. A clean corpus check covers only valid links. Bounded test/script searches found no seeded heading-rename fixture. | architecture/builder-docs-anchor.test.ts, isolated valid/renamed inputs |

The 27-origin count-gate group remains retired under the earlier replacement
reading. It does not need a new test. The distinct counts remain 15 tests and 152
adoptions. This record adds no P1 credit or final validation claim. Run the tests
in a new no-local clone after npm ci, and stop on a product defect. All new test
code is independently written here. Existing repository helpers and the existing
TypeScript dependency are reused without adding third-party source or dependencies.

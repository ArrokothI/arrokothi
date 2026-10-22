# BINDING-01 fixture migration stop — 2026-10-22

The owner's stop condition is met: a correctly routed C1 mutant still survives. No replacement C or CI dispatch.

## Checkpoint and completed repairs

- Investigated CI `39818820449` at C `8914175b`; WIP payload `c02c9e384ab5eff9979550b4937ba7c70a1b89f4` (repair `8494732c`, formatting follow-up `c02c9e38`).
- Shared registry packaging now includes SDK sources and moved test support. Adapter-input tests consume that declared closure. The redundant array-surplus file workaround and its extra census match are removed.
- C1 creation/ingress selections now include their moved SDK witnesses; the renamed eight-root witness is selected again. The append mutant targets SDK own-array; its at-C port/key is updated, historical ports unchanged.
- The maintained manifest test follows the approved BINDING-01 lists, relocated declaration and reopened binding history. No production code or whole-decision oracle expectation changed.
- Grepped every fixture/probe under both requested roots. Remaining Kernel paths include current core mechanisms, intentional baseline/synthetic fixtures, historical provenance, and the six stale realm routes below.

## Confirmed survivor

`value-cost.c1.ingress`, `VAL-snapshot-is-caller-object`, mutation `8326241e1a83d5154bddbc25c7c6a4cf30eceabf76dae3bce73b6394126b575c`.

Its SDK target replaces `return finishObject(prototype, captured)` with `return container as unknown as BoundaryValue`. The control and mutant each pass all five selected witnesses, including the relocated SDK ingress refusal witness. A supplementary V8 coverage repeat also passes and reaches the mutated return (UTF-16 offset 75024; smallest enclosing range 67848–75071, count 18). This establishes a lost C1 kill; production impact is not established.

The facade submits canonical bytes and the core parses its own values, so a consumer inspection no longer necessarily detects the wrapper returning a caller-owned snapshot. Selecting the moved refusal witness did not restore that detection. The mutation remains in the registry. No assertion, expected result or kill qualification was relaxed.

Evidence: [survivor.json](fixture-migration-01/survivor.json). Reproduce from a fresh clone checked out at the WIP SHA, after `npm ci`, with Node v26.10.0 first on PATH: `python3 -B /path/to/fixture-migration-01/reproduce.py /outside/clone/result.json`. The script checks clean_payload and uses the unchanged runner plus the committed case and dependencies.

## Validation and remaining work

Fresh `git clone --no-local --no-checkout`, checkout, npm ci; clean_payload passed before checks. Mac arm64, Codex desktop GPT-6 (exact serving variant unavailable), no delegated sessions or third-party material added.

- Registered mutants completed: **103 killed, 6 invalid_baseline**. All 29 oracle and 11 capture controls now pass.
- Four realm shadow controls still import retired Kernel canonicalize. Two sealed realm creation controls submit live objects to the byte core: both calls refuse, unlike their stored observations. Their historical reproducers and expected decisions remain untouched.
- Full value-cost run was stopped after the isolated survivor was confirmed; it reached C1 ingress. Full tool-tests was also stopped without a complete result; the focused adapter-input (11) and transfer-limit (52) tests passed. Full verify and CI were not run. Post-check clean_payload passed.
- Local logs and raw evidence: `/private/tmp/binding01-fixtures.9VtXVo` (disposable clone in `repo/`; all outputs outside it). The committed reproduction is portable.

Next step: owner direction on restoring the C1 ingress obligation after the SDK/core split. Keep the mutant and its obligation. Then complete the remaining C1 and realm ports, fresh-clone checks and full verify before creating C or dispatching CI.

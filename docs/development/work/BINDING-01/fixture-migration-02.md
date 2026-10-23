# Fixture migration 02 — owner-directed ports

Owner direction on fixture-migration-01 at `9bcb2527`, received 2026-10-22:

- Move the surviving C1 snapshot obligation into a direct SDK wrapper witness. B1-1 mutated-buffer tests close the core half. Keep the existing mutant, key and kill requirement; stop again if it survives the direct wrapper witness.
- Port the four lexical-shadow and two creation registry controls to canonical-byte core calls. Require correct acceptance/content; preserve the sealed historical reproducers and retire only their stale registry routes, with a reason in each case.
- Fresh-clone full tool-tests, both mutation registries and full verify must pass before C and one CI dispatch. End without polling.

The new `wrapper-snapshot.test.ts` checks separate identities, deep freezing and unchanged snapshots after mutations to the caller's object and nested containers. C1 ingress selects it; C1 creation does not contain this mutant. The mutation and key remain unchanged.

`realm-byte-port.mjs` loads the core before installing each lexical shadow. Shadow cases validate bytes twice; creation cases install the JSON shadow from the existing own payload getter, then check correct retained content, replay and different-content conflict. `port.retired_argv` preserves the old route with its retirement reason. Existing comparison mutants still must be killed. Hold classifications remain held for TOOLS-02.

## Completion (Claude, 2026-10-22)

The first full value-cost run after the ports (`a7440d52`) left 18 C1 mutants uncredited. Each traced to a migration mechanism, not to a production change:

- **Multi-file probe.** `node --test` ran each selected file in a child process, out of the witness's reach. The probe now runs one process per file (`a7440d52`).
- **Escaping exceptions.** The SDK split kept only the `finally` of two wrapped-child probes, creation's and outcome-hostile's. It dropped B's `escaped` capture and its `null` assertion. Both are restored, and the pollution creation test gets the same capture for the core's raw `TypeError`. 6 + 1 kills.
- **Facade refusal.** The binding facade signalled a wrapper refusal of a consumer value with a plain `Error`. It is now `assert.fail` on that condition, like harness `accepted()`. RC-ELEMENT-READ kills in dispatch and outcome-hostile.
- **Owned bytes.** The mailbox entry now holds its `Uint8Array`, so a deep comparison over it cannot be witnessed. The swallowed-write check compares a plain projection with the same expectation. C-MAILBOX-PUSH kill.
- **Core half.** At B, value-diagnostic-work and value-refusal-cost also pinned the Kernel's whole-refusal order. MC1, MR1 and RC-EAGER-EMISSIONS had no remaining witness anywhere in the kernel/SDK suites. `byte-aggregation.test.ts` checks every malformed byte root of creation, Outcome and recovery, and zero field reads before visibility. Both cases select it.

Edits to pinned test files keep their line counts. The edited members are already census-`refused` for span changes, so adoption positions and holds are unchanged.

This is test/evidence maintenance; production code, supported SDK exports and the generic complete-decision oracle are unchanged. No third-party material or dependency added. Actual session: Codex desktop, GPT-6 (exact serving variant unavailable), Mac arm64; no delegated sessions. Results and resumable next step are in progress.md.

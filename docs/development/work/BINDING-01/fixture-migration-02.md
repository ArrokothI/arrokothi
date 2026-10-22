# Fixture migration 02 — owner-directed ports

Owner direction on fixture-migration-01 at `9bcb2527`, received 2026-10-22:

- Move the surviving C1 snapshot obligation into a direct SDK wrapper witness. B1-1 mutated-buffer tests close the core half. Keep the existing mutant, key and kill requirement; stop again if it survives the direct wrapper witness.
- Port the four lexical-shadow and two creation registry controls to canonical-byte core calls. Require correct acceptance/content; preserve the sealed historical reproducers and retire only their stale registry routes, with a reason in each case.
- Fresh-clone full tool-tests, both mutation registries and full verify must pass before C and one CI dispatch. End without polling.

The new `wrapper-snapshot.test.ts` checks separate identities, deep freezing and unchanged snapshots after mutations to the caller's object and nested containers. C1 ingress selects it; C1 creation does not contain this mutant. The mutation and key remain unchanged.

`realm-byte-port.mjs` loads the core before installing each lexical shadow. Shadow cases validate bytes twice; creation cases install the JSON shadow from the existing own payload getter, then check correct retained content, replay and different-content conflict. `port.retired_argv` preserves the old route with its retirement reason. Existing comparison mutants still must be killed. Hold classifications remain held for TOOLS-02.

This is test/evidence maintenance; production code, supported SDK exports and the generic complete-decision oracle are unchanged. No third-party material or dependency added. Actual session: Codex desktop, GPT-6 (exact serving variant unavailable), Mac arm64; no delegated sessions. Results and resumable next step are in progress.md.

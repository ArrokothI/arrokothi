# BINDING-01 progress

- Phase: build; stopped under design-check N1 pending owner ruling.
- Branch: `claude/binding-01`; B: `af9e3b0ece4786ec41940f1dfa5f0468d83ddd08`.
- Done: fetched/switched/pulled at release `482802294e3077544bffed32393608bb06841a28`.
- Done: IN_PROGRESS/start checkpoint `ed45dabc3e21907d6f05ddc400b664fb895e1b53`, pushed.
- Done: design/spec checkpoint `ec10c7537bcc341aa1c78b53e1b6612362a1a59c`, pushed and remote SHA verified; answers brief 1–5 and B1-1–B1-5; 17 required CI steps.
- Checks: spec plan/environment/input validation, catalog script agreement, 19 preservation paths and 9 local design links passed; git diff --check passed.
- Pre-build targeted baseline: builder-docs passed (74 Markdown files, 2,044 links/anchors, 38 public imports).
- Design check: owner’s independent Opus brain session approved `43f03d9a` with D01-CHK-01 (primitive identity strings); recorded in design-01-check.md and incorporated in design-01.md. L-09 core/wrapper qualification accepted; build authorized.
- Harness plan (before migration): lazy accessor envelopes encode a root when the core observes that own field, forwarding each original getter once; no eager traversal or facade decisions.
- Done: design approval/D01-CHK-01 recorded and pushed at `81df324d`.
- Build WIP `825e7cd9`: initial core/transport, immediate root copying, primitive identity checks, unchanged SDK capture/helper copy and dependency move; no tests migrated.
- Checks: targeted production TypeScript compile and ownership/freeze/strictness/transport/wrapper-cycle smoke checks passed; legacy suite not yet migrated.
- Next step: owner resolves migration-question-01.md under N1; then finish wrapper bytes helper/facade, test migration, AST guard/shadow witnesses, Layer 3/BASELINE/017, clean C and CI.
- Open question: wrapper-only cycle/unrepresentable-member cases require Kernel refusal records in the existing consumer oracle; splitting them into SDK no-core-call witnesses changes those case expectations. See migration-question-01.md. No oracle edited.
- Last CI run: none for BINDING-01; no clean C yet. Do not run composed verify locally.
- Session: Codex desktop, GPT-6 per session instructions (exact serving variant unavailable); Mac arm64, 2026-10-19–20 America/New_York; no delegated sessions.
- Setup: prepend `/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin` to PATH; verified `v26.10.0`.
- Git metadata writes/network require reviewed escalation here; only normal pushes to this branch.

# K1.4-candidate progress

The resume point for any session continuing this packet. Newest facts first.

- **Owner choice 01 recorded (2026-11-14): "Confirm Q7".** [Owner choice 01](owner-choice-01.md).
  - *Roles:* this Claude Fable 5.2 session implements. A Codex GPT-6 session does the design check and the review;
    a Claude Opus session does them if GPT-6 is out of quota.
  - *Open:* Q1–Q6 of [design 01](design-01.md), which wait for design check 01 and the owner's disposition.
  - *Code:* none. Build nothing yet.
  - *Next:* design check 01 of design 01 at `c237db58441eccfa6d59e59779068ab9b93a203d`.

- **Design 01 written; stopped for the owner (2026-11-14).** Branch `claude/k1.4-candidate` from base B
  `c1951226338de6ccd3e4e6289259549551268f61`. Implementer: a Claude Code desktop session on Claude Fable 5.2
  (`claude-fable-5-2`), assigned by the owner; release 01 names Claude Opus 5.5 (design 01 Q7).
  - *Design:* [design 01](design-01.md) answers brief 01's three suspect designs and four questions.
  - *Stop conditions fired (design 01 §1):*
    - S1: `control-stale-timer-and-lost-wake`, `wait-structure-not-satisfiability` and `cited-decision-edges`
      need a trusted non-timeout Event source. The K1 Kernel has none ([017](../../017-known-limitations.md) L-21).
    - S2: `control-subscription-wait-deadline` step 6 expects `to-gd2`, a Kernel-minted timeout Event no command
      names.
    - S3: the corpus does not say when `Observation.rejection` ends; `identity-create-and-activation` step 3 and
      `control-whole-envelope-validation` step 7 pull apart.
    - S4: `effectIntents` has no Kernel source; the ledger assertions are vacuous at K1.
  - *Predicted, by reading only:* 10 scenarios pass as they are; 2 fail at one step each (S2, S3); 3 cannot run
    (S1). Nothing has been run against the Kernel.
  - *Code:* none. No candidate, test or probe file exists. The fixture and the Kernel are untouched.
  - *Baseline at B:* `npm run typecheck` exit 0; `tests/conformance/k0/*.test.ts` 810 of 810, on local Node
    v25.2.1, which is below the 26.10.0 floor. Informational; Packet verify in CI at the first C is the baseline
    of record. No local Node 26.10 was found.
  - *Next:* the design check (a session that has not worked on this packet), then the owner's answers to Q1–Q7.
    No build before both. On resume, read design 01 §9 and the owner's dispositions first; the build's first act is
    the real run of the scenarios the answers leave runnable.

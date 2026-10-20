# Design 01 check — BINDING-01

Owner-relayed check, 2026-10-20, by the owner’s Opus brain session, independent of the implementer.
Candidate: `claude/binding-01` at `43f03d9ae07325948afe938875a45f9bed6e9ebf`.
Verdict: **APPROVED WITH ONE REQUIRED CHANGE**; the owner authorizes build after recording it.

- Q1: readers get deeply frozen values parsed from Kernel-owned validated bytes. Keep bytes, text
  and count internal for a possible later bytes reader.
- Q2–Q5 and B1-1–B1-5 closures approved, including SDK moves, transport, 017 and core claim.
- L-09: keep observeField own-getter/Proxy behavior; copy/validate each root as observed. Qualify
  both core envelope and wrapper; add no hardening or new contract.
- **D01-CHK-01:** identity fields remain primitive strings (creation key, scope, pins, request
  key/kind/subscription class, Emission key). acceptIdentityText replaces canonicalize with type,
  UTF-16 well-formedness and existing string-limit checks using load-time intrinsics. Include it
  in the AST guard and shadow witnesses. Identity text “where it is a value” means inside a root.
- N1: before test migration, progress records how the facade encodes at the existing observation
  point. If any whole-decision oracle issue code, precedence or receipt must change, stop and ask;
  do not edit the oracle.
- N2: capture number-decoding intrinsics too; guard decoder as well as encoder.
- Run composed verify only in CI at clean C, record run ID, then end the turn without polling.

This is a faithful implementation record of the human-relayed check, not an implementer verdict.

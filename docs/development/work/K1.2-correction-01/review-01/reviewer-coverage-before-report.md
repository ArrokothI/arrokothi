# Reviewer coverage map (derived before reading implementation-01 / reconstruction)
Sources: 007 K1.2-correction-01 row; invalidation-01; review-14 ID-01/EVID-01 required outcomes; decision-02;
execution-cycle #outcome-acceptance; identity.md #runtime-attempt; values.md; contract DEC-1..3 + rev9 C1-C15.

Producers of Activation IDs: dispatch `${executionId}/activation-${n}`; executionId = `execution-` + pack(namespace[trusted,any string], scope[<=65,536 scalars], key[<=65,536]).
=> unbounded length; lone surrogates only via namespace; n unbounded.
Consumers: submitOutcome (replay map, terminal, currency, grant, content), requestTakeover/recoverExecution/reportProtocolFailure
(captureAttempt/captureRecovery -> #openExchange), internal packIdentity for Emission/result IDs, grants, history, holds,
inspection views, refusal-reason rendering (!), delivery rows.

| # | Obligation | Distinguishing schedule | Expected / forbidden | Evidence to find |
|---|---|---|---|---|
| R1 | ID-01 every minted ID answerable on 4 surfaces | CE1 key 65,536; CE2 key 65,490 exch 1-9 then 10; long namespace; surrogate namespace | accept base+1; takeover epoch+1; code hold enter/clear; protocol hold enter/clear; whole-result | tests + rerun + own probe |
| R2 | DEC-3 replay after takeover/resolution/next/terminal, no grant; conflict | same, both terminal and open | same receipt object; nothing appended; conflict appends only refusal | tests + probe |
| R3 | EVID-01 text class pinned both directions | "", lone surrogates, 65,536/65,537, astral; x decision-02 schedules x grants x content; 3 controls x power | wrong string -> terminal/stale/no_unresolved; never content-group; no text diag | tests + ablations I1-I6 |
| R4 | non-string classes unchanged | number/object/boxed/missing/throwing/revoked | content-group after authority; malformed_value on controls | tests (partial-claim + new) |
| R5 | exact equality, no truncation/prefix/normalization | truncated current; current+suffix; NFC/NFD variant; exch-10 vs exch-1 prefix | stale; no collision with accepted exch-1 | own probe |
| R6 | order preserved: scope first (0 reads), control power before capture | outsider hidden vs missing | identical, 0 reads | tests |
| R7 | internal consumers safe with long/surrogate IDs | Emission+complete on long/surrogate ID; result ID; inspection | no throw mid-commit; ids distinct | own probe |
| R8 | refusal rendering of now-usable caller strings | grant-less visible caller: stale Outcome w/ huge or surrogate activationId; control w/ huge ID | bounded/no retained arbitrary caller text? (compare O3 rule adopted by candidate) | own probe |
| R9 | O3 bounded unknown field names | long/surrogate/control/128/129 on envelope/next/emission | bounded; whole refusal; no read of unknown | tests + I7 |
| R10 | C1-C15 cumulative still pass | full suites; 36 original ablations; R11 probe | green; 36/36 | rerun |
| R11 | Layer 3: one owner, no status, no silent settlement, rewrite-index §5 | identity.md new rule; execution-cycle step 2/preamble; sources; roadmap; rewrite-index §3/§4 | marker kept; binding choice labeled; new normative rule authorized? | read |
| R12 | BASELINE records DEC-1; 007 row; C..H allowlist; manifest digests | | | git + sha256 |
| R13 | integrated K1.1 creation/Execution ID unchanged | diff creation code | identical | check-records + own diff |

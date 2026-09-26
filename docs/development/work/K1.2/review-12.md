# Independent review — K1.2, review 12 (round-13 candidate H13)

## Identity

- Reviewer: ChatGPT, GPT-5.6 Sol, owner-requested independent review, 2026-09-26 UTC. No stable
  session identifier is exposed to the reviewer.
- Repository/branch: `ArrokothI/arrokothi`,
  `claude/k1.2-outcome-acceptance-receipts`.
- Governing base B: `a20d278185eaffc7f8b7489345a3624231ff6e6d`.
- Payload C11: `ad219a5cf8940d0379bda9b16d693c901931a4b5`.
- Reviewed candidate H13: `54c65a7289e90385e01643422d57a015b66c2025`. The advertised branch head was verified at this SHA before
  recording the review.
- Previous candidate H12: `9655d12cf583967eff08582d175ed8beb5e2506e`; previous independent
  review: [review-11](review-11.md).
- Owner decision in force: [decision-01](decision-01.md). No owner decision resolves the malformed
  Activation-identity precedence recorded as K1.2-OPEN-5.

## Access, independence and limits

The reviewer had authenticated GitHub repository access sufficient to fetch full pinned files,
commit identities, branch state, comparisons and immutable validation attachments. The local shell
available to this session had no outbound GitHub/DNS access, so the repository could not be cloned
for an independent execution rerun. Governing 006 permits acceptance or rejection from adequate
immutable evidence when the reviewer clearly distinguishes inspected pinned executions from
independent reruns.

No repository mutation was made during the substantive review. Native Driver fidelity, persistence,
process death and E-gate evidence were not re-evaluated because K1.2 does not claim them.

## Candidate and evidence identity

- H13 has sole parent C11.
- B..H13 is 40 commits ahead and zero behind B.
- K1.1 integration `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa` and K1.1-correction-02
  integration `954d31b00eb7f2412c22ccf7d4d079699f0c4032` are ancestors of B.
- The correction delta `04df5ed67ec4c38ebc3b0515b487d5f7c787cb73..C11` is exactly the
  seven payload paths declared by implementation-13.
- `C11..H13` contains only implementation-13, validation-13 attachments and the K1.2 row update in
  007; no payload is smuggled into H.

I independently recomputed SHA-256 over all seven C11 payload artifacts listed in
`validation-13/MANIFEST.txt` and all thirteen validation-13 logs fetched from their pinned GitHub
contents. Every digest matches the manifest.

The immutable C11 logs report:

| Check | Inspected pinned result |
|---|---:|
| `npm run typecheck` | pass |
| `npm test` | 2567/2567 pass |
| `npm run test:kernel` | 513/513 pass |
| `npm run test:conformance` | 1945/1945 pass |
| `npm run test:sdk` | 22/22 pass |
| `npm run test:evals` | 12/12 pass |
| `npm run check:builder-docs` | pass; 72 Markdown files |
| packet ablations | 32/32 rejected; control 513/513 |
| reviewer ablations | 10/12 rejected; R2/R6 not applicable after source-shape changes |
| unchanged review-11 partial-claim probe | 8/8 expected `stale_exchange` |

These are inspected pinned executions, not reviewer reruns.

## Independent cumulative assessment

### K12-R11-ORDER-01 — CLOSED

The round-13 correction fixes the numeric partial-claim defect found by review 11.

`captureOutcome` now retains independently usable `epochForCurrency` and
`baseForCurrency`, and `submitOutcome` compares each well-formed coordinate against the unresolved
exchange before submission authority. The prior all-or-nothing numeric `claim` no longer suppresses
all currency checks merely because the other coordinate is malformed.

The distinguishing cases now line up with the canonical currency-before-authority rule:

- stale epoch + malformed/missing base -> `stale_exchange`;
- malformed/missing epoch + stale base -> `stale_exchange`;
- not-yet-issued epoch + malformed base -> `stale_exchange`;
- non-stale partial claim without the current grant -> `unauthorized_submission` without content
  disclosure;
- the same partial claim with the current grant reaches content validation;
- retired, forged, absent or current authority does not override a well-formed stale coordinate;
- replay/conflict, terminal and scope precedence remain in their prior positions.

The unchanged review-11 probe now passes all eight arms. B15 rejects the exact old defective family
(skip all currency when either numeric member is malformed) with 48 failing tests, and B16 rejects an
epoch-only incomplete repair with 14 failing tests. The R11 semantic finding is therefore closed and
its C11 implementation should be preserved.

## Blocking finding

### K12-R13-ARCH-01 — unresolved malformed Activation identity precedence requires owner authority

**Where:** [contract.md](contract.md) K1.2-OPEN-5 and
`packages/kernel/tests/outcome-partial-claim.test.ts` explicitly pin the current in-process behavior
while saying the Layer-3 ordering still awaits an owner decision.

Current behavior is observable: a terminal Execution submitted with a normal fresh Activation
identity reaches the terminal fence, but a non-text `activationId` is refused as
`malformed_envelope` before accepted-Outcome replay lookup and before the terminal check.

**Governing:** 006 says `WAITING_FOR_REVIEW` requires no unresolved owned semantic case, and that a
required unresolved semantic case cannot be left to the reviewer. A genuine missing/conflicting
semantic obligation takes the `BLOCKED_ARCHITECTURE` path. The overall review outcome must be one of
ACCEPT, CHANGES REQUIRED, or BLOCKED — ARCHITECTURE DECISION.

**Smallest owner decision required:** place a missing, malformed or unobservable `activationId`
relative to:

1. accepted-Outcome replay/conflict lookup;
2. terminal fencing;
3. current-Activation and epoch/base currency checks;
4. submission authority;
5. ordinary content validation.

The current binding chooses identity-shape validation before replay/terminal, but C11 itself says
that choice lacks canonical authorization. The independent reviewer must not silently convert the
current implementation into the architecture rule.

**Required outcome after decision:** update the single Layer-3 owner, contract, BASELINE and
implementation/tests consistently; preserve the C11 per-coordinate currency correction; create a
fresh C/H and re-review the cumulative packet.

The detailed architecture handoff is recorded in [blocker-02](blocker-02.md).

## Additional P2 corrections required after unblock

### K12-R13-REC-01 — contract revision identity is inconsistent

`implementation-13.md` calls the contract revision 8, while the pinned `contract.md` header still
declares revision 7. C11 materially changes DEC-2, coverage and distinguishing evidence and adds
OPEN-5. Governing 006 requires acceptance to name an exact contract revision, so one authoritative
revision identity must be recorded before acceptance.

### K12-R13-DOC-01 — “no content diagnostic is produced” overstates the implemented guarantee

C11 added “no content diagnostic is produced, returned, or retained” to the canonical
Outcome-acceptance text and DEC-2. But `captureOutcome()` intentionally remains eager and constructs
content issues before replay/currency/authority. Review 10 explicitly preserved eager capture for
DEC-10 single-observation/reentrancy safety and distinguished internal capture from allowing a content
result to decide, diagnose outwardly, return or be retained before authority.

Do not casually move capture after authority: that would reopen the TOCTOU/reentrancy class already
reviewed. Instead, unless the owner explicitly intends to forbid internal capture, make the canonical
wording describe the actual guarantee: content diagnostics do not determine the refusal and are not
returned or retained on stale/pre-authority paths.

## Non-blocking observation

The 007 introductory prose still describes only the first three K1.2 candidates. This is
administrative P3 cleanup and is not itself an acceptance blocker.

## Per-criterion verdicts

| Criterion | Verdict | Rationale |
|---|---|---|
| C1 | PASS | Scope/hidden-equivalence structure and evidence hold |
| C2 | PASS | Replay/conflict remains before fresh validation for addressable accepted identities |
| C3 | **FAIL** | Numeric R11 defect is fixed, but the packet explicitly leaves malformed Activation-identity classification/order unresolved |
| C4 | PASS | Atomic whole-batch/progress/Emission commit holds |
| C5 | PASS | continue/terminal/next-exchange semantics hold |
| C6 | PASS | B-5 and terminal ingress hold |
| C7 | PASS | Effects/obligations/waits refusal holds |
| C8 | PASS | Takeover/fencing and partial-stale numeric fencing now hold |
| C9 | PASS | Code-hold behavior holds |
| C10 | PASS | Protocol hold and authority-before-content behavior hold |
| C11 | PASS | Late reports/Outcomes remain correctly attributed |
| C12 | PASS | Receipts, immutable evidence and nondisclosure hold |
| C13 | PASS | Single observation/reentrancy design preserved |
| C14 | PASS | Zone/inventory evidence holds |
| C15 | **FAIL** | The canonical ordering remains intentionally incomplete at OPEN-5; revision and “produced” wording also require reconciliation |

No criterion is DEFERRED.

A criterion FAIL here is not a second packet status. It records why the criterion cannot pass.
Because the blocking cause is an unresolved architecture choice that the reviewer has no authority
to invent, the packet's single overall status is `BLOCKED_ARCHITECTURE`, not
`CHANGES_REQUESTED`.

## Verdict and status text for transcription

K1.2 candidate H13 `54c65a7289e90385e01643422d57a015b66c2025` (payload C11 `ad219a5cf8940d0379bda9b16d693c901931a4b5`, base `a20d278185eaffc7f8b7489345a3624231ff6e6d`) is **not accepted**.
K12-R11-ORDER-01 is closed. K12-R13-ARCH-01 is an unresolved in-scope architecture decision and
therefore governs the overall state. K12-R13-REC-01 and K12-R13-DOC-01 are additional P2 corrections
to close after the architecture decision.

Status: **BLOCKED_ARCHITECTURE**. No integration. No K1.3 release.

## Compact handoff

```text
K1.2 remains the released packet on claude/k1.2-outcome-acceptance-receipts.
Base B a20d278185eaffc7f8b7489345a3624231ff6e6d; payload C11 ad219a5cf8940d0379bda9b16d693c901931a4b5; reviewed H13 54c65a7289e90385e01643422d57a015b66c2025.

Preserve the C11 K12-R11-ORDER-01 correction: per-coordinate currency, 56-case matrix,
B15/B16, and unchanged reviewer probe.

Architecture blocker K12-R13-ARCH-01:
owner decides the position/classification of missing, malformed or unobservable activationId
relative to replay/conflict lookup, terminal fencing, current-Activation/currency, submission
authority and content validation. Current malformed_envelope-before-replay/terminal behavior is
implemented and tested but not canonically authorized.

After owner decision: align Layer-3 owner, contract, BASELINE and code/tests. Also fix:
K12-R13-REC-01 contract revision identity; K12-R13-DOC-01 “produced” wording versus eager capture.
Create fresh C/H and re-review the whole cumulative packet. No K1.3 release.
```

**BLOCKED — ARCHITECTURE DECISION**

# Implementation report — K1.1-reference-01, round 5 (C5/H5-ref)

Named **H5-ref** throughout to avoid collision with K1.1-correction-01's accepted H5
`52b1600f3b42e3a360fdc3395178f1d147edf304`, which is a different packet's candidate and is not
touched here.

## Identity

| Label | SHA |
|---|---|
| A (supplement base) | `519ba002378707a4deccff1ea0a243d21eb694b7` |
| D (owner documentation freeze) | `0ee13f8138af52107d86967043bcc460faba8893` |
| K1.1-correction-01 H5, accepted, untouched | `52b1600f3b42e3a360fdc3395178f1d147edf304` |
| H3-ref, ACCEPTed by [review-04](review-04.md) | `a53757868277f954d55180c63d09b3ebd027ae9f` |
| scope amendment, no payload | `f8dd3b41f7b3e6495dda39d8c65b6036a0c896d8` |
| C4-ref / H4-ref | `bd4a86748c31eb32ed3800e6deff1e18243e3e66` / `7db74aa881155a59acdd3933c118180ea68c6924` |
| round-3 ACCEPT recorded | `b76e494d6b8433650ca745f235a1f56a4211bb62` |
| **C5-ref (round-5 payload)** | **`e1eb5888af6bda071bc57e5aa417bc2496533ccd`** |
| H5-ref | this commit |

- Contract: **revision 4**. C5-ref→H5-ref allowlist: this report, `validation-05/` (3 logs +
  MANIFEST), the 007 ledger row.
- **Role.** Implemented by the session that wrote review-05 and K1.1-correction-01's C4/H5, and this
  packet's C2, C3 and C4. **Disqualified from accepting anything in the K1.1 line.**
- State: WAITING_FOR_REVIEW. `next_release: none`.

## Why this round exists

No reviewer raised it. **The implementer's own final check found it**, while sweeping for
statements about the newly edited README sections.

A standing rule appears in three governing documents — `AGENTS.md:17`, `006:262`, `009:92` —
*"Change Layer 1/2 only when the whole-system model or major abstraction changes."* On its face
C4-ref is outside that permission: it changes no whole-system model. Contract **revision 3 recorded
the owner's grant without addressing that rule at all**, and 006 requires a normative conflict to be
surfaced for an owner decision rather than silently resolved.

Shipping that gap into a review that is about to decide ACCEPT would have been worse than one
commit. It is exactly the shape a thorough reviewer flags.

## Changes

**One path: `contract.md`. No `mental-model/`, executable or record byte moved** (`00` §3).

Revision 4 changes **no scope** — the payload is still exactly the two authorized README sections —
and adds only the reconciliation, with both arguments stated **for a reviewer to judge rather than
to accept**:

1. The rule constrains an agent deciding on its own. The owner is the authority who sets a packet's
   scope, granted it explicitly on 2026-09-16, and 006 routes scope amendments through this
   artifact.
2. The content is documentation organization and defect repair, not model substance.
   `## How these pages are organized` is Layer 1's own subject, and README itself says that when a
   Layer-1/2 summary disagrees with a Layer-3 page "the summary is the defect" — repairing prose
   that became untrue is not a change to the model it summarizes.

It also names the remedy **if a reviewer disagrees**: revert the two sections to their state at D
and take the change as its own packet. Nothing else in this packet depends on it. That is deliberate
— a contract that only argues its own side leaves the reviewer no clean exit.

One wording repair in the same commit: the payload bullet read "revision 3 only", which after the
bump could be read as "only in revision 3" rather than "authorized from revision 3". Now the latter.

## Coverage

| Obligation | Check | Expected facts and forbidden changes | Evidence | Result |
|---|---|---|---|---|
| the conflict is surfaced, not resolved silently | read revision 4 against the three rule locations | both sides stated; a disagreement remedy named; **forbidden:** asserting the rule does not apply | `00` §1 | PASS |
| no scope moved | `git diff H4-ref..C5-ref` | contract only; payload list unchanged but for the wording repair | `00` §2 | PASS |
| no canonical page moved | `git diff H4-ref..C5-ref -- mental-model/` | empty | `00` §3 | PASS |
| cumulative guards hold | executable, manifests, the other four core pages, sealed records | all empty / byte-identical | `00` §4 | PASS |
| reviews unedited | modification count for review-01…04 | 0 | `00` §4 | PASS |
| README scope still proved | section-by-section against D; heading lists | 6 unchanged, 2 changed, headings identical, anchors survive | `00` §5 | PASS |
| the four negative greps | stale status in 007; shipped assertion and candidate SHA under `concepts/`+`mechanisms/`; two-target list entries | 0 / none / none / 0 | `00` §6 | PASS |
| ledger coherent | the three K1.1-line rows | `ACCEPTED`, `ACCEPTED`, `WAITING_FOR_REVIEW` | `00` §7 | PASS |

- Tests added/ported/removed: **none**.
- Findings: none open. `REF1-R1-STATUS-01`, `REF1-R1-CONV-01`, `REF1-R1-NAV-01`, `REF1-R2-DOC-01`
  all closed in earlier rounds and verified non-regressing here.
- Additional self-found defects: the revision-3 gap above, and the "revision 3 only" wording. Both
  found by the implementer, both closed in this round, both recorded with that provenance.

## Sequencing a reviewer must not miss

[Review-04](review-04.md) ACCEPTs **exact H3-ref**, and says so: *"This review binds to
`a53757868277f954d55180c63d09b3ebd027ae9f` only. It certifies no later commit."* The owner's Layer-1
grant and everything after it came later.

**H4-ref and H5-ref are therefore not covered by any review.** The ACCEPT is real and stands for
H3-ref; it is not an acceptance of this candidate. A cleanup session must not transcribe it as one.

## Validation and limits

CWD repository root. C5-ref `e1eb5888af6bda071bc57e5aa417bc2496533ccd`, tree clean. Node v25.2.1,
npm 11.6.2, TypeScript 5.9.3. `typecheck` clean; `check:builder-docs` 57/847/38. Digests in
`validation-05/MANIFEST.md`.

Runtime suites not rerun this round: round 5 touches one documentation artifact and no executable
byte. **The full gate was run at H4-ref** and reproduced: `npm test` 2322/356/0/0, conformance
1949/283/0, kernel 264/55/0, SDK 22/0, architecture 362/37/0, typecheck clean, builder-docs
57/847/38. Review-04 independently reran the gate at H3-ref on Node v22.22.3.

**Node limitation, restated and never claimed away.** Two legacy Effect tests cancel on Node
v22.22.3 — review-08 OP1, reproduced by review-02, review-03 and review-04 — pre-existing at
original B and untouched by anything in the K1.1 line. This machine has only Node 18 and 25 and has
never reproduced it. **No all-supported-Node green claim is made.**

Not run and why: `test:evals` (no Agent/model/eval path); E1, native Driver, persistence, isolation,
packaging — contract-excluded.

Third-party: **no new reuse**; manifests byte-unchanged; exact unmodified `canonicalize@3.0.0`
remains the sole approved third-party specifier.

## Handoff

Ready for independent review of exact H5-ref — cumulatively A→H5-ref, plus the round-5 delta
`b76e494..C5-ref` and the earlier round-4 delta. Reviews 01–04 preserved unedited. Implementation
ACCEPT at K1.1-correction-01's H5 untouched and not re-certified. No self-acceptance; integration
and final cleanup remain held; `next_release: none`.

**Push state:** everything from `f8dd3b41` onward is unpushed; the remote advertises H3-ref
`a53757868277f954d55180c63d09b3ebd027ae9f`.

## Owner note

The `scripts/` mechanical check is still the open durable item and still out of scope:
`check:builder-docs` reads neither `docs/development/work/**` nor `007`, so it validates links and
never prose. Round 4 wrote the *rule* at Layer 1, which makes the family nameable — but a reader is
what missed it four times, and this round is a fifth instance found by a reader who happened to
sweep one more directory.

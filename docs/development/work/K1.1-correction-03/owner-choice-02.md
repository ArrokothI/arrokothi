# K1.1-correction-03 — owner choice 02: stop-and-redesign route after review 02

**Record type:** owner decision under 006 stop-and-redesign. It answers [owner decision brief 03](review-02/brief-03.md)
of [independent review 02](review-02.md). It is not a review, an implementation, a design check or an acceptance.
It lifts no hold and releases no other packet.

**Provenance:** recorded on 2026-10-15 by the owner's Claude Code desktop session (`claude-opus-5-5`). That
session analysed review 02 and proposed the route below. The owner's reply, verbatim:

```text
yeah all the problems seems to be low risk, so I agree. Also, if you think the implementation is cheap, I can use opus to be the implementor, I got 17% weekly budget left, so you can decide which one to be the implementor.
```

The owner adopted the proposed route and delegated the choice of implementer to that session. The session's
analysis, which the owner accepted, is summarised here. Review 02 found no defect in the production code at C.
All three findings are P2 evidence and closure defects. They recur because the evidence tooling's claims are
stated universally ("every continuation", "every credited kill"), so another review can always construct
another counterexample. This is the decision-05 pattern, applied to evidence tooling.

## Route

The route is a **refined finishable claim** for KC3-R2-EVID-01 and KC3-R2-C1-03, with a **narrow redesign** for
KC3-R2-STOP-02. The split and accepted-limit options are not taken.

### 1. KC3-R2-STOP-02 — one stop representation (redesign)

- A stop is carried by one representation that no accepted `BoundaryValue` can equal. `false`, `null` and
  `undefined`, or any other value capture can accept, never signal a stop.
- Every function that can receive a stop returns that representation or handles it. The static check rejects
  every other stop form.
- The runtime oracle also observes Kernel bookkeeping and finalization after a stop: snapshot writes, array and
  object finishing, freezing. It no longer looks only at caller reads and counters. Unwinding the cycle set
  stays allowed.
- Design 03 states the bounded future-code claim the static check enforces, and declares its syntactic gaps
  (for example aliases). The runtime oracle covers the maintained shapes.
- Maintained evidence: `probe-stop-corpus.py`, `probe-stop-guard.py` and `probe-stop-forms.py`, with their
  correct control. Each listed mutant is rejected by at least one layer, or is listed as a declared gap with
  that reason.

### 2. KC3-R2-EVID-01 — qualifying kill (refined claim)

A mutant kill earns credit only if all of these hold:

1. A static check proves that no module under `packages/*/src` imports `node:assert` or `assert`, or
   constructs or throws an `AssertionError`.
2. The failing assertion belongs to a declared vocabulary, which design 03 lists. It is called from test code
   on plain data the subject returned or recorded. No subject callback, validation function, comparison hook or
   getter of a subject value runs inside the assertion. Assertion forms that run caller-supplied functions
   (for example `throws`/`rejects` with a validator, or `doesNotThrow`) do not qualify unless design 03 shows a
   form of them that does.
3. Harness helpers fail through a vocabulary assertion at their own failure branch. `harness.ts` is edited for
   this. Its `review.harness.*` helper-review bindings in `adoption.json` that the edit changes are reopened
   and transferred to TOOLS-02 under the owner choice 01 standing rule, which this decision extends to that
   helper module. The 2026-10-12 supplement still covers the two zone-helper origins.

Every other failure (subject exception, setup, load, hook, cancellation, timeout, overflow, or a non-vocabulary
assertion) earns **no automatic credit**. It is reported as uncredited. The mutant then needs a qualifying kill
elsewhere, or it is listed. Requalify the value-cost registry and C1 at B and at C by this same rule. Keep every
downgrade visible.

Maintained evidence: `probe-attribution-02.py`, with all eight false-credit routes and its controls. Each of the
eight now earns no credit.

### 3. KC3-R2-C1-03 — C1 unit (owner clarification)

The [design check](design-01-check.md)'s condition C1 had one purpose: converting tests must not silently weaken
the evidence. The owner clarifies its unit to match that purpose.

A converted test's lost kill is acceptable if two things hold:
- the same mutant is still killed by a qualifying assertion (§2) in another maintained test;
- the report lists the loss with its replacement site, and states which obligation the replacing assertion
  checks.

The ingress `O-APPENDOWN-PUSH` loss is judged by this rule. Strengthening that ingress test so it reaches its
own assertion again is optional.

## Process and roles

- **Implementer:** a fresh Codex GPT-6 session, not either reviewer session. It continues on
  `claude/k1.1-correction-03`, with B unchanged at `b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b`. The delegated
  choice was made for budget reasons: the owner's Opus allowance goes to the design check and to a review.
- **Design note:** `design-03.md` answers brief 03's questions 1–3 under this route. Implementation stops after
  it for a **design check**, which 006 requires after stop-and-redesign. A Claude Code session
  (`claude-opus-5-5`) performs that check.
- **Acceptance review:** two independent reviewers with different remits.
  - A fresh Codex GPT-6 session, not the implementer, performs the full review: verify, corpus, registries and
    the declared search.
  - A Claude Code session (`claude-opus-5-5`) performs a targeted review of the redesigned stop mechanism, the
    kill-qualification rule, the C1 clarification and the refined claims.
  - Acceptance requires both to accept the same exact H.
- **Stop conditions** are unchanged from brief 01. Stop and ask if a fix would raise B, add a residual or an
  accepted limit, or change accepted bytes or diagnostic meaning.
- **Holds and successors.** Both holds stay in place, and no successor is released.

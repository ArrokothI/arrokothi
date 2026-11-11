# K1.4 — owner choice 06: recorded-limit dispositions after review 03

**Record type:** owner decision. Recorded on 2026-11-11 by the K1.4 implementer's Claude Code desktop session
(`claude-opus-5-5`) from the owner's instruction for this round. The owner put and answered the questions outside
this session; this record quotes the answers.

## Question

[Review 03](https://github.com/ArrokothI/arrokothi/blob/5e36d514fb10347a182bbeaa36879ce9074fe72a/docs/development/work/K1.4/review-03.md)
(Codex GPT-6, `codex/k1.4-review-03` at `5e36d514`) is CHANGES REQUIRED of H
`b1769c0fcdb73bfc6297551b87f80e74bc6cb588`: K14-R3-01, K14-R3-02 and K14-R3-03. It is the third CHANGES
REQUIRED in the bridge's observation and termination subsystem. [Owner choice 05](owner-choice-05.md) had
already chosen the route for that outcome: (d), a recorded limit, with no further patch round. It left the
content of the limit open.

[Brief 04](https://github.com/ArrokothI/arrokothi/blob/5e36d514fb10347a182bbeaa36879ce9074fe72a/docs/development/work/K1.4/review-03/brief-04.md)
asks the owner to decide, for each finding, the exact scope, justification, trigger and fixing owner
(criterion R3-LIMIT). The review's suggested fields were proposals only.

| Finding | What the review found |
|---|---|
| K14-R3-01 | A native exception after READY→RUNNING leaves the member RUNNING with a pending cancellation. `cascade` treats the fulfilled `cancelExecution` call (`cancellation_pending`) as the end, so the Kernel takes `fail` with no cleanup hold |
| K14-R3-02 | `cancel.application`, `cancel.exchange-start` and `cancel.forward-loop` were recorded as equivalent only, but one rejected request cascade distinguishes each |
| K14-R3-03 | The cleanup census misses static template element access and quoted destructuring aliases, which its "fails closed" claim covered |

## Answers

The owner's answers, 2026-11-11, verbatim:

```text
- R3-01: "Record limit". A new 017 entry: after a native exception past READY->RUNNING, Kernel FAILED is
  authoritative and the accounted input is acknowledged; native may stay RUNNING with a pending
  cancellation; no cleanup hold, recovery or proven native termination follows; the Driver starts no later
  step. Trigger: a real store/definition port failure that needs trustworthy cleanup or recovery. Fixing
  owner: legacy Driver fidelity in R1 (coordinate with K3 if persisted recovery is needed). Narrow the
  baseline's whole-lineage cleanup claim and any report/design claim that a fulfilled cancel call means the
  members ended.
- R3-02: "Promote as tests". Add the review's three one-fault witnesses (cancel.application,
  cancel.exchange-start, cancel.forward-loop) as maintained behavioural kill rows; remove those three
  EQUIVALENT_ONLY reasons. Keep initial-input's T6 empty-obligation equivalence. Recount the oracle honestly.
- R3-03: "Record exclusion". A 017 entry plus verification.json limits and the test header: name the
  syntactic forms the census checks, and list static template element access and quoted destructuring
  aliases as excluded, in addition to names computed at run time.
```

The same instruction set these bounds:
- Brief 04's criteria R3-LIMIT, R3-CLAIMS, R3-CORPUS and R3-PRESERVE govern.
- Keep the R3-01 and R3-03 probes as an accessible counterexample corpus, with honest expected results.
- No production change: do not force native state, repeat native calls or delete cascades. Kernel source and
  `packages/core/src` stay unchanged.
- Earlier reports get dated corrections, never rewrites.
- A new C, Packet verify, implementation report 04 and a new H. A bounded GPT-6 review 04 against brief 04
  follows.

## Effect

- **R3-01** becomes [017](../../017-known-limitations.md) L-36. The baseline and the current guides now say the
  Driver *requests* the end of every member, and say when that request leaves a member running. Designs 03 and
  04 and implementation reports 02 and 03 get dated corrections where they read a fulfilled cancel call as an
  ended member. Design 02 is preserved unchanged by `verification.json`, so design 03's correction covers its
  cascade bullet.
  - The implementer found the same mechanism when a Kernel cancellation reaches a running step that then fails:
    Kernel `CANCELLED` stands and the native member stays `RUNNING`. L-36 states that variant too, and
    B-TERM-LIMIT keeps it. [Implementation report 04](implementation-04.md) flags it for the owner and review 04.
- **R3-02** adds three maintained rows, F1–F3, to `bridge-terminate.test.ts`. Each has a behavioural kill for its
  `cancel.*` label. `EQUIVALENT_ONLY` keeps only `initial-input` (T6).
- **R3-03** becomes 017 L-37. The census's doc comment, the test file header and `verification.json`'s limits
  name the checked forms and the three exclusions. Maintained tests show that the review's three instances of the
  two static forms escape.
- **Unchanged.** Production code, Kernel source and `packages/core/src`; owner choices 04 and 05. The three
  cascades the review named stay in place.
- **Not decided here:** the packet's acceptance. Review 04 is bounded to brief 04.

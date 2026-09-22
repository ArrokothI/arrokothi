# Legacy documentation

Everything in this directory is **retired**. It is kept as evidence of what the project decided
and when, so a later reader can trace how a rule arrived at its current form.

Nothing here is current authority. A page may still say "target contract", "current design" or
"this page owns X"; read that as a description of the page at the time it was retired. Where a
retired page and a current page disagree, the current page wins — and several rules here were
later corrected outright.

| Looking for | Read instead |
|---|---|
| Current architecture | [mental model](../../mental-model/README.md) |
| A term or a mechanism | [reference index](../../mental-model/reference.md) |
| Which document owns which rule | [source ownership](../../mental-model/sources.md#ownership-and-precedence) |
| What is actually implemented | [implemented baseline](../development/002-implemented-kernel-baseline.md) |
| Current status and release | [status ledger](../development/007-work-packets.md) |

## What is here

| Directory | Contents | Retired |
|---|---|---|
| [architecture](architecture/) | The four-page architecture (`mental-model`, `kernel`, `execution`, `deployment`) and its twelve detail-design pages | 2026-09-14, replaced by [`mental-model/`](../../mental-model/README.md) |
| [development](development/) | The pre-redesign roadmap and the September 2026 development baseline | 2026-09-07, replaced by the [current development directory](../development/README.md) |

## Where the retired architecture went

[Where the retired architecture went](../../mental-model/reference.md#where-the-retired-architecture-went)
maps each retired architecture topic to the concept or mechanism page that owns it now. Two earlier records
describe the reasoning at the time: the [architecture review](../development/004-architecture-review.md)
and the [detail-design review](../development/005-detail-design-review.md).

Reading order matters here. The retired pages state rules that accepted decisions later changed —
for example the eligibility rule for waiting on application input, and what a takeover does to an
Activation ID. The current [waits](../../mental-model/mechanisms/waits.md) and
[identity](../../mental-model/concepts/identity.md) pages carry the corrected versions. Do not
reconstruct semantics from this directory.

## Editing rules

Retired pages keep their original text. Two mechanical repairs are allowed and have already been
applied: a banner under the title, and relative links updated so they still resolve after the move.
Cross-repository paths (`crewAI/`, `hermes-agent/`, `openclaw/`, `dify/`, `benchmark/`) are locators
for sibling checkouts that are not part of this repository; they were never resolvable links here.

Sealed packet records under `docs/development/work/` were **not** repaired. Some are checked
byte-for-byte by the conformance suite, and a path repair would break the seal that proves the
accepted text is unchanged. Those records still cite `docs/kernel.md`, `docs/execution.md`,
`docs/deployment.md` and `docs/detail-design/`. Each of those pages is preserved here under
`architecture/` at the same name — for example [`architecture/kernel.md`](architecture/kernel.md).

Do not link current documentation to a page in this directory as if it were an owner, and do not
add redirect stubs at the old paths.

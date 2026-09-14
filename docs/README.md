# Documentation

Start with [the mental model](../mental-model/README.md) for the logical architecture,
then follow its reading path to Kernel, Runtime, Driver and Deployment. The
[reference index](../mental-model/reference.md) locates canonical vocabulary and exact
mechanisms. The [roadmap mapping](../mental-model/roadmap.md) connects accepted work to
the Layer-3 pages it should maintain.

| Material | Purpose |
|---|---|
| [Mental model](../mental-model/README.md) | Progressive target architecture and specification graph |
| [Development](development/README.md) | Implemented baseline, active roadmap, policy and acceptance evidence |
| [Guides](guides/README.md) | Currently implemented SDK/application behavior |
| [Future questions](future-plan.md) | Unresolved hypotheses; not another release sequence |
| [Research](research/README.md) | Conditional experiments and analysis |
| [Architecture strategy study](architecture-strategy-study/README.md) | Historical research evidence |
| [Legacy](legacy/README.md) | Retired architecture and development documents, kept as evidence only |

Target semantics and historical implementation are different. K0/K1.0 acceptance does
not mean the asynchronous target Kernel or production native recovery has shipped.
Use the [status ledger](development/007-work-packets.md) and
[implemented baseline](development/002-implemented-kernel-baseline.md) for actual claims.

Nothing under [`legacy/`](legacy/README.md) is current authority, including pages that still
call themselves canonical. Historical records may link into it to show what they reviewed;
current guidance must not.

[Source ownership](../mental-model/sources.md#ownership-and-precedence) explains document
precedence. Exact concept/mechanism owners supply Layer-3 detail; upper layers summarize
without independently redefining it. Sealed decision/review records retain historical
paths and candidate status as evidence, not competing current navigation.

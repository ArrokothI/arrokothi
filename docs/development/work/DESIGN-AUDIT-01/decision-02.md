# DESIGN-AUDIT-01 owner decision 02 — wrapper packaging, staged move and successor rows

## Provenance

Recorded on 2026-10-02 by a Claude Code session (`claude-opus-5-5`), from the owner's chat message in that
session. This is an owner decision. It is not a review, an implementation or an acceptance. The owner's words,
verbatim:

```text
I would like to choose B, for a cleaner trust split, can we do some intermediate step so our current process
won't influence too much?
```

Option B places the caller-side wrapper in the SDK, not in the Kernel package. The session proposed the staged
arrangement in the "Staging" section to meet the owner's request, and recorded it here. The owner confirms it by
merging this record. Until that merge, the arrangement is a proposal. This record adds to
[decision-01](decision-01.md), which left D6 and D8 open.

## Decision: the wrapper belongs to the SDK (D6, option B)

- **What the wrapper is.** It is the caller-side function that turns a live JavaScript object into canonical
  bytes. It reads the object once, into one snapshot. It refuses Proxies, re-prototyped built-ins, accessors
  and the other unsupported forms. It meters its work and emits canonical bytes for the Kernel core.
- **Who owns its guarantees.** Its refusal and metering guarantees belong to `@arrokothi/sdk` and hold under
  the cooperative contract. The Kernel core accepts canonical bytes only and states no guarantee about live
  objects.
- **Dependency direction.** The Kernel core never imports the wrapper. The wrapper does not import
  `@arrokothi/kernel` either: it emits bytes, and the caller passes them on. A public SDK package therefore
  never depends on the private Kernel package.

## Staging, so that work in progress is not disturbed

1. **Until the binding packet: nothing moves.**
   - TOOLS-01 continues unchanged.
   - K1.1-correction-03 keeps capture inside `packages/kernel`, as its amended scope states.
   - Its design note should build the new refusals and the work meter as one self-contained capture module.
     That module imports no coordinator, state or authority code, so that it can later move as a unit. This
     is a brief input, not a criterion.
2. **The binding packet moves capture out of the Kernel.**
   - The Kernel core gains its bytes-only API and the transport adapter.
   - The capture module moves into `packages/sdk` as an internal module. It is not exported from the SDK's
     public entry, and the supported SDK surface and documentation do not change.
   - The Kernel's own tests and private callers either use canonical-bytes fixtures or import that internal
     module through a test-only path, in one direction only.
   - `canonicalize`, already an approved Kernel dependency, also becomes an SDK dependency where the wrapper
     needs it. AGENTS.md's licence-record step applies.
3. **K1.4 makes it public.** K1.4's SDK host bridge exposes the wrapper as part of the supported SDK and
   documents its cooperative contract. That is when the SDK's public surface changes.

| Stage | Kernel package | SDK package | Public surface change |
|---|---|---|---|
| Now to K1.1-correction-03 | Capture plus new refusals and meter, as a movable module | Unchanged | None |
| Binding packet | Bytes-only core and transport adapter | Wrapper as an internal module, with its own tests | None |
| K1.4 | Unchanged | Wrapper exported and documented | SDK gains the wrapper |

Costs the owner accepted with option B:
- the SDK carries internal code its public surface does not use until K1.4;
- the Kernel's tests depend on that internal module through a test-only path, or on fixtures;
- `isProxy` refusal is Node-only, so the SDK's wrapper is Node-bound until a portable refusal exists.

## Successor rows (D8)

[007](../../007-work-packets.md) gains two PLANNED rows and sections in the same commit. Neither is released.
- **BINDING-01, the binding packet.** It covers the CORE amendments, the bytes core, the transport adapter (8 MiB
  default cap) and the move of the wrapper into the SDK in stage 2. It carries the
  [invalidation-03](invalidation-03.md) V-ENV hold.
- **COORD-REFACTOR-01, the coordinator refactor.** This is the behaviour-preserving plan/apply refactor of
  `coordinator.ts` from [owner-decisions-02](owner-decisions-02.md) extra check d.

The recorded order is TOOLS-01, K1.1-correction-03, BINDING-01, COORD-REFACTOR-01, then K1.3. Each needs its own
owner release and brief.

## Not decided here

- Any packet release.
- The binding packet's contract, which its brief and design note produce.
- Hold changes. All three claim holds stay as recorded.

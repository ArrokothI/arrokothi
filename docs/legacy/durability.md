# Durability model

Consequential external execution crosses explicit durable safety checkpoints.

## Expected-sequence append

`SessionStore.append(sessionId, drafts, { expectedSeq })` is an optimistic compare-and-append.
The store appends only when the durable sequence equals `expectedSeq`; otherwise it throws
`SessionConcurrencyConflictError`. Comparison and append are one atomic store operation, so a stale
turn cannot silently follow a concurrent writer.

## External execution checkpoints

For an `external_side_effect` tool, the runtime validates and authorizes the exact payload, resolves
confirmation, derives the action and idempotency keys, durably records `ToolExecutionStarted`, and
only then calls the executor. It subsequently records `ToolExecutionSucceeded`,
`ToolExecutionFailed`, or `ToolExecutionOutcomeUnknown`.

`ToolExecutionStarted` is a safety boundary, not evidence of remote success. A terminal event is
the authoritative outcome.

## Interrupted execution

Replay detects a start without a matching terminal event by request, action, and idempotency keys.
That becomes `SessionState.unresolvedExternalExecution`. The runtime neither infers success nor
failure and will not automatically redispatch the action. Further external side effects are blocked
for that session until the ambiguity is resolved by application policy.

## Concurrency and snapshots

A same-session expected-sequence conflict stops the turn conservatively: the stale runtime does not
retry its model plan, execute a confirmation, or append buffered events. The caller may start a new
turn after loading current session truth.

Snapshots are projection caches. Events remain authoritative. Runtime idempotency keys should also
be passed to remote APIs that support idempotency; they are defense in depth, not a claim of
exactly-once remote execution.

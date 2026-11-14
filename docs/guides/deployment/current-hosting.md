# Current hosting and service boundaries

[Deployment guide](README.md). This page describes the implemented 0.8.x profile.


The SDK's in-process Kernel coordinator, `InMemoryRuntimeStore` and the legacy Driver's lineage
scheduler are reference mechanisms, not production crash recovery: Kernel waits, timers and records do
not survive the process (L-19). No durable `RuntimeStore` implementation ships in this repository. Keep durable business
facts, idempotency records, and uncertain-outcome reconciliation
in your application storage. Recreating an Execution after a crash is a new run, not automatic replay
or recovery of in-flight Effects.

Your web/API boundary authenticates users and binds them to owned Execution IDs and confirmation
requests. Kernel Execution identity is not the application's user identity; do not expose the trusted
SDK host methods (`start`, `input`, `resolveConfirmation`, `cancel`) or Harness entrypoints as
unauthenticated HTTP endpoints.

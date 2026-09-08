# Current hosting and service boundaries

[Deployment guide](README.md). This page describes the implemented 0.8.x profile.


`InMemoryRuntimeStore` and `FifoScheduler` are useful reference mechanisms, not production crash
recovery. No durable `RuntimeStore` implementation ships in this repository. Keep durable business
facts, idempotency records, and uncertain-outcome reconciliation
in your application storage. Recreating an Execution after a crash is a new run, not automatic replay
or recovery of in-flight Effects.

Your web/API boundary authenticates users and binds them to owned Execution IDs and confirmation
requests. Kernel Execution identity is not the application's user identity; do not expose the trusted
Harness entrypoints as unauthenticated HTTP endpoints.

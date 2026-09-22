# Owner progress summary

Current authority: [status ledger](007-work-packets.md). This page explains the result; exact
candidate, review, integration and release identities stay in that ledger and its pinned receipts.

K0 is closed. K1.0 established the target/legacy boundary, and K1.1 with its corrections and
reference supplement is accepted, integrated and owner-closed. The new private Kernel can create
Executions, accept input, reserve batches and dispatch asynchronous Activations. It does not yet
accept Outcomes, acknowledge batches, install progress, complete Executions, implement waits or
cancellation, or mediate Effects. The supported application SDK still uses the legacy core.

K1.2 was separately released on 2026-09-16 and has no candidate yet. K1 remains open; historical
benchmark E1 fixture preparation did not produce a gate result. The benchmark repository owns its
current external state. K1.4 must obtain the real K1/E1 result through the supported entry.

| Next boundary | Purpose |
|---|---|
| K1.2 | Outcome acceptance, receipts, writer fencing, progress and whole-batch acknowledgment |
| K1.3 | Waits, deadlines, cancellation and terminal disposition |
| K1.4 | SDK host/legacy bridge, explicit migration/refusal, full K1/E1 gate |
| K2 / R1 | Governed actions and real native Driver fidelity |
| K3 onward | Persistence, composition, operability and supported release claims |

The owner released DOCS-CLEANUP-01 on 2026-09-22 to archive closed history and simplify navigation.
Its local changes do not close a Kernel gate or independently accept themselves. The verified upload
artifact and cloud-transfer instructions are in [archive](archive.md). Runtime code and dependencies
remain supported until their consumers migrate or support is explicitly withdrawn.

Carry these historical limitations forward: K1.1's independent review observed two pre-existing
legacy Effect-test cancellations on Node 22.22.3; the reference review retained five non-blocking
P3 observations and an authentication limit. See the ledger's pinned reviews for their scope.
Current maintenance validation belongs in its own report and cannot rewrite those observations.

Rewrite this summary when the result changes. Keep old rounds in the archive, current decisions in
007, and implementation capability in 002.

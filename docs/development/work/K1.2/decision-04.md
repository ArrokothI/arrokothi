Owner decision on blocker-02 (SELF-R4-HANDLER-01), 2026-09-28: option 1, stated as one boundary by
object class, so that further adjacent Proxy mechanisms do not need new blockers.

Record this verbatim as docs/development/work/K1.2/decision-04.md (provenance: explicit owner
message; you are transcribing it). It supersedes decision-03 item 1 only; decision-03 items 2–5
stand unchanged.

Decision:
1. Excluded from V-D1's time/engine-work bound: all engine-internal work attributable to a live
   Proxy (any object whose internal methods are caller-defined) reached while observing a value.
   That includes trap discovery through handler prototype chains, absent-trap forwarding, nested
   Proxy targets, IsArray target recursion, invariant checks and the target/handler operations they
   induce, and conversion of trap results. This is the caller-code trust category, not a new
   class of Kernel work.
2. Still bound, unchanged:
   - V-D1 in full for values with no Proxy in them: ordinary objects and arrays, including any
     prototype chain they carry;
   - every lookup the Kernel itself chooses to perform, on any value;
   - K12C1-R6-VALUE-TIME-01 must still be closed as decision-03 item 2 says.
3. Count obligation, made precise: the bound applies to the observations and invocations Kernel
   code selects. That is at most one observation per position, the fixed per-container structural
   observations, and the byte stop and four limits. Callbacks the engine induces on its own inside
   one of those operations are not counted and are not promised. Tests pin the Kernel-selected
   counts (the descriptor-chain and handler-chain probe shapes); timings remain observations only.
4. Honest claim: BASELINE and values.md must say that no time bound is claimed for values
   containing live Proxies. Protection against hostile in-process code is isolation or transport
   containment, not V-D1. State the boundary once in values.md at its owner, list it in BASELINE
   beside the own-key-enumeration and caller-trap exclusions, cite decision-04 in contract
   revision 5 and in the KC2-1/V-D1 claim scope. No status text in values.md.
5. Nothing else is authorized. Do not reject or detect-and-refuse Proxies, change coherent-Proxy
   acceptance, reuse observations, or move capture out of process. If you find engine work caused
   by a value with no Proxy in it that the Kernel cannot bound, that is still a blocker; everything
   inside item 1 is not.

blocker-02 is resolved. Continue: close K12C1-R6-VALUE-TIME-01 and K12C1-R6-EVID-01, re-audit the
whole cumulative packet, and hand off a new C/H under 006/008.
No successor release; invalidation-01 and invalidation-02 holds remain.

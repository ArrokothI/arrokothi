Owner decision on blocker-01 (SELF-R4-DESCRIPTOR-01), 2026-09-27: option 2, with a narrow boundary.

Record this owner decision verbatim as docs/development/work/K1.2/decision-03.md (provenance: explicit
owner message in this session; you are transcribing it, not deciding it), then continue the correction.

Decision:
1. Excluded from V-D1: engine-internal work that processes values returned by caller-supplied code
   the Kernel must invoke to observe a position. Concretely, this means Proxy traps, including the
   engine's conversion of a trap-returned descriptor. This is the same trust category as the
   existing exclusion for caller-trap execution. It is not a new class of Kernel work.
2. Not excluded: every lookup the Kernel itself chooses to perform, and all work on ordinary
   (non-Proxy) objects and arrays. V-D1 remains claimed in full for plain data. Review 06's
   K12C1-R6-VALUE-TIME-01 (the describe()/constructor chain walk on plain objects) must still be
   eliminated and evidenced, on both the foreign-prototype path and the thrown-value path.
3. Conditions that remain binding under the exemption: every position is observed once;
   the number of Kernel observations and trap invocations per root stays bounded by the limits; the
   byte stop, the four limits, exact accepted values, ambient safety and DEC-7 weights are
   unchanged. Keep a deterministic test that pins the observation/trap-call count for the
   probe-descriptor-chain-04 shape (the timing stays an observation, not a gate).
4. Payload updates in the same candidate, reviewed as payload: values.md (fixed semantic limits)
   states the boundary once at its owner, without status text. BASELINE lists it next to the
   own-key-enumeration and caller-trap exclusions. The contract (revision 5) and the stated scope
   of the KC2-1/V-D1 claim cite decision-03. rewrite-index §4 and §5 need an entry only if the
   wording creates or settles an open choice.
5. No other architecture change is authorized. Do not reject Proxies, change coherent-Proxy
   acceptance, or move capture out of process.

With this, blocker-01 is resolved. Proceed to close K12C1-R6-VALUE-TIME-01 and K12C1-R6-EVID-01,
re-audit the whole cumulative packet, and hand off a new C/H under 006/008.
No successor release; invalidation-01 and invalidation-02 holds remain.

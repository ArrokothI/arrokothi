# COORD-REFACTOR-01 — design 01 check

2026-10-22, Codex GPT-6, independent of the implementer. Checked
`b0a1e4918f28e6669c7537bcbe8c14d3066939fd` against base
`7626a623dad8acfc73584e08212c126b5b6daefc`, using the requested reading scope.
Design review only; no implementation changes or runtime acceptance claim.

**Verdict: APPROVED WITH REQUIRED CHANGES.** The decomposition is viable; no redesign of
the plan/owner boundary is needed. Resolve the following before relying on its closure claims.

1. **D01-CHK-1 — Q5 needs the owner (CR1-3).** These are observable behavior changes,
   regardless of whether the sweep reaches them. Moving `#mint`/`activationsMinted` changes
   subsequent receipt positions and Activation IDs after a construction fault
   (`coordinator.ts:1134,1248,2195`). Moving failure-text construction before the status write
   changes a failed row into a pending row if construction throws, allowing a later report to
   win (`2300–2304,2313–2315`). “No callback interleaves” does not answer that difference.
   Obtain an explicit owner exception with the old/new fault outcomes and bounded checks,
   or preserve the behavior. Do not label either change CR1-3 compliant by provenance alone.
   Include newly fallible settlement-plan construction in this accounting, including
   `delivered()`, whose present successful path is only a plain status write.

2. **D01-CHK-2 — Getter syntax alone breaks the structural proof (CR1-2/4).**
   `zone-analysis.ts:132–145,807–811,854–863` excludes getters from function discovery,
   ownership and post-load classification; `nodeEffects` at `1209–1240` does not follow
   property reads into getter bodies. `writeOwners` visits only discovered functions
   (`1650`). Merely allowing `GetAccessor` therefore lets a reader getter mutate its private
   record without the promised writer check seeing it, and loses transitive getter effects.
   Model getter bodies, returned aliases and getter-read effects, or use ordinary query
   methods already modeled. Require the planned mutating-reader mutant and a getter-mediated
   effect/alias negative control to fail for the intended assertion.

3. **D01-CHK-3 — Complete the retirement mapping (CR1-1/2/3).** A planner can still
   mutate through `apply(RefusalPlan)` and continue; read-only records do not enforce exits.
   It can also mutate a module binding in a builder. Finally, it can build state-dependent
   fields, run a callback, then capture the *new* version when assembling the plan: the basis
   check passes stale fields. Bind the basis before the first state-dependent build and
   preserve the callback/revalidation ordering. Retain adapted phase/exit guards or identify
   maintained assertions and targeted successor controls for the gaps below. The four broad
   CR1-4 families alone do not establish this mapping. Correct plan selection remains an
   oracle obligation, not a consequence of `RefusalPlan` existing.

4. **D01-CHK-4 — Reading a field does not commit it (CR1-1/4).** Design lines `156–159`
   overclaim the coverage check. Keep `const stored = plan.history` but delete its append:
   the field is still read, and history still has other allowed writers. The analogous
   retained binding can hide a dropped grant or hold write. Pin actual per-variant coupled
   commits, or use explicit resulting-state assertions as the mutant killers and narrow the
   structural claim. Exercise the four named dropped-field mutants with their reads retained;
   a compiler/loader failure is not a kill. A non-empty subset of *any* `#apply*` methods also
   does not replace the old restriction on which operation may write each field.

The 31 negative controls, numbered by their order in `control-commits.test.ts:169–206`:

| Controls | Coverage disposition |
|---|---|
| 1–7: mint, increments, assignments, delete | Reader boundary removes direct record writes in planners; owner-side phase/order remains necessary. |
| 8–16, 21: aliases, containers, closures, callbacks, Map, freeze, casts | No mutable record/list escape plus writer/alias witnesses; preserve coverage of these forms in the ported analysis. |
| 17: builder changes module state | **Gap:** derived record-field writers do not check module bindings. Preserve the pre-apply effect obligation. |
| 18–20: refusal without exit, ignored helper result, continuing helper mutation | **Gap:** a RefusalPlan permits the mutation but does not force an exit. Keep exit/plan-sequence checks; refusal scenarios remain complementary coverage. |
| 22–23: foreign escape and unclassified call | Exact foreign inventory and call classification port directly. |
| 24, 28: answer constructed during/after commit | Prebuilt-answer witness plus maintained fault checks; explicitly cover redelivery's returned answer, absent from the DeliveryPlan table. |
| 25: foreign call after decision build | **Gap:** current-version capture after the callback defeats the stated backstop; D01-CHK-3. |
| 26: deliver before recording; 27: holds before history | Split takeover sequence locator plus delivery checks; control fault scenarios and `CHECKS.recoveryAnswer` retain the history/hold obligation. |
| 29–31: early protocol hold, wrong-path hold/history writers | Planner writes blocked structurally; inside the owner, preserve operation-specific commit obligations, not merely an allowed-method prefix. |

The remaining retirement rows are sound in intent: preserve complete call classification,
foreign-site exactness and analysis-order independence; port the commit locators without
weakening sequence checks. Retirement is conditional on D01-CHK-2–4, not bare deletion.

Answers to the five requested design questions:

1. **Answer exemption:** yes, for fresh unretained answer containers. Keep them data-only,
   preserve shared frozen leaves, and prove apply neither reads nor retains mutable answers.
2. **Separate delivery/settlement plans:** yes. Each mutation still passes through the same
   owner; the decision commits before delivery, and each report targets its original delivery
   row, including after takeover or Outcome resolution. Include redelivery in the answer witness.
3. **Locator port:** yes, as relocation, preserving exact ordered statements, located windows,
   exit attribution, prefix states and comparisons. Splitting the takeover tail across files must
   still check both halves. No broader fault window or changed expected state is authorized.
4. **GetAccessor:** acceptable only with D01-CHK-2; an allowlist addition alone is insufficient.
5. **Unswept fault behavior:** needs the owner; D01-CHK-1. It does not fit CR1-3 as written.

For the additional questions actually present in design 01: **Q6**, version checking is a useful
backstop, subject to D01-CHK-3, and must not replace DEC-19's classified refusals; **Q7**, retirement
is conditional as above; **Q8**, mechanical evidence relocation is acceptable, with no new credit.

CR1-1 has a usable closed-union/freeze/type-fixture mechanism, subject to the answer and coupling
points. CR1-2's module rules, non-vacuous file/edge checks, injected bypass imports and runtime
private brands make ownership structural, not a source-site census; getter analysis must close.
The existing module extractor includes type imports but carries no value/type binding distinction
(`module-graph.ts:90–95,117–118`): implement R4's value distinction explicitly. CR1-3 remains
conditional on the owner decision and unchanged behavioral verification. CR1-4 has the right
families, but the named killers must address D01-CHK-2/4. None is implementation acceptance yet.

K1.3 can add a data-only wait/Effect variant with its coupled dependency/history/state data and
answer, handled by another private apply arm. Scheduling or external work stays outside commit;
its subsequent progress returns through plans. No new mutation interface is required.

No additional prescribed change to normal-path receipts, IDs, refusal precedence or public exports
was found. Preserve grant/Activation identity, live reader revalidation and late settlement's shared
delivery history. The new creation-order list must remain consistent with lookup publication on
fault paths; it must not introduce an unacknowledged listing/lookup split. No oracle relaxation is
approved. No third-party implementation material was incorporated.

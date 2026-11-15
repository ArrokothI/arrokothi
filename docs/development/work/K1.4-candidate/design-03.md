# K1.4-candidate design 03 — identity rendering, redesigned

Written 2026-11-15 by the K1.4-candidate coding agent (Claude Code desktop, `claude-fable-5-2`). This is a design
note only: it changes no code, and no code follows until a design check returns and the owner disposes it.

- **Subject:** K14C-R02-01 of
  [review 02](https://github.com/ArrokothI/arrokothi/blob/2a95a49a6e7ff46242a137f9d9ca6835e70ed946/docs/development/work/K1.4-candidate/review-02.md)
  (Codex GPT-6, `codex/k1.4-candidate-review-02` at `2a95a49a6e7ff46242a137f9d9ca6835e70ed946`), CHANGES
  REQUIRED of H `14a7ef485282ab2c16d08702be5d61cfeb9997e7`. It continues K14C-R01-01.
- **Governing brief:**
  [brief 03](https://github.com/ArrokothI/arrokothi/blob/2a95a49a6e7ff46242a137f9d9ca6835e70ed946/docs/development/work/K1.4-candidate/review-02/brief-03.md).
  006's stop-and-redesign rule fired, and the owner chose
  ["Redesign with a design check (recommended)"](https://github.com/ArrokothI/arrokothi/blob/2a95a49a6e7ff46242a137f9d9ca6835e70ed946/docs/development/work/K1.4-candidate/review-02/owner-choice.md).
  The review, the brief and the probes were read by commit; nothing was merged.
- **Supersedes:** addendum 01 §A3's second bullet and §A4, and design 02 §1. Those stay as records. Everything
  else in design 01, addendum 01 and design 02 stands.
- **Ownership:** test-side adapter code, its tests and its current claims. The Kernel, the fixture and the packet
  tools do not change.

**Answer in one paragraph.** A rule fits the current port and the current naming domain, so I am not stopping
for a contract choice. Every identity string the adapter emits comes from one function per scope, and that
function is injective and never changes during a run. Every name a later command uses is resolved through the
inverse of that same function. Laboratory names stay arbitrary strings. Three points change behavior the owner
approved or that H's tests pin, and they are the owner's to decide: OQ-1 to OQ-3 in §8.

## 1. Root cause (012's four questions)

1. **Which mechanism produced the findings?** The adapter had several unrelated sources of identity strings:
   laboratory names kept in a table, a label computed when printing, a "Kernel spelling" built when printing, and
   an input Event's name read from its payload. Only the first went through a collision check. The other three
   wrote into the same output fields unchecked.
2. **Which accepted design allowed it?** Addendum 01 §A3 assumed a marked Kernel spelling cannot equal a
   laboratory name. Laboratory names are arbitrary strings, so the assumption is false. Design 02 §1 kept it for
   exposed timeouts and called the other two families harmless.
3. **Why did earlier passes miss it?** Every search varied names that a person would write. None fed a string
   the adapter had emitted back in as a name. None looked at the output fields as one domain, so the input-Event
   path was never compared with the timeout path although they fill the same lists.
4. **What options does the owner have?** §7 lists the alternatives and their costs. The owner already chose
   the route: a redesign with a design check.

## 2. Census: every identity string the adapter accepts or emits (question 1)

"Native ID" means an ID the Kernel minted. "Translated" means the adapter shows a different string from the
native ID.

### 2.1 Translated families

| Family | Scope | Native ID | Emitted in | Accepted from a command as a new name | Accepted from a command as a reference |
|---|---|---|---|---|---|
| Execution | The run | `executionId` | `executionId` | `create`/`create_retry` `.executionId` | `.executionId` of every other command; `event.destination`; `outcome.executionId` |
| Wait generation | One Execution | generation number | `liveWaitGeneration`; `waitEndedReadiness[].generation`; inside a `to-<generation>` label | `outcome.next.wait.generation` | `deliver_timer.generation` |
| Event | One Execution | Event ID (input or timeout) | `acknowledged`; `queued`; `terminalDispositions`; `dispatchedBatch` | input: `initialInput.eventId`, `event.eventId`; timeout: `timeoutEvent.eventId` | `wait.dependencies[].eventIdentity` (§2.4) |

Input Events and timeout Events are **one family**: they fill the same four lists.

### 2.2 Strings the adapter generates itself at H

| String | Where | Checked against other names at H |
|---|---|---|
| `to-<generation name>` (Q2 b) | An unnamed timeout | Yes, since design 02 |
| `kernel-event:<id>` | An exposed timeout; a timeout whose generation has no name; an input Event whose payload has no name; an ID in a list but not in the mailbox | No |
| `kernel-generation:<n>` | A generation with no name | No |
| `kernel-execution:<id>` | An Execution with no name | No |

### 2.3 Strings that pass through unchanged

These are not translated, so there is no table that could go wrong. They are listed so the census is complete.

| String | Direction | Note |
|---|---|---|
| Activation ID, receipt token, writer epoch | Kernel to Observation; `outcome.activationId` back to the Kernel | The runner relates these families. The adapter passes them verbatim both ways |
| `emissions[]` | Runtime key to Kernel to Observation | The list shows Emission keys, not the Kernel's derived Emission IDs: 017 L-42, unchanged |
| `producer`, `requestKey`, creation key, definition revisions, `kind`, `subscriptionClass`, `correlation`, `kinds` | Command to Kernel | Content. Never emitted |
| `rejection`, `recoveryHold.reason` | Kernel to Observation | The Kernel's words |
| `ingressRefused` | Command to Observation | §2.5 |
| `initialInput.destination`, `timeoutEvent.destination`, `timeoutEvent.waitGeneration` | Command | Accepted and not read. No output depends on them |

### 2.4 An accepted Event reference the adapter does not translate

`wait.dependencies[].eventIdentity` names an Event. At H the adapter passes the laboratory's string to the
Kernel, which compares it with native Event IDs. Nothing can come of it at K1: a dependency alternative matches
only a trusted non-timeout Event, and K1 has none (017 L-21). In the corpus it appears only in
`cited-decision-edges`, which is refused, and there it names an Event before that Event exists (017 L-38). It is
still a place where a displayed name and a command's target could mean different things. §4 rule 6 closes it.

### 2.5 `ingressRefused`

It is the name the command gave an input the Kernel refused because the destination had ended. The Kernel minted
no Event, so there is no native ID to map. It stays a command echo, outside the rule. §8 J-3 asks the checker to
weigh this.

### 2.6 Where two native IDs can share one string at H

Review 02 found 1 to 5. I found 6 to 11 while writing this note, with probes against H (not acceptance
evidence).

| # | Collision | Found by |
|---|---|---|
| 1 | An exposed timeout's string, then a command gives that string to another timeout | Review 02 |
| 2 | A command name equal to a later exposed timeout's string | Review 02 |
| 3 | A changed timeout ID under a name equal to its own exposed string: the whole Observation is unchanged | Review 02 (fault injection) |
| 4 | A generation named `kernel-generation:2`, then generation 2 under the same name; a later fire addresses the old one | Review 02 |
| 5 | Two Executions under a name equal to the second's fallback | Review 02 |
| 6 | Two input Events that carry one name (two request keys): `queued` shows the name twice | This note |
| 7 | An input Event named like an unnamed timeout's label, in either order | This note |
| 8 | An input Event and a command-named timeout under one name | This note |
| 9 | The Kernel's answer names a timeout ID that its inspection does not hold: the name is dropped silently | This note (fault injection) |
| 10 | A labelled timeout takes its first command name at the moment its ID changes: the Observation is identical to an honest rename | This note (fault injection) |
| 11 | The Kernel's answer names an old timeout while its state holds a new unannounced one: the new one takes the label and looks expected | This note (by reading) |

Rows 6 to 8 are the input-Event path meeting the timeout path. Rows 9 to 11 show that a table of names is not
enough: when a name attaches, and to which answered ID, matters as much.

## 3. The mechanism: one name ledger per scope (question 2)

A **ledger** holds, for one scope, a one-to-one map between native IDs and strings.

```text
shown   : native ID -> string     (the string every Observation shows for this ID)
denotes : string    -> native ID  (the inverse of shown, kept beside it)
```

There are three kinds of ledger: one Execution ledger for the run, and for each native Execution one generation
ledger and one Event ledger.

A ledger has exactly two operations.

- **`assign(id, preferred)`** returns the string for `id`.
  1. If `shown` has `id`, return that string. `preferred` is ignored.
  2. Otherwise, if `preferred` is a string that `denotes` does not hold, the string is `preferred`.
  3. Otherwise the string is **fresh**: the first of `kernel-<family>:<id>`, `kernel-<family>:<id>~2`,
     `kernel-<family>:<id>~3`, … that `denotes` does not hold.
  4. Record the pair in both maps and return the string.
- **`resolve(string)`** returns `denotes(string)`, or nothing.

Nothing else writes the maps, and no entry is ever changed or removed.

## 4. The rule

1. **One producer.** Every string in an identity position of an Observation (§2.1, "Emitted in") is the result
   of `assign` on the ledger of its scope. The adapter builds no identity string anywhere else.
2. **Names attach only at answers.** A laboratory name is offered as `preferred` at one moment only: when the
   Kernel answers the command that carries the name, for the ID that answer names.

   | Command | Name offered | For the ID in the answer |
   |---|---|---|
   | `create`, `create_retry` | `executionId` | `executionId` |
   | `create`, `create_retry` | `initialInput.eventId` | `initialEventId` |
   | `accept_event` | `event.eventId` | `eventId` |
   | `submit_outcome`, `resubmit_outcome` with an accepted `await` | `next.wait.generation` | `wait.generation` |
   | the same, when the wait was already due | `to-<generation name>` (Q2 b), only if the generation took its laboratory name | `wait.timeoutEventId` |
   | `deliver_timer` | `timeoutEvent.eventId` | `timeoutEventId` |

   These offers happen before the command's Observation is built.
3. **Printing never invents a preference.** Building an Observation calls `assign(id, nothing)` for every ID in
   the view, in mailbox order. An ID no answer announced therefore gets a fresh string.
4. **An answered ID must be one the inspection holds.** After an offer, the answered ID must be in the inspected
   view where its kind belongs: the view's own `executionId`; the mailbox, with the right source category; for a
   generation, the live wait or the wait-ended readiness. One case cannot be checked that way: a replayed
   Outcome names a generation that may have ended since, so there the generation must be one the ledger already
   holds. Otherwise `apply` throws, which the runner records as FAIL and stops.
5. **The payload is checked, not trusted.** The input Event's name still travels in its payload, so that "same
   content" means what the fixture means. When an input Event is printed, the name its payload carries must be
   the name that was offered for it. Otherwise `apply` throws.
6. **References use the same ledger.** A command that refers to an Execution or a generation resolves the string
   with `resolve` on the ledger of that scope. A string that denotes nothing makes `apply` throw, as at H. An
   `await` whose dependency alternative carries `eventIdentity` is refused in `begin`, by command capability
   (OQ-2).

### Why no two identities can share a string

Take one ledger. `assign` is the only writer, and it writes a pair only in step 4, after step 2 or step 3 has
established that `denotes` does not hold the string. So `shown` is injective at every moment, and because no
entry changes, it is one fixed injective function for the whole run. By rule 1 an Observation shows nothing in
that scope except values of this function. Two different native IDs therefore never share a string, in one
Observation or across the run.

This does not depend on what the strings look like.

- **Both arrival orders.** If a laboratory name arrives first and a generated string would equal it, step 3
  skips to the next variant. If the generated string arrives first and a laboratory name equal to it is offered
  later for another ID, step 2 fails and that ID gets its own fresh string.
- **Names copied from earlier outputs.** Every string an Observation has shown is in `denotes`. Offering it for
  another ID fails step 2. Offering it for the same ID changes nothing.
- **Names predicted from another run.** The same argument: the check is against the ledger's contents at the
  moment of the offer, not against a pattern.
- **Recursion.** A fresh string is an ordinary entry. Naming it, or naming a variant of it, meets the same two
  steps. There is no second kind of string for the check to miss.
- **A new prefix is not the proof.** The prefix and the `~n` suffix only make a fresh string readable. Replace
  them with anything and the argument is unchanged.

**Scope.** Event and generation strings are per Execution, and an Observation is always of one Execution, whose
`executionId` string is injective for the run. So the pair (Execution string, Event or generation string) is
injective for the run. The same Event name in two Executions is two different pairs, as at H.

### What the Observation then means

For two Observations in one run, the same string in identity positions of one scope means the same native ID,
and different strings mean different native IDs. The identity structure of the Observation is an exact image of
the identity structure of the Kernel's inspection. A changed native ID always changes the Observation wherever
that ID appears, and rule 4 covers an ID that appears only in an answer.

### Checked with a prototype

To test this argument before asking for a check, I built the rule in a copy of the candidate outside the
repository and ran it. Nothing from it is in the tree, and it is not acceptance evidence.

- The 17 verdict tests pass: 12 PASS and 3 REFUSED, with OQ-2's refusal in place.
- The 49 blindness tests, the five ablations and the latest-grant witness pass.
- Review 02's five counterexamples each show distinct strings, and a fire addresses the generation its string
  shows.
- Collisions 6 to 8 show distinct strings. Collision 9 throws.
- Of H's 59 convention tests, three fail. All three pin the rename of a labelled timeout, which is OQ-1.

## 5. Transitions (question 3)

| Situation | Under the rule | Changes from H |
|---|---|---|
| A new ID answered with a free name | Shown under that name | No |
| A new ID answered with a name that denotes another ID | Shown under a fresh string; the other ID keeps the name | Timeouts: the fresh string is now checked. Generations and Executions: the same |
| A duplicate answer, same ID, same name | Nothing changes | No |
| A duplicate answer, same ID, another name | Nothing changes; the other name stays free | No for command-named timeouts. **Yes for a labelled timeout: it keeps its label (OQ-1)** |
| A duplicate answer with a changed ID, in the answer and the view (fault) | The changed ID is new to the ledger, so it gets a string no Observation has shown | At H this was hidden when the name equalled the exposed string |
| The same, in the answer only (fault) | Rule 4 throws: the view does not hold it | Hidden at H |
| A stale or not-due fire | No ID is answered, so nothing is offered and nothing changes | No |
| A wait already due at registration | The registration answer announces the timeout; it is offered `to-<generation name>` | The label attaches at the answer, not at printing |
| A timeout in the view that no answer announced (fault) | Fresh string | At H it took the label |
| Two input Events offered one name | The second gets a fresh string | At H both showed the name |
| An input Event and a timeout offered one name, either order | The later one gets a fresh string | At H both showed the name |
| The same names in two Executions | No conflict: separate ledgers | No |

**What may legitimately change under Q2 b.** Nothing. A timeout due at registration is announced by that
command's answer, takes its label then, and keeps it. No string an Observation has shown is ever replaced.

**What stays detectable.** Every changed, extra, missing or swapped native ID in a view, and every answered ID
that disagrees with the view.

## 6. How a later command resolves a displayed name (question 4)

`resolve` is the inverse of `shown`, held in the same ledger. So a command that uses a string addresses exactly
the native ID that every Observation shows under that string.

- **No conflict path can separate them.** A conflict never rewrites an existing pair. It only adds a pair for
  the new ID, under a fresh string. So the string a command uses keeps meaning what it meant.
- **Review 02's generation case.** `kernel-generation:2` is offered for generation 1 and taken. It is offered
  again for generation 2 and refused, so generation 2 is shown under a fresh string. A fire that names
  `kernel-generation:2` addresses generation 1, which is what every Observation shows under that string. A fire
  that names generation 2's fresh string addresses generation 2.
- **A name offered and refused is not a reference.** If a `create` under a used name is answered with a new
  Execution, that Execution is shown under a fresh string, and the Observation of that very command says so.
  Later commands under the old name address the old Execution.
- **A string that denotes nothing** throws, as at H.

Events are not referenced by any command K1 supports, apart from `eventIdentity` (§2.4, OQ-2).

## 7. Alternatives considered

| Alternative | Why not |
|---|---|
| **A reserved prefix.** Refuse laboratory names that start with `kernel-` | It restricts the naming domain, which is a contract change. It does not touch collisions 6 to 8, 10 or 11 |
| **Throw on every conflict.** Emit only laboratory names and labels | Sound and simpler. A throw ends the run at that step, so the Observation of the conflict and every later step are lost. Brief 03's counterexamples ask to check the lists after a conflict. I keep throws for answers that contradict the inspection (rules 4 and 5), where there is nothing coherent to show |
| **Keep one rename** (label to first command name, as at H) | Injective at every moment, but `shown` is no longer one function for the run. Collision 10 then stays hidden. This is OQ-1 |
| **Keep reading input names from the payload** | The name then follows content, not the Kernel's ID, and the answered Event ID stays unused. Rule 5 keeps the payload as a check instead |
| **A recorded limit** for the generated strings | The owner chose redesign. And the defect hides exactly the errors the candidate exists to show |

## 8. Decisions and claims (question 5)

**Claims that change with the mechanism:** the candidate's header comment; the README's "Conventions" section,
whose lines 101 to 117 promise more than H delivers; 017 L-39; and 017 L-38 if OQ-2 is accepted. Addendum 01 §A3
and §A4 and design 02 §1 are records and stay as written; this note says what it supersedes. §9 R03-3 has the
check.

### For the owner

- **OQ-1. A shown string never changes.** At H a timeout shown as `to-<generation>` takes the first name a later
  `deliver_timer` gives it (addendum §A4 read literally; one test pins it). Under the rule it keeps its label.
  - *Effect:* no schedule in the corpus has this case, so the verdicts stay 12 PASS and 3 REFUSED. Three
    convention tests change their expectations.
  - *If refused:* the ledger allows one change of string, from a label to the first command name. Collision 10
    stays as a recorded limit in 017 L-39.
  - **Recommended: accept.**
- **OQ-2. Refuse `eventIdentity` by capability.** `begin` refuses a schedule in which an `await` carries a
  dependency alternative with `eventIdentity`. The reason given: the adapter cannot name an Event to the Kernel
  before the Kernel has minted its ID, and K1 has no Event such an alternative could match.
  - *Effect:* a third capability discriminant beside the command kind and the Event category. Only
    `cited-decision-edges` has one, at step 4, and it is already refused at step 2, so the pinned verdicts and
    their first unsupported steps do not change.
  - *If refused:* the string keeps passing through untranslated, and 017 L-38 records it as a limit to close at
    K2.
  - **Recommended: accept.**
- **OQ-3. `KERNEL_CANDIDATE_VERSION` stays `/1`.** The mapping rule changes what the candidate shows in conflict
  cases. No capture has pinned `/1`, and K1.4-gate is not released. **Recommended: stay at `/1`.** A bump to
  `/2` costs one constant and a README line.

No naming-domain decision and no fixture-contract decision is needed.

### For the design check to weigh

- **J-1.** A conflict gives a fresh string and the run continues; only a contradiction between an answer and the
  inspection throws (§7).
- **J-2.** Rule 4 compares one answer with one inspection and throws on a contradiction. It reads the answer's
  `replayed` flag in one place, for a replayed Outcome's generation. The adapter still decides nothing about the
  Kernel's state.
- **J-3.** `ingressRefused` stays a command echo (§2.5). It can equal the string of an existing Event when a
  laboratory resubmits that Event's name to an ended Execution. No native ID is hidden by that.
- **J-4.** `emissions` stays as 017 L-42 records it.
- **J-5.** The mechanism mutants of §9 go into the mutation registry, by the workflow owner choice 03 set.

## 9. Verification plan

Every criterion closes by a deterministic check, a structural mechanism or a declared bounded search.

**R03-1, the rule.**

- *Structural:* the ledger is one small class with two methods. A lexical test checks that the fallback spelling
  appears only inside it, and that the Observation's identity fields are built only from its results.
- *Transitions:* one deterministic test per row of §5, for each family the row applies to.
- *Bounded search with an independent oracle.* The oracle does not read the ledger. A spying coordinator records
  the Kernel's raw views and the arguments of every call. The oracle pairs each string in an Observation with
  the native ID at the same position of the view and checks, over the whole run and per scope:
  1. the pairs form a one-to-one relation that never changes;
  2. every call that a command's reference produced went to the native ID its string is paired with, or the
     command threw.

  The search runs fixed command skeletons and varies the names in their slots.

  | Skeleton | Slots |
  |---|---|
  | One Execution: two inputs; three waits (one already due); a fire for each; one duplicate fire; a cancellation | 9 |
  | Two Executions with the same names; one `create` under a used name; one `create_retry` under another name; commands that refer to each | 6 |

  Each slot draws from: its own ordinary name; the name of an earlier slot in the same family; the name of a
  slot in the other Event sub-family; the label of each generation; the predicted fresh string of every native
  ID in scope, and its `~2` variant, taken from a calibration run with ordinary names; a copy of the last
  identity string the run emitted; `__proto__`; a non-ASCII name. The search runs **every assignment with at
  most three non-ordinary slots**. Each skeleton also runs with a changed-ID fault injected at each fire, in the
  answer and the view, and in the answer only. There the oracle requires a throw or an Observation that differs
  from the honest run's.
- *Mechanism mutants.* Each of these edits to the adapter must fail the search or a named transition test:
  the fresh string is not recorded; the fresh string is not checked against the ledger; the label is not recorded;
  input names are read from the payload and bypass the ledger; references resolve through a separate table of
  offered names; a shown ID takes a later name; rule 4 is removed.

**R03-2, the corpus.** Each probe becomes a maintained test with the approved outcome.

| Probe | Maintained expectation |
|---|---|
| Review 01, collision under `to-g2` | Second timeout under a fresh string (kept from round 2) |
| Review 01, changed ID on a duplicate fire, two spellings | The changed ID under a fresh string; nothing else moves (kept from round 2) |
| Review 01, latest-grant mutant | Unchanged: passes twelve, rejected under ABL-2 |
| Review 02, exposed then command, three timeouts | Three distinct strings in `acknowledged`, `queued`, the batch and `terminalDispositions` |
| Review 02, command then exposed | Two distinct strings |
| Review 02, changed ID named `kernel-event:review-drift`, and `ordinary-name` | Both Observations differ from the one before; with the change in the answer only, both throw |
| Review 02, generation named `kernel-generation:2` | Two distinct strings; the fire's target is the generation its string shows |
| Review 02, two Executions under the second's fallback | Two distinct strings |
| Review 02, preserved controls (Unicode, `__proto__`, duplicate and ended fires, old label, two Executions) | Unchanged, except the labelled timeout keeps its label (OQ-1) |
| This note, collisions 6 to 11 | One test each |

**R03-3, claims.** The candidate's header comment and README "Conventions" section; 017 L-39, and L-38 if OQ-2
is accepted; a pointer from addendum 01 and design 02 is not added, because records are preserved, and this note
states what it supersedes. BASELINE §15, the roadmaps and 017 L-42 need no change.

**R03-4, preservation.** The verdicts stay 12 PASS and 3 REFUSED, pinned exactly. The five registered ablations,
the latest-grant witness, and the blindness, encoder, locator and import-guard tests stay. K14C-R01-02 and
K14C-R01-03 stay closed. Then: Packet verify in CI at the new C, report 03, a new H, and a cumulative
independent review.

## 10. Bounds

- No Kernel change, no fixture scenario, runner or oracle change, no packet-tool change, no benchmark work, no
  K1.4-gate release. D01-CHK-04 stays with K2.4/E2. The three excluded schedules stay refused and visible.
- **Size of the build:** the ledger and the adapter changes are about 150 lines; the tests and the search about
  700; seven registry cases with their hold records if J-5 is accepted; the README and 017.
- **Stop conditions for the build:** if the bounded search finds a case the rule does not cover, the build stops
  and reports it before any patch. If a supported schedule stops passing under the rule, the build stops for the
  owner.
- No self-acceptance.
